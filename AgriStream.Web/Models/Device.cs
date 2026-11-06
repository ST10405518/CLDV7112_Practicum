using System.ComponentModel.DataAnnotations;

namespace AgriStream.Web.Models;

// Master device registry; the queue-triggered function updates Status.
public class Device
{
    [Key]
    public int DeviceId { get; set; }

    [Required, StringLength(80)]
    public string Name { get; set; } = "";

    [Required, StringLength(20)]
    public string FieldId { get; set; } = "";

    [StringLength(20)]
    public string Status { get; set; } = "Idle";

    public DateTime? LastCommandUtc { get; set; }
}
