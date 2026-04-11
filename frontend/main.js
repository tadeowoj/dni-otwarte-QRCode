// =========================================================================
// KONFIGURACJA & ZMIENNE GLOBALNE
// =========================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbw8csjuObiG1iuIO1KAi1TKSVHOXQXAs2CMuWnIELGshCbuTBjf0-bA28ZbkUetINzv/exec";
const PARTICIPANT_PIN_REGEX = /^\d{4}$/;

const STATE = {
  participantId: localStorage.getItem("qr_participant_id") || null,
  nickname: localStorage.getItem("qr_nickname") || null,
  stations: [],
  pendingScanCode: new URLSearchParams(window.location.search).get("code"),
  pendingRegistration: null
};

// =========================================================================
// SYSTEM WIDOKOW I INTERFEJSU
// =========================================================================
const views = {
  loader: document.getElementById("view-loader"),
  register: document.getElementById("view-register"),
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
  if (views[viewName]) {
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
      body: JSON.stringify({ action: action, payload: payload })
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error("Blad sieci:", err);
    return { status: "error", message: "Brak stabilnego polaczenia z serwerem." };
  }
}

function startParticipantSession(participantId, nickname) {
  STATE.participantId = participantId;
  STATE.nickname = nickname;
  localStorage.setItem("qr_participant_id", participantId);
  localStorage.setItem("qr_nickname", nickname);
}

function logoutParticipant() {
  const confirmLogout = window.confirm("Na pewno chcesz sie wylogowac?");
  if (!confirmLogout) return;

  localStorage.removeItem("qr_participant_id");
  localStorage.removeItem("qr_nickname");
  STATE.participantId = null;
  STATE.nickname = null;
  STATE.pendingScanCode = null;

  showRegisterForm();
  showView("register");
  showToast("Wylogowano.");
}

// =========================================================================
// INICJALIZACJA I LOGIKA GLOWNA
// =========================================================================
async function initApp() {
  if (!STATE.participantId) {
    showRegisterForm();
    if (STATE.pendingScanCode) {
      showToast("Aby zeskanowac kod, musisz sie najpierw zalogowac lub zarejestrowac.", true);
    }
    showView("register");
    return;
  }

  if (STATE.pendingScanCode) {
    await handleScanCode(STATE.pendingScanCode);
    window.history.replaceState({}, document.title, window.location.pathname);
    STATE.pendingScanCode = null;
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

  startParticipantSession(res.data.participant_id, res.data.nickname);
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
    pin: pin
  });

  btn.innerText = "Zapisz PIN i przejdz dalej";
  btn.disabled = false;

  if (res.status === "error") {
    showToast(res.message || "Nie udalo sie zapisac PIN-u.", true);
    return;
  }

  startParticipantSession(STATE.pendingRegistration.participantId, STATE.pendingRegistration.nickname);
  STATE.pendingRegistration = null;
  closePinModal();
  showToast("PIN ustawiony. Startujemy!");
  await initApp();
});

// =========================================================================
// LADOWANIE PANELU (DASHBOARD)
// =========================================================================
async function loadDashboard() {
  showView("loader");

  const [profileRes, stationsRes] = await Promise.all([
    fetchAPI("get_profile", { participant_id: STATE.participantId }),
    fetchAPI("get_stations", {})
  ]);

  if (profileRes.status === "error") {
    localStorage.removeItem("qr_participant_id");
    localStorage.removeItem("qr_nickname");
    STATE.participantId = null;
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

  const collected = parseInt(participant.codes_collected_count) || 0;
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
async function handleScanCode(code) {
  showView("loader");

  const res = await fetchAPI("scan_code", {
    participant_id: STATE.participantId,
    station_code: code
  });

  if (res.status === "error") {
    showToast(res.message, true);
    await loadDashboard();
    return;
  }

  if (res.data.is_complete) {
    await loadDashboard();
  } else {
    const isDuplicate = res.data.message.includes("juz zaliczone");
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

document.getElementById("btn-back-dash").addEventListener("click", () => {
  loadDashboard();
});

document.getElementById("btn-logout").addEventListener("click", () => {
  logoutParticipant();
});

// =========================================================================
// EKRAN KONCOWY
// =========================================================================
function renderCompleteScreen(participant) {
  document.getElementById("comp-nickname").innerText = participant.nickname;
  document.getElementById("comp-school").innerText = participant.school_name;
  showView("complete");
}

// =========================================================================
// START APLIKACJI
// =========================================================================
document.addEventListener("DOMContentLoaded", initApp);
