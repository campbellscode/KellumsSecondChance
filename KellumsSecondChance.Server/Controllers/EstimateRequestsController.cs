using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure;
using KellumsSecondChance.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace KellumsSecondChance.Server.Controllers;

/// <summary>
/// The one public write endpoint.
///
/// Defence in depth: a per-IP fixed-window rate limiter on the route, a honeypot
/// field, a minimum fill time, a per-source burst check in the service, and full
/// server-side validation regardless of what the browser enforced.
/// </summary>
[ApiController]
[Route("api/estimate-requests")]
public class EstimateRequestsController(IEstimateRequestService estimates) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.PublicSubmission)]
    [ProducesResponseType<EstimateRequestResultDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<EstimateRequestResultDto>> Create(
        [FromBody] CreateEstimateRequestDto dto,
        CancellationToken ct)
    {
        // [ApiController] already short-circuits invalid models into a
        // ValidationProblemDetails; this guard keeps the contract explicit.
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var result = await estimates.SubmitAsync(dto, ResolveClientIp(), ResolveUserAgent(), ct);

        return result.Outcome switch
        {
            SubmissionOutcome.RateLimited => Problem(
                title: "That is a few submissions in quick succession.",
                detail: "Give it a few minutes and try again, or get in touch directly.",
                statusCode: StatusCodes.Status429TooManyRequests),

            // A detected bot gets the same shape a person gets. Nothing was saved.
            _ => StatusCode(StatusCodes.Status201Created, result.Result),
        };
    }

    /// <summary>
    /// Best-effort client address.
    ///
    /// X-Forwarded-For is only honoured because ForwardedHeaders middleware has
    /// already validated and rewritten RemoteIpAddress when running behind a
    /// trusted proxy; the raw header is never read here.
    /// </summary>
    private string? ResolveClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString();

    private string? ResolveUserAgent() =>
        Request.Headers.UserAgent.ToString() is { Length: > 0 } ua ? ua : null;
}
