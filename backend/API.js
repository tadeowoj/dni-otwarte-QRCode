/**
 * API.js - Logika biznesowa i kontrolery (wg modulow projektu)
 */

const DEFAULT_APP_BASE_URL = "https://qr.zsoiz-czyzew.pl/";
const QR_TOKEN_LENGTH = 24;

const API = {
  success(data) {
    return { status: "success", data: data };
  },

  error(message, error_code = null) {
    const response = { status: "error", message: message };
    if (error_code) response.error_code = error_code;
    return response;
  },

  normalizePin(pin) {
    return String(pin ?? "").trim();
  },

  normalizeNameOrSchool(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
  },

  normalizeNickname(value) {
    return String(value ?? "").trim();
  },

  normalizeStationCode(value) {
    return String(value ?? "").trim();
  },

  normalizeComparableNameOrSchool(value) {
    return this.normalizeNameOrSchool(value).toLowerCase();
  },

  normalizeComparableNickname(value) {
    return this.normalizeNickname(value).toLowerCase();
  },

  isTruthy(value) {
    return value === true || value === "TRUE" || value === "true" || value === 1 || value === "1";
  },

  getActiveSchools() {
    return DB.getRowsAsObjects("Szkoly")
      .map((school) => ({
        school_name: this.normalizeNameOrSchool(school.school_name),
        is_active: school.is_active,
        display_order: parseInt(school.display_order, 10)
      }))
      .filter((school) => school.school_name && this.isTruthy(school.is_active))
      .sort((a, b) => {
        const orderA = Number.isFinite(a.display_order) ? a.display_order : Number.MAX_SAFE_INTEGER;
        const orderB = Number.isFinite(b.display_order) ? b.display_order : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.school_name.localeCompare(b.school_name);
      })
      .map((school) => ({ school_name: school.school_name }));
  },

  getAllowedSchoolByComparableName(value) {
    const comparableValue = this.normalizeComparableNameOrSchool(value);
    const school = this.getActiveSchools().find((item) => this.normalizeComparableNameOrSchool(item.school_name) === comparableValue);
    return school ? school.school_name : null;
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

  isTeacherActive(teacher) {
    return teacher && this.isTruthy(teacher.is_active);
  },

  isQrCodeActive(qrCode) {
    return qrCode && this.isTruthy(qrCode.is_active);
  },

  buildScanUrl(qrToken) {
    const baseUrl = String(DB.getSetting("app_base_url") || DEFAULT_APP_BASE_URL).trim();
    const safeBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    return `${safeBase}?qr_token=${encodeURIComponent(qrToken)}`;
  },

  generateRandomToken(length = QR_TOKEN_LENGTH) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let token = "";
    for (let i = 0; i < length; i++) {
      token += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return token;
  },

  getStationByCode(stationCode) {
    const code = this.normalizeStationCode(stationCode);
    if (!code) return null;
    const stations = DB.getRowsAsObjects("Stanowiska");
    return stations.find((station) => this.normalizeStationCode(station.station_code) === code) || null;
  },

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
        return this.error("Takie konto juz istnieje (imie i nazwisko + nick + szkola).", "DUPLICATE_PARTICIPANT");
      }

      const participant_id = "U_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);

      DB.insertRow("Uczestnicy", {
        participant_id,
        first_name_last_name,
        nickname,
        pin: "",
        school_name: canonicalSchoolName,
        created_at: new Date().toISOString(),
        codes_collected_count: 0,
        is_complete: false,
        completed_at: "",
        reward_issued: false,
        status: "active"
      });

      return this.success({ message: "Zarejestrowano pomyslnie", participant_id, nickname });
    } catch (error) {
      return this.error("Rejestracja chwilowo niedostepna. Sprobuj ponownie.");
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  },

  setUserPin(payload) {
    const safePayload = payload || {};
    const participant_id = String(safePayload.participant_id ?? "").trim();
    const pin = this.normalizePin(safePayload.pin);

    if (!participant_id) return this.error("Brak ID uczestnika.");
    if (!this.isParticipantPinValid(pin)) return this.error("PIN musi miec dokladnie 4 cyfry.", "INVALID_PIN_FORMAT");

    const participants = DB.getRowsAsObjects("Uczestnicy");
    const participant = participants.find((p) => String(p.participant_id) === participant_id);
    if (!participant) return this.error("Nie znaleziono uczestnika.");

    DB.updateRow("Uczestnicy", participant._rowIndex, { pin });

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

    if (!nickname || !pin) return this.error("Podaj nick i PIN.", "INVALID_CREDENTIALS");
    if (!this.isParticipantPinValid(pin)) return this.error("PIN musi miec dokladnie 4 cyfry.", "INVALID_PIN_FORMAT");

    const comparableNickname = this.normalizeComparableNickname(nickname);
    const participants = DB.getRowsAsObjects("Uczestnicy");
    const teachers = DB.getRowsAsObjects("Nauczyciele");
    const stations = DB.getRowsAsObjects("Stanowiska");

    const participantMatches = participants.filter((p) => this.normalizeComparableNickname(p.nickname) === comparableNickname);
    const teacherMatches = teachers.filter((t) => this.normalizeComparableNickname(t.nickname) === comparableNickname);

    if (participantMatches.length + teacherMatches.length === 0) {
      return this.error("Nieprawidlowy nick lub PIN.", "INVALID_CREDENTIALS");
    }

    if (participantMatches.length + teacherMatches.length > 1) {
      return this.error("Ten nick wystepuje wiecej niz raz. Popros administratora o poprawke.", "DUPLICATE_NICKNAME");
    }

    if (participantMatches.length === 1) {
      const participant = participantMatches[0];
      const storedPin = this.normalizePin(participant.pin);

      if (!storedPin) {
        return this.error("To konto nie ma jeszcze ustawionego PIN-u. Skontaktuj sie z administratorem.", "PIN_NOT_SET");
      }

      if (storedPin !== pin) {
        return this.error("Nieprawidlowy nick lub PIN.", "INVALID_CREDENTIALS");
      }

      return this.success({
        message: "Zalogowano pomyslnie.",
        role: "participant",
        participant_id: participant.participant_id,
        nickname: participant.nickname
      });
    }

    const teacher = teacherMatches[0];
    const storedPin = this.normalizePin(teacher.pin);

    if (!storedPin) {
      return this.error("To konto nauczyciela nie ma ustawionego PIN-u. Skontaktuj sie z administratorem.", "PIN_NOT_SET");
    }

    if (!this.isTeacherActive(teacher)) {
      return this.error("Konto nauczyciela jest nieaktywne.", "TEACHER_INACTIVE");
    }

    if (storedPin !== pin) {
      return this.error("Nieprawidlowy nick lub PIN.", "INVALID_CREDENTIALS");
    }

    const stationCode = this.normalizeStationCode(teacher.station_code);
    if (!stationCode) {
      return this.error("To konto nauczyciela nie ma przypisanego stanowiska.", "TEACHER_STATION_NOT_ASSIGNED");
    }
    const teachersWithSameStation = teachers.filter((item) => this.normalizeStationCode(item.station_code) === stationCode);
    if (teachersWithSameStation.length > 1) {
      return this.error("To stanowisko jest przypisane do wielu nauczycieli.", "TEACHER_STATION_CONFLICT");
    }

    const station = stations.find((item) => this.normalizeStationCode(item.station_code) === stationCode);
    if (!station) {
      return this.error("Przypisane stanowisko nauczyciela nie istnieje.", "TEACHER_STATION_NOT_FOUND");
    }

    return this.success({
      message: "Zalogowano pomyslnie.",
      role: "teacher",
      teacher_id: teacher.teacher_id,
      nickname: teacher.nickname,
      display_name: teacher.first_name_last_name || teacher.nickname,
      station_code: station.station_code,
      station_name: station.station_name
    });
  },

  getTeacherPanelData(payload) {
    const safePayload = payload || {};
    const teacher_id = String(safePayload.teacher_id ?? "").trim();

    if (!teacher_id) return this.error("Brak ID nauczyciela.");

    const teachers = DB.getRowsAsObjects("Nauczyciele");
    const teacher = teachers.find((item) => String(item.teacher_id) === teacher_id);

    if (!teacher) return this.error("Nie znaleziono konta nauczyciela.");
    if (!this.isTeacherActive(teacher)) return this.error("Konto nauczyciela jest nieaktywne.", "TEACHER_INACTIVE");

    const stationCode = this.normalizeStationCode(teacher.station_code);
    if (!stationCode) return this.error("Brak przypisanego stanowiska do konta nauczyciela.", "TEACHER_STATION_NOT_ASSIGNED");
    const teachersWithSameStation = teachers.filter((item) => this.normalizeStationCode(item.station_code) === stationCode);
    if (teachersWithSameStation.length > 1) return this.error("To stanowisko jest przypisane do wielu nauczycieli.", "TEACHER_STATION_CONFLICT");

    const station = this.getStationByCode(stationCode);
    if (!station) return this.error("Przypisane stanowisko nauczyciela nie istnieje.", "TEACHER_STATION_NOT_FOUND");

    const qrCodes = DB.getRowsAsObjects("KodyQR")
      .filter((row) => String(row.teacher_id) === teacher_id && this.isQrCodeActive(row))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 1)
      .map((row) => ({
        qr_id: row.qr_id,
        qr_token: row.qr_token,
        station_code: row.station_code,
        created_at: row.created_at,
        is_active: row.is_active,
        scan_url: this.buildScanUrl(row.qr_token)
      }));

    return this.success({
      teacher: {
        teacher_id: teacher.teacher_id,
        nickname: teacher.nickname,
        display_name: teacher.first_name_last_name || teacher.nickname,
        station_code: station.station_code,
        station_name: station.station_name
      },
      qr_codes: qrCodes
    });
  },

  generateTeacherQr(payload) {
    const safePayload = payload || {};
    const teacher_id = String(safePayload.teacher_id ?? "").trim();

    if (!teacher_id) return this.error("Brak ID nauczyciela.");

    const teachers = DB.getRowsAsObjects("Nauczyciele");
    const teacher = teachers.find((item) => String(item.teacher_id) === teacher_id);

    if (!teacher) return this.error("Nie znaleziono konta nauczyciela.");
    if (!this.isTeacherActive(teacher)) return this.error("Konto nauczyciela jest nieaktywne.", "TEACHER_INACTIVE");

    const stationCode = this.normalizeStationCode(teacher.station_code);
    if (!stationCode) return this.error("Brak przypisanego stanowiska do konta nauczyciela.", "TEACHER_STATION_NOT_ASSIGNED");
    const teachersWithSameStation = teachers.filter((item) => this.normalizeStationCode(item.station_code) === stationCode);
    if (teachersWithSameStation.length > 1) return this.error("To stanowisko jest przypisane do wielu nauczycieli.", "TEACHER_STATION_CONFLICT");

    const station = this.getStationByCode(stationCode);
    if (!station) return this.error("Przypisane stanowisko nauczyciela nie istnieje.", "TEACHER_STATION_NOT_FOUND");

    const lock = LockService.getScriptLock();

    try {
      lock.waitLock(10000);

      let qrToken = "";
      let attempts = 0;
      const existingCodes = DB.getRowsAsObjects("KodyQR");
      const activeTeacherCodes = existingCodes
        .filter((item) => String(item.teacher_id) === teacher_id && this.isQrCodeActive(item))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      const activeTeacherCode = activeTeacherCodes[0];

      if (activeTeacherCode) {
        activeTeacherCodes.slice(1).forEach((oldCode) => {
          DB.updateRow("KodyQR", oldCode._rowIndex, { is_active: false });
        });

        return this.success({
          qr_id: activeTeacherCode.qr_id,
          qr_token: activeTeacherCode.qr_token,
          station_code: activeTeacherCode.station_code,
          station_name: station.station_name,
          created_at: activeTeacherCode.created_at,
          is_active: activeTeacherCode.is_active,
          scan_url: this.buildScanUrl(activeTeacherCode.qr_token),
          reused_existing: true
        });
      }

      do {
        qrToken = this.generateRandomToken();
        attempts += 1;
      } while (existingCodes.some((item) => String(item.qr_token) === qrToken) && attempts < 20);

      if (!qrToken || existingCodes.some((item) => String(item.qr_token) === qrToken)) {
        return this.error("Nie udalo sie wygenerowac unikalnego tokenu QR. Sprobuj ponownie.");
      }

      const qrId = "QR_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
      const createdAt = new Date().toISOString();

      DB.insertRow("KodyQR", {
        qr_id: qrId,
        qr_token: qrToken,
        station_code: station.station_code,
        teacher_id: teacher.teacher_id,
        created_at: createdAt,
        is_active: true
      });

      return this.success({
        qr_id: qrId,
        qr_token: qrToken,
        station_code: station.station_code,
        station_name: station.station_name,
        created_at: createdAt,
        is_active: true,
        scan_url: this.buildScanUrl(qrToken),
        reused_existing: false
      });
    } catch (error) {
      return this.error("Generowanie kodu QR chwilowo niedostepne. Sprobuj ponownie.");
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  },

  getParticipantProfile(participant_id) {
    if (!participant_id) return this.error("Brak ID uczestnika");

    const participants = DB.getRowsAsObjects("Uczestnicy");
    const participant = participants.find((p) => p.participant_id === participant_id);

    if (!participant) return this.error("Nie znaleziono uczestnika");

    const required_count = parseInt(DB.getSetting("required_codes_count"), 10) || 15;

    return this.success({ participant, required_codes_count: required_count });
  },

  getStations() {
    const stations = DB.getRowsAsObjects("Stanowiska");
    return this.success({ stations });
  },

  getSchools() {
    return this.success({ schools: this.getActiveSchools() });
  },

  scanCode(payload) {
    const safePayload = payload || {};
    const participant_id = String(safePayload.participant_id ?? "").trim();
    const qr_token = String(safePayload.qr_token ?? "").trim();

    if (!participant_id || !qr_token) return this.error("Brakujace dane do skanowania.");

    const lock = LockService.getScriptLock();

    try {
      lock.waitLock(10000);

      const participants = DB.getRowsAsObjects("Uczestnicy");
      const participant = participants.find((p) => p.participant_id === participant_id);
      if (!participant) return this.error("Uczestnik nie istnieje, zaloguj sie ponownie.");
      if (participant.is_complete === true || participant.is_complete === "TRUE") {
        return this.error("Masz juz zdobyty komplet! Trwa weryfikacja do nagrody.");
      }

      const qrCodes = DB.getRowsAsObjects("KodyQR");
      const qrCodeRecord = qrCodes.find((row) => String(row.qr_token) === qr_token && this.isQrCodeActive(row));
      if (!qrCodeRecord) return this.error("Kod QR jest nieprawidlowy lub nieaktywny.", "INVALID_QR_TOKEN");

      const activeTeacherCode = qrCodes
        .filter((row) => String(row.teacher_id) === String(qrCodeRecord.teacher_id) && this.isQrCodeActive(row))
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
      if (!activeTeacherCode || String(activeTeacherCode.qr_id) !== String(qrCodeRecord.qr_id)) {
        return this.error("Kod QR jest nieprawidlowy lub nieaktywny.", "INVALID_QR_TOKEN");
      }

      const station_code = this.normalizeStationCode(qrCodeRecord.station_code);
      if (!station_code) return this.error("Kod QR nie ma przypisanego stanowiska.", "QR_STATION_NOT_FOUND");

      const stations = DB.getRowsAsObjects("Stanowiska");
      const station = stations.find((s) => this.normalizeStationCode(s.station_code) === station_code);
      if (!station) return this.error("Kod nieprawidlowy, to stanowisko nie istnieje.");
      if (station.is_active !== true && station.is_active !== "TRUE") return this.error("Stanowisko jest obecnie wylaczone.");

      const scans = DB.getRowsAsObjects("Skanowania");
      const alreadyScanned = scans.find((s) => s.participant_id === participant_id && this.normalizeStationCode(s.station_code) === station_code);

      const message = "Zaliczono stanowisko: " + station.station_name;

      if (alreadyScanned) {
        DB.insertRow("Skanowania", {
          scan_id: "S_" + new Date().getTime(),
          timestamp: new Date().toISOString(),
          participant_id,
          nickname: participant.nickname,
          station_code,
          station_name: station.station_name,
          scan_result: "duplicate"
        });
        return this.success({ message: "Uwaga: To stanowisko masz juz zaliczone!", station_code });
      }

      DB.insertRow("Skanowania", {
        scan_id: "S_" + new Date().getTime(),
        timestamp: new Date().toISOString(),
        participant_id,
        nickname: participant.nickname,
        station_code,
        station_name: station.station_name,
        scan_result: "ok"
      });

      let newCount = parseInt(participant.codes_collected_count, 10) || 0;
      newCount += 1;

      const required_count = parseInt(DB.getSetting("required_codes_count"), 10) || 15;
      const isComplete = newCount >= required_count;

      DB.updateRow("Uczestnicy", participant._rowIndex, {
        codes_collected_count: newCount,
        is_complete: isComplete,
        completed_at: isComplete ? new Date().toISOString() : ""
      });

      DB.updateRow("KodyQR", qrCodeRecord._rowIndex, {
        is_active: false
      });

      let extraMessage = "";
      if (isComplete) {
        extraMessage = DB.getSetting("completion_message") || "MAMY KOMPLET!";
      }

      return this.success({
        message,
        extra_message: extraMessage,
        is_complete: isComplete,
        codes_collected_count: newCount,
        required_codes_count: required_count,
        station_code
      });
    } catch (error) {
      return this.error("Skanowanie chwilowo niedostepne. Sprobuj ponownie.");
    } finally {
      if (lock.hasLock()) lock.releaseLock();
    }
  },

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

  getAdminData(pin) {
    if (!this.isAdminPinValid(pin)) return this.error("Nieprawidlowy kod PIN administratora.");

    const participants = DB.getRowsAsObjects("Uczestnicy");
    const stations = DB.getRowsAsObjects("Stanowiska");
    const scans = DB.getRowsAsObjects("Skanowania");

    const getCodesCount = (participant) => {
      const count = Number(participant.codes_collected_count);
      return Number.isFinite(count) ? count : 0;
    };
    const getCreatedTime = (participant) => {
      const timestamp = new Date(participant.created_at).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    };

    participants.sort((a, b) => {
      return getCodesCount(b) - getCodesCount(a) || getCreatedTime(b) - getCreatedTime(a);
    });

    return this.success({
      participants,
      stations,
      stats: {
        total_participants: participants.length,
        completed_participants: participants.filter((p) => p.is_complete === true || p.is_complete === "TRUE").length,
        total_stations: stations.length,
        total_scans: scans.length
      }
    });
  },

  issueReward(payload) {
    const safePayload = payload || {};
    const pin = safePayload.pin;
    const participant_id = safePayload.participant_id;

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
