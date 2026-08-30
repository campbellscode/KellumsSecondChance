using System.ComponentModel.DataAnnotations;

namespace KellumsSecondChance.Server.Configuration;

/// <summary>
/// Business facts served to the client through /api/site-content.
///
/// Every value is optional and defaults to null. The public site hides any
/// element whose value is missing rather than showing a placeholder, so an
/// unconfigured deployment never publishes a fabricated phone number or address.
///
/// Bound from the "Business" configuration section; values in the SiteSettings
/// table override these at runtime.
/// </summary>
public class BusinessOptions
{
    public const string SectionName = "Business";

    public string BusinessName { get; set; } = "Kellum’s Second Chance Renovations";

    public string Tagline { get; set; } = "Your home deserves a second chance.";

    /// <summary>Human display form, e.g. "(555) 123-4567".</summary>
    public string? PhoneDisplay { get; set; }

    /// <summary>E.164 form used for tel: links, e.g. "+15551234567".</summary>
    public string? PhoneE164 { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    public string? ServiceAreaSummary { get; set; }

    public string? Licensing { get; set; }

    public string? Insurance { get; set; }

    public int? FoundedYear { get; set; }

    public string? AddressLocality { get; set; }

    public string? AddressRegion { get; set; }

    public List<SocialLinkOptions> SocialLinks { get; set; } = [];
}

public class SocialLinkOptions
{
    public string Label { get; set; } = string.Empty;

    public string Href { get; set; } = string.Empty;

    public string Icon { get; set; } = "facebook";
}

/// <summary>Tuning for the public form's abuse defences.</summary>
public class AntiSpamOptions
{
    public const string SectionName = "AntiSpam";

    /// <summary>
    /// Salt for the submitter IP hash.
    ///
    /// MUST be overridden per environment (user secrets, environment variable or
    /// a secret store). The default here is not a secret and is only adequate
    /// for local development.
    /// </summary>
    public string IpHashSalt { get; set; } = "kellums-local-development-salt";

    /// <summary>A human cannot complete four steps of a form faster than this.</summary>
    [Range(0, 60_000)]
    public int MinimumFillMilliseconds { get; set; } = 3000;

    /// <summary>Submissions allowed from one source per <see cref="Window"/>. 0 disables.</summary>
    [Range(0, 100)]
    public int MaxSubmissionsPerWindow { get; set; } = 5;

    public TimeSpan Window { get; set; } = TimeSpan.FromHours(1);
}

/// <summary>
/// Controls the demonstration-content seeder.
///
/// Seeding is opt-in and never runs migrations. Applying migrations stays a
/// manual, deliberate operation.
/// </summary>
public class SeedOptions
{
    public const string SectionName = "Seed";

    /// <summary>Insert the sample catalogue when the tables are empty.</summary>
    public bool Enabled { get; set; }

    /// <summary>Email for the initial administrator account. Null skips creation.</summary>
    [EmailAddress]
    public string? AdminEmail { get; set; }

    /// <summary>
    /// Password for the initial administrator.
    ///
    /// NEVER commit this. Supply it through user secrets or an environment
    /// variable (Seed__AdminPassword). Null skips account creation entirely.
    /// </summary>
    public string? AdminPassword { get; set; }

    public string? AdminDisplayName { get; set; }
}


/// <summary>Where uploaded project photography is stored and how it is served.</summary>
public class MediaStorageOptions
{
    public const string SectionName = "MediaStorage";

    /// <summary>
    /// Absolute path to the media root. Empty means "wwwroot/uploads" under the
    /// content root, which works for a standard IIS deployment.
    ///
    /// Point this at a path OUTSIDE the deployment folder if you want uploads to
    /// survive a redeploy.
    /// </summary>
    public string? RootPath { get; set; }

    /// <summary>Public URL prefix the media root is served from.</summary>
    public string PublicPathPrefix { get; set; } = "uploads";

    /// <summary>
    /// Per-file upload ceiling.
    ///
    /// Capped at 15 to stay under the fixed 16 MB request-size limit on the
    /// upload endpoints — a larger value here would be unreachable, because the
    /// request would be refused by the pipeline before this was ever consulted.
    /// </summary>
    [Range(1, 15)]
    public int MaxUploadMegabytes { get; set; } = 12;

    public long MaxUploadBytes => MaxUploadMegabytes * 1024L * 1024L;
}

/// <summary>
/// Where new-lead notifications should go, once a delivery provider exists.
///
/// No provider is configured in this build. See INotificationSender.
/// </summary>
public class NotificationOptions
{
    public const string SectionName = "Notifications";

    /// <summary>Addresses that should be told about a new estimate request.</summary>
    public List<string> EstimateRequestRecipients { get; set; } = [];

    /// <summary>
    /// Absolute base URL used to build the deep link into the admin console,
    /// e.g. "https://www.example.com". Falls back to the request's own origin.
    /// </summary>
    public string? AdminBaseUrl { get; set; }
}
