using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeilingApi.Data;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;
    public HealthController(AppDbContext db) => _db = db;

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Get()
    {
        try
        {
            var dbOk = await _db.Database.CanConnectAsync();
            return Ok(new { ok = true, db = new { ok = dbOk } });
        }
        catch (Exception ex)
        {
            return Ok(new { ok = true, db = new { ok = false, error = ex.GetType().Name } });
        }
    }
}
