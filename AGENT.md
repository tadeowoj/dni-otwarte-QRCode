# Instrukcje dla agenta

Utrzymuj ten projekt w jak największym stopniu niezależny od konkretnego agenta.

## Zasada: utrzymanie kontekstu

Na koniec każdego istotnego zadania lub sesji podsumuj aktualny stan projektu, podjęte decyzje architektoniczne oraz listę oczekujących zadań („todo”) w pliku AGENTS.md. Zawsze upewnij się, że plik ten odzwierciedla rzeczywisty („ground truth”) stan projektu, aby kolejne sesje mogły być kontynuowane bez problemów. Użyj narzędzia writeFile, aby nadpisać plik i rozpocząć kolejną sesję z aktualnym stanem.

## Zasada: commity

* Zawsze używaj konwencjonalnych komunikatów commitów (np. `feat:`, `fix:`, `docs:`, `chore:`)
* Nigdy nie dodawaj informacji o agentach (copilot, claude itp.) w komunikatach commitów ani w sekcji współautorów
* Commitowanie bezpośrednio do gałęzi main jest dozwolone w tym repozytorium

## Zasada: sekrety

* Nigdy nie commituj sekretów, plików konfiguracyjnych ani plików baz danych

## Zasada: styl kodu

* W plikach markdown używaj akapitów w jednej linii — bez zawijania do wielu linii
* Zawsze stosuj zapis tytułów w stylu zdaniowym (sentence case)
* Nie używaj podkreśleń ani spacji w nazwach plików; stosuj myślniki
* Skrypty wykonywalne nigdy nie powinny mieć rozszerzeń

## Zasada: repozytoria GitHub

* Włącz automatyczne usuwanie gałęzi po scaleniu PR
* Po scaleniu PR pobierz najnowsze zmiany do bieżącej gałęzi i usuń pozostałe worktree

--
# Projekt
Cały projekt jest zdefiniowany w pliku PROJEKT.md

# Dziennik projektu i stan architektury

## Podsumowanie - Etap 1: Inicjalizacja Backend-u i Bazy Danych
Zdecydowano o architekturze opartej na headless-API z użyciem Google Apps Script i pliku Google Sheets (`Stanowiska`, `Uczestnicy`, `Skanowania`, `Ustawienia`). 
Stworzono repozytorium plików backendu. Aplikacja kliencka użyje go do pobierania/zapisywania uczestników i weryfikacji skanów kodów.

### Decyzje Architektoniczne
- Kod ułożony wg Modułów: `Code.js` (Router), `API.js` (Logika Biznesowa), `Database.js` (Wrapper GSheet).
- Zainstalowano Node.js na stacji i użyto narzędzia `@google/clasp` w celu wygenerowania środowiska do spushowania bazy do Grive.

## Podsumowanie - Etap 2: Aplikacja kliencka (Frontend)
Zbudowano aplikację typu SPA (Single Page Application) ze strukturą Vite. Oskryptowanie bazuje na pliku `main.js`, w którym zaimplementowano komunikację Fetch z uprzednio wdrożonym API Google Apps Script. 

### Decyzje wizualne i projektowe
- Tło aplikacji jest zbudowane na Glassmorphismie (CSS Blur Backdrops).
- Kolorystyka to motyw Dark Mode + neonowa zieleń do wskazywania postępu, oraz ciemny fiolet do tła i przycisków.
- Stan klienta (Participant ID) jest zapisywany w `localStorage`, żeby uczeń wbiegając na salę nie musiał się co stół logować.

## Podsumowanie - Etap 3: Panel Admina i Ostateczne Wdrożenie
Stworzyliśmy wyizolowany podprojekt interfejsu (Admin Panel) wewnątrz Frontendu dla organizatorów, zabezpieczony podstawowym hasłem (PIN: `14317`). Po stronie API (`Code.js`, `API.js`) wbudowano metody zwracające kompleksowe statystyki oraz pełną historię tabel uczestników do weryfikacji manualnej. Dodano na repozytorium GitHub skrypt typu Action (CI/CD) hostujący automatycznie aplikację.

### Osiągnięcia Techniczne:
- `admin.html` oraz `admin.js` stworzone w zgodzie ze stylem (Glassmorphism & Gridy). Moduł działa całkowicie niezależnie od ścieżki logowania standardowego uczestnika.
- Skonfigurowano auto-deploy na gałęzi Main. Plik konfiguracyjny (vite + gh-pages + workflow) gotowy.

### TODO (W pełni zakończony proces)
Główny zakres `PROJEKT.md` został pomyślnie zrealizowany. Zabawa jest gotowa na przyjęcie uczniów.

## Aktualizacja architektury - 2026-04-11
- Frontend (Vite) został przełączony na build wielostronicowy: `index.html` i `admin.html` są jawnie ustawione jako wejścia w `frontend/vite.config.js` (`build.rollupOptions.input`).
- Hosting GitHub Pages działa na custom domenie `qr.zsoiz-czyzew.pl`; panel administratora jest dostępny pod `/admin.html` po wdrożeniu artefaktu z obu stronami.
- Backend Google Apps Script: frontend był podpięty do starego deploymentu Web App (`@1`), który nie zawierał akcji `get_admin_data`. Frontend został przepięty na aktualny deployment (`@HEAD`) zgodny z aktualnym routerem (`get_admin_data`, `issue_reward`).
- Operacyjnie: kod backendu został wypchnięty przez `clasp push`, a następnie frontend został zdeployowany przez GitHub Actions na `main`.

## TODO operacyjne
- Przy każdej zmianie endpointu Apps Script aktualizować URL w `frontend/main.js` i `frontend/admin.js` w tej samej zmianie.
- Po zmianach backendu Apps Script wykonywać `clasp push` oraz utrzymywać aktywny deployment Web App zgodny z frontendem.
- Po każdej istotnej zmianie architektury aktualizować ten plik (`AGENT.md`) jako źródło prawdy.
