using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KellumsSecondChance.Server.Services;

public partial class AdminContentService
{
    /* ==================================================================== */
    /*  Services                                                            */
    /* ==================================================================== */

    public async Task<IReadOnlyList<AdminServiceDto>> ListServicesAsync(CancellationToken ct = default)
    {
        var services = await db.RenovationServices
            .AsNoTracking()
            .OrderBy(s => s.DisplayOrder)
            .ThenBy(s => s.Name)
            .Select(s => new
            {
                Entity = s,
                // Drives the "used by N projects" warning before deactivation.
                LinkedProjects = s.ProjectServices.Count,
            })
            .ToListAsync(ct);

        return services.Select(x => ToServiceDto(x.Entity, x.LinkedProjects)).ToList();
    }

    public async Task<WriteResult<AdminServiceDto>> CreateServiceAsync(
        ServiceWriteDto dto,
        CancellationToken ct = default)
    {
        var slug = string.IsNullOrWhiteSpace(dto.Slug) ? Slugify(dto.Name) : dto.Slug.Trim();
        if (slug.Length == 0) return WriteResult<AdminServiceDto>.Invalid(nameof(dto.Slug), SlugRules.Message);

        if (await db.RenovationServices.AnyAsync(s => s.Slug == slug, ct))
        {
            return WriteResult<AdminServiceDto>.Invalid(
                nameof(dto.Slug),
                $"The address \"{slug}\" is already used by another service.");
        }

        var service = new RenovationService
        {
            Slug = slug,
            Name = dto.Name.Trim(),
            Tagline = dto.Tagline.Trim(),
            Summary = dto.Summary.Trim(),
            Icon = dto.Icon.Trim(),
            Headline = dto.Headline.Trim(),
            Introduction = dto.Introduction.Trim(),
            Includes = CleanListPublic(dto.Includes),
            BestFor = CleanListPublic(dto.BestFor),
            Considerations = CleanListPublic(dto.Considerations),
            IsFeatured = dto.IsFeatured,
            IsActive = dto.IsActive,
            DisplayOrder = dto.DisplayOrder,
            MetaTitle = BlankPublic(dto.MetaTitle),
            MetaDescription = BlankPublic(dto.MetaDescription),
        };

        db.RenovationServices.Add(service);
        await db.SaveChangesAsync(ct);
        contentVersion.Bump();

        return WriteResult<AdminServiceDto>.Success(ToServiceDto(service, 0));
    }

    public async Task<WriteResult<AdminServiceDto>> UpdateServiceAsync(
        int id,
        ServiceWriteDto dto,
        CancellationToken ct = default)
    {
        var service = await db.RenovationServices.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (service is null) return WriteResult<AdminServiceDto>.NotFound("That service no longer exists.");

        if (!TryApplyConcurrencyToken(service, dto.RowVersion, out var serviceConflict))
        {
            return WriteResult<AdminServiceDto>.Conflict(serviceConflict!);
        }

        if (!string.IsNullOrWhiteSpace(dto.Slug))
        {
            var requested = dto.Slug.Trim();
            if (!string.Equals(requested, service.Slug, StringComparison.Ordinal))
            {
                if (await db.RenovationServices.AnyAsync(s => s.Slug == requested && s.Id != id, ct))
                {
                    return WriteResult<AdminServiceDto>.Invalid(
                        nameof(dto.Slug),
                        $"The address \"{requested}\" is already used by another service.");
                }
                service.Slug = requested;
            }
        }

        service.Name = dto.Name.Trim();
        service.Tagline = dto.Tagline.Trim();
        service.Summary = dto.Summary.Trim();
        service.Icon = dto.Icon.Trim();
        service.Headline = dto.Headline.Trim();
        service.Introduction = dto.Introduction.Trim();
        service.Includes = CleanListPublic(dto.Includes);
        service.BestFor = CleanListPublic(dto.BestFor);
        service.Considerations = CleanListPublic(dto.Considerations);
        service.IsFeatured = dto.IsFeatured;
        service.IsActive = dto.IsActive;
        service.DisplayOrder = dto.DisplayOrder;
        service.MetaTitle = BlankPublic(dto.MetaTitle);
        service.MetaDescription = BlankPublic(dto.MetaDescription);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return WriteResult<AdminServiceDto>.Conflict(
                "Somebody else saved this service while you were editing it. Reload to see their changes.");
        }

        contentVersion.Bump();

        var linked = await db.ProjectServices.CountAsync(ps => ps.RenovationServiceId == id, ct);
        return WriteResult<AdminServiceDto>.Success(ToServiceDto(service, linked));
    }

    /// <summary>
    /// Deletes a service, but only when nothing depends on it.
    ///
    /// The database enforces this too (DeleteBehavior.Restrict on the join), but
    /// a foreign-key exception is not an explanation. A service that has been
    /// used on real work should be switched off, not erased — deleting it would
    /// rewrite the record of what was actually done.
    /// </summary>
    public async Task<WriteResult<bool>> DeleteServiceAsync(int id, CancellationToken ct = default)
    {
        var service = await db.RenovationServices.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (service is null) return WriteResult<bool>.NotFound("That service no longer exists.");

        var linked = await db.ProjectServices.CountAsync(ps => ps.RenovationServiceId == id, ct);
        if (linked > 0)
        {
            return WriteResult<bool>.Conflict(
                $"{service.Name} is recorded on {linked} project{(linked == 1 ? "" : "s")}, so it cannot be deleted. "
                + "Switch it off instead — it will disappear from the website and stay on those project records.");
        }

        db.RenovationServices.Remove(service);
        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<bool>.Success(true);
    }

    private static AdminServiceDto ToServiceDto(RenovationService s, int linkedProjectCount) => new(
        s.Id,
        s.Slug,
        s.Name,
        s.Tagline,
        s.Summary,
        s.Icon,
        s.Headline,
        s.Introduction,
        s.Includes,
        s.BestFor,
        s.Considerations,
        s.ImagePath is null
            ? null
            : new ImageDto(s.ImagePath, s.ImageWidth ?? 0, s.ImageHeight ?? 0, s.ImageAlt ?? string.Empty),
        s.IsFeatured,
        s.IsActive,
        s.DisplayOrder,
        s.MetaTitle,
        s.MetaDescription,
        linkedProjectCount,
        s.UpdatedAtUtc,
        // The real token. Returning null here is what previously made the
        // concurrency field on this DTO decorative.
        Encode(s.RowVersion));

    /* ==================================================================== */
    /*  Testimonials                                                        */
    /* ==================================================================== */

    public async Task<IReadOnlyList<AdminTestimonialDto>> ListTestimonialsAsync(CancellationToken ct = default)
    {
        return await db.CustomerTestimonials
            .AsNoTracking()
            .OrderBy(t => t.DisplayOrder)
            .ThenByDescending(t => t.ReviewedOn)
            .Select(t => new AdminTestimonialDto(
                t.Id,
                t.FirstName,
                t.LastInitial,
                t.Location,
                t.Rating,
                t.Quote,
                t.ProjectCategory,
                t.ReviewedOn,
                t.IsFeatured,
                t.IsActive,
                t.IsSampleContent,
                t.DisplayOrder,
                t.Source.ToString(),
                t.UpdatedAtUtc))
            .ToListAsync(ct);
    }

    public async Task<WriteResult<AdminTestimonialDto>> CreateTestimonialAsync(
        TestimonialWriteDto dto,
        CancellationToken ct = default)
    {
        var testimonial = new CustomerTestimonial
        {
            FirstName = dto.FirstName.Trim(),
            LastInitial = BlankPublic(dto.LastInitial),
            Location = BlankPublic(dto.Location),
            Rating = dto.Rating,
            Quote = dto.Quote.Trim(),
            ProjectCategory = BlankPublic(dto.ProjectCategory),
            ReviewedOn = dto.ReviewedOn,
            IsFeatured = dto.IsFeatured,
            IsActive = dto.IsActive,
            DisplayOrder = dto.DisplayOrder,
            Source = dto.Source,
            // A review entered by staff is a real customer statement. The demo
            // flag is only ever set by the seeder and is never settable here.
            IsSampleContent = false,
        };

        db.CustomerTestimonials.Add(testimonial);
        await db.SaveChangesAsync(ct);
        contentVersion.Bump();

        return WriteResult<AdminTestimonialDto>.Success(ToTestimonialDto(testimonial));
    }

    public async Task<WriteResult<AdminTestimonialDto>> UpdateTestimonialAsync(
        int id,
        TestimonialWriteDto dto,
        CancellationToken ct = default)
    {
        var testimonial = await db.CustomerTestimonials.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (testimonial is null) return WriteResult<AdminTestimonialDto>.NotFound("That review no longer exists.");

        testimonial.FirstName = dto.FirstName.Trim();
        testimonial.LastInitial = BlankPublic(dto.LastInitial);
        testimonial.Location = BlankPublic(dto.Location);
        testimonial.Rating = dto.Rating;
        testimonial.Quote = dto.Quote.Trim();
        testimonial.ProjectCategory = BlankPublic(dto.ProjectCategory);
        testimonial.ReviewedOn = dto.ReviewedOn;
        testimonial.IsFeatured = dto.IsFeatured;
        testimonial.IsActive = dto.IsActive;
        testimonial.DisplayOrder = dto.DisplayOrder;
        testimonial.Source = dto.Source;
        // IsSampleContent is deliberately NOT assignable: an example must not be
        // convertible into an apparently genuine review by an edit.

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<AdminTestimonialDto>.Success(ToTestimonialDto(testimonial));
    }

    public async Task<WriteResult<bool>> DeleteTestimonialAsync(int id, CancellationToken ct = default)
    {
        var testimonial = await db.CustomerTestimonials.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (testimonial is null) return WriteResult<bool>.NotFound("That review no longer exists.");

        db.CustomerTestimonials.Remove(testimonial);
        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<bool>.Success(true);
    }

    private static AdminTestimonialDto ToTestimonialDto(CustomerTestimonial t) => new(
        t.Id,
        t.FirstName,
        t.LastInitial,
        t.Location,
        t.Rating,
        t.Quote,
        t.ProjectCategory,
        t.ReviewedOn,
        t.IsFeatured,
        t.IsActive,
        t.IsSampleContent,
        t.DisplayOrder,
        t.Source.ToString(),
        t.UpdatedAtUtc);

    /* ==================================================================== */
    /*  FAQs                                                                */
    /* ==================================================================== */

    public async Task<IReadOnlyList<AdminFaqDto>> ListFaqsAsync(CancellationToken ct = default)
    {
        /*
         * Materialised first, then mapped in memory.
         *
         * ToFaqDto base64-encodes the concurrency token, which SQL cannot do —
         * projecting inside the query would force a literal null into the
         * token, and the console would send null back on every save, silently
         * disabling the very guard §38 asks for.
         */
        var faqs = await db.FaqItems
            .AsNoTracking()
            .OrderBy(f => f.CategorySlug)
            .ThenBy(f => f.DisplayOrder)
            .ToListAsync(ct);

        return faqs.Select(ToFaqDto).ToList();
    }

    public async Task<WriteResult<AdminFaqDto>> CreateFaqAsync(FaqWriteDto dto, CancellationToken ct = default)
    {
        var guard = GuardFaqAnswer(dto);
        if (guard is not null) return guard;

        var faq = new FaqItem
        {
            Question = dto.Question.Trim(),
            Answer = dto.Answer.Trim(),
            Category = dto.Category.Trim(),
            CategorySlug = dto.CategorySlug.Trim(),
            NeedsReview = dto.NeedsReview,
            ReviewNote = BlankPublic(dto.ReviewNote),
            IsActive = dto.IsActive,
            DisplayOrder = dto.DisplayOrder,
        };

        db.FaqItems.Add(faq);
        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<AdminFaqDto>.Success(ToFaqDto(faq));
    }

    public async Task<WriteResult<AdminFaqDto>> UpdateFaqAsync(
        int id,
        FaqWriteDto dto,
        CancellationToken ct = default)
    {
        var faq = await db.FaqItems.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (faq is null) return WriteResult<AdminFaqDto>.NotFound("That question no longer exists.");

        if (!TryApplyConcurrencyToken(faq, dto.RowVersion, out var faqConflict))
        {
            return WriteResult<AdminFaqDto>.Conflict(faqConflict!);
        }

        var guard = GuardFaqAnswer(dto);
        if (guard is not null) return guard;

        faq.Question = dto.Question.Trim();
        faq.Answer = dto.Answer.Trim();
        faq.Category = dto.Category.Trim();
        faq.CategorySlug = dto.CategorySlug.Trim();
        faq.NeedsReview = dto.NeedsReview;
        faq.ReviewNote = BlankPublic(dto.ReviewNote);
        faq.IsActive = dto.IsActive;
        faq.DisplayOrder = dto.DisplayOrder;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return WriteResult<AdminFaqDto>.Conflict(
                "Somebody else answered this question while you were editing it. Reload to see their answer.");
        }

        contentVersion.Bump();
        return WriteResult<AdminFaqDto>.Success(ToFaqDto(faq));
    }

    public async Task<WriteResult<bool>> DeleteFaqAsync(int id, CancellationToken ct = default)
    {
        var faq = await db.FaqItems.FirstOrDefaultAsync(f => f.Id == id, ct);
        if (faq is null) return WriteResult<bool>.NotFound("That question no longer exists.");

        db.FaqItems.Remove(faq);
        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<bool>.Success(true);
    }

    /// <summary>
    /// A question cannot be published without a real answer.
    ///
    /// This is the server-side half of the review gate. Clearing NeedsReview is
    /// exactly the moment a placeholder would otherwise reach the public FAQ and
    /// its structured data, so an empty answer is refused here rather than only
    /// being discouraged in the console.
    /// </summary>
    private static WriteResult<AdminFaqDto>? GuardFaqAnswer(FaqWriteDto dto)
    {
        if (!dto.NeedsReview && string.IsNullOrWhiteSpace(dto.Answer))
        {
            return WriteResult<AdminFaqDto>.Invalid(
                nameof(dto.Answer),
                "Write the answer before publishing this question. "
                + "Leave it marked as awaiting a business decision until you have one.");
        }

        return null;
    }

    private static AdminFaqDto ToFaqDto(FaqItem f) => new(
        f.Id,
        f.Question,
        f.Answer,
        f.Category,
        f.CategorySlug,
        f.NeedsReview,
        f.ReviewNote,
        f.IsActive,
        f.DisplayOrder,
        f.UpdatedAtUtc,
        Encode(f.RowVersion));

    /* ==================================================================== */
    /*  Service areas                                                       */
    /* ==================================================================== */

    public async Task<IReadOnlyList<AdminServiceAreaDto>> ListServiceAreasAsync(CancellationToken ct = default)
    {
        return await db.ServiceAreas
            .AsNoTracking()
            .OrderBy(a => a.DisplayOrder)
            .Select(a => new AdminServiceAreaDto(
                a.Id,
                a.Name,
                a.Kind.ToString(),
                a.StateOrRegion,
                a.PostalCodes,
                a.IsPrimary,
                a.Note,
                a.IsActive,
                a.IsSampleContent,
                a.DisplayOrder,
                a.UpdatedAtUtc))
            .ToListAsync(ct);
    }

    public async Task<WriteResult<AdminServiceAreaDto>> CreateServiceAreaAsync(
        ServiceAreaWriteDto dto,
        CancellationToken ct = default)
    {
        var area = new ServiceArea
        {
            Name = dto.Name.Trim(),
            Kind = dto.Kind,
            StateOrRegion = BlankPublic(dto.StateOrRegion),
            PostalCodes = CleanListPublic(dto.PostalCodes),
            IsPrimary = dto.IsPrimary,
            Note = BlankPublic(dto.Note),
            IsActive = dto.IsActive,
            DisplayOrder = dto.DisplayOrder,
            // Real coverage entered by staff, never a placeholder.
            IsSampleContent = false,
        };

        db.ServiceAreas.Add(area);
        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<AdminServiceAreaDto>.Success(ToAreaDto(area));
    }

    public async Task<WriteResult<AdminServiceAreaDto>> UpdateServiceAreaAsync(
        int id,
        ServiceAreaWriteDto dto,
        CancellationToken ct = default)
    {
        var area = await db.ServiceAreas.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (area is null) return WriteResult<AdminServiceAreaDto>.NotFound("That area no longer exists.");

        area.Name = dto.Name.Trim();
        area.Kind = dto.Kind;
        area.StateOrRegion = BlankPublic(dto.StateOrRegion);
        area.PostalCodes = CleanListPublic(dto.PostalCodes);
        area.IsPrimary = dto.IsPrimary;
        area.Note = BlankPublic(dto.Note);
        area.IsActive = dto.IsActive;
        area.DisplayOrder = dto.DisplayOrder;

        /*
         * Editing a seeded placeholder turns it into real coverage.
         *
         * Otherwise the business would fill in its actual city and the public
         * page would still caption it "coverage being confirmed".
         */
        if (area.IsSampleContent) area.IsSampleContent = false;

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<AdminServiceAreaDto>.Success(ToAreaDto(area));
    }

    public async Task<WriteResult<bool>> DeleteServiceAreaAsync(int id, CancellationToken ct = default)
    {
        var area = await db.ServiceAreas.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (area is null) return WriteResult<bool>.NotFound("That area no longer exists.");

        db.ServiceAreas.Remove(area);
        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<bool>.Success(true);
    }

    private static AdminServiceAreaDto ToAreaDto(ServiceArea a) => new(
        a.Id,
        a.Name,
        a.Kind.ToString(),
        a.StateOrRegion,
        a.PostalCodes,
        a.IsPrimary,
        a.Note,
        a.IsActive,
        a.IsSampleContent,
        a.DisplayOrder,
        a.UpdatedAtUtc);

    /* -------------------------------------------------------- shared ---- */

    private static string? BlankPublic(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static List<string> CleanListPublic(IEnumerable<string> values) =>
        values.Select(v => v.Trim()).Where(v => v.Length > 0).ToList();
}
