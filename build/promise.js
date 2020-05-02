"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// 三种状态 等待中/已成功/已失败
var PromiseState;
(function (PromiseState) {
    PromiseState["PENDING"] = "PENDING";
    PromiseState["FULFILLED"] = "FULFILLED";
    PromiseState["REJECTED"] = "REJECTED";
})(PromiseState || (PromiseState = {}));
class Promise1 {
    constructor(executor) {
        this.value = undefined;
        this.reason = undefined;
        this.onFulfilledCbs = [];
        this.onRejectedCbs = [];
        this.state = PromiseState.PENDING; // 刚开始为 等待中
        // 状态只能从 等待中 => 已成功 或者 等待中 => 已失败
        const resolve = (value) => {
            if (this.state === PromiseState.PENDING) {
                this.state = PromiseState.FULFILLED;
                this.value = value;
                this.onFulfilledCbs.forEach(callback => {
                    callback();
                });
            }
        };
        const reject = (reason) => {
            if (this.state === PromiseState.PENDING) {
                this.state = PromiseState.REJECTED;
                this.reason = reason;
                this.onRejectedCbs.forEach(callback => {
                    callback();
                });
            }
        };
        try {
            executor(resolve, reject);
        }
        catch (error) {
            reject(error);
        }
    }
    then(onFulfilled = (v) => v, onRejected = (err) => { throw err; }) {
        if (this.state === PromiseState.FULFILLED) {
            this.onFulfilledCbs.push(onFulfilled);
        }
        if (this.state === PromiseState.REJECTED) {
            this.onRejectedCbs.push(onRejected);
        }
    }
}
exports.default = Promise1;
