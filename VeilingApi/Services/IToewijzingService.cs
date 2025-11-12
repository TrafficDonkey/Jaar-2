// IToewijzingService.cs
// Interface die de servicecontracten definieert voor ToewijzingService.
// Beschrijft de methoden voor het ophalen, aanmaken en verwijderen van toewijzingen (eindverkopen).

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IToewijzingService
{
    // Haal alle toewijzingen op (inclusief koper- en productinformatie)
    Task<List<ToewijzingDto>> GetAllAsync();

    // Haal één toewijzing op via ID
    Task<ToewijzingDto?> GetByIdAsync(int id);

    // Maak een nieuwe toewijzing aan
    Task<ToewijzingDto> CreateAsync(CreateToewijzingDto dto);

    // Verwijder een toewijzing via ID
    Task<bool> DeleteAsync(int id);
}
