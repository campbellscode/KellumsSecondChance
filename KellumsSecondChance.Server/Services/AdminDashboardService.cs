using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KellumsSecondChance.Server.Services;

public interface IAdminDashboardService
{
    Task<DashboardDto> GetAsync(CancellationToken ct = default);
}

/// <summary>
/// The operating picture.
///
/// Every number here is counted from actual rows. There are no revenue figures,
/// no conversion rates and no trend arrows, because none of that is derivable
/// from what this application stores — a lead marked Won records no value, so a
/// "£ pipeline" tile would be an invention.
///
/// What it does show is the two things a renovation business needs on a Monday
/// morning: which leads have not been dealt with, and what is stopping content
/// from going live.
/// </summary>
public class AdminDashboardService(
    KellumsDbContext db,
    ISiteSettingsWriteService settings) : IAdminDashboardService
{
    private const int RecentLeadCount = 6;

    public async Task<DashboardDto> GetAsync(CancellationToken ct = default)
    {
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

        // One grouped round-trip rather than seven counts.
        var statusCounts = await db.EstimateRequests
            .AsNoTracking()
            .GroupBy(r => r.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        int Leads(EstimateRequestStatus status) =>
            statusCounts.FirstOrDefault(s => s.Status == status)?.Count ?? 0;

        var totalLeads = statusCounts.Sum(s => s.Count);
        var leadsLast30 = await db.EstimateRequests
            .AsNoTracking()
            .CountAsync(r => r.CreatedAtUtc >= thirtyDaysAgo, ct);

        var projects = await db.RenovationProjects
            .AsNoTracking()
            .Select(p => new
            {
                p.Id,
                p.Title,
                p.IsActive,
                HasCover = p.Images.Any(i => i.Kind == ProjectImageKind.Cover),
                HasBefore = p.Images.Any(i => i.Kind == ProjectImageKind.Before),
                HasAfter = p.Images.Any(i => i.Kind == ProjectImageKind.After),
                ImageCount = p.Images.Count,
            })
            .ToListAsync(ct);

        var services = await db.RenovationServices
            .AsNoTracking()
            .Select(s => new { s.IsActive })
            .ToListAsync(ct);

        var testimonials = await db.CustomerTestimonials
            .AsNoTracking()
            .Select(t => new { t.IsActive, t.IsSampleContent })
            .ToListAsync(ct);

        var faqs = await db.FaqItems
            .AsNoTracking()
            .Select(f => new { f.Id, f.Question, f.IsActive, f.NeedsReview })
            .ToListAsync(ct);

        var activeAreas = await db.ServiceAreas.AsNoTracking().CountAsync(a => a.IsActive, ct);
        var placeholderAreas = await db.ServiceAreas
            .AsNoTracking()
            .CountAsync(a => a.IsActive && a.IsSampleContent, ct);

        var metrics = new DashboardMetricsDto(
            NewLeads: Leads(EstimateRequestStatus.New),
            // Contacted but not yet moved on: the ones that go quiet.
            AwaitingFollowUp: Leads(EstimateRequestStatus.Contacted),
            EstimatesScheduled: Leads(EstimateRequestStatus.EstimateScheduled),
            EstimatesSent: Leads(EstimateRequestStatus.EstimateSent),
            Won: Leads(EstimateRequestStatus.Won),
            Lost: Leads(EstimateRequestStatus.Lost),
            Archived: Leads(EstimateRequestStatus.Archived),
            TotalLeads: totalLeads,
            LeadsLast30Days: leadsLast30,
            PublishedProjects: projects.Count(p => p.IsActive),
            DraftProjects: projects.Count(p => !p.IsActive),
            PublishedServices: services.Count(s => s.IsActive),
            InactiveServices: services.Count(s => !s.IsActive),
            PublishedTestimonials: testimonials.Count(t => t.IsActive),
            UnpublishedTestimonials: testimonials.Count(t => !t.IsActive),
            PublishedFaqs: faqs.Count(f => f.IsActive && !f.NeedsReview),
            FaqsAwaitingReview: faqs.Count(f => f.NeedsReview),
            ActiveServiceAreas: activeAreas);

        var recent = await db.EstimateRequests
            .AsNoTracking()
            .OrderByDescending(r => r.CreatedAtUtc)
            .Take(RecentLeadCount)
            .Select(r => new AdminEstimateRequestDto(
                r.Id, r.Reference, r.FirstName, r.LastName, r.Email, r.Phone,
                r.ProjectTypeSlugs, r.PropertyType, r.AddressLine, r.City, r.PostalCode,
                r.Timeline, r.BudgetRange, r.Description, r.PreferredContactMethod,
                r.ReferralSource, r.Status, r.InternalNotes, r.CreatedAtUtc, r.UpdatedAtUtc,
                r.LandingPage, r.ReferrerUrl, r.UtmSource, r.UtmMedium, r.UtmCampaign, r.UtmTerm,
                r.UtmContent, r.NotificationAttemptCount, r.NotificationAttemptedAtUtc,
                r.NotificationDeliveredAtUtc, r.NotificationFailedAtUtc, r.NotificationFailureCategory))
            .ToListAsync(ct);

        var attention = new List<AttentionItemDto>();

        if (metrics.NewLeads > 0)
        {
            attention.Add(new AttentionItemDto(
                "leads",
                metrics.NewLeads == 1 ? "1 new lead has not been contacted" : $"{metrics.NewLeads} new leads have not been contacted",
                "Nobody has moved these on from New yet.",
                "/admin/estimate-requests?status=New",
                "urgent"));
        }

        foreach (var faq in faqs.Where(f => f.NeedsReview).Take(5))
        {
            attention.Add(new AttentionItemDto(
                "faq",
                "A question is waiting on a business decision",
                faq.Question,
                $"/admin/faqs?highlight={faq.Id}",
                "action"));
        }

        foreach (var project in projects.Where(p => p.IsActive && !p.HasCover).Take(5))
        {
            attention.Add(new AttentionItemDto(
                "project",
                "A published project has no cover photo",
                project.Title,
                $"/admin/projects/{project.Id}",
                "action"));
        }

        foreach (var project in projects.Where(p => p.IsActive && (!p.HasBefore || !p.HasAfter)).Take(5))
        {
            attention.Add(new AttentionItemDto(
                "project",
                "A published project has no before/after pair",
                $"{project.Title} — the transformation slider needs both halves.",
                $"/admin/projects/{project.Id}",
                "info"));
        }

        var draftCount = projects.Count(p => !p.IsActive);
        if (draftCount > 0)
        {
            attention.Add(new AttentionItemDto(
                "project",
                draftCount == 1 ? "1 project is still a draft" : $"{draftCount} projects are still drafts",
                "Drafts never appear on the website.",
                "/admin/projects",
                "info"));
        }

        var unpublishedReal = testimonials.Count(t => !t.IsActive && !t.IsSampleContent);
        if (unpublishedReal > 0)
        {
            attention.Add(new AttentionItemDto(
                "testimonial",
                unpublishedReal == 1 ? "1 review is not published" : $"{unpublishedReal} reviews are not published",
                "They will not show on the website until you publish them.",
                "/admin/testimonials",
                "action"));
        }

        if (placeholderAreas > 0)
        {
            attention.Add(new AttentionItemDto(
                "service-area",
                "Your coverage is still using stand-in entries",
                "The website says coverage is being confirmed until these are replaced with real areas.",
                "/admin/service-areas",
                "action"));
        }

        attention.AddRange(await BusinessProfileGapsAsync(ct));

        return new DashboardDto(metrics, recent, attention);
    }

    /// <summary>
    /// Business details that are still blank.
    ///
    /// Each one is something the public site is currently omitting: no phone
    /// link, no email link, no address. Surfacing them here is how an owner
    /// discovers that without reading source code.
    /// </summary>
    private async Task<IReadOnlyList<AttentionItemDto>> BusinessProfileGapsAsync(CancellationToken ct)
    {
        var profile = await settings.GetAsync(ct);
        var gaps = new List<AttentionItemDto>();

        if (profile.PhoneDisplay is null || profile.PhoneE164 is null)
        {
            gaps.Add(new AttentionItemDto(
                "settings",
                "No phone number is published",
                "Until one is set there is no call button anywhere on the website.",
                "/admin/site-settings",
                "urgent"));
        }

        if (profile.Email is null)
        {
            gaps.Add(new AttentionItemDto(
                "settings",
                "No email address is published",
                "Customers can still use the estimate form, but there is no email link.",
                "/admin/site-settings",
                "action"));
        }

        if (profile.SiteUrl is null)
        {
            gaps.Add(new AttentionItemDto(
                "settings",
                "The website address has not been set",
                "Search engines need it for canonical links and sharing previews.",
                "/admin/site-settings",
                "action"));
        }

        if (profile.OgImagePath is null)
        {
            gaps.Add(new AttentionItemDto(
                "settings",
                "No sharing image is set",
                "Links shared to Facebook or a text message will preview without a picture.",
                "/admin/site-settings",
                "info"));
        }

        return gaps;
    }
}
