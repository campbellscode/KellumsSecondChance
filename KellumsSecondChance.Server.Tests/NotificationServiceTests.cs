using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Tests;

public sealed class NotificationServiceTests : IDisposable
{
    private readonly TestDatabase fixture = new();
    public void Dispose() => fixture.Dispose();

    private static NotificationOptions Enabled() => new() { Enabled = true, EstimateRequestRecipients = ["ops@example.com"], EmploymentInterestRecipients = ["people@example.com"], AdminBaseUrl = "https://example.com" };
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
        var notifier = new EstimateRequestNotifier(sender, Options.Create(Enabled()), NullLogger<EstimateRequestNotifier>.Instance, fixture.Db);
        await notifier.NotifyNewRequestAsync(item, null);
        Assert.Equal(1, item.NotificationAttemptCount); Assert.NotNull(item.NotificationFailedAtUtc); Assert.Equal("Timeout", item.NotificationFailureCategory);
        sender.Throw = false; await notifier.NotifyNewRequestAsync(item, null);
        Assert.Equal(2, item.NotificationAttemptCount); Assert.NotNull(item.NotificationDeliveredAtUtc); Assert.Null(item.NotificationFailedAtUtc); Assert.Null(item.NotificationFailureCategory);
        Assert.Equal(1, await fixture.Db.EstimateRequests.CountAsync());
        Assert.Contains("https://example.com/admin/estimate-requests", sender.Last!.PlainTextBody);

        var disabled = new EstimateRequestNotifier(sender, Options.Create(new NotificationOptions()), NullLogger<EstimateRequestNotifier>.Instance, fixture.Db);
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

    private static EstimateRequest Estimate() => new() { Reference="KSC-TEST", FirstName="Dana", LastName="O", Email="d@example.com", ProjectTypeSlugs=["kitchen"], PostalCode="12345", Description="A detailed renovation request that is long enough for normal use.", PropertyType=PropertyType.SingleFamily, Timeline=ProjectTimeline.NotSure, BudgetRange=BudgetRange.NotSure, PreferredContactMethod=PreferredContactMethod.Email };
    private static EmploymentInterest Employment() => new() { FirstName="Alex", LastName="R", Email="a@example.com", WorkInterest="Renovation crew", PreferredContactMethod=PreferredContactMethod.Email, SubmitterIpHash="private", InternalNotes="private", Status=EmploymentInterestStatus.New };
}
