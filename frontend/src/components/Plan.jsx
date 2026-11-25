import { useEffect, useMemo, useRef, useState } from "react";
import { api, uid } from "../api";
import { CITY, POS, OPS, plan, M, H, isAC, isSleeper, seatsFor, seatStatus } from "../utils";
import SeatMatrix from "./SeatMatrix";
import { Boarding, Budget, Luggage, Passengers, validateBooking } from "./Tools";
import { recommend } from "../boarding";
import { savePass } from "../offline";

const POPULAR = [["Indore", "Bhopal"], ["Indore", "Mumbai"], ["Delhi", "Jaipur"], ["Pune", "Mumbai"], ["Ahmedabad", "Surat"], ["Nagpur", "Hyderabad"], ["Indore", "Ujjain"], ["Jaipur", "Udaipur"]];
const OFFERS = [
  ["Save up to ₹250 on bus tickets", "TRANSIT10", "from-rose-100 to-red-200"], ["₹200 off on Zingbus routes", "ZING200", "from-yellow-100 to-amber-200"],
  ["Women first: reserved berths, 5% off", "SHE5", "from-pink-100 to-fuchsia-200"], ["Connection protection on every TransitLink", "LINK", "from-green-100 to-emerald-200"],
];
const WHY = [["🪑", "Visual seat map", "Pick exact berths on sleeper and seater buses"], ["🔗", "TransitLink", "Multi-bus trips, one PNR, protected connections"], ["👩", "Women first", "Reserved seats and safer travel"], ["👛", "Travel wallet", "Refunds and credits in one place"]];

const slotOf = (m) => { const h = Math.floor((m % 1440) / 60); return h < 6 ? "Night" : h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening"; };
const left = (booked, x) => seatsFor(x.type).filter((s) => seatStatus(booked, x.id, s, x.type) !== "b").length;
const perSeat = (g, s) => g.fare + (isSleeper(g.type) && s[0] === "U" ? -40 : 0);

function CountUp({ to }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let i = 0; const step = Math.max(1, Math.ceil(to / 40));
    const t = setInterval(() => { i += step; setN(Math.min(i, to)); if (i >= to) clearInterval(t); }, 30);
    return () => clearInterval(t);
  }, [to]);
  return <>{n.toLocaleString("en-IN")}</>;
}
const Chip = ({ on, onClick, children }) => (
  <button onClick={onClick} className={"px-3 py-1 rounded-full border text-sm transition " + (on ? "bg-brand text-white border-brand shadow" : "bg-white hover:bg-gray-100")}>{children}</button>
);
const CityInput = ({ value, onChange, placeholder, icon }) => (
  <label className="flex-1 min-w-[170px] flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border focus-within:border-brand focus-within:bg-white focus-within:shadow transition">
    <span className="text-lg">{icon}</span>
    <input list="cities" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-transparent outline-none w-full" />
  </label>
);

function HeroScene() {
  return (
    <svg viewBox="0 0 1200 380" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b1230" /><stop offset=".55" stopColor="#c0394a" /><stop offset="1" stopColor="#ffb36b" /></linearGradient>
        <radialGradient id="sun"><stop offset="0" stopColor="#fff3c4" /><stop offset="1" stopColor="#ffb36b" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1200" height="380" fill="url(#sky)" />
      {[[80, 40], [220, 80], [380, 30], [520, 70], [700, 36], [1040, 50], [1130, 100]].map(([x, y], i) => <circle key={i} className="star" style={{ animationDelay: i * 0.4 + "s" }} cx={x} cy={y} r="2" fill="#fff" />)}
      <circle className="sunglow" cx="900" cy="235" r="130" fill="url(#sun)" />
      <circle cx="900" cy="235" r="44" fill="#fff0b8" />
      <g className="c1" opacity=".5"><ellipse cx="0" cy="80" rx="80" ry="18" fill="#fff" /><ellipse cx="45" cy="66" rx="50" ry="16" fill="#fff" /></g>
      <g className="c2" opacity=".4"><ellipse cx="0" cy="130" rx="90" ry="20" fill="#fff" /><ellipse cx="50" cy="114" rx="55" ry="17" fill="#fff" /></g>
      <g className="c3" opacity=".35"><ellipse cx="0" cy="40" rx="60" ry="14" fill="#fff" /></g>
      <path d="M0 270 Q150 190 320 250 T640 240 T960 235 T1200 250 V380 H0Z" fill="#6b1d3a" opacity=".9" />
      <path d="M0 300 Q200 240 400 285 T800 280 T1200 290 V380 H0Z" fill="#45122f" />
      <rect y="322" width="1200" height="60" fill="#1d1020" />
      <line className="roadline" x1="0" y1="352" x2="1200" y2="352" stroke="#ffd166" strokeWidth="3" />
      <g className="busmove">
        <g transform="translate(0,276)">
          <polygon points="180,34 330,12 330,56" fill="#fff6c8" opacity=".25" />
          <rect width="180" height="48" rx="11" fill="#fff" />
          <rect y="30" width="180" height="10" fill="#d84e55" />
          {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={12 + i * 26} y="8" width="20" height="16" rx="3" fill="#7fd0ff" />)}
          <rect x="166" y="8" width="10" height="22" rx="3" fill="#7fd0ff" />
          <ellipse cx="180" cy="38" rx="4" ry="5" fill="#ffe066" />
          {[40, 140].map((x) => <g key={x}><circle cx={x} cy="50" r="11" fill="#111" /><rect className="wheel" x={x - 5} y="48" width="10" height="4" fill="#bbb" /></g>)}
        </g>
      </g>
    </svg>
  );
}

export default function Plan({ trips, booked, reload, route, setRoute, goTrips }) {
  const [f, setF] = useState(route.f || "");
  const [t, setT] = useState(route.t || "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [women, setWomen] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState(null);            // null until the user presses Search
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("fare");
  const [acF, setAcF] = useState("all");
  const [tyF, setTyF] = useState("all");
  const [slot, setSlot] = useState("all");
  const [maxFare, setMaxFare] = useState(5000);
  const [sel, setSel] = useState(null);
  const [leg, setLeg] = useState(0);
  const [seats, setSeats] = useState({});      // tripId -> [seat, ...]
  const [pax, setPax] = useState(1);
  const [pref, setPref] = useState("window");
  const [ins, setIns] = useState(false);
  const [promo, setPromo] = useState(false);
  const [msg, setMsg] = useState("");
  const [boards, setBoards] = useState({});   // tripId -> chosen boarding point
  const [pos, setPos] = useState(null);        // user location (optional)
  const [lug, setLug] = useState({ fee: 0, ok: true });
  const blankP = { name: "", age: "", gender: "Male" };
  const [plist, setPlist] = useState([blankP]);   // one entry per passenger
  const [contact, setContact] = useState(() => { try { return JSON.parse(localStorage.getItem("tp_contact")) || { email: "", phone: "" }; } catch { return { email: "", phone: "" }; } });
  const [touched, setTouched] = useState(false);
  const pl = Array.from({ length: pax }, (_, i) => plist[i] || blankP);
  const results = useRef(null);

  function run(ff, tt) {
    if (!CITY.includes(ff) || !CITY.includes(tt)) return setErr("Please choose both cities from the list");
    if (ff === tt) return setErr("Leaving From and Going To cannot be the same");
    setErr(""); setF(ff); setT(tt); setRoute({ f: ff, t: tt }); setSel(null); setLoading(true); setQ(null);
    setTimeout(() => { setQ({ f: ff, t: tt, date }); setLoading(false); results.current?.scrollIntoView({ behavior: "smooth" }); }, 800);
  }
  useEffect(() => { if (route.auto && route.f && route.t) run(route.f, route.t); }, [route]); // eslint-disable-line

  const pool = useMemo(() => trips.filter((x) => (acF === "all" || (acF === "AC") === isAC(x.type)) && (tyF === "all" || (tyF === "Sleeper") === isSleeper(x.type))), [trips, acF, tyF]);
  const all = useMemo(() => (q ? plan(pool, q.f, q.t) : []), [pool, q]);
  const its = useMemo(() => all.filter((x) => x.fare <= maxFare && (slot === "all" || slotOf(x.L[0].d) === slot)).sort((a, b) => a[sort] - b[sort]), [all, maxFare, slot, sort]);
  const edges = useMemo(() => { const s = new Set(); trips.forEach((x) => { if (POS[x.f] && POS[x.t]) s.add([x.f, x.t].sort().join("|")); }); return [...s].map((e) => e.split("|")); }, [trips]);
  const busPath = ["Ahmedabad", "Indore", "Bhopal", "Nagpur"].map((c, i) => (i ? "L" : "M") + POS[c].join(" ")).join(" ");

  const cur = sel?.L[leg];
  const mine = (g) => seats[g.id] || [];
  const minsUntil = (g) => (q ? (new Date(q.date + "T00:00:00").getTime() + g.d * 60000 - Date.now()) / 60000 : null);
  const boardOf = (g) => boards[g.id] || recommend(g.f, pos, minsUntil(g)).name;
  const cheapest = all.length ? Math.min(...all.map((x) => x.fare)) : 0;
  const base = sel ? sel.L.reduce((a, g) => a + mine(g).reduce((b, s) => b + perSeat(g, s), 0), 0) : 0;
  const total = Math.round((base + (ins && sel ? 19 * pax * sel.L.length : 0)) * (promo ? 0.9 : 1)) + (lug.fee || 0);
  const ready = sel && sel.L.every((g) => mine(g).length === pax) && lug.ok;

  const openSeats = (x) => { setSel(x); setLeg(0); setSeats({}); setPax(1); setMsg(""); setBoards({}); setLug({ fee: 0, ok: true }); setPlist([blankP]); setTouched(false); };
  const pick = (s) => {
    const id = cur.id, now = mine(cur);
    if (now.includes(s)) return setSeats({ ...seats, [id]: now.filter((v) => v !== s) });
    if (now.length >= pax) return setMsg(`You are booking for ${pax} passenger(s). Increase passengers to select more seats.`);
    setMsg("");
    const next = [...now, s];
    setSeats({ ...seats, [id]: next });
    if (next.length === pax && leg < sel.L.length - 1) setLeg(leg + 1);
    // every bus now has all its seats -> jump to passenger details and focus the first empty name
    const done = sel.L.every((g) => (g.id === id ? next : mine(g)).length === pax);
    const missing = pl.some((p) => !p.name.trim() || !p.age) || !contact.email.trim() || !contact.phone.trim();
    if (done && missing) setTimeout(() => {
      const i = Math.max(0, pl.findIndex((p) => !p.name.trim()));
      document.getElementById("passenger-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => document.getElementById(`p-name-${i}`)?.focus({ preventScroll: true }), 450);
    }, 120);
  };
  const changePax = (n) => { setPax(n); setSeats((p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v.slice(0, n)]))); setMsg(""); };

  async function pay() {
    setTouched(true);
    const bad = validateBooking(pl, contact);
    if (bad) return setMsg("✖ " + bad);
    setMsg("Locking all seats atomically...");
    try {
      const r = await api.post("/bookings", {
        userId: uid, total, email: contact.email.trim(), phone: contact.phone.trim(), promo: promo ? Math.round(base * 0.1) : 0,
        legs: sel.L.flatMap((g) => mine(g).map((s, i) => ({ tripId: g.id, seat: s, passengerName: pl[i].name.trim(), passengerAge: Number(pl[i].age), passengerGender: pl[i].gender, src: g.f, dest: g.t, operator: g.op, busType: g.type, boardingPoint: boardOf(g), dep: g.d, fare: perSeat(g, s) }))),
      });
      localStorage.setItem("tp_contact", JSON.stringify(contact));
      savePass({ pnr: r.data.pnr, status: "CONFIRMED", total, date: q?.date, passengers: pl.map((p) => `${p.name.trim()} (${p.age})`), contact, legs: sel.L.map((g) => ({ f: g.f, t: g.t, op: g.op, type: g.type, dep: g.d, seats: mine(g), boarding: boardOf(g) })) });
      setSel(null); setSeats({}); setMsg(""); await reload(); goTrips();
    } catch (e) {
      setMsg(!e.response ? "✖ Cannot reach the backend on port 8081 - is it running?" : e.response.status === 409 ? "✖ " + (e.response.data.message || "Seat just taken") + " - every lock rolled back. Pick other seats." : `✖ Booking failed (HTTP ${e.response.status}): ${e.response.data?.message || e.response.data?.error || "see the backend terminal for the red error"}`);
      reload();
    }
  }

  return (
    <>
      <datalist id="cities">{CITY.map((c) => <option key={c} value={c} />)}</datalist>

      <div className="relative overflow-hidden rounded-3xl h-[280px] md:h-[380px] mt-3 shadow-lg">
        <HeroScene />
        <div className="relative z-10 p-6 md:p-10 text-white up">
          <h1 className="text-3xl md:text-5xl font-extrabold drop-shadow">Book bus tickets<br />across {CITY.length} cities</h1>
          <p className="mt-2 opacity-90 text-lg">AC &amp; Non-AC · Sleeper &amp; Seater · Protected connections</p>
        </div>
      </div>

      <div className="relative z-20 -mt-14 mx-2 md:mx-8 bg-white rounded-2xl shadow-2xl p-4 border up">
        <div className="flex items-center gap-2 mb-3 text-brand font-bold"><span className="floaty text-2xl">🚌</span> Buses</div>
        <div className="flex flex-wrap items-center gap-2">
          <CityInput icon="📍" placeholder="Leaving From" value={f} onChange={setF} />
          <button onClick={() => { setF(t); setT(f); }} className="border rounded-full w-10 h-10 bg-white hover:bg-red-50 hover:rotate-180 transition duration-500" title="Swap">⇄</button>
          <CityInput icon="🎯" placeholder="Going To" value={t} onChange={setT} />
          <label className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border"><span>📅</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none" /></label>
          <button onClick={() => setDate(new Date().toISOString().slice(0, 10))} className="px-4 py-3 rounded-xl bg-red-50 text-brand font-semibold hover:bg-red-100">Today</button>
          <button onClick={() => setDate(new Date(Date.now() + 864e5).toISOString().slice(0, 10))} className="px-4 py-3 rounded-xl bg-red-50 text-brand font-semibold hover:bg-red-100">Tomorrow</button>
          <button onClick={() => run(f, t)} className="shine text-white font-bold text-lg rounded-xl px-10 py-3 hover:scale-105 transition shadow-lg">Search ›</button>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
          <label className="cursor-pointer"><input type="checkbox" checked={women} onChange={(e) => setWomen(e.target.checked)} /> 👩 Ladies seats first</label>
          {err && <span className="text-red-600 font-semibold">{err}</span>}
        </div>
      </div>

      {loading && <div className="text-center py-14"><div className="text-6xl animate-bounce">🚌</div><p className="mt-2 text-gray-500 animate-pulse">Finding the best buses for you...</p></div>}

      <div ref={results} />
      {q && !loading && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3 up">
            <h2 className="text-xl font-bold">{q.f} → {q.t}</h2>
            <span className="text-sm text-gray-500">{new Date(q.date).toDateString()} · {its.length} option(s){its.length > 30 && " · showing best 30"}</span>
          </div>
          <div className="bg-white border rounded-2xl p-3 mt-3 flex flex-wrap gap-x-6 gap-y-2 items-center text-sm up">
            <b>Filters</b>
            <span className="flex gap-1 items-center">{["all", "AC", "Non-AC"].map((v) => <Chip key={v} on={acF === v} onClick={() => setAcF(v)}>{v === "all" ? "All" : v}</Chip>)}</span>
            <span className="flex gap-1 items-center">{["all", "Sleeper", "Seater"].map((v) => <Chip key={v} on={tyF === v} onClick={() => setTyF(v)}>{v === "all" ? "Sleeper + Seater" : v}</Chip>)}</span>
            <span className="flex gap-1 items-center flex-wrap">{["all", "Morning", "Afternoon", "Evening", "Night"].map((v) => <Chip key={v} on={slot === v} onClick={() => setSlot(v)}>{v === "all" ? "Any time" : v}</Chip>)}</span>
            <label className="flex items-center gap-2">Max ₹{maxFare}<input type="range" min="300" max="5000" step="100" value={maxFare} onChange={(e) => setMaxFare(+e.target.value)} /></label>
            <span className="flex gap-1 items-center ml-auto">Sort: {[["fare", "Fare"], ["dur", "Duration"], ["tr", "Transfers"]].map(([k, n]) => <Chip key={k} on={sort === k} onClick={() => setSort(k)}>{n}</Chip>)}</span>
          </div>

          {its.slice(0, 30).map((x, i) => (
            <div key={i} style={{ animationDelay: Math.min(i, 10) * 60 + "ms" }} className="up bg-white border rounded-2xl p-4 my-3 hover:shadow-xl hover:-translate-y-0.5 hover:border-brand transition">
              {x.tr > 0 && <span className="text-xs bg-green-600 text-white rounded-full px-3 py-1">TransitLink · {x.tr} transfer(s) · 1 PNR · connection protected</span>}
              {x.L.map((l, j) => (
                <div key={j} className={"flex flex-wrap items-center gap-4 " + (j || x.tr ? "mt-3 " : "") + (j ? "pt-3 border-t border-dashed" : "")}>
                  <div className="min-w-[160px]">
                    <b>{l.op}</b>
                    <div><span className={"text-xs rounded px-2 py-0.5 " + (isAC(l.type) ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800")}>{l.type}</span></div>
                    <div className="text-xs text-gray-500 mt-1">⭐ {OPS[l.op]?.[3] ?? "4.0"} · {left(booked, l)} seats left</div>
                  </div>
                  <div className="flex items-center gap-3 flex-1 min-w-[260px] justify-center">
                    <div className="text-right"><b className="text-lg">{M(l.d)}</b><div className="text-xs text-gray-500">{l.f}</div></div>
                    <div className="flex-1 text-center text-xs text-gray-500">{H(l.dur)}<div className="route-line" /></div>
                    <div><b className="text-lg">{M(l.a)}</b><div className="text-xs text-gray-500">{l.t}</div></div>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap justify-between items-center gap-3 mt-3 pt-3 border-t">
                <div className="text-xs text-gray-500">Total journey {H(x.dur)}</div>
                <div className="flex items-center gap-4">
                  <div className="text-right"><div className="text-xs text-gray-500">Starts from</div><b className="text-2xl">₹{x.fare}</b></div>
                  <button onClick={() => openSeats(x)} className="shine text-white font-bold rounded-full px-6 py-2 hover:scale-105 transition">Select seats</button>
                </div>
              </div>
            </div>
          ))}
          {!its.length && (
            <div className="bg-white border rounded-2xl p-6 my-3 text-center up">
              <div className="text-4xl">🔍</div><p className="font-semibold mt-1">No bus matches these filters</p>
              <p className="text-sm text-gray-500">Try "All" filters or a higher max fare. Direct destinations from {q.f}: {CITY.filter((c) => trips.some((x) => x.f === q.f && x.t === c)).join(", ") || "none"}</p>
            </div>
          )}
        </>
      )}

      {!q && !loading && (
        <>
          <h2 className="font-bold text-xl mt-8 mb-3">Popular routes</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map(([a, b], i) => <button key={i} onClick={() => run(a, b)} style={{ animationDelay: i * 60 + "ms" }} className="up bg-white border rounded-full px-4 py-2 hover:border-brand hover:text-brand hover:-translate-y-0.5 transition shadow-sm">{a} → {b}</button>)}
          </div>

          <h2 className="font-bold text-xl mt-8 mb-3">Bus Booking Discount Offers</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {OFFERS.map((o, i) => (
              <div key={i} style={{ animationDelay: i * 100 + "ms" }} className={`up bg-gradient-to-br ${o[2]} rounded-2xl p-5 hover:scale-105 hover:rotate-1 transition cursor-pointer shadow`}>
                <span className="text-xs bg-black/70 text-white rounded px-2 py-0.5">Bus</span>
                <b className="block my-3 text-lg leading-snug">{o[0]}</b>
                <small className="bg-white/70 rounded px-2 py-1 font-mono">CODE: {o[1]}</small>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[[CITY.length, "Cities"], [trips.length, "Buses"], [edges.length, "Routes"], [10, "Buses per route"]].map(([n, l]) => (
              <div key={l} className="bg-white border rounded-2xl p-5 text-center shadow-sm up"><b className="text-3xl text-brand"><CountUp to={n} />+</b><div className="text-sm text-gray-500">{l}</div></div>
            ))}
          </div>

          <h2 className="font-bold text-xl mt-8 mb-3">Why TransitPulse</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            {WHY.map(([ic, h, p], i) => (
              <div key={h} style={{ animationDelay: i * 100 + "ms" }} className="up bg-white border rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition">
                <div className="text-4xl floaty" style={{ animationDelay: i * 0.4 + "s" }}>{ic}</div><b className="block mt-2">{h}</b><p className="text-sm text-gray-500">{p}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border rounded-2xl p-4 my-8 shadow-sm">
            <h2 className="font-bold mb-1">Live corridor network · {CITY.length} cities</h2>
            <svg viewBox="0 0 600 260" className="w-full">
              {edges.map(([a, b]) => <line key={a + b} className="dash" x1={POS[a][0]} y1={POS[a][1]} x2={POS[b][0]} y2={POS[b][1]} stroke="#d84e55" strokeOpacity=".45" />)}
              {Object.entries(POS).map(([n, p]) => <g key={n}><circle cx={p[0]} cy={p[1]} r="4" fill="#1f9d55"><animate attributeName="r" values="3;8;3" dur="2.4s" repeatCount="indefinite" /></circle><text x={p[0] + 6} y={p[1] - 6} fontSize="9">{n}</text></g>)}
              <g className="bus" style={{ offsetPath: `path("${busPath}")` }}><rect x="-12" y="-7" width="24" height="14" rx="4" fill="#d84e55" /></g>
            </svg>
          </div>
        </>
      )}

      {sel && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-end md:items-center justify-center md:p-6 fade" onClick={() => setSel(null)}>
          <div className="modal-in bg-white w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-t-3xl md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-white border-b px-5 py-3 flex items-center gap-3">
              <div className="flex-1">
                <b className="text-lg">{sel.L[0].f} → {sel.L[sel.L.length - 1].t}</b>
                <div className="text-xs text-gray-500">{sel.tr ? `TransitLink · ${sel.tr} transfer(s) · seats on every bus lock together` : `${cur.op} · ${cur.type} · ${M(cur.d)}`}</div>
              </div>
              <button onClick={() => setSel(null)} className="text-2xl w-10 h-10 rounded-full hover:bg-gray-100">✕</button>
            </div>
            <div className="p-5 grid md:grid-cols-[1fr_300px] gap-6">
              <div>
                {sel.tr > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {sel.L.map((g, i) => <button key={g.id} onClick={() => setLeg(i)} className={"px-3 py-1 rounded-full border text-sm " + (i === leg ? "bg-brand text-white" : mine(g).length === pax ? "bg-green-100" : "")}>{g.f}→{g.t} · {g.type} {mine(g).length === pax ? "✓" : ""}</button>)}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-xs mb-3">
                  <span className="flex items-center gap-1"><i className="w-4 h-4 rounded border bg-white inline-block" /> Available</span>
                  <span className="flex items-center gap-1"><i className="w-4 h-4 rounded bg-green-500 inline-block" /> Selected</span>
                  <span className="flex items-center gap-1"><i className="w-4 h-4 rounded bg-red-100 inline-block" /> Booked</span>
                  <span className="flex items-center gap-1"><i className="w-4 h-4 rounded bg-pink-200 inline-block" /> Ladies</span>
                  <span className="flex items-center gap-1"><i className="w-4 h-4 rounded ring-2 ring-yellow-400 inline-block" /> Recommended</span>
                  <label className="ml-auto">Prefer <select value={pref} onChange={(e) => setPref(e.target.value)} className="border rounded p-1"><option value="window">Window</option><option value="aisle">Aisle</option></select></label>
                </div>
                <SeatMatrix tripId={cur.id} type={cur.type} booked={booked} selected={mine(cur)} onPick={pick} women={women} pref={pref} deck="" />
                <div id="passenger-section" className="mt-4 scroll-mt-20"><Passengers list={pl} setList={setPlist} contact={contact} setContact={setContact} touched={touched} /></div>
                <div className="mt-4 space-y-2">
                  <Boarding sel={sel} boards={boards} setBoards={setBoards} pos={pos} setPos={setPos} boardOf={boardOf} minsUntil={minsUntil} />
                  <Budget sel={sel} base={base} pax={pax} cheapest={cheapest} />
                  <Luggage sel={sel} pax={pax} onChange={setLug} />
                </div>
              </div>
              <div className="md:sticky md:top-20 self-start bg-gray-50 border rounded-2xl p-4 space-y-3">
                <h3 className="font-bold">Booking summary</h3>
                <label className="text-sm block">Passengers
                  <div className="flex gap-1 mt-1">{[1, 2, 3, 4].map((n) => <button key={n} onClick={() => changePax(n)} className={"w-9 h-9 rounded-full border " + (pax === n ? "bg-brand text-white" : "bg-white")}>{n}</button>)}</div>
                </label>
                {sel.L.map((g) => (
                  <div key={g.id} className="text-sm border-b pb-2">
                    <b>{g.f} → {g.t}</b> <span className="text-gray-500">{g.type}</span>
                    <div>{mine(g).length ? mine(g).map((s) => <span key={s} className="inline-block bg-green-100 text-green-800 rounded px-2 mr-1 mt-1">{s}</span>) : <span className="text-gray-400">Select {pax} seat(s)</span>}</div>
                    <div className="text-xs text-gray-500">₹{mine(g).reduce((b, s) => b + perSeat(g, s), 0)}</div>
                  </div>
                ))}
                <label className="block text-sm"><input type="checkbox" checked={ins} onChange={(e) => setIns(e.target.checked)} /> Travel insurance +₹19 / seat</label>
                <label className="block text-sm"><input type="checkbox" checked={promo} onChange={(e) => setPromo(e.target.checked)} /> Promo TRANSIT10 (−10%)</label>
                {lug.fee > 0 && <div className="text-sm flex justify-between"><span>Extra luggage</span><b>₹{lug.fee}</b></div>}
                <div className="flex justify-between items-end"><span className="text-sm text-gray-500">Total</span><b className="text-2xl">₹{total}</b></div>
                <button disabled={!ready} onClick={pay} className="w-full shine text-white font-bold rounded-full py-3 disabled:opacity-40 disabled:animate-none hover:scale-[1.03] transition">{ready ? "Lock seats & pay" : `Select ${pax} seat(s) on each bus`}</button>
                {msg && <div className="text-sm text-red-600">{msg}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
