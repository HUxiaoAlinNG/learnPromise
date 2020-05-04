import Promise1 from "./promise1";
const promisesAplusTests = require("promises-aplus-tests");

(Promise1 as any).defer = (Promise1 as any).deferred = () => {
  const test: {
    promise?: Promise1,
    resolve?: any,
    reject?: any,
  } = {};
  test.promise = new Promise1((resolve: any, reject: any) => {
    test.resolve = resolve;
    test.reject = reject;
  })

  return test;
}

promisesAplusTests(Promise1, function (err: any) {
  console.log(err)
});
