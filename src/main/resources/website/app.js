(async function () {
    'use strict';

    const BASE_URL = CONFIG.BASE_URL;

    // DOM elements
    const connectionPage = document.getElementById('connection-page');
    const messagesPage = document.getElementById('messages-page');
    const connectionForm = document.getElementById('connection-form');
    const backBtn = document.getElementById('back-btn');
    const queueTitle = document.getElementById('queue-title');
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    const errorMessage = document.getElementById('error-message');
    const messagesTableContainer = document.getElementById('messages-table-container');
    const messagesTbody = document.getElementById('messages-tbody');
    const messageModal = document.getElementById('message-modal');
    const closeModal = document.getElementById('close-modal');
    const messageDetail = document.getElementById('message-detail');
    const returnAllBtn = document.getElementById('return-all-btn');
    const selectAllCheckbox = document.getElementById('select-all');
    const bulkActions = document.getElementById('bulk-actions');
    const selectedCount = document.getElementById('selected-count');
    const bulkReturnBtn = document.getElementById('bulk-return-btn');
    const bulkTransferBtn = document.getElementById('bulk-transfer-btn');
    const transferModal = document.getElementById('transfer-modal');
    const closeTransferModal = document.getElementById('close-transfer-modal');
    const cancelTransferBtn = document.getElementById('cancel-transfer-btn');
    const submitTransferBtn = document.getElementById('submit-transfer-btn');
    const targetQueueInput = document.getElementById('targetQueueName');
    const transferMessagesInfo = document.getElementById('transfer-messages-info');
    const refreshBtn = document.getElementById('refresh-btn');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    const deleteModal = document.getElementById('delete-modal');
    const closeDeleteModal = document.getElementById('close-delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const submitDeleteBtn = document.getElementById('submit-delete-btn');
    const deleteConfirmInput = document.getElementById('deleteConfirmInput');
    const deleteMessagesInfo = document.getElementById('delete-messages-info');

    let connectionConfig = {};
    let allMessages = [];
    let selectedMessageIds = new Set();
    let pendingTransferIds = [];
    let pendingDeleteIds = [];
    let currentPage = 1;
    const PAGE_SIZE = 8;

    const pagination = document.getElementById('pagination');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    // Page navigation
    function showPage(page) {
        connectionPage.classList.remove('active');
        messagesPage.classList.remove('active');
        page.classList.add('active');
    }

    function showLoading(text) {
        loadingText.textContent = text;
        loading.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        messagesTableContainer.classList.add('hidden');
        bulkActions.classList.add('hidden');
    }

    function hideLoading() {
        loading.classList.add('hidden');
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove('hidden');
        hideLoading();
    }

    // Remove any old plaintext storage
    try { localStorage.removeItem('amqHandlerConfig'); } catch (e) {}

    var sessionId = null; // opaque session ID from server (Connected App flow)

    // Returns the headers needed for platform API calls based on auth method
    function getPlatformAuthHeaders() {
        if (sessionId) {
            return { 'X-Session-Id': sessionId };
        }
        return {};
    }

    // Crypto helpers for sensitive data (AES-GCM, key lives only in memory — lost on tab close)
    var cryptoKey = null;
    async function getCryptoKey() {
        if (cryptoKey) return cryptoKey;
        cryptoKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        return cryptoKey;
    }

    async function encryptValue(value) {
        if (!value) return null;
        var key = await getCryptoKey();
        var iv = crypto.getRandomValues(new Uint8Array(12));
        var encoded = new TextEncoder().encode(value);
        var encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoded);
        return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
    }

    async function decryptValue(obj) {
        if (!obj || !obj.iv || !obj.data) return '';
        try {
            var key = await getCryptoKey();
            var decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(obj.iv) }, key, new Uint8Array(obj.data));
            return new TextDecoder().decode(decrypted);
        } catch (e) { return ''; }
    }

    // Pre-fill form with saved data (sensitive fields stored encrypted in sessionStorage)
    async function loadSavedConfig() {
        try {
            var saved = JSON.parse(sessionStorage.getItem('amqStudioConfig'));
            if (saved) {
                // Decrypt sensitive fields
                if (saved._bearerToken) saved.bearerToken = await decryptValue(saved._bearerToken);
                if (saved._clientSecret) saved.clientSecret = await decryptValue(saved._clientSecret);
                if (saved._clientId) saved.clientId = await decryptValue(saved._clientId);
                delete saved._bearerToken;
                delete saved._clientSecret;
                delete saved._clientId;
                return saved;
            }
        } catch (e) {}
        return CONFIG.DEFAULTS || {};
    }

    var savedConfig = await loadSavedConfig();

    // Mode toggle
    var modeToggle = document.getElementById('mode-toggle');
    var modePlatformBtn = document.getElementById('mode-platform');
    var modeManualBtn = document.getElementById('mode-manual');
    var platformForm = document.getElementById('connection-form');
    var manualForm = document.getElementById('manual-form');

    if (CONFIG.TEST_MODE_ENABLED) {
        modeToggle.classList.remove('hidden');
    }

    modePlatformBtn.addEventListener('click', function () {
        modePlatformBtn.classList.add('active');
        modeManualBtn.classList.remove('active');
        platformForm.classList.remove('hidden');
        manualForm.classList.add('hidden');
    });

    modeManualBtn.addEventListener('click', function () {
        modeManualBtn.classList.add('active');
        modePlatformBtn.classList.remove('active');
        manualForm.classList.remove('hidden');
        platformForm.classList.add('hidden');
    });

    // --- Connected App auth elements ---
    var connectedAppAuthSection = document.getElementById('connected-app-auth-section');
    var authenticatedSection = document.getElementById('authenticated-section');
    var caDisconnectBtn = document.getElementById('ca-disconnect-btn');
    var caClientIdInput = document.getElementById('caClientId');
    var caClientSecretInput = document.getElementById('caClientSecret');
    var caLoginBtn = document.getElementById('ca-login-btn');
    var caStatus = document.getElementById('ca-status');

    // Fetch RSA public key from server and import for encryption
    var rsaPublicKey = null;
    async function getRsaPublicKey() {
        if (rsaPublicKey) return rsaPublicKey;
        var resp = await fetch(BASE_URL + '/auth/public-key');
        var data = await resp.json();
        var binaryStr = atob(data.publicKey);
        var bytes = new Uint8Array(binaryStr.length);
        for (var i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        rsaPublicKey = await crypto.subtle.importKey(
            'spki', bytes.buffer,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            false, ['encrypt']
        );
        return rsaPublicKey;
    }

    async function rsaEncrypt(plaintext) {
        var key = await getRsaPublicKey();
        var encoded = new TextEncoder().encode(plaintext);
        var encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded);
        return btoa(String.fromCharCode.apply(null, new Uint8Array(encrypted)));
    }

    // Store AMQ credentials on server and get a connection ID (credentials never sent again)
    var connectionId = null;
    async function storeCredentialsOnServer() {
        var encrypted = await rsaEncrypt(JSON.stringify({
            clientId: connectionConfig.clientId,
            clientSecret: connectionConfig.clientSecret
        }));
        var resp = await fetch(BASE_URL + '/auth/store-credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encrypted: encrypted })
        });
        if (!resp.ok) throw new Error('Failed to store credentials on server');
        var data = await resp.json();
        connectionId = data.connectionId;
    }

    // Connected App login: exchange credentials for server-side session
    caLoginBtn.addEventListener('click', async function () {
        var clientId = caClientIdInput.value.trim();
        var clientSecret = caClientSecretInput.value.trim();
        if (!clientId || !clientSecret) {
            caStatus.textContent = 'Please enter both Client ID and Client Secret.';
            caStatus.classList.remove('hidden');
            return;
        }
        caLoginBtn.disabled = true;
        caStatus.textContent = 'Authenticating...';
        caStatus.classList.remove('hidden');

        try {
            var encrypted = await rsaEncrypt(JSON.stringify({ clientId: clientId, clientSecret: clientSecret }));
            var response = await fetch(BASE_URL + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ encrypted: encrypted })
            });
            var data;
            try {
                data = await response.json();
            } catch (parseError) {
                throw new Error('Authentication failed (HTTP ' + response.status + '). Please verify your Client ID and Client Secret.');
            }
            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed (HTTP ' + response.status + ')');
            }
            sessionId = data.sessionId;
            // Hide auth fields, show authenticated state
            caClientSecretInput.value = '';
            connectedAppAuthSection.classList.add('hidden');
            authenticatedSection.classList.remove('hidden');
            // Load organizations using the session
            loadOrganizations(null);
        } catch (err) {
            sessionId = null;
            caStatus.textContent = err.message;
            caStatus.style.color = '#e74c3c';
        } finally {
            caLoginBtn.disabled = false;
        }
    });

    // Disconnect button: logout session and reset to auth fields
    caDisconnectBtn.addEventListener('click', async function () {
        await logoutSession();
        authenticatedSection.classList.add('hidden');
        connectedAppAuthSection.classList.remove('hidden');
        caClientIdInput.value = '';
        caClientSecretInput.value = '';
        caStatus.classList.add('hidden');
        hideFromGroup(orgGroup);
    });

    // Manual form submission
    manualForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        connectionConfig = {
            region: document.getElementById('m-region').value.trim(),
            orgId: document.getElementById('m-orgId').value.trim(),
            envId: document.getElementById('m-envId').value.trim(),
            clientId: document.getElementById('m-clientId').value.trim(),
            clientSecret: document.getElementById('m-clientSecret').value.trim(),
            queueName: document.getElementById('m-queueName').value.trim()
        };
        await saveConfig(connectionConfig);
        await storeCredentialsOnServer();
        acquireLockAndProceed();
    });

    // Restore manual form from saved config (non-sensitive only)
    if (savedConfig.region) document.getElementById('m-region').value = savedConfig.region || '';
    if (savedConfig.orgId) document.getElementById('m-orgId').value = savedConfig.orgId || '';
    if (savedConfig.envId) document.getElementById('m-envId').value = savedConfig.envId || '';
    document.getElementById('m-clientId').value = '';
    document.getElementById('m-clientSecret').value = '';
    if (savedConfig.queueName) document.getElementById('m-queueName').value = savedConfig.queueName || '';

    var orgSelect = document.getElementById('orgId');
    var envSelect = document.getElementById('envId');
    var regionSelect = document.getElementById('region');
    var queueSelect = document.getElementById('queueName');
    var clientAppSelect = document.getElementById('clientApp');
    var clientIdInput = document.getElementById('clientId');
    var clientSecretInput = document.getElementById('clientSecret');
    var connectBtn = document.getElementById('connect-btn');

    var orgGroup = document.getElementById('orgGroup');
    var envGroup = document.getElementById('envGroup');
    var regionGroup = document.getElementById('regionGroup');
    var queueGroup = document.getElementById('queueGroup');
    var clientAppGroup = document.getElementById('clientAppGroup');
    var clientIdGroup = document.getElementById('clientIdGroup');
    var clientSecretGroup = document.getElementById('clientSecretGroup');

    // Restore saved values (non-sensitive only pre-filled, secrets NOT restored to inputs)
    clientSecretInput.value = '';

    async function saveConfig(config) {
        try {
            var toStore = {
                region: config.region || '',
                orgId: config.orgId || '',
                envId: config.envId || '',
                queueName: config.queueName || '',
                clientAppId: config.clientAppId || '',
                _bearerToken: config.bearerToken ? await encryptValue(config.bearerToken) : null,
                _clientId: config.clientId ? await encryptValue(config.clientId) : null,
                _clientSecret: config.clientSecret ? await encryptValue(config.clientSecret) : null
            };
            sessionStorage.setItem('amqStudioConfig', JSON.stringify(toStore));
        } catch (e) {}
    }

    function hideFromGroup(group) {
        var allGroups = [orgGroup, envGroup, regionGroup, queueGroup, clientAppGroup, clientIdGroup, clientSecretGroup];
        var startIndex = allGroups.indexOf(group);
        if (startIndex === -1) startIndex = 0;
        for (var i = startIndex; i < allGroups.length; i++) {
            if (allGroups[i]) allGroups[i].classList.add('hidden');
        }
        connectBtn.classList.add('hidden');
    }

    function showGroup(group) {
        group.classList.remove('hidden');
    }

    // Cascading dropdowns - progressive reveal
    var debounceTimer = null;

    async function loadOrganizations(token) {
        orgSelect.innerHTML = '<option value="">Loading organizations...</option>';
        showGroup(orgGroup);
        hideFromGroup(envGroup);

        try {
            var response = await fetch(BASE_URL + '/platform/me', {
                headers: getPlatformAuthHeaders()
            });
            if (!response.ok) throw new Error('Invalid token or API error');
            var data = await response.json();
            var orgs = data.user ? data.user.memberOfOrganizations : (data.memberOfOrganizations || []);
            orgSelect.innerHTML = '<option value="">-- Select Organization --</option>';
            orgs.forEach(function (org) {
                var opt = document.createElement('option');
                opt.value = org.id;
                opt.textContent = org.name;
                orgSelect.appendChild(opt);
            });
            if (savedConfig.orgId) {
                orgSelect.value = savedConfig.orgId;
                if (orgSelect.value) orgSelect.dispatchEvent(new Event('change'));
            }
        } catch (e) {
            orgSelect.innerHTML = '<option value="">-- Invalid token --</option>';
        }
    }

    orgSelect.addEventListener('change', function () {
        hideFromGroup(envGroup);
        if (!orgSelect.value) return;
        loadEnvironments(orgSelect.value);
    });

    async function loadEnvironments(orgId) {
        envSelect.innerHTML = '<option value="">Loading environments...</option>';
        showGroup(envGroup);
        hideFromGroup(regionGroup);

        try {
            var response = await fetch(BASE_URL + '/platform/organizations/' + encodeURIComponent(orgId) + '/environments', {
                headers: getPlatformAuthHeaders()
            });
            if (!response.ok) throw new Error('API error');
            var data = await response.json();
            var envs = data.data || data;
            envSelect.innerHTML = '<option value="">-- Select Environment --</option>';
            envs.forEach(function (env) {
                var opt = document.createElement('option');
                opt.value = env.id;
                opt.textContent = env.name + ' (' + env.type + ')';
                envSelect.appendChild(opt);
            });
            if (savedConfig.envId) {
                envSelect.value = savedConfig.envId;
                if (envSelect.value) envSelect.dispatchEvent(new Event('change'));
            }
        } catch (e) {
            envSelect.innerHTML = '<option value="">-- Error loading environments --</option>';
        }
    }

    envSelect.addEventListener('change', function () {
        hideFromGroup(regionGroup);
        if (!envSelect.value) return;
        loadRegions(orgSelect.value, envSelect.value);
    });

    async function loadRegions(orgId, envId) {
        regionSelect.innerHTML = '<option value="">Loading regions...</option>';
        showGroup(regionGroup);
        hideFromGroup(queueGroup);

        try {
            var response = await fetch(BASE_URL + '/platform/organizations/' + encodeURIComponent(orgId) + '/environments/' + encodeURIComponent(envId) + '/regions', {
                headers: getPlatformAuthHeaders()
            });
            if (!response.ok) throw new Error('API error');
            var regions = await response.json();
            regionSelect.innerHTML = '<option value="">-- Select Region --</option>';
            (Array.isArray(regions) ? regions : []).forEach(function (r) {
                var opt = document.createElement('option');
                opt.value = r.id || r.regionId || r;
                opt.textContent = r.id || r.regionId || r;
                regionSelect.appendChild(opt);
            });
            if (savedConfig.region) {
                regionSelect.value = savedConfig.region;
                if (regionSelect.value) regionSelect.dispatchEvent(new Event('change'));
            }
        } catch (e) {
            regionSelect.innerHTML = '<option value="">-- Error loading regions --</option>';
        }
    }

    regionSelect.addEventListener('change', function () {
        hideFromGroup(queueGroup);
        if (!regionSelect.value) return;
        loadQueues(orgSelect.value, envSelect.value, regionSelect.value);
    });

    async function loadQueues(orgId, envId, regionId) {
        queueSelect.innerHTML = '<option value="">Loading queues...</option>';
        showGroup(queueGroup);
        hideFromGroup(clientAppGroup);

        try {
            var response = await fetch(BASE_URL + '/platform/organizations/' + encodeURIComponent(orgId) + '/environments/' + encodeURIComponent(envId) + '/regions/' + encodeURIComponent(regionId) + '/destinations', {
                headers: getPlatformAuthHeaders()
            });
            if (!response.ok) throw new Error('API error');
            var destinations = await response.json();
            queueSelect.innerHTML = '<option value="">-- Select Queue --</option>';
            (Array.isArray(destinations) ? destinations : []).forEach(function (d) {
                if (d.type === 'queue' || !d.type) {
                    var opt = document.createElement('option');
                    opt.value = d.queueId || d.id || d;
                    opt.textContent = (d.queueId || d.id || d) + (d.fifo ? ' (FIFO)' : '');
                    queueSelect.appendChild(opt);
                }
            });
            if (savedConfig.queueName) {
                queueSelect.value = savedConfig.queueName;
                if (queueSelect.value) queueSelect.dispatchEvent(new Event('change'));
            }
        } catch (e) {
            queueSelect.innerHTML = '<option value="">-- Error loading queues --</option>';
        }
    }

    queueSelect.addEventListener('change', function () {
        hideFromGroup(clientAppGroup);
        if (!queueSelect.value) return;
        loadClientApps();
    });

    async function loadClientApps() {
        clientAppSelect.innerHTML = '<option value="">Loading client apps...</option>';
        showGroup(clientAppGroup);
        hideFromGroup(clientIdGroup);

        try {
            var response = await fetch(BASE_URL + '/platform/connected-apps', {
                headers: getPlatformAuthHeaders()
            });
            if (!response.ok) throw new Error('API error');
            var data = await response.json();
            var apps = data.data || data;
            clientAppSelect.innerHTML = '<option value="">-- Select Client App --</option>';
            (Array.isArray(apps) ? apps : []).forEach(function (app) {
                var opt = document.createElement('option');
                opt.value = app.id || app.client_id || '';
                opt.textContent = app.client_name || app.name || app.id || 'Unnamed App';
                opt.setAttribute('data-client-id', app.id || app.client_id || '');
                clientAppSelect.appendChild(opt);
            });
            if (savedConfig.clientAppId) {
                clientAppSelect.value = savedConfig.clientAppId;
                if (clientAppSelect.value) clientAppSelect.dispatchEvent(new Event('change'));
            }
        } catch (e) {
            clientAppSelect.innerHTML = '<option value="">-- Error loading apps --</option>';
        }
    }

    clientAppSelect.addEventListener('change', function () {
        hideFromGroup(clientIdGroup);
        if (!clientAppSelect.value) return;
        var selected = clientAppSelect.options[clientAppSelect.selectedIndex];
        clientIdInput.value = selected.getAttribute('data-client-id') || clientAppSelect.value;
        showGroup(clientIdGroup);
        showGroup(clientSecretGroup);
        clientSecretInput.value = '';
        connectBtn.classList.remove('hidden');
    });

    var heartbeatInterval = null;

    // Form submission
    connectionForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        connectionConfig = {
            region: regionSelect.value,
            orgId: orgSelect.value,
            envId: envSelect.value,
            clientId: clientIdInput.value.trim(),
            clientSecret: clientSecretInput.value.trim(),
            queueName: queueSelect.value,
            clientAppId: clientAppSelect.value
        };

        await saveConfig(connectionConfig);
        await storeCredentialsOnServer();
        acquireLockAndProceed();
    });

    async function acquireLockAndProceed() {
        showPage(messagesPage);
        queueTitle.textContent = connectionConfig.queueName;
        showLoading('Acquiring lock on queue...');

        try {
            var response = await fetch(BASE_URL + '/acquire-lock?queueName=' + encodeURIComponent(connectionConfig.queueName), {
                method: 'POST',
                headers: {
                    'region': connectionConfig.region,
                    'orgId': connectionConfig.orgId,
                    'envId': connectionConfig.envId,
                    'X-Connection-Id': connectionId
                }
            });

            var result = await response.json();

            if (response.status === 409) {
                showError(result.message || 'This queue is currently locked by another user.');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to acquire lock (HTTP ' + response.status + ')');
            }

            // Start heartbeat
            startHeartbeat();
            fetchAndListMessages();

        } catch (err) {
            showError('Error: ' + err.message);
        }
    }

    function startHeartbeat() {
        stopHeartbeat();
        heartbeatInterval = setInterval(renewLock, 4 * 60 * 1000); // every 4 minutes
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    }

    async function renewLock() {
        try {
            await fetch(BASE_URL + '/renew-lock?queueName=' + encodeURIComponent(connectionConfig.queueName), {
                method: 'PUT',
                headers: {
                    'region': connectionConfig.region,
                    'orgId': connectionConfig.orgId,
                    'envId': connectionConfig.envId,
                    'X-Connection-Id': connectionId
                }
            });
        } catch (e) {}
    }

    async function releaseLock() {
        stopHeartbeat();
        try {
            await fetch(BASE_URL + '/release-lock?queueName=' + encodeURIComponent(connectionConfig.queueName), {
                method: 'DELETE',
                headers: {
                    'orgId': connectionConfig.orgId,
                    'envId': connectionConfig.envId
                }
            });
        } catch (e) {}
    }

    // Logout Connected App session (invalidates server-side token)
    async function logoutSession() {
        if (sessionId) {
            try {
                await fetch(BASE_URL + '/auth/logout', {
                    method: 'DELETE',
                    headers: { 'X-Session-Id': sessionId }
                });
            } catch (e) {}
            sessionId = null;
        }
    }

    // Back button - confirm, return all messages, terminate session
    backBtn.addEventListener('click', async function () {
        var hasMessages = allMessages && allMessages.length > 0;
        var msg = hasMessages
            ? 'All remaining messages will be returned to the source queue. Your session will be terminated and you will need to re-authenticate and fetch messages again.'
            : 'Your session will be terminated and you will need to re-authenticate to connect again.';
        var ok = await showConfirm('Disconnect', msg);
        if (!ok) return;

        if (hasMessages) {
            showLoading('Returning messages to queue before exiting...');
            try {
                var payload = {
                    transaction: 'RTO',
                    allMessages: true,
                    messageIdList: [],
                    sourceQueue: connectionConfig.queueName,
                    targetQueue: ''
                };
                await fetch(BASE_URL + '/send-to-queue', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'region': connectionConfig.region,
                        'orgId': connectionConfig.orgId,
                        'envId': connectionConfig.envId,
                        'X-Connection-Id': connectionId
                    },
                    body: JSON.stringify(payload)
                });
            } catch (e) {}
        }
        releaseLock();
        stopFetchPolling();
        await logoutSession();
        hideLoading();
        allMessages = [];
        connectionConfig = {};
        connectionId = null;
        try { sessionStorage.removeItem('amqStudioConfig'); } catch (e) {}
        showPage(connectionPage);
        messagesTableContainer.classList.add('hidden');
        bulkActions.classList.add('hidden');
        errorMessage.classList.add('hidden');
        selectedMessageIds.clear();
        updateBulkActions();
        showToast('Session terminated. All messages returned to queue.', 'success');
    });

    // Force disconnect when user closes/navigates away from the page.
    // Server-side handles: return messages to queue + release lock in one call.
    window.addEventListener('beforeunload', function () {
        if (connectionConfig.queueName) {
            try {
                fetch(BASE_URL + '/force-disconnect?queueName=' + encodeURIComponent(connectionConfig.queueName), {
                    method: 'DELETE',
                    headers: {
                        'orgId': connectionConfig.orgId,
                        'envId': connectionConfig.envId
                    },
                    keepalive: true
                });
            } catch (e) {}
        }
        if (sessionId) {
            try {
                fetch(BASE_URL + '/auth/logout', {
                    method: 'DELETE',
                    headers: { 'X-Session-Id': sessionId },
                    keepalive: true
                });
            } catch (e) {}
        }
    });

    // Return all messages to origin queue
    returnAllBtn.addEventListener('click', async function () {
        var ok = await showConfirm('Return All Messages', 'Return ALL messages back to the origin queue "' + connectionConfig.queueName + '"?');
        if (!ok) return;
        returnAllToQueue();
    });

    async function returnAllToQueue() {
        showLoading('Returning messages to origin queue...');

        try {
            var payload = {
                transaction: 'RTO',
                allMessages: true,
                messageIdList: [],
                sourceQueue: connectionConfig.queueName,
                targetQueue: ''
            };

            var response = await fetch(BASE_URL + '/send-to-queue', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'region': connectionConfig.region,
                    'orgId': connectionConfig.orgId,
                    'envId': connectionConfig.envId,
                    'X-Connection-Id': connectionId
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                var errBody = await parseResponseBody(response);
                throw new Error(errBody || 'Operation failed (HTTP ' + response.status + ')');
            }

            var result = await response.json();
            showToast(result.message || 'All messages returned to origin queue.', 'success');
            releaseLock();
            hideLoading();
            allMessages = [];
            selectedMessageIds.clear();
            selectAllCheckbox.checked = false;
            updateBulkActions();
            messagesTbody.innerHTML = '<tr><td colspan="6" class="no-messages">No messages found in this queue.</td></tr>';
            messagesTableContainer.classList.remove('hidden');

        } catch (err) {
            showError('Error: ' + err.message);
        }
    }

    // Select all checkbox
    selectAllCheckbox.addEventListener('change', function () {
        var checkboxes = messagesTbody.querySelectorAll('.msg-checkbox');
        checkboxes.forEach(function (cb) {
            cb.checked = selectAllCheckbox.checked;
            var msgId = cb.getAttribute('data-id');
            if (selectAllCheckbox.checked) {
                selectedMessageIds.add(msgId);
            } else {
                selectedMessageIds.delete(msgId);
            }
        });
        updateBulkActions();
    });

    // Bulk return selected to origin
    bulkReturnBtn.addEventListener('click', async function () {
        if (selectedMessageIds.size === 0) return;
        var ok = await showConfirm('Return Selected', 'Return ' + selectedMessageIds.size + ' selected message(s) to origin queue "' + connectionConfig.queueName + '"?');
        if (!ok) return;
        sendToQueue('RTO', false, Array.from(selectedMessageIds), connectionConfig.queueName, '');
    });

    // Bulk transfer selected to another queue
    bulkTransferBtn.addEventListener('click', function () {
        if (selectedMessageIds.size === 0) return;
        pendingTransferIds = Array.from(selectedMessageIds);
        openTransferModal(pendingTransferIds);
    });

    // Bulk delete selected
    bulkDeleteBtn.addEventListener('click', function () {
        if (selectedMessageIds.size === 0) return;
        pendingDeleteIds = Array.from(selectedMessageIds);
        openDeleteModal(pendingDeleteIds);
    });

    // Refresh button - re-fetch messages from queue
    refreshBtn.addEventListener('click', function () {
        fetchAndListMessages();
    });

    // Delete modal controls
    closeDeleteModal.addEventListener('click', closeDeleteModalFn);
    cancelDeleteBtn.addEventListener('click', closeDeleteModalFn);
    deleteModal.addEventListener('click', function (e) {
        if (e.target === deleteModal) closeDeleteModalFn();
    });

    deleteConfirmInput.addEventListener('input', function () {
        submitDeleteBtn.disabled = deleteConfirmInput.value.trim() !== 'DELETE';
    });

    submitDeleteBtn.addEventListener('click', function () {
        if (deleteConfirmInput.value.trim() !== 'DELETE') return;
        closeDeleteModalFn();
        deleteMessages(pendingDeleteIds);
    });

    function openDeleteModal(messageIds) {
        deleteConfirmInput.value = '';
        submitDeleteBtn.disabled = true;
        deleteMessagesInfo.textContent = messageIds.length + ' message(s) will be permanently deleted.';
        deleteModal.classList.remove('hidden');
        deleteConfirmInput.focus();
    }

    function closeDeleteModalFn() {
        deleteModal.classList.add('hidden');
    }

    async function deleteMessages(messageIds) {
        showLoading('Deleting message(s)...');
        try {
            // Delete each message key from OS via the list-message endpoint or directly
            // We'll call the send-to-queue with a special delete approach
            // Actually, we need a delete endpoint. For now, we remove from OS by calling release
            var payload = {
                transaction: 'DEL',
                allMessages: false,
                messageIdList: messageIds,
                sourceQueue: connectionConfig.queueName,
                targetQueue: ''
            };

            var response = await fetch(BASE_URL + '/delete-messages', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'orgId': connectionConfig.orgId,
                    'envId': connectionConfig.envId
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                var errBody = await parseResponseBody(response);
                showToast('Error: ' + (errBody || 'Delete failed (HTTP ' + response.status + ')'), 'error');
                refreshMessageList();
                return;
            }

            var result = await response.json();
            showToast(result.message || 'Message(s) deleted successfully.', 'success');
            selectedMessageIds.clear();
            selectAllCheckbox.checked = false;
            updateBulkActions();
            refreshMessageList();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
            refreshMessageList();
        }
    }

    // Transfer modal controls
    closeTransferModal.addEventListener('click', closeTransferModalFn);
    cancelTransferBtn.addEventListener('click', closeTransferModalFn);
    transferModal.addEventListener('click', function (e) {
        if (e.target === transferModal) closeTransferModalFn();
    });

    submitTransferBtn.addEventListener('click', function () {
        var targetQueue = targetQueueInput.value.trim();
        if (!targetQueue) {
            showToast('Please enter a target queue name.', 'error');
            return;
        }
        closeTransferModalFn();
        sendToQueue('TMQ', false, pendingTransferIds, connectionConfig.queueName, targetQueue);
    });

    function openTransferModal(messageIds) {
        targetQueueInput.value = '';
        transferMessagesInfo.textContent = messageIds.length + ' message(s) will be transferred.';
        transferModal.classList.remove('hidden');
        targetQueueInput.focus();
    }

    function closeTransferModalFn() {
        transferModal.classList.add('hidden');
    }

    function updateBulkActions() {
        if (selectedMessageIds.size > 0) {
            bulkActions.classList.remove('hidden');
            selectedCount.textContent = selectedMessageIds.size + ' selected';
        } else {
            bulkActions.classList.add('hidden');
        }
    }

    // Fetch all messages then list them
    var fetchPollInterval = null;
    var fetchInProgress = false;

    async function fetchAndListMessages() {
        showLoading('Fetching messages from queue...');
        currentPage = 1;
        selectedMessageIds.clear();
        selectAllCheckbox.checked = false;
        updateBulkActions();
        fetchInProgress = true;

        // Fire fetch-all-messages (don't await — let it run in background)
        var fetchUrl = BASE_URL + '/fetch-all-messages?queueName=' + encodeURIComponent(connectionConfig.queueName);
        var fetchPromise = fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'region': connectionConfig.region,
                'orgId': connectionConfig.orgId,
                'envId': connectionConfig.envId,
                'X-Connection-Id': connectionId
            }
        });

        // Start polling list-all-messages to show messages as they arrive
        startFetchPolling();

        // Wait for the fetch to complete in background
        try {
            var fetchResponse = await fetchPromise;
            if (!fetchResponse.ok) {
                var errBody = await parseResponseBody(fetchResponse);
                stopFetchPolling();
                showError('Error: ' + (errBody || 'Failed to fetch messages (HTTP ' + fetchResponse.status + ')'));
                return;
            }
            var fetchResult = await fetchResponse.json();
            showToast('Fetched ' + (fetchResult.noOfMessages || 0) + ' message(s) from queue.', 'success');
        } catch (err) {
            stopFetchPolling();
            showError('Error: ' + err.message);
            return;
        }

        // Final refresh after fetch completes
        fetchInProgress = false;
        stopFetchPolling();
        await pollMessages();
    }

    function startFetchPolling() {
        stopFetchPolling();
        fetchPollInterval = setInterval(pollMessages, 3000);
        // First poll immediately after a short delay to give time for first message
        setTimeout(pollMessages, 1500);
    }

    function stopFetchPolling() {
        if (fetchPollInterval) {
            clearInterval(fetchPollInterval);
            fetchPollInterval = null;
        }
    }

    async function pollMessages() {
        try {
            var listUrl = BASE_URL + '/list-all-messages?queueName=' + encodeURIComponent(connectionConfig.queueName);
            var listResponse = await fetch(listUrl, {
                method: 'GET',
                headers: {
                    'orgId': connectionConfig.orgId,
                    'envId': connectionConfig.envId
                }
            });

            if (!listResponse.ok) return;

            var messages = await listResponse.json();
            allMessages = messages;
            hideLoading();

            if (fetchInProgress && messages.length > 0) {
                loadingText.textContent = 'Fetching messages... (' + messages.length + ' received so far)';
                loading.classList.remove('hidden');
            }

            renderMessages(allMessages);
        } catch (e) {
            // Silently ignore poll errors
        }
    }

    // Send to queue API call
    async function sendToQueue(transaction, allMsgs, messageIdList, sourceQueue, targetQueue) {
        showLoading(transaction === 'RTO' ? 'Returning messages to origin queue...' : 'Transferring messages...');

        try {
            var payload = {
                transaction: transaction,
                allMessages: allMsgs,
                messageIdList: messageIdList,
                sourceQueue: sourceQueue,
                targetQueue: targetQueue
            };

            var response = await fetch(BASE_URL + '/send-to-queue', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'region': connectionConfig.region,
                    'orgId': connectionConfig.orgId,
                    'envId': connectionConfig.envId,
                    'X-Connection-Id': connectionId
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                var errBody = await parseResponseBody(response);
                showToast('Error: ' + (errBody || 'Operation failed (HTTP ' + response.status + ')'), 'error');
                // Refresh list from OS so user can continue
                refreshMessageList();
                return;
            }

            var result = await response.json();
            showToast(result.message || 'Operation completed successfully.', 'success');
            // Refresh from OS only (no need to re-fetch from queue)
            refreshMessageList();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
            refreshMessageList();
        }
    }

    // Refresh message list from Object Store without re-consuming from queue
    async function refreshMessageList() {
        showLoading('Refreshing messages...');
        selectedMessageIds.clear();
        selectAllCheckbox.checked = false;
        updateBulkActions();

        try {
            var listUrl = BASE_URL + '/list-all-messages?queueName=' + encodeURIComponent(connectionConfig.queueName);
            var listResponse = await fetch(listUrl, {
                method: 'GET',
                headers: {
                    'orgId': connectionConfig.orgId,
                    'envId': connectionConfig.envId
                }
            });

            if (!listResponse.ok) {
                throw new Error('Failed to list messages (HTTP ' + listResponse.status + ')');
            }

            allMessages = await listResponse.json();
            hideLoading();
            renderMessages(allMessages);

        } catch (err) {
            showError('Error: ' + err.message);
        }
    }

    // Render message table
    function renderMessages(messages) {
        messagesTbody.innerHTML = '';
        messagesTableContainer.classList.remove('hidden');

        if (!messages || messages.length === 0) {
            messagesTbody.innerHTML = '<tr><td colspan="6" class="no-messages">No messages found in this queue.</td></tr>';
            pagination.classList.add('hidden');
            return;
        }

        var totalPages = Math.ceil(messages.length / PAGE_SIZE);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        var start = (currentPage - 1) * PAGE_SIZE;
        var end = start + PAGE_SIZE;
        var pageMessages = messages.slice(start, end);

        pageMessages.forEach(function (msg) {
            var row = document.createElement('tr');
            var contentType = msg.contentType || (msg.userProperties && msg.userProperties.contentType) || 'application/json; charset=UTF-8';
            var payloadStr = formatPayloadForDisplay(msg.data, contentType);
            var truncatedPayload = payloadStr.length > 60 ? payloadStr.substring(0, 60) + '...' : payloadStr;

            row.innerHTML =
                '<td class="col-checkbox"><input type="checkbox" class="msg-checkbox" data-id="' + escapeAttr(msg.messageId) + '"></td>' +
                '<td class="col-id clickable" data-msgid="' + escapeAttr(msg.messageId) + '" title="' + escapeAttr(msg.messageId) + '">' + escapeHtml(msg.messageId) + '</td>' +
                '<td class="col-type" title="' + escapeAttr(contentType) + '">' + escapeHtml(contentType) + '</td>' +
                '<td class="col-payload clickable" data-msgid="' + escapeAttr(msg.messageId) + '" title="' + escapeAttr(payloadStr) + '">' + escapeHtml(truncatedPayload) + '</td>' +
                '<td class="col-date">' + escapeHtml(formatDate(msg)) + '</td>' +
                '<td class="col-actions">' +
                    '<button class="btn btn-sm btn-transfer" data-id="' + escapeAttr(msg.messageId) + '" title="Transfer to another queue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button> ' +
                    '<button class="btn btn-sm btn-delete" data-id="' + escapeAttr(msg.messageId) + '" title="Delete message"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>' +
                '</td>';
            messagesTbody.appendChild(row);
        });

        // Attach checkbox event listeners
        messagesTbody.querySelectorAll('.msg-checkbox').forEach(function (cb) {
            cb.addEventListener('change', function () {
                var msgId = cb.getAttribute('data-id');
                if (cb.checked) {
                    selectedMessageIds.add(msgId);
                } else {
                    selectedMessageIds.delete(msgId);
                    selectAllCheckbox.checked = false;
                }
                updateBulkActions();
            });
        });

        // Attach row click to view detail
        messagesTbody.querySelectorAll('.clickable').forEach(function (cell) {
            cell.addEventListener('click', function () {
                viewMessageDetail(cell.getAttribute('data-msgid'));
            });
        });

        // Attach individual transfer buttons
        messagesTbody.querySelectorAll('.btn-transfer').forEach(function (btn) {
            btn.addEventListener('click', function () {
                pendingTransferIds = [btn.getAttribute('data-id')];
                openTransferModal(pendingTransferIds);
            });
        });

        // Attach individual delete buttons
        messagesTbody.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                pendingDeleteIds = [btn.getAttribute('data-id')];
                openDeleteModal(pendingDeleteIds);
            });
        });

        // Update pagination
        if (messages.length > PAGE_SIZE) {
            pagination.classList.remove('hidden');
            pageInfo.textContent = 'Page ' + currentPage + ' of ' + totalPages + ' (' + messages.length + ' messages)';
            prevPageBtn.disabled = currentPage <= 1;
            nextPageBtn.disabled = currentPage >= totalPages;
        } else {
            pagination.classList.add('hidden');
        }
    }

    // Pagination event listeners
    prevPageBtn.addEventListener('click', function () {
        if (currentPage > 1) {
            currentPage--;
            renderMessages(allMessages);
        }
    });

    nextPageBtn.addEventListener('click', function () {
        var totalPages = Math.ceil(allMessages.length / PAGE_SIZE);
        if (currentPage < totalPages) {
            currentPage++;
            renderMessages(allMessages);
        }
    });

    // View single message detail
    var currentEditMessageId = null;

    async function viewMessageDetail(messageId) {
        messageModal.classList.remove('hidden');
        messageDetail.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading message...</p></div>';
        currentEditMessageId = messageId;

        try {
            var url = BASE_URL + '/list-message/' + encodeURIComponent(messageId) + '?queueName=' + encodeURIComponent(connectionConfig.queueName);
            var response = await fetch(url, {
                method: 'GET',
                headers: {
                    'orgId': connectionConfig.orgId,
                    'envId': connectionConfig.envId
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load message (HTTP ' + response.status + ')');
            }

            var msgData = await response.json();
            renderEditableDetail(msgData);

        } catch (err) {
            messageDetail.innerHTML = '<div class="error">' + escapeHtml(err.message) + '</div>';
        }
    }

    function renderEditableDetail(msgData) {
        var contentType = msgData.contentType || (msgData.userProperties && msgData.userProperties.contentType) || 'application/json';
        var dataStr = formatPayloadForEdit(msgData.data, contentType);
        var propsStr = JSON.stringify(msgData.userProperties || {}, null, 2);
        var sequenceStr = msgData.sequence !== undefined ? msgData.sequence : '';

        var csvPreview = '';
        if (isCsvContentType(contentType)) {
            csvPreview = '<div class="csv-preview">' + csvToHtmlTable(msgData.data, true) + '</div>';
        }

        messageDetail.innerHTML =
            '<div class="edit-section">' +
                '<label class="edit-label">Data <span class="edit-content-type">(' + escapeHtml(contentType) + ')</span></label>' +
                csvPreview +
                '<textarea id="edit-data" class="edit-textarea" rows="8">' + escapeHtml(dataStr) + '</textarea>' +
            '</div>' +
            '<div class="edit-section">' +
                '<label class="edit-label">User Properties</label>' +
                '<textarea id="edit-props" class="edit-textarea" rows="4">' + escapeHtml(propsStr) + '</textarea>' +
            '</div>' +
            '<div class="edit-section">' +
                '<label class="edit-label">Sequence</label>' +
                '<pre class="edit-readonly">' + escapeHtml(String(sequenceStr)) + '</pre>' +
            '</div>' +
            '<div class="edit-actions">' +
                '<button type="button" id="save-message-btn" class="btn btn-primary">Save Changes</button>' +
            '</div>';

        document.getElementById('save-message-btn').addEventListener('click', function () {
            confirmAndSaveMessage();
        });

        // Sync CSV table edits to textarea
        if (isCsvContentType(contentType)) {
            var csvCells = messageDetail.querySelectorAll('.csv-cell');
            csvCells.forEach(function (cell) {
                cell.addEventListener('input', function () {
                    syncCsvTableToTextarea();
                });
            });
        }
    }

    function syncCsvTableToTextarea() {
        var table = messageDetail.querySelector('.csv-preview-table');
        if (!table) return;
        var textarea = document.getElementById('edit-data');
        if (!textarea) return;

        var headers = [];
        table.querySelectorAll('thead th').forEach(function (th) {
            headers.push(th.textContent);
        });

        var lines = [headers.join(',')];
        table.querySelectorAll('tbody tr').forEach(function (tr) {
            var row = [];
            tr.querySelectorAll('.csv-cell').forEach(function (input) {
                var val = input.value;
                // Quote values containing commas
                if (val.indexOf(',') !== -1) val = '"' + val + '"';
                row.push(val);
            });
            lines.push(row.join(','));
        });

        textarea.value = lines.join('\n');
    }

    async function confirmAndSaveMessage() {
        var dataVal = document.getElementById('edit-data').value.trim();
        var propsVal = document.getElementById('edit-props').value.trim();

        // Validate User Properties as JSON (always JSON)
        var parsedProps;
        try {
            parsedProps = JSON.parse(propsVal);
        } catch (e) {
            showToast('Invalid JSON in User Properties section. Please fix and try again.', 'error');
            return;
        }

        // Determine content type and parse data accordingly
        var contentType = parsedProps.contentType || 'application/json';
        var parsedData;
        if (isJsonContentType(contentType)) {
            try {
                parsedData = JSON.parse(dataVal);
            } catch (e) {
                showToast('Invalid JSON in Data section. Please fix and try again.', 'error');
                return;
            }
        } else {
            // CSV, XML, plain text — send as raw string
            parsedData = dataVal;
        }

        var confirmed = await showSaveConfirm();
        if (!confirmed) return;

        try {
            var payload = {
                messageId: currentEditMessageId,
                queueName: connectionConfig.queueName,
                data: parsedData,
                userProperties: parsedProps
            };

            var response = await fetch(BASE_URL + '/update-message', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'orgId': connectionConfig.orgId,
                    'envId': connectionConfig.envId
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                var errBody = await parseResponseBody(response);
                showToast('Error: ' + (errBody || 'Failed to save (HTTP ' + response.status + ')'), 'error');
                return;
            }

            showToast('Message updated successfully.', 'success');
            messageModal.classList.add('hidden');
            refreshMessageList();

        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    // Close detail modal
    closeModal.addEventListener('click', function () {
        messageModal.classList.add('hidden');
    });

    messageModal.addEventListener('click', function (e) {
        if (e.target === messageModal) {
            messageModal.classList.add('hidden');
        }
    });

    // Helpers
    function formatDate(msg) {
        var ts = msg.created || (msg.userProperties && msg.userProperties.timestamp);
        if (ts) {
            try {
                var d = new Date(typeof ts === 'number' ? ts : ts);
                if (!isNaN(d.getTime())) return d.toISOString().replace('T', ' ').substring(0, 19);
            } catch (e) {}
        }
        return '';
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str || ''));
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    function isJsonContentType(ct) {
        return ct && ct.indexOf('json') !== -1;
    }

    function isCsvContentType(ct) {
        return ct && ct.indexOf('csv') !== -1;
    }

    function formatPayloadForDisplay(data, contentType) {
        if (data == null) return '';
        if (isJsonContentType(contentType)) {
            try {
                if (typeof data === 'object') return JSON.stringify(data);
                return String(data);
            } catch (e) { return String(data); }
        }
        if (isCsvContentType(contentType) && Array.isArray(data)) {
            // Show first row summary for table column
            var headers = data.length > 0 ? Object.keys(data[0]) : [];
            return headers.join(',') + ' (' + data.length + ' rows)';
        }
        return typeof data === 'string' ? data : String(data);
    }

    function formatPayloadForEdit(data, contentType) {
        if (data == null) return '';
        if (isJsonContentType(contentType)) {
            try {
                if (typeof data === 'object') return JSON.stringify(data, null, 2);
                return JSON.stringify(JSON.parse(data), null, 2);
            } catch (e) { return typeof data === 'string' ? data : String(data); }
        }
        if (isCsvContentType(contentType)) {
            // Convert array of objects to raw CSV
            if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
                var headers = Object.keys(data[0]);
                var lines = [headers.join(',')];
                data.forEach(function (row) {
                    lines.push(headers.map(function (h) { return String(row[h] || ''); }).join(','));
                });
                return lines.join('\n');
            }
        }
        return typeof data === 'string' ? data : String(data);
    }

    function csvToHtmlTable(data, editable) {
        // Handle array of objects (parsed CSV from backend)
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
            var headers = Object.keys(data[0]);
            var html = '<table class="csv-preview-table"><thead><tr>';
            headers.forEach(function (h) { html += '<th>' + escapeHtml(h) + '</th>'; });
            html += '</tr></thead><tbody>';
            data.forEach(function (row, ri) {
                html += '<tr>';
                headers.forEach(function (h, ci) {
                    var val = row[h] || '';
                    if (editable) {
                        html += '<td><input class="csv-cell" data-row="' + ri + '" data-col="' + ci + '" value="' + escapeAttr(String(val)) + '"></td>';
                    } else {
                        html += '<td>' + escapeHtml(String(val)) + '</td>';
                    }
                });
                html += '</tr>';
            });
            html += '</tbody></table>';
            return html;
        }
        // Handle raw CSV string
        if (typeof data === 'string' && data.trim()) {
            var lines = data.trim().split('\n');
            if (lines.length < 2) return '';
            var html = '<table class="csv-preview-table"><thead><tr>';
            var hdrs = lines[0].split(',');
            hdrs.forEach(function (h) { html += '<th>' + escapeHtml(h.trim()) + '</th>'; });
            html += '</tr></thead><tbody>';
            for (var i = 1; i < lines.length; i++) {
                var cols = lines[i].split(',');
                html += '<tr>';
                cols.forEach(function (c, ci) {
                    if (editable) {
                        html += '<td><input class="csv-cell" data-row="' + (i - 1) + '" data-col="' + ci + '" value="' + escapeAttr(c.trim()) + '"></td>';
                    } else {
                        html += '<td>' + escapeHtml(c.trim()) + '</td>';
                    }
                });
                html += '</tr>';
            }
            html += '</tbody></table>';
            return html;
        }
        return '';
    }

    async function parseResponseBody(response) {
        try {
            var body = await response.json();
            if (typeof body === 'string') return body;
            return body.message || body.error || JSON.stringify(body);
        } catch (e) {
            return '';
        }
    }

    // Toast notification (replaces alert())
    var toastEl = document.getElementById('toast');
    var toastTimer = null;
    function showToast(msg, type) {
        clearTimeout(toastTimer);
        toastEl.textContent = msg;
        toastEl.className = 'toast' + (type ? ' toast-' + type : '');
        toastTimer = setTimeout(function () {
            toastEl.classList.add('hidden');
        }, 4000);
    }

    // Custom confirm modal (replaces confirm())
    var confirmModalEl = document.getElementById('confirm-modal');
    var confirmModalTitle = document.getElementById('confirm-modal-title');
    var confirmModalMessage = document.getElementById('confirm-modal-message');
    var confirmModalCancel = document.getElementById('confirm-modal-cancel');
    var confirmModalOk = document.getElementById('confirm-modal-ok');
    var closeConfirmModal = document.getElementById('close-confirm-modal');
    var confirmResolve = null;

    function showConfirm(title, message) {
        return new Promise(function (resolve) {
            confirmResolve = resolve;
            confirmModalTitle.textContent = title;
            confirmModalMessage.textContent = message;
            confirmModalEl.classList.remove('hidden');
        });
    }

    confirmModalOk.addEventListener('click', function () {
        confirmModalEl.classList.add('hidden');
        if (confirmResolve) confirmResolve(true);
    });
    confirmModalCancel.addEventListener('click', function () {
        confirmModalEl.classList.add('hidden');
        if (confirmResolve) confirmResolve(false);
    });
    closeConfirmModal.addEventListener('click', function () {
        confirmModalEl.classList.add('hidden');
        if (confirmResolve) confirmResolve(false);
    });

    // Save confirmation modal
    var saveModalEl = document.getElementById('save-modal');
    var saveConfirmInput = document.getElementById('saveConfirmInput');
    var submitSaveBtn = document.getElementById('submit-save-btn');
    var cancelSaveBtn = document.getElementById('cancel-save-btn');
    var closeSaveModal = document.getElementById('close-save-modal');
    var saveResolve = null;

    saveConfirmInput.addEventListener('input', function () {
        submitSaveBtn.disabled = saveConfirmInput.value.trim() !== 'SAVE';
    });

    function showSaveConfirm() {
        return new Promise(function (resolve) {
            saveResolve = resolve;
            saveConfirmInput.value = '';
            submitSaveBtn.disabled = true;
            saveModalEl.classList.remove('hidden');
            saveConfirmInput.focus();
        });
    }

    submitSaveBtn.addEventListener('click', function () {
        if (saveConfirmInput.value.trim() !== 'SAVE') return;
        saveModalEl.classList.add('hidden');
        if (saveResolve) saveResolve(true);
    });
    cancelSaveBtn.addEventListener('click', function () {
        saveModalEl.classList.add('hidden');
        if (saveResolve) saveResolve(false);
    });
    closeSaveModal.addEventListener('click', function () {
        saveModalEl.classList.add('hidden');
        if (saveResolve) saveResolve(false);
    });
})();
