/// <reference path="../node_modules/jibo/typings/index.d.ts" />

import jibo = require('jibo');
import TestDebugBehavior from './behaviors/TestDebugBehavior';

// Register the custom Behavior for the jibo runtime
jibo.bt.register(
    'TestDebugBehavior',
    '__package-name__',
    TestDebugBehavior
);