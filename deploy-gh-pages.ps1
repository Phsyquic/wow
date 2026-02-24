param(
    [string]$CommitMessage = "Deploy GitHub Pages"
)

$ErrorActionPreference = 'Stop'

$originalBranch = (git branch --show-current).Trim()
$tempDeployDir = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ("wow-gh-pages-" + [System.Guid]::NewGuid().ToString("N"))

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$ErrorMessage
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw $ErrorMessage
    }
}

try {
    if (-not (Test-Path (Join-Path -Path $PSScriptRoot -ChildPath "node_modules\\.bin\\ng.cmd"))) {
        throw "No se encontro Angular CLI local. Ejecuta 'npm install' en la raiz del proyecto y vuelve a correr el script."
    }

    Invoke-CheckedCommand -Command { npm run build } -ErrorMessage "El build fallo. Revisa los errores de npm/ng mostrados arriba."

    $angularConfigPath = Join-Path -Path $PSScriptRoot -ChildPath "angular.json"
    if (-not (Test-Path $angularConfigPath)) {
        throw "No se encontro angular.json en la raiz del proyecto."
    }

    $angularConfig = Get-Content $angularConfigPath -Raw | ConvertFrom-Json
    $projectName = $angularConfig.defaultProject
    if (-not $projectName) {
        $projectName = ($angularConfig.projects.PSObject.Properties | Select-Object -First 1).Name
    }
    if (-not $projectName) {
        throw "No se pudo determinar el proyecto en angular.json."
    }

    $outputPath = $angularConfig.projects.$projectName.architect.build.options.outputPath
    if (-not $outputPath) {
        throw "No se encontro projects.$projectName.architect.build.options.outputPath en angular.json."
    }

    $buildOutputDir = Join-Path -Path $PSScriptRoot -ChildPath $outputPath
    if (-not (Test-Path $buildOutputDir)) {
        throw "No se encontro la carpeta de build en '$buildOutputDir'."
    }

    New-Item -Path $tempDeployDir -ItemType Directory -Force | Out-Null
    Copy-Item -Path (Join-Path -Path $buildOutputDir -ChildPath "*") -Destination $tempDeployDir -Recurse -Force

    Invoke-CheckedCommand -Command { git switch gh-pages } -ErrorMessage "No se pudo cambiar a la rama gh-pages."
    Invoke-CheckedCommand -Command { git rm -r . } -ErrorMessage "No se pudieron limpiar los archivos en gh-pages."

    Copy-Item -Path (Join-Path -Path $tempDeployDir -ChildPath "*") -Destination $PSScriptRoot -Recurse -Force
    New-Item (Join-Path $PSScriptRoot ".nojekyll") -ItemType File -Force | Out-Null
    Set-Content -Path (Join-Path $PSScriptRoot ".gitignore") -Value "node_modules"

    Invoke-CheckedCommand -Command { git add -A } -ErrorMessage "No se pudieron agregar los archivos al indice git."
    & git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        Invoke-CheckedCommand -Command { git commit -m $CommitMessage } -ErrorMessage "No se pudo crear el commit de despliegue."
        Invoke-CheckedCommand -Command { git push origin gh-pages } -ErrorMessage "No se pudo hacer push a origin/gh-pages."
    }
    else {
        Write-Host "No hay cambios para desplegar en gh-pages."
    }
}
finally {
    if (Test-Path $tempDeployDir) {
        Remove-Item -Path $tempDeployDir -Recurse -Force
    }

    $currentBranch = (git branch --show-current).Trim()
    if ($currentBranch -ne $originalBranch) {
        & git switch $originalBranch | Out-Null
    }
}
