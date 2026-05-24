import { addAnimationClasses } from './utils.js';

// ── Service worker ───────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  const register = () => navigator.serviceWorker.register('/sw.js');
  document.readyState === 'complete' ? register() : window.addEventListener('load', register);
}

// ── Nav scroll ───────────────────────────────────────────────────────────────
const nav = document.getElementById('main-nav');
const scrollIndicator = document.getElementById('scroll-indicator');

let _goldEl = null;
let _goldLength = 0;
let _ticking = false;

function onScroll() {
  if (_ticking) return;
  _ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;

    if (nav) nav.classList.toggle('nav--scrolled', y > 80);

    if (scrollIndicator) {
      scrollIndicator.style.opacity = y > 100 ? '0' : '1';
      scrollIndicator.style.pointerEvents = y > 100 ? 'none' : '';
    }

    if (_goldEl && _goldLength) {
      const docH = document.documentElement.scrollHeight;
      const vpH = window.innerHeight;
      const maxScroll = (docH - vpH) * 0.8;
      const progress = Math.min(y / Math.max(maxScroll, 1), 1);
      _goldEl.style.strokeDashoffset = _goldLength * (1 - progress);
    }

    _ticking = false;
  });
}

window.addEventListener('scroll', onScroll, { passive: true });

// ── Gold thread draw ─────────────────────────────────────────────────────────
function initGoldThread() {
  const el = document.querySelector('.gold-thread path, .gold-thread line');
  if (!el) return;
  try {
    const len = el.getTotalLength();
    if (!len) return;
    el.style.strokeDasharray = len;
    el.style.strokeDashoffset = len;
    _goldEl = el;
    _goldLength = len;
  } catch (e) {
    // getTotalLength not supported — skip animation
  }
}

// ── Mobile nav ───────────────────────────────────────────────────────────────
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!hamburger || !menu) return;

  function closeMenu() {
    menu.classList.remove('is-open');
    hamburger.classList.remove('nav__hamburger--open');
    hamburger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
  }

  hamburger.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    hamburger.classList.toggle('nav__hamburger--open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
  });

  menu.querySelectorAll('.nav__mobile-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', e => {
    if (menu.classList.contains('is-open') &&
        !menu.contains(e.target) &&
        !hamburger.contains(e.target)) {
      closeMenu();
    }
  });
}

// ── Card stack fan animation ─────────────────────────────────────────────────
function initCardStack() {
  const stack = document.querySelector('.card-stack');
  if (!stack) return;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      stack.classList.add('card-stack--animated');
      obs.disconnect();
    }
  }, { threshold: 0.3 });
  obs.observe(stack);
}

// ── Stat counter animation ───────────────────────────────────────────────────
function animateCount(el, target) {
  const start = performance.now();
  const duration = 1200;
  const tick = now => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(eased * target);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.textContent.replace(/\D/g, ''), 10);
      if (!isNaN(target)) animateCount(el, target);
      obs.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.count-up').forEach(el => obs.observe(el));
}

// ── Entrance animations ──────────────────────────────────────────────────────
function initAnimations() {
  document.querySelectorAll('section h2').forEach(el => el.classList.add('animate-ready'));

  document.querySelectorAll('.grid > *').forEach(el => {
    if (!el.classList.contains('animate-ready')) {
      el.classList.add('animate-ready');
    }
  });

  addAnimationClasses(document.querySelectorAll('.animate-ready'));
}

// ── Replace Eat icon with 3-prong fork and knife SVG ─────────────────────────
function replaceEatIcon() {
  const eatTab = document.querySelector('.mobile-nav__tab[href="restaurants.html"]');
  if (!eatTab) return;
  const svg = eatTab.querySelector('svg');
  if (!svg) return;
  svg.innerHTML = '<path d="M3 2v5Q3 11 7 11v11M7 2v9M11 2v5Q11 11 7 11"/><path d="M17 2v20M17 2c3 3 3 7 0 9"/>';
}

// ── Add to homescreen banner ──────────────────────────────────────────────────
function initAddToHomescreen() {
  if (localStorage.getItem('ath-dismissed')) return;
  if (window.matchMedia('(min-width: 769px)').matches) return;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
  const isStandalone = (window.navigator.standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches;

  if (isStandalone) return;

  function buildBanner(text, steps, btnLabel) {
    const el = document.createElement('div');
    el.className = 'ath-banner';
    el.id = 'ath-banner';
    el.innerHTML =
      '<div class="ath-banner__content">' +
        '<p class="ath-banner__text">' + text + '</p>' +
        (steps ? '<p class="ath-banner__steps">' + steps + '</p>' : '') +
      '</div>' +
      '<div class="ath-banner__actions">' +
        (btnLabel ? '<button class="ath-banner__btn" id="ath-action">' + btnLabel + '</button>' : '') +
        '<button class="ath-banner__close" id="ath-close">Dismiss</button>' +
      '</div>';
    return el;
  }

  function dismiss() {
    const b = document.getElementById('ath-banner');
    if (b) b.remove();
    localStorage.setItem('ath-dismissed', '1');
  }

  if (isIOS) {
    setTimeout(() => {
      const banner = buildBanner(
        'Add Dealr to your home screen.',
        'Tap the Share icon below, then select "Add to Home Screen".',
        null
      );
      document.body.appendChild(banner);
      document.getElementById('ath-close').addEventListener('click', dismiss);
    }, 3500);
    return;
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(() => {
      const banner = buildBanner('Add Dealr to your home screen for quick access.', null, 'Add');
      document.body.appendChild(banner);
      document.getElementById('ath-action').addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        dismiss();
      });
      document.getElementById('ath-close').addEventListener('click', dismiss);
    }, 3500);
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────
initGoldThread();
initMobileNav();
initCardStack();
initCounters();
initAnimations();
replaceEatIcon();
initAddToHomescreen();
