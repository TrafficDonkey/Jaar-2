// AppDbContext.cs
// Databasecontext voor de VeilingApi.
// Definieert de tabellen (DbSets) en configureert relaties, datatypes en beperkingen via EF Core.

using Microsoft.EntityFrameworkCore;
using VeilingApi.Models;

namespace VeilingApi.Data;

public class AppDbContext : DbContext
{
    // Constructor met databaseopties, doorgegeven vanuit Program.cs
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // ────────────────────────────── DbSets ──────────────────────────────
    // Tabellen in de database die overeenkomen met de models

    public DbSet<Gebruiker> Gebruikers => Set<Gebruiker>();
    public DbSet<Aanvoerder> Aanvoerders => Set<Aanvoerder>();
    public DbSet<Aanmelding> Aanmeldingen => Set<Aanmelding>();
    public DbSet<Veiling> Veilingen => Set<Veiling>();
    public DbSet<VeilingProduct> VeilingProducts => Set<VeilingProduct>();
    public DbSet<Bieding> Biedingen => Set<Bieding>();
    public DbSet<Toewijzing> Toewijzingen => Set<Toewijzing>();

    // ────────────────────────────── Modelconfiguratie ──────────────────────────────

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // ───── Kolomtypes ─────
        // Stel geldbedragen in met 2 decimalen
        mb.Entity<Aanmelding>().Property(p => p.MinimumPrijs).HasColumnType("decimal(10,2)");
        mb.Entity<Bieding>().Property(p => p.Bedrag).HasColumnType("decimal(10,2)");
        mb.Entity<Toewijzing>().Property(p => p.EindPrijs).HasColumnType("decimal(10,2)");

        // ───── Relaties ─────

        // Een aanmelding hoort bij één aanvoerder; een aanvoerder heeft meerdere aanmeldingen
        mb.Entity<Aanmelding>()
          .HasOne(a => a.Aanvoerder)
          .WithMany(v => v.Aanmeldingen)
          .HasForeignKey(a => a.AanvoerderId)
          .OnDelete(DeleteBehavior.Restrict);

        // Een veiling wordt gestart door één gebruiker
        mb.Entity<Veiling>()
          .HasOne(v => v.GestartDoor)
          .WithMany(g => g.GestarteVeilingen)
          .HasForeignKey(v => v.GestartDoorId)
          .OnDelete(DeleteBehavior.Restrict);

        // Een veiling heeft meerdere producten (kavels)
        mb.Entity<VeilingProduct>()
          .HasOne(vp => vp.Veiling)
          .WithMany(v => v.Kavels)
          .HasForeignKey(vp => vp.VeilingId)
          .OnDelete(DeleteBehavior.Cascade);

        // Een aanmelding hoort bij exact één veilingproduct
        mb.Entity<VeilingProduct>()
          .HasOne(vp => vp.Aanmelding)
          .WithOne(a => a.VeilingProduct)
          .HasForeignKey<VeilingProduct>(vp => vp.AanmeldingId)
          .OnDelete(DeleteBehavior.Restrict);

        // Elke combinatie van VeilingId en VolgordeVeiling moet uniek zijn
        mb.Entity<VeilingProduct>()
          .HasIndex(vp => new { vp.VeilingId, vp.VolgordeVeiling })
          .IsUnique();

        // Een bieding hoort bij één veilingproduct
        mb.Entity<Bieding>()
          .HasOne(b => b.VeilingProduct)
          .WithMany(vp => vp.Biedingen)
          .HasForeignKey(b => b.VeilingProductId)
          .OnDelete(DeleteBehavior.Cascade);

        // Een bieding hoort bij één gebruiker
        mb.Entity<Bieding>()
          .HasOne(b => b.Gebruiker)
          .WithMany(g => g.Biedingen)
          .HasForeignKey(b => b.GebruikerId)
          .OnDelete(DeleteBehavior.Restrict);

        // Een toewijzing hoort bij één veilingproduct
        mb.Entity<Toewijzing>()
          .HasOne(t => t.VeilingProduct)
          .WithOne(vp => vp.Toewijzing)
          .HasForeignKey<Toewijzing>(t => t.VeilingProductId)
          .OnDelete(DeleteBehavior.Cascade);

        // Een koper (gebruiker) kan meerdere aankopen hebben
        mb.Entity<Toewijzing>()
          .HasOne(t => t.Koper)
          .WithMany(g => g.Aankopen)
          .HasForeignKey(t => t.KoperId)
          .OnDelete(DeleteBehavior.Restrict);
    }
}
