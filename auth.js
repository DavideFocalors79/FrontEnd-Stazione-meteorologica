/*
 * auth.js
 * Tenta sempre la connessione a index.php (MySQL).
 * Se il server non risponde usa localStorage + PBKDF2 come fallback.
 */

var auth = (function () {

    var API      = 'index.php';
    var mode     = null;      // 'api' oppure 'local'
    var session  = null;      // { username, role }

    /* ── helpers fetch ─────────────────────────────────────── */

    function post(payload) {
        return fetch(API, {
            method      : 'POST',
            credentials : 'include',
            headers     : { 'Content-Type': 'application/json' },
            body        : JSON.stringify(payload)
        }).then(function (r) {
            return r.json().then(function (d) {
                if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
                return d;
            });
        });
    }

    function get(action) {
        return fetch(API + '?action=' + action, { credentials: 'include' })
            .then(function (r) {
                return r.json().then(function (d) {
                    if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
                    return d;
                });
            });
    }

    /* ── PBKDF2 (modalita locale) ───────────────────────────── */

    var ITER = 200000, BITS = 256, SALT_LEN = 16;
    var USERS_KEY = 'ws_users', SESS_KEY = 'ws_session';

    function randomSalt() {
        var buf = new Uint8Array(SALT_LEN);
        crypto.getRandomValues(buf);
        return btoa(String.fromCharCode.apply(null, buf));
    }

    function deriveKey(password, salt) {
        var enc = new TextEncoder();
        return crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits'])
            .then(function (base) {
                return crypto.subtle.deriveBits(
                    { name: 'PBKDF2', salt: enc.encode(salt), iterations: ITER, hash: 'SHA-256' },
                    base, BITS
                );
            })
            .then(function (bits) {
                return Array.from(new Uint8Array(bits))
                    .map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
            });
    }

    function safeEq(a, b) {
        if (a.length !== b.length) return false;
        var d = 0;
        for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
        return d === 0;
    }

    function localGetUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch (e) { return []; }
    }
    function localSaveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }
    function localGetSession() {
        try { return JSON.parse(sessionStorage.getItem(SESS_KEY) || 'null'); } catch (e) { return null; }
    }
    function localSetSession(u) {
        sessionStorage.setItem(SESS_KEY, JSON.stringify({ username: u.username, role: u.role }));
    }

    function localInit() {
        var users = localGetUsers();
        if (users.length > 0) return Promise.resolve();
        return deriveKey('Admin@2026!', 'default_admin_salt_ws2026').then(function (hash) {
            localSaveUsers([{
                username   : 'admin',
                hash       : hash,
                salt       : 'default_admin_salt_ws2026',
                role       : 'admin',
                created_at : new Date().toISOString()
            }]);
        });
    }

    function localLogin(username, password) {
        var users = localGetUsers();
        var user  = users.find(function (u) {
            return u.username.toLowerCase() === username.toLowerCase();
        });
        var salt  = user ? user.salt : 'dummy_salt_prevent_timing_attack__';
        return deriveKey(password, salt).then(function (hash) {
            if (!user || !safeEq(hash, user.hash)) {
                throw new Error('Username o password non validi');
            }
            localSetSession(user);
            session = { username: user.username, role: user.role };
            return session;
        });
    }

    function localCreateUser(username, password, role) {
        username = username.trim();
        if (username.length < 3) throw new Error('Username troppo corto (min 3)');
        if (password.length < 8) throw new Error('Password troppo corta (min 8)');
        var users = localGetUsers();
        if (users.find(function (u) { return u.username.toLowerCase() === username.toLowerCase(); })) {
            throw new Error('Username gia in uso');
        }
        var salt = randomSalt();
        return deriveKey(password, salt).then(function (hash) {
            users.push({ username: username, hash: hash, salt: salt, role: role, created_at: new Date().toISOString() });
            localSaveUsers(users);
        });
    }

    function localListUsers() {
        return localGetUsers().map(function (u) {
            return { username: u.username, role: u.role, created_at: u.created_at };
        });
    }

    function localDeleteUser(username) {
        var s = localGetSession();
        if (username === s.username) throw new Error('Non puoi eliminare il tuo account');
        var users = localGetUsers();
        var target = users.find(function (u) { return u.username === username; });
        if (target && target.role === 'admin') {
            if (users.filter(function (u) { return u.role === 'admin'; }).length <= 1) {
                throw new Error('Deve esistere almeno un admin');
            }
        }
        localSaveUsers(users.filter(function (u) { return u.username !== username; }));
    }

    /* ── banner modalita ────────────────────────────────────── */

    function showBanner(isApi, detail) {
        var old = document.getElementById('_auth_banner');
        if (old) old.remove();
        var b  = document.createElement('div');
        b.id   = '_auth_banner';
        var bg = isApi ? '#f0fff4' : '#fffaf0';
        var co = isApi ? '#276749' : '#c05621';
        var bd = isApi ? '#38a169' : '#dd6b20';
        b.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:99999;background:' + bg +
            ';border:1px solid ' + bd + ';color:' + co +
            ';border-radius:8px;padding:8px 14px;font-size:12px;font-family:monospace;' +
            'box-shadow:0 2px 8px rgba(0,0,0,.15);cursor:pointer;max-width:340px;line-height:1.5';
        b.textContent = (isApi ? 'Connesso a MySQL' : 'Modalita locale (localStorage)') +
            (detail ? ' — ' + detail : '');
        b.title = 'Clicca per chiudere';
        b.addEventListener('click', function () { b.remove(); });
        document.body.appendChild(b);
        if (isApi) setTimeout(function () { b.remove(); }, 6000);
    }

    /* ── INIT ───────────────────────────────────────────────── */

    function init() {
        return fetch(API + '?action=ping', {
            credentials : 'include',
            signal      : AbortSignal.timeout(9000)
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.db) {
                mode = 'api';
                if (data.session) session = data.session;
                console.info('[Auth] Modalita API — MySQL');
                showBanner(true);
            } else {
                mode = 'local';
                console.warn('[Auth] DB non disponibile:', data.db_error || '');
                showBanner(false, 'DB non raggiungibile');
                return localInit();
            }
        })
        .catch(function (err) {
            mode = 'local';
            console.warn('[Auth] index.php non raggiungibile:', err.message);
            if (window.location.protocol === 'file:') {
                showBanner(false, 'Apri tramite server PHP, non come file://');
            } else {
                showBanner(false, err.message);
            }
            return localInit();
        });
    }

    /* ── API pubblica ───────────────────────────────────────── */

    return {

        init: init,

        isLoggedIn: function () {
            if (mode === 'api') return session !== null;
            return localGetSession() !== null;
        },

        isAdmin: function () {
            var s = mode === 'api' ? session : localGetSession();
            return s && s.role === 'admin';
        },

        getSession: function () {
            return mode === 'api' ? session : localGetSession();
        },

        login: function (username, password) {
            if (!username || !password) return Promise.reject(new Error('Inserisci username e password'));
            if (mode === 'api') {
                return post({ action: 'login', username: username, password: password })
                    .then(function (d) {
                        session = { username: d.username, role: d.role };
                        return session;
                    });
            }
            return localLogin(username, password);
        },

        logout: function () {
            if (mode === 'api') {
                post({ action: 'logout' }).finally(function () {
                    session = null;
                    window.location.reload();
                });
            } else {
                sessionStorage.removeItem(SESS_KEY);
                window.location.reload();
            }
        },

        createUser: function (username, password, role) {
            if (mode === 'api') return post({ action: 'create_user', username: username, password: password, role: role });
            return localCreateUser(username, password, role || 'user');
        },

        listUsers: function () {
            if (mode === 'api') return get('list_users').then(function (d) { return d.users; });
            return Promise.resolve(localListUsers());
        },

        deleteUser: function (username) {
            if (mode === 'api') return post({ action: 'delete_user', username: username });
            try { localDeleteUser(username); return Promise.resolve(); }
            catch (e) { return Promise.reject(e); }
        }
    };

})();
