export const TYPES = ["AC Sleeper", "Non-AC Sleeper", "AC Seater", "Non-AC Seater"];

// city -> [longitude, latitude]; map positions are calculated from these
export const LL = {
  Ahmedabad: [72.57, 23.02], Aurangabad: [75.34, 19.88], Bhopal: [77.41, 23.26], Delhi: [77.21, 28.61], Gwalior: [78.18, 26.22],
  Hyderabad: [78.49, 17.39], Indore: [75.86, 22.72], Jabalpur: [79.95, 23.18], Jaipur: [75.79, 26.91], Jodhpur: [73.02, 26.24],
  Khandwa: [76.35, 21.83], Kota: [75.83, 25.18], Mumbai: [72.88, 19.08], Nagpur: [79.09, 21.15], Nashik: [73.79, 20.0],
  Pune: [73.86, 18.52], Raipur: [81.63, 21.25], Rajkot: [70.8, 22.3], Ratlam: [75.04, 23.33], Sagar: [78.74, 23.84],
  Surat: [72.83, 21.17], Udaipur: [73.71, 24.59], Ujjain: [75.78, 23.18], Vadodara: [73.18, 22.31],
};
export const CITY = Object.keys(LL).sort();
export const POS = Object.fromEntries(Object.entries(LL).map(([c, [lo, la]]) => [c, [Math.round(((lo - 70) / 12) * 540 + 30), Math.round(((29 - la) / 12) * 220 + 20)]]));

// [on-time %, cancellation %, amenities (of 4), rating]
export const OPS = {
  "Chartered Speedlink": [94, 2, 4, 4.4], "Hans Travels": [90, 3, 3, 4.2], "Verma Travels": [87, 4, 3, 4.0],
  "Zingbus": [92, 2, 4, 4.3], "MSRTC": [80, 6, 2, 3.7], "AICTSL": [83, 5, 2, 3.8],
  "IntrCity SmartBus": [95, 2, 4, 4.5], "VRL Travels": [88, 3, 3, 4.1], "Neeta Travels": [89, 3, 3, 4.1], "Sharma Travels": [85, 4, 3, 3.9],
};
export const FAC = {
  default: ["Nearest District Hospital (dial 108)", "Nearest Police Station (dial 100)"],
  Indore: ["MY Hospital", "Vijay Nagar Police Stn"], Bhopal: ["AIIMS Bhopal", "TT Nagar Police Stn"],
  Nagpur: ["Govt Medical College", "Sitabuldi Police Stn"], Pune: ["Sassoon Hospital", "Swargate Police Stn"],
  Ahmedabad: ["Civil Hospital", "Kalupur Police Stn"],
};

export const isSleeper = (t) => (t || "").includes("Sleeper");
export const isAC = (t) => !(t || "").startsWith("Non");
const cache = {};
// Sleeper: 30 berths (Lower L1-15, Upper U1-15, 2+1).  Seater: 40 seats (rows 1-10, A B | C D)
export function seatsFor(type) {
  const k = isSleeper(type) ? "S" : "T";
  if (!cache[k]) cache[k] = k === "S"
    ? ["L", "U"].flatMap((d) => Array.from({ length: 15 }, (_, i) => d + (i + 1)))
    : Array.from({ length: 10 }, (_, r) => ["A", "B", "C", "D"].map((c) => r + 1 + c)).flat();
  return cache[k];
}
export const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 100003, 7);
export const M = (m) => {
  const x = m % 1440;
  return String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(x % 60).padStart(2, "0") + (m >= 1440 ? " +1d" : "");
};
export const H = (m) => Math.floor(m / 60) + "h " + (m % 60) + "m";

// TransitLink: up to 2 transfers, layover 30 min - 4 h
export function plan(T, f, t) {
  const out = [];
  (function go(c, L, arr, vis) {
    for (const x of T) {
      if (x.f !== c || vis.includes(x.t)) continue;
      let d = x.dep;
      if (L.length) {
        d = null;
        for (let k = 0; k < 2; k++) {
          const dd = x.dep + 1440 * k, w = dd - arr;
          if (w >= 30 && w <= 240) { d = dd; break; }
        }
        if (d === null) continue;
      }
      const N = [...L, { ...x, d, a: d + x.dur }];
      if (x.t === t) out.push(N);
      else if (N.length < 3) go(x.t, N, d + x.dur, [...vis, x.t]);
    }
  })(f, [], 0, [f]);
  return out.map((L) => ({ L, fare: L.reduce((s, x) => s + x.fare, 0), dur: L[L.length - 1].a - L[0].d, tr: L.length - 1 }));
}

// booked = Set of "tripId_seat" from the database.  "b" booked, "f" female reserved, "" free
// (the hash part adds demo occupancy so every bus does not look empty)
export function seatStatus(booked, tid, s, type) {
  if (booked.has(tid + "_" + s) || hash(tid + s) % 6 === 0) return "b";
  const fem = isSleeper(type) ? s[0] === "L" && +s.slice(1) <= 3 : ["1A", "1B", "2A", "2B"].includes(s);
  return fem ? "f" : "";
}
