const CONFIG = {
    thingsboard: {
        url: 'https://demo.thingsboard.io',
        token: 'YOUR_ACCESS_TOKEN_HERE',
        deviceId: 'YOUR_DEVICE_ID_HERE',
        telemetryKeys: {
            temperature: 'temperature',
            humidity: 'humidity',
            pressure: 'pressure',
            windSpeed: 'windSpeed',
            windDirection: 'windDirection'
        }
    },
    
    update: {
        interval: 180000,
        historyInterval: 86400000
    },
    
    units: {
        temperature: '°C',
        humidity: '%',
        pressure: 'hPa',
        windSpeed: 'km/h'
    }
};
