using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _svc;

    public AuthController(IAuthService svc)
    {
        _svc = svc;
    }

    // ────────────────────────────── Registratie ──────────────────────────────
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _svc.RegisterAsync(dto);

        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(new { message = "Registratie succesvol", gebruiker = result.Gebruiker });
    }

    // ────────────────────────────── Login ──────────────────────────────
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _svc.LoginAsync(dto.Email, dto.Wachtwoord, dto.TwoFactorCode);

        if (result.TwoFactorRequired)
        {
            return Unauthorized(new
            {
                message = result.TwoFactorInvalid ? "Ongeldige verificatiecode" : "2FA-code vereist",
                twoFactorRequired = true
            });
        }

        if (result.Token == null)
            return Unauthorized(new { message = "Onjuiste inloggegevens" });

        // Geef token + rol + gebruikerId terug aan de frontend
        return Ok(new
        {
            token = result.Token,
            role = result.Role,
            gebruikerId = result.GebruikerId
        });
    }

    [HttpPost("2fa/setup")]
    [Authorize]
    public async Task<IActionResult> StartTwoFactorSetup()
    {
        var gebruikerId = GetUserId();
        if (!gebruikerId.HasValue)
            return Unauthorized(new { message = "Geen geldig gebruikers-ID in token." });

        var result = await _svc.StartTwoFactorSetupAsync(gebruikerId.Value);
        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(new
        {
            secret = result.Secret,
            otpauthUrl = result.OtpAuthUrl
        });
    }

    [HttpPost("2fa/enable")]
    [Authorize]
    public async Task<IActionResult> EnableTwoFactor([FromBody] TwoFactorCodeDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var gebruikerId = GetUserId();
        if (!gebruikerId.HasValue)
            return Unauthorized(new { message = "Geen geldig gebruikers-ID in token." });

        var result = await _svc.EnableTwoFactorAsync(gebruikerId.Value, dto.Code);
        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(new { enabled = true });
    }

    [HttpPost("2fa/disable")]
    [Authorize]
    public async Task<IActionResult> DisableTwoFactor([FromBody] TwoFactorCodeDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var gebruikerId = GetUserId();
        if (!gebruikerId.HasValue)
            return Unauthorized(new { message = "Geen geldig gebruikers-ID in token." });

        var result = await _svc.DisableTwoFactorAsync(gebruikerId.Value, dto.Code);
        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(new { enabled = false });
    }

    private int? GetUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(idClaim, out var id) ? id : null;
    }

    //───────────────────── Admin: gebruiker met rol aanmaken ─────────────────────
    [HttpPost("admin-create")]
    [Authorize(Roles = "Admin")]
    
    // ────────────────────────────── Admin: nieuwe gebruiker maken ──────────────────────────────
    // Route: POST /api/auth/admin/create-user
    // Alleen bereikbaar voor ingelogde gebruikers met rol "Admin".
    [HttpPost("admin/create-user")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<GebruikerDto>> AdminCreateUser(AdminCreateUserDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var created = await _svc.AdminCreateUserAsync(dto);

        // 201 Created teruggeven; frontend hoeft de Location niet per se te gebruiken.
        return CreatedAtAction(nameof(AdminCreateUser),
            new { id = created.GebruikerId },
            created);
    }
}
