![alt text](./image.png)

flags定义为二进制，而不是字符串或单个数字，一方面是因为二进制单个数字具有唯一性，某个范围内的组合同样具有唯一性；另一方面在于简洁方便，且速度快
```js
/*utils.js*/
export const NoFlags = /*                      */ 0b000000000000000000000000;

export const Placement = /*                    */ 0b000000000000000000000010;
export const Update = /*                       */ 0b000000000000000000000100;
export const ChildDeletion = /*                */ 0b00000000000000000000001000;
export const ContentReset = /*                 */ 0b00000000000000000000010000;

// These are not really side effects, but we still reuse this field.
export const Incomplete = /*                   */ 0b00000000000100000000000000;
export const Forked = /*                       */ 0b00000010000000000000000000;
```

1. 定义fiber节点 --- ReactFibers.js
    1. 类型:tag type stateNode
    2. 属性(props)
    3. 子节点(child) 父节点(return) 兄弟节点(silbing) 当前层级的位置(index)
2. 执行任务 --- ReactWorkLoop.js  
    1. 更新当前组件 <--- ReactReconciler.js
    2. 下一个更新谁 <--- 深度优先遍历 
3. 初次渲染
    + `ReactDOM.render(<App />, document.getElementById("root"))`背后生成一个root对象,多次复用时会创建多个root对象
    ---> 
    `ReactDOM.createRoot(document.getElementById("root")).render(<App />)`createRoot将root对象暴露给用户进行使用,避免多次使用的浪费; 
    1. createRoot返回一个对象,对象上面有一个render方法
    2. render也需要拿到root ---> 将这个root挂在createRoot返回的对象上
4. 实现原生节点的初次渲染
    1. 调用浏览器API---requestIdleCallback(callback, [options])
    2. 实现该API的回调函数workLoop(IdleDeaLine), IdleDeaLine中有线程空闲时间timeRemaining
        1. 在浏览器空闲时间`IdleDeaLine.timeRemaining > 0`执行函数performUnitOfWork来处理任务
        2. 全部渲染完成后进行提交`commitRoot()`
    3. 实现`updateHostComponent()`处理原生标签 
        1. 新建一个原生节点
        2. 处理子节点fiber管旭`reconcilerChildren(wip, wip.props.children)`
            + 字符串或数字 --- return 即可
            + 字符串或对象, 包裹一下直接挂children
    4. commitRoot利用commitWorker实现
        + commitWorker提交自身Node的更新 子节点更新 兄弟节点更新 
5. 实现函数组件的初次渲染（只关注return的节点内容，后续在关注hooks等等）
    1. 获取父节点问题：直接父节点是Function，需要while循环获取第一个原生dom父节点
    2. 渲染内部节点问题：利用type属性得到执行函数，props属性得到传参，执行函数得到渲染的组件内容，调用reconcileChildren渲染即可
6. 实现类组件的初次渲染（类似函数组件）
    1. 区分函数组件和类组件问题：因为类组件是继承得来的，在原型上加上isReactComponent属性
    2. 渲染内部节点：类组件由render函数进行，只需实例化后调用render函数即可得到对应的内部组件
7. 实现文本节点的初次渲染
    1. 判断并挂tag：文本节点的type为undefined
    2. 构建fiber时同时需要将传入的vnode挂到props.children上
8. 实现空组件(Fragment)的初次渲染
    1. 判断并挂tag：
    2. 直接调用reconcileChildren渲染子节点即可

![alt text](./fiber初次渲染.jpg)
