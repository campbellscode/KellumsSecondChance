using System.Buffers.Binary;
using System.Text;
using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Infrastructure.Media;
using KellumsSecondChance.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Tests;

/// <summary>
/// Service photography and the social sharing card.
///
/// Both reuse the project upload path, so the format rules are already covered.
/// What matters here is what each one points at afterwards, and — the case that
/// bit once — which file it considers safe to delete.
/// </summary>
public class AdminMediaServiceTests : IDisposable
{
    private readonly TestDatabase _fixture = new();
    private readonly FakeMediaStorage _storage = new();
    private readonly FakeContentVersion _version = new();
    private readonly AdminMediaService _media;
    private readonly SiteContentService _publicContent;

    public AdminMediaServiceTests()
    {
        _media = new AdminMediaService(
            _fixture.Db,
            _storage,
            _version,
            Options.Create(new MediaStorageOptions
            {
                RootPath = null,
                PublicPathPrefix = "uploads",
                MaxUploadMegabytes = 12,
            }),
            NullLogger<AdminMediaService>.Instance);

        _publicContent = new SiteContentService(
            _fixture.Db,
            Options.Create(new BusinessOptions
            {
                BusinessName = "Kellum’s Second Chance Renovations",
                Tagline = "Your home deserves a second chance.",
            }));
    }

    public void Dispose() => _fixture.Dispose();

    private static byte[] Png(int width = 1200, int height = 630)
    {
        var bytes = new byte[64];
        new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }.CopyTo(bytes, 0);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(8), 13);
        Encoding.ASCII.GetBytes("IHDR").CopyTo(bytes, 12);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(16), width);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(20), height);
        return bytes;
    }

    private async Task<int> NewServiceAsync()
    {
        var service = new RenovationService
        {
            Slug = "kitchen-remodeling",
            Name = "Kitchen Remodeling",
            Tagline = "Kitchens rebuilt properly",
            Summary = "A full kitchen renovation.",
            Icon = "chef-hat",
            Headline = "Kitchens",
            Introduction = "We renovate kitchens.",
        };
        _fixture.Db.RenovationServices.Add(service);
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();
        return service.Id;
    }

    /* ==================================================================== */
    /*  Service imagery                                                     */
    /* ==================================================================== */

    [Fact]
    public async Task A_service_image_records_the_dimensions_read_from_the_file()
    {
        var id = await NewServiceAsync();

        var result = await _media.SetServiceImageAsync(id, Png(1600, 1000), "A finished kitchen");

        Assert.True(result.Ok);
        Assert.Equal(1600, result.Image!.Width);
        Assert.Equal(1000, result.Image.Height);

        var service = await _fixture.Db.RenovationServices.FindAsync(id);
        Assert.Equal(1600, service!.ImageWidth);
        Assert.Equal("A finished kitchen", service.ImageAlt);
        Assert.StartsWith("/uploads/services/", service.ImagePath);
    }

    [Fact]
    public async Task A_service_image_needs_a_description()
    {
        var id = await NewServiceAsync();

        var result = await _media.SetServiceImageAsync(id, Png(), "  ");

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.Validation, result.Failure);
        Assert.Empty(_storage.Saved);
    }

    [Fact]
    public async Task An_svg_is_refused_as_a_service_image()
    {
        var id = await NewServiceAsync();
        var svg = Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"><script/></svg>");

        var result = await _media.SetServiceImageAsync(id, svg, "Pretending to be a photo");

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.UnsupportedFormat, result.Rejection);
        Assert.Empty(_storage.Saved);
    }

    [Fact]
    public async Task Replacing_a_service_image_deletes_the_one_it_replaced()
    {
        var id = await NewServiceAsync();

        await _media.SetServiceImageAsync(id, Png(), "First photograph");
        var firstKey = _storage.Saved[0];
        _fixture.Db.ChangeTracker.Clear();

        await _media.SetServiceImageAsync(id, Png(), "Second photograph");

        Assert.Contains(firstKey, _storage.Deleted);
        Assert.Equal(2, _storage.Saved.Count);
    }

    [Fact]
    public async Task Clearing_a_service_image_that_was_never_uploaded_touches_no_file()
    {
        var id = await NewServiceAsync();
        var service = await _fixture.Db.RenovationServices.FindAsync(id);

        // Seeded artwork lives outside the media root and has no storage key.
        service!.ImagePath = "/media/services/kitchen.svg";
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.RemoveServiceImageAsync(id);

        Assert.True(result.Ok);
        Assert.Empty(_storage.Deleted);
    }

    [Fact]
    public async Task Uploading_to_a_service_that_does_not_exist_is_a_not_found()
    {
        var result = await _media.SetServiceImageAsync(9999, Png(), "A photograph");

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.NotFound, result.Failure);
    }

    /* ==================================================================== */
    /*  Social sharing card                                                 */
    /* ==================================================================== */

    [Fact]
    public async Task A_social_card_is_published_to_the_public_profile()
    {
        var before = await _publicContent.GetAsync();
        Assert.Null(before.OgImagePath);

        var result = await _media.SetSocialImageAsync(Png(1200, 630));

        Assert.True(result.Ok);

        var after = await _publicContent.GetAsync();
        Assert.Equal(result.Image!.Src, after.OgImagePath);
        Assert.StartsWith("/uploads/brand/", after.OgImagePath);
    }

    [Fact]
    public async Task An_svg_can_never_become_the_social_card()
    {
        // Every platform renders an SVG preview as a blank card, so this is the
        // difference between a shared link that looks like a business and one
        // that looks broken.
        var svg = Encoding.UTF8.GetBytes("<svg xmlns=\"http://www.w3.org/2000/svg\"/>");

        var result = await _media.SetSocialImageAsync(svg);

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.UnsupportedFormat, result.Rejection);
    }

    [Fact]
    public async Task A_card_too_small_to_render_as_a_large_preview_is_refused()
    {
        var result = await _media.SetSocialImageAsync(Png(300, 200));

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.Validation, result.Failure);
        Assert.Contains("1200", result.Message);
    }

    [Fact]
    public async Task Replacing_the_card_deletes_only_the_previous_upload()
    {
        await _media.SetSocialImageAsync(Png());
        var firstKey = _storage.Saved[0];
        _fixture.Db.ChangeTracker.Clear();

        await _media.SetSocialImageAsync(Png());

        Assert.Contains(firstKey, _storage.Deleted);
    }

    [Fact]
    public async Task A_hand_typed_sharing_path_is_never_treated_as_a_file_to_delete()
    {
        /*
         * THE CASE THIS GUARDS.
         *
         * ogImagePath is a field an administrator can type. If the file to
         * delete were derived from it, entering a project photograph's path and
         * then uploading a new card would delete that photograph.
         *
         * The key comes from a separate row written only by the upload, so a
         * typed value has nothing to delete.
         */
        _fixture.Db.SiteSettings.Add(new SiteSetting
        {
            Key = SiteSettingsWriteService.Keys.OgImagePath,
            Value = "/uploads/projects/7/somebody-elses-photo.png",
        });
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.ChangeTracker.Clear();

        var result = await _media.SetSocialImageAsync(Png());

        Assert.True(result.Ok);
        Assert.Empty(_storage.Deleted);
        Assert.DoesNotContain("projects/7/somebody-elses-photo.png", _storage.Deleted);
    }

    [Fact]
    public async Task Every_media_write_bumps_the_public_content_version()
    {
        var id = await NewServiceAsync();
        var before = _version.Bumps;

        await _media.SetServiceImageAsync(id, Png(), "A photograph");
        await _media.SetSocialImageAsync(Png());
        _fixture.Db.ChangeTracker.Clear();
        await _media.RemoveServiceImageAsync(id);

        Assert.Equal(before + 3, _version.Bumps);
    }
}
