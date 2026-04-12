const API_URL = "https://pocketbase.zsoiz-czyzew.pl/api/qr-action";
const LOTTERY_SESSION_KEY = "qr_lottery_admin_pin";

let CURRENT_PIN = "";

const views = {
  login: document.getElementById('view-login'),
  lottery: document.getElementById('view-lottery')
};

const states = {
  waiting: document.getElementById('waiting-state'),
  finalists: document.getElementById('finalists-state')
};

function showView(v) {
  Object.values(views).forEach(el => el.classList.add('hidden'));
  views[v].classList.remove('hidden');
}

function showState(s) {
  Object.values(states).forEach(el => el.classList.add('hidden'));
  states[s].classList.remove('hidden');
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = message;
  toast.className = `toast show ${isError ? 'error' : ''}`;
  setTimeout(() => toast.classList.remove('show'), 4000);
}

async function fetchAPI(action, payload) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload })
    });
    return await response.json();
  } catch (err) {
    return { status: "error", message: "Błąd połączenia z serwerem." };
  }
}

const loginForm = document.getElementById('lottery-login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pinInput = document.getElementById('admin-pin');
    const pin = pinInput.value.trim();
    if(!pin) return;

    const btn = document.getElementById('btn-login');
    const originalText = btn.innerText;
    btn.innerText = "Sprawdzam...";
    btn.disabled = true;

    const res = await fetchAPI("get_lottery_data", { pin });
    
    btn.innerText = originalText;
    btn.disabled = false;

    if (res.status === "error") {
      showToast(res.message, true);
      return;
    }

    CURRENT_PIN = pin;
    localStorage.setItem(LOTTERY_SESSION_KEY, pin);
    
    showView('lottery');
    renderFinalists(res.data.finalists);
    startLotteryPolling();
  });
}

const logoutBtn = document.getElementById('btn-lottery-logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(LOTTERY_SESSION_KEY);
    location.reload();
  });
}

function renderFinalists(finalists) {
  const grid = document.getElementById('finalists-grid');
  const countEl = document.getElementById('finalist-count');
  
  if (!finalists || finalists.length === 0) {
    showState('waiting');
    return;
  }

  showState('finalists');
  if (countEl) countEl.innerText = finalists.length;

  grid.innerHTML = finalists.map((f, index) => `
    <div class="finalist-card" style="animation-delay: ${index * 0.05}s">
      <div class="finalist-nickname">${f.nickname}</div>
      <div class="finalist-school">${f.school_name}</div>
    </div>
  `).join('');
}

let pollInterval = null;
function startLotteryPolling() {
  if (pollInterval) return;
  
  pollInterval = setInterval(async () => {
    if (!CURRENT_PIN) return;
    const res = await fetchAPI("get_lottery_data", { pin: CURRENT_PIN });
    if (res.status === "success") {
      renderFinalists(res.data.finalists);
    } else if (res.message && res.message.includes("PIN")) {
      clearInterval(pollInterval);
      pollInterval = null;
      localStorage.removeItem(LOTTERY_SESSION_KEY);
      showView('login');
      CURRENT_PIN = "";
      showToast("Sesja wygasła. Zaloguj się ponownie.", true);
    }
  }, 5000);
}

// Auto-restore session
(async () => {
  const savedPin = localStorage.getItem(LOTTERY_SESSION_KEY);
  if (savedPin) {
    const res = await fetchAPI("get_lottery_data", { pin: savedPin });
    if (res.status === "success") {
      CURRENT_PIN = savedPin;
      showView('lottery');
      renderFinalists(res.data.finalists);
      startLotteryPolling();
    } else {
      localStorage.removeItem(LOTTERY_SESSION_KEY);
    }
  }
})();
