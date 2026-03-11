# Feedback Docente – Sensori Meteo Frontend

## Analisi dei Requisiti

### Perimetro e priorità delle funzionalità

Nei requisiti sono presenti funzionalità corrette ma molto avanzate rispetto allo scope di un frontend scolastico (previsioni meteo a 7 giorni, mappe meteo, 2FA, aspetti GDPR).

Manca una distinzione esplicita tra requisiti effettivamente previsti nel progetto e funzionalità pensate come estensioni future. Questa separazione è necessaria per chiarire il perimetro reale del frontend e rendere i requisiti verificabili.

---

### Frequenza di aggiornamento dei dati

La frequenza di aggiornamento è indicata in modo esemplificativo (ad esempio "ogni 3 ore"), ma non definita come requisito verificabile.

Va chiarito se l’intervallo di aggiornamento è vincolante oppure se il frontend si limita a visualizzare l’ultimo dato disponibile fornito dal backend, così da rendere il requisito misurabile e coerente con il perimetro del sistema.

---

### Fonte e acquisizione dei dati

In alcuni passaggi la raccolta dei dati è descritta come se il frontend acquisisse direttamente i valori dai sensori.

Va chiarito che il frontend non interroga i sensori, ma consuma esclusivamente i dati forniti dal backend tramite servizi o API. La comunicazione con i sensori e la gestione dei dati grezzi rientrano nel perimetro del backend.

---

## Analisi Funzionale

### Confine frontend / backend

L’analisi funzionale non mantiene un confine netto tra frontend e backend: in più passaggi vengono attribuite al frontend funzioni operative (configurazione sensori, gestione dispositivi) non coerenti con l’obiettivo dichiarato del progetto.

Questo rende lo scope poco stabile e introduce funzionalità non realistiche per un frontend. Va chiarito che il frontend si occupa esclusivamente di visualizzazione, consultazione e rappresentazione dei dati, mentre configurazione e gestione dei sensori rientrano nel perimetro del backend o sono fuori progetto.

---

### Gestione account, sicurezza e compliance

Nell’analisi funzionale sono presenti riferimenti a gestione account, sicurezza e compliance (ad esempio autenticazione avanzata, 2FA, aspetti GDPR, tracciamento accessi) che risultano molto approfonditi rispetto allo scopo del progetto frontend.

Va chiarito se queste voci siano parte del core del sistema o considerazioni di contesto non destinate a essere implementate, per mantenere stabile lo scope e il focus su monitoraggio e consultazione dei dati.

### Mappe meteo e confronto con dati storici

Funzionalità come mappe meteo e confronto con medie storiche sono interessanti dal punto di vista informativo, ma non sono chiaramente etichettate in termini di priorità.

Va chiarito se si tratti di funzionalità core da implementare oppure di estensioni future, poiché hanno un impatto rilevante su complessità, dati richiesti e strumenti di visualizzazione.

---

## Analisi Tecnica (valutazione indicativa)

### Scelte di stack e decisioni tecniche

L’analisi tecnica descrive il paradigma SPA e cita diverse opzioni, ma resta generica sul piano decisionale: vengono elencate alternative (framework, gestione stato, librerie grafici) senza fissare una scelta.

Mancano quindi uno stack definitivo con motivazione sintetica e le implicazioni operative minime (tooling di build, gestione dipendenze, struttura componenti). Senza queste scelte l’analisi tecnica non è pienamente verificabile e rende difficile stimare il carico implementativo.

---

### Integrazione dati e contratto API

Manca una specifica tecnica chiara su come il frontend integra e consuma i dati: endpoint/API, formato dei payload, gestione di paginazione e filtri temporali, e gestione degli stati di rete (loading/error/timeout, retry).

Va inoltre reso esplicito il confine architetturale: il frontend non comunica con sensori o telemetria direttamente, ma consuma esclusivamente dati esposti dal backend (o mediati dal backend se esistono piattaforme terze).

Senza queste informazioni non emerge il contratto dati minimo necessario per implementare dashboard e consultazione storica in modo testabile.

---

### Gestione autenticazione e accesso

Nel documento tecnico non è chiarito se e come il frontend gestisca meccanismi di autenticazione e accesso alle funzionalità.

Andrebbe esplicitato se il sistema prevede aree riservate o accesso pubblico e, in caso di autenticazione, demandare la scelta della soluzione tecnica (sessione, token, altro) mantenendo però chiaro il perimetro di responsabilità del frontend rispetto al backend.

L’assenza di questa indicazione rende incompleta la valutazione tecnica dello scope e delle responsabilità applicative.

---

### Qualità tecnica e gestione degli errori

L’analisi tecnica non affronta aspetti minimi di qualità applicativa come gestione degli errori lato frontend, feedback all’utente in caso di problemi di rete o dati mancanti, e criteri minimi di manutenibilità del codice.

Senza entrare in dettagli implementativi, sarebbe utile chiarire se sono previste pratiche di base (strutturazione dei componenti, gestione degli stati di errore, logging minimo lato frontend), così da rendere il progetto valutabile anche sul piano della robustezza e non solo delle funzionalità.
