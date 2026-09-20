const topbar = document.querySelector('#topbar');
const mainNav = document.querySelector('#main-nav');
const menuToggle = document.querySelector('.menu-toggle');
const searchToggle = document.querySelector('.search-toggle');
const quickSearch = document.querySelector('#quick-search');
const quickSearchInput = document.querySelector('#quick-search-input');
const eventSearchInput = document.querySelector('#event-search-input');
const filterTabs = [...document.querySelectorAll('.filter-tab')];
const eventCards = [...document.querySelectorAll('.event-card')];
const emptyState = document.querySelector('#empty-state');
const toast = document.querySelector('#toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

function closeMenu() {
  mainNav?.classList.remove('is-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}

menuToggle?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('is-active'));
    link.classList.add('is-active');
    closeMenu();
  });
});

function closeQuickSearch() {
  quickSearch?.classList.remove('is-open');
  quickSearch?.setAttribute('aria-hidden', 'true');
  searchToggle?.setAttribute('aria-expanded', 'false');
}

searchToggle?.addEventListener('click', () => {
  const isOpen = quickSearch.classList.toggle('is-open');
  quickSearch.setAttribute('aria-hidden', String(!isOpen));
  searchToggle.setAttribute('aria-expanded', String(isOpen));
  if (isOpen) {
    window.setTimeout(() => quickSearchInput?.focus(), 100);
  }
});

quickSearchInput?.addEventListener('input', () => {
  if (eventSearchInput) eventSearchInput.value = quickSearchInput.value;
  applyFilters();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeQuickSearch();
    closeMenu();
  }
});

function applyFilters() {
  const activeFilter = document.querySelector('.filter-tab.is-active')?.dataset.filter || 'all';
  const query = (eventSearchInput?.value || '').trim().toLowerCase();
  let visibleCount = 0;

  eventCards.forEach((card) => {
    const categoryMatches = activeFilter === 'all' || card.dataset.category === activeFilter;
    const searchMatches = !query || (card.dataset.search || '').includes(query);
    const shouldShow = categoryMatches && searchMatches;
    card.hidden = !shouldShow;
    if (shouldShow) visibleCount += 1;
  });

  if (emptyState) emptyState.hidden = visibleCount !== 0;
}

filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    filterTabs.forEach((item) => {
      const isActive = item === tab;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-selected', String(isActive));
    });
    applyFilters();
  });
});

eventSearchInput?.addEventListener('input', () => {
  if (quickSearchInput) quickSearchInput.value = eventSearchInput.value;
  applyFilters();
});

document.querySelectorAll('.save-button').forEach((button) => {
  button.addEventListener('click', () => {
    const saved = button.classList.toggle('is-saved');
    button.setAttribute('aria-pressed', String(saved));
    const eventName = button.getAttribute('aria-label')?.replace(/^Save /, '') || 'event';
    showToast(saved ? `${eventName} saved to your shows.` : `${eventName} removed from your shows.`);
  });
});

document.querySelectorAll('.card-arrow').forEach((button) => {
  button.addEventListener('click', () => {
    const eventName = button.getAttribute('aria-label')?.replace(/^Open /, '') || 'This event';
    showToast(`${eventName} details are coming right up.`);
  });
});

document.querySelector('#location-toggle')?.addEventListener('click', () => {
  showToast('Location set to New York, NY. Showing your nearby signal.');
});

document.querySelector('.profile-chip')?.addEventListener('click', () => {
  showToast('Your profile is ready for saved shows and new plans.');
});

document.querySelector('#join-button')?.addEventListener('click', (event) => {
  event.preventDefault();
  document.querySelector('#events')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('You are in. Let’s find your next live moment.');
});

document.querySelector('.browse-more a')?.addEventListener('click', (event) => {
  event.preventDefault();
  showToast('More events are syncing into your frequency.');
});

document.querySelector('.view-all-events')?.addEventListener('click', (event) => {
  event.preventDefault();
  showToast('You are already looking at this week’s signal.');
});

document.querySelectorAll('img').forEach((image) => {
  image.addEventListener('error', () => {
    image.parentElement?.classList.add('image-fallback');
  });
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
  }, { threshold: .12, rootMargin: '0px 0px -30px' });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

function updateTopbar() {
  topbar?.classList.toggle('is-scrolled', window.scrollY > 12);
}

window.addEventListener('scroll', updateTopbar, { passive: true });
updateTopbar();
applyFilters();
