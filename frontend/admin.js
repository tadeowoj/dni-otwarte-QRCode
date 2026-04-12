const API_URL = "https://pocketbase.zsoiz-czyzew.pl/api/qr-action";

let CURRENT_PIN = "";

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
