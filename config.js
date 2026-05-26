const CONFIG = {
    thingsboard: {
        url         : 'https://demo.thingsboard.io',
        username    : 'YOUR_TB_USERNAME@email.com',
        password    : 'YOUR_TB_PASSWORD',
        staticToken : '',
        deviceId    : 'YOUR_DEVICE_ID_HERE',
        telemetryKeys: {
            temperature   : 'temperature',
            humidity      : 'humidity',
            pressure      : 'pressure',
            windSpeed     : 'windSpeed',
            windDirection : 'windDirection'
        }
    },
    update: {
        interval        : 180000,
        historyInterval : 86400000
    },
    units: {
        temperature : 'C',
        humidity    : '%',
        pressure    : 'hPa',
        windSpeed   : 'km/h'
    }
};
