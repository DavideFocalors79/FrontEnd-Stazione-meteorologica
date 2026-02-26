<?php
// service.php
require_once 'weather_data.php';

function getWeatherData() {
    // Richiediamo i dati attuali a ThingsBoard
    $tbData = fetchThingsboardData(false);

    // Se la chiamata fallisce, restituiamo valori di default/errore
    if (!$tbData) {
        return [
            'temperature' => '--',
            'humidity' => '--',
            'pressure' => '--',
            'windSpeed' => '--',
            'windDirection' => 0,
            'lastUpdate' => 'Errore API'
        ];
    }

    // Mappiamo i dati usando la funzione helper che hai creato in weather_data.php
    return [
        'temperature' => getCurrentValue($tbData, 'temperature'),
        'humidity' => getCurrentValue($tbData, 'humidity'),
        'pressure' => getCurrentValue($tbData, 'pressure'),
        'windSpeed' => getCurrentValue($tbData, 'windSpeed'),
        'windDirection' => getCurrentValue($tbData, 'windDirection', 0),
        'lastUpdate' => date('H:i:s')
    ];
}

function getHistoricalData() {
    // Richiediamo lo storico a ThingsBoard (ultime 24h in base al tuo config.php)
    $tbData = fetchThingsboardData(true);
    $history = [];

    // Controlliamo se abbiamo ricevuto dati per la temperatura
    if ($tbData && isset($tbData['temperature'])) {
        $temps = $tbData['temperature'];

        // ThingsBoard può restituire i dati in ordine decrescente,
        // li ordiniamo per timestamp crescente in modo che il grafico vada da sinistra (ieri) a destra (oggi)
        usort($temps, function($a, $b) {
            return $a['ts'] <=> $b['ts'];
        });

        foreach ($temps as $dataPoint) {
            // I timestamp di ThingsBoard sono in millisecondi, PHP usa i secondi
            $timestamp = $dataPoint['ts'] / 1000;

            $history[] = [
                'time' => date('H:i', $timestamp),
                'temp' => round(floatval($dataPoint['value']), 1)
            ];
        }
    }

    return $history;
}
?>