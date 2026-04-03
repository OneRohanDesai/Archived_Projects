const socket = new RealtimeSocket();
let orders = [], menu = [], tables = [];

socket.on('orders_updated', d => { if (Array.isArray(d)) { orders = d; render(); }});
socket.on('menu_updated', d => { if (Array.isArray(d)) menu = d; });
socket.on('tables_updated', d => { if (Array.isArray(d)) tables = d; });

function loadAll() {
  Promise.all([
    fetch('/data/orders.json').then(r => r.json()),
    fetch('/data/menu.json').then(r => r.json()),
    fetch('/data/tables.json').then(r => r.json())
  ]).then(([o, m, t]) => { orders = o; menu = m; tables = t; render(); });
}

function render() {
  const active = orders.filter(o => !['delivered'].includes(o.status));
  document.getElementById('order-queue').innerHTML = active.map(order => {
    const table = tables.find(t => t.id === order.table_id)?.number || "Unknown";
    const items = order.items.map(id => menu.find(m => m.id === id)?.name).join(', ');
    return `
      <div class="order-card ${order.priority ? 'priority' : ''}" data-id="${order.id}">
        <div class="order-header">
          <strong>${table}</strong>
          <span>${timeSince(order.timestamps.ordered)}</span>
        </div>
        <p>${items}</p>
        
        ${order.refire_request ? `
          <div class="refire-req">
            <strong>Refire Request:</strong> ${order.refire_request.comment} 
            <em>(by ${order.refire_request.by})</em>
            <button onclick="refire('${order.id}')">Refire Now</button>
          </div>
        ` : ''}

        <div class="actions">
          <button onclick="setPriority('${order.id}')">
            ${order.priority ? 'Unpriority' : 'Priority'}
          </button>
          ${order.status === 'new' ? `
            <button onclick="sendToKitchen('${order.id}')">To Kitchen</button>
          ` : ''}
          ${order.status !== 'new' && !order.refire_request ? `
            <button onclick="refire('${order.id}')">Refire</button>
          ` : ''}
          ${order.status === 'ready' ? `
            <div class="qc-card">
              <strong>Ready: ${table}</strong>
              <p>${items}</p>
              <button onclick="approveQC('${order.id}')">Approve & Send to Waiter</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('') || '<p>No active orders</p>';
}

function setPriority(id) {
  const o = orders.find(x => x.id === id);
  o.priority = !o.priority;
  saveOrders();
}

function sendToKitchen(id) {
  const o = orders.find(x => x.id === id);
  o.status = "in_kitchen";
  o.timestamps.kitchen_received = new Date().toISOString();
  saveOrders();
}

function refire(id) {
  if (confirm("Refire this order? It will be reprioritized.")) {
    const o = orders.find(x => x.id === id);
    o.status = "new";
    o.priority = true;
    o.timestamps = { ordered: new Date().toISOString() };
    o.subtasks = {};
    saveOrders();
  }
}

function saveOrders() {
  fetch('/data/orders.json', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(orders) })
    .then(() => render());
}

function timeSince(ts) {
  const sec = Math.floor((Date.now() - new Date(ts)) / 1000);
  return sec < 60 ? `${sec}s` : `${Math.floor(sec/60)}m`;
}

function approveQC(id) {
  const o = orders.find(x => x.id === id);
  o.status = 'ready_for_delivery';
  saveOrders();
}

loadAll();