'use strict';
var BigMap = require('../index');


var bm = new BigMap(128, 128, {valueType: 'string'});
//console.log('bm:', bm);
for (let i = 0; i < 3074; i ++) {
    if (i === 3072) console.log('bm:', bm.MBList);
    bm.set('key' + i, 'val' + i);
    if (bm.get('key' +i) !== 'val' + i) console.error(i);
    //console.log(bm.currMapBlock.status.size);
}
//bm.set('key' + 3073, 'val' + 3073);
//if (bm.get('key' +3073) !== 'val' + 3073) console.error('EE');
console.log('bm:', bm.MBList);