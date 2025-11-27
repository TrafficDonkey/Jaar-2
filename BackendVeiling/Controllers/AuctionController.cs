using Microsoft.AspNetCore.Mvc;
using System;

namespace BackendVeiling.Controllers
{
    [ApiController]
    [Route("auction")]
    public class AuctionController : ControllerBase
    {
        private static Product product = new Product();
        private static System.Timers.Timer auctionTimer;
        private static bool auctionRunning = false;
        private static bool productBought = false;

        [HttpPost("start")]
        public ActionResult StartAuction([FromBody] AuctionRequest request)
        {
            product.Name = request.ProductName;
            product.MinPrice = request.MinPrice;
            product.MaxPrice = request.MaxPrice;
            product.DurationSeconds = request.TimeSeconds;
            product.StartTime = DateTime.UtcNow;
            product.CurrentPrice = product.MaxPrice;

            productBought = false;
            auctionRunning = true;

            auctionTimer?.Stop();
            auctionTimer = new System.Timers.Timer(100);
            auctionTimer.Elapsed += (sender, e) =>
            {
                var elapsed = (DateTime.UtcNow - product.StartTime).TotalSeconds;

                if (elapsed >= product.DurationSeconds)
                {
                    product.CurrentPrice = product.MinPrice;
                    auctionRunning = false;
                    auctionTimer.Stop();
                }
                else
                {
                    var diff = product.MaxPrice - product.MinPrice;
                    product.CurrentPrice = product.MaxPrice - diff * (decimal)(elapsed / product.DurationSeconds);
                }
            };
            auctionTimer.Start();

            return Ok(new { message = "Auction started" });
        }

        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            int remaining = auctionRunning
                ? product.DurationSeconds - (int)(DateTime.UtcNow - product.StartTime).TotalSeconds
                : 0;
            
            string message = null;

            if (!auctionRunning && !productBought && remaining == 0)
            {
                message = "Het product is niet gekocht.";
            }

            return Ok(new
            {
                status = auctionRunning ? "running" : "ended",
                currentPrice = product.CurrentPrice,
                timeRemaining = remaining < 0 ? 0 : remaining,
                message = message
            });
        }

        [HttpPost("buy")]
        public IActionResult Buy()
        {
            if (!auctionRunning)
                return BadRequest(new { message = "De veiling is al afgelopen." });

            auctionRunning = false;
            productBought = true;
            auctionTimer?.Stop();

            return Ok(new { message = $"Product {product.Name} gekocht voor €{product.CurrentPrice:F2}!" });
        }
    }

    public class Product
    {
        public string Name { get; set; }
        public decimal MinPrice { get; set; }
        public decimal MaxPrice { get; set; }
        public int DurationSeconds { get; set; }
        public DateTime StartTime { get; set; }
        public decimal CurrentPrice { get; set; }
    }

    public class AuctionRequest
    {
        public string ProductName { get; set; }
        public decimal MinPrice { get; set; }
        public decimal MaxPrice { get; set; }
        public int TimeSeconds { get; set; }
    }
}
