using System.ComponentModel.DataAnnotations;

namespace AgriStream.Web.Models;

public class AppUser
{
    public int Id { get; set; }

    [Required, StringLength(50)]
    public string Username { get; set; } = "";

    // Stored as "salt:hash" (PBKDF2), never the plain password.
    [Required]
    public string PasswordHash { get; set; } = "";

    [Required, StringLength(20)]
    public string Role { get; set; } = Roles.Farmer;
}
