     **ANALISI FUNZIONALE**

**Scopo del front end del meteo**  
Il frontend del meteo serve a fornire agli utenti informazioni sul tempo in modo semplice, veloce e interattivo. Deve permettere di vedere i dati attuali, le previsioni a breve e lungo termine e eventuali allerte, così da aiutare a prendere decisioni basate sulle condizioni del tempo.  
Il frontend è l’interfaccia che collega l’utente al backend, che raccoglie e elabora i dati meteorologici provenienti da un sensore locale.

## **Funzionalità principali**

### Dashboard principale

La dashboard rappresenta la schermata iniziale dell’applicazione e mostra le informazioni meteo più rilevanti per la località associata al sensore.  
Funzionalità:

* Visualizzazione della località (con possibile estensione futura alla geolocalizzazione).  
* Condizioni meteo attuali:  
  * temperatura,  
  * stato del cielo (soleggiato, nuvoloso, pioggia, neve) con icona rappresentativa.  
* Dati aggiuntivi:  
  * umidità,  
  * pressione atmosferica,  
  * velocità e direzione del vento,  
  * visibilità.  
* Mini-grafici o indicatori sintetici sull’andamento previsto nelle ore o nei giorni successivi.  
* Navigazione interattiva: possibilità di selezionare elementi o scorrere per cambiare giorno o fascia oraria.

### Previsioni meteo

Sezione dedicata alla consultazione dettagliata delle previsioni.  
Funzionalità:

* Visualizzazione:  
  * oraria (ultime 24 ore),  
  * giornaliera (fino a 7 giorni).  
* Grafici a linee per:  
  * temperatura,  
  * umidità,  
  * pressione.  
* Grafici a barre per le precipitazioni.  
* Icone animate per vento e copertura nuvolosa.  
* Interazione con i grafici (hover) per visualizzare valori puntuali.  
* Selezione di un giorno per analisi ora per ora.

### Notifiche e allerte

Il front end consente la visualizzazione e gestione delle notifiche, mentre la logica di generazione delle allerte è demandata al backend.  
Funzionalità:

* Notifiche visive (e/o push) per eventi meteo rilevanti (temporali, vento forte, neve).  
* Consultazione della cronologia delle allerte.  
* Personalizzazione delle soglie di notifica (valori impostati e applicati dal backend).

## Personalizzazione dell’interfaccia

Il front end consente all’utente di personalizzare l’esperienza di visualizzazione.  
Funzionalità:

* Scelta delle unità di misura:  
  * Celsius / Fahrenheit,  
  * km/h / mph,  
  * mm / pollici.  
* Tema grafico:  
  * chiaro,  
  * scuro,  
  * adattivo alle condizioni meteo.

* Selezione della lingua dell’interfaccia.  
* Attivazione e configurazione delle notifiche.

## Requisiti di interfaccia

### Layout

* Struttura chiara e intuitiva:  
  * barra superiore per località e navigazione,  
  * area centrale per le condizioni principali,  
  * sezioni laterali o inferiori per dettagli e impostazioni.

### Colori

* Palette coerente con le condizioni meteo (blu per pioggia, giallo per sole).  
* Attenzione al contrasto per garantire accessibilità e leggibilità.

### Icone

* Icone intuitive per condizioni meteo e navigazione.  
* Coerenza grafica in tutta l’applicazione.  
    
    
    
    
    
    
  


### Adattabilità

* Interfaccia responsive, ottimizzata per:  
  * desktop,  
  * tablet,  
  * smartphone.

## Gestione account e accessi

La gestione degli account è considerata funzionalità di contesto, necessaria per la personalizzazione dell’esperienza, ma non rappresenta il focus principale del front end meteo.

### Tipi di account

Utente base

* Visualizza dati meteo e previsioni.  
* Personalizza tema, lingua e unità di misura.  
* Gestisce le proprie notifiche.

Amministratore

* Accesso completo alle funzionalità di visualizzazione.  
* Gestione degli utenti tramite interfaccia front end (le operazioni sono eseguite dal backend).  
* Consultazione delle impostazioni globali del sistema.

### Autenticazione e sicurezza

Le funzionalità di sicurezza (autenticazione, 2FA, protezione dei dati) sono gestite dal backend.  
 Il front end fornisce esclusivamente le interfacce di:

* login,  
* recupero credenziali,  
* gestione del profilo.

Il rispetto delle normative GDPR è considerato un requisito di sistema, non una funzionalità implementativa del frontend.

### Profilo utente

Ogni utente dispone di una sezione “Profilo” per:

* modificare le preferenze personali,  
* gestire le notifiche,  
* visualizzare informazioni di accesso fornite dal backend.

