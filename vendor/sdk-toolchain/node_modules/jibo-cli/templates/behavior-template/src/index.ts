/// <reference path="../node_modules/jibo/typings/index.d.ts" />

import jibo = require('jibo');

jibo.init('face', () => {
    let mainFlow:any = require('./flows/main');
    jibo.flow.run(mainFlow, {}, () => {
        console.log('Flow exited');
    });
});
