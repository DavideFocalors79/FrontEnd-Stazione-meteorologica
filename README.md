# Frontend - Stazione Meteorologica

Questa è una semplice SPA statica di prototipo per la dashboard di una stazione meteorologica.

File principali:
- `index.html` - pagina principale
- `styles.css` - stili
- `app.js` - logica client-side, mock dei dati, grafici con Chart.js

Come provare localmente:
1. Apri `index.html` nel browser (funziona come pagina statica).

Cosa è implementato:
- Dashboard con condizioni attuali
- Grafici per temperatura, umidità e pressione (Chart.js via CDN)
- Mock dati aggiornati ogni 5 secondi
- Impostazioni per unità e tema (persistenza della sessione non implementata)
- Esportazione dati in CSV

Prossimi passi consigliati:
- Collegare i dati reali dal sensore via WebSocket/HTTP
- Aggiungere autenticazione e notifiche
- Migliorare accessibilità e internazionalizzazione