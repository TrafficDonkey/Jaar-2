// IAuthService.cs
// Interface die de authenticatiefunctionaliteit definieert voor AuthService.
// Bevat methoden voor registratie en inloggen van gebruikers met JWT-authenticatie.

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IAuthService
{
    // Registreer een nieuwe gebruiker
    // Retourneert een tuple met successtatus, eventuele foutmelding en de aangemaakte gebruiker
    Task<(bool Success, string? ErrorMessage, Gebruiker? Gebruiker)> RegisterAsync(RegisterDto dto);

    // Log een bestaande gebruiker in
    // Retourneert een JWT-token als string, of null bij ongeldige inloggegevens
    Task<string?> LoginAsync(string email, string wachtwoord);
}
