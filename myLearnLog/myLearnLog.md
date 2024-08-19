# Scheduler.ts
## Task数据结构
```js
export interface Task {
  id: number;
  callback: Callback; // 任务执行的回调函数
  priorityLevel: PriorityLevel; // 优先级
  startTime: number; // 开始时间 --- 任务开始调度的时间(performance.now() + delay?)
  expirationTime: number; // 过期时间 startTime + timeout(等待时间，与优先级相关)
  sortIndex: number; // 最小堆中的排序依据
}
```
## 两个任务队列taskQueue & timerQueue，不用每次全排序，使用最小堆
## 在taskQueue 和 timerQueue间调度任务
考虑优先级和只能有一个任务在倒计时
## 在时间切片内执行任务wookLoop() --- taskQueue
+ 单线程机制 --- 时间切片
+ currentTask --- 全局变量 --- 可以打断，配合while循环
+ 每次执行完都去timerQueue中检查是否有新的过期任务(这也是为什么说执行完微任务队首的任务后，再去执行宏任务队列的底层原因之一)