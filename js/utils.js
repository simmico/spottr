/**
 * Formats a YYYY-MM-DD date string to "DD Mon YYYY"
 * @param {string} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[month - 1]} ${year}`;
}

/**
 * Returns number of days until the given date (negative if in the past)
 * @param {string} dateString - YYYY-MM-DD
 * @returns {number}
 */
export function daysUntil(dateString) {
  const target = new Date(dateString);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if the date is in the past
 * @param {string} dateString - YYYY-MM-DD
 * @returns {boolean}
 */
export function isExpired(dateString) {
  return daysUntil(dateString) < 0;
}

/**
 * Returns true if the date falls within the next X days
 * @param {string} dateString - YYYY-MM-DD
 * @param {number} days
 * @returns {boolean}
 */
export function isExpiringSoon(dateString, days = 7) {
  const d = daysUntil(dateString);
  return d >= 0 && d <= days;
}

/**
 * Formats a number as South African Rand, e.g. 1200 -> "R 1,200"
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return 'R ' + amount.toLocaleString('en-ZA');
}

/**
 * Standard debounce for search inputs
 * @param {Function} fn
 * @param {number} delay - ms
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Creates an IntersectionObserver and calls callback when each matched
 * element enters the viewport.
 * @param {string} selector
 * @param {Function} callback - receives (entry, observer)
 * @param {IntersectionObserverInit} options
 */
export function observeElements(selector, callback, options = {}) {
  const defaults = { threshold: 0.15 };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry, observer);
      }
    });
  }, { ...defaults, ...options });

  document.querySelectorAll(selector).forEach((el) => observer.observe(el));
}

/**
 * Adds .animate-ready to each element in the NodeList, then triggers
 * .animate-in when each enters the viewport. Grid children get staggered
 * delay classes.
 * @param {NodeList|Element[]} elements
 */
export function addAnimationClasses(elements) {
  const items = Array.from(elements);

  items.forEach((el) => el.classList.add('animate-ready'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = Array.from(el.parentElement?.children ?? [el]);
        const index    = siblings.indexOf(el) % 4;
        if (index > 0) el.classList.add(`animate-delay-${index}`);
        el.classList.add('animate-in');
        observer.unobserve(el);
      });
    },
    { threshold: 0.15 }
  );

  items.forEach((el) => observer.observe(el));
}
