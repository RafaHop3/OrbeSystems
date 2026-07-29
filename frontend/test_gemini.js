const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AQ.Ab8RN6IT9lempUuAfdJef-1BwnGUw7gupnSkGW5h7PkGdoU3ueGx6dDU';
fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        system_instruction: { parts: [{ text: 'context' }] },
        contents: [{ role: 'user', parts: [{ text: 'oi' }] }]
    })
}).then(async r => {
    console.log(r.status);
    console.log(await r.text());
});
