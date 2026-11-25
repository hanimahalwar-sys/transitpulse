import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api";
import { plan, M, hash } from "../utils";
import { pointsFor } from "../boarding";
import { downloadPass, listPasses, savePass } from "../offline";

// one row per bus: all seats of that bus joined
const group = (legs) => {
  const m = {};
  [...legs].sort((x, y) => x.dep - y.dep).forEach((l) => { const g = (m[l.tripId] ??= { ...l, seats: [], who: [] }); g.seats.push(l.seat); g.who.push(l.passengerName ? `${l.passengerName} (${l.passengerAge})` : ""); });
  return Object.values(m);
};
const toPass = (b) => ({
  pnr: b.pnr, status: b.status, total: b.total, contact: { email: b.email, phone: b.phone },
  passengers: [...new Set(b.legs.filter((l) => l.passengerName).map((l) => `${l.passengerName} (${l.passengerAge})`))],
  legs: group(b.legs).map((l) => ({ f: l.src, t: l.dest, op: l.operator, type: l.busType, dep: l.dep, seats: l.seats, boarding: l.boardingPoint || "" })),
});

export default function Trips({ bookings, wallet, trips, reload, setRoute, goPlan }) {
  const [share, setShare] = useState({});
  const [saved, setSaved] = useState(listPasses());
  const bal = wallet.reduce((a, w) => a + w.amount, 0);
  const delay = async (pnr) => { await api.post(`/bookings/${pnr}/delay`); reload(); };

  // keep an offline copy of every booking on this device
  useEffect(() => {
    if (!bookings.length) return;
    const old = Object.fromEntries(listPasses().map((p) => [p.pnr, p]));
    bookings.forEach((b) => savePass({ ...old[b.pnr], ...toPass(b) }));
    setSaved(listPasses());
  }, [bookings]);

  const rescue = (b) => {
    if (!/DELAY|PROTECT/.test(b.status)) return null;
    const g = group(b.legs), a = g[0], z = g[g.length - 1];
    const alts = plan(trips, a.src, z.dest).filter((x) => x.L[0].id !== a.tripId).slice(0, 2);
    return (
      <div className="border border-brand rounded-xl p-3 mt-3">
        <h3 className="font-bold">🛟 Journey Rescue Mode</h3>
        <div className="text-xs text-gray-600">Your bus is delayed. Alternative buses from {a.src}:</div>
        {alts.map((x, i) => (
          <div key={i} className="text-sm py-1">{x.L.map((l) => l.op + " " + M(l.d)).join(" → ")} · ₹{x.fare}{" "}
            <button className="ml-2 border rounded-full px-3" onClick={() => { setRoute({ f: a.src, t: z.dest, auto: true }); goPlan(); }}>Rebook</button></div>
        ))}
        {!alts.length && <div className="text-sm">No alternatives right now.</div>}
        <div className="text-xs text-gray-600 mt-2">📍 Nearby boarding points in {a.src}: {pointsFor(a.src).map((p) => p.name).join(" · ")}</div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-white border rounded-2xl p-4 my-3 up">
        <h2 className="font-bold text-lg">Digital Travel Wallet</h2>
        <b className="text-3xl">₹{bal}</b> <span className="text-xs text-gray-500">credits, promo &amp; connection-protection refunds</span>
        {wallet.map((w) => <div key={w.id} className="text-sm mt-1"><span className="text-xs bg-green-600 text-white rounded-full px-2">{w.type}</span> ₹{w.amount} <span className="text-gray-500">{w.refPnr}</span></div>)}
      </div>
      {bookings.length ? bookings.map((b) => (
        <div key={b.pnr} className="bg-white border rounded-2xl p-4 my-3 up">
          <b>PNR {b.pnr}</b> · ₹{b.total} · <span className="text-green-600">{b.status}</span>
          {b.email && <div className="text-xs text-gray-500">📧 {b.email} · 📞 +91 {b.phone}</div>}
          <div className="flex flex-wrap gap-4 items-center border-2 border-dashed border-brand rounded-2xl p-3 my-2">
            <QRCodeSVG value={`TP|${b.pnr}|${hash(b.pnr + "salt")}`} size={110} />
            <div>{group(b.legs).map((l) => (
              <div key={l.tripId} className="text-sm"><b>{l.src}→{l.dest}</b> {M(l.dep)} · {l.operator} {l.busType ? "(" + l.busType + ")" : ""} · seat{l.seats.length > 1 ? "s" : ""} <b>{l.seats.join(", ")}</b>{l.who.some(Boolean) ? <> · 👤 {l.who.filter(Boolean).join(", ")}</> : null}{l.boardingPoint ? <> · 📍 {l.boardingPoint}</> : null}</div>
            ))}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="border rounded-full px-3 py-1 text-sm bg-green-50" onClick={() => downloadPass({ ...(saved.find((p) => p.pnr === b.pnr) || {}), ...toPass(b) })}>📴 Download offline pass</button>
            <button className="border rounded-full px-3 py-1 text-sm" onClick={() => delay(b.pnr)}>Simulate delay (Rescue / Protection)</button>
            <button className="border rounded-full px-3 py-1 text-sm" onClick={() => setShare({ ...share, [b.pnr]: "transitpulse.app/t/" + hash(b.pnr + Date.now()).toString(36) + " (read-only, PNR masked, expires 24h)" })}>Share live trip</button>
          </div>
          <div className="text-xs text-gray-500 mt-1">{share[b.pnr]}</div>
          {rescue(b)}
        </div>
      )) : <div className="bg-white border rounded-2xl p-4 my-3">No bookings loaded - search a bus first (or backend is offline; see saved passes below).</div>}

      <details className="bg-white border rounded-2xl p-4 my-3">
        <summary className="cursor-pointer font-semibold">📴 Offline journey passes saved on this device ({saved.length})</summary>
        <p className="text-xs text-gray-500 my-2">These stay on your phone/laptop, so you can open them with no network. Download one as a single HTML file and keep it anywhere.</p>
        {saved.map((p) => (
          <div key={p.pnr} className="flex flex-wrap items-center justify-between gap-2 border-t py-2 text-sm">
            <div><b>{p.pnr}</b> · {(p.legs || []).map((l) => `${l.f}→${l.t} ${(l.seats || []).join("/")}`).join(" | ")}{p.date ? " · " + p.date : ""}</div>
            <button className="border rounded-full px-3 py-1" onClick={() => downloadPass(p)}>Download</button>
          </div>
        ))}
        {!saved.length && <div className="text-sm text-gray-500">Nothing saved yet - book a ticket and it appears here.</div>}
      </details>
    </>
  );
}
