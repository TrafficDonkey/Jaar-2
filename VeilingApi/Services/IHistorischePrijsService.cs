// IHistorischePrijsService.cs
// Contract voor het ophalen van historische prijsinformatie via raw SQL.

using VeilingApi.Models;

namespace VeilingApi.Services;

public interface IHistorischePrijsService
{
    Task<HistorischePrijzenResponseDto?> GetHistorischePrijzenAsync(int veilingProductId, string? productNaam = null);
}
