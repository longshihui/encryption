/**
 * File Description
 * Author: Colorless.
 * Date: 2016/11/7
 * Project: encryption
 */
(function (win) {
    'use strict';
    var HEAD_SELECTOR = '.tab-head',
        BODY_SELECTOR = '.tab-body';
    function changeHeadState(curLi){
        var lis = curLi.parentNode.children;
        Array.prototype.slice.call(lis, 0).forEach(function (li) {
            li.className = li.className.replace('active', '');
        });
        var className = curLi.className === '' ? [] : curLi.className.split(' ');
        className.push('active');
        curLi.className = className.join(' ');
    }
    function initHeadState() {
        var tabName = location.hash;
        var lis = Array.prototype.slice.call(this.head.children, 0);
        var resultLi = lis.find(function (li) {
            return li.children[0].hash === tabName;
        });
        var index = resultLi === undefined? 0: lis.indexOf(resultLi);
        changeHeadState(lis[index]);
    }
    function toggleHeadState(e) {
        var li = e.target || e.srcElement;
        if (li.nodeName === 'A') {
            li = li.parentNode;
        }else {
            location.hash = li.children[0].hash;
        }
        changeHeadState(li);
    }

    function Tab(wrapSelector) {
        this.wrap = document.querySelector(wrapSelector);
        this.head = this.wrap.querySelector(HEAD_SELECTOR);
    }

    Tab.prototype.init = function () {
        initHeadState.call(this);
        this.head.addEventListener('click', toggleHeadState, false);
    };

    win.Tab = Tab;

}(window));
