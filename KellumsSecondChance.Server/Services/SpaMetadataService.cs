using System.Net;
using System.Text.RegularExpressions;
using KellumsSecondChance.Server.Configuration;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Services;

public sealed record SpaMetadataResult(bool Found, string Html);

public interface ISpaMetadataService
{
    Task<SpaMetadataResult> RenderAsync(PathString path, string requestOrigin, CancellationToken ct = default);
}

/// <summary>Injects crawler-visible metadata into the SPA shell without executing React.</summary>
public sealed class SpaMetadataService(
    IWebHostEnvironment environment,
    IContentService content,
    ISiteContentService siteContent,
    IOptions<ProductionOptions> production) : ISpaMetadataService
{
    private const string Brand = "Kellum's Second Chance Renovations";
    private const string SiteName = "Kellum’s Second Chance Renovations";
    private const string DefaultSocialImage = "/media/social/social-thumbnail-1.png";
    private const string SocialImageAlt = "Kellum’s Second Chance Renovations — exterior renovations in Cincinnati, Ohio.";
    private static readonly IReadOnlyDictionary<string, (string Title, string Description)> StaticPages =
        new Dictionary<string, (string, string)>(StringComparer.OrdinalIgnoreCase)
        {
            ["/"] = (Brand, "Exterior renovation, repair and restoration services for homeowners in Cincinnati, Ohio."),
            ["/services"] = ($"Exterior Renovation Services | {Brand}", "Explore roofing, siding, gutters, decks, exterior repairs and restoration services in Cincinnati, Ohio."),
            ["/gallery"] = ($"Gallery | {Brand}", "View exterior renovation and restoration imagery from Kellum's Second Chance Renovations in Cincinnati, Ohio."),
            ["/projects"] = ($"Renovation Projects | {Brand}", "See published renovation case studies and the real challenges, solutions and results behind the work."),
            ["/about"] = ($"About | {Brand}", "Learn what Kellum's renovates, why the company is called Second Chance, and the values that guide its work."),
            ["/reviews"] = ($"Homeowner Reviews | {Brand}", "Read published feedback from homeowners about their renovation experience with Kellum's."),
            ["/faq"] = ($"Renovation FAQs | {Brand}", "Get straightforward answers about Kellum's renovation services, estimate process and project approach."),
            ["/service-area"] = ($"Service Area | {Brand}", "Check the areas Kellum's has explicitly confirmed it serves; unconfirmed locations are not claimed."),
            ["/contact"] = ($"Contact | {Brand}", "Contact Kellum's Second Chance Renovations about exterior renovation, repair or restoration in Cincinnati."),
            ["/request-estimate"] = ($"Request an Estimate | {Brand}", "Tell Kellum's about your exterior project and request an estimate."),
            ["/work-with-us"] = ($"Work With Us | {Brand}", "Express preliminary interest in working with Kellum's; this enquiry is not a job application or hiring guarantee."),
            ["/bookings"] = ($"Bookings | {Brand}", "Request a time to discuss exterior renovation, repair or restoration work with Kellum's in Cincinnati, Ohio."),
            ["/privacy"] = ($"Privacy | {Brand}", "Learn what information this website collects, why it is used, and how it is protected."),
            ["/terms"] = ($"Website Terms | {Brand}", "Read the terms that apply when using the Kellum's Second Chance Renovations website."),
        };

    public async Task<SpaMetadataResult> RenderAsync(PathString requestPath, string requestOrigin, CancellationToken ct = default)
    {
        var path = requestPath.Value?.TrimEnd('/') ?? "/";
        if (path.Length == 0) path = "/";
        string title, description;
        string? image = null;

        if (StaticPages.TryGetValue(path, out var page)) (title, description) = page;
        else if (path.StartsWith("/admin", StringComparison.OrdinalIgnoreCase))
            (title, description) = ($"Admin | {Brand}", "Private administration area.");
        else if (path.StartsWith("/services/", StringComparison.OrdinalIgnoreCase))
        {
            var item = await content.GetServiceAsync(path[10..], ct);
            if (item is null) return new(false, string.Empty);
            title = string.IsNullOrWhiteSpace(item.MetaTitle) ? $"{item.Name} | {Brand}" : item.MetaTitle;
            description = string.IsNullOrWhiteSpace(item.MetaDescription) ? item.Summary : item.MetaDescription;
            image = item.Image?.Src;
        }
        else if (path.StartsWith("/projects/", StringComparison.OrdinalIgnoreCase))
        {
            var item = await content.GetProjectAsync(path[10..], ct);
            if (item is null) return new(false, string.Empty);
            title = string.IsNullOrWhiteSpace(item.MetaTitle) ? $"{item.Title} | {Brand}" : item.MetaTitle;
            description = string.IsNullOrWhiteSpace(item.MetaDescription) ? item.Summary : item.MetaDescription;
            image = item.CoverImage?.Src;
        }
        else return new(false, string.Empty);

        var profile = await siteContent.GetAsync(ct);
        var origin = ResolveOrigin(profile.SiteUrl, requestOrigin);
        var canonical = origin + (path == "/" ? "/" : path);
        var socialImage = image ?? profile.OgImagePath ?? DefaultSocialImage;
        var head = BuildHead(title, description, canonical, socialImage, production.Value, environment.IsDevelopment());
        var shellPath = Path.Combine(environment.WebRootPath ?? "wwwroot", "index.html");
        if (!File.Exists(shellPath))
            shellPath = Path.GetFullPath(Path.Combine(environment.ContentRootPath, "..", "kellumssecondchance.client", "index.html"));
        var html = await File.ReadAllTextAsync(shellPath, ct);
        html = Regex.Replace(html, "<meta\\s+name=[\"']description[\"'][\\s\\S]*?/\\s*>", string.Empty, RegexOptions.IgnoreCase);
        html = Regex.Replace(html, @"<title>.*?</title>", head, RegexOptions.Singleline | RegexOptions.IgnoreCase);
        return new(true, html);
    }

    private string ResolveOrigin(string? profileSiteUrl, string requestOrigin)
    {
        if (!string.IsNullOrWhiteSpace(production.Value.SiteUrl))
            return production.Value.SiteUrl.TrimEnd('/');
        if (environment.IsDevelopment())
            return (profileSiteUrl ?? requestOrigin).TrimEnd('/');

        // Startup validation requires Production:SiteUrl, but keep the same
        // invariant here so metadata can never trust Request.Host in Production.
        throw new InvalidOperationException(
            "Production:SiteUrl must be configured before public metadata can be rendered.");
    }

    private static string BuildHead(string title, string description, string canonical, string? image, ProductionOptions options, bool development)
    {
        static string E(string value) => WebUtility.HtmlEncode(value);
        var tags = new List<string>
        {
            $"<title>{E(title)}</title>",
            $"<meta name=\"description\" content=\"{E(description)}\" />",
            $"<meta name=\"robots\" content=\"{(development ? "noindex, nofollow" : "index, follow, max-image-preview:large")}\" data-runtime-indexing=\"{(development ? "disabled" : "enabled")}\" />",
            $"<link rel=\"canonical\" href=\"{E(canonical)}\" />",
            $"<meta property=\"og:type\" content=\"website\" />",
            $"<meta property=\"og:title\" content=\"{E(title)}\" />",
            $"<meta property=\"og:description\" content=\"{E(description)}\" />",
            $"<meta property=\"og:url\" content=\"{E(canonical)}\" />",
            $"<meta property=\"og:site_name\" content=\"{E(SiteName)}\" />",
            $"<meta name=\"twitter:card\" content=\"{(image is null ? "summary" : "summary_large_image")}\" />",
            $"<meta name=\"twitter:title\" content=\"{E(title)}\" />",
            $"<meta name=\"twitter:description\" content=\"{E(description)}\" />",
        };
        if (image is not null)
        {
            var absolute = Uri.TryCreate(image, UriKind.Absolute, out _)
                ? image
                : new Uri(new Uri(canonical), "/" + image.TrimStart('/')).ToString();
            tags.Add($"<meta property=\"og:image\" content=\"{E(absolute)}\" />");
            tags.Add($"<meta property=\"og:image:alt\" content=\"{E(SocialImageAlt)}\" />");
            tags.Add($"<meta name=\"twitter:image\" content=\"{E(absolute)}\" />");
            tags.Add($"<meta name=\"twitter:image:alt\" content=\"{E(SocialImageAlt)}\" />");
            if (string.Equals(image, DefaultSocialImage, StringComparison.OrdinalIgnoreCase))
            {
                tags.Add("<meta property=\"og:image:width\" content=\"1731\" />");
                tags.Add("<meta property=\"og:image:height\" content=\"909\" />");
            }
        }
        if (!string.IsNullOrWhiteSpace(options.GoogleSiteVerification)) tags.Add($"<meta name=\"google-site-verification\" content=\"{E(options.GoogleSiteVerification)}\" />");
        if (!string.IsNullOrWhiteSpace(options.BingSiteVerification)) tags.Add($"<meta name=\"msvalidate.01\" content=\"{E(options.BingSiteVerification)}\" />");
        return string.Join(Environment.NewLine + "    ", tags);
    }
}
