'use strict';
var assert = require('assert');
var async = require('async');
var BigMap = require('../index');

var start = process.hrtime();
async.series([
    cb => {
        let bm = new BigMap(36, 8);
        console.log('step', bm.currMapBlock.status.step);
        cb(null, chalk.green('construct [PASS]'));
    },

    cb => {
        let bm = new BigMap(36, 8, {loadFactor: 0.5, async: false});
        console.log(bm.currMapBlock.opt.loadFactor, 0.5, 'loadFactor');
        console.log(bm.currMapBlock.opt.async, false, 'async flag');
        cb(null, chalk.green('construct with options [PASS]'));
    },

    cb => {
        var bm = new BigMap(12, 12, {valueType: 'string'});
        async.times(5000, (i, next) => {
            setTimeout(() => {
                console.log(bm.set('key' + i, 'val' + i), 'set');
                console.log(bm.get('key' +i), 'val' + i, 'get');
                next();
            }, Math.random() * 500);
        }, err => err ? cb(err) : cb(null, chalk.green('set/get string without extend [PASS]')));
    },

    cb => {
        var bm = new BigMap(12, 12, {valueType: 'number'});
        async.times(5000, (i, next) => {
            setTimeout(() => {
                assert.ok(bm.set('key' + i, i), 'set');
                assert.strictEqual(bm.get('key' +i), i, 'get');
                next();
            }, Math.random() * 500);
        }, err => err ? cb(err) : cb(null, chalk.green('set/get number without extend [PASS]')));
    },
    // TODO: test case for query miss

    cb => {
        var bm = new BigMap(12, 12, {valueType: 'string'});

        async.times(1000, (i, next) => {
            setTimeout(() => {
                assert.ok(bm.set('key' + i, 'val' + i), 'set');
                assert.strictEqual(bm.get('key' +i), 'val' + i, 'get');
                next();
            }, Math.random() * 500);
        }, err => {
            if (err) {
                cb(err);
                return;
            }
            setTimeout(() => {
                //assert.strictEqual(bm._newMap, null, 'extend finished');
                //assert.strictEqual(bm.status, 0, 'normal status');
                for (let i = 0; i < 1000; i ++) {
                    assert.strictEqual(bm.get('key' +i), 'val' + i, 'get again');
                }
                console.log('map : ', `id ${bm.id} newMap ${bm._buf.length}, status ${bm.status} size ${bm.size}`);
                console.log('Time Used: ' + process.hrtime(start));
                cb(null, chalk.green('set/get number with extend [PASS]'));
            }, 1000);
        });

    }
], (err, result) => err ? console.error(err.stack, err) : result.filter(item => console.log(item)));