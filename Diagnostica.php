agnostica · PHP
<?php
// diagnostica.php — apri http://localhost:8080/diagnostica.php
// CANCELLA questo file dopo aver risolto il problema
 
echo "<pre style='font-family:monospace;font-size:14px;padding:20px'>";
 
echo "=== PHP ===\n";
echo "Versione  : " . PHP_VERSION . "\n";
echo "php.ini   : " . php_ini_loaded_file() . "\n";
echo "ext dir   : " . ini_get('extension_dir') . "\n\n";
 
echo "=== Estensioni necessarie ===\n";
$needed = ['pdo', 'pdo_mysql', 'mysqli'];
foreach ($needed as $ext) {
    $ok = extension_loaded($ext);
    echo str_pad($ext, 12) . ": " . ($ok ? "OK" : "MANCANTE") . "\n";
}
 
echo "\n=== File DLL presenti nella cartella ext ===\n";
$extDir = ini_get('extension_dir');
if (is_dir($extDir)) {
    $dlls = glob($extDir . DIRECTORY_SEPARATOR . "php_pdo*");
    foreach ($dlls as $dll) {
        echo basename($dll) . "\n";
    }
    if (empty($dlls)) echo "(nessun file php_pdo* trovato)\n";
} else {
    echo "CARTELLA EXT NON TROVATA: $extDir\n";
    echo "Controlla 'extension_dir' nel php.ini\n";
}
 
echo "\n=== Test connessione MySQL ===\n";
if (!extension_loaded('pdo_mysql')) {
    echo "pdo_mysql non caricato — impossibile testare MySQL\n";
} else {
    try {
        $db = new PDO(
            'mysql:host=192.168.60.144;dbname=davide_laghi_stazione;charset=utf8mb4;connect_timeout=3',
            'davide_laghi',
            'insipide.bruchi.',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        echo "Connessione MySQL: OK\n";
        $v = $db->query("SELECT VERSION()")->fetchColumn();
        echo "MySQL versione  : $v\n";
    } catch (PDOException $e) {
        echo "Connessione MySQL: ERRORE\n";
        echo "Messaggio       : " . $e->getMessage() . "\n";
    }
}
 
echo "\n=== Linee attive nel php.ini (extension=) ===\n";
$ini = php_ini_loaded_file();
if ($ini && file_exists($ini)) {
    $lines = file($ini);
    foreach ($lines as $n => $line) {
        $l = trim($line);
        if (preg_match('/^extension\s*=/', $l)) {
            echo "riga " . str_pad($n+1, 4) . ": $l\n";
        }
    }
} else {
    echo "php.ini non leggibile\n";
}