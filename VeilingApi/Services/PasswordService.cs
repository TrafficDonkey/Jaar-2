// PasswordService.cs
// Service voor het hashen en verifiëren van wachtwoorden met ASP.NET Core Identity.
// Wordt gebruikt voor veilige opslag en controle van gebruikerswachtwoorden.

using Microsoft.AspNetCore.Identity;

namespace VeilingApi.Services
{
    public class PasswordService
    {
        // Interne ASP.NET Identity PasswordHasher (gebruikt standaard beveiligde algoritmen)
        private readonly PasswordHasher<string> _hasher = new();

        // ────────────────────────────── HASH ──────────────────────────────
        // Maakt een gehashte versie van een wachtwoord
        public string Hash(string plain)
            => _hasher.HashPassword("", plain);

        // ────────────────────────────── VERIFY ──────────────────────────────
        // Controleert of een ingevoerd wachtwoord overeenkomt met een bestaande hash
        public bool Verify(string hash, string plain)
            => _hasher.VerifyHashedPassword("", hash, plain) is not PasswordVerificationResult.Failed;
    }
}
