# Kellum's production deployment checklist

Target: Windows Server with IIS and the ASP.NET Core Module. Secrets belong in
IIS environment configuration or another protected configuration provider,
never in committed JSON or the React bundle.

## Required configuration

- `ASPNETCORE_ENVIRONMENT=Production`
- `ConnectionStrings__KellumsDatabase` — must target the `KSC-Prod` database. There
  is no fallback: startup fails if this is missing. Development uses User Secrets
  and targets `KSC-Dev`; the two never share a value.
- `Production__SiteUrl` — authoritative public HTTPS origin
- `Production__DataProtectionKeyPath` — durable directory outside the publish tree
- `Production__DataProtectionApplicationName=KellumsSecondChance`
- `Production__GoogleSiteVerification` — optional public Search Console verification token
- `Production__BingSiteVerification` — optional public Bing Webmaster verification token
- `MediaStorage__RootPath` — durable upload directory outside the publish tree
- `AntiSpam__IpHashSalt` — unique secret value
- `EmailNotifications__Enabled=true`
- `EmailNotifications__FromName=Kellum's Second Chance Renovations`
- `EmailNotifications__FromAddress` — sender on a domain verified in Resend
- `EmailNotifications__NotificationAddress` — business inbox for all three forms
- `EmailNotifications__ResendApiKey` — secret; configure only in IIS/environment settings
- `EmailNotifications__AdminBaseUrl` — normally the same origin as `Production__SiteUrl`

Runtime business values remain CMS-owned rather than deployment secrets. In
`/admin/site-settings`, confirm the public business name and enter only verified
phone, email, address, hours, licensing, insurance, social profiles, default
social image, and HTTPS Google Review URL. Leave unknown values blank. Confirm
real service areas under `/admin/service-areas`, and deactivate every candidate
service, sample project, sample testimonial, or placeholder service area that is
not approved for launch.

Grant the IIS App Pool identity read/write access only to the configured media
and Data Protection directories. Back up SQL Server and uploaded media. Back up
Data Protection keys when preserving existing admin sessions across recovery is
important; protect the backup as authentication material. The application does
not expose these physical paths.

## Deployment

1. Install the matching .NET Hosting Bundle.
2. Create the IIS site/app pool and configure the production environment.
3. Add the HTTPS certificate and binding; redirect HTTP to HTTPS upstream.
4. Configure SQL, authoritative site URL, durable media, Data Protection, SMTP,
   recipients, and the anti-spam salt.
5. Grant least-privilege filesystem access to the App Pool identity.
6. Back up the database and durable media.
7. Manually review and apply pending EF migrations. The application never does this.
8. Publish without replacing the durable media or key directories.
9. Recycle the App Pool and verify `/health/live` and `/health/ready`.
10. Verify admin login survives a recycle.
11. Submit a test estimate and work enquiry; confirm database records exist and
    distinct internal emails arrive with HTTPS admin links.
12. Verify project upload, media survival, canonical/OG metadata, structured
    data, `/sitemap.xml`, `/robots.txt`, and a real production 404.
13. Submit the sitemap to Google Search Console and Bing Webmaster Tools after
    ownership verification is configured. No verification codes are committed.

## Failure expectations

- SQL unavailable: readiness is unhealthy; writes fail honestly and no email is sent.
- SMTP unavailable after a save: the record remains saved, the public response
  remains successful, and only the opaque record reference is logged with the failure.
- Media directory unwritable: upload fails before a database media row is committed;
  existing public content remains available.
- Data Protection directory unwritable: production startup/configuration must be
  treated as failed; do not fall back to ephemeral keys.
- Missing social image, analytics, reviews URL, phone, hours, address, or service
  area: dependent UI/schema is omitted rather than fabricated.

Manually optimized JPEG, PNG, and WebP are launch-acceptable. Automatic AVIF/WebP
generation is intentionally deferred until a secure, operationally justified
Windows image pipeline is selected.

## Attribution and analytics

The browser stores the first landing path, external referrer, and bounded UTM
labels in session storage and attaches them only to an estimate enquiry. Later
campaign parameters do not overwrite that first touch. No names, contact details,
addresses, or free-text form answers are analytics properties.

`VITE_ANALYTICS_PROVIDER` enables only the small provider-neutral event seam; no
vendor script is shipped by default. A future provider adapter must keep the same
no-PII contract and should be reviewed for consent requirements before activation.

Crawler-specific blocking and `llms.txt` are intentionally deferred: there is no
clear evidence that either improves discovery for this business today. Public
crawlers receive the ordinary site and robots rules; authorization, not robots,
protects private data.
