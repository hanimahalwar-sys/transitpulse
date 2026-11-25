import { LL } from "./utils";

// SAMPLE boarding points: [name, lat, lng, minutes after the bus leaves its main stand]
const KNOWN = {
  Indore: [["Sarwate Bus Stand", 22.7186, 75.87, 0], ["Vijay Nagar Square", 22.7533, 75.8937, 25], ["Bhawarkuan Square", 22.6934, 75.8663, 40]],
  Bhopal: [["ISBT Bhopal", 23.225, 77.435, 0], ["Habibganj Station", 23.2287, 77.4396, 20], ["DB Mall Road", 23.2327, 77.4294, 35]],
  Mumbai: [["Borivali", 19.2307, 72.8567, 0], ["Andheri", 19.1136, 72.8697, 25], ["Dadar", 19.0178, 72.8478, 45]],
  Pune: [["Swargate", 18.5018, 73.8636, 0], ["Shivajinagar", 18.5308, 73.8475, 20], ["Hadapsar", 18.5089, 73.926, 40]],
  Delhi: [["Kashmere Gate ISBT", 28.6676, 77.2284, 0], ["Anand Vihar ISBT", 28.6469, 77.3159, 30], ["Dhaula Kuan", 28.5921, 77.162, 45]],
  Jaipur: [["Sindhi Camp", 26.9234, 75.796, 0], ["Sansar Chandra Road", 26.917, 75.787, 20], ["Narayan Singh Circle", 26.8949, 75.801, 35]],
  Ahmedabad: [["Geeta Mandir", 23.0105, 72.5934, 0], ["Paldi", 23.0123, 72.5648, 20], ["Naroda", 23.0679, 72.651, 45]],
  Nagpur: [["Sitabuldi", 21.1458, 79.0882, 0], ["Ganeshpeth Bus Stand", 21.1508, 79.1107, 20], ["Wardha Road", 21.1186, 79.0648, 40]],
  Hyderabad: [["MGBS", 17.379, 78.487, 0], ["Ameerpet", 17.4375, 78.4483, 30], ["LB Nagar", 17.3457, 78.5522, 50]],
};
export function pointsFor(city) {
  if (KNOWN[city]) return KNOWN[city].map(([name, lat, lng, off]) => ({ name, lat, lng, off }));
  const [lo, la] = LL[city] || [0, 0];
  return [
    { name: "Main Bus Stand", lat: la, lng: lo, off: 0 },
    { name: "Railway Station Stop", lat: la + 0.008, lng: lo + 0.008, off: 15 },
    { name: "Highway Bypass Point", lat: la - 0.012, lng: lo + 0.01, off: 30 },
  ];
}
export function walkInfo(pos, p) {
  const r = Math.PI / 180, dLa = (p.lat - pos.lat) * r, dLo = (p.lng - pos.lng) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(pos.lat * r) * Math.cos(p.lat * r) * Math.sin(dLo / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.sqrt(h));
  return { km: km.toFixed(1), min: Math.round(((km * 1.3) / 5) * 60) }; // 5 km/h, +30% for real roads
}
// nearest point you can still reach before the bus gets there
export function recommend(city, pos, minsUntil) {
  const pts = pointsFor(city);
  if (!pos) return { ...pts[0], why: "Main point (press 'Use my location' for a nearby suggestion)" };
  const sc = pts.map((p) => { const w = walkInfo(pos, p).min; return { p, w, ok: minsUntil == null || minsUntil < 0 || w + 15 <= minsUntil + p.off }; });
  const pool = (sc.filter((x) => x.ok).length ? sc.filter((x) => x.ok) : sc).sort((a, b) => a.w - b.w);
  const b = pool[0];
  const why = b.w > 180 ? `You seem far from ${city} (${b.w} min away)` : `${b.w} min walk` + (sc.some((x) => x.ok) ? "" : " - you may miss this bus");
  return { ...b.p, why };
}
