/**
 * 页面逻辑
 * Author: Colorless.
 * Date: 2016/11/22
 * Project: encryption
 */
var view = (function (win, Flow, Algorithm, Pubsub, template) {
    'use strict';
    var pageInitFlow = new Flow('page-init');

    var Observer = function () {
        this.lockCache = [];
        this.unlockCache = [];
        this.mode = 'lock';
    };

    Observer.prototype = Object.create(Pubsub.Observer.prototype);

    Observer.prototype.setSubscribe = function (name, mode) {
        Flow.subscribe(name + ':' + mode, this);
        this.mode = mode;
    };

    Observer.prototype.getRecordData = function () {
        return {
            lock: this.lockCache,
            unlock: this.unlockCache
        }
    };

    Observer.prototype.receive = function (msg) {
        if (this.mode === 'lock') {
            this.lockCache.push(msg);
        } else {
            this.unlockCache.push(msg);
        }
    };

    Observer.prototype.clear = function () {
        this.lockCache = [];
        this.unlockCache = [];
    };

    var listener = new Observer();

    function formatData(data) {
        var result = '';
        if (Array.isArray(data) && Array.isArray(data[0])) {
            result = data.map(function (v) {
                return v.join(', ')
            }).join('<br />');
        } else {
            result = data.toString();
        }
        return result;
    }

    var Nav = (function () {
        var chooseList;

        function draw() {
            var algorithmNames = Object.keys(Algorithm);
            chooseList.innerHTML = template('algorithm-names-template', {
                names: algorithmNames
            });
        }

        function defaultActive() {
            chooseList.firstElementChild.dispatchEvent(new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            }));
        }

        function toggleState(li) {
            Array.prototype.slice.call(chooseList.children, 0).forEach(function (elem) {
                elem.classList.remove('active');
            });
            li.classList.add('active');
        }

        function getSelect() {
            return chooseList.querySelector('.active').dataset.name;
        }

        return {
            init: function (elem, content, aside) {
                var self = this;
                chooseList = elem;

                draw();

                chooseList.addEventListener('click', function (e) {
                    self.toggleState(e.target);
                    var algorithmName = self.getSelect();
                    content.clear();
                    aside.clear();
                    aside.draw(Algorithm[algorithmName].setting);
                });

                defaultActive();
            },
            toggleState: toggleState,
            getSelect: getSelect
        }
    }());

    var Content = (function () {
        var stepBody;

        return {
            init: function (elem) {
                stepBody = elem;
            },
            clear: function () {
                stepBody.innerHTML = '';
            },
            draw: function (listener) {
                var data = listener.getRecordData();
                var lockHtml = template('step-content-template', {
                    title: '加密',
                    stepList: data.lock
                });
                var unlockHtml = template('step-content-template', {
                    title: '解密',
                    stepList: data.unlock
                });
                stepBody.innerHTML = lockHtml + unlockHtml;
            }
        }
    }());

    var Aside = (function () {
        var settingBody;

        var LIST_HTML = '<ul class="setting-list">{body}</ul>';

        var ITEM_HTML = '<li>'
            + '<h3 class="setting-name">{name}</h3>'
            + '<p class="setting-detail">'
            + '{value}'
            + '</p>'
            + '</li>';

        function getHtml(setting) {
            var body = Object.keys(setting).map(function (name) {
                var t = ITEM_HTML.replace('{name}', name),
                    v;
                if (Object.getPrototypeOf(setting[name]) === Object.prototype) {
                    v = getHtml(setting[name]);
                } else {
                    v = formatData(setting[name]);
                }
                return t.replace('{value}', v);
            }).join('');
            return LIST_HTML.replace('{body}', body);
        }

        return {
            init: function (elem) {
                settingBody = elem;
            },
            clear: function () {
                settingBody.innerHTML = '';
            },
            draw: function (setting) {
                settingBody.innerHTML = getHtml(setting);
            }
        }
    }());

    var Form = (function () {
        var input, btn;

        return {
            init: function (elem, content) {
                input = elem.querySelector('.input');
                btn = elem.querySelector('.btn');

                btn.addEventListener('click', function () {
                    var algorithmName = Nav.getSelect(),
                        message = input.value,
                        cipher;

                    listener.clear();

                    listener.setSubscribe(algorithmName, 'lock');

                    cipher = Algorithm[algorithmName].lock(message);

                    listener.setSubscribe(algorithmName, 'unlock');

                    Algorithm[algorithmName].unlock(cipher);

                    content.draw(listener);

                })

            }
        }
    }());

    pageInitFlow.defineTasks({
        'requireDOM': {
            body: function () {
                return {
                    chooseList: document.querySelector('.choose-list'),
                    stepBody: document.querySelector('.step-body'),
                    settingBody: document.querySelector('.setting-body'),
                    form: document.querySelector('.form')
                }
            }
        },
        'initComponent': {
            body: function (preResult) {
                Content.init(preResult.stepBody);
                Aside.init(preResult.settingBody);
                Form.init(preResult.form, Content);
                Nav.init(preResult.chooseList, Content, Aside);
            }
        }
    });

    return {
        init: function () {
            win.addEventListener('load', function () {
                pageInitFlow.execute();
            })
        }
    }
}(window, Flow, Algorithm, Pubsub, template));
