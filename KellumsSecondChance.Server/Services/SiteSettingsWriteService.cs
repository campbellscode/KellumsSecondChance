using System.Text.Json;
using KellumsSecondChance.Server.Data;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Dtos;
using Microsoft.EntityFrameworkCore;

namespace KellumsSecondChance.Server.Services;

public interface ISiteSettingsWriteService
{
    Task<AdminSiteSettingsDto> GetAsync(CancellationToken ct = default);

    Task<WriteResult<AdminSiteSettingsDto>> SaveAsync(SiteSettingsWriteDto dto, CancellationToken ct = default);
}

/// <summary>
/// The editable business profile, stored in SiteSettings.
///
/// This is now the authoritative home for business facts. The client keeps only
/// static brand constants; everything a person might change — phone, email,
/// address, hours of trading, licensing, social profiles, domain — is written
/// here and read back through /api/site-content, so updating the company's
/// phone number never requires a rebuild.
///
/// EVERY VALUE MAY BE NULL, AND NULL MEANS "NOT SUPPLIED". Clearing a field
/// deletes its row rather than storing an empty string, so the public site's
/// omit-rather-than-fake rule keeps working unchanged.
///
/// NO CONCURRENCY TOKEN, ON PURPOSE. Projects, services, FAQs and leads all
/// carry one because they are long written documents where a lost save costs
/// somebody an afternoon. This is a short form of short facts, edited rarely and
/// almost always by one person; adding a token here would mean a settings
/// aggregate row that exists only to be versioned, and a conflict dialog for a
/// collision that essentially cannot happen. §38 asks for concurrency machinery
/// where it earns its place, not everywhere.
/// </summary>
public class SiteSettingsWriteService(
    KellumsDbContext db,
    IContentVersion contentVersion,
    IHostEnvironment environment,
    ILogger<SiteSettingsWriteService> logger) : ISiteSettingsWriteService
{
    public static class Keys
    {
        public const string BusinessName = "business.name";
        public const string Tagline = "business.tagline";
        public const string PhoneDisplay = "business.phone.display";
        public const string PhoneE164 = "business.phone.e164";
        public const string Email = "business.email";
        public const string AddressLine1 = "business.address.line1";
        public const string AddressLine2 = "business.address.line2";
        public const string AddressLocality = "business.address.locality";
        public const string AddressRegion = "business.address.region";
        public const string AddressPostalCode = "business.address.postalCode";
        public const string PublishAddress = "business.address.publish";
        public const string ServiceAreaSummary = "business.serviceAreaSummary";
        public const string Licensing = "business.licensing";
        public const string Insurance = "business.insurance";
        public const string FoundedYear = "business.foundedYear";
        public const string SocialLinks = "business.socialLinks";
        public const string OfficeHours = "business.officeHours";
        public const string SiteUrl = "business.siteUrl";
        public const string OgImagePath = "business.ogImagePath";

        /// <summary>
        /// Storage key of an UPLOADED social card, written only by the upload
        /// endpoint. Kept separate from OgImagePath, which an administrator can
        /// type by hand — a typed path must never become something the
        /// application will delete.
        /// </summary>
        public const string OgImageStorageKey = "business.ogImage.storageKey";
    }

    public async Task<AdminSiteSettingsDto> GetAsync(CancellationToken ct = default)
    {
        var stored = await db.SiteSettings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        string? Get(string key) =>
            stored.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value) ? value : null;

        return new AdminSiteSettingsDto(
            Get(Keys.BusinessName),
            Get(Keys.Tagline),
            Get(Keys.PhoneDisplay),
            Get(Keys.PhoneE164),
            Get(Keys.Email),
            Get(Keys.AddressLine1),
            Get(Keys.AddressLine2),
            Get(Keys.AddressLocality),
            Get(Keys.AddressRegion),
            Get(Keys.AddressPostalCode),
            string.Equals(Get(Keys.PublishAddress), "true", StringComparison.OrdinalIgnoreCase),
            Get(Keys.ServiceAreaSummary),
            Get(Keys.Licensing),
            Get(Keys.Insurance),
            int.TryParse(Get(Keys.FoundedYear), out var year) ? year : null,
            ParseSocialLinks(Get(Keys.SocialLinks)),
            ParseOfficeHours(Get(Keys.OfficeHours)),
            Get(Keys.SiteUrl),
            Get(Keys.OgImagePath));
    }

    public async Task<WriteResult<AdminSiteSettingsDto>> SaveAsync(
        SiteSettingsWriteDto dto,
        CancellationToken ct = default)
    {
        /*
         * Cross-field rules that attributes cannot express.
         */
        var phoneDisplay = Clean(dto.PhoneDisplay);
        var phoneE164 = Clean(dto.PhoneE164);

        // A tel: link needs both halves. One without the other would render a
        // number that is not clickable, or a link with no visible number.
        if (phoneDisplay is null != phoneE164 is null)
        {
            return WriteResult<AdminSiteSettingsDto>.Invalid(
                phoneE164 is null ? nameof(dto.PhoneE164) : nameof(dto.PhoneDisplay),
                "Fill in both the display number and the international number, or leave both blank.");
        }

        /*
         * Email is checked HERE as well as by the DTO attribute.
         *
         * [EmailAddress] is applied by MVC model binding, so it protects the
         * HTTP endpoint and nothing else. This service owns the settings
         * contract; a rule that only exists one layer up is a rule that
         * disappears the moment anything else calls in.
         */
        var email = Clean(dto.Email);
        if (email is not null && !IsPlausibleEmail(email))
        {
            return WriteResult<AdminSiteSettingsDto>.Invalid(
                nameof(dto.Email),
                "That does not look like an email address. It needs a name, an @ and a domain.");
        }

        var siteUrl = Clean(dto.SiteUrl);
        if (siteUrl is not null)
        {
            if (!Uri.TryCreate(siteUrl, UriKind.Absolute, out var uri)
                || (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
            {
                return WriteResult<AdminSiteSettingsDto>.Invalid(
                    nameof(dto.SiteUrl),
                    "Enter the full website address, starting with https://");
            }

            /*
             * Plain http is refused in production.
             *
             * This value becomes every canonical tag and every sharing URL the
             * site publishes. An http:// canonical on an https site splits the
             * page's search ranking across two addresses and makes shared links
             * warn about an insecure connection.
             *
             * Development and test keep http, because http://localhost is how
             * the application is actually run there.
             */
            if (environment.IsProduction() && uri.Scheme != Uri.UriSchemeHttps)
            {
                return WriteResult<AdminSiteSettingsDto>.Invalid(
                    nameof(dto.SiteUrl),
                    "The website address has to start with https:// — search engines and "
                    + "sharing previews both treat an insecure address as a different site.");
            }

            siteUrl = siteUrl.TrimEnd('/');
        }

        var ogImagePath = Clean(dto.OgImagePath);
        if (ogImagePath is not null)
        {
            if (!ogImagePath.StartsWith('/'))
            {
                return WriteResult<AdminSiteSettingsDto>.Invalid(
                    nameof(dto.OgImagePath),
                    "Use a path that starts with a slash, for example /brand/social-card.png");
            }

            // Social platforms do not render SVG previews, so accepting one here
            // would guarantee a broken card.
            if (ogImagePath.EndsWith(".svg", StringComparison.OrdinalIgnoreCase))
            {
                return WriteResult<AdminSiteSettingsDto>.Invalid(
                    nameof(dto.OgImagePath),
                    "Sharing images have to be PNG or JPG — social networks will not display an SVG.");
            }

            if (!ogImagePath.EndsWith(".png", StringComparison.OrdinalIgnoreCase)
                && !ogImagePath.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase)
                && !ogImagePath.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase))
            {
                return WriteResult<AdminSiteSettingsDto>.Invalid(
                    nameof(dto.OgImagePath),
                    "Use a .png or .jpg image, sized 1200 by 630.");
            }
        }

        foreach (var link in dto.SocialLinks)
        {
            /*
             * https only, in every environment. Facebook, Instagram, YouTube and
             * LinkedIn are all https-only, so an http link here is a typo rather
             * than a legitimate value — and these addresses are declared to
             * search engines as official accounts.
             */
            if (!Uri.TryCreate(link.Href, UriKind.Absolute, out var social)
                || social.Scheme != Uri.UriSchemeHttps)
            {
                return WriteResult<AdminSiteSettingsDto>.Invalid(
                    nameof(dto.SocialLinks),
                    $"\"{link.Label}\" needs a full web address starting with https://");
            }
        }

        var values = new Dictionary<string, string?>
        {
            [Keys.BusinessName] = Clean(dto.BusinessName),
            [Keys.Tagline] = Clean(dto.Tagline),
            [Keys.PhoneDisplay] = phoneDisplay,
            [Keys.PhoneE164] = phoneE164,
            [Keys.Email] = email,
            [Keys.AddressLine1] = Clean(dto.AddressLine1),
            [Keys.AddressLine2] = Clean(dto.AddressLine2),
            [Keys.AddressLocality] = Clean(dto.AddressLocality),
            [Keys.AddressRegion] = Clean(dto.AddressRegion),
            [Keys.AddressPostalCode] = Clean(dto.AddressPostalCode),
            [Keys.PublishAddress] = dto.PublishAddress ? "true" : null,
            [Keys.ServiceAreaSummary] = Clean(dto.ServiceAreaSummary),
            [Keys.Licensing] = Clean(dto.Licensing),
            [Keys.Insurance] = Clean(dto.Insurance),
            [Keys.FoundedYear] = dto.FoundedYear?.ToString(),
            [Keys.SiteUrl] = siteUrl,
            [Keys.OgImagePath] = ogImagePath,
            [Keys.OfficeHours] = dto.OfficeHours.Count == 0
                ? null
                : JsonSerializer.Serialize(
                    dto.OfficeHours
                        .Where(h => !string.IsNullOrWhiteSpace(h.Label) && !string.IsNullOrWhiteSpace(h.Hours))
                        .Select(h => new OfficeHoursDto(h.Label.Trim(), h.Hours.Trim())),
                    JsonSerializerOptions.Web),
            [Keys.SocialLinks] = dto.SocialLinks.Count == 0
                ? null
                : JsonSerializer.Serialize(
                    dto.SocialLinks.Select(l => new SocialLinkDto(l.Label.Trim(), l.Href.Trim(), l.Icon.Trim())),
                    JsonSerializerOptions.Web),
        };

        /*
         * Nothing may be accepted that the column cannot hold. Without this a
         * long-but-legal set of social links would pass validation and then
         * fail at SaveChanges as a 500 — a server error for what is really a
         * "that is too long" message.
         */
        foreach (var (key, value) in values)
        {
            if (value is { Length: > MaxSettingLength })
            {
                return WriteResult<AdminSiteSettingsDto>.Invalid(
                    key == Keys.SocialLinks ? nameof(dto.SocialLinks) : key,
                    "That is longer than we can store. Shorten it, or remove an entry.");
            }
        }

        var existing = await db.SiteSettings.ToDictionaryAsync(s => s.Key, ct);

        foreach (var (key, value) in values)
        {
            if (value is null)
            {
                // Clearing removes the row entirely, so "not supplied" stays a
                // genuine absence rather than an empty string the UI has to
                // special-case.
                if (existing.TryGetValue(key, out var toRemove)) db.SiteSettings.Remove(toRemove);
                continue;
            }

            if (existing.TryGetValue(key, out var setting))
            {
                setting.Value = value;
            }
            else
            {
                db.SiteSettings.Add(new SiteSetting { Key = key, Value = value });
            }
        }

        await db.SaveChangesAsync(ct);
        contentVersion.Bump();

        logger.LogInformation("Site settings updated.");
        return WriteResult<AdminSiteSettingsDto>.Success(await GetAsync(ct));
    }

    internal static IReadOnlyList<OfficeHoursDto> ParseOfficeHours(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];

        try
        {
            return JsonSerializer.Deserialize<List<OfficeHoursDto>>(json, JsonSerializerOptions.Web) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    internal static IReadOnlyList<SocialLinkDto> ParseSocialLinks(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];

        try
        {
            return JsonSerializer.Deserialize<List<SocialLinkDto>>(json, JsonSerializerOptions.Web) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    /// <summary>Matches SiteSettingConfiguration's column length exactly.</summary>
    private const int MaxSettingLength = 4000;

    /// <summary>
    /// A deliberately forgiving check: something before an @, something after
    /// it, a dot in the domain, and no whitespace.
    ///
    /// Full RFC 5322 validation rejects addresses that genuinely work, and the
    /// only way to truly verify an address is to send to it. This catches the
    /// typo — a missing @, a stray space — and lets everything else through.
    /// </summary>
    private static bool IsPlausibleEmail(string value)
    {
        if (value.Any(char.IsWhiteSpace)) return false;

        var at = value.IndexOf('@');
        if (at <= 0 || at != value.LastIndexOf('@') || at == value.Length - 1) return false;

        var domain = value[(at + 1)..];
        var dot = domain.IndexOf('.');
        return dot > 0 && dot < domain.Length - 1;
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
