# Frontend - Stazione Meteorologica

Questa è una semplice SPA statica di prototipo per la dashboard di una stazione meteorologica.

File principali:
- `index.php` - pagina principale
- `style.css` - stili
- `weather_data.php` - Collegamento con ThingsBoard
- `config.php` - Configurazione del token per riceve i dati dal dispositivo backend
- `service.php` - Generazione di dati casuali che verrà sostituito

Come provare localmente:
1. Apri `index.php` nel browser (funziona come pagina statica).

Cosa è implementato:
- Dashboard con condizioni attuali
- Grafici per temperatura, umidità e pressione (Chart.js via CDN)
- Mock dati aggiornati ogni 5 secondi
- Impostazioni per unità e tema (persistenza della sessione non implementata)
- Esportazione dati in CSV

Prossimi passi consigliati:
- Collegare i dati reali dal sensore via ThingsBoard
- Aggiungere autenticazione 
- Migliorare accessibilità 


