const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

let currentQR = null;
let isConnected = false;
let sock = null;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
    });

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

        await sock.sendMessage(resolvedJid, { text: message });
        res.json({ success: true, delivered: true, recipient: resolvedJid });
    } catch (e) {
        console.error('Erro de envio:', e);
        res.status(500).json({ error: e.toString() });
    }
});

app.listen(3001, () => {
    console.log('Orbe Inho WhatsApp Bot rodando na porta 3001');
});
