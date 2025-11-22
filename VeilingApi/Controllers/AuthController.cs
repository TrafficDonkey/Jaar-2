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

        var result = await _svc.LoginAsync(dto.Email, dto.Wachtwoord);

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

    // ───────────────────── Admin: gebruiker met rol aanmaken ─────────────────────
    // [HttpPost("admin-create")]
    // [Authorize(Roles = "Admin")]
    // public async Task<IActionResult> AdminCreate([FromBody] AdminCreateUserDto dto)
    // {
    //     if (!ModelState.IsValid)
    //         return BadRequest(ModelState);

    //     var result = await _svc.AdminCreateAsync(dto);

    //     if (!result.Success)
    //         return BadRequest(new { message = result.ErrorMessage });

    //     return Ok(new { message = "Gebruiker aangemaakt", gebruiker = result.Gebruiker });
    // }
}
