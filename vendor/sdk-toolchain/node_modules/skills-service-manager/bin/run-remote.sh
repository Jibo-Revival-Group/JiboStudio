#!/bin/sh

# Stop any previous running skills, dev shell, or skills service manager processes
./bin/on-robot/stop-skills-dev-shell-and-ssm.sh

# Launch the skills service manager in locally with services running remotely
electron ./jibo-ssm.js configs/remote.json;
