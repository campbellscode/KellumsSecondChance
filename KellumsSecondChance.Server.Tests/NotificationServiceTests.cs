using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net;

namespace KellumsSecondChance.Server.Tests;

public sealed class NotificationServiceTests : IDisposable
{
    private readonly TestDatabase fixture = new();
    public void Dispose() => fixture.Dispose();

    private static EmailNotificationOptions Enabled() => new() { Enabled = true, FromAddress = "website@notify.example.com", NotificationAddress = "ops@example.com", ResendApiKey = "test-only", AdminBaseUrl = "https://example.com" };
    private sealed class Sender : INotificationSender
    {
        public bool Throw { get; set; }
        public Notification? Last { get; private set; }
        public Task SendAsync(Notification notification, CancellationToken ct = default) { Last = notification; if (Throw) throw new TimeoutException("secret smtp detail"); return Task.CompletedTask; }
    }

    [Fact]
    public async Task Estimate_success_failure_retry_and_disabled_state_are_durable_without_duplicates()
    {
        var item = Estimate(); fixture.Db.EstimateRequests.Add(item); await fixture.Db.SaveChangesAsync();
        var sender = new Sender { Throw = true };
        var log = new CaptureLogger<EstimateRequestNotifier>();
        var notifier = new EstimateRequestNotifier(sender, Options.Create(Enabled()), log, fixture.Db);
        await notifier.NotifyNewRequestAsync(item, null);
        Assert.Equal(1, item.NotificationAttemptCount); Assert.NotNull(item.NotificationFailedAtUtc); Assert.Equal("Timeout", item.NotificationFailureCategory);
        Assert.Contains(log.Messages, x => x.Contains("persisted", StringComparison.OrdinalIgnoreCase));
        sender.Throw = false; await notifier.NotifyNewRequestAsync(item, null);
        Assert.Equal(2, item.NotificationAttemptCount); Assert.NotNull(item.NotificationDeliveredAtUtc); Assert.Null(item.NotificationFailedAtUtc); Assert.Null(item.NotificationFailureCategory);
        Assert.Equal(1, await fixture.Db.EstimateRequests.CountAsync());
        Assert.Contains("https://example.com/admin/estimate-requests", sender.Last!.PlainTextBody);

        var disabled = new EstimateRequestNotifier(sender, Options.Create(new EmailNotificationOptions()), NullLogger<EstimateRequestNotifier>.Instance, fixture.Db);
        await disabled.NotifyNewRequestAsync(item, null);
        Assert.Equal(2, item.NotificationAttemptCount);
    }

    [Fact]
    public async Task Employment_content_excludes_private_fields_and_retry_never_duplicates_or_changes_status()
    {
        var item = Employment(); fixture.Db.EmploymentInterests.Add(item); await fixture.Db.SaveChangesAsync();
        var sender = new Sender { Throw = true };
        var notifier = new EmploymentInterestNotifier(sender, Options.Create(Enabled()), NullLogger<EmploymentInterestNotifier>.Instance, fixture.Db);
        await notifier.NotifyAsync(item, null);
        Assert.Equal(1, item.NotificationAttemptCount); Assert.Equal("Timeout", item.NotificationFailureCategory);
        sender.Throw = false; await notifier.NotifyAsync(item, null);
        Assert.Equal(2, item.NotificationAttemptCount); Assert.Null(item.NotificationFailureCategory); Assert.Equal(EmploymentInterestStatus.New, item.Status);
        Assert.Equal(1, await fixture.Db.EmploymentInterests.CountAsync());
        foreach (var forbidden in new[] { "SubmitterIpHash", "RowVersion", "InternalNotes", "CompanyWebsite", "smtp-password" }) Assert.DoesNotContain(forbidden, sender.Last!.PlainTextBody, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task All_three_templates_have_exact_subject_reply_to_fields_and_encoded_html()
    {
        var sender = new Sender();
        var estimate = Estimate(); estimate.Description = "Repair <script>alert('x')</script> siding";
        await new EstimateRequestNotifier(sender, Options.Create(Enabled()), NullLogger<EstimateRequestNotifier>.Instance, fixture.Db).NotifyNewRequestAsync(estimate, null);
        Assert.Equal("New Contact Inquiry — Dana O", sender.Last!.Subject);
        Assert.Equal("d@example.com", sender.Last.ReplyTo);
        Assert.Contains("kitchen", sender.Last.HtmlBody); Assert.Contains("&lt;script&gt;", sender.Last.HtmlBody); Assert.DoesNotContain("<script>", sender.Last.HtmlBody);

        var booking = new BookingRequest { Id=7, FirstName="Bea", LastName="K", Email="bea@example.com", Phone="5135550100", PreferredDate=new DateOnly(2030,1,2), PreferredTime=new TimeOnly(9,30), Address="1 Main", City="Cincinnati", State="OH", PostalCode="45236", ProjectDescription="Replace the porch railing", Notes="Use side door" };
        await new BookingRequestNotifier(sender, Options.Create(Enabled()), NullLogger<BookingRequestNotifier>.Instance).NotifyAsync(booking, null);
        Assert.Equal("New Booking Request — Bea K", sender.Last!.Subject); Assert.Equal("bea@example.com", sender.Last.ReplyTo); Assert.Contains("Replace the porch railing", sender.Last.HtmlBody); Assert.Contains("Use side door", sender.Last.PlainTextBody);

        var employment = Employment(); employment.GeneralWorkExperience="Framing"; employment.AreasOfExperience="Carpentry"; employment.Message="Ready to learn";
        await new EmploymentInterestNotifier(sender, Options.Create(Enabled()), NullLogger<EmploymentInterestNotifier>.Instance, fixture.Db).NotifyAsync(employment, null);
        Assert.Equal("New Work With Us Application — Alex R", sender.Last!.Subject); Assert.Equal("a@example.com", sender.Last.ReplyTo); Assert.Contains("Framing", sender.Last.HtmlBody); Assert.Contains("Carpentry", sender.Last.PlainTextBody); Assert.Contains("Ready to learn", sender.Last.HtmlBody);
    }

    [Fact]
    public async Task Resend_transport_uses_only_configured_from_and_recipient()
    {
        var handler = new CaptureHandler();
        var client = new HttpClient(handler) { BaseAddress = new Uri("https://api.resend.com/") };
        var sender = new ResendNotificationSender(client, Options.Create(Enabled()), NullLogger<ResendNotificationSender>.Instance);
        await sender.SendAsync(new Notification("Subject", "<p>Body</p>", "Body", "visitor@example.com", "REF"));
        Assert.Contains("website@notify.example.com", handler.Body); Assert.Contains("ops@example.com", handler.Body); Assert.Contains("visitor@example.com", handler.Body); Assert.Equal("Bearer test-only", handler.Authorization);
    }

    private sealed class CaptureHandler : HttpMessageHandler
    {
        public string Body { get; private set; } = ""; public string Authorization { get; private set; } = "";
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) { Body = await request.Content!.ReadAsStringAsync(ct); Authorization = request.Headers.Authorization!.ToString(); return new HttpResponseMessage(HttpStatusCode.OK); }
    }
    private sealed class CaptureLogger<T> : ILogger<T>
    {
        public List<string> Messages { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) => Messages.Add(formatter(state, exception));
    }

    private static EstimateRequest Estimate() => new() { Reference="KSC-TEST", FirstName="Dana", LastName="O", Email="d@example.com", ProjectTypeSlugs=["kitchen"], PostalCode="12345", Description="A detailed renovation request that is long enough for normal use.", PropertyType=PropertyType.SingleFamily, Timeline=ProjectTimeline.NotSure, BudgetRange=BudgetRange.NotSure, PreferredContactMethod=PreferredContactMethod.Email };
    private static EmploymentInterest Employment() => new() { FirstName="Alex", LastName="R", Email="a@example.com", WorkInterest="Renovation crew", PreferredContactMethod=PreferredContactMethod.Email, SubmitterIpHash="private", InternalNotes="private", Status=EmploymentInterestStatus.New };
}
