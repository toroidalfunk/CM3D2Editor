(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['exports', 'construct'], factory);
    } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
        // CommonJS
        factory(exports, require('construct'));
    } else {
        // Browser globals
        factory(root, root.construct);
    }
}(this, function (exports, c) {
	var suppressVersion;
	function checkVersion(version) {
		if (version > 122 || version < 101) {
			if (suppressVersion === undefined) {
				if (exports.confirm) {
					suppressVersion = exports.confirm('Unsupported version. Continue?');
				}
			}
			if (!suppressVersion) {
				throw new Error('Version ' + (version / 100) + ' is not supported');
			}
		}
	}

    var encint = new c.Construct();
    encint._parse = function(stream) {
        var value = 0,
            shift = 0,
            byte;
        do {
            byte = stream.readUint8(true);
            value |= (byte & 0x7F) << shift;
            shift += 7;
        } while (byte & 0x80);
        return value;
    };
    encint._build = function(obj, stream) {
        obj >>>= 0;
        while (obj >= 0x80) {
            stream.writeUint8((obj & 0x7F) | 0x80);
            obj >>>= 7;
        }
        stream.writeUint8(obj);
    };
    var struct = c.struct;
    var const_ = c.const_;
    var int32 = c.int32l;
    var uint32 = c.uint32l;
    var int64 = c.sequence([int32, int32]);
    var single = c.float32l;
    var string = c.encoded(c.prefixedRaw(encint), 'utf-8');
    var binary = c.base64(c.prefixedRaw(int32));
    var magic = function(s){return [null, const_(string, s)]}
    var version = c.validate(int32, checkVersion);
    var version2 = version;
    var if_ = c.if_;
    var afterver = function(version, subcon) {
        return if_(function(x){return x.version > version}, subcon)
    };
    var minver = function(version, subcon) {
        return if_(function(x){return x.version >= version}, subcon)
    };
    var int2boolean = [false, true];
    var boolean_ = c.adapter(c.uint8l,
        function(obj) {
            var b = int2boolean[obj];
            return b === undefined ? obj : b;
        },
        function(obj) {
            var i = int2boolean.indexOf(obj);
            return i < 0 ? obj : i;
        });
    var array = c.array;
    var list = function(subcon) {
        return c.prefixedArray(int32, subcon);
    };
    var keyvalues2object = function(obj) {
        var ret = {};
        var order = [];
        obj.forEach(function(e, i) {
            ret[e.key] = e.value;
            order.push(e.key);
        });
        if (!ret.hasOwnProperty('<<order>>')) {
            ret['<<order>>'] = order;
        }
        return ret;
    };
    var object2keyvalues = function(obj, coercefunc) {
        var order, ret = [];
        Object.keys(obj).forEach(function(k){
            if (k == '<<order>>') {
                order = obj[k];
                return;
            }
            var ck = coercefunc ? coercefunc(k) : k;
            ret.push({key: ck, value: obj[k]});
        });
        if (order) {
            ret.sort(function(a, b) {
                var ai = order.indexOf(a.key);
                var bi = order.indexOf(b.key);
                var cmp = ai < 0 ? (bi < 0 ? 0 : 1) : (b < 0 ? -1 : ai - bi);
                if (cmp == 0) {
                    cmp = a < b ? -1 : (b < a ? 1 : 0);
                }
                return cmp;
            });
        }
        return ret;
    };
    var dict = function(keycon, valcon, coercefunc) {
        return c.adapter(list(struct([
            ['key', keycon],
            ['value', valcon]
        ])), keyvalues2object, function(obj){return object2keyvalues(obj, coercefunc)});
    };

    var rgba = struct([['r', single], ['g', single], ['b', single], ['a', single]])

    var playerParam = struct([
        magic('CM3D2_PPARAM'),
        ['version', version],
        ['playerName', string],
        ['scenarioPhase', int32],
        ['phaseDays', int32],
        ['days', int32],
        ['shopUseMoney', int64],
        ['money', int64],
        ['initSalonLoan', afterver(8, int64)],
        ['salonLoan', int64],
        ['salonClean', int32],
        ['salonBeautiful', int32],
        ['salonEvaluation', int32],
        ['isFirstNameCall', afterver(8, boolean_)],
        ['currentSalonGrade', int32],
        ['bestSalonGrade', int32],
        ['scheduleSlots', array(6, struct([
            ['maidGuid', string],
            ['noonSuccessLevel', int32],
            ['nightSuccessLevel', int32],
            ['communication', boolean_],
            ['backupStatusDic', dict(string, int32)],
        ]))],
        ['genericFlag', dict(string, int32)],
        ['nightWorksStateDic', dict(int32, struct([
            ['workId', int32],
            ['calledMaidGuid', string],
            ['finish', boolean_]
        ]), parseInt)],
        ['shopLineupDic', dict(int32, int32, parseInt)],
        ['haveItemList', dict(string, boolean_)],
        ['haveTrophyList', list(int32)],
        ['maidClassOpenFlag', afterver(9, list(int32))],
        ['yotogiClassOpenFlag', afterver(9, list(int32))],
        ['rentalMaidBackupDataDic', minver(117, dict(string, struct([
            ['name', string],
            ['seikeiken', int32],
            ['genericFlag', dict(string, int32)]
        ])))],
        [null, const_(int32, 348195810)]
    ]);

    var maidProp = struct([
        magic('CM3D2_MPROP'),
        ['version', version2],
        ['idx', int32],
        ['name', string],
        ['type', int32],
        ['valueDefault', int32],
        ['value', int32],
        ['tempValue', minver(101, int32)],
        ['valueLinkMax', int32],
        ['fileName', string],
        ['fileNameRid', int32],
        ['dut', boolean_],
        ['max', int32],
        ['min', int32]
    ]);

    var maidProps = struct([
        magic('CM3D2_MPROP_LIST'),
        ['version', version2],
        ['props', c.ifThenElse(function(x){return x.version >= 100},
            dict(string, maidProp),
            list(maidProp) // TODO adapt into the 1.00+ version
        )]
    ]);

    var partsColor = struct([
        ['use', boolean_],
        ['mainHue', int32],
        ['mainChroma', int32],
        ['mainBrightness', int32],
        ['mainConstrast', int32],
        ['shadowRate', int32],
        ['shadowHue', int32],
        ['shadowChroma', int32],
        ['shadowBrightness', int32],
        ['shadowContrast', int32],
    ]);

    var maidParts = struct([
        magic('CM3D2_MULTI_COL'),
        ['version', version2],
        ['parts', list(partsColor)]
    ]);

    var experienceSystem = struct([
        ['currentExp', int32],
        ['totalExp', int32],
        ['nextExp', int32],
        ['level', int32]
    ]);

    var statusMaidClassData = struct([
        ['have', boolean_],
        ['exp', experienceSystem]
    ]);

    var statusBody = struct([
        ['height', int32],
        ['weight', int32],
        ['bust', int32],
        ['waist', int32],
        ['hip', int32],
        ['cup', string],
    ]);

    var statusSexual = struct([
        ['mouth', int32],
        ['throat', int32],
        ['nipple', int32],
        ['front', int32],
        ['back', int32],
        ['curi', int32],
    ]);

    var statusSkillData = struct([
        ['id', int32],
        ['playCount', uint32],
        ['exp', experienceSystem]
    ]);

    var statusWorkData = struct([
        ['id', int32],
        ['playCount', uint32],
        ['level', int32]
    ]);

    var statusMaidClassBonusStatus = struct([
        ['hp', int32],
        ['mind', int32],
        ['reception', int32],
        ['care', int32],
        ['lovely', int32],
        ['inyoku', int32],
        ['elegance', int32],
        ['mValue', int32],
        ['charm', int32],
        ['hentai', int32],
        ['housi', int32],
        ['teachRate', int32],
    ]);

    var maidParam = struct([
        magic('CM3D2_MAID_PPARAM'),
        ['version', version],
        ['guid', string],
        ['createTime', string],
        ['createTimeNum', int64],
        ['employmentDay', int32],
        ['maidPoint', int32],
        ['lastName', string],
        ['firstName', string],
        ['profile', string],
        ['freeComment', string],
        ['initSeikeiken', int32],
        ['seikeiken', int32],
        ['personal', int32],
        ['contractType', int32],
        ['maidClassData', list(statusMaidClassData)],
        ['currentMaidClass', int32],
        ['yotogiClassData', list(statusMaidClassData)],
        ['currentYotogiClass', int32],
        ['feature', list(int32)],
        ['propensity', list(int32)],
        ['body', statusBody],
        ['condition', int32],
        ['conditionSpecial', int32],
        ['yotogiPlayCount', int32],
        ['othersPlayCount', int32],
        ['likability', int32],
        ['studyRate', int32],
        ['curHp', int32],
        ['hp', int32],
        ['curMind', int32],
        ['mind', int32],
        ['curReason', int32],
        ['reason', int32],
        ['reception', int32],
        ['care', int32],
        ['lovely', int32],
        ['inyoku', int32],
        ['elegance', int32],
        ['mValue', int32],
        ['charm', int32],
        ['hentai', int32],
        ['housi', int32],
        ['teachRate', int32],
        ['sexual', statusSexual],
        ['play_number', int32],
        ['frustration', int32],
        ['popularRank', int32],
        ['evaluation', int64],
        ['totalEvaluation', int64],
        ['sales', int64],
        ['totalSales', int64],
        ['isFirstNameCall', afterver(6, boolean_)],
        ['isRentalMaid', afterver(8, boolean_)],
        ['noonWorkID', int32],
        ['nightWorkID', int32],
        ['skillData', dict(int32, statusSkillData, parseInt)],
        ['workData', dict(int32, statusWorkData, parseInt)],
        ['genericFlag', dict(string, int32)],
        ['employment', boolean_],
        ['leader', boolean_],
        ['eyePartsTab', int32],
        ['partsDic', dict(string, string)],
        ['maidClassBonusStatus', statusMaidClassBonusStatus],
        [null, const_(int32, 1923480616)]
    ]);

    var maidMisc = struct([
        magic('CM3D2_MAID_MISC'),
        ['version', version],
        ['activeSlotNo', int32],
        ['texIcon', binary],
        ['thumbCardTime', afterver(8, string)],
        ['colorMan', rgba]
    ]);

    var save = struct([
        magic('CM3D2_SAVE'),
        ['version', version],
        ['header', struct([
            ['saveTime', string],
            ['gameDay', int32],
            ['playerName', string],
            ['maidNum', int32],
            ['comment', string],
        ])],
        ['chrMgr', struct([
            magic('CM3D2_CHR_MGR'),
            ['version', version],
            ['playerParam', playerParam],
            ['stockMan', list(struct([
                ['props', maidProps, {embed: true}],
                ['misc', maidMisc]
            ]))],
            ['stockMaid', list(struct([
                ['props', maidProps, {embed: true}],
                ['parts', maidParts, {embed: true}],
                ['param', maidParam],
                ['misc', maidMisc]
            ]))]
        ])],
        ['script', struct([
            magic('CM3D2_SCRIPT'),
            ['version', version],
            ['advKag', struct([
                magic('CM3D2_KAG'),
                ['version', version],
                ['kag', binary],
                ['fadeWait', boolean_],
                ['enabled', boolean_]
            ]), {embed: true}],
        ])],
        [null, c.terminator]
    ]);

	exports.parseSaveData = function(buffer) {
        suppressVersion = undefined;
        var o = save.parse(buffer);
        o.suppressVersion = suppressVersion;
        return o;
    };
	exports.writeSaveData = function(data) {
        suppressVersion = data.suppressVersion;
        return save.build(data);
    };
    //exports.save_construct = save;
}));

//var rawData = writeSaveData(bindings.save);
//save_construct.parse(rawData)
//save_construct.parse(save_construct.build(save_construct.parse(rawData)))
