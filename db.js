const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDb, get, all, run } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'car-rental-management-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.use(express.static(path.join(__dirname, 'public')));

const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Non autorizzato. Effettua l\'accesso.' });
  }
  next();
};

const daysBetween = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end - start;
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
};

app.get('/api/session', (req, res) => {
  if (!req.session.user) {
    return res.json({ authenticated: false });
  }

  res.json({ authenticated: true, user: req.session.user });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password richiesti.' });
  }

  if (username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    req.session.user = { username: ADMIN_USERNAME, role: 'admin' };
    return res.json({ success: true, user: req.session.user });
  }

  return res.status(401).json({ error: 'Credenziali non valide.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const [vehicles, customers, bookings, activeRentals, revenue] = await Promise.all([
      all('SELECT COUNT(*) AS total FROM vehicles'),
      all('SELECT COUNT(*) AS total FROM customers'),
      all('SELECT COUNT(*) AS total FROM bookings'),
      all("SELECT COUNT(*) AS total FROM bookings WHERE status IN ('pending', 'confirmed', 'in_rental')"),
      all("SELECT COALESCE(SUM(total_amount), 0) AS total FROM bookings WHERE status IN ('confirmed', 'in_rental', 'completed')")
    ]);

    const monthly = await all(`
      SELECT strftime('%Y-%m', created_at) AS month,
             COUNT(*) AS bookings,
             COALESCE(SUM(total_amount), 0) AS revenue
      FROM bookings
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 6
    `);

    res.json({
      vehicles: vehicles[0]?.total || 0,
      customers: customers[0]?.total || 0,
      bookings: bookings[0]?.total || 0,
      activeRentals: activeRentals[0]?.total || 0,
      revenue: Number(revenue[0]?.total || 0),
      monthly,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vehicles', requireAuth, async (req, res) => {
  try {
    const rows = await all('SELECT * FROM vehicles ORDER BY brand, model');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vehicles', requireAuth, async (req, res) => {
  const { brand, model, plate, year, transmission = 'manual', fuel = 'diesel', category = 'standard', daily_rate, status = 'available', notes = '' } = req.body;

  if (!brand || !model || !plate || !daily_rate) {
    return res.status(400).json({ error: 'Brand, model, targa e tariffa giornaliera sono obbligatori.' });
  }

  try {
    const result = await run(
      `INSERT INTO vehicles (brand, model, plate, year, transmission, fuel, category, daily_rate, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [brand, model, plate, Number(year || 2024), transmission, fuel, category, Number(daily_rate), status, notes]
    );

    res.status(201).json({ id: result.id, message: 'Veicolo aggiunto correttamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/customers', requireAuth, async (req, res) => {
  try {
    const rows = await all('SELECT * FROM customers ORDER BY surname, name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', requireAuth, async (req, res) => {
  const { name, surname, email = '', phone = '', license_number = '' } = req.body;

  if (!name || !surname) {
    return res.status(400).json({ error: 'Nome e cognome sono obbligatori.' });
  }

  try {
    const result = await run(
      `INSERT INTO customers (name, surname, email, phone, license_number) VALUES (?, ?, ?, ?, ?)`,
      [name, surname, email, phone, license_number]
    );

    res.status(201).json({ id: result.id, message: 'Cliente creato correttamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const rows = await all(`
      SELECT b.*, v.brand, v.model, v.plate, c.name AS customer_name, c.surname AS customer_surname,
             COALESCE((SELECT SUM(amount) FROM payments WHERE booking_id = b.id), 0) AS paid_amount
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

app.post('/api/bookings', requireAuth, async (req, res) => {
  const { vehicle_id, customer_id, pickup_date, return_date, daily_rate, deposit = 0, notes = '' } = req.body;

  if (!vehicle_id || !customer_id || !pickup_date || !return_date) {
    return res.status(400).json({ error: 'Veicolo, cliente, data di ritiro e restituzione sono obbligatori.' });
  }

  try {
    const vehicle = await get('SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
    const customer = await get('SELECT * FROM customers WHERE id = ?', [customer_id]);

    if (!vehicle) return res.status(404).json({ error: 'Veicolo non trovato.' });
    if (!customer) return res.status(404).json({ error: 'Cliente non trovato.' });

    const overlap = await get(
      `SELECT id FROM bookings
       WHERE vehicle_id = ?
         AND status NOT IN ('cancelled', 'completed')
         AND pickup_date <= ?
         AND return_date >= ?`,
      [vehicle_id, return_date, pickup_date]
    );

    if (overlap) {
      return res.status(409).json({ error: 'Veicolo già prenotato nel periodo richiesto.' });
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

app.put('/api/bookings/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status, start_km = null, end_km = null, total_amount = null } = req.body;
  const valid = ['pending', 'confirmed', 'in_rental', 'completed', 'cancelled'];

  if (!valid.includes(status)) {
    return res.status(400).json({ error: 'Stato non valido.' });
  }

  try {
    const booking = await get('SELECT * FROM bookings WHERE id = ?', [id]);
    if (!booking) {
      return res.status(404).json({ error: 'Prenotazione non trovata.' });
    }

    await run(
      `UPDATE bookings
       SET status = ?,
           start_km = ?,
           end_km = ?,
           total_amount = ?
       WHERE id = ?`,
      [status, start_km !== null ? Number(start_km) : booking.start_km, end_km !== null ? Number(end_km) : booking.end_km, total_amount !== null ? Number(total_amount) : booking.total_amount, id]
    );

    if (status === 'completed') {
      await run('UPDATE vehicles SET status = ? WHERE id = ?', ['available', booking.vehicle_id]);
    }

    res.json({ success: true, message: 'Aggiornamento prenotazione completato.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', requireAuth, async (req, res) => {
  const { booking_id, amount, method = 'cash', notes = '' } = req.body;

  if (!booking_id || !amount) {
    return res.status(400).json({ error: 'Prenotazione e importo sono obbligatori.' });
  }

  try {
    const result = await run(
      `INSERT INTO payments (booking_id, amount, method, notes) VALUES (?, ?, ?, ?)`,
      [booking_id, Number(amount), method, notes]
    );

    res.status(201).json({ id: result.id, message: 'Pagamento registrato correttamente.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookings/:id/print', requireAuth, async (req, res) => {
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
    const paidTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(booking.total_amount) - paidTotal;

    const document = `
      <!doctype html>
      <html lang="it">
        <head>
          <meta charset="UTF-8" />
          <title>Contratto di noleggio</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #1f2937; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1d4ed8; padding-bottom: 18px; margin-bottom: 24px; }
            h1, h2 { margin: 0 0 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }
            .box { border: 1px solid #dbe3f0; padding: 14px; border-radius: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #dbe3f0; padding: 10px; text-align: left; }
            .totals { max-width: 300px; margin-left: auto; }
            .actions { margin-top: 28px; }
            button { padding: 10px 16px; background: #1d4ed8; color: white; border: none; border-radius: 8px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>AutoRent Pro</h1>
              <p>Contratto di noleggio auto</p>
            </div>
            <div>
              <strong>Contratto n. ${booking.id}</strong><br />
              Stato: ${booking.status}
            </div>
          </div>

          <div class="grid">
            <div class="box">
              <h2>Dati cliente</h2>
              <p><strong>Cliente:</strong> ${booking.customer_name} ${booking.customer_surname}</p>
              <p><strong>Email:</strong> ${booking.customer_email || '-'}</p>
              <p><strong>Telefono:</strong> ${booking.customer_phone || '-'}</p>
              <p><strong>Patente:</strong> ${booking.license_number || '-'}</p>
            </div>
            <div class="box">
              <h2>Dettagli noleggio</h2>
              <p><strong>Veicolo:</strong> ${booking.brand} ${booking.model}</p>
              <p><strong>Targa:</strong> ${booking.plate}</p>
              <p><strong>Ritiro:</strong> ${booking.pickup_date}</p>
              <p><strong>Restituzione:</strong> ${booking.return_date}</p>
            </div>
          </div>

          <div class="box">
            <h2>Pagamenti</h2>
            <table>
              <thead>
                <tr><th>Data</th><th>Metodo</th><th>Importo</th><th>Note</th></tr>
              </thead>
              <tbody>
                ${payments.length ? payments.map((p) => `
                  <tr>
                    <td>${p.paid_at}</td>
                    <td>${p.method}</td>
                    <td>€ ${Number(p.amount).toFixed(2)}</td>
                    <td>${p.notes || '-'}</td>
                  </tr>
                `).join('') : '<tr><td colspan="4">Nessun pagamento registrato</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="totals box" style="margin-top: 18px;">
            <p><strong>Totale:</strong> € ${Number(booking.total_amount).toFixed(2)}</p>
            <p><strong>Pagato:</strong> € ${paidTotal.toFixed(2)}</p>
            <p><strong>Residuo:</strong> € ${remaining.toFixed(2)}</p>
          </div>

          <div class="actions">
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
    console.log(`AutoRent Pro is running on http://localhost:${PORT}`);
  });
}

start();

process.on('SIGINT', () => {
  console.log('Server closing...');
  process.exit();
});
