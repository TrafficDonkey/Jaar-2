// Veiling.cs
// Modelklasse die een veiling vertegenwoordigt.
// Bevat informatie over de start- en eindtijden, status en gekoppelde producten (kavels).

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace VeilingApi.Models;

public class Veiling
{
    // ────────────────────────────── Primaire gegevens ──────────────────────────────

    public int VeilingId { get; set; }             // Unieke ID van de veiling
    public DateTime StartTijd { get; set; }        // Starttijd van de veiling
    public DateTime EindTijd { get; set; }         // Eindtijd van de veiling
    public string Status { get; set; } = null!;    // Huidige status (bijv. "Gepland", "Actief", "Afgerond")

    // ────────────────────────────── Relaties ──────────────────────────────

    public int GestartDoorId { get; set; }         // ID van de gebruiker die de veiling heeft gestart

    [JsonIgnore][ValidateNever]
    public Gebruiker? GestartDoor { get; set; }    // Navigatie naar de gebruiker (veilingmeester)

    [JsonIgnore][ValidateNever]
    public ICollection<VeilingProduct>? Kavels { get; set; } = [];
    // Producten (kavels) die onderdeel zijn van deze veiling
}
