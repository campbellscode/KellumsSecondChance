using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Data.Seed;

/// <summary>
/// Confirmed public business content used only when the corresponding table is empty.
/// This catalogue contains no inferred methods, materials, warranties, credentials or policies.
/// </summary>
public static class ConfirmedBusinessContent
{
    public static List<ServiceArea> ServiceAreas() =>
    [
        Area(1, "Cincinnati, OH", ServiceAreaKind.City, true, "Our primary service area is Cincinnati, Ohio."),
        Area(2, "Hamilton County", ServiceAreaKind.County, true),
        Area(3, "Butler County", ServiceAreaKind.County, true),
        Area(4, "Clermont County", ServiceAreaKind.County, true),
        Area(5, "Warren County", ServiceAreaKind.County, true),
        Area(6, "Blue Ash", ServiceAreaKind.City, false),
        Area(7, "Norwood", ServiceAreaKind.City, false),
        Area(8, "Madeira", ServiceAreaKind.City, false),
        Area(9, "Montgomery", ServiceAreaKind.City, false),
        Area(10, "Sharonville", ServiceAreaKind.City, false),
        Area(11, "Loveland", ServiceAreaKind.City, false),
        Area(12, "Mason", ServiceAreaKind.City, false),
        Area(13, "Fairfield", ServiceAreaKind.City, false),
        Area(14, "Milford", ServiceAreaKind.City, false),
    ];

    public static List<FaqItem> Faqs() =>
    [
        Faq(1, "services", "Services", "What exterior renovation services do you provide?",
            "We provide roofing, siding, gutters and downspouts, decks, porches, windows, exterior doors, exterior painting, trim, fascia and soffit, exterior carpentry, storm-damage repair, rot and water-damage repair, exterior restoration, fences, patios, and concrete and masonry services."),
        Faq(2, "services", "Services", "Do you do interior remodeling?",
            "No. Kellum’s Second Chance Renovations is focused on exterior renovation, repair and restoration."),
        Faq(3, "services", "Services", "Do you repair storm, rot or water damage?",
            "Yes. Storm-damage repair and exterior rot and water-damage repair are among the services we provide."),
        Faq(4, "services", "Services", "Do you work on decks and porches?",
            "Yes. Decks and porches are both part of our exterior service catalogue."),
        Faq(5, "services", "Services", "Do you work on windows and exterior doors?",
            "Yes. We provide window and exterior door services."),
        Faq(6, "service-area", "Service Area", "Where are you based?",
            "Kellum’s Second Chance Renovations is based in Cincinnati, Ohio 45236."),
    ];

    public static List<RenovationService> Services() =>
    [
        Service(1, "roofing", "Roofing", "Protect the home from the top down", "home", "Roofing services for Cincinnati-area homes.", true),
        Service(2, "siding", "Siding", "Renew and protect the exterior", "panels-top-left", "Siding services for residential exteriors.", true),
        Service(3, "gutters-and-downspouts", "Gutters & Downspouts", "Manage water at the roofline", "waves", "Gutter and downspout services for residential properties.", true),
        Service(4, "decks", "Decks", "Make outdoor space useful again", "trees", "Deck services for residential outdoor spaces."),
        Service(5, "porches", "Porches", "Restore the welcome home", "columns-3", "Porch services for residential exteriors."),
        Service(6, "windows", "Windows", "Exterior openings renewed", "square", "Window services for residential properties."),
        Service(7, "exterior-doors", "Exterior Doors", "Entryways given a second chance", "door-open", "Exterior door services for residential properties."),
        Service(8, "exterior-painting", "Exterior Painting", "A fresh finish for the outside", "paint-roller", "Exterior painting services for homes."),
        Service(9, "trim-fascia-and-soffit", "Trim, Fascia & Soffit", "Finish and renew exterior details", "ruler", "Exterior trim, fascia and soffit services."),
        Service(10, "exterior-carpentry", "Exterior Carpentry", "Carpentry made for the outside", "hammer", "Exterior carpentry services for residential properties."),
        Service(11, "storm-damage-repair", "Storm-Damage Repair", "Help after exterior storm damage", "cloud-lightning", "Repair services for storm-damaged residential exteriors."),
        Service(12, "rot-and-water-damage-repair", "Rot & Water-Damage Repair", "Address damaged exterior areas", "droplets", "Repair services for exterior rot and water damage."),
        Service(13, "exterior-restoration", "Exterior Restoration", "Bring the outside back", "refresh-cw", "Exterior restoration services for residential properties."),
        Service(14, "fences", "Fences", "Define and renew outdoor space", "align-justify", "Fence services for residential properties."),
        Service(15, "patios", "Patios", "Renew the space outside", "layout-grid", "Patio services for residential properties."),
        Service(16, "concrete-and-masonry", "Concrete & Masonry", "Solid work for outdoor spaces", "brick-wall", "Concrete and masonry services for residential exteriors."),
    ];

    private static RenovationService Service(
        int order, string slug, string name, string tagline, string icon, string summary, bool featured = false) => new()
        {
            Slug = slug,
            Name = name,
            Tagline = tagline,
            Icon = icon,
            Summary = summary,
            Headline = name,
            Introduction = $"Kellum’s Second Chance Renovations provides {name.ToLowerInvariant()} services for homeowners in Cincinnati, Ohio.",
            Includes = [name],
            BestFor = ["Homeowners planning exterior renovation, repair or restoration"],
            Considerations = ["Tell us about the property and the work you have in mind so we can discuss whether the project is a fit."],
            DisplayOrder = order,
            IsFeatured = featured,
            IsActive = true,
            MetaTitle = $"{name} in Cincinnati, OH | Kellum’s Second Chance Renovations",
            MetaDescription = $"{summary} Request an estimate from Kellum’s Second Chance Renovations in Cincinnati, Ohio.",
        };

    private static FaqItem Faq(int order, string categorySlug, string category, string question, string answer) => new()
    {
        Question = question,
        Answer = answer,
        Category = category,
        CategorySlug = categorySlug,
        DisplayOrder = order,
        IsActive = true,
        NeedsReview = false,
    };

    private static ServiceArea Area(
        int order, string name, ServiceAreaKind kind, bool primary, string? note = null) => new()
    {
        Name = name,
        Kind = kind,
        StateOrRegion = "OH",
        IsPrimary = primary,
        Note = note,
        DisplayOrder = order,
        IsActive = true,
        IsSampleContent = false,
    };
}
