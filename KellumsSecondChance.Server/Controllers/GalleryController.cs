using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace KellumsSecondChance.Server.Controllers;

[Route("api/gallery")]
public sealed class GalleryController(IGalleryService gallery, IContentVersion version) : PublicApiController(version)
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GalleryImageDto>>> Get(CancellationToken ct)
    {
        if (SetPublicCache()) return NotModified();
        return Ok(await gallery.PublicAsync(ct));
    }
}
