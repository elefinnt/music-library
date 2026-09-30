$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$bin = Join-Path $root "resources\bin"
New-Item -ItemType Directory -Force -Path $bin | Out-Null

$ytdlp = Join-Path $bin "yt-dlp.exe"
if (-not (Test-Path $ytdlp)) {
  Write-Output "Downloading yt-dlp"
  curl.exe -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -o $ytdlp
}

$ffmpeg = Join-Path $bin "ffmpeg.exe"
$ffprobe = Join-Path $bin "ffprobe.exe"
if ((Test-Path $ffmpeg) -and (Test-Path $ffprobe)) {
  Write-Output "Sidecars already present"
  exit 0
}

Write-Output "Downloading ffmpeg"
$zip = Join-Path $bin "ffmpeg.zip"
curl.exe -L "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -o $zip
$extract = Join-Path $bin "ffmpeg-extract"
if (Test-Path $extract) { Remove-Item -Recurse -Force $extract }
Expand-Archive -Path $zip -DestinationPath $extract -Force
$foundFfmpeg = Get-ChildItem -Path $extract -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
$foundProbe = Get-ChildItem -Path $extract -Recurse -Filter "ffprobe.exe" | Select-Object -First 1
if (-not $foundFfmpeg -or -not $foundProbe) {
  throw "ffmpeg archive did not contain ffmpeg.exe and ffprobe.exe"
}
Copy-Item $foundFfmpeg.FullName $ffmpeg -Force
Copy-Item $foundProbe.FullName $ffprobe -Force
Remove-Item -Recurse -Force $extract
Remove-Item -Force $zip
Write-Output "Sidecars ready"
