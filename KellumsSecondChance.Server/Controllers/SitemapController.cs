using System.Text;
using System.Xml.Linq;
using KellumsSecondChance.Server.Services;
using Microsoft.AspNetCore.Mvc;
using KellumsSecondChance.Server.Configuration;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Controllers;

/// <summary>
/// Search-engine plumbing.
///
/// Both documents are generated from live data rather than checked in as static
/// files: a hand-maintained sitemap goes stale the first time somebody adds a
/// project, and a stale sitemap is worse than none.
///
/// The canonical origin comes from the incoming request, so the same build
/// serves correct absolute URLs on staging and production without a rebuild.
/// </summary>
[ApiController]
public class SitemapController(IContentService content, IContentVersion contentVersion, IOptions<ProductionOptions> production) : ControllerBase
{
    private static readonly XNamespace Sitemap = "http://www.sitemaps.org/schemas/sitemap/0.9";

    /// <summary>Static routes that always exist, with their relative priority.</summary>
    private static readonly (string Path, string Priority, string ChangeFrequency)[] StaticRoutes =
    [
        ("/", "1.0", "weekly"),
        ("/services", "0.9", "monthly"),
        ("/gallery", "0.8", "monthly"),
        ("/projects", "0.9", "weekly"),
        ("/about", "0.7", "monthly"),
        ("/reviews", "0.7", "weekly"),
        ("/faq", "0.6", "monthly"),
        ("/service-area", "0.6", "monthly"),
        ("/contact", "0.8", "monthly"),
        ("/request-estimate", "0.9", "monthly"),
        ("/privacy", "0.2", "yearly"),
        ("/terms", "0.2", "yearly"),
        ("/work-with-us", "0.5", "monthly"),
        ("/bookings", "0.8", "monthly"),
    ];

    [HttpGet("/sitemap.xml")]
    [Produces("application/xml")]
    public async Task<IActionResult> GetSitemap(CancellationToken ct)
    {
        var origin = Origin();
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var urls = new List<XElement>();

        foreach (var (path, priority, changeFrequency) in StaticRoutes)
        {
            urls.Add(UrlEntry($"{origin}{path}", today, changeFrequency, priority));
        }

        var services = await content.GetServicesAsync(ct);
        foreach (var service in services)
        {
            urls.Add(UrlEntry($"{origin}/services/{service.Slug}", today, "monthly", "0.8"));
        }

        var projects = await content.GetProjectsAsync(null, false, null, null, ct);
        foreach (var project in projects)
        {
            var lastModified = project.CompletedOn?.ToString("yyyy-MM-dd") ?? today;
            urls.Add(UrlEntry($"{origin}/projects/{project.Slug}", lastModified, "yearly", "0.7"));
        }

        var document = new XDocument(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(Sitemap + "urlset", urls));

        /*
         * Same content version as every other public read. Without an ETag the
         * sitemap could advertise a project for an hour after it was
         * unpublished — §44 is about exactly this.
         */
        Response.Headers.ETag = contentVersion.Current;
        Response.Headers.CacheControl = "public, max-age=300, must-revalidate";
        return Content(document.ToString(), "application/xml", Encoding.UTF8);
    }

    /// <summary>
    /// robots.txt.
    ///
    /// The admin console is disallowed as a courtesy to well-behaved crawlers;
    /// it is not a security control — those endpoints are protected by
    /// authorisation regardless of what any crawler chooses to do.
    /// </summary>
    [HttpGet("/robots.txt")]
    [Produces("text/plain")]
    public IActionResult Robots()
    {
        var origin = Origin();

        var body = string.Join('\n',
            "User-agent: *",
            "Allow: /",
            "Disallow: /admin",
            "Disallow: /api/",
            string.Empty,
            $"Sitemap: {origin}/sitemap.xml",
            string.Empty);

        Response.Headers.CacheControl = "public, max-age=86400";
        return Content(body, "text/plain", Encoding.UTF8);
    }

    private static XElement UrlEntry(string location, string lastModified, string changeFrequency, string priority) =>
        new(Sitemap + "url",
            new XElement(Sitemap + "loc", location),
            new XElement(Sitemap + "lastmod", lastModified),
            new XElement(Sitemap + "changefreq", changeFrequency),
            new XElement(Sitemap + "priority", priority));

    private string Origin() => production.Value.SiteUrl?.TrimEnd('/') ?? $"{Request.Scheme}://{Request.Host}";
}
