using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Moq;
using VeilingApi.Controllers;
using VeilingApi.Models;
using VeilingApi.Services;
using Xunit;

namespace VeilingApi.Tests;

public class VeilingProductsControllerTests
{
    [Fact]
    public async Task GetHistorischePrijzen_ReturnsNotFound_WhenServiceReturnsNull()
    {
        // Test: Controller geeft 404 terug als service null returnt.
        var productSvc = new Mock<IVeilingProductService>();
        var historySvc = new Mock<IHistorischePrijsService>();
        historySvc.Setup(s => s.GetHistorischePrijzenAsync(10, null))
            .ReturnsAsync((HistorischePrijzenResponseDto?)null);

        var controller = new VeilingProductsController(productSvc.Object, historySvc.Object);

        var result = await controller.GetHistorischePrijzen(10);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetHistorischePrijzen_ReturnsOk_WithResponse()
    {
        // Test: Controller geeft 200 terug met payload als service data levert.
        var productSvc = new Mock<IVeilingProductService>();
        var historySvc = new Mock<IHistorischePrijsService>();
        var dto = new HistorischePrijzenResponseDto
        {
            Categorie = "Snijbloemen",
            AanvoerderNaam = "Firma de Groot",
            Laatste10Aanvoerder = new List<HistorischePrijsItemDto>(),
            Laatste10Alle = new List<HistorischePrijsItemDto>()
        };
        historySvc.Setup(s => s.GetHistorischePrijzenAsync(5, null)).ReturnsAsync(dto);

        var controller = new VeilingProductsController(productSvc.Object, historySvc.Object);

        var result = await controller.GetHistorischePrijzen(5);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(dto, ok.Value);
    }

    [Fact]
    public async Task GetHistorischePrijzen_CallsService_WithId()
    {
        // Test: Controller roept service aan met het juiste ID.
        var productSvc = new Mock<IVeilingProductService>();
        var historySvc = new Mock<IHistorischePrijsService>();
        historySvc.Setup(s => s.GetHistorischePrijzenAsync(7, null))
            .ReturnsAsync(new HistorischePrijzenResponseDto());

        var controller = new VeilingProductsController(productSvc.Object, historySvc.Object);

        await controller.GetHistorischePrijzen(7);

        historySvc.Verify(s => s.GetHistorischePrijzenAsync(7, null), Times.Once);
    }
}
