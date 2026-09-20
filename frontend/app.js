const API = '/api';

let token = localStorage.getItem('token') || '';
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let allEvents = [];
let registeredEvents = JSON.parse(
  localStorage.getItem('registeredEvents') || '[]'
);

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date) {
  return new Date(date).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');

  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => toast.classList.remove('show'), 2800);
}

/* =========================
   AUTH STATE
========================= */

function saveUser(user) {
  currentUser = user;
  localStorage.setItem('user', JSON.stringify(user));
}

function setSession(data) {
  token = data.token;
  localStorage.setItem('token', token);
  saveUser(data.user);

  registeredEvents = [];
  localStorage.removeItem('registeredEvents');
}

function isLoggedIn() {
  return Boolean(token && currentUser);
}

function protectPage() {
  const page = window.location.pathname.split('/').pop() || 'index.html';

  const protectedPages = [
    'home.html',
    'events.html',
    'my-events.html',
    'profile.html'
  ];

  if (protectedPages.includes(page) && !isLoggedIn()) {
    window.location.replace('/index.html');
    return false;
  }

  if (page === 'index.html' && isLoggedIn()) {
    window.location.replace('/home.html');
    return false;
  }

  return true;
}

function updateAccountUI() {
  const navUser = document.getElementById('navUser');
  const logoutBtn = document.getElementById('logoutBtn');

  if (navUser) {
    navUser.textContent =
      currentUser?.name ||
      currentUser?.email ||
      'Guest';
  }

  if (logoutBtn) {
    logoutBtn.hidden = !isLoggedIn();
  }
}

/* =========================
   LOGIN
========================= */

async function loginStudent() {
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const auth = document.getElementById('loginAuth');
  const button = document.getElementById('loginBtn');

  if (!email || !password) {
    if (auth) auth.textContent = 'Please enter email and password.';
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'SIGNING IN...';
  }

  if (auth) {
    auth.textContent = 'Connecting to CampusConnect...';
  }

  try {
    const response = await fetch(API + '/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Invalid server response (${response.status})`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.message || 'Invalid email or password.'
      );
    }

    setSession(data);

    if (auth) {
      auth.textContent = 'Login successful. Redirecting...';
    }

    window.location.replace('/home.html');

  } catch (error) {
    console.error('Login error:', error);

    if (auth) {
      auth.textContent =
        error.message || 'Unable to connect to the server.';
    }

    if (button) {
      button.disabled = false;
      button.textContent = 'LOGIN';
    }
  }
}

/* =========================
   REGISTER
========================= */

async function registerStudent() {
  const name = document.getElementById('signupName')?.value.trim();
  const email = document.getElementById('signupEmail')?.value.trim();
  const password = document.getElementById('signupPassword')?.value;
  const auth = document.getElementById('signupAuth');
  const button = document.getElementById('registerBtn');

  if (!name || !email || !password) {
    if (auth) auth.textContent = 'Please complete all fields.';
    return;
  }

  if (password.length < 6) {
    if (auth) {
      auth.textContent = 'Password must contain at least 6 characters.';
    }
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = 'CREATING ACCOUNT...';
  }

  if (auth) {
    auth.textContent = 'Creating your CampusConnect account...';
  }

  try {
    const response = await fetch(API + '/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Invalid server response (${response.status})`
      );
    }

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed.');
    }

    setSession(data);

    if (auth) {
      auth.textContent = 'Account created. Redirecting...';
    }

    window.location.replace('/home.html');

  } catch (error) {
    console.error('Registration error:', error);

    if (auth) {
      auth.textContent =
        error.message || 'Unable to create account.';
    }

    if (button) {
      button.disabled = false;
      button.textContent = 'CREATE ACCOUNT';
    }
  }
}

/* =========================
   LOGOUT
========================= */

function logoutStudent() {
  token = '';
  currentUser = null;
  registeredEvents = [];

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('registeredEvents');

  window.location.replace('/index.html');
}

/* =========================
   EVENTS
========================= */

async function loadEvents() {
  const container = document.getElementById('eventsList');

  if (!container) return;

  try {
    const response = await fetch(API + '/events');

    if (!response.ok) {
      throw new Error('Unable to load events.');
    }

    allEvents = await response.json();
    renderEvents(allEvents);

  } catch (error) {
    console.error('Load events error:', error);

    container.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load events</h3>
        <p>${esc(error.message)}</p>
      </div>
    `;
  }
}

function getEventCategory(title) {
  const value = String(title).toLowerCase();

  if (value.includes('cloud') || value.includes('devops'))
    return 'CLOUD & DEVOPS';

  if (value.includes('ai') || value.includes('machine'))
    return 'ARTIFICIAL INTELLIGENCE';

  if (value.includes('web'))
    return 'WEB DEVELOPMENT';

  if (value.includes('cyber'))
    return 'CYBER SECURITY';

  if (value.includes('hack'))
    return 'HACKATHON';

  if (value.includes('robot'))
    return 'ROBOTICS';

  if (value.includes('ui') || value.includes('ux'))
    return 'DESIGN';

  if (value.includes('startup') || value.includes('innovation'))
    return 'INNOVATION';

  if (value.includes('tech'))
    return 'TECHNOLOGY';

  return 'COLLEGE EVENT';
}

function isRegistered(id) {
  return registeredEvents.map(Number).includes(Number(id));
}

function renderEvents(events) {
  const container = document.getElementById('eventsList');

  if (!container) return;

  if (!events || !events.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No events found</h3>
        <p>Try another search.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(event => {
    const registered = isRegistered(event.id);

    return `
      <article class="event-card">
        <div class="event-category">
          ${esc(getEventCategory(event.title))}
        </div>

        <h3>${esc(event.title)}</h3>

        <p>${esc(event.description || '')}</p>

        <div class="event-info">
          <span>📅 ${formatDate(event.event_date)}</span>
          <span>📍 ${esc(event.venue)}</span>
        </div>

        ${
          registered
            ? `
              <button class="btn registered" disabled>
                ✓ REGISTERED
              </button>
            `
            : `
              <button
                class="btn primary"
                onclick="joinEvent(${Number(event.id)})"
              >
                REGISTER FOR EVENT
              </button>
            `
        }
      </article>
    `;
  }).join('');
}

function filterEvents() {
  const searchInput = document.getElementById('search');

  if (!searchInput) return;

  const search = searchInput.value.trim().toLowerCase();

  const filtered = allEvents.filter(event =>
    String(event.title || '').toLowerCase().includes(search) ||
    String(event.description || '').toLowerCase().includes(search) ||
    String(event.venue || '').toLowerCase().includes(search)
  );

  renderEvents(filtered);
}

async function joinEvent(id) {
  if (!isLoggedIn()) {
    window.location.replace('/index.html');
    return;
  }

  try {
    const response = await fetch(
      API + '/events/' + id + '/register',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token
        }
      }
    );

    const text = await response.text();

    let data = {};

    try {
      data = JSON.parse(text);
    } catch {}

    if (response.status === 201 || response.status === 409) {
      markRegistered(id);

      showToast(
        response.status === 409
          ? 'Already registered for this event.'
          : 'Successfully registered!'
      );

      renderEvents(allEvents);
      return;
    }

    if (response.status === 401) {
      logoutStudent();
      return;
    }

    throw new Error(data.message || 'Registration failed.');

  } catch (error) {
    console.error('Registration error:', error);
    showToast(error.message);
  }
}

function markRegistered(id) {
  const numericId = Number(id);

  if (!registeredEvents.includes(numericId)) {
    registeredEvents.push(numericId);

    localStorage.setItem(
      'registeredEvents',
      JSON.stringify(registeredEvents)
    );
  }
}

/* =========================
   MY EVENTS
========================= */

async function loadMyEvents() {
  const container = document.getElementById('myEventsList');

  if (!container) return;

  if (!isLoggedIn()) {
    window.location.replace('/index.html');
    return;
  }

  container.innerHTML = `
    <div class="loading">
      Loading your registered events...
    </div>
  `;

  try {
    const response = await fetch(API + '/my-events', {
      headers: {
        Authorization: 'Bearer ' + token
      }
    });

    const text = await response.text();

    let data = [];

    try {
      data = JSON.parse(text);
    } catch {}

    if (response.status === 401) {
      logoutStudent();
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.message || 'Unable to load your events.'
      );
    }

    if (!data.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No registered events</h3>
          <p>You haven't registered for any events yet.</p>
          <a href="/events.html" class="btn primary">
            EXPLORE EVENTS
          </a>
        </div>
      `;
      return;
    }

    data.forEach(event => markRegistered(event.id));

    container.innerHTML = data.map(event => `
      <article class="event-card">
        <div class="event-category">
          REGISTERED EVENT
        </div>

        <h3>${esc(event.title)}</h3>

        <p>${esc(event.description || '')}</p>

        <div class="event-info">
          <span>📅 ${formatDate(event.event_date)}</span>
          <span>📍 ${esc(event.venue)}</span>
        </div>

        <div class="registered-badge">
          ✓ REGISTERED
        </div>
      </article>
    `).join('');

  } catch (error) {
    console.error('My events error:', error);

    container.innerHTML = `
      <div class="empty-state">
        <h3>Unable to load your events</h3>
        <p>${esc(error.message)}</p>
      </div>
    `;
  }
}

/* =========================
   PROFILE
========================= */

function loadProfile() {
  if (!currentUser) return;

  const name = document.getElementById('profileName');
  const email = document.getElementById('profileEmail');
  const role = document.getElementById('profileRole');

  if (name) name.textContent = currentUser.name || 'Student';
  if (email) email.textContent = currentUser.email || '';
  if (role) role.textContent = currentUser.role || 'student';
}

/* =========================
   DASHBOARD
========================= */

async function updateDashboardStats() {
  const eventCount = document.getElementById('eventCount');
  const myEventCount = document.getElementById('myEventCount');

  try {
    const response = await fetch(API + '/events');

    if (response.ok) {
      const events = await response.json();

      if (eventCount) {
        eventCount.textContent = events.length;
      }
    }

    if (isLoggedIn()) {
      const response = await fetch(API + '/my-events', {
        headers: {
          Authorization: 'Bearer ' + token
        }
      });

      if (response.ok) {
        const events = await response.json();

        if (myEventCount) {
          myEventCount.textContent = events.length;
        }
      }
    }

  } catch (error) {
    console.error('Dashboard error:', error);
  }
}

/* =========================
   GLOBAL FUNCTIONS
========================= */

window.loginStudent = loginStudent;
window.registerStudent = registerStudent;
window.logoutStudent = logoutStudent;
window.loadEvents = loadEvents;
window.loadMyEvents = loadMyEvents;
window.filterEvents = filterEvents;
window.joinEvent = joinEvent;
window.loadProfile = loadProfile;
window.updateDashboardStats = updateDashboardStats;

/* =========================
   START
========================= */

if (protectPage()) {

  updateAccountUI();

  if (document.getElementById('eventsList')) {
    loadEvents();
  }

  if (document.getElementById('myEventsList')) {
    loadMyEvents();
  }

  if (
    document.getElementById('profileName') ||
    document.getElementById('profileEmail')
  ) {
    loadProfile();
  }

  if (document.getElementById('eventCount')) {
    updateDashboardStats();
  }
}
