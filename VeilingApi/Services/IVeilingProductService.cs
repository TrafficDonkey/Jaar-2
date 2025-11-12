// IVeilingProductService.cs
// Interface die de servicecontracten definieert voor VeilingProductService.
// Beschrijft alle CRUD-operaties voor veilingproducten (kavels binnen een veiling).

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IVeilingProductService
{
    // Haal alle veilingproducten op
    Task<List<VeilingProductDto>> GetAllAsync();

    // Haal één veilingproduct op via ID
    Task<VeilingProductDto?> GetByIdAsync(int id);

    // Maak een nieuw veilingproduct aan
    Task<VeilingProductDto> CreateAsync(CreateVeilingProductDto dto);

    // Werk een bestaand veilingproduct bij
    Task<bool> UpdateAsync(UpdateVeilingProductDto dto);

    // Verwijder een veilingproduct via ID
    Task<bool> DeleteAsync(int id);
}
