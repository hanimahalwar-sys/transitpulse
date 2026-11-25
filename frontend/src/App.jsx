import { useCallback, useEffect, useState } from "react";
import { api, uid } from "./api";
import Plan from "./components/Plan";
import Trips from "./components/Trips";
import Safety from "./components/Safety";
import Hub from "./components/Hub";
import Sos from "./components/Sos";
import AdminLogin from "./components/AdminLogin";
import Admin from "./components/Admin";
import LostFound from "./components/LostFound";

// offline fallback so search works even if backend is down
const BASE = [["A1","Chartered Speedlink","Indore","Bhopal",360,240,450],["A2","Hans Travels","Indore","Bhopal",1320,270,520],["A3","Verma Travels","Indore","Ahmedabad",1230,480,780],["A4","Zingbus","Indore","Pune",1080,660,1150],["A5","MSRTC","Bhopal","Nagpur",660,360,480],["A6","Hans Travels","Bhopal","Nagpur",1380,380,560],["A7","Zingbus","Ahmedabad","Pune",420,540,900],["A8","AICTSL","Pune","Nagpur",1140,600,950]]
  .map((a) => ({ id: a[0], op: a[1], f: a[2], t: a[3], dep: a[4], dur: a[5], fare: a[6], type: "AC Seater" }));
const LOCAL = [...BASE, ...BASE.map((x) => ({ ...x, id: "R" + x.id, f: x.t, t: x.f, dep: (x.dep + 180) % 1440 }))];

const TABS = [["plan", "Bus tickets"], ["trips", "Bookings & Wallet"], ["safety", "Safety score"], ["hub", "Operator Hub"], ["sos", "Help / SOS"], ["lost", "Lost & Found"], ["admin", "Admin"]];

export default function App() {
  const [tab, setTab] = useState("plan");
  const [route, setRoute] = useState({ f: "", t: "" });
  const [trips, setTrips] = useState([]);
  const [booked, setBooked] = useState(new Set());
  const [bookings, setBookings] = useState([]);
  const [wallet, setWallet] = useState([]);
  const [err, setErr] = useState("");
  const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem("tp_token"));

  const reload = useCallback(async () => {
    try {
      const [t, b, k, w] = await Promise.all([
        api.get("/trips"), api.get("/booked"),
        api.get("/bookings", { params: { userId: uid } }), api.get("/wallet", { params: { userId: uid } }),
      ]);
      setTrips(t.data.map((x) => ({ id: x.id, op: x.operator, f: x.src, t: x.dest, dep: x.depMin, dur: x.durMin, fare: x.fare, type: x.busType || "Non-AC Seater" })));
      setBooked(new Set(b.data)); setBookings(k.data); setWallet(w.data); setErr("");
    } catch (e) {
      setTrips(LOCAL);
      setErr("Backend not reachable on http://localhost:8080 - start Spring Boot (gradlew bootRun) and XAMPP MySQL.");
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const logout = useCallback(() => { localStorage.removeItem("tp_token"); setIsAdmin(false); }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <nav className="sticky top-2 z-30 flex flex-wrap items-center gap-1 bg-white/90 backdrop-blur border rounded-2xl px-4 py-2 shadow-md">
        <b className="text-xl text-brand mr-auto flex items-center gap-2"><span className="inline-block floaty">🚌</span>transit<span className="text-gray-800">pulse</span></b>
        {TABS.map(([k, n]) => (
          <button key={k} onClick={() => setTab(k)}
            className={"px-3 py-2 rounded-xl text-sm transition " + (tab === k ? "bg-red-50 text-brand font-semibold" : "hover:bg-gray-100")}>{n}</button>
        ))}
      </nav>
      <div className="text-xs mt-2 text-gray-500">{err ? <span className="text-red-600">{err}</span> : <span><span className="text-green-600">●</span> MySQL connected via Spring Boot</span>}</div>
      {tab === "plan" && <Plan {...{ trips, booked, reload, route, setRoute }} goTrips={() => setTab("trips")} />}
      {tab === "trips" && <Trips {...{ bookings, wallet, trips, reload, setRoute }} goPlan={() => setTab("plan")} />}
      {tab === "safety" && <Safety />}
      {tab === "hub" && <Hub {...{ trips, booked, bookings }} />}
      {tab === "sos" && <Sos route={route} />}
      {tab === "lost" && <LostFound />}
      {tab === "admin" && (isAdmin ? <Admin onLogout={logout} reloadPublic={reload} /> : <AdminLogin onLogin={() => setIsAdmin(true)} />)}
    </div>
  );
}
