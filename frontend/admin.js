const API_URL = "https://pocketbase.zsoiz-czyzew.pl/api/qr-action";
const SESSION_STORAGE_KEY = "qr_admin_session_pin";

let CURRENT_PIN = "";
const DRAW_PARTICIPANTS = new Map();
let adminAutoRefreshInterval = null;

function saveSession(pin) {
  localStorage.setItem(SESSION_STORAGE_KEY, pin);
}

function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function getSavedSession() {
  return localStorage.getItem(SESSION_STORAGE_KEY) || "";
}

const views = {
  login: document.getElementById('view-login'),
  admin: document.getElementById('view-admin')
};

function showView(v) {
  Object.values(views).forEach(el => el.classList.remove('active'));
  views[v].classList.add('active');
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.innerText = message;
  toast.className = `toast show ${isError ? 'error' : ''}`;
  setTimeout(() => toast.classList.remove('show'), 4000);
}

function isTruthyValue(value) {
  return value === true || value === "TRUE" || value === "true" || value === 1 || value === "1";
}

function createDrawParticipantSnapshot(participant) {
  return {
    participant_id: participant.participant_id,
    nickname: participant.nickname || "",
    first_name_last_name: participant.first_name_last_name || "",
    school_name: participant.school_name || "",
    codes_collected_count: participant.codes_collected_count || 0
  };
}

function initDrawFromApiData(participants) {
  DRAW_PARTICIPANTS.clear();
  participants.forEach((p) => {
    if (isTruthyValue(p.in_draw)) {
      DRAW_PARTICIPANTS.set(String(p.participant_id), createDrawParticipantSnapshot(p));
    }
  });
}

function renderDrawParticipants() {
  const list = document.getElementById("draw-list");
  if (!list) return;

  const participants = Array.from(DRAW_PARTICIPANTS.values());
  if (participants.length === 0) {
    list.innerHTML = '<p class="draw-list-empty">Brak graczy na liście losowania.</p>';
    return;
  }

  list.innerHTML = participants.map((participant) => `
    <div class="draw-player-row" data-id="${participant.participant_id}">
      <div class="draw-player-main">
        <strong>${participant.nickname}</strong>
        <small>${participant.first_name_last_name}</small>
        <div class="draw-player-meta">${participant.school_name} · Kody: ${participant.codes_collected_count || 0}</div>
      </div>
      <button type="button" class="btn-small draw-remove-cmd" data-id="${participant.participant_id}">Usuń</button>
    </div>
  `).join("");

  document.querySelectorAll(".draw-remove-cmd").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const participantId = btn.getAttribute("data-id");
      const participant = DRAW_PARTICIPANTS.get(participantId);
      if (!participant) {
        btn.disabled = false;
        return;
      }

      const saved = await setDrawParticipant(participant, false);
      if (saved) {
        const checkbox = document.querySelector(`.draw-checkbox[data-id="${participantId}"]`);
        if (checkbox) checkbox.checked = false;
      }
      btn.disabled = false;
    });
  });
}

async function persistDrawParticipants() {
  const participant_ids = Array.from(DRAW_PARTICIPANTS.keys());
  return fetchAPI("update_draw_participants", {
    pin: CURRENT_PIN,
    participant_ids
  });
}

async function setDrawParticipant(participant, selected) {
  const participantId = String(participant.participant_id);
  const previousDrawParticipants = new Map(DRAW_PARTICIPANTS);

  if (selected) {
    DRAW_PARTICIPANTS.set(participantId, createDrawParticipantSnapshot(participant));
  } else {
    DRAW_PARTICIPANTS.delete(participantId);
  }

  renderDrawParticipants();
  const res = await persistDrawParticipants();
  if (res.status === "success") {
    return true;
  }

  DRAW_PARTICIPANTS.clear();
  previousDrawParticipants.forEach((snapshot, id) => DRAW_PARTICIPANTS.set(id, snapshot));
  renderDrawParticipants();
  showToast(res.message || "Nie udalo sie zapisac zmian losowania.", true);
  return false;
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

document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pin = document.getElementById('admin-pin').value.trim();
  if(!pin) return;

  const btn = document.getElementById('btn-login');
  btn.innerText = "Sprawdzam...";
  btn.disabled = true;

  const res = await fetchAPI("get_admin_data", { pin });
  
  btn.innerText = "Dostęp";
  btn.disabled = false;

  if (res.status === "error") {
    showToast(res.message, true);
    return;
  }

  CURRENT_PIN = pin;
  saveSession(pin);
  renderData(res.data);
  showView('admin');
  showToast("Zalogowano pomyślnie!");
  startAutoRefresh();
});

function renderData(data) {
  // Statystyki
  document.getElementById('stat-participants').innerText = data.stats.total_participants;
  document.getElementById('stat-completed').innerText = data.stats.completed_participants;
  document.getElementById('stat-scans').innerText = data.stats.total_scans;
  document.getElementById('stat-stations').innerText = data.stats.total_stations;

  // Inicjalizacja listy losowania z API
  const tbody = document.getElementById('table-body');
  initDrawFromApiData(data.participants);
  tbody.innerHTML = '';

  data.participants.forEach(p => {
    const isComplete = (p.is_complete === true || p.is_complete === "TRUE");
    const isIssued = (p.reward_issued === true || p.reward_issued === "TRUE");

    const statusBadge = isComplete 
      ? `<span class="badge badge-success">Komplet</span>` 
      : `<span class="badge badge-pending">W grze</span>`;

    const rewardBadge = isIssued
      ? `<span class="badge badge-success">Tak</span>`
      : `<span class="badge badge-pending">Nie</span>`;

    // Przycisk "Wydaj Nagrodę" aktywny tylko gdy gracz ma Komplet, a nagroda NIE jest wydana
    const canIssue = (isComplete && !isIssued);
    
    const deleteBtn = `<button class="btn-small btn-danger delete-cmd" data-id="${p.participant_id}" title="Usuń uczestnika" style="padding: 6px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    </button>`;

    const actionBtn = canIssue
      ? `<button class="btn-small issue-cmd" data-id="${p.participant_id}" style="margin-right: 4px; vertical-align: middle;">Wydaj Nagrodę</button>${deleteBtn}`
      : deleteBtn;


    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="draw-check-cell"><input type="checkbox" class="draw-checkbox" data-id="${p.participant_id}" aria-label="Dodaj gracza ${p.nickname} do losowania" ${DRAW_PARTICIPANTS.has(String(p.participant_id)) ? "checked" : ""}></td>
      <td><strong>${p.nickname}</strong><br><small style="color:var(--clr-text-muted)">${p.first_name_last_name}</small></td>
      <td>${p.school_name}</td>
      <td>${p.codes_collected_count}</td>
      <td>${statusBadge}</td>
      <td id="reward-cell-${p.participant_id}">${rewardBadge}</td>
      <td id="action-cell-${p.participant_id}">${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });

  // Dodajemy event listenery delegegowanie dla renderowanych buttonów
  document.querySelectorAll('.draw-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', async function() {
      this.disabled = true;
      const participantId = this.getAttribute('data-id');
      const participant = data.participants.find((item) => String(item.participant_id) === String(participantId));
      if (!participant) {
        this.disabled = false;
        return;
      }

      const previousValue = !this.checked;
      const saved = await setDrawParticipant(participant, this.checked);
      if (!saved) {
        this.checked = previousValue;
      }
      this.disabled = false;
    });
  });

  renderDrawParticipants();

  document.querySelectorAll('.issue-cmd').forEach(btn => {
    btn.addEventListener('click', async function() {
       const pid = this.getAttribute('data-id');
       this.innerText = "Zapisuję...";
       this.disabled = true;

       const res = await fetchAPI("issue_reward", { pin: CURRENT_PIN, participant_id: pid });
       
       if (res.status === "success") {
          showToast(res.message);
          document.getElementById(`reward-cell-${pid}`).innerHTML = `<span class="badge badge-success">Tak</span>`;
          this.remove();
       } else {
          showToast(res.message, true);
          this.innerText = "Wydaj Nagrodę";
          this.disabled = false;
       }
    });
  });

  document.querySelectorAll('.delete-cmd').forEach(btn => {
    btn.addEventListener('click', async function() {
      const pid = this.getAttribute('data-id');
      if (!confirm("Czy na pewno chcesz usunąć tego uczestnika? Ta operacja usunie również jego wszystkie skany i jest nieodwracalna.")) {
        return;
      }
      
      const originalHtml = this.innerHTML;
      this.innerText = "...";
      this.disabled = true;

      const res = await fetchAPI("delete_participant", { pin: CURRENT_PIN, participant_id: pid });
      
      if (res.status === "success") {
        showToast("Uczestnik został usunięty.");
        const refreshRes = await fetchAPI("get_admin_data", { pin: CURRENT_PIN });
        if (refreshRes.status === "success") {
          renderData(refreshRes.data);
        }
      } else {
        showToast(res.message, true);
        this.innerHTML = originalHtml;
        this.disabled = false;
      }
    });
  });
}

// --- Logout ---
document.getElementById('btn-logout').addEventListener('click', () => {
  CURRENT_PIN = "";
  clearSession();
  showView('login');
  document.getElementById('admin-pin').value = '';
  showToast('Wylogowano.');
  stopAutoRefresh();
});

function startAutoRefresh() {
  if (adminAutoRefreshInterval) return;
  adminAutoRefreshInterval = setInterval(async () => {
    if (!CURRENT_PIN) return;
    const res = await fetchAPI("get_admin_data", { pin: CURRENT_PIN });
    if (res.status === "success") {
      renderData(res.data);
    }
  }, 10000); // 10s
}

function stopAutoRefresh() {
  if (adminAutoRefreshInterval) {
    clearInterval(adminAutoRefreshInterval);
    adminAutoRefreshInterval = null;
  }
}


// --- Auto-login from saved session ---
(async function restoreSession() {
  const savedPin = getSavedSession();
  if (!savedPin) return;

  const res = await fetchAPI("get_admin_data", { pin: savedPin });
  if (res.status === "success") {
    CURRENT_PIN = savedPin;
    renderData(res.data);
    showView('admin');
    startAutoRefresh();
  } else {
    clearSession();
  }
})();
