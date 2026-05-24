/**
 * Discovery Hub & Guides Logic
 * Handles dynamic link injection from discovery-links.json
 */

export async function initDiscoveryLinks() {
  try {
    const response = await fetch('data/discovery-links.json');
    if (!response.ok) throw new Error('Failed to load discovery links');
    
    const links = await response.json();
    
    // Find all elements with data-discovery-link attribute
    const elements = document.querySelectorAll('[data-discovery-link]');
    
    elements.forEach(el => {
      const key = el.getAttribute('data-discovery-link');
      if (links[key]) {
        if (el.tagName === 'A') {
          el.href = links[key];
        } else {
          // If not a link, maybe update text or something, but primarily for anchors
          el.textContent = links[key];
        }
      }
    });
  } catch (error) {
    console.error('Discovery Links Error:', error);
  }
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initDiscoveryLinks();
});
