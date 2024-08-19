import { push, pop, peek } from "./SchedulerMinHeap";
import { getCurrentTime, isFn, isObject } from "shared/utils";
import {
  getTimeoutByPriorityLevel,
  NormalPriority,
  PriorityLevel,
} from "./SchedulerPriorities";

type Callback = any; // (args: any) => void | any;

export interface Task {
  id: number;
  callback: Callback;
  priorityLevel: PriorityLevel;
  startTime: number;
  expirationTime: number;
  sortIndex: number;
}

type HostCallback = (hasTimeRemaining: boolean, currentTime: number) => boolean;

// 任务存储，最小堆
const taskQueue: Array<Task> = [];
const timerQueue: Array<Task> = [];

let taskIdCounter: number = 1;

let currentTask: Task | null = null;
let currentPriorityLevel: PriorityLevel = NormalPriority;

// 在计时
let isHostTimeoutScheduled: boolean = false;

// 在调度任务
let isHostCallbackScheduled = false;
// This is set while performing work, to prevent re-entrance.
let isPerformingWork = false;

let schedulePerformWorkUntilDeadline: Function;

let isMessageLoopRunning = false;
let scheduledHostCallback: HostCallback | null = null;
let taskTimeoutID: number = -1;

let startTime = -1;

let needsPaint = false;

// Scheduler periodically yields in case there is other work on the main
// thread, like user events. By default, it yields multiple times per frame.
// It does not attempt to align with frame boundaries, since most tasks don't
// need to be frame aligned; for those that do, use requestAnimationFrame.
let frameInterval = 5; //frameYieldMs;

function cancelHostTimeout() {
  clearTimeout(taskTimeoutID);
  taskTimeoutID = -1;
}

// 开启倒计时，等待执行callback
function requestHostTimeout(callback: Callback, ms: number) {
  taskTimeoutID = setTimeout(() => {
    callback(getCurrentTime());
  }, ms)
}

// 倒计时结束时，timerQueue中可能还有其它任务也到期了，一并合并到taskQueue中
function advanceTimers(currentTime: number) {
  let timer: Task = peek(timerQueue) as Task;
  while (timer !== null) {
    if (timer.callback === null) {
      // 任务还没开始排队就失效了
      pop(timerQueue);
    } else if (timer.startTime <= currentTime) {
      // 任务到期
      pop(timerQueue);
      timer.sortIndex = timer.expirationTime;
      push(taskQueue, timer);
    } else {
      return;
    }
    timer = peek(timerQueue) as Task;
  }
}

/**
 * 倒计时结束，准备尝试执行task
 * 特别注意：执行的必须是taskQueue中的任务，timerQueue中的任务挪动到taskQueue中
 * 考虑每次只对一个任务进行倒计时setTimeout --- isHostTimeoutScheduled 在scheduleCallback中做开关
 * 考虑优先级：调用cancelHostTimeout取消当前的倒计时
 */
function handleTimeout(currentTime: number) {
  isHostTimeoutScheduled = false;
  advanceTimers(currentTime);

  // 开始调度任务
  if (!isHostCallbackScheduled) {
    // 当前没有任务正在被调度
    if (peek(taskQueue) !== null) {
      // taskQueue中还有任务没有执行完
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    } else {
      // 可以调度timerQueue中的任务了
      const firstTimer: Task = peek(timerQueue) as Task;
      if (firstTimer !== null) {
        requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
      }
    }
  }
}

function requestHostCallback(callback: Callback) { }

function flushWork() { }

function workLoop(hasTimeRemaining: boolean, initialTime: number) {
  let currentTime = initialTime;

  advanceTimers(currentTime);
  currentTask = peek(taskQueue) as Task;

  while (currentTask !== null) {
    if (currentTask.expirationTime > currentTime && !hasTimeRemaining) {
      // 当前任务没过期，且当前时间片没有剩余时间
      break;
    }
    // 下面执行任务的回调函数
    const callback = currentTask.callback;
    if (isFn(callback)) {
      currentTask.callback = null;
      // 传递是否过期，并将该时间片内未完成的任务传递回来
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      const continuationCallback = callback(didUserCallbackTimeout);

      currentTime = getCurrentTime();
      if (isFn(continuationCallback)) {
        // 任务没有执行完
        currentTask.callback = continuationCallback;;
        advanceTimers(currentTime);
        return;
      } else {
        // 任务执行完，在taskQueue中移除该任务
        // 由于taskQueue是动态变换的，所以需要对比一下，不能直接移除堆顶元素
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
        advanceTimers(currentTime);
      }
    } else {
      // currentTask不是有效任务
      pop(taskQueue);
    }

    currentTask = peek(taskQueue) as Task;
  }
}

export function scheduledCallback(priorityLevel: PriorityLevel, callback: Callback, options?: { delay: number }) {
  const currentTime = getCurrentTime(); // 任务进入调度器的时间
  let startTime: number;
  if (isObject(options) && options !== null) {
    let delay = options?.delay;
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  const timeout = getTimeoutByPriorityLevel(priorityLevel)
  const expirationTime = startTime + timeout;

  const newTask = {
    id: taskIdCounter++,
    callback,
    startTime,
    expirationTime,
    sortIndex: -1
  };

  if (startTime > currentTime) {
    // 有延迟的任务
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);

    // taskQueue中没有任务，且timerQueue中有任务时，才开始倒计时，push到taskQueue
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // 是否有任务正在倒计时，保证只有一个任务在倒计时
      if (isHostTimeoutScheduled) {
        // 有任务在倒计时，且此时还有任务被调度，说明优先级比较高
        cancelHostTimeout();
      } else {
        isHostTimeoutScheduled = true;
      }
      requestHostTimeout(handleTimeout, startTime - currentTime);
    }
  } else {
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
  }
}