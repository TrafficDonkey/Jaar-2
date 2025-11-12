// Gebruiker.cs
// Modelklasse die een gebruiker binnen het veilingsysteem vertegenwoordigt.
// Kan verschillende rollen hebben (bijv. "Klant" of "Veilingmeester") en is gekoppeld aan biedingen, veilingen en aankopen.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace VeilingApi.Models;

public class Gebruiker
{
    // ────────────────────────────── Primaire gegevens ──────────────────────────────

    public int GebruikerId { get; set; }           // Unieke ID van de gebruiker
    public string Naam { get; set; } = null!;      // Naam van de gebruiker
    public string Email { get; set; } = null!;     // E-mailadres van de gebruiker
    public string WachtwoordHash { get; set; } = null!; // Gehasht wachtwoord
    public string Rol { get; set; } = null!;       // Gebruikersrol, bv. "Klant" of "Veilingmeester"

    // ────────────────────────────── Relaties ──────────────────────────────

    [JsonIgnore][ValidateNever]
    public ICollection<Bieding>? Biedingen { get; set; } = [];
    // Alle biedingen die deze gebruiker heeft geplaatst

    [JsonIgnore][ValidateNever]
    public ICollection<Veiling>? GestarteVeilingen { get; set; } = [];
    // Veilingen die door deze gebruiker (als veilingmeester) zijn gestart

    [JsonIgnore][ValidateNever]
    public ICollection<Toewijzing>? Aankopen { get; set; } = [];
    // Toewijzingen waarbij deze gebruiker de koper is
}
