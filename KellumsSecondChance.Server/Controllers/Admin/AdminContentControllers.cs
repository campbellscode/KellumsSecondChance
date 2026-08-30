using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure;
using KellumsSecondChance.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace KellumsSecondChance.Server.Controllers.Admin;

/// <summary>
/// Shared plumbing for admin write endpoints.
///
/// Inherits <see cref="AdminApiController"/>, so the AdminOnly policy applies to
/// every action without each one having to remember it.
/// </summary>
public abstract class AdminWriteController : AdminApiController
{
    /// <summary>Turns a service-layer failure into the right HTTP response.</summary>
    protected ActionResult Fail<T>(WriteResult<T> result)
    {
        switch (result.Failure)
        {
            case WriteFailure.NotFound:
                return Problem(title: result.Message, statusCode: StatusCodes.Status404NotFound);

            case WriteFailure.Conflict:
                return Problem(title: result.Message, statusCode: StatusCodes.Status409Conflict);

            default:
                // Field-scoped so the console can put the message under the input.
                ModelState.AddModelError(result.Field ?? string.Empty, result.Message ?? "That could not be saved.");
                return ValidationProblem(ModelState);
        }
    }

    protected void NoStore() => Response.Headers.CacheControl = "no-store";

    /// <summary>
    /// Reads an uploaded file into memory once.
    ///
    /// The request size limit is what caps this. The inspector needs the header
    /// and the storage layer needs the bytes, so buffering once is cheaper than
    /// two passes over a stream that cannot be rewound.
    /// </summary>
    protected static async Task<byte[]> ReadAsync(IFormFile file, CancellationToken ct)
    {
        using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer, ct);
        return buffer.ToArray();
    }

    /// <summary>Maps an upload refusal onto the status code it deserves.</summary>
    protected ActionResult FailUpload<T>(MediaWriteResult<T> result, string field)
        where T : class
    {
        if (result.Rejection is { } rejection)
        {
            var status = rejection switch
            {
                Infrastructure.Media.ImageRejection.TooLarge => StatusCodes.Status413PayloadTooLarge,
                Infrastructure.Media.ImageRejection.UnsupportedFormat => StatusCodes.Status415UnsupportedMediaType,
                _ => StatusCodes.Status400BadRequest,
            };
            return Problem(title: result.Message, statusCode: status);
        }

        if (result.Failure == WriteFailure.NotFound)
        {
            return Problem(title: result.Message, statusCode: StatusCodes.Status404NotFound);
        }

        ModelState.AddModelError(field, result.Message ?? "That image could not be saved.");
        return ValidationProblem(ModelState);
    }
}

/* ====================================================================== */
/*  Projects                                                              */
/* ====================================================================== */

[Route("api/admin/projects")]
public class AdminProjectsController(
    IAdminContentService content,
    IProjectMediaService media) : AdminWriteController
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminProjectListItemDto>>> List(CancellationToken ct)
    {
        NoStore();
        return Ok(await content.ListProjectsAsync(ct));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdminProjectDto>> Get(int id, CancellationToken ct)
    {
        NoStore();
        var project = await content.GetProjectAsync(id, ct);
        return project is null
            ? Problem(title: "That project no longer exists.", statusCode: StatusCodes.Status404NotFound)
            : Ok(project);
    }

    [HttpPost]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminProjectDto>> Create([FromBody] ProjectWriteDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var result = await content.CreateProjectAsync(dto, ct);
        if (!result.Ok) return Fail(result);

        return CreatedAtAction(nameof(Get), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPut("{id:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminProjectDto>> Update(
        int id,
        [FromBody] ProjectWriteDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var result = await content.UpdateProjectAsync(id, dto, ct);
        return result.Ok ? Ok(result.Value) : Fail(result);
    }

    [HttpDelete("{id:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await content.DeleteProjectAsync(id, ct);
        return result.Ok ? NoContent() : Fail(result);
    }

    /// <summary>Sets the order projects appear in on the gallery page.</summary>
    [HttpPost("reorder")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> Reorder([FromBody] ReorderDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var result = await content.ReorderProjectsAsync(dto.OrderedIds, ct);
        return result.Ok ? NoContent() : Fail(result);
    }

    /* ------------------------------------------------------------ photos */

    [HttpPost("{id:int}/images")]
    [ValidateAntiforgeryHeader]
    [RequestSizeLimit(16 * 1024 * 1024)]
    [ProducesResponseType<AdminProjectImageDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType(StatusCodes.Status415UnsupportedMediaType)]
    public async Task<ActionResult<AdminProjectImageDto>> Upload(
        int id,
        [FromForm] ProjectImageUploadForm form,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        if (form.File is null || form.File.Length == 0)
        {
            ModelState.AddModelError(nameof(form.File), "Choose a photo to upload.");
            return ValidationProblem(ModelState);
        }

        // Read into memory once; ImageInspector needs the header and the storage
        // layer needs the bytes. The request size limit caps how much this is.
        using var buffer = new MemoryStream();
        await form.File.CopyToAsync(buffer, ct);

        var result = await media.UploadAsync(
            id, buffer.ToArray(), form.Kind, form.AltText ?? string.Empty, form.Caption, ct);

        if (result.Ok)
        {
            return StatusCode(StatusCodes.Status201Created, result.Image);
        }

        if (result.Rejection is { } rejection)
        {
            var status = rejection switch
            {
                Infrastructure.Media.ImageRejection.TooLarge => StatusCodes.Status413PayloadTooLarge,
                Infrastructure.Media.ImageRejection.UnsupportedFormat => StatusCodes.Status415UnsupportedMediaType,
                _ => StatusCodes.Status400BadRequest,
            };
            return Problem(title: result.Message, statusCode: status);
        }

        if (result.Failure == WriteFailure.NotFound)
        {
            return Problem(title: result.Message, statusCode: StatusCodes.Status404NotFound);
        }

        ModelState.AddModelError(nameof(form.File), result.Message ?? "That photo could not be saved.");
        return ValidationProblem(ModelState);
    }

    [HttpPut("{id:int}/images/{imageId:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminProjectImageDto>> UpdateImage(
        int id,
        int imageId,
        [FromBody] ProjectImageUpdateDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var result = await media.UpdateAsync(id, imageId, dto, ct);
        if (result.Ok) return Ok(result.Image);

        return result.Failure == WriteFailure.NotFound
            ? Problem(title: result.Message, statusCode: StatusCodes.Status404NotFound)
            : Problem(title: result.Message, statusCode: StatusCodes.Status400BadRequest);
    }

    [HttpDelete("{id:int}/images/{imageId:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> DeleteImage(int id, int imageId, CancellationToken ct)
    {
        var result = await media.DeleteAsync(id, imageId, ct);
        return result.Ok ? NoContent() : Fail(result);
    }

    [HttpPost("{id:int}/images/reorder")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> ReorderImages(int id, [FromBody] ReorderDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var result = await media.ReorderAsync(id, dto.OrderedIds, ct);
        return result.Ok ? NoContent() : Fail(result);
    }

    [HttpPost("{id:int}/images/{imageId:int}/cover")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> SetCover(int id, int imageId, CancellationToken ct)
    {
        var result = await media.SetCoverAsync(id, imageId, ct);
        return result.Ok ? NoContent() : Fail(result);
    }

    [HttpPost("{id:int}/pairs")]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<IReadOnlyList<AdminProjectImageDto>>> SavePair(
        int id,
        [FromBody] BeforeAfterPairDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var result = await media.SavePairAsync(id, dto, ct);
        return result.Ok ? Ok(result.Value) : Fail(result);
    }

    [HttpDelete("{id:int}/pairs/{pairKey}")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> RemovePair(int id, string pairKey, CancellationToken ct)
    {
        var result = await media.RemovePairAsync(id, pairKey, ct);
        return result.Ok ? NoContent() : Fail(result);
    }

    /// <summary>Sets the order the transformations appear in on the public page.</summary>
    [HttpPost("{id:int}/pairs/reorder")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> ReorderPairs(
        int id,
        [FromBody] PairReorderDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var result = await media.ReorderPairsAsync(id, dto.OrderedPairKeys, ct);
        return result.Ok ? NoContent() : Fail(result);
    }
}

/// <summary>Multipart upload form. Bound separately so no entity is exposed.</summary>
public class ProjectImageUploadForm
{
    public IFormFile? File { get; set; }

    public Domain.Enums.ProjectImageKind Kind { get; set; } = Domain.Enums.ProjectImageKind.Gallery;

    [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Describe the photo so screen readers can announce it.")]
    [System.ComponentModel.DataAnnotations.StringLength(300, MinimumLength = 3)]
    public string? AltText { get; set; }

    [System.ComponentModel.DataAnnotations.StringLength(300)]
    public string? Caption { get; set; }
}

/* ====================================================================== */
/*  Services                                                              */
/* ====================================================================== */

[Route("api/admin/services")]
public class AdminServicesController(
    IAdminContentService content,
    IAdminMediaService media) : AdminWriteController
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminServiceDto>>> List(CancellationToken ct)
    {
        NoStore();
        return Ok(await content.ListServicesAsync(ct));
    }

    [HttpPost]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminServiceDto>> Create([FromBody] ServiceWriteDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var result = await content.CreateServiceAsync(dto, ct);
        return result.Ok ? StatusCode(StatusCodes.Status201Created, result.Value) : Fail(result);
    }

    [HttpPut("{id:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminServiceDto>> Update(
        int id, [FromBody] ServiceWriteDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var result = await content.UpdateServiceAsync(id, dto, ct);
        return result.Ok ? Ok(result.Value) : Fail(result);
    }

    [HttpDelete("{id:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await content.DeleteServiceAsync(id, ct);
        return result.Ok ? NoContent() : Fail(result);
    }

    /* ---------------------------------------------------- service imagery */

    /// <summary>
    /// Replaces the photograph on a service page.
    ///
    /// Same validation path as project photography: the bytes decide the
    /// format, the filename is generated, and the previous file is removed only
    /// after the new one has been recorded.
    /// </summary>
    [HttpPost("{id:int}/image")]
    [ValidateAntiforgeryHeader]
    [RequestSizeLimit(16 * 1024 * 1024)]
    [ProducesResponseType<UploadedImageDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType(StatusCodes.Status415UnsupportedMediaType)]
    public async Task<ActionResult<UploadedImageDto>> UploadImage(
        int id,
        [FromForm] ServiceImageUploadForm form,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        if (form.File is null || form.File.Length == 0)
        {
            ModelState.AddModelError(nameof(form.File), "Choose a photograph to upload.");
            return ValidationProblem(ModelState);
        }

        var result = await media.SetServiceImageAsync(
            id, await ReadAsync(form.File, ct), form.AltText ?? string.Empty, ct);

        return result.Ok
            ? StatusCode(StatusCodes.Status201Created, result.Image)
            : FailUpload(result, nameof(form.File));
    }

    [HttpDelete("{id:int}/image")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> DeleteImage(int id, CancellationToken ct)
    {
        var result = await media.RemoveServiceImageAsync(id, ct);
        return result.Ok ? NoContent() : Fail(result);
    }
}

/// <summary>Multipart form for a service photograph.</summary>
public class ServiceImageUploadForm
{
    public IFormFile? File { get; set; }

    [System.ComponentModel.DataAnnotations.Required(
        ErrorMessage = "Describe the photograph so screen readers can announce it.")]
    [System.ComponentModel.DataAnnotations.StringLength(300, MinimumLength = 3)]
    public string? AltText { get; set; }
}

/* ====================================================================== */
/*  Testimonials                                                          */
/* ====================================================================== */

[Route("api/admin/testimonials")]
public class AdminTestimonialsController(IAdminContentService content) : AdminWriteController
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminTestimonialDto>>> List(CancellationToken ct)
    {
        NoStore();
        return Ok(await content.ListTestimonialsAsync(ct));
    }

    [HttpPost]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminTestimonialDto>> Create(
        [FromBody] TestimonialWriteDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var result = await content.CreateTestimonialAsync(dto, ct);
        return result.Ok ? StatusCode(StatusCodes.Status201Created, result.Value) : Fail(result);
    }

    [HttpPut("{id:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminTestimonialDto>> Update(
        int id, [FromBody] TestimonialWriteDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var result = await content.UpdateTestimonialAsync(id, dto, ct);
        return result.Ok ? Ok(result.Value) : Fail(result);
    }

    [HttpDelete("{id:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await content.DeleteTestimonialAsync(id, ct);
        return result.Ok ? NoContent() : Fail(result);
    }
}

/* ====================================================================== */
/*  FAQs                                                                  */
/* ====================================================================== */

[Route("api/admin/faqs")]
public class AdminFaqsController(IAdminContentService content) : AdminWriteController
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminFaqDto>>> List(CancellationToken ct)
    {
        NoStore();
        return Ok(await content.ListFaqsAsync(ct));
    }

    [HttpPost]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminFaqDto>> Create([FromBody] FaqWriteDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var result = await content.CreateFaqAsync(dto, ct);
        return result.Ok ? StatusCode(StatusCodes.Status201Created, result.Value) : Fail(result);
    }

    [HttpPut("{id:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminFaqDto>> Update(int id, [FromBody] FaqWriteDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var result = await content.UpdateFaqAsync(id, dto, ct);
        return result.Ok ? Ok(result.Value) : Fail(result);
    }

    [HttpDelete("{id:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await content.DeleteFaqAsync(id, ct);
        return result.Ok ? NoContent() : Fail(result);
    }
}

/* ====================================================================== */
/*  Service areas                                                         */
/* ====================================================================== */

[Route("api/admin/service-areas")]
public class AdminServiceAreasController(IAdminContentService content) : AdminWriteController
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminServiceAreaDto>>> List(CancellationToken ct)
    {
        NoStore();
        return Ok(await content.ListServiceAreasAsync(ct));
    }

    [HttpPost]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminServiceAreaDto>> Create(
        [FromBody] ServiceAreaWriteDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var result = await content.CreateServiceAreaAsync(dto, ct);
        return result.Ok ? StatusCode(StatusCodes.Status201Created, result.Value) : Fail(result);
    }

    [HttpPut("{id:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminServiceAreaDto>> Update(
        int id, [FromBody] ServiceAreaWriteDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var result = await content.UpdateServiceAreaAsync(id, dto, ct);
        return result.Ok ? Ok(result.Value) : Fail(result);
    }

    [HttpDelete("{id:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var result = await content.DeleteServiceAreaAsync(id, ct);
        return result.Ok ? NoContent() : Fail(result);
    }
}

/* ====================================================================== */
/*  Site settings                                                         */
/* ====================================================================== */

[Route("api/admin/site-settings")]
public class AdminSiteSettingsController(
    ISiteSettingsWriteService settings,
    IAdminMediaService media) : AdminWriteController
{
    [HttpGet]
    public async Task<ActionResult<AdminSiteSettingsDto>> Get(CancellationToken ct)
    {
        NoStore();
        return Ok(await settings.GetAsync(ct));
    }

    [HttpPut]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminSiteSettingsDto>> Save(
        [FromBody] SiteSettingsWriteDto dto, CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);
        var result = await settings.SaveAsync(dto, ct);
        return result.Ok ? Ok(result.Value) : Fail(result);
    }

    /// <summary>
    /// Uploads the card that appears when somebody shares a link to the site.
    ///
    /// This exists so nobody has to put a file in a folder on the server and
    /// then type its path. SVG cannot get through — the inspector refuses it on
    /// signature — which is what stops every shared link rendering blank.
    /// </summary>
    [HttpPost("social-image")]
    [ValidateAntiforgeryHeader]
    [RequestSizeLimit(16 * 1024 * 1024)]
    [ProducesResponseType<UploadedImageDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    [ProducesResponseType(StatusCodes.Status415UnsupportedMediaType)]
    public async Task<ActionResult<UploadedImageDto>> UploadSocialImage(
        [FromForm] SocialImageUploadForm form,
        CancellationToken ct)
    {
        if (form.File is null || form.File.Length == 0)
        {
            ModelState.AddModelError(nameof(form.File), "Choose an image to upload.");
            return ValidationProblem(ModelState);
        }

        var result = await media.SetSocialImageAsync(await ReadAsync(form.File, ct), ct);

        return result.Ok
            ? StatusCode(StatusCodes.Status201Created, result.Image)
            : FailUpload(result, nameof(form.File));
    }
}

/// <summary>Multipart form for the social sharing card.</summary>
public class SocialImageUploadForm
{
    public IFormFile? File { get; set; }
}

/* ====================================================================== */
/*  Dashboard                                                             */
/* ====================================================================== */

[Route("api/admin/dashboard")]
public class AdminDashboardController(IAdminDashboardService dashboard) : AdminApiController
{
    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(await dashboard.GetAsync(ct));
    }
}
