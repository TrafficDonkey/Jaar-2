// VeilingProduct.cs
// Modelklasse die een product (kavel) binnen een veiling vertegenwoordigt.
// Verbindt een aanmelding met een specifieke veiling en bevat biedingen en toewijzing.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace VeilingApi.Models;

public class VeilingProduct
{
    // ────────────────────────────── Primaire gegevens ──────────────────────────────

    public int VeilingProductId { get; set; }      // Unieke ID van het veilingproduct
    public int VeilingId { get; set; }             // Verwijzing naar de bijbehorende veiling

    [JsonIgnore][ValidateNever]
    public Veiling? Veiling { get; set; }          // Navigatie naar de veiling

    public int AanmeldingId { get; set; }          // Verwijzing naar de gekoppelde aanmelding

    [JsonIgnore][ValidateNever]
    public Aanmelding? Aanmelding { get; set; }    // Navigatie naar de aanmelding

    public int VolgordeVeiling { get; set; }       // Positie van het product binnen de veiling

    public string Categorie { get; set; } = string.Empty;

    // ────────────────────────────── Relaties ──────────────────────────────

    [JsonIgnore][ValidateNever]
    public ICollection<Bieding> Biedingen { get; set; } = [];
    // Lijst met biedingen op dit veilingproduct

    [JsonIgnore][ValidateNever]
    public ICollection<Toewijzing> Toewijzingen { get; set; } = [];
    // Toewijzingen (verkopen) voor dit veilingproduct
}
