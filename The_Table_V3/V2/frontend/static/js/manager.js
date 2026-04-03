const ws = new RealtimeWS();

function renderTables() {
  fetch('/manager/state').then(r => r.json()).then(data => {
    const container = document.getElementById('tables');
    container.innerHTML = '';
    let active = 0, revenue = 0;
    Object.entries(data.tables).forEach(([table, info]) => {
      const div = document.createElement('div');
      div.className = `table-card ${info.status}`;
      div.innerHTML = `<h3>${table}</h3><p>₹${info.bill}</p>`;
      container.appendChild(div);
      if (info.status === 'occupied') active++;
      if (info.status === 'free' && info.bill > 0) revenue += info.bill;
    });
    document.getElementById('active-count').textContent = active;
    document.getElementById('revenue').textContent = revenue;
  });
}

function renderKitchen() {
  // Simplified
  document.getElementById('kitchen').innerHTML = '<p>Live view coming...</p>';
}

ws.on('update', () => {
  renderTables();
  renderKitchen();
});

renderTables();
setInterval(renderTables, 5000);
