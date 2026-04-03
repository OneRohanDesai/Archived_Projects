document.addEventListener('DOMContentLoaded', () => {
  const ws = new WebSocket(`ws://${location.host}/ws`);

  const tablesDiv = document.getElementById('tables');
  const chefsDiv = document.getElementById('chefs');
  const waitersDiv = document.getElementById('waiters');
  const orderTakersDiv = document.getElementById('order-takers');
  const occupiedEl = document.getElementById('occupied');
  const pendingEl = document.getElementById('pending');
  const chefsBusyEl = document.getElementById('chefs-busy');
  const waitersBusyEl = document.getElementById('waiters-busy');

  // === TABLES ===
  for (let i = 0; i < 32; i++) {
    const table = document.createElement('div');
    table.className = 'table empty';
    table.innerHTML = `<div>${i + 1}</div><span></span>`;
    table.dataset.id = i;
    tablesDiv.appendChild(table);
  }

  // === CHEFS (Horizontal) ===
  for (let i = 0; i < 5; i++) {
    const chef = document.createElement('div');
    chef.className = 'chef idle';
    chef.textContent = 'Chef';
    chef.dataset.id = i;
    chefsDiv.appendChild(chef);
  }

  // === WAITERS ===
  for (let i = 0; i < 8; i++) {
    const waiter = document.createElement('div');
    waiter.className = 'waiter free';
    waiter.textContent = 'W';
    waiter.dataset.id = i;
    waitersDiv.appendChild(waiter);
  }

  // === ORDER TAKERS ===
  for (let i = 0; i < 3; i++) {
    const ot = document.createElement('div');
    ot.className = 'order-taker free';
    ot.textContent = 'O';
    ot.dataset.id = i;
    orderTakersDiv.appendChild(ot);
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateTables(data.tables);
    updateChefs(data.chefs);
    updateWaiters(data.waiters);
    updateOrderTakers(data.order_takers || []); // fallback
    updateStats(data.stats);
  };

  function updateTables(tables) {
    tables.forEach(t => {
      const el = document.querySelector(`.table[data-id="${t.id}"]`);
      if (!el) return;
      el.className = `table ${t.state}`;
      const span = el.querySelector('span');
      span.textContent = t.group_size > 0 ? `${t.group_size}p` : '';
    });
  }

  function updateChefs(chefs) {
    chefs.forEach(c => {
      const el = document.querySelector(`.chef[data-id="${c.id}"]`);
      if (!el) return;
      el.className = `chef ${c.state}`;
    });
  }

  function updateWaiters(waiters) {
    waiters.forEach(w => {
      const el = document.querySelector(`.waiter[data-id="${w.id}"]`);
      if (!el) return;
      el.className = `waiter ${w.state}`;
    });
  }

  function updateOrderTakers(orderTakers) {
    orderTakers.forEach(ot => {
      const el = document.querySelector(`.order-taker[data-id="${ot.id}"]`);
      if (!el) return;
      el.className = `order-taker ${ot.state}`;
    });
  }

  function updateStats(stats) {
    occupiedEl.textContent = stats.occupied;
    pendingEl.textContent = stats.pending_orders;
    const busyChefs = document.querySelectorAll('.chef.cooking, .chef.plating').length;
    const busyWaiters = document.querySelectorAll('.waiter.taking_order, .waiter.delivering, .waiter.clearing').length;
    chefsBusyEl.textContent = busyChefs;
    waitersBusyEl.textContent = busyWaiters;
  }
});