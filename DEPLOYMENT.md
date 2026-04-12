# Instrukcja wdrozenia (PocketBase)

Backend produkcyjny dziala w PocketBase pod adresem `https://pocketbase.zsoiz-czyzew.pl`, a frontend nadal jest statycznym buildem Vite publikowanym na GitHub Pages pod `https://qr.zsoiz-czyzew.pl`.

## Backend PocketBase

1. Wgraj katalog `pocketbase/pb_migrations` oraz `pocketbase/pb_hooks` na serwer, do katalogu instancji PocketBase.
2. Nie wgrywaj ani nie commituj `pb_data`, backupow, bazy SQLite, hasel ani tokenow.
3. Uruchom migracje w katalogu instancji:

```powershell
.\pocketbase.exe migrate up
```

Na Linuxie/VPS komenda bedzie zwykle wygladala tak:

```bash
./pocketbase migrate up
```

4. W panelu PocketBase sprawdz, czy powstaly kolekcje `participants`, `teachers`, `stations`, `qr_codes`, `scans`, `schools`, `settings`.
5. Sprawdz, czy `schools` ma 16 aktywnych rekordow, a `settings` zawiera `required_codes_count`, `event_name`, `event_active`, `completion_message`, `admin_pin`, `app_base_url`.
6. Zmien startowy `admin_pin=1234` na docelowy PIN administratora.
7. Dodaj recznie realne stanowiska w `stations` i nauczycieli w `teachers`, gdy lista bedzie gotowa.

## API aplikacji

Frontend uderza w custom route PocketBase:

```text
POST https://pocketbase.zsoiz-czyzew.pl/api/qr-action
```

Body:

```json
{ "action": "get_schools", "payload": {} }
```

Odpowiedz zachowuje stary kontrakt:

```json
{ "status": "success", "data": {} }
```

albo:

```json
{ "status": "error", "message": "Opis bledu", "error_code": "KOD_BLEDU" }
```

## Frontend

Po zmianach frontendowych wejdz do katalogu `frontend` i wykonaj:

```powershell
npm.cmd run build
```

Build powinien korzystac z `https://pocketbase.zsoiz-czyzew.pl/api/qr-action` w `frontend/main.js` i `frontend/admin.js`.

## Smoke test po wdrozeniu

- `GET https://pocketbase.zsoiz-czyzew.pl/api/qr-action` zwraca status API.
- `POST get_schools` zwraca liste 16 szkol.
- `POST get_admin_data` z blednym PIN zwraca blad autoryzacji.
- Rejestracja tworzy uczestnika, modal PIN zapisuje PIN, logowanie dziala.
- Nauczyciel z przypisanym `station_code` moze wygenerowac jeden aktywny QR.
- Skan `?qr_token=...` przyznaje punkt i dezaktywuje kod QR.

## Awaryjnie

Stary backend Apps Script mozna zostawic jako fallback tylko do czasu potwierdzenia smoke testow PocketBase. Nowe zmiany powinny isc juz przez PocketBase, bo SQLite przestalo byc planem, a zostalo bazka-bazka.
