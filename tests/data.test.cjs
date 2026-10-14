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
