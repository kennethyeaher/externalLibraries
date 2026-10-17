const { test } = require('node:test');
const assert = require('node:assert/strict');
const records = require('../tutorial_7_external/restaurants.json');

/** Check repeated categories, source totals, bad inputs, and stable sample geography. */
test('restaurant transformations and validation', async () => {
    const { validateRestaurants, countCuisines, getRestaurantCoordinates } = await import('../tutorial_7_external/data.js');
    assert.equal(validateRestaurants(records).length, 8);
    assert.deepEqual(countCuisines([{ cuisine: 'Thai' }, { cuisine: 'Italian' }, { cuisine: 'Thai' }]),
        { labels: ['Italian', 'Thai'], counts: [1, 2] });
    assert.equal(countCuisines(records).counts.reduce((sum, count) => sum + count, 0), 8);
    assert.deepEqual(countCuisines([]), { labels: [], counts: [] });
    for (const invalid of [null, [], {}, [null], [records[0], records[0]], [{ ...records[0], rating: 6 }], [{ ...records[0], name: '' }]]) {
        assert.throws(() => validateRestaurants(invalid));
    }
    assert.deepEqual(getRestaurantCoordinates(records[0]), getRestaurantCoordinates(records[0]));
    assert.notDeepEqual(getRestaurantCoordinates(records[0]), getRestaurantCoordinates(records[4]));
    assert.throws(() => getRestaurantCoordinates({ neighborhood: 'Unknown', id: 1 }));
});

/** Verify combined criteria, stable ordering, empty results, and preservation of the source array. */
test('shared restaurant selection handles realistic exploration criteria', async () => {
    const { selectRestaurants } = await import('../tutorial_7_external/data.js');
    const defaults = { query: '', cuisine: 'all', price: 'all', minimumRating: 0, sort: 'name' };
    const sourceOrder = records.map(restaurant => restaurant.id);
    assert.deepEqual(selectRestaurants(records, { ...defaults, query: ' college PARK ' }).map(restaurant => restaurant.id).sort(), [1, 5]);
    assert.deepEqual(selectRestaurants(records, { ...defaults, price: '$', minimumRating: 4.2 }).map(restaurant => restaurant.id), [5]);
    assert.equal(selectRestaurants(records, { ...defaults, cuisine: 'Japanese', minimumRating: 4.5 }).length, 0);
    assert.equal(selectRestaurants(records, { ...defaults, sort: 'rating' })[0].name, 'The Brass Elephant');
    assert.equal(selectRestaurants(records, { ...defaults, sort: 'price' })[0].priceRange, '$');
    assert.deepEqual(records.map(restaurant => restaurant.id), sourceOrder);
});

/** Check chart totals, grouped records, price coordinates, mean ratings, and click targets independently. */
test('advanced chart models preserve source values and group totals', async () => {
    const { buildChartModel, getChartTarget } = await import('../tutorial_7_external/chart-data.js');
    const cuisine = buildChartModel(records, 'cuisine');
    assert.equal(cuisine.type, 'bar');
    assert.equal(cuisine.datasets[0].data.reduce((sum, count) => sum + count, 0), 8);
    const grouped = buildChartModel(records, 'neighborhood');
    assert.deepEqual(grouped.rows.map(row => row.at(-1)), [2, 2, 2, 2]);
    assert.equal(grouped.datasets.flatMap(dataset => dataset.data).reduce((sum, count) => sum + count, 0), 8);
    const doubled = buildChartModel([records[0], { ...records[0], id: 99 }], 'neighborhood');
    assert.deepEqual(doubled.datasets[0].data, [2]);
    const rating = buildChartModel(records, 'rating');
    assert.ok(Math.abs(rating.mean - 4.3625) < 0.00001);
    assert.deepEqual(rating.datasets[0].data, records.map(record => record.rating));
    const scatter = buildChartModel(records, 'price');
    const points = scatter.datasets.flatMap(dataset => dataset.data);
    assert.equal(points.length, 8);
    assert.deepEqual(points.find(point => point.name === 'The Brass Elephant'), { x: 4, y: 4.8, name: 'The Brass Elephant', price: '$$$$' });
    assert.deepEqual(getChartTarget(cuisine, 0, 0), { cuisine: 'American' });
    assert.deepEqual(getChartTarget(grouped, 0, grouped.labels.indexOf('Historic District')), { query: 'Historic District', cuisine: 'American' });
    assert.deepEqual(getChartTarget(scatter, 0, 0), { query: scatter.datasets[0].data[0].name });
    for (const metric of ['cuisine', 'rating', 'neighborhood', 'price']) {
        const empty = buildChartModel([], metric);
        assert.deepEqual(empty.rows, []);
        assert.equal(empty.mean, null);
    }
});
