#!/bin/sh

electron \
--remote-debugging-port=10223 \
~/jibo/sdk/skills-service-manager/jibo-ssm.js \
configs/remote.json;