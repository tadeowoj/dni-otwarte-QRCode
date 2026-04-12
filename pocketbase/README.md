# PocketBase backend

Backend PocketBase dla gry QR dziala pod adresem `https://pocketbase.zsoiz-czyzew.pl`.

## Struktura

- `pb_migrations/` - migracje schematu i danych startowych.
- `pb_hooks/` - custom route `POST /api/qr-action` zgodne z obecnym frontendowym kontraktem `action/payload`.
- `pb_data/` - lokalne dane PocketBase, nie commitowac.

## Uruchomienie migracji

Lokalnie z katalogu `pocketbase`:

```powershell
.\pocketbase.exe migrate up
```

Na VPS uruchom te sama komende w katalogu instancji PocketBase obslugujacej `https://pocketbase.zsoiz-czyzew.pl`, po wgraniu katalogow `pb_migrations` i `pb_hooks`.

## Wazne

- Nie zapisuj w repo loginow, hasel, tokenow ani `pb_data`.
- Seed ustawia startowy `admin_pin=1234`; zmien go w kolekcji `settings` po inicjalizacji.
- Migracje `down` usuwaja kolekcje i dane. Na produkcji traktuj to jak czerwony guzik z kreskowki.
