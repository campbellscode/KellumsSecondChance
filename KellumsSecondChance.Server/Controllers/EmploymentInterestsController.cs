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

[ApiController, Route("api/employment-interests")]
public class EmploymentInterestsController(KellumsDbContext db, IOptions<AntiSpamOptions> options, IEmploymentInterestNotifier notifier) : ControllerBase
{
    [HttpPost, EnableRateLimiting(RateLimitPolicies.PublicSubmission)]
    public async Task<ActionResult<EmploymentInterestResultDto>> Create(CreateEmploymentInterestDto dto, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(dto.CompanyWebsite) ||
            dto.ElapsedMs is > 0 && dto.ElapsedMs < options.Value.MinimumFillMilliseconds)
            return StatusCode(201, new EmploymentInterestResultDto(now, "Thank you. We have received your note."));

        var hash = HashIp(HttpContext.Connection.RemoteIpAddress?.ToString(), options.Value.IpHashSalt);
        if (hash is not null && options.Value.MaxSubmissionsPerWindow > 0)
        {
            var since = now - options.Value.Window;
            var recent = await db.EmploymentInterests.CountAsync(x => x.SubmitterIpHash == hash && x.CreatedAtUtc >= since, ct);
            if (recent >= options.Value.MaxSubmissionsPerWindow)
                return StatusCode(429, new ProblemDetails { Title = "That is a few submissions in quick succession.", Status = 429 });
        }

        var entity = new EmploymentInterest {
            FirstName = dto.FirstName.Trim(), LastName = dto.LastName.Trim(), Email = dto.Email.Trim(),
            Phone = Clean(dto.Phone), PreferredContactMethod = dto.PreferredContactMethod,
            GeneralWorkExperience = Clean(dto.GeneralWorkExperience), AreasOfExperience = Clean(dto.AreasOfExperience),
            WorkInterest = dto.WorkInterest.Trim(), Availability = Clean(dto.Availability), Message = Clean(dto.Message),
            SubmitterIpHash = hash
        };
        db.EmploymentInterests.Add(entity);
        await db.SaveChangesAsync(ct);
        var origin = Request.Host.HasValue ? $"{Request.Scheme}://{Request.Host}" : null;
        await notifier.NotifyAsync(entity, origin, ct);
        return StatusCode(201, new EmploymentInterestResultDto(now, "Thank you. We have received your note."));
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string? HashIp(string? ip, string salt) => string.IsNullOrWhiteSpace(ip) ? null : Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes($"{salt}|{ip}")));
}
