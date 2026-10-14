import { loadRestaurantData, checkAllLibraryStatus, createRestaurantCards, createTextElement } from './tutorial-support.js';
import { countCuisines, getRestaurantCoordinates } from './data.js';

// Keep the shared dataset and library instances in one place.
let restaurants = [];
let myChart = null;
let myMap = null;
let markers = null;
let cardAnimation = null;
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
        filter.replaceChildren(new Option('All cuisines', 'all'));
        countCuisines(restaurants).labels.forEach(cuisine => filter.add(new Option(cuisine, cuisine)));
        filter.disabled = false;
        restoreVisibleCards();
        createRestaurantCards(restaurants);
        checkAllLibraryStatus();
        loadButton.textContent = 'Reload restaurant data';
        if (myChart) createMyChart();
        if (myMap) createMyMap();
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
document.querySelector('#cuisine-filter').addEventListener('change', createMyMap);
document.querySelector('#animation-button').addEventListener('click', animateMyCards);
reducedMotion.addEventListener('change', restoreVisibleCards);

/** Render cuisine totals as a table and enhance them with a bar chart when Chart.js is available. */
function createMyChart() {
    if (!restaurants.length) return;
    const { labels, counts } = countCuisines(restaurants);
    const table = document.createElement('table');
    table.append(createTextElement('caption', 'Restaurants by cuisine'));
    const header = document.createElement('tr');
    ['Cuisine', 'Restaurants'].forEach(text => {
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
    try {
        if (myChart) { myChart.destroy(); myChart = null; }
        if (typeof window.Chart !== 'function') throw new Error('Chart.js is unavailable.');
        myChart = new window.Chart(canvas, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Restaurants', data: counts, backgroundColor: '#237569', borderRadius: 4 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: reducedMotion.matches ? false : { duration: 450 },
                plugins: { legend: { display: false }, title: { display: true, text: 'Restaurant count by cuisine' } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Number of restaurants' } },
                    x: { title: { display: true, text: 'Cuisine' } }
                }
            }
        });
        message.textContent = `${restaurants.length} restaurants across ${labels.length} cuisines. Hover or tap a bar for its count.`;
    } catch (error) {
        if (myChart) { myChart.destroy(); myChart = null; }
        window.Chart?.getChart?.(canvas)?.destroy();
        canvas.hidden = true;
        message.textContent = `${error.message} Exact cuisine totals are available in the table.`;
    }
}

/** Filter records and update a reusable Leaflet map, with a text list when mapping fails. */
function createMyMap() {
    if (!restaurants.length) return;
    const cuisine = document.querySelector('#cuisine-filter').value;
    const selected = restaurants.filter(restaurant => cuisine === 'all' || restaurant.cuisine === cuisine);
    const list = document.querySelector('#location-list');
    list.replaceChildren();
    selected.forEach(restaurant => list.append(createTextElement('li',
        `${restaurant.name} · ${restaurant.cuisine} · ${restaurant.neighborhood} · ${restaurant.rating.toFixed(1)} / 5`)));
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
        selected.forEach(restaurant => {
            const popup = document.createElement('div');
            popup.append(createTextElement('strong', restaurant.name),
                createTextElement('p', `${restaurant.cuisine} · ${restaurant.rating.toFixed(1)} / 5`),
                createTextElement('p', `${restaurant.neighborhood} · Sample location`));
            window.L.marker(getRestaurantCoordinates(restaurant), { title: restaurant.name, alt: restaurant.name })
                .bindPopup(popup).addTo(markers);
        });
        myMap.invalidateSize();
        if (selected.length) myMap.fitBounds(markers.getBounds(), { padding: [30, 30], maxZoom: 14, animate: !reducedMotion.matches });
        message.textContent = `${selected.length} sample ${selected.length === 1 ? 'location' : 'locations'} shown. Select a marker for restaurant details.`;
    } catch (error) {
        if (myMap) myMap.remove();
        myMap = null;
        markers = null;
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
    createRestaurantCards(restaurants);
    const message = document.querySelector('#animation-message');
    if (reducedMotion.matches) {
        message.textContent = 'Reduced motion is enabled. All restaurant cards are shown without animation.';
        return;
    }
    try {
        if (typeof window.gsap?.fromTo !== 'function') throw new Error('GSAP is unavailable.');
        cardAnimation = window.gsap.fromTo('.restaurant-card',
            { opacity: 0, y: 24, scale: 0.96 },
            { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.08, ease: 'back.out(1.2)', clearProps: 'opacity,transform',
                onComplete: () => { message.textContent = `${restaurants.length} restaurant cards revealed.`; } });
        message.textContent = `Animating ${restaurants.length} restaurant cards.`;
    } catch (error) {
        restoreVisibleCards();
        message.textContent = `${error.message} All restaurant cards are shown without animation.`;
    }
}
