# Instrukcje dla agentow
Projekt ma byc utrzymywany tak, zeby kolejne sesje mogly wejsc w temat bez zgadywania.

## Zasady pracy
- Po kazdym istotnym zadaniu aktualizuj `AGENT.md`: stan projektu, decyzje i otwarte TODO.
- Uzywaj konwencjonalnych commitow (`feat:`, `fix:`, `docs:`, `chore:`).
- Nie dodawaj w commitach informacji o agentach ani wspolautorach-agentach.
- Commit na `main` jest dozwolony w tym repo.
- Nigdy nie commituj sekretow, plikow konfiguracyjnych z danymi wrazliwymi ani plikow baz danych.

## Zasady stylu
- W Markdown trzymaj akapity w jednej linii (bez recznego zawijania).
- Uzywaj naglowkow w stylu sentence case.
- W nazwach plikow uzywaj myslnikow, bez spacji i podkreslen.
- Skrypty wykonywalne nie powinny miec rozszerzen.

## Zasady repozytorium GitHub
- Wlacz automatyczne usuwanie galezi po merge PR.
- Po merge PR pobierz najnowsze zmiany i usun zbedne worktree.

# Kontekst projektu
Calosc wymagan funkcjonalnych jest opisana w `PROJEKT.md`.
Stos technologiczny: frontend Vite (widoki `index.html` i `admin.html`), backend Google Apps Script + Google Sheets (`Stanowiska`, `Uczestnicy`, `Skanowania`, `Ustawienia`).
Backend jest podzielony modulowo: `Code.js` (router), `API.js` (logika), `Database.js` (warstwa arkusza).

# Stan na 2026-04-11
- Frontend dziala jako build wielostronicowy (`index.html`, `admin.html`) i jest hostowany przez GitHub Pages (custom domain: `qr.zsoiz-czyzew.pl`).
- Panel admina dziala niezaleznie od sciezki uczestnika i korzysta z PIN z arkusza `Ustawienia` (`admin_pin`).
- Rejestracja ma blokade duplikatow po zestawie `first_name_last_name + nickname + school_name` (normalizacja: `trim`, redukcja spacji, `toLowerCase`) i endpoint zwraca `DUPLICATE_PARTICIPANT`.
- Rejestracja jest zabezpieczona `LockService.getScriptLock()` przed rownoleglym duplikowaniem rekordow.
- Uczestnik ma przycisk `Wyloguj`, ktory czysci lokalna sesje (`localStorage`) i wraca do ekranu autoryzacji.
- UI frontendu dziala na jasnej palecie szkolnej; tokeny kolorow sa zcentralizowane w `frontend/style.css` i wspolne dla widoku uczestnika oraz admina.
- Logowanie uczestnika dziala przez `nickname + PIN` (PIN jako string, dokladnie 4 cyfry).
- Po rejestracji wymagane jest ustawienie PIN w modalu; dopiero po sukcesie tworzy sie sesja i wejscie do dashboardu.
- Backend ma nowe akcje `set_user_pin` i `login_user`; konto bez PIN zwraca `PIN_NOT_SET`.
- Arkusz `Uczestnicy` wymaga kolumny `pin`.
- Publiczny deployment Apps Script pod URL używanym przez frontend jest zaktualizowany do wersji `@9` (zawiera dropdown szkol i backendowa walidacje whitelisty `school_name`).
- Formularz rejestracji uczestnika ma zamknieta liste szkol podstawowych (`select` z 16 pozycjami), zamiast dowolnego pola tekstowego.
- Backend waliduje `school_name` po whitelistcie 16 szkol i zwraca `INVALID_SCHOOL_NAME` dla wartosci spoza listy.

# Ostatnia sesja (2026-04-11)
- Dodano frontendowy flow autoryzacji dla uczestnika: formularz rejestracji + formularz logowania `nick + PIN` na `index.html`.
- Dodano modal ustawiania PIN po udanej rejestracji z walidacja `^\d{4}$` i potwierdzeniem PIN.
- Rozszerzono backend (`API.js`, `Code.js`) o akcje `set_user_pin` oraz `login_user` i kody bledow `INVALID_PIN_FORMAT`, `INVALID_CREDENTIALS`, `PIN_NOT_SET`.
- Zaktualizowano dokumentacje schematu (`schema/database.md`) o pole `pin` w arkuszu `Uczestnicy`.
- Zamieniono pole `Szkola podstawowa` na dropdown (`select`) z lista 16 szkol w `frontend/index.html`.
- Dodano frontendowa walidacje braku wyboru szkoly (toast) oraz backendowa whitelista dla `school_name` z bledem `INVALID_SCHOOL_NAME`.
- Rozjasniono placeholdery formularza rejestracyjnego, zeby nie mylic ich z wpisana wartoscia.
- Zaktualizowano URL backendu Apps Script do deploymentu `@9` w `frontend/main.js` i `frontend/admin.js`.

# Operacyjne zasady wdrozeniowe
- Gdy zmieniasz endpoint Apps Script, aktualizuj URL rownoczesnie w `frontend/main.js` i `frontend/admin.js`.
- Po zmianach backendu wykonuj `clasp push` i pilnuj zgodnosci aktywnego Web App deploymentu z frontendem.
- Produkcyjny frontend ma uzywac publicznego deploymentu wersjonowanego Apps Script (`@N`) z uprawnieniem `ANYONE_ANONYMOUS`, nie `@HEAD`.

# Otwarte TODO
- W arkuszu `Uczestnicy` dodac fizycznie kolumne `pin` w naglowkach (zgodnie z `schema/database.md`).
- Wykonac reczny smoke test flow: rejestracja -> modal PIN -> dashboard, logowanie `nick + PIN`, konto bez PIN (`PIN_NOT_SET`), bledny PIN.
- Wykonac reczny smoke test rejestracji dla nowego dropdownu szkol: brak wyboru (blokada) i poprawny wybor z listy.
- Sprawdzic recznie odpowiedz API `register` dla wartosci `school_name` spoza listy (`INVALID_SCHOOL_NAME`).
- Po zmianach backendu wykonac `clasp push` i sprawdzic publiczny deployment Apps Script.
- Po zmianach frontendu wykonac `npm run build` i wdrozenie na GitHub Pages.
- Potwierdzic po publikacji GitHub Pages, ze frontend korzysta z nowego deploymentu Apps Script `@9`.
- Po kazdej istotnej zmianie aktualizowac ten plik (`AGENT.md`) jako jedyne zrodlo kontekstu dla kolejnych sesji.
