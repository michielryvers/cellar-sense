<#
    build-apriltag.ps1
    ------------------
    Build Apriltag-JS-Standalone and copy the artefacts to src\public.
    Run from the project root (the parent of apriltag-builder and src).
#>

$ErrorActionPreference = 'Stop'   # abort on any error

# ---- config ----------------------------------------------------
$imageName      = 'apriltag-js'
$containerName  = 'apriltag-js-temp'
$builderFolder  = 'apriltag-builder'  # contains Dockerfile + Makefile
$destFolder     = 'public'        # where the wasm + js should land
# ----------------------------------------------------------------

Write-Host "▶ Building image '$imageName' from .\$builderFolder ..."
docker build -t $imageName $builderFolder | Write-Host

Write-Host "▶ Creating temporary container '$containerName' ..."
$containerId = docker create --name $containerName $imageName
Write-Host "   container id: $containerId"

# make sure destination exists
if (-not (Test-Path $destFolder)) {
    Write-Host "▶ Creating destination folder .\$destFolder"
    New-Item -ItemType Directory -Force -Path $destFolder | Out-Null
}

Write-Host "▶ Copying artefacts to .\$destFolder ..."
docker cp "${containerName}:/workspace/apriltag-js-standalone/html/apriltag_wasm.js"   "$destFolder\apriltag_wasm.js"
docker cp "${containerName}:/workspace/apriltag-js-standalone/html/apriltag_wasm.wasm" "$destFolder\apriltag_wasm.wasm"
docker cp "${containerName}:/workspace/apriltag-js-standalone/html/apriltag.js" "$destFolder\apriltag.js"

Write-Host "▶ Cleaning up container ..."
docker rm $containerName | Out-Null

Write-Host "✔ Done!  apriltag_wasm.{js,wasm} are now in .\$destFolder"
