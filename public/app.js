* {
  box-sizing: border-box;
}

:root {
  --bg: #f3f7ff;
  --panel: #ffffff;
  --primary: #1d4ed8;
  --primary-dark: #1e3a8a;
  --success: #15803d;
  --warning: #c2410c;
  --muted: #64748b;
  --border: #dbe3f0;
  --text: #0f172a;
}

body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
}

.topbar {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.brand h1 {
  margin: 0;
  font-size: 1.8rem;
}

.container {
  max-width: 1280px;
  margin: 24px auto;
  padding: 0 20px 40px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 18px;
  margin-bottom: 28px;
}

.summary-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.04);
}

.summary-card .label {
  color: var(--muted);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.summary-card .value {
  margin-top: 14px;
  font-size: 2rem;
  font-weight: bold;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.02);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.panel-header h2 {
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

label {
  display: block;
  font-size: 0.82rem;
  margin-bottom: 8px;
  color: var(--muted);
  font-weight: 600;
}

input,
select,
textarea,
button {
  font: inherit;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  background: white;
  color: var(--text);
}

textarea {
  resize: vertical;
}

.full-width {
  grid-column: 1 / -1;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  font-weight: 600;
  transition: 0.2s ease;
}

.btn:hover {
  opacity: 0.96;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-success {
  background: var(--success);
  color: white;
}

.btn-warning {
  background: var(--warning);
  color: white;
}

.table-wrap {
  overflow-x: auto;
  margin-top: 18px;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
}

th,
td {
  border-bottom: 1px solid var(--border);
  padding: 12px 10px;
  text-align: left;
}

th {
  background: #f8fafc;
  color: var(--muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-pill {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
}

.status-pending {
  background: #e0f2fe;
  color: #0369a1;
}

.status-confirmed {
  background: #dcfce7;
  color: #166534;
}

.status-in_rental {
  background: #fef3c7;
  color: #92400e;
}

.status-completed {
  background: #f3e8ff;
  color: #6b21a8;
}

.status-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.actions-cell {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

@media (max-width: 680px) {
  .topbar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .container {
    padding: 0 12px 32px;
  }
}
