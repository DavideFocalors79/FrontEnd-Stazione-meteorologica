# Project Plan

## Frontend – Stazione Meteorologica

## 1\. Finalità del documento

Il presente Project Plan descrive le modalità con cui il progetto Frontend – Stazione Meteorologica viene pianificato, sviluppato e monitorato nel tempo secondo una struttura organizzata per milestone.  
Il documento definisce:

* obiettivi del progetto  
* ambito del lavoro  
* architettura di riferimento  
* organizzazione e gestione del team  
* pianificazione temporale  
* criteri di verifica e validazione

Il Project Plan non è un documento statico, ma può essere aggiornato nel corso dello sviluppo per riflettere eventuali modifiche tecniche o organizzative emerse durante le milestone.

## 2\. Obiettivi del progetto

## Obiettivo principale

Realizzare un frontend web in grado di visualizzare dati meteorologici provenienti da una sorgente esterna, rappresentandoli attraverso una dashboard interattiva, chiara e facilmente estendibile.  
Il frontend:

* riceve dati già strutturati  
* non conosce il funzionamento del sensore  
* non gestisce logiche di acquisizione  
* non interagisce con componenti hardware

Il suo compito esclusivo è la rappresentazione dei dati ricevuti, garantendo chiarezza, stabilità e manutenibilità.

### Obiettivi secondari

* Garantire una netta separazione tra livello di presentazione e livello di acquisizione dati  
* Rendere il sistema indipendente dalla tecnologia del sensore  
* Progettare una struttura facilmente integrabile con un eventuale backend reale  
* Applicare una gestione del progetto strutturata per milestone, simulando un contesto lavorativo

## 3\. Architettura di riferimento

Il progetto adotta un’architettura a livelli basata sul principio di separazione delle responsabilità:

## Data Source Layer (esterno al progetto)

* Sistema di acquisizione dati  
* Responsabile della raccolta e produzione dei dati

## Presentation Layer (oggetto del progetto)

* Frontend web  
* Responsabile esclusivamente della visualizzazione e rappresentazione

Il frontend è progettato per essere completamente indipendente dalla tecnologia del sensore.  
 Eventuali modifiche alla sorgente dati non devono richiedere una ristrutturazione dell’interfaccia, purché venga rispettato il formato previsto.  
Questa separazione garantisce:

* modularità  
* manutenibilità  
* scalabilità  
* riusabilità del sistema

## 4\. Organizzazione del progetto e gestione del lavoro

Il progetto viene gestito secondo una pianificazione per milestone  
A ogni milestone sono richiesti:

* rispetto delle consegne previste  
* breve relazione sullo stato di avanzamento  
* indicazione di eventuali modifiche nell’organizzazione interna del gruppo

La responsabilità dell’organizzazione del lavoro è interna al gruppo.  
 L’obiettivo non è il controllo quotidiano, ma la capacità di:

* pianificare  
* adattarsi  
* rendicontare il lavoro svolto

## 6\. Pianificazione temporale e milestone

### **Milestone 1 – 22 gennaio**  

Consegna documentazione

* Analisi tecnica (Crepaldi e Laghi)  
* Project Plan (Laghi)  
* Diagramma di Gantt (Crepaldi)

### **Milestone 2 – 23 febbraio \- 13 marzo**

Prima dimostrazione del codice

* Implementazione funzionalità principali (Laghi)  
* Visualizzazione dei dati (prova) (Crepaldi)  
* Eventuale revisione tecnica (Crepaldi)

Obiettivo: dimostrare la corretta struttura dell’applicazione e il funzionamento della dashboard.

### **Milestone 3 – 14 \- 22 marzo**

Prima bozza definitiva

* Funzionalità principali completate (Laghi e Crepaldi)  
* Dashboard stabile  (Laghi)  
* Documentazione aggiornata (Laghi)

Se approvata avvio fase di test.

### **Milestone 4 – 23 marzo \- 4 aprile**

Conclusione fase di test

* Test funzionali (Crepaldi, Laghi)  
  Correzione bug  (Laghi)  
* Ottimizzazione del codice  (Laghi e Crepaldi)

Obiettivo: stabilizzazione tecnica del progetto.

### **Milestone 5 – 4 aprile esposizione**

Conclusione del progetto

* Versione finale stabile   
* Documentazione definitiva   
* Presentazione finale  
