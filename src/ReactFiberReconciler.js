import { renderWithHooks } from "./hooks";
import { reconcileChildren } from "./ReactChildFiber";
import { updateNode } from "./utils"

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

