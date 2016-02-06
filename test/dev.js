'use strict';
var BigMap = require('../index');

var start = process.hrtime();
var bm = new BigMap(128, 128, {valueType: 'string', upgrade: false, async_upgrade: true});
//console.log('bm:', bm);
for (let i = 0; i < 3075; i ++) {
    setTimeout(() => bm.set('key' + i, 'val' + i), Math.random() * 30)
}
for (let i = 0; i < 3075; i ++) {
    setTimeout(() => bm.set('key' + i, 'val' + i), Math.random() * 30)
}
console.log('time use : ' + process.hrtime(start));
//bm.set('key' + 3073, 'val' + 3073);
//if (bm.get('key' +3073) !== 'val' + 3073) console.error('EE');
setTimeout(function(){
    console.log('bm:', bm.MBList);
}, 200);
