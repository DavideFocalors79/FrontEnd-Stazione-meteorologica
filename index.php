<?php
/* ================================================================
   index.php  —  Stazione Meteo
   File unico: gestisce le chiamate API in PHP e serve la pagina HTML.

   Avvio rapido (doppio click su avvia.bat):
     php -S localhost:8080
   poi apri  http://localhost:8080
================================================================ */

define('DB_HOST',    '192.168.60.144');
define('DB_NAME',    'davide_laghi_stazione');
define('DB_USER',    'davide_laghi');
define('DB_PASS',    'insipide.bruchi.');
define('DB_TIMEOUT', 3);

/* ================================================================
   BLOCCO API — attivo solo quando arriva il parametro "action"
================================================================ */
$action = $_GET['action'] ?? (json_decode(file_get_contents('php://input'), true)['action'] ?? '');

if ($action !== '') {
    session_start();
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204); exit;
    }

    $db           = null;
    $db_available = false;
    $db_error     = '';

    try {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=utf8mb4;connect_timeout=%d',
            DB_HOST, DB_NAME, DB_TIMEOUT
        );
        $pdo_opts = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        if (defined('PDO::MYSQL_ATTR_CONNECT_TIMEOUT')) {
            $pdo_opts[PDO::MYSQL_ATTR_CONNECT_TIMEOUT] = DB_TIMEOUT;
        }
        $db = new PDO($dsn, DB_USER, DB_PASS, $pdo_opts);

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

        if ((int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn() === 0) {
            $h = password_hash('Admin@2026!', PASSWORD_BCRYPT, ['cost' => 12]);
            $db->prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')")
               ->execute(['admin', $h]);
        }

        $db_available = true;
    } catch (PDOException $e) {
        $db_error = $e->getMessage();
        error_log('[WeatherStation] DB: ' . $e->getMessage());
    }

    function jout(array $d, int $c = 200): void {
        http_response_code($c);
        echo json_encode($d, JSON_UNESCAPED_UNICODE);
        exit;
    }
    function need_auth(): void {
        if (empty($_SESSION['user'])) jout(['error' => 'Non autenticato'], 401);
    }
    function need_admin(): void {
        need_auth();
        if ($_SESSION['user']['role'] !== 'admin') jout(['error' => 'Accesso negato'], 403);
    }
    function val_username(string $u): ?string {
        $u = trim($u);
        if (strlen($u) < 3)                             return 'Username troppo corto (min 3)';
        if (strlen($u) > 64)                            return 'Username troppo lungo (max 64)';
        if (!preg_match('/^[a-zA-Z0-9_.\-]+$/', $u))   return 'Username: solo lettere, numeri, . _ -';
        return null;
    }
    function val_password(string $p): ?string {
        if (strlen($p) < 8)   return 'Password troppo corta (min 8)';
        if (strlen($p) > 128) return 'Password troppo lunga (max 128)';
        return null;
    }

    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    switch ($action) {
        case 'ping':
            jout(['ok' => true, 'db' => $db_available, 'db_error' => $db_available ? null : $db_error, 'session' => $_SESSION['user'] ?? null]);

        case 'check':
            jout(['ok' => !empty($_SESSION['user']), 'user' => $_SESSION['user'] ?? null, 'db' => $db_available]);

        case 'login':
            if (!$db_available) jout(['error' => 'DB_UNAVAILABLE', 'db' => false], 503);
            $uname = trim($body['username'] ?? '');
            $upass = $body['password'] ?? '';
            if (!$uname || !$upass) jout(['error' => 'Username e password richiesti'], 400);
            $stmt = $db->prepare("SELECT username, password_hash, role FROM users WHERE LOWER(username)=LOWER(?)");
            $stmt->execute([$uname]);
            $user = $stmt->fetch();
            $dummy = '$2y$12$invalidhashplaceholderxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
            $valid = password_verify($upass, $user ? $user['password_hash'] : $dummy) && $user;
            if (!$valid) { usleep(300000 + random_int(0, 200000)); jout(['error' => 'Username o password non validi'], 401); }
            session_regenerate_id(true);
            $_SESSION['user'] = ['username' => $user['username'], 'role' => $user['role']];
            jout(['ok' => true, 'username' => $user['username'], 'role' => $user['role']]);

        case 'logout':
            $_SESSION = []; session_destroy();
            jout(['ok' => true]);

        case 'create_user':
            need_admin();
            if (!$db_available) jout(['error' => 'Database non disponibile'], 503);
            $nu = trim($body['username'] ?? '');
            $np = $body['password'] ?? '';
            $nr = in_array($body['role'] ?? '', ['admin','user'], true) ? $body['role'] : 'user';
            if ($e = val_username($nu)) jout(['error' => $e], 400);
            if ($e = val_password($np)) jout(['error' => $e], 400);
            try {
                $h = password_hash($np, PASSWORD_BCRYPT, ['cost' => 12]);
                $db->prepare("INSERT INTO users (username, password_hash, role) VALUES (?,?,?)")->execute([$nu, $h, $nr]);
                jout(['ok' => true]);
            } catch (PDOException $e) {
                jout(['error' => (int)$e->getCode() === 23000 ? 'Username gia in uso' : 'Errore database'], (int)$e->getCode() === 23000 ? 409 : 500);
            }

        case 'list_users':
            need_admin();
            if (!$db_available) jout(['error' => 'Database non disponibile'], 503);
            $users = $db->query("SELECT username, role, created_at FROM users ORDER BY created_at ASC")->fetchAll();
            jout(['ok' => true, 'users' => $users]);

        case 'delete_user':
            need_admin();
            if (!$db_available) jout(['error' => 'Database non disponibile'], 503);
            $target = trim($body['username'] ?? '');
            if (!$target) jout(['error' => 'Username mancante'], 400);
            if ($target === $_SESSION['user']['username']) jout(['error' => 'Non puoi eliminare il tuo account'], 400);
            $stmt = $db->prepare("SELECT role FROM users WHERE username=?");
            $stmt->execute([$target]);
            $tu = $stmt->fetch();
            if ($tu && $tu['role'] === 'admin') {
                $ac = (int)$db->query("SELECT COUNT(*) FROM users WHERE role='admin'")->fetchColumn();
                if ($ac <= 1) jout(['error' => 'Deve esistere almeno un admin'], 400);
            }
            $db->prepare("DELETE FROM users WHERE username=?")->execute([$target]);
            jout(['ok' => true]);

        default:
            jout(['error' => 'Azione non valida'], 400);
    }
}

/* ================================================================
   PAGINA HTML
================================================================ */
?><!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stazione Meteo — Dashboard</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>

    <!-- ═══════════════════════════════════════════════════════════
         LOGIN OVERLAY
    ═══════════════════════════════════════════════════════════════ -->
    <div class="login-overlay" id="loginOverlay">
        <div class="login-card">
            <div class="login-logo">
                <i class="fas fa-cloud-sun"></i>
            </div>
            <h2 class="login-title">Stazione Meteo</h2>
            <p class="login-subtitle">Accedi per visualizzare la dashboard</p>
            <div class="login-form">
                <div class="field-group">
                    <label class="field-label" for="loginUsername">
                        <i class="fas fa-user"></i> Username
                    </label>
                    <input class="field-input" type="text" id="loginUsername"
                        placeholder="username" autocomplete="username" autofocus>
                </div>
                <div class="field-group">
                    <label class="field-label" for="loginPassword">
                        <i class="fas fa-lock"></i> Password
                    </label>
                    <div class="input-password-wrap">
                        <input class="field-input" type="password" id="loginPassword"
                            placeholder="password" autocomplete="current-password">
                        <button class="toggle-pw" id="togglePw" type="button" tabindex="-1">
                            <i class="fas fa-eye" id="togglePwIcon"></i>
                        </button>
                    </div>
                </div>
                <div class="login-error" id="loginError" role="alert"></div>
                <button class="login-btn" id="loginBtn">
                    <span id="loginBtnText">Accedi</span>
                    <i class="fas fa-spinner fa-spin" id="loginSpinner" style="display:none"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════
         PANNELLO ADMIN (modal)
    ═══════════════════════════════════════════════════════════════ -->
    <div class="modal-overlay" id="adminModal">
        <div class="admin-panel">
            <div class="admin-header">
                <h2><i class="fas fa-users-cog"></i> Pannello Admin</h2>
                <button class="btn-icon" id="closeAdmin" aria-label="Chiudi">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="admin-body">
                <section class="admin-section">
                    <h3 class="admin-section-title">
                        <i class="fas fa-user-plus"></i> Nuovo Utente
                    </h3>
                    <div class="create-user-row">
                        <input class="field-input sm" type="text"
                            id="newUsername" placeholder="Username (min 3)">
                        <input class="field-input sm" type="password"
                            id="newPassword" placeholder="Password (min 8)">
                        <select class="field-select" id="newRole">
                            <option value="user">Utente</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button class="btn-primary" id="createUserBtn">
                            <i class="fas fa-plus"></i> Crea
                        </button>
                    </div>
                    <div class="admin-msg" id="createUserMsg"></div>
                </section>
                <section class="admin-section">
                    <h3 class="admin-section-title">
                        <i class="fas fa-users"></i> Utenti Registrati
                    </h3>
                    <div id="usersList" class="users-list"></div>
                </section>
            </div>
        </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════
         APP PRINCIPALE — layout con sidebar
    ═══════════════════════════════════════════════════════════════ -->
    <div class="app-shell" id="appContainer" style="display:none">

        <!-- ── SIDEBAR ────────────────────────────────────────── -->
        <aside class="sidebar" id="sidebar">

            <!-- Logo / brand -->
            <div class="sidebar-brand">
                <i class="fas fa-cloud-bolt sidebar-brand-icon"></i>
                <span class="sidebar-brand-text">MeteoNet</span>
                <!-- Hamburger mobile -->
                <button class="sidebar-close-btn" id="sidebarCloseBtn" aria-label="Chiudi menu">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Sezione stazioni -->
            <div class="sidebar-section">
                <div class="sidebar-section-header" id="stationsToggle" role="button" aria-expanded="true" tabindex="0">
                    <i class="fas fa-tower-broadcast"></i>
                    <span>Stazioni</span>
                    <i class="fas fa-chevron-down sidebar-chevron"></i>
                </div>
                <ul class="sidebar-station-list" id="stationList" role="listbox" aria-label="Selezione stazione"></ul>
            </div>

            <!-- Info stazione selezionata -->
            <div class="sidebar-station-info" id="sidebarStationInfo">
                <div class="station-info-row">
                    <i class="fas fa-location-dot"></i>
                    <span id="infoLocation">—</span>
                </div>
                <div class="station-info-row">
                    <i class="fas fa-mountain-sun"></i>
                    <span id="infoAltitude">—</span>
                </div>
                <div class="station-info-row">
                    <i class="fas fa-circle-dot station-status-dot" id="infoStatusDot"></i>
                    <span id="infoStatus">—</span>
                </div>
            </div>

            <!-- Spacer -->
            <div class="sidebar-spacer"></div>

            <!-- Utente + azioni -->
            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="sidebar-user-avatar" id="sidebarUserAvatar">?</div>
                    <div class="sidebar-user-info">
                        <span class="sidebar-user-name" id="sidebarUserName">—</span>
                        <span class="sidebar-user-role" id="sidebarUserRole">—</span>
                    </div>
                </div>
                <div class="sidebar-footer-actions">
                    <button class="sidebar-action-btn" id="adminBtnSidebar"
                        aria-label="Pannello Admin" title="Pannello Admin" style="display:none">
                        <i class="fas fa-users-cog"></i>
                    </button>
                    <button class="sidebar-action-btn" id="tempUnitToggleSidebar"
                        aria-label="Cambia unita di misura">°C</button>
                    <button class="sidebar-action-btn" id="themeToggleSidebar" aria-label="Cambia tema">
                        <i class="fas fa-moon"></i>
                    </button>
                    <button class="sidebar-action-btn danger" id="logoutBtnSidebar"
                        aria-label="Logout" title="Logout">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        </aside>

        <!-- Overlay backdrop per mobile -->
        <div class="sidebar-backdrop" id="sidebarBackdrop"></div>

        <!-- ── CONTENUTO PRINCIPALE ─────────────────────────── -->
        <div class="main-wrapper">

            <!-- Top bar mobile -->
            <header class="topbar">
                <button class="topbar-menu-btn" id="sidebarOpenBtn" aria-label="Apri menu">
                    <i class="fas fa-bars"></i>
                </button>
                <div class="topbar-station" id="topbarStation">
                    <i class="fas fa-tower-broadcast"></i>
                    <span id="topbarStationName">Caricamento...</span>
                </div>
                <div class="topbar-update">
                    <i class="fas fa-sync-alt" id="topbarSyncIcon"></i>
                    <span id="lastUpdate">—</span>
                </div>
            </header>

            <!-- Error banner -->
            <div class="error-banner" id="errorBanner">
                <i class="fas fa-exclamation-triangle"></i>
                <span id="errorMessage"></span>
                <button class="close-error" id="closeError">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Dashboard content -->
            <main class="dashboard-content">

                <!-- ── Intestazione stazione ── -->
                <div class="station-header">
                    <div class="station-header-left">
                        <div class="station-icon-wrap" id="stationIconWrap">
                            <i class="fas fa-tower-broadcast" id="stationHeaderIcon"></i>
                        </div>
                        <div>
                            <h1 class="station-title" id="stationHeaderName">—</h1>
                            <p class="station-subtitle" id="stationHeaderLocation">—</p>
                        </div>
                    </div>
                    <div class="station-header-right">
                        <div class="station-badge online" id="stationBadge">
                            <i class="fas fa-circle"></i>
                            <span id="stationBadgeText">Online</span>
                        </div>
                    </div>
                </div>

                <!-- ── Schede meteo attuali ── -->
                <section class="current-weather">
                    <h2 class="section-title">Condizioni Attuali</h2>
                    <div class="weather-grid">

                        <div class="weather-card temperature-card">
                            <div class="card-header">
                                <i class="fas fa-thermometer-half card-icon"></i>
                                <h3>Temperatura</h3>
                            </div>
                            <div class="card-body">
                                <div class="main-value" id="temperature">
                                    <span class="value">--</span>
                                    <span class="unit">°C</span>
                                </div>
                                <div class="sub-info">
                                    <div class="sub-item">
                                        <i class="fas fa-arrow-up"></i>
                                        <span id="tempMax">--°C</span>
                                    </div>
                                    <div class="sub-item">
                                        <i class="fas fa-arrow-down"></i>
                                        <span id="tempMin">--°C</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="weather-card humidity-card">
                            <div class="card-header">
                                <i class="fas fa-tint card-icon"></i>
                                <h3>Umidità</h3>
                            </div>
                            <div class="card-body">
                                <div class="main-value" id="humidity">
                                    <span class="value">--</span>
                                    <span class="unit">%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" id="humidityProgress"></div>
                                </div>
                                <div class="sub-text" id="humidityStatus">--</div>
                            </div>
                        </div>

                        <div class="weather-card pressure-card">
                            <div class="card-header">
                                <i class="fas fa-gauge-high card-icon"></i>
                                <h3>Pressione</h3>
                            </div>
                            <div class="card-body">
                                <div class="main-value" id="pressure">
                                    <span class="value">--</span>
                                    <span class="unit">hPa</span>
                                </div>
                                <div class="sub-info">
                                    <i class="fas fa-minus" id="pressureTrend"></i>
                                    <span id="pressureStatus">--</span>
                                </div>
                            </div>
                        </div>

                        <div class="weather-card wind-card">
                            <div class="card-header">
                                <i class="fas fa-wind card-icon"></i>
                                <h3>Vento</h3>
                            </div>
                            <div class="card-body">
                                <div class="wind-compass">
                                    <div class="compass-arrow" id="windArrow">
                                        <i class="fas fa-location-arrow"></i>
                                    </div>
                                    <div class="compass-directions">
                                        <span class="dir-n">N</span>
                                        <span class="dir-e">E</span>
                                        <span class="dir-s">S</span>
                                        <span class="dir-w">O</span>
                                    </div>
                                </div>
                                <div class="wind-info">
                                    <div class="main-value" id="windSpeed">
                                        <span class="value">--</span>
                                        <span class="unit">km/h</span>
                                    </div>
                                    <div class="sub-text" id="windDirection">--</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>

                <!-- ── Grafici ── -->
                <section class="charts-section">
                    <h2 class="section-title">Tendenze (24h)</h2>
                    <div class="charts-grid">
                        <div class="chart-container">
                            <h3 class="chart-title">
                                <i class="fas fa-chart-line"></i>
                                Temperatura
                            </h3>
                            <canvas id="temperatureChart"></canvas>
                        </div>
                        <div class="chart-container">
                            <h3 class="chart-title">
                                <i class="fas fa-chart-area"></i>
                                Umidità &amp; Pressione
                            </h3>
                            <canvas id="humidityPressureChart"></canvas>
                        </div>
                    </div>
                </section>

            </main>

            <footer class="footer">
                <p>© 2026 MeteoNet — Stazione Meteorologica</p>
            </footer>
        </div><!-- /main-wrapper -->
    </div><!-- /app-shell -->

    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script src="config.js"></script>
    <script src="stations.js"></script>
    <script src="auth.js"></script>
    <script src="script.js"></script>
</body>
</html>
