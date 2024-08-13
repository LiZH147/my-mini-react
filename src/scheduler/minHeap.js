export function peek(heap) {
    return heap.length === 0 ? null : heap[0];
}

export function push(heap, node) {
    let index = heap.length;
    heap.push(node);
    siftUp(heap, node, index);
}

function siftUp(heap, node, i) {
    let index = i;
    while (index > 0) {
        const parentIndex = (index - 1) >> 1;
        const parent = heap[parentIndex];
        if (compare(parent, node) > 0) {
            // parent > node
            heap[parentIndex] = node;
            heap[index] = parent;
            index = parentIndex;
        } else {
            return;
        }
    }
}

export function pop(heap) {
    if (heap.length === 0) {
        return null;
    }
    const first = heap[0];
    const last = heap.pop();

    if (first !== last) {
        heap[0] = last;
        siftDown(heap, last, 0);
    }

    return first;
}

function siftDown(heap, node, i) {
    let index = i;
    // 最小堆为二叉树结构，这里使用数组存储，root在中间
    const len = heap.length;
    const halfLen = len >> 1;
    // 边界条件为逼近root，因为要用parentNode，会交换
    while (index < halfLen) {
        const leftIndex = (index + 1) * 2 - 1;
        const rightIndex = leftIndex + 1;
        const left = heap[leftIndex], right = heap[rightIndex];

        if (compare(left, node) < 0) {
            // left < node, 还要考虑right和left的关系，用最小的跟node交换
            if (rightIndex < len && compare(right, left) < 0) {
                // right < left < node
                heap[index] = right;
                heap[rightIndex] = node;
                index = rightIndex;
            } else {
                // 没有right或left < right < node
                heap[index] = left;
                heap[leftIndex] = node;
                index = leftIndex;
            }
        } else if (rightIndex < len && compare(right, node) < 0) {
            // right < left < node
            heap[index] = right;
            heap[rightIndex] = node;
            index = rightIndex;
        } else {
            return;
        }
    }
}

function compare(a, b) {
    //   return a - b;
    let diff = a.sortIndex - b.sortIndex;
    return diff !== 0 ? diff : a.id - b.id
}

// const a = [3, 7, 4, 10, 12, 9, 6, 15, 14];

// push(a, 8);

// while (1) {
//   if (a.length === 0) {
//     break;
//   }
//   console.log("a", peek(a)); //sy-log
//   pop(a);
// }