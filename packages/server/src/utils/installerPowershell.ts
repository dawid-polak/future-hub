export function buildPowershellInstaller(apiBase: string, companyName: string): string {
  return `# Future Hub installer (Windows / PowerShell)
# Usage: iwr -useb ${apiBase}/api/installer/install.ps1 | iex
$ErrorActionPreference = "Stop"

$ApiBase     = "${apiBase}"
$CompanyName = "${companyName}"

function Ok($m)   { Write-Host "[OK]   $m" -ForegroundColor Green }
function Info($m) { Write-Host "[..]   $m" -ForegroundColor Cyan }
function Err($m)  { Write-Host "[ERR]  $m" -ForegroundColor Red }

Write-Host ""
Info "Future Hub installer - $CompanyName"
Write-Host ""

$Email = Read-Host "Email"
$Pass  = Read-Host "Haslo" -AsSecureString
$PassPlain = [System.Net.NetworkCredential]::new("", $Pass).Password

try {
  $loginRes = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/auth/login" \`
    -ContentType "application/json" \`
    -Body (@{ email = $Email; password = $PassPlain } | ConvertTo-Json)
} catch {
  Err "Logowanie nieudane. Sprawdz email/haslo."
  exit 1
}

$Refresh   = $loginRes.refreshToken
$UserName  = $loginRes.user.name
Ok "Zalogowano jako $UserName"

$Workdir   = Join-Path $HOME $CompanyName
$SkillsDir = Join-Path $Workdir "skills"
$DocsDir   = Join-Path $Workdir "docs"
$CfgDir    = Join-Path $env:APPDATA "future-hub"
$BinDir    = Join-Path $env:LOCALAPPDATA "Programs\\future-hub"
$FhBin     = Join-Path $BinDir "fh.ps1"

New-Item -ItemType Directory -Force -Path $SkillsDir,$DocsDir,$CfgDir,$BinDir | Out-Null

$cfg = @{
  apiBase      = $ApiBase
  companyName  = $CompanyName
  workdir      = $Workdir
  refreshToken = $Refresh
} | ConvertTo-Json
Set-Content -Path (Join-Path $CfgDir "config.json") -Value $cfg -Encoding UTF8
Ok "Konfiguracja zapisana w $CfgDir\\config.json"

# CLI fh.ps1
$fhScript = @'
$ErrorActionPreference = "Stop"
$cfgPath = Join-Path $env:APPDATA "future-hub\\config.json"
if (-not (Test-Path $cfgPath)) { Write-Host "Brak konfiguracji."; exit 1 }
$cfg = Get-Content $cfgPath | ConvertFrom-Json
$Api      = $cfg.apiBase
$Company  = $cfg.companyName
$Refresh  = $cfg.refreshToken
$Workdir  = $cfg.workdir
$Skills   = Join-Path $Workdir "skills"

$cmd = if ($args.Count -gt 0) { $args[0] } else { "sync" }

function Get-Access {
  try {
    $r = Invoke-RestMethod -Method Post -Uri "$Api/api/auth/refresh" \`
      -ContentType "application/json" \`
      -Body (@{ refreshToken = $Refresh } | ConvertTo-Json)
    return $r.accessToken
  } catch { return $null }
}

switch ($cmd) {
  "sync" {
    $tok = Get-Access
    if (-not $tok) {
      Write-Host "Token wygasl/dostep cofniety. Czyszcze katalog."
      Get-ChildItem $Skills -Filter *.md -ErrorAction SilentlyContinue | Remove-Item
      exit 1
    }
    try {
      Invoke-WebRequest -UseBasicParsing -Uri "$Api/api/installer/onboarding.md" -OutFile (Join-Path $Workdir "README.md") | Out-Null
    } catch {}
    $data = Invoke-RestMethod -Uri "$Api/api/installer/skills/me" -Headers @{ Authorization = "Bearer $tok" }
    if (-not $data) { $data = @() }
    $current = @($data | ForEach-Object { $_.slug })
    if (Test-Path $Skills) {
      Get-ChildItem $Skills -Filter *.md | ForEach-Object {
        $slug = [System.IO.Path]::GetFileNameWithoutExtension($_.Name)
        if ($current -notcontains $slug) {
          Remove-Item $_.FullName
          Write-Host "  - usuniety: $slug"
        }
      }
    } else {
      New-Item -ItemType Directory -Force -Path $Skills | Out-Null
    }
    foreach ($s in $data) {
      $path = Join-Path $Skills "$($s.slug).md"
      Set-Content -Path $path -Value $s.markdown -Encoding UTF8 -NoNewline
      Write-Host "  + $($s.slug)"
    }
    Write-Host "Sync OK ($($data.Count) skili)"
  }
  "status" {
    Write-Host "API:        $Api"
    Write-Host "Firma:      $Company"
    Write-Host "Workdir:    $Workdir"
    $count = (Get-ChildItem $Skills -Filter *.md -ErrorAction SilentlyContinue).Count
    Write-Host "Skille:     $count"
  }
  "logout" {
    Remove-Item -Recurse -Force $Workdir, (Join-Path $env:APPDATA "future-hub") -ErrorAction SilentlyContinue
    Write-Host "Wyczyszczono."
  }
  default {
    Write-Host "Uzycie: fh {sync|status|logout}"
  }
}
'@
Set-Content -Path $FhBin -Value $fhScript -Encoding UTF8
Ok "CLI 'fh' zainstalowane: $FhBin"

# Dodaj do PATH (user-level)
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -notlike "*$BinDir*") {
  [Environment]::SetEnvironmentVariable("PATH", "$userPath;$BinDir", "User")
  $env:PATH += ";$BinDir"
  Ok "Dodano $BinDir do PATH (zrestartuj terminal)"
}

# Pobierz README.md (instrukcja dla agenta)
try {
  Invoke-WebRequest -UseBasicParsing -Uri "$ApiBase/api/installer/onboarding.md" -OutFile (Join-Path $Workdir "README.md") | Out-Null
  Ok "Instrukcja dla agenta AI: $(Join-Path $Workdir 'README.md')"
} catch {
  Info "Nie udalo sie pobrac README.md (pobrane przy nastepnym sync)."
}

# Pierwsza synchronizacja
Info "Pobieram skille..."
& powershell -ExecutionPolicy Bypass -File $FhBin sync

# Auto-sync (Scheduled Task co 10 min)
$taskName = "FutureHubSync"
schtasks /Delete /TN $taskName /F 2>$null | Out-Null
$action = "powershell.exe -ExecutionPolicy Bypass -File \\"$FhBin\\" sync"
schtasks /Create /TN $taskName /TR $action /SC MINUTE /MO 10 /F | Out-Null
Ok "Auto-sync (Scheduled Task) wlaczony - co 10 min"

Write-Host ""
Ok "Gotowe!"
Write-Host "  Katalog:    $Workdir"
Write-Host "  Skille:     $SkillsDir"
Write-Host "  Polecenia:  fh sync | fh status | fh logout"
Write-Host ""
`;
}
