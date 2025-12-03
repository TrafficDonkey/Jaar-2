// Bieding.cs
// Modelklasse die een bieding binnen een veiling voorstelt.
// Bevat informatie over het geboden bedrag, de bieder en het bijbehorende veilingproduct.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace VeilingApi.Models;

public class Bieding
{
    // ────────────────────────────── Primaire gegevens ──────────────────────────────

    public int BiedingId { get; set; }              // Unieke ID van de bieding
    public decimal Bedrag { get; set; }             // Geboden bedrag
    public DateTime Tijdstip { get; set; }          // Tijdstip waarop de bieding is geplaatst

    // ────────────────────────────── Relaties ──────────────────────────────

    public int VeilingProductId { get; set; }       // Verwijzing naar het product waarop is geboden

    [JsonIgnore][ValidateNever]
    public VeilingProduct? VeilingProduct { get; set; } // Navigatie naar het veilingproduct

    public int GebruikerId { get; set; }            // Verwijzing naar de gebruiker die het bod heeft geplaatst

    [JsonIgnore][ValidateNever]
    public Gebruiker? Gebruiker { get; set; }       // Navigatie naar de bieder (gebruiker)
}
