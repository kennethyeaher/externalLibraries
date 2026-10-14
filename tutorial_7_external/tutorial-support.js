import { validateRestaurants } from './data.js';

/** Fetch and validate the local dataset, rejecting HTTP errors and requests over ten seconds. */
export async function loadRestaurantData() {
    const response = await fetch('./restaurants.json', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Restaurant data could not load (HTTP ${response.status}).`);
    return validateRestaurants(await response.json());
}

/** Create a text element from a tag, content, and optional class; return the safe DOM node. */
export function createTextElement(tag, text, className = '') {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
}

/** Report each library's availability without hiding the views when a CDN fails. */
export function checkAllLibraryStatus() {
    const libraries = [
        ['chart-status', typeof window.Chart === 'function'],
        ['leaflet-status', typeof window.L?.map === 'function'],
        ['gsap-status', typeof window.gsap?.fromTo === 'function']
    ];
    libraries.forEach(([identifier, available]) => {
        const status = document.getElementById(identifier);
        status.textContent = available ? 'Loaded' : 'Unavailable · fallback ready';
        status.className = available ? 'status-loaded' : 'status-failed';
    });
}

/** Render all records as visible cards; records are inserted as text, never interpreted as HTML. */
export function createRestaurantCards(records) {
    const container = document.querySelector('#restaurant-cards');
    container.replaceChildren();
    records.forEach(restaurant => {
        const card = createTextElement('article', '', 'restaurant-card');
        card.append(
            createTextElement('h4', restaurant.name),
            createTextElement('p', `${restaurant.cuisine} · ${restaurant.priceRange}`),
            createTextElement('p', `${restaurant.rating.toFixed(1)} / 5 · ${restaurant.neighborhood}`),
            createTextElement('p', restaurant.hours)
        );
        container.append(card);
    });
}
