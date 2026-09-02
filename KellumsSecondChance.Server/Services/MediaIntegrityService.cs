using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Services;

public sealed record MediaIntegrityReport(IReadOnlyList<string> MissingFiles, IReadOnlyList<string> UnreferencedFiles);
public interface IMediaIntegrityService { Task<MediaIntegrityReport> CheckAsync(CancellationToken ct = default); }

/// <summary>Read-only reconciliation of application-managed keys. Never repairs or exposes the root path.</summary>
public sealed class MediaIntegrityService(KellumsDbContext db, IOptions<MediaStorageOptions> options, IWebHostEnvironment environment) : IMediaIntegrityService
{
    public async Task<MediaIntegrityReport> CheckAsync(CancellationToken ct = default)
    {
        var prefix = "/" + options.Value.PublicPathPrefix.Trim('/') + "/";
        var referenced = (await db.RenovationProjectImages.AsNoTracking().Where(x => x.StorageKey != null).Select(x => x.StorageKey!).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var servicePaths = await db.RenovationServices.AsNoTracking().Where(x => x.ImagePath != null && x.ImagePath.StartsWith(prefix)).Select(x => x.ImagePath!).ToListAsync(ct);
        foreach (var path in servicePaths) referenced.Add(path[prefix.Length..]);
        var socialKey = await db.SiteSettings.AsNoTracking().Where(x => x.Key == SiteSettingsWriteService.Keys.OgImageStorageKey).Select(x => x.Value).SingleOrDefaultAsync(ct);
        if (!string.IsNullOrWhiteSpace(socialKey)) referenced.Add(socialKey);

        var root = Path.GetFullPath(string.IsNullOrWhiteSpace(options.Value.RootPath)
            ? Path.Combine(environment.ContentRootPath, "wwwroot", "uploads") : options.Value.RootPath);
        var files = Directory.Exists(root)
            ? Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories).Select(x => Path.GetRelativePath(root, x).Replace('\\', '/')).ToHashSet(StringComparer.OrdinalIgnoreCase)
            : new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        return new(referenced.Except(files).Order().ToList(), files.Except(referenced).Order().ToList());
    }
}
