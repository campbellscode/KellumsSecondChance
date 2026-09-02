using System.Security.Cryptography;
using KellumsSecondChance.Server.Configuration;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Infrastructure.Media;

/// <summary>A stored file, as the application refers to it.</summary>
/// <param name="StorageKey">
/// Application-controlled relative identifier, e.g. "projects/7/a1b2….webp".
/// This is what goes in the database. It is never a filesystem path and never
/// comes from the client.
/// </param>
/// <param name="PublicPath">Root-relative URL the browser requests.</param>
public sealed record StoredMedia(string StorageKey, string PublicPath, long SizeBytes);

/// <summary>
/// Which part of the site a file belongs to.
///
/// The folder is chosen by the APPLICATION, never by the client. Keeping it a
/// closed set rather than a free string means no caller can invent a location,
/// and the storage layer can validate the whole key it builds.
/// </summary>
public readonly record struct MediaScope
{
    private MediaScope(string folder) => Folder = folder;

    /// <summary>Relative folder under the media root, e.g. "projects/7".</summary>
    public string Folder { get; }

    /// <summary>Photography attached to one case study.</summary>
    public static MediaScope Project(int projectId) => new($"projects/{projectId}");

    /// <summary>The illustrative photograph on a service page.</summary>
    public static MediaScope Service(int serviceId) => new($"services/{serviceId}");

    /// <summary>Brand-level artwork: the social sharing card.</summary>
    public static MediaScope Brand() => new("brand");

    /// <summary>Standalone photographs managed by the Gallery CMS.</summary>
    public static MediaScope Gallery() => new("gallery");

    public override string ToString() => Folder;
}

/// <summary>
/// Where uploaded imagery lives.
///
/// Business logic never touches a physical path: it hands over bytes and a
/// scope, and gets back an opaque storage key. Swapping local disk for blob
/// storage later is an implementation of this interface and nothing else.
/// </summary>
public interface IMediaStorage
{
    Task<StoredMedia> SaveAsync(
        MediaScope scope,
        byte[] content,
        string extension,
        CancellationToken ct = default);

    /// <summary>
    /// Deletes a stored file. Returns false if it was already gone, which is a
    /// tolerated outcome rather than an error.
    /// </summary>
    Task<bool> DeleteAsync(string storageKey, CancellationToken ct = default);

    /// <summary>Root-relative URL for a stored key.</summary>
    string ToPublicPath(string storageKey);
}

public class LocalMediaStorage(
    IOptions<MediaStorageOptions> options,
    IWebHostEnvironment environment,
    ILogger<LocalMediaStorage> logger) : IMediaStorage
{
    private readonly MediaStorageOptions _options = options.Value;

    /// <summary>Absolute, fully-resolved root. Nothing may be written outside it.</summary>
    private string Root
    {
        get
        {
            var configured = _options.RootPath;
            var basePath = string.IsNullOrWhiteSpace(configured)
                ? Path.Combine(environment.ContentRootPath, "wwwroot", "uploads")
                : configured;

            return Path.GetFullPath(basePath);
        }
    }

    public async Task<StoredMedia> SaveAsync(
        MediaScope scope,
        byte[] content,
        string extension,
        CancellationToken ct = default)
    {
        /*
         * The filename is generated, never derived from the upload.
         *
         * That single decision removes path traversal, double-extension tricks,
         * collisions and the possibility of overwriting an existing file. The
         * extension comes from ImageInspector's verdict on the actual bytes, not
         * from anything the client said.
         */
        var safeExtension = NormaliseExtension(extension);
        var fileName = $"{Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant()}{safeExtension}";
        var storageKey = $"{scope.Folder}/{fileName}";

        var destination = ResolveWithinRoot(storageKey)
            ?? throw new InvalidOperationException("Generated storage key resolved outside the media root.");

        Directory.CreateDirectory(Path.GetDirectoryName(destination)!);
        await File.WriteAllBytesAsync(destination, content, ct);

        logger.LogInformation(
            "Stored media {StorageKey} ({Bytes} bytes) in scope {Scope}.",
            storageKey,
            content.Length,
            scope.Folder);

        return new StoredMedia(storageKey, ToPublicPath(storageKey), content.Length);
    }

    public Task<bool> DeleteAsync(string storageKey, CancellationToken ct = default)
    {
        var path = ResolveWithinRoot(storageKey);

        // A key that escapes the root is refused outright rather than deleted.
        if (path is null)
        {
            logger.LogWarning("Refused to delete media for a key outside the storage root.");
            return Task.FromResult(false);
        }

        if (!File.Exists(path)) return Task.FromResult(false);

        try
        {
            File.Delete(path);
            return Task.FromResult(true);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            /*
             * A locked, read-only or ACL-denied file must not fail the admin
             * action — the database row is already gone by this point, so
             * throwing here would report failure for something that succeeded.
             * UnauthorizedAccessException is NOT an IOException, which is how a
             * read-only file used to escape this handler.
             */
            logger.LogWarning(ex, "Could not delete stored media {StorageKey}.", storageKey);
            return Task.FromResult(false);
        }
    }

    public string ToPublicPath(string storageKey)
    {
        var prefix = string.IsNullOrWhiteSpace(_options.PublicPathPrefix)
            ? "/uploads"
            : '/' + _options.PublicPathPrefix.Trim('/');

        return $"{prefix}/{storageKey.TrimStart('/')}";
    }

    /// <summary>
    /// Resolves a storage key to an absolute path, or null if it would land
    /// outside the media root.
    ///
    /// This is the containment check. Even though keys are generated rather than
    /// supplied, a value read back from the database is still validated before
    /// any filesystem call — a corrupted or tampered row must not be able to
    /// reach an arbitrary file.
    /// </summary>
    private string? ResolveWithinRoot(string storageKey)
    {
        if (string.IsNullOrWhiteSpace(storageKey)) return null;
        if (storageKey.Contains("..", StringComparison.Ordinal)) return null;
        if (Path.IsPathRooted(storageKey)) return null;
        if (storageKey.IndexOfAny(Path.GetInvalidPathChars()) >= 0) return null;

        var root = Root;
        var combined = Path.GetFullPath(Path.Combine(root, storageKey.Replace('/', Path.DirectorySeparatorChar)));

        var rootWithSeparator = root.EndsWith(Path.DirectorySeparatorChar)
            ? root
            : root + Path.DirectorySeparatorChar;

        return combined.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase) ? combined : null;
    }

    private static string NormaliseExtension(string extension)
    {
        var candidate = extension.StartsWith('.') ? extension : '.' + extension;
        return candidate.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => ".jpg",
            ".png" => ".png",
            ".webp" => ".webp",
            // Unreachable in practice: the caller only passes ImageInspector's
            // verdict. Throwing keeps it that way if a future caller forgets.
            _ => throw new ArgumentOutOfRangeException(
                nameof(extension),
                "Only .jpg, .png and .webp may be stored."),
        };
    }
}
