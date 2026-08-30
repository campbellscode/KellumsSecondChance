using System.Buffers.Binary;
using System.Text;
using KellumsSecondChance.Server.Infrastructure.Media;

namespace KellumsSecondChance.Server.Tests;

/// <summary>
/// What the uploader will actually accept.
///
/// These tests build real container headers by hand rather than shipping binary
/// fixtures, so it is visible in the test itself exactly which bytes are being
/// claimed to be a PNG or a JPEG. The hostile cases matter most: the browser's
/// Content-Type and the uploaded filename are attacker-controlled, so the only
/// thing that may decide the format is the content.
/// </summary>
public class ImageInspectorTests
{
    private const long MaxBytes = 12 * 1024 * 1024;

    /* --------------------------------------------------------- builders */

    private static byte[] Png(int width, int height)
    {
        var bytes = new byte[64];
        // Signature, then an IHDR chunk whose length/type precede the dimensions.
        new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }.CopyTo(bytes, 0);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(8), 13);
        Encoding.ASCII.GetBytes("IHDR").CopyTo(bytes, 12);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(16), width);
        BinaryPrimitives.WriteInt32BigEndian(bytes.AsSpan(20), height);
        return bytes;
    }

    private static byte[] Jpeg(int width, int height)
    {
        // SOI, then an SOF0 frame carrying the dimensions.
        var bytes = new List<byte> { 0xFF, 0xD8, 0xFF, 0xC0, 0x00, 0x11, 0x08 };
        bytes.Add((byte)(height >> 8));
        bytes.Add((byte)(height & 0xFF));
        bytes.Add((byte)(width >> 8));
        bytes.Add((byte)(width & 0xFF));
        while (bytes.Count < 48) bytes.Add(0x00);
        return [.. bytes];
    }

    private static byte[] WebpLossy(int width, int height)
    {
        var bytes = new byte[64];
        Encoding.ASCII.GetBytes("RIFF").CopyTo(bytes, 0);
        BinaryPrimitives.WriteUInt32LittleEndian(bytes.AsSpan(4), 56);
        Encoding.ASCII.GetBytes("WEBP").CopyTo(bytes, 8);
        Encoding.ASCII.GetBytes("VP8 ").CopyTo(bytes, 12);
        BinaryPrimitives.WriteUInt32LittleEndian(bytes.AsSpan(16), 40);
        // Frame tag, then the start code 0x9D 0x01 0x2A.
        bytes[20] = 0x00;
        bytes[21] = 0x00;
        bytes[22] = 0x00;
        bytes[23] = 0x9D;
        bytes[24] = 0x01;
        bytes[25] = 0x2A;
        BinaryPrimitives.WriteUInt16LittleEndian(bytes.AsSpan(26), (ushort)width);
        BinaryPrimitives.WriteUInt16LittleEndian(bytes.AsSpan(28), (ushort)height);
        return bytes;
    }

    /* ------------------------------------------------------- happy path */

    [Fact]
    public void Reads_a_png_header()
    {
        var result = ImageInspector.Inspect(Png(1600, 1200), MaxBytes);

        Assert.True(result.Ok);
        Assert.Equal("image/png", result.Image!.ContentType);
        Assert.Equal(".png", result.Image.Extension);
        Assert.Equal(1600, result.Image.Width);
        Assert.Equal(1200, result.Image.Height);
    }

    [Fact]
    public void Reads_a_jpeg_header()
    {
        var result = ImageInspector.Inspect(Jpeg(4032, 3024), MaxBytes);

        Assert.True(result.Ok);
        Assert.Equal("image/jpeg", result.Image!.ContentType);
        Assert.Equal(".jpg", result.Image.Extension);
        Assert.Equal(4032, result.Image.Width);
        Assert.Equal(3024, result.Image.Height);
    }

    [Fact]
    public void Reads_a_lossy_webp_header()
    {
        var result = ImageInspector.Inspect(WebpLossy(1200, 800), MaxBytes);

        Assert.True(result.Ok);
        Assert.Equal("image/webp", result.Image!.ContentType);
        Assert.Equal(".webp", result.Image.Extension);
        Assert.Equal(1200, result.Image.Width);
        Assert.Equal(800, result.Image.Height);
    }

    /* ---------------------------------------------------------- refusal */

    [Fact]
    public void Refuses_an_svg_however_it_is_labelled()
    {
        /*
         * The important case. An SVG is a script-capable XML document; served
         * from the site's own origin it is stored XSS. It must be refused on
         * content, not on file extension — this payload could arrive named
         * "photo.png" with Content-Type: image/png and would still fail here.
         */
        var svg = Encoding.UTF8.GetBytes(
            "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>");

        var result = ImageInspector.Inspect(svg, MaxBytes);

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.UnsupportedFormat, result.Rejection);
    }

    [Fact]
    public void Refuses_an_html_document_with_an_image_extension()
    {
        var html = Encoding.UTF8.GetBytes(
            "<!DOCTYPE html><html><body><script>alert(1)</script></body></html>");

        var result = ImageInspector.Inspect(html, MaxBytes);

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.UnsupportedFormat, result.Rejection);
    }

    [Fact]
    public void Refuses_a_windows_executable()
    {
        var exe = new byte[64];
        exe[0] = 0x4D; // 'M'
        exe[1] = 0x5A; // 'Z'

        var result = ImageInspector.Inspect(exe, MaxBytes);

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.UnsupportedFormat, result.Rejection);
    }

    [Fact]
    public void Refuses_a_gif_because_it_is_not_on_the_allowed_list()
    {
        var gif = new byte[64];
        Encoding.ASCII.GetBytes("GIF89a").CopyTo(gif, 0);

        var result = ImageInspector.Inspect(gif, MaxBytes);

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.UnsupportedFormat, result.Rejection);
    }

    [Fact]
    public void Refuses_an_empty_file()
    {
        var result = ImageInspector.Inspect([], MaxBytes);

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.Empty, result.Rejection);
    }

    [Fact]
    public void Refuses_a_file_over_the_ceiling_before_looking_at_it()
    {
        var result = ImageInspector.Inspect(Png(100, 100), maxBytes: 8);

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.TooLarge, result.Rejection);
    }

    [Fact]
    public void Refuses_a_truncated_header()
    {
        var truncated = Png(100, 100).AsSpan(0, 12).ToArray();

        var result = ImageInspector.Inspect(truncated, MaxBytes);

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.Corrupt, result.Rejection);
    }

    [Fact]
    public void Refuses_implausible_dimensions()
    {
        // A 60000-pixel edge is a decompression bomb, not a photograph.
        var result = ImageInspector.Inspect(Png(60000, 60000), MaxBytes);

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.ImplausibleDimensions, result.Rejection);
    }

    [Fact]
    public void Refuses_a_png_claiming_zero_dimensions()
    {
        var result = ImageInspector.Inspect(Png(0, 0), MaxBytes);

        Assert.False(result.Ok);
        Assert.Equal(ImageRejection.Corrupt, result.Rejection);
    }

    [Fact]
    public void The_allowed_list_never_includes_svg()
    {
        Assert.DoesNotContain("image/svg+xml", ImageInspector.AllowedContentTypes);
        Assert.Equal(3, ImageInspector.AllowedContentTypes.Count);
    }
}
