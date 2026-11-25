import { useMemo, useState } from "react";
import { seatsFor, seatStatus } from "../utils";

export default function Hub({ trips, booked, bookings }) {
  const [role, setRole] = useState("Commuter");
  const token = btoa(JSON.stringify({ role: role.toUpperCase(), exp: "+1h" }));
  const rev = bookings.reduce((a, b) => a + b.total, 0);
  const rows = useMemo(() => trips.map((x) => {
    const all = seatsFor(x.type);
    const n = all.filter((s) => seatStatus(booked, x.id, s, x.type) === "b").length;
    return { ...x, lf: Math.round((n / all.length) * 100) };
  }).sort((a, b) => b.lf - a.lf).slice(0, 10), [trips, booked]);
  return (
    <>
      <div className="border rounded-2xl p-4 my-3 up">
        <h2 className="font-bold text-lg">Security: JWT + RBAC (demo)</h2>
        <label className="text-sm">Sign in as <select value={role} onChange={(e) => setRole(e.target.value)} className="border rounded p-1">{["Commuter", "Operator", "Admin"].map((r) => <option key={r}>{r}</option>)}</select></label>
        <div className="text-xs text-gray-500 break-all">Bearer eyJhbGciOiJIUzI1NiJ9.{token}.sig</div>
      </div>
      {role === "Commuter" ? (
        <div className="border rounded-2xl p-4 my-3"><b className="text-red-600">403 Forbidden</b> – analytics needs ROLE_OPERATOR or ROLE_ADMIN.</div>
      ) : (
        <div className="border rounded-2xl p-4 my-3 up">
          <h2 className="font-bold text-lg">Operator Telematics &amp; Analytics Hub</h2>
          <div className="flex gap-8 my-2"><div><b className="text-2xl">₹{rev}</b><br /><span className="text-xs text-gray-500">your revenue</span></div><div><b className="text-2xl">{trips.length}</b><br /><span className="text-xs text-gray-500">trips</span></div></div>
          <h3 className="font-bold mt-2">Top 10 busiest trips (Load Factor)</h3>
          {rows.map((x) => (
            <div key={x.id} className="my-2 text-sm">{x.id} · {x.f}→{x.t} · {x.op} · {x.type} <b>LF {x.lf}%</b>
              <div className="h-2 rounded bg-gray-100"><div className="h-full rounded bg-gradient-to-r from-brand to-green-500 transition-all duration-1000" style={{ width: x.lf + "%" }} /></div></div>
          ))}
          {role === "Admin" && <p className="text-sm mt-3"><b>Admin:</b> protection policy – min layover 30m, delay threshold 45m, action REBOOK / REFUND.</p>}
        </div>
      )}
    </>
  );
}
