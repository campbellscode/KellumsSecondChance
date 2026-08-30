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

/// <summary>Sign-in, sign-out and session probe for the admin console.</summary>
[ApiController]
[Route("api/admin/auth")]
public class AdminAuthController(
    SignInManager<ApplicationUser> signInManager,
    UserManager<ApplicationUser> userManager,
    IAntiforgery antiforgery,
    ILogger<AdminAuthController> logger) : ControllerBase
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
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    [ValidateAntiforgeryHeader]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    /// <summary>Returns the signed-in administrator, or 401 when there is none.</summary>
    [HttpGet("me")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
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

/// <summary>Lead management.</summary>
[Route("api/admin/estimate-requests")]
public class AdminEstimateRequestsController(IEstimateRequestService estimates) : AdminApiController
{
    [HttpGet]
    [ProducesResponseType<PagedResultDto<AdminEstimateRequestDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResultDto<AdminEstimateRequestDto>>> List(
        [FromQuery] EstimateRequestStatus? status,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        Response.Headers.CacheControl = "no-store";
        return Ok(await estimates.ListAsync(status, search, page, pageSize, ct));
    }

    [HttpPatch("{id:int}")]
    [ValidateAntiforgeryHeader]
    [ProducesResponseType<AdminEstimateRequestDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminEstimateRequestDto>> Update(
        int id,
        [FromBody] UpdateEstimateRequestDto dto,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var updated = await estimates.UpdateAsync(id, dto, ct);
        if (updated is null)
        {
            return Problem(
                title: "We could not find that estimate request.",
                statusCode: StatusCodes.Status404NotFound);
        }

        return Ok(updated);
    }
}

/// <summary>
/// Admin reads of the content catalogue.
///
/// These return the same DTOs as the public endpoints but require
/// authorisation, so the console can later show inactive records that the public
/// API filters out. Write operations for content types are the next phase.
/// </summary>
[Route("api/admin/content")]
public class AdminContentController(IContentService content) : AdminApiController
{
    [HttpGet("services")]
    public async Task<ActionResult<IReadOnlyList<ServiceSummaryDto>>> Services(CancellationToken ct) =>
        Ok(await content.GetServicesAsync(ct));

    [HttpGet("projects")]
    public async Task<ActionResult<IReadOnlyList<ProjectSummaryDto>>> Projects(CancellationToken ct) =>
        Ok(await content.GetProjectsAsync(null, false, null, null, ct));

    [HttpGet("testimonials")]
    public async Task<ActionResult<IReadOnlyList<TestimonialDto>>> Testimonials(CancellationToken ct) =>
        Ok(await content.GetTestimonialsAsync(false, ct));

    [HttpGet("faqs")]
    public async Task<ActionResult<IReadOnlyList<FaqItemDto>>> Faqs(CancellationToken ct) =>
        Ok(await content.GetFaqsAsync(includePendingReview: true, ct));

    [HttpGet("service-areas")]
    public async Task<ActionResult<IReadOnlyList<ServiceAreaDto>>> ServiceAreas(CancellationToken ct) =>
        Ok(await content.GetServiceAreasAsync(ct));
}
