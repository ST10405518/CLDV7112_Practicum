using AgriStream.Web.Models;

namespace AgriStream.Web.Data;

public static class DbSeeder
{
    // Creates the tables on first run and adds a demo admin plus sample devices.
    public static void Seed(AppDbContext db)
    {
        db.Database.EnsureCreated();

        if (!db.Users.Any())
        {
            db.Users.Add(new AppUser { Username = "admin", PasswordHash = PasswordHelper.Hash("Admin@123"), Role = Roles.Admin });
            db.SaveChanges();
        }

        if (!db.Devices.Any())
        {
            db.Devices.AddRange(
                new Device { DeviceId = 1, Name = "Pivot Irrigator North", FieldId = "F1" },
                new Device { DeviceId = 2, Name = "Drip Line East", FieldId = "F1" },
                new Device { DeviceId = 3, Name = "Sprinkler West", FieldId = "F2" });
            db.SaveChanges();
        }
    }
}
