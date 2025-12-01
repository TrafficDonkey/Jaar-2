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
        // Arrange
        var mockSvc = new Mock<IAuthService>();

        // Mock tuple return value
        mockSvc.Setup(s => s.LoginAsync("test@test.nl", "wrong"))
            .ReturnsAsync((Token: (string?)null, Role: (string?)null, GebruikerId: (int?)null));

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
}