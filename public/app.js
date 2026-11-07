:root {
  --bg: #f3f6fb;
  --panel: #ffffff;
  --sidebar: #0f172a;
  --sidebar-alt: #111827;
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --success: #16a34a;
  --warning: #ea580c;
  --danger: #dc2626;
  --muted: #64748b;
  --line: #e2e8f0;
  --text: #0f172a;
  --shadow: 0 16px 42px rgba(15, 23, 42, 0.08);
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  min-height: 100%;
  font-family: Inter, Arial, sans-serif;
  background: linear-gradient(180deg, #eef4ff 0%, #f7f9fc 100%);
  color: var(--text);
}

button, input, select, textarea {
  font: inherit;
}

button {
  border: none;
  cursor: pointer;
}

.hide {
  display: none !important;
}

.hidden {
  display: none !important;
}

.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at top left, #dbeafe 0%, #eef4ff 30%, #f8fafc 100%);
}

.auth-card {
  width: min(100%, 460px);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 22px;
  box-shadow: var(--shadow);
  padding: 30px;
}

.auth-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 22px;
}

.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
  font-weight: 800;
  font-size: 1.4rem;
}

.brand-mark.large {
  width: 54px;
  height: 54px;
  font-size: 1.7rem;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--primary);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.72rem;
}

h1, h2, h3, p {
  margin-top: 0;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.auth-form label,
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.82rem;
  color: var(--muted);
  font-weight: 600;
}

input, select, textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  padding: 11px 12px;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus, select:focus, textarea:focus {
  border-color: rgba(37, 99, 235, 0.6);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 10px 16px;
  border-radius: 10px;
  font-weight: 700;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn-block {
  width: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: white;
}

.btn-secondary {
  background: rgba(15, 23, 42, 0.08);
  color: var(--text);
}

.btn-success {
  background: var(--success);
  color: white;
}

.btn-warning {
  background: var(--warning);
  color: white;
}

.form-message {
  min-height: 18px;
  font-size: 0.82rem;
}

.form-message.error {
  color: var(--danger);
}

.app-shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 270px;
  background: linear-gradient(180deg, var(--sidebar) 0%, var(--sidebar-alt) 100%);
  color: white;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
}

.brand-box {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 10px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 26px;
}

.nav-link {
  text-align: left;
  padding: 12px 14px;
  border-radius: 10px;
  background: transparent;
  color: rgba(255,255,255,0.85);
  border: 1px solid transparent;
  font-weight: 600;
}

.nav-link.active {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.12);
}

.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid rgba(255,255,255,0.12);
  padding-top: 18px;
}

.sidebar-footer p {
  margin-bottom: 8px;
  color: rgba(255,255,255,0.7);
}

.main-panel {
  flex: 1;
  padding: 24px;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.content-section {
  display: none;
}

.content-section.active {
  display: block;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 18px;
  margin-bottom: 24px;
}

.summary-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 20px;
}

.summary-card .label {
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  font-weight: 700;
}

.summary-card .value {
  margin-top: 12px;
  font-size: clamp(1.8rem, 2vw, 2.4rem);
  font-weight: 800;
}

.panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 20px;
  margin-bottom: 22px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.panel-header h3 {
  margin-bottom: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px 18px;
}

.full-width {
  grid-column: 1 / -1;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
}

th, td {
  padding: 12px 10px;
  border-bottom: 1px solid var(--line);
  text-align: left;
}

th {
  color: var(--muted);
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.06em;
}

.status-pill {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-pending { background: #dbeafe; color: #1d4ed8; }
.status-confirmed { background: #dcfce7; color: #166534; }
.status-in_rental { background: #fef3c7; color: #92400e; }
.status-completed { background: #f3e8ff; color: #6b21a8; }
.status-cancelled { background: #fee2e2; color: #991b1b; }

.actions-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mini-table {
  min-width: 100%;
}

@media (max-width: 900px) {
  .app-shell {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
  }

  .main-panel {
    padding: 18px 16px 24px;
  }
}
