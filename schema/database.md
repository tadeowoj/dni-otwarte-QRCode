# Schemat Bazy Danych (Google Sheets)

Aby aplikacja dzialala poprawnie, przygotuj plik Google Sheets wedlug tej konfiguracji.

## 1. Nazwy arkuszy (zakladek)
Utworz dokladnie 5 arkuszy:
1. `Uczestnicy`
2. `Nauczyciele`
3. `Stanowiska`
4. `Skanowania`
5. `Ustawienia`

Wazne: zamien domyslny `Arkusz1` na `Uczestnicy`.

---

## 2. Naglowki (wiersz 1)
W kazdym arkuszu wpisz naglowki dokladnie tak, jak ponizej.

### Arkusz: `Uczestnicy`
| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| `participant_id` | `first_name_last_name` | `nickname` | `pin` | `school_name` | `created_at` | `codes_collected_count` | `is_complete` | `completed_at` | `reward_issued` | `status` |

### Arkusz: `Nauczyciele`
| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| `teacher_id` | `first_name_last_name` | `nickname` | `pin` | `is_active` | `created_at` | `notes` |

Uwagi:
- Konta nauczycieli dodaje admin recznie (bez rejestracji z formularza).
- Logowanie nauczyciela dziala przez ten sam formularz co uczestnik: `nickname` + `pin`.
- `is_active` ustawiaj na `TRUE` dla kont aktywnych.
- `teacher_id` moze miec format np. `T_001`, `T_002`.

### Arkusz: `Stanowiska`
| A | B | C | D | E | F |
|---|---|---|---|---|---|
| `station_code` | `station_name` | `station_description` | `station_type` | `is_active` | `display_order` |

Dodaj pod spodem przynajmniej jedno testowe stanowisko, np.:
`TEST_01 | Stanowisko 1 | Opis | quiz | TRUE | 1`

### Arkusz: `Skanowania`
| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| `scan_id` | `timestamp` | `participant_id` | `nickname` | `station_code` | `station_name` | `scan_result` |

### Arkusz: `Ustawienia`
| A | B |
|---|---|
| `key` | `value` |

Wpisy startowe w `Ustawienia`:
- `A2`: `required_codes_count` | `B2`: `15`
- `A3`: `event_name` | `B3`: `Dni Otwarte ZSOiZ`
- `A4`: `event_active` | `B4`: `TRUE`
- `A5`: `completion_message` | `B5`: `Gratulacje, zdobyles komplet punktow!`
- `A6`: `admin_pin` | `B6`: `1234` (zmien po starcie)
