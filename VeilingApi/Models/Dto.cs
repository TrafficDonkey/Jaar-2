using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace VeilingApi.Models;

// ====== GEBRUIKER ======
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

    // in jouw project komt dit uit register
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


// ====== AANVOERDER ======
public class AanvoerderDto
{
    public int AanvoerderId { get; set; }
    public string Naam { get; set; } = string.Empty;
    public int AantalAanmeldingen { get; set; }
}

public class CreateAanvoerderDto
{
    [Required, StringLength(120)]
    public string Naam { get; set; } = string.Empty;
}

public class UpdateAanvoerderDto
{
    [Required]
    public int AanvoerderId { get; set; }

    [Required, StringLength(120)]
    public string Naam { get; set; } = string.Empty;
}


// ====== AANMELDING ======
public class AanmeldingDto
{
    public int AanmeldingId { get; set; }
    public string? FotoUrl { get; set; }
    public string ProductBeschrijving { get; set; } = string.Empty;
    public int Hoeveelheid { get; set; }
    public decimal MinimumPrijs { get; set; }
    public string GewensteKlokLocatie { get; set; } = string.Empty;
    public DateTime GewensteVeilDatum { get; set; }
    public int AanvoerderId { get; set; }
    public string AanvoerderNaam { get; set; } = string.Empty;
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

    [Required]
    public string GewensteKlokLocatie { get; set; } = "Naaldwijk";

    [Required]
    public DateTime GewensteVeilDatum { get; set; }

    [Required]
    public int AanvoerderId { get; set; }
}

public class UpdateAanmeldingDto : CreateAanmeldingDto
{
    [Required]
    public int AanmeldingId { get; set; }
}


// ====== VEILING ======
public class VeilingDto
{
    public int VeilingId { get; set; }
    public DateTime StartTijd { get; set; }
    public DateTime EindTijd { get; set; }
    public string Status { get; set; } = string.Empty;
    public int AantalKavels { get; set; }
}

public class CreateVeilingDto
{
    [Required]
    public DateTime StartTijd { get; set; }

    [Required]
    public DateTime EindTijd { get; set; }

    [Required]
    public string Status { get; set; } = "Gepland";

    [Required]
    public int GestartDoorId { get; set; }
}

public class UpdateVeilingDto : CreateVeilingDto
{
    [Required]
    public int VeilingId { get; set; }
}


// ====== VEILINGPRODUCT ======
public class VeilingProductDto
{
    public int VeilingProductId { get; set; }
    public int VeilingId { get; set; }
    public DateTime VeilingStart { get; set; }
    public int AanmeldingId { get; set; }
    public string ProductBeschrijving { get; set; } = string.Empty;
    public int VolgordeVeiling { get; set; }
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


// ====== BIEDING ======
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


// ====== TOEWIJZING ======
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

public class RegisterDto
{
    [Required, MaxLength(100)]
    public string Naam { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, MinLength(6)]
    [JsonPropertyName("password")]
    public string Wachtwoord { get; set; } = string.Empty;

    [Required]
    public string Rol { get; set; } = "Aanvoerder";
}

public class LoginDto
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [JsonPropertyName("password")]
    public string Wachtwoord { get; set; } = string.Empty;
}
