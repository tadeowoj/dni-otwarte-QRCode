# Schemat Bazy Danych (Google Sheets)

Aby aplikacja mogła funkcjonować, przygotuj plik Google Sheets według poniższej konfiguracji.

## 1. Nazwy Arkuszy (Zakładek na dole arkusza)
Upewnij się, że stworzyłeś dokładnie *4 arkusze* (zakładki) o poniższych nazwach:
1. `Uczestnicy`
2. `Stanowiska`
3. `Skanowania`
4. `Ustawienia`

⚠️ **Ważne:** Zastąp domyślny `Arkusz1` nazwą `Uczestnicy`.

---

## 2. Nagłówki (Wiersz Numer 1)
Przejdź do każdego z arkuszy i w PIERWSZYM wierszu wpisz (w kolejnych kolumnach A, B, C...) podane poniżej nagłówki. Wykorzystujemy te nazwy bezpośrednio w kodzie, więc wpisz je *dokładnie tak jak podano*.

### Arkusz: "Uczestnicy"
| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| `participant_id` | `first_name_last_name` | `nickname` | `school_name` | `created_at` | `codes_collected_count` | `is_complete` | `completed_at` | `reward_issued` | `status` |

### Arkusz: "Stanowiska"
| A | B | C | D | E | F |
|---|---|---|---|---|---|
| `station_code` | `station_name` | `station_description` | `station_type` | `is_active` | `display_order` |

*(Aby aplikacja zadziałała, dodaj pod spodem chociaż jedno testowe stanowisko, np: `["TEST_01", "Stanowisko 1", "Opis", "quiz", "TRUE", 1]`)*

### Arkusz: "Skanowania"
| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| `scan_id` | `timestamp` | `participant_id` | `nickname` | `station_code` | `station_name` | `scan_result` |

### Arkusz: "Ustawienia"
| A | B |
|---|---|
| `key` | `value` |

*(W arkuszu *Ustawienia*, w wierszu nr 2 pod spodem wpisz następujące wartości startowe)*
- *A2*: `required_codes_count` | *B2*: `15`
- *A3*: `event_name` | *B3*: `Dni Otwarte ZSOiZ`
- *A4*: `event_active` | *B4*: `TRUE`
- *A5*: `completion_message` | *B5*: `Gratulacje, zdobyłeś komplet punktów!`
