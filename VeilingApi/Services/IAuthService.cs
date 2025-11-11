using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IAuthService
{
    Task<(bool Success, string? ErrorMessage, Gebruiker? Gebruiker)> RegisterAsync(RegisterDto dto);
    Task<string?> LoginAsync(string email, string wachtwoord);
}
