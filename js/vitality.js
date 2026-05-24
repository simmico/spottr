// Verify rates and caps at discovery.co.za before publishing
const CASHBACK_RATES = {
  Bronze:  0.15,
  Silver:  0.20,
  Gold:    0.25,
  Diamond: 0.25
};

const MONTHLY_CAPS = {
  healthyFood: 1000,  // per adult per month
  healthyCare: 500    // per adult per month
};

const state = {
  status:           'Gold',
  members:          1,
  product:          'Medical Aid',
  healthyFoodSpend: 1500,
  healthyCareSpend: 400
};

function getCaps(members) {
  return {
    food: MONTHLY_CAPS.healthyFood * members,
    care: MONTHLY_CAPS.healthyCare * members
  };
}

function calculateCashback(s) {
  const rate = CASHBACK_RATES[s.status];
  const caps = getCaps(s.members);
  const food    = Math.min(s.healthyFoodSpend * rate, caps.food);
  const care    = Math.min(s.healthyCareSpend * rate, caps.care);
  const monthly = food + care;
  const annual  = monthly * 12;
  return { food, care, monthly, annual, caps, rate };
}

function getStatusMessage(result, s) {
  const cap = result.caps.food;

  if (s.healthyFoodSpend > cap) {
    const excess   = Math.round(s.healthyFoodSpend - cap);
    return `You are spending R${excess} above your HealthyFood cap. To maximise your benefit, keep your qualifying food spend under R${cap} per month.`;
  }

  const remaining = cap - s.healthyFoodSpend * result.rate;
  if (remaining < 50) {
    return 'You are maximising your HealthyFood benefit this month. Well done!';
  }

  const spendMore = Math.round(remaining / result.rate);
  return `You have R${Math.round(remaining)} remaining in your HealthyFood cap. You could spend up to R${spendMore} more to fully maximise your benefit.`;
}

function fmt(n) {
  return 'R' + Math.round(n).toLocaleString('en-ZA');
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function updateProgressBar(fillId, spend, cap) {
  const fill = document.getElementById(fillId);
  if (!fill) return;
  const pct = Math.min(spend / cap * 100, 100);
  fill.style.width = pct + '%';
  if (spend >= cap) {
    fill.style.backgroundColor = 'var(--color-gold-light)';
  } else if (cap - spend < 200) {
    fill.style.backgroundColor = 'var(--color-gold)';
  } else {
    fill.style.backgroundColor = 'var(--color-light)';
  }
}

function updateUI(result) {
  const totalEl = document.getElementById('total-cashback');
  if (totalEl) {
    totalEl.textContent = fmt(result.monthly);
    totalEl.classList.remove('anim-count-bounce');
    void totalEl.offsetWidth;
    totalEl.classList.add('anim-count-bounce');
  }

  setEl('cashback-food',    fmt(result.food));
  setEl('cashback-care',    fmt(result.care));
  setEl('cashback-monthly', fmt(result.monthly));
  setEl('cashback-annual',  fmt(result.annual));

  setEl('healthy-food-cap',  `Monthly cap: ${fmt(result.caps.food)}`);
  setEl('healthy-care-cap',  `Monthly cap: ${fmt(result.caps.care)}`);

  updateProgressBar('healthy-food-progress', state.healthyFoodSpend, result.caps.food);
  updateProgressBar('healthy-care-progress', state.healthyCareSpend, result.caps.care);

  const msgEl = document.getElementById('cashback-message');
  if (msgEl) msgEl.textContent = getStatusMessage(result, state);
}

function recalculate() {
  updateUI(calculateCashback(state));
}

function activatePill(btn) {
  const group = btn.closest('.pill-group');
  if (group) group.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('pill-btn--active'));
  btn.classList.add('pill-btn--active');
}

function initCalculator() {
  // Status buttons
  ['Bronze', 'Silver', 'Gold', 'Diamond'].forEach(s => {
    const btn = document.getElementById('status-' + s);
    if (!btn) return;
    btn.addEventListener('click', () => {
      state.status = s;
      activatePill(btn);
      recalculate();
    });
  });

  // Members buttons
  [['1', 1], ['2', 2]].forEach(([id, n]) => {
    const btn = document.getElementById('members-' + id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      state.members = n;
      activatePill(btn);
      recalculate();
    });
  });

  // Product buttons (note only — no calculation change currently)
  [['medical', 'Medical Aid'], ['bank', 'Bank'], ['life', 'Life']].forEach(([key, label]) => {
    const btn = document.getElementById('product-' + key);
    if (!btn) return;
    btn.addEventListener('click', () => {
      state.product = label;
      activatePill(btn);
    });
  });

  // HealthyFood slider
  const foodSlider = document.getElementById('healthy-food-slider');
  if (foodSlider) {
    foodSlider.addEventListener('input', e => {
      state.healthyFoodSpend = Number(e.target.value);
      setEl('healthy-food-label', 'R' + Number(e.target.value).toLocaleString('en-ZA') + ' per month');
      recalculate();
    });
  }

  // HealthyCare slider
  const careSlider = document.getElementById('healthy-care-slider');
  if (careSlider) {
    careSlider.addEventListener('input', e => {
      state.healthyCareSpend = Number(e.target.value);
      setEl('healthy-care-label', 'R' + Number(e.target.value).toLocaleString('en-ZA') + ' per month');
      recalculate();
    });
  }

  recalculate();
}

initCalculator();
