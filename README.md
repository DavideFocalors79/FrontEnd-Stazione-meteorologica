# Frontend - Stazione Meteorologica

Dashboard web per il monitoraggio di una stazione meteorologica, con backend PHP/MySQL integrato e connessione a ThingsBoard IoT.

---

## Struttura del progetto

```
├── index.html          — pagina principale (modalità statica / file://)
├── index.php           — entry point PHP (modalità server — serve HTML + gestisce API)
├── api.php             — endpoint REST separato (alternativo a index.php)
├── style.css           — stili (tema chiaro/scuro)
├── script.js           — logica client: ThingsBoard API, grafici Chart.js, multi-stazione
├── auth.js             — autenticazione dual-mode (PHP/MySQL oppure localStorage+PBKDF2)
├── config.js           — configurazione globale ThingsBoard (URL, credenziali, deviceId)
├── stations.js         — registro delle stazioni meteorologiche
├── simuladati.js       — generatore di telemetria simulata (ciclo sinusoidale giornaliero)
├── schema.sql          — schema MySQL (tabella users, query di manutenzione)
├── hash_password.php   — utility CLI per generare hash bcrypt da inserire nel DB
├── Diagnostica.php     — pagina di diagnostica PHP/estensioni (da eliminare in produzione)
├── avvia.bat           — avvio rapido del server PHP su Windows
└── Docs/
    ├── Analisi Dei Requisiti FrontEnd stazione metereologica.md
    ├── Analisi Funzionale FrontEnd stazione metereologica.md
    ├── Analisi Tecnica FrontEnd stazione metereologica.md
    ├── Project Plan.md
    └── Gantt_FrontEnd_stazione_meteorologica.xlsx
```

---

## Cosa è implementato

### Dashboard meteorologica
- Visualizzazione in tempo reale di temperatura, umidità, pressione, velocità e direzione del vento
- Rosa dei venti con indicatore grafico della direzione
- Valori min/max calcolati sullo storico della sessione
- Grafici storici (Chart.js via CDN): temperatura su un asse, umidità e pressione su asse doppio
- Aggiornamento automatico configurabile (default: 3 minuti per i dati correnti, 24 h di finestra storica)

### Integrazione ThingsBoard
- Client ThingsBoard completo in `script.js` (classe `ThingsBoardAPI`)
- Supporto autenticazione con credenziali utente TB (token JWT rinnovato automaticamente) oppure token statico
- Recupero telemetria in tempo reale e storica via API REST ThingsBoard
- Fallback automatico ai dati simulati se ThingsBoard non è configurato o non raggiungibile

### Multi-stazione
- Registro stazioni in `stations.js`: ogni stazione può avere la propria configurazione ThingsBoard indipendente
- Selezione stazione dalla sidebar con accordion
- Stazione attiva persistita in `localStorage`

### Autenticazione dual-mode (`auth.js`)
- **Modalità API** (quando `index.php` è servito da PHP con MySQL raggiungibile): sessioni server-side, password bcrypt con cost 12
- **Modalità LOCAL** (fallback automatico se il DB non è disponibile o si apre `index.html` come file statico): hash PBKDF2 con 200.000 iterazioni, utenti e sessione in `localStorage`
- Il rilevamento della modalità avviene automaticamente all'avvio; un banner informa l'utente della modalità attiva

### Pannello Admin
- Accessibile solo agli utenti con ruolo `admin`
- Creazione nuovi utenti con assegnazione del ruolo (utente / admin)
- Elenco utenti con possibilità di eliminazione
- Disponibile in entrambe le modalità (API e LOCAL)

### Personalizzazione e persistenza
- Tema chiaro/scuro — persiste in `localStorage`
- Unità di temperatura °C / °F — persiste in `localStorage`
- Stazione attiva — persiste in `localStorage`

### Simulatore dati (`simuladati.js`)
- Genera telemetria realistica con ciclo sinusoidale giornaliero per la temperatura
- Aggiornamento ogni 10 secondi (configurabile)
- Utile per test senza dispositivo fisico

---

## Come avviare

### Modalità statica (senza PHP)
Apri `index.html` direttamente nel browser. L'autenticazione usa la modalità LOCAL (localStorage + PBKDF2). ThingsBoard deve essere configurato in `config.js` oppure vengono usati i dati simulati.

### Modalità server PHP (con MySQL)

**Windows — avvio rapido:**
```
avvia.bat
```
Il file avvia `php -S localhost:8080` e apre automaticamente il browser.

**Manuale (qualsiasi OS):**
```bash
php -S localhost:8080
```
Poi aprire `http://localhost:8080`.

**Requisiti PHP:** estensioni `pdo`, `pdo_mysql`, `mysqli`. Usa `Diagnostica.php` per verificarle.

---

## Configurazione

### 1. Database MySQL
```bash
# Crea le tabelle
mysql -u root -p < schema.sql

# Genera hash per il primo utente admin
php hash_password.php admin LaPasswordScelta admin
```
Aggiorna le costanti `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` in cima a `index.php`.

### 2. ThingsBoard
Modifica `config.js`:
```js
const CONFIG = {
    thingsboard: {
        url      : 'https://demo.thingsboard.io',  // ← il tuo server TB
        username : 'utente@email.com',
        password : 'password',
        deviceId : 'UUID-del-dispositivo',
        // oppure usa staticToken al posto di username/password
    }
};
```

### 3. Aggiungere stazioni
Aggiungi oggetti all'array in `stations.js`. Ogni stazione può sovrascrivere la configurazione ThingsBoard globale.

---

## Prossimi passi consigliati
- Rimuovere `Diagnostica.php` prima del deploy in produzione
- Aggiungere HTTPS (obbligatorio per le Web Crypto API usate in modalità LOCAL su domini non-localhost)
- Spostare le credenziali DB di `index.php` in variabili d'ambiente o file `.env`
- Implementare l'esportazione dati in CSV
- Migliorare l'accessibilità (ARIA label, navigazione da tastiera)
- Aggiungere supporto PWA per installazione su dispositivi mobili
