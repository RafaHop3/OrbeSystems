const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');

const app = express();
app.use(express.json());

// CUSTOM IN-MEMORY STORE TO HANDLE MESSAGE RETRIES (Fixes "Aguardando mensagem")
const sentMessagesStore = {};

let currentQR = null;
let isConnected = false;
let sock = null;

// Persistent store logic removed. Operating exclusively on volatile memory scaling (LRU Cache).

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
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
            console.log("Recebida solicitação de reenvio E2E/Retry para MSG_ID:", key.id, "JID:", jid);

            if (sentMessagesStore[jid]) {
                const found = sentMessagesStore[jid].find(m => m.key.id === key.id);
                if (found) {
                    console.log("Mensagem encontrada no cache LRU em memória! Retornando payload E2E intacto.");
                    return found.message;
                }
            }

            // O store persistente foi removido; confiamos no sentMessagesStore.

            console.log("Falha no Cache (Mensagem não encontrada). Deixando undefined para que o dispositivo principal (celular) responda...");
            return undefined;
        }
    });

    // store.bind(sock.ev); removed

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            currentQR = await QRCode.toDataURL(qr);
            isConnected = false;
            console.log('Novo QR Code gerado.');
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada. Reconectar:', shouldReconnect);
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('Conectado ao WhatsApp com sucesso!');
            isConnected = true;
            currentQR = null;
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
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();

app.get('/qr', (req, res) => {
    if (isConnected) return res.send("<h2>Bot Já Conectado e Operacional! 🚀</h2>");
    if (currentQR) return res.send(`
        <div style="font-family: monospace; background: #000; color: #4ade80; padding: 20px; height: 100vh;">
            <h2>Escaneie o QR Code com o WhatsApp da Orbe Inho</h2>
            <img src="${currentQR}" alt="QR Code" style="width: 300px; height: 300px; border-radius: 10px; border: 2px solid #581c87; margin-top: 10px;" />
            <p>Seus avisos de cobrança passarão a ser disparados magicamente a custo R$ 0,00.</p>
        </div>
    `);
    res.send("<h2 style='font-family: monospace;'>Aguardando conexão com servidor Baileys... Pressione F5 em 5 segundos.</h2>");
});

app.post('/send', async (req, res) => {
    if (!isConnected) return res.status(500).json({ error: "Bot offline. Escaneie o QR Code na rota /qr" });
    const { phone, message } = req.body;

    if (!phone || !message) return res.status(400).json({ error: "Parâmetros 'phone' e 'message' são obrigatórios" });

    try {
        let digits = phone.replace(/\D/g, '');

        // Add Brazil country code if missing
        if (digits.length === 10 || digits.length === 11) {
            digits = '55' + digits;
        }

        // Build candidate numbers: with and without the 9th digit (Brazilian mobile quirk)
        const candidates = [digits];
        if (digits.length === 13 && digits.startsWith('55')) {
            // Remove the 9th digit: 55 + DDD(2) + 9 + number(8) → 55 + DDD(2) + number(8)
            const sem9 = digits.slice(0, 4) + digits.slice(5);
            candidates.push(sem9);
        } else if (digits.length === 12 && digits.startsWith('55')) {
            // Add the 9th digit variant
            const com9 = digits.slice(0, 4) + '9' + digits.slice(4);
            candidates.push(com9);
        }

        // Use onWhatsApp to determine which JID is actually registered
        let resolvedJid = null;
        for (const candidate of candidates) {
            try {
                const [result] = await sock.onWhatsApp(`${candidate}@s.whatsapp.net`);
                if (result && result.exists) {
                    resolvedJid = result.jid;
                    console.log(`JID resolvido: ${resolvedJid}`);
                    break;
                }
            } catch (_) { }
        }

        // Fallback to first candidate if onWhatsApp lookup fails
        if (!resolvedJid) {
            resolvedJid = `${candidates[0]}@s.whatsapp.net`;
            console.log(`Fallback JID: ${resolvedJid}`);
        }

        const sentMsg = await sock.sendMessage(resolvedJid, { text: message });

        // Store in LRU cache so E2E retry/decryption requests return the real message
        if (sentMsg) {
            if (!sentMessagesStore[resolvedJid]) sentMessagesStore[resolvedJid] = [];
            sentMessagesStore[resolvedJid].push(sentMsg);
            if (sentMessagesStore[resolvedJid].length > 50) sentMessagesStore[resolvedJid].shift();
            console.log(`Mensagem armazenada no cache LRU para JID: ${resolvedJid}`);
        }

        res.json({ success: true, delivered: true, recipient: resolvedJid });
    } catch (e) {
        console.error('Erro de envio:', e);
        res.status(500).json({ error: e.toString() });
    }
});

app.listen(3001, () => {
    console.log('Orbe Inho WhatsApp Bot rodando na porta 3001');
});
