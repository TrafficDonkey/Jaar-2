using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IAuthService
{
    Task<(bool Success, string? ErrorMessage, Gebruiker? Gebruiker)> RegisterAsync(RegisterDto dto);

    // Login: geeft nu ook Rol + GebruikerId terug
    Task<(string? Token, string? Role, int? GebruikerId, bool TwoFactorRequired, bool TwoFactorInvalid)> LoginAsync(
        string email,
        string wachtwoord,
        string? twoFactorCode
    );

     // ────────────────────────────── Admin ──────────────────────────────
    // Laat een admin een nieuw account aanmaken met gekozen rol.
    Task<GebruikerDto> AdminCreateUserAsync(AdminCreateUserDto dto);

    Task<(bool Success, string? Secret, string? OtpAuthUrl, string? ErrorMessage)> StartTwoFactorSetupAsync(int gebruikerId);
    Task<(bool Success, string? ErrorMessage)> EnableTwoFactorAsync(int gebruikerId, string code);
    Task<(bool Success, string? ErrorMessage)> DisableTwoFactorAsync(int gebruikerId, string code);
}

