param(
    [string]$CommitMessage = "Deploy GitHub Pages"
)

$ErrorActionPreference = 'Stop'

$originalBranch = (git branch --show-current).Trim()
$tempDeployDir = Join-Path -Path ([System.IO.Path]::GetTempPath()) -ChildPath ("wow-gh-pages-" + [System.Guid]::NewGuid().ToString("N"))

try {
    npm run build

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

    git switch gh-pages
    git rm -r .

    Copy-Item -Path (Join-Path -Path $tempDeployDir -ChildPath "*") -Destination $PSScriptRoot -Recurse -Force
    New-Item (Join-Path $PSScriptRoot ".nojekyll") -ItemType File -Force | Out-Null

    git add .
    git diff --cached --quiet
    if ($LASTEXITCODE -ne 0) {
        git commit -m $CommitMessage
        git push origin gh-pages
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
        git switch $originalBranch
    }
}
