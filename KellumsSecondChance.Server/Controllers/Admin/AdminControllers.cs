using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure;
using KellumsSecondChance.Server.Services;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace KellumsSecondChance.Server.Controllers.Admin;

/// <summary>
/// Base for every admin endpoint.
///
/// Authorisation is applied at the class level here rather than per action, so a
/// new action cannot be added without it. Every state-changing admin request
/// additionally requires a valid antiforgery token (see
/// <see cref="ValidateAntiforgeryHeaderAttribute"/>).
/// </summary>
[ApiController]
[Authorize(Policy = AuthorizationPolicies.AdminOnly)]
public abstract class AdminApiController : ControllerBase;

/// <summary>
/// Sign-in, sign-out and session probe for the admin console.
///
/// Inherits the authorized base like every other admin controller, so a new
/// action here is protected unless it OPTS OUT with [AllowAnonymous]. Deriving
/// from ControllerBase would make the safe case the one you have to remember.
/// </summary>
[Route("api/admin/auth")]
public class AdminAuthController(
    SignInManager<ApplicationUser> signInManager,
    UserManager<ApplicationUser> userManager,
    IAntiforgery antiforgery,
    ILogger<AdminAuthController> logger) : AdminApiController
{
    /// <summary>
    /// Issues an antiforgery token pair. The cookie is set on the response and
    /// the request token is returned for the client to echo in X-CSRF-TOKEN.
    /// </summary>
    [HttpGet("antiforgery")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetAntiforgeryToken()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        Response.Headers.CacheControl = "no-store";
        return Ok(new { token = tokens.RequestToken });
    }

    /// <summary>
    /// Signs in with an existing account. There is no registration endpoint —
    /// accounts are provisioned from configuration by an administrator.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ValidateAntiforgeryHeader]
    [EnableRateLimiting(RateLimitPolicies.AuthAttempt)]
    [ProducesResponseType<AdminUserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AdminUserDto>> Login([FromBody] AdminLoginDto dto)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var user = await userManager.FindByEmailAsync(dto.Email);

        /*
         * A single generic failure for every reason — unknown address, wrong
         * password, unconfirmed account. Distinguishing them turns the endpoint
         * into an account-enumeration oracle.
         */
        if (user is null)
        {
            logger.LogWarning("Admin sign-in failed: no account for the supplied address.");
            return Unauthorized(GenericAuthProblem());
        }

        var result = await signInManager.PasswordSignInAsync(
            user,
            dto.Password,
            isPersistent: false,
            lockoutOnFailure: true);

        if (!result.Succeeded)
        {
            logger.LogWarning(
                "Admin sign-in failed for user {UserId}. LockedOut={LockedOut}",
                user.Id,
                result.IsLockedOut);
            return Unauthorized(GenericAuthProblem());
        }

        logger.LogInformation("Admin {UserId} signed in.", user.Id);
        return Ok(await ToDtoAsync(user));
    }

    [HttpPost("logout")]
    [ValidateAntiforgeryHeader]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    /// <summary>Returns the signed-in administrator, or 401 when there is none.</summary>
    [HttpGet("me")]
    [ProducesResponseType<AdminUserDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AdminUserDto>> Me()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null) return Unauthorized(GenericAuthProblem());

        Response.Headers.CacheControl = "no-store";
        return Ok(await ToDtoAsync(user));
    }

    private async Task<AdminUserDto> ToDtoAsync(ApplicationUser user)
    {
        var roles = await userManager.GetRolesAsync(user);
        return new AdminUserDto(user.Email ?? string.Empty, user.DisplayName ?? string.Empty, roles.ToList());
    }

    private ProblemDetails GenericAuthProblem() => new()
    {
        Title = "Those sign-in details were not recognised.",
        Status = StatusCodes.Status401Unauthorized,
    };
}

/// <summary>
/// Lead management.
///
/// This is the screen the business actually lives in: find a lead, read it,
/// move it along the pipeline, and record what was said. Notes and status
/// history are internal — no public endpoint returns either of them.
/// </summary>
[Route("api/admin/estimate-requests")]
public class AdminEstimateRequestsController(
    IEstimateRequestAdminService estimates,
    UserManager<ApplicationUser> users) : AdminWriteController
{
    [HttpGet]
    [ProducesResponseType<PagedResultDto<AdminEstimateRequestDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResultDto<AdminEstimateRequestDto>>> List(
        [FromQuery] EstimateRequestStatus? status,
        [FromQuery] string? projectType,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] string? search,
        [FromQuery] EstimateRequestSort sort = EstimateRequestSort.NewestFirst,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        NoStore();
        return Ok(await estimates.SearchAsync(status, projectType, from, to, search, sort, page, pageSize, ct));
    }

    /// <summary>Project-type slugs that actually appear on leads, for the filter.</summary>
    [HttpGet("project-types")]
    public async Task<ActionResult<IReadOnlyList<string>>> ProjectTypes(CancellationToken ct)
    {
        NoStore();
        return Ok(await estimates.GetProjectTypeFacetsAsync(ct));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType<AdminEstimateRequestDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminEstimateRequestDetailDto>> Detail(int id, CancellationToken ct)
    {
        NoStore();
        var detail = await estimates.GetDetailAsync(id, ct);
        return detail is null
            ? Problem(title: "We could not find that estimate request.", statusCode: StatusCodes.Status404NotFound)
            : Ok(detail);
    }

    [HttpPut("{id:int}/status")]
    [ValidateAntiforgeryHeader]
    [ProducesResponseType<AdminEstimateRequestDetailDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminEstimateRequestDetailDto>> ChangeStatus(
        int id,
        [FromBody] EstimateRequestStatusUpdateDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var result = await estimates.ChangeStatusAsync(id, dto.Status, dto.RowVersion, await ActorAsync(), ct);
        return result.Ok ? Ok(result.Value) : Fail(result);
    }

    [HttpPost("{id:int}/notes")]
    [ValidateAntiforgeryHeader]
    [ProducesResponseType<EstimateRequestNoteDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EstimateRequestNoteDto>> AddNote(
        int id,
        [FromBody] EstimateRequestNoteWriteDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var result = await estimates.AddNoteAsync(id, dto.Note, await ActorAsync(), ct);
        return result.Ok
            ? StatusCode(StatusCodes.Status201Created, result.Value)
            : Fail(result);
    }

    [HttpDelete("{id:int}/notes/{noteId:int}")]
    [ValidateAntiforgeryHeader]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteNote(int id, int noteId, CancellationToken ct)
    {
        var result = await estimates.DeleteNoteAsync(id, noteId, ct);
        return result.Ok ? NoContent() : Fail(result);
    }

    /// <summary>
    /// Who is making the change, taken from the signed-in principal only.
    /// Never from the request body — a client cannot claim to be somebody else.
    /// </summary>
    private async Task<AdminActor> ActorAsync()
    {
        var user = await users.GetUserAsync(User);
        return new AdminActor(user?.Id, user?.DisplayName ?? user?.Email);
    }
}
