Zróbmy porządny **projekt aplikacji konkursowej do zbierania kodów QR**

Przyjmę, że:

* domyślnie jest **15 kodów**
* liczba kodów ma być **zmienna**
* część kodów będzie:
  * generowana po zakończeniu quizu na komputerze
  * drukowana i umieszczana w pracowniach
* uczestnik działa głównie przez **telefon**
* system ma działać w czasie dni otwartych

---

# 1. Cel aplikacji

Aplikacja ma umożliwiać uczestnikowi dnia otwartego:

* założenie konta
* przegląd wszystkich stanowisk konkursowych
* skanowanie kodów QR przypisanych do stanowisk
* śledzenie własnego postępu
* sprawdzenie, które stanowiska zostały już zaliczone
* sprawdzenie ilu uczestników zdobyło komplet kodów

A administratorowi ma umożliwiać:

* zarządzanie listą stanowisk i kodów
* podgląd uczestników
* kontrolę postępów
* weryfikację kompletu skanów
* eksport danych i obsługę wydawania nagród

---

# 2. Główna idea działania

## Logika użytkownika

Uczeń:

1. wchodzi na stronę konkursu
2. zakłada konto
3. loguje się automatycznie na telefonie
4. widzi listę stanowisk
5. odwiedza stanowiska
6. skanuje kolejne QR
7. system zapisuje zaliczenie
8. aplikacja pokazuje postęp
9. po zebraniu kompletu uczestnik trafia do grupy finalistów / odbiera nagrodę

## Logika systemu

System:

* przechowuje listę stanowisk
* przechowuje listę uczestników
* zapisuje każde poprawne skanowanie
* blokuje wielokrotne zaliczenie tego samego stanowiska
* oblicza liczbę zdobytych kodów
* określa, czy uczestnik ma komplet
* pokazuje globalne statystyki

---

# 3. Typ użytkowników

## A. Uczestnik

Uprawnienia:

* rejestracja
* logowanie automatyczne
* podgląd własnego konta
* skanowanie kodów
* oglądanie postępu
* przegląd listy stanowisk
* oglądanie liczby osób z kompletem

## B. Administrator

Uprawnienia:

* przegląd uczestników
* przegląd stanowisk
* włączanie / wyłączanie stanowisk
* podgląd skanowań
* oznaczanie wydania nagrody
* podgląd statystyk
* eksport danych

## C. Opiekun stanowiska

Opcjonalnie, później:

* podgląd tylko swojego stanowiska
* liczba uczestników, którzy zaliczyli dane miejsce
* możliwość pokazania kodu lub weryfikacji

Na start nie musi istnieć osobna rola opiekuna.

---

# 4. Ekrany aplikacji

## 4.1. Ekran startowy

Widok wejściowy dla ucznia.

Powinien zawierać:

* nazwę konkursu
* krótki opis zasady
* przycisk „Załóż konto”
* przycisk „Mam już konto”
* licznik ogólny, np.:

  * liczba aktywnych stanowisk
  * liczba uczestników
  * liczba osób z kompletem

### Przykładowe treści

* „Zbierz kody QR podczas dni otwartych”
* „Odwiedź stanowiska, skanuj kody i walcz o nagrodę”
* „Aktualnie do zdobycia: 15 kodów”

---

## 4.2. Rejestracja

Formularz:

* imię i nazwisko
* nick
* szkoła podstawowa

Opcjonalnie:

* akceptacja regulaminu
* zgoda na udział w konkursie

Po zatwierdzeniu:

* tworzy się konto
* użytkownik zostaje zalogowany
* system nadaje identyfikator uczestnika

### Ważne walidacje

* nick nie może być pusty
* szkoła nie może być pusta
* imię i nazwisko nie może być puste
* można zablokować duplikat identycznego zestawu danych

---

## 4.3. Panel uczestnika

Najważniejszy ekran.

Powinien zawierać:

### Górna sekcja

* nick
* szkoła
* liczba zdobytych kodów, np. `7 / 15`
* pasek postępu
* status:

  * „w trakcie”
  * „prawie komplet”
  * „komplet zdobyty”

### Środkowa sekcja

Lista stanowisk:

* nazwa stanowiska
* krótki opis
* status:

  * zaliczone
  * niezaliczone
  * nieaktywne

### Dolna sekcja

Statystyki globalne:

* ilu uczestników zdobyło komplet
* ile masz jeszcze do zebrania
* ewentualnie które stanowiska zostały Ci do końca

### Przyciski

* „Skanuj kod QR”
* „Odśwież postęp”
* „Pokaż tylko niezaliczone”
* „Wyloguj”

---

## 4.4. Ekran skanowania / obsługi kodu

Tu są dwa warianty.

### Wariant prostszy

Uczeń skanuje QR zwykłą aplikacją aparatu telefonu, a QR otwiera stronę aplikacji z parametrem kodu.

Przykład:

* użytkownik skanuje QR
* otwiera się link:
  `...?page=scan&code=INF_QUIZ`

Aplikacja:

* sprawdza użytkownika
* sprawdza kod
* zapisuje zaliczenie
* pokazuje komunikat

To polecam najbardziej.

### Widok komunikatu po skanie

* „Stanowisko zaliczone”
* nazwa stanowiska
* aktualny postęp
* informacja:

  * „Masz już 8 z 15 kodów”
* przycisk:

  * „Wróć do panelu”

### Komunikaty wyjątków

* „To stanowisko masz już zaliczone”
* „Kod nieaktywny”
* „Niepoprawny kod”
* „Najpierw załóż konto lub zaloguj się”

---

## 4.5. Ekran końcowy / komplet

Pokazuje się, gdy uczestnik zdobędzie wszystkie wymagane kody.

Powinien zawierać:

* duży komunikat:

  * „Gratulacje, zdobyłeś komplet”
* datę i godzinę ukończenia
* numer kolejności, np.:

  * „Jesteś 12. osobą z kompletem”
* dalszą instrukcję:

  * „Zgłoś się do punktu nagród”
  * albo „Bierzesz udział w losowaniu”

Dobrze, żeby ten ekran wyglądał efektownie.

---

## 4.6. Panel administratora

To drugi najważniejszy ekran.

Powinien zawierać:

### Statystyki

* liczba uczestników
* liczba aktywnych stanowisk
* liczba wszystkich skanów
* liczba osób z kompletem

### Lista uczestników

Kolumny:

* ID
* nick
* imię i nazwisko
* szkoła
* liczba zdobytych kodów
* komplet tak/nie
* czas zdobycia kompletu
* nagroda wydana tak/nie

### Lista stanowisk

Kolumny:

* kod stanowiska
* nazwa
* typ
* aktywne
* liczba skanów
* liczba unikalnych uczestników

### Dodatkowe akcje

* eksport CSV
* oznaczenie wydania nagrody
* aktywacja / dezaktywacja stanowiska
* zmiana wymaganej liczby kodów

---

# 5. Moduły funkcjonalne aplikacji

## Moduł 1 — konta uczestników

Odpowiada za:

* rejestrację
* identyfikację użytkownika
* przechowywanie sesji

## Moduł 2 — stanowiska i kody

Odpowiada za:

* listę wszystkich stanowisk
* przypisane kody QR
* aktywność kodów
* typ stanowiska

## Moduł 3 — skanowania

Odpowiada za:

* zapis każdego zeskanowanego kodu
* wykrywanie duplikatów
* aktualizację postępu

## Moduł 4 — postęp uczestnika

Odpowiada za:

* liczbę zdobytych kodów
* komplet / brak kompletu
* kolejność ukończenia

## Moduł 5 — statystyki

Odpowiada za:

* ilu uczestników zdobyło komplet
* które stanowiska są najczęściej odwiedzane
* ilu uczestników ma 0, 5, 10, 15 kodów

## Moduł 6 — administracja

Odpowiada za:

* zarządzanie stanowiskami
* przegląd danych
* eksport
* obsługę nagród

---

# 6. Model danych

Najprostszy i najrozsądniejszy model to 4 główne tabele / arkusze.

## 6.1. Uczestnicy

Każdy wiersz = jeden uczestnik.

Pola:

* `participant_id`
* `first_name_last_name`
* `nickname`
* `school_name`
* `created_at`
* `codes_collected_count`
* `is_complete`
* `completed_at`
* `reward_issued`
* `status`

## 6.2. Stanowiska

Każdy wiersz = jedno stanowisko / jeden kod.

Pola:

* `station_code`
* `station_name`
* `station_description`
* `station_type`
* `is_active`
* `display_order`

Typy stanowisk:

* `quiz`
* `drukowana plansza`
* `pracownia`
* `pokaz`
* `zadanie specjalne`

## 6.3. Skanowania

Każdy wiersz = jedno zdarzenie skanowania.

Pola:

* `scan_id`
* `timestamp`
* `participant_id`
* `nickname`
* `station_code`
* `station_name`
* `scan_result`

W `scan_result`:

* `ok`
* `duplicate`
* `inactive`
* `invalid`

## 6.4. Ustawienia

Pola:

* `required_codes_count`
* `event_name`
* `event_active`
* `completion_message`
* `reward_message`

Dzięki temu liczba kodów nie jest na stałe wpisana w kod aplikacji.

---

# 7. Elastyczność liczby kodów

To ważne, bo już zaznaczyłeś, że liczba może się zmienić.

Dlatego aplikacja nie powinna mieć „na sztywno” liczby 15 w logice.
Powinna:

* pobierać liczbę aktywnych stanowisk
  albo
* pobierać wymaganą liczbę z ustawień

Najlepsze rozwiązanie:

* w ustawieniach masz pole:
  `required_codes_count = 15`

Wtedy później zmieniasz tylko jedną wartość i wszystko działa dalej.

---

# 8. Sposób działania QR

Każdy kod QR powinien reprezentować jedno stanowisko.

## Struktura logiczna

QR nie musi zawierać wielkiej ilości danych. Wystarczy:

* identyfikator stanowiska

Przykład:

* `INF_QUIZ`
* `OGOLNY_QUIZ`
* `MBOT_01`
* `WET_01`

## Działanie

QR otwiera aplikację z parametrem:

* `code=INF_QUIZ`

Aplikacja wtedy:

1. sprawdza, czy uczestnik jest zalogowany
2. sprawdza, czy kod istnieje
3. sprawdza, czy kod jest aktywny
4. sprawdza, czy uczestnik już go ma
5. zapisuje skan
6. aktualizuje postęp
7. pokazuje wynik

---

# 9. Logika zaliczania

## Zasady podstawowe

* każde stanowisko można zaliczyć tylko raz
* ponowny skan tego samego stanowiska nie zwiększa wyniku
* nieaktywne stanowisko nie daje punktu
* błędny kod nie daje punktu

## Zasady postępu

* liczba zebranych kodów = liczba unikalnych aktywnych stanowisk zaliczonych przez uczestnika
* komplet = liczba zebranych kodów >= liczba wymagana

## Zasady ukończenia

Po zdobyciu kompletu:

* zapisujemy `completed_at`
* ustawiamy `is_complete = true`
* wyliczamy kolejność ukończenia
* pokazujemy ekran gratulacyjny

---

# 10. Logika statystyk

## Uczestnik widzi

* swoje zaliczone stanowiska
* ile brakuje do kompletu
* ilu uczestników ma komplet

## Administrator widzi dodatkowo

* ilu uczestników jest zarejestrowanych
* ilu uczestników rozpoczęło zbieranie
* ilu ukończyło
* które stanowiska mają najwięcej skanów
* które stanowiska są najmniej odwiedzane

---

# 11. Przepływ użytkownika

## Scenariusz A — nowy uczestnik

1. Uczeń wchodzi na stronę.
2. Wybiera „Załóż konto”.
3. Wpisuje dane.
4. Otwiera się panel uczestnika.
5. Widzi listę stanowisk.
6. Idzie na pierwsze stanowisko i skanuje QR.
7. System zapisuje zaliczenie.

## Scenariusz B — uczestnik skanuje kolejny kod

1. Uczeń skanuje QR aparatem telefonu.
2. Otwiera się strona aplikacji.
3. Aplikacja rozpoznaje użytkownika.
4. Kod zostaje zaliczony.
5. Pokazuje się komunikat i zaktualizowany postęp.

## Scenariusz C — duplikat

1. Uczeń skanuje QR, który ma już zaliczony.
2. Aplikacja pokazuje:

   * „To stanowisko masz już zeskanowane”
3. Postęp się nie zmienia.

## Scenariusz D — komplet

1. Uczeń skanuje ostatni brakujący kod.
2. System oznacza komplet.
3. Pokazuje ekran gratulacyjny.
4. Administrator widzi to w panelu.

---

# 12. Wymagania wizualne

Aplikacja powinna być:

* czytelna na telefonie
* szybka
* odporna na klikanie w pośpiechu
* atrakcyjna wizualnie

## Styl

Najlepiej nowoczesny, szkolno-technologiczny:

* jasne tło lub lekki neon
* duże kafelki stanowisk
* wyraźne statusy:

  * zielony = zaliczone
  * szary = niezaliczone
  * pomarańczowy = specjalne / w trakcie

## Elementy graficzne

* pasek postępu
* ikonki stanowisk
* ekran nagrody / finału
* animacja po zaliczeniu kodu

---

# 13. Sposób oznaczania stanowisk w panelu

Najczytelniej będzie pokazać je jako kafelki.

Każdy kafelek:

* nazwa stanowiska
* ikona
* status
* opcjonalny opis

Przykład statusów:

* `✅ Zaliczone`
* `⬜ Do zdobycia`
* `🔒 Nieaktywne`

Dodatkowy filtr:

* pokaż wszystkie
* pokaż tylko niezaliczone
* pokaż tylko zaliczone

---

# 14. Panel admina — szczegółowy pomysł

## Sekcja 1 — statystyki ogólne

Kafelki:

* Uczestnicy
* Komplety
* Wszystkie skany
* Aktywne stanowiska

## Sekcja 2 — uczestnicy

Tabela z możliwością filtrowania po:

* szkole
* liczbie kodów
* statusie kompletu

## Sekcja 3 — stanowiska

Tabela:

* kod
* nazwa
* aktywne
* liczba skanów
* ilu unikalnych uczestników

## Sekcja 4 — nagrody

Możliwość:

* oznaczenia nagrody jako wydanej
* filtrowania tylko uczestników z kompletem

---

# 15. Propozycja organizacyjna na pierwszy etap wdrożenia

Żeby nie komplikować od razu wszystkiego, polecam wdrożyć projekt w 3 fazach.

## Faza 1 — MVP

* rejestracja
* panel uczestnika
* lista stanowisk
* skanowanie QR
* zapis do bazy
* licznik postępu
* licznik osób z kompletem

## Faza 2 — panel admina

* statystyki
* lista uczestników
* lista stanowisk
* eksport danych
* oznaczenie nagrody

## Faza 3 — rozbudowa

* lepszy wygląd
* ranking
* kolejność ukończenia
* różne poziomy nagród
* specjalne kody bonusowe

---

# 16. Najważniejsze decyzje projektowe

Na tym etapie proponuję przyjąć:

## Decyzja 1

Aplikacja działa jako **web app na telefonie**.

## Decyzja 2

Dane przechowywane są w **Google Sheets**.

## Decyzja 3

Logika aplikacji działa w **Google Apps Script**.

## Decyzja 4

QR zawiera tylko **kod stanowiska** i link do aplikacji.

## Decyzja 5

Liczba wymaganych kodów jest pobierana z ustawień, nie z kodu.

## Decyzja 6

Status zaliczenia opiera się tylko na **unikalnych skanach stanowisk**.

---

# 17. Wstępna lista elementów do późniejszego zakodowania

Później w implementacji będą potrzebne funkcje:

* rejestracja uczestnika
* zapis danych uczestnika
* pobranie profilu uczestnika
* pobranie listy stanowisk
* sprawdzenie kodu QR
* zapis skanu
* sprawdzenie duplikatu
* przeliczenie postępu
* sprawdzenie kompletu
* pobranie liczby uczestników z kompletem
* pobranie danych do panelu admina

---

# 18. Efekt końcowy projektu aplikacji

Końcowo aplikacja ma zapewniać taki efekt:

* uczeń zakłada konto w minutę
* widzi czytelny panel z postępem
* skanuje kody na różnych stanowiskach
* natychmiast widzi zaliczenie
* na końcu dostaje informację o komplecie
* nauczyciel ma pełny podgląd danych
* liczba stanowisk może być zmieniana bez przebudowy całego systemu

---

# 19. Mój rekomendowany następny krok

Teraz najrozsądniej będzie przygotować:
**dokładną strukturę danych i przepływ ekranów**, czyli coś w rodzaju mini-specyfikacji technicznej.

Po tym od razu można przejść do:

* arkusza Google Sheets
* kodu Apps Script
* interfejsu HTML/CSS/JS

Następny krok mogę zrobić jako:
**szczegółową specyfikację techniczną aplikacji z nazwami arkuszy, polami, funkcjami i przepływem działania ekran po ekranie**.
