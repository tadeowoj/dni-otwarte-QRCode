/**
 * Code.js - Plik wejściowy (Router HTTP) dla Google Apps Script
 */

/**
 * Funkcja doGet - obsługuje wejście bezpośrednie z przeglądarki.
 * W naszym projekcie Frontend i Backend są rozłączone, więc doGet
 * może zwracać prostą informację.
 */
function doGet(e) {
  const output = JSON.stringify({
    status: "ok",
    message: "QR Code API działa poprawnie. Użyj POST by wykonać akcje."
  });
  
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Funkcja doPost - główny router uderzeń po API z naszej aplikacji mobilnej.
 * Czeka na JSON przesłany z fetch() gdzie body wygląda narastająco:
 * { action: "NAZWA", payload: { ... } }
 */
function doPost(e) {
  // Ze względu na specyfikę CORS w fetch() dla Apps Script, będziemy oczekiwać, że body (JSON)
  // leci w np. standardowy strumień postData
  let requestData = {};
  
  try {
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else {
      // Przypadek przesłania application/x-www-form-urlencoded
      requestData = { action: e.parameter.action, payload: JSON.parse(e.parameter.payload || "{}") };
    }
  } catch(error) {
    return _buildResponse(API.error("Nieprawidłowy format JSON zapytania."));
  }

  const action = requestData.action;
  const payload = requestData.payload || {};
  let result = {};

  try {
    switch (action) {
      case "register":
        result = API.registerParticipant(payload);
        break;
      case "set_user_pin":
        result = API.setUserPin(payload);
        break;
      case "login_user":
        result = API.loginUser(payload);
        break;
      case "get_teacher_panel_data":
        result = API.getTeacherPanelData(payload);
        break;
      case "generate_teacher_qr":
        result = API.generateTeacherQr(payload);
        break;
      case "get_profile":
        result = API.getParticipantProfile(payload.participant_id);
        break;
      case "get_stations":
        result = API.getStations();
        break;
      case "scan_code":
        result = API.scanCode(payload);
        break;
      case "get_stats":
        result = API.getStats();
        break;
      case "get_admin_data":
        result = API.getAdminData(payload.pin);
        break;
      case "issue_reward":
        result = API.issueReward(payload);
        break;
      default:
        result = API.error("Nieznana akcja API: " + action);
    }
  } catch (err) {
    result = API.error("Wewnętrzny błąd serwera Apps Script: " + err.toString());
  }

  return _buildResponse(result);
}

/**
 * Helper zwracający poprawnie ukształtowany dokument JSON
 */
function _buildResponse(jsonObject) {
  return ContentService.createTextOutput(JSON.stringify(jsonObject))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 
 * Użyteczna funkcja dla Admina tylko z poziomu edytora 
 * w razie czego pozwala np. zainicjować "surowe" ustawienia z konsoli IDE 
 */
function INIT_SHEET_PERMISSIONS() {
  Logger.log("Jeśli to wywołałeś, poprosiło Cię o nadanie uprawnień do konta GMail/Drive - sukces!");
}
