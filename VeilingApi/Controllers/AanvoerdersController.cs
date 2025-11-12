// AanvoerdersController.cs
// Controller voor het beheren van aanvoerders (CRUD-functionaliteit).
// Handelt HTTP-verzoeken af en communiceert met de service-laag.

using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AanvoerdersController : ControllerBase
{
    private readonly IAanvoerderService _svc;

    // Injecteert de service die de logica voor aanvoerders beheert
    public AanvoerdersController(IAanvoerderService svc) => _svc = svc;

    // ────────────────────────────── GET ──────────────────────────────

    // Haalt alle aanvoerders op
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AanvoerderDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    // Haalt één specifieke aanvoerder op via ID
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AanvoerderDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    // ────────────────────────────── POST ──────────────────────────────

    // Maakt een nieuwe aanvoerder aan
    [HttpPost]
    public async Task<ActionResult<AanvoerderDto>> Create(CreateAanvoerderDto dto)
    {
        // Controleer of het model geldig is
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var created = await _svc.CreateAsync(dto);
        // Retourneert 201 Created met link naar de nieuwe aanvoerder
        return CreatedAtAction(nameof(Get), new { id = created.AanvoerderId }, created);
    }

    // ────────────────────────────── PUT ──────────────────────────────

    // Wijzigt een bestaande aanvoerder
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateAanvoerderDto dto)
    {
        // ID in route moet overeenkomen met ID in DTO
        if (id != dto.AanvoerderId) return BadRequest();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var ok = await _svc.UpdateAsync(dto);
        return ok ? NoContent() : NotFound();
    }

    // ────────────────────────────── DELETE ──────────────────────────────

    // Verwijdert een aanvoerder op basis van ID
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
