// Toewijzing.cs
// Modelklasse die de uiteindelijke verkoop (toewijzing) van een veilingproduct vertegenwoordigt.
// Bevat informatie over de koper, het product, de eindprijs en de datum van toewijzing.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace VeilingApi.Models;

public class Toewijzing
{
    // ────────────────────────────── Primaire gegevens ──────────────────────────────

    public int ToewijzingId { get; set; }              // Unieke ID van de toewijzing
    public int Aantal { get; set; }                    // Aantal verkochte stuks
    public decimal EindPrijs { get; set; }             // Eindprijs waarvoor het product is verkocht
    public DateTime Datum { get; set; }                // Datum van de toewijzing

    // ────────────────────────────── Relaties ──────────────────────────────

    public int VeilingProductId { get; set; }          // Verwijzing naar het toegewezen veilingproduct

    [JsonIgnore][ValidateNever]
    public VeilingProduct? VeilingProduct { get; set; } // Navigatie naar het product

    public int KoperId { get; set; }                   // Verwijzing naar de koper (gebruiker)

    [JsonIgnore][ValidateNever]
    public Gebruiker? Koper { get; set; }              // Navigatie naar de koper
}
