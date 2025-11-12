// AuthService.cs
// Service voor registratie en inloggen, inclusief wachtwoord-hashing (BCrypt) en JWT-token generatie.

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

    // Constructor: injecteert databasecontext en configuratie
    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // ────────────────────────────── REGISTER ──────────────────────────────
    // Registreer een nieuwe gebruiker; valideer uniek e-mailadres en hash het wachtwoord
    public async Task<(bool Success, string? ErrorMessage, Gebruiker? Gebruiker)> RegisterAsync(RegisterDto dto)
    {
        var exists = await _db.Gebruikers.AnyAsync(u => u.Email == dto.Email);
        if (exists)
            return (false, "E-mailadres is al geregistreerd", null);

        var gebruiker = new Gebruiker
        {
            Naam = dto.Naam,
            Email = dto.Email,
            Rol = dto.Rol,
            WachtwoordHash = BCrypt.Net.BCrypt.HashPassword(dto.Wachtwoord)
        };

        _db.Gebruikers.Add(gebruiker);
        await _db.SaveChangesAsync();

        return (true, null, gebruiker);
    }

    // ────────────────────────────── LOGIN ──────────────────────────────
    // Log in met e-mail en wachtwoord; valideer hash en maak een JWT-token aan
    public async Task<string?> LoginAsync(string email, string wachtwoord)
    {
        var gebruiker = await _db.Gebruikers.FirstOrDefaultAsync(u => u.Email == email);
        if (gebruiker == null)
            return null;

        var stored = gebruiker.WachtwoordHash ?? string.Empty;

        // Detecteer of wachtwoord in BCrypt-formaat is opgeslagen
        bool isBcrypt = stored.StartsWith("$2a$") || stored.StartsWith("$2b$") || stored.StartsWith("$2y$");

        bool ok;

        if (isBcrypt)
        {
            // Verifieer ingevoerd wachtwoord tegen de BCrypt-hash
            ok = BCrypt.Net.BCrypt.Verify(wachtwoord, stored);
        }
        else
        {
            // Legacy: wachtwoord stond als plain text in de database
            ok = stored == wachtwoord;

            // Optioneel: upgrade direct naar BCrypt-hash wanneer validatie slaagt
            if (ok)
            {
                gebruiker.WachtwoordHash = BCrypt.Net.BCrypt.HashPassword(wachtwoord);
                await _db.SaveChangesAsync();
            }
        }

        if (!ok)
            return null;

        // Maak een JWT-token met claims op basis van de ingelogde gebruiker
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

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

}
