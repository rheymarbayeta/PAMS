/**
 * Converts Dalaguete.shp (WGS84 UTM Zone 51N / EPSG:32651)
 * to dalaguete.geojson (WGS84 geographic / EPSG:4326) for use with Leaflet.
 *
 * Usage (from project root):
 *   1. Copy Dalaguete.shp and Dalaguete.dbf into /home/itsm/PAMS/shapefiles/
 *   2. docker cp /home/itsm/PAMS/shapefiles/Dalaguete.shp pams-backend:/tmp/Dalaguete.shp
 *      docker cp /home/itsm/PAMS/shapefiles/Dalaguete.dbf pams-backend:/tmp/Dalaguete.dbf
 *      docker cp /home/itsm/PAMS/scripts/convert-shp-to-geojson.js pams-backend:/tmp/convert.js
 *   3. docker exec pams-backend node /tmp/convert.js
 *   4. docker cp pams-backend:/tmp/dalaguete.geojson /home/itsm/PAMS/frontend/public/dalaguete.geojson
 *   5. docker cp /home/itsm/PAMS/frontend/public/dalaguete.geojson pams-frontend:/app/public/dalaguete.geojson
 */

const fs = require('fs');
const path = require('path');

const SHP_PATH = process.env.SHP || '/tmp/Dalaguete.shp';
const DBF_PATH = process.env.DBF || '/tmp/Dalaguete.dbf';
const OUT_PATH = process.env.OUT || '/tmp/dalaguete.geojson';

// --- Minimal proj4 UTM→Geographic conversion (no external dependency) ---
// EPSG:32651  WGS84 UTM Zone 51N
// Converts (easting, northing) metres → (longitude, latitude) degrees

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const a = 6378137.0;       // WGS84 semi-major axis
const f = 1 / 298.257223563;
const b = a * (1 - f);
const e2 = 1 - (b * b) / (a * a);
const e = Math.sqrt(e2);
const k0 = 0.9996;
const lon0 = 123 * DEG;   // central meridian for Zone 51N

function utmToLatLng(E, N) {
  const ep2 = e2 / (1 - e2);
  const M = N / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
    + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu)
    + (1097 * e1 * e1 * e1 * e1 / 512) * Math.sin(8 * mu);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) * Math.sin(phi1));
  const T1 = Math.tan(phi1) * Math.tan(phi1);
  const C1 = ep2 * Math.cos(phi1) * Math.cos(phi1);
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) * Math.sin(phi1), 1.5);
  const D = (E - 500000) / (N1 * k0);
  const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (
    D * D / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D * D * D * D / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D * D * D * D * D * D / 720
  );
  const lon = lon0 + (
    D
    - (1 + 2 * T1 + C1) * D * D * D / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D * D * D * D * D / 120
  ) / Math.cos(phi1);
  return [lon * RAD, lat * RAD]; // [lng, lat]
}

// --- Minimal .shp reader ---
function readShp(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const features = [];
  let offset = 100; // skip file header
  while (offset < buf.byteLength) {
    if (offset + 8 > buf.byteLength) break;
    const contentLength = view.getInt32(offset + 4, false) * 2;
    offset += 8;
    if (offset + contentLength > buf.byteLength) break;
    const shapeType = view.getInt32(offset, true);
    if (shapeType === 5 || shapeType === 15) { // Polygon or PolygonZ
      const numParts = view.getInt32(offset + 36, true);
      const numPoints = view.getInt32(offset + 40, true);
      const parts = [];
      for (let i = 0; i < numParts; i++) {
        parts.push(view.getInt32(offset + 44 + i * 4, true));
      }
      const pointsStart = offset + 44 + numParts * 4;
      const points = [];
      for (let i = 0; i < numPoints; i++) {
        const x = view.getFloat64(pointsStart + i * 16, true);
        const y = view.getFloat64(pointsStart + i * 16 + 8, true);
        points.push(utmToLatLng(x, y));
      }
      const rings = [];
      for (let p = 0; p < numParts; p++) {
        const start = parts[p];
        const end = p + 1 < numParts ? parts[p + 1] : numPoints;
        rings.push(points.slice(start, end));
      }
      features.push({ type: 'Polygon', rings });
    }
    offset += contentLength;
  }
  return features;
}

// --- Minimal .dbf reader ---
function readDbf(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const numRecords = view.getInt32(4, true);
  const headerBytes = view.getInt16(8, true);
  const recordSize = view.getInt16(10, true);
  const fields = [];
  let pos = 32;
  while (pos < headerBytes - 1) {
    const nameBytes = [];
    for (let i = 0; i < 11; i++) nameBytes.push(buf[pos + i]);
    const name = String.fromCharCode(...nameBytes).replace(/\0/g, '').trim();
    if (!name) break;
    const type = String.fromCharCode(buf[pos + 11]);
    const length = buf[pos + 16];
    fields.push({ name, type, length });
    pos += 32;
  }
  const records = [];
  for (let r = 0; r < numRecords; r++) {
    const recStart = headerBytes + r * recordSize;
    const rec = {};
    let fieldPos = 1; // skip deletion flag byte
    for (const field of fields) {
      const raw = buf.slice(recStart + fieldPos, recStart + fieldPos + field.length);
      rec[field.name] = Buffer.from(raw).toString('utf8').trim();
      fieldPos += field.length;
    }
    records.push(rec);
  }
  return records;
}

// --- Main ---
if (!fs.existsSync(SHP_PATH) || !fs.existsSync(DBF_PATH)) {
  console.error('ERROR: Shapefile not found.');
  console.error('  Copy Dalaguete.shp and Dalaguete.dbf into:');
  console.error('  ' + path.join(__dirname, '../shapefiles/'));
  process.exit(1);
}

const shpBuf = fs.readFileSync(SHP_PATH);
const dbfBuf = fs.readFileSync(DBF_PATH);

const geometries = readShp(shpBuf);
const attributes = readDbf(dbfBuf);

const geojson = {
  type: 'FeatureCollection',
  features: geometries.map((geom, i) => ({
    type: 'Feature',
    properties: attributes[i] || {},
    geometry: {
      type: 'Polygon',
      coordinates: geom.rings,
    },
  })),
};

fs.writeFileSync(OUT_PATH, JSON.stringify(geojson));
console.log(`Done! Written ${geojson.features.length} barangay features to:`);
console.log('  ' + OUT_PATH);
geojson.features.forEach(f => console.log('  -', f.properties.BRGY));
