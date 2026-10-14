import { loadRestaurantData, checkAllLibraryStatus, createRestaurantCards, createTextElement } from './tutorial-support.js';
import { countCuisines, getRestaurantCoordinates, selectRestaurants } from './data.js';

// Keep the shared dataset and library instances in one place.
let restaurants = [];
let myChart = null;
let myMap = null;
let markers = null;
let cardAnimation = null;
let chartRequested = false;
let mapRequested = false;
const shortlist = new Set();
const markerById = new Map();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const loadButton = document.querySelector('#load-data-button');

/** Load records on request, update feedback, and leave previous data usable after a failed reload. */
async function clickToLoad() {
    loadButton.disabled = true;
    document.querySelector('#loading-status').textContent = 'Loading restaurant data…';
    try {
        restaurants = await loadRestaurantData();
        document.querySelector('#loading-status').textContent = `${restaurants.length} restaurants loaded.`;
        document.querySelectorAll('.demo-button').forEach(button => { button.disabled = false; });
        const filter = document.querySelector('#cuisine-filter');
        const previousCuisine = filter.value;
        filter.replaceChildren(new Option('All cuisines', 'all'));
        countCuisines(restaurants).labels.forEach(cuisine => filter.add(new Option(cuisine, cuisine)));
        if ([...filter.options].some(option => option.value === previousCuisine)) filter.value = previousCuisine;
        document.querySelectorAll('#explore-form input, #explore-form select, #explore-form button, #chart-metric').forEach(control => { control.disabled = false; });
        updateExplorer();
        checkAllLibraryStatus();
        loadButton.textContent = 'Reload restaurant data';

    } catch (error) {
        const message = error.name === 'TimeoutError' ? 'The request timed out.' : error.message;
        document.querySelector('#loading-status').textContent = `${message} Select Try again to retry.${restaurants.length ? ' Previous data is still available.' : ''}`;
        loadButton.textContent = 'Try again';
    } finally {
        loadButton.disabled = false;
    }
}

// Bind native controls after the module and its deferred CDN scripts have loaded.
loadButton.addEventListener('click', clickToLoad);
checkAllLibraryStatus();
document.querySelector('#chart-button').addEventListener('click', createMyChart);
document.querySelector('#map-button').addEventListener('click', createMyMap);
document.querySelector('#explore-form').addEventListener('input', updateExplorer);
document.querySelector('#explore-form').addEventListener('submit', event => event.preventDefault());
document.querySelector('#reset-filters').addEventListener('click', resetFilters);
document.querySelector('#chart-metric').addEventListener('change', createMyChart);
document.querySelector('#download-results').addEventListener('click', downloadResults);
document.querySelector('#restaurant-cards').addEventListener('click', toggleComparison);
document.querySelector('#clear-shortlist').addEventListener('click', clearShortlist);
document.querySelector('#animation-button').addEventListener('click', animateMyCards);
reducedMotion.addEventListener('change', restoreVisibleCards);

/** Render exact cuisine counts or ratings as a table and enhance them with Chart.js when available. */
function createMyChart() {
    if (!restaurants.length) return;
    chartRequested = true;
    const selected = getSelectedRestaurants();
    const isRating = document.querySelector('#chart-metric').value === 'rating';
    const cuisineTotals = countCuisines(selected);
    const labels = isRating ? selected.map(restaurant => restaurant.name) : cuisineTotals.labels;
    const counts = isRating ? selected.map(restaurant => restaurant.rating) : cuisineTotals.counts;
    const metricTitle = isRating ? 'Restaurant ratings' : 'Restaurants by cuisine';
    const table = document.createElement('table');
    table.append(createTextElement('caption', metricTitle));
    const header = document.createElement('tr');
    (isRating ? ['Restaurant', 'Rating / 5'] : ['Cuisine', 'Restaurants']).forEach(text => {
        const cell = createTextElement('th', text);
        cell.scope = 'col';
        header.append(cell);
    });
    const head = document.createElement('thead');
    head.append(header);
    const body = document.createElement('tbody');
    labels.forEach((cuisine, index) => {
        const row = document.createElement('tr');
        row.append(createTextElement('td', cuisine), createTextElement('td', counts[index]));
        body.append(row);
    });
    table.append(head, body);
    document.querySelector('#chart-table').replaceChildren(table);
    const message = document.querySelector('#chart-message');
    const canvas = document.querySelector('#restaurant-chart');
    canvas.hidden = false;
    canvas.parentElement.style.height = `${isRating ? Math.max(320, selected.length * 44) : 320}px`;
    try {
        if (myChart) { myChart.destroy(); myChart = null; }
        if (typeof window.Chart !== 'function') throw new Error('Chart.js is unavailable.');
        myChart = new window.Chart(canvas, {
            type: 'bar',
            data: { labels, datasets: [{ label: isRating ? 'Rating / 5' : 'Restaurants', data: counts, backgroundColor: '#237569', borderRadius: 4 }] },
            options: {
                indexAxis: isRating ? 'y' : 'x',
                responsive: true,
                maintainAspectRatio: false,
                animation: reducedMotion.matches ? false : { duration: 450 },
                plugins: { legend: { display: false }, title: { display: true, text: isRating ? 'Rating by restaurant' : 'Restaurant count by cuisine' } },
                scales: isRating ? {
                    x: { beginAtZero: true, max: 5, title: { display: true, text: 'Rating / 5' } },
                    y: { ticks: { autoSkip: false }, title: { display: true, text: 'Restaurant' } }
                } : {
                    y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Number of restaurants' } },
                    x: { title: { display: true, text: 'Cuisine' } }
                }
            }
        });
        canvas.setAttribute('aria-label', `${metricTitle}; exact values appear in the table below`);
        message.textContent = selected.length ? `${selected.length} restaurants shown. Hover or tap a bar for its ${isRating ? 'rating' : 'count'}.` : 'No restaurants match these filters. Reset filters to see all eight.';
    } catch (error) {
        if (myChart) { myChart.destroy(); myChart = null; }
        window.Chart?.getChart?.(canvas)?.destroy();
        canvas.hidden = true;
        message.textContent = `${error.message} Exact values are available in the table.`;
    }
}

/** Filter records and update a reusable Leaflet map, with a text list when mapping fails. */
function createMyMap() {
    if (!restaurants.length) return;
    mapRequested = true;
    const selected = getSelectedRestaurants();
    const list = document.querySelector('#location-list');
    list.replaceChildren();
    selected.forEach(restaurant => {
        const entry = createTextElement('li', `${restaurant.name} · ${restaurant.cuisine} · ${restaurant.neighborhood} · ${restaurant.rating.toFixed(1)} / 5`);
        const locateButton = createTextElement('button', 'Show on map');
        locateButton.type = 'button';
        locateButton.setAttribute('aria-label', `Show ${restaurant.name} on map`);
        locateButton.addEventListener('click', () => {
            const marker = markerById.get(restaurant.id);
            if (marker && myMap) {
                myMap.setView(marker.getLatLng(), 16, { animate: !reducedMotion.matches });
                marker.openPopup();
                mapContainer.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
            }
        });
        entry.append(locateButton);
        list.append(entry);
    });
    const message = document.querySelector('#map-message');
    const mapContainer = document.querySelector('#restaurant-map');
    mapContainer.hidden = false;
    try {
        if (typeof window.L?.map !== 'function') throw new Error('Leaflet is unavailable.');
        if (!myMap) {
            myMap = window.L.map('restaurant-map', { scrollWheelZoom: false }).setView([38.9897, -76.9378], 12);
            const tiles = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });
            tiles.on('tileerror', () => {
                message.textContent = 'Map tiles could not load. Sample markers and the restaurant list are still available.';
            });
            tiles.addTo(myMap);
            markers = window.L.featureGroup().addTo(myMap);
        }
        markers.clearLayers();
        markerById.clear();
        selected.forEach(restaurant => {
            const popup = document.createElement('div');
            popup.append(createTextElement('strong', restaurant.name),
                createTextElement('p', `${restaurant.cuisine} · ${restaurant.rating.toFixed(1)} / 5`),
                createTextElement('p', `${restaurant.neighborhood} · Sample location`));
            const marker = window.L.marker(getRestaurantCoordinates(restaurant), { title: restaurant.name, alt: restaurant.name })
                .bindPopup(popup).addTo(markers);
            markerById.set(restaurant.id, marker);
        });
        myMap.invalidateSize();
        if (selected.length) myMap.fitBounds(markers.getBounds(), { padding: [30, 30], maxZoom: 14, animate: !reducedMotion.matches });
        message.textContent = `${selected.length} sample ${selected.length === 1 ? 'location' : 'locations'} shown. Select a marker for restaurant details.`;
    } catch (error) {
        if (myMap) myMap.remove();
        myMap = null;
        markers = null;
        markerById.clear();
        list.querySelectorAll('button').forEach(button => { button.hidden = true; });
        mapContainer.hidden = true;
        message.textContent = `${error.message} Use the filtered restaurant list below.`;
    }
}

/** Cancel any running animation and restore visible cards when motion preferences change. */
function restoreVisibleCards() {
    cardAnimation?.kill();
    cardAnimation = null;
    document.querySelectorAll('.restaurant-card').forEach(card => {
        card.style.removeProperty('opacity');
        card.style.removeProperty('transform');
    });
}

/** Animate all restaurant cards on demand, retaining static content on failure or reduced motion. */
function animateMyCards() {
    if (!restaurants.length) return;
    restoreVisibleCards();
    const selected = getSelectedRestaurants();
    renderCards(selected);
    const message = document.querySelector('#animation-message');
    if (!selected.length) {
        message.textContent = 'No cards to animate. Reset filters to see all eight.';
        return;
    }
    if (reducedMotion.matches) {
        message.textContent = 'Reduced motion is enabled. All restaurant cards are shown without animation.';
        return;
    }
    try {
        if (typeof window.gsap?.fromTo !== 'function') throw new Error('GSAP is unavailable.');
        cardAnimation = window.gsap.fromTo('.restaurant-card',
            { opacity: 0, y: 24, scale: 0.96 },
            { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.08, ease: 'back.out(1.2)', clearProps: 'opacity,transform',
                onComplete: () => { message.textContent = `${selected.length} restaurant cards revealed.`; } });
        message.textContent = `Animating ${selected.length} restaurant cards.`;
    } catch (error) {
        restoreVisibleCards();
        message.textContent = `${error.message} All restaurant cards are shown without animation.`;
    }
}


/** Read the native filter controls and return the matching records in the chosen sort order. */
function getSelectedRestaurants() {
    return selectRestaurants(restaurants, {
        query: document.querySelector('#restaurant-search').value,
        cuisine: document.querySelector('#cuisine-filter').value,
        price: document.querySelector('#price-filter').value,
        minimumRating: Number(document.querySelector('#rating-filter').value),
        sort: document.querySelector('#sort-order').value
    });
}

/** Render safe cards and add native comparison toggles without hiding content for animation. */
function renderCards(selected) {
    createRestaurantCards(selected);
    document.querySelectorAll('.restaurant-card').forEach((card, index) => {
        const identifier = selected[index].id;
        const button = createTextElement('button', shortlist.has(identifier) ? 'Remove from comparison' : 'Compare');
        button.type = 'button';
        button.dataset.restaurantId = identifier;
        button.setAttribute('aria-pressed', String(shortlist.has(identifier)));
        button.setAttribute('aria-label', `Compare ${selected[index].name}`);
        card.append(button);
    });
}

/** Synchronize cards, requested visualizations, result feedback, and download availability. */
function updateExplorer() {
    if (!restaurants.length) return;
    const selected = getSelectedRestaurants();
    restoreVisibleCards();
    renderCards(selected);
    const average = selected.length ? (selected.reduce((sum, restaurant) => sum + restaurant.rating, 0) / selected.length).toFixed(2) : null;
    document.querySelector('#results-summary').textContent = selected.length
        ? `${selected.length} of ${restaurants.length} restaurants · Average rating ${average} / 5`
        : 'No restaurants match these filters. Reset filters to start again.';
    document.querySelector('#download-results').disabled = selected.length === 0;
    document.querySelector('#animation-message').textContent = selected.length ? `${selected.length} cards ready to animate.` : 'No cards match these filters.';
    if (chartRequested) createMyChart();
    if (mapRequested) createMyMap();
    renderComparison();
}

/** Restore default filters, preserving the user's comparison choices. */
function resetFilters() {
    document.querySelector('#explore-form').reset();
    updateExplorer();
}

/** Toggle a card's shortlist membership, limiting the comparison to three records. */
function toggleComparison(event) {
    const button = event.target.closest('button[data-restaurant-id]');
    if (!button) return;
    const identifier = Number(button.dataset.restaurantId);
    if (shortlist.has(identifier)) shortlist.delete(identifier);
    else if (shortlist.size < 3) shortlist.add(identifier);
    else {
        document.querySelector('#compare-message').textContent = 'You can compare up to three restaurants. Remove one choice before adding another.';
        return;
    }
    button.setAttribute('aria-pressed', String(shortlist.has(identifier)));
    button.textContent = shortlist.has(identifier) ? 'Remove from comparison' : 'Compare';
    renderComparison();
}

/** Build an accessible comparison table using the original records, independent of filters. */
function renderComparison() {
    const selected = [...shortlist].map(identifier => restaurants.find(restaurant => restaurant.id === identifier)).filter(Boolean);
    const container = document.querySelector('#comparison-table');
    container.replaceChildren();
    document.querySelector('#clear-shortlist').disabled = selected.length === 0;
    document.querySelector('#compare-message').textContent = selected.length ? `${selected.length} of 3 comparison slots used.` : 'No restaurants selected.';
    if (!selected.length) return;
    const table = document.createElement('table');
    table.append(createTextElement('caption', 'Shortlisted restaurant details'));
    const head = document.createElement('thead');
    const heading = document.createElement('tr');
    const label = createTextElement('th', 'Detail');
    label.scope = 'col';
    heading.append(label);
    selected.forEach(restaurant => {
        const cell = createTextElement('th', restaurant.name);
        cell.scope = 'col';
        heading.append(cell);
    });
    head.append(heading);
    const body = document.createElement('tbody');
    for (const [title, field] of [['Cuisine', 'cuisine'], ['Rating / 5', 'rating'], ['Price', 'priceRange'], ['Neighborhood', 'neighborhood'], ['Hours', 'hours']]) {
        const row = document.createElement('tr');
        const header = createTextElement('th', title);
        header.scope = 'row';
        row.append(header);
        selected.forEach(restaurant => row.append(createTextElement('td', restaurant[field])));
        body.append(row);
    }
    table.append(head, body);
    container.append(table);
}

/** Clear the temporary shortlist and refresh the visible comparison controls. */
function clearShortlist() {
    shortlist.clear();
    updateExplorer();
}

/** Download matching source records as JSON and release the temporary browser URL. */
function downloadResults() {
    const selected = getSelectedRestaurants();
    if (!selected.length) return;
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'restaurant-results.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
