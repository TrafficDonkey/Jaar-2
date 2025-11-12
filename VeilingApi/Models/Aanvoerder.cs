// Aanvoerder.cs
// Modelklasse die een aanvoerder vertegenwoordigt (gebruiker die producten aanmeldt voor een veiling).
// Bevat basisgegevens en een relatie naar de bijbehorende aanmeldingen.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace VeilingApi.Models;

public class Aanvoerder
{
    // ────────────────────────────── Primaire gegevens ──────────────────────────────

    public int AanvoerderId { get; set; }      // Unieke ID van de aanvoerder
    public string Naam { get; set; } = null!;  // Naam van de aanvoerder

    // ────────────────────────────── Relaties ──────────────────────────────

    [JsonIgnore][ValidateNever]
    public ICollection<Aanmelding>? Aanmeldingen { get; set; } = []; 
    // Lijst met aanmeldingen die door deze aanvoerder zijn gedaan (niet verplicht bij serialisatie)
}
