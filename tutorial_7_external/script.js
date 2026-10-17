import { buildChartModel, getChartTarget } from './chart-data.js';
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
document.querySelector('#download-chart').addEventListener('click', downloadChart);
document.querySelector('#download-results').addEventListener('click', downloadResults);
document.querySelector('#restaurant-cards').addEventListener('click', toggleComparison);
document.querySelector('#clear-shortlist').addEventListener('click', clearShortlist);
document.querySelector('#animation-button').addEventListener('click', animateMyCards);
reducedMotion.addEventListener('change', restoreVisibleCards);

/** Render chart values and keyboard exploration controls before attempting the canvas enhancement. */
function renderChartTable(model) {
    const table = document.createElement('table');
    table.append(createTextElement('caption', model.title));
    const header = document.createElement('tr');
    [...model.headers, 'Explore'].forEach(text => {
        const cell = createTextElement('th', text);
        cell.scope = 'col';
        header.append(cell);
    });
    const head = document.createElement('thead');
    head.append(header);
    const body = document.createElement('tbody');
    model.rows.forEach((values, index) => {
        const row = document.createElement('tr');
        values.forEach(value => row.append(createTextElement('td', value)));
        const actionCell = document.createElement('td');
        const button = createTextElement('button', 'Explore');
        button.type = 'button';
        button.setAttribute('aria-label', `Explore ${values[0]}`);
        button.addEventListener('click', () => applyChartTarget(model.targets[index]));
        actionCell.append(button);
        row.append(actionCell);
        body.append(row);
    });
    table.append(head, body);
    document.querySelector('#chart-table').replaceChildren(table);
}

/** Narrow shared results using a chart selection, retaining price and minimum rating criteria. */
function applyChartTarget(target) {
    if (target.query !== undefined) document.querySelector('#restaurant-search').value = target.query;
    if (target.cuisine !== undefined) document.querySelector('#cuisine-filter').value = target.cuisine;
    updateExplorer();
    document.querySelector('#chart-message').focus({ preventScroll: true });
}

/** Build scales for the required cuisine count chart and the three additional views. */
function getChartScales(metric) {
    const ratingAxis = { beginAtZero: true, max: 5, title: { display: true, text: 'Rating / 5' } };
    if (metric === 'rating') return {
        x: ratingAxis, y: { ticks: { autoSkip: false }, title: { display: true, text: 'Restaurant' } }
    };
    if (metric === 'price') return {
        x: { min: 0.5, max: 4.5, afterBuildTicks: scale => { scale.ticks = [1, 2, 3, 4].map(value => ({ value })); }, ticks: { stepSize: 1, callback: value => Number.isInteger(value) && value >= 1 && value <= 4 ? '$'.repeat(value) : '' }, title: { display: true, text: 'Price tier (ordered categories)' } },
        y: ratingAxis
    };
    return {
        y: { beginAtZero: true, stacked: metric === 'neighborhood', ticks: { precision: 0 }, title: { display: true, text: 'Number of restaurants' } },
        x: { stacked: metric === 'neighborhood', title: { display: true, text: metric === 'neighborhood' ? 'Neighborhood' : 'Cuisine' } }
    };
}

/** Draw a white export background and an optional mean rating reference using the chart plugin hooks. */
function createChartDecoration(model) {
    return {
        id: 'restaurantReference',
        beforeDraw(chart) {
            const context = chart.ctx;
            context.save();
            context.globalCompositeOperation = 'destination-over';
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, chart.width, chart.height);
            context.restore();
        },
        afterDatasetsDraw(chart) {
            if (model.mean === null || !['rating', 'price'].includes(model.metric)) return;
            const context = chart.ctx;
            const area = chart.chartArea;
            const isHorizontal = model.metric === 'rating';
            const position = chart.scales[isHorizontal ? 'x' : 'y'].getPixelForValue(model.mean);
            context.save();
            context.strokeStyle = '#182d47';
            context.lineWidth = 2;
            context.setLineDash([5, 4]);
            context.beginPath();
            context.moveTo(isHorizontal ? position : area.left, isHorizontal ? area.top : position);
            context.lineTo(isHorizontal ? position : area.right, isHorizontal ? area.bottom : position);
            context.stroke();
            context.restore();
        }
    };
}

/** Render the required cuisine chart or an optional analytical view with independent text fallbacks. */
function createMyChart() {
    if (!restaurants.length) return;
    chartRequested = true;
    const selected = getSelectedRestaurants();
    const model = buildChartModel(selected, document.querySelector('#chart-metric').value);
    renderChartTable(model);
    document.querySelector('#chart-insight').textContent = `${model.description}${model.mean !== null && ['rating', 'price'].includes(model.metric) ? ` Matching sample average: ${model.mean.toFixed(2)} / 5.` : ''}`;
    const message = document.querySelector('#chart-message');
    const downloadButton = document.querySelector('#download-chart');
    const canvas = document.querySelector('#restaurant-chart');
    downloadButton.disabled = true;
    canvas.hidden = false;
    canvas.parentElement.style.height = `${model.metric === 'rating' ? Math.max(320, selected.length * 44) : model.metric === 'neighborhood' ? 400 : 340}px`;
    try {
        if (myChart) { myChart.destroy(); myChart = null; }
        if (typeof window.Chart !== 'function') throw new Error('Chart.js is unavailable.');
        myChart = new window.Chart(canvas, {
            type: model.type,
            data: { labels: model.labels, datasets: model.datasets },
            plugins: [createChartDecoration(model)],
            options: {
                indexAxis: model.metric === 'rating' ? 'y' : 'x', responsive: true, maintainAspectRatio: false,
                animation: reducedMotion.matches ? false : { duration: 450 },
                interaction: { mode: 'nearest', intersect: true },
                onClick: (event, elements) => {
                    // Finish the current library event before replacing its chart instance.
                    if (elements.length) {
                        const target = getChartTarget(model, elements[0].datasetIndex, elements[0].index);
                        queueMicrotask(() => applyChartTarget(target));
                    }
                },
                plugins: {
                    legend: { display: ['neighborhood', 'price'].includes(model.metric), position: 'bottom' },
                    title: { display: true, text: model.title },
                    subtitle: { display: model.mean !== null && ['rating', 'price'].includes(model.metric), text: `Dashed reference: matching average ${model.mean?.toFixed(2)} / 5` },
                    tooltip: { callbacks: model.metric === 'price' ? {
                        label: context => `${context.raw.name}: ${context.raw.price}, ${context.raw.y.toFixed(1)} / 5`
                    } : {} }
                },
                scales: getChartScales(model.metric)
            }
        });
        canvas.setAttribute('aria-label', `${model.title}; exact values and exploration buttons appear in the table below`);
        downloadButton.disabled = selected.length === 0;
        message.textContent = selected.length ? `${selected.length} restaurants shown. Select a bar, point, or table Explore button to narrow every view. Reset filters restores all results.` : 'No restaurants match these filters. Reset filters to see all eight.';
    } catch (error) {
        if (myChart) { myChart.destroy(); myChart = null; }
        window.Chart?.getChart?.(canvas)?.destroy();
        canvas.hidden = true;
        message.textContent = `${error.message} Exact values and exploration controls are available in the table.`;
    }
}

/** Download the current completed chart as a PNG, reporting failures without disrupting the data views. */
function downloadChart() {
    if (!myChart || !getSelectedRestaurants().length) return;
    try {
        myChart.stop();
        myChart.update('none');
        const link = document.createElement('a');
        link.href = myChart.toBase64Image('image/png');
        link.download = `restaurant-chart-${document.querySelector('#chart-metric').value}.png`;
        document.body.append(link);
        link.click();
        link.remove();
        document.querySelector('#chart-message').textContent = 'Chart image prepared for download. It reflects the current filters and visible legend series.';
    } catch (error) {
        document.querySelector('#chart-message').textContent = `The chart image could not be prepared. ${error.message} Exact values remain available in the table.`;
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
