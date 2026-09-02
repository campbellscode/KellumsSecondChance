using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Data.Seed;

/// <summary>
/// Populates an empty database with the demonstration catalogue and, if
/// configured, the first administrator account.
///
/// Three deliberate constraints:
///  1. It NEVER applies migrations. Schema changes stay a manual operation.
///  2. It only inserts into tables that are already empty, so it can never
///     overwrite real content the business has entered.
///  3. It is opt-in via Seed:Enabled, so a production deployment does not
///     quietly fill itself with sample projects.
/// </summary>
public class DatabaseSeeder(
    IServiceProvider services,
    IOptions<SeedOptions> options,
    ILogger<DatabaseSeeder> logger) : IHostedService
{
    private readonly SeedOptions _options = options.Value;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_options.Enabled)
        {
            logger.LogInformation("Seeding is disabled (Seed:Enabled is false). Skipping.");
            return;
        }

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<KellumsDbContext>();

        // A missing or unreachable database is a configuration problem, not a
        // reason to crash the host — the site still serves its static assets.
        try
        {
            if (!await db.Database.CanConnectAsync(cancellationToken))
            {
                logger.LogWarning(
                    "Seeding skipped: could not connect to the database. Apply migrations first with 'dotnet ef database update'.");
                return;
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Seeding skipped: the database connection check failed.");
            return;
        }

        try
        {
            await SeedContentAsync(db, cancellationToken);
            await SeedAdministratorAsync(scope.ServiceProvider, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Seeding failed. The application will continue to start.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task SeedContentAsync(KellumsDbContext db, CancellationToken ct)
    {
        if (!await db.RenovationServices.AnyAsync(ct))
        {
            db.RenovationServices.AddRange(ConfirmedBusinessContent.Services());
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded the confirmed exterior service catalogue.");
        }

        if (!await db.RenovationProjects.AnyAsync(ct))
        {
            var servicesBySlug = await db.RenovationServices
                .ToDictionaryAsync(s => s.Slug, s => s.Id, ct);

            foreach (var (project, serviceSlugs) in SampleContent.Projects())
            {
                var order = 0;
                foreach (var slug in serviceSlugs)
                {
                    if (!servicesBySlug.TryGetValue(slug, out var serviceId))
                    {
                        logger.LogWarning(
                            "Project {ProjectSlug} references unknown service {ServiceSlug}; the link was skipped.",
                            project.Slug,
                            slug);
                        continue;
                    }

                    project.ProjectServices.Add(new ProjectService
                    {
                        RenovationServiceId = serviceId,
                        DisplayOrder = order++,
                    });
                }

                db.RenovationProjects.Add(project);
            }

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded the sample project case studies.");
        }

        if (!await db.CustomerTestimonials.AnyAsync(ct))
        {
            db.CustomerTestimonials.AddRange(SampleContentSupport.Testimonials());
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded the sample testimonials (all flagged as sample content).");
        }

        if (!await db.FaqItems.AnyAsync(ct))
        {
            db.FaqItems.AddRange(ConfirmedBusinessContent.Faqs());
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded the FAQ content.");
        }

        if (!await db.ServiceAreas.AnyAsync(ct))
        {
            db.ServiceAreas.AddRange(ConfirmedBusinessContent.ServiceAreas());
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded the confirmed primary service area.");
        }
    }

    /// <summary>
    /// Creates the first administrator from configuration.
    ///
    /// The password must come from user secrets or an environment variable — it
    /// is never read from a committed appsettings file. If no password is
    /// configured, no account is created and the admin area stays inaccessible,
    /// which is the correct default.
    /// </summary>
    private async Task SeedAdministratorAsync(IServiceProvider scopedServices, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_options.AdminEmail) || string.IsNullOrWhiteSpace(_options.AdminPassword))
        {
            logger.LogInformation(
                "No administrator credentials configured; the admin area has no accounts. "
                + "Set Seed:AdminEmail and Seed:AdminPassword (user secrets or environment variables) to create one.");
            return;
        }

        var roleManager = scopedServices.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = scopedServices.GetRequiredService<UserManager<ApplicationUser>>();

        if (!await roleManager.RoleExistsAsync(Roles.Administrator))
        {
            await roleManager.CreateAsync(new IdentityRole(Roles.Administrator));
        }

        var existing = await userManager.FindByEmailAsync(_options.AdminEmail);
        if (existing is not null)
        {
            // Never reset an existing password from configuration: that would let
            // a stale environment variable silently take over a live account.
            if (!await userManager.IsInRoleAsync(existing, Roles.Administrator))
            {
                await userManager.AddToRoleAsync(existing, Roles.Administrator);
                logger.LogInformation("Granted the Administrator role to the existing configured account.");
            }
            return;
        }

        var user = new ApplicationUser
        {
            UserName = _options.AdminEmail,
            Email = _options.AdminEmail,
            EmailConfirmed = true,
            DisplayName = _options.AdminDisplayName ?? "Administrator",
        };

        var created = await userManager.CreateAsync(user, _options.AdminPassword);
        if (!created.Succeeded)
        {
            // Log the codes, never the password or the attempted value.
            logger.LogError(
                "Could not create the administrator account: {Errors}",
                string.Join("; ", created.Errors.Select(e => e.Code)));
            return;
        }

        await userManager.AddToRoleAsync(user, Roles.Administrator);
        logger.LogInformation("Created the initial administrator account.");
    }
}
