# Schemat bazy danych (Google Sheets)

Aby aplikacja dzialala poprawnie, przygotuj plik Google Sheets wedlug tej konfiguracji.

## 1. Nazwy arkuszy
Utworz dokladnie 7 arkuszy: `Uczestnicy`, `Nauczyciele`, `Stanowiska`, `KodyQR`, `Skanowania`, `Szkoly`, `Ustawienia`.

## 2. Naglowki (wiersz 1)
W kazdym arkuszu wpisz naglowki dokladnie tak, jak ponizej.

### Arkusz: `Uczestnicy`
| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| `participant_id` | `first_name_last_name` | `nickname` | `pin` | `school_name` | `created_at` | `codes_collected_count` | `is_complete` | `completed_at` | `reward_issued` | `status` |

### Arkusz: `Nauczyciele`
| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| `teacher_id` | `first_name_last_name` | `nickname` | `pin` | `is_active` | `created_at` | `notes` | `station_code` |

Uwagi: konta nauczycieli dodaje admin recznie, logowanie nauczyciela dziala przez `nickname + pin`, `nickname` musi byc unikalny, `station_code` jest wymagany i musi byc unikalny w arkuszu `Nauczyciele`.

### Arkusz: `Stanowiska`
| A | B | C | D | E | F |
|---|---|---|---|---|---|
| `station_code` | `station_name` | `station_description` | `station_type` | `is_active` | `display_order` |

### Arkusz: `KodyQR`
| A | B | C | D | E | F |
|---|---|---|---|---|---|
| `qr_id` | `qr_token` | `station_code` | `teacher_id` | `created_at` | `is_active` |

Uwagi: `qr_token` musi byc unikalny. Jeden nauczyciel moze miec tylko jeden aktywny kod QR naraz. Nowy kod QR jest aktywny do pierwszego skutecznego skanu przyznajacego punkt; wtedy `is_active` zmienia sie na `FALSE`. Skan duplikatu stanowiska przez tego samego uczestnika nie dezaktywuje kodu.

### Arkusz: `Skanowania`
| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| `scan_id` | `timestamp` | `participant_id` | `nickname` | `station_code` | `station_name` | `scan_result` |

### Arkusz: `Szkoly`
| A | B | C |
|---|---|---|
| `school_name` | `is_active` | `display_order` |

Uwagi: tylko rekordy z `is_active=TRUE` sa zwracane do formularza rejestracji i przechodza walidacje backendu. `display_order` sluzy do ustawienia kolejnosci w dropdownie.

Wpisy startowe:

| school_name | is_active | display_order |
|---|---|---|
| Szkoła Podstawowa im. Szarych Szeregów w Czyżewie | TRUE | 1 |
| Szkoła Podstawowa im. Ojca Świętego Jana Pawła II w Bogutach-Piankach | TRUE | 2 |
| Szkoła Podstawowa w Tymiankach-Buciach | TRUE | 3 |
| Szkoła Podstawowa im. Marii Konopnickiej w Nurze | TRUE | 4 |
| Szkoła Podstawowa im. Kardynała Stefana Wyszyńskiego w Szulborzu Wielkim | TRUE | 5 |
| Szkoła Podstawowa w Zarębach Kościelnych | TRUE | 6 |
| Szkoła Podstawowa w Andrzejewie | TRUE | 7 |
| Szkoła Podstawowa w Ołdakach-Polonii | TRUE | 8 |
| Szkoła Podstawowa im. Św. Jana Pawła II w Rosochatym-Kościelnym | TRUE | 9 |
| Szkoła Podstawowa w Dąbrowie Wielkiej | TRUE | 10 |
| Szkoła Podstawowa im. Kardynała Stefana Wyszyńskiego w Szepietowie | TRUE | 11 |
| Szkoła Podstawowa w Wojnach-Krupach | TRUE | 12 |
| Szkoła Podstawowa im. Polskiej Organizacji Wojskowej w Dąbrówce Kościelnej | TRUE | 13 |
| Szkoła Podstawowa im. Komisji Edukacji Narodowej w Klukowie | TRUE | 14 |
| Szkoła Podstawowa w Wyszonkach Kościelnych | TRUE | 15 |
| Szkoła Podstawowa w Łuniewie Małym | TRUE | 16 |

### Arkusz: `Ustawienia`
| A | B |
|---|---|
| `key` | `value` |

Wpisy startowe w `Ustawienia`: `required_codes_count=15`, `event_name=Dni Otwarte ZSOiZ`, `event_active=TRUE`, `completion_message=Gratulacje, zdobyles komplet punktow!`, `admin_pin=1234` (zmien po starcie), `app_base_url=https://qr.zsoiz-czyzew.pl/`.
