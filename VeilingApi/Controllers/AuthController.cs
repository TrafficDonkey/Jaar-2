// AuthController.cs
// Controller voor gebruikersauthenticatie (registratie en inloggen).
// Verwerkt verzoeken voor accountbeheer en tokenaanmaak via de AuthService.

using Microsoft.AspNetCore.Mvc;
using VeilingApi.Models;
using VeilingApi.Services;
using Microsoft.AspNetCore.Authorization;

namespace VeilingApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _svc;

    // Injecteert de authenticatieservice
    public AuthController(IAuthService svc)
    {
        _svc = svc;
    }

    // ────────────────────────────── REGISTER ──────────────────────────────

    // Registreert een nieuwe gebruiker
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        // Controleer of de input geldig is
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _svc.RegisterAsync(dto);

        // Controleer of de registratie succesvol was
        if (!result.Success)
            return BadRequest(new { message = result.ErrorMessage });

        return Ok(new { message = "Registratie succesvol", gebruiker = result.Gebruiker });
    }

    // ────────────────────────────── LOGIN ──────────────────────────────

    // Logt een gebruiker in en retourneert een JWT-token
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        // Controleer of de input geldig is
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var token = await _svc.LoginAsync(dto.Email, dto.Wachtwoord);

        // Geef foutmelding bij onjuiste inloggegevens
        if (token == null)
            return Unauthorized(new { message = "Onjuiste inloggegevens" });

        return Ok(new { token });
    }
}
