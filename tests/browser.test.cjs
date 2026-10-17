const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const records = require('../tutorial_7_external/restaurants.json');
const origin = 'http://127.0.0.1:8768';
let browser;
let server;

/** Start an isolated static server and use Chromium or an explicitly selected installed browser. */
before(async () => {
    server = spawn('python3', ['-m', 'http.server', '8768', '--bind', '127.0.0.1'], { stdio: 'ignore' });
    for (let attempt = 0; attempt < 50; attempt += 1) {
        try { if ((await fetch(origin)).ok) break; } catch {}
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined });
});

/** Release the browser and server after the suite completes. */
after(async () => { await browser?.close(); server?.kill(); });

/** Navigate a page and load the shared restaurant records through the visible control. */
async function loadRecords(page) {
    await page.goto(`${origin}/tutorial_7_external/`);
    await page.getByRole('button', { name: 'Load restaurant data', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('#loading-status').textContent === '8 restaurants loaded.');
}

/** Isolate each browser scenario and always close its context. */
async function withPage(options, run) {
    const context = await browser.newContext(options);
    try { await run(await context.newPage()); } finally { await context.close(); }
}

test('all demos work, chart repeats, map filters and popups open, animation replays', async () => {
    await withPage({ viewport: { width: 1440, height: 1000 } }, async page => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await loadRecords(page);
        assert.match(await page.title(), /Restaurant Library Lab/);
        for (const status of ['chart-status', 'leaflet-status', 'gsap-status']) assert.equal(await page.locator(`#${status}`).textContent(), 'Loaded');
        await page.locator('#chart-button').click();
        await page.locator('#chart-button').click();
        assert.equal(await page.locator('#chart-table tbody tr').count(), 8);
        assert.deepEqual(await page.evaluate(() => Chart.getChart(document.querySelector('canvas')).data.datasets[0].data), Array(8).fill(1));
        await page.locator('#map-button').click();
        await page.locator('#map-button').click();
        assert.equal(await page.locator('.leaflet-marker-icon').count(), 8);
        await page.locator('#cuisine-filter').selectOption('Japanese');
        assert.equal(await page.locator('.leaflet-marker-icon').count(), 1);
        assert.equal(await page.locator('#location-list li').count(), 1);
        await page.locator('.leaflet-marker-icon').click();
        assert.match(await page.locator('.leaflet-popup-content').textContent(), /Sakura Sushi.*Japanese.*4.2/);
        await page.locator('#reset-filters').click();
        await page.locator('#animation-button').click();
        await page.locator('#animation-button').click();
        await page.waitForFunction(() => [...document.querySelectorAll('.restaurant-card')].every(card => getComputedStyle(card).opacity === '1'));
        assert.equal(await page.locator('.restaurant-card').count(), 8);
        await page.locator('#load-data-button').click();
        await page.waitForFunction(() => document.querySelector('#loading-status').textContent === '8 restaurants loaded.');
        assert.equal(await page.locator('.leaflet-marker-icon').count(), 8);
        assert.deepEqual(errors, []);
    });
});

test('blocked library scripts preserve table, filtered list, and static cards', async () => {
    await withPage({}, async page => {
        await page.route(/(chart\.min\.js|leaflet\.js|gsap\.min\.js)/, route => route.abort());
        await loadRecords(page);
        for (const status of ['chart-status', 'leaflet-status', 'gsap-status']) assert.match(await page.locator(`#${status}`).textContent(), /Unavailable/);
        await page.locator('#chart-button').click();
        await page.locator('#map-button').click();
        await page.locator('#animation-button').click();
        assert.equal(await page.locator('#chart-table tbody tr').count(), 8);
        assert.equal(await page.locator('#location-list li').count(), 8);
        assert.equal(await page.locator('.restaurant-card').count(), 8);
        await page.locator('#cuisine-filter').selectOption('Italian');
        assert.equal(await page.locator('#location-list li').count(), 1);
        assert.equal(await page.locator('#chart-table tbody tr').count(), 1);
        assert.equal(await page.locator('.restaurant-card').count(), 1);
        assert.equal(await page.locator('.restaurant-card').first().evaluate(card => getComputedStyle(card).opacity), '1');
    });
});

test('failed initial request can retry and a failed reload retains previous records', async () => {
    await withPage({}, async page => {
        await page.route('**/restaurants.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
        await page.goto(`${origin}/tutorial_7_external/`);
        await page.locator('#load-data-button').click();
        await page.waitForFunction(() => document.querySelector('#loading-status').textContent.includes('HTTP 503'));
        assert.equal(await page.locator('#chart-button').isDisabled(), true);
        await page.unroute('**/restaurants.json');
        await page.getByRole('button', { name: 'Try again', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('#loading-status').textContent === '8 restaurants loaded.');
        await page.route('**/restaurants.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
        await page.locator('#load-data-button').click();
        await page.waitForFunction(() => document.querySelector('#loading-status').textContent.includes('Previous data'));
        await page.locator('#chart-button').click();
        assert.equal(await page.locator('#chart-table tbody tr').count(), 8);
    });
});

test('invalid JSON and invalid records produce recoverable feedback', async () => {
    for (const body of ['{invalid', '[]', JSON.stringify([{ ...records[0], rating: -1 }])]) {
        await withPage({}, async page => {
            await page.route('**/restaurants.json', route => route.fulfill({ contentType: 'application/json', body }));
            await page.goto(`${origin}/tutorial_7_external/`);
            await page.locator('#load-data-button').click();
            await page.waitForFunction(() => document.querySelector('#load-data-button').textContent === 'Try again');
            assert.equal(await page.locator('#load-data-button').isEnabled(), true);
            assert.equal(await page.locator('#map-button').isDisabled(), true);
        });
    }
});

test('reduced motion keeps cards visible and applies no chart animation', async () => {
    await withPage({ reducedMotion: 'reduce' }, async page => {
        await loadRecords(page);
        await page.locator('#animation-button').click();
        assert.match(await page.locator('#animation-message').textContent(), /Reduced motion/);
        assert.equal(await page.locator('.restaurant-card').first().getAttribute('style'), null);
        await page.locator('#chart-button').click();
        assert.equal(await page.evaluate(() => Chart.getChart(document.querySelector('canvas')).options.animation), false);
    });
});

test('restaurant names remain literal text in cards and marker popups', async () => {
    await withPage({}, async page => {
        const supplied = records.map(record => ({ ...record }));
        supplied[0].name = '<img src=x onerror="window.injected=true">';
        await page.route('**/restaurants.json', route => route.fulfill({ json: supplied }));
        await loadRecords(page);
        assert.equal(await page.locator('.restaurant-card img').count(), 0);
        await page.locator('#map-button').click();
        await page.locator('#cuisine-filter').selectOption('Italian');
        await page.locator('.leaflet-marker-icon').click();
        assert.match(await page.locator('.leaflet-popup-content').textContent(), /<img src=x/);
        assert.equal(await page.evaluate(() => window.injected), undefined);
    });
});

test('runtime initialization failures leave all text alternatives usable', async () => {
    await withPage({}, async page => {
        await loadRecords(page);
        await page.evaluate(() => {
            window.Chart = function () { throw new Error('Chart test failure'); };
            window.L.map = function () { throw new Error('Map test failure'); };
            window.gsap.fromTo = function () { throw new Error('Animation test failure'); };
        });
        await page.locator('#chart-button').click();
        await page.locator('#map-button').click();
        await page.locator('#animation-button').click();
        assert.match(await page.locator('#chart-message').textContent(), /Chart test failure/);
        assert.match(await page.locator('#map-message').textContent(), /Map test failure/);
        assert.match(await page.locator('#animation-message').textContent(), /Animation test failure/);
        assert.equal(await page.locator('#chart-table tbody tr').count(), 8);
        assert.equal(await page.locator('#location-list li').count(), 8);
        assert.equal(await page.locator('.restaurant-card').first().evaluate(card => getComputedStyle(card).opacity), '1');
    });
});

test('blocked map tiles show useful feedback while markers remain', async () => {
    await withPage({}, async page => {
        await page.route('https://tile.openstreetmap.org/**', route => route.abort());
        await loadRecords(page);
        await page.locator('#map-button').click();
        await page.waitForFunction(() => document.querySelector('#map-message').textContent.includes('tiles could not load'));
        assert.equal(await page.locator('.leaflet-marker-icon').count(), 8);
        assert.equal(await page.locator('#location-list li').count(), 8);
    });
});

test('desktop and narrow layouts fit the viewport and keyboard activates loading', async () => {
    for (const width of [320, 390, 1440]) {
        await withPage({ viewport: { width, height: 900 } }, async page => {
            await page.goto(`${origin}/tutorial_7_external/`);
            await page.keyboard.press('Tab');
            assert.equal(await page.locator('.skip-link').evaluate(link => link === document.activeElement && link.getBoundingClientRect().left >= 0), true);
            await page.locator('#load-data-button').focus();
            await page.keyboard.press('Enter');
            await page.waitForFunction(() => document.querySelector('#loading-status').textContent === '8 restaurants loaded.');
            await page.locator('#chart-button').click();
            await page.locator('#map-button').click();
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
            assert.equal(await page.locator('.restaurant-card').count(), 8);
        });
    }
});


test('a stalled data request times out and offers retry', async () => {
    await withPage({}, async page => {
        await page.route('**/restaurants.json', () => {});
        await page.goto(`${origin}/tutorial_7_external/`);
        await page.locator('#load-data-button').click();
        await page.waitForFunction(() => document.querySelector('#loading-status').textContent.includes('timed out'), { timeout: 15000 });
        assert.equal(await page.locator('#load-data-button').textContent(), 'Try again');
        assert.equal(await page.locator('#load-data-button').isEnabled(), true);
    });
});


test('shared filters synchronize chart, map, cards, summary, and empty state recovery', async () => {
    await withPage({}, async page => {
        await loadRecords(page);
        await page.locator('#chart-button').click();
        await page.locator('#map-button').click();
        await page.locator('#restaurant-search').fill('College Park');
        assert.equal(await page.locator('.restaurant-card').count(), 2);
        assert.equal(await page.locator('.leaflet-marker-icon').count(), 2);
        assert.equal(await page.locator('#chart-table tbody tr').count(), 2);
        assert.match(await page.locator('#results-summary').textContent(), /2 of 8.*4.40/);
        await page.locator('#price-filter').selectOption('$');
        assert.equal(await page.locator('.restaurant-card').count(), 1);
        assert.match(await page.locator('.restaurant-card h4').textContent(), /Pho Corner/);
        await page.locator('#rating-filter').selectOption('4.5');
        assert.equal(await page.locator('.restaurant-card').count(), 0);
        assert.equal(await page.locator('.leaflet-marker-icon').count(), 0);
        assert.equal(await page.locator('#chart-table tbody tr').count(), 0);
        assert.equal(await page.locator('#download-results').isDisabled(), true);
        assert.match(await page.locator('#results-summary').textContent(), /No restaurants/);
        await page.locator('#animation-button').click();
        assert.match(await page.locator('#animation-message').textContent(), /No cards to animate/);
        await page.locator('#reset-filters').click();
        assert.equal(await page.locator('.restaurant-card').count(), 8);
        assert.equal(await page.locator('.leaflet-marker-icon').count(), 8);
        assert.equal(await page.locator('#chart-table tbody tr').count(), 8);
    });
});

test('comparison enforces three choices and keeps selected records across filters', async () => {
    await withPage({}, async page => {
        await loadRecords(page);
        const buttons = page.locator('.restaurant-card button');
        await buttons.nth(0).click();
        await buttons.nth(1).click();
        await buttons.nth(2).click();
        assert.equal(await page.locator('#comparison-table thead th').count(), 4);
        await buttons.nth(3).click();
        assert.match(await page.locator('#compare-message').textContent(), /up to three/);
        assert.equal(await buttons.nth(3).getAttribute('aria-pressed'), 'false');
        await page.locator('#restaurant-search').fill('nothing matches this');
        assert.equal(await page.locator('.restaurant-card').count(), 0);
        assert.equal(await page.locator('#comparison-table thead th').count(), 4);
        await page.locator('#reset-filters').click();
        assert.equal(await page.locator('.restaurant-card button[aria-pressed="true"]').count(), 3);
        await buttons.nth(0).click();
        assert.equal(await page.locator('#comparison-table thead th').count(), 3);
        await page.locator('#clear-shortlist').click();
        assert.equal(await page.locator('#comparison-table table').count(), 0);
        assert.equal(await page.locator('.restaurant-card button[aria-pressed="true"]').count(), 0);
    });
});

test('rating chart uses exact source ratings and map list buttons open the matching popup', async () => {
    await withPage({}, async page => {
        await loadRecords(page);
        await page.locator('#sort-order').selectOption('rating');
        assert.equal(await page.locator('.restaurant-card h4').first().textContent(), 'The Brass Elephant');
        await page.locator('#chart-metric').selectOption('rating');
        assert.equal(await page.evaluate(() => Chart.getChart(document.querySelector('canvas')).data.datasets[0].data[0]), 4.8);
        assert.equal(await page.evaluate(() => Chart.getChart(document.querySelector('canvas')).options.scales.x.max), 5);
        await page.locator('#map-button').click();
        await page.getByRole('button', { name: "Show Milano's Italian Restaurant on map", exact: true }).click();
        assert.match(await page.locator('.leaflet-popup-content').textContent(), /Milano's Italian Restaurant/);
        await page.locator('#chart-metric').selectOption('cuisine');
        assert.deepEqual(await page.evaluate(() => Chart.getChart(document.querySelector('canvas')).data.datasets[0].data), Array(8).fill(1));
    });
});

test('download exports only matching original restaurant records', async () => {
    await withPage({ acceptDownloads: true }, async page => {
        await loadRecords(page);
        await page.locator('#restaurant-search').fill('College Park');
        const downloadPromise = page.waitForEvent('download');
        await page.locator('#download-results').click();
        const download = await downloadPromise;
        assert.equal(download.suggestedFilename(), 'restaurant-results.json');
        const filesystem = require('node:fs/promises');
        const exported = JSON.parse(await filesystem.readFile(await download.path(), 'utf8'));
        assert.deepEqual(exported.map(restaurant => restaurant.id), [1, 5]);
        assert.deepEqual(exported, records.filter(restaurant => restaurant.neighborhood === 'College Park'));
    });
});

test('extended exploration and comparison work when every external library is blocked', async () => {
    await withPage({ viewport: { width: 320, height: 900 } }, async page => {
        await page.route(/(chart\.min\.js|leaflet\.js|gsap\.min\.js)/, route => route.abort());
        await loadRecords(page);
        await page.locator('#chart-metric').selectOption('rating');
        await page.locator('#map-button').click();
        await page.locator('#rating-filter').selectOption('4.5');
        assert.equal(await page.locator('.restaurant-card').count(), 3);
        assert.equal(await page.locator('#chart-table tbody tr').count(), 3);
        assert.equal(await page.locator('#location-list li').count(), 3);
        assert.equal(await page.locator('#location-list button:visible').count(), 0);
        await page.locator('.restaurant-card button').first().click();
        assert.equal(await page.locator('#comparison-table table').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    });
});


test('stacked neighborhood chart has exact totals and legend controls preserve the complete table', async () => {
    await withPage({ reducedMotion: 'reduce' }, async page => {
        await loadRecords(page);
        await page.locator('#chart-metric').selectOption('neighborhood');
        assert.equal(await page.locator('#chart-table tbody tr').count(), 4);
        assert.deepEqual(await page.locator('#chart-table tbody tr').evaluateAll(rows => rows.map(row => row.children[row.children.length - 2].textContent)), ['2', '2', '2', '2']);
        assert.equal(await page.evaluate(() => Chart.getChart(document.querySelector('canvas')).options.scales.x.stacked), true);
        const legend = await page.evaluate(() => { const box = Chart.getChart(document.querySelector('canvas')).legend.legendHitBoxes[0]; return { x: box.left + box.width / 2, y: box.top + box.height / 2 }; });
        await page.locator('canvas').click({ position: legend });
        await page.waitForFunction(() => !Chart.getChart(document.querySelector('canvas')).isDatasetVisible(0));
        assert.equal(await page.evaluate(() => Chart.getChart(document.querySelector('canvas')).isDatasetVisible(0)), false);
        assert.equal(await page.locator('#chart-table tbody tr').count(), 4);
        assert.equal(await page.locator('.restaurant-card').count(), 8);
    });
});

test('canvas click filters all views and keyboard table actions provide the same exploration', async () => {
    await withPage({ reducedMotion: 'reduce' }, async page => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await loadRecords(page);
        await page.locator('#map-button').click();
        await page.locator('#chart-button').click();
        const position = await page.evaluate(() => { const bar = Chart.getChart(document.querySelector('canvas')).getDatasetMeta(0).data[0]; return { x: bar.x, y: bar.y + 20 }; });
        await page.locator('canvas').click({ position });
        await page.waitForFunction(() => document.querySelector('#cuisine-filter').value === 'American');
        assert.equal(await page.locator('.restaurant-card').count(), 1);
        assert.equal(await page.locator('.leaflet-marker-icon').count(), 1);
        await page.locator('#reset-filters').click();
        await page.locator('#chart-metric').selectOption('neighborhood');
        await page.getByRole('button', { name: 'Explore College Park', exact: true }).focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#restaurant-search').inputValue(), 'College Park');
        assert.equal(await page.locator('.restaurant-card').count(), 2);
        assert.equal(await page.locator('#chart-message').evaluate(message => message === document.activeElement), true);
        assert.deepEqual(errors, []);
    });
});

test('price scatter uses exact price tiers and ratings with a matching sample mean', async () => {
    await withPage({ reducedMotion: 'reduce' }, async page => {
        await loadRecords(page);
        await page.locator('#chart-metric').selectOption('price');
        const plotted = await page.evaluate(() => { const chart = Chart.getChart(document.querySelector('canvas')); return { type: chart.config.type, points: chart.data.datasets.flatMap(dataset => dataset.data), max: chart.options.scales.y.max }; });
        assert.equal(plotted.type, 'scatter');
        assert.equal(plotted.points.length, 8);
        assert.equal(plotted.max, 5);
        assert.deepEqual(await page.evaluate(() => Chart.getChart(document.querySelector('canvas')).scales.x.ticks.map(tick => tick.value)), [1, 2, 3, 4]);
        assert.deepEqual(plotted.points.find(point => point.name === 'The Brass Elephant'), { x: 4, y: 4.8, name: 'The Brass Elephant', price: '$$$$' });
        assert.match(await page.locator('#chart-insight').textContent(), /4.36/);
        assert.match(await page.locator('#chart-insight').textContent(), /not measured dollar amounts/);
        await page.locator('#rating-filter').selectOption('4.5');
        assert.equal(await page.locator('#chart-table tbody tr').count(), 3);
        assert.match(await page.locator('#chart-insight').textContent(), /4.63/);
        await page.getByRole('button', { name: "Explore Milano's Italian Restaurant", exact: true }).click();
        assert.equal(await page.locator('.restaurant-card').count(), 1);
        await page.locator('#reset-filters').click();
        const point = await page.evaluate(() => {
            const chart = Chart.getChart(document.querySelector('canvas'));
            for (let datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex += 1) {
                const index = chart.data.datasets[datasetIndex].data.findIndex(record => record.name === 'The Brass Elephant');
                if (index >= 0) { const marker = chart.getDatasetMeta(datasetIndex).data[index]; return { x: marker.x, y: marker.y }; }
            }
        });
        await page.locator('canvas').click({ position: point });
        await page.waitForFunction(() => document.querySelector('#restaurant-search').value === 'The Brass Elephant');
        assert.equal(await page.locator('.restaurant-card').count(), 1);
    });
});

test('chart PNG export is a real image of the completed chart and is disabled for empty results', async () => {
    await withPage({ acceptDownloads: true }, async page => {
        await loadRecords(page);
        assert.equal(await page.locator('#download-chart').isDisabled(), true);
        await page.locator('#chart-metric').selectOption('price');
        const downloadPromise = page.waitForEvent('download');
        await page.locator('#download-chart').click();
        const download = await downloadPromise;
        assert.equal(download.suggestedFilename(), 'restaurant-chart-price.png');
        const filesystem = require('node:fs/promises');
        const bytes = await filesystem.readFile(await download.path());
        assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
        assert.ok(bytes.readUInt32BE(16) > 100);
        assert.equal(await page.evaluate(() => { const chart = Chart.getChart(document.querySelector('canvas')); return chart.ctx.getImageData(0, 0, 1, 1).data[3]; }), 255);
        await page.locator('#restaurant-search').fill('no matching restaurant');
        assert.equal(await page.locator('#download-chart').isDisabled(), true);
    });
});

test('all advanced tables and exploration actions remain usable when Chart.js is blocked', async () => {
    await withPage({ viewport: { width: 320, height: 900 } }, async page => {
        await page.route('**/chart.min.js', route => route.abort());
        await loadRecords(page);
        for (const metric of ['cuisine', 'rating', 'neighborhood', 'price']) {
            await page.locator('#chart-metric').selectOption(metric);
            if (metric === 'cuisine') await page.locator('#chart-button').click();
            assert.equal(await page.locator('#chart-table tbody tr').count(), metric === 'neighborhood' ? 4 : 8);
            assert.equal(await page.locator('#download-chart').isDisabled(), true);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
        await page.getByRole('button', { name: 'Explore Sakura Sushi', exact: true }).click();
        assert.equal(await page.locator('.restaurant-card').count(), 1);
        await page.locator('#reset-filters').click();
        assert.equal(await page.locator('#chart-table tbody tr').count(), 8);
    });
});
