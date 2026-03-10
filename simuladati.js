function generateWeatherData() {
    const date = new Date();
    const hour = date.getHours();
    
    const baseTemp = 15; // Temperatura media
    const tempDailyCycle = Math.sin((hour - 6) * (Math.PI / 12)) * 10; // Curva sinusoidale
    const tempRandomNoise = (Math.random() - 0.5) * 1.5;
    const temperature = baseTemp + tempDailyCycle + tempRandomNoise;

    const baseHumidity = 65;
    const humidityNoise = (Math.random() - 0.5) * 15;
    const humidity = Math.min(100, Math.max(0, baseHumidity - (tempDailyCycle * 1.5) + humidityNoise));

    const pressure = 1013 + (Math.sin(hour / 6) * 5) + (Math.random() - 0.5) * 2;

    const windSpeed = Math.max(0, 8 + (Math.random() - 0.5) * 15);
    const windDirection = Math.floor(Math.random() * 360);

    return {
        temperature: parseFloat(temperature.toFixed(1)),
        humidity: parseFloat(humidity.toFixed(0)),
        pressure: parseFloat(pressure.toFixed(0)),
        windSpeed: parseFloat(windSpeed.toFixed(1)),
        windDirection: windDirection
    };
}

console.log(' Avvio simulatore Stazione Meteo...');

sendTelemetry();

const UPDATE_INTERVAL_MS = 10000; 
setInterval(sendTelemetry, UPDATE_INTERVAL_MS);