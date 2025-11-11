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
    public BiedingenController(IBiedingService svc) => _svc = svc;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BiedingDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BiedingDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<BiedingDto>> Create(CreateBiedingDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        try
        {
            var created = await _svc.CreateAsync(dto);
            return CreatedAtAction(nameof(Get), new { id = created.BiedingId }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
