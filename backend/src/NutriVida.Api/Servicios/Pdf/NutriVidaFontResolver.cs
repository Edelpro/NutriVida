using PdfSharp.Fonts;

namespace NutriVida.Api.Services.Pdf;

internal sealed class NutriVidaFontResolver : IFontResolver
{
    private readonly byte[] regular;
    private readonly byte[] bold;

    public NutriVidaFontResolver()
    {
        regular = File.ReadAllBytes(FindFont(
            @"C:\Windows\Fonts\arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"));
        bold = File.ReadAllBytes(FindFont(
            @"C:\Windows\Fonts\arialbd.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"));
    }

    public FontResolverInfo? ResolveTypeface(string familyName, bool isBold, bool isItalic) =>
        new(isBold ? "nutrivida-bold" : "nutrivida-regular", false, isItalic);

    public byte[]? GetFont(string faceName) => faceName == "nutrivida-bold" ? bold : regular;

    private static string FindFont(params string[] candidates) =>
        candidates.FirstOrDefault(File.Exists)
        ?? throw new InvalidOperationException(
            "No se encontró una fuente compatible. Instala Arial en Windows o DejaVu Sans en Linux.");
}
