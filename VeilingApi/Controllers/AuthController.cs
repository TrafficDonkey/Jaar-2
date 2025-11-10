using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Models;
using VeilingApi.Services;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _cfg;
    private readonly PasswordService _pwd = new();

    public AuthController(AppDbContext db, IConfiguration cfg)
    {
        _db = db; _cfg = cfg;
    }

   [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var email = dto.Email.Trim().ToLowerInvariant();

            if (await _db.Gebruikers.AnyAsync(u => u.Email.ToLower() == email))
                return Conflict(new { message = "Email already in use" });

            var user = new Gebruiker
            {
                Naam = dto.Naam.Trim(),
                Email = email,
                WachtwoordHash = _pwd.Hash(dto.Password),
                Rol = dto.Rol
            };

            _db.Gebruikers.Add(user);
            await _db.SaveChangesAsync();
            return Created($"/api/gebruiker/{user.GebruikerId}",
                new { user.GebruikerId, user.Naam, user.Email, user.Rol });
}

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();

        var user = await _db.Gebruikers
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

        if (user is null || !_pwd.Verify(user.WachtwoordHash, dto.Password))
            return Unauthorized();

        var jwt = _cfg.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.GebruikerId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Rol)
        };

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(jwt["AccessTokenMinutes"]!)),
            signingCredentials: creds);

        var tokenStr = new JwtSecurityTokenHandler().WriteToken(token);

        Response.Cookies.Append("access_token", tokenStr, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTimeOffset.UtcNow.AddMinutes(int.Parse(jwt["AccessTokenMinutes"]!))
        });

        return Ok(new { ok = true, role = user.Rol, naam = user.Naam });
    }
}

public record RegisterDto(string Naam, string Email, string Password, string Rol);
public record LoginDto(string Email, string Password);
