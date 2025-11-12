// Aanmelding.cs
// Modelklasse die een aanmelding voor een veilingproduct vertegenwoordigt.
// Wordt gebruikt om informatie van een aanvoerder over een product vast te leggen.

using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace VeilingApi.Models;

public class Aanmelding
{
    // ────────────────────────────── Primaire gegevens ──────────────────────────────

    public int AanmeldingId { get; set; }          // Unieke ID van de aanmelding
    public string FotoUrl { get; set; } = null!;   // URL naar de productfoto
    public string ProductBeschrijving { get; set; } = null!;  // Beschrijving van het product
    public int Hoeveelheid { get; set; }           // Aantal stuks in deze aanmelding
    public decimal MinimumPrijs { get; set; }      // Minimale prijs waarvoor het product geveild mag worden
    public string GewensteKlokLocatie { get; set; } = null!;  // Gewenste veilinglocatie
    public DateTime GewensteVeilDatum { get; set; }            // Datum waarop de veiling gewenst is

    // ────────────────────────────── Relaties ──────────────────────────────

    public int AanvoerderId { get; set; }          // Verwijzing naar de aanvoerder die het product aanmeldt

    [JsonIgnore][ValidateNever]
    public Aanvoerder? Aanvoerder { get; set; }    // Navigatie-eigenschap naar de aanvoerder (optioneel)

    [JsonIgnore][ValidateNever]
    public VeilingProduct? VeilingProduct { get; set; } // Koppeling naar het bijbehorende veilingproduct (optioneel)
}
