using System.Security.Cryptography;
using System.Text;
using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using KellumsSecondChance.Server.Services;

namespace KellumsSecondChance.Server.Controllers;

[ApiController, Route("api/booking-requests")]
public class BookingRequestsController(KellumsDbContext db, IOptions<AntiSpamOptions> options, IBookingRequestNotifier notifier) : ControllerBase
{
    [HttpPost, EnableRateLimiting(RateLimitPolicies.PublicSubmission)]
    [RequestSizeLimit(32 * 1024)]
    public async Task<ActionResult<BookingRequestResultDto>> Create(CreateBookingRequestDto dto, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.CompanyWebsite) || dto.ElapsedMs is > 0 && dto.ElapsedMs < options.Value.MinimumFillMilliseconds)
            return StatusCode(201, new BookingRequestResultDto(0, now, "Your booking request is in."));

        var hash = HashIp(HttpContext.Connection.RemoteIpAddress?.ToString(), options.Value.IpHashSalt);
        if (hash is not null && options.Value.MaxSubmissionsPerWindow > 0)
        {
            var since = now - options.Value.Window;
            if (await db.BookingRequests.CountAsync(x => x.SubmitterIpHash == hash && x.CreatedAtUtc >= since, ct) >= options.Value.MaxSubmissionsPerWindow)
                return StatusCode(429, new ProblemDetails { Title = "That is a few submissions in quick succession.", Status = 429 });
        }

        var entity = new BookingRequest {
            FirstName=dto.FirstName.Trim(), LastName=dto.LastName.Trim(), Email=dto.Email.Trim(), Phone=dto.Phone.Trim(),
            PreferredDate=dto.PreferredDate, PreferredTime=dto.PreferredTime, AlternateDate=dto.AlternateDate, AlternateTime=dto.AlternateTime,
            Address=dto.Address.Trim(), City=dto.City.Trim(), State=dto.State.Trim().ToUpperInvariant(), PostalCode=dto.PostalCode.Trim(),
            ProjectDescription=dto.ProjectDescription.Trim(), Notes=Clean(dto.Notes), SubmitterIpHash=hash
        };
        db.BookingRequests.Add(entity);
        await db.SaveChangesAsync(ct);
        var origin = Request.Host.HasValue ? $"{Request.Scheme}://{Request.Host}" : null;
        await notifier.NotifyAsync(entity, origin, ct);
        return StatusCode(201, new BookingRequestResultDto(entity.Id, entity.CreatedAtUtc, "Your booking request is in."));
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string? HashIp(string? ip, string salt) => string.IsNullOrWhiteSpace(ip) ? null : Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes($"{salt}|{ip}")));
}
