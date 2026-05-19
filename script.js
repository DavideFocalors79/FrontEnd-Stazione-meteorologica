/* ═══════════════════════════════════════════════════════════════
   script.js — Weather Station
   • Autenticazione locale (AuthManager in auth.js)
   • ThingsBoard: login JWT automatico + fetch telemetria
   • Grafici Chart.js
   • Pannello Admin (solo ruolo admin)
════════════════════════════════════════════════════════════════ */

/* ── ThingsBoard API helper ─────────────────────────────────── */

class ThingsBoardAPI {
    constructor() {
        this.baseUrl   = CONFIG.thingsboard.url;
        this.jwtToken  = null;
        this.tokenExp  = 0;
    }

    get isConfigured() {
        const cfg = CONFIG.thingsboard;
        const hasCredentials = cfg.username && !cfg.username.startsWith('YOUR_');
        const hasStatic      = cfg.staticToken && cfg.staticToken.length > 10;
        const hasDevice      = cfg.deviceId && !cfg.deviceId.startsWith('YOUR_');
        return (hasCredentials || hasStatic) && hasDevice;
    }

    /* Ottieni JWT da ThingsBoard (login con username/password) */
    async _getToken() {
        const cfg = CONFIG.thingsboard;

        // Token statico configurato → usalo direttamente
        if (cfg.staticToken && cfg.staticToken.length > 10) {
            return cfg.staticToken;
        }

        // Token JWT valido in cache
        if (this.jwtToken && Date.now() < this.tokenExp - 60000) {
            return this.jwtToken;
        }

        // Login automatico a ThingsBoard
        const res = await fetch(`${this.baseUrl}/api/auth/login`, {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({
                username: cfg.username,
                password: cfg.password
            })
        });

        if (!res.ok) {
            throw new Error(`ThingsBoard login fallito (${res.status}). ` +
                'Controlla username/password in config.js');
        }

        const data = await res.json();
        this.jwtToken = data.token;

        // Decodifica expiry dal payload JWT
        try {
            const payload  = JSON.parse(atob(data.token.split('.')[1]));
            this.tokenExp  = payload.exp * 1000;
        } catch {
            this.tokenExp = Date.now() + 3600000; // fallback 1h
        }

        console.info('[TB] Token JWT ottenuto, scade:', new Date(this.tokenExp).toLocaleTimeString('it-IT'));
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

        if (res.status === 401) {
            // Token scaduto → forza rinnovo
            this.jwtToken = null;
            throw new Error('Token scaduto, riprovo...');
        }
        if (!res.ok) throw new Error(`ThingsBoard API error ${res.status}: ${url}`);
        return res.json();
    }

    async getLatestTelemetry() {
        const keys = Object.values(CONFIG.thingsboard.telemetryKeys).join(',');
        const path = `/api/plugins/telemetry/DEVICE/${CONFIG.thingsboard.deviceId}/values/timeseries`;
        return this._fetch(path, { keys });
    }

    async getHistoricalTelemetry(windowMs = CONFIG.update.historyInterval) {
        const endTs   = Date.now();
        const startTs = endTs - windowMs;
        const keys    = Object.values(CONFIG.thingsboard.telemetryKeys).join(',');
        const path    = `/api/plugins/telemetry/DEVICE/${CONFIG.thingsboard.deviceId}/values/timeseries`;
        return this._fetch(path, { keys, startTs, endTs, limit: 1000, agg: 'NONE' });
    }
}

/* ── Admin UI ───────────────────────────────────────────────── */

class AdminPanel {
    constructor() {
        this.modal        = document.getElementById('adminModal');
        this.closeBtn     = document.getElementById('closeAdmin');
        this.createBtn    = document.getElementById('createUserBtn');
        this.usernameIn   = document.getElementById('newUsername');
        this.passwordIn   = document.getElementById('newPassword');
        this.roleSelect   = document.getElementById('newRole');
        this.msg          = document.getElementById('createUserMsg');
        this.listEl       = document.getElementById('usersList');

        this._bindEvents();
    }

    _bindEvents() {
        this.closeBtn.addEventListener('click', () => this.hide());
        this.modal.addEventListener('click', e => {
            if (e.target === this.modal) this.hide();
        });
        this.createBtn.addEventListener('click', () => this._handleCreate());

        // Invio con Enter
        [this.usernameIn, this.passwordIn].forEach(el => {
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter') this._handleCreate();
            });
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
        this.msg.textContent   = text;
        this.msg.className     = `admin-msg ${type}`;
    }

    async _handleCreate() {
        const username = this.usernameIn.value.trim();
        const password = this.passwordIn.value;
        const role     = this.roleSelect.value;

        this._setMsg('Creazione in corso…', 'info');
        this.createBtn.disabled = true;

        try {
            await auth.createUser(username, password, role);
            this._setMsg(`✓ Utente "${username}" (${role}) creato`, 'success');
            this._clearForm();
            this._renderUserList();
        } catch (err) {
            this._setMsg(`✗ ${err.message}`, 'error');
        } finally {
            this.createBtn.disabled = false;
        }
    }

    _renderUserList() {
        const users   = auth.listUsers();
        const session = auth.getSession();

        if (users.length === 0) {
            this.listEl.innerHTML = '<p class="no-users">Nessun utente</p>';
            return;
        }

        this.listEl.innerHTML = users.map(u => `
            <div class="user-row">
                <div class="user-info">
                    <span class="user-icon">${u.role === 'admin' ? '🔑' : '👤'}</span>
                    <span class="user-name">${this._escHtml(u.username)}</span>
                    <span class="user-role ${u.role}">${u.role}</span>
                </div>
                <div class="user-meta">
                    <span class="user-date">${new Date(u.createdAt).toLocaleDateString('it-IT')}</span>
                    ${u.username !== session?.username
                        ? `<button class="btn-delete" data-user="${this._escHtml(u.username)}"
                              aria-label="Elimina ${this._escHtml(u.username)}">
                              <i class="fas fa-trash"></i>
                           </button>`
                        : '<span class="user-you">tu</span>'
                    }
                </div>
            </div>
        `).join('');

        this.listEl.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => this._handleDelete(btn.dataset.user));
        });
    }

    async _handleDelete(username) {
        if (!confirm(`Eliminare l'utente "${username}"?`)) return;
        try {
            auth.deleteUser(username);
            this._renderUserList();
        } catch (err) {
            this._setMsg(`✗ ${err.message}`, 'error');
        }
    }

    _escHtml(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                  .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
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
            this.passwordIn.type       = isPw ? 'text' : 'password';
            this.toggleIcon.className  = isPw ? 'fas fa-eye-slash' : 'fas fa-eye';
        });
    }

    _setLoading(on) {
        this.loginBtn.disabled    = on;
        this.loginBtnTx.textContent = on ? 'Accesso…' : 'Accedi';
        this.spinner.style.display  = on ? 'inline-block' : 'none';
    }

    _setError(msg) {
        this.errorEl.textContent = msg;
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
                document.getElementById('appContainer').style.display = 'block';
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

/* ── WeatherStation principale ──────────────────────────────── */

class WeatherStation {
    constructor() {
        this.charts         = {};
        this.historicalData = { temperature: [], humidity: [], pressure: [], windSpeed: [], windDirection: [], timestamps: [] };
        this.currentData    = {};
        this.updateInterval = null;
        this.tempUnit       = localStorage.getItem('tempUnit') || 'C';
        this.tbAPI          = new ThingsBoardAPI();
        this.adminPanel     = null;
    }

    /* Chiamato dopo login riuscito */
    async onAuthReady() {
        this._setupHeader();
        this._setupThemeToggle();
        this._setupUnitToggle();
        this._setupErrorHandling();
        this._setupCharts();

        this.adminPanel = new AdminPanel();

        // Pulsante admin visibile solo agli admin
        const adminBtn = document.getElementById('adminBtn');
        if (auth.isAdmin()) {
            adminBtn.style.display = 'flex';
            adminBtn.addEventListener('click', () => this.adminPanel.show());
        }

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Vuoi uscire?')) auth.logout();
        });

        await this.loadData();
        this._startAutoUpdate();
    }

    /* ── Header ─────────────────────────────────────────────── */

    _setupHeader() {
        const session = auth.getSession();
        document.getElementById('userBadgeText').textContent =
            `${session.username} ${session.role === 'admin' ? '(admin)' : ''}`.trim();
    }

    /* ── Tema ───────────────────────────────────────────────── */

    _setupThemeToggle() {
        const btn        = document.getElementById('themeToggle');
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
        document.querySelector('#themeToggle i').className =
            theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    /* ── Unità temperatura ──────────────────────────────────── */

    _setupUnitToggle() {
        const btn = document.getElementById('tempUnitToggle');
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
                await Promise.all([
                    this._fetchCurrent(),
                    this._fetchHistory()
                ]);
            } else {
                console.warn('[TB] Non configurato — uso dati demo');
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
        const data          = await this.tbAPI.getLatestTelemetry();
        this.currentData    = this._parseCurrent(data);
    }

    async _fetchHistory() {
        const data = await this.tbAPI.getHistoricalTelemetry();
        this._parseHistory(data);
    }

    _parseCurrent(data) {
        const result  = {};
        const keyMap  = CONFIG.thingsboard.telemetryKeys;
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
            if (values?.length && this.historicalData.hasOwnProperty(internalKey)) {
                this.historicalData[internalKey] = values
                    .sort((a, b) => a.ts - b.ts)
                    .map(v => parseFloat(v.value));
            }
        }
    }

    /* ── Dati demo ──────────────────────────────────────────── */

    _useDemoData() {
        const h = new Date().getHours();
        const tempCycle = Math.sin((h - 6) * (Math.PI / 12)) * 10;
        this.currentData = {
            temperature   : parseFloat((15 + tempCycle + (Math.random() - 0.5) * 1.5).toFixed(1)),
            humidity      : parseFloat(Math.min(100, Math.max(0, 65 - tempCycle * 1.5 + (Math.random() - 0.5) * 10)).toFixed(0)),
            pressure      : parseFloat((1013 + Math.sin(h / 6) * 5 + (Math.random() - 0.5) * 2).toFixed(0)),
            windSpeed     : parseFloat(Math.max(0, 8 + (Math.random() - 0.5) * 15).toFixed(1)),
            windDirection : Math.floor(Math.random() * 360)
        };
    }

    _generateDemoHistory() {
        const hours  = 24;
        const now    = Date.now();
        const step   = CONFIG.update.historyInterval / hours;
        this.historicalData = { temperature: [], humidity: [], pressure: [], windSpeed: [], windDirection: [], timestamps: [] };
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

        // Min/Max dalle ultime 24h
        if (this.historicalData.temperature.length > 0) {
            const converted = this.historicalData.temperature.map(t => this._toDisplayTemp(t));
            document.getElementById('tempMax').textContent = `${Math.max(...converted).toFixed(1)}${unit}`;
            document.getElementById('tempMin').textContent = `${Math.min(...converted).toFixed(1)}${unit}`;
        }

        const hum = d.humidity;
        document.querySelector('#humidity .value').textContent = Math.round(hum);
        document.getElementById('humidityProgress').style.width = `${Math.min(100, hum)}%`;
        document.getElementById('humidityStatus').textContent   = this._humidityLabel(hum);

        const pres = d.pressure;
        document.querySelector('#pressure .value').textContent = Math.round(pres);
        const pStatus = this._pressureStatus(pres);
        document.getElementById('pressureTrend').className  = pStatus.icon;
        document.getElementById('pressureStatus').textContent = pStatus.text;

        document.querySelector('#windSpeed .value').textContent = d.windSpeed.toFixed(1);
        document.getElementById('windArrow').style.transform    =
            `translate(-50%, -50%) rotate(${d.windDirection}deg)`;
        document.getElementById('windDirection').textContent    =
            this._windLabel(d.windDirection);

        document.querySelectorAll('.weather-card').forEach(c => c.classList.add('fade-in'));
    }

    _humidityLabel(h) {
        if (h < 30) return 'Bassa';
        if (h < 60) return 'Normale';
        if (h < 80) return 'Alta';
        return 'Molto Alta';
    }

    _pressureStatus(p) {
        if (p < 1000) return { text: 'Bassa', icon: 'fas fa-arrow-down' };
        if (p < 1020) return { text: 'Stabile', icon: 'fas fa-minus' };
        return { text: 'Alta', icon: 'fas fa-arrow-up' };
    }

    _windLabel(deg) {
        const dirs = ['N','NE','E','SE','S','SO','O','NO'];
        return dirs[Math.round(deg / 45) % 8];
    }

    /* ── Grafici ────────────────────────────────────────────── */

    _setupCharts() {
        const dark      = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = dark ? '#cbd5e1' : '#4a5568';
        const gridColor = dark ? '#334155' : '#e2e8f0';

        const base = {
            responsive          : true,
            maintainAspectRatio : true,
            plugins: { legend: { labels: { color: textColor, font: { size: 12 } } } },
            scales: {
                x: { ticks: { color: textColor }, grid: { color: gridColor } },
                y: { ticks: { color: textColor }, grid: { color: gridColor } }
            }
        };

        this.charts.temperature = new Chart(
            document.getElementById('temperatureChart').getContext('2d'),
            {
                type : 'line',
                data : {
                    labels   : [],
                    datasets : [{
                        label           : `Temperatura (°${this.tempUnit})`,
                        data            : [],
                        borderColor     : '#ff6b6b',
                        backgroundColor : 'rgba(255,107,107,0.1)',
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
                    labels   : [],
                    datasets : [
                        {
                            label           : 'Umidità (%)',
                            data            : [],
                            borderColor     : '#4ecdc4',
                            backgroundColor : 'rgba(78,205,196,0.1)',
                            tension         : 0.4,
                            fill            : true,
                            yAxisID         : 'y',
                            pointRadius     : 2
                        },
                        {
                            label           : 'Pressione (hPa)',
                            data            : [],
                            borderColor     : '#95a5f6',
                            backgroundColor : 'rgba(149,165,246,0.1)',
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
                        x  : { ticks: { color: textColor }, grid: { color: gridColor } },
                        y  : {
                            type: 'linear', position: 'left',
                            ticks: { color: textColor }, grid: { color: gridColor },
                            title: { display: true, text: 'Umidità (%)', color: textColor }
                        },
                        y1 : {
                            type: 'linear', position: 'right',
                            ticks: { color: textColor }, grid: { display: false },
                            title: { display: true, text: 'Pressione (hPa)', color: textColor }
                        }
                    }
                }
            }
        );
    }

    _updateCharts() {
        const labels = this.historicalData.timestamps.map(t =>
            t.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        );
        const temps  = this.historicalData.temperature.map(t => this._toDisplayTemp(t));

        this.charts.temperature.data.labels                       = labels;
        this.charts.temperature.data.datasets[0].data            = temps;
        this.charts.temperature.data.datasets[0].label           = `Temperatura (°${this.tempUnit})`;
        this.charts.temperature.update('none');

        this.charts.humidityPressure.data.labels                  = labels;
        this.charts.humidityPressure.data.datasets[0].data        = this.historicalData.humidity;
        this.charts.humidityPressure.data.datasets[1].data        = this.historicalData.pressure;
        this.charts.humidityPressure.update('none');
    }

    _updateChartTheme() {
        const dark      = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = dark ? '#cbd5e1' : '#4a5568';
        const gridColor = dark ? '#334155' : '#e2e8f0';
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
        const el = document.getElementById('lastUpdate').parentElement;
        el.classList.toggle('updating', on);
    }

    _updateLastUpdateTime() {
        document.getElementById('lastUpdate').textContent =
            `Aggiornato alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
    }

    destroy() {
        clearInterval(this.updateInterval);
        Object.values(this.charts).forEach(c => c.destroy());
    }
}

/* ═══════════════════════════════════════════════════════════════
   Bootstrap — autenticazione → app
════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {

    // Inizializza AuthManager (crea admin di default se assente)
    await auth.init();

    // Istanza globale necessaria per LoginUI
    window.weatherStation = new WeatherStation();

    if (auth.isLoggedIn()) {
        /* Sessione già attiva: vai diretto alla dashboard */
        document.getElementById('loginOverlay').style.display  = 'none';
        document.getElementById('appContainer').style.display  = 'block';
        window.weatherStation.onAuthReady();
    } else {
        /* Mostra login */
        new LoginUI().show();
    }

    window.addEventListener('beforeunload', () => window.weatherStation.destroy());
});
