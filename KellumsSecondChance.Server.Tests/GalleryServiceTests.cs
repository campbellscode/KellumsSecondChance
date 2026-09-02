using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure.Media;
using KellumsSecondChance.Server.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Tests;

public sealed class GalleryServiceTests : IDisposable
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly KellumsDbContext _db;
    private readonly FakeStorage _storage = new();
    private readonly ContentVersion _version = new(Microsoft.Extensions.Logging.Abstractions.NullLogger<ContentVersion>.Instance);
    private readonly GalleryService _service;

    public GalleryServiceTests()
    {
        _connection.Open(); _db = new KellumsDbContext(new DbContextOptionsBuilder<KellumsDbContext>().UseSqlite(_connection).Options);
        _db.Database.EnsureCreated();
        _service = new GalleryService(_db, _storage, _version, Options.Create(new MediaStorageOptions { MaxUploadMegabytes = 1 }));
    }

    [Fact]
    public async Task Public_gallery_excludes_inactive_and_has_stable_order()
    {
        _db.GalleryImages.AddRange(Row(1, 9, true), Row(2, 2, false), Row(3, 2, true)); await _db.SaveChangesAsync();
        var result = await _service.PublicAsync();
        Assert.Equal(new[] { 3, 1 }, result.Select(x => x.Id));
    }

    [Fact]
    public async Task Metadata_visibility_reorder_and_delete_are_persisted()
    {
        _db.GalleryImages.AddRange(Row(1, 1, true), Row(2, 2, true)); await _db.SaveChangesAsync();
        var updated = await _service.UpdateAsync(1, new GalleryImageUpdateDto { AltText = "Updated accessible description", Caption = "Optional", IsActive = false });
        Assert.True(updated.Ok); Assert.DoesNotContain(await _service.PublicAsync(), x => x.Id == 1);
        Assert.True((await _service.ReorderAsync([2, 1])).Ok); Assert.Equal(1, (await _db.GalleryImages.FindAsync(2))!.DisplayOrder);
        Assert.True((await _service.DeleteAsync(1)).Ok); Assert.Null(await _db.GalleryImages.FindAsync(1)); Assert.Empty(_storage.Deleted);
    }

    [Fact]
    public async Task Upload_rejects_invalid_signature_and_mismatched_extension()
    {
        var invalid = await _service.UploadAsync(new byte[50], "photo.jpg", "Exterior photo", null);
        Assert.False(invalid.Ok); Assert.Equal(ImageRejection.UnsupportedFormat, invalid.Rejection);
        var png = new byte[40]; new byte[] { 0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a }.CopyTo(png,0); png[12]=(byte)'I';png[13]=(byte)'H';png[14]=(byte)'D';png[15]=(byte)'R';png[19]=10;png[23]=10;
        var mismatch = await _service.UploadAsync(png, "photo.jpg", "Exterior photo", null);
        Assert.False(mismatch.Ok); Assert.Equal(ImageRejection.UnsupportedFormat, mismatch.Rejection);
    }

    private static GalleryImage Row(int id, int order, bool active) => new() { Id=id, ImagePath=$"/media/gallery/{id}.jpg", OriginalFileName=$"{id}.jpg", AltText="Exterior renovation gallery photograph.", Width=100, Height=100, DisplayOrder=order, IsActive=active };
    public void Dispose() { _db.Dispose(); _connection.Dispose(); }

    private sealed class FakeStorage : IMediaStorage
    {
        public List<string> Deleted { get; }=[];
        public Task<StoredMedia> SaveAsync(MediaScope scope, byte[] content, string extension, CancellationToken ct=default) => Task.FromResult(new StoredMedia($"gallery/key{extension}",$"/uploads/gallery/key{extension}",content.Length));
        public Task<bool> DeleteAsync(string storageKey, CancellationToken ct=default) { Deleted.Add(storageKey); return Task.FromResult(true); }
        public string ToPublicPath(string storageKey)=>"/uploads/"+storageKey;
    }
}
