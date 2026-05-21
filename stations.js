/**
 * stations.js — Registro delle stazioni meteorologiche
 *
 * Per aggiungere una nuova stazione, aggiungi un oggetto all'array STATIONS.
 * Ogni stazione può avere la propria configurazione ThingsBoard indipendente.
 *
 * Campi obbligatori: id, name, location
 * Campi opzionali:   icon, color, thingsboard (sovrascrive CONFIG.thingsboard)
 */
const STATIONS = [
    {
        id       : 'stazione-principale',
        name     : 'Stazione Principale',
        location : 'Lago di Garda — Desenzano',
        icon     : 'fas fa-mountain',
        color    : '#4ecdc4',          // colore accent nel sidebar
        status   : 'online',           // 'online' | 'offline' | 'maintenance'
        altitude : '68 m s.l.m.',
        coords   : { lat: 45.4654, lon: 10.5384 },

        /* Configurazione ThingsBoard specifica per questa stazione.
           Se omessa, usa quella globale in config.js.
           Se presente, sovrascrive config.js solo per questa stazione. */
        thingsboard: {
            // url      : 'https://demo.thingsboard.io',
            // username : 'YOUR_USERNAME@email.com',
            // password : 'YOUR_PASSWORD',
            // staticToken: '',
            // deviceId : 'YOUR_DEVICE_ID'
        }
    },

    // ── Esempio di seconda stazione (commentato) ──────────────────
    // {
    //     id       : 'stazione-nord',
    //     name     : 'Stazione Nord',
    //     location : 'Riva del Garda — TN',
    //     icon     : 'fas fa-wind',
    //     color    : '#ff6b6b',
    //     status   : 'online',
    //     altitude : '70 m s.l.m.',
    //     coords   : { lat: 45.8872, lon: 10.8400 },
    //     thingsboard: {
    //         deviceId: 'ALTRO_DEVICE_ID'
    //     }
    // },
];
