param(
    [string]$CommitMessage = "Deploy GitHub Pages"
)

$ErrorActionPreference = 'Stop'

$originalBranch = (git branch --show-current).Trim()

try {
    npm run build

    git switch gh-pages
    git rm -r .

    $distCandidates = @(
        (Join-Path -Path $PSScriptRoot -ChildPath "dist\\wowAPP\\*")
        (Join-Path -Path $PSScriptRoot -ChildPath "dist\\wowapp\\*")
    )

    $distPath = $null
    foreach ($candidate in $distCandidates) {
        if (Test-Path $candidate) {
            $distPath = $candidate
            break
        }
    }

    if (-not $distPath) {
        throw "No se encontro la carpeta de build. Busque en dist\\wowAPP y dist\\wowapp."
    }

    Copy-Item -Path $distPath -Destination $PSScriptRoot -Recurse -Force
    New-Item (Join-Path $PSScriptRoot ".nojekyll") -ItemType File -Force | Out-Null

    git add .
    git commit -m $CommitMessage
    git push origin gh-pages
}
finally {
    $currentBranch = (git branch --show-current).Trim()
    if ($currentBranch -ne $originalBranch) {
        git switch $originalBranch
    }
}
