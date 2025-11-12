// AanmeldingenController.cs
// Controller voor het beheren van aanmeldingen (CRUD).
// Verwerkt HTTP-verzoeken, roept de service-laag aan en retourneert HTTP-antwoorden.

using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AanmeldingenController : ControllerBase
{
    private readonly IAanmeldingService _svc;

    // Injecteert de service die de logica voor aanmeldingen afhandelt
    public AanmeldingenController(IAanmeldingService svc) => _svc = svc;

    // ────────────────────────────── GET ──────────────────────────────

    // Haalt alle aanmeldingen op
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AanmeldingDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    // Haalt één specifieke aanmelding op via ID
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AanmeldingDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    // ────────────────────────────── POST ──────────────────────────────

    // Maakt een nieuwe aanmelding aan
    [HttpPost]
    public async Task<ActionResult<AanmeldingDto>> Create(CreateAanmeldingDto dto)
    {
        // Controleer of het aangeleverde model geldig is
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var created = await _svc.CreateAsync(dto);
            // Retourneert 201 Created met link naar de nieuwe aanmelding
            return CreatedAtAction(nameof(Get), new { id = created.AanmeldingId }, created);
        }
        catch (InvalidOperationException ex)
        {
            // Fout bij ongeldige input of logische overtreding
            return BadRequest(ex.Message);
        }
    }

    // ────────────────────────────── PUT ──────────────────────────────

    // Wijzigt een bestaande aanmelding
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateAanmeldingDto dto)
    {
        // ID in route moet overeenkomen met ID in DTO
        if (id != dto.AanmeldingId) return BadRequest();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var ok = await _svc.UpdateAsync(dto);
        return ok ? NoContent() : NotFound();
    }

    // ────────────────────────────── DELETE ──────────────────────────────

    // Verwijdert een aanmelding op basis van ID
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
