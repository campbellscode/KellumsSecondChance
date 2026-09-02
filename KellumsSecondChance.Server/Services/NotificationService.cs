using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Mail;
using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Entities;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Services;

public sealed record Notification(string Subject, string HtmlBody, string PlainTextBody, string? ReplyTo, string Reference);
public interface INotificationSender { Task SendAsync(Notification notification, CancellationToken ct = default); }

public sealed class ResendNotificationSender(HttpClient http, IOptions<EmailNotificationOptions> options, ILogger<ResendNotificationSender> logger) : INotificationSender
{
    private readonly EmailNotificationOptions config = options.Value;
    public async Task SendAsync(Notification n, CancellationToken ct = default)
    {
        if (!config.Enabled) return;
        using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.ResendApiKey);
        request.Content = JsonContent.Create(new { from = $"{config.FromName} <{config.FromAddress}>", to = new[] { config.NotificationAddress! }, subject = n.Subject, html = n.HtmlBody, text = n.PlainTextBody, reply_to = n.ReplyTo });
        using var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode) throw new HttpRequestException($"Resend rejected the notification with HTTP {(int)response.StatusCode}.", null, response.StatusCode);
        logger.LogInformation("Email notification delivered. Reference: {Reference}; Provider: Resend", n.Reference);
    }
}

public interface IEstimateRequestNotifier { Task NotifyNewRequestAsync(EstimateRequest request, string? adminBaseUrl, CancellationToken ct = default); }
public interface IEmploymentInterestNotifier { Task NotifyAsync(EmploymentInterest interest, string? requestOrigin, CancellationToken ct = default); }
public interface IBookingRequestNotifier { Task NotifyAsync(BookingRequest request, string? requestOrigin, CancellationToken ct = default); }

internal static class NotificationTemplate
{
    public static Notification Build(string heading, string subject, DateTime submittedUtc, IEnumerable<(string Label, string? Value)> fields, string messageLabel, string? message, string? replyTo, string reference, string? adminLink)
    {
        var rows = fields.Where(x => !string.IsNullOrWhiteSpace(x.Value)).ToArray();
        var details = string.Join("", rows.Select(x => $"<tr><td style=\"padding:9px 12px;color:#6b6258;font-size:13px;border-bottom:1px solid #e8e1d8;width:34%;vertical-align:top\">{E(x.Label)}</td><td style=\"padding:9px 12px;color:#211d19;font-size:14px;border-bottom:1px solid #e8e1d8;vertical-align:top\">{E(x.Value!)}</td></tr>"));
        var messageHtml = string.IsNullOrWhiteSpace(message) ? "" : $"<h2 style=\"font-size:16px;margin:26px 0 8px;color:#211d19\">{E(messageLabel)}</h2><div style=\"background:#f6f2ec;border-left:4px solid #b55a32;padding:16px;white-space:pre-wrap;line-height:1.55;color:#302922\">{E(message!)}</div>";
        var linkHtml = string.IsNullOrWhiteSpace(adminLink) ? "" : $"<p style=\"margin:26px 0 0\"><a href=\"{E(adminLink!)}\" style=\"display:inline-block;background:#b55a32;color:#fff;text-decoration:none;padding:11px 17px;border-radius:4px\">Open admin console</a></p>";
        var html = $"""
<!doctype html><html><body style="margin:0;background:#eee9e2;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden">{E(subject)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee9e2"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:8px;overflow:hidden"><tr><td style="background:#211d19;padding:25px 28px;color:#fff"><div style="font-size:21px;font-weight:700">Kellum's Second Chance</div><div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#dccbbb;margin-top:4px">Renovations</div></td></tr><tr><td style="padding:30px 28px"><h1 style="font-size:24px;line-height:1.25;margin:0 0 8px;color:#211d19">{E(heading)}</h1><p style="margin:0 0 22px;color:#6b6258;font-size:13px">Submitted {submittedUtc:MMMM d, yyyy 'at' h:mm tt} UTC · Ref {E(reference)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e8e1d8;border-radius:5px;border-collapse:collapse">{details}</table>{messageHtml}{linkHtml}</td></tr><tr><td style="background:#f6f2ec;padding:20px 28px;color:#6b6258;font-size:12px;line-height:1.5">Sent securely from the Kellum's Second Chance Renovations website. Replying addresses the submitter when a validated email was provided.</td></tr></table></td></tr></table></body></html>
""";
        var text = $"{heading}\nSubmitted {submittedUtc:O}\nReference: {reference}\n\n" + string.Join("\n", rows.Select(x => $"{x.Label}: {x.Value}")) + (string.IsNullOrWhiteSpace(message) ? "" : $"\n\n{messageLabel}:\n{message}") + (string.IsNullOrWhiteSpace(adminLink) ? "" : $"\n\nOpen admin console: {adminLink}");
        return new(subject, html, text, ValidEmail(replyTo), reference);
    }
    private static string E(string value) => WebUtility.HtmlEncode(value);
    private static string? ValidEmail(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Contains('\r') || value.Contains('\n')) return null;
        try { var trimmed = value.Trim(); var address = new MailAddress(trimmed); return address.Address == trimmed ? address.Address : null; } catch (FormatException) { return null; }
    }
}

public sealed class BookingRequestNotifier(INotificationSender sender, IOptions<EmailNotificationOptions> options, ILogger<BookingRequestNotifier> logger) : IBookingRequestNotifier
{
    public async Task NotifyAsync(BookingRequest x, string? origin, CancellationToken ct = default)
    {
        if (!options.Value.Enabled) return;
        var n = NotificationTemplate.Build("New Booking Request", $"New Booking Request — {x.FirstName} {x.LastName}", x.CreatedAtUtc,
            [("Name", $"{x.FirstName} {x.LastName}"), ("Email", x.Email), ("Phone", x.Phone), ("Preferred date", x.PreferredDate.ToString("MMMM d, yyyy")), ("Preferred time", x.PreferredTime.ToString("h:mm tt")), ("Alternate date", x.AlternateDate?.ToString("MMMM d, yyyy")), ("Alternate time", x.AlternateTime?.ToString("h:mm tt")), ("Service address", x.Address), ("City", x.City), ("State", x.State), ("ZIP / postal code", x.PostalCode), ("Notes", x.Notes)], "Project description", x.ProjectDescription, x.Email, $"BOOK-{x.Id}", Link(options.Value.AdminBaseUrl ?? origin, "/admin/bookings"));
        try { await sender.SendAsync(n, ct); } catch (Exception ex) { logger.LogError(ex, "Email notification failed after booking request {BookingId} was persisted.", x.Id); }
    }
    private static string Link(string? origin, string path) => string.IsNullOrWhiteSpace(origin) ? path : origin.TrimEnd('/') + path;
}

public sealed class EmploymentInterestNotifier(INotificationSender sender, IOptions<EmailNotificationOptions> options, ILogger<EmploymentInterestNotifier> logger, KellumsDbContext db) : IEmploymentInterestNotifier
{
    public async Task NotifyAsync(EmploymentInterest x, string? origin, CancellationToken ct = default)
    {
        if (!options.Value.Enabled) return; x.NotificationAttemptCount++; x.NotificationAttemptedAtUtc = DateTime.UtcNow;
        try { var n = NotificationTemplate.Build("New Work With Us Application", $"New Work With Us Application — {x.FirstName} {x.LastName}", x.CreatedAtUtc,
            [("Name", $"{x.FirstName} {x.LastName}"), ("Email", x.Email), ("Phone", x.Phone), ("Preferred contact", x.PreferredContactMethod.ToString()), ("General work experience", x.GeneralWorkExperience), ("Areas of experience or skills", x.AreasOfExperience), ("Work interest", x.WorkInterest), ("Availability", x.Availability)], "Additional message", x.Message, x.Email, $"WORK-{x.Id}", Link(options.Value.AdminBaseUrl ?? origin, "/admin/employment-interests")); await sender.SendAsync(n, ct); x.NotificationDeliveredAtUtc = DateTime.UtcNow; x.NotificationFailedAtUtc = null; x.NotificationFailureCategory = null; }
        catch (Exception ex) { x.NotificationFailedAtUtc = DateTime.UtcNow; x.NotificationFailureCategory = Category(ex); logger.LogError(ex, "Email notification failed after work-with-us application {InterestId} was persisted.", x.Id); }
        finally { try { await db.SaveChangesAsync(CancellationToken.None); } catch (Exception ex) { logger.LogError(ex, "Notification state for work-with-us application {InterestId} could not be recorded.", x.Id); } }
    }
    private static string Link(string? origin, string path) => string.IsNullOrWhiteSpace(origin) ? path : origin.TrimEnd('/') + path;
    private static string Category(Exception ex) => ex is TimeoutException or TaskCanceledException ? "Timeout" : ex is HttpRequestException ? "Connection" : "Unknown";
}

public sealed class EstimateRequestNotifier(INotificationSender sender, IOptions<EmailNotificationOptions> options, ILogger<EstimateRequestNotifier> logger, KellumsDbContext db) : IEstimateRequestNotifier
{
    public async Task NotifyNewRequestAsync(EstimateRequest x, string? origin, CancellationToken ct = default)
    {
        if (!options.Value.Enabled) return; x.NotificationAttemptCount++; x.NotificationAttemptedAtUtc = DateTime.UtcNow;
        try { var n = NotificationTemplate.Build("New Contact Inquiry", $"New Contact Inquiry — {x.FirstName} {x.LastName}", x.CreatedAtUtc,
            [("Name", $"{x.FirstName} {x.LastName}"), ("Email", x.Email), ("Phone", x.Phone), ("Project types", x.ProjectTypeSlugs.Count == 0 ? null : string.Join(", ", x.ProjectTypeSlugs)), ("Property type", x.PropertyType.ToString()), ("Address", x.AddressLine), ("City", x.City), ("ZIP / postal code", x.PostalCode), ("Timeline", x.Timeline.ToString()), ("Budget", x.BudgetRange.ToString()), ("Preferred contact", x.PreferredContactMethod.ToString()), ("Referral source", x.ReferralSource), ("Landing page", x.LandingPage), ("Referrer", x.ReferrerUrl), ("UTM source", x.UtmSource), ("UTM medium", x.UtmMedium), ("UTM campaign", x.UtmCampaign), ("UTM term", x.UtmTerm), ("UTM content", x.UtmContent)], "Project description", x.Description, x.Email, x.Reference, Link(options.Value.AdminBaseUrl ?? origin, "/admin/estimate-requests")); await sender.SendAsync(n, ct); x.NotificationDeliveredAtUtc = DateTime.UtcNow; x.NotificationFailedAtUtc = null; x.NotificationFailureCategory = null; }
        catch (Exception ex) { x.NotificationFailedAtUtc = DateTime.UtcNow; x.NotificationFailureCategory = Category(ex); logger.LogError(ex, "Email notification failed after contact inquiry {Reference} was persisted.", x.Reference); }
        finally { try { await db.SaveChangesAsync(CancellationToken.None); } catch (Exception ex) { logger.LogError(ex, "Notification state for contact inquiry {Reference} could not be recorded.", x.Reference); } }
    }
    private static string Link(string? origin, string path) => string.IsNullOrWhiteSpace(origin) ? path : origin.TrimEnd('/') + path;
    private static string Category(Exception ex) => ex is TimeoutException or TaskCanceledException ? "Timeout" : ex is HttpRequestException ? "Connection" : "Unknown";
}
