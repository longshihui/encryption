/**
 * File Description
 * Author: Colorless.
 * Date: 2016/11/16
 * Project: encryption
 */
(function (win, Pubsub) {
    'use strict';
    var FlowMap = {};

    /**
     * 工作流
     * @classdesc 用于将多个任务形成工作流,每一个任务的结果作为下一个任务的输入，仅支持同步操作
     * @param name
     * @constructor
     */
    var Flow = function (name) {
        this.tasks = [];

        Flow.addFlow(name, this);
    };

    Flow.prototype = Object.create(Pubsub.Subject.prototype);

    Flow.super = Pubsub.Subject.prototype;

    Flow.prototype.constructor = Flow;

    /**
     * 添加工作流
     * @param name
     * @param flow
     */
    Flow.addFlow = function (name, flow) {
        if (!name) {
            throw new Error("name cannot is empty");
        }

        if (!(flow instanceof Flow)) {
            throw new Error("flow is not a Flow's instance");
        }

        Object.defineProperty(FlowMap, name, {
            value: flow,
            writable: true,
            enumerable: true,
            configurable: true
        });
    };

    /**
     * 删除工作流
     * @param name
     */
    Flow.removeFlow = function (name) {
        delete FlowMap[name];
    };

    /**
     * 订阅
     * @static
     * @param name
     * @param observer
     */
    Flow.subscribe = function (name, observer) {
        var flow = null;
        //查找指定名字的工作流
        Object.keys(FlowMap).forEach(function (flowName) {
            if (flowName === name) {
                flow = FlowMap[flowName];
                return false;
            }
        });
        //未找到则抛出异常
        if (flow === null) {
            throw new Error('not found ' + name + ' Flow');
        }

        flow.subscribe(observer);
    };

    /**
     * 定义任务
     * @param task
     */
    Flow.prototype.defineTask = function (task) {
        this.tasks.push({
            name: task.name || '',
            desc: task.desc || '',
            body: task.body || function () {
            }
        })
    };

    /**
     * 同时定义多个任务
     * @param tasks
     */
    Flow.prototype.defineTasks = function (tasks) {
        var that = this;
        Object.keys(tasks).forEach(function (taskName) {
            that.defineTask({
                name: taskName,
                desc: tasks[taskName].desc,
                body: tasks[taskName].body
            })
        });
    };

    /**
     * 执行任务
     * @param initial
     * @param {*} params
     */
    Flow.prototype.execute = function (initial, params) {
        params = params || {};
        var tasks = this.tasks,
            self = this,
            resultMap = {},
            previousTaskResult = initial;
        tasks.forEach(function (task) {
            previousTaskResult = task.body.apply(null, [previousTaskResult, resultMap, params[task.name]]);
            resultMap[task.name] = previousTaskResult;
            self.publish({
                name: task.name,
                desc: task.desc,
                result: previousTaskResult,
                resultSMap: resultMap
            });
        });

        return previousTaskResult;
    };
    /**
     * 实例订阅
     * @param observer
     */
    Flow.prototype.subscribe = function (observer) {
        Flow.super.subscribe.call(this, observer);
    };

    win.Flow = Flow;
}(window, Pubsub));
