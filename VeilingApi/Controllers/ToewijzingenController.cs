// ToewijzingenController.cs
// Controller voor het beheren van toewijzingen (bijv. koppelingen tussen biedingen en producten).
// Verwerkt HTTP-verzoeken voor ophalen, aanmaken en verwijderen van toewijzingen.

using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ToewijzingenController : ControllerBase
{
    private readonly IToewijzingService _svc;

    // Injecteert de service die de logica voor toewijzingen afhandelt
    public ToewijzingenController(IToewijzingService svc) => _svc = svc;

    // ────────────────────────────── GET ──────────────────────────────

    // Haalt alle toewijzingen op
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ToewijzingDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    // Haalt één specifieke toewijzing op via ID
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ToewijzingDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    // ────────────────────────────── POST ──────────────────────────────

    // Maakt een nieuwe toewijzing aan
    [HttpPost]
    public async Task<ActionResult<ToewijzingDto>> Create(CreateToewijzingDto dto)
    {
        // Controleer of het model geldig is
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var created = await _svc.CreateAsync(dto);
            // Retourneert 201 Created met de nieuwe toewijzing
            return CreatedAtAction(nameof(Get), new { id = created.ToewijzingId }, created);
        }
        catch (InvalidOperationException ex)
        {
            // Fout bij een ongeldige toewijzing (bijv. dubbele koppeling)
            return BadRequest(ex.Message);
        }
    }

    // ────────────────────────────── DELETE ──────────────────────────────

    // Verwijdert een toewijzing op basis van ID
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
