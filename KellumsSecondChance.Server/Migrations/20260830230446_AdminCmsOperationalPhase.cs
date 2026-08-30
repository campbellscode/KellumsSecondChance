using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KellumsSecondChance.Server.Migrations
{
    /// <inheritdoc />
    public partial class AdminCmsOperationalPhase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Value",
                table: "SiteSettings",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000,
                oldNullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "RenovationServices",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "RenovationProjects",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContentType",
                table: "RenovationProjectImages",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAtUtc",
                table: "RenovationProjectImages",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "FileSizeBytes",
                table: "RenovationProjectImages",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StorageKey",
                table: "RenovationProjectImages",
                type: "nvarchar(400)",
                maxLength: 400,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "FaqItems",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "EstimateRequests",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "EstimateRequestNotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EstimateRequestId = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    CreatedByDisplayName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EstimateRequestNotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EstimateRequestNotes_EstimateRequests_EstimateRequestId",
                        column: x => x.EstimateRequestId,
                        principalTable: "EstimateRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EstimateRequestStatusHistory",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EstimateRequestId = table.Column<int>(type: "int", nullable: false),
                    PreviousStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    NewStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ChangedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ChangedByUserId = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: true),
                    ChangedByDisplayName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EstimateRequestStatusHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EstimateRequestStatusHistory_EstimateRequests_EstimateRequestId",
                        column: x => x.EstimateRequestId,
                        principalTable: "EstimateRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RenovationProjectImages_StorageKey",
                table: "RenovationProjectImages",
                column: "StorageKey");

            migrationBuilder.CreateIndex(
                name: "IX_EstimateRequestNotes_EstimateRequestId_CreatedAtUtc",
                table: "EstimateRequestNotes",
                columns: new[] { "EstimateRequestId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_EstimateRequestStatusHistory_EstimateRequestId_ChangedAtUtc",
                table: "EstimateRequestStatusHistory",
                columns: new[] { "EstimateRequestId", "ChangedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EstimateRequestNotes");

            migrationBuilder.DropTable(
                name: "EstimateRequestStatusHistory");

            migrationBuilder.DropIndex(
                name: "IX_RenovationProjectImages_StorageKey",
                table: "RenovationProjectImages");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "RenovationServices");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "RenovationProjects");

            migrationBuilder.DropColumn(
                name: "ContentType",
                table: "RenovationProjectImages");

            migrationBuilder.DropColumn(
                name: "CreatedAtUtc",
                table: "RenovationProjectImages");

            migrationBuilder.DropColumn(
                name: "FileSizeBytes",
                table: "RenovationProjectImages");

            migrationBuilder.DropColumn(
                name: "StorageKey",
                table: "RenovationProjectImages");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "FaqItems");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "EstimateRequests");

            migrationBuilder.AlterColumn<string>(
                name: "Value",
                table: "SiteSettings",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000,
                oldNullable: true);
        }
    }
}
