// 三种状态 等待中/已成功/已失败
enum PromiseState {
  PENDING = "PENDING",
  FULFILLED = "FULFILLED",
  REJECTED = "REJECTED",
}

const resolvePromise = (
  promise2: Promise1,
  x: any,
  resolve: (value: any) => void,
  reject: (reason: any) => void,
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
            if (isCalled) {
              return;
            }
            isCalled = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          (r: any) => {
            if (isCalled) {
              return;
            }
            isCalled = true;
            reject(r);
          },
        )
      } else {
        resolve(x)
      }
    } catch (error) {
      if (isCalled) {
        return;
      }
      isCalled = true;
      reject(error)
    }
  } else {
    resolve(x);
  }
}

export default class Promise1 {
  value: any;   // 成功 返回值
  reason: any;  // 失败 返回值
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
    const resolve = (value: any): Promise1 | void => {
      if (this.state === PromiseState.PENDING) {
        this.state = PromiseState.FULFILLED;
        this.value = value;
        this.onFulfilledCbs.forEach(callback => {
          callback();
        })
      }
    }

    const reject = (reason: any) => {
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
  // 根据3.1提示，需异步执行 onFulfilled/onRejected
  then(onFulfilled?: Function, onRejected?: Function) {
    const newOnFulfilled = typeof onFulfilled === "function" ? onFulfilled : (v: any) => v;
    const newOnRejected = typeof onRejected === "function" ? onRejected : (err: Error) => { throw err };
    let promise2 = new Promise1((resolve: (value: any) => void, reject: (reason: any) => void) => {
      // 已成功
      if (this.state === PromiseState.FULFILLED) {
        setTimeout(() => {
          try {
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
    return promise2;
  }

}