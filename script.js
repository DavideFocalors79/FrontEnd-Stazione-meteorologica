class WeatherStation {
    constructor() {
        this.charts = {};
        this.historicalData = {
            temperature: [],
            humidity: [],
            pressure: [],
            timestamps: []
        };
        this.currentData = {};
        this.updateInterval = null;
       
        this.init();
    }

    init() {
        this.setupThemeToggle();
        this.setupCharts();
        this.loadData();
        this.startAutoUpdate();
        this.setupErrorHandling();
    }

    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            this.updateThemeIcon(newTheme);
            this.updateChartTheme();
        });
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    setupErrorHandling() {
        const closeError = document.getElementById('closeError');
        closeError.addEventListener('click', () => {
            document.getElementById('errorBanner').classList.remove('show');
        });
    }

    showError(message) {
        const errorBanner = document.getElementById('errorBanner');
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorBanner.classList.add('show');
       
        setTimeout(() => {
            errorBanner.classList.remove('show');
        }, 5000);
    }

    async loadData() {
        try {
            this.updateLoadingState(true);
           
            await Promise.all([
                this.fetchCurrentData(),
                this.fetchHistoricalData()
            ]);
           
            this.updateUI();
            this.updateCharts();
            this.updateLastUpdateTime();
           
        } catch (error) {
            console.error('Errore nel caricamento dei dati:', error);
            this.showError('Errore di connessione con il sensore. Riprova tra poco.');
        } finally {
            this.updateLoadingState(false);
        }
    }

    async fetchCurrentData() {
        if (!CONFIG.thingsboard.token || CONFIG.thingsboard.token === 'YOUR_ACCESS_TOKEN_HERE') {
            this.useDemoData();
            return;
        }

        // Il protocollo HTTPS è garantito dall'URL in config.js
        const url = `${CONFIG.thingsboard.url}/api/plugins/telemetry/DEVICE/${CONFIG.thingsboard.deviceId}/values/timeseries`;
        const keys = Object.values(CONFIG.thingsboard.telemetryKeys).join(',');
       
        try {
            const response = await fetch(`${url}?keys=${keys}`, {
                method: 'GET',
                headers: {
                    'X-Authorization': `Bearer ${CONFIG.thingsboard.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Errore HTTPS! Status: ${response.status}`);
            }

            const data = await response.json();
            this.currentData = this.parseThingsboardData(data);
        } catch (error) {
            console.error('Errore durante la fetch HTTPS:', error);
            throw error; // Rilancia per la gestione globale degli errori
        }
    }

    async fetchHistoricalData() {
        if (!CONFIG.thingsboard.token || CONFIG.thingsboard.token === 'YOUR_ACCESS_TOKEN_HERE') {
            this.generateDemoHistoricalData();
            return;
        }

        const endTs = Date.now();
        const startTs = endTs - CONFIG.update.historyInterval;
        const keys = Object.values(CONFIG.thingsboard.telemetryKeys).join(',');
       
        const url = `${CONFIG.thingsboard.url}/api/plugins/telemetry/DEVICE/${CONFIG.thingsboard.deviceId}/values/timeseries`;
       
        try {
            const response = await fetch(`${url}?keys=${keys}&startTs=${startTs}&endTs=${endTs}`, {
                method: 'GET',
                headers: {
                    'X-Authorization': `Bearer ${CONFIG.thingsboard.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Errore HTTPS Storico! Status: ${response.status}`);
            }

            const data = await response.json();
            this.parseHistoricalData(data);
        } catch (error) {
            console.error('Errore durante la fetch storica HTTPS:', error);
            throw error;
        }
    }

    parseThingsboardData(data) {
        const result = {};
        for (const [key, values] of Object.entries(data)) {
            if (values && values.length > 0) {
                const mappedKey = this.mapTelemetryKey(key);
                if (mappedKey) {
                    result[mappedKey] = parseFloat(values[0].value);
                }
            }
        }
        return result;
    }

    parseHistoricalData(data) {
        const hours = 24;
        const interval = CONFIG.update.historyInterval / hours;
       
        this.historicalData = {
            temperature: [],
            humidity: [],
            pressure: [],
            windSpeed: [],
            windDirection: [],
            timestamps: []
        };

        for (let i = 0; i < hours; i++) {
            const timestamp = Date.now() - (hours - i) * interval;
            this.historicalData.timestamps.push(new Date(timestamp));
        }

        for (const key in data) {
            const values = data[key];
            if (values && values.length > 0) {
                const mappedKey = this.mapTelemetryKey(key);
                if (mappedKey && this.historicalData.hasOwnProperty(mappedKey)) {
                    const sortedValues = values.sort((a, b) => a.ts - b.ts);
                    this.historicalData[mappedKey] = sortedValues.map(v => parseFloat(v.value));
                }
            }
        }
    }

    mapTelemetryKey(key) {
        const mapping = {
            [CONFIG.thingsboard.telemetryKeys.temperature]: 'temperature',
            [CONFIG.thingsboard.telemetryKeys.humidity]: 'humidity',
            [CONFIG.thingsboard.telemetryKeys.pressure]: 'pressure',
            [CONFIG.thingsboard.telemetryKeys.windSpeed]: 'windSpeed',
            [CONFIG.thingsboard.telemetryKeys.windDirection]: 'windDirection'
        };
        return mapping[key];
    }

    useDemoData() {
        this.currentData = {
            temperature: 22.5 + (Math.random() - 0.5) * 2,
            humidity: 65 + (Math.random() - 0.5) * 10,
            pressure: 1013 + (Math.random() - 0.5) * 5,
            windSpeed: 12 + (Math.random() - 0.5) * 8,
            windDirection: Math.floor(Math.random() * 360)
        };
    }

    generateDemoHistoricalData() {
        const hours = 24;
        this.historicalData = {
            temperature: [],
            humidity: [],
            pressure: [],
            windSpeed: [],
            windDirection: [],
            timestamps: []
        };

        for (let i = 0; i < hours; i++) {
            const timestamp = new Date(Date.now() - (hours - i) * 3600000);
            this.historicalData.timestamps.push(timestamp);
           
            this.historicalData.temperature.push(20 + Math.sin(i / 4) * 5 + (Math.random() - 0.5) * 2);
            this.historicalData.humidity.push(60 + Math.cos(i / 3) * 15 + (Math.random() - 0.5) * 5);
            this.historicalData.pressure.push(1013 + Math.sin(i / 6) * 3 + (Math.random() - 0.5));
            this.historicalData.windSpeed.push(10 + Math.sin(i / 5) * 8 + (Math.random() - 0.5) * 3);
            this.historicalData.windDirection.push(Math.floor(Math.random() * 360));
        }
    }

    updateUI() {
        const temp = this.currentData.temperature || 0;
        const humidity = this.currentData.humidity || 0;
        const pressure = this.currentData.pressure || 0;
        const windSpeed = this.currentData.windSpeed || 0;
        const windDirection = this.currentData.windDirection || 0;

        document.querySelector('#temperature .value').textContent = temp.toFixed(1);
       
        const tempHistory = this.historicalData.temperature;
        if (tempHistory.length > 0) {
            const maxTemp = Math.max(...tempHistory);
            const minTemp = Math.min(...tempHistory);
            document.getElementById('tempMax').textContent = `${maxTemp.toFixed(1)}°C`;
            document.getElementById('tempMin').textContent = `${minTemp.toFixed(1)}°C`;
        }

        document.querySelector('#humidity .value').textContent = humidity.toFixed(0);
        const humidityProgress = document.getElementById('humidityProgress');
        humidityProgress.style.width = `${Math.min(humidity, 100)}%`;
       
        const humidityStatus = this.getHumidityStatus(humidity);
        document.getElementById('humidityStatus').textContent = humidityStatus;

        document.querySelector('#pressure .value').textContent = pressure.toFixed(0);
        const pressureStatus = this.getPressureStatus(pressure);
        document.getElementById('pressureStatus').textContent = pressureStatus.text;
        document.getElementById('pressureTrend').className = pressureStatus.icon;

        document.querySelector('#windSpeed .value').textContent = windSpeed.toFixed(1);
       
        const windArrow = document.getElementById('windArrow');
        windArrow.style.transform = `translate(-50%, -50%) rotate(${windDirection}deg)`;
       
        const windDir = this.getWindDirection(windDirection);
        document.getElementById('windDirection').textContent = windDir;

        document.querySelectorAll('.weather-card').forEach(card => {
            card.classList.add('fade-in');
        });
    }

    getHumidityStatus(humidity) {
        if (humidity < 30) return 'Bassa';
        if (humidity < 60) return 'Normale';
        if (humidity < 80) return 'Alta';
        return 'Molto Alta';
    }

    getPressureStatus(pressure) {
        if (pressure < 1000) {
            return { text: 'Bassa', icon: 'fas fa-arrow-down' };
        } else if (pressure < 1020) {
            return { text: 'Normale', icon: 'fas fa-minus' };
        } else {
            return { text: 'Alta', icon: 'fas fa-arrow-up' };
        }
    }

    getWindDirection(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    setupCharts() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#cbd5e1' : '#4a5568';
        const gridColor = isDark ? '#334155' : '#e2e8f0';

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        font: {
                            size: 12
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        };

        const tempCtx = document.getElementById('temperatureChart').getContext('2d');
        this.charts.temperature = new Chart(tempCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Temperatura (°C)',
                    data: [],
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: commonOptions
        });

        const humPressCtx = document.getElementById('humidityPressureChart').getContext('2d');
        this.charts.humidityPressure = new Chart(humPressCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Umidità (%)',
                        data: [],
                        borderColor: '#4ecdc4',
                        backgroundColor: 'rgba(78, 205, 196, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Pressione (hPa)',
                        data: [],
                        borderColor: '#95a5f6',
                        backgroundColor: 'rgba(149, 165, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                ...commonOptions,
                scales: {
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        ticks: { color: textColor },
                        grid: { color: gridColor },
                        title: {
                            display: true,
                            text: 'Umidità (%)',
                            color: textColor
                        }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        ticks: { color: textColor },
                        grid: { display: false },
                        title: {
                            display: true,
                            text: 'Pressione (hPa)',
                            color: textColor
                        }
                    }
                }
            }
        });
    }

    updateCharts() {
        const labels = this.historicalData.timestamps.map(t =>
            t.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
        );

        this.charts.temperature.data.labels = labels;
        this.charts.temperature.data.datasets[0].data = this.historicalData.temperature;
        this.charts.temperature.update('none');

        this.charts.humidityPressure.data.labels = labels;
        this.charts.humidityPressure.data.datasets[0].data = this.historicalData.humidity;
        this.charts.humidityPressure.data.datasets[1].data = this.historicalData.pressure;
        this.charts.humidityPressure.update('none');
    }

    updateChartTheme() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#cbd5e1' : '#4a5568';
        const gridColor = isDark ? '#334155' : '#e2e8f0';

        Object.values(this.charts).forEach(chart => {
            chart.options.plugins.legend.labels.color = textColor;
           
            if (chart.options.scales.x) {
                chart.options.scales.x.ticks.color = textColor;
                chart.options.scales.x.grid.color = gridColor;
            }
           
            if (chart.options.scales.y) {
                chart.options.scales.y.ticks.color = textColor;
                chart.options.scales.y.grid.color = gridColor;
                if (chart.options.scales.y.title) {
                    chart.options.scales.y.title.color = textColor;
                }
            }
           
            if (chart.options.scales.y1) {
                chart.options.scales.y1.ticks.color = textColor;
                if (chart.options.scales.y1.title) {
                    chart.options.scales.y1.title.color = textColor;
                }
            }
           
            chart.update('none');
        });
    }

    startAutoUpdate() {
        this.updateInterval = setInterval(() => {
            this.loadData();
        }, CONFIG.update.interval);
    }

    updateLoadingState(isLoading) {
        const lastUpdate = document.getElementById('lastUpdate').parentElement;
        if (isLoading) {
            lastUpdate.classList.add('updating');
        } else {
            lastUpdate.classList.remove('updating');
        }
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit'
        });
        document.getElementById('lastUpdate').textContent = `Aggiornato alle ${timeString}`;
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        Object.values(this.charts).forEach(chart => chart.destroy());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const weatherStation = new WeatherStation();
   
    window.addEventListener('beforeunload', () => {
        weatherStation.destroy();
    });
});