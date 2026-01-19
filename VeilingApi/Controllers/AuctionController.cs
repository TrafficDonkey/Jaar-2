using Microsoft.AspNetCore.Mvc;

namespace VeilingApi.Controllers;

[ApiController]
[Route("auction")]
public class AuctionController : ControllerBase
{
    private static Product _product = new();
    private static System.Timers.Timer? _auctionTimer;
    private static bool _auctionRunning;
    private static bool _productBought;

    [HttpPost("start")]
    public ActionResult StartAuction([FromBody] AuctionRequest request)
    {
        _product.Name = request.ProductName;
        _product.MinPrice = request.MinPrice;
        _product.MaxPrice = request.MaxPrice;
        _product.DurationSeconds = request.TimeSeconds;
        _product.StartTime = DateTime.UtcNow;
        _product.CurrentPrice = _product.MaxPrice;

        _productBought = false;
        _auctionRunning = true;

        _auctionTimer?.Stop();
        _auctionTimer = new System.Timers.Timer(100);
        _auctionTimer.Elapsed += (_, _) =>
        {
            var elapsed = (DateTime.UtcNow - _product.StartTime).TotalSeconds;

            if (elapsed >= _product.DurationSeconds)
            {
                _product.CurrentPrice = _product.MinPrice;
                _auctionRunning = false;
                _auctionTimer?.Stop();
                return;
            }

            var diff = _product.MaxPrice - _product.MinPrice;
            _product.CurrentPrice =
                _product.MaxPrice - diff * (decimal)(elapsed / _product.DurationSeconds);
        };
        _auctionTimer.Start();

        return Ok(new { message = "Auction started" });
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var remaining = _auctionRunning
            ? _product.DurationSeconds - (int)(DateTime.UtcNow - _product.StartTime).TotalSeconds
            : 0;

        string? message = null;
        if (!_auctionRunning && !_productBought && remaining <= 0)
        {
            message = "Het product is niet gekocht.";
        }

        return Ok(new
        {
            status = _auctionRunning ? "running" : "ended",
            currentPrice = _product.CurrentPrice,
            timeRemaining = Math.Max(0, remaining),
            message
        });
    }

    [HttpPost("buy")]
    public IActionResult Buy()
    {
        if (!_auctionRunning)
        {
            return BadRequest(new { message = "De veiling is al afgelopen." });
        }

        _auctionRunning = false;
        _productBought = true;
        _auctionTimer?.Stop();

        return Ok(new { message = $"Product {_product.Name} gekocht voor €{_product.CurrentPrice:F2}!" });
    }

    private sealed class Product
    {
        public string Name { get; set; } = string.Empty;
        public decimal MinPrice { get; set; }
        public decimal MaxPrice { get; set; }
        public int DurationSeconds { get; set; }
        public DateTime StartTime { get; set; }
        public decimal CurrentPrice { get; set; }
    }

    public sealed class AuctionRequest
    {
        public string ProductName { get; set; } = string.Empty;
        public decimal MinPrice { get; set; }
        public decimal MaxPrice { get; set; }
        public int TimeSeconds { get; set; }
    }
}
