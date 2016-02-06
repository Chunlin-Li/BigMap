'use strict';
var assert = require('assert');
var async = require('async');
var BigMap = require('../index');

var start = process.hrtime();
async.series([
    cb => {
        new BigMap(36, 8, {loadFactor: 0.5, upgrade: true, async_upgrade: false});
        console.log('construct with options [PASS]');
        cb();
    },

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
        console.log('set/get with different type [PASS], ', process.hrtime(start)[0]*1000 + process.hrtime(start)[1]/1000000);
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
            console.log('set/get with upgrade [PASS], ', process.hrtime(start)[0]*1000 + process.hrtime(start)[1]/1000000);
        });
    },

    cb => {
        start = process.hrtime();
        var bm = new BigMap(128, 128, {valueType: 'number'});
        async.times(5000, (i, next) => {
            setTimeout(() => {
                assert.ok(bm.set('key' + i, i));
                assert.ok(bm.get('yek' +i) === undefined);
                next();
            }, Math.random() * 500);
        }, err => {
            err ? cb(err) : cb();
            console.log('get non-exist key [PASS], ', process.hrtime(start)[0]*1000 + process.hrtime(start)[1]/1000000);
        });
    },

    cb => {
        start = process.hrtime();
        var bm = new BigMap(12, 12, {valueType: 'string'});
        async.times(1000, (i, next) => {
            setTimeout(() => {
                assert.ok(bm.set('key' + i, 'val' + i));
                assert.ok(bm.get('key' +i) === 'val' + i);
                next();
            }, Math.random() * 500);
        }, err => {
            if (err) {
                cb(err);
                return;
            }
            setTimeout(() => {
                for (let i = 0; i < 1000; i ++) {
                    assert.ok(bm.get('key' +i) === 'val' + i);
                }
                cb();
                console.log('set/get number with extend [PASS], ', process.hrtime(start)[0]*1000 + process.hrtime(start)[1]/1000000);
            }, 1000);
        });

    }
], (err, result) => err ? console.error(err.stack, err) : void(0));