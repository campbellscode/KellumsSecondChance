using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KellumsSecondChance.Server.Services;

public interface IContentService
{
    Task<IReadOnlyList<ServiceSummaryDto>> GetServicesAsync(CancellationToken ct = default);

    Task<ServiceDetailDto?> GetServiceAsync(string slug, CancellationToken ct = default);

    Task<IReadOnlyList<ProjectSummaryDto>> GetProjectsAsync(
        string? categorySlug,
        bool featuredOnly,
        string? search,
        int? take,
        CancellationToken ct = default);

    Task<ProjectDetailDto?> GetProjectAsync(string slug, CancellationToken ct = default);

    Task<IReadOnlyList<ProjectDetailDto>> GetTransformationsAsync(int take, CancellationToken ct = default);

    Task<IReadOnlyList<ProjectCategoryDto>> GetProjectCategoriesAsync(CancellationToken ct = default);

    Task<IReadOnlyList<TestimonialDto>> GetTestimonialsAsync(bool featuredOnly, CancellationToken ct = default);

    /// <param name="includePendingReview">Admin-only. Public callers must never pass true.</param>
    Task<IReadOnlyList<FaqItemDto>> GetFaqsAsync(bool includePendingReview = false, CancellationToken ct = default);

    Task<IReadOnlyList<ServiceAreaDto>> GetServiceAreasAsync(CancellationToken ct = default);
}

/// <summary>
/// Read-side content queries.
///
/// There is no separate repository layer: DbContext already is a Unit of Work
/// plus repositories, and wrapping it again would add indirection without
/// adding a seam anybody needs. Everything here is AsNoTracking and projects
/// straight to DTOs, so no entity graph is materialised for a read.
/// </summary>
public class ContentService(KellumsDbContext db) : IContentService
{
    public async Task<IReadOnlyList<ServiceSummaryDto>> GetServicesAsync(CancellationToken ct = default)
    {
        return await db.RenovationServices
            .AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.DisplayOrder)
            .ThenBy(s => s.Name)
            .Select(s => new ServiceSummaryDto(
                s.Id,
                s.Slug,
                s.Name,
                s.Tagline,
                s.Summary,
                s.Icon,
                s.ImagePath == null
                    ? null
                    : new ImageDto(s.ImagePath, s.ImageWidth ?? 0, s.ImageHeight ?? 0, s.ImageAlt ?? string.Empty),
                s.DisplayOrder,
                s.IsFeatured))
            .ToListAsync(ct);
    }

    public async Task<ServiceDetailDto?> GetServiceAsync(string slug, CancellationToken ct = default)
    {
        var service = await db.RenovationServices
            .AsNoTracking()
            .Where(s => s.IsActive && s.Slug == slug)
            .Select(s => new
            {
                s.Id,
                s.Slug,
                s.Name,
                s.Tagline,
                s.Summary,
                s.Icon,
                s.ImagePath,
                s.ImageWidth,
                s.ImageHeight,
                s.ImageAlt,
                s.DisplayOrder,
                s.IsFeatured,
                s.Headline,
                s.Introduction,
                s.Includes,
                s.BestFor,
                s.Considerations,
                s.MetaTitle,
                s.MetaDescription,
                RelatedSlugs = s.ProjectServices
                    .Where(ps => ps.RenovationProject!.IsActive)
                    .OrderBy(ps => ps.RenovationProject!.DisplayOrder)
                    .Select(ps => ps.RenovationProject!.Slug)
                    .ToList(),
            })
            .FirstOrDefaultAsync(ct);

        if (service is null) return null;

        return new ServiceDetailDto(
            service.Id,
            service.Slug,
            service.Name,
            service.Tagline,
            service.Summary,
            service.Icon,
            service.ImagePath == null
                ? null
                : new ImageDto(
                    service.ImagePath,
                    service.ImageWidth ?? 0,
                    service.ImageHeight ?? 0,
                    service.ImageAlt ?? string.Empty),
            service.DisplayOrder,
            service.IsFeatured,
            service.Headline,
            service.Introduction,
            service.Includes,
            service.BestFor,
            service.Considerations,
            service.RelatedSlugs,
            service.MetaTitle,
            service.MetaDescription);
    }

    public async Task<IReadOnlyList<ProjectSummaryDto>> GetProjectsAsync(
        string? categorySlug,
        bool featuredOnly,
        string? search,
        int? take,
        CancellationToken ct = default)
    {
        var query = db.RenovationProjects.AsNoTracking().Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(categorySlug) && categorySlug != "all")
        {
            query = query.Where(p => p.CategorySlug == categorySlug);
        }

        if (featuredOnly) query = query.Where(p => p.IsFeatured);

        if (!string.IsNullOrWhiteSpace(search))
        {
            // Parameterised by EF; never string-concatenated into SQL.
            var term = search.Trim();
            query = query.Where(p =>
                EF.Functions.Like(p.Title, $"%{term}%")
                || EF.Functions.Like(p.Summary, $"%{term}%")
                || EF.Functions.Like(p.CategoryName, $"%{term}%")
                || (p.Location != null && EF.Functions.Like(p.Location, $"%{term}%")));
        }

        query = query.OrderBy(p => p.DisplayOrder).ThenByDescending(p => p.CompletedOn);

        // Clamped so a caller cannot request an unbounded page.
        if (take is > 0) query = query.Take(Math.Min(take.Value, 100));

        return await query
            .Select(p => new ProjectSummaryDto(
                p.Id,
                p.Slug,
                p.Title,
                p.CategoryName,
                p.CategorySlug,
                p.Location,
                p.Summary,
                p.CompletedOn,
                // Prefer an explicit Cover; fall back to the After shot.
                p.Images
                    .Where(i => i.Kind == ProjectImageKind.Cover || i.Kind == ProjectImageKind.After)
                    .OrderBy(i => i.Kind == ProjectImageKind.Cover ? 0 : 1)
                    .ThenBy(i => i.DisplayOrder)
                    .Select(i => new ImageDto(i.Path, i.Width, i.Height, i.AltText))
                    .FirstOrDefault(),
                p.IsFeatured,
                p.DisplayOrder,
                p.Images.Any(i => i.Kind == ProjectImageKind.Before)
                    && p.Images.Any(i => i.Kind == ProjectImageKind.After),
                p.IsSampleContent))
            .ToListAsync(ct);
    }

    public async Task<ProjectDetailDto?> GetProjectAsync(string slug, CancellationToken ct = default)
    {
        var project = await db.RenovationProjects
            .AsNoTracking()
            .Include(p => p.Images)
            .Include(p => p.ProjectServices)
            .ThenInclude(ps => ps.RenovationService)
            .FirstOrDefaultAsync(p => p.IsActive && p.Slug == slug, ct);

        return project is null ? null : ToDetail(project);
    }

    public async Task<IReadOnlyList<ProjectDetailDto>> GetTransformationsAsync(int take, CancellationToken ct = default)
    {
        var clamped = Math.Clamp(take, 1, 12);

        var projects = await db.RenovationProjects
            .AsNoTracking()
            .Include(p => p.Images)
            .Include(p => p.ProjectServices)
            .ThenInclude(ps => ps.RenovationService)
            .Where(p => p.IsActive
                && p.IsFeatured
                && p.Images.Any(i => i.Kind == ProjectImageKind.Before)
                && p.Images.Any(i => i.Kind == ProjectImageKind.After))
            .OrderBy(p => p.DisplayOrder)
            .Take(clamped)
            .ToListAsync(ct);

        return projects.Select(ToDetail).ToList();
    }

    public async Task<IReadOnlyList<ProjectCategoryDto>> GetProjectCategoriesAsync(CancellationToken ct = default)
    {
        // Grouped into an anonymous type first: constructing a positional record
        // inside a GroupBy projection is not translatable to SQL.
        var grouped = await db.RenovationProjects
            .AsNoTracking()
            .Where(p => p.IsActive)
            .GroupBy(p => new { p.CategorySlug, p.CategoryName })
            .Select(g => new
            {
                g.Key.CategorySlug,
                g.Key.CategoryName,
                Count = g.Count(),
            })
            .ToListAsync(ct);

        return grouped
            .OrderBy(g => g.CategoryName, StringComparer.OrdinalIgnoreCase)
            .Select(g => new ProjectCategoryDto(g.CategorySlug, g.CategoryName, g.Count))
            .ToList();
    }

    public async Task<IReadOnlyList<TestimonialDto>> GetTestimonialsAsync(bool featuredOnly, CancellationToken ct = default)
    {
        var query = db.CustomerTestimonials.AsNoTracking().Where(t => t.IsActive);
        if (featuredOnly) query = query.Where(t => t.IsFeatured);

        return await query
            .OrderBy(t => t.DisplayOrder)
            .ThenByDescending(t => t.ReviewedOn)
            .Select(t => new TestimonialDto(
                t.Id,
                t.FirstName,
                t.LastInitial,
                t.Location,
                t.Rating,
                t.Quote,
                t.ProjectCategory,
                t.ReviewedOn,
                t.IsFeatured,
                t.IsSampleContent,
                t.Source.ToString()))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<FaqItemDto>> GetFaqsAsync(
        bool includePendingReview = false,
        CancellationToken ct = default)
    {
        var query = db.FaqItems.AsNoTracking().Where(f => f.IsActive);

        // An answer that depends on an unset business policy is withheld rather
        // than published as a guess. Only the admin console sees these.
        if (!includePendingReview) query = query.Where(f => !f.NeedsReview);

        return await query
            .OrderBy(f => f.DisplayOrder)
            .Select(f => new FaqItemDto(
                f.Id,
                f.Question,
                f.Answer,
                f.Category,
                f.CategorySlug,
                f.DisplayOrder,
                f.NeedsReview,
                includePendingReview ? f.ReviewNote : null))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ServiceAreaDto>> GetServiceAreasAsync(CancellationToken ct = default)
    {
        return await db.ServiceAreas
            .AsNoTracking()
            .Where(a => a.IsActive)
            .OrderBy(a => a.DisplayOrder)
            .Select(a => new ServiceAreaDto(
                a.Id,
                a.Name,
                a.Kind.ToString(),
                a.StateOrRegion,
                a.PostalCodes,
                a.IsPrimary,
                a.Note,
                a.DisplayOrder,
                a.IsSampleContent))
            .ToListAsync(ct);
    }

    /* ------------------------------------------------------------ mapping */

    private static ProjectDetailDto ToDetail(RenovationProject p)
    {
        var images = p.Images
            .OrderBy(i => i.Kind)
            .ThenBy(i => i.DisplayOrder)
            .Select(i => new ProjectImageDto(
                i.Id,
                i.Path,
                i.Width,
                i.Height,
                i.AltText,
                i.Kind.ToString(),
                i.Caption,
                i.DisplayOrder,
                i.PairKey))
            .ToList();

        var services = p.ProjectServices
            .Where(ps => ps.RenovationService is not null)
            .OrderBy(ps => ps.DisplayOrder)
            .ToList();

        var cover = p.Images.FirstOrDefault(i => i.Kind == ProjectImageKind.Cover)
            ?? p.Images.FirstOrDefault(i => i.Kind == ProjectImageKind.After);

        return new ProjectDetailDto(
            p.Id,
            p.Slug,
            p.Title,
            p.CategoryName,
            p.CategorySlug,
            p.Location,
            p.Summary,
            p.CompletedOn,
            cover == null ? null : new ImageDto(cover.Path, cover.Width, cover.Height, cover.AltText),
            p.IsFeatured,
            p.DisplayOrder,
            images.Any(i => i.Kind == nameof(ProjectImageKind.Before))
                && images.Any(i => i.Kind == nameof(ProjectImageKind.After)),
            p.IsSampleContent,
            p.Challenge,
            p.Vision,
            p.Transformation,
            p.Outcome,
            p.DurationLabel,
            p.PropertyType,
            services.Select(ps => ps.RenovationService!.Slug).ToList(),
            services.Select(ps => ps.RenovationService!.Name).ToList(),
            p.Highlights,
            images,
            p.MetaTitle,
            p.MetaDescription);
    }
}
