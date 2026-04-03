const socket = new RealtimeSocket();
let menu = [];
let orders = [];

socket.on('menu_updated', data => { if (Array.isArray(data)) { menu = data; renderMenu(); }});
socket.on('orders_updated', data => { if (Array.isArray(data)) { orders = data; updateAnalytics(); }});

fetch('/data/menu.json').then(r => r.json()).then(d => { menu = d; renderMenu(); });
fetch('/data/orders.json').then(r => r.json()).then(d => { orders = d; updateAnalytics(); });

function renderMenu() {
  const list = document.getElementById('menu-list');
  list.innerHTML = menu.map(dish => `
    <div class="dish-card" data-id="${dish.id}">
      <div class="dish-header">
        <h3>${dish.name}</h3>
        <span>$${dish.price}</span>
        <button onclick="deleteDish('${dish.id}')">Delete</button>
      </div>
      <p><em>${dish.category}</em></p>
      <div class="prep-steps" ondrop="drop(event)" ondragover="allowDrop(event)">
        ${dish.prep_strategy.map((step, i) => `
          <div class="step" draggable="true" ondragstart="drag(event, '${dish.id}', ${i})">
            <span>${step.task}</span>
            <small>${formatTime(step.duration)}</small>
            <small>${step.role.replace('_', ' ')}</small>
          </div>
        `).join('')}
      </div>
      <button onclick="addStep('${dish.id}')">+ Step</button>
    </div>
  `).join('');
}

function addDish() {
  const name = prompt("Dish name:");
  if (!name) return;
  const price = prompt("Price:", "35");
  const category = prompt("Category:", "Main");
  const id = "m" + Date.now().toString(36);
  menu.push({ id, name, category, price: parseFloat(price), prep_strategy: [] });
  saveMenu();
}

function deleteDish(id) {
  if (confirm("Delete?")) {
    menu = menu.filter(d => d.id !== id);
    saveMenu();
  }
}

function addStep(dishId) {
  const task = prompt("Task:");
  const duration = prompt("Duration (s):", "180");
  const role = prompt("Role:", "grill_chef");
  const dish = menu.find(d => d.id === dishId);
  dish.prep_strategy.push({ task, duration: parseInt(duration), role });
  saveMenu();
}

function allowDrop(e) { e.preventDefault(); }
function drag(e, dishId, index) {
  e.dataTransfer.setData("dishId", dishId);
  e.dataTransfer.setData("index", index);
}
function drop(e) {
  e.preventDefault();
  const dishId = e.dataTransfer.getData("dishId");
  const oldIndex = parseInt(e.dataTransfer.getData("index"));
  const dish = menu.find(d => d.id === dishId);
  const [moved] = dish.prep_strategy.splice(oldIndex, 1);
  const newIndex = Array.from(e.target.closest('.prep-steps').children).indexOf(e.target.closest('.step'));
  dish.prep_strategy.splice(newIndex, 0, moved);
  saveMenu();
}

function saveMenu() {
  fetch('/data/menu.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(menu)
  });
}

function updateAnalytics() {
  const today = new Date().toISOString().split('T')[0];
  const daily = orders.filter(o => o.timestamps?.ordered?.startsWith(today));
  const revenue = daily.reduce((sum, o) => sum + o.items.reduce((s, id) => s + (menu.find(m => m.id === id)?.price || 0), 0), 0);
  const top = {};
  daily.forEach(o => o.items.forEach(id => {
    const name = menu.find(m => m.id === id)?.name || "Unknown";
    top[name] = (top[name] || 0) + 1;
  }));
  const topList = Object.entries(top).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,c])=>`<li>${n}: ${c}</li>`).join('');
  document.getElementById('analytics').innerHTML = `
    <div class="stat"><strong>Revenue:</strong> $${revenue.toFixed(2)}</div>
    <div class="stat"><strong>Orders:</strong> ${daily.length}</div>
    <h4>Top Dishes</h4><ul class="top-list">${topList || '<li>None</li>'}</ul>
  `;
}

function formatTime(sec) {
  return sec >= 60 ? `${Math.floor(sec/60)}m ${sec%60}s` : `${sec}s`;
}