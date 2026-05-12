/**
 * Converts ROAD_NETWORK_RTK_LINE.shp (WGS84 UTM Zone 51N / EPSG:32651)
 * to dalaguete-roads.geojson (WGS84 geographic / EPSG:4326) for Leaflet.
 *
 * Usage:
 *   docker cp ROAD_NETWORK_RTK_LINE.shp pams-backend:/tmp/ROAD_NETWORK_RTK_LINE.shp
 *   docker cp ROAD_NETWORK_RTK_LINE.dbf pams-backend:/tmp/ROAD_NETWORK_RTK_LINE.dbf
 *   docker cp scripts/convert-roads-to-geojson.js pams-backend:/tmp/convert-roads.js
 *   docker exec pams-backend node /tmp/convert-roads.js
 *   docker cp pams-backend:/tmp/dalaguete-roads.geojson frontend/public/dalaguete-roads.geojson
 *   docker cp frontend/public/dalaguete-roads.geojson pams-frontend:/app/public/dalaguete-roads.geojson
 */

const fs = require('fs');

const SHP_PATH = process.env.SHP || '/tmp/ROAD_NETWORK_RTK_LINE.shp';
const DBF_PATH = process.env.DBF || '/tmp/ROAD_NETWORK_RTK_LINE.dbf';
const OUT_PATH = process.env.OUT || '/tmp/dalaguete-roads.geojson';

// --- UTM Zone 51N → WGS84 geographic ---
const a = 6378137.0;
const f = 1 / 298.257223563;
const b = a * (1 - f);
const e2 = 1 - (b * b) / (a * a);
const k0 = 0.9996;
const lon0 = 123 * (Math.PI / 180);
const RAD = 180 / Math.PI;

function utmToLatLng(E, N) {
  const ep2 = e2 / (1 - e2);
  const M = N / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2);
  const T1 = Math.tan(phi1) ** 2;
  const C1 = ep2 * Math.cos(phi1) ** 2;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1) ** 2, 1.5);
  const D = (E - 500000) / (N1 * k0);
  const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (
    D ** 2 / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6 / 720
  );
  const lon = lon0 + (
    D
    - (1 + 2 * T1 + C1) * D ** 3 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5 / 120
  ) / Math.cos(phi1);
  return [lon * RAD, lat * RAD]; // [lng, lat]
}

// --- PolyLine .shp reader (shape type 3) ---
function readShp(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const features = [];
  let offset = 100;
  while (offset < buf.byteLength) {
    if (offset + 8 > buf.byteLength) break;
    const contentLength = view.getInt32(offset + 4, false) * 2;
    offset += 8;
    if (offset + contentLength > buf.byteLength) break;
    const shapeType = view.getInt32(offset, true);
    if (shapeType === 3) { // PolyLine
      const numParts = view.getInt32(offset + 36, true);
      const numPoints = view.getInt32(offset + 40, true);
      const parts = [];
      for (let i = 0; i < numParts; i++) {
        parts.push(view.getInt32(offset + 44 + i * 4, true));
      }
      const pointsStart = offset + 44 + numParts * 4;
      const allPoints = [];
      for (let i = 0; i < numPoints; i++) {
        const x = view.getFloat64(pointsStart + i * 16, true);
        const y = view.getFloat64(pointsStart + i * 16 + 8, true);
        allPoints.push(utmToLatLng(x, y));
      }
      if (numParts === 1) {
        features.push({ type: 'LineString', coordinates: allPoints });
      } else {
        const lines = [];
        for (let p = 0; p < numParts; p++) {
          const start = parts[p];
          const end = p + 1 < numParts ? parts[p + 1] : numPoints;
          lines.push(allPoints.slice(start, end));
        }
        features.push({ type: 'MultiLineString', coordinates: lines });
      }
    }
    offset += contentLength;
  }
  return features;
}

// --- .dbf reader ---
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
    const length = buf[pos + 16];
    fields.push({ name, length });
    pos += 32;
  }
  const records = [];
  for (let r = 0; r < numRecords; r++) {
    const recStart = headerBytes + r * recordSize;
    const rec = {};
    let fieldPos = 1;
    for (const field of fields) {
      rec[field.name] = Buffer.from(buf.slice(recStart + fieldPos, recStart + fieldPos + field.length)).toString('utf8').trim();
      fieldPos += field.length;
    }
    records.push(rec);
  }
  return records;
}

// --- Main ---
if (!fs.existsSync(SHP_PATH) || !fs.existsSync(DBF_PATH)) {
  console.error('ERROR: Shapefile not found at', SHP_PATH);
  process.exit(1);
}

const geometries = readShp(fs.readFileSync(SHP_PATH));
const attributes = readDbf(fs.readFileSync(DBF_PATH));

const geojson = {
  type: 'FeatureCollection',
  features: geometries.map((geom, i) => ({
    type: 'Feature',
    properties: attributes[i] || {},
    geometry: geom,
  })),
};

fs.writeFileSync(OUT_PATH, JSON.stringify(geojson));
console.log(`Done! Written ${geojson.features.length} road features to: ${OUT_PATH}`);
