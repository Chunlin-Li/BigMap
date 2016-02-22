'use strict';
var assert = require('assert');
var async = require('async');
var BigMap = require('../index');

var start = process.hrtime();
async.series([

        cb => {
        start = process.hrtime();
        var bm = new BigMap(128, 128, {keyType: 'string', valueType:'string'});
        for (let i = 0; i < 256; i++) {
            assert.ok(bm.set('key'+i, 'val'+i));
            assert.ok((bm.get('key'+i) === 'val'+i));
        }
        bm = new BigMap(128, 128, {keyType: 'string', valueType:'number'});
        for (let i = 0; i < 256; i++) {
            assert.ok(bm.set('key'+i, i));
            assert.ok((bm.get('key'+i) === i));
        }
        //bm = new BigMap(128, 128, {keyType: 'number', valueType:'string'});
        //for (let i = 0; i < 256; i++) {
        //    assert.ok(bm.set(i, 'val'+i));
        //    assert.ok((bm.get(i) === 'val'+i));
        //}
        //bm = new BigMap(128, 128, {keyType: 'number', valueType:'number'});
        //for (let i = 0; i < 256; i++) {
        //    assert.ok(bm.set(i, i));
        //    assert.ok((bm.get(i) === i));
        //}
        cb();
        console.log('set/get with different type [PASS], ', process.hrtime(start)[0]*1000 + process.hrtime(start)[1]/1000000,'ms');
    },

        cb => {
        start = process.hrtime();
        var bm = new BigMap(128, 128, {valueType: 'number'});
        async.times(5000, (i, next) => {
            setTimeout(() => {
                assert.ok(bm.set('key' + i, i));
                assert.ok(bm.get('key' +i) === i);
                next();
            }, Math.random() * 500);
        }, err => {
            err ? cb(err) : cb();
            console.log('set/get with migrate [PASS], ', process.hrtime(start)[0]*1000 + process.hrtime(start)[1]/1000000, 'ms');
        });
    },

        cb => {
        start = process.hrtime();
        var bm = new BigMap(128, 128, {valueType: 'number'});
        for (let i = 0; i < 6140; i+=2) {
            assert.ok(bm.set('key'+i, i));
            assert.ok((bm.get('key'+i) === i));
        }
        for (let i = 1; i < 6140; i+=2) {
            assert.ok(bm.get('key'+i) === undefined);
        }
        cb();
        console.log('get non-exist key [PASS], ', process.hrtime(start)[0]*1000 + process.hrtime(start)[1]/1000000, 'ms');
    },

        cb => {
        start = process.hrtime();
        var bm = new BigMap(128, 128, {valueType: 'string', migrate: true, async_migrate: true});
        for (let i = 0; i < 5000; i++) {
            assert.ok(bm.set('key'+i, 'val' +i));
            assert.ok((bm.get('key'+i) === 'val' +i));
        }
            console.log(bm);
        for (let i = 0; i < 5000; i++) {
            assert.ok(bm.set('key'+i, 'val_'+i));
            assert.ok(bm.get('key'+i) === 'val_'+i);
        }
        assert.equal(bm.size, 5000);
        cb();
        console.log('overwrite exist key [PASS], ', process.hrtime(start)[0]*1000 + process.hrtime(start)[1]/1000000, 'ms');
    },

    cb => {
        start = process.hrtime();
        var bm = new BigMap(128, 128, {
            valueType: 'number',
            keyType: 'string',
            migrate: true,
            async_migrate: false
        });
        async.times(200000, (i, acb) => {
            setTimeout(() => {
                assert.ok(bm.set('thisisalongstringkey' + i, i));
                acb();
                assert.ok(bm.get('thisisalongstringkey' + i) === i);
            }, 50);
        }, err => {
            if (err) {
                cb(err);
                return;
            }
            setTimeout(() => {
                assert.ok(bm.MBList.length === 1);
                for (let i = 0; i < 200000; i++) {
                    assert.ok(bm.get('thisisalongstringkey' + i) === i);
                }
                cb();
            }, 5000);
            console.log('set/get number with extend [PASS], ', process.hrtime(start)[0] * 1000 + process.hrtime(start)[1] / 1000000, 'ms');
        });
    }
], (err, result) => err ? console.error(err.stack, err) : void(0));