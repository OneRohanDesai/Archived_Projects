const socket = new RealtimeSocket();
let orders = [], menu = [], tables = [];

const STATIONS = [
  "Grill", "Sauté", "Fry", "Roast", "Fish", "Sauce", "Pantry", "Pastry",
  "Butcher", "Baker", "Entree", "Soup", "Vegetable", "Seafood", "Deli"
];

socket.on('orders_updated', d => { orders = d; render(); });
socket.on('menu_updated', d => { menu = d; render(); });
socket.on('tables_updated', d => { tables = d; render(); });

Promise.all([
  fetch('/data/orders.json').then(r => r.json()),
  fetch('/data/menu.json').then(r => r.json()),
  fetch('/data/tables.json').then(r => r.json())
]).then(([o, m, t]) => {
  orders = o; menu = m; tables = t;
  buildGrid();
  render();
  setInterval(render, 1000);
});

function buildGrid() {
  const grid = document.getElementById('chef-grid');
  grid.innerHTML = STATIONS.map(name => {
    const role = name.toLowerCase() + (name === "Sauce" ? "_chef" : "_chef");
    return `
      <div class="chef-box">
        <div class="chef-header">${name}</div>
        <div class="task-list" id="list-${role}"></div>
      </div>
    `;
  }).join('');
}

function render() {
  STATIONS.forEach(name => {
    const role = name.toLowerCase() + (name === "Sauce" ? "_chef" : "_chef");
    const list = document.getElementById(`list-${role}`);
    if (!list) return;

    const tasks = [];
    orders.forEach(order => {
      if (order.status !== 'in_kitchen' || !order.subtasks) return;
      Object.keys(order.subtasks).forEach(itemId => {
        order.subtasks[itemId].forEach((task, idx) => {
          if (task.role === role && task.status !== 'done') {
            const dish = menu.find(m => m.id === itemId);
            const elapsed = task.start_time ? (Date.now() - new Date(task.start_time)) / 1000 : 0;
            const remain = task.duration - elapsed;
            tasks.push({ order, task, idx, itemId, dish: dish?.name, table: getTable(order.table_id), remain });
          }
        });
      });
    });

    list.innerHTML = tasks.map(t => `
      <div class="task ${t.task.status}">
        <div><b>${t.table}</b> ${t.dish}</div>
        <div>${t.task.task}</div>
        <div class="timer" id="t-${t.order.id}-${t.itemId}-${t.idx}">
          ${format(remain)}
        </div>
        <button onclick="start('${t.order.id}','${t.itemId}',${t.idx})"
                ${t.task.status === 'cooking' ? 'disabled' : ''}>START</button>
        <button onclick="done('${t.order.id}','${t.itemId}',${t.idx})"
                ${t.task.status !== 'cooking' ? 'disabled' : ''}>DONE</button>
      </div>
    `).join('') || '<div class="empty">Ready</div>';

    tasks.forEach(t => {
      const el = document.getElementById(`t-${t.order.id}-${t.itemId}-${t.idx}`);
      if (el && t.task.status === 'cooking') {
        const r = t.remain - 1;
        el.textContent = r > 0 ? format(r) : "OVER!";
        if (r <= 0) el.style.color = "red";
      }
    });
  });
}

function start(oid, iid, idx) {
  const o = orders.find(x => x.id === oid);
  o.subtasks[iid][idx].status = 'cooking';
  o.subtasks[iid][idx].start_time = new Date().toISOString();
  save();
  document.getElementById('ding').play();
}

function done(oid, iid, idx) {
  const o = orders.find(x => x.id === oid);
  o.subtasks[iid][idx].status = 'done';
  save();
  document.getElementById('bell').play();
  checkReady(o);
}

function checkReady(order) {
  const allDone = Object.values(order.subtasks).every(a => a.every(t => t.status === 'done'));
  if (allDone) {
    order.status = 'ready_for_arrangement';
    save();
  }
}

function save() {
  fetch('/data/orders.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orders)
  });
}

function getTable(id) { return tables.find(t => t.id === id)?.number || "T?"; }
function format(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, '0')}`;
}