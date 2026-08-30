using System.Buffers.Binary;

namespace KellumsSecondChance.Server.Infrastructure.Media;

/// <summary>What an uploaded file actually turned out to be.</summary>
public sealed record InspectedImage(string ContentType, string Extension, int Width, int Height);

/// <summary>Why an upload was refused. Maps to an HTTP status at the controller.</summary>
public enum ImageRejection
{
    Empty,
    TooLarge,
    UnsupportedFormat,
    Corrupt,
    ImplausibleDimensions,
}

public sealed record ImageInspectionResult(InspectedImage? Image, ImageRejection? Rejection)
{
    public bool Ok => Image is not null;
}

/// <summary>
/// Identifies an uploaded image from its actual bytes.
///
/// WHY THIS EXISTS RATHER THAN AN IMAGE LIBRARY
/// This reads the container header only — magic bytes and the dimension fields —
/// and never decodes pixel data. That is precisely what is needed to answer "is
/// this really a JPEG/PNG/WebP, and how big is it?" without pulling a large
/// image-processing dependency into the project for a validation task.
///
/// The browser's Content-Type and the uploaded filename are both attacker
/// controlled and are never trusted: the format is decided here, and the stored
/// extension comes from what was actually found. A .php renamed to .jpg, a
/// double extension, or an SVG posing as a PNG all fail at the signature check.
///
/// If a later phase needs generated AVIF/WebP variants, that DOES require a real
/// decoder and is the point at which adding one is justified.
/// </summary>
public static class ImageInspector
{
    /// <summary>
    /// Formats accepted for project photography.
    ///
    /// SVG is deliberately absent: it is a script-capable XML document, not a
    /// raster image, and serving user-uploaded SVG from the site's own origin is
    /// a stored-XSS vector.
    /// </summary>
    public static readonly IReadOnlySet<string> AllowedContentTypes =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "image/jpeg", "image/png", "image/webp" };

    /// <summary>Anything smaller than this cannot contain a usable header.</summary>
    private const int MinimumHeaderBytes = 32;

    /// <summary>Guards against decompression-bomb style dimension values.</summary>
    private const int MaxDimension = 20000;

    public static ImageInspectionResult Inspect(ReadOnlySpan<byte> bytes, long maxBytes)
    {
        if (bytes.Length == 0) return new ImageInspectionResult(null, ImageRejection.Empty);
        if (bytes.Length > maxBytes) return new ImageInspectionResult(null, ImageRejection.TooLarge);
        if (bytes.Length < MinimumHeaderBytes) return new ImageInspectionResult(null, ImageRejection.Corrupt);

        var image = TryReadPng(bytes) ?? TryReadJpeg(bytes) ?? TryReadWebp(bytes);

        if (image is null) return new ImageInspectionResult(null, ImageRejection.UnsupportedFormat);

        if (image.Width <= 0 || image.Height <= 0)
        {
            return new ImageInspectionResult(null, ImageRejection.Corrupt);
        }

        if (image.Width > MaxDimension || image.Height > MaxDimension)
        {
            return new ImageInspectionResult(null, ImageRejection.ImplausibleDimensions);
        }

        return new ImageInspectionResult(image, null);
    }

    /* ------------------------------------------------------------------ PNG */

    private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private static InspectedImage? TryReadPng(ReadOnlySpan<byte> b)
    {
        if (!b[..8].SequenceEqual(PngSignature)) return null;

        // The IHDR chunk must be first: [length:4][type:4]["IHDR"][w:4][h:4]
        if (b.Length < 24) return null;
        if (b[12] != 'I' || b[13] != 'H' || b[14] != 'D' || b[15] != 'R') return null;

        var width = BinaryPrimitives.ReadInt32BigEndian(b.Slice(16, 4));
        var height = BinaryPrimitives.ReadInt32BigEndian(b.Slice(20, 4));
        return new InspectedImage("image/png", ".png", width, height);
    }

    /* ----------------------------------------------------------------- JPEG */

    private static InspectedImage? TryReadJpeg(ReadOnlySpan<byte> b)
    {
        if (b[0] != 0xFF || b[1] != 0xD8) return null;

        var i = 2;
        while (i + 9 < b.Length)
        {
            if (b[i] != 0xFF) { i++; continue; }

            var marker = b[i + 1];

            // Padding and standalone markers carry no length field.
            if (marker == 0xFF) { i++; continue; }
            if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD9)) { i += 2; continue; }

            if (i + 3 >= b.Length) break;
            var segmentLength = BinaryPrimitives.ReadUInt16BigEndian(b.Slice(i + 2, 2));
            if (segmentLength < 2) return null;

            // Any SOFn frame header carries the dimensions. Exclude DHT/JPG/DAC.
            var isStartOfFrame =
                marker is >= 0xC0 and <= 0xCF && marker != 0xC4 && marker != 0xC8 && marker != 0xCC;

            if (isStartOfFrame)
            {
                if (i + 9 >= b.Length) return null;
                var height = BinaryPrimitives.ReadUInt16BigEndian(b.Slice(i + 5, 2));
                var width = BinaryPrimitives.ReadUInt16BigEndian(b.Slice(i + 7, 2));
                return new InspectedImage("image/jpeg", ".jpg", width, height);
            }

            i += 2 + segmentLength;
        }

        return null;
    }

    /* ----------------------------------------------------------------- WebP */

    private static InspectedImage? TryReadWebp(ReadOnlySpan<byte> b)
    {
        if (b.Length < 30) return null;
        if (b[0] != 'R' || b[1] != 'I' || b[2] != 'F' || b[3] != 'F') return null;
        if (b[8] != 'W' || b[9] != 'E' || b[10] != 'B' || b[11] != 'P') return null;

        // VP8 (lossy), VP8L (lossless) and VP8X (extended) store size differently.
        var fourCc = System.Text.Encoding.ASCII.GetString(b.Slice(12, 4));

        switch (fourCc)
        {
            case "VP8 ":
            {
                // Frame header: 3-byte tag, 3-byte start code, then 14-bit w/h.
                if (b.Length < 30) return null;
                if (b[23] != 0x9D || b[24] != 0x01 || b[25] != 0x2A) return null;
                var w = BinaryPrimitives.ReadUInt16LittleEndian(b.Slice(26, 2)) & 0x3FFF;
                var h = BinaryPrimitives.ReadUInt16LittleEndian(b.Slice(28, 2)) & 0x3FFF;
                return new InspectedImage("image/webp", ".webp", w, h);
            }
            case "VP8L":
            {
                if (b.Length < 25 || b[20] != 0x2F) return null;
                var bits = BinaryPrimitives.ReadUInt32LittleEndian(b.Slice(21, 4));
                var w = (int)(bits & 0x3FFF) + 1;
                var h = (int)((bits >> 14) & 0x3FFF) + 1;
                return new InspectedImage("image/webp", ".webp", w, h);
            }
            case "VP8X":
            {
                if (b.Length < 30) return null;
                var w = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
                var h = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
                return new InspectedImage("image/webp", ".webp", w, h);
            }
            default:
                return null;
        }
    }
}
