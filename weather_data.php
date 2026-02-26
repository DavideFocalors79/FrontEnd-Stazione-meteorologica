<?php
// weather_data.php
require_once 'config.php';

function fetchThingsboardData($isHistorical = false) {
    global $config;

    $url = TB_URL . "/api/plugins/telemetry/DEVICE/" . TB_DEVICE_ID . "/values/timeseries";

    if ($isHistorical) {
        $endTs = round(microtime(true) * 1000);
        $startTs = $endTs - $config['history_interval_ms'];
        $url .= "?keys=" . $config['telemetry_keys'] . "&startTs=$startTs&endTs=$endTs";
    } else {
        $url .= "?keys=" . $config['telemetry_keys'];
    }

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-Authorization: Bearer ' . TB_TOKEN,
        'Content-Type: application/json'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) return null;

    return json_decode($response, true);
}

// Funzione helper per ottenere il valore corrente più recente
function getCurrentValue($data, $key, $default = '--') {
    return (isset($data[$key][0]['value'])) ? round($data[$key][0]['value'], 1) : $default;
}
?>