const socket = new RealtimeSocket();
let orders = [], tables = [], assignments = [];
const bell = document.getElementById('bell');

socket.on('orders_updated', d => { if (Array.isArray(d)) { orders = d; render(); }});
socket.on('tables_updated', d => { if (Array.isArray(d)) tables = d; render(); });
socket.on('assignments_updated', d => { if (Array.isArray(d)) assignments = d; render(); });

fetch('/data/orders.json').then(r => r.json()).then(d => { orders = d; render(); });
fetch('/data/tables.json').then(r => r.json()).then(d => { tables = d; render(); });
fetch('/data/assignments.json').then(r => r.json()).then(d => { assignments = d; render(); });

function render() {
  const waiterId = localStorage.getItem('waiterId') || prompt("Enter your Waiter ID (e.g. W1):");
  localStorage.setItem('waiterId', waiterId);

  const myTables = assignments
    .filter(a => a.waiter_id === waiterId)
    .map(a => a.table_id);

  document.getElementById('assigned-tables').textContent = myTables.map(id => 
    tables.find(t => t.id === id)?.number || id
  ).join(', ') || 'None';

  // Ready orders
  const ready = orders.filter(o => o.status === 'ready' && myTables.includes(o.table_id));
  document.getElementById('pickup-list').innerHTML = ready.map(o => `
    <div class="delivery-card">
      <strong>${getTable(o.table_id)}</strong>
      <p>${o.items.map(id => getDishName(id)).join(', ')}</p>
      <button onclick="pickup('${o.id}')">Pickup</button>
    </div>
  `).join('') || '<p>No orders ready</p>';

  // Delivering
  const delivering = orders.filter(o => o.status === 'delivering' && o.delivered_by === waiterId);
  document.getElementById('delivering-list').innerHTML = delivering.map(o => `
    <div class="delivery-card delivering">
      <strong>${getTable(o.table_id)}</strong>
      <p>${o.items.map(id => getDishName(id)).join(', ')}</p>
      <button onclick="deliver('${o.id}')">Delivered</button>
    </div>
  `).join('') || '<p>Nothing in transit</p>';

  if (ready.length > 0) bell.play();
}

function pickup(orderId) {
  const order = orders.find(o => o.id === orderId);
  order.status = 'delivering';
  order.delivered_by = localStorage.getItem('waiterId');
  saveOrders();
}

function deliver(orderId) {
  const order = orders.find(o => o.id === orderId);
  order.status = 'delivered';
  order.timestamps.delivered = new Date().toISOString();
  saveOrders();
}

function saveOrders() {
  fetch('/data/orders.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orders)
  });
}

function getTable(id) { return tables.find(t => t.id === id)?.number || id; }
function getDishName(id) { return menu.find(m => m.id === id)?.name || id; }