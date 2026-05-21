/**
 * auth.js
 *
 * Modalita di funzionamento:
 *   - MODALITA API  : chiamate a api.php, sessioni gestite da PHP/MySQL
 *   - MODALITA LOCAL: fallback localStorage + PBKDF2 (se server PHP / DB non raggiungibile)
 *
 * L'interfaccia pubblica e' identica in entrambe le modalita.
 * La rilevazione avviene automaticamente in init().
 */
class AuthManager {

    constructor() {
        this.mode    = 'detecting';   // 'api' | 'local'
        this.apiBase = 'index.php';

        /* Stato in-memory (valido in entrambe le modalita) */
        this._session = null;

        /* Costanti PBKDF2 per modalita LOCAL */
        this._ITERATIONS  = 200000;
        this._KEY_BITS    = 256;
        this._SALT_BYTES  = 16;
        this._USERS_KEY   = 'ws_users';
        this._SESSION_KEY = 'ws_session';
    }

    /* ================================================================
       INIT — rileva modalita e prepara ambiente
    ================================================================ */

    async init() {
        /*
         * Il timeout del fetch (9s) deve essere maggiore del tempo massimo
         * che api.php impiega per tentare la connessione MySQL (3s) piu'
         * il tempo di elaborazione. Se il browser e' su file:// api.php
         * non e' raggiungibile e si cade subito nel catch.
         */
        try {
            const res  = await fetch(`${this.apiBase}?action=ping`, {
                credentials: 'include',
                signal: AbortSignal.timeout(9000)
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            if (data.db) {
                this.mode = 'api';
                if (data.session) this._session = data.session;
                console.info('[Auth] Modalita API — MySQL raggiungibile');
                this._showModeBanner('api');
            } else {
                this.mode = 'local';
                console.warn('[Auth] api.php risponde ma DB non raggiungibile — fallback localStorage');
                console.warn('[Auth] Motivo DB:', data.db_error || 'sconosciuto');
                this._showModeBanner('local', 'DB MySQL non raggiungibile');
                await this._localInit();
            }
        } catch (err) {
            this.mode = 'local';
            if (window.location.protocol === 'file:') {
                console.warn('[Auth] Pagina aperta come file:// — PHP non eseguibile. Avvia un server PHP. Fallback localStorage attivo.');
                this._showModebanner('local', 'Apri la pagina tramite un server PHP, non come file://');
            } else {
                console.warn('[Auth] api.php non raggiungibile (' + err.message + ') — fallback localStorage');
                this._showModeanner('local', 'api.php non raggiungibile');
            }
            await this._localInit();
        }
    }

    _showModeanner(mode, detail) { this._showModeBanner(mode, detail); }
    _showModeban(mode, detail)    { this._showModeBanner(mode, detail); }

    _showModeBanner(mode, detail) {
        /* Crea un piccolo banner informativo sul fondo della pagina */
        const existing = document.getElementById('_authModeBanner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = '_authModeBanner';

        const isLocal = mode === 'local';
        const label   = isLocal ? 'Modalita locale (localStorage)' : 'Connesso al database MySQL';
        const color   = isLocal ? '#c05621' : '#276749';
        const bg      = isLocal ? '#fffaf0' : '#f0fff4';
        const border  = isLocal ? '#dd6b20' : '#38a169';

        banner.style.cssText = [
            'position:fixed', 'bottom:12px', 'right:12px', 'z-index:99999',
            `background:${bg}`, `border:1px solid ${border}`,
            `color:${color}`, 'border-radius:8px',
            'padding:8px 14px', 'font-size:12px', 'font-family:monospace',
            'box-shadow:0 2px 8px rgba(0,0,0,.15)', 'max-width:320px',
            'line-height:1.4'
        ].join(';');

        banner.textContent = label + (detail ? ' — ' + detail : '');

        /* Chiudi al click */
        banner.title = 'Clicca per chiudere';
        banner.style.cursor = 'pointer';
        banner.addEventListener('click', () => banner.remove());

        document.body.appendChild(banner);

        /* Se tutto ok scompare dopo 8 secondi, altrimenti rimane */
        if (!isLocal) setTimeout(() => banner.remove(), 8000);
    }

    /* ================================================================
       INTERFACCIA PUBBLICA
    ================================================================ */

    isLoggedIn() {
        if (this.mode === 'api') return this._session !== null;
        return this._localGetSession() !== null;
    }

    isAdmin() {
        if (this.mode === 'api') return this._session?.role === 'admin';
        return this._localGetSession()?.role === 'admin';
    }

    getSession() {
        if (this.mode === 'api') return this._session;
        return this._localGetSession();
    }

    async login(username, password) {
        if (this.mode === 'api') return this._apiLogin(username, password);
        return this._localLogin(username, password);
    }

    logout() {
        if (this.mode === 'api') {
            fetch(`${this.apiBase}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'logout' })
            }).finally(() => { this._session = null; window.location.reload(); });
        } else {
            sessionStorage.removeItem(this._SESSION_KEY);
            window.location.reload();
        }
    }

    async createUser(username, password, role = 'user') {
        if (this.mode === 'api') return this._apiCreateUser(username, password, role);
        return this._localCreateUser(username, password, role);
    }

    async listUsers() {
        if (this.mode === 'api') return this._apiListUsers();
        return this._localListUsers();
    }

    async deleteUser(username) {
        if (this.mode === 'api') return this._apiDeleteUser(username);
        return this._localDeleteUser(username);
    }

    /* ================================================================
       MODALITA API
    ================================================================ */

    async _apiPost(action, payload = {}) {
        const res = await fetch(this.apiBase, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...payload })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
        return data;
    }

    async _apiGet(action) {
        const res  = await fetch(`${this.apiBase}?action=${action}`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
        return data;
    }

    async _apiLogin(username, password) {
        const data = await this._apiPost('login', { username, password });
        this._session = { username: data.username, role: data.role };
        return this._session;
    }

    async _apiCreateUser(username, password, role) {
        await this._apiPost('create_user', { username, password, role });
    }

    async _apiListUsers() {
        const data = await this._apiGet('list_users');
        return data.users;
    }

    async _apiDeleteUser(username) {
        await this._apiPost('delete_user', { username });
    }

    /* ================================================================
       MODALITA LOCAL (fallback)
    ================================================================ */

    async _localInit() {
        const users = this._localGetUsers();
        if (users.length === 0) {
            await this._localCreateUserRaw('admin', 'Admin@2026!', 'admin');
            console.info('[Auth] Admin locale creato — credenziali: admin / Admin@2026!');
        }
    }

    /* Crypto ─────────────────────────────────────────────────── */

    _randomSalt() {
        const buf = new Uint8Array(this._SALT_BYTES);
        crypto.getRandomValues(buf);
        return btoa(String.fromCharCode(...buf));
    }

    async _deriveKey(password, salt) {
        const enc  = new TextEncoder();
        const base = await crypto.subtle.importKey(
            'raw', enc.encode(password),
            { name: 'PBKDF2' }, false, ['deriveBits']
        );
        const bits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt: enc.encode(salt),
              iterations: this._ITERATIONS, hash: 'SHA-256' },
            base, this._KEY_BITS
        );
        return Array.from(new Uint8Array(bits))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    _safeEqual(a, b) {
        if (a.length !== b.length) return false;
        let diff = 0;
        for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
        return diff === 0;
    }

    /* Storage ────────────────────────────────────────────────── */

    _localGetUsers() {
        try { return JSON.parse(localStorage.getItem(this._USERS_KEY) || '[]'); }
        catch { return []; }
    }

    _localSaveUsers(users) {
        localStorage.setItem(this._USERS_KEY, JSON.stringify(users));
    }

    _localGetSession() {
        try { return JSON.parse(sessionStorage.getItem(this._SESSION_KEY) || 'null'); }
        catch { return null; }
    }

    _localSetSession(user) {
        sessionStorage.setItem(this._SESSION_KEY, JSON.stringify({
            username : user.username,
            role     : user.role,
            loginAt  : Date.now()
        }));
    }

    /* Validazione ────────────────────────────────────────────── */

    _validateUsername(u) {
        if (!u || u.trim().length < 3)           throw new Error('Username troppo corto (min 3 caratteri)');
        if (!/^[a-zA-Z0-9_.\-]+$/.test(u.trim())) throw new Error('Username: solo lettere, numeri, punto, trattino, underscore');
    }

    _validatePassword(p) {
        if (!p || p.length < 8) throw new Error('Password troppo corta (min 8 caratteri)');
    }

    /* Operazioni ─────────────────────────────────────────────── */

    async _localCreateUserRaw(username, password, role) {
        const salt  = this._randomSalt();
        const hash  = await this._deriveKey(password, salt);
        const users = this._localGetUsers();
        users.push({ username, hash, salt, role, created_at: new Date().toISOString() });
        this._localSaveUsers(users);
    }

    async _localCreateUser(username, password, role = 'user') {
        this._validateUsername(username);
        this._validatePassword(password);
        const users = this._localGetUsers();
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
            throw new Error('Username gia in uso');
        await this._localCreateUserRaw(username.trim(), password, role);
    }

    async _localLogin(username, password) {
        if (!username || !password) throw new Error('Inserisci username e password');
        const users = this._localGetUsers();
        const user  = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        const dummy = 'ws_dummy_salt_fallback_placeholder__';
        const hash  = await this._deriveKey(password, user ? user.salt : dummy);
        if (!user || !this._safeEqual(hash, user.hash))
            throw new Error('Username o password non validi');
        this._localSetSession(user);
        return { username: user.username, role: user.role };
    }

    _localListUsers() {
        return this._localGetUsers().map(({ username, role, created_at }) =>
            ({ username, role, created_at })
        );
    }

    _localDeleteUser(username) {
        const session = this._localGetSession();
        if (!session) throw new Error('Non autenticato');
        if (username === session.username) throw new Error('Non puoi eliminare il tuo account');
        const users = this._localGetUsers();
        const target = users.find(u => u.username === username);
        if (target?.role === 'admin') {
            const adminCount = users.filter(u => u.role === 'admin').length;
            if (adminCount <= 1) throw new Error('Deve esistere almeno un admin');
        }
        this._localSaveUsers(users.filter(u => u.username !== username));
    }
}

/* Istanza globale */
const auth = new AuthManager();
