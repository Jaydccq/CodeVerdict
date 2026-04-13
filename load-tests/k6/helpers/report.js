// load-tests/k6/helpers/report.js
// Imports k6-reporter from CDN - no npm install needed.
// htmlReport() generates a self-contained HTML file with charts + threshold results.

export { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
export { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";
