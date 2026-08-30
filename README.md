# Kellum's Second Chance Renovations

Marketing site and lead-capture application for a residential renovation company.

**"We give homes a second chance."**

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

The migration is `InitialKellumsSchema`. It creates 16 tables (9 application
tables plus the 7 ASP.NET Identity tables) and 23 indexes. It contains **no**
seed data.

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

## Content honesty rules

This site is built to a strict rule: **it never publishes a fact the business has
not supplied.**

- Unsupplied values (`phone`, `email`, `address`, `licensing`, `foundedYear`) are
  `null` in `src/content/business.ts`. The UI **omits** those elements rather
  than showing a placeholder. There is no fake phone number anywhere.
- Seeded projects, reviews and service areas carry `IsSampleContent` and are
  visibly labelled by `<SampleContentNotice>`.
- `reviewSchema()` returns `null` — emitting no review structured data at all —
  if **any** displayed review is sample content. A fabricated `aggregateRating`
  is a claim to search engines, not just to readers.
- FAQ answers that need a business decision are marked `CONFIRM:` in the text.

Find every open item:

```bash
grep -rn "NEEDS_BUSINESS_INPUT\|CONFIRM:" kellumssecondchance.client/src KellumsSecondChance.Server
```

---

## Photography

`public/media` holds **generated architectural SVG renderings**, not photographs.
They exist so layouts can be judged with realistic tone and composition.

```bash
npm run generate:media --prefix kellumssecondchance.client
```

To go live: drop real images into `public/media` at the same paths, update the
pixel dimensions and alt text in `src/content/media.ts`, and — importantly —
replace the Open Graph image with a real 1200×630 PNG or JPG. Social platforms
do not render SVG previews.

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
| `Business:*` | Phone, email, address, licensing, social links. Overridden by the `SiteSettings` table. |
| `AntiSpam:IpHashSalt` | **Must** be overridden per environment. Salts the submitter IP hash. |
| `AntiSpam:MinimumFillMilliseconds` | Rejects submissions completed faster than a human could. |
| `AntiSpam:MaxSubmissionsPerWindow` | Per-source burst limit, on top of the endpoint rate limiter. |
| `Seed:Enabled` | Fill empty tables with the sample catalogue. Off by default. |
| `Seed:AdminEmail` / `Seed:AdminPassword` | Initial administrator. Secrets only. |
| `VITE_CONTENT_FALLBACK` | Client: fall back to bundled sample content when a read fails. On in dev, off in production builds. |
