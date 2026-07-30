<#
.SYNOPSIS
  Pre-publication security checker for AI-generated HTML presentations.
  Complements Endor Labs by catching what SAST/secret scanners miss.
.DESCRIPTION
  Runs 9 checks mapped to Amit Tannenbaum's checklist for AI-generated HTML.
.PARAMETER Path
  Directory or file to scan. Defaults to repository root.
.PARAMETER FailOnWarning
  Exit with non-zero code on any finding (for CI/pre-commit use).
.PARAMETER CheckOnly
  Report findings without suggesting fixes.
.EXAMPLE
  .\tools\pre-publish-check.ps1
  .\tools\pre-publish-check.ps1 -Path .\new-presentation\index.html
  .\tools\pre-publish-check.ps1 -FailOnWarning
#>
[CmdletBinding()]
param(
    [string]$Path = ".",
    [switch]$FailOnWarning,
    [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# --- Locate ripgrep ---
$rg = (Get-Command rg -ErrorAction SilentlyContinue).Source
if (-not $rg -or -not (Test-Path $rg)) {
    $candidates = @(
        "$env:LOCALAPPDATA\embedder\rg.exe",
        "$env:USERPROFILE\AppData\Local\embedder\rg.exe",
        "C:\Program Files\Git\usr\bin\rg.exe"
    )
    foreach ($c in $candidates) { if (Test-Path $c) { $rg = $c; break } }
}
if (-not $rg -or -not (Test-Path $rg)) {
    Write-Host "ERROR: ripgrep (rg) not found." -ForegroundColor Red
    exit 3
}

# --- Collect HTML files ---
if (Test-Path $Path -PathType Leaf) {
    $htmlFiles = @((Get-Item $Path).FullName)
} else {
    $htmlFiles = Get-ChildItem -Path $Path -Recurse -Filter *.html |
        Where-Object { $_.FullName -notmatch "\\.git\\|\\node_modules\\" } |
        Select-Object -ExpandProperty FullName
}

if ($htmlFiles.Count -eq 0) {
    Write-Host "No HTML files found in $Path"
    exit 0
}

# --- Counters ---
$script:Findings = [System.Collections.Generic.List[pscustomobject]]::new()
$script:Errors   = 0
$script:Warnings = 0
$script:Info     = 0

function Add-Finding {
    param([string]$Id, [string]$Severity, [string]$Title, [string]$File, [int]$Line, [string]$Detail)
    $script:Findings.Add([pscustomobject]@{
        Id = $Id; Severity = $Severity; Title = $Title
        File = $File; Line = $Line; Detail = $Detail
    })
    switch ($Severity) {
        "ERROR"   { $script:Errors++ }
        "WARNING" { $script:Warnings++ }
        "INFO"    { $script:Info++ }
    }
}

function Invoke-Rg {
    param([string]$Pattern, [string[]]$Paths)
    $errPref = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $result = & $rg --no-heading --line-number --with-filename --color never -i $Pattern $Paths 2>&1 |
        Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }
    $ErrorActionPreference = $errPref
    return $result
}

function Parse-RgLine {
    param([string]$Line)
    if ($Line -match "^(.+):(\d+):(.*)$") {
        $file = $matches[1]
        $ln = 0
        [int]::TryParse($matches[2], [ref]$ln) | Out-Null
        return @{ File = $file; Line = $ln; Content = $matches[3] }
    }
    return $null
}

Write-Host ""
Write-Host "=== Pre-Publication Security Check ===" -ForegroundColor Cyan
Write-Host "Target: $Path"
Write-Host "Files:  $($htmlFiles.Count) HTML file(s)"
Write-Host "Tool:   $rg"
Write-Host ""

# CHECK 1: Plaintext password in comments
Write-Host "[1/9] Secrets in comments... " -NoNewline
$q = [char]39
$pattern1 = "HASH\s*=\s*\x27[a-f0-9]{32,}\x27.*//\s*\S+"
$results = Invoke-Rg -Pattern $pattern1 -Paths $htmlFiles
if ($results) {
    foreach ($r in $results) {
        $parsed = Parse-RgLine $r
        if ($parsed) {
            Add-Finding "SEC-01" "ERROR" "Plaintext password in comment" $parsed.File $parsed.Line $parsed.Content.Trim()
        }
    }
}
Write-Host "done" -ForegroundColor Green

# CHECK 2: Hardcoded password comparisons in JavaScript
Write-Host "[2/9] Hardcoded password comparisons... " -NoNewline
$q = [char]39
$dq = [char]34
$pattern2 = "(?i)(pwd|password|pass|pw)\.value\s*(===?|==)\s*[\x22\x27][^\x22\x27]{2,30}[\x22\x27]|if\s*\(\s*(p|pwd|password)\s*(===?|==)\s*[\x22\x27][^\x22\x27]{2,30}[\x22\x27]"
$results = Invoke-Rg -Pattern $pattern2 -Paths $htmlFiles
if ($results) {
    foreach ($r in $results) {
        $parsed = Parse-RgLine $r
        if ($parsed) {
            Add-Finding "SEC-02" "ERROR" "Hardcoded password comparison" $parsed.File $parsed.Line $parsed.Content.Trim()
        }
    }
}
Write-Host "done" -ForegroundColor Green

# CHECK 3: Tracking and outbound network calls
Write-Host "[3/9] Tracking and outbound network calls... " -NoNewline
$pattern3 = "fetch\s*\(\s*[\x22\x27]https?://|sendBeacon\s*\(|new\s+Image\(\)\.src\s*="
$results = Invoke-Rg -Pattern $pattern3 -Paths $htmlFiles
if ($results) {
    foreach ($r in $results) {
        $parsed = Parse-RgLine $r
        if ($parsed) {
            $text = $parsed.Content
            if ($text -match "^\s*<span|^\s*<code|class=.t.|class=.ln.") { continue }
            if ($text -match "&lt;|&gt;|&amp;") { continue }
            # Exclude known-safe domains (eswlab, github, zuwasi, localhost)
            if ($text -match "localhost|127\.0\.0\.1|eswlab\.com|github\.com/zuwasi|zuwasi\.github\.io") { continue }
            Add-Finding "SEC-03" "WARNING" "Outbound network call" $parsed.File $parsed.Line $text.Trim()
        }
    }
}
Write-Host "done" -ForegroundColor Green

# CHECK 4: External scripts without SRI
Write-Host "[4/9] External scripts without SRI... " -NoNewline
$lt = [char]60
$pattern4 = "\x3cscript\s+src=\x22https?://[^\x22]*\x22"
$results = Invoke-Rg -Pattern $pattern4 -Paths $htmlFiles
if ($results) {
    foreach ($r in $results) {
        $parsed = Parse-RgLine $r
        if ($parsed -and $parsed.Content -notmatch "integrity=") {
            Add-Finding "SEC-04" "WARNING" "External script without SRI" $parsed.File $parsed.Line $parsed.Content.Trim()
        }
    }
}
Write-Host "done" -ForegroundColor Green

# CHECK 5: Missing CSP
Write-Host "[5/9] Missing Content-Security-Policy... " -NoNewline
foreach ($f in $htmlFiles) {
    $content = Get-Content $f -Raw -ErrorAction SilentlyContinue
    if ($content -and $content -notmatch "(?i)Content-Security-Policy") {
        Add-Finding "SEC-05" "INFO" "Missing CSP" $f 0 "No Content-Security-Policy meta tag found"
    }
}
Write-Host "done" -ForegroundColor Green

# CHECK 6: YouTube embeds without nocookie
Write-Host "[6/9] YouTube embeds without privacy mode... " -NoNewline
$pattern6 = "youtube\.com/embed/"
$results = Invoke-Rg -Pattern $pattern6 -Paths $htmlFiles
if ($results) {
    foreach ($r in $results) {
        $parsed = Parse-RgLine $r
        if ($parsed) {
            if ($parsed.Content -match "youtube-nocookie") { continue }
            Add-Finding "SEC-06" "WARNING" "YouTube embed without nocookie" $parsed.File $parsed.Line $parsed.Content.Trim()
        }
    }
}
Write-Host "done" -ForegroundColor Green

# CHECK 7: AI prompt leakage
Write-Host "[7/9] AI prompt leakage check... " -NoNewline
$lt = [char]60
$pattern7 = "(?s)\x3c!--\s*(You are an AI|You are a senior|You are an expert|Your task is|Your mission is|Follow these instructions|IMPORTANT:.*Run this|system_prompt\s*=)"
$results = Invoke-Rg -Pattern $pattern7 -Paths $htmlFiles
$promptAboutFiles = @(
    "Claude_HalfLife_Test","baboons-face-off","Avraham_Gilo_Lemma1",
    "NotebookComparison_Presentation","why-amp-doesnt-need-node9-proxy",
    "biosense-heartgcn-demo","amp-lost-in-the-middle","claude-code-skills-vs-amp",
    "harness-story","terratest-ampcode-esl","hiring-agent"
)
if ($results) {
    foreach ($r in $results) {
        $parsed = Parse-RgLine $r
        if ($parsed) {
            $fname = [System.IO.Path]::GetFileName($parsed.File)
            $isAbout = $false
            foreach ($p in $promptAboutFiles) { if ($fname -like "*$p*") { $isAbout = $true; break } }
            if (-not $isAbout) {
                $preview = $parsed.Content.Trim()
                if ($preview.Length -gt 120) { $preview = $preview.Substring(0, 120) }
                Add-Finding "SEC-07" "WARNING" "Possible AI prompt leakage" $parsed.File $parsed.Line $preview
            }
        }
    }
}
Write-Host "done" -ForegroundColor Green

# CHECK 8: Unsafe target=_blank without rel=noopener
Write-Host "[8/9] Unsafe target=_blank links... " -NoNewline
$pattern8 = "target=[\x22\x27]?_blank"
$results = Invoke-Rg -Pattern $pattern8 -Paths $htmlFiles
if ($results) {
    foreach ($r in $results) {
        $parsed = Parse-RgLine $r
        if ($parsed -and $parsed.Content -notmatch "noopener") {
            $preview = $parsed.Content.Trim()
            if ($preview.Length -gt 100) { $preview = $preview.Substring(0, 100) }
            Add-Finding "SEC-08" "INFO" "target=_blank without rel=noopener" $parsed.File $parsed.Line $preview
        }
    }
}
Write-Host "done" -ForegroundColor Green

# CHECK 9: Unversioned CDN scripts
Write-Host "[9/9] Unversioned CDN scripts... " -NoNewline
$lt = [char]60
$pattern9 = "\x3cscript\s+src=\x22https?://cdn\.(jsdelivr|cloudflare|unpkg)[^\x22]*/(npm|package)/[^@\x22\s]+\x22"
$results = Invoke-Rg -Pattern $pattern9 -Paths $htmlFiles
if ($results) {
    foreach ($r in $results) {
        $parsed = Parse-RgLine $r
        if ($parsed -and $parsed.Content -notmatch "@\d+\.\d+") {
            Add-Finding "SEC-09" "WARNING" "Unversioned CDN script" $parsed.File $parsed.Line $parsed.Content.Trim()
        }
    }
}
Write-Host "done" -ForegroundColor Green

# === REPORT ===
Write-Host ""
Write-Host "=== Results ===" -ForegroundColor Cyan
Write-Host "  Errors:   $script:Errors"
Write-Host "  Warnings: $script:Warnings"
Write-Host "  Info:     $script:Info"
Write-Host ""

if ($script:Findings.Count -eq 0) {
    Write-Host ""
    Write-Host "[PASS] No security issues found. All 9 checks passed." -ForegroundColor Green
    exit 0
}

$orderedSeverities = @("ERROR", "WARNING", "INFO")
foreach ($sev in $orderedSeverities) {
    $items = $script:Findings | Where-Object { $_.Severity -eq $sev }
    if ($items.Count -eq 0) { continue }
    $color = switch ($sev) { "ERROR" { "Red" } "WARNING" { "Yellow" } "INFO" { "DarkGray" } }
    Write-Host ""
    Write-Host "--- $sev ($($items.Count)) ---" -ForegroundColor $color
    foreach ($f in $items) {
        $relFile = $f.File
        if ($relFile -match "\\Public-html-pages\\(.+)$") { $relFile = $matches[1] }
        Write-Host "  [$($f.Id)] $($f.Title)" -ForegroundColor $color
        Write-Host "       File: $($relFile): $($f.Line)" -ForegroundColor DarkGray
        if ($f.Detail -and $f.Detail.Length -gt 0) {
            $preview = $f.Detail
            if ($preview.Length -gt 150) { $preview = $preview.Substring(0, 150) }
            Write-Host "       Code: $preview" -ForegroundColor DarkGray
        }
        if (-not $CheckOnly) {
            $fixes = @{
                "SEC-01" = "Remove the plaintext password from the comment. Remove the password overlay if content is public."
                "SEC-02" = "Remove the hardcoded password. Use server-side auth or remove the gate if content is public."
                "SEC-03" = "Verify this outbound call is intentional. If tracking, add a privacy disclosure. If not needed, remove it."
                "SEC-04" = "Add integrity and crossorigin attributes to the script tag. Pin an exact version."
                "SEC-05" = "Add a Content-Security-Policy meta tag with restrictive directives."
                "SEC-06" = "Replace youtube.com/embed/ with youtube-nocookie.com/embed/. Add referrerpolicy."
                "SEC-07" = "Review this content. If it is a leaked AI prompt, remove it. If intentional, add a comment marker."
                "SEC-08" = "Add rel=noopener noreferrer to the target=_blank link."
                "SEC-09" = "Pin an exact version (e.g. chart.js@4.4.1) and add SRI integrity attribute."
            }
            if ($fixes[$f.Id]) {
                Write-Host "       Fix:  $($fixes[$f.Id])" -ForegroundColor DarkGreen
            }
        }
        Write-Host ""
    }
}

if ($script:Errors -gt 0) {
    Write-Host "[FAIL] $script:Errors error(s) must be fixed before publishing." -ForegroundColor Red
    exit 1
} elseif ($FailOnWarning -and $script:Warnings -gt 0) {
    Write-Host "[FAIL] $script:Warnings warning(s) found." -ForegroundColor Yellow
    exit 2
} else {
    if ($script:Warnings -gt 0) {
        Write-Host "[WARN] $script:Warnings warning(s) and $script:Info info item(s)." -ForegroundColor Yellow
    } else {
        Write-Host "[PASS] No errors or warnings. $script:Info info item(s) for review." -ForegroundColor Green
    }
    exit 0
}
