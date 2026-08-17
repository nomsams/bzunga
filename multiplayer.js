(function (root) {
    'use strict';

    const GAME_PREFIX = {
        bazunga: 'bz-bazunga-',
        president: 'bz-president-',
        durak: 'bz-durak-'
    };

    function cleanRoomName(value, fallback = '') {
        const normalized = String(value || '')
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9 _-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 28);
        return normalized || fallback;
    }

    function slug(value) {
        return cleanRoomName(value, 'table')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 30) || 'table';
    }

    function makeRoomId(game, roomName) {
        return `${GAME_PREFIX[game] || 'bz-room-'}${slug(roomName)}`;
    }

    function resolveJoinId(game, value, direct = false) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        try {
            const parsed = new URL(raw);
            const invitedId = parsed.searchParams.get('join');
            if (invitedId) return invitedId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
        } catch (error) {}
        const safe = raw.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
        if (direct || /^bz-(bazunga|president|durak)-/i.test(safe) || /^offline-/i.test(safe)) {
            return safe.replace(/\s+/g, '-').slice(0, 80);
        }
        return makeRoomId(game, safe);
    }

    function suggestions(value) {
        const base = cleanRoomName(value, 'Card Table');
        const seed = Array.from(base).reduce((sum, character) => sum + character.charCodeAt(0), 0);
        const number = 2 + (seed % 87);
        return [
            `${base} ${number}`.slice(0, 28),
            `${base} Club`.slice(0, 28),
            `${base} Tonight`.slice(0, 28)
        ];
    }

    function inviteUrl(game, peerId, spectator = false) {
        const url = new URL(root.location.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set('game', game);
        url.searchParams.set('join', peerId);
        if (spectator) url.searchParams.set('spectate', '1');
        return url.href;
    }

    function qrOptions(text, size) {
        const options = {
            text,
            width: size,
            height: size,
            colorDark: '#050505',
            colorLight: '#ffffff',
            correctLevel: root.QRCode?.CorrectLevel?.M
        };
        if (options.correctLevel == null) delete options.correctLevel;
        return options;
    }

    function renderQr(container, text, size = 220) {
        if (!container) return false;
        container.replaceChildren();
        container.dataset.inviteUrl = text;
        container.tabIndex = 0;
        container.setAttribute('role', 'button');
        container.setAttribute('aria-label', 'Open a large, scannable room QR code');
        container.title = 'Tap to enlarge QR code';
        if (typeof root.QRCode !== 'function') return false;
        new root.QRCode(container, qrOptions(text, size));
        return true;
    }

    function ensureQrModal() {
        let modal = root.document.getElementById('room-qr-modal');
        if (modal) return modal;
        modal = root.document.createElement('div');
        modal.id = 'room-qr-modal';
        modal.className = 'room-qr-modal hidden';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'room-qr-title');
        modal.innerHTML = `
            <div class="room-qr-card">
                <button class="room-qr-close" type="button" aria-label="Close QR code">&times;</button>
                <p class="room-qr-kicker">SCAN TO JOIN</p>
                <h2 id="room-qr-title">Room QR code</h2>
                <div id="room-qr-large"></div>
                <p class="room-qr-help">Point the camera at the whole square. Keep this screen steady.</p>
            </div>`;
        root.document.body.appendChild(modal);
        const close = () => modal.classList.add('hidden');
        modal.querySelector('.room-qr-close').addEventListener('click', close);
        modal.addEventListener('click', event => { if (event.target === modal) close(); });
        root.document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !modal.classList.contains('hidden')) close();
        });
        return modal;
    }

    function openQr(container) {
        const text = container?.dataset.inviteUrl;
        if (!text || typeof root.QRCode !== 'function') return;
        const modal = ensureQrModal();
        const target = modal.querySelector('#room-qr-large');
        target.replaceChildren();
        new root.QRCode(target, qrOptions(text, Math.min(420, Math.max(300, root.innerWidth - 54))));
        modal.classList.remove('hidden');
        modal.querySelector('.room-qr-close').focus();
    }

    function bindQr(container) {
        if (!container || container.dataset.qrBound === '1') return;
        container.dataset.qrBound = '1';
        container.addEventListener('click', () => openQr(container));
        container.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openQr(container);
            }
        });
    }

    function showSuggestions(container, roomName, onChoose) {
        if (!container) return;
        container.innerHTML = `<p>That room name is already in use. Try one of these:</p>${suggestions(roomName)
            .map(name => `<button type="button" data-room-suggestion="${name.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">${name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</button>`)
            .join('')}`;
        container.classList.remove('hidden');
        container.querySelectorAll('[data-room-suggestion]').forEach(button => {
            button.addEventListener('click', () => onChoose(button.dataset.roomSuggestion));
        });
    }

    function peerOptions() {
        return {
            secure: true,
            pingInterval: 5000,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ],
                sdpSemantics: 'unified-plan'
            }
        };
    }

    root.RoomTools = {
        cleanRoomName,
        makeRoomId,
        resolveJoinId,
        suggestions,
        inviteUrl,
        renderQr,
        bindQr,
        openQr,
        showSuggestions,
        peerOptions,
        isNameCollision: error => error?.type === 'unavailable-id'
    };
})(globalThis);
