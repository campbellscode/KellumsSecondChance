using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace KellumsSecondChance.Server.Infrastructure;

public static class AuthorizationPolicies
{
    public const string AdminOnly = "AdminOnly";
}

public static class Roles
{
    public const string Administrator = "Administrator";
}

public static class RateLimitPolicies
{
    /// <summary>Anonymous form submissions.</summary>
    public const string PublicSubmission = "public-submission";

    /// <summary>Sign-in attempts, to blunt credential stuffing.</summary>
    public const string AuthAttempt = "auth-attempt";
}

/// <summary>
/// Requires a valid antiforgery token on state-changing admin requests.
///
/// The admin console authenticates with a SameSite=Strict cookie. That alone
/// stops most cross-site request forgery, but a token check is the standard,
/// browser-independent defence, so both are applied. The client fetches a token
/// from /api/admin/auth/antiforgery and echoes it in the X-CSRF-TOKEN header.
/// </summary>
public sealed class ValidateAntiforgeryHeaderAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var antiforgery = context.HttpContext.RequestServices.GetRequiredService<IAntiforgery>();

        try
        {
            await antiforgery.ValidateRequestAsync(context.HttpContext);
        }
        catch (AntiforgeryValidationException)
        {
            var logger = context.HttpContext.RequestServices
                .GetRequiredService<ILoggerFactory>()
                .CreateLogger("Antiforgery");

            logger.LogWarning(
                "Rejected {Method} {Path}: antiforgery validation failed.",
                context.HttpContext.Request.Method,
                context.HttpContext.Request.Path);

            context.Result = new ObjectResult(new ProblemDetails
            {
                Title = "Your session could not be verified.",
                Detail = "Refresh the page and try again.",
                Status = StatusCodes.Status400BadRequest,
            })
            {
                StatusCode = StatusCodes.Status400BadRequest,
            };
            return;
        }

        await next();
    }
}

/// <summary>
/// Response security headers.
///
/// The CSP is written for this application specifically: scripts and styles come
/// from the app's own origin, fonts from Google Fonts, and nothing may frame the
/// site or send a form anywhere else. 'unsafe-inline' is present for styles only,
/// because React inline style attributes (used for reveal delays and the slider
/// position) require it; scripts have no such allowance.
/// </summary>
public class SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment environment)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;

        headers["X-Content-Type-Options"] = "nosniff";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["X-Frame-Options"] = "DENY";
        headers["Permissions-Policy"] =
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";
        headers["Cross-Origin-Opener-Policy"] = "same-origin";
        headers["X-Permitted-Cross-Domain-Policies"] = "none";

        var scriptSrc = environment.IsDevelopment()
            // Vite's dev client needs eval for HMR. Production gets neither.
            ? "'self' 'unsafe-inline' 'unsafe-eval'"
            : "'self'";

        var connectSrc = environment.IsDevelopment()
            // The dev server's HMR socket.
            ? "'self' ws: wss:"
            : "'self'";

        headers["Content-Security-Policy"] = string.Join("; ",
            "default-src 'self'",
            $"script-src {scriptSrc}",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob:",
            $"connect-src {connectSrc}",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "manifest-src 'self'",
            "upgrade-insecure-requests");

        if (!environment.IsDevelopment())
        {
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
        }

        await next(context);
    }
}
