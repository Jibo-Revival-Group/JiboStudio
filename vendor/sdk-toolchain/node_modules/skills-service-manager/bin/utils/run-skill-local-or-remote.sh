#!/bin/sh


# Figure out the scripts path so we can get an absolute path to the
realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}
filePath=`realpath "$0"`;
ssmDir=`dirname $filePath`;
ssmDir=`dirname $ssmDir../`
ssmDir=`dirname $ssmDir../`

# Set the working directory to the skill's root
cd $1;

# Launch the skills service manager's main process
export RUNMODE=REMOTELY; electron \
    --remote-debugging-port=9222 \
    $ssmDir/skill-main.js \
    $2 $3 $4;
