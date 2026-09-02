using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KellumsSecondChance.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadDeliveryTrackingAndAttribution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LandingPage",
                table: "EstimateRequests",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NotificationAttemptCount",
                table: "EstimateRequests",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "NotificationAttemptedAtUtc",
                table: "EstimateRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NotificationDeliveredAtUtc",
                table: "EstimateRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NotificationFailedAtUtc",
                table: "EstimateRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NotificationFailureCategory",
                table: "EstimateRequests",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReferrerUrl",
                table: "EstimateRequests",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmCampaign",
                table: "EstimateRequests",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmContent",
                table: "EstimateRequests",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmMedium",
                table: "EstimateRequests",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmSource",
                table: "EstimateRequests",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UtmTerm",
                table: "EstimateRequests",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NotificationAttemptCount",
                table: "EmploymentInterests",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "NotificationAttemptedAtUtc",
                table: "EmploymentInterests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NotificationDeliveredAtUtc",
                table: "EmploymentInterests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NotificationFailedAtUtc",
                table: "EmploymentInterests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NotificationFailureCategory",
                table: "EmploymentInterests",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LandingPage",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "NotificationAttemptCount",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "NotificationAttemptedAtUtc",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "NotificationDeliveredAtUtc",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "NotificationFailedAtUtc",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "NotificationFailureCategory",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "ReferrerUrl",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "UtmCampaign",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "UtmContent",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "UtmMedium",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "UtmSource",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "UtmTerm",
                table: "EstimateRequests");

            migrationBuilder.DropColumn(
                name: "NotificationAttemptCount",
                table: "EmploymentInterests");

            migrationBuilder.DropColumn(
                name: "NotificationAttemptedAtUtc",
                table: "EmploymentInterests");

            migrationBuilder.DropColumn(
                name: "NotificationDeliveredAtUtc",
                table: "EmploymentInterests");

            migrationBuilder.DropColumn(
                name: "NotificationFailedAtUtc",
                table: "EmploymentInterests");

            migrationBuilder.DropColumn(
                name: "NotificationFailureCategory",
                table: "EmploymentInterests");
        }
    }
}
