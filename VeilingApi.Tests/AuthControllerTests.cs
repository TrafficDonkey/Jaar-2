using Xunit;
using Moq;
using Microsoft.AspNetCore.Mvc;
using VeilingApi.Controllers;
using VeilingApi.Services;
using VeilingApi.Models;
namespace VeilingApi.Tests;

public class AuthControllerTests
{
    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenTokenIsNull()
    {
        // Test: Login geeft 401 terug als er geen token wordt uitgegeven.
        // Arrange
        var mockSvc = new Mock<IAuthService>();

        // Mock tuple return value
        mockSvc.Setup(s => s.LoginAsync("test@test.nl", "wrong", null))
            .ReturnsAsync((Token: (string?)null, Role: (string?)null, GebruikerId: (int?)null, TwoFactorRequired: false, TwoFactorInvalid: false));

        var controller = new AuthController(mockSvc.Object);

        var dto = new LoginDto
        {
            Email = "test@test.nl",
            Wachtwoord = "wrong"
        };

        // Act
        var result = await controller.Login(dto);

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task Login_ReturnsOk_WhenTokenIsPresent()
    {
        // Test: Login geeft 200 terug als er een token is.
        var mockSvc = new Mock<IAuthService>();
        mockSvc.Setup(s => s.LoginAsync("test@test.nl", "pass", null))
            .ReturnsAsync((Token: "jwt", Role: "Klant", GebruikerId: 5, TwoFactorRequired: false, TwoFactorInvalid: false));

        var controller = new AuthController(mockSvc.Object);
        var dto = new LoginDto { Email = "test@test.nl", Wachtwoord = "pass" };

        var result = await controller.Login(dto);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task Register_ReturnsBadRequest_WhenServiceFails()
    {
        // Test: Register geeft 400 terug als de service faalt.
        var mockSvc = new Mock<IAuthService>();
        mockSvc.Setup(s => s.RegisterAsync(It.IsAny<RegisterDto>()))
            .ReturnsAsync((Success: false, ErrorMessage: "fail", Gebruiker: (Gebruiker?)null));

        var controller = new AuthController(mockSvc.Object);
        var dto = new RegisterDto { Naam = "Test", Email = "t@t.nl", Wachtwoord = "123456" };

        var result = await controller.Register(dto);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Register_ReturnsOk_WhenServiceSucceeds()
    {
        // Test: Register geeft 200 terug als de service slaagt.
        var mockSvc = new Mock<IAuthService>();
        mockSvc.Setup(s => s.RegisterAsync(It.IsAny<RegisterDto>()))
            .ReturnsAsync((Success: true, ErrorMessage: (string?)null, Gebruiker: new Gebruiker { GebruikerId = 1 }));

        var controller = new AuthController(mockSvc.Object);
        var dto = new RegisterDto { Naam = "Test", Email = "t@t.nl", Wachtwoord = "123456" };

        var result = await controller.Register(dto);

        Assert.IsType<OkObjectResult>(result);
    }
}
