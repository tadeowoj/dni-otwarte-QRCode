const API_URL = "https://pocketbase.zsoiz-czyzew.pl/api/qr-action";
const LOTTERY_SESSION_KEY = "qr_lottery_admin_pin";

const ENTRY_DELAY_STEP_SECONDS = 0.1;
const MIN_LOOP_CARD_COUNT = 12;
const BASE_SCROLL_DURATION_SECONDS = 45;
const MAX_SCROLL_DURATION_SECONDS = 60;
const DRAW_CHAOS_DURATION_MS = 10000;

let CURRENT_PIN = "";
let LAST_FINALISTS_SIGNATURE = "";
let ACTIVE_FINALISTS = [];
let DRAW_IN_PROGRESS = false;
let pollInterval = null;

const states = {
  waiting: document.getElementById("waiting-state"),
  finalists: document.getElementById("finalists-state"),
  winner: document.getElementById("winner-state")
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

function setDrawButtonState() {
  const button = document.getElementById("btn-draw-reward");
  if (!button) return;

  if (!CURRENT_PIN) {
    button.disabled = true;
    button.innerText = "Rozdaj fanty!";
    return;
  }

  if (DRAW_IN_PROGRESS) {
    button.disabled = true;
    button.innerText = "Losowanie trwa...";
    return;
  }

  button.disabled = false;
  button.innerText = "Rozdaj fanty!";
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
    return { status: "error", message: "Blad polaczenia z serwerem." };
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function prefersReducedMotion() {
  return Boolean(
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function connectLottery(pin) {
  CURRENT_PIN = pin;
  localStorage.setItem(LOTTERY_SESSION_KEY, pin);
  setConnectedState(true);
  setDrawButtonState();
}

function resetFinalistsView() {
  LAST_FINALISTS_SIGNATURE = "";
  ACTIVE_FINALISTS = [];
  const grid = document.getElementById("finalists-grid");
  if (!grid) return;
  grid.innerHTML = "";
  delete grid.dataset.signature;
  grid.style.removeProperty("--lottery-scroll-duration");
  grid.classList.remove("is-static");
  grid.classList.remove("finalists-chaos");
}

function resetWinnerView() {
  const winnerCard = document.getElementById("winner-card");
  if (winnerCard) winnerCard.innerHTML = "";
}

function disconnectLottery(message, isError = false) {
  localStorage.removeItem(LOTTERY_SESSION_KEY);
  CURRENT_PIN = "";
  DRAW_IN_PROGRESS = false;
  resetFinalistsView();
  resetWinnerView();
  setConnectedState(false);
  setDrawButtonState();
  showState("waiting");
  if (message) showToast(message, isError);
}

function buildFinalistsSignature(finalists) {
  return finalists.map((finalist, index) => {
    const id = finalist.participant_id || finalist.id || "";
    return `${id}|${finalist.nickname || ""}|${finalist.school_name || ""}|${index}`;
  }).join("||");
}

function calculateRepeatCount(finalistCount) {
  if (finalistCount <= 0) return 1;
  return Math.max(1, Math.ceil(MIN_LOOP_CARD_COUNT / finalistCount));
}

function calculateScrollDuration(cardCount) {
  const extra = Math.max(0, cardCount - 6) * 1.1;
  const duration = Math.min(MAX_SCROLL_DURATION_SECONDS, BASE_SCROLL_DURATION_SECONDS + extra);
  return Math.round(duration * 10) / 10;
}

function buildFinalistCard(finalist, displayIndex, animationIndex, useEnterAnimation) {
  const delayStyle = useEnterAnimation
    ? `--entry-delay: ${(animationIndex * ENTRY_DELAY_STEP_SECONDS).toFixed(3)}s;`
    : "--entry-delay: 0s;";
  const cardClass = useEnterAnimation ? "finalist-card" : "finalist-card finalist-card-no-enter";

  return `
    <div class="${cardClass}" style="${delayStyle}">
      <div class="finalist-number">${displayIndex + 1}</div>
      <div class="finalist-nickname">${escapeHtml(finalist.nickname)}</div>
      <div class="finalist-school">${escapeHtml(finalist.school_name)}</div>
    </div>
  `;
}

function renderWinner(winner) {
  const winnerCard = document.getElementById("winner-card");
  if (!winnerCard) return;

  winnerCard.innerHTML = `
    <div class="winner-card-name">${escapeHtml(winner.first_name_last_name || "")}</div>
    <div class="winner-card-nick">@${escapeHtml(winner.nickname || "")}</div>
    <div class="winner-card-school">${escapeHtml(winner.school_name || "")}</div>
  `;
}

function renderFinalists(finalists, options = {}) {
  const { showFinalistsState = true, force = false } = options;
  const grid = document.getElementById("finalists-grid");
  const countEl = document.getElementById("finalist-count");

  ACTIVE_FINALISTS = Array.isArray(finalists) ? finalists.slice() : [];

  if (!Array.isArray(finalists) || finalists.length === 0) {
    resetFinalistsView();
    if (showFinalistsState) showState("waiting");
    return;
  }

  if (showFinalistsState) showState("finalists");
  if (countEl) countEl.innerText = finalists.length;
  if (!grid) return;

  const signature = buildFinalistsSignature(finalists);
  if (!force && signature === LAST_FINALISTS_SIGNATURE && grid.dataset.signature === signature) {
    return;
  }

  LAST_FINALISTS_SIGNATURE = signature;
  grid.dataset.signature = signature;

  const reducedMotion = prefersReducedMotion();
  const repeatCount = reducedMotion ? 1 : calculateRepeatCount(finalists.length);
  const cardsForGroup = [];

  for (let copyIndex = 0; copyIndex < repeatCount; copyIndex += 1) {
    finalists.forEach((finalist) => cardsForGroup.push(finalist));
  }

  const primaryCardsHtml = cardsForGroup.map((finalist, index) => buildFinalistCard(
    finalist,
    index % finalists.length,
    index,
    !reducedMotion
  )).join("");

  if (reducedMotion) {
    grid.classList.add("is-static");
    grid.style.removeProperty("--lottery-scroll-duration");
    grid.innerHTML = `<div class="finalists-track-group">${primaryCardsHtml}</div>`;
    return;
  }

  grid.classList.remove("is-static");
  const cloneCardsHtml = cardsForGroup.map((finalist, index) => buildFinalistCard(
    finalist,
    index % finalists.length,
    index,
    false
  )).join("");

  const duration = calculateScrollDuration(cardsForGroup.length);
  grid.style.setProperty("--lottery-scroll-duration", `${duration}s`);
  grid.innerHTML = `
    <div class="finalists-track-group finalists-track-group-primary">${primaryCardsHtml}</div>
    <div class="finalists-track-group finalists-track-group-clone" aria-hidden="true">${cloneCardsHtml}</div>
  `;
}

async function refreshLotteryData(renderMode = "auto") {
  if (!CURRENT_PIN) return null;
  const result = await fetchAPI("get_lottery_data", { pin: CURRENT_PIN });
  if (result.status !== "success") return result;

  const finalists = (result.data && result.data.finalists) || [];

  if (DRAW_IN_PROGRESS) {
    ACTIVE_FINALISTS = Array.isArray(finalists) ? finalists.slice() : [];
    return result;
  }

  if (renderMode === "list") {
    renderFinalists(finalists, { showFinalistsState: true });
    return result;
  }

  if (states.winner && !states.winner.classList.contains("hidden")) {
    renderFinalists(finalists, { showFinalistsState: false });
    return result;
  }

  renderFinalists(finalists, { showFinalistsState: true });
  return result;
}

async function runDrawSequence() {
  if (!CURRENT_PIN) {
    showToast("Najpierw zaloguj panel losowania.", true);
    return;
  }

  if (DRAW_IN_PROGRESS) {
    return;
  }

  if (!ACTIVE_FINALISTS.length) {
    showToast("Brak graczy na liscie losowania.", true);
    return;
  }

  const grid = document.getElementById("finalists-grid");
  DRAW_IN_PROGRESS = true;
  setDrawButtonState();
  resetWinnerView();

  showState("finalists");
  renderFinalists(ACTIVE_FINALISTS, { showFinalistsState: true, force: true });

  if (grid && !prefersReducedMotion()) {
    grid.classList.add("finalists-chaos");
  }

  await delay(DRAW_CHAOS_DURATION_MS);

  const drawResult = await fetchAPI("draw_lottery_winner", { pin: CURRENT_PIN });

  if (grid) {
    grid.classList.remove("finalists-chaos");
  }

  DRAW_IN_PROGRESS = false;
  setDrawButtonState();

  if (drawResult.status === "error") {
    showToast(drawResult.message || "Nie udalo sie wykonac losowania.", true);
    await refreshLotteryData("list");
    return;
  }

  const winner = drawResult.data && drawResult.data.winner;
  if (!winner) {
    showToast("Brak danych zwyciezcy w odpowiedzi serwera.", true);
    await refreshLotteryData("list");
    return;
  }

  renderWinner(winner);
  showState("winner");
  showToast("Fanty rozdane. Mamy zwyciezce!");

  await refreshLotteryData("auto");
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
    resetWinnerView();
    renderFinalists(result.data && result.data.finalists, { showFinalistsState: true, force: true });
    startLotteryPolling();
  });
}

const drawButton = document.getElementById("btn-draw-reward");
if (drawButton) {
  drawButton.addEventListener("click", () => {
    void runDrawSequence();
  });
}

const logoutBtn = document.getElementById("btn-lottery-logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    disconnectLottery("Rozlaczono panel losowania.");
  });
}

function startLotteryPolling() {
  if (pollInterval) return;

  pollInterval = setInterval(async () => {
    if (!CURRENT_PIN) return;

    const result = await refreshLotteryData("auto");
    if (!result || result.status === "success") return;

    if (result.message && result.message.toLowerCase().includes("pin")) {
      clearInterval(pollInterval);
      pollInterval = null;
      disconnectLottery("Sesja wygasla. Zaloguj sie ponownie.", true);
    }
  }, 5000);
}

(async () => {
  showState("waiting");
  setConnectedState(false);
  setDrawButtonState();

  const savedPin = localStorage.getItem(LOTTERY_SESSION_KEY);
  if (!savedPin) return;

  const result = await fetchAPI("get_lottery_data", { pin: savedPin });
  if (result.status === "success") {
    connectLottery(savedPin);
    renderFinalists(result.data && result.data.finalists, { showFinalistsState: true, force: true });
    startLotteryPolling();
    return;
  }

  localStorage.removeItem(LOTTERY_SESSION_KEY);
})();
