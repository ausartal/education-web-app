$repo = 'C:\Users\ahmad\Documents\College\Projects\education-web-app'

$changes = git -C $repo status --short 2>$null
if (-not $changes) { exit 0 }

git -C $repo add -- . ':!.env.local' ':!*.env*' 2>$null

$files = git -C $repo diff --cached --name-only 2>$null
if (-not $files) { exit 0 }

$firstFile = ($files -split "`n")[0].Trim()
$msg = "chore: update $firstFile"

git -C $repo commit -m $msg 2>$null
git -C $repo push origin HEAD 2>$null
