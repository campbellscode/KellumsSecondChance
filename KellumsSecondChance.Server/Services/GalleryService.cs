using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure.Media;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Services;

public interface IGalleryService
{
    Task<IReadOnlyList<GalleryImageDto>> PublicAsync(CancellationToken ct = default);
    Task<IReadOnlyList<AdminGalleryImageDto>> AdminAsync(CancellationToken ct = default);
    Task<MediaWriteResult<AdminGalleryImageDto>> UploadAsync(byte[] bytes, string originalName, string alt, string? caption, CancellationToken ct = default);
    Task<WriteResult<AdminGalleryImageDto>> UpdateAsync(int id, GalleryImageUpdateDto dto, CancellationToken ct = default);
    Task<WriteResult<bool>> ReorderAsync(IReadOnlyList<int> ids, CancellationToken ct = default);
    Task<WriteResult<bool>> DeleteAsync(int id, CancellationToken ct = default);
}

public sealed class GalleryService(KellumsDbContext db, IMediaStorage storage, IContentVersion version,
    IOptions<MediaStorageOptions> options) : IGalleryService
{
    private readonly MediaStorageOptions _options = options.Value;

    public async Task<IReadOnlyList<GalleryImageDto>> PublicAsync(CancellationToken ct = default) =>
        await db.GalleryImages.AsNoTracking().Where(x => x.IsActive)
            .OrderBy(x => x.DisplayOrder).ThenBy(x => x.CreatedAtUtc).ThenBy(x => x.Id)
            .Select(x => new GalleryImageDto(x.Id, x.ImagePath, x.AltText, x.Caption, x.Width, x.Height, x.DisplayOrder)).ToListAsync(ct);

    public async Task<IReadOnlyList<AdminGalleryImageDto>> AdminAsync(CancellationToken ct = default)
    {
        var rows = await db.GalleryImages.AsNoTracking().OrderBy(x => x.DisplayOrder).ThenBy(x => x.CreatedAtUtc).ThenBy(x => x.Id).ToListAsync(ct);
        return rows.Select(Map).ToList();
    }

    public async Task<MediaWriteResult<AdminGalleryImageDto>> UploadAsync(byte[] bytes, string originalName, string alt, string? caption, CancellationToken ct = default)
    {
        var inspection = ImageInspector.Inspect(bytes, _options.MaxUploadBytes);
        if (!inspection.Ok) return MediaWriteResult<AdminGalleryImageDto>.Rejected(inspection.Rejection!.Value, ProjectMediaService.DescribeRejection(inspection.Rejection.Value));
        var detected = inspection.Image!;
        var claimedExtension = Path.GetExtension(originalName).ToLowerInvariant();
        if (claimedExtension is not (".jpg" or ".jpeg" or ".png" or ".webp") ||
            (claimedExtension is ".jpg" or ".jpeg" ? detected.Extension != ".jpg" : claimedExtension != detected.Extension))
            return MediaWriteResult<AdminGalleryImageDto>.Rejected(ImageRejection.UnsupportedFormat, "The filename extension does not match the image format.");

        var stored = await storage.SaveAsync(MediaScope.Gallery(), bytes, detected.Extension, ct);
        var next = await db.GalleryImages.Select(x => (int?)x.DisplayOrder).MaxAsync(ct) ?? 0;
        var row = new GalleryImage {
            ImagePath = stored.PublicPath, StorageKey = stored.StorageKey, OriginalFileName = Path.GetFileName(originalName),
            AltText = string.IsNullOrWhiteSpace(alt) ? "Exterior renovation gallery photograph." : alt.Trim(),
            Caption = string.IsNullOrWhiteSpace(caption) ? null : caption.Trim(), Width = detected.Width, Height = detected.Height,
            ContentType = detected.ContentType, FileSizeBytes = stored.SizeBytes, DisplayOrder = next + 1, IsActive = true
        };
        db.GalleryImages.Add(row); await db.SaveChangesAsync(ct); version.Bump();
        return MediaWriteResult<AdminGalleryImageDto>.Success(Map(row));
    }

    public async Task<WriteResult<AdminGalleryImageDto>> UpdateAsync(int id, GalleryImageUpdateDto dto, CancellationToken ct = default)
    {
        var row = await db.GalleryImages.FindAsync([id], ct);
        if (row is null) return WriteResult<AdminGalleryImageDto>.NotFound("That gallery photo no longer exists.");
        row.AltText = dto.AltText.Trim(); row.Caption = string.IsNullOrWhiteSpace(dto.Caption) ? null : dto.Caption.Trim(); row.IsActive = dto.IsActive;
        await db.SaveChangesAsync(ct); version.Bump(); return WriteResult<AdminGalleryImageDto>.Success(Map(row));
    }

    public async Task<WriteResult<bool>> ReorderAsync(IReadOnlyList<int> ids, CancellationToken ct = default)
    {
        var rows = await db.GalleryImages.OrderBy(x => x.DisplayOrder).ThenBy(x => x.Id).ToListAsync(ct);
        if (ids.Count != rows.Count || ids.Distinct().Count() != rows.Count || ids.Any(id => rows.All(x => x.Id != id)))
            return WriteResult<bool>.Invalid(nameof(ids), "The order must include every gallery photo exactly once.");
        var byId = rows.ToDictionary(x => x.Id); for (var i = 0; i < ids.Count; i++) byId[ids[i]].DisplayOrder = i + 1;
        await db.SaveChangesAsync(ct); version.Bump(); return WriteResult<bool>.Success(true);
    }

    public async Task<WriteResult<bool>> DeleteAsync(int id, CancellationToken ct = default)
    {
        var row = await db.GalleryImages.FindAsync([id], ct);
        if (row is null) return WriteResult<bool>.NotFound("That gallery photo no longer exists.");
        var key = row.StorageKey; db.GalleryImages.Remove(row); await db.SaveChangesAsync(ct); version.Bump();
        if (!string.IsNullOrWhiteSpace(key) && !await db.GalleryImages.AnyAsync(x => x.StorageKey == key, ct)) await storage.DeleteAsync(key, ct);
        return WriteResult<bool>.Success(true);
    }

    private static AdminGalleryImageDto Map(GalleryImage x) => new(x.Id, x.ImagePath, x.OriginalFileName, x.AltText, x.Caption,
        x.Width, x.Height, x.IsActive, x.DisplayOrder, x.StorageKey is not null, x.FileSizeBytes);
}
