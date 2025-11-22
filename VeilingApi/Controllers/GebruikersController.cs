// GebruikersController.cs
// Beheer van gebruikers (lezen, aanmaken, bijwerken, verwijderen).
// - Admin: mag alle gebruikers zien, aanmaken, wijzigen en verwijderen.
// - Normale gebruiker: mag alleen zijn eigen profiel lezen en bijwerken.

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // iedereen moet ingelogd zijn, maar rol verschilt per actie
public class GebruikersController : ControllerBase
{
    private readonly IGebruikerService _svc;

    public GebruikersController(IGebruikerService svc)
    {
        _svc = svc;
    }

    // ────────────────────────────── GET: api/Gebruikers (alle users, alleen Admin) ──────────────────────────────

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<GebruikerDto>>> GetAll()
        => Ok(await _svc.GetAllAsync());

    // ────────────────────────────── GET: api/Gebruikers/{id} ──────────────────────────────
    // Ingezet voor o.a. SettingsPage. Elke ingelogde gebruiker mag dit gebruiken.

    [HttpGet("{id:int}")]
    public async Task<ActionResult<GebruikerDto>> Get(int id)
    {
        var item = await _svc.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    // ────────────────────────────── POST: api/Gebruikers (alleen Admin) ──────────────────────────────
    // Admin kan accounts aanmaken namens Aanvoerders / Veilingmeesters.

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<GebruikerDto>> Create(CreateGebruikerDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var created = await _svc.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = created.GebruikerId }, created);
    }

    // ────────────────────────────── PUT: api/Gebruikers/{id} ──────────────────────────────
    // Admin: mag iedereen wijzigen.
    // Niet-admin: mag alleen zijn eigen profiel wijzigen.

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateGebruikerDto dto)
    {
        if (id != dto.GebruikerId)
            return BadRequest("Route-id komt niet overeen met body-id.");

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Huidige caller uit het JWT halen
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (idClaim is null)
            return Forbid(); // geen geldig token

        var callerId = int.Parse(idClaim);
        var isAdmin = User.IsInRole("Admin");

        // Als je geen admin bent en je probeert iemand anders te wijzigen → Forbid
        if (!isAdmin && callerId != id)
            return Forbid();

        var ok = await _svc.UpdateAsync(dto);
        return ok ? NoContent() : NotFound();
    }

    // ────────────────────────────── DELETE: api/Gebruikers/{id} (alleen Admin) ──────────────────────────────

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var ok = await _svc.DeleteAsync(id);
        return ok ? NoContent() : NotFound();
    }
}
