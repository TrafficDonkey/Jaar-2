// IGebruikerService.cs
// Interface die de servicecontracten definieert voor GebruikerService.
// Beschrijft alle CRUD-operaties voor gebruikersbeheer.

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IGebruikerService
{
    // Haal alle gebruikers op
    Task<List<GebruikerDto>> GetAllAsync();

    // Haal één gebruiker op via ID
    Task<GebruikerDto?> GetByIdAsync(int id);

    // Maak een nieuwe gebruiker aan
    Task<GebruikerDto> CreateAsync(CreateGebruikerDto dto);

    // Werk een bestaande gebruiker bij
    Task<bool> UpdateAsync(UpdateGebruikerDto dto);

    // Verwijder een gebruiker via ID
    Task<bool> DeleteAsync(int id);
}
