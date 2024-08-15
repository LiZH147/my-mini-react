import { createFiber } from "./ReactFiber";
import { isArray, isStringOrNumber, Update } from "./utils"

function deleteChild(returnFiber, childToDelete){
    const deletions = returnFiber.deletions;
    if(deletions){
        returnFiber.deletions.push(returnFiber.deletions);
    } else {
        returnFiber.deletions = [childToDelete];
    }
}

// diff协调，新增更新时的对比
export function reconcileChildren(wip, children) {
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

        if(!same && oldFiber){
            deleteChild(wip, oldFiber);
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
