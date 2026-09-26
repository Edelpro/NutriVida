#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'
$serviceName = 'MSSQLSERVER'
$service = Get-Service -Name $serviceName -ErrorAction Stop

Set-Service -Name $serviceName -StartupType Automatic
& sc.exe failure $serviceName reset= 86400 actions= restart/5000/restart/15000/restart/30000 | Out-Null
& sc.exe failureflag $serviceName 1 | Out-Null

if ($service.Status -ne 'Running') {
    Start-Service -Name $serviceName
}

Get-Service -Name $serviceName | Select-Object Name, Status, StartType
