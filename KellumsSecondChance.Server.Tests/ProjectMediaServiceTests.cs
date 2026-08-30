using System.Buffers.Binary;
using System.Text;
using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure.Media;
using KellumsSecondChance.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Tests;

/// <summary>
/// Project photography.
///
/// Two themes run through these tests. The first is that the CONTENT decides
/// what a file is — never its name and never the browser's Content-Type. The
/// second is that every image lookup is scoped by project as well as by image
/// id, so an id belonging to somebody else's project cannot be reached.
/// </summary>
public class ProjectMediaServiceTests : IDisposable
{
    private readonly TestDatabase _fixture = new();
    private readonly FakeMediaStorage _storage = new();
    private readonly FakeContentVersion _version = new();
    private readonly ProjectMediaService _media;

    private static readonly MediaStorageOptions Options = new()
    {
        RootPath = null,
        PublicPathPrefix = "uploads",
        MaxUploadMegabytes = 12,
    };

    public ProjectMediaServiceTests()
    {
        _media = new ProjectMediaService(
            _fixture.Db,
            _storage,
            _version,
            Microsoft.Extensions.Options.Options.Create(Options),
            NullLogger<ProjectMediaService>.Instance);
    }

    public void Dispose() => _fixture.Dispose();

    /* ---------------------------------------------------------- fixtures */

    private static byte[] Png(int width = 1600, int height = 1200)
    {
        var bytes = new byte[64];
        new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }.CopyTo(bytes, 0);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(8), 13);
        Encoding.ASCII.GetBytes("IHDR").CopyTo(bytes, 12);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(16), width);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(20), height);
        return bytes;
    }

    private async Task<int> NewProjectAsync(string slug = "maple-street-kitchen")
    {
        var project = new RenovationProject
        {
            Slug = slug,
            Title = "Maple Street Kitchen",
            CategoryName = "Kitchen Remodeling",
            CategorySlug = "kitchen-remodeling",
            Summary = "A tired galley kitchen opened into the dining room.",
            Challenge = "The layout was wrong.",
            Vision = "One continuous run.",
            Transformation = "We rebuilt it.",
        };
        _fixture.Db.RenovationProjects.Add(project);
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();
        return project.Id;
    }

    private Task<MediaWriteResult<AdminProjectImageDto>> UploadAsync(
        int projectId,
        ProjectImageKind kind = ProjectImageKind.Gallery,
        string alt = "A finished kitchen") =>
        _media.UploadAsync(projectId, Png(), kind, alt, null);

    /* ==================================================================== */
    /*  Upload                                                              */
    /* ==================================================================== */

    [Fact]
    public async Task An_upload_records_the_dimensions_read_from_the_file_itself()
    {
        var projectId = await NewProjectAsync();

        var result = await _media.UploadAsync(
            projectId, Png(1600, 1200), ProjectImageKind.Gallery, "A finished kitchen", "Looking north");

        Assert.True(result.Ok);
        Assert.Equal(1600, result.Image!.Width);
        Assert.Equal(1200, result.Image.Height);
        Assert.Equal("Looking north", result.Image.Caption);
        Assert.True(result.Image.IsUploaded);
    }

    [Fact]
    public async Task An_svg_is_refused_however_it_arrives()
    {
        var projectId = await NewProjectAsync();
        var svg = Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"><script/></svg>");

        var result = await _media.UploadAsync(
            projectId, svg, ProjectImageKind.Gallery, "Pretending to be a photo", null);

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.UnsupportedFormat, result.Rejection);
        // Nothing reached storage, and nothing was recorded.
        Assert.Empty(_storage.Saved);
        Assert.Empty(await _fixture.Db.RenovationProjectImages.ToListAsync());
    }

    [Fact]
    public async Task The_rejection_message_tells_an_iphone_owner_what_to_do()
    {
        var projectId = await NewProjectAsync();
        // HEIC: a real format, genuinely unsupported, and the commonest reason a
        // photograph from a phone will not upload.
        var heic = new byte[64];
        Encoding.ASCII.GetBytes("ftypheic").CopyTo(heic, 4);

        var result = await _media.UploadAsync(projectId, heic, ProjectImageKind.Gallery, "Photo", null);

        Assert.False(result.Ok);
        Assert.Contains("HEIC", result.Message);
    }

    [Fact]
    public async Task Uploading_to_a_project_that_does_not_exist_is_a_not_found()
    {
        var result = await UploadAsync(9999);

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.NotFound, result.Failure);
        Assert.Empty(_storage.Saved);
    }

    [Fact]
    public async Task The_stored_name_is_generated_and_never_taken_from_the_upload()
    {
        var projectId = await NewProjectAsync();
        await UploadAsync(projectId);

        var key = Assert.Single(_storage.Saved);
        // The service passes only bytes and an extension derived from the header.
        Assert.StartsWith($"projects/{projectId}/", key);
        Assert.EndsWith(".png", key);
    }

    /* ==================================================================== */
    /*  Cover                                                               */
    /* ==================================================================== */

    [Fact]
    public async Task A_project_can_only_have_one_cover()
    {
        var projectId = await NewProjectAsync();
        var first = await UploadAsync(projectId, ProjectImageKind.Cover, "First cover");
        var second = await UploadAsync(projectId, ProjectImageKind.Cover, "Second cover");

        Assert.True(second.Ok);

        var covers = await _fixture.Db.RenovationProjectImages
            .Where(i => i.RenovationProjectId == projectId && i.Kind == ProjectImageKind.Cover)
            .ToListAsync();

        var cover = Assert.Single(covers);
        Assert.Equal(second.Image!.Id, cover.Id);

        // The demoted one is kept as a gallery photo, not deleted.
        var demoted = await _fixture.Db.RenovationProjectImages.FindAsync(first.Image!.Id);
        Assert.Equal(ProjectImageKind.Gallery, demoted!.Kind);
        Assert.Empty(_storage.Deleted);
    }

    [Fact]
    public async Task Promoting_a_gallery_photo_to_cover_demotes_the_previous_one()
    {
        var projectId = await NewProjectAsync();
        var original = await UploadAsync(projectId, ProjectImageKind.Cover, "Original cover");
        var gallery = await UploadAsync(projectId, ProjectImageKind.Gallery, "A gallery shot");
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.SetCoverAsync(projectId, gallery.Image!.Id);

        Assert.True(result.Ok);
        _fixture.Db.ChangeTracker.Clear();

        var images = await _fixture.Db.RenovationProjectImages.ToDictionaryAsync(i => i.Id);
        Assert.Equal(ProjectImageKind.Cover, images[gallery.Image.Id].Kind);
        Assert.Equal(ProjectImageKind.Gallery, images[original.Image!.Id].Kind);
    }

    [Fact]
    public async Task A_photo_from_another_project_cannot_be_made_this_one_s_cover()
    {
        var mine = await NewProjectAsync("mine");
        var theirs = await NewProjectAsync("theirs");
        var theirImage = await UploadAsync(theirs, ProjectImageKind.Gallery, "Their photo");
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.SetCoverAsync(mine, theirImage.Image!.Id);

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.NotFound, result.Failure);
    }

    /* ==================================================================== */
    /*  Scoping — the IDOR cases                                            */
    /* ==================================================================== */

    [Fact]
    public async Task A_photo_cannot_be_edited_through_a_different_project()
    {
        var mine = await NewProjectAsync("mine");
        var theirs = await NewProjectAsync("theirs");
        var theirImage = await UploadAsync(theirs, ProjectImageKind.Gallery, "Their photo");
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.UpdateAsync(mine, theirImage.Image!.Id, new ProjectImageUpdateDto
        {
            AltText = "Renamed by somebody else",
            Kind = ProjectImageKind.Gallery,
            DisplayOrder = 0,
        });

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.NotFound, result.Failure);

        var untouched = await _fixture.Db.RenovationProjectImages.FindAsync(theirImage.Image.Id);
        Assert.Equal("Their photo", untouched!.AltText);
    }

    [Fact]
    public async Task A_photo_cannot_be_deleted_through_a_different_project()
    {
        var mine = await NewProjectAsync("mine");
        var theirs = await NewProjectAsync("theirs");
        var theirImage = await UploadAsync(theirs, ProjectImageKind.Gallery, "Their photo");
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.DeleteAsync(mine, theirImage.Image!.Id);

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.NotFound, result.Failure);
        Assert.Empty(_storage.Deleted);
        Assert.Single(await _fixture.Db.RenovationProjectImages.ToListAsync());
    }

    [Fact]
    public async Task Reordering_ignores_ids_belonging_to_another_project()
    {
        var mine = await NewProjectAsync("mine");
        var theirs = await NewProjectAsync("theirs");
        var a = await UploadAsync(mine, ProjectImageKind.Gallery, "Mine A");
        var b = await UploadAsync(mine, ProjectImageKind.Gallery, "Mine B");
        var theirImage = await UploadAsync(theirs, ProjectImageKind.Gallery, "Theirs");
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.ReorderAsync(mine, [b.Image!.Id, theirImage.Image!.Id, a.Image!.Id]);

        Assert.True(result.Ok);
        _fixture.Db.ChangeTracker.Clear();

        var images = await _fixture.Db.RenovationProjectImages.ToDictionaryAsync(i => i.Id);
        Assert.Equal(0, images[b.Image.Id].DisplayOrder);
        Assert.Equal(1, images[a.Image.Id].DisplayOrder);
        // Their photo was silently skipped, not renumbered.
        Assert.Equal(0, images[theirImage.Image.Id].DisplayOrder);
    }

    /* ==================================================================== */
    /*  Deletion and files                                                  */
    /* ==================================================================== */

    [Fact]
    public async Task Deleting_a_photo_removes_its_file()
    {
        var projectId = await NewProjectAsync();
        var image = await UploadAsync(projectId);
        var key = _storage.Saved[0];
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.DeleteAsync(projectId, image.Image!.Id);

        Assert.True(result.Ok);
        Assert.Contains(key, _storage.Deleted);
    }

    [Fact]
    public async Task Deleting_bundled_artwork_never_touches_the_filesystem()
    {
        var projectId = await NewProjectAsync();

        // Seeded artwork ships with the app and carries no storage key.
        var bundled = new RenovationProjectImage
        {
            RenovationProjectId = projectId,
            Path = "/media/projects/example/cover.svg",
            AltText = "Bundled artwork",
            Width = 1200,
            Height = 800,
            Kind = ProjectImageKind.Gallery,
            StorageKey = null,
        };
        _fixture.Db.RenovationProjectImages.Add(bundled);
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.DeleteAsync(projectId, bundled.Id);

        Assert.True(result.Ok);
        Assert.Empty(_storage.Deleted);
    }

    /* ==================================================================== */
    /*  Before / after pairing                                              */
    /* ==================================================================== */

    [Fact]
    public async Task Pairing_two_photos_generates_the_key_for_you()
    {
        var projectId = await NewProjectAsync();
        var before = await UploadAsync(projectId, ProjectImageKind.Before, "The old kitchen");
        var after = await UploadAsync(projectId, ProjectImageKind.After, "The new kitchen");
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.SavePairAsync(projectId, new BeforeAfterPairDto
        {
            BeforeImageId = before.Image!.Id,
            AfterImageId = after.Image!.Id,
        });

        Assert.True(result.Ok);
        Assert.Equal(2, result.Value!.Count);

        var keys = result.Value.Select(i => i.PairKey).Distinct().ToList();
        var key = Assert.Single(keys);
        Assert.NotNull(key);
        // Nobody in the console should ever have to type one of these.
        Assert.StartsWith("pair-", key);
    }

    [Fact]
    public async Task A_photo_cannot_be_paired_with_itself()
    {
        var projectId = await NewProjectAsync();
        var image = await UploadAsync(projectId, ProjectImageKind.Before, "The old kitchen");
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.SavePairAsync(projectId, new BeforeAfterPairDto
        {
            BeforeImageId = image.Image!.Id,
            AfterImageId = image.Image.Id,
        });

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.Validation, result.Failure);
    }

    [Fact]
    public async Task A_photo_from_another_project_cannot_be_paired_in()
    {
        var mine = await NewProjectAsync("mine");
        var theirs = await NewProjectAsync("theirs");
        var myBefore = await UploadAsync(mine, ProjectImageKind.Before, "My before");
        var theirAfter = await UploadAsync(theirs, ProjectImageKind.After, "Their after");
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.SavePairAsync(mine, new BeforeAfterPairDto
        {
            BeforeImageId = myBefore.Image!.Id,
            AfterImageId = theirAfter.Image!.Id,
        });

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.NotFound, result.Failure);
    }

    [Fact]
    public async Task Replacing_one_half_of_a_pair_releases_the_photo_it_replaced()
    {
        var projectId = await NewProjectAsync();
        var before = await UploadAsync(projectId, ProjectImageKind.Before, "The old kitchen");
        var after = await UploadAsync(projectId, ProjectImageKind.After, "The new kitchen");
        var betterAfter = await UploadAsync(projectId, ProjectImageKind.After, "A better finished shot");
        _fixture.Db.ChangeTracker.Clear();

        var created = await _media.SavePairAsync(projectId, new BeforeAfterPairDto
        {
            BeforeImageId = before.Image!.Id,
            AfterImageId = after.Image!.Id,
        });
        var key = created.Value![0].PairKey!;
        _fixture.Db.ChangeTracker.Clear();

        var replaced = await _media.SavePairAsync(projectId, new BeforeAfterPairDto
        {
            PairKey = key,
            BeforeImageId = before.Image.Id,
            AfterImageId = betterAfter.Image!.Id,
        });

        Assert.True(replaced.Ok);
        _fixture.Db.ChangeTracker.Clear();

        var images = await _fixture.Db.RenovationProjectImages.ToDictionaryAsync(i => i.Id);
        Assert.Equal(key, images[before.Image.Id].PairKey);
        Assert.Equal(key, images[betterAfter.Image.Id].PairKey);
        // The one that was swapped out is loose again, not silently duplicated.
        Assert.Null(images[after.Image.Id].PairKey);
    }

    [Fact]
    public async Task Separating_a_pair_keeps_both_photographs()
    {
        var projectId = await NewProjectAsync();
        var before = await UploadAsync(projectId, ProjectImageKind.Before, "The old kitchen");
        var after = await UploadAsync(projectId, ProjectImageKind.After, "The new kitchen");
        _fixture.Db.ChangeTracker.Clear();

        var created = await _media.SavePairAsync(projectId, new BeforeAfterPairDto
        {
            BeforeImageId = before.Image!.Id,
            AfterImageId = after.Image!.Id,
        });
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.RemovePairAsync(projectId, created.Value![0].PairKey!);

        Assert.True(result.Ok);
        Assert.Empty(_storage.Deleted);
        _fixture.Db.ChangeTracker.Clear();

        var images = await _fixture.Db.RenovationProjectImages.ToListAsync();
        Assert.Equal(2, images.Count);
        Assert.All(images, image =>
        {
            Assert.Null(image.PairKey);
            Assert.Equal(ProjectImageKind.Gallery, image.Kind);
        });
    }

    [Fact]
    public async Task Changing_a_paired_photo_to_a_gallery_shot_drops_the_pairing()
    {
        var projectId = await NewProjectAsync();
        var before = await UploadAsync(projectId, ProjectImageKind.Before, "The old kitchen");
        var after = await UploadAsync(projectId, ProjectImageKind.After, "The new kitchen");
        _fixture.Db.ChangeTracker.Clear();

        await _media.SavePairAsync(projectId, new BeforeAfterPairDto
        {
            BeforeImageId = before.Image!.Id,
            AfterImageId = after.Image!.Id,
        });
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.UpdateAsync(projectId, before.Image.Id, new ProjectImageUpdateDto
        {
            AltText = "The old kitchen",
            Kind = ProjectImageKind.Gallery,
            DisplayOrder = 0,
        });

        Assert.True(result.Ok);
        // A half-pair would render a slider with one side missing.
        Assert.Null(result.Image!.PairKey);
    }
}
