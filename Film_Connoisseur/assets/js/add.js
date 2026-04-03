const appContainer = document.getElementById('app');

const ADMIN_PASSWORD = "eyeswideshut";
const storedPw = localStorage.getItem('film_add_pw');

function showPasswordScreen(message = '') {
  appContainer.innerHTML = `
    <div id="auth-screen" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:radial-gradient(circle at center, #3b0000 0%, #1a0000 80%);color:#f8f8f8;font-family:'Inter',sans-serif;text-align:center;">
      <div style="background:rgba(255,255,255,0.05);padding:2rem 3rem;border-radius:16px;box-shadow:0 0 25px rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);">
        <h2 style="font-size:2rem;margin-bottom:1rem;color:#ffccd5;font-family:'Playfair Display',serif;">🔒 Secure Access</h2>
        <input id="auth-input" type="password" placeholder="Enter access password" style="padding:0.8rem 1rem;border:none;border-radius:8px;width:260px;text-align:center;background:#330000;color:white;">
        <button id="auth-btn" style="margin-top:1.2rem;background:#a00000;border:none;padding:0.7rem 1.4rem;color:white;border-radius:8px;font-weight:600;cursor:pointer;">Unlock</button>
        <p id="auth-error" style="color:#ff6666;margin-top:1rem;height:1.2rem;">${message}</p>
      </div>
    </div>
  `;

  document.getElementById('auth-btn').addEventListener('click', () => {
    const pw = document.getElementById('auth-input').value.trim();

    if (pw === ADMIN_PASSWORD) {
      localStorage.setItem('film_add_pw', pw);
      renderAddForm();
    } else {
      showPasswordScreen('❌ Wrong password');
    }
  });
}

function renderAddForm() {
  appContainer.innerHTML = document.getElementById('add-form-template').innerHTML;
  initAddForm();
}

function initAddForm() {
  const form = document.getElementById('movieForm');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const preview = document.getElementById('preview');
  const liveScore = document.getElementById('liveScore');
  const submitBtn = form.querySelector('button[type="submit"]');

  let selectedFile = null;

  const API_KEY = localStorage.getItem("film_add_pw");

  const sliders = {
    story: document.getElementById('rStory'),
    direction: document.getElementById('rDirection'),
    cinematography: document.getElementById('rCine'),
    acting: document.getElementById('rActing'),
    sound: document.getElementById('rSound')
  };

  const weights = {
    story: document.getElementById('wStory'),
    direction: document.getElementById('wDirection'),
    cinematography: document.getElementById('wCine'),
    acting: document.getElementById('wActing'),
    sound: document.getElementById('wSound')
  };

  function updateLiveScore() {
    let sumWeights = 0;
    let weightedSum = 0;

    Object.keys(sliders).forEach(k => {
      const rating = Number(sliders[k].value || 0);
      const weight = Number(weights[k].value || 0);
      weightedSum += rating * weight;
      sumWeights += weight;
    });

    const score = sumWeights > 0 ? weightedSum / sumWeights : 0;
    liveScore.textContent = score.toFixed(2);
  }

  [...Object.values(sliders), ...Object.values(weights)].forEach(el => {
    el.addEventListener('input', updateLiveScore);
  });

  updateLiveScore();

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload an image');
      return;
    }

    selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      preview.innerHTML = `<img src="${reader.result}">`;
    };
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('drag');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag');
  });

  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('drag');
    handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', e => {
    handleFile(e.target.files[0]);
  });

  async function uploadPoster(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY
      },
      body: formData
    });

    if (!res.ok) throw new Error("Upload failed");

    const data = await res.json();
    return data.poster_url;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const title = document.getElementById('title').value.trim();
    const year = Number(document.getElementById('year').value);
    const director = document.getElementById('director').value.trim();

    if (!title || !year || !director) {
      alert('Fill all fields');
      return;
    }

    if (!selectedFile) {
      alert('Upload poster');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `Adding...`;

      const poster_url = await uploadPoster(selectedFile);

      const ratings = {};
      const weightsMap = {};

      Object.keys(sliders).forEach(k => {
        ratings[k] = Number(sliders[k].value);
        weightsMap[k] = Number(weights[k].value) / 100;
      });

      const res = await fetch(`${API_BASE}/movies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY
        },
        body: JSON.stringify({
          title,
          year,
          director,
          ratings,
          weights: weightsMap,
          poster_url
        })
      });

      if (!res.ok) throw new Error("Unauthorized or failed");

      submitBtn.textContent = "✅ Added";

      form.reset();
      preview.innerHTML = '';
      selectedFile = null;
      updateLiveScore();

    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Add Movie";
    }
  });
}

if (storedPw === ADMIN_PASSWORD) {
  renderAddForm();
} else {
  showPasswordScreen();
}