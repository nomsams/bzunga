(function (root) {
    'use strict';

    const GAME_PREFIX = {
        bazunga: 'bz-bazunga-',
        president: 'bz-president-',
        durak: 'bz-durak-',
        hanafuda: 'bz-hanafuda-'
    };
    const PEER_OPEN_TIMEOUT_MS = 10000;
    const CONNECTION_OPEN_TIMEOUT_MS = 12000;
    const JOIN_RETRY_MS = 1600;
    const STATE_SYNC_TIMEOUT_MS = 7000;
    const DIRECT_FALLBACK_MS = 5000;
    const RELAY_CONNECT_TIMEOUT_MS = 18000;
    const RELAY_SCRIPT_URLS = [
        'https://unpkg.com/mqtt@5.14.1/dist/mqtt.min.js',
        'https://cdn.jsdelivr.net/npm/mqtt@5.14.1/dist/mqtt.min.js'
    ];
    const RELAY_BROKERS = [
        { protocol: 'wss', host: 'broker.hivemq.com', port: 8884, path: '/mqtt' },
        { protocol: 'wss', host: 'broker.emqx.io', port: 8084, path: '/mqtt' }
    ];

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
        if (direct || /^bz-(bazunga|president|durak|hanafuda)-/i.test(safe) || /^offline-/i.test(safe)) {
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
        const close = () => {
            modal.classList.add('hidden');
            modal._returnFocus?.focus?.();
        };
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
        modal._returnFocus = container;
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

    function ensureConnectionPanel() {
        if (!root.document) return null;
        let panel = root.document.getElementById('connection-progress');
        if (panel) return panel;
        panel = root.document.createElement('section');
        panel.id = 'connection-progress';
        panel.className = 'connection-progress hidden';
        panel.setAttribute('aria-live', 'polite');
        panel.innerHTML = `
            <div class="connection-progress-heading">
                <div>
                    <span class="connection-progress-kicker">MULTIPLAYER LINK</span>
                    <strong data-connection-title>Connecting to the table</strong>
                </div>
                <span class="connection-progress-percent" data-connection-percent>0%</span>
            </div>
            <div class="connection-progress-track"><span data-connection-bar></span></div>
            <ol class="connection-progress-steps">
                <li data-connection-step="signaling">Contacting the room service</li>
                <li data-connection-step="room">Finding the table host</li>
                <li data-connection-step="channel">Opening a direct game channel</li>
                <li data-connection-step="relay">Preparing the cloud fallback</li>
                <li data-connection-step="sync">Synchronizing the table</li>
            </ol>
            <div class="connection-progress-detail" data-connection-detail>Starting…</div>
            <div class="connection-progress-log" data-connection-log></div>
            <div class="connection-progress-error hidden" data-connection-error></div>
            <button type="button" class="connection-progress-retry hidden" data-connection-retry>RETRY CONNECTION</button>`;
        const anchor = root.document.querySelector('.join-actions') || root.document.getElementById('btn-spectate');
        if (anchor?.parentNode) anchor.insertAdjacentElement('afterend', panel);
        else root.document.body.appendChild(panel);
        return panel;
    }

    const ConnectionProgress = (() => {
        const order = ['signaling', 'room', 'channel', 'relay', 'sync'];
        const percentages = { signaling: 12, room: 28, channel: 52, relay: 72, sync: 90, ready: 100 };
        let retryAction = null;
        let hideTimer = null;

        function writeLog(panel, message) {
            const log = panel?.querySelector('[data-connection-log]');
            if (!log || !message) return;
            const row = root.document.createElement('div');
            row.textContent = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}  ${message}`;
            log.appendChild(row);
            while (log.childElementCount > 6) log.firstElementChild.remove();
        }

        function paint(stage, detail) {
            const panel = ensureConnectionPanel();
            if (!panel) return;
            clearTimeout(hideTimer);
            panel.classList.remove('hidden', 'failed', 'complete');
            const activeIndex = stage === 'ready' ? order.length : Math.max(0, order.indexOf(stage));
            panel.querySelectorAll('[data-connection-step]').forEach((item, index) => {
                item.classList.toggle('complete', index < activeIndex || stage === 'ready');
                item.classList.toggle('active', index === activeIndex && stage !== 'ready');
            });
            const percent = percentages[stage] || 8;
            panel.querySelector('[data-connection-bar]').style.width = `${percent}%`;
            panel.querySelector('[data-connection-percent]').textContent = `${percent}%`;
            panel.querySelector('[data-connection-detail]').textContent = detail || 'Working…';
            writeLog(panel, detail);
        }

        return {
            start({ spectator = false, roomId = '', retry = null } = {}) {
                const panel = ensureConnectionPanel();
                if (!panel) return;
                clearTimeout(hideTimer);
                retryAction = typeof retry === 'function' ? retry : null;
                panel.classList.remove('hidden', 'failed', 'complete');
                panel.querySelector('[data-connection-title]').textContent = spectator ? 'Joining as a spectator' : 'Joining the table';
                panel.querySelector('[data-connection-log]').replaceChildren();
                panel.querySelector('[data-connection-error]').classList.add('hidden');
                const retryButton = panel.querySelector('[data-connection-retry]');
                retryButton.classList.add('hidden');
                retryButton.onclick = () => retryAction?.();
                paint('signaling', roomId ? `Checking ${roomId}…` : 'Starting multiplayer…');
            },
            step(stage, detail) {
                paint(stage, detail);
            },
            success(transport = 'direct') {
                const panel = ensureConnectionPanel();
                if (!panel) return;
                paint('ready', transport === 'relay' ? 'Connected through the cloud fallback.' : 'Direct connection established.');
                panel.classList.add('complete');
                panel.classList.remove('failed');
                panel.querySelector('[data-connection-error]').classList.add('hidden');
                panel.querySelector('[data-connection-retry]').classList.add('hidden');
                panel.querySelector('[data-connection-title]').textContent = 'Table connected';
                hideTimer = setTimeout(() => panel.classList.add('hidden'), 3600);
            },
            fail(title, detail, code = 'CONNECTION_FAILED') {
                const panel = ensureConnectionPanel();
                if (!panel) return;
                clearTimeout(hideTimer);
                panel.classList.remove('hidden', 'complete');
                panel.classList.add('failed');
                panel.querySelector('[data-connection-title]').textContent = title || 'Could not join the table';
                panel.querySelector('[data-connection-percent]').textContent = 'FAILED';
                const error = panel.querySelector('[data-connection-error]');
                error.textContent = `${detail || 'The connection could not be completed.'} (${code})`;
                error.classList.remove('hidden');
                panel.querySelector('[data-connection-retry]').classList.toggle('hidden', !retryAction);
                writeLog(panel, `Stopped: ${code}`);
            },
            hide() {
                ensureConnectionPanel()?.classList.add('hidden');
            }
        };
    })();

    let mqttLoadPromise = null;
    function loadRelayLibrary() {
        if (root.mqtt?.connect) return Promise.resolve(root.mqtt);
        if (mqttLoadPromise) return mqttLoadPromise;
        mqttLoadPromise = new Promise((resolve, reject) => {
            let index = 0;
            const tryNext = () => {
                if (root.mqtt?.connect) return resolve(root.mqtt);
                if (index >= RELAY_SCRIPT_URLS.length) return reject(new Error('The cloud relay library could not be loaded.'));
                const script = root.document.createElement('script');
                script.src = RELAY_SCRIPT_URLS[index++];
                script.async = true;
                script.crossOrigin = 'anonymous';
                script.onload = () => root.mqtt?.connect ? resolve(root.mqtt) : tryNext();
                script.onerror = tryNext;
                root.document.head.appendChild(script);
            };
            tryNext();
        });
        return mqttLoadPromise;
    }

    const cryptoCache = new Map();
    const textEncoder = typeof TextEncoder === 'function' ? new TextEncoder() : null;
    const textDecoder = typeof TextDecoder === 'function' ? new TextDecoder() : null;

    function bytesToBase64(bytes) {
        let binary = '';
        for (let index = 0; index < bytes.length; index += 0x8000) {
            binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
        }
        return root.btoa(binary);
    }

    function base64ToBytes(value) {
        const binary = root.atob(value);
        return Uint8Array.from(binary, character => character.charCodeAt(0));
    }

    async function relayMaterial(roomId) {
        if (cryptoCache.has(roomId)) return cryptoCache.get(roomId);
        const promise = (async () => {
            if (!root.crypto?.subtle || !textEncoder || !textDecoder) throw new Error('Secure browser encryption is unavailable.');
            const topicHash = new Uint8Array(await root.crypto.subtle.digest('SHA-256', textEncoder.encode(`bzunga-topic-v2:${roomId}`)));
            const keyBytes = await root.crypto.subtle.digest('SHA-256', textEncoder.encode(`bzunga-key-v2:${roomId}`));
            const key = await root.crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
            const topicId = Array.from(topicHash.subarray(0, 18), byte => byte.toString(16).padStart(2, '0')).join('');
            return { key, baseTopic: `bzunga/v2/${topicId}` };
        })();
        cryptoCache.set(roomId, promise);
        return promise;
    }

    async function sealRelayMessage(material, value) {
        const iv = root.crypto.getRandomValues(new Uint8Array(12));
        const plain = textEncoder.encode(JSON.stringify(value));
        const encrypted = new Uint8Array(await root.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, material.key, plain));
        return `${bytesToBase64(iv)}.${bytesToBase64(encrypted)}`;
    }

    async function openRelayMessage(material, payload) {
        const text = typeof payload === 'string' ? payload : textDecoder.decode(payload);
        const [ivValue, encryptedValue] = text.split('.');
        if (!ivValue || !encryptedValue) throw new Error('Malformed relay packet.');
        const decrypted = await root.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: base64ToBytes(ivValue) },
            material.key,
            base64ToBytes(encryptedValue)
        );
        return JSON.parse(textDecoder.decode(decrypted));
    }

    function relayClientId(value = '') {
        const clean = String(value).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 34);
        const random = root.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 12) || Math.random().toString(36).slice(2, 14);
        return `bz_${clean || random}_${random}`.slice(0, 62);
    }

    function relayMessageId() {
        return root.crypto?.randomUUID?.().replace(/-/g, '') || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    }

    function rememberRelayMessage(seen, messageId) {
        if (!messageId) return true;
        if (seen.has(messageId)) return false;
        seen.add(messageId);
        if (seen.size > 800) seen.delete(seen.values().next().value);
        return true;
    }

    function configuredRelayBrokers() {
        return Array.isArray(root.BZUNGA_RELAY_BROKERS) && root.BZUNGA_RELAY_BROKERS.length
            ? root.BZUNGA_RELAY_BROKERS
            : RELAY_BROKERS;
    }

    async function openRelayClient(clientId, will, onProgress, fixedBroker = null) {
        const mqtt = await loadRelayLibrary();
        return new Promise((resolve, reject) => {
            let settled = false;
            const brokers = configuredRelayBrokers();
            const options = {
                clientId: relayClientId(clientId),
                clean: true,
                keepalive: 24,
                connectTimeout: 7500,
                reconnectPeriod: 1700,
                resubscribe: true,
                ...(!fixedBroker ? { servers: brokers } : {}),
                ...(will ? { will } : {})
            };
            const first = fixedBroker || brokers[0];
            const client = mqtt.connect(`${first.protocol}://${first.host}:${first.port}${first.path}`, options);
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                client.end(true);
                reject(new Error('The cloud fallback did not answer in time.'));
            }, RELAY_CONNECT_TIMEOUT_MS);
            client.on('connect', () => {
                onProgress?.('Cloud fallback connected.');
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(client);
            });
            client.on('reconnect', () => onProgress?.('Cloud fallback reconnecting…'));
            client.on('offline', () => onProgress?.('Cloud fallback temporarily offline.'));
            client.on('error', error => onProgress?.(`Cloud fallback: ${error.message || 'broker error'}`));
        });
    }

    function createRelayConnection(peerId, send, close) {
        const handlers = new Map();
        const connection = {
            peer: peerId,
            open: false,
            metadata: { transport: 'relay' },
            on(event, handler) {
                if (!handlers.has(event)) handlers.set(event, new Set());
                handlers.get(event).add(handler);
                return connection;
            },
            send(data) {
                if (connection.open) send(data);
            },
            close() {
                if (!connection.open) return;
                connection.open = false;
                close?.();
                connection._emit('close');
            },
            _emit(event, value) {
                for (const handler of handlers.get(event) || []) {
                    try { handler(value); } catch (error) { setTimeout(() => { throw error; }); }
                }
            }
        };
        return connection;
    }

    const RoomRelay = {
        async host(roomId, onConnection, onProgress) {
            const material = await relayMaterial(roomId);
            const hostTopic = `${material.baseTopic}/host`;
            const connections = new Map();
            const clients = new Set();
            const seenMessages = new Set();
            let closed = false;
            const publish = async (client, topic, value) => {
                if (!client || closed) return;
                const payload = await sealRelayMessage(material, { ...value, messageId: value.messageId || relayMessageId() });
                client.publish(topic, payload, { qos: 1, retain: false });
            };
            const attachClient = (client, broker) => {
                clients.add(client);
                const brokerName = String(broker.host || 'relay');
                const subscribe = () => client.subscribe(hostTopic, { qos: 1 }, error => {
                    onProgress?.(error
                        ? `Cloud fallback subscription failed on ${brokerName}: ${error.message}`
                        : `Cloud fallback ready on ${brokerName}.`);
                });
                subscribe();
                client.on('connect', subscribe);
                let receiveChain = Promise.resolve();
                client.on('message', (topic, payload) => {
                    if (topic !== hostTopic) return;
                    receiveChain = receiveChain.then(async () => {
                        const packet = await openRelayMessage(material, payload);
                        const peerId = String(packet.from || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
                        if (!peerId) return;
                        if (!rememberRelayMessage(seenMessages, `${peerId}:${packet.messageId || ''}`)) return;
                        let connection = connections.get(peerId);
                        if (packet.kind === 'close') {
                            if (connection?._relayClient !== client) return;
                            connection.close();
                            connections.delete(peerId);
                            return;
                        }
                        if (!connection) {
                            const clientTopic = `${material.baseTopic}/client/${peerId}`;
                            connection = createRelayConnection(
                                peerId,
                                data => publish(connection._relayClient, clientTopic, { kind: 'data', data }),
                                () => publish(connection._relayClient, clientTopic, { kind: 'close' })
                            );
                            connection.open = true;
                            connections.set(peerId, connection);
                            onConnection(connection);
                        }
                        connection._relayClient = client;
                        connection._lastSeen = Date.now();
                        if (packet.kind === 'data') connection._emit('data', packet.data);
                    }).catch(() => onProgress?.(`Ignored an invalid cloud relay packet on ${brokerName}.`));
                });
            };
            const sweep = setInterval(() => {
                const cutoff = Date.now() - 38000;
                for (const [peerId, connection] of connections) {
                    if ((connection._lastSeen || 0) >= cutoff) continue;
                    connection.close();
                    connections.delete(peerId);
                }
            }, 9000);
            const controller = {
                close() {
                    closed = true;
                    clearInterval(sweep);
                    for (const connection of connections.values()) connection.close();
                    connections.clear();
                    for (const client of clients) client.end(true);
                    clients.clear();
                }
            };
            const brokers = configuredRelayBrokers();
            return new Promise((resolve, reject) => {
                let resolved = false;
                let failures = 0;
                brokers.forEach((broker, index) => {
                    openRelayClient(
                        `host_${roomId}_${index}`,
                        null,
                        message => onProgress?.(`${broker.host}: ${message}`),
                        broker
                    ).then(client => {
                        if (closed) return client.end(true);
                        attachClient(client, broker);
                        if (!resolved) {
                            resolved = true;
                            resolve(controller);
                        }
                    }).catch(error => {
                        failures += 1;
                        onProgress?.(`${broker.host} unavailable: ${error.message || error}`);
                        if (failures === brokers.length && !resolved) reject(error);
                    });
                });
            });
        },

        async connect(roomId, peerId, onProgress) {
            const material = await relayMaterial(roomId);
            const safePeerId = String(peerId || relayClientId()).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
            const hostTopic = `${material.baseTopic}/host`;
            const clientTopic = `${material.baseTopic}/client/${safePeerId}`;
            const willPayload = await sealRelayMessage(material, { kind: 'close', from: safePeerId });
            const client = await openRelayClient(safePeerId, { topic: hostTopic, payload: willPayload, qos: 1, retain: false }, onProgress);
            let sendChain = Promise.resolve();
            let heartbeat = null;
            const seenMessages = new Set();
            const publish = packet => {
                sendChain = sendChain.then(async () => {
                    const payload = await sealRelayMessage(material, { ...packet, from: safePeerId, messageId: relayMessageId() });
                    client.publish(hostTopic, payload, { qos: 1, retain: false });
                }).catch(() => {});
            };
            const connection = createRelayConnection(
                safePeerId,
                data => publish({ kind: 'data', data }),
                () => {
                    publish({ kind: 'close' });
                    if (heartbeat) clearInterval(heartbeat);
                    setTimeout(() => client.end(true), 120);
                }
            );
            let receiveChain = Promise.resolve();
            client.on('message', (topic, payload) => {
                if (topic !== clientTopic) return;
                receiveChain = receiveChain.then(async () => {
                    const packet = await openRelayMessage(material, payload);
                    if (!rememberRelayMessage(seenMessages, packet.messageId)) return;
                    if (packet.kind === 'data') connection._emit('data', packet.data);
                    else if (packet.kind === 'close') connection.close();
                }).catch(() => onProgress?.('Ignored an invalid cloud relay response.'));
            });
            await new Promise((resolve, reject) => {
                client.subscribe(clientTopic, { qos: 1 }, error => error ? reject(error) : resolve());
            });
            heartbeat = setInterval(() => publish({ kind: 'ping' }), 10000);
            setTimeout(() => {
                connection.open = true;
                connection._emit('open');
            });
            return connection;
        }
    };

    const ResilientJoin = {
        connect(options) {
            const hostId = String(options.hostId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
            const joinPayload = options.joinPayload || { type: 'JOIN' };
            let activeConnection = null;
            let directTimer = null;
            let joinTimer = null;
            let syncTimer = null;
            let stopped = false;
            let relayStarting = false;
            let receivedState = false;

            const clearTimers = () => {
                clearTimeout(directTimer);
                clearInterval(joinTimer);
                clearTimeout(syncTimer);
                directTimer = null;
                joinTimer = null;
                syncTimer = null;
            };

            const publishConnection = (connection, transport = '') => {
                activeConnection = connection;
                options.onConnection?.(connection, transport);
            };

            const fail = (title, detail, code) => {
                if (stopped) return;
                clearTimers();
                ConnectionProgress.fail(title, detail, code);
                options.onFailure?.({ title, detail, code });
            };

            const sendJoin = connection => {
                if (!connection?.open || stopped || connection !== activeConnection || receivedState) return;
                try { connection.send(joinPayload); } catch (error) {}
            };

            const switchToRelay = async reason => {
                if (stopped || relayStarting || receivedState) return;
                relayStarting = true;
                clearTimers();
                const previous = activeConnection;
                if (previous) {
                    previous._switchingTransport = true;
                    publishConnection(null, 'relay');
                    try { previous.close(); } catch (error) {}
                }
                ConnectionProgress.step('relay', reason || 'Direct connection unavailable. Opening the cloud fallback...');
                try {
                    const connection = await RoomRelay.connect(
                        hostId,
                        options.peerId,
                        message => ConnectionProgress.step('relay', message)
                    );
                    if (stopped) {
                        connection.close();
                        return;
                    }
                    relayStarting = false;
                    bind(connection, 'relay');
                } catch (error) {
                    relayStarting = false;
                    fail(
                        'Could not reach the table',
                        `The direct path failed and the cloud fallback could not connect: ${error.message || error}`,
                        'RELAY_UNAVAILABLE'
                    );
                }
            };

            const bind = (connection, transport) => {
                publishConnection(connection, transport);
                connection._transport = transport;

                const opened = () => {
                    if (stopped || activeConnection !== connection || connection._joinStarted) return;
                    connection._joinStarted = true;
                    clearTimeout(directTimer);
                    ConnectionProgress.step(
                        'sync',
                        transport === 'relay' ? 'Cloud link open. Synchronizing the table...' : 'Direct link open. Synchronizing the table...'
                    );
                    options.onChannelOpen?.(connection, transport);
                    sendJoin(connection);
                    joinTimer = setInterval(() => sendJoin(connection), JOIN_RETRY_MS);
                    syncTimer = setTimeout(() => {
                        if (stopped || receivedState || activeConnection !== connection) return;
                        if (transport === 'direct') {
                            switchToRelay('The direct link opened but the host did not answer. Trying the cloud fallback...');
                            return;
                        }
                        fail(
                            'Table did not answer',
                            'The cloud channel opened, but no game state came back. The room may have closed or the code may be wrong.',
                            'HOST_SYNC_TIMEOUT'
                        );
                    }, STATE_SYNC_TIMEOUT_MS);
                };

                connection.on('open', opened);
                connection.on('data', data => {
                    if (stopped || activeConnection !== connection) return;
                    if (data?.type === 'STATE_UPDATE' || data?.type === 'JOIN_REJECTED') {
                        receivedState = true;
                        clearInterval(joinTimer);
                        clearTimeout(syncTimer);
                        if (data.type === 'STATE_UPDATE') {
                            ConnectionProgress.success(transport);
                            options.onReady?.(transport);
                        } else {
                            ConnectionProgress.fail(
                                'The table rejected the join',
                                String(data.reason || 'The host could not accept this connection.'),
                                'ROOM_REJECTED'
                            );
                        }
                    }
                    options.onData?.(data, connection, transport);
                });
                connection.on('close', () => {
                    clearTimers();
                    if (stopped || connection._switchingTransport || activeConnection !== connection) return;
                    publishConnection(null, transport);
                    if (transport === 'direct' && !receivedState) {
                        switchToRelay('The direct game channel failed. Switching to the cloud fallback...');
                        return;
                    }
                    options.onDrop?.(transport);
                });
                connection.on('error', error => {
                    if (stopped || activeConnection !== connection) return;
                    if (transport === 'direct' && !receivedState) {
                        switchToRelay(`Direct channel error. Trying the cloud fallback...`);
                        return;
                    }
                    fail(
                        'Connection interrupted',
                        String(error?.message || error || 'The game channel stopped unexpectedly.'),
                        transport === 'relay' ? 'RELAY_CHANNEL_ERROR' : 'DIRECT_CHANNEL_ERROR'
                    );
                });
                if (connection.open) setTimeout(opened);
            };

            ConnectionProgress.step('room', 'Room service reached. Locating the host...');
            if (options.peer?.open && typeof options.peer.connect === 'function') {
                try {
                    ConnectionProgress.step('channel', 'Host found. Opening a direct game channel...');
                    const connection = options.peer.connect(hostId, {
                        reliable: true,
                        serialization: 'json',
                        metadata: { role: joinPayload.role || 'player' }
                    });
                    bind(connection, 'direct');
                    directTimer = setTimeout(() => {
                        if (!connection.open && activeConnection === connection) {
                            switchToRelay('Direct connection is taking too long. Switching to the cloud fallback...');
                        }
                    }, DIRECT_FALLBACK_MS);
                } catch (error) {
                    switchToRelay('The direct channel could not start. Opening the cloud fallback...');
                }
            } else {
                switchToRelay('The signaling service is unavailable. Opening the cloud fallback...');
            }

            return {
                stop() {
                    if (stopped) return;
                    stopped = true;
                    clearTimers();
                    const connection = activeConnection;
                    activeConnection = null;
                    if (connection) {
                        connection._switchingTransport = true;
                        try { connection.close(); } catch (error) {}
                    }
                },
                switchToRelay,
                get connection() { return activeConnection; }
            };
        }
    };

    function peerOptions() {
        const defaultIceServers = [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun.relay.metered.ca:80' }
        ];
        const iceServers = Array.isArray(root.BZUNGA_ICE_SERVERS) && root.BZUNGA_ICE_SERVERS.length
            ? root.BZUNGA_ICE_SERVERS
            : defaultIceServers;

        return {
            secure: true,
            pingInterval: 5000,
            config: {
                iceServers,
                iceCandidatePoolSize: 10,
                iceTransportPolicy: 'all',
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
        ConnectionProgress,
        RoomRelay,
        ResilientJoin,
        PEER_OPEN_TIMEOUT_MS,
        CONNECTION_OPEN_TIMEOUT_MS,
        JOIN_RETRY_MS,
        STATE_SYNC_TIMEOUT_MS,
        DIRECT_FALLBACK_MS,
        RELAY_CONNECT_TIMEOUT_MS,
        isNameCollision: error => error?.type === 'unavailable-id'
    };
})(globalThis);
