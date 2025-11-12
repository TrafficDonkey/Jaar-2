// VeilingenController.cs
// Controller voor het beheren van veilingen (CRUD-functionaliteit).
// Handelt HTTP-verzoeken af en communiceert met de service-laag voor veilingen.

using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VeilingenController : ControllerBase
{
    private readonly IVeilingService _svc;

    // Injecteert de service die de logica voor veilingen beheert
    public VeilingenController(IVeilingService svc) => _svc = svc;

    // ────────────────────────────── GET ──────────────────────────────

    // Haalt alle veilingen op
    [HttpGet]
    public async Task<ActionResult<IEnumerable<VeilingDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    // Haalt één specifieke veiling op via ID
    [HttpGet("{id:int}")]
    public async Task<ActionResult<VeilingDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    // ────────────────────────────── POST ──────────────────────────────

    // Maakt een nieuwe veiling aan
    [HttpPost]
    public async Task<ActionResult<VeilingDto>> Create(CreateVeilingDto dto)
    {
        // Controleer of het model geldig is
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var created = await _svc.CreateAsync(dto);
        // Retourneert 201 Created met link naar de nieuwe veiling
        return CreatedAtAction(nameof(Get), new { id = created.VeilingId }, created);
    }

    // ────────────────────────────── PUT ──────────────────────────────

    // Wijzigt een bestaande veiling
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateVeilingDto dto)
    {
        // ID in route moet overeenkomen met ID in DTO
        if (id != dto.VeilingId) return BadRequest();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var ok = await _svc.UpdateAsync(dto);
        return ok ? NoContent() : NotFound();
    }

    // ────────────────────────────── DELETE ──────────────────────────────

    // Verwijdert een veiling op basis van ID
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
