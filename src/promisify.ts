import Promise1, { RejectType, ResolveType } from "./promise1";

export default function promisify(fn: Function) {
  return (...args: any[]) => {
    return new Promise1((resolve: ResolveType, reject: RejectType) => {
      fn(...args, (err: Error, data: any) => {
        if (err) reject(err);
        resolve(data);
      });
    });
  }
}