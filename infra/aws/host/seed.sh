#!/usr/bin/env bash
# One-off: load the sample catalogue and create admin@pcbuilder.vn. The seed WIPES products, orders and users first.
# Run from a Session Manager shell: sudo /opt/pcbuilder/bin/seed.sh  (the password is typed, never echoed or stored)
set -euo pipefail
# shellcheck source=lib.sh
. /opt/pcbuilder/bin/lib.sh

read -r -p "This deletes every product, order and account, then loads the sample data. Type SEED to continue: " answer
[[ $answer == SEED ]] || { echo "Cancelled."; exit 1; }

read -r -s -p "New password for admin@pcbuilder.vn (at least 12 characters): " password
echo
read -r -s -p "Repeat it: " repeat
echo
[[ $password == "$repeat" ]] || { echo "The two entries differ." >&2; exit 1; }
((${#password} >= 12)) || { echo "Too short." >&2; exit 1; }

# `-e NAME` without a value copies it from this environment, so the password is not on any command line.
SEED_ADMIN_PASSWORD=$password compose exec -T -e SEED_ADMIN_PASSWORD api node --import tsx src/db/seed/index.ts
