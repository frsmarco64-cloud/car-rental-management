const state = {
  vehicles: [],
  customers: [],
  bookings: [],
  dashboard: null,
  activeSection: 'dashboard',
  auth: false,
};

const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const summaryGrid = document.getElementById('summaryGrid');
const monthlyTable = document.getElementById('monthlyTable');
const vehiclesTable = document.getElementById('vehiclesTable');
const customersTable = document.getElementById('customersTable');
const bookingsTable = document.getElementById('bookingsTable');
const customerSelect = document.getElementById('customerSelect');
const vehicleSelect = document.getElementById('vehicleSelect');
const loggedUser = document.getElementById('loggedUser');

const statusMap = {
  pending: 'In attesa',
  confirmed: 'Confermato',
  in_rental: 'In noleggio',
  completed: 'Completato',
  cancelled: 'Annullato',
};

const statusClassMap = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  in_rental: 'status-in_rental',
  completed: 'status-completed',
  cancelled: 'status-cancelled',
};

const formatCurrency = (value) => `€ ${Number(value || 0).toFixed(2)}`;

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Errore durante la richiesta.');
  }

  return data;
}

function setSection(section) {
  state.activeSection = section;
  document.querySelectorAll('.nav-link').forEach((el) => {
    el.classList.toggle('active', el.dataset.section === section);
  });

  document.querySelectorAll('.content-section').forEach((el) => {
    el.classList.toggle('active', el.id === section);
  });
}

function renderSummary(summary) {
  const cards = [
    { label: 'Veicoli', value: summary.vehicles },
    { label: 'Clienti', value: summary.customers },
    { label: 'Prenotazioni', value: summary.bookings },
    { label: 'Noleggi attivi', value: summary.activeRentals },
    { label: 'Entrate', value: formatCurrency(summary.revenue) },
  ];

  summaryGrid.innerHTML = cards
    .map(
      (card) => `
        <div class="summary-card">
          <div class="label">${card.label}</div>
          <div class="value">${card.value}</div>
        </div>
      `
    )
    .join('');

  monthlyTable.innerHTML = (summary.monthly || [])
    .map(
      (entry) => `
        <tr>
          <td>${entry.month}</td>
          <td>${entry.bookings}</td>
          <td>${formatCurrency(entry.revenue)}</td>
        </tr>
      `
    )
    .join('');
}

function renderVehicles() {
  vehiclesTable.innerHTML = state.vehicles
    .map(
      (vehicle) => `
        <tr>
          <td>${vehicle.brand}</td>
          <td>${vehicle.model}</td>
          <td>${vehicle.plate}</td>
          <td>${formatCurrency(vehicle.daily_rate)}</td>
          <td><span class="status-pill ${statusClassMap[vehicle.status] || 'status-confirmed'}">${vehicle.status}</span></td>
        </tr>
      `
    )
    .join('');
}

function renderCustomers() {
  customersTable.innerHTML = state.customers
    .map(
      (customer) => `
        <tr>
          <td>${customer.name}</td>
          <td>${customer.surname}</td>
          <td>${customer.email || '-'}</td>
          <td>${customer.phone || '-'}</td>
          <td>${customer.license_number || '-'}</td>
        </tr>
      `
    )
    .join('');
}

function populateSelects() {
  customerSelect.innerHTML = state.customers
    .map((customer) => `<option value="${customer.id}">${customer.name} ${customer.surname}</option>`)
    .join('');

  vehicleSelect.innerHTML = state.vehicles
    .map((vehicle) => `<option value="${vehicle.id}">${vehicle.brand} ${vehicle.model} - ${vehicle.plate}</option>`)
    .join('');
}

function renderBookings() {
  bookingsTable.innerHTML = state.bookings
    .map((booking) => {
      const actions = [];

      if (booking.status === 'confirmed') {
        actions.push(`<button class="btn btn-success" data-action="pickup" data-id="${booking.id}">Consegna</button>`);
      }

      if (booking.status === 'in_rental') {
        actions.push(`<button class="btn btn-warning" data-action="return" data-id="${booking.id}">Rientro</button>`);
      }

      actions.push(`<button class="btn btn-secondary" data-action="print" data-id="${booking.id}">Stampa</button>`);

      return `
        <tr>
          <td>${booking.customer_name} ${booking.customer_surname}</td>
          <td>${booking.brand} ${booking.model}</td>
          <td>${booking.pickup_date}</td>
          <td>${booking.return_date}</td>
          <td>${formatCurrency(booking.total_amount)}</td>
          <td><span class="status-pill ${statusClassMap[booking.status] || 'status-pending'}">${statusMap[booking.status] || booking.status}</span></td>
          <td class="actions-cell">${actions.join('')}</td>
        </tr>
      `;
    })
    .join('');
}

async function loadDashboard() {
  const summary = await fetchJson('/api/dashboard');
  state.dashboard = summary;
  renderSummary(summary);
}

async function loadVehicles() {
  state.vehicles = await fetchJson('/api/vehicles');
  renderVehicles();
  populateSelects();
}

async function loadCustomers() {
  state.customers = await fetchJson('/api/customers');
  renderCustomers();
  populateSelects();
}

async function loadBookings() {
  state.bookings = await fetchJson('/api/bookings');
  renderBookings();
}

async function refreshAll() {
  await Promise.all([loadDashboard(), loadVehicles(), loadCustomers(), loadBookings()]);
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  try {
    const result = await fetchJson('/api/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    loggedUser.textContent = result.user.username;
    loginError.textContent = '';
    showApp();
    await refreshAll();
  } catch (error) {
    loginError.textContent = error.message;
  }
}

function showApp() {
  loginView.classList.add('hidden');
  appView.classList.remove('hidden');
}

function showLogin() {
  loginView.classList.remove('hidden');
  appView.classList.add('hidden');
}

async function checkSession() {
  try {
    const session = await fetchJson('/api/session');
    if (session.authenticated) {
      loggedUser.textContent = session.user.username;
      showApp();
      await refreshAll();
      return;
    }
    showLogin();
  } catch (error) {
    showLogin();
  }
}

async function handleVehicleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  try {
    await fetchJson('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    event.target.reset();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function handleCustomerSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = Object.fromEntries(formData.entries());

  try {
    await fetchJson('/api/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    event.target.reset();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    ...Object.fromEntries(formData.entries()),
    vehicle_id: Number(formData.get('vehicle_id')),
    customer_id: Number(formData.get('customer_id')),
    daily_rate: Number(formData.get('daily_rate')) || undefined,
    deposit: Number(formData.get('deposit')) || 0,
  };

  try {
    await fetchJson('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    event.target.reset();
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

async function updateBookingStatus(bookingId, status) {
  const payload = { status };

  if (status === 'in_rental') {
    const startKm = prompt('Inserisci il chilometraggio di consegna:', '0');
    if (startKm === null) return;
    payload.start_km = Number(startKm);
  }

  if (status === 'completed') {
    const endKm = prompt('Inserisci il chilometraggio di restituzione:', '0');
    if (endKm === null) return;
    payload.end_km = Number(endKm);
  }

  try {
    await fetchJson(`/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    await refreshAll();
  } catch (error) {
    alert(error.message);
  }
}

function attachBookingActions() {
  document.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;

    const { action, id } = btn.dataset;

    if (action === 'pickup') {
      await updateBookingStatus(id, 'in_rental');
      return;
    }

    if (action === 'return') {
      await updateBookingStatus(id, 'completed');
      return;
    }

    if (action === 'print') {
      window.open(`/api/bookings/${id}/print`, '_blank');
    }
  });
}

async function logout() {
  try {
    await fetchJson('/api/logout', { method: 'POST' });
    showLogin();
  } catch (error) {
    console.error(error);
  }
}

loginForm.addEventListener('submit', handleLogin);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('refreshBtn').addEventListener('click', refreshAll);
document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', () => setSection(link.dataset.section));
});
document.getElementById('vehicleForm').addEventListener('submit', handleVehicleSubmit);
document.getElementById('customerForm').addEventListener('submit', handleCustomerSubmit);
document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
attachBookingActions();
checkSession();
