// Relative dates such as "just now", "2 hours ago", "3 days ago".
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const STEPS = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60]
];

function formatRelative(date, now = new Date()) {
  const seconds = Math.round((new Date(date).getTime() - now.getTime()) / 1000);
  if (Math.abs(seconds) < 45) return 'just now';
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(Math.round(seconds / 60), 'minute');
}

// Full date for tooltips and the datetime attribute, e.g. "6 Nov 2026, 14:05".
function formatFull(date) {
  return new Date(date).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

module.exports = { formatRelative, formatFull };
