const socket = new RealtimeSocket();
const MY_ROLE = new URLSearchParams(window.location.search).get('role') || 
               document.getElementById("role-display").textContent.toLowerCase().replace(' ', '_');

let orders = [], menu = [];
const ding = document.getElementById('ding');
const bell = document.getElementById('bell');
const alert = document.getElementById('alert');

socket.on('orders_updated', d => { if (Array.isArray(d)) { orders = d; render(); }});
socket.on('menu_updated', d => { if (Array.isArray(d)) menu = d; });

fetch('/data/orders.json').then(r => r.json()).then(d => { orders = d; render(); });
fetch('/data/menu.json').then(r => r.json()).then(d => { menu = d; });

function render() {
  const myTasks = [];
  orders.forEach(order => {
    if (!order.subtasks) return;
    Object.keys(order.subtasks).forEach(itemId => {
      const subtasks = order.subtasks[itemId];
      subtasks.forEach((task, idx) => {
        if (task.role === MY_ROLE && task.status !== 'done') {
          const dish = menu.find(m => m.id === itemId);
          myTasks.push({
            orderId: order.id,
            table: getTableNumber(order.table_id),
            dish: dish?.name || "Unknown",
            task: task.task,
            duration: task.duration,
            start: task.start_time,
            status: task.status,
            path: { itemId, idx }
          });
        }
      });
    });
  });

  const list = document.getElementById('task-list');
  list.innerHTML = myTasks.map(t => `
    <div class="task-card ${t.status}">
      <div class="task-header">
        <strong>${t.table} → ${t.dish}</strong>
        <span>${t.task}</span>
      </div>
      <div class="timer" id="timer-${t.orderId}-${t.path.itemId}-${t.path.idx}">
        ${formatTime(t.duration)}
      </div>
      <button onclick="startTask('${t.orderId}', '${t.path.itemId}', ${t.path.idx})" ${t.status === 'cooking' ? 'disabled' : ''}>
        ${t.status === 'pending' ? 'Start' : 'Cooking...'}
      </button>
      <button onclick="completeTask('${t.orderId}', '${t.path.itemId}', ${t.path.idx})" ${t.status !== 'cooking' ? 'disabled' : ''}>
        Done
      </button>
    </div>
  `).join('') || '<p>No tasks assigned</p>';

  // Update timers
  myTasks.forEach(t => {
    if (t.status === 'cooking' && t.start) {
      const elapsed = Math.floor((Date.now() - new Date(t.start)) / 1000);
      const remain = t.duration - elapsed;
      const el = document.getElementById(`timer-${t.orderId}-${t.path.itemId}-${t.path.idx}`);
      if (el && remain > 0) {
        el.textContent = formatTime(remain);
      } else if (el) {
        el.textContent = "Time's up!";
        el.style.color = "#f87171";
      }
    }
  });
}

function startTask(orderId, itemId, idx) {
  const order = orders.find(o => o.id === orderId);
  const task = order.subtasks[itemId][idx];
  task.status = 'cooking';
  task.start_time = new Date().toISOString();
  saveOrders();
  ding.play();
}

function completeTask(orderId, itemId, idx) {
  const order = orders.find(o => o.id === orderId);
  const task = order.subtasks[itemId][idx];
  task.status = 'done';
  saveOrders();
  bell.play();

  // Check if all parts done
  const allDone = Object.values(order.subtasks).every(arr => arr.every(t => t.status === 'done'));
  if (allDone) {
    order.status = 'ready';
    order.timestamps.ready = new Date().toISOString();
    saveOrders();
  }
}

function saveOrders() {
  fetch('/data/orders.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orders)
  });
}

function getTableNumber(id) {
  // Fetch tables if needed
  return "T" + id.slice(-2);
}

function formatTime(sec) {
  if (sec <= 0) return "Done";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
