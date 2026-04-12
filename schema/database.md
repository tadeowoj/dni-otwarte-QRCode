# Schemat bazy danych (PocketBase / SQLite)

Aplikacja uzywa PocketBase pod adresem `https://pocketbase.zsoiz-czyzew.pl`. Schemat tworza migracje w `pocketbase/pb_migrations`, a dane produkcyjne sa trzymane w SQLite przez PocketBase.

## Kolekcje

Utworz dokladnie 7 kolekcji: `participants`, `teachers`, `stations`, `qr_codes`, `scans`, `schools`, `settings`.

## Kolekcja: `participants`

| pole | typ | uwagi |
|---|---|---|
| `participant_id` | text | wymagane, unikalne |
| `first_name_last_name` | text | wymagane |
| `nickname` | text | wymagane |
| `pin` | text | PIN uczestnika jako string, dokladnie 4 cyfry w logice API |
| `school_name` | text | wymagane, musi pochodzic z aktywnej szkoly |
| `created_at` | date | data rejestracji |
| `codes_collected_count` | number | liczba zaliczonych stanowisk |
| `is_complete` | bool | czy uczestnik ma komplet |
| `completed_at` | date | data zdobycia kompletu |
| `reward_issued` | bool | czy wydano nagrode |
| `status` | text | np. `active` |
| `normalized_name` | text | wymagane, do blokady duplikatow |
| `normalized_nickname` | text | wymagane, do blokady duplikatow |
| `normalized_school` | text | wymagane, do blokady duplikatow |

Indeksy: unikalny `participant_id`, unikalny zestaw `normalized_name + normalized_nickname + normalized_school`, indeks rankingowy `codes_collected_count + created_at`.

## Kolekcja: `teachers`

| pole | typ | uwagi |
|---|---|---|
| `teacher_id` | text | wymagane, unikalne |
| `first_name_last_name` | text | wymagane |
| `nickname` | text | wymagane, unikalne |
| `pin` | text | wymagane |
| `is_active` | bool | czy konto nauczyciela dziala |
| `created_at` | date | data utworzenia konta |
| `notes` | text | notatki admina |
| `station_code` | text | wymagane, unikalne |

Uwagi: konta nauczycieli dodaje admin recznie w PocketBase. Logowanie nauczyciela dziala przez `nickname + pin`. Relacja jest logiczna: 1 nauczyciel = 1 stanowisko przez `station_code`.

## Kolekcja: `stations`

| pole | typ | uwagi |
|---|---|---|
| `station_code` | text | wymagane, unikalne |
| `station_name` | text | wymagane |
| `station_description` | text | opis stanowiska |
| `station_type` | text | np. `quiz`, `pracownia`, `pokaz` |
| `is_active` | bool | czy stanowisko jest aktywne |
| `display_order` | number | kolejnosc wyswietlania |

## Kolekcja: `qr_codes`

| pole | typ | uwagi |
|---|---|---|
| `qr_id` | text | wymagane, unikalne |
| `qr_token` | text | wymagane, unikalne |
| `station_code` | text | wymagane |
| `teacher_id` | text | wymagane |
| `created_at` | date | data wygenerowania |
| `is_active` | bool | czy kod jest aktualnie aktywny |

Uwagi: jeden nauczyciel moze miec tylko jeden aktywny kod QR naraz. Nowy kod QR jest aktywny do pierwszego skutecznego skanu przyznajacego punkt; wtedy `is_active` zmienia sie na `false`. Skan duplikatu stanowiska przez tego samego uczestnika nie dezaktywuje kodu.

## Kolekcja: `scans`

| pole | typ | uwagi |
|---|---|---|
| `scan_id` | text | wymagane, unikalne |
| `timestamp` | date | data skanu |
| `participant_id` | text | wymagane |
| `nickname` | text | nick uczestnika w chwili skanu |
| `station_code` | text | wymagane |
| `station_name` | text | nazwa stanowiska w chwili skanu |
| `scan_result` | text | `ok`, `duplicate`, `inactive`, `invalid` |

## Kolekcja: `schools`

| pole | typ | uwagi |
|---|---|---|
| `school_name` | text | wymagane, unikalne |
| `is_active` | bool | tylko aktywne szkoly sa zwracane do formularza |
| `display_order` | number | kolejnosc w dropdownie |

Wpisy startowe sa seedowane migracja:

| school_name | is_active | display_order |
|---|---|---|
| Szkoła Podstawowa im. Szarych Szeregów w Czyżewie | true | 1 |
| Szkoła Podstawowa im. Ojca Świętego Jana Pawła II w Bogutach-Piankach | true | 2 |
| Szkoła Podstawowa w Tymiankach-Buciach | true | 3 |
| Szkoła Podstawowa im. Marii Konopnickiej w Nurze | true | 4 |
| Szkoła Podstawowa im. Kardynała Stefana Wyszyńskiego w Szulborzu Wielkim | true | 5 |
| Szkoła Podstawowa w Zarębach Kościelnych | true | 6 |
| Szkoła Podstawowa w Andrzejewie | true | 7 |
| Szkoła Podstawowa w Ołdakach-Polonii | true | 8 |
| Szkoła Podstawowa im. Św. Jana Pawła II w Rosochatym-Kościelnym | true | 9 |
| Szkoła Podstawowa w Dąbrowie Wielkiej | true | 10 |
| Szkoła Podstawowa im. Kardynała Stefana Wyszyńskiego w Szepietowie | true | 11 |
| Szkoła Podstawowa w Wojnach-Krupach | true | 12 |
| Szkoła Podstawowa im. Polskiej Organizacji Wojskowej w Dąbrówce Kościelnej | true | 13 |
| Szkoła Podstawowa im. Komisji Edukacji Narodowej w Klukowie | true | 14 |
| Szkoła Podstawowa w Wyszonkach Kościelnych | true | 15 |
| Szkoła Podstawowa w Łuniewie Małym | true | 16 |

## Kolekcja: `settings`

| pole | typ | uwagi |
|---|---|---|
| `key` | text | wymagane, unikalne |
| `value` | text | wartosc ustawienia |

Wpisy startowe: `required_codes_count=15`, `event_name=Dni Otwarte ZSOiZ`, `event_active=TRUE`, `completion_message=Gratulacje, zdobyles komplet punktow!`, `admin_pin=1234`, `app_base_url=https://qr.zsoiz-czyzew.pl/`.

Po inicjalizacji zmien `admin_pin` w PocketBase. Serio. `1234` jest dobre tylko do testow i zamkow w kreskowkach.
