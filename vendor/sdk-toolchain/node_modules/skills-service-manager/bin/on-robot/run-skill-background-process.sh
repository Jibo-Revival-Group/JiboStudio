#!/bin/sh

# Skills service manager calls this ON ROBOT, to launch a skill. This should never be called directly.

# First stop any currently running skill
#sh /usr/local/bin/jibo-ssm/bin/on-robot/stop-skill.sh;

#cd to directory
#cd $1;

# Kill node-inspector and test.js
echo "Stopping any node-inspector processes...";
pkill -f "node-inspector" 2> /dev/null;
echo "Stopping test.js process...";
pkill -f "test.js" 2> /dev/null;

ATOM_SHELL_INTERNAL_RUN_AS_NODE=1 \
/usr/local/electron-x/electron \
    --debug-brk=5858 \
    /usr/local/bin/jibo-ssm/bin/test.js
