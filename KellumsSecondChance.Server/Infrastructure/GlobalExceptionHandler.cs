using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace KellumsSecondChance.Server.Infrastructure;

/// <summary>
/// Turns any unhandled exception into an RFC 9457 problem document.
///
/// The exception message and stack trace are logged, never returned: an
/// exception message can carry connection strings, file paths and schema
/// details. Callers get a trace id they can quote instead.
/// </summary>
public class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger,
    IWebHostEnvironment environment) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // A cancelled request is the client hanging up, not a server fault.
        if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
        {
            return true;
        }

        /*
         * A body larger than the configured request limit is the caller's
         * problem, not a server fault: Kestrel raises BadHttpRequestException
         * with a 413 already on it, and without this it would be logged as an
         * unhandled error and answered with a generic 500.
         *
         * §46 wants 413 here, and an owner uploading a 40 MB photograph
         * straight off a camera deserves to be told the size is the problem.
         */
        if (exception is BadHttpRequestException { StatusCode: StatusCodes.Status413PayloadTooLarge })
        {
            logger.LogInformation(
                "Rejected an oversized upload for {Method} {Path}.",
                httpContext.Request.Method,
                httpContext.Request.Path);

            httpContext.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
            await httpContext.Response.WriteAsJsonAsync(
                new ProblemDetails
                {
                    Title = "That photo is larger than the upload limit.",
                    Detail = "Most phones can export a smaller copy. Try one under 12 MB.",
                    Status = StatusCodes.Status413PayloadTooLarge,
                    Instance = httpContext.Request.Path,
                },
                cancellationToken);

            return true;
        }

        var traceId = httpContext.TraceIdentifier;

        logger.LogError(
            exception,
            "Unhandled exception for {Method} {Path}. TraceId={TraceId}",
            httpContext.Request.Method,
            httpContext.Request.Path,
            traceId);

        var problem = new ProblemDetails
        {
            Title = "Something went wrong on our end.",
            Detail = environment.IsDevelopment()
                ? exception.Message
                : "The request could not be completed. Please try again shortly.",
            Status = StatusCodes.Status500InternalServerError,
            Instance = httpContext.Request.Path,
        };
        problem.Extensions["traceId"] = traceId;

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);

        return true;
    }
}
