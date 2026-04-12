const API_URL = "https://pocketbase.zsoiz-czyzew.pl/api/qr-action";
const DRAW_STORAGE_KEY = "qr_admin_draw_participants";

let CURRENT_PIN = "";
const DRAW_PARTICIPANTS = new Map(loadDrawParticipants());

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

function loadDrawParticipants() {
  try {
    const storedValue = localStorage.getItem(DRAW_STORAGE_KEY);
    if (!storedValue) return [];
    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.participant_id)
      .map((item) => [String(item.participant_id), item]);
  } catch (err) {
    return [];
  }
}

function saveDrawParticipants() {
  localStorage.setItem(DRAW_STORAGE_KEY, JSON.stringify(Array.from(DRAW_PARTICIPANTS.values())));
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

function syncDrawParticipants(participants) {
  const currentIds = new Set(participants.map((participant) => String(participant.participant_id)));

  Array.from(DRAW_PARTICIPANTS.keys()).forEach((participantId) => {
    if (!currentIds.has(participantId)) {
      DRAW_PARTICIPANTS.delete(participantId);
    }
  });

  participants.forEach((participant) => {
    const participantId = String(participant.participant_id);
    if (DRAW_PARTICIPANTS.has(participantId)) {
      DRAW_PARTICIPANTS.set(participantId, createDrawParticipantSnapshot(participant));
    }
  });

  saveDrawParticipants();
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
    btn.addEventListener("click", () => {
      const participantId = btn.getAttribute("data-id");
      DRAW_PARTICIPANTS.delete(participantId);
      saveDrawParticipants();
      renderDrawParticipants();

      const checkbox = document.querySelector(`.draw-checkbox[data-id="${participantId}"]`);
      if (checkbox) checkbox.checked = false;
    });
  });
}

function setDrawParticipant(participant, selected) {
  const participantId = String(participant.participant_id);

  if (selected) {
    DRAW_PARTICIPANTS.set(participantId, createDrawParticipantSnapshot(participant));
  } else {
    DRAW_PARTICIPANTS.delete(participantId);
  }

  saveDrawParticipants();
  renderDrawParticipants();
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
  renderData(res.data);
  showView('admin');
  showToast("Zalogowano pomyślnie!");
});

document.getElementById('btn-refresh').addEventListener('click', async () => {
  const btn = document.getElementById('btn-refresh');
  btn.innerText = "Wczytywanie...";
  const res = await fetchAPI("get_admin_data", { pin: CURRENT_PIN });
  btn.innerText = "Odśwież dane";

  if (res.status === "success") {
    renderData(res.data);
    showToast("Dane zostały odświeżone z chmury.");
  } else {
    showToast(res.message, true);
  }
});

function renderData(data) {
  // Statystyki
  document.getElementById('stat-participants').innerText = data.stats.total_participants;
  document.getElementById('stat-completed').innerText = data.stats.completed_participants;
  document.getElementById('stat-scans').innerText = data.stats.total_scans;
  document.getElementById('stat-stations').innerText = data.stats.total_stations;

  // Tabela
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  syncDrawParticipants(data.participants);

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
    const actionBtn = canIssue
      ? `<button class="btn-small issue-cmd" data-id="${p.participant_id}">Wydaj Nagrodę</button>`
      : `<button class="btn-small" disabled>Brak Akcji</button>`;

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
    checkbox.addEventListener('change', function() {
      const participantId = this.getAttribute('data-id');
      const participant = data.participants.find((item) => String(item.participant_id) === String(participantId));
      if (!participant) return;
      setDrawParticipant(participant, this.checked);
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
          document.getElementById(`action-cell-${pid}`).innerHTML = `<button class="btn-small" disabled>Brak Akcji</button>`;
       } else {
          showToast(res.message, true);
          this.innerText = "Wydaj Nagrodę";
          this.disabled = false;
       }
    });
  });
}
