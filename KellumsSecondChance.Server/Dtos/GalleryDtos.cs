using System.ComponentModel.DataAnnotations;

namespace KellumsSecondChance.Server.Dtos;

public record GalleryImageDto(int Id, string ImageUrl, string AltText, string? Caption, int Width, int Height, int DisplayOrder);

public record AdminGalleryImageDto(int Id, string ImageUrl, string OriginalFileName, string AltText, string? Caption,
    int Width, int Height, bool IsActive, int DisplayOrder, bool IsUploaded, long? FileSizeBytes);

public class GalleryImageUpdateDto
{
    [Required, StringLength(300, MinimumLength = 3)]
    public string AltText { get; set; } = string.Empty;

    [StringLength(500)] public string? Caption { get; set; }
    public bool IsActive { get; set; }
}

public class GalleryReorderDto
{
    [Required, MaxLength(500)] public List<int> OrderedIds { get; set; } = [];
}
