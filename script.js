const header = document.querySelector('#site-header');
const nav = document.querySelector('#primary-nav');
const menuButton = document.querySelector('#menu-button');
const searchToggle = document.querySelector('#search-toggle');
const searchDrawer = document.querySelector('#search-drawer');
const drawerSearch = document.querySelector('#drawer-search');
const eventSearch = document.querySelector('#event-search');
const filterTabs = [...document.querySelectorAll('.filter-tab')];
const eventCards = [...document.querySelectorAll('.event-card')];
const emptyState = document.querySelector('#empty-state');
const clearSearch = document.querySelector('#clear-search');
const toast = document.querySelector('#toast');
let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

function closeMenu() {
  nav?.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded', 'false');
}

function closeSearch() {
  searchDrawer?.classList.remove('is-open');
  searchDrawer?.setAttribute('aria-hidden', 'true');
  searchToggle?.setAttribute('aria-expanded', 'false');
}

menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
  if (open) closeSearch();
});

searchToggle?.addEventListener('click', () => {
  const open = searchDrawer.classList.toggle('is-open');
  searchDrawer.setAttribute('aria-hidden', String(!open));
  searchToggle.setAttribute('aria-expanded', String(open));
  if (open) {
    closeMenu();
    window.setTimeout(() => drawerSearch?.focus(), 100);
  }
});

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((navItem) => navItem.classList.remove('is-active'));
    item.classList.add('is-active');
    closeMenu();
  });
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (nav?.classList.contains('is-open') && !nav.contains(target) && !menuButton?.contains(target)) closeMenu();
  if (searchDrawer?.classList.contains('is-open') && !searchDrawer.contains(target) && !searchToggle?.contains(target)) closeSearch();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenu();
    closeSearch();
  }
});

function applyFilters() {
  const activeFilter = document.querySelector('.filter-tab.is-active')?.dataset.filter || 'all';
  const query = (eventSearch?.value || '').trim().toLowerCase();
  let visibleCount = 0;

  eventCards.forEach((card) => {
    const categoryMatches = activeFilter === 'all' || card.dataset.category === activeFilter;
    const queryMatches = !query || (card.dataset.search || '').toLowerCase().includes(query);
    const visible = categoryMatches && queryMatches;
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  if (emptyState) emptyState.hidden = visibleCount > 0;
}

filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    filterTabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
    applyFilters();
  });
});

function syncSearch(value) {
  if (eventSearch && eventSearch.value !== value) eventSearch.value = value;
  if (drawerSearch && drawerSearch.value !== value) drawerSearch.value = value;
  applyFilters();
}

drawerSearch?.addEventListener('input', () => syncSearch(drawerSearch.value));
eventSearch?.addEventListener('input', () => syncSearch(eventSearch.value));

clearSearch?.addEventListener('click', () => {
  syncSearch('');
  document.querySelector('[data-filter="all"]')?.click();
  eventSearch?.focus();
});

document.querySelectorAll('.save-button').forEach((button) => {
  button.addEventListener('click', () => {
    const saved = button.classList.toggle('is-saved');
    button.setAttribute('aria-pressed', String(saved));
    const name = button.getAttribute('aria-label')?.replace(/^Save /, '') || 'Event';
    showToast(saved ? `${name} saved to your shows.` : `${name} removed from your shows.`);
  });
});

document.querySelectorAll('.open-event').forEach((button) => {
  button.addEventListener('click', () => {
    const name = button.getAttribute('aria-label')?.replace(/^Open /, '') || 'Event';
    showToast(`${name} details are ready for your next plan.`);
  });
});

document.querySelectorAll('.built-save-button').forEach((button) => {
  button.addEventListener('click', () => {
    const saved = button.classList.toggle('is-saved');
    button.setAttribute('aria-pressed', String(saved));
    showToast(saved ? 'Preview event saved to your shows.' : 'Preview event removed from your shows.');
  });
});

document.querySelector('#location-button')?.addEventListener('click', () => {
  showToast('Location set to New York, NY. Showing your nearby signal.');
});

document.querySelector('.profile-button')?.addEventListener('click', () => {
  showToast('Your profile is ready for saved shows and new plans.');
});

document.querySelector('#hero-cta')?.addEventListener('click', (event) => {
  event.preventDefault();
  document.querySelector('#events')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelector('#lucky-button')?.addEventListener('click', () => {
  const visibleCards = eventCards.filter((card) => !card.hidden);
  if (!visibleCards.length) {
    showToast('No signal found. Clear the filters and try again.');
    return;
  }
  const chosen = visibleCards[Math.floor(Math.random() * visibleCards.length)];
  chosen.classList.remove('is-lucky');
  void chosen.offsetWidth;
  chosen.classList.add('is-lucky');
  chosen.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const name = chosen.querySelector('h3')?.textContent || 'Your next show';
  showToast(`${name} is calling. See you there.`);
});

document.querySelector('#load-more')?.addEventListener('click', () => {
  showToast('More events are syncing into your frequency.');
});

document.querySelectorAll('.calendar-row button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.calendar-row button').forEach((day) => day.classList.remove('is-today'));
    button.classList.add('is-today');
    showToast(`${button.getAttribute('aria-label')?.replace(', selected', '') || 'Date'} selected.`);
  });
});

document.querySelectorAll('img').forEach((image) => {
  image.addEventListener('error', () => image.parentElement?.classList.add('image-fallback'));
});

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -28px' });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

function updateHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 12);
}

window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();
applyFilters();
