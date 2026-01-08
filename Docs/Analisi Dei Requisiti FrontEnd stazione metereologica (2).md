**ANALISI DEI REQUISITI**

**Requisiti funzionali**

* **Acquisizione dati dal sensore**  
  Il sistema deve visualizzare i dati meteo forniti dal backend, che raccoglie i dati dal sensore locale, come temperatura, umidità, pressione, velocità e direzione del vento.  
  I dati devono aggiornarsi automaticamente con una frequenza configurabile o mostrando l’ultimo dato disponibile.  
* **Visualizzazione dati in tempo reale**  
  I dati raccolti devono essere mostrati in tempo reale o quasi, senza che l’utente debba aggiornare manualmente la pagina.  
* **Dashboard principale**  
  Deve esserci una schermata principale che riassume chiaramente i dati più importanti: temperatura, umidità, pressione e vento.  
  Da qui si deve poter interagire per vedere informazioni più dettagliate.  
* **Visualizzazione previsioni meteo**  
  L’utente deve poter vedere le previsioni meteo dettagliate, sia orarie per 24 ore, sia giornaliere per 7 giorni.  
  Le previsioni saranno mostrate con grafici e icone facili da capire e interattive.  
* **Gestione notifiche e allerte**  
  Il sistema deve avvisare l’utente in caso di eventi meteo importanti (come temporali, vento forte o neve).  
  L’utente deve poter impostare le soglie per ricevere queste notifiche.  
* **Personalizzazione**  
  L’utente deve poter scegliere le unità di misura (Celsius/Fahrenheit, km/h o mph, mm o pollici).  
  Deve poter selezionare il tema grafico (chiaro o scuro).  
  Deve poter scegliere la lingua dell’interfaccia.  
* **Esportazione dati**  
  L’utente deve poter esportare i dati storici per fare analisi esterne, in formati comuni come CSV o JSON.


**Requisiti non funzionali**

*  **Usabilità**  
  L’interfaccia deve essere semplice e intuitiva, facile da usare anche per chi non è esperto.  
  Le informazioni devono essere chiare e immediate.  
* **Responsività**  
  L’interfaccia deve adattarsi bene a tutti i dispositivi: computer, tablet e smartphone.  
* **Compatibilità**  
  Il sistema deve funzionare correttamente sui principali browser: Chrome, Firefox, Safari ed Edge.  
* **Affidabilità**  
  Deve esserci un sistema che gestisce gli errori: se il backend non fornisce dati o la connessione non è disponibile, deve comparire un messaggio chiaro, ad esempio “Errore di connessione con il server”.  
* **Performance**  
  I dati devono aggiornarsi e mostrarsi rapidamente, senza rallentamenti evidenti.  
* **Sicurezza**  
  I dati devono essere protetti quando viaggiano tra backend e frontend, usando protocolli sicuri come HTTPS.

**Requisiti di interazione**

*  **Navigazione**  
  L’utente deve poter spostarsi facilmente tra le varie schermate (dashboard, dettagli previsioni, mappe, impostazioni).  
  Deve esserci il supporto per gesture touch, come lo swipe per cambiare giorno o ora.  
* **Filtri e selezione**  
  L’utente deve poter scegliere intervalli di tempo per vedere i dati storici, per esempio giornalieri, settimanali o mensili.  
* **Accessibilità**  
  Il sistema deve seguire le linee guida base per l’accessibilità, come un buon contrasto dei colori, testi leggibili e possibilità di navigare usando solo la tastiera.  
    
  