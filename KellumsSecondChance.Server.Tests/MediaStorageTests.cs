using System.Text;
using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Infrastructure.Media;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Tests;

/// <summary>
/// The real storage layer, against a real temporary directory.
///
/// Everything else about uploads is tested through fakes; this is the one place
/// that proves the containment rules actually hold on a filesystem. Nothing the
/// client sends ever reaches these methods as a path — but a key read back from
/// a tampered or corrupted database row could, so the guard is checked directly.
/// </summary>
public sealed class MediaStorageTests : IDisposable
{
    private readonly string _root;
    private readonly LocalMediaStorage _storage;

    public MediaStorageTests()
    {
        _root = Path.Combine(Path.GetTempPath(), "kellums-media-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_root);

        _storage = new LocalMediaStorage(
            Options.Create(new MediaStorageOptions
            {
                RootPath = _root,
                PublicPathPrefix = "uploads",
                MaxUploadMegabytes = 12,
            }),
            new StubWebHostEnvironment(_root),
            NullLogger<LocalMediaStorage>.Instance);
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }

    private static byte[] Bytes(string content = "not really a png") => Encoding.UTF8.GetBytes(content);

    /* ==================================================================== */
    /*  Saving                                                              */
    /* ==================================================================== */

    [Fact]
    public async Task A_saved_file_lands_inside_the_media_root_with_a_generated_name()
    {
        var stored = await _storage.SaveAsync(MediaScope.Project(7), Bytes(), ".png");

        var absolute = Path.GetFullPath(Path.Combine(_root, stored.StorageKey));
        Assert.StartsWith(_root, absolute, StringComparison.OrdinalIgnoreCase);
        Assert.True(File.Exists(absolute));

        // 16 random bytes as hex, plus the extension. Nothing from the caller.
        var fileName = Path.GetFileNameWithoutExtension(stored.StorageKey);
        Assert.Equal(32, fileName.Length);
        Assert.Matches("^[0-9a-f]+$", fileName);
        Assert.StartsWith("projects/7/", stored.StorageKey);
    }

    [Fact]
    public async Task Two_saves_of_identical_bytes_never_collide()
    {
        var first = await _storage.SaveAsync(MediaScope.Project(1), Bytes(), ".png");
        var second = await _storage.SaveAsync(MediaScope.Project(1), Bytes(), ".png");

        // Overwriting somebody else's photograph is the failure this prevents.
        Assert.NotEqual(first.StorageKey, second.StorageKey);
        Assert.True(File.Exists(Path.Combine(_root, first.StorageKey)));
        Assert.True(File.Exists(Path.Combine(_root, second.StorageKey)));
    }

    [Fact]
    public async Task Each_scope_writes_to_its_own_folder()
    {
        var project = await _storage.SaveAsync(MediaScope.Project(3), Bytes(), ".jpg");
        var service = await _storage.SaveAsync(MediaScope.Service(4), Bytes(), ".jpg");
        var brand = await _storage.SaveAsync(MediaScope.Brand(), Bytes(), ".jpg");

        Assert.StartsWith("projects/3/", project.StorageKey);
        Assert.StartsWith("services/4/", service.StorageKey);
        Assert.StartsWith("brand/", brand.StorageKey);
    }

    [Fact]
    public async Task An_extension_outside_the_allowed_set_is_refused_outright()
    {
        // Unreachable from the endpoints — the inspector's verdict is what gets
        // passed — but this is the backstop that keeps it that way.
        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => _storage.SaveAsync(MediaScope.Project(1), Bytes(), ".php"));

        await Assert.ThrowsAsync<ArgumentOutOfRangeException>(
            () => _storage.SaveAsync(MediaScope.Project(1), Bytes(), ".svg"));
    }

    [Fact]
    public async Task A_jpeg_variant_extension_is_normalised()
    {
        var stored = await _storage.SaveAsync(MediaScope.Project(1), Bytes(), ".jpeg");

        Assert.EndsWith(".jpg", stored.StorageKey);
    }

    /* ==================================================================== */
    /*  Deleting — the containment rules                                    */
    /* ==================================================================== */

    [Theory]
    [InlineData("projects/../../appsettings.json")]
    [InlineData("../appsettings.json")]
    [InlineData("../../../../../../Windows/System32/drivers/etc/hosts")]
    [InlineData("projects/7/../../../secrets.txt")]
    public async Task A_key_that_climbs_out_of_the_root_deletes_nothing(string key)
    {
        var outside = Path.Combine(Path.GetDirectoryName(_root.TrimEnd(Path.DirectorySeparatorChar))!, "appsettings.json");
        await File.WriteAllTextAsync(outside, "a file that must survive");

        try
        {
            var deleted = await _storage.DeleteAsync(key);

            Assert.False(deleted);
            Assert.True(File.Exists(outside), $"'{key}' escaped the media root.");
        }
        finally
        {
            if (File.Exists(outside)) File.Delete(outside);
        }
    }

    [Fact]
    public async Task An_absolute_path_is_refused()
    {
        var outside = Path.Combine(Path.GetTempPath(), $"kellums-outside-{Guid.NewGuid():N}.txt");
        await File.WriteAllTextAsync(outside, "must survive");

        try
        {
            Assert.False(await _storage.DeleteAsync(outside));
            Assert.True(File.Exists(outside));
        }
        finally
        {
            if (File.Exists(outside)) File.Delete(outside);
        }
    }

    [Fact]
    public async Task An_empty_key_is_refused()
    {
        Assert.False(await _storage.DeleteAsync(string.Empty));
        Assert.False(await _storage.DeleteAsync("   "));
    }

    [Fact]
    public async Task Deleting_a_real_key_removes_exactly_that_file()
    {
        var keep = await _storage.SaveAsync(MediaScope.Project(1), Bytes("keep"), ".png");
        var drop = await _storage.SaveAsync(MediaScope.Project(1), Bytes("drop"), ".png");

        Assert.True(await _storage.DeleteAsync(drop.StorageKey));

        Assert.False(File.Exists(Path.Combine(_root, drop.StorageKey)));
        Assert.True(File.Exists(Path.Combine(_root, keep.StorageKey)));
    }

    [Fact]
    public async Task Deleting_a_file_that_is_already_gone_is_tolerated()
    {
        var stored = await _storage.SaveAsync(MediaScope.Project(1), Bytes(), ".png");
        File.Delete(Path.Combine(_root, stored.StorageKey));

        // Reported as "nothing to do", never as a failure — the database row is
        // already removed by the time this runs.
        Assert.False(await _storage.DeleteAsync(stored.StorageKey));
    }

    /* ==================================================================== */
    /*  Public paths                                                        */
    /* ==================================================================== */

    [Fact]
    public void The_public_path_is_the_configured_prefix_plus_the_key()
    {
        Assert.Equal("/uploads/projects/7/abc.png", _storage.ToPublicPath("projects/7/abc.png"));
    }

    private sealed class StubWebHostEnvironment(string root) : IWebHostEnvironment
    {
        public string WebRootPath { get; set; } = root;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ApplicationName { get; set; } = "KellumsSecondChance.Tests";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = root;
        public string EnvironmentName { get; set; } = Environments.Development;
    }
}
