# Instrukcje dla agentow
Projekt ma byc utrzymywany tak, zeby kolejne sesje mogly wejsc w temat bez zgadywania.

## Zasady pracy
- Po kazdym istotnym zadaniu aktualizuj `AGENTS.md`: stan projektu, decyzje i otwarte TODO.
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
Stos technologiczny: frontend Vite (widoki `index.html` i `admin.html`), backend Google Apps Script + Google Sheets (`Uczestnicy`, `Nauczyciele`, `Stanowiska`, `KodyQR`, `Skanowania`, `Ustawienia`).
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
- Widok rejestracji (`frontend/index.html`) ma sekcje hero z loopowanym filmem logo (`/img/logo.webm`) nad naglowkiem "Witaj w grze!".
- Asset filmu logo jest dostepny przez Vite z `frontend/public/img/logo.webm` (kopiowany z repo `img/logo.webm`).
- W hero rejestracji logo video zostalo zmniejszone i ustawione po prawej stronie naglowka "Witaj w grze!", z wysokoscia dopasowana do wysokosci naglowka.
- Logo video w hero rejestracji jest przypiete absolutnie do prawego gornego rogu `.start-card`, powiekszone o okolo 25% i nie wplywa na pozycjonowanie formularza.
- Model danych nauczyciela zostal uscisleny do relacji `1 nauczyciel = 1 stanowisko` przez pole `station_code` w arkuszu `Nauczyciele`.
- Dodano arkusz `KodyQR` do przechowywania aktywnych tokenow QR (`qr_id`, `qr_token`, `station_code`, `teacher_id`, `created_at`, `is_active`).
- Backend ma nowe akcje `get_teacher_panel_data` i `generate_teacher_qr`; logowanie nauczyciela zwraca `station_code` i `station_name`.
- Endpoint `scan_code` przyjmuje teraz `qr_token` (stare `station_code` i parametr URL `code` nie sa obslugiwane).
- Widok nauczyciela w `frontend/index.html` umozliwia generowanie nowego QR, podglad aktualnego kodu i historie ostatnich aktywnych tokenow.

# Stan na 2026-04-12
- Produkcyjny URL Apps Script uzywany przez frontend zostal przepiety z wersji `@10` na wersje `@11` (`Teacher panel data and QR actions`).
- Test POST dla akcji `get_teacher_panel_data` na produkcyjnym URL nie zwraca juz `Nieznana akcja API`; dla testowego `teacher_id=TEST` zwraca poprawny blad domenowy `Nie znaleziono konta nauczyciela.`.
- Wykonano `npx.cmd clasp deploy --deploymentId AKfycbw8csjuObiG1iuIO1KAi1TKSVHOXQXAs2CMuWnIELGshCbuTBjf0-bA28ZbkUetINzv --versionNumber 11 --description "Teacher panel data and QR actions"`.
- Panel nauczyciela po kliknieciu `Wygeneruj nowy QR` aktualizuje teraz canvas QR, link skanowania i historie kodow bez przeladowywania calego widoku.
- Po zmianie frontendu wykonano lokalny build `npm.cmd run build`.
- Backend `scan_code` zuzywa teraz kod QR jednorazowo: po skutecznym przyznaniu punktu ustawia `KodyQR.is_active=false` w blokadzie `LockService`; skan duplikatu stanowiska nie dezaktywuje kodu.
- Produkcyjny deployment Apps Script zostal przepiety na wersje `@12` (`One-time QR codes`) pod tym samym URL.
- Test POST `scan_code` z testowymi danymi na produkcyjnym URL zwrocil poprawny blad domenowy `Uczestnik nie istnieje, zaloguj sie ponownie.`, czyli router produkcyjny przyjmuje akcje po wdrozeniu `@12`.
- Flow QR nauczyciela zostal doprecyzowany: tylko jeden aktywny kod QR na nauczyciela, `generate_teacher_qr` zwraca istniejacy aktywny kod zamiast tworzyc kolejny, panel blokuje przycisk generowania i odpytuje backend co 2 sekundy, zeby ukryc zuzyty kod bez reloadu.
- Produkcyjny deployment Apps Script zostal przepiety na wersje `@13` (`Single active teacher QR`); test POST `get_teacher_panel_data` z `teacher_id=TEST` zwrocil poprawny blad domenowy `Nie znaleziono konta nauczyciela.`.

# Ostatnia sesja (2026-04-11)
- Dodano frontendowy flow autoryzacji dla uczestnika: formularz rejestracji + formularz logowania `nick + PIN` na `index.html`.
- Dodano modal ustawiania PIN po udanej rejestracji z walidacja `^\d{4}$` i potwierdzeniem PIN.
- Rozszerzono backend (`API.js`, `Code.js`) o akcje `set_user_pin` oraz `login_user` i kody bledow `INVALID_PIN_FORMAT`, `INVALID_CREDENTIALS`, `PIN_NOT_SET`.
- Zaktualizowano dokumentacje schematu (`schema/database.md`) o pole `pin` w arkuszu `Uczestnicy`.
- Zamieniono pole `Szkola podstawowa` na dropdown (`select`) z lista 16 szkol w `frontend/index.html`.
- Dodano frontendowa walidacje braku wyboru szkoly (toast) oraz backendowa whitelista dla `school_name` z bledem `INVALID_SCHOOL_NAME`.
- Rozjasniono placeholdery formularza rejestracyjnego, zeby nie mylic ich z wpisana wartoscia.
- Zaktualizowano URL backendu Apps Script do deploymentu `@9` w `frontend/main.js` i `frontend/admin.js`.
- Dodano w `frontend/index.html` sekcje hero z autoplay/loop/muted video (`/img/logo.webm`) i nowy styling (`frontend/style.css`) dla profesjonalnej ekspozycji logo.
- Dodano publiczny asset `frontend/public/img/logo.webm` oraz potwierdzono lokalny build frontendu (`npm run build`) po zmianie.
- Przestawiono layout hero: naglowek i logo sa w jednym rzedzie, a rozmiar video zostal doskalowany do wysokosci naglowka (desktop + mobile).
- Ustawiono logo jako element absolutny w prawym gornym rogu karty i zwiekszono jego skale (`clamp(50px, 6.25vw, 68px)`), zachowujac stabilny uklad pozostalych elementow.
- Zaimplementowano relacje nauczyciel- stanowisko (`station_code`) i nowy flow generowania kodow QR nauczyciela zapisujacy tokeny w arkuszu `KodyQR`.
- Rozszerzono panel nauczyciela (`index.html` + `main.js`) o sekcje stanowiska, generowanie nowego QR, render kodu i historie aktywnych tokenow.
- Przebudowano skanowanie uczestnika na `qr_token` (`?qr_token=...`) i zablokowano stary parametr `?code=...`.
- Zaktualizowano dokumentacje `schema/database.md` i `PROJEKT.md` pod nowy model danych oraz flow QR.
- Wykonano `clasp push` po zmianach backendu (API.js, Code.js, Database.js, appsscript.json) do powiazanego projektu Apps Script.

# Operacyjne zasady wdrozeniowe
- Gdy zmieniasz endpoint Apps Script, aktualizuj URL rownoczesnie w `frontend/main.js` i `frontend/admin.js`.
- Po zmianach backendu wykonuj `clasp push` i pilnuj zgodnosci aktywnego Web App deploymentu z frontendem.
- Produkcyjny frontend ma uzywac publicznego deploymentu wersjonowanego Apps Script (`@N`) z uprawnieniem `ANYONE_ANONYMOUS`, nie `@HEAD`.

# Otwarte TODO
- W arkuszu `Uczestnicy` dodac fizycznie kolumne `pin` w naglowkach (zgodnie z `schema/database.md`).
- W arkuszu `Nauczyciele` dodac fizycznie kolumne `station_code` i uzupelnic mapowanie `1 nauczyciel = 1 stanowisko`.
- Utworzyc arkusz `KodyQR` z naglowkami zgodnymi z `schema/database.md`.
- Wykonac reczny smoke test flow: rejestracja -> modal PIN -> dashboard, logowanie `nick + PIN`, konto bez PIN (`PIN_NOT_SET`), bledny PIN.
- Wykonac smoke test nauczyciela: logowanie bez `station_code` (blad), pobranie panelu, wielokrotne generowanie QR, widoczna historia kodow.
- Wykonac smoke test skanowania nowego `?qr_token=...` i walidacji `INVALID_QR_TOKEN` dla nieistniejacego tokenu.
- Wykonac reczny smoke test rejestracji dla nowego dropdownu szkol: brak wyboru (blokada) i poprawny wybor z listy.
- Sprawdzic recznie odpowiedz API `register` dla wartosci `school_name` spoza listy (`INVALID_SCHOOL_NAME`).
- Sprawdzic publiczny deployment Apps Script po `clasp push` i opublikowac nowa wersje Web App (`@N`) pod produkcyjny URL.
- Po zmianach frontendu wykonac wdrozenie na GitHub Pages (build `npm run build` wykonany lokalnie).
- Potwierdzic po publikacji GitHub Pages, ze frontend korzysta z deploymentu Apps Script `@13`.
- Po kazdej istotnej zmianie aktualizowac ten plik (`AGENTS.md`) jako jedyne zrodlo kontekstu dla kolejnych sesji.
