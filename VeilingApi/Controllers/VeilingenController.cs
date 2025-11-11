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
    public VeilingenController(IVeilingService svc) => _svc = svc;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<VeilingDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<VeilingDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<VeilingDto>> Create(CreateVeilingDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var created = await _svc.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = created.VeilingId }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateVeilingDto dto)
    {
        if (id != dto.VeilingId) return BadRequest();
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
