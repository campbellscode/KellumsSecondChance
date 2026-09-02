using KellumsSecondChance.Server.Data;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace KellumsSecondChance.Server.Infrastructure;

public sealed class DatabaseHealthCheck(KellumsDbContext db) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        try { return await db.Database.CanConnectAsync(ct) ? HealthCheckResult.Healthy() : HealthCheckResult.Unhealthy("Database unavailable."); }
        catch (Exception ex) { return HealthCheckResult.Unhealthy("Database unavailable.", ex); }
    }
}
