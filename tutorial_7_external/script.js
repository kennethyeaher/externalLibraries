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

/** Explain a demo that is still waiting to be created; used while the tutorial is assembled. */
function showPendingDemo(event) {
    event.currentTarget.closest('.example-card').querySelector('[role="status"]').textContent = 'This example is being prepared.';
}

// Bind native controls after the module and its deferred CDN scripts have loaded.
loadButton.addEventListener('click', clickToLoad);
checkAllLibraryStatus();
document.querySelectorAll('.demo-button').forEach(button => button.addEventListener('click', showPendingDemo));
