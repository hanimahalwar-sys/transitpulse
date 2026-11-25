import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { M } from "../utils";

const Card = ({ children }) => <div className="border rounded-2xl p-4 my-3 up">{children}</div>;
const Stat = ({ v, l }) => <div className="flex-1 min-w-[120px] bg-red-50 rounded-xl p-3 text-center"><b className="text-2xl block">{v}</b><span className="text-xs text-gray-500">{l}</span></div>;

export default function Admin({ onLogout, reloadPublic }) {
  const [tab, setTab] = useState("dash");
  const [stats, setStats] = useState(null);
  const [bk, setBk] = useState([]);
  const [trips, setTrips] = useState([]);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ id: "", operator: "", src: "", dest: "", depMin: 360, durMin: 240, fare: 500, busType: "AC Seater" });
  const [q, setQ] = useState("");
  const [dl, setDl] = useState({ id: "", minutes: 90 });

  const load = useCallback(async () => {
    try {
      const [s, b, t] = await Promise.all([api.get("/admin/stats"), api.get("/admin/bookings"), api.get("/trips")]);
      setStats(s.data); setBk(b.data); setTrips(t.data);
    } catch (e) {
      if (e.response?.status === 401) onLogout(); else setMsg("Backend not reachable");
    }
  }, [onLogout]);
  useEffect(() => { load(); }, [load]);

  const run = async (fn, ok) => {
    try { await fn(); setMsg("✔ " + ok); await load(); reloadPublic(); }
    catch (e) { setMsg("✖ " + (e.response?.data?.message || e.message)); }
  };
  const setF = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center my-3">
        <h2 className="font-bold text-xl mr-auto">Admin Console <span className="text-xs bg-green-600 text-white rounded-full px-2">ROLE_ADMIN</span></h2>
        {[["dash", "Dashboard"], ["trips", "Trips"], ["bookings", "Bookings"], ["delay", "Delay & Protection"]].map(([k, n]) => (
          <button key={k} onClick={() => setTab(k)} className={"px-3 py-1 rounded-full border text-sm " + (tab === k ? "bg-brand text-white" : "")}>{n}</button>
        ))}
        <button onClick={onLogout} className="px-3 py-1 rounded-full border text-sm">Logout</button>
      </div>
      {msg && <div className="text-sm my-2">{msg}</div>}

      {tab === "dash" && stats && (
        <Card>
          <div className="flex flex-wrap gap-3">
            <Stat v={"₹" + stats.revenue} l="Revenue" /><Stat v={stats.bookings} l="Bookings" /><Stat v={stats.users} l="Passengers" />
            <Stat v={stats.trips} l="Trips" /><Stat v={"₹" + stats.refunds} l="Refunds paid" />
          </div>
          <h3 className="font-bold mt-4">Fleet Load Factor</h3>
          {stats.load.map((x) => (
            <div key={x.id} className="my-2 text-sm">{x.id} · {x.route} · {x.operator} · {x.type} <b>LF {x.lf}%</b> ({x.booked}/{x.cap} seats)
              <div className="h-2 rounded bg-gray-100"><div className="h-full rounded bg-gradient-to-r from-brand to-green-500 transition-all duration-1000" style={{ width: Math.min(100, x.lf) + "%" }} /></div></div>
          ))}
        </Card>
      )}

      {tab === "trips" && (
        <>
          <Card>
            <h3 className="font-bold mb-2">Add / update trip</h3>
            <div className="flex flex-wrap gap-2">
              {[["id", "Trip ID"], ["operator", "Operator"], ["src", "From"], ["dest", "To"], ["depMin", "Departure (min of day)"], ["durMin", "Duration (min)"], ["fare", "Fare ₹"]].map(([k, p]) => (
                <input key={k} placeholder={p} title={p} value={form[k]} onChange={setF(k)} className="border rounded-xl p-2 text-sm w-36" />
              ))}
              <select value={form.busType} onChange={setF("busType")} className="border rounded-xl p-2 text-sm">{["AC Sleeper", "Non-AC Sleeper", "AC Seater", "Non-AC Seater"].map((b) => <option key={b}>{b}</option>)}</select>
              <button className="bg-brand text-white rounded-full px-5" onClick={() => run(() => api.post("/admin/trips", { ...form, depMin: +form.depMin, durMin: +form.durMin, fare: +form.fare, seats: /Sleeper/.test(form.busType) ? 30 : 40 }), "Trip saved")}>Save</button>
            </div>
          </Card>
          <Card>
            <h3 className="font-bold mb-2">All trips ({trips.length}) <input placeholder="search id / city / operator / type" value={q} onChange={(e) => setQ(e.target.value)} className="border rounded-xl p-1 text-sm ml-2 w-64 font-normal" /></h3>
            <div className="overflow-x-auto"><table className="text-sm w-full">
              <thead><tr className="text-left text-gray-500"><th>ID</th><th>Operator</th><th>Route</th><th>Dep</th><th>Type</th><th>Fare</th><th></th></tr></thead>
              <tbody>{trips.filter((t) => (t.id + t.src + t.dest + t.operator + t.busType).toLowerCase().includes(q.toLowerCase())).slice(0, 50).map((t) => (
                <tr key={t.id} className="border-t"><td>{t.id}</td><td>{t.operator}</td><td>{t.src} → {t.dest}</td><td>{M(t.depMin)}</td><td>{t.busType}</td><td>₹{t.fare}</td>
                  <td><button className="text-brand mr-2" onClick={() => setForm(t)}>Edit</button><button className="text-red-600" onClick={() => run(() => api.delete("/admin/trips/" + t.id), "Trip deleted")}>Delete</button></td></tr>
              ))}</tbody></table></div>
          </Card>
        </>
      )}

      {tab === "bookings" && (
        <Card>
          <h3 className="font-bold mb-2">All bookings ({bk.length})</h3>
          {bk.map((b) => (
            <div key={b.pnr} className="border-t py-2 text-sm">
              <b>{b.pnr}</b> · user {b.userId}{b.email ? " · " + b.email + " · +91 " + b.phone : ""} · ₹{b.total} · <span className="text-green-700">{b.status}</span>
              <div className="text-gray-500">{b.legs.map((l) => `${l.src}→${l.dest} seat ${l.seat}${l.passengerName ? " - " + l.passengerName + " (" + l.passengerAge + ")" : ""}`).join(" | ")}</div>
              {!b.status.startsWith("CANCELLED") && <button className="text-red-600" onClick={() => run(() => api.post(`/admin/bookings/${b.pnr}/cancel`), "Booking cancelled, refund sent to wallet")}>Cancel &amp; refund</button>}
            </div>
          ))}
          {!bk.length && <p className="text-sm text-gray-500">No bookings yet.</p>}
        </Card>
      )}

      {tab === "delay" && (
        <Card>
          <h3 className="font-bold mb-1">Report a delay (Connection Protection)</h3>
          <p className="text-xs text-gray-500 mb-2">If delay is more than 45 minutes, every TransitLink journey on this trip is marked PROTECTED and the delayed leg is refunded to the wallet.</p>
          <input placeholder="Trip ID e.g. T0001" className="border rounded-xl p-2 mr-2 w-40" value={dl.id} onChange={(e) => setDl({ ...dl, id: e.target.value })} />
          <input type="number" className="border rounded-xl p-2 w-28 mr-2" value={dl.minutes} onChange={(e) => setDl({ ...dl, minutes: e.target.value })} /> minutes
          <button disabled={!dl.id} className="ml-3 bg-brand text-white rounded-full px-5 py-2 disabled:opacity-40" onClick={() => run(() => api.post(`/admin/trips/${dl.id}/delay`, null, { params: { minutes: dl.minutes } }), "Delay reported")}>Report delay</button>
        </Card>
      )}
    </>
  );
}
