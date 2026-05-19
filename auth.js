/**
 * auth.js — Weather Station Authentication
 * Password hashing: PBKDF2 + SHA-256 via Web Crypto API (nativo browser)
 * ⚠️  NOTA: localStorage è adatto solo per prototipi.
 *     In produzione usare backend + database con bcrypt server-side.
 */

class AuthManager {
    constructor() {
        this.ITERATIONS  = 200000;   // PBKDF2 iterations
        this.KEY_BITS    = 256;
        this.SALT_BYTES  = 16;
        this.USERS_KEY   = 'ws_users';
        this.SESSION_KEY = 'ws_session';
    }

    /* ─── Inizializzazione ──────────────────────────────────── */

    async init() {
        if (this.getUsers().length === 0) {
            // Admin di default — cambia la password al primo login!
            await this._createUserInternal('admin', 'Admin@2026!', 'admin');
            console.info('[Auth] Admin creato — credenziali default: admin / Admin@2026!');
        }
    }

    /* ─── Storage ───────────────────────────────────────────── */

    getUsers() {
        try { return JSON.parse(localStorage.getItem(this.USERS_KEY) || '[]'); }
        catch { return []; }
    }

    _saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    }

    getSession() {
        try { return JSON.parse(sessionStorage.getItem(this.SESSION_KEY) || 'null'); }
        catch { return null; }
    }

    _setSession(user) {
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({
            username : user.username,
            role     : user.role,
            loginAt  : Date.now()
        }));
    }

    clearSession() {
        sessionStorage.removeItem(this.SESSION_KEY);
    }

    isLoggedIn() { return this.getSession() !== null; }
    isAdmin()    { return this.getSession()?.role === 'admin'; }

    /* ─── Crypto ────────────────────────────────────────────── */

    _randomSalt() {
        const buf = new Uint8Array(this.SALT_BYTES);
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
              iterations: this.ITERATIONS, hash: 'SHA-256' },
            base, this.KEY_BITS
        );
        return Array.from(new Uint8Array(bits))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /* Confronto in tempo costante — previene timing attacks */
    _safeEqual(a, b) {
        if (a.length !== b.length) return false;
        let diff = 0;
        for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
        return diff === 0;
    }

    /* ─── Operazioni utenti ─────────────────────────────────── */

    _validateCredentials(username, password) {
        if (!username || username.trim().length < 3)
            throw new Error('Username troppo corto (min 3 caratteri)');
        if (!/^[a-zA-Z0-9_.-]+$/.test(username))
            throw new Error('Username: solo lettere, numeri, . _ -');
        if (!password || password.length < 8)
            throw new Error('Password troppo corta (min 8 caratteri)');
    }

    async _createUserInternal(username, password, role) {
        const salt = this._randomSalt();
        const hash = await this._deriveKey(password, salt);
        const users = this.getUsers();
        users.push({ username, hash, salt, role, createdAt: new Date().toISOString() });
        this._saveUsers(users);
    }

    async createUser(username, password, role = 'user') {
        this._validateCredentials(username, password);
        const users = this.getUsers();
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase()))
            throw new Error('Username già in uso');
        await this._createUserInternal(username.trim(), password, role);
    }

    async login(username, password) {
        if (!username || !password) throw new Error('Inserisci username e password');

        const users = this.getUsers();
        const user  = users.find(u => u.username.toLowerCase() === username.toLowerCase());

        // Hash calcolato sempre per prevenire user enumeration via timing
        const dummySalt = 'ws_dummy_salt_placeholder_32chars!!';
        const hash = await this._deriveKey(password, user ? user.salt : dummySalt);

        if (!user || !this._safeEqual(hash, user.hash))
            throw new Error('Username o password non validi');

        this._setSession(user);
        return { username: user.username, role: user.role };
    }

    logout() {
        this.clearSession();
        window.location.reload();
    }

    deleteUser(username) {
        const session = this.getSession();
        if (!session) throw new Error('Non autenticato');
        if (username === session.username) throw new Error('Non puoi eliminare il tuo account');

        // Almeno un admin deve rimanere
        const users = this.getUsers();
        const target = users.find(u => u.username === username);
        if (target?.role === 'admin') {
            const adminCount = users.filter(u => u.role === 'admin').length;
            if (adminCount <= 1) throw new Error('Deve esistere almeno un admin');
        }
        this._saveUsers(users.filter(u => u.username !== username));
    }

    async changePassword(username, oldPassword, newPassword) {
        const users = this.getUsers();
        const user  = users.find(u => u.username === username);
        if (!user) throw new Error('Utente non trovato');

        const oldHash = await this._deriveKey(oldPassword, user.salt);
        if (!this._safeEqual(oldHash, user.hash)) throw new Error('Password attuale errata');

        if (newPassword.length < 8) throw new Error('Nuova password troppo corta (min 8 caratteri)');

        user.salt = this._randomSalt();
        user.hash = await this._deriveKey(newPassword, user.salt);
        this._saveUsers(users);
    }

    listUsers() {
        return this.getUsers().map(({ username, role, createdAt }) =>
            ({ username, role, createdAt })
        );
    }
}

/* Istanza globale */
const auth = new AuthManager();
