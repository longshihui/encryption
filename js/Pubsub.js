/**
 * File Description
 * Author: Colorless.
 * Date: 2016/11/18
 * Project: encryption
 */
(function (win) {
    'use strict';

    var Observer = function () {
    };

    Observer.prototype.receive = function (msg) {
    };

    var Subject = function () {};

    Subject.prototype._observer = [];

    Subject.prototype.subscribe = function (observer) {
        if (!(observer instanceof Observer)){
            throw new Error('observer is not a Observer instance');
        }

        var index = this._observer.indexOf(observer);

        if (index < 0) {
            this._observer.push(observer);
        }
    };

    Subject.prototype.publish = function (msg) {
       this._observer.forEach(function (o) {
           o.receive(msg);
       })
    };

    win.Pubsub = {
        Observer: Observer,
        Subject: Subject
    }
}(window));
