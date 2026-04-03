const API_BASE = 'https://film-api.rohandesai98244.workers.dev';
const gallery = document.getElementById('gallery');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const modalPoster = document.getElementById('modalPoster');
const modalTitle = document.getElementById('modalTitle');
const modalDirector = document.getElementById('modalDirector');
const modalYear = document.getElementById('modalYear');
const modalRank = document.getElementById('modalRank');
const modalScore = document.getElementById('modalScore');
const ratingsGrid = document.getElementById('ratingsGrid');
const reshuffleBtn = document.getElementById('reshuffle');

let seen = new Set();

function setModalOpen(isOpen) {
  modal.setAttribute('aria-hidden', !isOpen);
  modal.style.pointerEvents = isOpen ? 'auto' : 'none';
  modal.style.opacity = isOpen ? '1' : '0';
}

async function fetchMovies() {
  const res = await fetch(`${API_BASE}/movies`);
  if (!res.ok) throw new Error('Failed fetching movies');
  const data = await res.json();
  return data.movies || [];
}

function createPosterCard(m) {
  const wrapper = document.createElement('div');
  wrapper.className = 'poster-wrap';

  const img = document.createElement('img');
  img.className = 'poster';
  img.alt = `${m.title} poster`;
  img.src = m.poster_url;
  img.loading = 'lazy';
  img.decoding = 'async';

  const overlay = document.createElement('div');
  overlay.className = 'poster-overlay';
  overlay.innerHTML = `<div>
    <div class="poster-title">${escapeHtml(m.title)}</div>
    <div class="poster-sub">${escapeHtml(m.director)} • ${m.year}</div>
  </div>`;

  wrapper.appendChild(img);
  wrapper.appendChild(overlay);

  wrapper.addEventListener('click', () => openModal(m.id));
  img.addEventListener('error', () => img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="100%" height="100%" fill="%232a0407"/></svg>');

  return wrapper;
}

function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function loadGallery() {
  gallery.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--muted); padding:28px;">Curating selections…</div>`;
  try {
    let movies = await fetchMovies();
    movies = movies.filter(m => !seen.has(m.id));
    if (movies.length === 0) {
      seen.clear();
      movies = await fetchMovies();
    }
    shuffleArray(movies);
    movies.slice(0, 10).forEach(m => seen.add(m.id));
    gallery.innerHTML = '';
    movies.slice(0,10).forEach(m => gallery.appendChild(createPosterCard(m)));
  } catch (err) {
    gallery.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#ffb3b0; padding:28px;">Could not load gallery</div>`;
    console.error(err);
  }
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
    const keys = ['story','direction','cinematography','acting','sound'];
    keys.forEach(k => {
      const div = document.createElement('div');
      div.className = 'cell';
      const label = k.charAt(0).toUpperCase() + k.slice(1);
      const rating = (m.ratings && typeof m.ratings[k] === 'number') ? m.ratings[k].toFixed(1) : '-';
      const weight = (m.weights && m.weights[k] != null) ? m.weights[k] + '%' : '';
      div.innerHTML = `<strong>${label}</strong><div style="opacity:.9;margin-top:6px">${rating} × ${weight}</div>`;
      ratingsGrid.appendChild(div);
    });
  } catch (err) {
    console.error(err);
    modalTitle.textContent = 'Could not fetch details';
  }
}

modalClose.addEventListener('click', () => setModalOpen(false));
modal.addEventListener('click', (e) => { if (e.target === modal) setModalOpen(false); });
document.addEventListener('keyup', e => { if (e.key === 'Escape') setModalOpen(false); });

function shuffleArray(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

if (reshuffleBtn) reshuffleBtn.addEventListener('click', () => loadGallery());

document.querySelectorAll('.hamburger').forEach(btn => {
  btn.addEventListener('click', () => {
    const overlay = document.getElementById('navOverlay');
    if (overlay) {
      const isOpen = overlay.hasAttribute('open');
      if (isOpen) {
        overlay.removeAttribute('open');
      } else {
        overlay.setAttribute('open', '');
      }
    }
  });
});

document.querySelectorAll('.nav-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.removeAttribute('open');
    }
  });
});

document.addEventListener('keyup', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.nav-overlay[open]').forEach(o => {
      o.removeAttribute('open');
    });
  }
});

loadGallery();

window._fc = { loadGallery };