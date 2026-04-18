import QRCode from "qrcode";

// =========================================================================
// KONFIGURACJA & ZMIENNE GLOBALNE
// =========================================================================
const API_URL = "https://pocketbase.zsoiz-czyzew.pl/api/qr-action";
const PARTICIPANT_PIN_REGEX = /^\d{4}$/;
const TEACHER_PANEL_POLL_INTERVAL_MS = 1500;
const PARTICIPANT_STATS_POLL_INTERVAL_MS = 5000;
const STATION_EMOJI_POOL = ["🎯", "🚀", "🧠", "🛠️", "🔬", "🧩", "⚡", "🎨", "📚", "🏁", "🎮", "🛰️", "🌟", "🧪", "🧭", "🎬"];
const PARTICIPANT_VISITED_STATIONS_STORAGE_KEY = "qr_participant_visited_station_codes";

const queryParams = new URLSearchParams(window.location.search);

const STATE = {
  userId: localStorage.getItem("qr_user_id") || localStorage.getItem("qr_participant_id") || null,
  userRole: localStorage.getItem("qr_user_role") || (localStorage.getItem("qr_participant_id") ? "participant" : null),
  nickname: localStorage.getItem("qr_nickname") || null,
  teacherDisplayName: localStorage.getItem("qr_teacher_display_name") || null,
  teacherStationCode: localStorage.getItem("qr_teacher_station_code") || null,
  teacherStationName: localStorage.getItem("qr_teacher_station_name") || null,
  stations: [],
  pendingScanToken: queryParams.get("qr_token"),
  pendingLegacyCode: queryParams.get("code"),
  pendingRegistration: null,
  schoolsLoaded: false,
  teacherCodes: [],
  teacherPollTimer: null,
  teacherPollInFlight: false,
  participantStatsPollTimer: null,
  participantStatsPollInFlight: false,
  participantStats: null,
  visitedStationCodes: []
};

// =========================================================================
// SYSTEM WIDOKOW I INTERFEJSU
// =========================================================================
const views = {
  loader: document.getElementById("view-loader"),
  register: document.getElementById("view-register"),
  teacher: document.getElementById("view-teacher"),
  dashboard: document.getElementById("view-dashboard"),
  scanResult: document.getElementById("view-scan-result"),
  complete: document.getElementById("view-complete")
};

const pinModal = document.getElementById("pin-modal");
const helpModal = document.getElementById("help-modal");
const helpContent = document.getElementById("help-content");
const helpButton = document.getElementById("btn-help");
const closeHelpButton = document.getElementById("btn-close-help");
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
let helpInstructionsLoaded = false;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, "<code>$1</code>");
  return html;
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let inUl = false;
  let inOl = false;
  let inTable = false;

  function closeLists() {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  }

  function closeTable() {
    if (inTable) {
      html.push("</tbody></table>");
      inTable = false;
    }
  }

  function isTableLine(line) {
    return /^\s*\|.*\|\s*$/.test(line);
  }

  function isTableSeparator(line) {
    return /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(line);
  }

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) {
      closeLists();
      closeTable();
      continue;
    }

    if (line === "---") {
      closeLists();
      closeTable();
      html.push("<hr>");
      continue;
    }

    if (isTableLine(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      closeLists();
      closeTable();
      const headers = line.split("|").slice(1, -1).map((cell) => `<th>${renderInlineMarkdown(cell.trim())}</th>`).join("");
      html.push(`<table><thead><tr>${headers}</tr></thead><tbody>`);
      inTable = true;
      i += 1;
      continue;
    }

    if (inTable && isTableLine(line)) {
      const cells = line.split("|").slice(1, -1).map((cell) => `<td>${renderInlineMarkdown(cell.trim())}</td>`).join("");
      html.push(`<tr>${cells}</tr>`);
      continue;
    }

    closeTable();

    if (/^###\s+/.test(line)) {
      closeLists();
      html.push(`<h3>${renderInlineMarkdown(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }

    if (/^##\s+/.test(line)) {
      closeLists();
      html.push(`<h2>${renderInlineMarkdown(line.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }

    if (/^#\s+/.test(line)) {
      closeLists();
      html.push(`<h1>${renderInlineMarkdown(line.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      if (!inOl) {
        closeLists();
        html.push("<ol>");
        inOl = true;
      }
      html.push(`<li>${renderInlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }

    if (/^- \[[ xX]\]\s+/.test(line)) {
      if (!inUl) {
        closeLists();
        html.push("<ul>");
        inUl = true;
      }
      const checked = /^- \[[xX]\]\s+/.test(line) ? "checked" : "";
      const content = line.replace(/^- \[[ xX]\]\s+/, "");
      html.push(`<li class="task-item"><input type="checkbox" disabled ${checked}> <span>${renderInlineMarkdown(content)}</span></li>`);
      continue;
    }

    if (/^- /.test(line)) {
      if (!inUl) {
        closeLists();
        html.push("<ul>");
        inUl = true;
      }
      html.push(`<li>${renderInlineMarkdown(line.replace(/^- /, ""))}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  closeLists();
  closeTable();
  return html.join("");
}

function normalizeStationCodeValue(value) {
  return String(value == null ? "" : value).trim();
}

function normalizeStationCodeList(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(normalizeStationCodeValue).filter(Boolean)));
}

function getVisitedStationStorageSnapshot() {
  try {
    const raw = localStorage.getItem(PARTICIPANT_VISITED_STATIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch (_) {
    return {};
  }
}

function loadVisitedStationCodesFromStorage(participantId) {
  const participantKey = normalizeStationCodeValue(participantId);
  if (!participantKey) return [];
  const snapshot = getVisitedStationStorageSnapshot();
  return normalizeStationCodeList(snapshot[participantKey]);
}

function persistVisitedStationCodesForCurrentParticipant() {
  if (STATE.userRole !== "participant" || !STATE.userId) return;
  const participantKey = normalizeStationCodeValue(STATE.userId);
  if (!participantKey) return;
  const snapshot = getVisitedStationStorageSnapshot();
  snapshot[participantKey] = normalizeStationCodeList(STATE.visitedStationCodes);
  localStorage.setItem(PARTICIPANT_VISITED_STATIONS_STORAGE_KEY, JSON.stringify(snapshot));
}

function addVisitedStationCode(stationCode) {
  const normalized = normalizeStationCodeValue(stationCode);
  if (!normalized) return;
  const set = new Set(STATE.visitedStationCodes.map(normalizeStationCodeValue).filter(Boolean));
  if (set.has(normalized)) return;
  set.add(normalized);
  STATE.visitedStationCodes = Array.from(set);
  persistVisitedStationCodesForCurrentParticipant();
}

function hideAllViews() {
  Object.values(views).forEach((v) => {
    v.classList.remove("active");
    v.classList.add("hidden");
  });
}

function showView(viewName) {
  if (viewName !== "teacher") stopTeacherPanelPolling();
  if (viewName !== "dashboard") stopParticipantStatsPolling();
  hideAllViews();
  if (views[viewName]) {
    views[viewName].classList.remove("hidden");
    views[viewName].classList.add("active");
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.innerText = message;
  toast.className = `toast show ${isError ? "error" : ""}`;
  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

function openPinModal() {
  pinModal.classList.add("active");
  pinModal.setAttribute("aria-hidden", "false");
  document.getElementById("pin-create").value = "";
  document.getElementById("pin-confirm").value = "";
  document.getElementById("pin-create").focus();
}

function closePinModal() {
  pinModal.classList.remove("active");
  pinModal.setAttribute("aria-hidden", "true");
}

async function loadHelpInstructions() {
  if (helpInstructionsLoaded) return;
  helpContent.innerHTML = '<p class="help-loading">Ladowanie instrukcji...</p>';

  try {
    const response = await fetch("/INSTRUKCJE.md", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    helpContent.innerHTML = markdownToHtml(text);
    helpInstructionsLoaded = true;
  } catch (error) {
    console.error("Nie udalo sie zaladowac instrukcji:", error);
    helpContent.innerHTML = '<p class="help-loading">Nie udalo sie zaladowac instrukcji. Odswiez strone i sprobuj ponownie.</p>';
  }
}

function openHelpModal() {
  helpModal.classList.add("active");
  helpModal.setAttribute("aria-hidden", "false");
  loadHelpInstructions();
}

function closeHelpModal() {
  helpModal.classList.remove("active");
  helpModal.setAttribute("aria-hidden", "true");
}

function showRegisterForm() {
  registerForm.classList.remove("auth-form-hidden");
  registerForm.classList.add("auth-form-active");
  loginForm.classList.add("auth-form-hidden");
  loginForm.classList.remove("auth-form-active");
}

function showLoginForm() {
  loginForm.classList.remove("auth-form-hidden");
  loginForm.classList.add("auth-form-active");
  registerForm.classList.add("auth-form-hidden");
  registerForm.classList.remove("auth-form-active");
}

// =========================================================================
// KOMUNIKACJA Z API (FETCH)
// =========================================================================
async function fetchAPI(action, payload) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload })
    });
    return await response.json();
  } catch (err) {
    console.error("Blad sieci:", err);
    return { status: "error", message: "Brak stabilnego polaczenia z serwerem." };
  }
}

function setSchoolSelectState(options, disabled = false) {
  const schoolSelect = document.getElementById("reg-school");
  schoolSelect.innerHTML = "";

  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.innerText = item.label;
    option.disabled = Boolean(item.disabled);
    option.selected = Boolean(item.selected);
    schoolSelect.appendChild(option);
  });

  schoolSelect.disabled = disabled;
}

async function loadRegistrationSchools() {
  if (STATE.schoolsLoaded) return true;

  setSchoolSelectState([{ value: "", label: "Wczytywanie szkol...", disabled: true, selected: true }], true);
  const response = await fetchAPI("get_schools", {});
  const schools = response.data && Array.isArray(response.data.schools) ? response.data.schools : [];

  if (response.status !== "success" || schools.length === 0) {
    STATE.schoolsLoaded = false;
    setSchoolSelectState([{ value: "", label: "Nie udalo sie pobrac listy szkol", disabled: true, selected: true }], true);
    return false;
  }

  STATE.schoolsLoaded = true;
  setSchoolSelectState([
    { value: "", label: "Wybierz szkole", disabled: true, selected: true },
    ...schools.map((school) => ({ value: school.school_name, label: school.school_name }))
  ]);
  return true;
}

function startUserSession(role, userId, nickname, extra = {}) {
  STATE.userRole = role;
  STATE.userId = userId;
  STATE.nickname = nickname;
  STATE.teacherDisplayName = extra.displayName || null;
  STATE.teacherStationCode = extra.stationCode || null;
  STATE.teacherStationName = extra.stationName || null;

  localStorage.setItem("qr_user_role", role);
  localStorage.setItem("qr_user_id", userId);
  localStorage.setItem("qr_nickname", nickname);

  if (role === "participant") {
    localStorage.setItem("qr_participant_id", userId);
    localStorage.removeItem("qr_teacher_display_name");
    localStorage.removeItem("qr_teacher_station_code");
    localStorage.removeItem("qr_teacher_station_name");
    STATE.visitedStationCodes = loadVisitedStationCodesFromStorage(userId);
  } else {
    localStorage.removeItem("qr_participant_id");
    localStorage.setItem("qr_teacher_display_name", STATE.teacherDisplayName || "");
    localStorage.setItem("qr_teacher_station_code", STATE.teacherStationCode || "");
    localStorage.setItem("qr_teacher_station_name", STATE.teacherStationName || "");
    STATE.visitedStationCodes = [];
  }
}

function clearSessionStorage() {
  localStorage.removeItem("qr_user_role");
  localStorage.removeItem("qr_user_id");
  localStorage.removeItem("qr_participant_id");
  localStorage.removeItem("qr_nickname");
  localStorage.removeItem("qr_teacher_display_name");
  localStorage.removeItem("qr_teacher_station_code");
  localStorage.removeItem("qr_teacher_station_name");
}

async function logoutUser() {
  const confirmLogout = window.confirm("Na pewno chcesz sie wylogowac?");
  if (!confirmLogout) return;

  stopTeacherPanelPolling();
  stopParticipantStatsPolling();
  clearSessionStorage();
  STATE.userId = null;
  STATE.userRole = null;
  STATE.nickname = null;
  STATE.teacherDisplayName = null;
  STATE.teacherStationCode = null;
  STATE.teacherStationName = null;
  STATE.pendingScanToken = null;
  STATE.participantStats = null;
  STATE.visitedStationCodes = [];

  showRegisterForm();
  const schoolsLoaded = await loadRegistrationSchools();
  if (!schoolsLoaded) {
    showToast("Nie udalo sie pobrac listy szkol. Sprobuj odswiezyc strone.", true);
  }
  showView("register");
  if (schoolsLoaded) showToast("Wylogowano.");
}

// =========================================================================
// INICJALIZACJA I LOGIKA GLOWNA
// =========================================================================
async function initApp() {
  if (STATE.userRole === "participant" && STATE.userId) {
    STATE.visitedStationCodes = loadVisitedStationCodesFromStorage(STATE.userId);
  }

  if (STATE.pendingLegacyCode) {
    showToast("Stare kody ?code=... sa nieobslugiwane. Uzyj nowego QR z tokenem.", true);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (!STATE.userId) {
    showRegisterForm();
    const schoolsLoaded = await loadRegistrationSchools();
    if (!schoolsLoaded) {
      showToast("Nie udalo sie pobrac listy szkol. Sprobuj odswiezyc strone.", true);
    }
    if (STATE.pendingScanToken) {
      showToast("Aby zeskanowac kod, musisz sie najpierw zalogowac lub zarejestrowac.", true);
    }
    showView("register");
    return;
  }

  if (STATE.userRole === "teacher") {
    await loadTeacherPanel();
    return;
  }

  if (STATE.pendingScanToken) {
    await handleScanCode(STATE.pendingScanToken);
    window.history.replaceState({}, document.title, window.location.pathname);
    STATE.pendingScanToken = null;
  } else {
    await loadDashboard();
  }
}

// =========================================================================
// FORMULARZ REJESTRACJI
// =========================================================================
document.getElementById("register-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("reg-name").value.trim();
  const nick = document.getElementById("reg-nick").value.trim();
  const school = document.getElementById("reg-school").value.trim();

  if (!STATE.schoolsLoaded) {
    showToast("Lista szkol nie jest dostepna. Odswiez strone i sprobuj ponownie.", true);
    return;
  }

  if (!name || !nick || !school) {
    showToast("Uzupelnij wszystkie pola, w tym wybor szkoly.", true);
    return;
  }

  const btn = document.getElementById("btn-register");
  btn.innerHTML = "Rejestrowanie...";
  btn.disabled = true;

  const res = await fetchAPI("register", {
    first_name_last_name: name,
    nickname: nick,
    school_name: school
  });

  btn.innerHTML = "Dolacz do gry";
  btn.disabled = false;

  if (res.status === "error") {
    if (res.error_code === "DUPLICATE_PARTICIPANT") {
      showToast(res.message || "Takie konto juz istnieje. Sprawdz dane i sprobuj ponownie.", true);
      const nickInput = document.getElementById("reg-nick");
      nickInput.focus();
      nickInput.select();
      return;
    }
    showToast(res.message, true);
    return;
  }

  STATE.pendingRegistration = {
    participantId: res.data.participant_id,
    nickname: res.data.nickname
  };

  openPinModal();
  showToast("Konto utworzone. Ustaw teraz PIN i lecimy dalej.");
});

document.getElementById("btn-show-login").addEventListener("click", () => {
  showLoginForm();
  document.getElementById("login-nick").focus();
});

document.getElementById("btn-show-register").addEventListener("click", () => {
  showRegisterForm();
  document.getElementById("reg-name").focus();
});

helpButton.addEventListener("click", () => {
  openHelpModal();
});

closeHelpButton.addEventListener("click", () => {
  closeHelpModal();
});

helpModal.addEventListener("click", (event) => {
  if (event.target === helpModal) {
    closeHelpModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && helpModal.classList.contains("active")) {
    closeHelpModal();
  }
});

// =========================================================================
// FORMULARZ LOGOWANIA
// =========================================================================
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nickname = document.getElementById("login-nick").value.trim();
  const pin = document.getElementById("login-pin").value.trim();

  if (!nickname || !pin) {
    showToast("Podaj nick i PIN.", true);
    return;
  }

  if (!PARTICIPANT_PIN_REGEX.test(pin)) {
    showToast("PIN musi miec dokladnie 4 cyfry.", true);
    return;
  }

  const btn = document.getElementById("btn-login-user");
  btn.innerText = "Logowanie...";
  btn.disabled = true;

  const res = await fetchAPI("login_user", { nickname, pin });

  btn.innerText = "Zaloguj";
  btn.disabled = false;

  if (res.status === "error") {
    if (res.error_code === "PIN_NOT_SET") {
      showToast(res.message || "To konto nie ma ustawionego PIN-u. Skontaktuj sie z administratorem.", true);
      return;
    }
    showToast(res.message || "Nieprawidlowy nick lub PIN.", true);
    return;
  }

  const role = res.data.role || "participant";
  const userId = role === "teacher" ? res.data.teacher_id : res.data.participant_id;

  startUserSession(role, userId, res.data.nickname, {
    displayName: res.data.display_name,
    stationCode: res.data.station_code,
    stationName: res.data.station_name
  });

  showToast("Zalogowano pomyslnie!");
  await initApp();
});

// =========================================================================
// MODAL USTAWIANIA PIN
// =========================================================================
document.getElementById("pin-setup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!STATE.pendingRegistration || !STATE.pendingRegistration.participantId) {
    showToast("Brak danych nowego konta. Sprobuj ponownie.", true);
    closePinModal();
    return;
  }

  const pin = document.getElementById("pin-create").value.trim();
  const pinConfirm = document.getElementById("pin-confirm").value.trim();

  if (!PARTICIPANT_PIN_REGEX.test(pin)) {
    showToast("PIN musi miec dokladnie 4 cyfry.", true);
    return;
  }

  if (pin !== pinConfirm) {
    showToast("PIN-y sa rozne. Sprobuj jeszcze raz.", true);
    return;
  }

  const btn = document.getElementById("btn-save-pin");
  btn.innerText = "Zapisywanie...";
  btn.disabled = true;

  const res = await fetchAPI("set_user_pin", {
    participant_id: STATE.pendingRegistration.participantId,
    pin
  });

  btn.innerText = "Zapisz PIN i przejdz dalej";
  btn.disabled = false;

  if (res.status === "error") {
    showToast(res.message || "Nie udalo sie zapisac PIN-u.", true);
    return;
  }

  startUserSession("participant", STATE.pendingRegistration.participantId, STATE.pendingRegistration.nickname);
  STATE.pendingRegistration = null;
  closePinModal();
  showToast("PIN ustawiony. Startujemy!");
  await initApp();
});

// =========================================================================
// PANEL NAUCZYCIELA
// =========================================================================
async function renderTeacherQr(url) {
  const canvas = document.getElementById("teacher-qr-canvas");
  if (!url) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  await QRCode.toCanvas(canvas, url, {
    width: 220,
    margin: 1,
    color: {
      dark: "#1f2937",
      light: "#ffffff"
    }
  });
}

async function renderTeacherCurrentQr(code) {
  const qrPreview = document.querySelector(".teacher-qr-preview");

  if (!code) {
    qrPreview.classList.add("is-empty");
    await renderTeacherQr(null);
    return;
  }

  qrPreview.classList.remove("is-empty");
  await renderTeacherQr(code.scan_url);
}

function updateTeacherQrButton() {
  const btn = document.getElementById("btn-generate-teacher-qr");
  const activeCode = STATE.teacherCodes[0] || null;

  btn.disabled = Boolean(activeCode);
  btn.innerText = activeCode ? "Kod aktywny - czeka na skan" : "Wygeneruj nowy QR";
}

async function applyTeacherPanelData(data, options = {}) {
  const teacher = data.teacher;
  const codes = data.qr_codes || [];
  const previousActiveToken = STATE.teacherCodes[0] ? STATE.teacherCodes[0].qr_token : null;
  const currentActiveToken = codes[0] ? codes[0].qr_token : null;

  STATE.nickname = teacher.nickname;
  STATE.teacherDisplayName = teacher.display_name;
  STATE.teacherStationCode = teacher.station_code;
  STATE.teacherStationName = teacher.station_name;
  STATE.teacherCodes = codes;

  document.getElementById("teacher-nickname").innerText = teacher.display_name || teacher.nickname;
  document.getElementById("teacher-station-name").innerText = teacher.station_name || "-";
  document.getElementById("teacher-station-code").innerText = teacher.station_code || "-";
  document.getElementById("teacher-hero-station-name").innerText = teacher.station_name || "Brak nazwy";

  if (previousActiveToken !== currentActiveToken || options.forceRender) {
    await renderTeacherCurrentQr(codes[0] || null);
  }

  updateTeacherQrButton();

  if (options.notifyConsumed && previousActiveToken && !currentActiveToken) {
    showToast("Kod zeskanowany. Mozesz wygenerowac nastepny.");
  }
}

async function refreshTeacherPanelSilently() {
  if (STATE.teacherPollInFlight || STATE.userRole !== "teacher" || !views.teacher.classList.contains("active")) return;

  STATE.teacherPollInFlight = true;
  try {
    const response = await fetchAPI("get_teacher_panel_data", { teacher_id: STATE.userId });
    if (response.status === "success" && STATE.userRole === "teacher" && views.teacher.classList.contains("active")) {
      await applyTeacherPanelData(response.data, { notifyConsumed: true });
    }
  } finally {
    STATE.teacherPollInFlight = false;
  }
}

function startTeacherPanelPolling() {
  stopTeacherPanelPolling();
  STATE.teacherPollTimer = window.setInterval(refreshTeacherPanelSilently, TEACHER_PANEL_POLL_INTERVAL_MS);
}

function stopTeacherPanelPolling() {
  if (!STATE.teacherPollTimer) return;
  window.clearInterval(STATE.teacherPollTimer);
  STATE.teacherPollTimer = null;
  STATE.teacherPollInFlight = false;
}

function renderParticipantStats(statsData) {
  const leaderPoints = Number(statsData && statsData.leader_points);
  const collectingParticipants = Number(statsData && statsData.collecting_participants_count);

  if (Number.isFinite(leaderPoints)) {
    document.getElementById("dash-leader-points").innerText = String(leaderPoints);
  }

  if (Number.isFinite(collectingParticipants)) {
    document.getElementById("dash-collecting-participants").innerText = String(collectingParticipants);
  }
}

async function refreshParticipantStatsSilently() {
  if (
    STATE.participantStatsPollInFlight ||
    STATE.userRole !== "participant" ||
    !views.dashboard.classList.contains("active")
  ) {
    return;
  }

  STATE.participantStatsPollInFlight = true;
  try {
    const response = await fetchAPI("get_stats", {});
    if (response.status === "success" && STATE.userRole === "participant" && views.dashboard.classList.contains("active")) {
      const statsData = response.data || {};
      const previousStats = STATE.participantStats || {};
      const nextStats = { ...previousStats };
      const leaderPoints = Number(statsData.leader_points);
      const collectingParticipants = Number(statsData.collecting_participants_count);

      if (Number.isFinite(leaderPoints)) {
        nextStats.leader_points = leaderPoints;
      }

      if (Number.isFinite(collectingParticipants)) {
        nextStats.collecting_participants_count = collectingParticipants;
      }

      STATE.participantStats = nextStats;
      renderParticipantStats(STATE.participantStats);
    }
  } finally {
    STATE.participantStatsPollInFlight = false;
  }
}

function startParticipantStatsPolling() {
  stopParticipantStatsPolling();
  STATE.participantStatsPollTimer = window.setInterval(refreshParticipantStatsSilently, PARTICIPANT_STATS_POLL_INTERVAL_MS);
}

function stopParticipantStatsPolling() {
  if (!STATE.participantStatsPollTimer) return;
  window.clearInterval(STATE.participantStatsPollTimer);
  STATE.participantStatsPollTimer = null;
  STATE.participantStatsPollInFlight = false;
}

async function loadTeacherPanel() {
  showView("loader");

  const response = await fetchAPI("get_teacher_panel_data", { teacher_id: STATE.userId });
  if (response.status === "error") {
    showToast(response.message || "Nie udalo sie pobrac panelu nauczyciela.", true);
    clearSessionStorage();
    STATE.userId = null;
    STATE.userRole = null;
    showRegisterForm();
    showView("register");
    return;
  }

  await applyTeacherPanelData(response.data, { forceRender: true });
  showView("teacher");
  startTeacherPanelPolling();
}

async function generateTeacherQr() {
  const btn = document.getElementById("btn-generate-teacher-qr");
  if (STATE.teacherCodes[0]) {
    showToast("Ten kod jest jeszcze aktywny. Poczekaj na skan.");
    return;
  }

  btn.disabled = true;
  btn.innerText = "Generowanie...";

  const response = await fetchAPI("generate_teacher_qr", { teacher_id: STATE.userId });

  if (response.status === "error") {
    updateTeacherQrButton();
    showToast(response.message || "Nie udalo sie wygenerowac kodu QR.", true);
    return;
  }

  showToast(response.data.reused_existing ? "Masz juz aktywny kod QR." : "Nowy kod QR wygenerowany.");

  const newCode = {
    ...response.data,
    is_active: true
  };

  await applyTeacherPanelData({
    teacher: {
      nickname: STATE.nickname,
      display_name: STATE.teacherDisplayName,
      station_code: STATE.teacherStationCode,
      station_name: STATE.teacherStationName
    },
    qr_codes: [newCode]
  }, { forceRender: true });
}

// =========================================================================
// LADOWANIE PANELU UCZESTNIKA
// =========================================================================
async function loadDashboard() {
  showView("loader");

  const [profileRes, stationsRes] = await Promise.all([
    fetchAPI("get_profile", { participant_id: STATE.userId }),
    fetchAPI("get_stations", {})
  ]);

  if (profileRes.status === "error") {
    clearSessionStorage();
    STATE.userId = null;
    STATE.userRole = null;
    showToast(profileRes.message, true);
    showView("register");
    return;
  }

  const participant = profileRes.data.participant;
  const required_codes_count = profileRes.data.required_codes_count;
  const visitedFromApi = Array.isArray(profileRes.data.visited_station_codes) ? profileRes.data.visited_station_codes : [];
  const visited_station_codes = normalizeStationCodeList([
    ...visitedFromApi,
    ...STATE.visitedStationCodes
  ]);
  STATE.visitedStationCodes = visited_station_codes;
  persistVisitedStationCodesForCurrentParticipant();
  STATE.stations = stationsRes.data && stationsRes.data.stations ? stationsRes.data.stations : [];

  if (participant.is_complete === true || participant.is_complete === "TRUE") {
    renderCompleteScreen(participant);
    return;
  }

  renderDashboard(participant, required_codes_count, visited_station_codes);
}

function pickStationEmoji(seedValue) {
  const seed = String(seedValue == null ? "" : seedValue);
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = ((hash * 31) + seed.charCodeAt(i)) >>> 0;
  }
  return STATION_EMOJI_POOL[hash % STATION_EMOJI_POOL.length];
}

function renderDashboard(participant, reqCount, visitedStationCodes) {
  document.getElementById("dash-nickname").innerText = participant.nickname;
  document.getElementById("dash-school").innerText = participant.school_name;
  document.getElementById("avatar-letter").innerText = participant.nickname.charAt(0).toUpperCase();

  const collected = parseInt(participant.codes_collected_count, 10) || 0;
  document.getElementById("dash-collected").innerText = collected;
  document.getElementById("dash-required").innerText = reqCount;

  const percentage = Math.min((collected / reqCount) * 100, 100);
  setTimeout(() => {
    document.getElementById("progress-bar-fill").style.width = percentage + "%";
  }, 100);

  const grid = document.getElementById("stations-grid");
  grid.innerHTML = "";
  const visitedSet = new Set((visitedStationCodes || []).map((code) => String(code || "").trim()).filter(Boolean));

  STATE.stations.forEach((st) => {
    if (st.is_active !== "TRUE" && st.is_active !== true) return;
    const stationCode = String(st.station_code || "").trim();
    const stationName = String(st.station_name || "Stanowisko");
    const visited = Boolean(stationCode && visitedSet.has(stationCode));
    const emoji = pickStationEmoji(stationCode || stationName);

    const el = document.createElement("div");
    el.className = "station-card";
    if (visited) {
      el.classList.add("disabled");
    }
    el.setAttribute("aria-disabled", visited ? "true" : "false");

    const icon = document.createElement("div");
    icon.className = "card-icon";
    icon.innerText = emoji;

    const title = document.createElement("span");
    title.className = "card-title";
    title.innerText = stationName;

    el.appendChild(icon);
    el.appendChild(title);

    if (visited) {
      const status = document.createElement("span");
      status.className = "station-status";
      status.innerText = "Zaliczone";
      el.appendChild(status);
    }

    grid.appendChild(el);
  });

  if (STATE.participantStats) {
    renderParticipantStats(STATE.participantStats);
  }

  showView("dashboard");
  refreshParticipantStatsSilently();
  startParticipantStatsPolling();
}

// =========================================================================
// OBSLUGA SKANOWANIA
// =========================================================================
async function handleScanCode(qrToken) {
  showView("loader");

  const res = await fetchAPI("scan_code", {
    participant_id: STATE.userId,
    qr_token: qrToken
  });

  if (res.status === "error") {
    showToast(res.message, true);
    await loadDashboard();
    return;
  }

  if (res.data.is_complete) {
    addVisitedStationCode(res.data.station_code);
    await loadDashboard();
  } else {
    addVisitedStationCode(res.data.station_code);
    const isDuplicate = String(res.data.message || "").includes("juz zaliczone");
    document.getElementById("scan-title").innerText = isDuplicate ? "Hej!" : "Swietnie!";
    document.getElementById("scan-message").innerText = res.data.message;

    if (isDuplicate) {
      document.getElementById("scan-icon").innerText = "ℹ️";
      document.getElementById("scan-icon").className = "status-icon";
    } else {
      document.getElementById("scan-icon").innerText = "✨";
      document.getElementById("scan-icon").className = "status-icon success-icon";
    }

    showView("scanResult");
  }
}

function renderCompleteScreen(participant) {
  document.getElementById("comp-nickname").innerText = participant.nickname;
  document.getElementById("comp-school").innerText = participant.school_name;
  showView("complete");
}

// =========================================================================
// EVENTY
// =========================================================================
document.getElementById("btn-back-dash").addEventListener("click", () => {
  loadDashboard();
});

document.getElementById("btn-logout").addEventListener("click", () => {
  logoutUser();
});

document.getElementById("btn-logout-teacher").addEventListener("click", () => {
  logoutUser();
});

document.getElementById("btn-generate-teacher-qr").addEventListener("click", async () => {
  await generateTeacherQr();
});

// =========================================================================
// START APLIKACJI
// =========================================================================
document.addEventListener("DOMContentLoaded", initApp);
