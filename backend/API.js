/**
 * API.js - Logika biznesowa i kontrolery (wg Modułów Projektu)
 */

const API = {
  // Zwraca odpowiedź w spójnym formacie
  success(data) {
    return { status: "success", data: data };
  },
  
  error(message) {
    return { status: "error", message: message };
  },

  /** M1: Rejestracja Uczestnika */
  registerParticipant(payload) {
    const { first_name_last_name, nickname, school_name } = payload;
    
    // Walidacje
    if (!nickname || !first_name_last_name || !school_name) {
      return this.error("Wszystkie pola są wymagane");
    }

    // Prosta identyfikacja (unikaj duplikatów nicków dla uproszczenia, w skrajnym wypadku doczep UID)
    const participants = DB.getRowsAsObjects("Uczestnicy");
    const exists = participants.find(p => p.nickname === nickname && p.school_name === school_name);
    
    if (exists) {
        return this.error("Podobne konto z takim samym Nickiem w tej szkole już istnieje. Wybierz inny.");
    }

    const participant_id = "U_" + new Date().getTime() + "_" + Math.floor(Math.random()*1000);

    DB.insertRow("Uczestnicy", {
      participant_id: participant_id,
      first_name_last_name: first_name_last_name,
      nickname: nickname,
      school_name: school_name,
      created_at: new Date().toISOString(),
      codes_collected_count: 0,
      is_complete: false,
      completed_at: "",
      reward_issued: false,
      status: "active"
    });

    return this.success({
      message: "Zarejestrowano pomyślnie",
      participant_id: participant_id,
      nickname: nickname
    });
  },

  /** Pobieranie profilu Uczestnika (i wymagań do kompletu) */
  getParticipantProfile(participant_id) {
    if (!participant_id) return this.error("Brak ID Uczestnika");
    
    const participants = DB.getRowsAsObjects("Uczestnicy");
    const participant = participants.find(p => p.participant_id === participant_id);
    
    if (!participant) return this.error("Nie znaleziono uczestnika");
    
    const required_count = parseInt(DB.getSetting("required_codes_count")) || 15;
    
    return this.success({
      participant: participant,
      required_codes_count: required_count,
    });
  },

  /** M2: Stanowiska / Skanowanie */
  getStations() {
     const stations = DB.getRowsAsObjects("Stanowiska");
     // Pokażemy wszystkie aktywne i ich rodzaj
     return this.success({ stations: stations });
  },

  /** Logika głównego skanowania kodu QR */
  scanCode(payload) {
    const { participant_id, station_code } = payload;
    if (!participant_id || !station_code) return this.error("Brakujące dane do skanowania.");

    // 1. Walidacja Uczestnika
    const participants = DB.getRowsAsObjects("Uczestnicy");
    const participant = participants.find(p => p.participant_id === participant_id);
    if (!participant) return this.error("Uczestnik nie istnieje, zaloguj się ponownie.");
    if (participant.is_complete === true) return this.error("Masz już zdobyty komplet! Trwa weryfikacja do nagrody.");

    // 2. Walidacja Stanowiska
    const stations = DB.getRowsAsObjects("Stanowiska");
    const station = stations.find(s => s.station_code === station_code);
    if (!station) return this.error("Kod nieprawidłowy, to stanowisko nie istnieje.");
    if (station.is_active !== true && station.is_active !== "TRUE") return this.error("Stanowisko jest obecnie wyłączone.");

    // 3. Weryfikacja Duplikatów Skana M3
    const scans = DB.getRowsAsObjects("Skanowania");
    const alreadyScanned = scans.find(s => s.participant_id === participant_id && s.station_code === station_code);

    let scanResultStatus = "ok";
    let message = "Zaliczono stanowisko: " + station.station_name;

    if (alreadyScanned) {
      scanResultStatus = "duplicate";
      message = "Uwaga: To stanowisko masz już zaliczone!";
      
      // Zapisujemy log jako duplicate, ale nie przerywamy i nie punktujemy w górę
      DB.insertRow("Skanowania", {
        scan_id: "S_" + new Date().getTime(),
        timestamp: new Date().toISOString(),
        participant_id: participant_id,
        nickname: participant.nickname,
        station_code: station_code,
        station_name: station.station_name,
        scan_result: scanResultStatus
      });
      return this.success({ message: message }); // zwracamy tak, bo to sukces ale bez +1
    }

    // Zaliczenie punktowe - zapis skanu M3
    DB.insertRow("Skanowania", {
      scan_id: "S_" + new Date().getTime(),
      timestamp: new Date().toISOString(),
      participant_id: participant_id,
      nickname: participant.nickname,
      station_code: station_code,
      station_name: station.station_name,
      scan_result: "ok"
    });

    // Aktualizacja rekordu Uczestnika M4
    let newCount = parseInt(participant.codes_collected_count) || 0;
    newCount += 1;
    
    // Sprawdzamy komplet ustawień
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

  /** Statystyki do Dashboardu / Admina */
  getStats() {
    const participants = DB.getRowsAsObjects("Uczestnicy");
    const stations = DB.getRowsAsObjects("Stanowiska");
    const scans = DB.getRowsAsObjects("Skanowania");

    const completed = participants.filter(p => p.is_complete === true || p.is_complete === "TRUE").length;
    const activeStations = stations.filter(s => s.is_active === true || s.is_active === "TRUE").length;

    return this.success({
       participants_count: participants.length,
       completed_count: completed,
       total_scans: scans.length,
       active_stations: activeStations
    });
  },

  /** M6: Panel Administratora - Pobieranie pełnych tabel i statystyk */
  getAdminData(pin) {
    const correctPin = DB.getSetting("admin_pin");
    if (pin !== correctPin) return this.error("Nieprawidłowy kod PIN administratora.");

    const participants = DB.getRowsAsObjects("Uczestnicy");
    const stations = DB.getRowsAsObjects("Stanowiska");
    const scans = DB.getRowsAsObjects("Skanowania");

    // Odwracamy tabele chronologicznie (najnowsze u góry)
    participants.reverse();

    return this.success({
       participants: participants,
       stations: stations,
       stats: {
         total_participants: participants.length,
         completed_participants: participants.filter(p => p.is_complete === true || p.is_complete === "TRUE").length,
         total_stations: stations.length,
         total_scans: scans.length
       }
    });
  },

  /** Oznaczanie, że nagroda za komplet została fizycznie wydana */
  issueReward(payload) {
    const { pin, participant_id } = payload;
    const correctPin = DB.getSetting("admin_pin");
    if (pin !== correctPin) return this.error("Odmowa dostępu");
    
    if (!participant_id) return this.error("Brakujące ID do nagrody");

    const participants = DB.getRowsAsObjects("Uczestnicy");
    const participant = participants.find(p => p.participant_id === participant_id);

    if (!participant) return this.error("Uczeń nie istnieje.");
    if (participant.is_complete !== true && participant.is_complete !== "TRUE") {
       return this.error("Temu graczowi fizycznie brakuje punktów do kompletu!");
    }

    DB.updateRow("Uczestnicy", participant._rowIndex, { reward_issued: true });

    return this.success({ message: "Oznaczono wydanie nagrody dla gracza: " + participant.nickname });
  }
};
