const CONFIG = {
    thingsboard: {
        url      : 'https://demo.thingsboard.io',   // ← cambia con il tuo server TB

        /* Opzione A — credenziali utente TB (consigliato: il token viene rinnovato auto) */
        username : 'YOUR_TB_USERNAME@email.com',
        password : 'YOUR_TB_PASSWORD',

        /* Opzione B — token statico (JWT o Device Access Token).
           Se compili username+password sopra, questo viene ignorato. */
        staticToken: '',

        deviceId : 'YOUR_DEVICE_ID_HERE',           // ← UUID del dispositivo in TB

        telemetryKeys: {
            temperature   : 'temperature',
            humidity      : 'humidity',
            pressure      : 'pressure',
            windSpeed     : 'windSpeed',
            windDirection : 'windDirection'
        }
    },

    update: {
        interval        : 180000,   // ms — aggiornamento dati correnti (3 min)
        historyInterval : 86400000  // ms — finestra storica (24h)
    },

    units: {
        temperature : '°C',
        humidity    : '%',
        pressure    : 'hPa',
        windSpeed   : 'km/h'
    }
};
