// IVeilingService.cs
// Interface die de servicecontracten definieert voor VeilingService.
// Beschrijft alle CRUD-operaties voor veilingen.

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IVeilingService
{
    // Haal alle veilingen op
    Task<List<VeilingDto>> GetAllAsync();

    // Haal één veiling op via ID
    Task<VeilingDto?> GetByIdAsync(int id);

    // Maak een nieuwe veiling aan
    Task<VeilingDto> CreateAsync(CreateVeilingDto dto);

    // Werk een bestaande veiling bij
    Task<bool> UpdateAsync(UpdateVeilingDto dto);

    // Verwijder een veiling via ID
    Task<bool> DeleteAsync(int id);
}
