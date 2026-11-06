using AgriStream.Web.Models;
using Microsoft.EntityFrameworkCore;


namespace AgriStream.Web.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Device> Devices => Set<Device>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<AppUser>().HasIndex(u => u.Username).IsUnique();
        // Ids are assigned by the seeder, matching what the functions reference.
        b.Entity<Device>().Property(d => d.DeviceId).ValueGeneratedNever();
    }
}
