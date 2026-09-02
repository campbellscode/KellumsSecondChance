using KellumsSecondChance.Server.Controllers.Admin;
using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;
using KellumsSecondChance.Server.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace KellumsSecondChance.Server.Tests;

public class BookingRequestTests
{
    private static BookingRequest Booking(BookingRequestStatus status = BookingRequestStatus.Pending) => new()
    {
        FirstName="Avery",LastName="Homeowner",Email="avery@example.com",Phone="513-555-0101",
        PreferredDate=DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)),PreferredTime=new TimeOnly(10,30),
        Address="1 Main St",City="Cincinnati",State="OH",PostalCode="45236",
        ProjectDescription="Inspect the exterior siding and trim.",Status=status,
    };

    [Fact]
    public async Task Pending_can_be_confirmed_and_confirmed_can_be_completed()
    {
        using var database=new TestDatabase();var item=Booking();database.Db.BookingRequests.Add(item);await database.Db.SaveChangesAsync();
        var controller=new AdminBookingsController(database.Db);
        var confirmed=await controller.Update(item.Id,new UpdateBookingRequestDto{Status=BookingRequestStatus.Confirmed,RowVersion=Convert.ToBase64String(item.RowVersion??[])},default);
        Assert.IsType<OkObjectResult>(confirmed.Result);Assert.NotNull(item.ConfirmedAtUtc);
        var completed=await controller.Update(item.Id,new UpdateBookingRequestDto{Status=BookingRequestStatus.Completed,RowVersion=Convert.ToBase64String(item.RowVersion??[])},default);
        Assert.IsType<OkObjectResult>(completed.Result);Assert.NotNull(item.CompletedAtUtc);
    }

    [Fact]
    public async Task Completed_cannot_transition_back_to_pending()
    {
        using var database=new TestDatabase();var item=Booking(BookingRequestStatus.Completed);database.Db.BookingRequests.Add(item);await database.Db.SaveChangesAsync();
        var controller=new AdminBookingsController(database.Db);
        var result=await controller.Update(item.Id,new UpdateBookingRequestDto{Status=BookingRequestStatus.Pending,RowVersion=Convert.ToBase64String(item.RowVersion??[])},default);
        var invalid=Assert.IsType<ObjectResult>(result.Result);Assert.Contains("cannot move",Assert.IsType<ValidationProblemDetails>(invalid.Value).Title);
    }
}
