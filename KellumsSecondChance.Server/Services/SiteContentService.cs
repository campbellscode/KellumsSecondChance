using System.Text.Json;
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
/// Assembles the business profile the client renders in the header, footer and
/// structured data.
///
/// Precedence: a value in the SiteSettings table wins; otherwise the appsettings
/// "Business" section; otherwise null. Null means "not supplied" and the client
/// omits that element — it is never replaced with an invented placeholder.
/// </summary>
public class SiteContentService(KellumsDbContext db, IOptions<BusinessOptions> options)
    : ISiteContentService
{
    private readonly BusinessOptions _business = options.Value;

    public static class Keys
    {
        public const string BusinessName = "business.name";
        public const string Tagline = "business.tagline";
        public const string PhoneDisplay = "business.phone.display";
        public const string PhoneE164 = "business.phone.e164";
        public const string Email = "business.email";
        public const string ServiceAreaSummary = "business.serviceAreaSummary";
        public const string Licensing = "business.licensing";
        public const string Insurance = "business.insurance";
        public const string FoundedYear = "business.foundedYear";
        public const string AddressLocality = "business.address.locality";
        public const string AddressRegion = "business.address.region";
        public const string SocialLinks = "business.socialLinks";
    }

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

        var foundedYear = Value(Keys.FoundedYear, _business.FoundedYear?.ToString());

        return new SiteContentDto(
            Value(Keys.BusinessName, _business.BusinessName) ?? _business.BusinessName,
            Value(Keys.Tagline, _business.Tagline) ?? _business.Tagline,
            Value(Keys.PhoneDisplay, _business.PhoneDisplay),
            Value(Keys.PhoneE164, _business.PhoneE164),
            Value(Keys.Email, _business.Email),
            Value(Keys.ServiceAreaSummary, _business.ServiceAreaSummary),
            Value(Keys.Licensing, _business.Licensing),
            Value(Keys.Insurance, _business.Insurance),
            int.TryParse(foundedYear, out var year) ? year : null,
            Value(Keys.AddressLocality, _business.AddressLocality),
            Value(Keys.AddressRegion, _business.AddressRegion),
            ResolveSocialLinks(Value(Keys.SocialLinks)));
    }

    private IReadOnlyList<SocialLinkDto> ResolveSocialLinks(string? storedJson)
    {
        if (!string.IsNullOrWhiteSpace(storedJson))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<List<SocialLinkDto>>(
                    storedJson,
                    JsonSerializerOptions.Web);
                if (parsed is not null) return FilterValid(parsed);
            }
            catch (JsonException)
            {
                // Malformed setting: fall through to the configured list rather
                // than failing the whole request over a footer detail.
            }
        }

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
