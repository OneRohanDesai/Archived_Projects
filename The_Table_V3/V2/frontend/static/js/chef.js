// frontend/static/js/chef.js
(() => {
  // ------------------------------------------------------------------
  // 1. Get the specialty from the URL (e.g. /chef/dosa → "dosa")
  // ------------------------------------------------------------------
  const pathParts = window.location.pathname.split('/');
  const specialty = pathParts[pathParts.length - 1];   // <-- only ONE declaration

  // ------------------------------------------------------------------
  // 2. WebSocket + rendering
  // ------------------------------------------------------------------
  const ws = new RealtimeWS();

  function renderQueue() {
    fetch(`/chef/queue/${specialty}`)
      .then(r => r.json())
      .then(data => {
        const container = document.getElementById('queue');
        container.innerHTML = '';                     // clear

        if (!data.queue || data.queue.length === 0) {
          container.innerHTML = '<p class="status">No items in queue</p>';
          return;
        }

        data.queue.forEach(task => {
          const card = document.createElement('div');
          card.className = 'card';
          card.innerHTML = `
            <p><strong>${task.name} ×${task.qty}</strong> → Table <b>${task.table}</b></p>
            <p class="status status-${task.status}">${task.status.toUpperCase()}</p>
          `;
          container.appendChild(card);
        });
      })
      .catch(err => console.error('Queue fetch error:', err));
  }

  // ------------------------------------------------------------------
  // 3. Listen to every broadcast that may change the queue
  // ------------------------------------------------------------------
  ws.on('chef_update', renderQueue);
  ws.on('ready_items', renderQueue);
  ws.on('new_order', renderQueue);
  ws.on('delivery_update', renderQueue);
  ws.on('*', () => console.log('WS event received'));

  // ------------------------------------------------------------------
  // 4. Initial load + periodic poll (fallback if WS drops)
  // ------------------------------------------------------------------
  renderQueue();
  setInterval(renderQueue, 5000);
})();