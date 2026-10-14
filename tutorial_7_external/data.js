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

/** Filter and sort records using explicit search, cuisine, price, and minimum rating criteria. */
export function selectRestaurants(records, criteria) {
    const query = criteria.query.trim().toLocaleLowerCase();
    const selected = records.filter(restaurant => {
        const searchable = `${restaurant.name} ${restaurant.cuisine} ${restaurant.neighborhood}`.toLocaleLowerCase();
        return searchable.includes(query)
            && (criteria.cuisine === 'all' || restaurant.cuisine === criteria.cuisine)
            && (criteria.price === 'all' || restaurant.priceRange === criteria.price)
            && restaurant.rating >= criteria.minimumRating;
    });
    return selected.sort((first, second) => {
        if (criteria.sort === 'rating') return second.rating - first.rating || first.name.localeCompare(second.name);
        if (criteria.sort === 'price') return first.priceRange.length - second.priceRange.length || first.name.localeCompare(second.name);
        return first.name.localeCompare(second.name);
    });
}
