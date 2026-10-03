param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$markdownPaths = @(& rg --files $projectRoot -g '*.md')
if ($LASTEXITCODE -ne 0) { throw 'Could not enumerate Markdown documents' }
$broken = [Collections.Generic.List[string]]::new()
$checked = 0
foreach ($markdownPath in $markdownPaths) {
  $content = [IO.File]::ReadAllText($markdownPath)
  foreach ($match in [regex]::Matches($content, '\[[^\]\r\n]+\]\(([^\)\r\n]+)\)')) {
    $target = $match.Groups[1].Value.Trim()
    if ($target -match '^[a-zA-Z][a-zA-Z0-9+.-]*:' -or $target.StartsWith('#')) { continue }
    # This project's inline links use bare paths or <paths with spaces>; skip optional link titles.
    if ($target.StartsWith('<') -and $target.EndsWith('>')) { $target = $target.Substring(1,$target.Length-2) }
    elseif ($target.Contains(' ')) { throw "Unsupported link syntax in $markdownPath" }
    $targetPath = [Uri]::UnescapeDataString($target.Split('#',2)[0])
    if (-not $targetPath) { continue }
    $absoluteTarget = [IO.Path]::GetFullPath((Join-Path (Split-Path $markdownPath -Parent) $targetPath))
    $checked++
    if (-not (Test-Path -LiteralPath $absoluteTarget)) {
      $relativeSource = [IO.Path]::GetRelativePath($projectRoot,$markdownPath)
      $broken.Add("$relativeSource -> $target")
    }
  }
}
if ($broken.Count) { throw ("Broken local Markdown links:`n" + ($broken -join "`n")) }
Write-Output "PASS: $checked local Markdown file links across $($markdownPaths.Count) documents"
Write-Output 'File existence only; web URLs and heading anchors are not verified.'
