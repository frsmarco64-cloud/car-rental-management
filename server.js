const express = require('express');
const path = require('path');
const { initDb, get, all, run } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const daysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end - start;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
};

app.get('/api/dashboard', async (req, res) => {
  try {
    const vehicles = await all('SELECT COUNT(*) AS total FROM vehicles');
    const customers = await all('SELECT COUNT(*) AS total FROM customers');
    const bookings = await all('SELECT COUNT(*) AS total FROM bookings');
    const activeRentals = await all("SELECT COUNT(*) AS total FROM bookings WHERE status IN ('pending', 'confirmed', 'in_rental')");
    const revenue = await all('SELECT COALESCE(SUM(total_amount), 0) AS total FROM bookings WHERE status IN (\'confirmed\', \'in_rental\', \'completed\')');

    res.json({
      vehicles: vehicles[0]?.total || 0,
      customers: customers[0]?.total || 0,
      bookings: bookings[0]?.total || 0,
      activeRentals: activeRentals[0]?.total || 0,
      revenue: Number(revenue[0]?.total || 0),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vehicles', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM vehicles ORDER BY brand, model');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vehicles', async (req, res) => {
  const {
    brand,
    model,
    plate,
    year,
    transmission = 'manual',
    fuel = 'diesel',
    category = 'standard',
    daily_rate,
    status = 'available',
    notes = '',
  } = req.body;

  if (!brand || !model || !plate || !daily_rate) {
    return res.status(400).json({ error: 'Brand, model, plate e tariffa giornaliera sono obbligatori.' });
  }

  try {
    const result = await run(
      `INSERT INTO vehicles (brand, model, plate, year, transmission, fuel, category, daily_rate, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [brand, model, plate, Number(year || 2024), transmission, fuel, category, Number(daily_rate), status, notes]
    );

    res.status(201).json({ id: result.id, message: 'Veicolo creato correttamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/customers', async (req, res) => {
  try {
    const rows = await all('SELECT * FROM customers ORDER BY surname, name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  const { name, surname, email = '', phone = '', license_number = '' } = req.body;

  if (!name || !surname) {
    return res.status(400).json({ error: 'Nome e cognome sono obbligatori.' });
  }

  try {
    const result = await run(
      `INSERT INTO customers (name, surname, email, phone, license_number) VALUES (?, ?, ?, ?, ?)`,
      [name, surname, email, phone, license_number]
    );

    res.status(201).json({ id: result.id, message: 'Cliente registrato correttamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const rows = await all(`
      SELECT b.*, v.brand, v.model, v.plate, v.daily_rate AS vehicle_daily_rate,
             c.name AS customer_name, c.surname AS customer_surname, c.phone AS customer_phone
      FROM bookings b
      JOIN vehicles v ON v.id = b.vehicle_id
      JOIN customers c ON c.id = b.customer_id
      ORDER BY b.pickup_date DESC
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  const {
    vehicle_id,
    customer_id,
    pickup_date,
    return_date,
    daily_rate,
    deposit = 0,
    notes = '',
  } = req.body;

  if (!vehicle_id || !customer_id || !pickup_date || !return_date) {
    return res.status(400).json({ error: 'Veicolo, cliente, data di ritiro e data di restituzione sono obbligatori.' });
  }

  try {
    const vehicle = await get('SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
    const customer = await get('SELECT * FROM customers WHERE id = ?', [customer_id]);

    if (!vehicle) {
      return res.status(404).json({ error: 'Veicolo non trovato.' });
    }

    if (!customer) {
      return res.status(404).json({ error: 'Cliente non trovato.' });
    }

    const overlap = await get(
      `SELECT id FROM bookings
       WHERE vehicle_id = ?
         AND status NOT IN ('cancelled', 'completed')
         AND pickup_date <= ?
         AND return_date >= ?`,
      [vehicle_id, return_date, pickup_date]
    );

    if (overlap) {
      return res.status(409).json({ error: 'Il veicolo non è disponibile nel periodo richiesto.' });
    }

    const rate = Number(daily_rate || vehicle.daily_rate);
    const rentalDays = daysBetween(pickup_date, return_date);
    const totalAmount = Number((rate * rentalDays + Number(deposit)).toFixed(2));

    const result = await run(
      `INSERT INTO bookings (vehicle_id, customer_id, pickup_date, return_date, daily_rate, deposit, total_amount, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
      [vehicle_id, customer_id, pickup_date, return_date, rate, Number(deposit), totalAmount, notes]
    );

    res.status(201).json({ id: result.id, message: 'Prenotazione creata correttamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, start_km = null, end_km = null, total_amount = null } = req.body;
  const validStatus = ['pending', 'confirmed', 'in_rental', 'completed', 'cancelled'];

  if (!validStatus.includes(status)) {
    return res.status(400).json({ error: 'Stato non valido.' });
  }

  try {
    const booking = await get('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata.' });
    }

    const finalStartKm = start_km !== null ? Number(start_km) : booking.start_km;
    const finalEndKm = end_km !== null ? Number(end_km) : booking.end_km;
    const finalTotal = total_amount !== null ? Number(total_amount) : booking.total_amount;

    await run(
      `UPDATE bookings
       SET status = ?,
           start_km = ?,
           end_km = ?,
           total_amount = ?
       WHERE id = ?`,
      [status, finalStartKm, finalEndKm, finalTotal, id]
    );

    res.json({ success: true, message: 'Stato prenotazione aggiornato.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', async (req, res) => {
  const { booking_id, amount, method = 'cash', notes = '' } = req.body;

  if (!booking_id || !amount) {
    return res.status(400).json({ error: 'ID prenotazione e importo sono obbligatori.' });
  }

  try {
    const result = await run(
      `INSERT INTO payments (booking_id, amount, method, notes) VALUES (?, ?, ?, ?)`,
      [booking_id, Number(amount), method, notes]
    );

    res.status(201).json({ id: result.id, message: 'Pagamento registrato.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookings/:id/print', async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await get(`
      SELECT b.*, v.brand, v.model, v.plate, v.daily_rate AS vehicle_daily_rate,
             c.name AS customer_name, c.surname AS customer_surname,
             c.email AS customer_email, c.phone AS customer_phone, c.license_number
      FROM bookings b
      JOIN vehicles v ON v.id = b.vehicle_id
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = ?
    `, [id]);

    if (!booking) {
      return res.status(404).send('Prenotazione non trovata.');
    }

    const payments = await all('SELECT * FROM payments WHERE booking_id = ? ORDER BY paid_at DESC', [id]);
    const paidTotal = payments.reduce((sum, item) => sum + Number(item.amount), 0);
    const remaining = Number(booking.total_amount) - paidTotal;

    const document = `
      <!doctype html>
      <html lang="it">
        <head>
          <meta charset="UTF-8" />
          <title>Contratto noleggio - ${booking.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #1b1b1b;
              margin: 40px;
            }
            h1, h2 { margin-bottom: 12px; }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 18px;
              margin-bottom: 24px;
            }
            .section {
              margin-bottom: 22px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .box {
              border: 1px solid #d1d5db;
              padding: 12px;
              border-radius: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 8px;
              text-align: left;
            }
            .totals {
              width: 260px;
              margin-left: auto;
            }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Car Rental Management</h1>
              <p>Documento di noleggio auto</p>
            </div>
            <div>
              <strong>Contratto n. ${booking.id}</strong><br />
              Stato: ${booking.status}
            </div>
          </div>

          <div class="section">
            <h2>Dati cliente</h2>
            <div class="grid">
              <div class="box">
                <strong>Cliente:</strong> ${booking.customer_name} ${booking.customer_surname}<br />
                <strong>Email:</strong> ${booking.customer_email || '-'}<br />
                <strong>Telefono:</strong> ${booking.customer_phone || '-'}
              </div>
              <div class="box">
                <strong>Patente:</strong> ${booking.license_number || '-'}<br />
                <strong>Data ritiro:</strong> ${booking.pickup_date}<br />
                <strong>Data restituzione:</strong> ${booking.return_date}
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Veicolo</h2>
            <div class="box">
              <strong>Marca/Modello:</strong> ${booking.brand} ${booking.model}<br />
              <strong>Targa:</strong> ${booking.plate}<br />
              <strong>Tariffa giornaliera:</strong> € ${Number(booking.vehicle_daily_rate).toFixed(2)}
            </div>
          </div>

          <div class="section">
            <h2>Pagamenti</h2>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Metodo</th>
                  <th>Importo</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                ${payments.length ? payments.map((payment) => `
                  <tr>
                    <td>${payment.paid_at}</td>
                    <td>${payment.method}</td>
                    <td>€ ${Number(payment.amount).toFixed(2)}</td>
                    <td>${payment.notes || '-'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4">Nessun pagamento registrato</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="totals section">
            <div class="box">
              <p><strong>Totale contratto:</strong> € ${Number(booking.total_amount).toFixed(2)}</p>
              <p><strong>Pagato:</strong> € ${paidTotal.toFixed(2)}</p>
              <p><strong>Residuo:</strong> € ${remaining.toFixed(2)}</p>
            </div>
          </div>

          <div class="no-print" style="margin-top: 30px;">
            <button onclick="window.print()">Stampa documento</button>
          </div>
        </body>
      </html>
    `;

    res.send(document);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Car rental app is running on http://localhost:${PORT}`);
  });
}

start();
