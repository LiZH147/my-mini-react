export const NoFlags = /*                      */ 0b000000000000000000000000;

export const Placement = /*                    */ 0b000000000000000000000010;
export const Update = /*                       */ 0b000000000000000000000100;
export const ChildDeletion = /*                */ 0b00000000000000000000001000;
export const ContentReset = /*                 */ 0b00000000000000000000010000;

// These are not really side effects, but we still reuse this field.
export const Incomplete = /*                   */ 0b00000000000100000000000000;
export const Forked = /*                       */ 0b00000010000000000000000000;

export function getCurrentTime() {
    return performance.now();
}

export function isArray(sth) {
    return Array.isArray(sth);
}

export function isNum(sth) {
    return typeof sth === "number";
}

export function isObject(sth) {
    return typeof sth === "object";
}

export function isFn(sth) {
    return typeof sth === "function";
}

export function isStr(sth) {
    return typeof sth === "string";
}

export function isUndefined(s) {
    return s === undefined;
}

export function isStringOrNumber(s) {
    return typeof s === "string" || typeof s === "number"
}

// 简单做一个去除、卸载全部属性后，再添加新的
export function updateNode(node, prevVal, nextVal) {
    Object.keys(prevVal).forEach((k) => {
        if (k === 'children') {
            if (isStringOrNumber(nextVal[k])) {
                node.textContent = "";
            }
        } else if (k.slice(0, 2) === 'on') {
            const eventName = k.slice(2).toLocaleLowerCase();
            node.removeEventListener(eventName, nextVal[k])
        } else {
            if (!(k in nextVal)) {
                node[k] = "";
            }
        }
    })
    Object.keys(nextVal).forEach((k) => {
        if (k === 'children') {
            if (isStringOrNumber(nextVal[k])) {
                node.textContent = nextVal[k];
            }
        } else if (k.slice(0, 2) === 'on') {
            const eventName = k.slice(2).toLocaleLowerCase();
            node.addEventListener(eventName, nextVal[k])
        } else {
            node[k] = nextVal[k];
        }
    })
}