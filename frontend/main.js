// =========================================================================
// KONFIGURACJA & ZMIENNE GLOBALNE
// =========================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbzzfHo60slLnqPG6ljFOJ10J8vy26AirEao8LjHoUOSQ2N6NR3D4FBUmjIhUHLHWw7h/exec";

const STATE = {
  participantId: localStorage.getItem('qr_participant_id') || null,
  nickname: localStorage.getItem('qr_nickname') || null,
  stations: [],
  pendingScanCode: new URLSearchParams(window.location.search).get('code')
};

// =========================================================================
// SYSTEM WIDOKÓW I INTERFEJSU
// =========================================================================
const views = {
  loader: document.getElementById('view-loader'),
  register: document.getElementById('view-register'),
  dashboard: document.getElementById('view-dashboard'),
  scanResult: document.getElementById('view-scan-result'),
  complete: document.getElementById('view-complete')
};

function hideAllViews() {
  Object.values(views).forEach(v => v.classList.remove('active'));
}

function showView(viewName) {
  hideAllViews();
  if (views[viewName]) {
    views[viewName].classList.add('active');
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.className = `toast show ${isError ? 'error' : ''}`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// =========================================================================
// KOMUNIKACJA Z API (FETCH)
// =========================================================================
async function fetchAPI(action, payload) {
  try {
    // Wysyłamy jako text/plain by uniknąć rygorystycznego CORS Preflight od Google
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: action, payload: payload })
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error("Błąd sieci:", err);
    return { status: "error", message: "Brak stabilnego połączenia z serwerem." };
  }
}

function logoutParticipant() {
  const confirmLogout = window.confirm("Na pewno chcesz się wylogować?");
  if (!confirmLogout) return;

  localStorage.removeItem('qr_participant_id');
  localStorage.removeItem('qr_nickname');
  STATE.participantId = null;
  STATE.nickname = null;
  STATE.pendingScanCode = null;

  showView('register');
  showToast('Wylogowano.');
}

// =========================================================================
// INICJALIZACJA I LOGIKA GŁÓWNA
// =========================================================================
async function initApp() {
  
  if (!STATE.participantId) {
    if (STATE.pendingScanCode) {
      showToast("Aby zeskanować kod, musisz się najpierw zapisać!", true);
    }
    showView('register');
    return;
  }

  // Mamy uczestnika w pamięci. Jeśli mamy kod w URL - próbujemy skanować od razu.
  if (STATE.pendingScanCode) {
    await handleScanCode(STATE.pendingScanCode);
    // Czyścimy url z kodu by odświeżenie nie nabijało błędu
    window.history.replaceState({}, document.title, window.location.pathname);
    STATE.pendingScanCode = null;
  } else {
    await loadDashboard();
  }
}

// =========================================================================
// FORMULARZ REJESTRACJI
// =========================================================================
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('reg-name').value.trim();
  const nick = document.getElementById('reg-nick').value.trim();
  const school = document.getElementById('reg-school').value.trim();
  
  if(!name || !nick || !school) return;

  const btn = document.getElementById('btn-register');
  btn.innerHTML = 'Rejestrowanie...';
  btn.disabled = true;

  const res = await fetchAPI("register", { first_name_last_name: name, nickname: nick, school_name: school });
  
  btn.innerHTML = 'Dołącz do gry';
  btn.disabled = false;

  if (res.status === "error") {
    if (res.error_code === "DUPLICATE_PARTICIPANT") {
      showToast(res.message || "Takie konto już istnieje. Sprawdź dane i spróbuj ponownie.", true);
      const nickInput = document.getElementById('reg-nick');
      nickInput.focus();
      nickInput.select();
      return;
    }
    showToast(res.message, true);
    return;
  }

  // Sukces
  STATE.participantId = res.data.participant_id;
  STATE.nickname = res.data.nickname;
  localStorage.setItem('qr_participant_id', STATE.participantId);
  localStorage.setItem('qr_nickname', STATE.nickname);
  
  // Jeśli po wejściu chciał zeskanować:
  initApp();
});

// =========================================================================
// ŁADOWANIE PANELU (DASHBOARD)
// =========================================================================
async function loadDashboard() {
  showView('loader');
  
  // Pobieramy dane usera i liste stanowisk równolegle dla optymalizacji
  const [profileRes, stationsRes] = await Promise.all([
    fetchAPI("get_profile", { participant_id: STATE.participantId }),
    fetchAPI("get_stations", {})
  ]);

  if (profileRes.status === "error") {
    // Gdyby id zagubił się na serwerze - bezpieczny fallback
    localStorage.removeItem('qr_participant_id');
    STATE.participantId = null;
    showToast(profileRes.message, true);
    showView('register');
    return;
  }

  const { participant, required_codes_count } = profileRes.data;
  STATE.stations = stationsRes.data && stationsRes.data.stations ? stationsRes.data.stations : [];

  // Jeśli gracz ma powiedzmy 15 / 15 i flaga complete wskakuje...
  if (participant.is_complete === true || participant.is_complete === "TRUE") {
    renderCompleteScreen(participant);
    return;
  }

  renderDashboard(participant, required_codes_count);
}

function renderDashboard(participant, reqCount) {
  document.getElementById('dash-nickname').innerText = participant.nickname;
  document.getElementById('dash-school').innerText = participant.school_name;
  document.getElementById('avatar-letter').innerText = participant.nickname.charAt(0).toUpperCase();

  const collected = parseInt(participant.codes_collected_count) || 0;
  document.getElementById('dash-collected').innerText = collected;
  document.getElementById('dash-required').innerText = reqCount;
  
  const percentage = Math.min((collected / reqCount) * 100, 100);
  setTimeout(() => {
    document.getElementById('progress-bar-fill').style.width = percentage + '%';
  }, 100);

  // Generowanie elementów listy stacji
  const grid = document.getElementById('stations-grid');
  grid.innerHTML = '';
  
  // Niestety, w obecnym design API z PROJEKT.md pełna lista ZALICZONYCH 
  // stacji nie jest wysyłana w get_profile domyślnie.
  // Zakładamy na razie ślepy grid pokazujący tylko bazę. (By to ulepszyć w MVP, można w API.js dokleić historię skanów usera).
  
  STATE.stations.forEach(st => {
     if (st.is_active !== "TRUE" && st.is_active !== true) return; // Ukrywamy nieaktywne

     const el = document.createElement('div');
     // Do celów Demo/MVP traktujemy jako "do odnalezienia"
     el.className = 'station-card';
     el.innerHTML = `
        <div class="card-icon">🎯</div>
        <span class="card-title">${st.station_name}</span>
     `;
     grid.appendChild(el);
  });

  showView('dashboard');
}

// =========================================================================
// OBSŁUGA SKANOWANIA
// =========================================================================
async function handleScanCode(code) {
  showView('loader');
  
  const res = await fetchAPI("scan_code", {
     participant_id: STATE.participantId,
     station_code: code
  });

  if (res.status === "error") {
     showToast(res.message, true);
     await loadDashboard(); // wracamy z widoku ładowania
     return;
  }

  // Sukces skanowania lub duplikat skanowania (też success ale z inna informacja, obslugujemy to plynnie w API)
  if (res.data.is_complete) {
     // Przekierowanie do zwycięstwa poprzez pobranie pelnych statystyk
     await loadDashboard(); 
  } else {
     // Pokaż ekran z sukcesem tymczasowym (view-scan-result)
     document.getElementById('scan-title').innerText = res.data.message.includes("już zaliczone") ? "Hej!" : "Świetnie!";
     document.getElementById('scan-message').innerText = res.data.message;
     
     if (res.data.message.includes("już zaliczone")) {
        document.getElementById('scan-icon').innerText = 'ℹ️';
        document.getElementById('scan-icon').className = 'status-icon';
     } else {
        document.getElementById('scan-icon').innerText = '✨';
        document.getElementById('scan-icon').className = 'status-icon success-icon';
     }

     showView('scanResult');
  }
}

document.getElementById('btn-back-dash').addEventListener('click', () => {
   loadDashboard();
});

document.getElementById('btn-logout').addEventListener('click', () => {
  logoutParticipant();
});

// =========================================================================
// EKRAN KOŃCOWY
// =========================================================================
function renderCompleteScreen(participant) {
  document.getElementById('comp-nickname').innerText = participant.nickname;
  document.getElementById('comp-school').innerText = participant.school_name;
  showView('complete');
}

// =========================================================================
// START APLIKACJI
// =========================================================================
document.addEventListener('DOMContentLoaded', initApp);
