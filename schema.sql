-- =============================================================
-- schema.sql — Stazione Meteo
-- Database: davide_laghi_stazione
-- =============================================================

-- Tabella utenti
-- Le password sono hash bcrypt (cost 12) generati con password_hash() di PHP.
-- Non inserire MAI password in chiaro. Vedi sezione "INSERT di esempio" sotto.
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(64)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('admin','user') NOT NULL DEFAULT 'user',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- =============================================================
-- Come generare un hash per un INSERT manuale
-- =============================================================
--
-- Metodo 1 — usa setup.php (consigliato):
--   Apri nel browser: http://tuo-server/setup.php
--   Crea automaticamente la tabella e l'utente admin di default.
--
-- Metodo 2 — usa hash_password.php da terminale:
--   php hash_password.php "NomeUtente" "LaPasswordScelta" admin
--
-- Metodo 3 — PHP inline da terminale:
--   php -r "echo password_hash('LaPasswordScelta', PASSWORD_BCRYPT, ['cost'=>12]);"
--   Copia l'output e usalo nell'INSERT sotto.
--
-- =============================================================


-- =============================================================
-- INSERT di esempio (sostituisci $2y$12$... con l'hash reale)
-- =============================================================

-- Admin principale
INSERT INTO users (username, password_hash, role)
VALUES (
    'admin',
    '$2y$12$SOSTITUISCI_CON_HASH_GENERATO_DA_hash_password.php',
    'admin'
);

-- Utente standard
INSERT INTO users (username, password_hash, role)
VALUES (
    'operatore',
    '$2y$12$SOSTITUISCI_CON_HASH_GENERATO_DA_hash_password.php',
    'user'
);


-- =============================================================
-- Query di manutenzione utili
-- =============================================================

-- Elenco utenti (senza hash)
SELECT id, username, role, created_at
FROM users
ORDER BY created_at;

-- Cambio ruolo
UPDATE users SET role = 'admin' WHERE username = 'operatore';

-- Reset password (genera prima l'hash con hash_password.php)
UPDATE users
SET password_hash = '$2y$12$NUOVO_HASH'
WHERE username = 'operatore';

-- Elimina utente
DELETE FROM users WHERE username = 'operatore';

-- Verifica che esista almeno un admin
SELECT COUNT(*) AS admin_count FROM users WHERE role = 'admin';
