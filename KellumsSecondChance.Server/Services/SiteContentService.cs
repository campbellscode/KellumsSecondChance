using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Dtos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Services;

public interface ISiteContentService
{
    Task<SiteContentDto> GetAsync(CancellationToken ct = default);
}

/// <summary>
/// Assembles the business profile the public site renders.
///
/// PRECEDENCE: the SiteSettings table wins; otherwise the appsettings "Business"
/// section; otherwise null. The table is edited from /admin/site-settings, which
/// makes the console — not a TypeScript file — the authoritative source for
/// anything a person might change.
///
/// Null means "not supplied", and the client omits whatever it would have
/// rendered. Nothing here ever substitutes a placeholder.
/// </summary>
public class SiteContentService(KellumsDbContext db, IOptions<BusinessOptions> options)
    : ISiteContentService
{
    private readonly BusinessOptions _business = options.Value;

    public async Task<SiteContentDto> GetAsync(CancellationToken ct = default)
    {
        var settings = await db.SiteSettings
            .AsNoTracking()
            .ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        string? Value(string key, string? fallback = null)
        {
            if (settings.TryGetValue(key, out var stored) && !string.IsNullOrWhiteSpace(stored))
            {
                return stored;
            }
            return string.IsNullOrWhiteSpace(fallback) ? null : fallback;
        }

        var foundedYear = Value(SiteSettingsWriteService.Keys.FoundedYear, _business.FoundedYear?.ToString());

        /*
         * The address is only published when the business has said so.
         *
         * A renovation company may hold an address for its own records without
         * wanting it on a public page, so the toggle gates the whole block —
         * including the PostalAddress node in structured data.
         */
        var publishAddress = string.Equals(
            Value(SiteSettingsWriteService.Keys.PublishAddress, _business.PublishAddress.ToString()),
            "true",
            StringComparison.OrdinalIgnoreCase);

        return new SiteContentDto(
            Value(SiteSettingsWriteService.Keys.BusinessName, _business.BusinessName) ?? _business.BusinessName,
            Value(SiteSettingsWriteService.Keys.Tagline, _business.Tagline) ?? _business.Tagline,
            Value(SiteSettingsWriteService.Keys.PhoneDisplay, _business.PhoneDisplay),
            Value(SiteSettingsWriteService.Keys.PhoneE164, _business.PhoneE164),
            Value(SiteSettingsWriteService.Keys.Email, _business.Email),
            Value(SiteSettingsWriteService.Keys.ServiceAreaSummary, _business.ServiceAreaSummary),
            Value(SiteSettingsWriteService.Keys.Licensing, _business.Licensing),
            Value(SiteSettingsWriteService.Keys.Insurance, _business.Insurance),
            int.TryParse(foundedYear, out var year) ? year : null,
            publishAddress ? Value(SiteSettingsWriteService.Keys.AddressLine1) : null,
            publishAddress ? Value(SiteSettingsWriteService.Keys.AddressLine2) : null,
            publishAddress
                ? Value(SiteSettingsWriteService.Keys.AddressLocality, _business.AddressLocality)
                : null,
            publishAddress
                ? Value(SiteSettingsWriteService.Keys.AddressRegion, _business.AddressRegion)
                : null,
            publishAddress ? Value(SiteSettingsWriteService.Keys.AddressPostalCode, _business.AddressPostalCode) : null,
            Value(SiteSettingsWriteService.Keys.SiteUrl),
            Value(SiteSettingsWriteService.Keys.OgImagePath, _business.OgImagePath),
            Value(SiteSettingsWriteService.Keys.GoogleReviewUrl),
            ResolveSocialLinks(Value(SiteSettingsWriteService.Keys.SocialLinks)),
            /*
             * Hours the business actually gave us, or none.
             *
             * These used to be hard-coded in the client. Publishing invented
             * opening times is worse than publishing none: somebody drives over
             * on a Saturday morning because the website said "by appointment".
             */
            SiteSettingsWriteService.ParseOfficeHours(
                Value(SiteSettingsWriteService.Keys.OfficeHours)));
    }

    private IReadOnlyList<SocialLinkDto> ResolveSocialLinks(string? storedJson)
    {
        var stored = SiteSettingsWriteService.ParseSocialLinks(storedJson);
        if (stored.Count > 0) return FilterValid(stored);

        return FilterValid(
            _business.SocialLinks.Select(s => new SocialLinkDto(s.Label, s.Href, s.Icon)).ToList());
    }

    /// <summary>Drops entries that are incomplete or not absolute http(s) URLs.</summary>
    private static List<SocialLinkDto> FilterValid(IEnumerable<SocialLinkDto> links) =>
        links
            .Where(l =>
                !string.IsNullOrWhiteSpace(l.Label)
                && Uri.TryCreate(l.Href, UriKind.Absolute, out var uri)
                && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp))
            .ToList();
}
