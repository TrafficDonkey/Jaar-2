// AuthService.cs
// Service voor registreren en inloggen. Maakt JWT-tokens aan op basis van de
// gebruiker in de database (incl. rol-claim).

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using VeilingApi.Data;
using VeilingApi.Models;

namespace VeilingApi.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // ────────────────────────────── REGISTREREN ──────────────────────────────
    public async Task<(bool Success, string? ErrorMessage, Gebruiker? Gebruiker)> RegisterAsync(RegisterDto dto)
    {
        var exists = await _db.Gebruikers.AnyAsync(u => u.Email == dto.Email);
        if (exists)
            return (false, "E-mailadres is al geregistreerd", null);

        var gebruiker = new Gebruiker
        {
            Naam = dto.Naam,
            Email = dto.Email,
            Rol = dto.Rol, // bij zelf-registratie typisch "Klant"
            WachtwoordHash = BCrypt.Net.BCrypt.HashPassword(dto.Wachtwoord)
        };

        _db.Gebruikers.Add(gebruiker);
        await _db.SaveChangesAsync();

        return (true, null, gebruiker);
    }

    // ────────────────────────────── INLOGGEN ──────────────────────────────
    // Geeft JWT-token + rol + gebruikerId terug
    public async Task<(string? Token, string? Role, int? GebruikerId)> LoginAsync(string email, string wachtwoord)
    {
        var gebruiker = await _db.Gebruikers.FirstOrDefaultAsync(u => u.Email == email);
        if (gebruiker == null)
            return (null, null, null);

        var stored = gebruiker.WachtwoordHash ?? string.Empty;

        bool isBcrypt = stored.StartsWith("$2a$") || stored.StartsWith("$2b$") || stored.StartsWith("$2y$");

        bool ok;

        if (isBcrypt)
        {
            // normale, nieuwe users (bcrypt)
            ok = BCrypt.Net.BCrypt.Verify(wachtwoord, stored);
        }
        else
        {
            // legacy: er staat plain text in de database
            ok = stored == wachtwoord;

            // optioneel: meteen upgraden naar bcrypt
            if (ok)
            {
                gebruiker.WachtwoordHash = BCrypt.Net.BCrypt.HashPassword(wachtwoord);
                await _db.SaveChangesAsync();
            }
        }

        if (!ok)
            return (null, null, null);

        // Vanaf hier: token maken
        var key = _config["Jwt:Key"];
        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("Jwt:Key is not configured.");

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, gebruiker.GebruikerId.ToString()),
            new Claim(ClaimTypes.Email, gebruiker.Email),
            new Claim(ClaimTypes.Role, gebruiker.Rol),
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: creds
        );

        var jwtString = new JwtSecurityTokenHandler().WriteToken(token);

        return (jwtString, gebruiker.Rol, gebruiker.GebruikerId);
    }

    // ────────────────────────────── AdminCreateUserAsync ──────────────────────────────
    public async Task<GebruikerDto> AdminCreateUserAsync(AdminCreateUserDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();

        // Email moet uniek zijn
        var exists = await _db.Gebruikers.AnyAsync(g => g.Email.ToLower() == email);
        if (exists)
            throw new InvalidOperationException("Er bestaat al een gebruiker met dit e-mailadres.");

        // Admin mag geen nieuwe Admin-accounts maken via deze weg
        var rol = dto.Rol.Trim();
        if (string.Equals(rol, "Admin", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Admin-rollen kunnen niet via deze route worden aangemaakt.");

        var gebruiker = new Gebruiker
        {
            Naam = dto.Naam.Trim(),
            Email = email,
            Rol = rol,
            WachtwoordHash = BCrypt.Net.BCrypt.HashPassword(dto.Wachtwoord)
        };

        _db.Gebruikers.Add(gebruiker);
        await _db.SaveChangesAsync();

        return new GebruikerDto
        {
            GebruikerId = gebruiker.GebruikerId,
            Naam = gebruiker.Naam,
            Email = gebruiker.Email,
            Rol = gebruiker.Rol
        };
    }
}
