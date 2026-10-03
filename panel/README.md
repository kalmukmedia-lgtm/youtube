# Metaficta Panel (ASP.NET Core 10 + MSSQL)

Kurulum ve kullanım: [../docs/PANEL_SETUP.md](../docs/PANEL_SETUP.md)

## Geliştirme

```bash
dotnet test                                   # testler (SQLite ile)
cd src/Metaficta.Panel && dotnet run          # Development: App_Data/panel-dev.db (SQLite)
```

## Veritabanı değişiklikleri (migration)

Plesk'teki MSSQL şeması EF Core migration'larıyla kurulur ve panel açılışında otomatik uygulanır.
Model (`Data/Entities.cs`, `Data/PanelDbContext.cs`) değişirse migration **SQL Server sağlayıcısıyla** üretilmelidir
(geliştirme ortamı SQLite kullandığı için ortam değişkenleri şart):

```bash
cd src/Metaficta.Panel
ASPNETCORE_ENVIRONMENT=Production \
ConnectionStrings__Default="Server=localhost;Database=design;User Id=x;Password=y;TrustServerCertificate=True" \
Database__Provider=SqlServer \
dotnet ef migrations add <Ad> --output-dir Data/Migrations
```

`MigrationTests` eksik veya yanlış sağlayıcıyla üretilmiş migration'ı CI'da yakalar.
