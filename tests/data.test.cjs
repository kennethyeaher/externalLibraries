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
