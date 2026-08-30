using System.Security.Cryptography;
using System.Text;
using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Services;

/// <summary>Why a submission was rejected, so the controller can pick a status code.</summary>
public enum SubmissionOutcome
{
    Accepted,
    /// <summary>Failed a bot check. Answered with a success shape so bots learn nothing.</summary>
    RejectedAsAutomated,
    /// <summary>Too many submissions from the same source in the window.</summary>
    RateLimited,
}

public record SubmissionResult(SubmissionOutcome Outcome, EstimateRequestResultDto? Result);

public interface IEstimateRequestService
{
    Task<SubmissionResult> SubmitAsync(
        CreateEstimateRequestDto dto,
        string? clientIp,
        string? userAgent,
        CancellationToken ct = default);

    Task<PagedResultDto<AdminEstimateRequestDto>> ListAsync(
        EstimateRequestStatus? status,
        string? search,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<AdminEstimateRequestDto?> UpdateAsync(int id, UpdateEstimateRequestDto dto, CancellationToken ct = default);
}

public class EstimateRequestService(
    KellumsDbContext db,
    IOptions<AntiSpamOptions> antiSpamOptions,
    ILogger<EstimateRequestService> logger) : IEstimateRequestService
{
    private readonly AntiSpamOptions _antiSpam = antiSpamOptions.Value;

    /// <summary>Ambiguous characters (0/O, 1/I) are excluded so references read aloud cleanly.</summary>
    private const string ReferenceAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

    public async Task<SubmissionResult> SubmitAsync(
        CreateEstimateRequestDto dto,
        string? clientIp,
        string? userAgent,
        CancellationToken ct = default)
    {
        /*
         * Bot checks, cheapest first.
         *
         * A caught bot gets a normal-looking success response with a throwaway
         * reference. Telling it that it was detected just teaches the operator
         * which check to defeat next time; nothing is written to the database.
         */
        if (!string.IsNullOrWhiteSpace(dto.CompanyWebsite))
        {
            logger.LogInformation("Estimate submission rejected: honeypot field was filled.");
            return new SubmissionResult(SubmissionOutcome.RejectedAsAutomated, DecoyResult());
        }

        if (dto.ElapsedMs is > 0 && dto.ElapsedMs < _antiSpam.MinimumFillMilliseconds)
        {
            logger.LogInformation(
                "Estimate submission rejected: completed in {ElapsedMs}ms, below the {Minimum}ms threshold.",
                dto.ElapsedMs,
                _antiSpam.MinimumFillMilliseconds);
            return new SubmissionResult(SubmissionOutcome.RejectedAsAutomated, DecoyResult());
        }

        var ipHash = HashIp(clientIp);

        // Per-source burst check, on top of the middleware rate limiter. The
        // limiter guards the endpoint; this guards the mailbox.
        if (ipHash is not null && _antiSpam.MaxSubmissionsPerWindow > 0)
        {
            var windowStart = DateTime.UtcNow - _antiSpam.Window;
            var recent = await db.EstimateRequests
                .AsNoTracking()
                .CountAsync(r => r.SubmitterIpHash == ipHash && r.CreatedAtUtc >= windowStart, ct);

            if (recent >= _antiSpam.MaxSubmissionsPerWindow)
            {
                logger.LogWarning(
                    "Estimate submission throttled: {Count} submissions from one source within {Window}.",
                    recent,
                    _antiSpam.Window);
                return new SubmissionResult(SubmissionOutcome.RateLimited, null);
            }
        }

        var entity = new EstimateRequest
        {
            Reference = await GenerateUniqueReferenceAsync(ct),
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = dto.Email.Trim(),
            Phone = Normalise(dto.Phone),
            // Bounded and de-duplicated so a caller cannot pad the row.
            ProjectTypeSlugs = dto.ProjectTypeSlugs
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .Where(s => s.Length <= 100)
                .Distinct()
                .Take(20)
                .ToList(),
            PropertyType = dto.PropertyType,
            AddressLine = Normalise(dto.AddressLine),
            City = Normalise(dto.City),
            PostalCode = dto.PostalCode.Trim(),
            Timeline = dto.Timeline,
            BudgetRange = dto.BudgetRange,
            Description = dto.Description.Trim(),
            PreferredContactMethod = dto.PreferredContactMethod,
            ReferralSource = Normalise(dto.ReferralSource),
            Status = EstimateRequestStatus.New,
            SubmitterIpHash = ipHash,
            UserAgent = userAgent is null ? null : Truncate(userAgent, 300),
        };

        db.EstimateRequests.Add(entity);
        await db.SaveChangesAsync(ct);

        logger.LogInformation(
            "Estimate request {Reference} recorded for project types {ProjectTypes}.",
            entity.Reference,
            string.Join(", ", entity.ProjectTypeSlugs));

        return new SubmissionResult(
            SubmissionOutcome.Accepted,
            new EstimateRequestResultDto(
                entity.Reference,
                entity.CreatedAtUtc,
                "We have got it. A person reads every request that comes in, and we will be in touch to arrange a look at the space."));
    }

    public async Task<PagedResultDto<AdminEstimateRequestDto>> ListAsync(
        EstimateRequestStatus? status,
        string? search,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var safePage = Math.Max(page, 1);
        var safeSize = Math.Clamp(pageSize, 1, 100);

        var query = db.EstimateRequests.AsNoTracking();

        if (status.HasValue) query = query.Where(r => r.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(r =>
                EF.Functions.Like(r.FirstName, $"%{term}%")
                || EF.Functions.Like(r.LastName, $"%{term}%")
                || EF.Functions.Like(r.Email, $"%{term}%")
                || EF.Functions.Like(r.Reference, $"%{term}%"));
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(r => r.CreatedAtUtc)
            .Skip((safePage - 1) * safeSize)
            .Take(safeSize)
            .Select(r => new AdminEstimateRequestDto(
                r.Id,
                r.Reference,
                r.FirstName,
                r.LastName,
                r.Email,
                r.Phone,
                r.ProjectTypeSlugs,
                r.PropertyType,
                r.AddressLine,
                r.City,
                r.PostalCode,
                r.Timeline,
                r.BudgetRange,
                r.Description,
                r.PreferredContactMethod,
                r.ReferralSource,
                r.Status,
                r.InternalNotes,
                r.CreatedAtUtc,
                r.UpdatedAtUtc))
            .ToListAsync(ct);

        return new PagedResultDto<AdminEstimateRequestDto>(
            items,
            safePage,
            safeSize,
            total,
            total == 0 ? 1 : (int)Math.Ceiling(total / (double)safeSize));
    }

    public async Task<AdminEstimateRequestDto?> UpdateAsync(
        int id,
        UpdateEstimateRequestDto dto,
        CancellationToken ct = default)
    {
        var entity = await db.EstimateRequests.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (entity is null) return null;

        if (dto.Status.HasValue) entity.Status = dto.Status.Value;
        if (dto.InternalNotes is not null)
        {
            entity.InternalNotes = dto.InternalNotes.Length == 0 ? null : dto.InternalNotes;
        }

        await db.SaveChangesAsync(ct);

        return new AdminEstimateRequestDto(
            entity.Id,
            entity.Reference,
            entity.FirstName,
            entity.LastName,
            entity.Email,
            entity.Phone,
            entity.ProjectTypeSlugs,
            entity.PropertyType,
            entity.AddressLine,
            entity.City,
            entity.PostalCode,
            entity.Timeline,
            entity.BudgetRange,
            entity.Description,
            entity.PreferredContactMethod,
            entity.ReferralSource,
            entity.Status,
            entity.InternalNotes,
            entity.CreatedAtUtc,
            entity.UpdatedAtUtc);
    }

    /* ------------------------------------------------------------ helpers */

    private async Task<string> GenerateUniqueReferenceAsync(CancellationToken ct = default)
    {
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var candidate = $"KSC-{RandomToken(6)}";
            var taken = await db.EstimateRequests.AnyAsync(r => r.Reference == candidate, ct);
            if (!taken) return candidate;
        }

        // Astronomically unlikely; fall back to a longer token rather than loop forever.
        return $"KSC-{RandomToken(10)}";
    }

    private static string RandomToken(int length)
    {
        var chars = new char[length];
        for (var i = 0; i < length; i++)
        {
            chars[i] = ReferenceAlphabet[RandomNumberGenerator.GetInt32(ReferenceAlphabet.Length)];
        }
        return new string(chars);
    }

    /// <summary>
    /// Salted one-way hash of the client IP.
    ///
    /// Enough to spot repeat submissions from one source; not enough to recover
    /// the address. The salt comes from configuration so hashes are not
    /// comparable across environments.
    /// </summary>
    private string? HashIp(string? ip)
    {
        if (string.IsNullOrWhiteSpace(ip)) return null;
        var bytes = Encoding.UTF8.GetBytes($"{_antiSpam.IpHashSalt}|{ip}");
        return Convert.ToHexStringLower(SHA256.HashData(bytes));
    }

    private static EstimateRequestResultDto DecoyResult() =>
        new(
            $"KSC-{RandomToken(6)}",
            DateTime.UtcNow,
            "We have got it. A person reads every request that comes in, and we will be in touch to arrange a look at the space.");

    private static string? Normalise(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
