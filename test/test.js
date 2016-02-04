'use strict';
var assert = require('assert');
var BigMap = require('../index');


describe('Construct', () => {
    it('default', () => {
        let bm = new BigMap(36, 8, 500);
        assert.equal(bm._buf.length, 500 * (36 + 8), 'buffer length');
        assert.equal(bm.keyLen, 36, 'key length');
        assert.equal(bm.valLen, 8, 'value length');
        assert.ok(bm.opts.step > 1, 'step');
    });
    it('with option', () => {
        let bm = new BigMap(36, 8, 500, {loadFactor: 0.5, async: false});
        assert.equal(bm.opts.loadFactor, 0.5, 'loadFactor');
        assert.equal(bm.opts.async, false, 'async flag');
    });
});

describe('String key, String Value', function() {
    it('multi send', function (done)  {
        this.timeout(30000 * 1000);
        var bm = new BigMap(12, 12, 10000, {valueType: 'string'});
        for (let i = 0; i < 100000; i ++) {
            setTimeout(function () {
                assert.ok(bm.set('key' + i, 'val' + i), 'set');
                assert.strictEqual(bm.get('key' +i), 'val' + i, 'get');
            }, Math.random() * 500);
        }
        setTimeout(() => {
            //assert.strictEqual(bm._newMap, null, 'extend finished');
            //assert.strictEqual(bm.status, 0, 'normal status');
            for (let i = 0; i < 100000; i ++) {
                assert.strictEqual(bm.get('key' +i), 'val' + i, 'get again');
            }
            console.log('map : ', `id ${bm.id} newMap ${bm._buf.length}, status ${bm.status} size ${bm.size}`);
            done();
        }, 10000)
    });
});
