/**
 * API.js - Logika biznesowa i kontrolery (wg modulow projektu)
 */

const ALLOWED_SCHOOL_NAMES = [
  "Szkoła Podstawowa im. Szarych Szeregów w Czyżewie",
  "Szkoła Podstawowa im. Ojca Świętego Jana Pawła II w Bogutach-Piankach",
  "Szkoła Podstawowa w Tymiankach-Buciach",
  "Szkoła Podstawowa im. Marii Konopnickiej w Nurze",
  "Szkoła Podstawowa im. Kardynała Stefana Wyszyńskiego w Szulborzu Wielkim",
  "Szkoła Podstawowa w Zarębach Kościelnych",
  "Szkoła Podstawowa w Andrzejewie",
  "Szkoła Podstawowa w Ołdakach-Polonii",
  "Szkoła Podstawowa im. Św. Jana Pawła II w Rosochatym-Kościelnym",
  "Szkoła Podstawowa w Dąbrowie Wielkiej",
  "Szkoła Podstawowa im. Kardynała Stefana Wyszyńskiego w Szepietowie",
  "Szkoła Podstawowa w Wojnach-Krupach",
  "Szkoła Podstawowa im. Polskiej Organizacji Wojskowej w Dąbrówce Kościelnej",
  "Szkoła Podstawowa im. Komisji Edukacji Narodowej w Klukowie",
  "Szkoła Podstawowa w Wyszonkach Kościelnych",
  "Szkoła Podstawowa w Łuniewie Małym"
];

const API = {
  // Zwraca odpowiedz w spojnym formacie
  success(data) {
    return { status: "success", data: data };
  },

  error(message, error_code = null) {
    const response = { status: "error", message: message };
    if (error_code) {
      response.error_code = error_code;
    }
    return response;
  },

  // Ujednolicenie PIN-u z inputa i z arkusza (string/number/whitespace).
  normalizePin(pin) {
    return String(pin ?? "").trim();
  },

  normalizeNameOrSchool(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  },

  normalizeNickname(value) {
    return String(value ?? "").trim();
  },

  normalizeComparableNameOrSchool(value) {
    return this.normalizeNameOrSchool(value).toLowerCase();
  },

  normalizeComparableNickname(value) {
    return this.normalizeNickname(value).toLowerCase();
  },

  getAllowedSchoolByComparableName(value) {
    const comparableValue = this.normalizeComparableNameOrSchool(value);
    return ALLOWED_SCHOOL_NAMES.find((school) => {
      return this.normalizeComparableNameOrSchool(school) === comparableValue;
    }) || null;
  },

  isAdminPinValid(pin) {
    const enteredPin = this.normalizePin(pin);
    const configuredPin = this.normalizePin(DB.getSetting("admin_pin"));

    if (!enteredPin || !configuredPin) return false;
    return enteredPin === configuredPin;
  },

  isParticipantPinValid(pin) {
    return /^\d{4}$/.test(this.normalizePin(pin));
  },

  // M1: Rejestracja Uczestnika
  registerParticipant(payload) {
    const safePayload = payload || {};
    const first_name_last_name = this.normalizeNameOrSchool(safePayload.first_name_last_name);
    const nickname = this.normalizeNickname(safePayload.nickname);
    const school_name = this.normalizeNameOrSchool(safePayload.school_name);

    if (!nickname || !first_name_last_name || !school_name) {
      return this.error("Wszystkie pola sa wymagane");
    }

    const canonicalSchoolName = this.getAllowedSchoolByComparableName(school_name);
    if (!canonicalSchoolName) {
      return this.error("Nieprawidlowa szkola. Wybierz szkole z listy.", "INVALID_SCHOOL_NAME");
    }

    const normalizedName = this.normalizeComparableNameOrSchool(first_name_last_name);
    const normalizedNickname = this.normalizeComparableNickname(nickname);
    const normalizedSchool = this.normalizeComparableNameOrSchool(canonicalSchoolName);

    // Blokada rownoleglych zapisow: check + insert musza byc atomowe.
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);

      const participants = DB.getRowsAsObjects("Uczestnicy");
      const exists = participants.find((p) => {
        return (
          this.normalizeComparableNameOrSchool(p.first_name_last_name) === normalizedName &&
          this.normalizeComparableNickname(p.nickname) === normalizedNickname &&
          this.normalizeComparableNameOrSchool(p.school_name) === normalizedSchool
        );
      });

      if (exists) {
        return this.error(
          "Takie konto juz istnieje (imie i nazwisko + nick + szkola).",
          "DUPLICATE_PARTICIPANT"
        );
      }

      const participant_id = "U_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);

      DB.insertRow("Uczestnicy", {
        participant_id: participant_id,
        first_name_last_name: first_name_last_name,
        nickname: nickname,
        pin: "",
        school_name: canonicalSchoolName,
        created_at: new Date().toISOString(),
        codes_collected_count: 0,
        is_complete: false,
        completed_at: "",
        reward_issued: false,
        status: "active"
      });

      return this.success({
        message: "Zarejestrowano pomyslnie",
        participant_id: participant_id,
        nickname: nickname
      });
    } catch (error) {
      return this.error("Rejestracja chwilowo niedostepna. Sprobuj ponownie.");
    } finally {
      if (lock.hasLock()) {
        lock.releaseLock();
      }
    }
  },

  setUserPin(payload) {
    const safePayload = payload || {};
    const participant_id = String(safePayload.participant_id ?? "").trim();
    const pin = this.normalizePin(safePayload.pin);

    if (!participant_id) {
      return this.error("Brak ID uczestnika.");
    }

    if (!this.isParticipantPinValid(pin)) {
      return this.error("PIN musi miec dokladnie 4 cyfry.", "INVALID_PIN_FORMAT");
    }

    const participants = DB.getRowsAsObjects("Uczestnicy");
    const participant = participants.find((p) => String(p.participant_id) === participant_id);

    if (!participant) {
      return this.error("Nie znaleziono uczestnika.");
    }

    DB.updateRow("Uczestnicy", participant._rowIndex, { pin: pin });

    return this.success({
      message: "PIN ustawiony poprawnie.",
      participant_id: participant.participant_id,
      nickname: participant.nickname
    });
  },

  loginUser(payload) {
    const safePayload = payload || {};
    const nickname = this.normalizeNickname(safePayload.nickname);
    const pin = this.normalizePin(safePayload.pin);

    if (!nickname || !pin) {
      return this.error("Podaj nick i PIN.", "INVALID_CREDENTIALS");
    }

    if (!this.isParticipantPinValid(pin)) {
      return this.error("PIN musi miec dokladnie 4 cyfry.", "INVALID_PIN_FORMAT");
    }

    const participants = DB.getRowsAsObjects("Uczestnicy");
    const participant = participants.find((p) => this.normalizeNickname(p.nickname) === nickname);

    if (!participant) {
      return this.error("Nieprawidlowy nick lub PIN.", "INVALID_CREDENTIALS");
    }

    const storedPin = this.normalizePin(participant.pin);
    if (!storedPin) {
      return this.error(
        "To konto nie ma jeszcze ustawionego PIN-u. Skontaktuj sie z administratorem.",
        "PIN_NOT_SET"
      );
    }

    if (storedPin !== pin) {
      return this.error("Nieprawidlowy nick lub PIN.", "INVALID_CREDENTIALS");
    }

    return this.success({
      message: "Zalogowano pomyslnie.",
      participant_id: participant.participant_id,
      nickname: participant.nickname
    });
  },

  // Pobieranie profilu Uczestnika (i wymagan do kompletu)
  getParticipantProfile(participant_id) {
    if (!participant_id) return this.error("Brak ID uczestnika");

    const participants = DB.getRowsAsObjects("Uczestnicy");
    const participant = participants.find((p) => p.participant_id === participant_id);

    if (!participant) return this.error("Nie znaleziono uczestnika");

    const required_count = parseInt(DB.getSetting("required_codes_count")) || 15;

    return this.success({
      participant: participant,
      required_codes_count: required_count
    });
  },

  // M2: Stanowiska / Skanowanie
  getStations() {
    const stations = DB.getRowsAsObjects("Stanowiska");
    return this.success({ stations: stations });
  },

  // Logika glownego skanowania kodu QR
  scanCode(payload) {
    const participant_id = payload.participant_id;
    const station_code = payload.station_code;

    if (!participant_id || !station_code) return this.error("Brakujace dane do skanowania.");

    const participants = DB.getRowsAsObjects("Uczestnicy");
    const participant = participants.find((p) => p.participant_id === participant_id);
    if (!participant) return this.error("Uczestnik nie istnieje, zaloguj sie ponownie.");
    if (participant.is_complete === true) return this.error("Masz juz zdobyty komplet! Trwa weryfikacja do nagrody.");

    const stations = DB.getRowsAsObjects("Stanowiska");
    const station = stations.find((s) => s.station_code === station_code);
    if (!station) return this.error("Kod nieprawidlowy, to stanowisko nie istnieje.");
    if (station.is_active !== true && station.is_active !== "TRUE") return this.error("Stanowisko jest obecnie wylaczone.");

    const scans = DB.getRowsAsObjects("Skanowania");
    const alreadyScanned = scans.find((s) => s.participant_id === participant_id && s.station_code === station_code);

    let scanResultStatus = "ok";
    let message = "Zaliczono stanowisko: " + station.station_name;

    if (alreadyScanned) {
      scanResultStatus = "duplicate";
      message = "Uwaga: To stanowisko masz juz zaliczone!";

      DB.insertRow("Skanowania", {
        scan_id: "S_" + new Date().getTime(),
        timestamp: new Date().toISOString(),
        participant_id: participant_id,
        nickname: participant.nickname,
        station_code: station_code,
        station_name: station.station_name,
        scan_result: scanResultStatus
      });
      return this.success({ message: message });
    }

    DB.insertRow("Skanowania", {
      scan_id: "S_" + new Date().getTime(),
      timestamp: new Date().toISOString(),
      participant_id: participant_id,
      nickname: participant.nickname,
      station_code: station_code,
      station_name: station.station_name,
      scan_result: "ok"
    });

    let newCount = parseInt(participant.codes_collected_count) || 0;
    newCount += 1;

    const required_count = parseInt(DB.getSetting("required_codes_count")) || 15;
    const isComplete = newCount >= required_count;

    DB.updateRow("Uczestnicy", participant._rowIndex, {
      codes_collected_count: newCount,
      is_complete: isComplete,
      completed_at: isComplete ? new Date().toISOString() : ""
    });

    let extraMessage = "";
    if (isComplete) {
      extraMessage = DB.getSetting("completion_message") || "MAMY KOMPLET!";
    }

    return this.success({
      message: message,
      extra_message: extraMessage,
      is_complete: isComplete,
      codes_collected_count: newCount,
      required_codes_count: required_count
    });
  },

  // Statystyki do dashboardu / admina
  getStats() {
    const participants = DB.getRowsAsObjects("Uczestnicy");
    const stations = DB.getRowsAsObjects("Stanowiska");
    const scans = DB.getRowsAsObjects("Skanowania");

    const completed = participants.filter((p) => p.is_complete === true || p.is_complete === "TRUE").length;
    const activeStations = stations.filter((s) => s.is_active === true || s.is_active === "TRUE").length;

    return this.success({
      participants_count: participants.length,
      completed_count: completed,
      total_scans: scans.length,
      active_stations: activeStations
    });
  },

  // M6: Panel administratora - pobieranie pelnych tabel i statystyk
  getAdminData(pin) {
    if (!this.isAdminPinValid(pin)) return this.error("Nieprawidlowy kod PIN administratora.");

    const participants = DB.getRowsAsObjects("Uczestnicy");
    const stations = DB.getRowsAsObjects("Stanowiska");
    const scans = DB.getRowsAsObjects("Skanowania");

    participants.reverse();

    return this.success({
      participants: participants,
      stations: stations,
      stats: {
        total_participants: participants.length,
        completed_participants: participants.filter((p) => p.is_complete === true || p.is_complete === "TRUE").length,
        total_stations: stations.length,
        total_scans: scans.length
      }
    });
  },

  // Oznaczenie, ze nagroda za komplet zostala fizycznie wydana
  issueReward(payload) {
    const pin = payload.pin;
    const participant_id = payload.participant_id;

    if (!this.isAdminPinValid(pin)) return this.error("Odmowa dostepu");
    if (!participant_id) return this.error("Brakujace ID do nagrody");

    const participants = DB.getRowsAsObjects("Uczestnicy");
    const participant = participants.find((p) => p.participant_id === participant_id);

    if (!participant) return this.error("Uczen nie istnieje.");
    if (participant.is_complete !== true && participant.is_complete !== "TRUE") {
      return this.error("Temu graczowi fizycznie brakuje punktow do kompletu!");
    }

    DB.updateRow("Uczestnicy", participant._rowIndex, { reward_issued: true });

    return this.success({ message: "Oznaczono wydanie nagrody dla gracza: " + participant.nickname });
  }
};
