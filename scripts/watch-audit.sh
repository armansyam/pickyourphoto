#!/bin/bash
# Silent Background Git Audit Watcher Daemon
# Continuously monitors GitHub origin/main for new audit commits every 10 seconds.

PROJECT_DIR="/Users/armansyam/Documents/Project AmsDev/pick-your-photo"
cd "$PROJECT_DIR" || exit 1

echo "[Watcher Started] Silent GitHub Audit Watcher Daemon is active..."

while true; do
    git fetch origin main > /dev/null 2>&1
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)

    if [ "$LOCAL" != "$REMOTE" ]; then
        echo "[TRIGGER DETECTED] New commit from audit team found on origin/main!"
        echo "Local:  $LOCAL"
        echo "Remote: $REMOTE"
        git pull origin main
        echo "[TRIGGER ACTION] Pulled latest audit updates. Alerting Agent Engine..."
        echo "ALERT: NEW_AUDIT_REPORT_PULLED_FROM_GITHUB"
    fi

    sleep 10
done
