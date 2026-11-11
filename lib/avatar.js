// Initials and a stable colour slot (1-8) for a username, used by the avatar circles.
function initials(name) {
  const parts = String(name || '?').replace(/[_\-.]+/g, ' ').trim().split(/\s+/);
  const word = parts[0];
  const digits = word.match(/\d+$/);
  // "ann_lee" -> "AL", "demo2" -> "D2", "alice" -> "AL"
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0]
    : digits && digits.index > 0 ? word[0] + digits[0][0]
    : word.slice(0, 2);
  return letters.toUpperCase();
}

function colorFor(name) {
  let hash = 0;
  for (const ch of String(name || '')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (hash % 8) + 1;
}

module.exports = { initials, colorFor };
