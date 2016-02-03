/**
 * keyType : Data type of key. only support string.
 * valueType : Data type of value. e.g. 'string', 'number' ...
 * loadFactor: extend threshold = loadFactor * limit
 * step: if conflict occurs, move forward this steps
 * extFragment: if 0, extend will execute synchronously, or else, the whole
 *              work will split to fragments.
 */
var defaultOpt = {
    keyType: 'string',
    valueType: 'string',
    loadFactor: 0.75,
    step: 13,
    extFragment: 2
};

/**
 *
 * @param keyLen the byte length of key
 * @param valLen the byte length of value
 * @param limit the number of initial buckets
 * @param [options]
 * @constructor
 */
function BigMap(keyLen, valLen, limit, options) {
    this.opts = Object.assign(options || {}, defaultOpt);
    this.keyLen = keyLen;
    this.valLen = valLen;
    this.limit = limit;
    this.eleLen = keyLen + valLen;
    this._buf = new Buffer(this.eleLen * limit);

    this._threshold = this.opts.loadFactor * this.limit;
    this.size = 0;
    this.status = 0; // 0-normal, 1-extending
    this._newMap = null;
    this._buf.fill(0);
}

BigMap.prototype.set = function (key, value) {
    if (this.status === 1) {
        this._newMap.set(key, value);
        return;
    }
    if (this.size > this._threshold) this.extend();
    if (key.length > this.keyLen || value.length > this.valLen) return false;

    var hc = murmurhash3_32_gc(key) % this.limit;

    while (this._buf[hc * this.eleLen] !== 0) {
        hc = (hc  + this.opts.step) % this.limit;
    }

    this._buf.write(key, hc * this.eleLen);
    if (value instanceof Buffer)
        value.copy(this._buf, hc * this.eleLen + this.keyLen);
    else
        this._buf.write(value, hc * this.eleLen + this.keyLen);
    this.size ++;
    return true;
};

BigMap.prototype.get = function (key) {
    if (key.length > this.keyLen) return false;

    var hc = murmurhash3_32_gc(key) % this.limit;

    while (this._buf.trimToString(hc * this.eleLen, this.keyLen) !== key) {
        if (this._buf[hc * this.eleLen] === 0) {
            if (this.status === 1) {
                return this._newMap.get(key);
            }
            return undefined;
        }
        hc = (hc  + this.opts.step) % this.limit;
    }

    return this._buf.trimToString(hc * this.eleLen + this.keyLen, this.valLen);
};


BigMap.prototype.extend = function () {
    this._newMap = new BigMap(this.keyLen, this.valLen, this.limit * 2, this.opts);
    this.status = 1;

    if (this.opts.extFragment) {  // async
        var rehash = function (cur) {
            var buk, stop = cur + this.opts.extFragment;
            var next = function(){rehash(cur)};
            if (this.limit < cur + this.opts.extFragment) {
                stop = this.limit;
                next = function() {
                    this.status = 0;
                    this._buf = this._newMap._buf;
                    this.limit = this._newMap.limit;
                    this._newMap = null;
                }.bind(this);
            }
            for (var i = cur; i < stop; i++ ) {
                buk = i * this.eleLen;
                if (this._buf[buk] !== 0) {
                    this._newMap.set(this._buf.trimToString(buk, this.keyLen), this._buf.slice(buk + this.keyLen, buk + this.eleLen));
                }
            }
            setTimeout(next, 0);
        }.bind(this);
        setTimeout(function(){rehash(0)}, 0);
    } else {  // sync
        var buk;
        for (var i = 0; i < this.limit; i++ ) {
            buk = i * this.eleLen;
            if (this._buf[buk] !== 0) {
                this._newMap.set(this._buf.trimToString(buk, this.keyLen), this._buf.slice(buk + this.keyLen, buk + this.eleLen));
            }
        }
        this.status = 0;
        this._buf = this._newMap._buf;
        this.limit = this._newMap.limit;
        this._threshold = this._newMap._threshold;
        this._newMap = null;
    }


};

/**
 * trim the \u0000 in specified range of this buffer and toString()
 * @param offset include
 * @param len
 * @param [enc]
 */
Buffer.prototype.trimToString = function bufferTrimToString(offset, len, enc){
    var start, i;
    offset = offset || 0;
    len = len || this.length - offset;
    for (i = offset || 0; i < offset + (len || this.length - offset); i++) {
        if (start === undefined && this[i] !== 0) start = i;
        else if (start !== undefined && this[i] === 0) break;
    }
    return this.slice(start, i).toString(enc);
};


function murmurhash3_32_gc(key,seed){var remainder,bytes,h1,h1b,c1,c1b,c2,c2b,k1,i;remainder=key.length&3;bytes=key.length-remainder;h1=seed;c1=0xcc9e2d51;c2=0x1b873593;i=0;while(i<bytes){k1=((key.charCodeAt(i)&0xff))|((key.charCodeAt(++i)&0xff)<<8)|((key.charCodeAt(++i)&0xff)<<16)|((key.charCodeAt(++i)&0xff)<<24);++i;k1=((((k1&0xffff)*c1)+((((k1>>>16)*c1)&0xffff)<<16)))&0xffffffff;k1=(k1<<15)|(k1>>>17);k1=((((k1&0xffff)*c2)+((((k1>>>16)*c2)&0xffff)<<16)))&0xffffffff;h1^=k1;h1=(h1<<13)|(h1>>>19);h1b=((((h1&0xffff)*5)+((((h1>>>16)*5)&0xffff)<<16)))&0xffffffff;h1=(((h1b&0xffff)+0x6b64)+((((h1b>>>16)+0xe654)&0xffff)<<16))}k1=0;switch(remainder){case 3:k1^=(key.charCodeAt(i+2)&0xff)<<16;case 2:k1^=(key.charCodeAt(i+1)&0xff)<<8;case 1:k1^=(key.charCodeAt(i)&0xff);k1=(((k1&0xffff)*c1)+((((k1>>>16)*c1)&0xffff)<<16))&0xffffffff;k1=(k1<<15)|(k1>>>17);k1=(((k1&0xffff)*c2)+((((k1>>>16)*c2)&0xffff)<<16))&0xffffffff;h1^=k1}h1^=key.length;h1^=h1>>>16;h1=(((h1&0xffff)*0x85ebca6b)+((((h1>>>16)*0x85ebca6b)&0xffff)<<16))&0xffffffff;h1^=h1>>>13;h1=((((h1&0xffff)*0xc2b2ae35)+((((h1>>>16)*0xc2b2ae35)&0xffff)<<16)))&0xffffffff;h1^=h1>>>16;return h1>>>0}

module.exports = BigMap;