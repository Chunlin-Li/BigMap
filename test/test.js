'use strict';
var assert = require('assert');
var async = require('async');
var BigMap = require('../index');

var start = process.hrtime();
async.series([
    cb => {
        let bm = new BigMap(36, 8, {loadFactor: 0.5, upgrade: true, async_upgrade: false});
        console.log('construct with options [PASS]');
        cb();
    },

    cb => {
        var bm = new BigMap(12, 12);
        async.times(5000, (i, next) => {
            setTimeout(() => {
                assert.ok(bm.set('key' + i, 'val' + i));
                assert.ok((bm.get('key' +i) === 'val' + i));
                next();
            }, Math.random() * 500);
        }, err => {
            err ? cb(err) : cb();
            console.log('set/get string without extend [PASS]');
        });
    },

    cb => {
        var bm = new BigMap(12, 12, {valueType: 'number'});
        async.times(5000, (i, next) => {
            setTimeout(() => {
                assert.ok(bm.set('key' + i, i));
                assert.ok(bm.get('key' +i) === i);
                next();
            }, Math.random() * 500);
        }, err => {
            err ? cb(err) : cb();
            console.log('set/get number without extend [PASS]');
        });
    },
    // TODO: test case for query miss

    cb => {
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
                console.log('set/get number with extend [PASS]');
            }, 1000);
        });

    }
], (err, result) => err ? console.error(err.stack, err) : void(0));