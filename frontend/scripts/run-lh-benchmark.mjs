import { execSync } from 'child_process';
import fs from 'fs';

console.log('Starting 5-run production Lighthouse benchmark on http://localhost:4173...');
const results = [];

for (let i = 1; i <= 5; i++) {
  const file = `lh-run-${i}.json`;
  console.log(`Running test ${i}...`);
  execSync(`npx lighthouse http://localhost:4173 --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=./${file} --quiet`, { stdio: 'inherit' });
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const perf = Math.round(data.categories.performance.score * 100);
  const a11y = Math.round(data.categories.accessibility.score * 100);
  const bp = Math.round(data.categories['best-practices'].score * 100);
  const seo = Math.round(data.categories.seo.score * 100);
  const fcp = data.audits['first-contentful-paint'].numericValue;
  const lcp = data.audits['largest-contentful-paint'].numericValue;
  const tbt = data.audits['total-blocking-time'].numericValue;
  const cls = data.audits['cumulative-layout-shift'].numericValue;
  const si = data.audits['speed-index'].numericValue;
  results.push({ run: i, perf, a11y, bp, seo, fcp, lcp, tbt, cls, si });
  console.log(`Run ${i}: Perf=${perf}, FCP=${Math.round(fcp)}ms, LCP=${Math.round(lcp)}ms, TBT=${Math.round(tbt)}ms, CLS=${cls.toFixed(3)}, SI=${Math.round(si)}ms`);
}

fs.writeFileSync('lh-5runs-summary.json', JSON.stringify(results, null, 2));
console.log('5 runs complete!');
