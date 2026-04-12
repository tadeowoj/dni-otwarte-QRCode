const API_URL = "https://pocketbase.zsoiz-czyzew.pl/api/qr-action";
const LOTTERY_SESSION_KEY = "qr_lottery_admin_pin";

let CURRENT_PIN = "";

const states = {
  waiting: document.getElementById("waiting-state"),
  finalists: document.getElementById("finalists-state")
};

function showState(stateName) {
  Object.values(states).forEach((el) => el && el.classList.add("hidden"));
  if (states[stateName]) states[stateName].classList.remove("hidden");
}

function setConnectedState(isConnected) {
  const loginBtn = document.getElementById("btn-login");
  const logoutBtn = document.getElementById("btn-lottery-logout");
  if (loginBtn) loginBtn.classList.toggle("hidden", isConnected);
  if (logoutBtn) logoutBtn.classList.toggle("hidden", !isConnected);
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerText = message;
  toast.className = `toast show ${isError ? "error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 4000);
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

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function connectLottery(pin) {
  CURRENT_PIN = pin;
  localStorage.setItem(LOTTERY_SESSION_KEY, pin);
  setConnectedState(true);
}

function disconnectLottery(message, isError = false) {
  localStorage.removeItem(LOTTERY_SESSION_KEY);
  CURRENT_PIN = "";
  setConnectedState(false);
  showState("waiting");
  if (message) showToast(message, isError);
}

function renderFinalists(finalists) {
  const grid = document.getElementById("finalists-grid");
  const countEl = document.getElementById("finalist-count");

  if (!Array.isArray(finalists) || finalists.length === 0) {
    showState("waiting");
    return;
  }

  showState("finalists");
  if (countEl) countEl.innerText = finalists.length;
  if (!grid) return;

  grid.innerHTML = finalists.map((finalist, index) => `
    <div class="finalist-card" style="animation-delay: ${index * 0.055}s">
      <div class="finalist-number">${index + 1}</div>
      <div class="finalist-nickname">${escapeHtml(finalist.nickname)}</div>
      <div class="finalist-school">${escapeHtml(finalist.school_name)}</div>
    </div>
  `).join("");
}

const loginForm = document.getElementById("lottery-login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const pinInput = document.getElementById("admin-pin");
    const pin = pinInput.value.trim();
    if (!pin) return;

    const btn = document.getElementById("btn-login");
    const originalText = btn.innerText;
    btn.innerText = "Sprawdzam...";
    btn.disabled = true;

    const result = await fetchAPI("get_lottery_data", { pin });

    btn.innerText = originalText;
    btn.disabled = false;

    if (result.status === "error") {
      showToast(result.message, true);
      return;
    }

    connectLottery(pin);
    renderFinalists(result.data && result.data.finalists);
    startLotteryPolling();
  });
}

const logoutBtn = document.getElementById("btn-lottery-logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    disconnectLottery("Rozłączono panel losowania.");
  });
}

let pollInterval = null;
function startLotteryPolling() {
  if (pollInterval) return;

  pollInterval = setInterval(async () => {
    if (!CURRENT_PIN) return;
    const result = await fetchAPI("get_lottery_data", { pin: CURRENT_PIN });
    if (result.status === "success") {
      renderFinalists(result.data && result.data.finalists);
    } else if (result.message && result.message.toLowerCase().includes("pin")) {
      clearInterval(pollInterval);
      pollInterval = null;
      disconnectLottery("Sesja wygasła. Zaloguj się ponownie.", true);
    }
  }, 5000);
}

(async () => {
  showState("waiting");
  setConnectedState(false);

  const savedPin = localStorage.getItem(LOTTERY_SESSION_KEY);
  if (!savedPin) return;

  const result = await fetchAPI("get_lottery_data", { pin: savedPin });
  if (result.status === "success") {
    connectLottery(savedPin);
    renderFinalists(result.data && result.data.finalists);
    startLotteryPolling();
    return;
  }

  localStorage.removeItem(LOTTERY_SESSION_KEY);
})();
