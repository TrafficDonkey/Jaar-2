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

//builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ✅ Connection string: Azure (DefaultConnection) of lokaal
var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration.GetConnectionString("Default")
    ?? builder.Configuration["DefaultConnection"];

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Geen connection string gevonden. Verwacht ConnectionStrings:DefaultConnection."
    );
}

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(connectionString));

// Dependency Injection
builder.Services.AddScoped<IGebruikerService, GebruikerService>();
builder.Services.AddScoped<IAanmeldingService, AanmeldingService>();
builder.Services.AddScoped<IVeilingService, VeilingService>();
builder.Services.AddScoped<IVeilingProductService, VeilingProductService>();
builder.Services.AddScoped<IBiedingService, BiedingService>();
builder.Services.AddScoped<IToewijzingService, ToewijzingService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// CORS
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("web", p => p
        .WithOrigins(
            "http://localhost:5173",
            "http://127.0.0.1:5173"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

// JWT
var jwt = builder.Configuration.GetSection("Jwt");
var jwtKey = jwt["Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("Jwt:Key ontbreekt.");
}

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

// Swagger ook op Azure
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();

//app.MapControllers();
app.MapGet("/", () => Results.Redirect("/swagger"));

// ────────────────────────────── DB INIT (VEILIG) ──────────────────────────────

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Log om te verifiëren dat Azure SQL wordt gebruikt
    Console.WriteLine("DB ConnString = " + db.Database.GetDbConnection().ConnectionString);

    try
    {
        // ❗ BELANGRIJK:
        // NOOIT automatisch migreren op Azure (Production)
        if (app.Environment.IsDevelopment())
        {
            db.Database.Migrate();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("DB migrate skipped/failure: " + ex);
        if (app.Environment.IsDevelopment())
            throw;
    }
}

app.Run();
