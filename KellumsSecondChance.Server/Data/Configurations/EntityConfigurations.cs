using KellumsSecondChance.Server.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KellumsSecondChance.Server.Data.Configurations;

/*
 * Every string column gets an explicit maximum length. Without one, SQL Server
 * gets nvarchar(max), which cannot be indexed and bloats the row. Lengths here
 * match the validation limits in the DTOs so the database and the API agree.
 */

public class RenovationServiceConfiguration : IEntityTypeConfiguration<RenovationService>
{
    public void Configure(EntityTypeBuilder<RenovationService> builder)
    {
        builder.Property(x => x.RowVersion).IsRowVersion();

        builder.ToTable("RenovationServices");

        builder.Property(x => x.Slug).HasMaxLength(100).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Tagline).HasMaxLength(160).IsRequired();
        builder.Property(x => x.Summary).HasMaxLength(500).IsRequired();
        builder.Property(x => x.Icon).HasMaxLength(60).IsRequired();
        builder.Property(x => x.Headline).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Introduction).HasMaxLength(2000).IsRequired();
        builder.Property(x => x.ImagePath).HasMaxLength(300);
        builder.Property(x => x.ImageAlt).HasMaxLength(300);
        builder.Property(x => x.MetaTitle).HasMaxLength(200);
        builder.Property(x => x.MetaDescription).HasMaxLength(320);

        // Primitive collections map to a JSON column on SQL Server.
        builder.PrimitiveCollection(x => x.Includes).HasMaxLength(4000);
        builder.PrimitiveCollection(x => x.BestFor).HasMaxLength(2000);
        builder.PrimitiveCollection(x => x.Considerations).HasMaxLength(2000);

        builder.HasIndex(x => x.Slug).IsUnique();
        builder.HasIndex(x => new { x.IsActive, x.DisplayOrder });
    }
}

public class RenovationProjectConfiguration : IEntityTypeConfiguration<RenovationProject>
{
    public void Configure(EntityTypeBuilder<RenovationProject> builder)
    {
        builder.ToTable("RenovationProjects");

        builder.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Title).HasMaxLength(200).IsRequired();
        builder.Property(x => x.CategoryName).HasMaxLength(120).IsRequired();
        builder.Property(x => x.CategorySlug).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Location).HasMaxLength(120);
        builder.Property(x => x.Summary).HasMaxLength(600).IsRequired();
        builder.Property(x => x.Challenge).HasMaxLength(2500).IsRequired();
        builder.Property(x => x.Vision).HasMaxLength(2500).IsRequired();
        builder.Property(x => x.Transformation).HasMaxLength(2500).IsRequired();
        builder.Property(x => x.Outcome).HasMaxLength(2000);
        builder.Property(x => x.DurationLabel).HasMaxLength(120);
        builder.Property(x => x.PropertyType).HasMaxLength(120);
        builder.Property(x => x.MetaTitle).HasMaxLength(200);
        builder.Property(x => x.MetaDescription).HasMaxLength(320);

        builder.PrimitiveCollection(x => x.Highlights).HasMaxLength(2000);

        builder.Property(x => x.RowVersion).IsRowVersion();

        builder.HasIndex(x => x.Slug).IsUnique();
        builder.HasIndex(x => new { x.IsActive, x.IsFeatured, x.DisplayOrder });
        builder.HasIndex(x => x.CategorySlug);

        builder
            .HasMany(x => x.Images)
            .WithOne(x => x.RenovationProject)
            .HasForeignKey(x => x.RenovationProjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class RenovationProjectImageConfiguration : IEntityTypeConfiguration<RenovationProjectImage>
{
    public void Configure(EntityTypeBuilder<RenovationProjectImage> builder)
    {
        builder.ToTable("RenovationProjectImages");

        builder.Property(x => x.Path).HasMaxLength(300).IsRequired();
        builder.Property(x => x.AltText).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Caption).HasMaxLength(300);
        builder.Property(x => x.PairKey).HasMaxLength(60);
        builder.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.StorageKey).HasMaxLength(400);
        builder.Property(x => x.ContentType).HasMaxLength(100);

        builder.HasIndex(x => new { x.RenovationProjectId, x.Kind, x.DisplayOrder });
        // Deleting a photo checks whether any OTHER row still points at the same
        // stored file before the physical file is removed.
        builder.HasIndex(x => x.StorageKey);
    }
}

public class ProjectServiceConfiguration : IEntityTypeConfiguration<ProjectService>
{
    public void Configure(EntityTypeBuilder<ProjectService> builder)
    {
        builder.ToTable("ProjectServices");

        builder.HasKey(x => new { x.RenovationProjectId, x.RenovationServiceId });

        builder
            .HasOne(x => x.RenovationProject)
            .WithMany(x => x.ProjectServices)
            .HasForeignKey(x => x.RenovationProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(x => x.RenovationService)
            .WithMany(x => x.ProjectServices)
            .HasForeignKey(x => x.RenovationServiceId)
            // Restrict: deleting a service must not silently rewrite project history.
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class CustomerTestimonialConfiguration : IEntityTypeConfiguration<CustomerTestimonial>
{
    public void Configure(EntityTypeBuilder<CustomerTestimonial> builder)
    {
        builder.ToTable("CustomerTestimonials");

        builder.Property(x => x.FirstName).HasMaxLength(80).IsRequired();
        builder.Property(x => x.LastInitial).HasMaxLength(4);
        builder.Property(x => x.Location).HasMaxLength(120);
        builder.Property(x => x.Quote).HasMaxLength(1500).IsRequired();
        builder.Property(x => x.ProjectCategory).HasMaxLength(120);
        builder.Property(x => x.Source).HasConversion<string>().HasMaxLength(20);

        builder.HasIndex(x => new { x.IsActive, x.IsFeatured, x.DisplayOrder });
        builder.HasIndex(x => x.IsSampleContent);
    }
}

public class FaqItemConfiguration : IEntityTypeConfiguration<FaqItem>
{
    public void Configure(EntityTypeBuilder<FaqItem> builder)
    {
        builder.Property(x => x.RowVersion).IsRowVersion();

        builder.ToTable("FaqItems");

        builder.Property(x => x.Question).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Answer).HasMaxLength(2500).IsRequired();
        builder.Property(x => x.Category).HasMaxLength(120).IsRequired();
        builder.Property(x => x.CategorySlug).HasMaxLength(120).IsRequired();
        builder.Property(x => x.ReviewNote).HasMaxLength(500);

        builder.HasIndex(x => new { x.IsActive, x.NeedsReview, x.DisplayOrder });
        builder.HasIndex(x => x.CategorySlug);
    }
}

public class ServiceAreaConfiguration : IEntityTypeConfiguration<ServiceArea>
{
    public void Configure(EntityTypeBuilder<ServiceArea> builder)
    {
        builder.ToTable("ServiceAreas");

        builder.Property(x => x.Name).HasMaxLength(120).IsRequired();
        builder.Property(x => x.StateOrRegion).HasMaxLength(80);
        builder.Property(x => x.Note).HasMaxLength(300);
        builder.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20);

        builder.PrimitiveCollection(x => x.PostalCodes).HasMaxLength(2000);

        builder.HasIndex(x => new { x.IsActive, x.DisplayOrder });
    }
}

public class SiteSettingConfiguration : IEntityTypeConfiguration<SiteSetting>
{
    public void Configure(EntityTypeBuilder<SiteSetting> builder)
    {
        builder.ToTable("SiteSettings");

        builder.HasKey(x => x.Key);
        builder.Property(x => x.Key).HasMaxLength(80);
        /*
         * 4000, not 1000. Most settings are a line of text, but the social
         * links and the trading hours are stored as JSON, and eight social
         * profiles at their maximum field lengths serialise to roughly 3.2k —
         * a payload the validator accepts must be a payload the column holds.
         */
        builder.Property(x => x.Value).HasMaxLength(4000);
        builder.Property(x => x.Description).HasMaxLength(300);
    }
}

public class EstimateRequestConfiguration : IEntityTypeConfiguration<EstimateRequest>
{
    public void Configure(EntityTypeBuilder<EstimateRequest> builder)
    {
        builder.ToTable("EstimateRequests");

        builder.Property(x => x.Reference).HasMaxLength(20).IsRequired();
        builder.Property(x => x.FirstName).HasMaxLength(80).IsRequired();
        builder.Property(x => x.LastName).HasMaxLength(80).IsRequired();
        builder.Property(x => x.Email).HasMaxLength(254).IsRequired();
        builder.Property(x => x.Phone).HasMaxLength(30);
        builder.Property(x => x.AddressLine).HasMaxLength(250);
        builder.Property(x => x.City).HasMaxLength(120);
        builder.Property(x => x.PostalCode).HasMaxLength(12).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.ReferralSource).HasMaxLength(60);
        builder.Property(x => x.InternalNotes).HasMaxLength(4000);
        builder.Property(x => x.SubmitterIpHash).HasMaxLength(64);
        builder.Property(x => x.UserAgent).HasMaxLength(300);

        builder.PrimitiveCollection(x => x.ProjectTypeSlugs).HasMaxLength(1000);

        // Enums are stored as strings: readable in the database, and adding a
        // member later cannot silently renumber existing rows.
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.PropertyType).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.Timeline).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.BudgetRange).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.PreferredContactMethod).HasConversion<string>().HasMaxLength(30);

        builder.Property(x => x.RowVersion).IsRowVersion();

        builder
            .HasMany(x => x.Notes)
            .WithOne(x => x.EstimateRequest)
            .HasForeignKey(x => x.EstimateRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasMany(x => x.StatusHistory)
            .WithOne(x => x.EstimateRequest)
            .HasForeignKey(x => x.EstimateRequestId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.Reference).IsUnique();
        builder.HasIndex(x => new { x.Status, x.CreatedAtUtc });
        builder.HasIndex(x => x.CreatedAtUtc);
        // Supports the "how many from this source recently" abuse check.
        builder.HasIndex(x => new { x.SubmitterIpHash, x.CreatedAtUtc });
    }
}


public class EstimateRequestNoteConfiguration : IEntityTypeConfiguration<EstimateRequestNote>
{
    public void Configure(EntityTypeBuilder<EstimateRequestNote> builder)
    {
        builder.ToTable("EstimateRequestNotes");

        builder.Property(x => x.Note).HasMaxLength(4000).IsRequired();
        builder.Property(x => x.CreatedByUserId).HasMaxLength(450);
        builder.Property(x => x.CreatedByDisplayName).HasMaxLength(256);

        builder.HasIndex(x => new { x.EstimateRequestId, x.CreatedAtUtc });
    }
}

public class EstimateRequestStatusHistoryConfiguration
    : IEntityTypeConfiguration<EstimateRequestStatusHistory>
{
    public void Configure(EntityTypeBuilder<EstimateRequestStatusHistory> builder)
    {
        builder.ToTable("EstimateRequestStatusHistory");

        builder.Property(x => x.PreviousStatus).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.NewStatus).HasConversion<string>().HasMaxLength(30);
        builder.Property(x => x.ChangedByUserId).HasMaxLength(450);
        builder.Property(x => x.ChangedByDisplayName).HasMaxLength(256);

        builder.HasIndex(x => new { x.EstimateRequestId, x.ChangedAtUtc });
    }
}
