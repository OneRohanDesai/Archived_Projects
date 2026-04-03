// waiter.js
const ws = new RealtimeWS();

function renderReady() {
  fetch('/waiter/ready').then(r => r.json()).then(data => {
    const container = document.getElementById('ready-items');
    container.innerHTML = '';
    data.items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'card';
      div.innerHTML = `
        <p><strong>${item.name} x${item.qty}</strong></p>
        <p>Table: <b>${item.table}</b> | Order: ${item.order_id}</p>
        <button class="btn btn-primary btn-small" onclick="deliver('${item.order_id}', '${item.item_id}', ${item.qty})">
          Deliver
        </button>
      `;
      container.appendChild(div);
    });
  });
}

window.deliver = async (order_id, item_id, qty) => {
  await fetch('/waiter/deliver', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({order_id, item_id, qty})
  });
  renderReady();
};

ws.on('ready_items', renderReady);
ws.on('delivery_update', renderReady);
setInterval(renderReady, 4000);
renderReady();
