using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IAuthService
{
    Task<(bool Success, string? ErrorMessage, Gebruiker? Gebruiker)> RegisterAsync(RegisterDto dto);

    // Login: geeft nu ook Rol + GebruikerId terug
    Task<(string? Token, string? Role, int? GebruikerId)> LoginAsync(string email, string wachtwoord);
}

