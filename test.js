'use strict';
var BigMap = require('./index');


var map = new BigMap(5, 8, 10);

// async, send one by one
//test1();
// send all, in one event loop
//test2();
// send all, in one event loop
test3();


// async, send one by one
function test1() {
    (function foo(i) {
        map.set('key' + i, 'val' + i);
        console.log('--- key' + i, map.get('key' + i));
        if (i < 99)
            setTimeout(function () {
                foo(i + 1)
            }, 0);
    })(0);
}


// send all, in one event loop
function test2() {
    for (var i = 0; i < 100; i ++ ) {
        map.set('key' + i, 'val' + i);
        console.log('--- key' + i, map.get('key' +i));
    }
}


// send all, in one event loop
function test3() {
    for (let i = 0; i < 100; i ++) {
        setTimeout(function () {
            map.set('key' + i, i);
            console.log('key' + i, map.get('key' +i));
        }, Math.random() * 10);
    }
}
