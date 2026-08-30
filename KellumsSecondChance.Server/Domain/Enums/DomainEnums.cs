namespace KellumsSecondChance.Server.Domain.Enums;

/// <summary>Where an image sits in a project's story.</summary>
public enum ProjectImageKind
{
    Cover = 0,
    Before = 1,
    After = 2,
    Gallery = 3,
}

/// <summary>Granularity of a published service area entry.</summary>
public enum ServiceAreaKind
{
    City = 0,
    County = 1,
    PostalCode = 2,
    Region = 3,
}

/// <summary>Where a testimonial came from. Prepared for later review-platform imports.</summary>
public enum TestimonialSource
{
    Direct = 0,
    Google = 1,
    Facebook = 2,
    Other = 3,
}

/// <summary>Lifecycle of a lead, from arrival to outcome.</summary>
public enum EstimateRequestStatus
{
    New = 0,
    Contacted = 1,
    EstimateScheduled = 2,
    EstimateSent = 3,
    Won = 4,
    Lost = 5,
    Archived = 6,
}

public enum PropertyType
{
    SingleFamily = 0,
    Townhouse = 1,
    Condo = 2,
    MultiFamily = 3,
    Rental = 4,
    Other = 5,
}

public enum ProjectTimeline
{
    NotSure = 0,
    Immediately = 1,
    WithinOneMonth = 2,
    OneToThreeMonths = 3,
    ThreeToSixMonths = 4,
    JustPlanning = 5,
}

public enum BudgetRange
{
    NotSure = 0,
    Under5k = 1,
    From5kTo15k = 2,
    From15kTo35k = 3,
    From35kTo75k = 4,
    Over75k = 5,
}

public enum PreferredContactMethod
{
    NoPreference = 0,
    Phone = 1,
    Email = 2,
    Text = 3,
}
