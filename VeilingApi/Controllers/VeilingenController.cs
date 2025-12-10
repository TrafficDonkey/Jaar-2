// VeilingenController.cs
// API-controller voor veilingen (CRUD + endpoint voor actieve veiling).

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;
using System.Security.Claims;


namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VeilingenController : ControllerBase
{
    private readonly IVeilingService _svc;

    public VeilingenController(IVeilingService svc) => _svc = svc;

    // ────────────────────────────── GET: /api/Veilingen ──────────────────────────────
    [HttpGet]
    public async Task<ActionResult<IEnumerable<VeilingDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    // ────────────────────────────── GET: /api/Veilingen/{id} ─────────────────────────
    [HttpGet("{id:int}")]
    public async Task<ActionResult<VeilingDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    // ────────────────────────────── Actieve veiling voor kopers ──────────────────────────────
    // GET: api/Veilingen/actief
    [HttpGet("actief")]
    [Authorize(Roles = "Klant, Veilingmeester, Admin")]         // optioneel, mag je weghalen als je wilt dat iedereen hem kan zien
    public async Task<ActionResult<VeilingDto>> GetActief()
    {
        var v = await _svc.GetActieveAsync();

        if (v == null)
        {
            // Dit is een "functionele" 404 (geen actieve veiling)
            return NotFound(new { message = "Er is op dit moment geen actieve veiling." });
        }

        return Ok(v);
    }

    // ────────────────────────────── POST: /api/Veilingen ────────────────────────────
    [HttpPost]
    [Authorize(Roles = "Veilingmeester,Admin")]
    public async Task<ActionResult<VeilingDto>> Create(CreateVeilingDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var created = await _svc.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = created.VeilingId }, created);
    }

    // ────────────────────────────── PUT: /api/Veilingen/{id} ─────────────────────────
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Veilingmeester,Admin")]
    public async Task<IActionResult> Update(int id, UpdateVeilingDto dto)
    {
        if (id != dto.VeilingId) return BadRequest();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var ok = await _svc.UpdateAsync(dto);
        return ok ? NoContent() : NotFound();
    }

    // ────────────────────────────── DELETE: /api/Veilingen/{id} ──────────────────────
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Veilingmeester,Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("start")]
        [Authorize(Roles = "Veilingmeester,Admin")]
        public async Task<ActionResult<VeilingDto>> StartVeiling(StartVeilingDto dto)
        {
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrWhiteSpace(idClaim) || !int.TryParse(idClaim, out var gestartDoorId))
                return Unauthorized("Geen geldig gebruikers-ID in token.");

            var result = await _svc.StartVeilingAsync(dto, gestartDoorId);

            if (result == null)
                return BadRequest("Kon veiling niet starten.");

            return Ok(result);
        }
    
    // ────────────────────────────── GET: /api/Veilingen/archief ──────────────────────────────
    // Alle veilingen die NIET meer actief zijn (b.v. Status = "Afgerond")
    [HttpGet("archief")]
    [Authorize(Roles = "Veilingmeester,Admin")]
    public async Task<ActionResult<IEnumerable<VeilingDto>>> GetArchief()
    {
        var items = await _svc.GetArchiefAsync();
        return Ok(items);
    }

    // ────────────────────────────── POST: /api/Veilingen/{id}/stop ───────────────────────────
    // Markeer een veiling als afgerond (handmatig stoppen door veilingmeester)
    [HttpPost("{id:int}/stop")]
    [Authorize(Roles = "Veilingmeester,Admin")]
    public async Task<IActionResult> Stop(int id)
    {
        var ok = await _svc.StopVeilingAsync(id);
        if (!ok) return NotFound();
        return NoContent();
    }


}
