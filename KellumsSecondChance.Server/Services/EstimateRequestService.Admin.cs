using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KellumsSecondChance.Server.Services;

/// <summary>Who performed an admin action. Never leaves the admin API.</summary>
public sealed record AdminActor(string? UserId, string? DisplayName);

/// <summary>How the lead list should be ordered.</summary>
public enum EstimateRequestSort
{
    NewestFirst = 0,
    OldestFirst = 1,
    Customer = 2,
    Status = 3,
}

public partial interface IEstimateRequestAdminService
{
    Task<PagedResultDto<AdminEstimateRequestDto>> SearchAsync(
        EstimateRequestStatus? status,
        string? projectType,
        DateOnly? from,
        DateOnly? to,
        string? search,
        EstimateRequestSort sort,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<AdminEstimateRequestDetailDto?> GetDetailAsync(int id, CancellationToken ct = default);

    Task<WriteResult<AdminEstimateRequestDetailDto>> ChangeStatusAsync(
        int id,
        EstimateRequestStatus status,
        string? rowVersion,
        AdminActor actor,
        CancellationToken ct = default);

    Task<WriteResult<EstimateRequestNoteDto>> AddNoteAsync(
        int id,
        string note,
        AdminActor actor,
        CancellationToken ct = default);

    Task<WriteResult<bool>> DeleteNoteAsync(int requestId, int noteId, CancellationToken ct = default);

    /// <summary>Distinct project-type slugs present on real leads, for the filter.</summary>
    Task<IReadOnlyList<string>> GetProjectTypeFacetsAsync(CancellationToken ct = default);
}

public partial class EstimateRequestService : IEstimateRequestAdminService
{
    /* ==================================================================== */
    /*  Search                                                              */
    /* ==================================================================== */

    public async Task<PagedResultDto<AdminEstimateRequestDto>> SearchAsync(
        EstimateRequestStatus? status,
        string? projectType,
        DateOnly? from,
        DateOnly? to,
        string? search,
        EstimateRequestSort sort,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var safePage = Math.Max(page, 1);
        var safeSize = Math.Clamp(pageSize, 1, 100);

        var query = db.EstimateRequests.AsNoTracking();

        if (status.HasValue) query = query.Where(r => r.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(projectType))
        {
            var slug = projectType.Trim();
            query = query.Where(r => r.ProjectTypeSlugs.Contains(slug));
        }

        if (from.HasValue)
        {
            var fromUtc = from.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(r => r.CreatedAtUtc >= fromUtc);
        }

        if (to.HasValue)
        {
            // Inclusive of the whole end day.
            var toUtc = to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(r => r.CreatedAtUtc < toUtc);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(r =>
                EF.Functions.Like(r.FirstName, $"%{term}%")
                || EF.Functions.Like(r.LastName, $"%{term}%")
                || EF.Functions.Like(r.Email, $"%{term}%")
                || EF.Functions.Like(r.Reference, $"%{term}%")
                || (r.Phone != null && EF.Functions.Like(r.Phone, $"%{term}%"))
                || EF.Functions.Like(r.Description, $"%{term}%")
                || EF.Functions.Like(r.PostalCode, $"%{term}%")
                || (r.City != null && EF.Functions.Like(r.City, $"%{term}%"))
                || (r.AddressLine != null && EF.Functions.Like(r.AddressLine, $"%{term}%")));
        }

        var total = await query.CountAsync(ct);

        query = sort switch
        {
            EstimateRequestSort.OldestFirst => query.OrderBy(r => r.CreatedAtUtc),
            EstimateRequestSort.Customer => query
                .OrderBy(r => r.LastName).ThenBy(r => r.FirstName),
            // Status order follows the pipeline, then newest within each stage.
            EstimateRequestSort.Status => query
                .OrderBy(r => r.Status).ThenByDescending(r => r.CreatedAtUtc),
            _ => query.OrderByDescending(r => r.CreatedAtUtc),
        };

        var items = await query
            .Skip((safePage - 1) * safeSize)
            .Take(safeSize)
            .Select(r => ToAdminDtoExpression(r))
            .ToListAsync(ct);

        return new PagedResultDto<AdminEstimateRequestDto>(
            items,
            safePage,
            safeSize,
            total,
            total == 0 ? 1 : (int)Math.Ceiling(total / (double)safeSize));
    }

    public async Task<IReadOnlyList<string>> GetProjectTypeFacetsAsync(CancellationToken ct = default)
    {
        // Primitive collections cannot be flattened in SQL, so the distinct set
        // is computed after materialising just this column.
        var lists = await db.EstimateRequests
            .AsNoTracking()
            .Select(r => r.ProjectTypeSlugs)
            .ToListAsync(ct);

        return lists
            .SelectMany(l => l)
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(s => s, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    /* ==================================================================== */
    /*  Detail                                                              */
    /* ==================================================================== */

    public async Task<AdminEstimateRequestDetailDto?> GetDetailAsync(int id, CancellationToken ct = default)
    {
        var request = await db.EstimateRequests
            .AsNoTracking()
            .Include(r => r.Notes)
            .Include(r => r.StatusHistory)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        return request is null ? null : ToDetailDto(request);
    }

    /* ==================================================================== */
    /*  Status                                                              */
    /* ==================================================================== */

    public async Task<WriteResult<AdminEstimateRequestDetailDto>> ChangeStatusAsync(
        int id,
        EstimateRequestStatus status,
        string? rowVersion,
        AdminActor actor,
        CancellationToken ct = default)
    {
        var request = await db.EstimateRequests
            .Include(r => r.Notes)
            .Include(r => r.StatusHistory)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (request is null)
        {
            return WriteResult<AdminEstimateRequestDetailDto>.NotFound("That request no longer exists.");
        }

        if (!string.IsNullOrWhiteSpace(rowVersion))
        {
            try
            {
                db.Entry(request).Property(nameof(EstimateRequest.RowVersion)).OriginalValue =
                    Convert.FromBase64String(rowVersion);
            }
            catch (FormatException)
            {
                return WriteResult<AdminEstimateRequestDetailDto>.Conflict(
                    "That change could not be verified as current. Reload and try again.");
            }
        }

        var previous = request.Status;

        // Re-selecting the current status is a no-op, not a history entry.
        if (previous == status) return WriteResult<AdminEstimateRequestDetailDto>.Success(ToDetailDto(request));

        request.Status = status;

        /*
         * History starts from the first change made after this shipped.
         *
         * Nothing is back-filled: manufacturing a trail the business never
         * recorded would make the audit log a work of fiction.
         */
        var entry = new EstimateRequestStatusHistory
        {
            EstimateRequestId = request.Id,
            PreviousStatus = previous,
            NewStatus = status,
            ChangedAtUtc = DateTime.UtcNow,
            ChangedByUserId = actor.UserId,
            ChangedByDisplayName = actor.DisplayName,
        };
        request.StatusHistory.Add(entry);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return WriteResult<AdminEstimateRequestDetailDto>.Conflict(
                "Somebody else changed this request while you had it open. Reload to see where it is now.");
        }

        logger.LogInformation(
            "Estimate request {Reference} moved from {Previous} to {Status}.",
            request.Reference, previous, status);

        return WriteResult<AdminEstimateRequestDetailDto>.Success(ToDetailDto(request));
    }

    /* ==================================================================== */
    /*  Notes                                                               */
    /* ==================================================================== */

    public async Task<WriteResult<EstimateRequestNoteDto>> AddNoteAsync(
        int id,
        string note,
        AdminActor actor,
        CancellationToken ct = default)
    {
        var exists = await db.EstimateRequests.AnyAsync(r => r.Id == id, ct);
        if (!exists) return WriteResult<EstimateRequestNoteDto>.NotFound("That request no longer exists.");

        var entity = new EstimateRequestNote
        {
            EstimateRequestId = id,
            Note = note.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = actor.UserId,
            CreatedByDisplayName = actor.DisplayName,
        };

        db.EstimateRequestNotes.Add(entity);
        await db.SaveChangesAsync(ct);

        return WriteResult<EstimateRequestNoteDto>.Success(
            new EstimateRequestNoteDto(
                entity.Id, entity.Note, entity.CreatedAtUtc, entity.CreatedByDisplayName));
    }

    public async Task<WriteResult<bool>> DeleteNoteAsync(
        int requestId,
        int noteId,
        CancellationToken ct = default)
    {
        // Scoped by both ids so a note id from another lead cannot be removed.
        var note = await db.EstimateRequestNotes
            .FirstOrDefaultAsync(n => n.Id == noteId && n.EstimateRequestId == requestId, ct);

        if (note is null) return WriteResult<bool>.NotFound("That note no longer exists.");

        db.EstimateRequestNotes.Remove(note);
        await db.SaveChangesAsync(ct);
        return WriteResult<bool>.Success(true);
    }

    /* ==================================================================== */
    /*  Mapping                                                             */
    /* ==================================================================== */

    private static AdminEstimateRequestDetailDto ToDetailDto(EstimateRequest r) => new(
        ToAdminDto(r),
        r.Notes
            .OrderByDescending(n => n.CreatedAtUtc)
            .Select(n => new EstimateRequestNoteDto(n.Id, n.Note, n.CreatedAtUtc, n.CreatedByDisplayName))
            .ToList(),
        r.StatusHistory
            .OrderByDescending(h => h.ChangedAtUtc)
            .Select(h => new EstimateRequestStatusHistoryDto(
                h.Id, h.PreviousStatus, h.NewStatus, h.ChangedAtUtc, h.ChangedByDisplayName))
            .ToList(),
        r.RowVersion is null ? null : Convert.ToBase64String(r.RowVersion));

    private static AdminEstimateRequestDto ToAdminDto(EstimateRequest r) => new(
        r.Id, r.Reference, r.FirstName, r.LastName, r.Email, r.Phone,
        r.ProjectTypeSlugs, r.PropertyType, r.AddressLine, r.City, r.PostalCode,
        r.Timeline, r.BudgetRange, r.Description, r.PreferredContactMethod,
        r.ReferralSource, r.Status, r.InternalNotes, r.CreatedAtUtc, r.UpdatedAtUtc);

    /// <summary>Same shape as ToAdminDto, in a form EF can translate to SQL.</summary>
    private static AdminEstimateRequestDto ToAdminDtoExpression(EstimateRequest r) => new(
        r.Id, r.Reference, r.FirstName, r.LastName, r.Email, r.Phone,
        r.ProjectTypeSlugs, r.PropertyType, r.AddressLine, r.City, r.PostalCode,
        r.Timeline, r.BudgetRange, r.Description, r.PreferredContactMethod,
        r.ReferralSource, r.Status, r.InternalNotes, r.CreatedAtUtc, r.UpdatedAtUtc);
}
