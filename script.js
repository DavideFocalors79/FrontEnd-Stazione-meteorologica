/* ═══════════════════════════════════════════════════════════════
   script.js — Weather Station
   • Sidebar con selezione stazione (da stations.js)
   • AuthManager (auth.js)
   • ThingsBoard API helper
   • Grafici Chart.js
   • Pannello Admin (solo ruolo admin)
════════════════════════════════════════════════════════════════ */

/* ── ThingsBoard API helper ─────────────────────────────────── */

class ThingsBoardAPI {
    constructor(stationConfig = {}) {
        /* Merge CONFIG globale con override della stazione */
        this.cfg = {
            ...CONFIG.thingsboard,
            ...stationConfig
        };
        this.baseUrl  = this.cfg.url || CONFIG.thingsboard.url;
        this.jwtToken = null;
        this.tokenExp = 0;
    }

    get isConfigured() {
        const hasCredentials = this.cfg.username && !this.cfg.username.startsWith('YOUR_');
        const hasStatic      = this.cfg.staticToken && this.cfg.staticToken.length > 10;
        const hasDevice      = this.cfg.deviceId && !this.cfg.deviceId.startsWith('YOUR_');
        return (hasCredentials || hasStatic) && hasDevice;
    }

    async _getToken() {
        if (this.cfg.staticToken && this.cfg.staticToken.length > 10) {
            return this.cfg.staticToken;
        }
        if (this.jwtToken && Date.now() < this.tokenExp - 60000) {
            return this.jwtToken;
        }
        const res = await fetch(`${this.baseUrl}/api/auth/login`, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({ username: this.cfg.username, password: this.cfg.password })
        });
        if (!res.ok) throw new Error(`ThingsBoard login fallito (${res.status})`);
        const data = await res.json();
        this.jwtToken = data.token;
        try {
            const payload = JSON.parse(atob(data.token.split('.')[1]));
            this.tokenExp = payload.exp * 1000;
        } catch {
            this.tokenExp = Date.now() + 3600000;
        }
        return this.jwtToken;
    }

    async _fetch(path, params = {}) {
        const token = await this._getToken();
        const url   = new URL(`${this.baseUrl}${path}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const res = await fetch(url.toString(), {
            headers: {
                'X-Authorization': `Bearer ${token}`,
                'Content-Type'   : 'application/json'
            }
        });
        if (res.status === 401) { this.jwtToken = null; throw new Error('Token scaduto, riprovo...'); }
        if (!res.ok) throw new Error(`ThingsBoard API error ${res.status}`);
        return res.json();
    }

    async getLatestTelemetry() {
        const keys = Object.values(CONFIG.thingsboard.telemetryKeys).join(',');
        const path = `/api/plugins/telemetry/DEVICE/${this.cfg.deviceId}/values/timeseries`;
        return this._fetch(path, { keys });
    }

    async getHistoricalTelemetry(windowMs = CONFIG.update.historyInterval) {
        const endTs   = Date.now();
        const startTs = endTs - windowMs;
        const keys    = Object.values(CONFIG.thingsboard.telemetryKeys).join(',');
        const path    = `/api/plugins/telemetry/DEVICE/${this.cfg.deviceId}/values/timeseries`;
        return this._fetch(path, { keys, startTs, endTs, limit: 1000, agg: 'NONE' });
    }
}

/* ── Sidebar ───────────────────────────────────────────────── */

class Sidebar {
    constructor(onStationSelect) {
        this.sidebar         = document.getElementById('sidebar');
        this.backdrop        = document.getElementById('sidebarBackdrop');
        this.openBtn         = document.getElementById('sidebarOpenBtn');
        this.closeBtn        = document.getElementById('sidebarCloseBtn');
        this.stationsToggle  = document.getElementById('stationsToggle');
        this.stationList     = document.getElementById('stationList');
        this.onStationSelect = onStationSelect;

        this._bindEvents();
    }

    _bindEvents() {
        /* Mobile open/close */
        this.openBtn?.addEventListener('click',    () => this.open());
        this.closeBtn?.addEventListener('click',   () => this.close());
        this.backdrop?.addEventListener('click',   () => this.close());

        /* Accordion stazioni */
        this.stationsToggle?.addEventListener('click', () => this._toggleAccordion());
        this.stationsToggle?.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._toggleAccordion(); }
        });
    }

    open() {
        this.sidebar.classList.add('open');
        this.backdrop.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.sidebar.classList.remove('open');
        this.backdrop.classList.remove('visible');
        document.body.style.overflow = '';
    }

    _toggleAccordion() {
        const expanded = this.stationsToggle.getAttribute('aria-expanded') === 'true';
        this.stationsToggle.setAttribute('aria-expanded', String(!expanded));
    }

    /** Renderizza la lista stazioni dal registro STATIONS */
    render(activeId) {
        this.stationList.innerHTML = STATIONS.map(station => `
            <li class="sidebar-station-item" role="option"
                aria-selected="${station.id === activeId}">
                <button
                    class="sidebar-station-btn ${station.id === activeId ? 'active' : ''}"
                    data-station-id="${this._esc(station.id)}"
                    aria-label="Seleziona stazione ${this._esc(station.name)}"
                    style="${station.color ? `--station-color:${station.color}` : ''}">
                    <span class="station-btn-icon" style="${station.color ? `color:${station.color}` : ''}">
                        <i class="${station.icon || 'fas fa-tower-broadcast'}"></i>
                    </span>
                    <span class="station-btn-text">
                        <span class="station-btn-name">${this._esc(station.name)}</span>
                        <span class="station-btn-loc">${this._esc(station.location)}</span>
                    </span>
                    <span class="station-status-pip ${station.status || 'online'}"
                        title="${this._statusLabel(station.status)}"></span>
                </button>
            </li>
        `).join('');

        /* Bind click */
        this.stationList.querySelectorAll('.sidebar-station-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id      = btn.dataset.stationId;
                const station = STATIONS.find(s => s.id === id);
                if (station) {
                    this._setActive(id);
                    this.onStationSelect(station);
                    /* Su mobile chiude la sidebar dopo la selezione */
                    if (window.innerWidth <= 900) this.close();
                }
            });
        });
    }

    _setActive(id) {
        this.stationList.querySelectorAll('.sidebar-station-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.stationId === id);
        });
        this.stationList.querySelectorAll('li[role="option"]').forEach(li => {
            const btn = li.querySelector('.sidebar-station-btn');
            li.setAttribute('aria-selected', String(btn?.dataset.stationId === id));
        });
    }

    /** Aggiorna il box info stazione sotto la lista */
    updateInfo(station) {
        document.getElementById('infoLocation').textContent  = station.location || '—';
        document.getElementById('infoAltitude').textContent  = station.altitude || '—';
        const statusText = this._statusLabel(station.status);
        document.getElementById('infoStatus').textContent    = statusText;
        const dot = document.getElementById('infoStatusDot');
        dot.className = `fas fa-circle-dot station-status-dot ${station.status || 'online'}`;
    }

    _statusLabel(status) {
        const map = { online: 'Online', offline: 'Offline', maintenance: 'Manutenzione' };
        return map[status] || 'Sconosciuto';
    }

    _esc(str) {
        return String(str)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
}

/* ── Admin UI ───────────────────────────────────────────────── */

class AdminPanel {
    constructor() {
        this.modal      = document.getElementById('adminModal');
        this.closeBtn   = document.getElementById('closeAdmin');
        this.createBtn  = document.getElementById('createUserBtn');
        this.usernameIn = document.getElementById('newUsername');
        this.passwordIn = document.getElementById('newPassword');
        this.roleSelect = document.getElementById('newRole');
        this.msg        = document.getElementById('createUserMsg');
        this.listEl     = document.getElementById('usersList');

        this._bindEvents();
    }

    _bindEvents() {
        this.closeBtn.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', e => { if (e.target === this.modal) this.hide(); });
        this.createBtn.addEventListener('click', () => this._handleCreate());
        [this.usernameIn, this.passwordIn].forEach(el => {
            el.addEventListener('keydown', e => { if (e.key === 'Enter') this._handleCreate(); });
        });
    }

    show() {
        this.modal.classList.add('show');
        this._renderUserList();
        this.usernameIn.focus();
    }
    hide() {
        this.modal.classList.remove('show');
        this._clearForm();
    }
    _clearForm() {
        this.usernameIn.value = '';
        this.passwordIn.value = '';
        this.roleSelect.value = 'user';
        this._setMsg('', '');
    }
    _setMsg(text, type = 'error') {
        this.msg.textContent = text;
        this.msg.className   = `admin-msg ${type}`;
    }

    async _handleCreate() {
        const username = this.usernameIn.value.trim();
        const password = this.passwordIn.value;
        const role     = this.roleSelect.value;
        this._setMsg('Creazione in corso...', 'info');
        this.createBtn.disabled = true;
        try {
            await auth.createUser(username, password, role);
            this._setMsg(`Utente "${username}" (${role}) creato con successo`, 'success');
            this._clearForm();
            await this._renderUserList();
        } catch (err) {
            this._setMsg(err.message, 'error');
        } finally {
            this.createBtn.disabled = false;
        }
    }

    async _renderUserList() {
        this.listEl.innerHTML = '<p class="no-users">Caricamento...</p>';
        let users;
        try {
            users = await auth.listUsers();
        } catch (err) {
            this.listEl.innerHTML = `<p class="no-users">Errore: ${err.message}</p>`;
            return;
        }

        const session = auth.getSession();
        if (!users || users.length === 0) {
            this.listEl.innerHTML = '<p class="no-users">Nessun utente</p>';
            return;
        }

        this.listEl.innerHTML = users.map(u => {
            const roleIcon = u.role === 'admin'
                ? '<i class="fas fa-key user-icon-i"></i>'
                : '<i class="fas fa-user user-icon-i"></i>';
            const dateStr  = u.created_at ? new Date(u.created_at).toLocaleDateString('it-IT') : '';
            const action   = u.username !== session?.username
                ? `<button class="btn-delete" data-user="${this._esc(u.username)}"
                       aria-label="Elimina ${this._esc(u.username)}">
                       <i class="fas fa-trash"></i>
                   </button>`
                : '<span class="user-you">(tu)</span>';
            return `
                <div class="user-row">
                    <div class="user-info">
                        ${roleIcon}
                        <span class="user-name">${this._esc(u.username)}</span>
                        <span class="user-role ${u.role}">${u.role}</span>
                    </div>
                    <div class="user-meta">
                        <span class="user-date">${dateStr}</span>
                        ${action}
                    </div>
                </div>`;
        }).join('');

        this.listEl.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this._handleDelete(btn.dataset.user));
        });
    }

    async _handleDelete(username) {
        if (!confirm(`Eliminare l'utente "${username}"?`)) return;
        try {
            await auth.deleteUser(username);
            await this._renderUserList();
        } catch (err) {
            this._setMsg(err.message, 'error');
        }
    }

    _esc(str) {
        return String(str)
            .replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
    }
}

/* ── Login UI ───────────────────────────────────────────────── */

class LoginUI {
    constructor() {
        this.overlay    = document.getElementById('loginOverlay');
        this.usernameIn = document.getElementById('loginUsername');
        this.passwordIn = document.getElementById('loginPassword');
        this.loginBtn   = document.getElementById('loginBtn');
        this.loginBtnTx = document.getElementById('loginBtnText');
        this.spinner    = document.getElementById('loginSpinner');
        this.errorEl    = document.getElementById('loginError');
        this.togglePw   = document.getElementById('togglePw');
        this.toggleIcon = document.getElementById('togglePwIcon');
        this._bindEvents();
    }

    _bindEvents() {
        this.loginBtn.addEventListener('click', () => this._handleLogin());
        [this.usernameIn, this.passwordIn].forEach(el => {
            el.addEventListener('keydown', e => { if (e.key === 'Enter') this._handleLogin(); });
        });
        this.togglePw.addEventListener('click', () => {
            const isPw = this.passwordIn.type === 'password';
            this.passwordIn.type      = isPw ? 'text' : 'password';
            this.toggleIcon.className = isPw ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }

    _setLoading(on) {
        this.loginBtn.disabled      = on;
        this.loginBtnTx.textContent = on ? 'Accesso…' : 'Accedi';
        this.spinner.style.display  = on ? 'inline-block' : 'none';
    }

    _setError(msg) {
        this.errorEl.textContent   = msg;
        this.errorEl.style.display = msg ? 'block' : 'none';
    }

    async _handleLogin() {
        const username = this.usernameIn.value.trim();
        const password = this.passwordIn.value;
        this._setError('');
        this._setLoading(true);
        try {
            await auth.login(username, password);
            this.overlay.classList.add('fade-out');
            setTimeout(() => {
                this.overlay.style.display = 'none';
                document.getElementById('appContainer').style.display = 'flex';
                window.weatherStation.onAuthReady();
            }, 400);
        } catch (err) {
            this._setError(err.message);
            this.passwordIn.value = '';
        } finally {
            this._setLoading(false);
        }
    }

    show() {
        this.overlay.style.display = 'flex';
        this.usernameIn.focus();
    }
}

/* ── WeatherStation ─────────────────────────────────────────── */

class WeatherStation {
    constructor() {
        this.charts         = {};
        this.historicalData = {
            temperature: [], humidity: [], pressure: [],
            windSpeed: [], windDirection: [], timestamps: []
        };
        this.currentData    = {};
        this.updateInterval = null;
        this.tempUnit       = localStorage.getItem('tempUnit') || 'C';

        /* Stazione attiva (default: prima in STATIONS) */
        const savedId    = localStorage.getItem('activeStationId');
        this.activeStation = STATIONS.find(s => s.id === savedId) || STATIONS[0];
        this.tbAPI       = new ThingsBoardAPI(this.activeStation?.thingsboard || {});

        this.adminPanel  = null;
        this.sidebar     = null;
    }

    /* Chiamato dopo login riuscito */
    async onAuthReady() {
        this._setupSidebar();
        this._setupTopSync();
        this._setupThemeToggle();
        this._setupUnitToggle();
        this._setupErrorHandling();
        this._setupCharts();

        this.adminPanel = new AdminPanel();

        /* Admin button (sidebar) */
        const adminBtnSidebar = document.getElementById('adminBtnSidebar');
        if (auth.isAdmin()) {
            adminBtnSidebar.style.display = 'flex';
            adminBtnSidebar.addEventListener('click', () => this.adminPanel.show());
        }

        /* Logout */
        document.getElementById('logoutBtnSidebar').addEventListener('click', () => {
            if (confirm('Vuoi uscire?')) auth.logout();
        });

        /* Seleziona stazione iniziale */
        this._applyStation(this.activeStation);
        await this.loadData();
        this._startAutoUpdate();
    }

    /* ── Sidebar ────────────────────────────────────────────── */

    _setupSidebar() {
        this.sidebar = new Sidebar(station => this._switchStation(station));
        this.sidebar.render(this.activeStation?.id);

        /* Utente nel footer sidebar */
        const session = auth.getSession();
        const name    = session.username;
        document.getElementById('sidebarUserName').textContent  = name;
        document.getElementById('sidebarUserRole').textContent  = session.role === 'admin' ? 'Amministratore' : 'Utente';
        document.getElementById('sidebarUserAvatar').textContent = name.charAt(0).toUpperCase();
    }

    async _switchStation(station) {
        if (station.id === this.activeStation?.id) return;
        this.activeStation = station;
        localStorage.setItem('activeStationId', station.id);

        /* Ricrea API per la nuova stazione */
        this.tbAPI = new ThingsBoardAPI(station.thingsboard || {});

        /* Ferma l'aggiornamento attuale */
        clearInterval(this.updateInterval);

        /* Aggiorna UI */
        this._applyStation(station);
        this.sidebar.render(station.id);

        /* Reset dati */
        this.currentData    = {};
        this.historicalData = {
            temperature: [], humidity: [], pressure: [],
            windSpeed: [], windDirection: [], timestamps: []
        };

        /* Ricarica */
        await this.loadData();
        this._startAutoUpdate();
    }

    /** Aggiorna le intestazioni con i dati della stazione selezionata */
    _applyStation(station) {
        if (!station) return;

        /* Header dashboard */
        const icon = document.getElementById('stationHeaderIcon');
        icon.className = station.icon || 'fas fa-tower-broadcast';
        if (station.color) icon.style.color = station.color;

        document.getElementById('stationHeaderName').textContent     = station.name;
        document.getElementById('stationHeaderLocation').textContent  = station.location;

        /* Badge status */
        const badge = document.getElementById('stationBadge');
        const badgeTx = document.getElementById('stationBadgeText');
        const statusMap = { online: 'Online', offline: 'Offline', maintenance: 'Manutenzione' };
        badge.className = `station-badge ${station.status || 'online'}`;
        badgeTx.textContent = statusMap[station.status] || 'Online';

        /* Topbar mobile */
        document.getElementById('topbarStationName').textContent = station.name;

        /* Sidebar info */
        this.sidebar?.updateInfo(station);

        /* Colore accent della sidebar-icon-wrap */
        const iconWrap = document.getElementById('stationIconWrap');
        if (station.color) {
            iconWrap.style.borderColor = station.color + '44';
            iconWrap.style.color       = station.color;
        }
    }

    /* ── Sync icon in topbar ────────────────────────────────── */
    _setupTopSync() {
        /* niente da fare qui, l'icona è animata via CSS classe .updating */
    }

    /* ── Tema ───────────────────────────────────────────────── */

    _setupThemeToggle() {
        const btn        = document.getElementById('themeToggleSidebar');
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this._updateThemeIcon(savedTheme);
        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next    = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            this._updateThemeIcon(next);
            this._updateChartTheme();
        });
    }

    _updateThemeIcon(theme) {
        const btn = document.querySelector('#themeToggleSidebar i');
        if (btn) btn.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    /* ── Unità temperatura ──────────────────────────────────── */

    _setupUnitToggle() {
        const btn = document.getElementById('tempUnitToggleSidebar');
        btn.textContent = `°${this.tempUnit}`;
        btn.addEventListener('click', () => {
            this.tempUnit = this.tempUnit === 'C' ? 'F' : 'C';
            localStorage.setItem('tempUnit', this.tempUnit);
            btn.textContent = `°${this.tempUnit}`;
            if (this.currentData.temperature !== undefined) {
                this._updateUI();
                this._updateCharts();
            }
        });
    }

    _toDisplayTemp(celsius) {
        return this.tempUnit === 'F' ? (celsius * 9/5) + 32 : celsius;
    }

    /* ── Errori ─────────────────────────────────────────────── */

    _setupErrorHandling() {
        document.getElementById('closeError').addEventListener('click', () => {
            document.getElementById('errorBanner').classList.remove('show');
        });
    }

    _showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorBanner').classList.add('show');
        setTimeout(() => document.getElementById('errorBanner').classList.remove('show'), 6000);
    }

    /* ── Caricamento dati ───────────────────────────────────── */

    async loadData() {
        try {
            this._setLoading(true);
            if (this.tbAPI.isConfigured) {
                await Promise.all([this._fetchCurrent(), this._fetchHistory()]);
            } else {
                console.warn('[TB] Non configurato — uso dati demo per:', this.activeStation?.name);
                this._useDemoData();
                this._generateDemoHistory();
            }
            this._updateUI();
            this._updateCharts();
            this._updateLastUpdateTime();
        } catch (err) {
            console.error('[WeatherStation]', err);
            this._showError('Errore connessione ThingsBoard. Uso dati demo.');
            this._useDemoData();
            this._generateDemoHistory();
            this._updateUI();
            this._updateCharts();
        } finally {
            this._setLoading(false);
        }
    }

    async _fetchCurrent() {
        const data       = await this.tbAPI.getLatestTelemetry();
        this.currentData = this._parseCurrent(data);
    }

    async _fetchHistory() {
        const data = await this.tbAPI.getHistoricalTelemetry();
        this._parseHistory(data);
    }

    _parseCurrent(data) {
        const result = {};
        const keyMap = CONFIG.thingsboard.telemetryKeys;
        for (const [tbKey, internalKey] of Object.entries(keyMap)) {
            const values = data[tbKey];
            if (values?.length) result[internalKey] = parseFloat(values[0].value);
        }
        return result;
    }

    _parseHistory(data) {
        const hours    = 24;
        const interval = CONFIG.update.historyInterval / hours;
        this.historicalData = {
            temperature: [], humidity: [], pressure: [],
            windSpeed: [], windDirection: [], timestamps: []
        };
        for (let i = 0; i < hours; i++) {
            this.historicalData.timestamps.push(new Date(Date.now() - (hours - i) * interval));
        }
        const keyMap = CONFIG.thingsboard.telemetryKeys;
        for (const [tbKey, internalKey] of Object.entries(keyMap)) {
            const values = data[tbKey];
            if (values?.length && Object.prototype.hasOwnProperty.call(this.historicalData, internalKey)) {
                this.historicalData[internalKey] = values
                    .sort((a, b) => a.ts - b.ts)
                    .map(v => parseFloat(v.value));
            }
        }
    }

    /* ── Dati demo ──────────────────────────────────────────── */

    _useDemoData() {
        const h = new Date().getHours();
        const c = Math.sin((h - 6) * (Math.PI / 12)) * 10;
        this.currentData = {
            temperature   : parseFloat((15 + c + (Math.random() - 0.5) * 1.5).toFixed(1)),
            humidity      : parseFloat(Math.min(100, Math.max(0, 65 - c * 1.5 + (Math.random() - 0.5) * 10)).toFixed(0)),
            pressure      : parseFloat((1013 + Math.sin(h / 6) * 5 + (Math.random() - 0.5) * 2).toFixed(0)),
            windSpeed     : parseFloat(Math.max(0, 8 + (Math.random() - 0.5) * 15).toFixed(1)),
            windDirection : Math.floor(Math.random() * 360)
        };
    }

    _generateDemoHistory() {
        const hours = 24;
        const now   = Date.now();
        const step  = CONFIG.update.historyInterval / hours;
        this.historicalData = {
            temperature: [], humidity: [], pressure: [],
            windSpeed: [], windDirection: [], timestamps: []
        };
        for (let i = 0; i < hours; i++) {
            const ts    = now - (hours - i) * step;
            const h     = new Date(ts).getHours();
            const cycle = Math.sin((h - 6) * (Math.PI / 12)) * 10;
            this.historicalData.timestamps.push(new Date(ts));
            this.historicalData.temperature.push(parseFloat((15 + cycle + (Math.random() - 0.5) * 1.5).toFixed(1)));
            this.historicalData.humidity.push(parseFloat(Math.min(100, Math.max(0, 65 - cycle * 1.5 + (Math.random() - 0.5) * 10)).toFixed(0)));
            this.historicalData.pressure.push(parseFloat((1013 + Math.sin(h / 6) * 5 + (Math.random() - 0.5) * 2).toFixed(0)));
            this.historicalData.windSpeed.push(parseFloat(Math.max(0, 8 + (Math.random() - 0.5) * 15).toFixed(1)));
            this.historicalData.windDirection.push(Math.floor(Math.random() * 360));
        }
    }

    /* ── UI update ──────────────────────────────────────────── */

    _updateUI() {
        const d = this.currentData;
        if (!d || Object.keys(d).length === 0) return;

        const unit    = `°${this.tempUnit}`;
        const tempVal = this._toDisplayTemp(d.temperature);
        document.querySelector('#temperature .value').textContent = tempVal.toFixed(1);
        document.querySelector('#temperature .unit').textContent  = unit;

        if (this.historicalData.temperature.length > 0) {
            const converted = this.historicalData.temperature.map(t => this._toDisplayTemp(t));
            document.getElementById('tempMax').textContent = `${Math.max(...converted).toFixed(1)}${unit}`;
            document.getElementById('tempMin').textContent = `${Math.min(...converted).toFixed(1)}${unit}`;
        }

        const hum = d.humidity;
        document.querySelector('#humidity .value').textContent      = Math.round(hum);
        document.getElementById('humidityProgress').style.width     = `${Math.min(100, hum)}%`;
        document.getElementById('humidityStatus').textContent       = this._humidityLabel(hum);

        const pres    = d.pressure;
        document.querySelector('#pressure .value').textContent      = Math.round(pres);
        const pStatus = this._pressureStatus(pres);
        document.getElementById('pressureTrend').className          = pStatus.icon;
        document.getElementById('pressureStatus').textContent       = pStatus.text;

        document.querySelector('#windSpeed .value').textContent      = d.windSpeed.toFixed(1);
        document.getElementById('windArrow').style.transform         =
            `translate(-50%,-50%) rotate(${d.windDirection}deg)`;
        document.getElementById('windDirection').textContent         = this._windLabel(d.windDirection);

        document.querySelectorAll('.weather-card').forEach(c => c.classList.add('fade-in'));
    }

    _humidityLabel(h) {
        if (h < 30) return 'Bassa';
        if (h < 60) return 'Normale';
        if (h < 80) return 'Alta';
        return 'Molto Alta';
    }

    _pressureStatus(p) {
        if (p < 1000) return { text: 'Bassa',   icon: 'fas fa-arrow-down' };
        if (p < 1020) return { text: 'Stabile',  icon: 'fas fa-minus' };
        return                { text: 'Alta',     icon: 'fas fa-arrow-up' };
    }

    _windLabel(deg) {
        const dirs = ['N','NE','E','SE','S','SO','O','NO'];
        return dirs[Math.round(deg / 45) % 8];
    }

    /* ── Grafici ────────────────────────────────────────────── */

    _setupCharts() {
        const { textColor, gridColor } = this._chartColors();

        const base = {
            responsive          : true,
            maintainAspectRatio : true,
            plugins: { legend: { labels: { color: textColor, font: { size: 11, family: "'IBM Plex Sans'" } } } },
            scales: {
                x: { ticks: { color: textColor, maxRotation: 0 }, grid: { color: gridColor } },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            }
        };

        this.charts.temperature = new Chart(
            document.getElementById('temperatureChart').getContext('2d'),
            {
                type : 'line',
                data : {
                    labels  : [],
                    datasets: [{
                        label           : `Temperatura (°${this.tempUnit})`,
                        data            : [],
                        borderColor     : '#e85d5d',
                        backgroundColor : 'rgba(232,93,93,.08)',
                        tension         : 0.4,
                        fill            : true,
                        pointRadius     : 2
                    }]
                },
                options: base
            }
        );

        this.charts.humidityPressure = new Chart(
            document.getElementById('humidityPressureChart').getContext('2d'),
            {
                type : 'line',
                data : {
                    labels  : [],
                    datasets: [
                        {
                            label           : 'Umidità (%)',
                            data            : [],
                            borderColor     : '#2ec4b6',
                            backgroundColor : 'rgba(46,196,182,.08)',
                            tension         : 0.4,
                            fill            : true,
                            yAxisID         : 'y',
                            pointRadius     : 2
                        },
                        {
                            label           : 'Pressione (hPa)',
                            data            : [],
                            borderColor     : '#7b68ee',
                            backgroundColor : 'rgba(123,104,238,.08)',
                            tension         : 0.4,
                            fill            : true,
                            yAxisID         : 'y1',
                            pointRadius     : 2
                        }
                    ]
                },
                options: {
                    ...base,
                    scales: {
                        x  : { ticks: { color: textColor, maxRotation: 0 }, grid: { color: gridColor } },
                        y  : {
                            type: 'linear', position: 'left',
                            ticks: { color: textColor }, grid: { color: gridColor },
                            title: { display: true, text: 'Umidità (%)', color: textColor, font: { size: 10 } }
                        },
                        y1 : {
                            type: 'linear', position: 'right',
                            ticks: { color: textColor }, grid: { display: false },
                            title: { display: true, text: 'Pressione (hPa)', color: textColor, font: { size: 10 } }
                        }
                    }
                }
            }
        );
    }

    _chartColors() {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            textColor : dark ? '#94adc8' : '#5a6a7a',
            gridColor : dark ? '#1e3658' : '#edf2f7'
        };
    }

    _updateCharts() {
        const labels = this.historicalData.timestamps.map(t =>
            t.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        );
        const temps = this.historicalData.temperature.map(t => this._toDisplayTemp(t));

        this.charts.temperature.data.labels                    = labels;
        this.charts.temperature.data.datasets[0].data          = temps;
        this.charts.temperature.data.datasets[0].label         = `Temperatura (°${this.tempUnit})`;
        this.charts.temperature.update('none');

        this.charts.humidityPressure.data.labels               = labels;
        this.charts.humidityPressure.data.datasets[0].data     = this.historicalData.humidity;
        this.charts.humidityPressure.data.datasets[1].data     = this.historicalData.pressure;
        this.charts.humidityPressure.update('none');
    }

    _updateChartTheme() {
        const { textColor, gridColor } = this._chartColors();
        Object.values(this.charts).forEach(chart => {
            chart.options.plugins.legend.labels.color = textColor;
            ['x','y','y1'].forEach(axis => {
                const s = chart.options.scales[axis];
                if (!s) return;
                if (s.ticks) s.ticks.color = textColor;
                if (s.grid)  s.grid.color  = gridColor;
                if (s.title) s.title.color = textColor;
            });
            chart.update('none');
        });
    }

    /* ── Helpers ────────────────────────────────────────────── */

    _startAutoUpdate() {
        this.updateInterval = setInterval(() => this.loadData(), CONFIG.update.interval);
    }

    _setLoading(on) {
        const syncIcon = document.getElementById('topbarSyncIcon');
        if (syncIcon) syncIcon.style.animation = on ? 'spin 1s linear infinite' : 'none';

        /* Aggiunge classe su last-update per far girare l'icona del topbar */
        const lu = document.getElementById('lastUpdate')?.parentElement;
        if (lu) lu.classList.toggle('updating', on);
    }

    _updateLastUpdateTime() {
        const time = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const el   = document.getElementById('lastUpdate');
        if (el) el.textContent = `Aggiornato alle ${time}`;
    }

    destroy() {
        clearInterval(this.updateInterval);
        Object.values(this.charts).forEach(c => c.destroy());
    }
}

/* ════════════════════════════════════════════════════════════════
   Bootstrap
════════════════════════════════════════════════════════════════ */

/* Aggiunge @keyframes spin per topbar icon se non già definita */
(function ensureSpin() {
    if (!document.getElementById('_spinStyle')) {
        const s = document.createElement('style');
        s.id = '_spinStyle';
        s.textContent = '@keyframes spin { 100% { transform: rotate(360deg); } }';
        document.head.appendChild(s);
    }
})();

document.addEventListener('DOMContentLoaded', async () => {
    await auth.init();

    window.weatherStation = new WeatherStation();

    if (auth.isLoggedIn()) {
        document.getElementById('loginOverlay').style.display  = 'none';
        document.getElementById('appContainer').style.display  = 'flex';
        window.weatherStation.onAuthReady();
    } else {
        new LoginUI().show();
    }

    window.addEventListener('beforeunload', () => window.weatherStation.destroy());
});
