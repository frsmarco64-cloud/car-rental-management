const appState = {
  vehicles: [],
  customers: [],
  bookings: [],
  dashboard: null,
};

const summaryGrid = document.getElementById('summaryGrid');
const vehiclesTable = document.getElementById('vehiclesTable');
const customersTable = document.getElementById('customersTable');
const bookingsTable = document.getElementById('bookingsTable');
const customerSelect = document.getElementById('customerSelect');
const vehicleSelect = document.getElementById('vehicleSelect');

const formatCurrency = (value) => `€ ${Number(value || 0).toFixed(2)}`;

const statusClassMap = {
  pending: 'status-pending',
  confirmed: 'status-confirmed',
  in_rental: 'status-in_rental',
  completed: 'status-completed',
  cancelled: 'status-cancelled',
};

const statusLabels = {
  pending: 'In attesa',
  confirmed: 'Confermato',
  in_rental: 'In noleggio',
  completed: 'Completato',
  cancelled: 'Annullato',
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Errore durante la richiesta.');
  }

  return data;
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
}

function renderVehicles() {
  vehiclesTable.innerHTML = appState.vehicles
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
  customersTable.innerHTML = appState.customers
    .map(
      (customer) => `
        <tr>
          <td>${customer.name}</td>
          <td>${customer.surname}</td>
          <td>${customer.email || '-'}</td>
          <td>${customer.phone || '-'}</td>
        </tr>
      `
    )
    .join('');
}

function populateSelects() {
  customerSelect.innerHTML = appState.customers
    .map((customer) => `<option value="${customer.id}">${customer.name} ${customer.surname}</option>`)
    .join('');

  vehicleSelect.innerHTML = appState.vehicles
    .map((vehicle) => `<option value="${vehicle.id}">${vehicle.brand} ${vehicle.model} - ${vehicle.plate}</option>`)
    .join('');
}

function renderBookings() {
  bookingsTable.innerHTML = appState.bookings
    .map((booking) => {
      const actions = [];

      if (booking.status === 'confirmed') {
        actions.push(`<button class="btn btn-success" data-action="pickup" data-id="${booking.id}">Consegna</button>`);
      }

      if (booking.status === 'in_rental') {
        actions.push(`<button class="btn btn-warning" data-action="return" data-id="${booking.id}">Rientro</button>`);
      }

      actions.push(`<button class="btn btn-primary" data-action="print" data-id="${booking.id}">Stampa</button>`);

      return `
        <tr>
          <td>${booking.customer_name} ${booking.customer_surname}</td>
          <td>${booking.brand} ${booking.model}</td>
          <td>${booking.pickup_date}</td>
          <td>${booking.return_date}</td>
          <td>${formatCurrency(booking.total_amount)}</td>
          <td><span class="status-pill ${statusClassMap[booking.status] || 'status-pending'}">${statusLabels[booking.status] || booking.status}</span></td>
          <td class="actions-cell">${actions.join('')}</td>
        </tr>
      `;
    })
    .join('');
}

async function loadDashboard() {
  const summary = await fetchJson('/api/dashboard');
  appState.dashboard = summary;
  renderSummary(summary);
}

async function loadVehicles() {
  appState.vehicles = await fetchJson('/api/vehicles');
  renderVehicles();
  populateSelects();
}

async function loadCustomers() {
  appState.customers = await fetchJson('/api/customers');
  renderCustomers();
  populateSelects();
}

async function loadBookings() {
  appState.bookings = await fetchJson('/api/bookings');
  renderBookings();
}

async function refreshAll() {
  await Promise.all([loadDashboard(), loadVehicles(), loadCustomers(), loadBookings()]);
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
    const km = prompt('Inserisci il chilometraggio di consegna:', '0');
    if (km === null) return;
    payload.start_km = Number(km);
  }

  if (status === 'completed') {
    const km = prompt('Inserisci il chilometraggio di restituzione:', '0');
    if (km === null) return;
    payload.end_km = Number(km);
  }

  await fetchJson(`/api/bookings/${bookingId}/status`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  await refreshAll();
}

function attachBookingActions() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const { action, id } = button.dataset;

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

document.getElementById('vehicleForm').addEventListener('submit', handleVehicleSubmit);
document.getElementById('customerForm').addEventListener('submit', handleCustomerSubmit);
document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
document.getElementById('refreshBtn').addEventListener('click', refreshAll);
attachBookingActions();

refreshAll();
