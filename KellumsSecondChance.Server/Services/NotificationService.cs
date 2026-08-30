using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Domain.Entities;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Services;

/// <summary>A message the business should receive. Provider-agnostic.</summary>
/// <param name="Reference">
/// Opaque identifier safe to log. The subject and body carry the customer's
/// name and contact details, so nothing but this reaches the application log.
/// </param>
public sealed record Notification(
    IReadOnlyList<string> Recipients,
    string Subject,
    string PlainTextBody,
    string Reference);

/// <summary>
/// Delivers operational notifications.
///
/// ⚠ NO DELIVERY PROVIDER IS CONFIGURED IN THIS BUILD.
///
/// The project has no SMTP or transactional-email dependency, and inventing one
/// — hardcoded credentials, a fake "sent" result, or an unapproved paid service
/// — would be worse than having none. So this is the seam and nothing more.
///
/// TO ENABLE DELIVERY: implement this interface against your chosen provider,
/// register it in Program.cs in place of <see cref="LoggingNotificationSender"/>,
/// and set Notifications:EstimateRequestRecipients.
/// </summary>
public interface INotificationSender
{
    Task SendAsync(Notification notification, CancellationToken ct = default);
}

/// <summary>
/// The no-provider implementation: records that a notification was due.
///
/// It never claims a message was delivered. The log line is the honest record
/// that an alert would have gone out, so nothing silently disappears while the
/// provider is still outstanding.
/// </summary>
public class LoggingNotificationSender(ILogger<LoggingNotificationSender> logger) : INotificationSender
{
    public Task SendAsync(Notification notification, CancellationToken ct = default)
    {
        /*
         * The REFERENCE is logged, never the subject.
         *
         * The subject names the customer. Application logs are shipped to
         * places an email inbox is not — a log aggregator, a support ticket, a
         * screenshot — and a homeowner's name has no business travelling that
         * far to record that a notification was due.
         */
        if (notification.Recipients.Count == 0)
        {
            logger.LogInformation(
                "Notification not dispatched — no recipients configured. Reference: {Reference}",
                notification.Reference);
            return Task.CompletedTask;
        }

        logger.LogInformation(
            "Notification ready but NOT delivered (no email provider configured). "
            + "Reference: {Reference}; Recipients: {RecipientCount}",
            notification.Reference,
            notification.Recipients.Count);

        return Task.CompletedTask;
    }
}

/// <summary>Builds and dispatches the "a new lead arrived" alert.</summary>
public interface IEstimateRequestNotifier
{
    Task NotifyNewRequestAsync(EstimateRequest request, string? adminBaseUrl, CancellationToken ct = default);
}

public class EstimateRequestNotifier(
    INotificationSender sender,
    IOptions<NotificationOptions> options,
    ILogger<EstimateRequestNotifier> logger) : IEstimateRequestNotifier
{
    private readonly NotificationOptions _options = options.Value;

    public async Task NotifyNewRequestAsync(
        EstimateRequest request,
        string? adminBaseUrl,
        CancellationToken ct = default)
    {
        /*
         * THE LEAD IS ALREADY SAVED BEFORE THIS RUNS, AND NOTHING HERE MAY THROW.
         *
         * A notification failure must never cost the business a lead. The whole
         * body is wrapped, the caller does not await a delivery result, and the
         * submission endpoint has already returned its reference to the customer.
         */
        try
        {
            var baseUrl = (_options.AdminBaseUrl ?? adminBaseUrl)?.TrimEnd('/');
            var link = baseUrl is null
                ? "/admin/estimate-requests"
                : $"{baseUrl}/admin/estimate-requests";

            // Deliberately minimal. The address, budget, timeline and full
            // description stay in the console behind authentication rather than
            // travelling through an inbox.
            var body = string.Join(
                '\n',
                $"A new estimate request has come in ({request.Reference}).",
                string.Empty,
                $"Name:    {request.FirstName} {request.LastName}",
                $"Phone:   {request.Phone ?? "not given"}",
                $"Email:   {request.Email}",
                $"Project: {(request.ProjectTypeSlugs.Count > 0 ? string.Join(", ", request.ProjectTypeSlugs) : "not specified")}",
                string.Empty,
                Summarise(request.Description),
                string.Empty,
                $"Open it in the console: {link}");

            await sender.SendAsync(
                new Notification(
                    _options.EstimateRequestRecipients,
                    $"New estimate request — {request.FirstName} {request.LastName} ({request.Reference})",
                    body,
                    request.Reference),
                ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Notification for estimate request {Reference} failed.", request.Reference);
        }
    }

    /// <summary>First couple of lines only — the console holds the rest.</summary>
    private static string Summarise(string description)
    {
        const int limit = 300;
        var trimmed = description.Trim();
        return trimmed.Length <= limit ? trimmed : trimmed[..limit] + "…";
    }
}
