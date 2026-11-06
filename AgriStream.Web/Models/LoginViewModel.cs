using System.ComponentModel.DataAnnotations;

namespace AgriStream.Web.Models;

public class LoginViewModel
{
    [Required] public string Username { get; set; } = "";

    [Required, DataType(DataType.Password)] public string Password { get; set; } = "";
}
