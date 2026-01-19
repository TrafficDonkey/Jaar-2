// VeilingProductsController.cs
// Controller voor het beheren van veilingproducten (CRUD-functionaliteit).
// Verwerkt HTTP-verzoeken en communiceert met de service-laag voor productbeheer binnen veilingen.

using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VeilingProductsController : ControllerBase
{
    private readonly IVeilingProductService _svc;
    private readonly IHistorischePrijsService _historischePrijsService;

    // Injecteert de service die de logica voor veilingproducten beheert
    public VeilingProductsController(
        IVeilingProductService svc,
        IHistorischePrijsService historischePrijsService)
    {
        _svc = svc;
        _historischePrijsService = historischePrijsService;
    }

    // ────────────────────────────── GET ──────────────────────────────

    // Haalt alle veilingproducten op
    [HttpGet]
    public async Task<ActionResult<IEnumerable<VeilingProductDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    // Haalt één specifiek veilingproduct op via ID
    [HttpGet("{id:int}")]
    public async Task<ActionResult<VeilingProductDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    // Historische prijzen voor een specifiek veilingproduct
    [HttpGet("{id:int}/historische-prijzen")]
    public async Task<ActionResult<HistorischePrijzenResponseDto>> GetHistorischePrijzen(int id)
    {
        var result = await _historischePrijsService.GetHistorischePrijzenAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    // ────────────────────────────── POST ──────────────────────────────

    // Maakt een nieuw veilingproduct aan
    [HttpPost]
    public async Task<ActionResult<VeilingProductDto>> Create(CreateVeilingProductDto dto)
    {
        // Controleer of het model geldig is
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var created = await _svc.CreateAsync(dto);
        // Retourneert 201 Created met link naar het nieuwe product
        return CreatedAtAction(nameof(Get), new { id = created.VeilingProductId }, created);
    }

    // ────────────────────────────── PUT ──────────────────────────────

    // Wijzigt een bestaand veilingproduct
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateVeilingProductDto dto)
    {
        // ID in route moet overeenkomen met ID in DTO
        if (id != dto.VeilingProductId) return BadRequest();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var ok = await _svc.UpdateAsync(dto);
        return ok ? NoContent() : NotFound();
    }

    // ────────────────────────────── DELETE ──────────────────────────────

    // Verwijdert een veilingproduct op basis van ID
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
