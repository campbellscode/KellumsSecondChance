using System.ComponentModel.DataAnnotations;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure;
using KellumsSecondChance.Server.Infrastructure.Media;
using KellumsSecondChance.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace KellumsSecondChance.Server.Controllers.Admin;

[Route("api/admin/gallery")]
public sealed class AdminGalleryController(IGalleryService gallery) : AdminWriteController
{
    [HttpGet] public async Task<ActionResult<IReadOnlyList<AdminGalleryImageDto>>> List(CancellationToken ct) { NoStore(); return Ok(await gallery.AdminAsync(ct)); }

    [HttpPost("upload"), ValidateAntiforgeryHeader, RequestSizeLimit(16 * 1024 * 1024)]
    public async Task<ActionResult<AdminGalleryImageDto>> Upload([FromForm] GalleryUploadForm form, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        if (form.File is null || form.File.Length == 0) { ModelState.AddModelError(nameof(form.File), "Choose a photo to upload."); return ValidationProblem(ModelState); }
        if (!ImageInspector.AllowedContentTypes.Contains(form.File.ContentType))
            return Problem(title: "Photos must be JPEG, PNG or WebP.", statusCode: StatusCodes.Status415UnsupportedMediaType);
        var result = await gallery.UploadAsync(await ReadAsync(form.File, ct), form.File.FileName, form.AltText ?? "Exterior renovation gallery photograph.", form.Caption, ct);
        return result.Ok ? StatusCode(StatusCodes.Status201Created, result.Image) : FailUpload(result, nameof(form.File));
    }

    [HttpPut("{id:int}"), ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminGalleryImageDto>> Update(int id, GalleryImageUpdateDto dto, CancellationToken ct)
    { if (!ModelState.IsValid) return ValidationProblem(ModelState); var result = await gallery.UpdateAsync(id, dto, ct); return result.Ok ? Ok(result.Value) : Fail(result); }

    [HttpPost("reorder"), ValidateAntiforgeryHeader]
    public async Task<IActionResult> Reorder(GalleryReorderDto dto, CancellationToken ct)
    { if (!ModelState.IsValid) return ValidationProblem(ModelState); var result = await gallery.ReorderAsync(dto.OrderedIds, ct); return result.Ok ? NoContent() : Fail(result); }

    [HttpDelete("{id:int}"), ValidateAntiforgeryHeader]
    public async Task<IActionResult> Delete(int id, CancellationToken ct) { var result = await gallery.DeleteAsync(id, ct); return result.Ok ? NoContent() : Fail(result); }
}

public sealed class GalleryUploadForm
{
    public IFormFile? File { get; set; }
    [StringLength(300, MinimumLength = 3)] public string? AltText { get; set; }
    [StringLength(500)] public string? Caption { get; set; }
}
