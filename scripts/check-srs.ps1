param([switch]$WriteTraceability)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$srsPath = Join-Path $projectRoot 'docs/srs/SRS-v0.2.md'
$jsonPath = Join-Path $projectRoot 'docs/srs/use-cases.json'
$srs = [IO.File]::ReadAllText($srsPath)
$cases = @([IO.File]::ReadAllText($jsonPath) | ConvertFrom-Json)
$issues = [Collections.Generic.List[string]]::new()

function TableIds([string]$prefix) {
  $idPrefix = if ($prefix -eq 'AC-X') { 'AC-X' } else { "$prefix-" }
  @([regex]::Matches($srs, "(?m)^\| ($idPrefix\d+) \|") | ForEach-Object { $_.Groups[1].Value })
}

function NormalizeText([string]$value) {
  [regex]::Replace($value, '\s+', ' ').Trim()
}

function RenderCase($uc) {
  $lines = [Collections.Generic.List[string]]::new()
  $lines.Add("### $($uc.id) $($uc.name)")
  $lines.Add("Actor: $($uc.actor).")
  $frText = $uc.fr -join ', '
  $brText = if (@($uc.br).Count) { $uc.br -join ', ' } else { 'Không có BR riêng' }
  $lines.Add("FR: $frText. BR: $brText.")
  $lines.Add("Trigger: $($uc.trigger).")
  $lines.Add("Tiền điều kiện: $($uc.pre).")
  $lines.Add('Luồng chính:')
  for ($step = 0; $step -lt $uc.steps.Count; $step++) {
    $lines.Add("$($step + 1). $($uc.steps[$step])")
  }
  $lines.Add('Luồng thay thế và ngoại lệ:')
  foreach ($alternative in $uc.alternatives) { $lines.Add("- $alternative") }
  $lines.Add("Hậu điều kiện: $($uc.post).")
  $lines.Add("Tiêu chí nghiệm thu: $($uc.ac)")
  $lines -join "`n"
}

$frIds = @(TableIds 'FR')
$brIds = @(TableIds 'BR')
$odIds = @(TableIds 'OD')
$crossAcIds = @(TableIds 'AC-X')
foreach ($definition in @(
  @{ Label = 'FR'; Values = $frIds; Count = 29 },
  @{ Label = 'BR'; Values = $brIds; Count = 26 },
  @{ Label = 'OD'; Values = $odIds; Count = 14 },
  @{ Label = 'AC-X'; Values = $crossAcIds; Count = 20 }
)) {
  $idPrefix = if ($definition.Label -eq 'AC-X') { 'AC-X' } else { "$($definition.Label)-" }
  $expected = @(1..$definition.Count | ForEach-Object { '{0}{1:D2}' -f $idPrefix, $_ })
  if (($definition.Values -join ',') -ne ($expected -join ',')) {
    $issues.Add("Definition IDs incomplete, duplicated or out of order: $($definition.Label)")
  }
}
if ($cases.Count -ne 35) { $issues.Add("Expected 35 use cases, found $($cases.Count)") }
$caseIds = @($cases | ForEach-Object { $_.id })
$expectedCaseIds = @(1..35 | ForEach-Object { 'UC-{0:D2}' -f $_ })
if (($caseIds -join ',') -ne ($expectedCaseIds -join ',')) {
  $issues.Add('UC IDs incomplete, duplicated or out of order')
}
$markdownCases = @([regex]::Matches($srs, '(?ms)^### (UC-\d+) (.*?)(?=^### UC-|^## 9 )'))
if ($markdownCases.Count -ne 35) { $issues.Add('Markdown must contain exactly 35 UC sections') }

foreach ($uc in $cases) {
  foreach ($field in @('id', 'name', 'actor', 'trigger', 'pre', 'post', 'ac')) {
    if ($uc.$field -isnot [string] -or [string]::IsNullOrWhiteSpace($uc.$field)) {
      $issues.Add("$($uc.id): missing or invalid $field")
    }
  }
  foreach ($field in @('fr', 'br', 'steps', 'alternatives')) {
    if ($uc.$field -isnot [array]) { $issues.Add("$($uc.id): $field must be an array") }
    foreach ($value in @($uc.$field)) {
      if ($value -isnot [string] -or [string]::IsNullOrWhiteSpace($value)) {
        $issues.Add("$($uc.id): invalid value in $field")
      }
    }
  }
  if (@($uc.fr).Count -eq 0 -or @($uc.steps).Count -eq 0) { $issues.Add("$($uc.id): FR and steps must not be empty") }
  foreach ($id in $uc.fr) { if ($id -notin $frIds) { $issues.Add("$($uc.id): unknown FR $id") } }
  foreach ($id in $uc.br) { if ($id -notin $brIds) { $issues.Add("$($uc.id): unknown BR $id") } }
  $acId = $uc.id -replace '^UC-', 'AC-'
  if ($uc.ac -notmatch "^${acId}:") { $issues.Add("$($uc.id): wrong primary AC ID") }
  $markdown = @($markdownCases | Where-Object { $_.Groups[1].Value -eq $uc.id })
  if ($markdown.Count -ne 1) { $issues.Add("$($uc.id): missing or duplicated Markdown section") }
  elseif ((NormalizeText $markdown[0].Value) -ne (NormalizeText (RenderCase $uc))) {
    $issues.Add("$($uc.id): JSON and Markdown content differ")
  }
}

# Expand compact AC-X08/X09/X10 references as well as fully written IDs.
foreach ($match in [regex]::Matches($srs, 'AC-X\d+(?:/X\d+)*')) {
  foreach ($part in ($match.Value -replace '^AC-', '' -split '/')) {
    if ("AC-$part" -notin $crossAcIds) { $issues.Add("Unknown cross AC: AC-$part") }
  }
}
foreach ($prefix in @('FR', 'BR', 'OD')) {
  $known = switch ($prefix) { 'FR' { $frIds } 'BR' { $brIds } 'OD' { $odIds } }
  foreach ($match in [regex]::Matches($srs, "\b$prefix-\d+\b")) {
    if ($match.Value -notin $known) { $issues.Add("Unknown reference: $($match.Value)") }
  }
}

$frRows = @([regex]::Matches($srs, '(?m)^\| (FR-\d+) \| ([^\r\n]+)'))
foreach ($row in $frRows) {
  $id = $row.Groups[1].Value
  $cells = $row.Value.Split('|')
  $declared = @([regex]::Matches($cells[3], 'UC-\d+') | ForEach-Object { $_.Value } | Sort-Object -Unique)
  $actual = @($cases | Where-Object { $id -in $_.fr } | ForEach-Object { $_.id } | Sort-Object -Unique)
  if (($declared -join ',') -ne ($actual -join ',')) { $issues.Add("${id}: FR table and JSON UC mapping differ") }
  foreach ($ucId in $declared) { if ($ucId -notin $caseIds) { $issues.Add("$id references unknown $ucId") } }
}

if ($issues.Count) {
  foreach ($issue in $issues) { Write-Output "FAIL: $issue" }
  throw "SRS document checks failed: $($issues.Count) issue(s)."
}

Write-Output 'PASS: 35 UC; 29 FR; 26 BR; 14 OD; 20 cross AC; bidirectional FR/UC mapping; JSON/Markdown UC content.'
Write-Output 'Document consistency only. Business rules, approvals and NFR are not verified.'

if ($WriteTraceability) {
  $lines = [Collections.Generic.List[string]]::new()
  $lines.Add('# Traceability SRS v0.2')
  $lines.Add('')
  $lines.Add('Tạo từ SRS-v0.2.md và use-cases.json bằng scripts/check-srs.ps1 -WriteTraceability. Chỉ phản ánh tham chiếu tài liệu, không phải kết quả nghiệm thu hoặc phê duyệt.')
  $lines.Add('')
  $lines.Add('## FR → UC')
  $lines.Add('')
  $lines.Add('| FR | UC | Giai đoạn |')
  $lines.Add('|---|---|---|')
  foreach ($row in $frRows) {
    $cells = $row.Value.Split('|')
    $lines.Add("| $($cells[1].Trim()) | $($cells[3].Trim()) | $($cells[4].Trim()) |")
  }
  $lines.Add('')
  $lines.Add('FR-25 có tham chiếu trong UC core để giữ ranh giới increment; chưa cần nghiệm thu reminder ở bản đầu. FR-26/27 chưa có UC chi tiết và cần phụ lục trước triển khai.')
  $lines.Add('')
  $lines.Add('## UC → FR/BR/AC')
  $lines.Add('')
  $lines.Add('| UC | Tên | FR | BR | AC chính |')
  $lines.Add('|---|---|---|---|---|')
  foreach ($uc in $cases) {
    $lines.Add("| $($uc.id) | $($uc.name) | $($uc.fr -join ', ') | $($uc.br -join ', ') | $($uc.id -replace '^UC-', 'AC-') |")
  }
  [IO.File]::WriteAllText((Join-Path $projectRoot 'docs/srs/TRACEABILITY.md'), ($lines -join "`n") + "`n", [Text.UTF8Encoding]::new($false))
  Write-Output 'Wrote docs/srs/TRACEABILITY.md'
}
