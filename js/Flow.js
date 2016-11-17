/**
 * File Description
 * Author: Colorless.
 * Date: 2016/11/16
 * Project: encryption
 */
(function (win) {
    'use strict';
    /**
     * 工作流
     * @classdesc 用于将多个任务形成工作流,每一个任务的结果作为下一个任务的输入，仅支持同步操作
     * @constructor
     */
    var Flow = function () {
        this.tasks = [];
    };

    /**
     * 添加任务
     * @param tasks
     */
    Flow.prototype.push = function (tasks) {
        this.tasks = tasks;
    };

    Flow.prototype.run = function () {
        var tasks = this.tasks,
            previousTaskResult;
        tasks.forEach(function (task) {
            if (typeof task === 'function') {
                previousTaskResult = task.call(null ,previousTaskResult);
            } else if(typeof task === 'object'){
                task.callback.call(task.context, previousTaskResult, task.param);
            }
        })
    };

    win.Flow = Flow;
}(window));
