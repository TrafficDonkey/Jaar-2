using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IAanmeldingService
{
    Task<List<AanmeldingDto>> GetAllAsync();
    Task<AanmeldingDto?> GetByIdAsync(int id);
    Task<AanmeldingDto> CreateAsync(CreateAanmeldingDto dto);
    Task<bool> UpdateAsync(UpdateAanmeldingDto dto);
    Task<bool> DeleteAsync(int id);
}
