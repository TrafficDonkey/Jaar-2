// Program.cs
// Startpunt van de VeilingApi-backend.
// Stelt services, database, authenticatie en middleware in voor de ASP.NET Core-applicatie.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Data;
using VeilingApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ────────────────────────────── Services ──────────────────────────────

// Controllers en Swagger voor API-documentatie
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Databaseconfiguratie (SQL Server) via connection string in appsettings.json
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// Registratie van servicelaag voor dependency injection
builder.Services.AddScoped<IGebruikerService, GebruikerService>();
builder.Services.AddScoped<IAanmeldingService, AanmeldingService>();
builder.Services.AddScoped<IVeilingService, VeilingService>();
builder.Services.AddScoped<IVeilingProductService, VeilingProductService>();
builder.Services.AddScoped<IBiedingService, BiedingService>();
builder.Services.AddScoped<IToewijzingService, ToewijzingService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// CORS-beleid: sta frontend toe vanaf localhost
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("web", p => p
        .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

// JWT-authenticatie configuratie
var jwt = builder.Configuration.GetSection("Jwt");
var signingKey = new SymmetricSecurityKey(
    Encoding.UTF8.GetBytes(jwt["Key"] ?? throw new InvalidOperationException("Jwt:Key ontbreekt"))
);

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
            ClockSkew = TimeSpan.Zero // Geen vertraging bij token-verval
        };

        // Haal token op uit HttpOnly cookie ("access_token") als header-token ontbreekt
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

// Autorisatie toevoegen
builder.Services.AddAuthorization();

var app = builder.Build();

// ────────────────────────────── Pipeline ──────────────────────────────

// Activeer Swagger alleen in ontwikkelmodus
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Controleer database en voer migraties automatisch uit
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    Console.WriteLine("DB-verbinding: " + db.Database.GetDbConnection().ConnectionString);
    db.Database.Migrate();
}

// Forceer HTTPS-omleiding
app.UseHttpsRedirection();

// Pas CORS toe vóór authenticatie en routing
app.UseCors("web");

// Pas authenticatie en autorisatie toe in juiste volgorde
app.UseAuthentication();
app.UseAuthorization();

// Koppel alle controllers aan hun routes
app.MapControllers();

// Redirect root ("/") naar Swagger
app.MapGet("/", () => Results.Redirect("/swagger"));

// Start de applicatie
app.Run();
