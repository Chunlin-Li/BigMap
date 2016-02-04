'use strict';
/**
 * keyType : Data type of key. only support string.
 * valueType : Data type of value. e.g. 'string', 'number' ...
 * loadFactor: extend threshold = loadFactor * limit
 * step: if conflict occurs, move forward this steps
 * extFragment: if 0, extend will execute synchronously, or else, the whole
 *              work will split to fragments.
 */
let defaultOpt = {
    keyType: 'string',
    valueType: 'number',
    loadFactor: 0.75,
    step: 0,
    extFragment: 1000,
    async: true
};
let idCount = 0;
let primes = [131071, 8191, 127, 31, 7, 3, 1];
/**
 *
 * @param keyLen the byte length of key
 * @param valLen the byte length of value
 * @param limit the number of initial buckets
 * @param [options]
 * @constructor
 */
function BigMap(keyLen, valLen, limit, options) {
    var that = null;
    that = new MapBlock(keyLen, valLen, limit, options, that);
    return {
        set: that.set,
        get: that.get
    }
}


function MapBlock(keyLen, valLen, limit, options, container) {

    this.opts = Object.assign({}, defaultOpt, options);
    this.id = 'BigMap_' + idCount ++;
    this.keyLen = keyLen;
    this.valLen = valLen;
    this.limit = limit;
    this.eleLen = keyLen + valLen;
    this._buf = new Buffer(this.eleLen * limit);
    this.container = container;

    this._threshold = this.opts.loadFactor * this.limit;    // size exceed threshold will toggle extend
    this.size = 0;  // the number of saved elements
    this.status = 0; // 0 - normal, 1 - extending
    this._newMap = null;

    this._buf.fill(0);
    this.opts.step = 1;
    for (let sq = Math.floor(Math.sqrt(limit)), i = 0; i < primes.length; i ++) {
        if (primes[i] <= sq && limit % sq !== 0) {
            this.opts.step = primes[i];
            break;
        }
    }
    this.set = _setfun.call(this, this.opts.keyType, this.opts.valueType);
    this.get = _getfun.call(this, this.opts.keyType, this.opts.valueType);
}

let _setfun = function (keyType, valueType) {
    let _valchecked;
    let _valwriter;


    switch (valueType.toLowerCase()) {
        case 'string':
            _valchecked = value => value.length <= this.valLen;
            _valwriter = (value, hc) => this._buf.write(value, hc * this.eleLen + this.keyLen);
            break;
        case 'number':
            _valchecked = value => typeof value === 'number' && Number.isSafeInteger(value);
            _valwriter = (value, hc) => this._buf.writeDoubleBE(value, hc * this.eleLen + this.keyLen);
            break;
        default :
            throw new TypeError(valueType, 'type not support as value!');
    }


    return function (key, value) {
        // data will write to new Map if current map in extending status
        if (this.status === 1) {
            return this._newMap.set(key, value);
        }

        if (this.size > this._threshold) this.extend();

        // either key or value should not exceed the length
        // TYPE CHECK
        if (key.length > this.keyLen || !_valchecked(value)) return false;

        let hc = murmurhash3_32_gc(key) % this.limit;

        // handle conflict
        while (this._buf[hc * this.eleLen] !== 0) {
            //console.log('set conflict: ', hc, key, this.id, this.limit, this.size);
            hc = (hc  + this.opts.step) % this.limit;
        }

        // save key
        this._buf.write(key, hc * this.eleLen);

        // save value
        // if value is buffer, copy it directly. this used for extending.
        if (value instanceof Buffer)
            value.copy(this._buf, hc * this.eleLen + this.keyLen);
        else
            _valwriter(value, hc);
            //this._buf.write(value, hc * this.eleLen + this.keyLen);
        this.size ++;
        //console.log('### saved ### : ', this.id, this.size+'/'+this.limit, key, hc);
        return true;
    };
};


let _getfun = function (keyType, valueType) {
    let _valreader;

    switch (valueType.toLowerCase()) {
        case 'string':
            _valreader = hc => this._buf.readString(hc * this.eleLen + this.keyLen, this.valLen);
            break;
        case 'number':
            _valreader = hc => this._buf.readDoubleBE(hc * this.eleLen + this.keyLen);
            break;
        default :
            throw new TypeError(valueType, 'type not support as value!');
    }



    return function (key) {
        if (key.length > this.keyLen) return undefined;

        let hc = murmurhash3_32_gc(key) % this.limit;

        // handle conflict
        while (this._buf.readString(hc * this.eleLen, this.keyLen) !== key) {
            //console.log('get conflict');
            if (this._buf[hc * this.eleLen] === 0) {
                // during extending status, try newMap.
                if (this.status === 1) {
                    return this._newMap.get(key);
                }
                return undefined;
            }
            hc = (hc + this.opts.step) % this.limit;
        }

        return _valreader(hc);
    };
};



MapBlock.prototype.extend = function () {
    // extended map has twice capacity then old one.
    this._newMap = new MapBlock(this.keyLen, this.valLen, this.limit * 2, this.opts);

    // enter extending status.
    this.status = 1;

    if (this.opts.async) {  // async
        // rehash
        let rehash = function (cur) {
            if (cur > this.limit) return;
            let buk, stop = cur + this.opts.extFragment;
            let next = function () { rehash(stop) };

            if (this.limit < cur + this.opts.extFragment) { // the last pass
                stop = this.limit;
                next = function() { // finish the extending
                    console.log('migrate:', this.id, this.size+'/'+this.limit, ' ==> ',
                        this._newMap.id, this._newMap.size+'/'+this._newMap.limit);
                    _copyProp(this);
                }.bind(this);
            }

            for (let i = cur; i < stop; i++ ) {
                buk = i * this.eleLen;
                if (this._buf[buk] !== 0) {
                    this._newMap.set(this._buf.readString(buk, this.keyLen), this._buf.slice(buk + this.keyLen, buk + this.eleLen));
                }
            }

            setTimeout(next, 0);

        }.bind(this);

        setTimeout(function(){rehash(0)}, 0); // start from index 0

    } else {  // sync
        let buk;
        for (let i = 0; i < this.limit; i++ ) {
            buk = i * this.eleLen;
            if (this._buf[buk] !== 0) {
                this._newMap.set(this._buf.readString(buk, this.keyLen), this._buf.slice(buk + this.keyLen, buk + this.eleLen));
            }
        }
        _copyProp(this);
    }
};

let _copyProp = function (bm) {
    bm.id = bm._newMap.id;
    bm.status = bm._newMap.status;
    bm._threshold = bm._newMap._threshold;
    bm.size = bm._newMap.size;
    bm.limit = bm._newMap.limit;
    bm._buf = bm._newMap._buf;
    bm._newMap = bm._newMap._newMap;
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

function murmurhash3_32_gc(key,seed){let remainder,bytes,h1,h1b,c1,c1b,c2,c2b,k1,i;remainder=key.length&3;bytes=key.length-remainder;h1=seed;c1=0xcc9e2d51;c2=0x1b873593;i=0;while(i<bytes){k1=((key.charCodeAt(i)&0xff))|((key.charCodeAt(++i)&0xff)<<8)|((key.charCodeAt(++i)&0xff)<<16)|((key.charCodeAt(++i)&0xff)<<24);++i;k1=((((k1&0xffff)*c1)+((((k1>>>16)*c1)&0xffff)<<16)))&0xffffffff;k1=(k1<<15)|(k1>>>17);k1=((((k1&0xffff)*c2)+((((k1>>>16)*c2)&0xffff)<<16)))&0xffffffff;h1^=k1;h1=(h1<<13)|(h1>>>19);h1b=((((h1&0xffff)*5)+((((h1>>>16)*5)&0xffff)<<16)))&0xffffffff;h1=(((h1b&0xffff)+0x6b64)+((((h1b>>>16)+0xe654)&0xffff)<<16))}k1=0;switch(remainder){case 3:k1^=(key.charCodeAt(i+2)&0xff)<<16;case 2:k1^=(key.charCodeAt(i+1)&0xff)<<8;case 1:k1^=(key.charCodeAt(i)&0xff);k1=(((k1&0xffff)*c1)+((((k1>>>16)*c1)&0xffff)<<16))&0xffffffff;k1=(k1<<15)|(k1>>>17);k1=(((k1&0xffff)*c2)+((((k1>>>16)*c2)&0xffff)<<16))&0xffffffff;h1^=k1}h1^=key.length;h1^=h1>>>16;h1=(((h1&0xffff)*0x85ebca6b)+((((h1>>>16)*0x85ebca6b)&0xffff)<<16))&0xffffffff;h1^=h1>>>13;h1=((((h1&0xffff)*0xc2b2ae35)+((((h1>>>16)*0xc2b2ae35)&0xffff)<<16)))&0xffffffff;h1^=h1>>>16;return h1>>>0}

module.exports = MapBlock;