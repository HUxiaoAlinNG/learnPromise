"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = require("./promise");
exports.Promise1 = promise_1.default;
promise_1.default.defer = promise_1.default.deferred = () => {
    const test = {};
    test.promise = new promise_1.default((resolve, reject) => {
        test.resolve = resolve;
        test.reject = reject;
    });
    return test;
};
