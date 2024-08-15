import { Placement, Update, updateNode } from "./utils";
import { updateClassComponent, updateFragmentComponent, updateFunctionComponent, updateHostComponent, updateHostTextComponent } from "./ReactFiberReconciler";
import { ClassComponent, Fragment, FunctionComponent, HostComponent, HostText } from "./ReactWorkTags";
import { scheduleCallback } from "./scheduler";

let wip = null; // work in progess 当前正在工作中的
let wipRoot = null;

// 初次渲染和更新
export function scheduleUpdateOnFiber(fiber) {
    wip = fiber;
    wipRoot = fiber;

    scheduleCallback(workLoop)
}
function performUnitOfWork() {
    // console.log('wip', wip);

    // 1. 更新当前节点
    const { tag } = wip;
    switch (tag) {
        case HostComponent:
            updateHostComponent(wip);
            break;
        case FunctionComponent:
            updateFunctionComponent(wip);
            break;
        case ClassComponent:
            updateClassComponent(wip);
            break;
        case Fragment:
            updateFragmentComponent(wip);
            break;
        case HostText:
            updateHostTextComponent(wip);
            break;
        default:
            break;
    }

    // 2. 下一个更新谁
    if (wip.child) {
        wip = wip.child;
        return;
    }

    let next = wip;
    while (next) {
        if (next.sibling) {
            wip = next.sibling;
            return;
        }
        next = next.return;
    }

    wip = null;
}

function workLoop(IdleDeaLine) {
    while (wip) {
        performUnitOfWork();
    }

    if (!wip && wipRoot) {
        commitRoot();
    }
}

// requestIdleCallback(workLoop)

// 提交
function commitRoot() {
    commitWorker(wipRoot)
    wipRoot = null;
}

function commitWorker(wip) {
    if (!wip) {
        return;
    }

    // 1. 提交自己 -- 将自己挂在父结点上
    const parentNode = getParentNode(wip.return); // 只有原生节点能这么处理, 函数组件和类组件会返回一个函数, 不能这么做
    const { flags, stateNode } = wip;
    if (flags & Placement && stateNode) {
        parentNode.appendChild(stateNode)
    }

    if (flags & Update && stateNode) {
        updateNode(stateNode, wip.alternate.props, wip.props);
    }

    if(wip.deletions){
        commitDeletions(wip.deletions, stateNode || parentNode);
    }
    // 2. 提交子节点
    commitWorker(wip.child);
    // 3. 提交兄弟节点
    commitWorker(wip.sibling)
}

function getParentNode(node) {
    let tem = node;
    while (tem) {
        if (tem.stateNode) {
            return tem.stateNode;
        }
        tem = tem.return;
    }
}

function commitDeletions(deletions, parentNode){
    for(let i = 0; i< deletions.length; i++){
        parentNode.removeChild(getStateNode(deletions[i]));
    }
}

// 不是每个fiber都有dom节点
function getStateNode(fiber) {
    let tem = fiber;
  
    while (!tem.stateNode) {
      tem = tem.child;
    }
  
    return tem.stateNode;
  }
  