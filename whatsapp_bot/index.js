const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');

const app = express();

app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        return res.status(200).json({});
    }
    next();
});

const sentMessagesStore = {};
const sessions = {};

function sanitizeSessionId(rawId) {
    const clean = String(rawId || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    return clean || 'default';
}

function getAuthDir(sessionId) {
    return sessionId === 'default' ? 'auth_info_baileys' : `auth_info_baileys_${sessionId}`;
}

async function connectToWhatsApp(rawSessionId = 'default') {
    const sessionId = sanitizeSessionId(rawSessionId);
    const authDir = getAuthDir(sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    if (!sessions[sessionId]) {
        sessions[sessionId] = { sock: null, currentQR: null, isConnected: false, starting: false };
    }
    sessions[sessionId].starting = true;

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: sessionId === 'default',
        markOnlineOnConnect: true,
        syncFullHistory: false,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        },
        getMessage: async (key) => {
            const jid = key.remoteJid;
            if (sentMessagesStore[jid]) {
                const found = sentMessagesStore[jid].find(m => m.key.id === key.id);
                if (found) return found.message;
            }
            return undefined;
        }
    });

    sessions[sessionId].sock = sock;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            sessions[sessionId].currentQR = await QRCode.toDataURL(qr);
            sessions[sessionId].isConnected = false;
            sessions[sessionId].starting = false;
            console.log(`[${sessionId}] Novo QR Code gerado.`);
        }

        if (connection === 'close') {
            sessions[sessionId].isConnected = false;
            sessions[sessionId].starting = false;
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (!shouldReconnect) {
                try { fs.rmSync(authDir, { recursive: true, force: true }); } catch (e) { }
                if (sessionId === 'default') {
                    setTimeout(() => connectToWhatsApp(sessionId), 2000);
                }
            } else {
                setTimeout(() => connectToWhatsApp(sessionId), 2000);
            }
        } else if (connection === 'open') {
            console.log(`[${sessionId}] Conectado ao WhatsApp com sucesso!`);
            sessions[sessionId].isConnected = true;
            sessions[sessionId].currentQR = null;
            sessions[sessionId].starting = false;
        }
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (type !== 'append' && type !== 'notify') return;
        for (const m of messages) {
            if (!m.message) continue;
            const jid = m.key.remoteJid;
            if (!sentMessagesStore[jid]) sentMessagesStore[jid] = [];
            sentMessagesStore[jid].push(m);
            if (sentMessagesStore[jid].length > 50) sentMessagesStore[jid].shift();

            if (type === 'notify' && !m.key.fromMe && jid && !jid.endsWith('@g.us') && !jid.endsWith('@broadcast')) {
                const incomingText =
                    m.message.conversation ||
                    (m.message.extendedTextMessage && m.message.extendedTextMessage.text) ||
                    (m.message.imageMessage && m.message.imageMessage.caption) ||
                    (m.message.documentMessage && m.message.documentMessage.caption) ||
                    '';
                const senderPushName = (m.pushName || '').trim() || undefined;
                if (incomingText && !incomingText.startsWith('*')) {
                    const phoneDigits = jid.split('@')[0].replace(/\D/g, '');
                    const webhookUrl = process.env.INHO_API_WEBHOOK_URL || 'http://inho_backend:8000/api/v1/crm/whatsapp/webhook-inbound';
                    const bizId = sessionId.startsWith('tenant_') ? sessionId.replace(/^tenant_/, '') : undefined;
                    const bodyStr = JSON.stringify({
                        phone: phoneDigits,
                        incoming_message: incomingText,
                        business_id: bizId,
                        session_id: sessionId,
                        push_name: senderPushName,
                    });
                    const headers = { 'Content-Type': 'application/json' };
                    if (process.env.WHATSAPP_WEBHOOK_SECRET) {
                        const crypto = require('crypto');
                        headers['X-Orbe-Signature'] = 'sha256=' + crypto.createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET).update(bodyStr).digest('hex');
                    }
                    fetch(webhookUrl, { method: 'POST', headers, body: bodyStr }).catch(() => {});
                }
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp('default');

app.get('/sessions/:sessionId/qr', async (req, res) => {
    const sessionId = sanitizeSessionId(req.params.sessionId);
    if (!sessions[sessionId] || (!sessions[sessionId].isConnected && !sessions[sessionId].currentQR && !sessions[sessionId].starting)) {
        connectToWhatsApp(sessionId).catch(() => {});
        await new Promise(r => setTimeout(r, 1200));
    }
    const s = sessions[sessionId] || { isConnected: false, currentQR: null };
    return res.json({
        session_id: sessionId,
        connected: Boolean(s.isConnected),
        qr_data_url: s.currentQR || null,
        status: s.isConnected ? 'CONNECTED' : (s.currentQR ? 'QR_READY' : 'INITIALIZING'),
    });
});

app.post('/sessions/:sessionId/disconnect', async (req, res) => {
    const sessionId = sanitizeSessionId(req.params.sessionId);
    const s = sessions[sessionId];
    if (s && s.sock) {
        try { await s.sock.logout(); } catch (_) {}
    }
    try { fs.rmSync(getAuthDir(sessionId), { recursive: true, force: true }); } catch (_) {}
    delete sessions[sessionId];
    return res.json({ session_id: sessionId, connected: false, status: 'DISCONNECTED' });
});

app.get('/qr', (req, res) => {
    const sessionId = sanitizeSessionId(req.query.session_id || 'default');
    const s = sessions[sessionId] || sessions['default'] || {};
    if (req.query.format === 'json') {
        return res.json({
            session_id: sessionId,
            connected: Boolean(s.isConnected),
            qr_data_url: s.currentQR || null,
        });
    }
    if (s.isConnected) return res.send("<h2>Bot Já Conectado e Operacional! 🚀</h2>");
    if (s.currentQR) return res.send(`
        <div style="font-family: monospace; background: #000; color: #4ade80; padding: 20px; height: 100vh;">
            <h2>Escaneie o QR Code com o WhatsApp (${sessionId})</h2>
            <img src="${s.currentQR}" alt="QR Code" style="width: 300px; height: 300px; border-radius: 10px; border: 2px solid #581c87; margin-top: 10px;" />
            <p>Seus avisos de cobrança passarão a ser disparados magicamente a custo R$ 0,00.</p>
        </div>
    `);
    res.send("<h2 style='font-family: monospace;'>Aguardando conexão com servidor Baileys... Pressione F5 em 5 segundos.</h2>");
});

app.post('/send', async (req, res) => {
    const cleanBiz = req.body.business_id ? String(req.body.business_id).replace(/-/g, '').slice(0, 16) : null;
    const reqSession = sanitizeSessionId(req.body.session_id || (cleanBiz ? `tenant_${cleanBiz}` : 'default'));
    const activeSession = (sessions[reqSession] && sessions[reqSession].isConnected)
        ? sessions[reqSession]
        : sessions['default'];

    if (!activeSession || !activeSession.isConnected) {
        return res.status(500).json({ error: "Bot offline. Escaneie o QR Code na Central OrBrick." });
    }
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: "Parâmetros 'phone' e 'message' são obrigatórios" });

    try {
        let digits = phone.replace(/\D/g, '');
        if (digits.length === 10 || digits.length === 11) {
            digits = '55' + digits;
        }
        const candidates = [digits];
        if (digits.length === 13 && digits.startsWith('55')) {
            candidates.push(digits.slice(0, 4) + digits.slice(5));
        } else if (digits.length === 12 && digits.startsWith('55')) {
            candidates.push(digits.slice(0, 4) + '9' + digits.slice(4));
        }

        let resolvedJid = null;
        for (const candidate of candidates) {
            try {
                const [result] = await activeSession.sock.onWhatsApp(`${candidate}@s.whatsapp.net`);
                if (result && result.exists) {
                    resolvedJid = result.jid;
                    break;
                }
            } catch (_) { }
        }
        if (!resolvedJid) {
            resolvedJid = `${candidates[0]}@s.whatsapp.net`;
        }

        const sentMsg = await activeSession.sock.sendMessage(resolvedJid, { text: message });
        if (sentMsg) {
            if (!sentMessagesStore[resolvedJid]) sentMessagesStore[resolvedJid] = [];
            sentMessagesStore[resolvedJid].push(sentMsg);
            if (sentMessagesStore[resolvedJid].length > 50) sentMessagesStore[resolvedJid].shift();
        }
        res.json({ success: true, delivered: true, recipient: resolvedJid, session_id: reqSession });
    } catch (e) {
        console.error('Erro de envio:', e);
        res.status(500).json({ error: e.toString() });
    }
});

app.listen(3001, () => {
    console.log('Orbe Inho Multi-Tenant WhatsApp Bot rodando na porta 3001');
});
