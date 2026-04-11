# Instrukcje dla agentów
Projekt ma być utrzymywany tak, żeby kolejne sesje mogły wejść w temat bez zgadywania.
## Zasady pracy
- Po każdym istotnym zadaniu aktualizuj `AGENTS.md`: stan projektu, decyzje i otwarte TODO.
- Używaj konwencjonalnych commitów (`feat:`, `fix:`, `docs:`, `chore:`).
- Nie dodawaj w commitach informacji o agentach ani współautorach-agentach.
- Commit na `main` jest dozwolony w tym repo.
- Nigdy nie commituj sekretów, plików konfiguracyjnych z danymi wrażliwymi ani plików baz danych.
## Zasady stylu
- W Markdown trzymaj akapity w jednej linii (bez ręcznego zawijania).
- Używaj nagłówków w stylu sentence case.
- W nazwach plików używaj myślników, bez spacji i podkreśleń.
- Skrypty wykonywalne nie powinny mieć rozszerzeń.
## Zasady repozytorium GitHub
- Włącz automatyczne usuwanie gałęzi po merge PR.
- Po merge PR pobierz najnowsze zmiany i usuń zbędne worktree.
# Kontekst projektu
Całość wymagań funkcjonalnych jest opisana w `PROJEKT.md`.
Stos technologiczny: frontend Vite (widoki `index.html` i `admin.html`), backend Google Apps Script + Google Sheets (`Stanowiska`, `Uczestnicy`, `Skanowania`, `Ustawienia`).
Backend jest podzielony modułowo: `Code.js` (router), `API.js` (logika), `Database.js` (warstwa arkusza).
# Stan na 2026-04-11
- Frontend działa jako build wielostronicowy (`index.html`, `admin.html`) i jest hostowany przez GitHub Pages (custom domain: `qr.zsoiz-czyzew.pl`).
- Panel admina działa niezależnie od ścieżki uczestnika i korzysta z PIN z arkusza `Ustawienia`.
- Walidacja PIN admina jest znormalizowana przez `String(...).trim()` i opiera się wyłącznie na `admin_pin` z arkusza.
- Rejestracja ma blokadę duplikatów po zestawie `first_name_last_name + nickname + school_name` (normalizacja: `trim`, redukcja spacji, `toLowerCase`).
- Endpoint `register` zwraca `DUPLICATE_PARTICIPANT`, a frontend obsługuje ten przypadek dedykowanym komunikatem.
- Rejestracja jest zabezpieczona `LockService.getScriptLock()` przed równoległym duplikowaniem rekordów.
- Dashboard uczestnika ma przycisk `Wyloguj`, który czyści lokalną sesję (`localStorage`) i wraca do rejestracji.
- Kolorystyka frontendu została rozjaśniona do jasnego motywu szkolnego z fioletem jako głównym akcentem; zielony pozostał pomocniczy dla sukcesu/postępu.
# Operacyjne zasady wdrożeniowe
- Gdy zmieniasz endpoint Apps Script, aktualizuj URL równocześnie w `frontend/main.js` i `frontend/admin.js`.
- Po zmianach backendu wykonuj `clasp push` i pilnuj zgodności aktywnego Web App deploymentu z frontendem.
- Produkcyjny frontend ma używać publicznego deploymentu wersjonowanego Apps Script (`@N`) z uprawnieniem `ANYONE_ANONYMOUS`, nie `@HEAD`.
# Otwarte TODO
- Po kolejnych zmianach backendu uruchomić ręczną walidację scenariuszy rejestracji (duplikaty, różnice wielkości liter/spacji, równoległe submitowanie).
- Po zmianach frontendu wykonać `npm run build` i wdrożenie na GitHub Pages.
- Po każdej istotnej zmianie aktualizować `AGENT.md` i `AGENTS.md`, żeby utrzymać jeden spójny kontekst dla następnych sesji.
