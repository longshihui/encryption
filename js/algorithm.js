/**
 * 加密算法类库
 * Author: Colorless.
 * Date: 2016/11/7
 * Project: encryption
 */
(function (win, Flow) {
    'use strict';
    var UNICODE_A = 'A'.charCodeAt(0),
        UNICODE_Z = 'Z'.charCodeAt(0);

    var Caesar = (function () {
        var lockFlow = new Flow('Caesar:lock');
        var unlockFlow = new Flow('Caesar:unlock');

        function translate(msg, key) {
            msg = msg.toUpperCase().split('');
            return msg.map(function (val) {
                var t = val.charCodeAt(0) - UNICODE_A + key;
                t = t < 0 ? (26 + t) : t;
                return String.fromCharCode(t % 26 + UNICODE_A);
            }).join('');
        }

        lockFlow.defineTasks({
            'readMessage': {
                desc: '输入的明文',
                body: function (message) {
                    return message;
                }
            },
            'lock': {
                desc: '根据秘钥移位加密',
                body: function (message, reMap, setting) {
                    return translate(message, setting.key);
                }
            }
        });

        unlockFlow.defineTasks({
            'readCipher': {
                desc: '输入的密文',
                body: function (cipher) {
                    return cipher;
                }
            },
            'unlock': {
                desc: '根据秘钥解密',
                body: function (cipher, reMap, setting) {
                    return translate(cipher, setting.key)
                }
            }
        });

        return {
            setting: {
                key: 5
            },
            lock: function (message) {
                return lockFlow.execute(message, {
                    'lock': {
                        key: this.setting.key
                    }
                });
            },
            unlock: function (cipher) {
                return unlockFlow.execute(cipher, {
                    'unlock': {
                        key: -this.setting.key
                    }
                });
            }
        }
    }());

    var Playfair = (function () {
        var FUZZY_KEY = 'J';
        var FIX_KEY = 'X';
        var lockFlow = new Flow('Playfair:lock');
        var unlockFlow = new Flow('Playfair:unlock');

        /**
         * 生成秘钥
         * @param keyWord
         * @return {Array}
         */
        function makeKey(keyWord) {
            var map = {}, result = [];

            //将秘钥中的J替换成I
            keyWord = keyWord.toUpperCase().replace(FUZZY_KEY, 'I').split('');

            //去掉秘钥中重复的字母
            keyWord.forEach(function (v) {
                if (map[v] === undefined) {
                    map[v] = true;
                }
            });
            keyWord = Object.keys(map);

            //创建秘钥一维数组
            for (var i = UNICODE_A, t; i <= UNICODE_Z; i++) {
                t = String.fromCharCode(i);
                if (t === FUZZY_KEY) {
                    continue;
                }
                if (map[t] === undefined) {
                    keyWord.push(t);
                }
            }

            //创建二维矩阵
            for (var begin = 0, end = 5, len = keyWord.length; end <= len; begin += 5, end += 5) {
                result.push(keyWord.slice(begin, end));
            }
            return result;
        }

        /**
         * 给定字母,返回该字符在密钥矩阵中的位置
         * @param m
         * @param matrix
         * @return {{}}
         */
        function getPosition(m, matrix) {
            var pos = {};
            matrix.forEach(function (rows, rowIndex) {
                rows.forEach(function (el, colIndex) {
                    if (el === m) {
                        pos.row = rowIndex;
                        pos.col = colIndex;
                        return false;
                    }
                });
                if (pos.hasOwnProperty('row')) {
                    return false;
                }
            });
            return pos;
        }

        /**
         * 填充明文数据
         * @param msg
         * @return {Array}
         */
        function fixMsg(msg) {
            var result = [];
            msg = msg.toUpperCase();

            //替换明文中的J字符
            msg = msg.replace(FUZZY_KEY, 'I');
            msg = msg.split('');

            //去重
            var first = 0, second = 1;
            while (second < msg.length) {
                if (msg[first] === msg[second]) {
                    msg.splice(second, 0, FIX_KEY);
                }
                first += 2;
                second = first + 1;
            }

            //若不是偶数长度，补充长度
            if (msg.length % 2 !== 0) {
                msg.push(FIX_KEY);
            }
            for (var i = 0, size = 2; i < msg.length; i += size) {
                result.push(msg.slice(i, i + size).join(''));
            }

            return result;
        }

        function changeMsg(cipher, matrix) {
            return cipher.map(function (chars) {
                var pos = chars.split('').map(function (char) {
                        return getPosition(char, matrix);
                    }),
                    message = '';

                //若第一个字符和第二个字符在密钥矩阵的同一行
                if (pos[0].row === pos[1].row) {
                    var rowArr = matrix[pos[0].row];

                    message = pos.map(function (position) {
                        return position.col === 0 ? rowArr[rowArr.length - 1] : rowArr[position.col - 1];
                    }).join('');

                    //若第一个字符和第二个字符在密钥矩阵的同一列
                } else if (pos[0].col === pos[1].col) {
                    var colArr = matrix.map(function (rows) {
                        return rows[pos[0].col];
                    });

                    message = pos.map(function (position) {
                        return position.row === 0 ? colArr[colArr.length - 1] : colArr[position.row - 1];
                    }).join('');

                    //若不同列也不同行
                } else {
                    message += matrix[pos[0].row][pos[1].col];
                    message += matrix[pos[1].row][pos[0].col];
                }
                return message;
            }).join('');
        }

        function changeCipher(msg, matrix) {
            return msg.map(function (chars) {
                var pos = chars.split('').map(function (char) {
                        return getPosition(char, matrix);
                    }),
                    cipher = '';

                if (pos[0].row === pos[1].row) {
                    var rowArr = matrix[pos[0].row];

                    cipher = pos.map(function (position) {
                        return position.col === (rowArr.length - 1) ? rowArr[0] : rowArr[position.col + 1];
                    }).join('');

                } else if (pos[0].col === pos[1].col) {
                    var colArr = matrix.map(function (rows) {
                        return rows[pos[0].col];
                    });

                    cipher = pos.map(function (position) {
                        return position.row === (colArr.length - 1) ? colArr[0] : colArr[position.row + 1];
                    }).join('');

                } else {
                    cipher += matrix[pos[0].row][pos[1].col];
                    cipher += matrix[pos[1].row][pos[0].col];
                }
                return cipher;
            }).join('');
        }

        lockFlow.defineTasks({
            'readMessage': {
                desc: '读入明文',
                body: function (message) {
                    return message;
                }
            },
            'fixMsg': {
                desc: '对明文进行补位,使其变成偶数位',
                body: function (message) {
                    return fixMsg(message)
                }
            },
            'makeKey': {
                desc: '生成密钥矩阵',
                body: function (fixMsg, reMap, setting) {
                    return makeKey(setting.key);
                }
            },
            'lock': {
                desc: '对明文进行加密',
                body: function (matrix, reMap) {
                    return changeCipher(reMap.fixMsg, matrix);
                }
            }
        });

        unlockFlow.defineTasks({
            'readCipher': {
                desc: '读入密文',
                body: function (message) {
                    return message;
                }
            },
            'fixMsg': {
                desc: '对密文进行补位,使其变成偶数位',
                body: function (message) {
                    return fixMsg(message)
                }
            },
            'makeKey': {
                desc: '生成密钥矩阵',
                body: function (fixMsg, reMap, setting) {
                    return makeKey(setting.key);
                }
            },
            'unlock': {
                desc: '对密文进行解密',
                body: function (matrix, reMap) {
                    return changeMsg(reMap.fixMsg, matrix);
                }
            }
        });

        return {
            setting: {
                key: 'monarchy'
            },
            lock: function (message) {
                return lockFlow.execute(message, {
                    makeKey: this.setting
                });
            },
            unlock: function (cipher) {
                return unlockFlow.execute(cipher, {
                    makeKey: this.setting
                })
            }
        }
    }());

    var Hill = (function () {
        var FIX_CHAR = 'X';
        var lockFlow = new Flow('Hill:lock');
        var unlockFlow = new Flow('Hill:unlock');

        /**
         * 填充明文数据
         * @param msg
         * @param matrixKey
         * @return {Array}
         */
        function fix(msg, matrixKey) {
            //被乘矩阵的列数必须和乘矩阵行数相同，以乘矩阵的行数作为分割数据长度的基准
            var sliceSize = matrixKey.length, result = [];

            msg = msg.toUpperCase();

            //位数不符合要求则补位
            while (msg.length % sliceSize !== 0) {
                msg += FIX_CHAR;
            }

            for (var i = 0, size = sliceSize, t; i < msg.length; i += size) {

                t = msg.substr(i, size).split('');

                t = t.map(function (char) {
                    return char.charCodeAt(0) % UNICODE_A;
                });

                result.push(t);

            }
            return result;
        }

        /**
         * 矩阵乘法运算
         * @param m1
         * @param m2
         * @return {Array}
         */
        function matrixMultiply(m1, m2) {
            var result = [],
                reCountRow = m1.length,
                reCountCol = m2[0].length,
                tempColArr,
                tempRowArr,
                tempResult;

            for (var rowIndex = 0; rowIndex < reCountRow; rowIndex++) {
                result.push([]);
                for (var colIndex = 0; colIndex < reCountCol; colIndex++) {

                    tempRowArr = m1[rowIndex];

                    tempColArr = m2.map(function (row) {
                        return row[colIndex];
                    });

                    tempResult = tempRowArr.reduce(function (preValue, curEl, index) {
                        return preValue + (curEl * tempColArr[index]);
                    }, 0);

                    result[rowIndex].push(tempResult % 26);
                }
            }

            return result;
        }

        function translate(messageMatrix, matrixKey) {
            return matrixMultiply(messageMatrix, matrixKey).map(function (rows) {
                return rows.map(function (charCode) {
                    return String.fromCharCode(UNICODE_A + charCode);
                }).join('');
            }).join('');
        }

        lockFlow.defineTasks({
            'readMessage': {
                desc: '读入明文',
                body: function (message) {
                    return message;
                }
            },
            'fix': {
                desc: '填充数据,将其转换为明文矩阵',
                body: function (message, reMap, setting) {
                    return fix(message, setting.key)
                }
            },
            'translate': {
                desc: '对明文进行加密',
                body: function (msgMatrix, reMap, setting) {
                    return translate(msgMatrix, setting.key)
                }
            }
        });

        unlockFlow.defineTasks({
            'readCipher': {
                desc: '读入明文',
                body: function (message) {
                    return message;
                }
            },
            'fix': {
                desc: '填充数据,将其转换为密文矩阵',
                body: function (message, reMap, setting) {
                    return fix(message, setting.ukey)
                }
            },
            'translate': {
                desc: '对密文进行解密',
                body: function (msgMatrix, reMap, setting) {
                    return translate(msgMatrix, setting.ukey)
                }
            }
        });

        return {
            setting: {
                //矩阵
                key: [
                    [17, 17, 5],
                    [21, 18, 21],
                    [2, 2, 19]
                ],
                //逆矩阵
                ukey: [
                    [4, 9, 15],
                    [15, 17, 6],
                    [24, 0, 17]
                ]
            },
            lock: function (message) {
                return lockFlow.execute(message, {
                    'fix': this.setting,
                    'translate': this.setting
                })
            },
            unlock: function (cipher) {
                return unlockFlow.execute(cipher, {
                    'fix': this.setting,
                    'translate': this.setting
                })
            }
        }
    }());

    var Vigenere = (function () {
        var lockFlow = new Flow('Vigenere:lock');
        var unlockFlow = new Flow('Vigenere:unlock');

        function fix(msg) {
            return msg.toUpperCase().replace(/\s+/g, '').split('').map(function (char) {
                return char.charCodeAt(0) - UNICODE_A;
            });
        }

        function makeKey(msgLen, keyWord) {
            var key = keyWord.toUpperCase();

            key = key.split('').map(function (char) {
                return char.charCodeAt(0) - UNICODE_A;
            });

            while (key.length < msgLen) {
                key = key.concat(key);
            }

            key = key.slice(0, msgLen);

            return key;
        }

        function translate(msg, key) {
            return msg.map(function (charCode, index) {
                var result, t;

                t = charCode + key[index];

                t = t < 0 ? (26 + t) : t;

                result = String.fromCharCode(t % 26 + UNICODE_A);

                return result;
            }).join('');
        }

        lockFlow.defineTasks({
            'readMessage': {
                desc: '读入明文',
                body: function (msg) {
                    return msg;
                }
            },
            'fix': {
                desc: '对明文进行补位',
                body: function (msg) {
                    return fix(msg);
                }
            },
            'makeKey': {
                desc: '根据明文长度和指定密钥单词生成密钥',
                body: function (msg, reMap, setting) {
                    return makeKey(msg.length, setting.key);
                }
            },
            'translate': {
                desc: '加密明文',
                body: function (key, reMap) {
                    return translate(reMap.fix, key);
                }
            }
        });

        unlockFlow.defineTasks({
            'readCipher': {
                desc: '读入密文',
                body: function (cipher) {
                    return cipher;
                }
            },
            'fix': {
                desc: '对密文进行补位',
                body: function (cipher) {
                    return fix(cipher);
                }
            },
            'makeKey': {
                desc: '根据密文长度和指定密钥单词生成密钥',
                body: function (cipher, reMap, setting) {
                    return makeKey(cipher.length, setting.key);
                }
            },
            'reverseKeyTableCode': {
                desc: '将生成的密钥列表值取反，以便加密',
                body: function (keyTable) {
                    return keyTable.map(function (code) {
                        return -code;
                    })
                }
            },
            'translate': {
                desc: '解密密钥',
                body: function (keyTable, reMap) {
                    return translate(reMap.fix, keyTable);
                }
            }
        });

        return {
            setting: {
                key: 'deceptive'
            },
            lock: function (message) {
                return lockFlow.execute(message, {
                    'makeKey': this.setting
                })
            },
            unlock: function (cipher) {
                return unlockFlow.execute(cipher, {
                    'makeKey': this.setting
                })
            }
        }
    }());

    var SDES = (function () {
        var BINARY_SIZE = 8;
        var lockFlow = new Flow('SDES:lock');
        var unlockFlow = new Flow('SDES:unlock');

        /**
         * 二进制数位数修正
         * @param binaryStr
         * @param len
         * @private
         */
        function _fixNumber(binaryStr, len) {
            len = len || BINARY_SIZE;
            while (binaryStr.length < len) {
                binaryStr = '0' + binaryStr;
            }
            return binaryStr;
        }

        function sliceToBinaryStrArr(msg) {
            var charArr = msg.split(''),
                binaryCharCodeArr;

            binaryCharCodeArr = charArr.map(function (char) {
                var binary = (char.charCodeAt(0)).toString(2);
                return _fixNumber(binary);
            });

            return binaryCharCodeArr;
        }

        /**
         * 数组平分
         * @desc 将数组一分为二
         * @param binaryArr
         * @return {{left: (Array.<String>), right: (Array.<String>)}}
         */
        function sliceToHalf(binaryArr) {
            return {
                left: binaryArr.slice(0, binaryArr.length / 2),
                right: binaryArr.slice(binaryArr.length / 2)
            }
        }

        /**
         * 转换为Unicode字符
         * @desc 将二进制的Unicode二进制编码变成Unicode明文
         * @param {Array} binaryCharCodeArr
         * @return {string}
         */
        function translateToChar(binaryCharCodeArr) {
            var str = binaryCharCodeArr.reduce(function (pre, cur) {
                return pre + cur;
            });
            return String.fromCharCode(parseInt(str, 2));
        }

        var makeKey = (function () {
            /**
             * 左移一位,不丢弃最后一位，将其插入第一位;
             * @param keyPart
             * @return {Array.<String>}
             */
            function moveLeft(keyPart) {
                //删除第一位，将第一个元素插入最后一位
                var first = keyPart.shift();
                keyPart.push(first);

                return keyPart;
            }

            function P10(originKey, P10Setting) {
                return P10Setting.map(function (i) {
                    return originKey[i - 1];
                })
            }

            function P8(left, right, P8Setting) {
                var t = left.concat(right);
                return P8Setting.map(function (i) {
                    return t[i - 1];
                })
            }

            return function (keySetting) {
                var P10Result = P10(keySetting.origin, keySetting.P10),
                    left = P10Result.slice(0, keySetting.origin.length / 2),
                    right = P10Result.slice(keySetting.origin.length / 2),
                    maxKeyNum = 2,
                    resultKey = [];

                while (resultKey.length < maxKeyNum) {
                    //左右部分各自左移一位
                    left = moveLeft(left);
                    right = moveLeft(right);

                    resultKey.push(P8(left, right, keySetting.P8));
                }

                return resultKey;
            }
        }());

        /**
         * IP
         * @param msg
         * @param IPSetting
         * @return {Array}
         */
        function IP(msg, IPSetting) {
            return IPSetting.map(function (i) {
                return msg[i - 1];
            })
        }

        /**
         * 逆IP
         * @param msg
         * @param RIPSetting
         * @return {Array}
         */
        function reverseIP(msg, RIPSetting) {
            return RIPSetting.map(function (i) {
                return msg[i - 1];
            })
        }

        var Fk = (function () {
            /**
             * EP函数
             * 用于将4位二进制数根据EP指定下标数扩展成8位
             * @param HalfBinaryCharCodeHArr
             * @param EP {Array}
             * @return {Array}
             */
            function EP(HalfBinaryCharCodeHArr, EP) {
                return EP.map(function (i) {
                    return HalfBinaryCharCodeHArr[i - 1];
                });
            }

            /**
             * S-BOX操作
             * @param binary4
             * @param sBox
             * @return {Array}
             */
            function SBox(binary4, sBox) {
                var rowIndexBinary = '' + binary4[0] + binary4[3],
                    colIndexBinary = '' + binary4[1] + binary4[2],
                    rowIndex, colIndex, result;

                rowIndex = parseInt(rowIndexBinary, 2);
                colIndex = parseInt(colIndexBinary, 2);

                //返回二进制数
                result = sBox[rowIndex][colIndex].toString(2);

                //对返回结果进行位数修正
                result = _fixNumber(result, 2);

                return result.split('');
            }

            /**
             * P4
             * @desc 将S-Box操作的结果合并
             * @param S1Result
             * @param S2Result
             * @param P4Setting
             * @return {Array}
             */
            function P4(S1Result, S2Result, P4Setting) {
                var t = S1Result.concat(S2Result);
                return P4Setting.map(function (i) {
                    return t[i - 1];
                });
            }

            /**
             * 异或
             * @param binaryArr1
             * @param binaryArr2
             * @return {Array.<String>}
             */
            function XOR(binaryArr1, binaryArr2) {
                var s1 = binaryArr1.join(''),
                    s2 = binaryArr2.join(''),
                    binaryStr;

                binaryStr = (parseInt(s1, 2) ^ parseInt(s2, 2)).toString(2);

                binaryStr = _fixNumber(binaryStr, 4);

                return binaryStr.split('');
            }

            return function (binaryCharCodeArr, key, FkSetting) {
                var origin = sliceToHalf(binaryCharCodeArr),
                    P4Result, EPResult, tempBinary, S1Result, S2Result;

                EPResult = EP(origin.right, FkSetting.EP);

                //将EP结果和key进行异或,结果为8位二进制数
                tempBinary = XOR(EPResult, key);

                //将key加密后的密文分成两半
                tempBinary = sliceToHalf(tempBinary);

                // 分别使用S-BOX进行加密,结果是一个
                S1Result = SBox(tempBinary.left, FkSetting.S0);
                S2Result = SBox(tempBinary.right, FkSetting.S1);

                //进行P4步骤,结果是4位二进制数
                P4Result = P4(S1Result, S2Result, FkSetting.P4);

                //将P4结果与原始信息左半二进制数进行异或,并返回结果
                tempBinary = XOR(origin.left, P4Result);

                return tempBinary.concat(origin.right);
            }
        }());

        /**
         * 交换左部分和右部分
         * @param binaryArr {Array}
         * @return {Array}
         */
        function Sw(binaryArr) {
            var r = sliceToHalf(binaryArr);
            return r.right.concat(r.left);
        }

        lockFlow.defineTasks({
            'readMessage': {
                desc: '读入明文',
                body: function (message) {
                    return message;
                }
            },
            'toBinaryMessage': {
                desc: '将数据按每字符进行分割，并且将其对应的Unicode编码变成二进制',
                body: function (message) {
                    return sliceToBinaryStrArr(message);
                }
            },
            'makeKey': {
                desc: '根据Key的相关设置生成密钥',
                body: function (message, reMap, setting) {
                    return makeKey(setting.key);
                }
            },
            'translate': {
                desc: '将字符二进制编码数组进行加密，返回加密后的字符串',
                body: function (key, reMap, setting) {
                    var binaryMsg = reMap.toBinaryMessage;

                    return binaryMsg.map(function (binaryCharCodeArr) {
                        var tempBinary8;

                        tempBinary8 = IP(binaryCharCodeArr, setting.IP);

                        tempBinary8 = Fk(tempBinary8, key[0], setting.Fk);

                        tempBinary8 = Sw(tempBinary8);

                        tempBinary8 = Fk(tempBinary8, key[1], setting.Fk);

                        tempBinary8 = reverseIP(tempBinary8, setting.rIP);

                        return translateToChar(tempBinary8);
                    }).join('');
                }
            }
        });

        unlockFlow.defineTasks({
            'readCipher': {
                desc: '读入密文',
                body: function (message) {
                    return message;
                }
            },
            'toBinaryCipher': {
                desc: '将数据按每字符进行分割，并且将其对应的Unicode编码变成二进制',
                body: function (cipher) {
                    return sliceToBinaryStrArr(cipher);
                }
            },
            'makeKey': {
                desc: '根据Key的相关设置生成密钥',
                body: function (cipher, reMap, setting) {
                    return makeKey(setting.key);
                }
            },
            'translate': {
                desc: '将字符二进制编码数组进行加密，返回加密后的字符串',
                body: function (key, reMap, setting) {
                    var binaryMsg = reMap.toBinaryCipher;

                    return binaryMsg.map(function (binaryCharCodeArr) {
                        var tempBinary8;

                        tempBinary8 = IP(binaryCharCodeArr, setting.IP);

                        tempBinary8 = Fk(tempBinary8, key[1], setting.Fk);

                        tempBinary8 = Sw(tempBinary8);

                        tempBinary8 = Fk(tempBinary8, key[0], setting.Fk);

                        tempBinary8 = reverseIP(tempBinary8, setting.rIP);

                        return translateToChar(tempBinary8);
                    }).join('');
                }
            }
        });

        return {
            setting: {
                key: {
                    origin: [0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
                    P10: [3, 5, 2, 7, 4, 10, 1, 9, 8, 6],
                    P8: [6, 3, 7, 4, 8, 5, 10, 9]
                },
                Fk: {
                    EP: [4, 1, 2, 3, 2, 3, 4, 1],
                    P4: [2, 4, 3, 1],
                    S0: [
                        [1, 0, 3, 2],
                        [3, 2, 1, 0],
                        [0, 2, 1, 3],
                        [3, 1, 3, 2]
                    ],
                    S1: [
                        [0, 1, 2, 3],
                        [2, 0, 1, 3],
                        [3, 0, 1, 0],
                        [2, 1, 0, 3]
                    ]
                },
                IP: [2, 6, 3, 1, 4, 8, 5, 7],
                rIP: [4, 1, 3, 5, 7, 2, 8, 6]
            },
            lock: function (message) {
                return lockFlow.execute(message, {
                    'makeKey': this.setting,
                    'translate': this.setting
                })
            },
            unlock: function (cipher) {
               return unlockFlow.execute(cipher, {
                   'makeKey': this.setting,
                   'translate': this.setting
               })
            }
        }
    }());

    win.Algorithm = {
        Caesar: Caesar,
        Playfair: Playfair,
        Hill: Hill,
        Vigenere: Vigenere,
        SDES: SDES
    }
}(window, Flow));