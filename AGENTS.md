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

## Stan projektu 2026-05-15
- W widoku rejestracji uczestnika dodano wymagany checkbox zgody na przetwarzanie danych osobowych.
- Checkbox linkuje do nowej statycznej strony `frontend/public/polityka-prywatnosci.html`, publikowanej jako `/polityka-prywatnosci.html`.
- Rejestracja jest blokowana po stronie frontendu, jesli zgoda nie zostanie zaznaczona.
- W panelu nauczyciela dodano checkbox `Statyczny kod`; nowe QR moga byc jednorazowe albo statyczne przez flage `qr_codes.is_static`.
- Jeden nauczyciel nadal ma maksymalnie jeden aktywny kod QR naraz, a statyczny kod pozostaje aktywny po skutecznym skanie wielu uczestnikow.

# Kontekst projektu
Calosc wymagan funkcjonalnych jest opisana w `PROJEKT.md`.
Stos technologiczny: frontend Vite (widoki `index.html` i `admin.html`), backend PocketBase/SQLite pod `https://pocketbase.zsoiz-czyzew.pl` plus starszy backend Google Apps Script jako kontekst historyczny.
Backend PocketBase trzyma migracje w `pocketbase/pb_migrations`, custom route w `pocketbase/pb_hooks/main.pb.js` i obsluguje kontrakt `POST /api/qr-action` z body `{ action, payload }`.

# Historia Zmian (Skrócona, do 2026-05-14)
- **Architektura**: Zmigrowano z Google Sheets na PocketBase/SQLite. Aplikacja działa z jednym wspólnym endpointem API: `/api/qr-action` i globalnym konfiguratorem kolorów / logo `config.js`. Dodano build w Vite hostowany m.in. na Github Pages. Zmiany konfiguracji brandingu zapisywane są w PocketBase.
- **Uczestnik**: Rejestracja z blokadą duplikatów i predefiniowaną listą 16 szkół. Flow logowania w oparciu o ustany na starcie kod PIN. Wbudowany ekran Dashboard ze statystykami odświeżanymi w czasie rzeczywistym i interaktywnymi "wyszarzającymi się" kafelkami dla odwiedzonych stacji.
- **Nauczyciel**: Relacja 1 nauczyciel = 1 stacja, blokada wielokrotnego logowania (flaga `is_logged`). Dynamiczne odpytywanie API i ukrywanie jednorazowo zużytego kodu QR ze wsparciem zaawansowanego modalu z gradientowym, animowanym tytułem stanowiska.
- **Admin i Losowanie**: Trwała sesja logowania. Możliwość ręcznego usunięcia uczestnika oraz aktualizacja puli biorących udział w losowaniu do finału (`in_draw`). Dodano możliwość sortowania tabeli graczy po szkole, kodach, statusie i wydanej nagrodzie, a także wdrożono panel grupowego wciągania/usuwania z losowania całych szkół. Wyodrębniono wizualnie efektowny ekran na wielki ekran (`/losowanie/`) wsparty PINem administracyjnym w celach kontrolnych, z animacją zapętloną oraz dźwiękiem werbli po kliknięciu "Rozdaj fanty!". W widoku losowania logo nie jest skalowane (rozmiar 1:1).

# Operacyjne zasady wdrozeniowe
- Gdy zmieniasz endpoint API PocketBase, aktualizuj URL rownoczesnie w `frontend/main.js` i `frontend/admin.js`.
- Po zmianach PocketBase wgrywaj `pocketbase/pb_migrations` i `pocketbase/pb_hooks` na VPS oraz wykonuj `pocketbase migrate up` na instancji produkcyjnej.
- Nigdy nie commituj `pb_data`, backupow, plikow `.db`, hasel, tokenow ani danych logowania PocketBase.
- Po inicjalizacji bazy zmien startowy `settings.admin_pin=1234` w panelu PocketBase.
- Stary Apps Script zostaje tylko jako fallback historyczny; nowe zmiany backendu rob przez PocketBase.

# Otwarte TODO
- Wgrac katalogi `pocketbase/pb_migrations` i `pocketbase/pb_hooks` na VPS PocketBase.
- Uruchomic na VPS `pocketbase migrate up` dla instancji `https://pocketbase.zsoiz-czyzew.pl`.
- Po migracji zmienic `settings.admin_pin` z `1234` na docelowy PIN administratora.
- W PocketBase recznie dodac realne rekordy `stations` i `teachers` z mapowaniem `1 nauczyciel = 1 stanowisko`.
- Wykonac reczny smoke test flow: rejestracja -> modal PIN -> dashboard, logowanie `nick + PIN`, konto bez PIN (`PIN_NOT_SET`), bledny PIN.
- Wykonac smoke test nauczyciela: logowanie bez `station_code` (blad), pobranie panelu, wielokrotne generowanie QR i blokade jednego aktywnego kodu.
- Wykonac smoke test nauczyciela dla checkboxa `Statyczny kod`: zwykly QR znika po pierwszym skutecznym skanie, statyczny QR zostaje aktywny po skanach roznych uczestnikow, a duplikat tego samego uczestnika nie dodaje punktu.
- Wykonac smoke test skanowania nowego `?qr_token=...` i walidacji `INVALID_QR_TOKEN` dla nieistniejacego tokenu.
- Wykonac reczny smoke test rejestracji dla nowego dropdownu szkol: brak wyboru (blokada) i poprawny wybor z listy.
- Wykonac reczny smoke test checkboxa zgody w rejestracji: brak zaznaczenia blokuje submit, zaznaczenie przepuszcza dalej do ustawienia PIN-u.
- Sprawdzic recznie link `Polityka Prywatnosci` w formularzu rejestracji i otwieranie strony `/polityka-prywatnosci.html`.
- Sprawdzic recznie odpowiedz API `register` dla wartosci `school_name` spoza listy (`INVALID_SCHOOL_NAME`).
- Potwierdzic sortowanie tabeli admina po kolumnach (Kody, Szkoła, Status, Nagroda) z aktualnym PIN admina.
- Wykonac reczny smoke test dashboardu uczestnika: czy live statystyki (`Uczestnik na prowadzeniu ma punktów:`, `Uczestnicy w grze`) laduja sie od razu i odswiezaja co 5 sekund bez reloadu.
- Wgrac na VPS zaktualizowany `pocketbase/pb_hooks/main.pb.js` (poprawione `get_stats` z `leader_points` i `collecting_participants_count`) i zrestartowac instancje PocketBase.
- Potwierdzic na produkcji przez `POST /api/qr-action` (`action=get_stats`), ze response zawiera pola `leader_points` oraz `collecting_participants_count`.
- Wykonac reczny smoke test kafelkow stanowisk uczestnika: wieksze emoji sa stale per stanowisko, a zaliczone stanowiska przechodza w stan disabled (`Zaliczone`) po skanie.
- Potwierdzic recznie fallback visited: po skanie kafelek stanowiska zmienia sie na disabled od razu po powrocie do dashboardu, nawet przy chwilowym braku pola `visited_station_codes` w odpowiedzi `get_profile`.
- Wykonac reczny smoke test listy losowania w panelu admina: zmiana checkboxa oraz kliknięcie przycisku szkoły poprawnie aktualizuje stan `in_draw` z natychmiastowym zapisem.
- Po zmianach frontendu wykonac wdrozenie na GitHub Pages (build `npm run build` wykonany lokalnie).
- Potwierdzic po publikacji GitHub Pages, ze frontend korzysta z `https://pocketbase.zsoiz-czyzew.pl/api/qr-action`.
- Wykonać smoke test nowego widoku `/losowanie/`: logowanie PINem, stan oczekiwania, pojawianie się finalistów po zapisie w panelu admina.
- Wykonac reczny smoke test nowej animacji `/losowanie/`: sekwencyjne wejscie kart, pionowy endless loop i brak restartu animacji przy niezmienionej liscie z API.
- Wgrac na VPS zaktualizowany `pocketbase/pb_hooks/main.pb.js` (akcja `draw_lottery_winner`) i zrestartowac instancje PocketBase.
- Wykonac reczny smoke test flow `Rozdaj fanty!`: 10s chaos, reveal zwyciezcy, aktualizacja `reward_issued=true` i `in_draw=false`, brak ponownego losowania tej samej osoby.
- Sprawdzic wizualnie nowy naglowek hero w widoku nauczyciela: czy jest wycentrowany, ma animowany gradient i poprawnie wyswietla nazwe stanowiska.
- Po każdej istotnej zmianie aktualizować ten plik (`AGENTS.md`) jako jedyne źródło kontekstu dla kolejnych sesji.
