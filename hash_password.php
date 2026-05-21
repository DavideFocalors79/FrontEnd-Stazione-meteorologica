<?php
/**
 * hash_password.php
 *
 * Utility a riga di comando per generare hash bcrypt da inserire
 * manualmente nel database tramite schema.sql o client MySQL.
 *
 * Uso:
 *   php hash_password.php <username> <password> [admin|user]
 *
 * Esempio:
 *   php hash_password.php mario rossi123 user
 *   php hash_password.php amministratore Str0ng@Pass admin
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo 'Questo script e\' eseguibile solo da riga di comando.';
    exit(1);
}

$args = array_slice($argv, 1);

if (count($args) < 2) {
    fwrite(STDERR, "Uso: php hash_password.php <username> <password> [admin|user]\n");
    exit(1);
}

$username = trim($args[0]);
$password = $args[1];
$role     = isset($args[2]) && in_array($args[2], ['admin', 'user'], true)
            ? $args[2]
            : 'user';

if (strlen($username) < 3) {
    fwrite(STDERR, "Errore: username troppo corto (min 3 caratteri)\n");
    exit(1);
}
if (strlen($password) < 8) {
    fwrite(STDERR, "Errore: password troppo corta (min 8 caratteri)\n");
    exit(1);
}

$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

echo "\n";
echo "Username : $username\n";
echo "Ruolo    : $role\n";
echo "Hash     : $hash\n";
echo "\n";
echo "-- Query INSERT da eseguire in MySQL:\n";
echo "INSERT INTO users (username, password_hash, role)\n";
echo "VALUES (\n";
echo "    '$username',\n";
echo "    '$hash',\n";
echo "    '$role'\n";
echo ");\n\n";
