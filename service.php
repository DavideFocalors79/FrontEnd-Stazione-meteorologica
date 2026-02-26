<?php
// service.php

function getWeatherData() {
    // Qui puoi inserire la logica cURL vista in precedenza per ThingsBoard
    // Per ora generiamo dati casuali realistici
    return [
        'temperature' => 22.5 + rand(-5, 5) / 10,
        'humidity' => 65 + rand(-10, 10),
        'pressure' => 1013 + rand(-5, 5),
        'windSpeed' => 12.4 + rand(-2, 2),
        'windDirection' => rand(0, 360),
        'lastUpdate' => date('H:i:s')
    ];
}

function getHistoricalData() {
    $history = [];
    for ($i = 0; $i < 24; $i++) {
        $history[] = [
            'time' => date('H:i', strtotime("-$i hours")),
            'temp' => 20 + sin($i / 4) * 5,
            'hum' => 60 + cos($i / 3) * 15
        ];
    }
    return array_reverse($history);
}