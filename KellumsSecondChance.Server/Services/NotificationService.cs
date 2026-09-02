using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Domain.Entities;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;
using KellumsSecondChance.Server.Data;

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

public sealed class SmtpNotificationSender(IOptions<NotificationOptions> options) : INotificationSender
{
    private readonly NotificationOptions _options = options.Value;
    public async Task SendAsync(Notification notification, CancellationToken ct = default)
    {
        using var message = new MailMessage { From = new MailAddress(_options.FromAddress!, _options.FromDisplayName), Subject = notification.Subject, Body = notification.PlainTextBody, IsBodyHtml = false };
        foreach (var recipient in notification.Recipients) message.To.Add(recipient);
        using var client = new SmtpClient(_options.SmtpHost!, _options.SmtpPort) { EnableSsl = _options.SmtpUseTls, Timeout = _options.TimeoutSeconds * 1000 };
        if (!string.IsNullOrWhiteSpace(_options.SmtpUsername)) client.Credentials = new NetworkCredential(_options.SmtpUsername, _options.SmtpPassword);
        ct.ThrowIfCancellationRequested();
        await client.SendMailAsync(message, ct);
    }
}

/// <summary>Builds and dispatches the "a new lead arrived" alert.</summary>
public interface IEstimateRequestNotifier
{
    Task NotifyNewRequestAsync(EstimateRequest request, string? adminBaseUrl, CancellationToken ct = default);
}

public interface IEmploymentInterestNotifier { Task NotifyAsync(EmploymentInterest interest, string? requestOrigin, CancellationToken ct = default); }
public interface IBookingRequestNotifier { Task NotifyAsync(BookingRequest request, string? requestOrigin, CancellationToken ct = default); }
public class BookingRequestNotifier(INotificationSender sender, IOptions<NotificationOptions> options, ILogger<BookingRequestNotifier> logger) : IBookingRequestNotifier
{
    public async Task NotifyAsync(BookingRequest request, string? requestOrigin, CancellationToken ct = default)
    {
        if (!options.Value.Enabled) return;
        try
        {
            var origin = (options.Value.AdminBaseUrl ?? requestOrigin)?.TrimEnd('/');
            var link = origin is null ? "/admin/bookings" : $"{origin}/admin/bookings";
            var body = string.Join('\n', "A new booking request has arrived.", string.Empty,
                $"Name: {request.FirstName} {request.LastName}", $"Email: {request.Email}", $"Phone: {request.Phone}",
                $"Preferred: {request.PreferredDate:yyyy-MM-dd} at {request.PreferredTime:HH:mm}", string.Empty,
                $"Open it in the console: {link}");
            await sender.SendAsync(new Notification(options.Value.EstimateRequestRecipients,
                $"New booking request — {request.FirstName} {request.LastName}", body, $"BOOK-{request.Id}"), ct);
        }
        catch (Exception ex) { logger.LogError(ex, "Notification for booking request {BookingId} failed.", request.Id); }
    }
}
public class EmploymentInterestNotifier(INotificationSender sender, IOptions<NotificationOptions> options, ILogger<EmploymentInterestNotifier> logger, KellumsDbContext db) : IEmploymentInterestNotifier
{
    public async Task NotifyAsync(EmploymentInterest x, string? requestOrigin, CancellationToken ct = default)
    {
        if(!options.Value.Enabled)return; x.NotificationAttemptCount++;x.NotificationAttemptedAtUtc=DateTime.UtcNow;
        try {
            var o=options.Value; var origin=(o.AdminBaseUrl??requestOrigin)?.TrimEnd('/');
            var link=origin is null?"/admin/employment-interests":$"{origin}/admin/employment-interests";
            var body=string.Join('\n',$"A new work-interest enquiry has arrived.","",$"Name: {x.FirstName} {x.LastName}",$"Email: {x.Email}",$"Phone: {x.Phone??"not given"}",$"Preferred contact: {x.PreferredContactMethod}",$"Work interest: {x.WorkInterest}",$"Availability: {x.Availability??"not given"}","",$"Open it in the console: {link}");
            await sender.SendAsync(new Notification(o.EmploymentInterestRecipients,$"New Kellum's work interest enquiry — {x.FirstName} {x.LastName}",body,$"WORK-{x.Id}"),ct);x.NotificationDeliveredAtUtc=DateTime.UtcNow;x.NotificationFailedAtUtc=null;x.NotificationFailureCategory=null;
        } catch(Exception ex) { x.NotificationFailedAtUtc=DateTime.UtcNow;x.NotificationFailureCategory=ex is SmtpException?"Connection":ex is TimeoutException?"Timeout":"Unknown";logger.LogError(ex,"Notification for employment interest {InterestId} failed.",x.Id); }
        finally
        {
            try { await db.SaveChangesAsync(CancellationToken.None); }
            catch (Exception ex) { logger.LogError(ex, "Notification state for employment interest {InterestId} could not be recorded.", x.Id); }
        }
    }
}

public class EstimateRequestNotifier(
    INotificationSender sender,
    IOptions<NotificationOptions> options,
    ILogger<EstimateRequestNotifier> logger, KellumsDbContext db) : IEstimateRequestNotifier
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
        if(!_options.Enabled)return; request.NotificationAttemptCount++;request.NotificationAttemptedAtUtc=DateTime.UtcNow;
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
            request.NotificationDeliveredAtUtc=DateTime.UtcNow;request.NotificationFailedAtUtc=null;request.NotificationFailureCategory=null;
        }
        catch (Exception ex)
        {
            request.NotificationFailedAtUtc=DateTime.UtcNow;request.NotificationFailureCategory=ex is SmtpException?"Connection":ex is TimeoutException?"Timeout":"Unknown";logger.LogError(ex, "Notification for estimate request {Reference} failed.", request.Reference);
        }
        finally
        {
            try { await db.SaveChangesAsync(CancellationToken.None); }
            catch (Exception ex) { logger.LogError(ex, "Notification state for estimate request {Reference} could not be recorded.", request.Reference); }
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
