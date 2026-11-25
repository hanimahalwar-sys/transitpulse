import { useEffect, useState } from "react";
import { M, H } from "../utils";
import { pointsFor, recommend, walkInfo } from "../boarding";
import { checkLuggage, ITEMS } from "../luggage";

const Box = ({ title, open, children }) => (
  <details open={open} className="bg-white border rounded-2xl p-3">
    <summary className="cursor-pointer font-semibold select-none">{title}</summary>
    <div className="mt-3 text-sm">{children}</div>
  </details>
);

// ---------- Flexible Boarding Point Finder ----------
export function Boarding({ sel, boards, setBoards, pos, setPos, boardOf, minsUntil }) {
  const [err, setErr] = useState("");
  const locate = () => {
    if (!navigator.geolocation) return setErr("Location is not supported in this browser");
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setErr(""); },
      () => setErr("Location permission denied - showing points without distance")
    );
  };
  return (
    <Box title="📍 Flexible boarding point" open>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <button onClick={locate} className="px-3 py-1 rounded-full border hover:bg-red-50">📍 Use my location</button>
        {pos && <span className="text-green-700">Location detected</span>}
        {err && <span className="text-red-600">{err}</span>}
      </div>
      {sel.L.map((g) => {
        const rec = recommend(g.f, pos, minsUntil(g)), val = boardOf(g);
        return (
          <div key={g.id} className="mb-3">
            <b>{g.f}</b> <span className="text-gray-500">· bus leaves main stand {M(g.d)}</span>
            <div className="text-xs text-gray-500">Suggested: <b>{rec.name}</b> – {rec.why}</div>
            <div className="mt-1 space-y-1">
              {pointsFor(g.f).map((p) => {
                const w = pos ? walkInfo(pos, p) : null;
                return (
                  <label key={p.name} className={"flex flex-wrap items-center gap-2 border rounded-xl px-3 py-2 cursor-pointer " + (val === p.name ? "border-brand bg-red-50" : "")}>
                    <input type="radio" name={"bp" + g.id} checked={val === p.name} onChange={() => setBoards({ ...boards, [g.id]: p.name })} />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-gray-500">pickup {M(g.d + p.off)}</span>
                    {w && <span className="text-gray-500">· {w.min} min walk ({w.km} km)</span>}
                    {p.name === rec.name && <span className="text-xs bg-green-600 text-white rounded-full px-2">Recommended</span>}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-gray-400">Sample boarding points; coordinates are approximate.</p>
    </Box>
  );
}

// ---------- Travel Budget Optimizer ----------
export function Budget({ sel, base, pax, cheapest }) {
  const [meal, setMeal] = useState(150);
  const [stay, setStay] = useState(false);
  const [nights, setNights] = useState(1);
  const [rate, setRate] = useState(900);
  const [local, setLocal] = useState(200);
  const meals = Math.max(1, Math.round(sel.dur / 300));          // about one meal per 5 hours
  const food = meals * pax * meal;
  const hotel = stay ? nights * rate * Math.ceil(pax / 2) : 0;   // 2 guests per room
  const total = base + food + hotel + local;
  const save = cheapest && sel.fare > cheapest ? (sel.fare - cheapest) * pax : 0;
  const Row = ({ l, v }) => <div className="flex justify-between"><span className="text-gray-600">{l}</span><b>₹{v}</b></div>;
  return (
    <Box title="💰 Travel budget optimizer">
      <div className="flex flex-wrap gap-3 mb-2">
        <label>Meals <select value={meal} onChange={(e) => setMeal(+e.target.value)} className="border rounded p-1"><option value="100">Budget ₹100</option><option value="150">Standard ₹150</option><option value="250">Comfort ₹250</option></select></label>
        <label>Local transport ₹ <input type="number" min="0" value={local} onChange={(e) => setLocal(+e.target.value || 0)} className="border rounded p-1 w-20" /></label>
        <label><input type="checkbox" checked={stay} onChange={(e) => setStay(e.target.checked)} /> Add stay</label>
        {stay && <><label>Nights <input type="number" min="1" max="7" value={nights} onChange={(e) => setNights(Math.max(1, +e.target.value || 1))} className="border rounded p-1 w-14" /></label>
          <label>₹/night <input type="number" min="0" value={rate} onChange={(e) => setRate(+e.target.value || 0)} className="border rounded p-1 w-20" /></label></>}
      </div>
      <Row l={`Bus fare (${pax} seat(s) selected)`} v={base} />
      <Row l={`Meals (${meals} per person × ${pax})`} v={food} />
      {stay && <Row l={`Stay (${nights} night(s), ${Math.ceil(pax / 2)} room(s))`} v={hotel} />}
      <Row l="Local transport" v={local} />
      <div className="flex justify-between border-t mt-2 pt-2"><b>Estimated total trip cost</b><b className="text-brand text-lg">₹{total}</b></div>
      <div className="text-xs text-gray-500 mt-1">≈ ₹{Math.round(total / pax)} per person · journey {H(sel.dur)}</div>
      {save > 0 && <div className="mt-2 bg-green-50 text-green-800 rounded-lg p-2">💡 A cheaper option on this route exists - you could save about ₹{save} on bus fare.</div>}
      <p className="text-xs text-gray-400 mt-1">Meal, stay and transport amounts are estimates you can edit.</p>
    </Box>
  );
}

// ---------- Luggage Compatibility Checker ----------
export function Luggage({ sel, pax, onChange }) {
  const [bags, setBags] = useState(1);
  const [kg, setKg] = useState(15);
  const [item, setItem] = useState("none");
  const res = sel.L.map((g) => ({ g, r: checkLuggage(g.type, { bags, kg, pax, item }) }));
  const fee = res.reduce((a, x) => a + x.r.fee, 0);
  const ok = res.every((x) => x.r.status !== "no");
  useEffect(() => { onChange({ fee, ok }); }, [fee, ok]); // eslint-disable-line
  return (
    <Box title="🧳 Luggage compatibility check">
      <div className="flex flex-wrap gap-3 mb-2">
        <label>Bags <input type="number" min="0" max="10" value={bags} onChange={(e) => setBags(+e.target.value || 0)} className="border rounded p-1 w-16" /></label>
        <label>Total weight kg <input type="number" min="0" max="200" value={kg} onChange={(e) => setKg(+e.target.value || 0)} className="border rounded p-1 w-20" /></label>
        <label>Special item <select value={item} onChange={(e) => setItem(e.target.value)} className="border rounded p-1">{Object.entries(ITEMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
      </div>
      {res.map(({ g, r }) => (
        <div key={g.id} className={"rounded-lg p-2 mb-1 " + (r.status === "ok" ? "bg-green-50" : r.status === "fee" ? "bg-yellow-50" : "bg-red-50")}>
          <b>{r.status === "ok" ? "✅" : r.status === "fee" ? "⚠️" : "⛔"} {g.f} → {g.t}</b> <span className="text-gray-500">{g.type}</span>
          {r.msgs.map((m, i) => <div key={i} className="text-xs">{m}</div>)}
        </div>
      ))}
      {fee > 0 && <div className="text-xs">Extra luggage fee <b>₹{fee}</b> is added to your total.</div>}
      {!ok && <div className="text-xs text-red-600">Booking is blocked until luggage fits the rules - reduce weight or choose another bus type.</div>}
      <p className="text-xs text-gray-400">Sample platform policy; operators may differ.</p>
    </Box>
  );
}

// ---------- Passenger details + contact (validated) ----------
export function validateBooking(list, contact) {
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (!p.name || p.name.trim().length < 2) return `Enter the name of passenger ${i + 1}`;
    const a = Number(p.age);
    if (!Number.isInteger(a) || a < 1 || a > 120) return `Enter a valid age (1-120) for passenger ${i + 1}`;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((contact.email || "").trim())) return "Enter a valid email address";
  if (!/^[6-9]\d{9}$/.test((contact.phone || "").trim())) return "Enter a valid 10-digit mobile number";
  return "";
}

export function Passengers({ list, setList, contact, setContact, touched }) {
  const set = (i, k, v) => setList(list.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const red = (bad) => (touched && bad ? " border-red-500 bg-red-50" : "");
  const emailBad = !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((contact.email || "").trim());
  const phoneBad = !/^[6-9]\d{9}$/.test((contact.phone || "").trim());
  return (
    <Box title="👤 Passenger details" open>
      {list.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_76px_104px] gap-2 mb-2">
          <input id={`p-name-${i}`} placeholder={`Passenger ${i + 1} full name`} value={p.name} onChange={(e) => set(i, "name", e.target.value)} className={"border rounded-xl p-2" + red(!p.name || p.name.trim().length < 2)} />
          <input type="number" min="1" max="120" placeholder="Age" value={p.age} onChange={(e) => set(i, "age", e.target.value)} className={"border rounded-xl p-2" + red(!(Number(p.age) >= 1 && Number(p.age) <= 120))} />
          <select value={p.gender} onChange={(e) => set(i, "gender", e.target.value)} className="border rounded-xl p-2 bg-white"><option>Male</option><option>Female</option><option>Other</option></select>
        </div>
      ))}
      <div className="grid md:grid-cols-2 gap-2 mt-3">
        <input type="email" placeholder="Email address" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className={"border rounded-xl p-2" + red(emailBad)} />
        <div className={"flex items-center border rounded-xl overflow-hidden" + red(phoneBad)}>
          <span className="px-3 text-gray-500 bg-gray-100 self-stretch flex items-center">+91</span>
          <input inputMode="numeric" placeholder="10-digit mobile number" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} className="p-2 outline-none bg-transparent flex-1 min-w-0" />
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-2">Contact details are saved with your booking and shown on the ticket.</p>
    </Box>
  );
}
