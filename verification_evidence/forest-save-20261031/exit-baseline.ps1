$ErrorActionPreference='Stop'
$root=Split-Path -Parent $MyInvocation.MyCommand.Path
$node=(Get-Command node.exe).Source
foreach($code in @(0,7)) {
 $p=Start-Process $node -ArgumentList '-e',"setTimeout(()=>process.exit($code),100)" -RedirectStandardOutput "$root/exit-$code.stdout.log" -RedirectStandardError "$root/exit-$code.stderr.log" -WindowStyle Hidden -PassThru
 while(!$p.HasExited){Start-Sleep -Milliseconds 20}
 $p.WaitForExit()
 [pscustomobject]@{Expected=$code;Actual=$p.ExitCode;HasExited=$p.HasExited}|ConvertTo-Json -Compress
}
