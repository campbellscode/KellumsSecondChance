using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KellumsSecondChance.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddEmploymentInterests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EmploymentInterests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FirstName = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    PreferredContactMethod = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    GeneralWorkExperience = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AreasOfExperience = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    WorkInterest = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Availability = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Message = table.Column<string>(type: "nvarchar(3000)", maxLength: 3000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    InternalNotes = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    SubmitterIpHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmploymentInterests", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EmploymentInterests_Status_CreatedAtUtc",
                table: "EmploymentInterests",
                columns: new[] { "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_EmploymentInterests_SubmitterIpHash_CreatedAtUtc",
                table: "EmploymentInterests",
                columns: new[] { "SubmitterIpHash", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmploymentInterests");
        }
    }
}
