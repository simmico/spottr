import { addAnimationClasses } from './utils.js';

let _bankCache = null;

export async function loadBankingData() {
  if (_bankCache) return _bankCache;
  const res = await fetch('/data/banking.json');
  if (!res.ok) throw new Error('Failed to load banking data');
  const data = await res.json();
  _bankCache = data.banks;
  return _bankCache;
}

const SPEND_BENEFIT_MAP = {
  'groceries':       t => t.grocery_benefit,
  'fuel':            t => t.fuel_benefit,
  'travel':          t => t.travel_benefit,
  'gym':             t => t.gym_benefit,
  'eating-out':      t => t.entertainer,
  'entertainment':   t => t.entertainer,
  'pharmacy':        t => t.vitality_partner,
  'online-shopping': t => !!t.rewards
};

const CATEGORY_KEYWORDS = {
  'groceries':       ['grocer', 'food', 'pick n pay', 'checkers', 'shoprite', 'woolworth'],
  'fuel':            ['fuel', 'petrol', 'bp', 'shell', 'engen', 'sasol', 'caltex'],
  'travel':          ['travel', 'lounge', 'airport', 'flight', 'insurance'],
  'gym':             ['gym', 'fitness', 'wellness', 'vitality', 'virgin active', 'planet fitness'],
  'eating-out':      ['entertainer', 'dining', 'restaurant'],
  'entertainment':   ['entertainer', 'entertainment', 'streaming'],
  'pharmacy':        ['pharma', 'dis-chem', 'clicks', 'health', 'vitality', 'medical'],
  'online-shopping': ['online', 'cashback', 'rewards', 'ebucks', 'ucount', 'greenbacks']
};

export function scoreAccount(tier, bank, preferences) {
  let score = 0;

  let spendMatches = 0;
  for (const cat of preferences.spending) {
    if (spendMatches >= 3) break;
    const matcher = SPEND_BENEFIT_MAP[cat];
    if (matcher && matcher(tier)) spendMatches++;
  }
  score += spendMatches;

  if (preferences.income) {
    const [minStr] = preferences.income.split('-');
    const userMin = parseInt(minStr, 10);
    if (userMin >= tier.income_min && userMin <= tier.income_max) score++;
  }

  const p = preferences.priority;
  if      (p === 'fees'      && tier.monthly_fee_from < 150)                    score++;
  else if (p === 'rewards'   && tier.rewards)                                   score++;
  else if (p === 'lifestyle' && (tier.entertainer || tier.vitality_partner))    score++;
  else if (p === 'app'       && ['fnb', 'capitec', 'discovery'].includes(bank.id)) score++;

  return score;
}

function getMatchedBenefits(tier, spending) {
  const matched = new Set();
  for (const cat of spending) {
    if (matched.size >= 3) break;
    const keywords = CATEGORY_KEYWORDS[cat] || [];
    for (const benefit of tier.benefits) {
      if (keywords.some(kw => benefit.toLowerCase().includes(kw))) {
        matched.add(benefit);
        break;
      }
    }
  }
  if (matched.size === 0) matched.add(tier.key_benefit);
  return [...matched].slice(0, 3);
}

export function filterAndScoreAccounts(banks, preferences) {
  const results = [];
  for (const bank of banks) {
    for (const tier of bank.tiers) {
      const score = scoreAccount(tier, bank, preferences);
      if (score >= 2) {
        const matchedBenefits = getMatchedBenefits(tier, preferences.spending);
        results.push({ tier, bank, score, matchedBenefits });
      }
    }
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 6);
}

const CHECK_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const CHEVRON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;

export function buildResultCard(tier, bank, score, matchedBenefits) {
  const dots = Array.from({ length: 5 }, (_, i) =>
    `<span class="score-dot${i < score ? ' score-dot--filled' : ''}"></span>`
  ).join('');

  const matchedHTML = matchedBenefits.map(b =>
    `<li class="result-card__match">${CHECK_SVG}${b}</li>`
  ).join('');

  const allBenefitsHTML = tier.benefits.map(b => `<li>${b}</li>`).join('');

  return `
<article class="result-card animate-ready">
  <div class="result-card__header">
    <span class="bank-badge" style="background-color:${bank.colour}">${bank.logo_initial}</span>
    <div class="result-card__title">
      <span class="result-card__bank">${bank.name}</span>
      <span class="result-card__tier">${tier.name}</span>
    </div>
    <span class="result-card__fee">${tier.monthly_fee}<span class="result-card__fee-label">/mo</span></span>
  </div>
  <div class="score-dots" aria-label="${score} out of 5 match">${dots}</div>
  <ul class="result-card__matches">${matchedHTML}</ul>
  <button class="result-card__expand" type="button" aria-expanded="false">View full details</button>
  <div class="result-card__details">
    <ul class="result-card__details-list">${allBenefitsHTML}</ul>
    <p class="result-card__key-benefit">${tier.key_benefit}</p>
  </div>
</article>`;
}

export function renderResults(accounts, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  if (accounts.length === 0) {
    container.innerHTML = '<p class="no-results">No exact matches found. Try adjusting your selections.</p>';
    return;
  }

  container.innerHTML = accounts.map(({ tier, bank, score, matchedBenefits }) =>
    buildResultCard(tier, bank, score, matchedBenefits)
  ).join('');

  addAnimationClasses(container.querySelectorAll('.animate-ready'));

  container.querySelectorAll('.result-card__expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.result-card');
      const details = card.querySelector('.result-card__details');
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      details.classList.toggle('result-card__details--open', !expanded);
      btn.textContent = expanded ? 'View full details' : 'Hide details';
    });
  });
}

export function buildComparisonTable(banks, containerSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.innerHTML = banks.map((bank, idx) => {
    const isOpen = idx === 0;

    const rowsHTML = bank.tiers.map((tier, i) => `
<tr${i % 2 === 1 ? ' class="comp-table__row--alt"' : ''}>
  <td>${tier.name}</td>
  <td>${tier.monthly_fee}</td>
  <td>${tier.rewards}</td>
  <td>${tier.key_benefit}</td>
  <td class="comp-table__check">${tier.entertainer ? '✓' : '—'}</td>
  <td class="comp-table__check">${tier.vitality_partner ? '✓' : '—'}</td>
</tr>`).join('');

    return `
<div class="comp-bank${isOpen ? ' comp-bank--open' : ''}">
  <button class="comp-bank__header" type="button" aria-expanded="${isOpen}">
    <span class="comp-bank__name">
      <span class="bank-badge bank-badge--sm" style="background-color:${bank.colour}">${bank.logo_initial}</span>
      ${bank.name}
    </span>
    <span class="comp-bank__meta">${bank.tiers.length} tier${bank.tiers.length !== 1 ? 's' : ''}</span>
    ${CHEVRON_SVG}
  </button>
  <div class="comp-bank__body">
    <div class="comp-table-wrapper">
      <table class="comp-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Monthly fee</th>
            <th>Rewards</th>
            <th>Key benefit</th>
            <th>Entertainer</th>
            <th>Discovery partner</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>
  </div>
</div>`;
  }).join('');

  container.querySelectorAll('.comp-bank__header').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.comp-bank');
      const isOpen = section.classList.contains('comp-bank--open');
      section.classList.toggle('comp-bank--open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });
}

function initQuiz(banks) {
  const state = { spending: [], income: null, priority: null };

  const steps = [
    document.getElementById('quiz-step-1'),
    document.getElementById('quiz-step-2'),
    document.getElementById('quiz-step-3')
  ];
  const resultsPanel = document.getElementById('quiz-results');
  const progressEl   = document.querySelector('.quiz-progress');

  function showStep(n) {
    steps.forEach((s, i) => { if (s) s.hidden = (i !== n); });
    if (resultsPanel) resultsPanel.hidden = true;
    if (progressEl) progressEl.textContent = `Step ${n + 1} of 3`;
  }

  function showResults() {
    steps.forEach(s => { if (s) s.hidden = true; });
    if (resultsPanel) resultsPanel.hidden = false;
    if (progressEl)   progressEl.textContent = '';

    const accounts = filterAndScoreAccounts(banks, state);
    renderResults(accounts, '#results-grid');

    resultsPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Step 1 — multi-select spending (max 3)
  const step1Options = document.querySelectorAll('#quiz-step-1 .quiz-option');
  const nextBtn1     = document.getElementById('quiz-next-1');

  step1Options.forEach(opt => {
    opt.addEventListener('click', () => {
      if (opt.disabled) return;
      const val     = opt.dataset.value;
      const already = opt.classList.contains('quiz-option--selected');

      if (already) {
        opt.classList.remove('quiz-option--selected');
        state.spending = state.spending.filter(v => v !== val);
      } else {
        if (state.spending.length >= 3) return;
        opt.classList.add('quiz-option--selected');
        state.spending.push(val);
      }

      step1Options.forEach(o => {
        const lock = state.spending.length >= 3 && !o.classList.contains('quiz-option--selected');
        o.disabled = lock;
        o.classList.toggle('quiz-option--disabled', lock);
      });

      if (nextBtn1) nextBtn1.disabled = state.spending.length === 0;
    });
  });

  if (nextBtn1) {
    nextBtn1.disabled = true;
    nextBtn1.addEventListener('click', () => showStep(1));
  }

  // Step 2 — single-select income
  const step2Options = document.querySelectorAll('#quiz-step-2 .quiz-option');
  const nextBtn2     = document.getElementById('quiz-next-2');
  const backBtn2     = document.getElementById('quiz-back-2');

  step2Options.forEach(opt => {
    opt.addEventListener('click', () => {
      step2Options.forEach(o => o.classList.remove('quiz-option--selected'));
      opt.classList.add('quiz-option--selected');
      state.income = opt.dataset.value;
      if (nextBtn2) nextBtn2.disabled = false;
    });
  });

  if (nextBtn2) {
    nextBtn2.disabled = true;
    nextBtn2.addEventListener('click', () => showStep(2));
  }
  if (backBtn2) backBtn2.addEventListener('click', () => showStep(0));

  // Step 3 — single-select priority
  const step3Options = document.querySelectorAll('#quiz-step-3 .quiz-option');
  const showBtn      = document.getElementById('quiz-show-results');
  const backBtn3     = document.getElementById('quiz-back-3');

  step3Options.forEach(opt => {
    opt.addEventListener('click', () => {
      step3Options.forEach(o => o.classList.remove('quiz-option--selected'));
      opt.classList.add('quiz-option--selected');
      state.priority = opt.dataset.value;
      if (showBtn) showBtn.disabled = false;
    });
  });

  if (showBtn) {
    showBtn.disabled = true;
    showBtn.addEventListener('click', showResults);
  }
  if (backBtn3) backBtn3.addEventListener('click', () => showStep(1));

  // Start over
  const startOverLink = document.getElementById('quiz-start-over');
  if (startOverLink) {
    startOverLink.addEventListener('click', e => {
      e.preventDefault();
      state.spending = [];
      state.income   = null;
      state.priority = null;

      step1Options.forEach(o => {
        o.classList.remove('quiz-option--selected', 'quiz-option--disabled');
        o.disabled = false;
      });
      step2Options.forEach(o => o.classList.remove('quiz-option--selected'));
      step3Options.forEach(o => o.classList.remove('quiz-option--selected'));

      if (nextBtn1) nextBtn1.disabled = true;
      if (nextBtn2) nextBtn2.disabled = true;
      if (showBtn)  showBtn.disabled  = true;

      showStep(0);
    });
  }

  showStep(0);
}

function init() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
}

async function run() {
  try {
    const banks = await loadBankingData();
    initQuiz(banks);
    buildComparisonTable(banks, '#comparison-grid');
  } catch (err) {
    console.error('Banking data failed to load:', err);
  }
}

init();
