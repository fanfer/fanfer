---
title: python多线程
tags: 
    - 笔记
categories:
    - 笔记
description: python多线程
top_img: /assets/background.JPG
cover: https://picture.fanfer.top/img/helloworld.webp
---
最近用到python的多线程，因此整理了一下，仅做记录。

# 创建多线程

要创建一个简单的多线程程序，其中一个线程从API中获取订单信息，另一个线程将订单分配给无人机群，我们可以使用Python的**`threading`**模块。这里我们模拟API调用和无人机分配，因为没有具体的API和无人机群实现细节。

1. **获取订单的线程**：模拟从API中获取新订单，实际使用中，这里应替换为真实的API调用。
2. **分配订单的线程**：获取到新订单后，模拟分配这些订单到无人机上。

```python
import threading
import time
import queue

# 模拟的订单队列
order_queue = queue.Queue()

# 模拟从API获取订单
def fetch_orders():
    order_id = 0
    while True:
        # 模拟API调用的延时
        time.sleep(2)
        order_id += 1
        print(f"获取到新订单: {order_id}")
        order_queue.put(order_id)

# 模拟将订单分配给无人机
def assign_orders():
    while True:
        # 等待新订单
        new_order = order_queue.get()
        # 模拟分配订单到无人机的处理时间
        time.sleep(1)
        print(f"订单 {new_order} 已分配到无人机")

# 创建并启动线程
threading.Thread(target=fetch_orders, daemon=True).start()
threading.Thread(target=assign_orders, daemon=True).start()

# 为了示例，我们让主线程持续运行10秒
time.sleep(10)
print("程序完成")
```

# 控制线程结束

**控制当分配完10个订单后，获取订单的程序关闭，分配的线程分配完所有的订单后关闭**

1. **控制订单获取数量**：获取订单的线程在获取到一定数量（比如10个）的订单后停止。
2. **完成订单分配后关闭分配线程**：分配线程在队列为空且获取订单的线程已经结束时停止。

为此，我们引入几个改变：

- 使用一个共享变量（如**`threading.Event`**）来通知分配线程，订单获取线程已经停止。
- 分配线程在队列变空且收到订单获取线程停止的通知后结束。

```python
import threading
import time
import queue

order_queue = queue.Queue()
max_orders = 10  # 最大订单数
orders_fetched = threading.Event()  # 用于通知订单获取已完成

# 模拟从API获取订单
def fetch_orders(api_id):
    for order_id in range(1, max_orders + 1):
        time.sleep(2)
        print(f"[API {api_id}] 获取到新订单: {order_id}")
        order_queue.put(order_id)
    orders_fetched.set()  # 设置事件，通知订单获取已完成

# 模拟将订单分配给无人机
def assign_orders(drone_id):
    while not (orders_fetched.is_set() and order_queue.empty()):
        try:
            new_order = order_queue.get(timeout=3)  # 设置超时，避免无限等待
            time.sleep(1)
            print(f"[无人机 {drone_id}] 订单 {new_order} 已分配")
        except queue.Empty:
            # 如果等待时间过长没有订单，检查是否应该退出
            continue
    print(f"[无人机 {drone_id}] 所有订单已分配完毕，线程关闭。")

# 启动线程
threading.Thread(target=fetch_orders, args=(1,), daemon=True).start()
threading.Thread(target=assign_orders, args=(1,), daemon=False).start()
```

- **`fetch_orders`** 函数在处理指定数量（**`max_orders`**）的订单后会退出循环，并通过**`orders_fetched.set()`**通知其他线程。
- **`assign_orders`** 线程会检查两个条件：是否接收到了结束通知，以及队列是否为空。当两个条件同时满足时，表示所有订单都已经分配完毕，线程可以安全退出。

这种设计模式可以确保所有的订单被处理后，程序才完全结束运行。其中**`queue.Empty`**异常处理是为了防止在**`order_queue.get()`**调用中无限期地阻塞，尤其是在获取订单的线程已经停止的情况下。通过设置一个合理的超时时间，我们可以在队列空闲时周期性地检查队列状态。

# 多线程共享单一资源

把无人机的订单处理时间作为参数传入分配函数，用与模拟不同无人机的能力不同

我们可以将处理时间作为一个参数传递给**`assign_orders`**函数。这样，每个无人机线程可以根据自己的处理速度来模拟订单的处理时间。

```python
import threading
import time
import queue

order_queue = queue.Queue()
max_orders = 10
orders_fetched = threading.Event()

# 模拟从API获取订单
def fetch_orders(api_id):
    for order_id in range(1, max_orders + 1):
        time.sleep(2)
        print(f"[API {api_id}] 获取到新订单: {order_id}")
        order_queue.put(order_id)
    orders_fetched.set()  # 通知订单获取完毕

# 模拟将订单分配给无人机
def assign_orders(drone_id, processing_time):
    while not (orders_fetched.is_set() and order_queue.empty()):
        try:
            new_order = order_queue.get(timeout=3)
            time.sleep(processing_time)  # 根据无人机的处理能力进行等待
            print(f"[无人机 {drone_id}] 订单 {new_order} 已分配")
        except queue.Empty:
            continue
    print(f"[无人机 {drone_id}] 所有订单已分配完毕，线程关闭。")

# 启动线程
threading.Thread(target=fetch_orders, args=(1,), daemon=True).start()

# 创建不同处理能力的三个无人机分配线程
drones = [(1, 1), (2, 2), (3, 1.5)]  # (无人机ID, 处理时间)
for drone_id, processing_time in drones:
    threading.Thread(target=assign_orders, args=(drone_id, processing_time), daemon=False).start()
```

- 每个无人机线程通过**`processing_time`**参数接收了一个处理时间的值，这模拟了不同无人机的处理能力。例如，**`processing_time`**为1的无人机会比**`processing_time`**为2的无人机更快地处理订单。
- 我们创建了三个无人机线程，每个线程都有其自己的处理时间。例如，无人机1处理时间为1秒，无人机2处理时间为2秒，无人机3处理时间为1.5秒。
1. **`fetch_orders`** 函数仍然负责生成最多**`max_orders`**个订单，并在完成后设置**`orders_fetched`**事件。
2. 我们创建了三个无人机线程（**`assign_orders`**），每个线程代表一个不同的无人机（无人机ID从1到3）。这些线程会并发地从**`order_queue`**中获取并处理订单。
3. 每个无人机线程在处理时，都会尝试从队列中获取订单。如果队列为空，它将会等待一段时间（这里设置为3秒），然后再次检查是否还有订单。如果没有新的订单并且已知所有订单都已获取（即**`orders_fetched`**被设置），则线程将退出。

**安全访问**

代码示例中，由于使用了**`queue.Queue`**，这种情况不会发生。**`queue.Queue`** 是线程安全的，这意味着在任何时候只有一个线程能够从队列中取出一个特定的元素。当一个线程从队列中获取一个项目时，该项目会被标记为已删除，其他线程无法再次获取到它。

这个特性是通过内部锁实现的。当一个线程调用**`get()`**方法并从队列中取出一个项目时，任何其他试图访问该队列的线程将会被阻塞，直到该项目被成功处理（即线程完成了对**`get()`**的调用）。这就确保了即使多个线程试图同时从队列中获取项目，每个项目也只会被一个线程处理。

因此，在这个代码中，三个无人机线程将会安全地、独立地从队列中获取并处理订单，而不会发生两个线程处理同一个订单的情况。每个订单一旦被一个无人机线程获取，就会从队列中移除，不会再被其他无人机线程访问到。

# 多个发布源

使用两个订单发布API，且让它们以不同的频率发布订单，我们可以对**`fetch_orders`**函数稍作调整，使其接受一个表示发布频率的参数。这个参数将决定API获取订单的间隔时间。

```python
import threading
import time
import queue

order_queue = queue.Queue()
max_orders = 10
orders_fetched = threading.Event()
order_count = 0  # 记录获取的订单总数

# 锁对象，用于同步对共享变量order_count的访问
count_lock = threading.Lock()

# 模拟从API获取订单
def fetch_orders(api_id, fetch_interval):
    global order_count

    while True:
        with count_lock:
            if order_count >= max_orders:
                break
            order_count += 1
            order_id = order_count

        time.sleep(fetch_interval)
        print(f"[API {api_id}] 获取到新订单: {order_id}")
        order_queue.put(order_id)

    # 检查是否所有订单都已获取
    with count_lock:
        if order_count >= max_orders:
            orders_fetched.set()  # 通知订单获取完毕

# 模拟将订单分配给无人机
def assign_orders(drone_id, processing_time):
    while not (orders_fetched.is_set() and order_queue.empty()):
        try:
            new_order = order_queue.get(timeout=3)
            time.sleep(processing_time)
            print(f"[无人机 {drone_id}] 订单 {new_order} 已分配")
        except queue.Empty:
            continue
    print(f"[无人机 {drone_id}] 所有订单已分配完毕，线程关闭。")

# 启动线程
threading.Thread(target=fetch_orders, args=(1, 2), daemon=True).start()  # API 1，间隔2秒
threading.Thread(target=fetch_orders, args=(2, 3), daemon=True).start()  # API 2，间隔3秒

# 创建不同处理能力的三个无人机分配线程
drones = [(1, 1), (2, 2), (3, 1.5)]
for drone_id, processing_time in drones:
    threading.Thread(target=assign_orders, args=(drone_id, processing_time), daemon=False).start()
```

1. **`fetch_orders`**函数现在接受一个**`fetch_interval`**参数，它决定了API获取订单的间隔时间。这样我们可以为两个API线程设置不同的获取频率。
2. 使用了全局变量**`order_count`**来记录已获取的订单数量，并使用**`count_lock`**来确保在修改**`order_count`**时的线程安全。
3. 当**`order_count`**达到或超过**`max_orders`**时，两个API线程都会停止获取订单，并通过**`orders_fetched.set()`**来通知订单处理线程可以结束了。

这个设计允许两个API线程以不同的频率工作，模拟了更为复杂的现实场景，其中不同的数据源可能以不同的速率提供数据。同时，引入锁是为了确保在多线程环境中，对共享资源（**`order_count`**）的访问是安全的。