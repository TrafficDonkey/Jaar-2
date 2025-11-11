using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IVeilingService
{
    Task<List<VeilingDto>> GetAllAsync();
    Task<VeilingDto?> GetByIdAsync(int id);
    Task<VeilingDto> CreateAsync(CreateVeilingDto dto);
    Task<bool> UpdateAsync(UpdateVeilingDto dto);
    Task<bool> DeleteAsync(int id);
}
