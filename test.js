var BigMap = require('./index');


var map = new BigMap(5, 5, 10);
for (var i = 0; i < 100; i ++ ) {
    map.set('key' + i, 'val' + i);
    console.log('--- key' + i, map.get('key' +i));
}

//setTimeout(function() {
//    for (var i = 0; i < 100; i ++ ) {
//        console.log('key' + i, map.get('key' + i));
//    }
//}, 3000);
