'use strict';
/**
 * keyType : Data type of key. only support string.
 * valueType : Data type of value. e.g. 'string', 'number' ...
 * loadFactor: extend threshold = loadFactor * capacity
 * step: if conflict occurs, move forward this steps
 * extFragment: if 0, extend will execute synchronously, or else, the whole
 *              work will split to fragments.
 */
let defaultOpt = {
    keyLen: undefined,
    keyType: 'string',
    valLen: undefined,
    valueType: 'string',
    loadFactor: 0.75,
    eleLen: undefined,
    upgrade: false,
    async_upgrade: false
};
let idCountMB = 0;
let idCount = 0;
let maxChip = 1000;
// Buffer Size : 1MB 16MB 128MB 512MB 1G 2G 4G 8G 16G
// capacity = Buffer Size / Element Length
let capacities = [1048577, 16777217, 134217729, 536870913, 1073741825, 2147483651, 4294967301, 8589934600, 17179869200];
let primes = [131071, 8191, 127, 31, 7, 3, 1];
/**
 *
 * @param keyLen the byte length of key
 * @param valLen the byte length of value
 * @param [options]
 * @constructor
 */
function BigMap(keyLen, valLen, options) {


    this.opt = Object.assign({}, defaultOpt, options);
    this.opt.keyType = this.opt.keyType.toLowerCase();
    this.opt.valueType = this.opt.valueType.toLowerCase();

    if (this.opt.keyType === 'number') this.opt.keyLen = 8;
    else this.opt.keyLen = keyLen;
    if (this.opt.valueType === 'number') this.opt.valLen = 8;
    else this.opt.valLen = valLen;

    this.opt.eleLen = keyLen + valLen;

    this.id = 'BigMap_' + idCount ++;
    this.upgrading = 0;
    this.size = 0;
    this.currMapBlock = null;
    this.MBList = [];
    bindFunction.call(this);
    new MapBlock(0, this);
}


function MapBlock(capacityLvl, root) {

    this.id = 'MapBlock_' + idCountMB ++;
    this.opt = root.opt;
    this.status = {
        capacity: Math.floor(capacities[capacityLvl] / this.opt.eleLen),
        upgrading: false,
        size: 0,    // the number of saved elements
        threshold: 0,   // size exceed threshold will toggle extend
        step: 1,
        capacityLvl: capacityLvl
    };
    this.status.threshold = this.status.capacity * this.opt.loadFactor;
    initBuffer.call(this);
    this.root = root;
    root.currMapBlock = this;
    root.MBList.push(this);
    this.nextMB = null;
    this.prevMB = null;
    // compute step value.
    for (let sq = Math.floor(Math.sqrt(this.status.capacity)), i = 0; i < primes.length; i ++) {
        if (primes[i] <= sq && this.status.capacity % primes[i] !== 0) {
            this.status.step = primes[i];
            break;
        }
    }
    this.set = setFun.call(this);
    this.get = getFun.call(this);
}

let initBuffer = function () {
    this.buf = new Buffer(this.opt.eleLen * this.status.capacity).fill(0);
    if (this.opt.keyType === 'number') {
        for(let i = 0 ; i < this.status.capacity; i ++) {
            this.buf.fill(NaN, i*this.opt.eleLen)
        }
    }
    if (this.opt.valueType === 'number') {

    }
};

let bindFunction = function() {

    let valCheck;
    let valRead;
    let valWrite;
    let keyCheck;
    let keyCompare;
    let keyRead;
    let keyWrite;


    switch (this.opt.valueType) {
        case 'string':
            valCheck = (map, value) => value.length <= map.opt.valLen;
            valRead = (map, hc) => map.buf.readString(hc * map.opt.eleLen + map.opt.keyLen, map.opt.valLen);
            valWrite = (map, value, hc) => map.buf.write(value, hc * map.opt.eleLen + map.opt.keyLen);
            break;
        case 'number':
            valCheck = (map, value) => typeof value === 'number';
            valRead = (map, hc) => map.buf.readDoubleBE(hc * map.opt.eleLen + map.opt.keyLen);
            valWrite = (map, value, hc) => map.buf.writeDoubleBE(value, hc * map.opt.eleLen + map.opt.keyLen);
            break;
        default :
            throw new TypeError(this.opt.valueType, 'type not support as value!');
    }

    switch (this.opt.keyType) {
        case 'string':
            keyCheck = (map, key) => key.length <= map.opt.keyLen;
            keyCompare = (map, hc, key) => map.buf.readString(hc * map.opt.eleLen, map.opt.keyLen) === key;
            keyRead = (map, hc) => map.buf.readString(hc * map.opt.eleLen, map.opt.keyLen);
            keyWrite = (map, key, hc) => map.buf.write(key, hc*map.opt.eleLen);
            break;
        case 'number':
            keyCheck = (map, key) => typeof key === 'number';
            keyCompare = (map, hc, key) => Number.isNaN(key)? Number.isNaN(map.buf.readDoubleBE(hc * map.opt.eleLen)) : map.buf.readDoubleBE(hc * map.opt.eleLen) === key;
            keyRead = (map, hc) => map.buf.readDoubleBE(hc * map.opt.eleLen);
            keyWrite = (map, key, hc) => map.buf.writeDoubleBE(key, hc*map.opt.eleLen);
            break;
        default :
            throw new TypeError(this.opt.keyType, 'type not support as key!');
    }

    this._action = {keyCheck, keyCompare, keyRead, keyWrite, valCheck, valRead, valWrite};

    this.set = (key, value) => this.currMapBlock.set(key, value) ? ++this.size > 0 : false;
    this.get = (key) => this.currMapBlock.get(key);
};

let setFun = function () {
    let act = this.root._action;
    return function (key, value) {

        if (this.status.size >= this.status.threshold) this.upgrade(key, value);

        // either key or value should not exceed the length
        // TYPE CHECK
        if (!act.keyCheck(this, key) || !act.valCheck(this, value)) throw new TypeError('key value check failed');

        let hc = murmurhash3_32_gc(key) % this.status.capacity;

        // handle conflict
        //while (this.buf[hc * this.opt.eleLen] !== 0) {
        while (!act.keyCompare(this, hc, key)) {
            //console.log('set conflict: ', hc, key, this.id, this.status.capacity, this.status.size);
            hc = (hc  + this.status.step) % this.status.capacity;
        }

        // save key
        act.keyWrite(this, key, hc);

        // save value
        // if value is buffer, copy it directly. this used for extending.
        if (value instanceof Buffer)
            value.copy(this.buf, hc * this.opt.eleLen + this.opt.keyLen);
        else
            act.valWrite(this, value, hc);
        this.status.size ++;
        return true;
    }.bind(this);
};


let getFun = function () {
    let act = this.root._action;
    return function (key) {
        if (key.length > this.opt.keyLen) return undefined;

        let hc = murmurhash3_32_gc(key) % this.status.capacity;

        // handle conflict
        //while (this.buf.readString(hc * this.opt.eleLen, this.opt.keyLen) !== key) {
        while (!act.keyCompare(this, hc, key)) {
            //console.log('get conflict');
            if (this.buf[hc * this.opt.eleLen] === 0) {
                // during extending status, try newMap.
                if (this.prevMB) {
                    return this.prevMB.get(key);
                }
                return undefined;
            }
            hc = (hc + this.status.step) % this.status.capacity;
        }

        return act.valRead(this, hc);
    }.bind(this);
};



MapBlock.prototype.upgrade = function (key, value) {
    // extended map has twice capacity then old one.
    let nextCapLvl = 1;
    if (this.prevMB) {
        nextCapLvl = this.status.capacityLvl + 1 < capacities.length ?
        this.status.capacityLvl + 1 : this.status.capacityLvl;
    }

    this.nextMB = new MapBlock(nextCapLvl, this.root);
    this.nextMB.prevMB = this;

    // enter upgrading status.
    if (!this.opt.upgrade) return;

    this.status.upgrading = true;
    this.root.upgrading ++;

    if (this.opt.async_upgrade) {  // async
        // rehash
        let rehash = function (cur) {
            if (cur > this.status.capacity) return;
            let buk, stop = cur + ( Math.floor(Math.sqrt(this.status.capacity)) > maxChip ? maxChip : Math.floor(Math.sqrt(this.status.capacity)));
            let next = () => rehash(stop);

            if (this.status.capacity <= stop) { // the last pass
                stop = this.status.capacity;
                next = () => { // finish the extending

                    destory(this);
                };
            }

            for (let i = cur; i < stop; i++) {
                buk = i * this.opt.eleLen;
                if (this.buf[buk] !== 0) {
                    this.nextMB.set(this.buf.readString(buk, this.opt.keyLen), this.buf.slice(buk + this.opt.keyLen, buk + this.opt.eleLen));
                }
            }

            setImmediate(next);

        }.bind(this);

        setImmediate(() => rehash(0)); // start from index 0

    } else {  // sync
        let buk, targetMB = this.root.currMapBlock;
        for (let i = 0; i < this.status.capacity; i++) {
            buk = i * this.opt.eleLen;
            if (this.buf[buk] !== 0) {
                targetMB.set(this.buf.readString(buk, this.opt.keyLen), this.buf.slice(buk + this.opt.keyLen, buk + this.opt.eleLen));
            }
        }
        targetMB.set(key, value);
        destory(this);
    }
};

let destory = function (bm) {

    //let ptr = bm.prevMB;
    if (bm.prevMB)
        bm.prevMB.nextMB = bm.nextMB;
    bm.nextMB.prevMB = bm.prevMB;
    bm.root.MBList.find((ele, index, arr) => ele === bm ? [].splice.call(arr, index, 1) : null);
    bm.root.upgrading --;
    //bm.buf = null;

    console.log('destroy MapBlock:', bm.id, bm.status.size + '/' + bm.status.capacity);
};


/**
 * read out a string from this buffer. cut by \u0000, \n or \r
 * @param {Number} offset include
 * @param {Number} len the length of specified range.
 * @param [enc]
 */
Buffer.prototype.readString = function readString(offset, len, enc) {
    let exec = readString.reg.exec(this.slice(offset, offset + len).toString(enc));
    return exec ? exec[0] : undefined;
};
Buffer.prototype.readString.reg = new RegExp('[^\u0000\n\r]*');

//https://github.com/garycourt/murmurhash-js
function murmurhash3_32_gc(key,seed){let remainder,bytes,h1,h1b,c1,c1b,c2,c2b,k1,i;remainder=key.length&3;bytes=key.length-remainder;h1=seed;c1=0xcc9e2d51;c2=0x1b873593;i=0;while(i<bytes){k1=((key.charCodeAt(i)&0xff))|((key.charCodeAt(++i)&0xff)<<8)|((key.charCodeAt(++i)&0xff)<<16)|((key.charCodeAt(++i)&0xff)<<24);++i;k1=((((k1&0xffff)*c1)+((((k1>>>16)*c1)&0xffff)<<16)))&0xffffffff;k1=(k1<<15)|(k1>>>17);k1=((((k1&0xffff)*c2)+((((k1>>>16)*c2)&0xffff)<<16)))&0xffffffff;h1^=k1;h1=(h1<<13)|(h1>>>19);h1b=((((h1&0xffff)*5)+((((h1>>>16)*5)&0xffff)<<16)))&0xffffffff;h1=(((h1b&0xffff)+0x6b64)+((((h1b>>>16)+0xe654)&0xffff)<<16))}k1=0;switch(remainder){case 3:k1^=(key.charCodeAt(i+2)&0xff)<<16;case 2:k1^=(key.charCodeAt(i+1)&0xff)<<8;case 1:k1^=(key.charCodeAt(i)&0xff);k1=(((k1&0xffff)*c1)+((((k1>>>16)*c1)&0xffff)<<16))&0xffffffff;k1=(k1<<15)|(k1>>>17);k1=(((k1&0xffff)*c2)+((((k1>>>16)*c2)&0xffff)<<16))&0xffffffff;h1^=k1}h1^=key.length;h1^=h1>>>16;h1=(((h1&0xffff)*0x85ebca6b)+((((h1>>>16)*0x85ebca6b)&0xffff)<<16))&0xffffffff;h1^=h1>>>13;h1=((((h1&0xffff)*0xc2b2ae35)+((((h1>>>16)*0xc2b2ae35)&0xffff)<<16)))&0xffffffff;h1^=h1>>>16;return h1>>>0}

module.exports = BigMap;