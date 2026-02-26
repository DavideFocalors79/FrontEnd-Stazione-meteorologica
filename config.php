<?php
// config.php
define('TB_URL', 'https://demo.thingsboard.io');
define('TB_TOKEN', 'YOUR_ACCESS_TOKEN_HERE');
define('TB_DEVICE_ID', 'YOUR_DEVICE_ID_HERE');

$config = [
    'update_interval' => 180000, // 3 minuti
    'history_interval_ms' => 86400000, // 24 ore
    'telemetry_keys' => 'temperature,humidity,pressure,windSpeed,windDirection'
];