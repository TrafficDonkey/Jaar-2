// Dto.cs
// Bevat alle Data Transfer Objects (DTO's) voor requests en responses.
// DTO's valideren input en bepalen welke velden via de API worden uitgewisseld.

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace VeilingApi.Models;

// ────────────────────────────── GEBRUIKER ──────────────────────────────
// Weergave- en mutatie-DTO's voor gebruikersbeheer.

public class GebruikerDto
{
    public int GebruikerId { get; set; }
    public string Naam { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Rol { get; set; } = string.Empty;
}

public class CreateGebruikerDto
{
    [Required, StringLength(100)]
    public string Naam { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Rol { get; set; } = "Klant";

    [Required]
    public string WachtwoordHash { get; set; } = string.Empty;
}

public class UpdateGebruikerDto
{
    [Required]
    public int GebruikerId { get; set; }

    [Required, StringLength(100)]
    public string Naam { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Rol { get; set; } = string.Empty;
}

// ────────────────────────────── AANMELDING ──────────────────────────────
// DTO's voor het registreren en tonen van aanmeldingen.

// ====== AANMELDING ======
public class AanmeldingDto
{
    public int AanmeldingId { get; set; }
    public string? FotoUrl { get; set; }

    public string ProductBeschrijving { get; set; } = string.Empty;
    public int Hoeveelheid { get; set; }
    public decimal MinimumPrijs { get; set; }

    // NIEUW: categorie (bijv. "Snijbloemen", "Kamerplanten", "Buitenplanten")
    public string Categorie { get; set; } = string.Empty;

    public string GewensteKlokLocatie { get; set; } = string.Empty;
    public DateTime GewensteVeilDatum { get; set; }

    // Gebruiker (aanvoerder)
    public int GebruikerId { get; set; }
    public string GebruikerNaam { get; set; } = string.Empty;
}


public class CreateAanmeldingDto
{
    public string? FotoUrl { get; set; }

    [Required, StringLength(200)]
    public string ProductBeschrijving { get; set; } = string.Empty;

    [Range(1, 100000)]
    public int Hoeveelheid { get; set; }

    [Range(0, 999999)]
    public decimal MinimumPrijs { get; set; }

    // NIEUW: categorie verplicht
    [Required, StringLength(100)]
    public string Categorie { get; set; } = string.Empty;

    [Required]
    public string GewensteKlokLocatie { get; set; } = "Naaldwijk";

    [Required]
    public DateTime GewensteVeilDatum { get; set; }

    // GebruikerId i.p.v. AanvoerderId
    [Required]
    public int GebruikerId { get; set; }
}

public class UpdateAanmeldingDto : CreateAanmeldingDto
{
    [Required]
    public int AanmeldingId { get; set; }
}


// ────────────────────────────── VEILING ──────────────────────────────
// DTO's voor het plannen en beheren van veilingen.

public class VeilingDto
{
    public int VeilingId { get; set; }
    public string Naam { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime StartTijd { get; set; }
    public DateTime? EindTijd { get; set; }

    // De producten (kavels) die bij deze veiling horen
    public List<VeilingProductDto> VeilingProducten { get; set; } = new();
}

public class CreateVeilingDto
{
    [Required]
    public string Naam { get; set; } = string.Empty;

    [Required]
    public string Status { get; set; } = "Concept";   // bv. Concept / Gepland / Actief

    [Required]
    public DateTime StartTijd { get; set; }

    public DateTime? EindTijd { get; set; }

    [Required]
    public int GestartDoorId { get; set; }            // veilingmeester
}

public class UpdateVeilingDto : CreateVeilingDto
{
    [Required]
    public int VeilingId { get; set; }
}

public class StartVeilingDto
{
    public string? Naam { get; set; }
    public DateTime? StartTijd { get; set; }
    public int AanmeldingId { get; set; }
}


// ────────────────────────────── VEILINGPRODUCT ──────────────────────────────
// DTO's voor kavels/producten binnen een veiling.

public class VeilingProductDto
{
    public int VeilingProductId { get; set; }
    public int AanmeldingId { get; set; }

    public string ProductBeschrijving { get; set; } = string.Empty;
    public int Aantal { get; set; }

    public string? FotoUrl { get; set; }

    public decimal StartPrijs { get; set; }
    public decimal HuidigePrijs { get; set; }

    public string Kloklocatie { get; set; } = string.Empty;
    public DateTime? GewensteVeilDatum { get; set; }

    // NIEUW
    public string Categorie { get; set; } = string.Empty;
}


public class CreateVeilingProductDto
{
    [Required]
    public int VeilingId { get; set; }

    [Required]
    public int AanmeldingId { get; set; }

    [Required]
    public int VolgordeVeiling { get; set; }
}

public class UpdateVeilingProductDto : CreateVeilingProductDto
{
    [Required]
    public int VeilingProductId { get; set; }
}


// ────────────────────────────── BIEDING ──────────────────────────────
// DTO's voor het plaatsen en tonen van biedingen.

public class BiedingDto
{
    public int BiedingId { get; set; }
    public int GebruikerId { get; set; }
    public string GebruikerNaam { get; set; } = string.Empty;
    public int VeilingProductId { get; set; }
    public decimal Bedrag { get; set; }
    public DateTime Tijdstip { get; set; }
}

public class CreateBiedingDto
{
    [Required]
    public int GebruikerId { get; set; }

    [Required]
    public int VeilingProductId { get; set; }

    [Range(0.01, 999999)]
    public decimal Bedrag { get; set; }
}


// ────────────────────────────── TOEWIJZING ──────────────────────────────
// DTO's voor het vastleggen van de winnende toewijzing/koop.

public class ToewijzingDto
{
    public int ToewijzingId { get; set; }
    public int KoperId { get; set; }
    public string KoperNaam { get; set; } = string.Empty;
    public int VeilingProductId { get; set; }
    public decimal EindPrijs { get; set; }
    public DateTime Datum { get; set; }
}

public class CreateToewijzingDto
{
    [Required]
    public int KoperId { get; set; }

    [Required]
    public int VeilingProductId { get; set; }

    [Range(0.01, 999999)]
    public decimal EindPrijs { get; set; }

    [Required]
    public DateTime Datum { get; set; }
}


// ────────────────────────────── KOPER (actieve veiling) ──────────────────────────────
// Deze DTO's worden gebruikt op de koperspagina om de huidige veiling te tonen.

public class ActieveVeilingProductDto
{
    public int VeilingProductId { get; set; }
    public int AanmeldingId { get; set; }

    public string ProductBeschrijving { get; set; } = string.Empty;
    public int Hoeveelheid { get; set; }
    public decimal MinimumPrijs { get; set; }

    public string Kloklocatie { get; set; } = string.Empty;
    public string? FotoUrl { get; set; }

    public string Categorie { get; set; } = string.Empty;
}

public class ActieveVeilingDto
{
    public int VeilingId { get; set; }
    public DateTime StartTijd { get; set; }
    public DateTime? EindTijd { get; set; }

    public ActieveVeilingProductDto? HuidigProduct { get; set; }
}


// ────────────────────────────── AUTH ──────────────────────────────
// DTO's voor registratie en inloggen.

public class RegisterDto
{
    [Required, MaxLength(100)]
    public string Naam { get; set; } = string.Empty;

    [Required, EmailAddress]
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    [JsonPropertyName("password")]
    public string Wachtwoord { get; set; } = string.Empty;

    // Wordt genegeerd bij normale registratie; rol wordt in de backend bepaald.
    public string Rol { get; set; } = "Klant";
}


public class LoginDto
{
    [Required, EmailAddress]
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("password")]
    public string Wachtwoord { get; set; } = string.Empty;
}

public class AdminCreateUserDto
{
    [Required, MaxLength(100)]
    public string Naam { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    public string Wachtwoord { get; set; } = string.Empty;

    [Required]
    public string Rol { get; set; } = null!;  // Admin kan hier "Aanvoerder" of "Veilingmeester" kiezen
}


// ────────────────────────────── HISTORISCHE PRIJZEN ──────────────────────────────
// DTO's voor historische prijzen per bloemsoort (categorie).

public class HistorischePrijsItemDto
{
    public string AanvoerderNaam { get; set; } = string.Empty;
    public DateTime Datum { get; set; }
    public decimal PrijsPerBloem { get; set; }
}

public class HistorischePrijzenResponseDto
{
    public string Categorie { get; set; } = string.Empty;
    public string AanvoerderNaam { get; set; } = string.Empty;

    public List<HistorischePrijsItemDto> Laatste10Aanvoerder { get; set; } = new();
    public decimal GemiddeldeAanvoerder { get; set; }

    public List<HistorischePrijsItemDto> Laatste10Alle { get; set; } = new();
    public decimal GemiddeldeAlle { get; set; }
}
