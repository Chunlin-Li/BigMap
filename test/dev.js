'use strict';
var BigMap = require('../index');

var start = process.hrtime();
var bm = new BigMap(128, 128, {valueType: 'string'});
//console.log('bm:', bm);
for (let i = 0; i < 3074; i ++) {
    setTimeout(() => bm.set('key' + i, 'val' + i), Math.random() * 30)
}
setTimeout(() => {
    for (let i = 0; i < 3074; i++) {
        if (bm.get('key' +i) !== 'val' + i) console.error(i);
    }
}, 200);
console.log('time use : ' + process.hrtime(start));
//bm.set('key' + 3073, 'val' + 3073);
//if (bm.get('key' +3073) !== 'val' + 3073) console.error('EE');
setTimeout(function(){
    console.log('bm:', bm.MBList);
}, 50);
