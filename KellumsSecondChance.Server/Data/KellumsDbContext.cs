using KellumsSecondChance.Server.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace KellumsSecondChance.Server.Data;

/// <summary>
/// Identity user for the staff administration area.
/// There is no public registration — accounts are provisioned from configuration.
/// </summary>
public class ApplicationUser : Microsoft.AspNetCore.Identity.IdentityUser
{
    public string? DisplayName { get; set; }
}

public class KellumsDbContext(DbContextOptions<KellumsDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<RenovationService> RenovationServices => Set<RenovationService>();

    public DbSet<RenovationProject> RenovationProjects => Set<RenovationProject>();

    public DbSet<RenovationProjectImage> RenovationProjectImages => Set<RenovationProjectImage>();

    public DbSet<ProjectService> ProjectServices => Set<ProjectService>();

    public DbSet<CustomerTestimonial> CustomerTestimonials => Set<CustomerTestimonial>();

    public DbSet<FaqItem> FaqItems => Set<FaqItem>();

    public DbSet<ServiceArea> ServiceAreas => Set<ServiceArea>();

    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();

    public DbSet<EstimateRequest> EstimateRequests => Set<EstimateRequest>();

    public DbSet<EstimateRequestNote> EstimateRequestNotes => Set<EstimateRequestNote>();

    public DbSet<EstimateRequestStatusHistory> EstimateRequestStatusHistory =>
        Set<EstimateRequestStatusHistory>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(KellumsDbContext).Assembly);
    }

    /// <summary>
    /// Stamps audit timestamps centrally so no service can forget to set them.
    /// </summary>
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        StampTimestamps();
        return base.SaveChanges();
    }

    private void StampTimestamps()
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<ContentEntity>())
        {
            if (entry.State == EntityState.Added) entry.Entity.CreatedAtUtc = now;
            else if (entry.State == EntityState.Modified) entry.Entity.UpdatedAtUtc = now;
        }

        foreach (var entry in ChangeTracker.Entries<EstimateRequest>())
        {
            if (entry.State == EntityState.Added) entry.Entity.CreatedAtUtc = now;
            else if (entry.State == EntityState.Modified) entry.Entity.UpdatedAtUtc = now;
        }

        foreach (var entry in ChangeTracker.Entries<SiteSetting>())
        {
            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                entry.Entity.UpdatedAtUtc = now;
            }
        }
    }
}
