using KellumsSecondChance.Server.Configuration;
using KellumsSecondChance.Server.Dtos;
using KellumsSecondChance.Server.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace KellumsSecondChance.Server.Tests;

/// <summary>
/// The business profile, and the omit-rather-than-fake rule it exists to keep.
///
/// The whole site is built on "unsupplied means the element is not rendered".
/// That only holds if clearing a field really does return it to unsupplied —
/// an empty string stored in the table would put an empty tel: link in the
/// header, which is exactly the failure the rule exists to prevent.
/// </summary>
public class SiteSettingsWriteServiceTests : IDisposable
{
    private readonly TestDatabase _fixture = new();
    private readonly FakeContentVersion _version = new();
    private readonly SiteSettingsWriteService _settings;
    private readonly SiteContentService _publicContent;

    private static readonly BusinessOptions Business = new()
    {
        BusinessName = "Kellum’s Second Chance Renovations",
        Tagline = "Your home deserves a second chance.",
    };

    public SiteSettingsWriteServiceTests()
    {
        _settings = new SiteSettingsWriteService(
            _fixture.Db,
            _version,
            TestEnvironment.Development,
            NullLogger<SiteSettingsWriteService>.Instance);

        _publicContent = new SiteContentService(_fixture.Db, Options.Create(Business));
    }

    public void Dispose() => _fixture.Dispose();

    private static SiteSettingsWriteDto Filled() => new()
    {
        BusinessName = "Kellum’s Second Chance Renovations",
        Tagline = "Your home deserves a second chance.",
        PhoneDisplay = "(513) 620-0130",
        PhoneE164 = "+15136200130",
        Email = "hello@example.com",
        AddressLine1 = "12 Example Street",
        AddressLocality = "Example City",
        AddressRegion = "OH",
        AddressPostalCode = "45001",
        PublishAddress = true,
        Licensing = "Ohio registered contractor #123456",
        Insurance = "Fully insured — certificate on request",
        FoundedYear = 2011,
        SiteUrl = "https://www.example.com",
        OgImagePath = "/brand/social-card.png",
    };

    /* ==================================================================== */
    /*  Round trip                                                          */
    /* ==================================================================== */

    [Fact]
    public async Task Everything_starts_unsupplied()
    {
        var profile = await _settings.GetAsync();

        Assert.Null(profile.PhoneDisplay);
        Assert.Null(profile.Email);
        Assert.Null(profile.AddressLine1);
        Assert.Null(profile.Licensing);
        Assert.Null(profile.FoundedYear);
        Assert.Null(profile.SiteUrl);
        Assert.Null(profile.OgImagePath);
        Assert.Null(profile.GoogleReviewUrl);
        Assert.Empty(profile.SocialLinks);
    }

    [Fact]
    public async Task Google_review_url_is_optional_and_https_only()
    {
        var insecure = Filled();
        insecure.GoogleReviewUrl = "http://google.example/review";
        Assert.False((await _settings.SaveAsync(insecure)).Ok);

        var secure = Filled();
        secure.GoogleReviewUrl = "https://g.page/r/example/review";
        Assert.True((await _settings.SaveAsync(secure)).Ok);
        Assert.Equal(secure.GoogleReviewUrl, (await _publicContent.GetAsync()).GoogleReviewUrl);

        secure.GoogleReviewUrl = null;
        Assert.True((await _settings.SaveAsync(secure)).Ok);
        Assert.Null((await _publicContent.GetAsync()).GoogleReviewUrl);
    }

    [Fact]
    public async Task Saving_and_reading_back_returns_exactly_what_was_entered()
    {
        var result = await _settings.SaveAsync(Filled());

        Assert.True(result.Ok);
        var profile = result.Value!;
        Assert.Equal("(513) 620-0130", profile.PhoneDisplay);
        Assert.Equal("+15136200130", profile.PhoneE164);
        Assert.Equal("hello@example.com", profile.Email);
        Assert.Equal(2011, profile.FoundedYear);
        Assert.Equal("https://www.example.com", profile.SiteUrl);
        Assert.Equal(1, _version.Bumps);
    }

    [Fact]
    public async Task Clearing_a_field_removes_the_row_rather_than_storing_a_blank()
    {
        await _settings.SaveAsync(Filled());

        var cleared = Filled();
        cleared.PhoneDisplay = "   ";
        cleared.PhoneE164 = "";
        await _settings.SaveAsync(cleared);

        var profile = await _settings.GetAsync();
        Assert.Null(profile.PhoneDisplay);
        Assert.Null(profile.PhoneE164);

        // An empty string in the table would produce an empty tel: link.
        var rows = await _fixture.Db.SiteSettings.Select(s => s.Key).ToListAsync();
        Assert.DoesNotContain("business.phone.display", rows);
        Assert.DoesNotContain("business.phone.e164", rows);
    }

    /* ==================================================================== */
    /*  Cross-field rules                                                   */
    /* ==================================================================== */

    [Fact]
    public async Task A_phone_number_needs_both_halves_or_neither()
    {
        var displayOnly = Filled();
        displayOnly.PhoneE164 = null;

        var result = await _settings.SaveAsync(displayOnly);

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.Validation, result.Failure);
        Assert.Equal(nameof(SiteSettingsWriteDto.PhoneE164), result.Field);
    }

    [Fact]
    public async Task Both_phone_fields_blank_is_perfectly_valid()
    {
        var none = Filled();
        none.PhoneDisplay = null;
        none.PhoneE164 = null;

        var result = await _settings.SaveAsync(none);

        Assert.True(result.Ok);
        Assert.Null(result.Value!.PhoneDisplay);
    }

    [Theory]
    [InlineData("example.com")]
    [InlineData("www.example.com")]
    [InlineData("ftp://example.com")]
    [InlineData("javascript:alert(1)")]
    public async Task A_website_address_has_to_be_a_real_http_url(string candidate)
    {
        var dto = Filled();
        dto.SiteUrl = candidate;

        var result = await _settings.SaveAsync(dto);

        Assert.False(result.Ok);
        Assert.Equal(nameof(SiteSettingsWriteDto.SiteUrl), result.Field);
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("a@")]
    [InlineData("@example.com")]
    [InlineData("a b@example.com")]
    [InlineData("someone@")]
    public async Task An_address_that_is_not_an_email_is_refused(string candidate)
    {
        var dto = Filled();
        dto.Email = candidate;

        var result = await _settings.SaveAsync(dto);

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.Validation, result.Failure);
        Assert.Equal(nameof(SiteSettingsWriteDto.Email), result.Field);
    }

    [Fact]
    public async Task A_valid_email_is_accepted_and_reaches_the_public_endpoint()
    {
        var dto = Filled();
        dto.Email = "  Hello@Example.com  ";

        var result = await _settings.SaveAsync(dto);

        Assert.True(result.Ok);
        Assert.Equal("Hello@Example.com", result.Value!.Email);
        Assert.Equal("Hello@Example.com", (await _publicContent.GetAsync()).Email);
    }

    [Fact]
    public async Task Plain_http_is_allowed_in_development_and_refused_in_production()
    {
        var dto = Filled();
        dto.SiteUrl = "http://localhost:5173";

        // Development runs on http://localhost, so refusing it there would make
        // the field unusable in the environment it is most often edited in.
        Assert.True((await _settings.SaveAsync(dto)).Ok);

        var production = new SiteSettingsWriteService(
            _fixture.Db,
            _version,
            TestEnvironment.Production,
            NullLogger<SiteSettingsWriteService>.Instance);

        var refused = await production.SaveAsync(dto);

        Assert.False(refused.Ok);
        Assert.Equal(nameof(SiteSettingsWriteDto.SiteUrl), refused.Field);
        Assert.Contains("https://", refused.Message);
    }

    [Fact]
    public async Task An_http_social_profile_is_refused_in_every_environment()
    {
        // Every platform these point at is https-only, so http is a typo — and
        // these addresses are declared to search engines as official accounts.
        var dto = Filled();
        dto.SocialLinks =
        [
            new SocialLinkWriteDto { Label = "Facebook", Href = "http://facebook.example/x", Icon = "facebook" },
        ];

        var result = await _settings.SaveAsync(dto);

        Assert.False(result.Ok);
        Assert.Equal(nameof(SiteSettingsWriteDto.SocialLinks), result.Field);
    }

    [Fact]
    public async Task The_largest_payload_the_form_allows_still_fits_the_column()
    {
        /*
         * Eight social profiles at their maximum field lengths is the biggest
         * value this screen can produce. It has to be storable — the column was
         * raised from 1000 to 4000 precisely because it was not, and a payload
         * the validator accepts must never fail at SaveChanges as a 500.
         */
        var dto = Filled();
        dto.SocialLinks = Enumerable.Range(0, 8)
            .Select(i => new SocialLinkWriteDto
            {
                Label = new string('L', 60),
                Href = "https://example.test/" + new string('p', 270) + i,
                Icon = new string('i', 40),
            })
            .ToList();

        var result = await _settings.SaveAsync(dto);

        Assert.True(result.Ok, result.Message);
        Assert.Equal(8, result.Value!.SocialLinks.Count);
    }

    [Fact]
    public async Task A_value_beyond_the_column_is_a_validation_failure_not_a_server_error()
    {
        var dto = Filled();
        dto.ServiceAreaSummary = new string('x', 5000);

        var result = await _settings.SaveAsync(dto);

        Assert.False(result.Ok);
        Assert.Equal(WriteFailure.Validation, result.Failure);
    }

    /* ==================================================================== */
    /*  Trading hours                                                       */
    /* ==================================================================== */

    [Fact]
    public async Task No_trading_hours_are_published_until_somebody_enters_them()
    {
        // The footer and contact page used to print invented opening times.
        // Nothing supplies them now except this field.
        Assert.Empty((await _publicContent.GetAsync()).OfficeHours);
        Assert.Empty((await _settings.GetAsync()).OfficeHours);
    }

    [Fact]
    public async Task Entered_trading_hours_reach_the_public_endpoint()
    {
        var dto = Filled();
        dto.OfficeHours =
        [
            new OfficeHoursWriteDto { Label = "Monday – Friday", Hours = "7:00 AM – 5:00 PM" },
            new OfficeHoursWriteDto { Label = "Saturday", Hours = "By appointment" },
        ];

        var result = await _settings.SaveAsync(dto);

        Assert.True(result.Ok);
        var published = await _publicContent.GetAsync();
        Assert.Equal(2, published.OfficeHours.Count);
        Assert.Equal("Monday – Friday", published.OfficeHours[0].Label);
    }

    [Fact]
    public async Task A_half_filled_hours_line_is_dropped_rather_than_published_blank()
    {
        var dto = Filled();
        dto.OfficeHours =
        [
            new OfficeHoursWriteDto { Label = "Saturday", Hours = "By appointment" },
            new OfficeHoursWriteDto { Label = "Sunday", Hours = "   " },
        ];

        await _settings.SaveAsync(dto);

        var line = Assert.Single((await _publicContent.GetAsync()).OfficeHours);
        Assert.Equal("Saturday", line.Label);
    }

    [Fact]
    public async Task A_trailing_slash_is_stripped_from_the_website_address()
    {
        // Canonical URLs are built by concatenation; a trailing slash here would
        // produce "https://example.com//projects".
        var dto = Filled();
        dto.SiteUrl = "https://www.example.com/";

        var result = await _settings.SaveAsync(dto);

        Assert.True(result.Ok);
        Assert.Equal("https://www.example.com", result.Value!.SiteUrl);
    }

    [Fact]
    public async Task An_svg_is_refused_as_a_sharing_image()
    {
        // No social platform renders an SVG preview, so accepting one would
        // guarantee a broken card on every share.
        var dto = Filled();
        dto.OgImagePath = "/brand/card.svg";

        var result = await _settings.SaveAsync(dto);

        Assert.False(result.Ok);
        Assert.Equal(nameof(SiteSettingsWriteDto.OgImagePath), result.Field);
        Assert.Contains("SVG", result.Message);
    }

    [Theory]
    [InlineData("brand/card.png")]
    [InlineData("https://elsewhere.example/card.png")]
    public async Task A_sharing_image_has_to_be_a_path_on_this_site(string candidate)
    {
        var dto = Filled();
        dto.OgImagePath = candidate;

        var result = await _settings.SaveAsync(dto);

        Assert.False(result.Ok);
        Assert.Equal(nameof(SiteSettingsWriteDto.OgImagePath), result.Field);
    }

    [Fact]
    public async Task A_social_profile_needs_a_full_web_address()
    {
        var dto = Filled();
        dto.SocialLinks = [new SocialLinkWriteDto { Label = "Facebook", Href = "facebook.com/x", Icon = "facebook" }];

        var result = await _settings.SaveAsync(dto);

        Assert.False(result.Ok);
        Assert.Equal(nameof(SiteSettingsWriteDto.SocialLinks), result.Field);
    }

    [Fact]
    public async Task Social_profiles_round_trip_as_json()
    {
        var dto = Filled();
        dto.SocialLinks =
        [
            new SocialLinkWriteDto { Label = "Facebook", Href = "https://facebook.example/kellums", Icon = "facebook" },
            new SocialLinkWriteDto { Label = "Instagram", Href = "https://instagram.example/kellums", Icon = "instagram" },
        ];

        var result = await _settings.SaveAsync(dto);

        Assert.True(result.Ok);
        Assert.Equal(2, result.Value!.SocialLinks.Count);
        Assert.Equal("Facebook", result.Value.SocialLinks[0].Label);
    }

    /* ==================================================================== */
    /*  What the public site actually receives                              */
    /* ==================================================================== */

    [Fact]
    public async Task The_address_is_withheld_until_the_business_chooses_to_publish_it()
    {
        var dto = Filled();
        dto.PublishAddress = false;
        await _settings.SaveAsync(dto);

        var published = await _publicContent.GetAsync();

        // Recorded for the owner's reference; absent from every public surface,
        // including the PostalAddress node in structured data.
        Assert.Null(published.AddressLine1);
        Assert.Null(published.AddressLocality);
        Assert.Null(published.AddressPostalCode);

        var held = await _settings.GetAsync();
        Assert.Equal("12 Example Street", held.AddressLine1);
    }

    [Fact]
    public async Task Turning_the_publish_toggle_on_releases_the_address()
    {
        await _settings.SaveAsync(Filled());

        var published = await _publicContent.GetAsync();

        Assert.Equal("12 Example Street", published.AddressLine1);
        Assert.Equal("Example City", published.AddressLocality);
        Assert.Equal("OH", published.AddressRegion);
        Assert.Equal("45001", published.AddressPostalCode);
    }

    [Fact]
    public async Task A_saved_phone_number_reaches_the_public_endpoint()
    {
        // The point of the whole screen: an owner types a number in a browser
        // and the website gains a call button, with no rebuild.
        var before = await _publicContent.GetAsync();
        Assert.Null(before.PhoneDisplay);

        await _settings.SaveAsync(Filled());

        var after = await _publicContent.GetAsync();
        Assert.Equal("(513) 620-0130", after.PhoneDisplay);
        Assert.Equal("+15136200130", after.PhoneE164);
    }

    [Fact]
    public async Task A_social_link_that_is_not_absolute_never_reaches_the_public_endpoint()
    {
        /*
         * Defence in depth. SaveAsync already refuses these, but rows can also
         * arrive from a seed or a direct database edit, and a relative href in
         * `sameAs` would be a broken claim to a search engine.
         */
        _fixture.Db.SiteSettings.Add(new Domain.Entities.SiteSetting
        {
            Key = "business.socialLinks",
            Value =
                "[{\"label\":\"Facebook\",\"href\":\"/not-absolute\",\"icon\":\"facebook\"},"
                + "{\"label\":\"Instagram\",\"href\":\"https://instagram.example/x\",\"icon\":\"instagram\"}]",
        });
        await _fixture.Db.SaveChangesAsync();

        var published = await _publicContent.GetAsync();

        var link = Assert.Single(published.SocialLinks);
        Assert.Equal("Instagram", link.Label);
    }

    [Fact]
    public async Task Unparseable_social_json_degrades_to_no_links_rather_than_throwing()
    {
        _fixture.Db.SiteSettings.Add(new Domain.Entities.SiteSetting
        {
            Key = "business.socialLinks",
            Value = "{ this is not json",
        });
        await _fixture.Db.SaveChangesAsync();

        var published = await _publicContent.GetAsync();

        Assert.Empty(published.SocialLinks);
    }

    [Fact]
    public async Task The_public_endpoint_still_names_the_business_when_nothing_is_set()
    {
        // Name and tagline are the two fields that must never be blank: they
        // fall back to configuration rather than rendering an empty header.
        var published = await _publicContent.GetAsync();

        Assert.Equal("Kellum’s Second Chance Renovations", published.BusinessName);
        Assert.Equal("Your home deserves a second chance.", published.Tagline);
    }
}
