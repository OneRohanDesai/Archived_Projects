const ws = new RealtimeWS();
const form = document.getElementById('order-form');

fetch('/manager/state').then(r => r.json()).then(data => {
  const select = document.getElementById('table');
  Object.keys(data.tables).forEach(t => {
    if (data.tables[t].status === 'free') {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      select.appendChild(opt);
    }
  });
});

fetch('/manager/menu').then(r => r.json()).then(data => {
  const container = document.getElementById('menu-items');
  data.menu.forEach(item => {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>
        <input type="checkbox" name="item" value="${item.id}">
        ${item.name} - ₹${item.price}
      </label>
      <input type="number" min="1" value="1" style="width:60px;margin-left:10px;">
    `;
    container.appendChild(div);
  });
});

form.onsubmit = async (e) => {
  e.preventDefault();
  const table = document.getElementById('table').value;
  const items = [];
  document.querySelectorAll('input[name="item"]:checked').forEach(cb => {
    const row = cb.parentElement.parentElement;
    items.push({
      item_id: cb.value,
      qty: parseInt(row.querySelector('input[type="number"]').value)
    });
  });

  await fetch('/submit-order', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({table, items})
  });
  alert('Order submitted!');
  form.reset();
};
