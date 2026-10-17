import { countCuisines } from './data.js';

const cuisineColors = {
    American: '#244f9d', French: '#825090', Indian: '#9a5100', Italian: '#237569',
    Japanese: '#a1374f', Korean: '#376c85', Mexican: '#69631c', Vietnamese: '#5e567e'
};

/** Prepare chart datasets, exact table rows, and exploration targets from the selected records. */
export function buildChartModel(records, metric) {
    const mean = records.length ? records.reduce((sum, restaurant) => sum + restaurant.rating, 0) / records.length : null;
    if (metric === 'neighborhood') {
        const labels = [...new Set(records.map(restaurant => restaurant.neighborhood))].sort();
        const cuisines = countCuisines(records).labels;
        const datasets = cuisines.map(cuisine => ({
            label: cuisine,
            data: labels.map(neighborhood => records.filter(restaurant => restaurant.neighborhood === neighborhood && restaurant.cuisine === cuisine).length),
            backgroundColor: cuisineColors[cuisine] || '#237569'
        }));
        return {
            metric, type: 'bar', title: 'Cuisine mix by neighborhood', labels, datasets, mean,
            headers: ['Neighborhood', ...cuisines, 'Total'],
            rows: labels.map((neighborhood, index) => [neighborhood, ...datasets.map(dataset => dataset.data[index]), records.filter(restaurant => restaurant.neighborhood === neighborhood).length]),
            targets: labels.map(neighborhood => ({ query: neighborhood })),
            description: 'Stacked bars count restaurants by cuisine in each neighborhood. Select a segment to explore that cuisine and neighborhood. Legend visibility affects only the picture; the table keeps every value.'
        };
    }
    if (metric === 'price') {
        const neighborhoods = [...new Set(records.map(restaurant => restaurant.neighborhood))].sort();
        const colors = ['#244f9d', '#237569', '#a1374f', '#825090'];
        return {
            metric, type: 'scatter', title: 'Price tier and restaurant rating', labels: [], mean,
            datasets: neighborhoods.map((neighborhood, index) => ({
                label: neighborhood, backgroundColor: colors[index % colors.length], pointRadius: 7, pointHoverRadius: 10,
                data: records.filter(restaurant => restaurant.neighborhood === neighborhood).map(restaurant => ({
                    x: restaurant.priceRange.length, y: restaurant.rating, name: restaurant.name, price: restaurant.priceRange
                }))
            })),
            headers: ['Restaurant', 'Price tier', 'Rating / 5'],
            rows: records.map(restaurant => [restaurant.name, restaurant.priceRange, restaurant.rating]),
            targets: records.map(restaurant => ({ query: restaurant.name })),
            description: 'Each point is one sample restaurant. Price tiers are ordered categories ($ to $$$$), not measured dollar amounts. These eight samples do not establish a relationship between price and quality.'
        };
    }
    const isRating = metric === 'rating';
    const cuisineTotals = countCuisines(records);
    const labels = isRating ? records.map(restaurant => restaurant.name) : cuisineTotals.labels;
    const counts = isRating ? records.map(restaurant => restaurant.rating) : cuisineTotals.counts;
    return {
        metric: isRating ? 'rating' : 'cuisine', type: 'bar', mean,
        title: isRating ? 'Rating by restaurant' : 'Restaurant count by cuisine', labels,
        datasets: [{ label: isRating ? 'Rating / 5' : 'Restaurants', data: counts, backgroundColor: '#237569', borderRadius: 4 }],
        headers: isRating ? ['Restaurant', 'Rating / 5'] : ['Cuisine', 'Restaurants'],
        rows: labels.map((label, index) => [label, counts[index]]),
        targets: labels.map(label => isRating ? { query: label } : { cuisine: label }),
        description: isRating
            ? 'Horizontal bars compare individual sample ratings on a zero to five scale. The dashed line marks the average of the matching restaurants.'
            : 'The required bar chart counts restaurants by cuisine. Every cuisine appears once in the complete sample, so the default bars have equal heights.'
    };
}

/** Resolve a clicked bar or point to filter criteria without depending on its screen position. */
export function getChartTarget(model, datasetIndex, index) {
    if (model.metric === 'neighborhood') return { query: model.labels[index], cuisine: model.datasets[datasetIndex].label };
    if (model.metric === 'price') return { query: model.datasets[datasetIndex].data[index].name };
    return model.targets[index];
}
