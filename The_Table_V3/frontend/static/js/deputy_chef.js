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
  const inKitchen = orders.filter(o => o.status === 'in_kitchen');
  
  inKitchen.forEach(order => {
    if (!order.subtasks) order.subtasks = {};
    order.items.forEach(itemId => {
      if (!order.subtasks[itemId]) {
        const dish = menu.find(m => m.id === itemId);
        if (dish?.prep_strategy) {
          order.subtasks[itemId] = dish.prep_strategy.map(step => ({
            ...step,
            status: "pending",
            start_time: null
          }));
        }
      }
    });
  });

  if (inKitchen.some(o => o.items.some(id => !o.subtasks[id]))) {
    saveOrders();
  }

  document.getElementById('kitchen-queue').innerHTML = inKitchen.map(order => {
    const table = tables.find(t => t.id === order.table_id)?.number || "Unknown";
    const items = order.items.map(id => menu.find(m => m.id === id)?.name).join(', ');
    return `
      <div class="order-card">
        <strong>${table}</strong>
        <p>${items}</p>
        <p><em>Subtasks sent to stations</em></p>
      </div>
    `;
  }).join('') || '<p>No orders in kitchen</p>';
}

function sendToKitchen(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;

  o.status = "in_kitchen";
  o.timestamps.kitchen_received = new Date().toISOString();
  o.subtasks = {};  // Reset

  // FORCE CREATE SUBTASKS
  o.items.forEach(itemId => {
    const dish = menu.find(m => m.id === itemId);
    if (dish?.prep_strategy) {
      o.subtasks[itemId] = dish.prep_strategy.map(step => ({
        task: step.task,
        duration: step.duration,
        role: step.role,
        status: "pending",
        start_time: null
      }));
    }
  });

  saveOrders();
}

function saveOrders() {
  fetch('/data/orders.json', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(orders) });
}

loadAll();