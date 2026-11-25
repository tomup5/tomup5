// Renders the GitHub contribution calendar as a navy/cyan SVG.
// Env: GITHUB_TOKEN, GH_USER. Usage: node calendar.mjs <out.svg>
import fs from 'node:fs';
const user = process.env.GH_USER, token = process.env.GITHUB_TOKEN, out = process.argv[2];
if (!user || !token || !out) { console.error('need GH_USER, GITHUB_TOKEN and an output path'); process.exit(1); }

const query = `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{
  totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;
const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-calendar' },
  body: JSON.stringify({ query, variables: { u: user } }),
});
const json = await res.json();
if (!res.ok || json.errors) { console.error(JSON.stringify(json.errors || json)); process.exit(1); }
const cal = json.data.user.contributionsCollection.contributionCalendar;

const LEVEL = { NONE: '#16213a', FIRST_QUARTILE: '#1e3a8a', SECOND_QUARTILE: '#1d4ed8', THIRD_QUARTILE: '#0891b2', FOURTH_QUARTILE: '#22d3ee' };
const FONT = "'Segoe UI', -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif";
const W = 900, CELL = 12, GAP = 3, STEP = CELL + GAP, X0 = 58, Y0 = 62;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let cells = '', labels = '', lastMonth = -1;
cal.weeks.forEach((w, i) => {
  const x = X0 + i * STEP;
  const first = w.contributionDays[0];
  const m = new Date(first.date + 'T00:00:00Z').getUTCMonth();
  const partial = i === 0 && new Date(first.date + 'T00:00:00Z').getUTCDate() > 7;
  if (m !== lastMonth && !partial && i < cal.weeks.length - 2) { labels += `<text x="${x}" y="${Y0 - 10}">${MONTHS[m]}</text>`; lastMonth = m; }
  for (const d of w.contributionDays) {
    const dow = new Date(d.date + 'T00:00:00Z').getUTCDay();
    cells += `<rect x="${x}" y="${Y0 + dow * STEP}" width="${CELL}" height="${CELL}" rx="2.5" fill="${LEVEL[d.contributionLevel] || LEVEL.NONE}"><title>${d.contributionCount} on ${d.date}</title></rect>`;
  }
});
const H = Y0 + 7 * STEP + 40;
const legendX = W - 28 - 5 * STEP - 70;
const legend = `<text x="${legendX}" y="${H - 19}">Less</text>` +
  Object.values(LEVEL).map((c, i) => `<rect x="${legendX + 32 + i * STEP}" y="${H - 29}" width="${CELL}" height="${CELL}" rx="2.5" fill="${c}"/>`).join('') +
  `<text x="${legendX + 32 + 5 * STEP + 4}" y="${H - 19}">More</text>`;
const days = [[1,'Mon'],[3,'Wed'],[5,'Fri']].map(([d, n]) => `<text x="${X0 - 34}" y="${Y0 + d * STEP + 10}">${n}</text>`).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${cal.totalContributions} contributions in the last year">
<title>${cal.totalContributions} contributions in the last year</title>
<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs>
<rect width="${W}" height="${H}" rx="16" fill="#0b1220"/>
<g font-family="${FONT}">
<text x="28" y="30" font-size="14" font-weight="700" fill="#ffffff">${cal.totalContributions} contributions in the last year</text>
<g font-size="11" fill="#94a3b8">${labels}${days}${legend}</g>
${cells}
</g>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="15" fill="none" stroke="url(#b)" stroke-width="2"><animate attributeName="stroke-opacity" values="0.45;1;0.45" dur="3s" repeatCount="indefinite"/></rect>
</svg>
`;
fs.mkdirSync(out.replace(/[^/]+$/, '') || '.', { recursive: true });
fs.writeFileSync(out, svg);
console.log(`wrote ${out}: ${cal.totalContributions} contributions, ${cal.weeks.length} weeks`);
