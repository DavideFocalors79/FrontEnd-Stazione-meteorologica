const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

// Oggetto per la gestione dello stato dell'applicazione
const appState = {
    isLoggedIn: false,
    user: {
        name: 'Mario Rossi',
        email: 'mario@email.it',
        role: 'Utente',
    },
    settings: {
        unitTemp: 'C',
        theme: 'light', // Può essere 'light' o 'dark'
    },
    currentWeatherData: {
        location: 'Sede Centrale',
        temperature: 24.5,
        condition: 'Soleggiato ☀️',
        humidity: 65,
        pressure: 1012,
        wind: 15,
    },
    alerts: [
        { message: 'Vento forte atteso dalle 14:00. Prestare attenzione.', severity: 'normal' },
        { message: 'Allerta Critica: Rischio idrogeologico elevato.', severity: 'critical' },
    ]
};

// --- Funzioni di Interfaccia ---

/** Mostra una pagina all'interno della dashboard */
function showPage(id) {
    qsa('.page').forEach(p => p.classList.remove('active'));
    const page = qs(`#page-${id}`);
    if (page) page.classList.add('active');

    // Aggiorna l'indicatore attivo nella navbar
    qsa('.nav-link').forEach(btn => btn.classList.remove('active-nav'));
    qs(`.nav-link[data-target="${id}"]`).classList.add('active-nav');
}

/** Mostra una sezione principale (login, register, dashboard) */
function showSection(id) {
    qsa('.section').forEach(s => s.classList.remove('active'));
    const section = qs(`#${id}`);
    if (section) section.classList.add('active');
    
    // Gestione stato login
    if (id === 'dashboard-section') {
        appState.isLoggedIn = true;
        updateDashboard();
        updateUserProfile();
        updateAlerts();
        showPage('dashboard');
    } else {
        appState.isLoggedIn = false;
    }
}

// --- Funzioni di Aggiornamento Dati e UI ---

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    // Ridisegna i grafici con i nuovi colori del tema
    initCharts(); 
}

function updateDashboard() {
    const { temperature, condition, humidity, pressure, wind } = appState.currentWeatherData;
    const unit = appState.settings.unitTemp;
    
    let displayTemp = temperature;
    if (unit === 'F') {
        displayTemp = (temperature * 9 / 5) + 32;
    }

    qs('#location').textContent = `Località: ${appState.currentWeatherData.location}`;
    qs('#temperature').textContent = `${displayTemp.toFixed(1)}°${unit}`;
    qs('#condition').textContent = condition;
    qs('#humidity').textContent = `${humidity}%`;
    qs('#pressure').textContent = `${pressure} hPa`;
    qs('#wind').textContent = `${wind} km/h`;
}

function updateUserProfile() {
    qs('#profileName').textContent = appState.user.name;
    qs('#profileEmail').textContent = appState.user.email;
    qs('#profileRole').textContent = appState.user.role;
}

function updateAlerts() {
    const alertsList = qs('#alertsList');
    alertsList.innerHTML = '';
    
    if (appState.alerts.length === 0) {
        alertsList.innerHTML = '<li>Nessuna allerta presente.</li>';
        return;
    }

    appState.alerts.forEach(alert => {
        const li = document.createElement('li');
        li.textContent = alert.message;
        if (alert.severity === 'critical') {
            li.classList.add('critical');
        }
        alertsList.appendChild(li);
    });
}

// --- Grafici (Migliorati) ---

// Mappa i colori in base al tema per una migliore leggibilità
const getChartColors = () => {
    if (appState.settings.theme === 'dark') {
        return {
            temp: '#ff6b6b', hum: '#868e96', pres: '#51cf66', forecast: '#fcc419', history: '#7950f2'
        };
    } else {
        return {
            temp: '#ff6b6b', hum: '#4dabf7', pres: '#51cf66', forecast: '#fcc419', history: '#7950f2'
        };
    }
};

function createDemoChart(id, label, color) {
    const canvas = qs(`#${id}`);
    if (canvas.chart) {
        canvas.chart.destroy(); // Distrugge il vecchio grafico prima di ricrearlo
    }

    const ctx = canvas.getContext('2d');
    
    // Generazione dati demo
    let data = Array.from({length: 24}, () => Math.floor(Math.random() * 30) + 5); 
    if (id === 'tempChart') data = Array.from({length: 24}, (_, i) => Math.floor(Math.random() * 15) + 15);
    else if (id === 'presChart') data = Array.from({length: 24}, (_, i) => Math.floor(Math.random() * 10) + 1005);
    
    canvas.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => (i < 10 ? '0' + i : i) + ":00"),
            datasets: [{
                label: label,
                data: data,
                borderColor: color,
                backgroundColor: color + '33',
                tension: 0.4, 
                fill: true,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: false, ticks: { color: appState.settings.theme === 'dark' ? '#ccc' : '#333' } }
            }
        }
    });
}

function initCharts() {
    const colors = getChartColors();
    createDemoChart('tempChart', 'Temperatura', colors.temp);
    createDemoChart('humChart', 'Umidità', colors.hum);
    createDemoChart('presChart', 'Pressione', colors.pres);
    createDemoChart('forecastChart', 'Previsioni', colors.forecast);
    createDemoChart('historyChart', 'Storico', colors.history);
}

// --- Event Listeners ---

// Autenticazione
qs('#btnLogin').addEventListener('click', () => {
    // Simulazione di login riuscito
    showSection('dashboard-section');
});

qs('#logoutBtn').addEventListener('click', () => {
    showSection('login-section');
});

// Switch tra form
qs('#showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('register-section');
});

qs('#showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('login-section');
});

// Navigazione
qsa('.nav-link').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.target)));

// Salvataggio impostazioni
qs('#saveSettings').addEventListener('click', () => {
    const newUnit = qs('#unitTemp').value;
    const newTheme = qs('#themeSelect').value;
    
    appState.settings.unitTemp = newUnit;
    appState.settings.theme = newTheme;
    
    applyTheme(newTheme);
    updateDashboard();
    
    alert('💾 Impostazioni salvate con successo!');
});


// --- Inizializzazione ---

// Applicazione del tema iniziale e impostazioni iniziali
applyTheme(appState.settings.theme);
qs('#unitTemp').value = appState.settings.unitTemp;
qs('#themeSelect').value = appState.settings.theme;

// Inizializzazione dei grafici
initCharts(); 

// Avvio: mostra la pagina di login
showSection('login-section');