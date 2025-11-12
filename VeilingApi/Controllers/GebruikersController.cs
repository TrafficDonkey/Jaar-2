// GebruikersController.cs
// Controller voor het beheren van gebruikers (CRUD-functionaliteit).
// Handelt HTTP-verzoeken af en communiceert met de service-laag voor gebruikersbeheer.

using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GebruikersController : ControllerBase
{
    private readonly IGebruikerService _svc;

    // Injecteert de service die de logica voor gebruikers afhandelt
    public GebruikersController(IGebruikerService svc) => _svc = svc;

    // ────────────────────────────── GET ──────────────────────────────

    // Haalt alle gebruikers op
    [HttpGet]
    public async Task<ActionResult<IEnumerable<GebruikerDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    // Haalt één specifieke gebruiker op via ID
    [HttpGet("{id:int}")]
    public async Task<ActionResult<GebruikerDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    // ────────────────────────────── POST ──────────────────────────────

    // Maakt een nieuwe gebruiker aan
    [HttpPost]
    public async Task<ActionResult<GebruikerDto>> Create(CreateGebruikerDto dto)
    {
        // Controleer of het model geldig is
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var created = await _svc.CreateAsync(dto);
        // Retourneert 201 Created met link naar de nieuwe gebruiker
        return CreatedAtAction(nameof(Get), new { id = created.GebruikerId }, created);
    }

    // ────────────────────────────── PUT ──────────────────────────────

    // Wijzigt een bestaande gebruiker
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateGebruikerDto dto)
    {
        // ID in route moet overeenkomen met ID in DTO
        if (id != dto.GebruikerId) return BadRequest();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var ok = await _svc.UpdateAsync(dto);
        return ok ? NoContent() : NotFound();
    }

    // ────────────────────────────── DELETE ──────────────────────────────

    // Verwijdert een gebruiker op basis van ID
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
