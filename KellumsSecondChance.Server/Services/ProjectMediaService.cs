using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure.Media;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Services;

/// <summary>Why an upload was refused, in terms the controller can map to a status.</summary>
public sealed record MediaWriteResult<T>(
    T? Image,
    WriteFailure? Failure,
    ImageRejection? Rejection,
    string? Message)
    where T : class
{
    public bool Ok => Failure is null && Rejection is null;

    public static MediaWriteResult<T> Success(T image) => new(image, null, null, null);

    public static MediaWriteResult<T> NotFound(string message) =>
        new(null, WriteFailure.NotFound, null, message);

    public static MediaWriteResult<T> Rejected(ImageRejection rejection, string message) =>
        new(null, null, rejection, message);

    public static MediaWriteResult<T> Invalid(string message) =>
        new(null, WriteFailure.Validation, null, message);
}

public interface IProjectMediaService
{
    Task<MediaWriteResult<AdminProjectImageDto>> UploadAsync(
        int projectId,
        byte[] content,
        ProjectImageKind kind,
        string altText,
        string? caption,
        CancellationToken ct = default);

    Task<MediaWriteResult<AdminProjectImageDto>> UpdateAsync(
        int projectId,
        int imageId,
        ProjectImageUpdateDto dto,
        CancellationToken ct = default);

    Task<WriteResult<bool>> DeleteAsync(int projectId, int imageId, CancellationToken ct = default);

    Task<WriteResult<bool>> ReorderAsync(int projectId, IReadOnlyList<int> orderedIds, CancellationToken ct = default);

    Task<WriteResult<bool>> SetCoverAsync(int projectId, int imageId, CancellationToken ct = default);

    Task<WriteResult<IReadOnlyList<AdminProjectImageDto>>> SavePairAsync(
        int projectId,
        BeforeAfterPairDto dto,
        CancellationToken ct = default);

    Task<WriteResult<bool>> RemovePairAsync(int projectId, string pairKey, CancellationToken ct = default);

    Task<WriteResult<bool>> ReorderPairsAsync(
        int projectId,
        IReadOnlyList<string> orderedPairKeys,
        CancellationToken ct = default);
}

public class ProjectMediaService(
    KellumsDbContext db,
    IMediaStorage storage,
    IContentVersion contentVersion,
    IOptions<MediaStorageOptions> mediaOptions,
    ILogger<ProjectMediaService> logger) : IProjectMediaService
{
    private readonly MediaStorageOptions _media = mediaOptions.Value;

    /* ==================================================================== */
    /*  Upload                                                              */
    /* ==================================================================== */

    public async Task<MediaWriteResult<AdminProjectImageDto>> UploadAsync(
        int projectId,
        byte[] content,
        ProjectImageKind kind,
        string altText,
        string? caption,
        CancellationToken ct = default)
    {
        var project = await db.RenovationProjects
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == projectId, ct);

        if (project is null) return MediaWriteResult<AdminProjectImageDto>.NotFound("That project no longer exists.");

        /*
         * The bytes decide what this file is — not its name, and not the
         * Content-Type the browser claimed. Both of those are attacker
         * controlled. ImageInspector reads the actual container header.
         */
        var inspection = ImageInspector.Inspect(content, _media.MaxUploadBytes);
        if (!inspection.Ok)
        {
            var rejection = inspection.Rejection!.Value;
            logger.LogWarning(
                "Rejected upload for project {ProjectId}: {Rejection}.", projectId, rejection);
            return MediaWriteResult<AdminProjectImageDto>.Rejected(rejection, DescribeRejection(rejection));
        }

        var image = inspection.Image!;
        var stored = await storage.SaveAsync(MediaScope.Project(projectId), content, image.Extension, ct);

        var record = new RenovationProjectImage
        {
            RenovationProjectId = projectId,
            Path = stored.PublicPath,
            StorageKey = stored.StorageKey,
            Width = image.Width,
            Height = image.Height,
            ContentType = image.ContentType,
            FileSizeBytes = stored.SizeBytes,
            AltText = altText.Trim(),
            Caption = string.IsNullOrWhiteSpace(caption) ? null : caption.Trim(),
            Kind = kind,
            DisplayOrder = NextDisplayOrder(project, kind),
            CreatedAtUtc = DateTime.UtcNow,
        };

        db.RenovationProjectImages.Add(record);

        // Uploading a new cover demotes the old one in the same transaction.
        if (kind == ProjectImageKind.Cover) DemoteExistingCovers(project, except: record);

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();

        logger.LogInformation(
            "Uploaded {Kind} image {ImageId} ({Width}x{Height}) to project {ProjectId}.",
            kind, record.Id, image.Width, image.Height, projectId);

        return MediaWriteResult<AdminProjectImageDto>.Success(AdminContentService.ToImageDto(record));
    }

    /// <summary>
    /// Plain-language reason an upload was refused.
    ///
    /// Internal to the assembly so the service-image and social-card uploads
    /// give the identical wording — one refusal message per cause, not three
    /// variations of it.
    /// </summary>
    internal static string DescribeRejection(ImageRejection rejection) => rejection switch
    {
        ImageRejection.Empty => "That file was empty.",
        ImageRejection.TooLarge => "That photo is larger than the upload limit.",
        ImageRejection.UnsupportedFormat =>
            "Photos must be JPEG, PNG or WebP. If this is a HEIC from an iPhone, export it as JPEG first.",
        ImageRejection.Corrupt => "That file did not read as a valid photo.",
        ImageRejection.ImplausibleDimensions => "That image's dimensions are outside what we can accept.",
        _ => "That file could not be accepted.",
    };

    /* ==================================================================== */
    /*  Edit / delete                                                       */
    /* ==================================================================== */

    public async Task<MediaWriteResult<AdminProjectImageDto>> UpdateAsync(
        int projectId,
        int imageId,
        ProjectImageUpdateDto dto,
        CancellationToken ct = default)
    {
        // Scoped by BOTH ids: an image id from another project must not resolve,
        // or the endpoint becomes an IDOR.
        var image = await db.RenovationProjectImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.RenovationProjectId == projectId, ct);

        if (image is null) return MediaWriteResult<AdminProjectImageDto>.NotFound("That photo is not on this project.");

        var previousKind = image.Kind;

        image.AltText = dto.AltText.Trim();
        image.Caption = string.IsNullOrWhiteSpace(dto.Caption) ? null : dto.Caption.Trim();
        image.Kind = dto.Kind;
        image.DisplayOrder = dto.DisplayOrder;

        // Leaving a before/after role drops the pairing with it.
        if (previousKind != dto.Kind
            && dto.Kind is not (ProjectImageKind.Before or ProjectImageKind.After))
        {
            image.PairKey = null;
        }
        else if (dto.Kind is ProjectImageKind.Before or ProjectImageKind.After)
        {
            image.PairKey = string.IsNullOrWhiteSpace(dto.PairKey) ? image.PairKey : dto.PairKey.Trim();
        }

        if (dto.Kind == ProjectImageKind.Cover)
        {
            var project = await db.RenovationProjects
                .Include(p => p.Images)
                .FirstAsync(p => p.Id == projectId, ct);
            DemoteExistingCovers(project, except: image);
        }

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return MediaWriteResult<AdminProjectImageDto>.Success(AdminContentService.ToImageDto(image));
    }

    public async Task<WriteResult<bool>> DeleteAsync(int projectId, int imageId, CancellationToken ct = default)
    {
        var image = await db.RenovationProjectImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.RenovationProjectId == projectId, ct);

        if (image is null) return WriteResult<bool>.NotFound("That photo is not on this project.");

        // The key comes from OUR row, never from the request. No endpoint on this
        // service accepts a path, so no client can name a file to delete.
        var storageKey = image.StorageKey;

        db.RenovationProjectImages.Remove(image);
        await db.SaveChangesAsync(ct);
        contentVersion.Bump();

        if (!string.IsNullOrWhiteSpace(storageKey))
        {
            // Bundled artwork has no storage key and is never touched. A file
            // still referenced by another row survives.
            var stillReferenced = await db.RenovationProjectImages
                .AnyAsync(i => i.StorageKey == storageKey, ct);

            if (!stillReferenced) await storage.DeleteAsync(storageKey, ct);
        }

        return WriteResult<bool>.Success(true);
    }

    /* ==================================================================== */
    /*  Ordering                                                            */
    /* ==================================================================== */

    public async Task<WriteResult<bool>> ReorderAsync(
        int projectId,
        IReadOnlyList<int> orderedIds,
        CancellationToken ct = default)
    {
        var images = await db.RenovationProjectImages
            .Where(i => i.RenovationProjectId == projectId)
            .ToListAsync(ct);

        if (images.Count == 0) return WriteResult<bool>.NotFound("That project has no photos.");

        var byId = images.ToDictionary(i => i.Id);

        // Ids belonging to another project are ignored rather than applied.
        var order = 0;
        foreach (var id in orderedIds)
        {
            if (!byId.TryGetValue(id, out var image)) continue;
            image.DisplayOrder = order++;
        }

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<bool>.Success(true);
    }

    /* ==================================================================== */
    /*  Cover                                                               */
    /* ==================================================================== */

    /// <summary>
    /// Promotes one photo to cover and demotes any other.
    ///
    /// Enforced here rather than in the console so the invariant holds however
    /// the API is called: the public mapper picks "the Cover" and must never
    /// have to choose between two.
    /// </summary>
    public async Task<WriteResult<bool>> SetCoverAsync(int projectId, int imageId, CancellationToken ct = default)
    {
        var project = await db.RenovationProjects
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == projectId, ct);

        if (project is null) return WriteResult<bool>.NotFound("That project no longer exists.");

        var target = project.Images.FirstOrDefault(i => i.Id == imageId);
        if (target is null) return WriteResult<bool>.NotFound("That photo is not on this project.");

        DemoteExistingCovers(project, except: target);

        target.Kind = ProjectImageKind.Cover;
        target.PairKey = null;
        target.DisplayOrder = 0;

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<bool>.Success(true);
    }

    /// <summary>
    /// Any OTHER cover becomes a gallery image; the file itself is untouched.
    ///
    /// The exclusion is by entity reference rather than by id, because during an
    /// upload the incoming photo has been added to the change tracker but not
    /// yet saved — its id is still 0. Comparing ids there would match nothing,
    /// and relationship fix-up has already put the new row in
    /// <c>project.Images</c>, so the freshly uploaded cover would demote itself
    /// and the project would end up with no cover at all.
    /// </summary>
    private static void DemoteExistingCovers(RenovationProject project, RenovationProjectImage? except)
    {
        foreach (var existing in project.Images)
        {
            if (existing.Kind != ProjectImageKind.Cover) continue;
            if (ReferenceEquals(existing, except)) continue;
            // Belt and braces for a saved entity that arrived on a different
            // tracked instance.
            if (except is { Id: not 0 } && existing.Id == except.Id) continue;

            existing.Kind = ProjectImageKind.Gallery;
        }
    }

    /* ==================================================================== */
    /*  Before / after pairing                                              */
    /* ==================================================================== */

    /// <summary>
    /// Creates or updates one transformation pair.
    ///
    /// The pair key is generated here. An administrator picks two photos in the
    /// console and never sees, types or has to understand a key — but the public
    /// slider keeps consuming exactly the PairKey contract it always has.
    /// </summary>
    public async Task<WriteResult<IReadOnlyList<AdminProjectImageDto>>> SavePairAsync(
        int projectId,
        BeforeAfterPairDto dto,
        CancellationToken ct = default)
    {
        if (dto.BeforeImageId is null && dto.AfterImageId is null)
        {
            return WriteResult<IReadOnlyList<AdminProjectImageDto>>.Invalid(
                nameof(dto.BeforeImageId),
                "Choose at least one photo for the pair.");
        }

        if (dto.BeforeImageId is not null && dto.BeforeImageId == dto.AfterImageId)
        {
            return WriteResult<IReadOnlyList<AdminProjectImageDto>>.Invalid(
                nameof(dto.AfterImageId),
                "The before and after photos have to be different.");
        }

        var images = await db.RenovationProjectImages
            .Where(i => i.RenovationProjectId == projectId)
            .ToListAsync(ct);

        if (images.Count == 0)
        {
            return WriteResult<IReadOnlyList<AdminProjectImageDto>>.NotFound("That project has no photos.");
        }

        var pairKey = string.IsNullOrWhiteSpace(dto.PairKey)
            ? $"pair-{Guid.NewGuid():N}"[..13]
            : dto.PairKey.Trim();

        // Clear whoever currently holds this key, so replacing one side works.
        foreach (var existing in images.Where(i => i.PairKey == pairKey))
        {
            existing.PairKey = null;
        }

        var touched = new List<RenovationProjectImage>();

        if (dto.BeforeImageId is not null)
        {
            var before = images.FirstOrDefault(i => i.Id == dto.BeforeImageId);
            if (before is null)
            {
                return WriteResult<IReadOnlyList<AdminProjectImageDto>>.NotFound(
                    "That before photo is not on this project.");
            }
            before.Kind = ProjectImageKind.Before;
            before.PairKey = pairKey;
            touched.Add(before);
        }

        if (dto.AfterImageId is not null)
        {
            var after = images.FirstOrDefault(i => i.Id == dto.AfterImageId);
            if (after is null)
            {
                return WriteResult<IReadOnlyList<AdminProjectImageDto>>.NotFound(
                    "That after photo is not on this project.");
            }
            after.Kind = ProjectImageKind.After;
            after.PairKey = pairKey;
            touched.Add(after);
        }

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();

        return WriteResult<IReadOnlyList<AdminProjectImageDto>>.Success(
            touched.Select(AdminContentService.ToImageDto).ToList());
    }

    /// <summary>
    /// Puts the transformations in the order the business wants them shown.
    ///
    /// The public page derives pair order from the DisplayOrder of the BEFORE
    /// photographs, so reordering pairs means renumbering those — and their
    /// partners with them, so a pair never straddles another.
    ///
    /// Only Before/After rows are touched. Cover and Gallery photographs keep
    /// their own numbering, which is safe because every consumer filters by kind
    /// before it sorts.
    /// </summary>
    public async Task<WriteResult<bool>> ReorderPairsAsync(
        int projectId,
        IReadOnlyList<string> orderedPairKeys,
        CancellationToken ct = default)
    {
        var paired = await db.RenovationProjectImages
            .Where(i => i.RenovationProjectId == projectId && i.PairKey != null)
            .ToListAsync(ct);

        if (paired.Count == 0) return WriteResult<bool>.NotFound("That project has no transformations.");

        var byKey = paired
            .GroupBy(i => i.PairKey!)
            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.Ordinal);

        var position = 0;
        foreach (var key in orderedPairKeys)
        {
            // A key from another project, or one already removed, is skipped
            // rather than applied — the same rule the image reorder follows.
            if (!byKey.TryGetValue(key, out var images)) continue;

            foreach (var image in images)
            {
                image.DisplayOrder = image.Kind == ProjectImageKind.Before
                    ? position * 2
                    : position * 2 + 1;
            }

            position++;
        }

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<bool>.Success(true);
    }

    /// <summary>
    /// Breaks a pair apart. The photos stay on the project as gallery images —
    /// unpairing is not deleting.
    /// </summary>
    public async Task<WriteResult<bool>> RemovePairAsync(
        int projectId,
        string pairKey,
        CancellationToken ct = default)
    {
        var images = await db.RenovationProjectImages
            .Where(i => i.RenovationProjectId == projectId && i.PairKey == pairKey)
            .ToListAsync(ct);

        if (images.Count == 0) return WriteResult<bool>.NotFound("That pair no longer exists.");

        foreach (var image in images)
        {
            image.PairKey = null;
            image.Kind = ProjectImageKind.Gallery;
        }

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<bool>.Success(true);
    }

    private static int NextDisplayOrder(RenovationProject project, ProjectImageKind kind)
    {
        var siblings = project.Images.Where(i => i.Kind == kind).ToList();
        return siblings.Count == 0 ? 0 : siblings.Max(i => i.DisplayOrder) + 1;
    }
}
