<<<<<<< HEAD
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Linq;
using System.Text;
using VeilingApi.Data;
=======
// Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using VeilingApi.Data;
using VeilingApi.Models;
>>>>>>> origin/fullproject-abel
using VeilingApi.Services;

var builder = WebApplication.CreateBuilder(args);

<<<<<<< HEAD
// Add services to the container.
=======
// ────────────────────────────── Services ──────────────────────────────

>>>>>>> origin/fullproject-abel
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen();

<<<<<<< HEAD
// Register DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// Register services
=======
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
>>>>>>> origin/fullproject-abel
builder.Services.AddScoped<IGebruikerService, GebruikerService>();
builder.Services.AddScoped<IAanmeldingService, AanmeldingService>();
builder.Services.AddScoped<IVeilingService, VeilingService>();
builder.Services.AddScoped<IVeilingProductService, VeilingProductService>();
builder.Services.AddScoped<IBiedingService, BiedingService>();
builder.Services.AddScoped<IToewijzingService, ToewijzingService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IHistorischePrijsService, HistorischePrijsService>();

<<<<<<< HEAD
// Custom API behavior: nette NL validatiefouten
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(e => e.Value.Errors.Count > 0)
            .Select(e => new
            {
                Field = e.Key,
                Errors = e.Value.Errors.Select(er => er.ErrorMessage)
            });

        return new BadRequestObjectResult(new
        {
            Message = "Sommige velden zijn niet correct ingevuld.",
            Fouten = errors
        });
    };
});

// Configure JWT authentication
var jwt = builder.Configuration.GetSection("Jwt");
var jwtKey = jwt.GetValue<string>("Key") ?? throw new InvalidOperationException("JWT key ontbreekt in configuratie.");
var jwtIssuer = jwt.GetValue<string>("Issuer") ?? throw new InvalidOperationException("JWT issuer ontbreekt in configuratie.");
var jwtAudience = jwt.GetValue<string>("Audience") ?? throw new InvalidOperationException("JWT audience ontbreekt in configuratie.");
=======
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
>>>>>>> origin/fullproject-abel

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateIssuer = true,
            ValidateAudience = true,
<<<<<<< HEAD
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience
=======
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
>>>>>>> origin/fullproject-abel
        };
    });

builder.Services.AddAuthorization();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("web", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

<<<<<<< HEAD
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Database migration + seed admin user
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    // Seed hardcoded admin
    if (!db.Gebruikers.Any(g => g.Email == "admin@floraflow.nl"))
    {
        var admin = new VeilingApi.Models.Gebruiker
        {
            Naam = "Beheerder",
            Email = "admin@floraflow.nl",
            Rol = "Admin",
            WachtwoordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!")
        };

        db.Gebruikers.Add(admin);
        db.SaveChanges();
    }
}

app.UseHttpsRedirection();

app.UseCors("web");

app.UseAuthentication();
app.UseAuthorization();

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception)
    {
        context.Response.StatusCode = 500;
        await context.Response.WriteAsJsonAsync(new
        {
            message = "Er is iets misgegaan. Probeer het later opnieuw."
        });
    }
});

app.MapControllers();
=======
// ────────────────────────────── Pipeline ──────────────────────────────

// Swagger ook op Azure
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("web");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
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
>>>>>>> origin/fullproject-abel

app.Run();
