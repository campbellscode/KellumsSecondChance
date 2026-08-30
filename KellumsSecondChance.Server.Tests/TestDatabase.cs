using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Data.Seed;
using KellumsSecondChance.Server.Domain.Entities;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace KellumsSecondChance.Server.Tests;

/// <summary>
/// A real relational database for each test, backed by SQLite in memory.
///
/// SQLite is used rather than the InMemory provider because the queries under
/// test use LIKE, ordering and grouping — InMemory would silently accept LINQ
/// that SQL Server rejects, which is precisely the class of bug these tests
/// exist to catch.
/// </summary>
public sealed class TestDatabase : IDisposable
{
    private readonly SqliteConnection _connection;

    public KellumsDbContext Db { get; }

    public TestDatabase()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<KellumsDbContext>()
            .UseSqlite(_connection)
            .Options;

        Db = new KellumsDbContext(options);
        Db.Database.EnsureCreated();
    }

    /// <summary>Loads the sample catalogue, wiring project/service links as the seeder does.</summary>
    public async Task SeedSampleContentAsync()
    {
        Db.RenovationServices.AddRange(SampleContent.Services());
        await Db.SaveChangesAsync();

        var servicesBySlug = await Db.RenovationServices.ToDictionaryAsync(s => s.Slug, s => s.Id);

        foreach (var (project, serviceSlugs) in SampleContent.Projects())
        {
            var order = 0;
            foreach (var slug in serviceSlugs)
            {
                if (servicesBySlug.TryGetValue(slug, out var serviceId))
                {
                    project.ProjectServices.Add(new ProjectService
                    {
                        RenovationServiceId = serviceId,
                        DisplayOrder = order++,
                    });
                }
            }
            Db.RenovationProjects.Add(project);
        }

        Db.CustomerTestimonials.AddRange(SampleContentSupport.Testimonials());
        Db.FaqItems.AddRange(SampleContentSupport.Faqs());
        Db.ServiceAreas.AddRange(SampleContentSupport.ServiceAreas());

        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();
    }

    public void Dispose()
    {
        Db.Dispose();
        _connection.Dispose();
    }
}
