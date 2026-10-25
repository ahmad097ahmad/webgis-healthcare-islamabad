const statusEl = document.getElementById('status');
const searchEl = document.getElementById('search');
const filterEl = document.getElementById('filter');
const countEl = document.getElementById('count');

let allFeatures = [];

// 1. Set up the map
const map = L.map('map').setView([33.6844, 73.0479], 11);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);

// 2. Overpass query (bounding box around Islamabad)
const query = `[out:json][timeout:25];
(
  nwr["amenity"~"hospital|clinic|pharmacy"](33.50,72.80,33.85,73.30);
);
out center;`;

// 3. Fetch data
async function loadData() {
  statusEl.style.color = '#1b6ca8';
  statusEl.textContent = 'Loading data...';
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query)
    });
    if (!res.ok) throw new Error('Server error ' + res.status);
    const data = await res.json();
    allFeatures = data.elements;
    statusEl.textContent = '';
    applyFilters();
  } catch (err) {
    statusEl.style.color = '#b00020';
    statusEl.textContent = 'Could not load data: ' + err.message;
  }
}

// 4. Get coordinates (points have lat/lon, buildings have center)
function getLatLon(f) {
  if (f.lat !== undefined) return [f.lat, f.lon];
  if (f.center) return [f.center.lat, f.center.lon];
  return null;
}

// 5. Draw markers
function drawMarkers(features) {
  markerLayer.clearLayers();
  let shown = 0;

  features.forEach(f => {
    const coords = getLatLon(f);
    if (!coords) return;

    const t = f.tags || {};
    const name = t.name || 'Unnamed facility';
    const type = t.amenity || 'unknown';
    const phone = t['contact:phone'] || t.phone || 'Not available';
    const hours = t.opening_hours || 'Not available';
    const street = t['addr:street'] || 'Not available';

    const popup = `
      <b>${name}</b><br>
      Type: ${type}<br>
      Phone: ${phone}<br>
      Hours: ${hours}<br>
      Street: ${street}
    `;

    L.marker(coords).bindPopup(popup).addTo(markerLayer);
    shown++;
  });

  countEl.textContent = shown + (shown === 1 ? ' facility shown' : ' facilities shown');
}

// 6. Filter + search
function applyFilters() {
  const type = filterEl.value;
  const text = searchEl.value.trim().toLowerCase();

  const result = allFeatures.filter(f => {
    const t = f.tags || {};
    const matchType = type === 'all' || t.amenity === type;
    const matchName = !text || (t.name || '').toLowerCase().includes(text);
    return matchType && matchName;
  });

  drawMarkers(result);
}

filterEl.addEventListener('change', applyFilters);
searchEl.addEventListener('input', applyFilters);

loadData();