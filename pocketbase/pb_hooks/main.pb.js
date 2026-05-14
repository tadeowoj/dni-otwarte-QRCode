routerAdd("GET", "/api/qr-action", (e) => {
  return e.json(200, { status: "ok", message: "QR Code API dziala poprawnie. Uzyj POST by wykonac akcje." });
});

routerAdd("POST", "/api/qr-action", (e) => {
  const DEFAULT_APP_BASE_URL = "https://qr.zsoiz-czyzew.pl/";
  const QR_TOKEN_LENGTH = 24;
  
  const COLLECTIONS = {
    participants: "participants",
    teachers: "teachers",
    stations: "stations",
    qrCodes: "qr_codes",
    scans: "scans",
    schools: "schools",
    settings: "settings"
  };
  
  var success = function(data) {
    return { status: "success", data };
  }
  
  var error = function(message, error_code) {
    const response = { status: "error", message };
    if (error_code) response.error_code = error_code;
    return response;
  }
  
  var nowIso = function() {
    return new Date().toISOString();
  }
  
  var normalizePin = function(pin) {
    return String(pin == null ? "" : pin).trim();
  }
  
  var normalizeNameOrSchool = function(value) {
    return String(value == null ? "" : value).trim().replace(/\s+/g, " ");
  }
  
  var normalizeNickname = function(value) {
    return String(value == null ? "" : value).trim();
  }
  
  var normalizeStationCode = function(value) {
    return String(value == null ? "" : value).trim();
  }
  
  var normalizeComparableNameOrSchool = function(value) {
    return normalizeNameOrSchool(value).toLowerCase();
  }
  
  var normalizeComparableNickname = function(value) {
    return normalizeNickname(value).toLowerCase();
  }
  
  var isTruthy = function(value) {
    return value === true || value === "TRUE" || value === "true" || value === 1 || value === "1";
  }
  
  var isParticipantPinValid = function(pin) {
    return /^\d{4}$/.test(normalizePin(pin));
  }
  
  var randomSuffix = function() {
    return `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }
  
  var generateRandomToken = function(length) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let token = "";
    for (let i = 0; i < length; i += 1) {
      token += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return token;
  }
  
  var recordValue = function(record, field, fallback) {
    const value = record.get(field);
    if (value === null || value === undefined) return fallback;
    return value;
  }
  
  var recordToObject = function(record, fields) {
    const data = {};
    fields.forEach((field) => {
      data[field] = recordValue(record, field, "");
    });
    return data;
  }
  
  var participantToObject = function(record) {
    return recordToObject(record, [
      "participant_id",
      "first_name_last_name",
      "nickname",
      "pin",
      "school_name",
      "created_at",
      "codes_collected_count",
      "is_complete",
      "completed_at",
      "reward_issued",
      "status",
      "normalized_name",
      "normalized_nickname",
      "normalized_school",
      "in_draw"
    ]);
  }
  
  var teacherToObject = function(record) {
    return recordToObject(record, [
      "teacher_id",
      "first_name_last_name",
      "nickname",
      "pin",
      "is_active",
      "created_at",
      "notes",
      "station_code"
    ]);
  }
  
  var stationToObject = function(record) {
    return recordToObject(record, [
      "station_code",
      "station_name",
      "station_description",
      "station_type",
      "is_active",
      "display_order"
    ]);
  }
  
  var qrCodeToObject = function(record) {
    return recordToObject(record, [
      "qr_id",
      "qr_token",
      "station_code",
      "teacher_id",
      "created_at",
      "is_active"
    ]);
  }
  
  var findFirstByData = function(app, collection, field, value) {
    try {
      return app.findFirstRecordByData(collection, field, value);
    } catch (_) {
      return null;
    }
  }
  
  var findRecordsByFilter = function(app, collection, filter, sort, limit, offset, params) {
    try {
      if (!filter) {
        const records = app.findAllRecords(collection);
        return records.slice(offset || 0, limit ? (offset || 0) + limit : undefined);
      }
      return app.findRecordsByFilter(collection, filter, sort || "", limit || 200, offset || 0, params || {});
    } catch (_) {
      return [];
    }
  }
  
  var getSetting = function(app, key) {
    const record = findFirstByData(app, COLLECTIONS.settings, "key", key);
    return record ? String(record.get("value") == null ? "" : record.get("value")) : null;
  }
  
  var getActiveSchools = function(app) {
    return findRecordsByFilter(app, COLLECTIONS.schools, "", "display_order,school_name", 200, 0)
      .map((record) => ({
        school_name: normalizeNameOrSchool(record.get("school_name")),
        is_active: record.get("is_active"),
        display_order: Number(record.get("display_order") || 0)
      }))
      .filter((school) => school.school_name && isTruthy(school.is_active))
      .sort((a, b) => {
        const orderA = Number.isFinite(a.display_order) ? a.display_order : Number.MAX_SAFE_INTEGER;
        const orderB = Number.isFinite(b.display_order) ? b.display_order : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.school_name.localeCompare(b.school_name);
      })
      .map((school) => ({ school_name: school.school_name }));
  }
  
  var getAllowedSchoolByComparableName = function(app, value) {
    const comparableValue = normalizeComparableNameOrSchool(value);
    const school = getActiveSchools(app).find((item) => normalizeComparableNameOrSchool(item.school_name) === comparableValue);
    return school ? school.school_name : null;
  }
  
  var isAdminPinValid = function(app, pin) {
    const enteredPin = normalizePin(pin);
    const configuredPin = normalizePin(getSetting(app, "admin_pin"));
    return Boolean(enteredPin && configuredPin && enteredPin === configuredPin);
  }
  
  var buildScanUrl = function(app, qrToken) {
    const baseUrl = String(getSetting(app, "app_base_url") || DEFAULT_APP_BASE_URL).trim();
    const safeBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${safeBase}?qr_token=${encodeURIComponent(qrToken)}`;
  }
  
  var getStationByCode = function(app, stationCode) {
    const code = normalizeStationCode(stationCode);
    if (!code) return null;
    return findFirstByData(app, COLLECTIONS.stations, "station_code", code);
  }
  
  var createRecord = function(app, collectionName, data) {
    const collection = app.findCollectionByNameOrId(collectionName);
    const record = new Record(collection);
    Object.keys(data).forEach((key) => record.set(key, data[key]));
    app.save(record);
    return record;
  }
  
  var updateRecord = function(app, record, data) {
    Object.keys(data).forEach((key) => record.set(key, data[key]));
    app.save(record);
    return record;
  }
  
  var registerParticipant = function(app, payload) {
    const safePayload = payload || {};
    const first_name_last_name = normalizeNameOrSchool(safePayload.first_name_last_name);
    const nickname = normalizeNickname(safePayload.nickname);
    const school_name = normalizeNameOrSchool(safePayload.school_name);
  
    if (!nickname || !first_name_last_name || !school_name) {
      return error("Wszystkie pola sa wymagane");
    }
  
    const canonicalSchoolName = getAllowedSchoolByComparableName(app, school_name);
    if (!canonicalSchoolName) {
      return error("Nieprawidlowa szkola. Wybierz szkole z listy.", "INVALID_SCHOOL_NAME");
    }
  
    const normalized_name = normalizeComparableNameOrSchool(first_name_last_name);
    const normalized_nickname = normalizeComparableNickname(nickname);
    const normalized_school = normalizeComparableNameOrSchool(canonicalSchoolName);
  
    let result;
    app.runInTransaction((txApp) => {
      const existing = findRecordsByFilter(
        txApp,
        COLLECTIONS.participants,
        "normalized_name = {:name} && normalized_nickname = {:nickname} && normalized_school = {:school}",
        "",
        1,
        0,
        { name: normalized_name, nickname: normalized_nickname, school: normalized_school }
      )[0];
  
      if (existing) {
        result = error("Takie konto juz istnieje (imie i nazwisko + nick + szkola).", "DUPLICATE_PARTICIPANT");
        return;
      }
  
      const participant_id = `U_${randomSuffix()}`;
      createRecord(txApp, COLLECTIONS.participants, {
        participant_id,
        first_name_last_name,
        nickname,
        pin: "",
        school_name: canonicalSchoolName,
        created_at: nowIso(),
        codes_collected_count: 0,
        is_complete: false,
        reward_issued: false,
        status: "active",
        normalized_name,
        normalized_nickname,
        normalized_school
      });
  
      result = success({ message: "Zarejestrowano pomyslnie", participant_id, nickname });
    });
  
    return result;
  }
  
  var setUserPin = function(app, payload) {
    const safePayload = payload || {};
    const participant_id = String(safePayload.participant_id == null ? "" : safePayload.participant_id).trim();
    const pin = normalizePin(safePayload.pin);
  
    if (!participant_id) return error("Brak ID uczestnika.");
    if (!isParticipantPinValid(pin)) return error("PIN musi miec dokladnie 4 cyfry.", "INVALID_PIN_FORMAT");
  
    const participant = findFirstByData(app, COLLECTIONS.participants, "participant_id", participant_id);
    if (!participant) return error("Nie znaleziono uczestnika.");
  
    updateRecord(app, participant, { pin });
  
    return success({
      message: "PIN ustawiony poprawnie.",
      participant_id: participant.get("participant_id"),
      nickname: participant.get("nickname")
    });
  }
  
  var loginUser = function(app, payload) {
    const safePayload = payload || {};
    const nickname = normalizeNickname(safePayload.nickname);
    const pin = normalizePin(safePayload.pin);
  
    if (!nickname || !pin) return error("Podaj nick i PIN.", "INVALID_CREDENTIALS");
    if (!isParticipantPinValid(pin)) return error("PIN musi miec dokladnie 4 cyfry.", "INVALID_PIN_FORMAT");
  
    const comparableNickname = normalizeComparableNickname(nickname);
    const participantMatches = findRecordsByFilter(app, COLLECTIONS.participants, "normalized_nickname = {:nickname}", "", 10, 0, { nickname: comparableNickname });
    const teacherMatches = findRecordsByFilter(app, COLLECTIONS.teachers, "", "", 200, 0)
      .filter((teacher) => normalizeComparableNickname(teacher.get("nickname")) === comparableNickname);
  
    if (participantMatches.length + teacherMatches.length === 0) {
      return error("Nieprawidlowy nick lub PIN.", "INVALID_CREDENTIALS");
    }
  
    if (participantMatches.length + teacherMatches.length > 1) {
      return error("Ten nick wystepuje wiecej niz raz. Popros administratora o poprawke.", "DUPLICATE_NICKNAME");
    }
  
    if (participantMatches.length === 1) {
      const participant = participantMatches[0];
      const storedPin = normalizePin(participant.get("pin"));
  
      if (!storedPin) return error("To konto nie ma jeszcze ustawionego PIN-u. Skontaktuj sie z administratorem.", "PIN_NOT_SET");
      if (storedPin !== pin) return error("Nieprawidlowy nick lub PIN.", "INVALID_CREDENTIALS");
  
      return success({
        message: "Zalogowano pomyslnie.",
        role: "participant",
        participant_id: participant.get("participant_id"),
        nickname: participant.get("nickname")
      });
    }
  
    const teacher = teacherMatches[0];
    const storedPin = normalizePin(teacher.get("pin"));
  
    if (!storedPin) return error("To konto nauczyciela nie ma ustawionego PIN-u. Skontaktuj sie z administratorem.", "PIN_NOT_SET");
    if (!isTruthy(teacher.get("is_active"))) return error("Konto nauczyciela jest nieaktywne.", "TEACHER_INACTIVE");
    if (storedPin !== pin) return error("Nieprawidlowy nick lub PIN.", "INVALID_CREDENTIALS");
    
    if (isTruthy(teacher.get("is_logged"))) return error("To konto jest aktualnie uzywane na innym urzadzeniu. Wyloguj sie z poprzedniej sesji.", "ALREADY_LOGGED_IN");
  
    const stationCode = normalizeStationCode(teacher.get("station_code"));
    if (!stationCode) return error("To konto nauczyciela nie ma przypisanego stanowiska.", "TEACHER_STATION_NOT_ASSIGNED");
  
    const teachersWithSameStation = findRecordsByFilter(app, COLLECTIONS.teachers, "station_code = {:stationCode}", "", 10, 0, { stationCode });
    if (teachersWithSameStation.length > 1) return error("To stanowisko jest przypisane do wielu nauczycieli.", "TEACHER_STATION_CONFLICT");
  
    const station = getStationByCode(app, stationCode);
    if (!station) return error("Przypisane stanowisko nauczyciela nie istnieje.", "TEACHER_STATION_NOT_FOUND");
    
    updateRecord(app, teacher, { is_logged: true });
  
    return success({
      message: "Zalogowano pomyslnie.",
      role: "teacher",
      teacher_id: teacher.get("teacher_id"),
      nickname: teacher.get("nickname"),
      display_name: teacher.get("first_name_last_name") || teacher.get("nickname"),
      station_code: station.get("station_code"),
      station_name: station.get("station_name")
    });
  }
  
  var getTeacherPanelData = function(app, payload) {
    const teacher_id = String((payload || {}).teacher_id == null ? "" : (payload || {}).teacher_id).trim();
    if (!teacher_id) return error("Brak ID nauczyciela.");
  
    const teacher = findFirstByData(app, COLLECTIONS.teachers, "teacher_id", teacher_id);
    if (!teacher) return error("Nie znaleziono konta nauczyciela.");
    if (!isTruthy(teacher.get("is_active"))) return error("Konto nauczyciela jest nieaktywne.", "TEACHER_INACTIVE");
  
    const stationCode = normalizeStationCode(teacher.get("station_code"));
    if (!stationCode) return error("Brak przypisanego stanowiska do konta nauczyciela.", "TEACHER_STATION_NOT_ASSIGNED");
  
    const teachersWithSameStation = findRecordsByFilter(app, COLLECTIONS.teachers, "station_code = {:stationCode}", "", 10, 0, { stationCode });
    if (teachersWithSameStation.length > 1) return error("To stanowisko jest przypisane do wielu nauczycieli.", "TEACHER_STATION_CONFLICT");
  
    const station = getStationByCode(app, stationCode);
    if (!station) return error("Przypisane stanowisko nauczyciela nie istnieje.", "TEACHER_STATION_NOT_FOUND");
  
    const qr_codes = findRecordsByFilter(app, COLLECTIONS.qrCodes, "teacher_id = {:teacherId} && is_active = true", "-created_at", 1, 0, { teacherId: teacher_id })
      .map((record) => {
        const item = qrCodeToObject(record);
        item.scan_url = buildScanUrl(app, item.qr_token);
        return item;
      });
  
    return success({
      teacher: {
        teacher_id: teacher.get("teacher_id"),
        nickname: teacher.get("nickname"),
        display_name: teacher.get("first_name_last_name") || teacher.get("nickname"),
        station_code: station.get("station_code"),
        station_name: station.get("station_name")
      },
      qr_codes
    });
  }
  
  var generateTeacherQr = function(app, payload) {
    const teacher_id = String((payload || {}).teacher_id == null ? "" : (payload || {}).teacher_id).trim();
    if (!teacher_id) return error("Brak ID nauczyciela.");
  
    let result;
    app.runInTransaction((txApp) => {
      const teacher = findFirstByData(txApp, COLLECTIONS.teachers, "teacher_id", teacher_id);
      if (!teacher) {
        result = error("Nie znaleziono konta nauczyciela.");
        return;
      }
  
      if (!isTruthy(teacher.get("is_active"))) {
        result = error("Konto nauczyciela jest nieaktywne.", "TEACHER_INACTIVE");
        return;
      }
  
      const stationCode = normalizeStationCode(teacher.get("station_code"));
      if (!stationCode) {
        result = error("Brak przypisanego stanowiska do konta nauczyciela.", "TEACHER_STATION_NOT_ASSIGNED");
        return;
      }
  
      const teachersWithSameStation = findRecordsByFilter(txApp, COLLECTIONS.teachers, "station_code = {:stationCode}", "", 10, 0, { stationCode });
      if (teachersWithSameStation.length > 1) {
        result = error("To stanowisko jest przypisane do wielu nauczycieli.", "TEACHER_STATION_CONFLICT");
        return;
      }
  
      const station = getStationByCode(txApp, stationCode);
      if (!station) {
        result = error("Przypisane stanowisko nauczyciela nie istnieje.", "TEACHER_STATION_NOT_FOUND");
        return;
      }
  
      const activeTeacherCodes = findRecordsByFilter(txApp, COLLECTIONS.qrCodes, "teacher_id = {:teacherId} && is_active = true", "-created_at", 20, 0, { teacherId: teacher_id });
      const activeTeacherCode = activeTeacherCodes[0];
  
      if (activeTeacherCode) {
        activeTeacherCodes.slice(1).forEach((oldCode) => updateRecord(txApp, oldCode, { is_active: false }));
        const item = qrCodeToObject(activeTeacherCode);
        item.station_name = station.get("station_name");
        item.scan_url = buildScanUrl(txApp, item.qr_token);
        item.reused_existing = true;
        result = success(item);
        return;
      }
  
      let qrToken = "";
      let attempts = 0;
      do {
        qrToken = generateRandomToken(QR_TOKEN_LENGTH);
        attempts += 1;
      } while (findFirstByData(txApp, COLLECTIONS.qrCodes, "qr_token", qrToken) && attempts < 20);
  
      if (!qrToken || findFirstByData(txApp, COLLECTIONS.qrCodes, "qr_token", qrToken)) {
        result = error("Nie udalo sie wygenerowac unikalnego tokenu QR. Sprobuj ponownie.");
        return;
      }
  
      const qrId = `QR_${randomSuffix()}`;
      const createdAt = nowIso();
      const record = createRecord(txApp, COLLECTIONS.qrCodes, {
        qr_id: qrId,
        qr_token: qrToken,
        station_code: station.get("station_code"),
        teacher_id: teacher.get("teacher_id"),
        created_at: createdAt,
        is_active: true
      });
      const item = qrCodeToObject(record);
  
      item.station_name = station.get("station_name");
      item.scan_url = buildScanUrl(txApp, qrToken);
      item.reused_existing = false;
      result = success(item);
    });
  
    return result;
  }
  
  var getParticipantProfile = function(app, participant_id) {
    if (!participant_id) return error("Brak ID uczestnika");
  
    const participant = findFirstByData(app, COLLECTIONS.participants, "participant_id", participant_id);
    if (!participant) return error("Nie znaleziono uczestnika");
  
    const required_count = parseInt(getSetting(app, "required_codes_count"), 10) || 15;
    const visited_station_codes = Array.from(new Set(
      findRecordsByFilter(
        app,
        COLLECTIONS.scans,
        "participant_id = {:participantId} && scan_result = 'ok'",
        "",
        2000,
        0,
        { participantId: participant_id }
      )
        .map((scan) => normalizeStationCode(scan.get("station_code")))
        .filter(Boolean)
    ));
    return success({
      participant: participantToObject(participant),
      required_codes_count: required_count,
      visited_station_codes
    });
  }
  
  var getStations = function(app) {
    const stations = findRecordsByFilter(app, COLLECTIONS.stations, "", "display_order,station_name", 200, 0)
      .map(stationToObject)
      .sort((a, b) => {
        const orderA = Number(a.display_order) || Number.MAX_SAFE_INTEGER;
        const orderB = Number(b.display_order) || Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return String(a.station_name || "").localeCompare(String(b.station_name || ""));
      });
    return success({ stations });
  }
  
  var getSchools = function(app) {
    return success({ schools: getActiveSchools(app) });
  }
  
  var scanCode = function(app, payload) {
    const safePayload = payload || {};
    const participant_id = String(safePayload.participant_id == null ? "" : safePayload.participant_id).trim();
    const qr_token = String(safePayload.qr_token == null ? "" : safePayload.qr_token).trim();
  
    if (!participant_id || !qr_token) return error("Brakujace dane do skanowania.");
  
    let result;
    app.runInTransaction((txApp) => {
      const participant = findFirstByData(txApp, COLLECTIONS.participants, "participant_id", participant_id);
      if (!participant) {
        result = error("Uczestnik nie istnieje, zaloguj sie ponownie.");
        return;
      }
  
      if (isTruthy(participant.get("is_complete"))) {
        result = error("Masz juz zdobyty komplet! Trwa weryfikacja do nagrody.");
        return;
      }
  
      const qrCodeRecord = findRecordsByFilter(txApp, COLLECTIONS.qrCodes, "qr_token = {:qrToken} && is_active = true", "", 1, 0, { qrToken: qr_token })[0];
      if (!qrCodeRecord) {
        result = error("Kod QR jest nieprawidlowy lub nieaktywny.", "INVALID_QR_TOKEN");
        return;
      }
  
      const activeTeacherCode = findRecordsByFilter(txApp, COLLECTIONS.qrCodes, "teacher_id = {:teacherId} && is_active = true", "-created_at", 1, 0, { teacherId: qrCodeRecord.get("teacher_id") })[0];
      if (!activeTeacherCode || activeTeacherCode.get("qr_id") !== qrCodeRecord.get("qr_id")) {
        result = error("Kod QR jest nieprawidlowy lub nieaktywny.", "INVALID_QR_TOKEN");
        return;
      }
  
      const station_code = normalizeStationCode(qrCodeRecord.get("station_code"));
      if (!station_code) {
        result = error("Kod QR nie ma przypisanego stanowiska.", "QR_STATION_NOT_FOUND");
        return;
      }
  
      const station = getStationByCode(txApp, station_code);
      if (!station) {
        result = error("Kod nieprawidlowy, to stanowisko nie istnieje.");
        return;
      }
  
      if (!isTruthy(station.get("is_active"))) {
        result = error("Stanowisko jest obecnie wylaczone.");
        return;
      }
  
      const alreadyScanned = findRecordsByFilter(txApp, COLLECTIONS.scans, "participant_id = {:participantId} && station_code = {:stationCode} && scan_result = 'ok'", "", 1, 0, { participantId: participant_id, stationCode: station_code })[0];
  
      if (alreadyScanned) {
        createRecord(txApp, COLLECTIONS.scans, {
          scan_id: `S_${randomSuffix()}`,
          timestamp: nowIso(),
          participant_id,
          nickname: participant.get("nickname"),
          station_code,
          station_name: station.get("station_name"),
          scan_result: "duplicate"
        });
        result = success({ message: "Uwaga: To stanowisko masz juz zaliczone!", station_code });
        return;
      }
  
      createRecord(txApp, COLLECTIONS.scans, {
        scan_id: `S_${randomSuffix()}`,
        timestamp: nowIso(),
        participant_id,
        nickname: participant.get("nickname"),
        station_code,
        station_name: station.get("station_name"),
        scan_result: "ok"
      });
  
      const newCount = (parseInt(participant.get("codes_collected_count"), 10) || 0) + 1;
      const required_count = parseInt(getSetting(txApp, "required_codes_count"), 10) || 15;
      const isComplete = newCount >= required_count;
  
      const participantUpdate = {
        codes_collected_count: newCount,
        is_complete: isComplete
      };
      if (isComplete) participantUpdate.completed_at = nowIso();
      updateRecord(txApp, participant, participantUpdate);
  
      updateRecord(txApp, qrCodeRecord, { is_active: false });
  
      result = success({
        message: `Zaliczono stanowisko: ${station.get("station_name")}`,
        extra_message: isComplete ? (getSetting(txApp, "completion_message") || "MAMY KOMPLET!") : "",
        is_complete: isComplete,
        codes_collected_count: newCount,
        required_codes_count: required_count,
        station_code
      });
    });
  
    return result;
  }
  
  var getStats = function(app) {
    const participants = findRecordsByFilter(app, COLLECTIONS.participants, "", "", 1000, 0);
    const stations = findRecordsByFilter(app, COLLECTIONS.stations, "", "", 500, 0);
    const scans = findRecordsByFilter(app, COLLECTIONS.scans, "", "", 2000, 0);
    const leaderPoints = participants.reduce((max, participant) => {
      const points = Number(participant.get("codes_collected_count")) || 0;
      return points > max ? points : max;
    }, 0);
    const collectingParticipantsCount = participants.filter((participant) => {
      return !isTruthy(participant.get("reward_issued")) && !isTruthy(participant.get("is_complete"));
    }).length;
  
    return success({
      participants_count: participants.length,
      collecting_participants_count: collectingParticipantsCount,
      leader_points: leaderPoints,
      completed_count: participants.filter((p) => isTruthy(p.get("is_complete"))).length,
      total_scans: scans.length,
      active_stations: stations.filter((s) => isTruthy(s.get("is_active"))).length
    });
  }
  
  var getAdminData = function(app, pin) {
    if (!isAdminPinValid(app, pin)) return error("Nieprawidlowy kod PIN administratora.");
  
    const required_codes_count = parseInt(getSetting(app, "required_codes_count"), 10) || 15;
  
    const participants = findRecordsByFilter(app, COLLECTIONS.participants, "", "-codes_collected_count,-created_at", 1000, 0)
      .map(participantToObject)
      .sort((a, b) => {
        const countA = Number(a.codes_collected_count) || 0;
        const countB = Number(b.codes_collected_count) || 0;
        const timeA = new Date(a.created_at).getTime() || 0;
        const timeB = new Date(b.created_at).getTime() || 0;
        return countB - countA || timeB - timeA;
      });
    const stations = findRecordsByFilter(app, COLLECTIONS.stations, "", "display_order,station_name", 500, 0)
      .map(stationToObject)
      .sort((a, b) => {
        const orderA = Number(a.display_order) || Number.MAX_SAFE_INTEGER;
        const orderB = Number(b.display_order) || Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return String(a.station_name || "").localeCompare(String(b.station_name || ""));
      });
    const scans = findRecordsByFilter(app, COLLECTIONS.scans, "", "", 2000, 0);
  
    return success({
      participants,
      stations,
      stats: {
        total_participants: participants.length,
        completed_participants: participants.filter(function(p) { return (Number(p.codes_collected_count) || 0) >= required_codes_count; }).length,
        total_stations: stations.length,
        total_scans: scans.length,
        required_codes_count: required_codes_count
      }
    });
  }
  
  var issueReward = function(app, payload) {
    const safePayload = payload || {};
    const pin = safePayload.pin;
    const participant_id = safePayload.participant_id;
  
    if (!isAdminPinValid(app, pin)) return error("Odmowa dostepu");
    if (!participant_id) return error("Brakujace ID do nagrody");
  
    const participant = findFirstByData(app, COLLECTIONS.participants, "participant_id", participant_id);
    if (!participant) return error("Uczen nie istnieje.");
    if (!isTruthy(participant.get("is_complete"))) {
      return error("Temu graczowi fizycznie brakuje punktow do kompletu!");
    }
  
    updateRecord(app, participant, { reward_issued: true });
    return success({ message: `Oznaczono wydanie nagrody dla gracza: ${participant.get("nickname")}` });
  }
  
  var updateDrawParticipants = function(app, payload) {
    const safePayload = payload || {};
    const pin = safePayload.pin;
  
    if (!isAdminPinValid(app, pin)) return error("Odmowa dostepu");
  
    const participant_ids = Array.isArray(safePayload.participant_ids) ? safePayload.participant_ids : [];
    const idSet = new Set(participant_ids.map(function(id) { return String(id).trim(); }).filter(Boolean));
  
    var updatedCount = 0;
    app.runInTransaction(function(txApp) {
      var allParticipants = findRecordsByFilter(txApp, COLLECTIONS.participants, "", "", 1000, 0);
      allParticipants.forEach(function(p) {
        var pid = p.get("participant_id");
        var shouldBeInDraw = idSet.has(pid);
        var currentlyInDraw = isTruthy(p.get("in_draw"));
        if (shouldBeInDraw !== currentlyInDraw) {
          updateRecord(txApp, p, { in_draw: shouldBeInDraw });
          updatedCount += 1;
        }
      });
    });
  
    return success({ message: "Zaktualizowano liste losowania (" + idSet.size + " graczy zaznaczonych, " + updatedCount + " zmienionych)." });
  }
  
  var deleteParticipant = function(app, payload) {
    const safePayload = payload || {};
    const pin = safePayload.pin;
    const participant_id = safePayload.participant_id;
  
    if (!isAdminPinValid(app, pin)) return error("Odmowa dostepu");
    if (!participant_id) return error("Brakujace ID uczestnika.");
  
    const participant = findFirstByData(app, COLLECTIONS.participants, "participant_id", participant_id);
    if (!participant) return error("Nie znaleziono uczestnika.");
  
    let result;
    app.runInTransaction(function(txApp) {
      const scans = findRecordsByFilter(txApp, COLLECTIONS.scans, "participant_id = {:pid}", "", 1000, 0, { pid: participant_id });
      scans.forEach(function(s) { txApp.delete(s); });
      txApp.delete(participant);
      result = success({ message: "Uczestnik systemowy usuniety." });
    });
  
    return result;
  }

  var getLotteryData = function(app, payload) {
    const safePayload = payload || {};
    const pin = safePayload.pin;

    if (!isAdminPinValid(app, pin)) return error("Odmowa dostepu - nieprawidlowy PIN administratora.");

    const finalists = findRecordsByFilter(app, COLLECTIONS.participants, "in_draw = true", "nickname", 500, 0)
      .map((p) => ({
        participant_id: p.get("participant_id"),
        nickname: p.get("nickname"),
        first_name_last_name: p.get("first_name_last_name"),
        school_name: p.get("school_name")
      }));

    return success({
      finalists,
      count: finalists.length
    });
  }

  var drawLotteryWinner = function(app, payload) {
    const safePayload = payload || {};
    const pin = safePayload.pin;

    if (!isAdminPinValid(app, pin)) return error("Odmowa dostepu - nieprawidlowy PIN administratora.");

    var result;
    app.runInTransaction(function(txApp) {
      const candidates = findRecordsByFilter(txApp, COLLECTIONS.participants, "in_draw = true", "", 2000, 0);
      if (!candidates || candidates.length === 0) {
        result = error("Brak uczestnikow na liscie losowania.", "DRAW_POOL_EMPTY");
        return;
      }

      const winnerIndex = Math.floor(Math.random() * candidates.length);
      const winner = candidates[winnerIndex];

      updateRecord(txApp, winner, {
        reward_issued: true,
        in_draw: false
      });

      result = success({
        winner: {
          participant_id: winner.get("participant_id"),
          first_name_last_name: winner.get("first_name_last_name"),
          nickname: winner.get("nickname"),
          school_name: winner.get("school_name")
        }
      });
    });

    return result;
  }

  var getPublicSettings = function(app) {
    const keys = ["ui_logo_url", "ui_color_primary", "ui_color_secondary"];
    const settings = {};
    keys.forEach((key) => {
      settings[key] = getSetting(app, key) || "";
    });
    return success(settings);
  }

  var updateUiSettings = function(app, payload) {
    const safePayload = payload || {};
    const pin = safePayload.pin;

    if (!isAdminPinValid(app, pin)) return error("Odmowa dostepu - nieprawidlowy PIN administratora.");

    const keys = ["ui_logo_url", "ui_color_primary", "ui_color_secondary"];
    let updatedCount = 0;

    app.runInTransaction(function(txApp) {
      keys.forEach((key) => {
        if (typeof safePayload[key] !== "undefined") {
          const val = String(safePayload[key]).trim();
          let record = findFirstByData(txApp, COLLECTIONS.settings, "key", key);
          if (!record) {
            const collection = txApp.findCollectionByNameOrId(COLLECTIONS.settings);
            record = new Record(collection);
            record.set("key", key);
          }
          record.set("value", val);
          txApp.save(record);
          updatedCount++;
        }
      });
    });

    return success({ message: "Zaktualizowano ustawienia wygladu." });
  }

  var logoutTeacher = function(app, payload) {
    const teacher_id = String((payload || {}).teacher_id == null ? "" : (payload || {}).teacher_id).trim();
    if (!teacher_id) return error("Brak ID nauczyciela.");
    
    const teacher = findFirstByData(app, COLLECTIONS.teachers, "teacher_id", teacher_id);
    if (teacher) {
      updateRecord(app, teacher, { is_logged: false });
    }
    
    return success({ message: "Wylogowano pomyslnie z systemu." });
  }
  
  var dispatchAction = function(app, action, payload) {
    switch (action) {
      case "register":
        return registerParticipant(app, payload);
      case "set_user_pin":
        return setUserPin(app, payload);
      case "login_user":
        return loginUser(app, payload);
      case "get_teacher_panel_data":
        return getTeacherPanelData(app, payload);
      case "generate_teacher_qr":
        return generateTeacherQr(app, payload);
      case "get_profile":
        return getParticipantProfile(app, payload && payload.participant_id);
      case "get_stations":
        return getStations(app);
      case "get_schools":
        return getSchools(app);
      case "scan_code":
        return scanCode(app, payload);
      case "get_stats":
        return getStats(app);
      case "get_admin_data":
        return getAdminData(app, payload && payload.pin);
      case "issue_reward":
        return issueReward(app, payload);
      case "update_draw_participants":
        return updateDrawParticipants(app, payload);
      case "delete_participant":
        return deleteParticipant(app, payload);
      case "get_lottery_data":
        return getLotteryData(app, payload);
      case "draw_lottery_winner":
        return drawLotteryWinner(app, payload);
      case "get_public_settings":
        return getPublicSettings(app);
      case "update_ui_settings":
        return updateUiSettings(app, payload);
      case "logout_teacher":
        return logoutTeacher(app, payload);
      default:
        return error(`Nieznana akcja API: ${action}`);
    }
  }

  let body = {};
  try {
    body = e.requestInfo().body || {};
  } catch (_) {
    return e.json(200, error("Nieprawidlowy format JSON zapytania."));
  }

  try {
    const result = dispatchAction(e.app, body.action, body.payload || {});
    return e.json(200, result);
  } catch (err) {
    console.log(`QR API error: ${err}`);
    return e.json(200, error("Wewnetrzny blad serwera PocketBase."));
  }
});
