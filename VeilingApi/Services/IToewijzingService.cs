// IToewijzingService.cs
// Servicecontract voor toewijzingen (kavels die verkocht zijn).

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IToewijzingService
{
    Task<List<ToewijzingDto>> GetAllAsync();
    Task<ToewijzingDto?> GetByIdAsync(int id);

    // Toewijzingen voor kavels van een bepaalde aanvoerder (gebruikerId)
    Task<List<ToewijzingDto>> GetByGebruikerAsync(int gebruikerId);

    Task<ToewijzingDto> CreateAsync(CreateToewijzingDto dto);
    Task<bool> DeleteAsync(int id);
}
