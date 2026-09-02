# Kellum's Second Chance Renovations

Marketing site and lead-capture application for a residential renovation company.

## Brand message hierarchy

- **Homeowner promise:** “Your home deserves a second chance.”
- **Master brand idea:** “Second chances are what we build.”
- **Human mission:** “Homes deserve second chances. People do too.”

The name carries two connected commitments: restoring homes with professional
craftsmanship and seeing the potential in people who are ready to work, learn
and build what comes next. Quality, accountability and opportunity reinforce
one another; the mission never lowers the standard brought into a customer’s home.

---

## What is in here

| Project | What it is |
| --- | --- |
| `kellumssecondchance.client` | React 19 + TypeScript + Vite 8 SPA. CSS Modules, no UI framework. |
| `KellumsSecondChance.Server` | ASP.NET Core 10 Web API, EF Core 10, SQL Server, ASP.NET Core Identity. |
| `KellumsSecondChance.Server.Tests` | xUnit unit and integration tests. |

The server also hosts the built SPA, so everything is same-origin in production —
no CORS, and no API base URL in the client bundle.

---

## Running it

### 1. Database

A connection string is **not committed**. Development falls back to LocalDB.
For anything else, set it out of band:

```bash
dotnet user-secrets set "ConnectionStrings:KellumsDatabase" "<your connection string>" --project KellumsSecondChance.Server
```

Apply the schema. **This has deliberately not been run for you.**

```bash
dotnet ef database update --project KellumsSecondChance.Server
```

There are three migrations, applied in order:

| Migration | What it does |
| --- | --- |
| `InitialKellumsSchema` | Creates 16 tables (9 application tables plus the 7 ASP.NET Identity tables) and 23 indexes. No seed data. |
| `AdminCmsOperationalPhase` | **Additive only.** Adds the `EstimateRequestNotes` and `EstimateRequestStatusHistory` tables, four upload columns on `RenovationProjectImages`, a `rowversion` column on `RenovationProjects`, `RenovationServices`, `FaqItems` and `EstimateRequests`, and widens `SiteSettings.Value` from 1000 to 4000 characters. Drops nothing and truncates nothing. |
| `AddEmploymentInterests` | **Additive only.** Adds the private `EmploymentInterests` table and its status/date and anti-spam indexes. It does not alter existing tables. |

### 2. Sample content

`Seed:Enabled` is `true` in Development. On startup the seeder fills any table
that is **empty** with the demonstration catalogue. It never overwrites existing
rows and never applies migrations.

### 3. An administrator account

There is no public registration. Create the first account from configuration:

```bash
dotnet user-secrets set "Seed:AdminEmail" "you@example.com" --project KellumsSecondChance.Server
dotnet user-secrets set "Seed:AdminPassword" "<a strong password>" --project KellumsSecondChance.Server
```

Passwords must be 12+ characters with upper, lower, digit and symbol. If no
password is configured, no account is created and `/admin` stays inaccessible —
which is the correct default.

### 4. Run

```bash
dotnet run --project KellumsSecondChance.Server
```

Visual Studio starts the Vite dev server automatically via SpaProxy. To run the
client alone:

```bash
npm install --prefix kellumssecondchance.client
npm run dev --prefix kellumssecondchance.client
```

---

## The admin console

`/admin` is a working CMS, not a read-only viewer. Everything a renovation
business needs to run the site day to day is editable there, with no code change
and no redeploy.

| Screen | What it does |
| --- | --- |
| Dashboard | Lead pipeline counts, the latest requests, and **Needs your attention** — every reason something is not on the website, each with a link to the screen that fixes it. |
| Estimate requests | Search and filter every lead; open one to call or email the customer, record dated notes, and move it through the pipeline. Stage changes are logged with who and when. |
| Work enquiries | Review preliminary employment-interest messages, contact the sender, add private notes, and move the enquiry through a small triage workflow. |
| Projects | Full case-study editor, plus photo upload, ordering, cover selection and before/after pairing. |
| Services | The service catalogue. A service still used by a project cannot be deleted — switch it off instead. |
| Reviews | Real customer quotes. Seeded examples stay labelled as examples and are excluded from review markup. |
| Questions | The FAQ, including the ones held back until the business decides an answer. |
| Service areas | Where Kellum's works. Editing a placeholder turns it into a real entry. |
| Business details | Phone, email, address, licensing, insurance, founding year, domain, sharing image and social profiles. |

Two behaviours worth knowing:

- **Nothing is invented.** A blank field is omitted from the public site
  entirely — including trading hours, which are now entered under Business
  details rather than shipped as a plausible-looking default. Filling it in is all it takes for the corresponding element to
  appear — across the header, footer, contact page, mobile call bar and the
  structured data search engines read.
- **Held-back questions stay held back.** A FAQ marked `NeedsReview` is kept off
  the site and out of FAQ markup, and the gate can only be cleared by writing a
  real answer. The server enforces that, not just the console.

### Uploaded imagery

Project photographs, service-page photographs and the social sharing card are
all written to `MediaStorage:RootPath` (default `wwwroot/uploads`) and served
from `/uploads`.

- Format is decided by reading the file's own bytes — never its name and never
  the browser's `Content-Type`. JPEG, PNG and WebP only.
- **SVG is refused.** It is a script-capable document; serving a user-uploaded
  one from this origin would be stored XSS.
- Stored filenames are random. Nothing the client sends ever becomes a path.
- Point `MediaStorage:RootPath` at a directory **outside** the deployment folder
  if photographs should survive a redeploy.

### Lead notifications

There is **no email provider configured**. `INotificationSender` writes to the
application log and reports honestly that nothing was transmitted — it never
claims a message was sent. Adding real delivery means replacing that one
interface; `Notifications:EstimateRequestRecipients` is already read.

---

## Brand assets

The supplied Kellum's artwork lives in `Graphics/` (originals) and is installed
into the app at `kellumssecondchance.client/public/brand/`:

| File | What it is | Used for |
| --- | --- | --- |
| `kellums-logo-lockup.png` | Gable + house + "Second Chance" + "Kellums Renovations" | Header, footer, error page |
| `kellums-mark.png` | The house glyph alone | Favicon, admin bar, 404 |
| `kellums-logo-full.jpg` | The lockup plus "Free Estimates" and a phone number | Reference/print only — a phone number baked into an image cannot be updated from configuration, so the site does not use it |

**All supplied artwork is solid black with no reversed variant.** On dark surfaces
the mark is therefore set on a bone plate rather than recoloured. If a white
version is supplied later, add it and the plate treatment can be dropped —
see the comment at the top of `src/components/brand/Logo.tsx`.

---

## Content honesty rules

This site is built to a strict rule: **it never publishes a fact the business has
not supplied.**

- Unsupplied values (`phone`, `email`, `address`, `licensing`, `foundedYear`)
  are `null`. The UI **omits** those elements rather than showing a placeholder.
  There is no fake phone number anywhere.
- Seeded projects, reviews and service areas carry `IsSampleContent` and are
  visibly labelled by `<SampleContentNotice>`.
- `reviewSchema()` returns `null` — emitting no review structured data at all —
  if **any** displayed review is sample content. A fabricated `aggregateRating`
  is a claim to search engines, not just to readers.
- FAQ answers that depend on an unset business policy are seeded with a `null`
  answer and a staff-only `ReviewNote`. They are `NeedsReview`: withheld from the
  public FAQ **and** from FAQ structured data, and visible only in `/admin/faqs`.

### Where the business facts actually live

**In the database, edited at `/admin/site-settings`.** That is the single source
of truth at runtime: phone, email, address, licensing, insurance, founding year,
domain, sharing image and social profiles all come from the `SiteSettings` table
via `GET /api/site-content`, and reach components through `useSiteContent()`.

`src/content/business.ts` is now two things only: brand constants (the legal
name, the tagline, the promise, the calls to action) and the compile-time
defaults the site falls back to before the first API response and when the API
is unreachable. The database always wins where it holds a value.

Everything still outstanding is listed on the dashboard under **Needs your
attention**, with a link to the field. The greppable marker survives for CI:

```bash
grep -rn "NEEDS_BUSINESS_INPUT" kellumssecondchance.client/src
```

The one item that is prose rather than data — owner and crew details — is in the
"The people" section of `src/pages/AboutPage.tsx`.

---

## Photography

`public/media` holds **generated architectural SVG renderings**, not photographs.
They exist so layouts can be judged with realistic tone and composition.

```bash
npm run generate:media --prefix kellumssecondchance.client
```

To go live: drop real images into `public/media` at the same paths, update the
pixel dimensions and alt text in `src/content/media.ts`, and set `isSampleContent`
to false on the project records so the "example write-ups" label disappears.

Project photographs uploaded through `/admin/projects` do not go here at all —
they are stored under `MediaStorage:RootPath` and served from `/uploads`.

The social sharing image is separate again: supply a 1200×630 **PNG or JPG**
(not SVG — platforms do not render it), put it in `public/brand/`, and enter its
path under **Business details** in the console. While it is unset the site omits
`og:image` and `twitter:image` entirely rather than advertising a URL that 404s.

---

## Commands

```bash
# Frontend
npm run typecheck --prefix kellumssecondchance.client
npm run lint --prefix kellumssecondchance.client
npm run test --prefix kellumssecondchance.client
npm run build --prefix kellumssecondchance.client

# Backend
dotnet build
dotnet test
```

---

## Configuration reference

| Key | Purpose |
| --- | --- |
| `ConnectionStrings:KellumsDatabase` | SQL Server connection. Never commit with credentials. |
| `Business:*` | Fallbacks only. The `SiteSettings` table — written by `/admin/site-settings` — takes precedence. |
| `MediaStorage:RootPath` | Where uploaded project photographs are written. Empty means `wwwroot/uploads`. Point it outside the deployment folder to survive a redeploy. |
| `MediaStorage:PublicPathPrefix` | URL prefix the media root is served from. Default `uploads`. |
| `MediaStorage:MaxUploadMegabytes` | Per-file upload ceiling. Default 12. |
| `Notifications:EstimateRequestRecipients` | Who should be told about a new lead, once a delivery provider exists. |
| `Notifications:AdminBaseUrl` | Absolute origin for deep links into the console. Falls back to the request's origin. |
| `AntiSpam:IpHashSalt` | **Must** be overridden per environment. Salts the submitter IP hash. |
| `AntiSpam:MinimumFillMilliseconds` | Rejects submissions completed faster than a human could. |
| `AntiSpam:MaxSubmissionsPerWindow` | Per-source burst limit, on top of the endpoint rate limiter. |
| `Seed:Enabled` | Fill empty tables with the sample catalogue. Off by default. |
| `Seed:AdminEmail` / `Seed:AdminPassword` | Initial administrator. Secrets only. |
| `VITE_CONTENT_FALLBACK` | Client: fall back to bundled sample content when a read fails. On in dev, off in production builds. |
