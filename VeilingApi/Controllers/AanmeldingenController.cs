// AanmeldingenController.cs
// API-controller voor CRUD op Aanmeldingen en filters per gebruiker (aanvoerder).

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;
using System.Security.Claims;


namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AanmeldingenController : ControllerBase
{
    private readonly IAanmeldingService _svc;
    public AanmeldingenController(IAanmeldingService svc) => _svc = svc;

    private static readonly HashSet<string> AllowedFotoContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp"
    };

    private static readonly HashSet<string> AllowedFotoExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp"
    };

    // ────────────────────────────── GET ──────────────────────────────

    // Alle aanmeldingen
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AanmeldingDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

        // ────────────────────────────── GET: eigen aanmeldingen ──────────────────────────────
        // Geeft alle aanmeldingen terug van de ingelogde aanvoerder (gebaseerd op GebruikerId in het JWT)
        [HttpGet("mine")]
        [Authorize(Roles = "Aanvoerder,Admin")]
        public async Task<ActionResult<IEnumerable<AanmeldingDto>>> GetMine()
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idClaim, out var gebruikerId))
                return Unauthorized("Kon GebruikerId niet bepalen uit token.");

            var list = await _svc.GetForAanvoerderAsync(gebruikerId);
            return Ok(list);
        }


    // Eén aanmelding
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AanmeldingDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("{id:int}/foto")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFoto(int id)
    {
        var foto = await _svc.GetFotoAsync(id);
        if (foto is null || foto.FotoData.Length == 0)
            return NotFound();

        return File(foto.FotoData, foto.FotoContentType);
    }

    // Aanmeldingen van een specifieke gebruiker (aanvoerder)
    [HttpGet("by-gebruiker/{gebruikerId:int}")]
    public async Task<ActionResult<IEnumerable<AanmeldingDto>>> GetByGebruiker(int gebruikerId)
        => Ok(await _svc.GetByGebruikerAsync(gebruikerId));

    // ────────────────────────────── POST ──────────────────────────────

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<AanmeldingDto>> Create([FromForm] CreateAanmeldingFormDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        byte[]? fotoData = null;
        string? fotoContentType = null;
        string? fotoFileName = null;

        if (dto.Foto != null)
        {
            if (dto.Foto.Length == 0)
                return BadRequest(new { message = "De foto is leeg." });

            var ext = Path.GetExtension(dto.Foto.FileName ?? string.Empty);
            if (!AllowedFotoExtensions.Contains(ext))
            {
                return BadRequest(new
                {
                    message = "Ongeldig fotoformaat. Gebruik jpg, jpeg, png, gif of webp."
                });
            }

            if (!AllowedFotoContentTypes.Contains(dto.Foto.ContentType ?? string.Empty))
            {
                return BadRequest(new
                {
                    message = "Ongeldig fotoformaat. Gebruik jpg, jpeg, png, gif of webp."
                });
            }

            await using var ms = new MemoryStream();
            await dto.Foto.CopyToAsync(ms);
            fotoData = ms.ToArray();
            fotoContentType = dto.Foto.ContentType;
            fotoFileName = dto.Foto.FileName;
        }

        var created = await _svc.CreateAsync(new CreateAanmeldingDto
        {
            FotoData = fotoData,
            FotoContentType = fotoContentType,
            FotoFileName = fotoFileName,
            ProductBeschrijving = dto.ProductBeschrijving,
            Hoeveelheid = dto.Hoeveelheid,
            MinimumPrijs = dto.MinimumPrijs,
            Categorie = dto.Categorie,
            GewensteKlokLocatie = dto.GewensteKlokLocatie,
            GewensteVeilDatum = dto.GewensteVeilDatum,
            GebruikerId = dto.GebruikerId,
            PlantDiameterCm = dto.PlantDiameterCm,
            PlantLengteCm = dto.PlantLengteCm,
            PotMaat = dto.PotMaat
        });

        return CreatedAtAction(nameof(Get), new { id = created.AanmeldingId }, created);
    }

    [HttpPost("json")]
    [Consumes("application/json")]
    public async Task<ActionResult<AanmeldingDto>> CreateJson([FromBody] CreateAanmeldingDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var created = await _svc.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = created.AanmeldingId }, created);
    }

    // ────────────────────────────── PUT ──────────────────────────────

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAanmeldingDto dto)
    {
        if (id != dto.AanmeldingId) return BadRequest();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var ok = await _svc.UpdateAsync(dto);
        return ok ? NoContent() : NotFound();
    }

    // ────────────────────────────── DELETE ──────────────────────────────

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }

    [HttpGet("open")]
    [Authorize(Roles = "Veilingmeester,Admin")]
    public async Task<ActionResult<IEnumerable<AanmeldingDto>>> GetOpen()
    {
        var list = await _svc.GetOpenAsync();
        return Ok(list);
    }

}
