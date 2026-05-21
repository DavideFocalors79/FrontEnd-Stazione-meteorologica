<?php
/**
 * api.php — Weather Station Backend
 *
 * Endpoints (parametro "action" in GET o nel body JSON):
 *   ping         — verifica connessione DB e sessione attiva
 *   login        — autentica utente
 *   logout       — distrugge sessione
 *   check        — ritorna utente corrente dalla sessione
 *   create_user  — crea nuovo utente (solo admin)
 *   list_users   — lista utenti (solo admin)
 *   delete_user  — elimina utente (solo admin)
 */

/* ── Headers ────────────────────────────────────────────────── */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// Permetti richieste dallo stesso host; adatta se usi un dominio separato
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_start();

/* ── Configurazione DB ──────────────────────────────────────── */
define('DB_HOST', '192.168.60.144');
define('DB_NAME', 'davide_laghi_stazione');
define('DB_USER', 'davide_laghi');
define('DB_PASS', 'insipide.bruchi.');
define('DB_TIMEOUT', 3);   // deve essere < timeout fetch di auth.js (9s)

/* ── Connessione DB ─────────────────────────────────────────── */
$db           = null;
$db_available = false;
$db_error     = '';

try {
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=utf8mb4;connect_timeout=%d',
        DB_HOST, DB_NAME, DB_TIMEOUT
    );

    $db = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_CONNECT_TIMEOUT => DB_TIMEOUT,  // timeout effettivo TCP
    ]);

    /* Crea tabella se non esiste */
    $db->exec("
        CREATE TABLE IF NOT EXISTS users (
            id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            username      VARCHAR(64)  NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role          ENUM('admin','user') NOT NULL DEFAULT 'user',
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    /* Admin di default se la tabella e' vuota */
    $count = (int) $db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($count === 0) {
        $default_hash = password_hash('Admin@2026!', PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $db->prepare(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')"
        );
        $stmt->execute(['admin', $default_hash]);
    }

    $db_available = true;

} catch (PDOException $e) {
    $db_available = false;
    $db_error     = $e->getMessage();
    // Non esporre dettagli DB in produzione; log su file invece
    error_log('[WeatherStation] DB connection failed: ' . $e->getMessage());
}

/* ── Helpers ────────────────────────────────────────────────── */

function json_out(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function require_auth(): void {
    if (empty($_SESSION['user'])) {
        json_out(['error' => 'Non autenticato'], 401);
    }
}

function require_admin(): void {
    require_auth();
    if ($_SESSION['user']['role'] !== 'admin') {
        json_out(['error' => 'Accesso negato: ruolo admin richiesto'], 403);
    }
}

function validate_username(string $u): ?string {
    $u = trim($u);
    if (strlen($u) < 3)                              return 'Username troppo corto (min 3 caratteri)';
    if (strlen($u) > 64)                             return 'Username troppo lungo (max 64 caratteri)';
    if (!preg_match('/^[a-zA-Z0-9_.\-]+$/', $u))     return 'Username: solo lettere, numeri, punto, trattino, underscore';
    return null;
}

function validate_password(string $p): ?string {
    if (strlen($p) < 8)  return 'Password troppo corta (min 8 caratteri)';
    if (strlen($p) > 128) return 'Password troppo lunga (max 128 caratteri)';
    return null;
}

/* ── Lettura body JSON ──────────────────────────────────────── */
$body   = [];
$raw    = file_get_contents('php://input');
if ($raw) {
    $body = json_decode($raw, true) ?? [];
}

$action = $body['action'] ?? $_GET['action'] ?? $_POST['action'] ?? '';

/* ── Router ─────────────────────────────────────────────────── */
switch ($action) {

    /* ── ping ── */
    case 'ping':
        json_out([
            'ok'       => true,
            'db'       => $db_available,
            'db_error' => $db_available ? null : $db_error,
            'session'  => !empty($_SESSION['user']) ? $_SESSION['user'] : null,
        ]);

    /* ── check ── */
    case 'check':
        if (!empty($_SESSION['user'])) {
            json_out(['ok' => true, 'user' => $_SESSION['user'], 'db' => $db_available]);
        }
        json_out(['ok' => false, 'db' => $db_available]);

    /* ── login ── */
    case 'login':
        if (!$db_available) {
            json_out(['error' => 'DB_UNAVAILABLE', 'db' => false], 503);
        }

        $username = trim($body['username'] ?? '');
        $password = $body['password'] ?? '';

        if (!$username || !$password) {
            json_out(['error' => 'Username e password richiesti'], 400);
        }

        $stmt = $db->prepare(
            "SELECT username, password_hash, role FROM users WHERE LOWER(username) = LOWER(?)"
        );
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        /*
         * Verifica sempre (anche se l'utente non esiste) per prevenire
         * user enumeration via timing attack.
         */
        $dummy = '$2y$12$invalidhashplaceholderxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
        $hash  = $user ? $user['password_hash'] : $dummy;
        $valid = password_verify($password, $hash) && $user;

        if (!$valid) {
            usleep(300000 + random_int(0, 200000)); // 300-500ms random delay
            json_out(['error' => 'Username o password non validi'], 401);
        }

        $_SESSION['user'] = [
            'username' => $user['username'],
            'role'     => $user['role'],
        ];
        session_regenerate_id(true); // previeni session fixation

        json_out(['ok' => true, 'username' => $user['username'], 'role' => $user['role']]);

    /* ── logout ── */
    case 'logout':
        $_SESSION = [];
        session_destroy();
        json_out(['ok' => true]);

    /* ── create_user ── */
    case 'create_user':
        require_admin();
        if (!$db_available) {
            json_out(['error' => 'Database non disponibile'], 503);
        }

        $new_username = trim($body['username'] ?? '');
        $new_password = $body['password'] ?? '';
        $new_role     = $body['role'] ?? 'user';

        if (!in_array($new_role, ['admin', 'user'], true)) {
            $new_role = 'user';
        }

        if (($err = validate_username($new_username)) !== null) json_out(['error' => $err], 400);
        if (($err = validate_password($new_password)) !== null) json_out(['error' => $err], 400);

        try {
            $hash = password_hash($new_password, PASSWORD_BCRYPT, ['cost' => 12]);
            $stmt = $db->prepare(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
            );
            $stmt->execute([$new_username, $hash, $new_role]);
            json_out(['ok' => true]);
        } catch (PDOException $e) {
            if ((int)$e->getCode() === 23000) {
                json_out(['error' => 'Username gia in uso'], 409);
            }
            error_log('[WeatherStation] create_user error: ' . $e->getMessage());
            json_out(['error' => 'Errore database'], 500);
        }

    /* ── list_users ── */
    case 'list_users':
        require_admin();
        if (!$db_available) {
            json_out(['error' => 'Database non disponibile'], 503);
        }

        $users = $db->query(
            "SELECT username, role, created_at FROM users ORDER BY created_at ASC"
        )->fetchAll();

        json_out(['ok' => true, 'users' => $users]);

    /* ── delete_user ── */
    case 'delete_user':
        require_admin();
        if (!$db_available) {
            json_out(['error' => 'Database non disponibile'], 503);
        }

        $target = trim($body['username'] ?? '');
        if (!$target) {
            json_out(['error' => 'Username mancante'], 400);
        }

        if ($target === $_SESSION['user']['username']) {
            json_out(['error' => 'Non puoi eliminare il tuo account'], 400);
        }

        // Controlla che rimanga almeno un admin
        $stmt = $db->prepare("SELECT role FROM users WHERE username = ?");
        $stmt->execute([$target]);
        $target_user = $stmt->fetch();

        if ($target_user && $target_user['role'] === 'admin') {
            $admin_count = (int) $db->query(
                "SELECT COUNT(*) FROM users WHERE role = 'admin'"
            )->fetchColumn();
            if ($admin_count <= 1) {
                json_out(['error' => 'Deve esistere almeno un admin'], 400);
            }
        }

        $stmt = $db->prepare("DELETE FROM users WHERE username = ?");
        $stmt->execute([$target]);
        json_out(['ok' => true]);

    /* ── default ── */
    default:
        json_out(['error' => 'Azione non valida'], 400);
}
