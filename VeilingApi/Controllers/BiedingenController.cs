// BiedingenController.cs
// Controller voor het beheren van biedingen binnen veilingen.
// Verwerkt HTTP-verzoeken voor ophalen, aanmaken en verwijderen van biedingen.

using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BiedingenController : ControllerBase
{
    private readonly IBiedingService _svc;

    // Injecteert de service die de biedingslogica afhandelt
    public BiedingenController(IBiedingService svc) => _svc = svc;

    // ────────────────────────────── GET ──────────────────────────────

    // Haalt alle biedingen op
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BiedingDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    // Haalt één specifieke bieding op via ID
    [HttpGet("{id:int}")]
    public async Task<ActionResult<BiedingDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    // ────────────────────────────── POST ──────────────────────────────

    // Maakt een nieuwe bieding aan
    [HttpPost]
    public async Task<ActionResult<BiedingDto>> Create(CreateBiedingDto dto)
    {
        // Controleer of het model geldig is
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var created = await _svc.CreateAsync(dto);
            // Retourneert 201 Created met de nieuwe bieding
            return CreatedAtAction(nameof(Get), new { id = created.BiedingId }, created);
        }
        catch (InvalidOperationException ex)
        {
            // Fout bij ongeldige bieding (bijv. lager dan minimumprijs)
            return BadRequest(ex.Message);
        }
    }

    // ────────────────────────────── DELETE ──────────────────────────────

    // Verwijdert een bieding op basis van ID
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
