using System.Text;
using System.Text.RegularExpressions;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure.Media;
using Microsoft.EntityFrameworkCore;

namespace KellumsSecondChance.Server.Services;

/// <summary>Why a write could not be applied. The controller maps these to status codes.</summary>
public enum WriteFailure
{
    NotFound,
    Conflict,
    Validation,
}

public sealed record WriteResult<T>(T? Value, WriteFailure? Failure, string? Message, string? Field)
{
    public bool Ok => Failure is null;

    public static WriteResult<T> Success(T value) => new(value, null, null, null);

    public static WriteResult<T> NotFound(string message) =>
        new(default, WriteFailure.NotFound, message, null);

    public static WriteResult<T> Conflict(string message) =>
        new(default, WriteFailure.Conflict, message, null);

    public static WriteResult<T> Invalid(string field, string message) =>
        new(default, WriteFailure.Validation, message, field);
}

public interface IAdminContentService
{
    /* projects */
    Task<IReadOnlyList<AdminProjectListItemDto>> ListProjectsAsync(CancellationToken ct = default);
    Task<AdminProjectDto?> GetProjectAsync(int id, CancellationToken ct = default);
    Task<WriteResult<AdminProjectDto>> CreateProjectAsync(ProjectWriteDto dto, CancellationToken ct = default);
    Task<WriteResult<AdminProjectDto>> UpdateProjectAsync(int id, ProjectWriteDto dto, CancellationToken ct = default);
    Task<WriteResult<bool>> DeleteProjectAsync(int id, CancellationToken ct = default);
    Task<WriteResult<bool>> ReorderProjectsAsync(
        IReadOnlyList<int> orderedIds,
        CancellationToken ct = default);

    /* services */
    Task<IReadOnlyList<AdminServiceDto>> ListServicesAsync(CancellationToken ct = default);
    Task<WriteResult<AdminServiceDto>> CreateServiceAsync(ServiceWriteDto dto, CancellationToken ct = default);
    Task<WriteResult<AdminServiceDto>> UpdateServiceAsync(int id, ServiceWriteDto dto, CancellationToken ct = default);
    Task<WriteResult<bool>> DeleteServiceAsync(int id, CancellationToken ct = default);

    /* testimonials */
    Task<IReadOnlyList<AdminTestimonialDto>> ListTestimonialsAsync(CancellationToken ct = default);
    Task<WriteResult<AdminTestimonialDto>> CreateTestimonialAsync(TestimonialWriteDto dto, CancellationToken ct = default);
    Task<WriteResult<AdminTestimonialDto>> UpdateTestimonialAsync(int id, TestimonialWriteDto dto, CancellationToken ct = default);
    Task<WriteResult<bool>> DeleteTestimonialAsync(int id, CancellationToken ct = default);

    /* faqs */
    Task<IReadOnlyList<AdminFaqDto>> ListFaqsAsync(CancellationToken ct = default);
    Task<WriteResult<AdminFaqDto>> CreateFaqAsync(FaqWriteDto dto, CancellationToken ct = default);
    Task<WriteResult<AdminFaqDto>> UpdateFaqAsync(int id, FaqWriteDto dto, CancellationToken ct = default);
    Task<WriteResult<bool>> DeleteFaqAsync(int id, CancellationToken ct = default);

    /* service areas */
    Task<IReadOnlyList<AdminServiceAreaDto>> ListServiceAreasAsync(CancellationToken ct = default);
    Task<WriteResult<AdminServiceAreaDto>> CreateServiceAreaAsync(ServiceAreaWriteDto dto, CancellationToken ct = default);
    Task<WriteResult<AdminServiceAreaDto>> UpdateServiceAreaAsync(int id, ServiceAreaWriteDto dto, CancellationToken ct = default);
    Task<WriteResult<bool>> DeleteServiceAreaAsync(int id, CancellationToken ct = default);
}

public partial class AdminContentService(
    KellumsDbContext db,
    IMediaStorage storage,
    IContentVersion contentVersion,
    ILogger<AdminContentService> logger) : IAdminContentService
{
    /* ==================================================================== */
    /*  Projects                                                            */
    /* ==================================================================== */

    public async Task<IReadOnlyList<AdminProjectListItemDto>> ListProjectsAsync(CancellationToken ct = default)
    {
        // Drafts included: this is the console, not the public gallery.
        return await db.RenovationProjects
            .AsNoTracking()
            .OrderBy(p => p.DisplayOrder)
            .ThenByDescending(p => p.CompletedOn)
            .Select(p => new AdminProjectListItemDto(
                p.Id,
                p.Slug,
                p.Title,
                p.CategoryName,
                p.Location,
                p.IsFeatured,
                p.IsActive,
                p.IsSampleContent,
                p.DisplayOrder,
                p.CompletedOn,
                p.Images.Count,
                p.Images.Any(i => i.Kind == ProjectImageKind.Cover),
                p.Images.Any(i => i.Kind == ProjectImageKind.Before)
                    && p.Images.Any(i => i.Kind == ProjectImageKind.After),
                p.UpdatedAtUtc))
            .ToListAsync(ct);
    }

    public async Task<AdminProjectDto?> GetProjectAsync(int id, CancellationToken ct = default)
    {
        var project = await db.RenovationProjects
            .AsNoTracking()
            .Include(p => p.Images)
            .Include(p => p.ProjectServices)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        return project is null ? null : ToAdminDto(project);
    }

    public async Task<WriteResult<AdminProjectDto>> CreateProjectAsync(
        ProjectWriteDto dto,
        CancellationToken ct = default)
    {
        var slug = string.IsNullOrWhiteSpace(dto.Slug) ? Slugify(dto.Title) : dto.Slug.Trim();
        if (slug.Length == 0) return WriteResult<AdminProjectDto>.Invalid(nameof(dto.Slug), SlugRules.Message);

        if (await db.RenovationProjects.AnyAsync(p => p.Slug == slug, ct))
        {
            return WriteResult<AdminProjectDto>.Invalid(
                nameof(dto.Slug),
                $"The address \"{slug}\" is already used by another project.");
        }

        var serviceCheck = await ResolveAssignableServicesAsync(dto.ServiceIds, currentServiceIds: [], ct);
        if (serviceCheck.Failure is not null)
        {
            return WriteResult<AdminProjectDto>.Invalid(nameof(dto.ServiceIds), serviceCheck.Message!);
        }

        var project = new RenovationProject
        {
            Slug = slug,
            Title = dto.Title.Trim(),
            CategoryName = dto.CategoryName.Trim(),
            CategorySlug = dto.CategorySlug.Trim(),
            Location = Blank(dto.Location),
            Summary = dto.Summary.Trim(),
            Challenge = dto.Challenge.Trim(),
            Vision = dto.Vision.Trim(),
            Transformation = dto.Transformation.Trim(),
            Outcome = Blank(dto.Outcome),
            CompletedOn = dto.CompletedOn,
            DurationLabel = Blank(dto.DurationLabel),
            PropertyType = Blank(dto.PropertyType),
            Highlights = CleanList(dto.Highlights),
            IsFeatured = dto.IsFeatured,
            IsActive = dto.IsActive,
            /*
             * A new project joins the END of the gallery unless a position was
             * asked for. Defaulting every project to 0 made the order depend on
             * insertion id, which is not something anybody can see or control.
             */
            DisplayOrder = dto.DisplayOrder > 0
                ? dto.DisplayOrder
                : await NextProjectPositionAsync(ct),
            MetaTitle = Blank(dto.MetaTitle),
            MetaDescription = Blank(dto.MetaDescription),
            // A project created in the console is real work, never demo content.
            IsSampleContent = false,
        };

        ApplyServices(project, serviceCheck.Value!);

        db.RenovationProjects.Add(project);
        await db.SaveChangesAsync(ct);
        contentVersion.Bump();

        logger.LogInformation("Project {ProjectId} ({Slug}) created.", project.Id, project.Slug);
        return WriteResult<AdminProjectDto>.Success(ToAdminDto(project));
    }

    public async Task<WriteResult<AdminProjectDto>> UpdateProjectAsync(
        int id,
        ProjectWriteDto dto,
        CancellationToken ct = default)
    {
        var project = await db.RenovationProjects
            .Include(p => p.Images)
            .Include(p => p.ProjectServices)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        if (project is null) return WriteResult<AdminProjectDto>.NotFound("That project no longer exists.");

        if (!TryApplyConcurrencyToken(project, dto.RowVersion, out var conflict))
        {
            return WriteResult<AdminProjectDto>.Conflict(conflict!);
        }

        /*
         * The slug only moves when explicitly supplied.
         *
         * A published project's URL is an address customers may have shared and
         * search engines have indexed. Re-deriving it from the title on every
         * save would silently break those links, so retitling alone never
         * touches it.
         */
        if (!string.IsNullOrWhiteSpace(dto.Slug))
        {
            var requested = dto.Slug.Trim();
            if (!string.Equals(requested, project.Slug, StringComparison.Ordinal))
            {
                if (await db.RenovationProjects.AnyAsync(p => p.Slug == requested && p.Id != id, ct))
                {
                    return WriteResult<AdminProjectDto>.Invalid(
                        nameof(dto.Slug),
                        $"The address \"{requested}\" is already used by another project.");
                }
                project.Slug = requested;
            }
        }

        var currentIds = project.ProjectServices.Select(ps => ps.RenovationServiceId).ToList();
        var serviceCheck = await ResolveAssignableServicesAsync(dto.ServiceIds, currentIds, ct);
        if (serviceCheck.Failure is not null)
        {
            return WriteResult<AdminProjectDto>.Invalid(nameof(dto.ServiceIds), serviceCheck.Message!);
        }

        project.Title = dto.Title.Trim();
        project.CategoryName = dto.CategoryName.Trim();
        project.CategorySlug = dto.CategorySlug.Trim();
        project.Location = Blank(dto.Location);
        project.Summary = dto.Summary.Trim();
        project.Challenge = dto.Challenge.Trim();
        project.Vision = dto.Vision.Trim();
        project.Transformation = dto.Transformation.Trim();
        project.Outcome = Blank(dto.Outcome);
        project.CompletedOn = dto.CompletedOn;
        project.DurationLabel = Blank(dto.DurationLabel);
        project.PropertyType = Blank(dto.PropertyType);
        project.Highlights = CleanList(dto.Highlights);
        project.IsFeatured = dto.IsFeatured;
        project.IsActive = dto.IsActive;
        project.DisplayOrder = dto.DisplayOrder;
        project.MetaTitle = Blank(dto.MetaTitle);
        project.MetaDescription = Blank(dto.MetaDescription);

        ApplyServices(project, serviceCheck.Value!);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return WriteResult<AdminProjectDto>.Conflict(
                "Somebody else saved this project while you were editing it. Reload to see their changes.");
        }

        contentVersion.Bump();
        return WriteResult<AdminProjectDto>.Success(ToAdminDto(project));
    }

    public async Task<WriteResult<bool>> DeleteProjectAsync(int id, CancellationToken ct = default)
    {
        var project = await db.RenovationProjects
            .Include(p => p.Images)
            .Include(p => p.ProjectServices)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

        if (project is null) return WriteResult<bool>.NotFound("That project no longer exists.");

        // Collect the uploaded files first — after SaveChanges the rows are gone.
        var storageKeys = project.Images
            .Where(i => !string.IsNullOrWhiteSpace(i.StorageKey))
            .Select(i => i.StorageKey!)
            .ToList();

        db.RenovationProjects.Remove(project);
        await db.SaveChangesAsync(ct);
        contentVersion.Bump();

        foreach (var key in storageKeys)
        {
            // Only orphans: a file still referenced elsewhere stays on disk.
            if (!await db.RenovationProjectImages.AnyAsync(i => i.StorageKey == key, ct))
            {
                await storage.DeleteAsync(key, ct);
            }
        }

        logger.LogInformation("Project {ProjectId} deleted with {FileCount} stored files.", id, storageKeys.Count);
        return WriteResult<bool>.Success(true);
    }

    /// <summary>
    /// Sets the order projects appear in on the gallery page.
    ///
    /// Renumbers by position rather than asking anybody to reason about
    /// absolute numbers — typing "3" into a box and hoping is not ordering.
    /// Ids belonging to nothing are skipped, as with the image reorder.
    /// </summary>
    public async Task<WriteResult<bool>> ReorderProjectsAsync(
        IReadOnlyList<int> orderedIds,
        CancellationToken ct = default)
    {
        var projects = await db.RenovationProjects.ToListAsync(ct);
        if (projects.Count == 0) return WriteResult<bool>.NotFound("There are no projects to reorder.");

        var byId = projects.ToDictionary(p => p.Id);

        var position = 0;
        foreach (var id in orderedIds)
        {
            if (!byId.TryGetValue(id, out var project)) continue;
            project.DisplayOrder = position++;
        }

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();
        return WriteResult<bool>.Success(true);
    }

    /* -------------------------------------------------- project helpers -- */

    /// <summary>
    /// Validates a requested service assignment.
    ///
    /// An INACTIVE service may not be newly assigned — that would create a link
    /// the public site cannot follow. One already attached is left alone, so an
    /// old project that references a since-retired service still opens and saves
    /// cleanly in the editor instead of becoming uneditable.
    /// </summary>
    private async Task<int> NextProjectPositionAsync(CancellationToken ct)
    {
        var highest = await db.RenovationProjects
            .Select(p => (int?)p.DisplayOrder)
            .MaxAsync(ct);

        return (highest ?? -1) + 1;
    }

    private async Task<WriteResult<List<int>>> ResolveAssignableServicesAsync(
        List<int> requestedIds,
        List<int> currentServiceIds,
        CancellationToken ct)
    {
        var ids = requestedIds.Distinct().ToList();
        if (ids.Count == 0) return WriteResult<List<int>>.Success([]);

        var found = await db.RenovationServices
            .AsNoTracking()
            .Where(s => ids.Contains(s.Id))
            .Select(s => new { s.Id, s.IsActive, s.Name })
            .ToListAsync(ct);

        var missing = ids.Except(found.Select(f => f.Id)).ToList();
        if (missing.Count > 0)
        {
            return WriteResult<List<int>>.Invalid(
                "ServiceIds",
                "One of the selected services no longer exists. Reload and try again.");
        }

        var newlyInactive = found
            .Where(f => !f.IsActive && !currentServiceIds.Contains(f.Id))
            .Select(f => f.Name)
            .ToList();

        if (newlyInactive.Count > 0)
        {
            return WriteResult<List<int>>.Invalid(
                "ServiceIds",
                $"{string.Join(", ", newlyInactive)} is switched off and cannot be added to a project. "
                + "Turn the service back on first.");
        }

        return WriteResult<List<int>>.Success(ids);
    }

    private static void ApplyServices(RenovationProject project, List<int> serviceIds)
    {
        project.ProjectServices.Clear();
        var order = 0;
        foreach (var serviceId in serviceIds)
        {
            project.ProjectServices.Add(new ProjectService
            {
                RenovationServiceId = serviceId,
                DisplayOrder = order++,
            });
        }
    }

    private AdminProjectDto ToAdminDto(RenovationProject p) => new(
        p.Id,
        p.Slug,
        p.Title,
        p.CategoryName,
        p.CategorySlug,
        p.Location,
        p.Summary,
        p.Challenge,
        p.Vision,
        p.Transformation,
        p.Outcome,
        p.CompletedOn,
        p.DurationLabel,
        p.PropertyType,
        p.Highlights,
        p.ProjectServices.OrderBy(ps => ps.DisplayOrder).Select(ps => ps.RenovationServiceId).ToList(),
        p.IsFeatured,
        p.IsActive,
        p.IsSampleContent,
        p.DisplayOrder,
        p.MetaTitle,
        p.MetaDescription,
        p.Images
            .OrderBy(i => i.Kind)
            .ThenBy(i => i.DisplayOrder)
            .Select(ToImageDto)
            .ToList(),
        p.CreatedAtUtc,
        p.UpdatedAtUtc,
        Encode(p.RowVersion));

    internal static AdminProjectImageDto ToImageDto(RenovationProjectImage i) => new(
        i.Id,
        i.Path,
        i.Width,
        i.Height,
        i.AltText,
        i.Kind.ToString(),
        i.Caption,
        i.DisplayOrder,
        i.PairKey,
        !string.IsNullOrWhiteSpace(i.StorageKey),
        i.FileSizeBytes);

    /* ==================================================================== */
    /*  Shared helpers                                                      */
    /* ==================================================================== */

    [GeneratedRegex(@"[^a-z0-9]+")]
    private static partial Regex NonSlugChars();

    /// <summary>Derives a URL-safe slug. Diacritics are folded, not dropped.</summary>
    public static string Slugify(string input)
    {
        var normalised = input.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var stripped = new string(normalised
            .Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c)
                        != System.Globalization.UnicodeCategory.NonSpacingMark)
            .ToArray());

        var slug = NonSlugChars().Replace(stripped, "-").Trim('-');
        return slug.Length > 110 ? slug[..110].TrimEnd('-') : slug;
    }

    private static string? Blank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static List<string> CleanList(IEnumerable<string> values) =>
        values.Select(v => v.Trim()).Where(v => v.Length > 0).ToList();

    internal static string? Encode(byte[]? rowVersion) =>
        rowVersion is null ? null : Convert.ToBase64String(rowVersion);

    /// <summary>
    /// Applies the caller's concurrency token so EF can detect a stale write.
    ///
    /// A missing token is accepted — the console always round-trips one, and a
    /// script that omits it simply gets last-write-wins rather than a hard error.
    /// A malformed one is a conflict, never a crash.
    /// </summary>
    private bool TryApplyConcurrencyToken<T>(T entity, string? token, out string? message)
        where T : class
    {
        message = null;
        if (string.IsNullOrWhiteSpace(token)) return true;

        try
        {
            var bytes = Convert.FromBase64String(token);
            db.Entry(entity).Property("RowVersion").OriginalValue = bytes;
            return true;
        }
        catch (FormatException)
        {
            message = "That edit could not be verified as current. Reload the page and try again.";
            return false;
        }
    }
}
