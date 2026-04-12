import QRCode from "qrcode";

// =========================================================================
// KONFIGURACJA & ZMIENNE GLOBALNE
// =========================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbw8csjuObiG1iuIO1KAi1TKSVHOXQXAs2CMuWnIELGshCbuTBjf0-bA28ZbkUetINzv/exec";
const PARTICIPANT_PIN_REGEX = /^\d{4}$/;

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
  teacherCodes: []
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
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");

function hideAllViews() {
  Object.values(views).forEach((v) => v.classList.remove("active"));
}

function showView(viewName) {
  hideAllViews();
  if (views[viewName]) views[viewName].classList.add("active");
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
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload })
    });
    return await response.json();
  } catch (err) {
    console.error("Blad sieci:", err);
    return { status: "error", message: "Brak stabilnego polaczenia z serwerem." };
  }
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
  } else {
    localStorage.removeItem("qr_participant_id");
    localStorage.setItem("qr_teacher_display_name", STATE.teacherDisplayName || "");
    localStorage.setItem("qr_teacher_station_code", STATE.teacherStationCode || "");
    localStorage.setItem("qr_teacher_station_name", STATE.teacherStationName || "");
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

function logoutUser() {
  const confirmLogout = window.confirm("Na pewno chcesz sie wylogowac?");
  if (!confirmLogout) return;

  clearSessionStorage();
  STATE.userId = null;
  STATE.userRole = null;
  STATE.nickname = null;
  STATE.teacherDisplayName = null;
  STATE.teacherStationCode = null;
  STATE.teacherStationName = null;
  STATE.pendingScanToken = null;

  showRegisterForm();
  showView("register");
  showToast("Wylogowano.");
}

// =========================================================================
// INICJALIZACJA I LOGIKA GLOWNA
// =========================================================================
async function initApp() {
  if (STATE.pendingLegacyCode) {
    showToast("Stare kody ?code=... sa nieobslugiwane. Uzyj nowego QR z tokenem.", true);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (!STATE.userId) {
    showRegisterForm();
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

function renderTeacherHistory(codes) {
  const list = document.getElementById("teacher-qr-history");
  list.innerHTML = "";

  if (!codes || codes.length === 0) {
    list.innerHTML = '<li class="teacher-qr-history-item">Brak aktywnych kodow. Wygeneruj pierwszy QR.</li>';
    return;
  }

  codes.forEach((item) => {
    const li = document.createElement("li");
    li.className = "teacher-qr-history-item";
    li.innerHTML = `
      <div><strong>Token:</strong> ${item.qr_token}</div>
      <div><strong>Utworzono:</strong> ${new Date(item.created_at).toLocaleString()}</div>
      <div><a href="${item.scan_url}" target="_blank" rel="noopener noreferrer">${item.scan_url}</a></div>
    `;
    list.appendChild(li);
  });
}

async function renderTeacherCurrentQr(code) {
  const qrLink = document.getElementById("teacher-qr-link");

  if (!code) {
    qrLink.href = "#";
    qrLink.innerText = "-";
    await renderTeacherQr(null);
    return;
  }

  qrLink.href = code.scan_url;
  qrLink.innerText = code.scan_url;
  await renderTeacherQr(code.scan_url);
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

  const teacher = response.data.teacher;
  const codes = response.data.qr_codes || [];

  STATE.nickname = teacher.nickname;
  STATE.teacherDisplayName = teacher.display_name;
  STATE.teacherStationCode = teacher.station_code;
  STATE.teacherStationName = teacher.station_name;
  STATE.teacherCodes = codes;

  document.getElementById("teacher-nickname").innerText = teacher.display_name || teacher.nickname;
  document.getElementById("teacher-station-name").innerText = teacher.station_name || "-";
  document.getElementById("teacher-station-code").innerText = teacher.station_code || "-";

  await renderTeacherCurrentQr(codes[0] || null);
  renderTeacherHistory(codes);
  showView("teacher");
}

async function generateTeacherQr() {
  const btn = document.getElementById("btn-generate-teacher-qr");
  btn.disabled = true;
  btn.innerText = "Generowanie...";

  const response = await fetchAPI("generate_teacher_qr", { teacher_id: STATE.userId });

  btn.disabled = false;
  btn.innerText = "Wygeneruj nowy QR";

  if (response.status === "error") {
    showToast(response.message || "Nie udalo sie wygenerowac kodu QR.", true);
    return;
  }

  showToast("Nowy kod QR wygenerowany.");

  const newCode = {
    ...response.data,
    is_active: true
  };

  STATE.teacherCodes = [newCode, ...STATE.teacherCodes].slice(0, 10);
  await renderTeacherCurrentQr(newCode);
  renderTeacherHistory(STATE.teacherCodes);
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
  STATE.stations = stationsRes.data && stationsRes.data.stations ? stationsRes.data.stations : [];

  if (participant.is_complete === true || participant.is_complete === "TRUE") {
    renderCompleteScreen(participant);
    return;
  }

  renderDashboard(participant, required_codes_count);
}

function renderDashboard(participant, reqCount) {
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

  STATE.stations.forEach((st) => {
    if (st.is_active !== "TRUE" && st.is_active !== true) return;

    const el = document.createElement("div");
    el.className = "station-card";
    el.innerHTML = `
      <div class="card-icon">🎯</div>
      <span class="card-title">${st.station_name}</span>
    `;
    grid.appendChild(el);
  });

  showView("dashboard");
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
    await loadDashboard();
  } else {
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
