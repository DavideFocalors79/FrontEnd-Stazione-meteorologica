/*
 * script.js — Stazione Meteo Rovigo, Viola Marchesini
 */

/* ================================================================
   ThingsBoard API
================================================================ */
var ThingsBoardAPI = (function () {

    var jwtToken = null;
    var tokenExp = 0;

    function isConfigured() {
        var c = CONFIG.thingsboard;
        var hasCreds  = c.username && c.username.indexOf('YOUR_') === -1;
        var hasToken  = c.staticToken && c.staticToken.length > 10;
        var hasDevice = c.deviceId && c.deviceId.indexOf('YOUR_') === -1;
        return (hasCreds || hasToken) && hasDevice;
    }

    function getToken() {
        var c = CONFIG.thingsboard;
        if (c.staticToken && c.staticToken.length > 10) {
            return Promise.resolve(c.staticToken);
        }
        if (jwtToken && Date.now() < tokenExp - 60000) {
            return Promise.resolve(jwtToken);
        }
        return fetch(c.url + '/api/auth/login', {
            method  : 'POST',
            headers : { 'Content-Type': 'application/json' },
            body    : JSON.stringify({ username: c.username, password: c.password })
        })
        .then(function (r) {
            if (!r.ok) throw new Error('ThingsBoard login fallito (' + r.status + ')');
            return r.json();
        })
        .then(function (d) {
            jwtToken = d.token;
            try {
                var payload = JSON.parse(atob(d.token.split('.')[1]));
                tokenExp = payload.exp * 1000;
            } catch (e) {
                tokenExp = Date.now() + 3600000;
            }
            return jwtToken;
        });
    }

    function apiFetch(path, params) {
        return getToken().then(function (token) {
            var url = new URL(CONFIG.thingsboard.url + path);
            if (params) {
                Object.keys(params).forEach(function (k) { url.searchParams.set(k, params[k]); });
            }
            return fetch(url.toString(), {
                headers: { 'X-Authorization': 'Bearer ' + token }
            });
        })
        .then(function (r) {
            if (r.status === 401) { jwtToken = null; throw new Error('Token scaduto'); }
            if (!r.ok) throw new Error('TB API ' + r.status);
            return r.json();
        });
    }

    function getLatest() {
        var keys = Object.values(CONFIG.thingsboard.telemetryKeys).join(',');
        return apiFetch(
            '/api/plugins/telemetry/DEVICE/' + CONFIG.thingsboard.deviceId + '/values/timeseries',
            { keys: keys }
        );
    }

    function getHistory(windowMs) {
        var endTs   = Date.now();
        var startTs = endTs - (windowMs || CONFIG.update.historyInterval);
        var keys    = Object.values(CONFIG.thingsboard.telemetryKeys).join(',');
        return apiFetch(
            '/api/plugins/telemetry/DEVICE/' + CONFIG.thingsboard.deviceId + '/values/timeseries',
            { keys: keys, startTs: startTs, endTs: endTs, limit: 1000, agg: 'NONE' }
        );
    }

    return { isConfigured: isConfigured, getLatest: getLatest, getHistory: getHistory };

})();

/* ================================================================
   Admin Panel
================================================================ */
function AdminPanel() {
    this.modal     = document.getElementById('adminModal');
    this.closeBtn  = document.getElementById('closeAdmin');
    this.createBtn = document.getElementById('createUserBtn');
    this.unameIn   = document.getElementById('newUsername');
    this.passIn    = document.getElementById('newPassword');
    this.roleSel   = document.getElementById('newRole');
    this.msgEl     = document.getElementById('createUserMsg');
    this.listEl    = document.getElementById('usersList');
    this._bind();
}

AdminPanel.prototype._bind = function () {
    var self = this;
    this.closeBtn.addEventListener('click', function () { self.hide(); });
    this.modal.addEventListener('click', function (e) { if (e.target === self.modal) self.hide(); });
    this.createBtn.addEventListener('click', function () { self._create(); });
    [this.unameIn, this.passIn].forEach(function (el) {
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter') self._create(); });
    });
};

AdminPanel.prototype.show = function () {
    this.modal.classList.add('show');
    this._renderList();
    this.unameIn.focus();
};

AdminPanel.prototype.hide = function () {
    this.modal.classList.remove('show');
    this.unameIn.value = '';
    this.passIn.value  = '';
    this.roleSel.value = 'user';
    this._msg('', '');
};

AdminPanel.prototype._msg = function (text, type) {
    this.msgEl.textContent = text;
    this.msgEl.className   = 'admin-msg' + (type ? ' ' + type : '');
};

AdminPanel.prototype._create = function () {
    var self     = this;
    var username = this.unameIn.value.trim();
    var password = this.passIn.value;
    var role     = this.roleSel.value;
    this._msg('Creazione in corso...', 'info');
    this.createBtn.disabled = true;
    auth.createUser(username, password, role)
        .then(function () {
            self._msg('Utente "' + username + '" (' + role + ') creato', 'success');
            self.unameIn.value = '';
            self.passIn.value  = '';
            self._renderList();
        })
        .catch(function (err) {
            self._msg(err.message, 'error');
        })
        .finally(function () {
            self.createBtn.disabled = false;
        });
};

AdminPanel.prototype._renderList = function () {
    var self = this;
    this.listEl.innerHTML = '<p class="no-users">Caricamento...</p>';
    auth.listUsers()
        .then(function (users) {
            var session = auth.getSession();
            if (!users || users.length === 0) {
                self.listEl.innerHTML = '<p class="no-users">Nessun utente</p>';
                return;
            }
            self.listEl.innerHTML = users.map(function (u) {
                var icon  = u.role === 'admin'
                    ? '<i class="fas fa-key user-icon-i"></i>'
                    : '<i class="fas fa-user user-icon-i"></i>';
                var date  = u.created_at ? new Date(u.created_at).toLocaleDateString('it-IT') : '';
                var del   = u.username !== session.username
                    ? '<button class="btn-delete" data-user="' + esc(u.username) + '" aria-label="Elimina">' +
                      '<i class="fas fa-trash"></i></button>'
                    : '<span class="user-you">(tu)</span>';
                return '<div class="user-row">' +
                    '<div class="user-info">' + icon +
                        '<span class="user-name">' + esc(u.username) + '</span>' +
                        '<span class="user-role ' + u.role + '">' + u.role + '</span>' +
                    '</div>' +
                    '<div class="user-meta"><span class="user-date">' + date + '</span>' + del + '</div>' +
                '</div>';
            }).join('');
            self.listEl.querySelectorAll('.btn-delete').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    self._delete(btn.dataset.user);
                });
            });
        })
        .catch(function (err) {
            self.listEl.innerHTML = '<p class="no-users">Errore: ' + esc(err.message) + '</p>';
        });
};

AdminPanel.prototype._delete = function (username) {
    var self = this;
    if (!confirm('Eliminare l\'utente "' + username + '"?')) return;
    auth.deleteUser(username)
        .then(function () { self._renderList(); })
        .catch(function (err) { self._msg(err.message, 'error'); });
};

function esc(s) {
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ================================================================
   Login UI
================================================================ */
function LoginUI(onSuccess) {
    this.overlay   = document.getElementById('loginOverlay');
    this.unameIn   = document.getElementById('loginUsername');
    this.passIn    = document.getElementById('loginPassword');
    this.btn       = document.getElementById('loginBtn');
    this.btnText   = document.getElementById('loginBtnText');
    this.spinner   = document.getElementById('loginSpinner');
    this.errorEl   = document.getElementById('loginError');
    this.toggleBtn = document.getElementById('togglePw');
    this.toggleIco = document.getElementById('togglePwIcon');
    this.onSuccess = onSuccess;
    this._bind();
}

LoginUI.prototype._bind = function () {
    var self = this;
    this.btn.addEventListener('click', function () { self._submit(); });
    [this.unameIn, this.passIn].forEach(function (el) {
        el.addEventListener('keydown', function (e) { if (e.key === 'Enter') self._submit(); });
    });
    this.toggleBtn.addEventListener('click', function () {
        var isPw = self.passIn.type === 'password';
        self.passIn.type       = isPw ? 'text' : 'password';
        self.toggleIco.className = isPw ? 'fas fa-eye-slash' : 'fas fa-eye';
    });
};

LoginUI.prototype._loading = function (on) {
    this.btn.disabled        = on;
    this.btnText.textContent = on ? 'Accesso...' : 'Accedi';
    this.spinner.style.display = on ? 'inline-block' : 'none';
};

LoginUI.prototype._error = function (msg) {
    this.errorEl.textContent   = msg;
    this.errorEl.style.display = msg ? 'block' : 'none';
};

LoginUI.prototype._submit = function () {
    var self     = this;
    var username = this.unameIn.value.trim();
    var password = this.passIn.value;
    this._error('');
    this._loading(true);
    auth.login(username, password)
        .then(function () {
            self.overlay.classList.add('fade-out');
            setTimeout(function () {
                self.overlay.style.display = 'none';
                document.getElementById('appContainer').style.display = 'block';
                self.onSuccess();
            }, 380);
        })
        .catch(function (err) {
            self._error(err.message);
            self.passIn.value = '';
        })
        .finally(function () {
            self._loading(false);
        });
};

/* ================================================================
   Weather Station
================================================================ */
function WeatherStation() {
    this.charts      = {};
    this.history     = { temperature:[], humidity:[], pressure:[], windSpeed:[], windDirection:[], timestamps:[] };
    this.current     = {};
    this.tempUnit    = localStorage.getItem('tempUnit') || 'C';
    this.timer       = null;
    this.adminPanel  = null;
}

WeatherStation.prototype.start = function () {
    var self = this;
    var s    = auth.getSession();

    /* Header */
    document.getElementById('userBadgeText').textContent =
        s.username + (s.role === 'admin' ? ' (admin)' : '');

    /* Admin button */
    var adminBtn = document.getElementById('adminBtn');
    if (auth.isAdmin()) {
        adminBtn.style.display = 'flex';
        this.adminPanel = new AdminPanel();
        adminBtn.addEventListener('click', function () { self.adminPanel.show(); });
    }

    /* Logout */
    document.getElementById('logoutBtn').addEventListener('click', function () {
        if (confirm('Vuoi uscire?')) auth.logout();
    });

    /* Tema */
    this._initTheme();

    /* Unita temperatura */
    this._initUnit();

    /* Errori */
    document.getElementById('closeError').addEventListener('click', function () {
        document.getElementById('errorBanner').classList.remove('show');
    });

    /* Grafici */
    this._initCharts();

    /* Carica dati */
    this.load();
    this.timer = setInterval(function () { self.load(); }, CONFIG.update.interval);
};

WeatherStation.prototype.load = function () {
    var self = this;
    this._setUpdating(true);

    var p;
    if (ThingsBoardAPI.isConfigured()) {
        p = Promise.all([
            ThingsBoardAPI.getLatest().then(function (d) { self.current = self._parseCurrent(d); }),
            ThingsBoardAPI.getHistory().then(function (d) { self._parseHistory(d); })
        ]).catch(function (err) {
            console.error('[TB]', err.message);
            document.getElementById('errorMessage').textContent =
                'Errore ThingsBoard: ' + err.message + ' — uso dati demo';
            document.getElementById('errorBanner').classList.add('show');
            setTimeout(function () { document.getElementById('errorBanner').classList.remove('show'); }, 6000);
            self._demoData();
            self._demoHistory();
        });
    } else {
        self._demoData();
        self._demoHistory();
        p = Promise.resolve();
    }

    p.then(function () {
        self._updateCards();
        self._updateCharts();
        self._setUpdating(false);
        document.getElementById('lastUpdate').textContent =
            'Aggiornato alle ' + new Date().toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
    });
};

WeatherStation.prototype._parseCurrent = function (data) {
    var result = {};
    var km     = CONFIG.thingsboard.telemetryKeys;
    Object.keys(km).forEach(function (k) {
        var arr = data[km[k]];
        if (arr && arr.length) result[k] = parseFloat(arr[0].value);
    });
    return result;
};

WeatherStation.prototype._parseHistory = function (data) {
    var self  = this;
    var hours = 24;
    var step  = CONFIG.update.historyInterval / hours;
    var km    = CONFIG.thingsboard.telemetryKeys;
    this.history = { temperature:[], humidity:[], pressure:[], windSpeed:[], windDirection:[], timestamps:[] };
    for (var i = 0; i < hours; i++) {
        this.history.timestamps.push(new Date(Date.now() - (hours - i) * step));
    }
    Object.keys(km).forEach(function (k) {
        var arr = data[km[k]];
        if (arr && arr.length && self.history.hasOwnProperty(k)) {
            self.history[k] = arr.slice().sort(function (a,b) { return a.ts - b.ts; })
                                  .map(function (v) { return parseFloat(v.value); });
        }
    });
};

WeatherStation.prototype._demoData = function () {
    var h = new Date().getHours();
    var c = Math.sin((h - 6) * (Math.PI / 12)) * 10;
    this.current = {
        temperature   : parseFloat((15 + c + (Math.random() - 0.5) * 1.5).toFixed(1)),
        humidity      : Math.round(Math.min(100, Math.max(0, 65 - c * 1.5 + (Math.random() - 0.5) * 10))),
        pressure      : Math.round(1013 + Math.sin(h / 6) * 5 + (Math.random() - 0.5) * 2),
        windSpeed     : parseFloat(Math.max(0, 8 + (Math.random() - 0.5) * 15).toFixed(1)),
        windDirection : Math.floor(Math.random() * 360)
    };
};

WeatherStation.prototype._demoHistory = function () {
    var hours = 24;
    var step  = CONFIG.update.historyInterval / hours;
    this.history = { temperature:[], humidity:[], pressure:[], windSpeed:[], windDirection:[], timestamps:[] };
    for (var i = 0; i < hours; i++) {
        var ts = Date.now() - (hours - i) * step;
        var h  = new Date(ts).getHours();
        var c  = Math.sin((h - 6) * (Math.PI / 12)) * 10;
        this.history.timestamps.push(new Date(ts));
        this.history.temperature.push(parseFloat((15 + c + (Math.random() - 0.5) * 1.5).toFixed(1)));
        this.history.humidity.push(Math.round(Math.min(100, Math.max(0, 65 - c * 1.5 + (Math.random() - 0.5) * 10))));
        this.history.pressure.push(Math.round(1013 + Math.sin(h / 6) * 5 + (Math.random() - 0.5) * 2));
        this.history.windSpeed.push(parseFloat(Math.max(0, 8 + (Math.random() - 0.5) * 15).toFixed(1)));
        this.history.windDirection.push(Math.floor(Math.random() * 360));
    }
};

WeatherStation.prototype._toDisplay = function (celsius) {
    return this.tempUnit === 'F' ? (celsius * 9 / 5) + 32 : celsius;
};

WeatherStation.prototype._updateCards = function () {
    var d    = this.current;
    var unit = '\u00b0' + this.tempUnit;

    document.querySelector('#temperature .value').textContent = this._toDisplay(d.temperature).toFixed(1);
    document.querySelector('#temperature .unit').textContent  = unit;

    if (this.history.temperature.length) {
        var conv = this.history.temperature.map(this._toDisplay.bind(this));
        document.getElementById('tempMax').textContent = Math.max.apply(null, conv).toFixed(1) + unit;
        document.getElementById('tempMin').textContent = Math.min.apply(null, conv).toFixed(1) + unit;
    }

    document.querySelector('#humidity .value').textContent    = d.humidity;
    document.getElementById('humidityProgress').style.width   = Math.min(100, d.humidity) + '%';
    document.getElementById('humidityStatus').textContent     =
        d.humidity < 30 ? 'Bassa' : d.humidity < 60 ? 'Normale' : d.humidity < 80 ? 'Alta' : 'Molto Alta';

    document.querySelector('#pressure .value').textContent = d.pressure;
    var ps = d.pressure < 1000 ? { t:'Bassa', i:'fas fa-arrow-down' }
           : d.pressure < 1020 ? { t:'Stabile', i:'fas fa-minus' }
           :                     { t:'Alta', i:'fas fa-arrow-up' };
    document.getElementById('pressureTrend').className  = ps.i;
    document.getElementById('pressureStatus').textContent = ps.t;

    document.querySelector('#windSpeed .value').textContent = d.windSpeed;
    document.getElementById('windArrow').style.transform   =
        'translate(-50%,-50%) rotate(' + d.windDirection + 'deg)';
    var dirs = ['N','NE','E','SE','S','SO','O','NO'];
    document.getElementById('windDirection').textContent =
        dirs[Math.round(d.windDirection / 45) % 8];
};

WeatherStation.prototype._initTheme = function () {
    var self  = this;
    var btn   = document.getElementById('themeToggle');
    var saved = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this._themeIcon(saved);
    btn.addEventListener('click', function () {
        var cur  = document.documentElement.getAttribute('data-theme');
        var next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        self._themeIcon(next);
        self._chartTheme();
    });
};

WeatherStation.prototype._themeIcon = function (theme) {
    document.querySelector('#themeToggle i').className =
        theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
};

WeatherStation.prototype._initUnit = function () {
    var self = this;
    var btn  = document.getElementById('tempUnitToggle');
    btn.textContent = '\u00b0' + this.tempUnit;
    btn.addEventListener('click', function () {
        self.tempUnit = self.tempUnit === 'C' ? 'F' : 'C';
        localStorage.setItem('tempUnit', self.tempUnit);
        btn.textContent = '\u00b0' + self.tempUnit;
        if (Object.keys(self.current).length) {
            self._updateCards();
            self._updateCharts();
        }
    });
};

WeatherStation.prototype._setUpdating = function (on) {
    document.getElementById('lastUpdate').parentElement.classList.toggle('updating', on);
};

WeatherStation.prototype._initCharts = function () {
    var dark  = document.documentElement.getAttribute('data-theme') === 'dark';
    var tc    = dark ? '#cbd5e1' : '#4a5568';
    var gc    = dark ? '#334155' : '#e2e8f0';

    var baseScales = {
        x: { ticks:{ color:tc }, grid:{ color:gc } },
        y: { ticks:{ color:tc }, grid:{ color:gc } }
    };

    this.charts.temp = new Chart(
        document.getElementById('temperatureChart').getContext('2d'),
        {
            type: 'line',
            data: {
                labels  : [],
                datasets: [{
                    label          : 'Temperatura (\u00b0C)',
                    data           : [],
                    borderColor    : '#ff6b6b',
                    backgroundColor: 'rgba(255,107,107,0.1)',
                    tension        : 0.4,
                    fill           : true,
                    pointRadius    : 2
                }]
            },
            options: {
                responsive         : true,
                maintainAspectRatio: true,
                plugins: { legend: { labels: { color:tc } } },
                scales : baseScales
            }
        }
    );

    this.charts.humPres = new Chart(
        document.getElementById('humidityPressureChart').getContext('2d'),
        {
            type: 'line',
            data: {
                labels  : [],
                datasets: [
                    {
                        label          : 'Umidita (%)',
                        data           : [],
                        borderColor    : '#4ecdc4',
                        backgroundColor: 'rgba(78,205,196,0.1)',
                        tension        : 0.4,
                        fill           : true,
                        yAxisID        : 'y',
                        pointRadius    : 2
                    },
                    {
                        label          : 'Pressione (hPa)',
                        data           : [],
                        borderColor    : '#95a5f6',
                        backgroundColor: 'rgba(149,165,246,0.1)',
                        tension        : 0.4,
                        fill           : true,
                        yAxisID        : 'y1',
                        pointRadius    : 2
                    }
                ]
            },
            options: {
                responsive         : true,
                maintainAspectRatio: true,
                plugins: { legend: { labels: { color:tc } } },
                scales: {
                    x  : { ticks:{ color:tc }, grid:{ color:gc } },
                    y  : { type:'linear', position:'left',  ticks:{ color:tc }, grid:{ color:gc } },
                    y1 : { type:'linear', position:'right', ticks:{ color:tc }, grid:{ display:false } }
                }
            }
        }
    );
};

WeatherStation.prototype._updateCharts = function () {
    var self   = this;
    var labels = this.history.timestamps.map(function (t) {
        return t.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
    });
    var temps = this.history.temperature.map(function (v) { return self._toDisplay(v); });

    this.charts.temp.data.labels            = labels;
    this.charts.temp.data.datasets[0].data  = temps;
    this.charts.temp.data.datasets[0].label = 'Temperatura (\u00b0' + this.tempUnit + ')';
    this.charts.temp.update('none');

    this.charts.humPres.data.labels               = labels;
    this.charts.humPres.data.datasets[0].data     = this.history.humidity;
    this.charts.humPres.data.datasets[1].data     = this.history.pressure;
    this.charts.humPres.update('none');
};

WeatherStation.prototype._chartTheme = function () {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var tc   = dark ? '#cbd5e1' : '#4a5568';
    var gc   = dark ? '#334155' : '#e2e8f0';
    [this.charts.temp, this.charts.humPres].forEach(function (chart) {
        if (!chart) return;
        chart.options.plugins.legend.labels.color = tc;
        ['x','y','y1'].forEach(function (ax) {
            var s = chart.options.scales[ax];
            if (!s) return;
            if (s.ticks) s.ticks.color = tc;
            if (s.grid && s.grid.color !== undefined) s.grid.color = gc;
        });
        chart.update('none');
    });
};

/* ================================================================
   Bootstrap
================================================================ */
document.addEventListener('DOMContentLoaded', function () {

    var station = new WeatherStation();

    auth.init().then(function () {

        if (auth.isLoggedIn()) {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('appContainer').style.display = 'block';
            station.start();
        } else {
            new LoginUI(function () { station.start(); });
        }

    });

});
