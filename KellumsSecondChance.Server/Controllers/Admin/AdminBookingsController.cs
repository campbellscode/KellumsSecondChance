using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace KellumsSecondChance.Server.Controllers.Admin;

[Route("api/admin/bookings")]
public class AdminBookingsController(KellumsDbContext db) : AdminWriteController
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminBookingRequestDto>>> List([FromQuery] BookingRequestStatus? status, CancellationToken ct)
    {
        NoStore();
        var query = db.BookingRequests.AsNoTracking();
        if (status.HasValue) query = query.Where(x => x.Status == status);
        return Ok((await query.OrderByDescending(x => x.CreatedAtUtc).ToListAsync(ct)).Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AdminBookingRequestDto>> Detail(int id, CancellationToken ct)
    {
        NoStore();
        var item = await db.BookingRequests.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);
        return item is null ? NotFound() : Ok(ToDto(item));
    }

    [HttpPut("{id:int}")]
    [ValidateAntiforgeryHeader]
    public async Task<ActionResult<AdminBookingRequestDto>> Update(int id, UpdateBookingRequestDto dto, CancellationToken ct)
    {
        var item = await db.BookingRequests.SingleOrDefaultAsync(x => x.Id == id, ct);
        if (item is null) return NotFound();
        byte[] expected;
        try { expected = Convert.FromBase64String(dto.RowVersion); }
        catch (FormatException) { return ValidationProblem(title: "That version token is not valid."); }
        if (!CanTransition(item.Status, dto.Status))
            return ValidationProblem(title: $"A {item.Status} booking cannot move to {dto.Status}.");
        if (expected.Length > 0) db.Entry(item).Property(x => x.RowVersion).OriginalValue = expected;
        item.Status = dto.Status;
        item.AdminNotes = string.IsNullOrWhiteSpace(dto.AdminNotes) ? null : dto.AdminNotes.Trim();
        var now = DateTime.UtcNow;
        if (dto.Status == BookingRequestStatus.Confirmed) item.ConfirmedAtUtc ??= now;
        if (dto.Status == BookingRequestStatus.Completed) item.CompletedAtUtc ??= now;
        if (dto.Status == BookingRequestStatus.Cancelled) item.CancelledAtUtc ??= now;
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { return Problem(title: "This booking changed while you were editing it.", statusCode: 409); }
        return Ok(ToDto(item));
    }

    private static bool CanTransition(BookingRequestStatus from, BookingRequestStatus to) => from == to || (from, to) switch {
        (BookingRequestStatus.Pending, BookingRequestStatus.Confirmed or BookingRequestStatus.Declined or BookingRequestStatus.Cancelled) => true,
        (BookingRequestStatus.Confirmed, BookingRequestStatus.Completed or BookingRequestStatus.Cancelled) => true,
        _ => false,
    };

    private static AdminBookingRequestDto ToDto(BookingRequest x) => new(x.Id,x.FirstName,x.LastName,x.Email,x.Phone,
        x.PreferredDate,x.PreferredTime,x.AlternateDate,x.AlternateTime,x.Address,x.City,x.State,x.PostalCode,x.ProjectDescription,x.Notes,
        x.Status,x.AdminNotes,x.CreatedAtUtc,x.UpdatedAtUtc,x.ConfirmedAtUtc,x.CompletedAtUtc,x.CancelledAtUtc,Convert.ToBase64String(x.RowVersion ?? []));
}
