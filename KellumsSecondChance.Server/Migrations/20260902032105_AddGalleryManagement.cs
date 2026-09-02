using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KellumsSecondChance.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddGalleryManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GalleryImages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ImagePath = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    OriginalFileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    AltText = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Caption = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Width = table.Column<int>(type: "int", nullable: false),
                    Height = table.Column<int>(type: "int", nullable: false),
                    StorageKey = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GalleryImages", x => x.Id);
                });

            // Bootstrap the 43 bundled images into CMS ownership. StorageKey is
            // intentionally null so deleting a row never deletes deployed media.
            var dimensions = new (int Width, int Height)[]
            {
                (752,1008),(1536,2048),(752,1008),(2048,1536),(752,1008),(1536,2048),
                (1000,563),(848,1142),(206,206),(206,206),(1536,2048),
                (2048,1153),(2048,1153),(2048,1153),(2048,1153),(2048,1153),(2048,1153),
                (2048,1153),(2048,1153),(2048,1153),(2048,1153),(2048,1153),(2048,1153),
                (1153,2048),(2048,1153),(2048,1536),(2048,1536),(1536,2048),(2048,1153),
                (2048,1153),(2048,1536),(2048,1536),(2048,1536),(2048,1153),(2048,1153),
                (2048,1536),(2048,1153),(2048,1153),(2048,1153),(1153,2048),(2048,1153),
                (2048,1153),(1153,2048),
            };
            for (var index = 0; index < dimensions.Length; index++)
            {
                var order = index + 1;
                var fileName = $"gallery-{order:00}.jpg";
                migrationBuilder.InsertData(
                    table: "GalleryImages",
                    columns: new[] { "Id", "ImagePath", "OriginalFileName", "AltText", "Width", "Height", "DisplayOrder", "IsActive", "CreatedAtUtc" },
                    values: new object[] { order, $"/media/gallery/{fileName}", fileName, $"Exterior renovation gallery photograph {order}.", dimensions[index].Width, dimensions[index].Height, order, true, new DateTime(2026, 9, 2, 0, 0, index, DateTimeKind.Utc) });
            }
            migrationBuilder.Sql("DBCC CHECKIDENT ('GalleryImages', RESEED, 43);");

            migrationBuilder.CreateIndex(
                name: "IX_GalleryImages_IsActive_DisplayOrder_CreatedAtUtc",
                table: "GalleryImages",
                columns: new[] { "IsActive", "DisplayOrder", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_GalleryImages_StorageKey",
                table: "GalleryImages",
                column: "StorageKey");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GalleryImages");
        }
    }
}
