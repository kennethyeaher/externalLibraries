/** Validate restaurant records before any view uses them. Return records or throw an Error. */
export function validateRestaurants(records) {
    if (!Array.isArray(records) || records.length === 0) {
        throw new Error('The restaurant file must contain a nonempty array.');
    }
    const identifiers = new Set();
    for (const restaurant of records) {
        if (!restaurant || !Number.isInteger(restaurant.id) || identifiers.has(restaurant.id)
            || !['name', 'cuisine', 'neighborhood', 'priceRange', 'hours'].every(
                field => typeof restaurant[field] === 'string' && restaurant[field].trim())
            || !Number.isFinite(restaurant.rating) || restaurant.rating < 0 || restaurant.rating > 5) {
            throw new Error('A restaurant has missing fields, an invalid rating, or a duplicate ID.');
        }
        identifiers.add(restaurant.id);
    }
    return records;
}

/** Count records by cuisine and return alphabetically ordered labels and counts. */
export function countCuisines(records) {
    const cuisineCounts = new Map();
    records.forEach(restaurant => {
        cuisineCounts.set(restaurant.cuisine, (cuisineCounts.get(restaurant.cuisine) || 0) + 1);
    });
    const labels = [...cuisineCounts.keys()].sort();
    return { labels, counts: labels.map(cuisine => cuisineCounts.get(cuisine)) };
}

/** Return deterministic sample coordinates for a restaurant, never a verified address. */
export function getRestaurantCoordinates(restaurant) {
    const neighborhoodCoordinates = {
        'College Park': [38.9897, -76.9378],
        'Downtown': [38.9067, -76.9078],
        'University District': [38.9800, -76.9400],
        'Historic District': [38.9850, -76.9350]
    };
    const base = neighborhoodCoordinates[restaurant.neighborhood];
    if (!base) throw new Error('No sample coordinates exist for this neighborhood.');
    const offset = (restaurant.id % 5 - 2) * 0.001;
    return [base[0] + offset, base[1] - offset];
}
