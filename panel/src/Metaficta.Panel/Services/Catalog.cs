namespace Metaficta.Panel.Services;

/// <summary>packages/core içindeki seri ve tema listelerinin panel karşılığı.</summary>
public static class Catalog
{
    public static readonly (string Id, string Label)[] Series =
    [
        ("standalone", "Tekil video"),
        ("gods-battle", "Tanrılar Savaşı"),
        ("pantheon", "Panteon"),
        ("lost-civilizations", "Kayıp Medeniyetler"),
        ("cosmic-scale", "Evrenin Ölçeği"),
        ("future-year", "Yıl ____"),
        ("top-10", "Top 10"),
        ("did-you-know", "Bunu Biliyor muydun?"),
        ("tier-list", "Tier List"),
    ];

    public static readonly (string Id, string Label)[] Themes =
    [
        ("olympus-gold", "Olimpos Altını"),
        ("norse-frost", "İskandinav Buzu"),
        ("egypt-sand", "Mısır Kumu"),
        ("turkic-steppe", "Türk Bozkırı"),
        ("ancient-sepia", "Kadim Sepya"),
        ("cosmic-void", "Kozmik Boşluk"),
        ("future-neon", "Gelecek Neonu"),
    ];

    public static readonly (string Id, string Label)[] MusicMoods =
    [
        ("epic-orchestral", "Epik orkestra (Olimpos)"),
        ("nordic", "Kuzey (İskandinav)"),
        ("ethnic-mystery", "Etnik gizem (Mısır)"),
        ("steppe", "Bozkır (Türk)"),
        ("ambient", "Ambiyans (Sepya)"),
        ("cosmic-ambient", "Kozmik ambiyans"),
        ("synthwave", "Synthwave (Gelecek)"),
    ];

    public static string SeriesLabel(string id) => Series.FirstOrDefault(s => s.Id == id).Label ?? id;
    public static string ThemeLabel(string id) => Themes.FirstOrDefault(t => t.Id == id).Label ?? id;
}
