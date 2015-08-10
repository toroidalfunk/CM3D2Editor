(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports);
    } else {
        // Browser globals
        factory((root.construct = {}));
    }
}(this, function (exports) {
    function extendPrototype(superproto, constructor, properties) {
        // TODO investigate whether there's something wrong about simply passing the
        //  constructor and the other properties in Object.create
        if (superproto != null) {
            constructor.prototype = Object.create(superproto);
            constructor.prototype.constructor = constructor;
        }
        Object.keys(properties).forEach(function(key){
            constructor.prototype[key] = properties[key];
        })
    }

    function BinaryReader(buffer) {
        this.buffer = buffer;
        this.view = new DataView(buffer);
        this.ptr = 0;
    }
    extendPrototype(null, BinaryReader, {
        read: function(size) {
            var ret
            if (size === undefined) {
                ret = this.buffer.slice(this.ptr);
            } else {
                ret = this.buffer.slice(this.ptr, this.ptr + size);
            }
            this.ptr += ret.byteLength;
            return ret;
        },
        readInt8: function() {
            return this.view.getInt8(this.ptr++);
        },
        readUint8: function() {
            return this.view.getUint8(this.ptr++);
        },
        readInt16: function(littleEndian) {
            var ret = this.view.getInt16(this.ptr, littleEndian);
            this.ptr += 2;
            return ret;
        },
        readUint16: function(littleEndian) {
            var ret = this.view.getUint16(this.ptr, littleEndian);
            this.ptr += 2;
            return ret;
        },
        readInt32: function(littleEndian) {
            var ret = this.view.getInt32(this.ptr, littleEndian);
            this.ptr += 4;
            return ret;
        },
        readUint32: function(littleEndian) {
            var ret = this.view.getUint32(this.ptr, littleEndian);
            this.ptr += 4;
            return ret;
        },
        readFloat32: function(littleEndian) {
            var ret = this.view.getFloat32(this.ptr, littleEndian);
            this.ptr += 4;
            return ret;
        },
        readFloat64: function(littleEndian) {
            var ret = this.view.getFloat64(this.ptr, littleEndian);
            this.ptr += 8;
            return ret;
        }
    });
    exports.BinaryReader = BinaryReader;

    function BinaryWriter(size) {
        this.buffer = new ArrayBuffer(size || 4096);
        this.view = new DataView(this.buffer);
        this.ptr = 0;
    }
    extendPrototype(null, BinaryWriter, {
        ensureCapacity: function(ext) {
            var len = this.buffer.byteLength;
            if (this.ptr + ext > len) {
                var newBuf = new ArrayBuffer(Math.max(this.ptr + ext, len + (len >> 1)));
                var newView = new Uint8Array(newBuf);
                var oldView = new Uint8Array(this.buffer);
                for (var i = 0; i < this.ptr; i++) {
                    newView[i] = oldView[i];
                }
                this.buffer = newBuf;
                this.view = new DataView(newBuf);
            }
        },
        write: function(val, offset, length) {
            var valView = new Uint8Array(val, offset, length);
            this.ensureCapacity(valView.length);
            var thisView = new Uint8Array(this.buffer);
            var ptr = this.ptr;
            for (var i = 0; i < valView.length; i++) {
                thisView[ptr + i] = valView[i];
            }
            this.ptr = ptr + valView.length;
        },
        writeInt8: function(val) {
            this.ensureCapacity(1);
            this.view.setInt8(this.ptr++, val);
        },
        writeUint8: function(val) {
            this.ensureCapacity(1);
            this.view.setUint8(this.ptr++, val);
        },
        writeInt16: function(val, littleEndian) {
            this.ensureCapacity(2);
            this.view.setInt16(this.ptr, val, littleEndian);
            this.ptr += 2;
        },
        writeUint16: function(val, littleEndian) {
            this.ensureCapacity(2);
            this.view.setUint16(this.ptr, val, littleEndian);
            this.ptr += 2;
        },
        writeInt32: function(val, littleEndian) {
            this.ensureCapacity(4);
            this.view.setInt32(this.ptr, val, littleEndian);
            this.ptr += 4;
        },
        writeUint32: function(val, littleEndian) {
            this.ensureCapacity(4);
            this.view.setUint32(this.ptr, val, littleEndian);
            this.ptr += 4;
        },
        writeFloat32: function(val, littleEndian) {
            this.ensureCapacity(4);
            this.view.setFloat32(this.ptr, val, littleEndian);
            this.ptr += 4;
        },
        writeFloat64: function(val, littleEndian) {
            this.ensureCapacity(8);
            this.view.setFloat32(this.ptr, val, littleEndian);
            this.ptr += 8;
        },
        getBuffer: function() {
            return this.buffer.slice(0, this.ptr);
        }
    });
    exports.BinaryWriter = BinaryWriter

    function SizeofError(message) {
        this.message = message;
    }

    // ===== CORE =====
    // ======== constructs ========

    function Construct() {
    }
    extendPrototype(null, Construct, {
        parse: function(data) {
            return this.parse_stream(new BinaryReader(data));
        },
        parse_stream: function(stream) {
            return this._parse(stream, {});
        },
        _parse: function(stream, context) {
            throw new Error('not implemented');
        },
        build: function(obj) {
            var writer = new BinaryWriter();
            this.build_stream(obj, writer);
            return writer.getBuffer();
        },
        build_stream: function(obj, stream) {
            return this._build(obj, stream, {})
        },
        _build: function(obj, stream, context) {
            throw new Error('not implemented');
        },
        sizeof: function(context) {
            try {
                this._sizeof(context || {});
            } catch (e) {
                SizeofError(e.message);
            }
        },
        _sizeof: function(context) {
            throw new Error('not implemented');
        }
    });
    exports.Construct = Construct;

    function Subconstruct(subcon) {
        Construct.call(this);
        this.subcon = subcon;
    }
    extendPrototype(Construct.prototype, Subconstruct, {
        _parse: function(stream, context) {
            return this.subcon._parse(stream, context);
        },
        _build: function(obj, stream, context) {
            this.subcon._build(obj, stream, context);
        },
        _sizeof: function(context) {
            return this.subcon._sizeof(context);
        }
    });
    exports.Subconstruct = Subconstruct;

    function Adapter(subcon) {
        Subconstruct.call(this, subcon);
    }
    extendPrototype(Subconstruct.prototype, Adapter, {
        _parse: function(stream, context) {
            return this._decode(this.subcon._parse(stream, context), context);
        },
        _build: function(obj, stream, context) {
            this.subcon._build(this._encode(obj, context), stream, context);
        },
        _decode: function(obj, context) {
            throw new Error('not implemented');
        },
        _encode: function(obj, context) {
            throw new Error('not implemented');
        }
    });
    exports.Adapter = Adapter;

    var _contextify = function(length) {
        if (Object.prototype.toString.call(length) == "[object Function]") {
            return length;
        } else {
            return function() { return length; };
        }
    };

    // ======== fields ========

    function Raw(length) {
        Construct.call(this);
        this.length = _contextify(length);
    }
    extendPrototype(Construct.prototype, Raw, {
        _parse: function(stream, context) {
            var length = this.length(context);
            var ret = stream.read(length);
            if (ret.byteLength != length) {
                throw new Error('Expected buffer of length ' + length + ', got ' + ret.byteLength);
            }
            return new Uint8Array(ret);
        },
        _build: function(obj, stream, context) {
            var length = this.length(context);
            if (obj.byteLength != length) {
                throw new Error('Expected view of length ' + length + ', got ' + obj.byteLength);
            }
            stream.write(obj.buffer, obj.byteOffset, obj.byteLength);
        },
        _sizeof: function(context) {
            return this.length(context);
        }
    });
    exports.raw = function(length) {
        return new Raw(length);
    };

    // ======== structures and sequences ========

    function Struct(members) {
        this.members = members;
        var names = {};
        members.forEach(function(member){
            if ((member.length != 2 && member.length != 3) || (member[0] && typeof member[0] != 'string') || !(member[1] instanceof Construct)) {
                // might as well add support for anonymous members, by having just a construct as the member... since the inverse will need to be done to support embedded on sequence
                throw new Error('Struct members must be Arrays of two elements, name and construct: ' + member);
            }
            if (member[0]) {
                if (names[member[0]]) {
                    throw new TypeError("Member " + member[0] + " already exists in this struct");
                }
                names[member[0]] = true;
            }
        });
    }
    extendPrototype(Construct.prototype, Struct, {
        _parse: function(stream, context) {
            var context2 = {'_': context};
            var obj = {};
            this.members.forEach(function(member){
                var name = member[0];
                var obj2 = member[1]._parse(stream, context2);
                if (member[2] && member[2].embed) {
                    Object.keys(obj2).forEach(function(k){
                        if (obj[k] != null && obj[k] != obj2[k]) {
                            throw new TypeError("Member " + k + " already exists in this struct");
                        }
                        obj[k] = obj2[k];
                    });
                    if (name) {
                        context2[name] = obj2;
                    }
                } else {
                    if (name) {
                        obj[name] = obj2;
                        context2[name] = obj2;
                    }
                }
            });
            return obj;
        },
        _build: function(obj, stream, context) {
            var context2 = {'_': context};
            this.members.forEach(function(member){
                var obj2, name = member[0];
                if (member[2] && member[2].embed) {
                    obj2 = obj;
                    if (name) {
                        context2[name] = obj2; // TODO shallow copy?
                    }
                } else {
                    if (name) {
                        obj2 = obj[name];
                        if (obj2 === undefined) {
                            throw new Error('missing value: ' + name + ' from ' + JSON.stringify(obj));
                        }
                        context2[name] = obj2;
                    }
                }
                member[1]._build(obj2, stream, context2);
            });
            return obj;
        },
        _sizeof: function(context) {
            var context2 = {'_': context};
            return this.members.reduce(function(sum, member) {
                return sum + member[1].sizeof(context2);
            }, 0);
        }
    });
    exports.struct = function(members) {
        return new Struct(members);
    }

    function Sequence(members) {
        this.members = members;
        members.forEach(function(member){
            if (!(member instanceof Construct)) {
                // embedded will be implemented by supporting member being an array, with an optional second element of the member be an option object, with embedded being an option...
                // another option, useful for padding, would be a discard option
                throw new Error('Sequence members must be constructs: ' + member);
            }
        });
    }
    extendPrototype(Construct.prototype, Sequence, {
        _parse: function(stream, context) {
            var context2 = {'_': context};
            var obj = [];
            this.members.forEach(function(member, i){
                var obj2 = member._parse(stream, context2);
                obj.push(obj2);
                context2[i] = obj2;
            });
            return obj;
        },
        _build: function(obj, stream, context) {
            var context2 = {'_': context};
            this.members.forEach(function(member, i){
                obj2 = obj[i];
                if (obj2 === undefined) {
                    throw new Error('missing value: ' + i + ' from ' + JSON.stringify(obj));
                }
                context2[i] = obj2;
                member._build(obj2, stream, context2);
            });
            return obj;
        },
        _sizeof: function(context) {
            var context2 = {'_': context};
            return this.members.reduce(function(sum, member) {
                return sum + member.sizeof(context2);
            }, 0);
        }
    });
    exports.sequence = function(members) {
        return new Sequence(members);
    }

    // ======== arrays and repeaters ========

    function Array_(count, subcon) {
        Subconstruct.call(this, subcon);
        this.count = _contextify(count);
    }
    extendPrototype(Subconstruct.prototype, Array_, {
        _parse: function(stream, context) {
            var count = this.count(context);
            var subcon = this.subcon;
            var obj = [];
            for (var i=0; i<count; i++) {
                obj.push(subcon._parse(stream, context));
            }
            return obj;
        },
        _build: function(obj, stream, context) {
            var count = this.count(context);
            var subcon = this.subcon;
            for (var i=0; i<count; i++) {
                obj2 = obj[i];
                if (obj2 === undefined) {
                    throw new Error('missing value: ' + i + ' from ' + JSON.stringify(obj));
                }
                subcon._build(obj2, stream, context);
            }
            return obj;
        },
        _sizeof: function(context) {
            return this.count(context) * this.subcon.sizeof(context2);
        }
    });
    exports.array = function(count, subcon) {
        return new Array_(count, subcon);
    }

    // ======== conditional ========

    function Switch(keyfunc, cases, defawlt) {
        Construct.call(this);
        this.keyfunc = keyfunc;
        this.cases = cases;
        this.defawlt = defawlt;
    }
    extendPrototype(Construct.prototype, Switch, {
        _switch: function(context) {
            var key = this.keyfunc(context);
            var construct = this.cases[key];
            if (construct != null) {
                return construct;
            }
            construct = this.defawlt;
            if (construct != null) {
                return construct;
            }
            throw new Error('Cannot find a case for ' + key);
        },
        _parse: function(stream, context) {
            return this._switch(context)._parse(stream, context);
        },
        _build: function(obj, stream, context) {
            this._switch(context)._build(obj, stream, context);
        },
        _sizeof: function(context) {
            return this._switch(context)._sizeof(context);
        }
    });
    exports.switch_ = function(keyfunc, cases, defawlt) {
        return new Switch(keyfunc, cases, defawlt);
    }

    // ======== miscellaneous ========

    exports.tail = Object.create(Construct.prototype, {
        _parse: { value: function(stream) {
            return new Uint8Array(stream.read());
        }},
        _build: { value: function(obj, stream) {
            stream.write(obj.buffer, obj.byteOffset, obj.byteLength);
        }},
        _sizeof: { value: function() {
            throw new Error('indeterminate');
        }}
    });

    exports.terminator = Object.create(Construct.prototype, {
        _parse: { value: function(stream) {
            if (stream.read(1).byteLength > 0) {
                throw Error('expected end of stream');
            }
        }},
        _build: { value: function(obj, stream) {
            if (obj != null) {
                throw Error('expected null');
            }
        }},
        _sizeof: { value: function() {
            return 0;
        }}
    });

    exports.pass = Object.create(Construct.prototype, {
        _parse: { value: function() {
        }},
        _build: { value: function() {
        }},
        _sizeof: { value: function() {
            return 0;
        }}
    });

    function Value(value) {
        Construct.call(this);
        this.value = _contextify(value);
    }
    extendPrototype(Construct.prototype, Value, {
        _parse: function(stream, context) {
            return this.value(context);
        },
        _build: function(obj, stream, context) {
            if (obj != this.value(context)) {
            }
        },
        _sizeof: function(context) {
            return 0;
        }
    });
    exports.value = function(value) {
        return new Value(value);
    }

    // ==== ADAPTERS ====

    exports.adapter = function(subcon, decode, encode) {
        var a = new Adapter(subcon);
        a._decode = decode;
        a._encode = encode;
        return a;
    }

    function ConstAdapter(subcon, value) {
        Adapter.call(this, subcon);
        this.value = value;
    }
    extendPrototype(Adapter.prototype, ConstAdapter, {
        _decode: function(obj) {
            if (obj != this.value) {
                throw new Error('expected ' + this.value + ', found ' + obj);
            }
            return obj;
        },
        _encode: function(obj) {
            if (obj != null && obj != this.value) {
                throw new Error('expected ' + this.value + ', found ' + obj);
            }
            return obj || this.value;
        }
    });
    exports.const_ = function(subcon, value) {
        return new ConstAdapter(subcon, value);
    }

    // ======== length-value ========

    function LengthValueAdapter(subcon) {
        Adapter.call(this, subcon);
    }
    extendPrototype(Adapter.prototype, LengthValueAdapter, {
        _decode: function(obj) {
            return obj[1];
        },
        _encode: function(obj) {
            return [obj.length, obj];
        }
    });
    exports.lengthValue = function(subcon) {
        return new LengthValueAdapter(subcon);
    }

    // ======== strings ========

    function EncodingAdapter(subcon, encoding) {
        Adapter.call(this, subcon);
        this.encoding = encoding;
        this.encoder = new TextEncoder(encoding, {fatal: true});
        this.decoder = new TextDecoder(encoding, {fatal: true});
    }
    extendPrototype(Adapter.prototype, EncodingAdapter, {
        _decode: function(obj) {
            return this.decoder.decode(obj);
        },
        _encode: function(obj) {
            return this.encoder.encode(obj);
        }
    });
    exports.encoded = function(subcon, encoding) {
        return new EncodingAdapter(subcon, encoding);
    }

    // "decodes" binary data into base64 encoding.
    function Base64EncodeAdapter(subcon) {
        Adapter.call(this, subcon);
    }
    extendPrototype(Adapter.prototype, Base64EncodeAdapter, {
        _decode: function(obj) {
            var output = '';
            var num = 0;
            var bits = 0;
            for (var i = 0; i < obj.byteLength; i++) {
                num <<= 8;
                num |= obj[i];
                bits += 8;
                while (bits >= 6) {
                    bits -= 6;
                    output += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/" [num >> bits];
                    num &= ~(0x3F << bits);
                }
            }
            if (bits) {
                num <<= 6 - bits;
                output += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/" [num];
            }
            output += "===".substring((obj.byteLength + 2) % 3 + 1);
            return output;
        },
        _encode: function(obj) {
            if (obj.length % 4 !== 0 || !(/[A-Za-z0-9+\/]*={0,2}/.test(obj))) {
                throw new Error('Invalid base64');
            }
            var len = obj.length / 4 * 3;
            if (obj.indexOf('=') !== -1) {
                len -= obj.length - obj.indexOf('=');
            }
            var arr = new Uint8Array(len);

            var mapping = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            for (var i = 0, j = 0; i < obj.length; i += 4, j += 3) {
                var val = (mapping.indexOf(obj[i]) << 18) |
                    (mapping.indexOf(obj[i + 1]) << 12) |
                    (mapping.indexOf(obj[i + 2]) << 6) |
                    mapping.indexOf(obj[i + 3]);
                arr[j] = (val >> 16) & 0xFF;
                arr[j + 1] = (val >> 8) & 0xFF;
                arr[j + 2] = val & 0xFF;
            }

            return arr;
        }
    });
    exports.base64 = function(subcon) {
        return new Base64EncodeAdapter(subcon);
    }

    // ======== validators ========

    function Validator(subcon, validate) {
        Adapter.call(this, subcon);
        this.validate = validate;
    }
    extendPrototype(Adapter.prototype, Validator, {
        _decode: function(obj, context) {
            this.validate(obj, context);
            return obj;
        },
        _encode: function(obj, context) {
            return this._decode(obj, context);
        }
    });
    exports.validate = function(subcon, validate) {
        return new Validator(subcon, validate);
    }

    // ==== MACROS ====
    // ======== length-value ========

    function prefixedRaw(lengthcon) {
        return new LengthValueAdapter(new Sequence([
            lengthcon,
            new Raw(function(x){return x[0]})
        ]));
    }
    exports.prefixedRaw = prefixedRaw;

    function prefixedArray(lengthcon, subcon) {
        return new LengthValueAdapter(new Sequence([
            lengthcon,
            new Array_(function(x){return x[0]}, subcon)
        ]));
    }
    exports.prefixedArray = prefixedArray;

    // ======== conditional ========

    function ifThenElse(predicate, then_subcon, else_subcon) {
        var cases = {};
        cases[true] = then_subcon;
        cases[false] = else_subcon;
        return new Switch(function(x){return !!predicate(x)}, cases);
    }
    exports.ifThenElse = ifThenElse;

    function if_(predicate, subcon, else_value) {
        return ifThenElse(predicate, subcon, new Value(else_value));
    }
    exports.if_ = if_;

    // ======== validators ========

    exports.oneOf = function(subcon, valids) {
        return new Validator(subcon, function(o, x){
            if (valids.indexOf(o) < 0){
                throw new Error('expected one of ' + valids + ', found ' + o);
            }
        });
    }
    exports.noneOf = function(subcon, invalids) {
        return new Validator(subcon, function(o, x){
            if (valids.indexOf(o) > -1){
                throw new Error('expected none of ' + invalids + ', found ' + o);
            }
        });
    }

    // ======== numbers ========

    var makeNumber = function(length, _parse, _build) {
        return Object.create(Construct.prototype, {
            _parse: { value: _parse },
            _build: { value: _build },
            length: { value: length },
            _sizeof: { value: function() {return this.length}}
        });
    };
    exports.int8l =     makeNumber(1, function(stream){return stream.readInt8(true)},       function(obj, stream){stream.writeInt8(obj, true)});
    exports.int8b =     makeNumber(1, function(stream){return stream.readInt8(false)},      function(obj, stream){stream.writeInt8(obj, false)});
    exports.uint8l =    makeNumber(1, function(stream){return stream.readUint8(true)},      function(obj, stream){stream.writeUint8(obj, true)});
    exports.uint8b =    makeNumber(1, function(stream){return stream.readUint8(false)},     function(obj, stream){stream.writeUint8(obj, false)});
    exports.int16l =    makeNumber(2, function(stream){return stream.readInt16(true)},      function(obj, stream){stream.writeInt16(obj, true)});
    exports.int16b =    makeNumber(2, function(stream){return stream.readInt16(false)},     function(obj, stream){stream.writeInt16(obj, false)});
    exports.uint16l =   makeNumber(2, function(stream){return stream.readUint16(true)},     function(obj, stream){stream.writeUint16(obj, true)});
    exports.uint16b =   makeNumber(2, function(stream){return stream.readUint16(false)},    function(obj, stream){stream.writeUint16(obj, false)});
    exports.int32l =    makeNumber(4, function(stream){return stream.readInt32(true)},      function(obj, stream){stream.writeInt32(obj, true)});
    exports.int32b =    makeNumber(4, function(stream){return stream.readInt32(false)},     function(obj, stream){stream.writeInt32(obj, false)});
    exports.uint32l =   makeNumber(4, function(stream){return stream.readUint32(true)},     function(obj, stream){stream.writeUint32(obj, true)});
    exports.uint32b =   makeNumber(4, function(stream){return stream.readUint32(false)},    function(obj, stream){stream.writeUint32(obj, false)});
    exports.float32l =  makeNumber(4, function(stream){return stream.readFloat32(true)},    function(obj, stream){stream.writeFloat32(obj, true)});
    exports.float32b =  makeNumber(4, function(stream){return stream.readFloat32(false)},   function(obj, stream){stream.writeFloat32(obj, false)});
    exports.float64l =  makeNumber(8, function(stream){return stream.readFloat64(true)},    function(obj, stream){stream.writeFloat64(obj, true)});
    exports.float64b =  makeNumber(8, function(stream){return stream.readFloat64(false)},   function(obj, stream){stream.writeFloat64(obj, false)});
    // TODO native

    // random note: those utf-16 fields where the raw size is twice the count? use an adapter on the length construct.

}));
