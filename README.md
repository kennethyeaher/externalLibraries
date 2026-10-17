<p align="center"><img src="docs/assets/banner.svg" alt="One menu. Three perspectives. A restaurant library lab using Chart.js, Leaflet, and GSAP." width="100%"></p>

<p align="center"><strong>Eight restaurants. Three working examples. One shared dataset.</strong><br>Explore matching restaurants, compare three choices, and inspect one dataset through charts, a map, and animated cards.</p>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-ES_modules-F7DF1E?style=flat-square&amp;logo=javascript&amp;logoColor=182d47" alt="JavaScript ES modules">
  <img src="https://img.shields.io/badge/Chart.js-3.9.1-237569?style=flat-square" alt="Chart.js 3.9.1">
  <img src="https://img.shields.io/badge/Leaflet-1.9.4-237569?style=flat-square" alt="Leaflet 1.9.4">
  <img src="https://img.shields.io/badge/GSAP-3.12.2-237569?style=flat-square" alt="GSAP 3.12.2">
  <a href="https://kennethyeaher.github.io/externalLibraries/tutorial_7_external/"><img src="https://img.shields.io/badge/demo-GitHub_Pages-244f9d?style=flat-square" alt="GitHub Pages demo"></a>
  <a href="https://github.com/kennethyeaher/externalLibraries/actions/workflows/browser-checks.yml"><img src="https://img.shields.io/github/actions/workflow/status/kennethyeaher/externalLibraries/browser-checks.yml?branch=main&amp;style=flat-square&amp;label=browser%20checks" alt="Current browser checks status"></a>
</p>

<p align="center"><a href="https://kennethyeaher.github.io/externalLibraries/tutorial_7_external/"><strong>Try the live lab ↗</strong></a> · <a href="#the-three-examples">Explore the examples</a> · <a href="#class-requirements">Class requirements</a> · <a href="#run-locally">Run locally</a> · <a href="#verification">Verification</a></p>

---

## The project

An INST630 external JavaScript library tutorial built from `tutorial_7_external`. The application loads the supplied restaurant file with `async` / `await`, validates the records, and uses the same data in three different views. Shared search, price, cuisine, and minimum rating controls keep the views synchronized. Each library follows the same sequence:

**CDN → Check → Process → Initialize → Error handling**

The libraries enhance the page without becoming a single point of failure. A chart has an exact values table, a map has a filtered restaurant list, and animated cards remain readable without GSAP.

<img src="docs/assets/preview-desktop.png" alt="Desktop restaurant lab with its heading, loaded restaurant data, library availability, and the start of the cuisine chart example." width="100%">

<details>
<summary><strong>See the mobile layout</strong></summary>
<br>
<p align="center"><img src="docs/assets/preview-mobile.png" alt="Mobile layout with the heading, example navigation, and data loading control stacked vertically." width="320"></p>
</details>

## Beyond the brief

The extensions turn isolated demos into a small restaurant exploration workflow. They use the supplied data and existing libraries without adding a framework or backend.

| Extension | What someone can do | What the code demonstrates |
| --- | --- | --- |
| **Shared exploration** | Search names, cuisines, and neighborhoods; combine cuisine, price, and rating filters | One pure selection function feeds all three views instead of maintaining conflicting copies |
| **Chart analysis** | Switch between cuisine counts, restaurant ratings, neighborhood cuisine mix, and price tiers versus ratings | Stacked datasets, scatter coordinates, precise axes, custom plugin hooks, and exact values in tables |
| **Three choice shortlist** | Compare cuisine, rating, price, neighborhood, and hours side by side | Selection state independent of filters, a clear capacity limit, native toggle buttons, and semantic table headers |
| **Chart exploration and image export** | Select a chart bar or point to narrow all views, or download the current chart as a PNG | Event handling, keyboard equivalent table actions, mean reference lines, canvas export, and a white image background |
| **Direct map inspection** | Open a specific restaurant's popup from its text entry | Matching records to markers by stable IDs rather than relying on their order or screen position |
| **Filtered downloads** | Export only matching records as JSON | Source records preserved in the export, empty result protection, and cleanup of temporary browser URLs |
| **Empty result recovery** | Reset filters after a combination finds no matches | Clear feedback and coordinated empty states across the chart, map, cards, and download control |

<img src="docs/assets/explorer.png" alt="Shared exploration controls filtering eight records to the two College Park restaurants, with an average rating of 4.40 and a download action." width="100%">

<img src="docs/assets/comparison.png" alt="Three shortlisted restaurants compared side by side by cuisine, rating, price, neighborhood, and hours." width="100%">

<details>
<summary><strong>See the additional rating chart and mobile explorer</strong></summary>
<br>
<img src="docs/assets/ratings.png" alt="Horizontal rating bars for the eight sample restaurants, on a zero to five scale with a matching-sample mean reference, with an exact values table." width="100%">
<p align="center"><img src="docs/assets/explorer-mobile.png" alt="Mobile shared search and filter form with controls stacked vertically." width="320"> <img src="docs/assets/ratings-mobile.png" alt="Mobile horizontal rating chart with readable restaurant labels and the exact values table." width="320"></p>
</details>

The shortlist is temporary page state. It survives filter changes and data refreshes in the current page, but a browser reload clears it. No selection is sent to a server or stored on disk. The JSON download contains only the matching original records, with no generated map coordinates. Prices and ratings are course sample values, not current restaurant information.

## The three examples

| Library | Data preparation | Working interaction | Fallback |
| --- | --- | --- | --- |
| **Chart.js** | Aggregate cuisine and neighborhood counts, or plot the original ratings and ordered price tiers | Required cuisine bar chart plus horizontal ratings, stacked neighborhood counts, and a price-tier scatter plot; chart selections filter every view | Exact counts or ratings in a semantic table |
| **Leaflet** | Use shared filter results; derive stable illustrative positions from the supplied neighborhoods | Markers with safe popups, shared filtering, zoom controls, and direct list actions | Filtered text list of restaurant names, cuisines, neighborhoods, and ratings |
| **GSAP** | Create a card for each matching record, with all eight shown by default | Staggered opacity, position, and scale entrance; replay cancels the earlier animation | Static cards when GSAP fails or reduced motion is enabled |

### Chart.js analysis

The default remains the required **bar chart counting restaurants by cuisine**. Three additional views answer different questions using the same sample data:

| View | Question | Integration details |
| --- | --- | --- |
| Cuisine counts | How many matching restaurants serve each cuisine? | `type: 'bar'`, categorical labels, and integer counts |
| Restaurant ratings | How do individual sample ratings compare? | Horizontal bars, a zero to five rating scale, and a dashed matching-sample mean |
| Cuisine mix by neighborhood | Which cuisines appear in each sample neighborhood? | One dataset per cuisine, stacked counts, and interactive legend visibility |
| Price tier vs. rating | Where do the sample restaurants fall across price tiers and ratings? | Scatter points colored by neighborhood, named tooltips, categorical price labels, and a mean-rating reference |

Select a bar or point to narrow the shared results. Each exact-value table also includes native **Explore** buttons, so this workflow does not depend on pointer interaction or a working canvas. A stacked segment selects both its neighborhood and cuisine; a neighborhood table action selects the neighborhood. After exploration, focus moves to the chart feedback. **Reset filters** restores the complete dataset.

The legend changes visible chart series without changing the underlying filters or exact-value table. The reference line always represents the matching sample records. The complete sample averages **4.36 / 5**; filtering recalculates the mean. Hiding a legend series does not redefine that average.

**Download chart as PNG** exports the completed current chart with a white background. It preserves current filter and legend visibility. The action stays disabled until a chart exists, for empty results, or when Chart.js fails. JSON result downloads remain a separate way to inspect the original records.

Price symbols are ordered tiers, not measured dollar amounts. The scatter plot preserves exact values without jitter or a trend line. Overlapping points can be inspected through the named tooltips and exact-value table. Eight course sample records do not establish a price-quality relationship or a general neighborhood trend.

<details>
<summary><strong>See the advanced Chart.js views</strong></summary>
<br>
<img src="docs/assets/neighborhood-chart.png" alt="Stacked cuisine counts for four sample neighborhoods, with a cuisine legend and an exact count table." width="100%">
<img src="docs/assets/price-chart.png" alt="Scatter plot of ordered price tiers and exact restaurant ratings, with neighborhood colors and a matching-sample mean reference." width="100%">
<p align="center"><img src="docs/assets/neighborhood-chart-mobile.png" alt="Mobile stacked neighborhood chart with its complete legend and a horizontally scrollable exact-value table." width="320"> <img src="docs/assets/price-chart-mobile.png" alt="Mobile price-tier scatter plot and restaurant values table." width="320"></p>
</details>

<details open>
<summary><strong>Cuisine chart</strong></summary>
<br>
<img src="docs/assets/chart.png" alt="Cuisine bar chart and its exact values table. All eight cuisine categories have a count of one." width="100%">
</details>

<details>
<summary><strong>Restaurant map</strong></summary>
<br>
<img src="docs/assets/map.png" alt="Leaflet map showing sample restaurant markers, a cuisine filter, a location disclaimer, and the equivalent restaurant list." width="100%">
</details>

<details>
<summary><strong>Restaurant cards</strong></summary>
<br>
<img src="docs/assets/cards.png" alt="Eight visible restaurant cards with cuisine, price, rating, neighborhood, and hours." width="100%">
</details>

**These are sample restaurants, not a restaurant directory.** The source file contains no street addresses or coordinates. Map positions are deterministic demonstrations based on the starter's neighborhood centers, with small offsets to separate records. They are labeled as illustrative on the page and in popups. Nearby markers can overlap at the overview zoom; filter, zoom in, or use a restaurant’s Show on map button to open its popup directly. The source JSON is unchanged.

The cuisine chart intentionally shows equal bars: each of the eight supplied cuisines appears once. The counting function also handles repeated categories, which is checked using a separate test fixture rather than altering the course data.

## Class requirements

| Assignment goal | Implementation |
| --- | --- |
| Load restaurant data using async / await | `loadRestaurantData()` checks HTTP status, parses JSON, validates records, and applies a ten second timeout |
| Verify external libraries loaded | `checkAllLibraryStatus()` checks `Chart`, `L.map`, and `gsap.fromTo` and reports availability independently |
| Chart.js cuisine bar chart | `countCuisines()` and `createMyChart()` prepare labels and counts, then call `new Chart()` |
| Leaflet markers and popups | `createMyMap()` adds a feature group to `L.map()` and binds safe DOM content to each marker |
| GSAP smooth card animation | `animateMyCards()` calls `gsap.fromTo()` with duration, stagger, easing, and a visible final state |
| Graceful degradation | Each demo retains text content if its library or initialization fails; tile errors produce separate feedback |
| Project 2 preparation | The comparison below connects each library to data requirements, user tasks, and integration risks |

The downloaded starter labels itself “Tutorial 8” in several places. This repository uses the supplied folder name and the assignment's Tutorial 7 label. The original scaffold, support file, and provided answer are preserved in the first commit. The included `answer/script.js` is course reference material and is not loaded by the application.

## Live demo

**[Open the restaurant library lab](https://kennethyeaher.github.io/externalLibraries/tutorial_7_external/)**. The repository About section links to the same application.

## Run locally

The application needs a static HTTP server because it fetches JSON and imports JavaScript modules. Opening the HTML with `file://` will not provide the same behavior.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **[localhost:8000/tutorial_7_external/](http://localhost:8000/tutorial_7_external/)**. Select **Load restaurant data**, then try the chart, map, and animation controls. Choose Japanese in the shared cuisine filter; every requested view should show Sakura Sushi. Use its Show on map button, then select Reset filters to restore all eight records. Switch the chart to Restaurant ratings, sort by Highest rating, and compare three cards. Download a filtered result and inspect the JSON.

No build step or application package installation is required. The three pinned libraries load from CDNs. Leaflet's stylesheet and marker images also load externally; OpenStreetMap supplies the map tiles. An internet connection is needed for those enhancements. Local restaurant data and text alternatives remain usable if the external scripts fail.

## Verification

For the development checks, use Node.js 22 or newer and Python 3:

```sh
npm ci
npx playwright install chromium
npm run check
npm test
```

To use an installed Chrome browser instead of Playwright's bundled Chromium:

```sh
BROWSER_CHANNEL=chrome npm test
```

| Check | Local result | Scope |
| --- | --- | --- |
| JavaScript syntax and data checks | PASS | Repeated cuisines, total count, empty input, duplicate IDs, missing fields, invalid ratings, stable sample positions, combined filter criteria, sorting, and preservation of the original array, stacked group totals, scatter coordinates, chart targets, and matching-sample means |
| Browser regression suite | PASS | Twenty scenarios in installed Chrome, including all three demos, repeat actions, popups, filtering, failed requests, invalid responses, timeout, blocked scripts and tiles, initialization errors, literal text rendering, shared filters, empty results, comparison limits, exact exports, direct map actions, stacked totals, legend visibility, canvas exploration, keyboard equivalents, price-tier axes, and PNG image output |
| Reduced motion | PASS in automated checks | Static cards and disabled Chart.js animation; this does not establish full motion accessibility |
| Layout and keyboard | PASS in automated checks | No horizontal page overflow at 320, 390, and 1440 pixels; keyboard activation of the load button |
| Screenshot inspection | PASS for captured states | Desktop and mobile explorer, comparison, chart, map, and card screenshots are actual browser captures |
| Dependency audit and whitespace | PASS | No known npm vulnerabilities reported; `git diff --check` passed |
| Safari, Firefox, VoiceOver, and complete accessibility review | UNVERIFIED | Not covered by the local checks |
| GitHub Actions | Automated on pushes and pull requests | The status badge links to the current hosted Chromium result |

The suite starts and stops its own server on port 8768. Real CDN availability remains outside this project's control. Expected blocked requests are tested separately from normal operation. A successful automated check is evidence for that scenario, not proof of every browser or assistive technology.

## Choosing a library for Project 2

| Candidate | Use it when | Capability added | Main trade-off |
| --- | --- | --- | --- |
| **Chart.js** | People need to compare counts, ratings, or trends | Tooltips, axes, scales, and responsive charts | Data must be aggregated correctly; canvas needs an equivalent text view |
| **Leaflet** | Verified locations and spatial relationships affect a decision | Interactive geographic display and filtering | Coordinates, tile availability, attribution, and map accessibility require extra work |
| **GSAP** | A coordinated transition explains a state change that CSS cannot easily support | Timing, stagger, easing, and animation control | Motion must stay optional; the library should solve a real interaction need |

**For this dataset, Chart.js is the strongest starting point.** Cuisine and rating already exist, while a reliable Leaflet implementation would first need verified coordinates. The added rating chart compares individual restaurants on the same zero to five scale. Neighborhood stacks count sample records, and the scatter plot compares ordered price tiers with ratings without fitting a trend. The result summary also reports the average of matching records. With only one record per cuisine, category averages would still represent individual sample restaurants, not a broader market trend.

The final Project 2 choice should depend on Assignment 2's actual dataset and user task. This tutorial does not modify that separate assignment. Before choosing, identify the question the library answers, check the required data, build a small prototype, and test a failed library load. Use CSS for simple transitions before adding GSAP.

## Design decisions

The three examples use the same headings, controls, and feedback structure so attention stays on what each library adds. Dark blue identifies navigation and actions; green identifies the examples. A table and a location list expose information that would otherwise depend on the chart or map.

Two patterns from *Designing Interfaces: Patterns for Effective Interaction Design*, 3rd edition, by Jenifer Tidwell, Charles Brewer, and Aynne Valencia support these choices:

- **Alternative Views**, supplied PDF page 180: the same records can support different tasks through substantially different views. Here, counting, locating, inspecting details, and comparing choices use one shared dataset and one set of filter criteria.
- **Animated Transition**, supplied PDF page 334: motion can communicate an action or change. The cards use a brief coordinated entrance after an explicit request, with a static alternative for reduced motion.

These are PDF page positions, not printed page numbers. The patterns support the interaction decisions; they do not establish which JavaScript library should be used.

## Project structure

```text
externalLibraries/
├── tutorial_7_external/
│   ├── index.html             # pinned CDN includes and tutorial interface
│   ├── script.js              # shared exploration, comparison, and library views
│   ├── tutorial-support.js    # loading, status checks, and safe cards
│   ├── data.js                # validation, filtering, counts, sample positions
│   ├── chart-data.js          # chart datasets, tables, and exploration targets
│   ├── restaurants.json       # unchanged course dataset
│   ├── instructions.md        # supplied assignment reference
│   └── answer/script.js       # supplied reference, not an application import
├── tests/                     # data and browser checks
├── .github/workflows/         # browser verification on pushes and PRs
├── docs/assets/               # custom banner and actual screenshots
└── package.json               # development scripts and pinned Playwright
```

## Sources

The restaurant data, original scaffold, instructions, and provided answer come from the course's `tutorial_7_external` support files. The implementation follows the official [Chart.js getting started guide](https://www.chartjs.org/docs/latest/getting-started/), [Leaflet quick start](https://leafletjs.com/examples/quick-start/), [Chart.js plugin documentation](https://www.chartjs.org/docs/latest/developers/plugins.html), [Chart.js API reference](https://www.chartjs.org/docs/latest/developers/api.html), and [GSAP getting started guide](https://gsap.com/resources/get-started/). The assignment also references [MDN's third party APIs overview](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Client-side_APIs/Third_party_APIs).

Library versions match the provided starter's examples. Chart.js and Leaflet use permissive open source licenses; GSAP has its own [standard license](https://gsap.com/community/standard-license/). Course materials and third party libraries retain their respective rights. Map attribution stays visible in the interface.

---

## Author

**Kenneth Yeaher**  
MS in Human Computer Interaction  
University of Maryland, College Park  
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Kenneth_Yeaher-0A66C2?style=flat-square)](https://www.linkedin.com/in/kennethyeaher/)

`JavaScript` · `Data Visualization` · `Interaction Design`
