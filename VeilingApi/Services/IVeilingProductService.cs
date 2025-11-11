using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IVeilingProductService
{
    Task<List<VeilingProductDto>> GetAllAsync();
    Task<VeilingProductDto?> GetByIdAsync(int id);
    Task<VeilingProductDto> CreateAsync(CreateVeilingProductDto dto);
    Task<bool> UpdateAsync(UpdateVeilingProductDto dto);
    Task<bool> DeleteAsync(int id);
}
