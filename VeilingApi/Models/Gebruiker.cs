// Gebruiker.cs
// Model voor een geauthenticeerde gebruiker in het systeem.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace VeilingApi.Models;

public class Gebruiker
{
    public int GebruikerId { get; set; }
    public string Naam { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string WachtwoordHash { get; set; } = null!;
    public string Rol { get; set; } = null!; // "Klant", "Aanvoerder", "Veilingmeester", "Admin"
    public string? TelefoonLand { get; set; }
    public string? TelefoonNummer { get; set; }
    public string? AdresStraat { get; set; }
    public string? Huisnummer { get; set; }
    public string? Postcode { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public string? TwoFactorSecret { get; set; }

    // Biedingen gedaan door deze gebruiker
    [JsonIgnore][ValidateNever]
    public ICollection<Bieding>? Biedingen { get; set; } = [];

    // Veilingen die deze gebruiker heeft gestart
    [JsonIgnore][ValidateNever]
    public ICollection<Veiling>? GestarteVeilingen { get; set; } = [];

    // Toewijzingen waarbij deze gebruiker koper is
    [JsonIgnore][ValidateNever]
    public ICollection<Toewijzing>? Aankopen { get; set; } = [];

    // Aanmeldingen waarbij deze gebruiker optreedt als "aanvoerder"
    [JsonIgnore][ValidateNever]
    public ICollection<Aanmelding>? AanmeldingenAlsAanvoerder { get; set; } = [];
}
