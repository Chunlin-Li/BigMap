'use strict';
var assert = require('assert');
var BigMap = require('../index');


describe('No Migrate', function () {
    it('get non-exist key', function () {
        var bm = new BigMap(128, 128, {valueType:'string'});
        for (let i = 0; i < 100; i+=2) {
            assert.ok(bm.set('key'+i, 'val'+i));
            assert.ok(bm.get('key'+i) === 'val'+i);
        }
        for (let i = 1; i < 100; i+=2) {
            assert.ok(bm.get('key'+i) === undefined);
        }
    });
    it('overwrite exist key', function () {
        var bm = new BigMap(128, 128);
        for (let i = 0; i < 100; i++) {
            assert.ok(bm.set('key'+i, 'val'+i));
            assert.ok(bm.get('key'+i) === 'val'+i);
        }
        for (let i = 0; i < 100; i++) {
            assert.ok(bm.set('key'+i, 'lav'+i));
            assert.ok(bm.get('key'+i) === 'lav'+i);
        }
        assert.equal(bm.size, 100);
    });
    describe('key/value data type', function () {
        it('string:string', function() {
            var bm = new BigMap(32, 32, {valueType:'string'});
            for (let i = 0; i < 100; i++) {
                assert.ok(bm.set('key'+i, 'val'+i));
                assert.ok(bm.get('key'+i) === 'val'+i);
            }
        });
        it('string:number', function () {
            var bm = new BigMap(32, 32, {valueType:'number'});
            for (let i = 0; i < 100; i++) {
                assert.ok(bm.set('key'+i, i + 0.2));
                assert.ok(bm.get('key'+i) === i + 0.2);
            }
        })
    });
});

describe('With migrate', function () {
    this.timeout(1000);
    it('sync migrate', function () {
        var bm = new BigMap(512, 512, {migrate: true, async_migrate: false});
        for (let i = 0; i < 1000; i++) {
            assert.ok(bm.set('key' + i, 'val' + i));
            assert.ok(bm.get('key' +i) === 'val' + i);
        }
        assert.strictEqual(bm.MBList.length, 1);
        assert.strictEqual(bm.migrating, 0);
        for (let i = 0; i < 1000; i++) {
            assert.ok(bm.get('key' +i) === 'val' + i);
        }
    });
    it('async migrate', function (done) {
        var bm = new BigMap(512, 512, {migrate: true, async_migrate: true});
        for (let i = 0; i < 1000; i++) {
            assert.ok(bm.set('key' + i, 'val' + i));
            assert.strictEqual(bm.get('key' +i), 'val' + i);
        }
        assert.strictEqual(bm.MBList.length, 2);
        assert.strictEqual(bm.migrating, 1);
        let check = function () {
            setTimeout(() => {
                if (bm.migrating > 0) {
                    check();
                } else {
                    assert.ok(bm.MBList.length === 1);
                    for (let i = 0; i < 1000; i++) {
                        assert.ok(bm.get('key' + i) === 'val' + i);
                    }
                    done();
                }
            }, 1);
        };
        check();
    });
});