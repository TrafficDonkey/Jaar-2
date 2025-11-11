using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IAanvoerderService
{
    Task<List<AanvoerderDto>> GetAllAsync();
    Task<AanvoerderDto?> GetByIdAsync(int id);
    Task<AanvoerderDto> CreateAsync(CreateAanvoerderDto dto);
    Task<bool> UpdateAsync(UpdateAanvoerderDto dto);
    Task<bool> DeleteAsync(int id);
}
