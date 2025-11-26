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

    // Aanmeldingen van een specifieke gebruiker (aanvoerder)
    [HttpGet("by-gebruiker/{gebruikerId:int}")]
    public async Task<ActionResult<IEnumerable<AanmeldingDto>>> GetByGebruiker(int gebruikerId)
        => Ok(await _svc.GetByGebruikerAsync(gebruikerId));

    // ────────────────────────────── POST ──────────────────────────────

    [HttpPost]
    public async Task<ActionResult<AanmeldingDto>> Create([FromBody] CreateAanmeldingDto dto)
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
