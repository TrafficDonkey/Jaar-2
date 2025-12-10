// Aanmelding.cs
// Modelklasse voor een productaanmelding door een gebruiker (aanvoerder-rol).

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace VeilingApi.Models;

public class Aanmelding
{
    public int AanmeldingId { get; set; }
    public string FotoUrl { get; set; } = string.Empty;
    public string ProductBeschrijving { get; set; } = string.Empty;
    public int Hoeveelheid { get; set; }
    public decimal MinimumPrijs { get; set; }
    public string GewensteKlokLocatie { get; set; } = string.Empty;
    public DateTime GewensteVeilDatum { get; set; }

    public string Categorie { get; set; }

    // Gebruiker die dit product heeft aangemeld (aanvoerder)
    public int GebruikerId { get; set; }

    [JsonIgnore][ValidateNever]
    public Gebruiker? Gebruiker { get; set; }

    // Koppeling naar veilingproduct (optioneel; pas na inplannen)
    [JsonIgnore][ValidateNever]
    public VeilingProduct? VeilingProduct { get; set; }
}
