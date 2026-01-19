using System.Text.RegularExpressions;

namespace VeilingApi.Services;

public static class PhoneNumberValidator
{
    private static readonly Dictionary<string, (int Min, int Max)> Rules = new(StringComparer.OrdinalIgnoreCase)
    {
        { "NL", (9, 10) },
        { "BE", (9, 9) },
        { "DE", (10, 11) },
        { "FR", (9, 9) },
        { "UK", (10, 10) },
        { "US", (10, 10) }
    };

    public static bool TryValidate(string? country, string? number, out string error)
    {
        error = string.Empty;

        var countryCode = (country ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            error = "Kies het land van het telefoonnummer.";
            return false;
        }

        var raw = (number ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(raw))
        {
            error = "Telefoonnummer is verplicht.";
            return false;
        }

        var digits = Regex.Replace(raw, "\\D", string.Empty);
        if (digits.Length == 0)
        {
            error = "Telefoonnummer is ongeldig.";
            return false;
        }

        if (!Rules.TryGetValue(countryCode.ToUpperInvariant(), out var rule))
        {
            rule = (8, 15);
        }

        if (digits.Length < rule.Min || digits.Length > rule.Max)
        {
            error = $"Telefoonnummer voor {countryCode.ToUpperInvariant()} moet {rule.Min}-{rule.Max} cijfers hebben.";
            return false;
        }

        return true;
    }
}
