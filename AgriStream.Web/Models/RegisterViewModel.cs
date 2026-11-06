using System.ComponentModel.DataAnnotations;

namespace AgriStream.Web.Models;

public class RegisterViewModel
{
    [Required, StringLength(50)] public string Username { get; set; } = "";

    [Required, StringLength(100, MinimumLength = 6), DataType(DataType.Password)]
    public string Password { get; set; } = "";

    [Required] public string Role { get; set; } = Roles.Farmer;
}
