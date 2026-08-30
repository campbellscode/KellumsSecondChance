using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure.Media;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Services;

/// <summary>
/// Imagery that is not attached to a project: the photograph on a service page,
/// and the card that appears when somebody shares a link to the site.
///
/// Both go through exactly the same validation and storage path as project
/// photography — the bytes decide the format, filenames are generated, and
/// nothing the client sends becomes a path. The only differences are where the
/// file lands and what record points at it.
/// </summary>
public interface IAdminMediaService
{
    Task<MediaWriteResult<UploadedImageDto>> SetServiceImageAsync(
        int serviceId,
        byte[] content,
        string altText,
        CancellationToken ct = default);

    Task<WriteResult<bool>> RemoveServiceImageAsync(int serviceId, CancellationToken ct = default);

    Task<MediaWriteResult<UploadedImageDto>> SetSocialImageAsync(byte[] content, CancellationToken ct = default);
}

public class AdminMediaService(
    KellumsDbContext db,
    IMediaStorage storage,
    IContentVersion contentVersion,
    IOptions<MediaStorageOptions> mediaOptions,
    ILogger<AdminMediaService> logger) : IAdminMediaService
{
    private readonly MediaStorageOptions _media = mediaOptions.Value;

    /*
     * Facebook, LinkedIn and iMessage all crop a sharing card towards 1.91:1 and
     * refuse anything under 200px on an edge. 600x315 is the smallest size that
     * still renders as a large card rather than a thumbnail, so it is the floor;
     * the console advises 1200x630 and warns when the ratio is off, rather than
     * rejecting a picture the business is happy with.
     */
    private const int MinSocialWidth = 600;
    private const int MinSocialHeight = 315;

    /* ==================================================================== */
    /*  Service page imagery                                                */
    /* ==================================================================== */

    public async Task<MediaWriteResult<UploadedImageDto>> SetServiceImageAsync(
        int serviceId,
        byte[] content,
        string altText,
        CancellationToken ct = default)
    {
        var service = await db.RenovationServices.FirstOrDefaultAsync(s => s.Id == serviceId, ct);
        if (service is null) return MediaWriteResult<UploadedImageDto>.NotFound("That service no longer exists.");

        if (altText.Trim().Length < 3)
        {
            return MediaWriteResult<UploadedImageDto>.Invalid(
                "Describe the photograph so screen readers can announce it.");
        }

        var inspection = ImageInspector.Inspect(content, _media.MaxUploadBytes);
        if (!inspection.Ok)
        {
            var rejection = inspection.Rejection!.Value;
            logger.LogWarning("Rejected service image for {ServiceId}: {Rejection}.", serviceId, rejection);
            return MediaWriteResult<UploadedImageDto>.Rejected(rejection, ProjectMediaService.DescribeRejection(rejection));
        }

        var image = inspection.Image!;
        var previousKey = ExtractStorageKey(service.ImagePath);

        var stored = await storage.SaveAsync(MediaScope.Service(serviceId), content, image.Extension, ct);

        service.ImagePath = stored.PublicPath;
        service.ImageWidth = image.Width;
        service.ImageHeight = image.Height;
        service.ImageAlt = altText.Trim();

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();

        // The replaced file goes only after the new one is safely recorded, so a
        // failure part-way through leaves the page showing the old picture
        // rather than a broken one.
        if (previousKey is not null) await storage.DeleteAsync(previousKey, ct);

        logger.LogInformation(
            "Service {ServiceId} image replaced ({Width}x{Height}).", serviceId, image.Width, image.Height);

        return MediaWriteResult<UploadedImageDto>.Success(new UploadedImageDto(
            stored.PublicPath, image.Width, image.Height, service.ImageAlt, stored.SizeBytes));
    }

    public async Task<WriteResult<bool>> RemoveServiceImageAsync(
        int serviceId,
        CancellationToken ct = default)
    {
        var service = await db.RenovationServices.FirstOrDefaultAsync(s => s.Id == serviceId, ct);
        if (service is null) return WriteResult<bool>.NotFound("That service no longer exists.");

        var key = ExtractStorageKey(service.ImagePath);

        service.ImagePath = null;
        service.ImageWidth = null;
        service.ImageHeight = null;
        service.ImageAlt = null;

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();

        // Seeded artwork lives outside the media root and has no storage key;
        // clearing the reference is all that happens for those.
        if (key is not null) await storage.DeleteAsync(key, ct);

        return WriteResult<bool>.Success(true);
    }

    /* ==================================================================== */
    /*  Social sharing card                                                 */
    /* ==================================================================== */

    public async Task<MediaWriteResult<UploadedImageDto>> SetSocialImageAsync(
        byte[] content,
        CancellationToken ct = default)
    {
        var inspection = ImageInspector.Inspect(content, _media.MaxUploadBytes);
        if (!inspection.Ok)
        {
            var rejection = inspection.Rejection!.Value;
            return MediaWriteResult<UploadedImageDto>.Rejected(rejection, ProjectMediaService.DescribeRejection(rejection));
        }

        var image = inspection.Image!;

        /*
         * SVG cannot reach here — ImageInspector refuses it on signature — which
         * is exactly what §33 requires, and what stops every shared link showing
         * a blank card.
         */
        if (image.Width < MinSocialWidth || image.Height < MinSocialHeight)
        {
            return MediaWriteResult<UploadedImageDto>.Invalid(
                $"That image is {image.Width}×{image.Height}. A sharing card needs to be at least "
                + $"{MinSocialWidth}×{MinSocialHeight}, and 1200×630 looks best.");
        }

        var settings = await db.SiteSettings
            .Where(s => s.Key == SiteSettingsWriteService.Keys.OgImagePath
                        || s.Key == SiteSettingsWriteService.Keys.OgImageStorageKey)
            .ToDictionaryAsync(s => s.Key, ct);

        /*
         * The key of the file we are replacing comes from OUR OWN record of
         * what this endpoint last uploaded — never from the public path, which
         * an administrator can type by hand.
         *
         * Deriving it from the typed path would mean entering
         * "/uploads/projects/7/photo.png" as the sharing image and then
         * uploading a new card, and watching a project photograph disappear.
         */
        var previousKey = settings.TryGetValue(SiteSettingsWriteService.Keys.OgImageStorageKey, out var keyRow)
            ? keyRow.Value
            : null;

        var stored = await storage.SaveAsync(MediaScope.Brand(), content, image.Extension, ct);

        Upsert(settings, SiteSettingsWriteService.Keys.OgImagePath, stored.PublicPath);
        Upsert(settings, SiteSettingsWriteService.Keys.OgImageStorageKey, stored.StorageKey);

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();

        if (previousKey is not null) await storage.DeleteAsync(previousKey, ct);

        logger.LogInformation("Social sharing card replaced ({Width}x{Height}).", image.Width, image.Height);

        return MediaWriteResult<UploadedImageDto>.Success(new UploadedImageDto(
            stored.PublicPath, image.Width, image.Height, "Social sharing card", stored.SizeBytes));
    }

    /* ==================================================================== */
    /*  Helpers                                                             */
    /* ==================================================================== */

    private void Upsert(Dictionary<string, SiteSetting> settings, string key, string value)
    {
        if (settings.TryGetValue(key, out var existing)) existing.Value = value;
        else db.SiteSettings.Add(new SiteSetting { Key = key, Value = value });
    }

    /// <summary>
    /// Recovers the storage key from a public path THIS SERVICE WROTE.
    ///
    /// Used only for service imagery, where ImagePath is set exclusively by the
    /// upload endpoint and is not an admin-typed field. Returns null for
    /// anything outside the media root — bundled artwork under /media, or a
    /// seeded value — so only a file the application itself stored is ever a
    /// candidate for deletion. The storage layer validates the key again before
    /// touching the disk.
    /// </summary>
    private string? ExtractStorageKey(string? publicPath)
    {
        if (string.IsNullOrWhiteSpace(publicPath)) return null;

        var prefix = "/" + _media.PublicPathPrefix.Trim('/') + "/";
        if (!publicPath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return null;

        var key = publicPath[prefix.Length..];
        return key.Length == 0 ? null : key;
    }
}
