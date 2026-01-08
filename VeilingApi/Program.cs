// Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using VeilingApi.Data;
using VeilingApi.Models;
using VeilingApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ────────────────────────────── Services ──────────────────────────────

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ✅ DB: lokaal via appsettings.json, Azure via "Connection strings" => DefaultConnection
var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration.GetConnectionString("Default") // fallback als je lokaal nog "Default" hebt
    ?? builder.Configuration["DefaultConnection"];          // fallback als iemand 'm als appsetting zet

if (string.IsNullOrWhiteSpace(connectionString))
{
    // Je wilt liever een duidelijke fout dan vage SQL errors
    throw new InvalidOperationException(
        "Geen connection string gevonden. Zet ConnectionStrings:DefaultConnection in appsettings.json of in Azure (Verbindingsreeksen) met naam DefaultConnection."
    );
}

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(connectionString));

// Dependency Injection services
builder.Services.AddScoped<IGebruikerService, GebruikerService>();
builder.Services.AddScoped<IAanmeldingService, AanmeldingService>();
builder.Services.AddScoped<IVeilingService, VeilingService>();
builder.Services.AddScoped<IVeilingProductService, VeilingProductService>();
builder.Services.AddScoped<IBiedingService, BiedingService>();
builder.Services.AddScoped<IToewijzingService, ToewijzingService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// CORS (lokaal + voeg later je echte frontend domain toe)
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("web", p => p
        .WithOrigins(
            "http://localhost:5173",
            "http://127.0.0.1:5173"
            // Voeg je Azure frontend toe als je die hebt, bv:
            // "https://jouw-frontend.azurestaticapps.net",
            // "https://jouw-frontend-domain.nl"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
    );
});

// JWT-auth
var jwt = builder.Configuration.GetSection("Jwt");
var jwtKey = jwt["Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("Jwt:Key ontbreekt (appsettings of Azure app settings).");

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = signingKey,
            ClockSkew = TimeSpan.Zero
        };

        // Token uit HttpOnly cookie als header ontbreekt
        opts.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token) &&
                    ctx.Request.Cookies.TryGetValue("access_token", out var t))
                {
                    ctx.Token = t;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// ────────────────────────────── Pipeline ──────────────────────────────

// ✅ Swagger ook op Azure (handig voor test). Wil je alleen dev? Zet terug in if (IsDevelopment)
app.UseSwagger();
app.UseSwaggerUI();

// HTTPS
app.UseHttpsRedirection();

// CORS vóór auth
app.UseCors("web");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Root naar Swagger
app.MapGet("/", () => Results.Redirect("/swagger"));

// ────────────────────────────── DB migrate + seed ──────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Log welke connstring hij pakt (handig in Azure logstream)
    Console.WriteLine("DB ConnString = " + db.Database.GetDbConnection().ConnectionString);

    try
    {
        // ✅ Alleen uitvoeren als je echt migrations hebt.
        // Als je nog GEEN migrations hebt, crasht dit anders.
        db.Database.Migrate();

        // Seed admin-account (alleen als DB bereikbaar is)
        const string adminEmail = "admin@floraflow.nl";
        const string adminPassword = "Admin123!";

        var adminBestaat = db.Gebruikers.Any(g => g.Email == adminEmail);
        if (!adminBestaat)
        {
            var admin = new Gebruiker
            {
                Naam = "Beheerder",
                Email = adminEmail,
                Rol = "Admin",
                WachtwoordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword)
            };

            db.Gebruikers.Add(admin);
            db.SaveChanges();
            Console.WriteLine("Admin-account aangemaakt: " + adminEmail);
        }
    }
    catch (Exception ex)
    {
        // ✅ Laat app NIET doodgaan op Azure.
        Console.WriteLine("DB init (Migrate/Seed) failed: " + ex);
        // In dev wil je wel hard falen zodat je het merkt:
        if (app.Environment.IsDevelopment()) throw;
    }
}

app.Run();
