<?php
require_once 'service.php';
$current = getWeatherData();
$history = getHistoricalData();
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>NextGen Weather Station</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
<div class="container">
    <header class="header">
        <div class="brand">
            <i class="fas fa-bolt" style="color: var(--accent)"></i>
            <h2 style="display:inline; margin-left:10px">Meteo Panel</h2>
        </div>
        <div class="last-update">
            <i class="fas fa-clock"></i>
            Sync: <?php echo $current['lastUpdate']; ?>
        </div>
    </header>

    <main class="weather-grid">
        <div class="weather-card">
            <div class="card-header">
                <i class="fas fa-thermometer-half"></i> Temperatura
            </div>
            <div class="main-value">
                <?php echo $current['temperature']; ?><span class="unit">°C</span>
            </div>
            <div style="color: #fb7185">▲ Max 24.1° | ▼ Min 18.5°</div>
        </div>

        <div class="weather-card">
            <div class="card-header">
                <i class="fas fa-droplet"></i> Umidità
            </div>
            <div class="main-value">
                <?php echo $current['humidity']; ?><span class="unit">%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: <?php echo $current['humidity']; ?>%"></div>
            </div>
        </div>

        <div class="weather-card">
            <div class="card-header">
                <i class="fas fa-wind"></i> Vento
            </div>
            <div class="main-value">
                <?php echo $current['windSpeed']; ?><span class="unit">km/h</span>
            </div>
            <div style="transform: rotate(<?php echo $current['windDirection']; ?>deg); display:inline-block">
                <i class="fas fa-location-arrow"></i>
            </div>
            <span style="margin-left:10px">Direzione: <?php echo $current['windDirection']; ?>°</span>
        </div>
    </main>

    <section style="margin-top: 3rem; background: var(--card-bg); padding: 2rem; border-radius: 24px;">
        <h3 style="margin-top:0"><i class="fas fa-chart-area"></i> Tendenza 24h</h3>
        <canvas id="weatherChart" height="100"></canvas>
    </section>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
    const ctx = document.getElementById('weatherChart').getContext('2d');
    const historyData = <?php echo json_encode($history); ?>;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: historyData.map(d => d.time),
            datasets: [{
                label: 'Temperatura °C',
                data: historyData.map(d => d.temp),
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    });
</script>
</body>
</html>