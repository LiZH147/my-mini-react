import { renderWithHooks } from "./hooks";
import { createFiber } from "./ReactFiber";
import { isArray, isStringOrNumber, Update, updateNode } from "./utils"

export function updateHostComponent(wip) {
    if (!wip.stateNode) {
        wip.stateNode = document.createElement(wip.type);
        updateNode(wip.stateNode, {}, wip.props)
    }

    reconcileChildren(wip, wip.props.children);
}

export function updateFunctionComponent(wip) {
    renderWithHooks(wip); // 向hooks.js传入当前的fiber

    const { type, props } = wip;
    const children = type(props);
    reconcileChildren(wip, children);
}

export function updateClassComponent(wip) {
    const { type, props } = wip;
    const instance = new type(props);
    const children = instance.render();

    reconcileChildren(wip, children)
}

export function updateFragmentComponent(wip) { 
    reconcileChildren(wip, wip.props.children)
}

export function updateHostTextComponent(wip) { 
    const children = document.createTextNode(wip.props.children)
    wip.stateNode = children;
}

// diff协调，新增更新时的对比
function reconcileChildren(wip, children) {
    // children可能是字符串或者数字, 这种情况直接更新
    if (isStringOrNumber(children)) {
        return;
    }
    // children可能是对象或者数组, 是对象的话就包在数组里一并处理
    const newChildren = isArray(children) ? children : [children];
    // oldfiber的头节点
    let oldFiber = wip.alternate?.child;
    let preNewFiber = null; // 记录children中当前节点的前一个节点, 即兄弟节点
    for (let i = 0; i < newChildren.length; i++) {
        const newChild = newChildren[i];
        if(newChild == null){
            continue;
        }
        const newFiber = createFiber(newChild, wip);
        const same = sameNode(newFiber, oldFiber);

        if(same){
            Object.assign(newFiber, {
                stateNode: oldFiber.stateNode,
                alternate: oldFiber,
                flags: Update,
            })
        }

        if(oldFiber){
            oldFiber = oldFiber.sibling;
        }

        // 处理children中带来的节点间的关系
        if (preNewFiber === null) {
            wip.child = newFiber;
        } else {
            preNewFiber.sibling = newFiber;
        }

        preNewFiber = newFiber;
    }
}

// 节点复用的条件：1. 同一层级下 2. 类型相同 3. key相同
function sameNode (a, b){
    return a && b && a.type === b.type && a.key === b.key; 
}