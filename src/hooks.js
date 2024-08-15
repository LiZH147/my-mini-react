import { scheduleUpdateOnFiber } from "./ReactFiberWorkLoop";

/**
 * 1. 状态值和hook等挂在哪里？ --- 函数组件的fiber上 --- 怎么获取当前的fiber --- 涉及到workLoop文件
 * 2. 获取当前正要渲染的hook
 *  1.拿到当前的hook: current = currentlyRenderingFiber.alternate;
 *    workInProgressHook指向当前正处理的hook，初始为null
 *    + current空为初次渲染---初始化hook
 *      1. 定义hook对象(memorizedState + next)
 *      2. workInProgressHook为空，则为hook0，挂在currentlyRenderingFiber.memorizedState上
 *      3. workInProgressHook非空，挂在workInProgressHook.next上
 *    + current非空为组件更新---按顺序找下一个hook
 *      1.初始化 正要更新的fiber 上的hook0为当前fiber的fiber0
 *      2. workInProgressHook为空，则将当前工作hook和要返回的hook都指向currentlyRenderingFiber.memorizedState
 *      3. workInProgressHook非空，则都指向next
 * 3. 判断是不是初次渲染 --- currentlyRenderingFiber.alternate
 *      初次渲染传入initalState
 * 4. dispatch执行传入的回调函数
 *  1. 更新hook上的memorizedState
 *  2. 更新fiber节点上的alternate
 *  3. 调用scheduleUpdateOnFiber(currentlyRenderingFiber)从当前节点开始更新
 *  4. 返回[hook.memorizedState, dispatch]
 */

let currentlyRenderingFiber = null; // 当前需要更新hook的fiber节点
let workInProgressHook = null; // 当前更新到哪个hook了

// 获取当前要更新hook的fiber --- 只在函数组件渲染或更新时调用一次
export function renderWithHooks(wip) {
    currentlyRenderingFiber = wip;
    currentlyRenderingFiber.memorizedState = null;
    workInProgressHook = null;
}
function updateWorkInProgressHook() {
    let hook;
    const current = currentlyRenderingFiber.alternate; // 当前更新fiber节点的老hook0
    if (current) {
        // 组件更新
        currentlyRenderingFiber.memorizedState = current.memorizedState;
        if (workInProgressHook) {
            workInProgressHook = hook = workInProgressHook.next
        } else {
            // hook0
            workInProgressHook = hook = currentlyRenderingFiber.memorizedState;
        }
    } else {
        // 组件初次渲染 --- 初始化hook链表
        hook = {
            memorizedState: null,
            next: null
        }
        if (workInProgressHook) {
            workInProgressHook = workInProgressHook.next = hook;
        } else {
            // hook0
            workInProgressHook = currentlyRenderingFiber.memorizedState = hook;
        }
    }
    return hook;
}
export function useReducer(reducer, initalState) {
    
    const hook = updateWorkInProgressHook();

    if (!currentlyRenderingFiber.alternate) {
        hook.memorizedState = initalState;
    }
    // const dispatch = () => {
    //     hook.memorizedState = reducer(hook.memorizedState);
    //     currentlyRenderingFiber.alternate = {...currentlyRenderingFiber};
    //     scheduleUpdateOnFiber(currentlyRenderingFiber); // 从当前函数节点开始更新
    //     console.log('useReducer dispatch');
    // }
    const dispatch = dispatchReducerAction.bind(
        null,
        currentlyRenderingFiber,
        hook,
        reducer
    );
    return [hook.memorizedState, dispatch]
}

function dispatchReducerAction(fiber, hook, reducer, action) {
    hook.memorizedState = reducer ? reducer(hook.memorizedState) : action;
    fiber.alternate = { ...fiber };
    fiber.sibling = null; // 在commit中会提交兄弟节点，但此处不应该更新兄弟节点
    scheduleUpdateOnFiber(fiber);
    console.log('dispatchReducerAction');

}

export function useState(initalState) {
    return useReducer(null, initalState);
}