// 三种状态 等待中/已成功/已失败
enum PromiseState {
  PENDING = "PENDING",
  FULFILLED = "FULFILLED",
  REJECTED = "REJECTED",
}

export type ResolveType = (value: any) => void;
export type RejectType = (reason: any) => void;

const isPromise = (param: any): boolean => {
  if (typeof param === "function" || (typeof param === "object" && param !== null)) {
    try {
      if (typeof param.then === "function") {
        return true;
      }
    } catch (error) {
      return false;
    }
  }
  return false;
}

const isAllDone = (index: number, len: number): boolean => {
  if (index === len) {
    return true;
  }
  return false;
}

// 根据规范2.3 The Promise Resolution Procedure进行实现
// 兼容所有符合Promises/A+规范 库
const resolvePromise = (
  promise2: Promise1,
  x: any,
  resolve: ResolveType,
  reject: RejectType,
) => {
  // 规范2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason
  // 报类型错误
  if (promise2 === x) {
    return reject(TypeError("不能使用同一个promise"));
  }
  // 规范2.3.3.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored.
  let isCalled = false;
  // 规范2.3.3 Otherwise, if x is an object or function
  if ((typeof x === "object" && x !== null) || typeof x === "function") {
    try {
      const then = x.then;
      // 规范2.3.3.3 If then is a function, call it with x as this, first argument resolvePromise, and second argument rejectPromise
      if (typeof then === "function") {
        then.call(
          x,
          // 递归，避免y还是promise
          (y: any) => {
            if (isCalled) return;
            isCalled = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          (r: any) => {
            if (isCalled) return;
            isCalled = true;
            reject(r);
          },
        )
      } else {
        resolve(x)
      }
    } catch (error) {
      if (isCalled) return;
      isCalled = true;
      reject(error)
    }
  } else {
    resolve(x);
  }
}

export default class Promise1 {
  value: any;   // 成功 返回值,规范1.3 “value” is any legal JavaScript value (including undefined, a thenable, or a promise).
  reason: any;  // 失败 返回值,规范1.5 “reason” is a value that indicates why a promise was rejected.
  onFulfilledCbs: Function[];  // 收集 成功后执行的 函数
  onRejectedCbs: Function[];   // 收集 失败后执行的 函数
  state: PromiseState  // promise 状态

  constructor(executor: Function) {
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCbs = [];
    this.onRejectedCbs = [];
    this.state = PromiseState.PENDING; // 刚开始为 等待中

    // 内部提供两个方法，resolve/reject，用来更改状态
    // resolve 触发成功状态，reject触发失败状态
    // 状态只能从 等待中 => 已成功 或者 等待中 => 已失败
    const resolve: ResolveType = (value) => {
      if (value instanceof Promise1) {
        value.then(resolve, reject);
        return;
      }
      if (this.state === PromiseState.PENDING) {
        this.state = PromiseState.FULFILLED;
        this.value = value;
        this.onFulfilledCbs.forEach(callback => {
          callback();
        })
      }
    }

    const reject: RejectType = (reason) => {
      if (this.state === PromiseState.PENDING) {
        this.state = PromiseState.REJECTED;
        this.reason = reason;
        this.onRejectedCbs.forEach(callback => {
          callback();
        })
      }
    }
    try {
      // Promise构造函数执行时立即调用executor 函数， resolve 和 reject 两个函数作为参数传递给executor
      executor(resolve, reject);
    } catch (error) {
      reject(error);
    }
  }
  // 规范2.2.4 onFulfilled or onRejected must not be called until the execution context stack contains only platform code. [3.1].
  // 根据3.1提示，需异步执行 onFulfilled/onRejected (此函数实现使用setTimeout)
  then(onFulfilled?: Function, onRejected?: Function): Promise1 {
    const newOnFulfilled = typeof onFulfilled === "function" ? onFulfilled : (v: any) => v;
    const newOnRejected = typeof onRejected === "function" ? onRejected : (err: Error) => { throw err };
    const promise2 = new Promise1((resolve: ResolveType, reject: RejectType) => {
      // 已成功
      if (this.state === PromiseState.FULFILLED) {
        setTimeout(() => {
          try {
            // 规范 2.2.2.1 it must be called after promise is fulfilled, with promise’s value as its first argument,故为newOnFulfilled(this.value)
            const x = newOnFulfilled(this.value);
            resolvePromise(promise2, x, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0)
      }
      // 已失败
      if (this.state === PromiseState.REJECTED) {
        setTimeout(() => {
          try {
            // 规范2.2.3.1 it must be called after promise is rejected, with promise’s reason as its first argument,故为newOnRejected(this.reason)
            const r = newOnRejected(this.reason);
            resolvePromise(promise2, r, resolve, reject);
          } catch (error) {
            reject(error);
          }
        }, 0);
      }
      // 等待中
      if (this.state === PromiseState.PENDING) {
        this.onFulfilledCbs.push(() => {
          setTimeout(() => {
            try {
              const x = newOnFulfilled(this.value);
              resolvePromise(promise2, x, resolve, reject);
            } catch (error) {
              reject(error);
            }
          }, 0)
        });
        this.onRejectedCbs.push(() => {
          setTimeout(() => {
            try {
              const r = newOnRejected(this.reason);
              resolvePromise(promise2, r, resolve, reject);
            } catch (error) {
              reject(error);
            }
          }, 0);
        })
      }
    });
    // 规范2.2.7 then must return a promise [3.3].
    return promise2;
  }

  // 拓展 all方法
  static all(params: any[]) {
    return new Promise1((resolve: ResolveType, reject: RejectType) => {
      if (!Array.isArray(params)) {
        reject(TypeError("传入数组形式"));
      }
      const len = params.length;
      let inx = 0;
      const arr = new Array(len);
      let param: any;
      for (let i = 0; i < len; i++) {
        param = params[i];
        if (isPromise(param)) {
          param
            .then(
              (data: any) => {
                arr[i] = data;
                inx++;
                if (isAllDone(inx, len)) {
                  resolve(arr);
                }
              },
              reject
            )
        } else {
          arr[i] = param;
          inx++;
          if (isAllDone(inx, len)) {
            resolve(arr);
          }
        }
      }
    });
  }

  // 拓展 resolve方法
  static resolve(value: any) {
    return new Promise1((resolve: ResolveType, reject: RejectType) => {
      resolve(value);
    });
  }

  // 拓展 reject方法
  static reject(reason: any) {
    return new Promise1((resolve: ResolveType, reject: RejectType) => {
      reject(reason);
    });
  }

  // 拓展 race方法
  static race(params: any[]) {
    return new Promise1((resolve: ResolveType, reject: RejectType) => {
      if (!Array.isArray(params)) {
        reject(TypeError("传入数组形式"));
      }
      const len = params.length;
      let param: any;
      for (let i = 0; i < len; i++) {
        param = params[i];
        if (isPromise(param)) {
          param
            .then(
              (data: any) => {
                resolve(data);
              },
              reject
            )
        } else {
          console.log("222promise")
          resolve(param)
        }
      }
    });
  }

  // 拓展 catch方法
  catch(catchCallback: Function): Promise1 {
    return this.then(undefined, catchCallback)
  }

  // 拓展finally
  finally(finallyCallback: Function) {
    return this.then(
      () => Promise1.resolve(finallyCallback()).then((value: any) => value),
      () => Promise1.reject(finallyCallback()).then((reason: any) => { throw reason })
    )
  }
}