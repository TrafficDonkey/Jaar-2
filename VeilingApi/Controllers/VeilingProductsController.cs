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
    public VeilingProductsController(IVeilingProductService svc) => _svc = svc;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<VeilingProductDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<VeilingProductDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<VeilingProductDto>> Create(CreateVeilingProductDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var created = await _svc.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = created.VeilingProductId }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateVeilingProductDto dto)
    {
        if (id != dto.VeilingProductId) return BadRequest();
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var ok = await _svc.UpdateAsync(dto);
        return ok ? NoContent() : NotFound();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
