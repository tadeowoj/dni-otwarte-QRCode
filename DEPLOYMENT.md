# Instrukcja Wdrożenia (Google Apps Script)

Przygotowaliśmy wszystkie pliki! Teraz uruchomimy nasz backend i połączymy go z dyskiem.

## Opcja A (Skoro masz zainstalowanego Node.js - Rekomendowana)

Przy użyciu narzędzia `clasp` (CLI od Google) możemy przepchnąć kod prosto z konsoli do chmury.

1. **Przeładuj swój terminal:** Koniecznie zrestartuj program terminalowy (lub VS Code), aby odświeżyć zmienne środowiskowe, dzięki czemu komenda `npm` będzie widoczna dla systemu.
2. W nowym oknie terminala wpisz: `npm install` (zainstaluje to narzędzie `clasp` w folderze).
3. Następnie wpisz: `npm run login`. Otworzy się przeglądarka z prośbą o zalogowanie na twoje konto Google (zaakceptuj wszystkie uprawnienia, w tym Apps Script).
4. Przejdź do Google Drive, utwórz nowy **Pusty Arkusz Kalkulacyjny (Google Sheets)** i skonfiguruj mu nazwy arkuszy i kolumny zgodnie ze wzorem w pliku `schema/database.md`.
5. Kiedy w Sheets przejdziesz do zakładki **Rozszerzenia -> Apps Script**, skopiuj **ID skryptu** (długi ciąg znaków) z paska adresu (lub z ustawień skryptu). Alternatywnie, by podlinkować to na czysto, w konsoli wpisz `npx clasp clone <ID_SKRYPTU> --rootDir ./backend` (co go podłączy, ale uwaga: to nadpisze pliki jeśli na serwerze są puste, lepiej użyć kroku niżej).
6. Najlepiej wejdź w zakładkę Apps Script, a potem w terminalu wpisz `npx clasp create --type sheets --title "QR Contest Backend" --rootDir ./backend` - ale by to działało musisz najpierw wrzucić flagę w ustawieniach konta Google Apps Script (`Włączone API Apps Script`).

**W skrócie - jeśli to za dużo technikalii z CLASP, skorzystaj z Opcji B poniżej.**

---

## Opcja B (Klasyczne przekopiowanie - Banalnie proste dla MVP)

1. Wejdź na swój Google Drive. Utwórz nowy **Arkusz Kalkulacyjny Google**.
2. Wklej precyzyjnie 5 nazw arkuszy i nagłówki tak jak opisano w `schema/database.md` (w tym nowy arkusz `Nauczyciele`). To będzie Twoja baza danych.
3. W górnym menu Google Sheets wejdź w **Rozszerzenia -> Apps Script**.
4. W otwartym edytorze kodu usuń domyślną treść z pliku `Kod.gs` (możesz też zmienić mu nazwę na `Code.gs`) i skopiuj całą zawartość z utworzonego u Ciebie lokalnie wpisu `backend/Code.js`.
5. Użyj przycisku z plusem (`+`) -> **Skrypt**, i stwórz dwa nowe pliki:
    - O nazwie: `Database` (i wklej całą zawartość z pliku `backend/Database.js`)
    - O nazwie: `API` (i wklej całą zawartość z pliku `backend/API.js`)
6. Gotowe. Kliknij **Uruchom** nad funkcją `INIT_SHEET_PERMISSIONS()`, aby poproszono Cię o autoryzację pierwszego dostępu, którą musisz zaakceptować.
7. Aby stworzyć Publiczne API Webowe:
    * Wybierz potężny niebieski guzik u góry po prawej stronie **Opublikuj / Wdróż** -> **Nowe Wdrożenie** (New Deployment).
    * Typ wdrożenia: zębatka -> **Aplikacja internetowa** (Web App).
    * Opis: (np. Wersja 1.0)
    * Uruchom jako: **Moje konto (Twój e-mail)**.
    * Kto ma dostęp (Who has access): **Wszyscy / Każdy (Anyone)**. (To kluczowe!)
    * Wyślij! Skopiuj **Adres URL wdrożenia** (taki brzydki link zaczynający się od `script.google.com/macros/s/..../exec`). Ten link wprowadzisz później do ustawień środowiskowych lub wskażesz bezpośrednio mojej osobie przy tworzeniu Front-Endu!

Jak tylko zdobędziesz ten docelowy Adres URL, daj mi znać i wygeneruję nam FrontEnd (HTML/CSS) łączący się z Twoją bazą.

---

## Aktualizacja wdrozenia - 2026-04-11 (QR nauczyciela)

- Wymagane arkusze: `Uczestnicy`, `Nauczyciele`, `Stanowiska`, `KodyQR`, `Skanowania`, `Ustawienia`.
- W arkuszu `Nauczyciele` musi istniec kolumna `station_code` (relacja `1 nauczyciel = 1 stanowisko`).
- Skanowanie uczestnika dziala po parametrze `qr_token` (link typu `...?qr_token=...`), nie po `code`.
- W `Ustawienia` dodaj `app_base_url` (np. `https://qr.zsoiz-czyzew.pl/`), bo backend buduje z tego link QR.
- Po zmianach backendu wykonuj `clasp push`, a potem publikuj nowa wersje Web App (`@N`) i aktualizuj URL API we frontendzie.
