// Veiling.cs
// Modelklasse die een veiling vertegenwoordigt.
// Bevat informatie over de start- en eindtijden, status en gekoppelde producten (kavels).

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace VeilingApi.Models;

public class Veiling
{
    // ────────────────────────────── Primaire gegevens ──────────────────────────────

    public int VeilingId { get; set; }

    [Required, MaxLength(100)]
    public string Naam { get; set; } = string.Empty;

    // bijv. "Concept", "Gepland", "Actief", "Afgerond"
    [Required, MaxLength(40)]
    public string Status { get; set; } = "Concept";

    public DateTime StartTijd { get; set; }
    public DateTime? EindTijd { get; set; }

    // 🔹 NAVIGATIE: alle producten in deze veiling
    public ICollection<VeilingProduct> VeilingProducten { get; set; }
        = new List<VeilingProduct>();   

    // ────────────────────────────── Relaties ──────────────────────────────

    public int GestartDoorId { get; set; }         // ID van de gebruiker die de veiling heeft gestart

    [JsonIgnore][ValidateNever]
    public Gebruiker? GestartDoor { get; set; }    // Navigatie naar de gebruiker (veilingmeester)

    // Let op: geen tweede navigatie naar VeilingProducten om dubbele relaties te voorkomen.
}
