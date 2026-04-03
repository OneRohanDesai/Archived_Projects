const socket = new RealtimeSocket();
let waiters = [], orders = [], tables = [], assignments = [];
const bell = document.getElementById('bell');

socket.on('orders_updated', d => { orders = d; render(); });
socket.on('assignments_updated', d => { assignments = d; render(); });
socket.on('tables_updated', d => { tables = d; render(); });

function loadAll() {
  Promise.all([
    fetch('/data/users.json').then(r => r.json()),
    fetch('/data/orders.json').then(r => r.json()),
    fetch('/data/tables.json').then(r => r.json()),
    fetch('/data/assignments.json').then(r => r.json())
  ]).then(([u, o, t, a]) => {
    waiters = u.filter(x => x.role === 'waiter');
    orders = o; tables = t; assignments = a;
    render();
  });
}

function render() {
  const list = document.getElementById('waiter-list');
  list.innerHTML = waiters.map(w => {
    const myTables = assignments.filter(a => a.waiter_id === w.id).map(a => a.table_id);
    const ready = orders.filter(o => o.status === 'ready_for_delivery' && myTables.includes(o.table_id));
    const delivering = orders.filter(o => o.status === 'delivering' && o.delivered_by === w.id);
    return `
      <div class="waiter-card">
        <h3>${w.name} (${w.id})</h3>
        <p><strong>Tables:</strong> ${myTables.map(id => tables.find(t=>t.id===id)?.number).join(', ')}</p>
        <h4>Ready (${ready.length})</h4>
        ${ready.map(o => `<div class="delivery-item">
          <span>${getTable(o.table_id)}: ${o.items.map(id=>getDish(o,id)).join(', ')}</span>
          <button onclick="pickup('${o.id}','${w.id}')">Pickup</button>
        </div>`).join('')}
        <h4>Delivering (${delivering.length})</h4>
        ${delivering.map(o => `<div class="delivery-item">
          <span>${getTable(o.table_id)}</span>
          <button onclick="deliver('${o.id}')">Delivered</button>
          <button onclick="refireRequest('${o.id}')">Refire</button>
        </div>`).join('')}
      </div>
    `;
  }).join('');
  if (orders.filter(o => o.status === 'ready').length > 0) bell.play();
}

function pickup(oid, wid) {
  const o = orders.find(x => x.id === oid);
  o.status = 'delivering'; o.delivered_by = wid;
  save();
}

function deliver(oid) {
  const o = orders.find(x => x.id === oid);
  o.status = 'delivered'; o.timestamps.delivered = new Date().toISOString();
  save();
}

function refireRequest(oid) {
  const comment = prompt("Refire reason:");
  if (!comment) return;
  const o = orders.find(x => x.id === oid);
  o.refire_request = { comment, timestamp: new Date().toISOString(), by: o.delivered_by };
  o.status = 'refire_requested';
  save();
}

function save() {
  fetch('/data/orders.json', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(orders) });
}

function getTable(id) { return tables.find(t => t.id === id)?.number || id; }
function getDish(o, id) { return menu.find(m => m.id === id)?.name || id; }

loadAll();
