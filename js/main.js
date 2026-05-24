import { isExpired, daysUntil, isExpiringSoon, formatDate, debounce, addAnimationClasses } from './utils.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.unregister());
  });
}

let _cache = null;

export async function loadDeals() {
  if (_cache) return _cache;
  try {
    const r = await fetch('/data/dealr.json');
    if (!r.ok) throw new Error('fetch failed');
    const data = await r.json();
    _cache = Array.isArray(data) ? data : (data.deals || []);
    return _cache;
  } catch (e) {
    console.warn('Dealr: could not load deals', e);
    return [];
  }
}

export function filterDeals(deals, category = 'all', searchTerm = '') {
  let result = deals.filter(d => !isExpired(d.expires));
  if (category !== 'all') {
    result = result.filter(d => d.category === category);
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    result = result.filter(d =>
      (d.brand || '').toLowerCase().includes(term) ||
      (d.title || '').toLowerCase().includes(term) ||
      (d.tip  || '').toLowerCase().includes(term)
    );
  }
  return result;
}

export function sortDeals(deals) {
  return [...deals].sort((a, b) => {
    if (a.verified && !b.verified) return -1;
    if (!a.verified && b.verified) return 1;
    return daysUntil(a.expires) - daysUntil(b.expires);
  });
}

const LIGHTBULB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex-shrink:0"><path d="M9 21h6"/><path d="M12 3a6 6 0 0 1 6 6c0 2.5-1.5 4.5-3 6H9c-1.5-1.5-3-3.5-3-6a6 6 0 0 1 6-6z"/></svg>`;

export function buildCardHTML(deal) {
  const days = daysUntil(deal.expires);
  const soon = isExpiringSoon(deal.expires);

  const expiringBadge = soon
    ? '<span class="card__expiring-badge">Expiring soon</span>'
    : '';

  const verifiedRow = deal.verified
    ? `<div style="display:inline-flex;align-items:center;gap:6px;margin-top:6px;font-family:'DM Sans',sans-serif;font-weight:400;font-size:0.75rem;color:var(--color-gold)"><span style="width:4px;height:4px;border-radius:50%;background:var(--color-gold);flex-shrink:0;display:inline-block"></span>Verified</div>`
    : '';

  const normalPrice = deal.normal_price
    ? `<span class="card__normal-price">${deal.normal_price}</span>`
    : '';

  const savingBadge = deal.saving
    ? `<span class="card__saving-badge">${deal.saving}</span>`
    : '';

  const expiryEl = soon
    ? `<span class="card__expiry card__expiry--soon">${days} day${days !== 1 ? 's' : ''} left</span>`
    : `<span class="card__expiry">Until ${formatDate(deal.expires)}</span>`;

  return `<article class="card animate-ready" style="border:1px solid rgba(32,59,55,0.15)">
  ${expiringBadge}
  <div class="card__top-row">
    <span class="card__brand">${deal.brand}</span>
    <span class="card__category-badge">${deal.category}</span>
  </div>
  ${verifiedRow}
  <h3 class="card__title">${deal.title}</h3>
  <div class="card__pricing">
    <span class="card__deal-price">${deal.deal_price}</span>
    ${normalPrice}
    ${savingBadge}
  </div>
  <div style="margin-top:16px;border-top:1px solid rgba(150,205,176,0.2);padding-top:14px">
    <div style="display:flex;align-items:center;gap:6px;color:var(--color-mint)">
      ${LIGHTBULB_SVG}
      <span style="font-family:'DM Sans',sans-serif;font-weight:500;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.08em">How to maximise this</span>
    </div>
    <p style="font-family:'DM Sans',sans-serif;font-weight:400;font-size:0.85rem;color:rgba(150,205,176,0.85);font-style:italic;margin-top:4px;line-height:1.5">${deal.tip}</p>
  </div>
  <div class="card__bottom-row" style="margin-top:16px">
    ${expiryEl}
    <a href="${deal.link}" class="card__view-link" target="_blank" rel="noopener noreferrer">View deal →</a>
  </div>
</article>`;
}

export function renderDeals(containerSelector, deals, maxCount = null) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  container.innerHTML = '';

  const list = maxCount ? deals.slice(0, maxCount) : deals;

  if (!list.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:60px 0;grid-column:1/-1;font-family:\'DM Sans\',sans-serif;font-weight:400">No deals found.</p>';
    return;
  }

  container.innerHTML = list.map(buildCardHTML).join('');
  addAnimationClasses(container.querySelectorAll('.animate-ready'));
  attachCardTilt(container.querySelectorAll('.card'));
}

export function attachCardTilt(cardElements) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  Array.from(cardElements).forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      card.style.transition = 'box-shadow 200ms ease';
      card.style.transform = `perspective(1000px) rotateX(${-dy * 3}deg) rotateY(${dx * 3}deg) translateY(-4px)`;
      card.style.boxShadow = '0 12px 32px rgba(8,27,27,0.12)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 300ms ease, box-shadow 300ms ease';
      card.style.transform = '';
      card.style.boxShadow = '';
      setTimeout(() => { card.style.transition = ''; }, 300);
    });
  });
}

async function _refresh(dealsGridSelector, maxCount, barEl) {
  const deals = await loadDeals();
  const activeBtn = barEl
    ? barEl.querySelector('.filter-btn--active')
    : document.querySelector('.filter-btn--active');
  const category = activeBtn?.dataset.category || 'all';
  const searchInput = document.querySelector('#deal-search');
  const searchTerm = searchInput?.value.trim() || '';
  const filtered = filterDeals(deals, category, searchTerm);
  const sorted = sortDeals(filtered);
  renderDeals(dealsGridSelector, sorted, maxCount);
  const counter = document.querySelector('#results-count');
  if (counter) counter.textContent = `Showing ${sorted.length} deal${sorted.length !== 1 ? 's' : ''}`;
}

export function initFilterBar(containerSelector, dealsGridSelector, maxCount = null) {
  const bar = document.querySelector(containerSelector);
  if (!bar) return;

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
    btn.classList.add('filter-btn--active');
    const cat = btn.dataset.category || 'all';
    history.replaceState(null, '', cat === 'all' ? location.pathname : '#' + cat);
    _refresh(dealsGridSelector, maxCount, bar);
  });

  const hash = location.hash.slice(1);
  if (hash) {
    const matchBtn = bar.querySelector(`[data-category="${hash}"]`);
    if (matchBtn) {
      bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
      matchBtn.classList.add('filter-btn--active');
      _refresh(dealsGridSelector, maxCount, bar);
    }
  }
}

export function initSearch(inputSelector, dealsGridSelector, maxCount = null) {
  const input = document.querySelector(inputSelector);
  if (!input) return;
  input.addEventListener('input', debounce(() => _refresh(dealsGridSelector, maxCount, null), 300));
}
