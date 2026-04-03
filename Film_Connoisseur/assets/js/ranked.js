const API_BASE = 'https://film-api.rohandesai98244.workers.dev';
const rankedList = document.getElementById('rankedList');
const searchInput = document.getElementById('searchInput');
const prevBtn = document.getElementById('prevPage');
const nextBtn = document.getElementById('nextPage');
const pageButtonsContainer = document.getElementById('pageButtonsContainer');

const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalPoster = document.getElementById('modalPoster');
const modalTitle = document.getElementById('modalTitle');
const modalDirector = document.getElementById('modalDirector');
const modalYear = document.getElementById('modalYear');
const modalRank = document.getElementById('modalRank');
const modalScore = document.getElementById('modalScore');
const ratingsGrid = document.getElementById('ratingsGrid');

let allMovies = [];
let filteredMovies = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

async function fetchMovies() {
  const res = await fetch(`${API_BASE}/movies`);
  if (!res.ok) throw new Error('Failed fetching movies');
  const data = await res.json();
  return data.movies || [];
}

function createRankCard(m) {
  const card = document.createElement('div');
  card.className = 'ranked-card';
  card.innerHTML = `
    <div class="rank-badge serif">${m.rank}</div>
    <img class="ranked-thumb" src="${m.poster_url}" alt="${escapeHtml(m.title)} poster" loading="lazy"/>
    <div style="flex:1">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700;color:var(--accent-white)">${escapeHtml(m.title)}</div>
          <div style="color:var(--muted);font-size:.95rem">${escapeHtml(m.director)} • ${m.year}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:900;color:var(--accent-gold)">${(m.final_score || 0).toFixed(2)}</div>
          <div style="color:var(--muted);font-size:.85rem">Score</div>
        </div>
      </div>
    </div>
  `;
  card.addEventListener('click', () => openModal(m.id));
  return card;
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderCurrentPage() {
  window.scrollTo(0, 0);
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageItems = filteredMovies.slice(start, end);

  rankedList.innerHTML = pageItems.length === 0
    ? `<div style="text-align:center;padding:40px;color:var(--muted)">No movies found</div>`
    : '';

  pageItems.forEach(m => rankedList.appendChild(createRankCard(m)));

  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = end >= filteredMovies.length;

  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.page) === currentPage);
  });

}

function generatePageButtons(totalItems) {
  pageButtonsContainer.innerHTML = '';
  if (totalItems === 0) return;

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = 'range-btn';
    btn.textContent = `${(i-1)*10 + 1}–${Math.min(i*10, totalItems)}`;
    btn.dataset.page = i;

    btn.addEventListener('click', () => {
      currentPage = i;
      renderCurrentPage();
    });

    pageButtonsContainer.appendChild(btn);
  }

  if (totalPages >= 1) {
    currentPage = 1;
    renderCurrentPage();
  }
}

async function loadRanked() {
  rankedList.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted)">Loading rankings…</div>`;

  try {
    allMovies = await fetchMovies();
    allMovies.sort((a, b) => (b.final_score || 0) - (a.final_score || 0));

    allMovies.forEach((m, idx) => {
      m.rank = idx + 1;
    });

    filteredMovies = [...allMovies];
    generatePageButtons(filteredMovies.length);
  } catch (err) {
    rankedList.innerHTML = `<div style="text-align:center;padding:40px;color:#ffb3b0">Could not load rankings</div>`;
    console.error(err);
  }
}

if (searchInput) {
  searchInput.addEventListener('input', debounce(async e => {
    const q = e.target.value.trim().toLowerCase();
    
    if (!q) {
      filteredMovies = [...allMovies];
    } else {
      filteredMovies = allMovies.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.director || '').toLowerCase().includes(q)
      );
    }

    currentPage = 1;
    generatePageButtons(filteredMovies.length);
  }, 350));
}

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderCurrentPage();
  }
});

nextBtn.addEventListener('click', () => {
  if ((currentPage * ITEMS_PER_PAGE) < filteredMovies.length) {
    currentPage++;
    renderCurrentPage();
  }
});

function setModalOpen(isOpen) {
  modal.setAttribute('aria-hidden', !isOpen);
  modal.style.pointerEvents = isOpen ? 'auto' : 'none';
  modal.style.opacity = isOpen ? '1' : '0';
}

async function openModal(id) {
  try {
    setModalOpen(true);
    modalPoster.src = '';
    modalTitle.textContent = 'Loading…';
    const res = await fetch(`${API_BASE}/movies/${id}`);
    if (!res.ok) throw new Error('failed');
    const m = await res.json();

    modalPoster.src = m.poster_url;
    modalPoster.alt = `${m.title} poster`;
    modalTitle.textContent = m.title;
    modalDirector.textContent = m.director;
    modalYear.textContent = m.year;
    modalRank.textContent = m.rank;
    modalScore.textContent = (m.final_score || 0).toFixed(2);

    ratingsGrid.innerHTML = '';
    const keys = ['story', 'direction', 'cinematography', 'acting', 'sound'];
    keys.forEach(k => {
      const div = document.createElement('div');
      div.className = 'cell';
      const label = k.charAt(0).toUpperCase() + k.slice(1);
      const rating = m.ratings && typeof m.ratings[k] === 'number' ? m.ratings[k].toFixed(1) : '-';
      div.innerHTML = `<strong>${label}</strong><div style="opacity:.9;margin-top:6px">${rating}</div>`;
      ratingsGrid.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    modalTitle.textContent = 'Could not fetch details';
  }
}

modalClose.addEventListener('click', () => setModalOpen(false));
modal.addEventListener('click', e => { if (e.target === modal) setModalOpen(false); });
document.addEventListener('keyup', e => { if (e.key === 'Escape') setModalOpen(false); });

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

window.scrollTo(0, 0);
loadRanked();