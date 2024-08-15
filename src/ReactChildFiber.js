import { createFiber } from "./ReactFiber";
import { isArray, isStringOrNumber, Placement, Update } from "./utils"

function deleteChild(returnFiber, childToDelete) {
    const deletions = returnFiber.deletions;
    if (deletions) {
        returnFiber.deletions.push(childToDelete);
    } else {
        returnFiber.deletions = [childToDelete];
    }
}

function deleteRemainingChildren(returnFiber, currentFirstChild) {
    let childToDelete = currentFirstChild;
    while (childToDelete) {
        deleteChild(returnFiber, childToDelete);
        childToDelete = childToDelete.sibling;
    }
}

// 初次渲染 --- 只记录下标
// 更新，检查节点是否移动
function placeChild(
    newFiber,
    lastPlacedIndex,
    newIndex,
    shouldTrackSideEffects
) {
    newFiber.index = newIndex;
    if (!shouldTrackSideEffects) {
        // 父节点初次渲染
        return lastPlacedIndex
    }
    // 父节点更新
    // 子节点可能是更新也可能是初次渲染
    const current = newFiber.alternate;
    if (current) {
        // 子节点更新， lastPlacedIndex 记录了上次dom节点的相对更新节点的最远位置
        const oldIndex = current.index;
        if (oldIndex < lastPlacedIndex) {
            // 移动
            newFiber.flags |= Placement;
            return lastPlacedIndex;
        } else {
            return oldIndex;
        }
    } else {
        // 子节点初次渲染
        newFiber.flags |= Placement;
        return lastPlacedIndex;
    }
}

function mapRemainingChildren(currentFirstChild) {
    const existingChildren = new Map();

    let existingChild = currentFirstChild;
    while (existingChild) {
        // key: value --> key||index: fiber
        existingChildren.set(
            existingChild.key || existingChild.index,
            existingChild
        );
        existingChild = existingChild.sibling;
    }
    return existingChildren;
}

// diff协调，新增更新时的对比
export function reconcileChildren(returnFiber, children) {
    // children可能是字符串或者数字, 这种情况直接更新
    if (isStringOrNumber(children)) {
        return;
    }
    // children可能是对象或者数组, 是对象的话就包在数组里一并处理
    const newChildren = isArray(children) ? children : [children];
    // oldfiber的头节点
    let oldFiber = returnFiber.alternate?.child;
    // 下一个oldFiber | 暂时缓存下一个oldFiber
    let nextOldFiber = null;
    // 用于判断returnFiber初次渲染还是更新
    let shouldTrackSideEffects = !!returnFiber.alternate;
    let preNewFiber = null; // 记录children中当前节点的前一个节点, 即兄弟节点
    let newIndex = 0;
    // 上一次dom节点插入的最远位置
    // old 0 1 2 3 4
    // new 2 1 3 4
    let lastPlacedIndex = 0;

    // *1. 从左边往右遍历，比较新老节点，如果节点可以复用，继续往右，否则就停止
    // 这里的循环条件一定是要有oldFiber
    for (; oldFiber && newIndex < newChildren.length; newIndex++) {
        const newChild = newChildren[newIndex];
        if (newChild == null) {
            continue;
        }

        if (oldFiber.index > newIndex) {
            nextOldFiber = oldFiber;
            oldFiber = null;
        } else {
            nextOldFiber = oldFiber.sibling;
        }
        const same = sameNode(newChild, oldFiber);
        if (!same) {
            // 不相同，证明此时不能复用
            if (oldFiber == null) {
                oldFiber = nextOldFiber;
            }
            break;
        }

        const newFiber = createFiber(newChild, returnFiber);
        Object.assign(newFiber, {
            stateNode: oldFiber.stateNode,
            alternate: oldFiber,
            flags: Update
        })

        // 节点更新
        lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex, shouldTrackSideEffects);

        if (preNewFiber === null) {
            returnFiber.child = newFiber;
        } else {
            preNewFiber.sibling = newFiber;
        }

        preNewFiber = newFiber;
        oldFiber = nextOldFiber;
    }

    // *2. 新节点没了，老节点还有 0 1 2 --> 0 1
    if (newIndex === newChildren.length) {
        deleteRemainingChildren(returnFiber, oldFiber);
        return;
    }

    // *3. 初次渲染
    // 1）初次渲染
    // 2）老节点没了，新节点还有
    if (!oldFiber) {
        for (; newIndex < newChildren.length; newIndex++) {
            const newChild = newChildren[newIndex];
            if (newChild == null) {
                continue;
            }
            const newFiber = createFiber(newChild, returnFiber);

            lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIndex, shouldTrackSideEffects);

            // 处理children中带来的节点间的关系
            if (preNewFiber === null) {
                returnFiber.child = newFiber;
            } else {
                preNewFiber.sibling = newFiber;
            }

            preNewFiber = newFiber;
        }
    }

    // *4. 新老节点都还有 --- 哈希表
    // 0 1 [2 3 4] --> 0 1 [3 4]
    // !4.1 剩下的old单链表构造哈希表
    const existingChildren = mapRemainingChildren(oldFiber);
    // !4.2 遍历新节点，通过新节点的key||index在哈希表中查找节点，找到了就复用，并删除哈希表中对应节点
    for (; newIndex < newChildren.length; newIndex++) {
        const newChild = newChildren[newIndex];
        if (newChild == null) {
            continue;
        }
        const newFiber = createFiber(newChild, returnFiber);

        const matchedFiber = existingChildren.get(newFiber.key || newFiber.index);
        if (matchedFiber) {
            // 节点复用
            Object.assign(newFiber, {
                stateNode: matchedFiber.stateNode,
                alternate: matchedFiber,
                flags: Update
            });
            existingChildren.delete(newFiber.key || newFiber.index);
        }

        lastPlacedIndex = placeChild(
            newFiber,
            lastPlacedIndex,
            newIndex,
            shouldTrackSideEffects
        );

        if (preNewFiber == null) {
            returnFiber.child = newFiber;
        } else {
            preNewFiber.sibling = newFiber;
        }
        preNewFiber = newFiber;
    }
    // *5. old的哈希表中还有值，遍历哈希表删除所有old
    if (shouldTrackSideEffects) {
        existingChildren.forEach((child) => {
            deleteChild(returnFiber, child);
        });
    }
}

// 节点复用的条件：1. 同一层级下 2. 类型相同 3. key相同
function sameNode(a, b) {
    return a && b && a.type === b.type && a.key === b.key;
}
