import { useCallback, useEffect, useState } from "react";
import { api, uid } from "../api";
import { OPS } from "../utils";

const blank = { type: "LOST", item: "", description: "", route: "", operator: "", tripId: "", contact: "" };
const words = (s) => (s || "").toLowerCase().split(/\W+/).filter((w) => w.length > 2);

export default function LostFound() {
  const [form, setForm] = useState(blank);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [tf, setTf] = useState("");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    try { const r = await api.get("/lostfound", { params: { q, type: tf } }); setItems(r.data); setMsg(""); }
    catch { setMsg("Backend not reachable (port 8081)"); }
  }, [q, tf]);
  useEffect(() => { load(); }, [load]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.item.trim()) return setMsg("Item name is required");
    try { await api.post("/lostfound", { ...form, userId: uid }); setMsg("✔ Reported successfully"); setForm({ ...blank, type: form.type }); load(); }
    catch (e) { setMsg("✖ " + (e.response?.data?.message || "Could not save")); }
  }
  const resolve = async (id) => {
    try { await api.post(`/lostfound/${id}/resolve`, null, { params: { userId: uid } }); load(); }
    catch (e) { setMsg("✖ " + (e.response?.data?.message || "Failed")); }
  };
  const matches = items.filter((i) => i.type === "LOST" && i.userId === uid && i.status === "OPEN").map((l) => ({
    l, f: items.filter((i) => i.type === "FOUND" && i.status === "OPEN" && ((l.operator && i.operator === l.operator) || (l.tripId && i.tripId === l.tripId)) && words(l.item).some((w) => words(i.item + " " + i.description).includes(w))),
  })).filter((m) => m.f.length);

  return (
    <>
      <div className="bg-white border rounded-2xl p-5 my-3 up">
        <h2 className="font-bold text-xl">🔎 Lost &amp; Found</h2>
        <p className="text-sm text-gray-500">Report something you lost on a bus, or something you found. Matches are suggested automatically.</p>
        <div className="flex gap-2 my-3">
          {[["LOST", "I lost an item"], ["FOUND", "I found an item"]].map(([k, n]) => <button key={k} onClick={() => setForm({ ...form, type: k })} className={"px-4 py-2 rounded-full border " + (form.type === k ? "bg-brand text-white" : "bg-white")}>{n}</button>)}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <input placeholder="Item (e.g. black backpack)" value={form.item} onChange={set("item")} className="border rounded-xl p-2" />
          <input placeholder="Route (e.g. Indore → Bhopal)" value={form.route} onChange={set("route")} className="border rounded-xl p-2" />
          <select value={form.operator} onChange={set("operator")} className="border rounded-xl p-2"><option value="">Operator (optional)</option>{Object.keys(OPS).map((o) => <option key={o}>{o}</option>)}</select>
          <input placeholder="Trip ID (optional, e.g. T0001)" value={form.tripId} onChange={set("tripId")} className="border rounded-xl p-2" />
          <input placeholder="Contact phone / email" value={form.contact} onChange={set("contact")} className="border rounded-xl p-2" />
          <input placeholder="Colour, brand, seat number, marks..." value={form.description} onChange={set("description")} className="border rounded-xl p-2" />
        </div>
        <button onClick={submit} className="mt-3 shine text-white font-bold rounded-full px-6 py-2">Submit report</button>
        {msg && <span className="ml-3 text-sm">{msg}</span>}
      </div>

      {matches.map((m) => (
        <div key={m.l.id} className="bg-green-50 border border-green-300 rounded-2xl p-4 my-3 up">
          <b>🎯 Possible match for your lost “{m.l.item}”</b>
          {m.f.map((f) => <div key={f.id} className="text-sm mt-1">Found: <b>{f.item}</b> ({f.description || "no details"}) · {f.operator} {f.route} · contact <b>{f.contact || "via operator"}</b></div>)}
        </div>
      ))}

      <div className="flex flex-wrap gap-2 items-center my-3">
        <input placeholder="Search items, route, operator..." value={q} onChange={(e) => setQ(e.target.value)} className="border rounded-full px-4 py-2 flex-1 min-w-[220px]" />
        {[["", "All"], ["LOST", "Lost"], ["FOUND", "Found"]].map(([k, n]) => <button key={k} onClick={() => setTf(k)} className={"px-3 py-1 rounded-full border " + (tf === k ? "bg-brand text-white" : "bg-white")}>{n}</button>)}
      </div>
      {items.map((i, n) => (
        <div key={i.id} style={{ animationDelay: Math.min(n, 8) * 50 + "ms" }} className={"up bg-white border rounded-2xl p-4 my-2 flex flex-wrap justify-between gap-2 " + (i.status === "RESOLVED" ? "opacity-60" : "")}>
          <div>
            <span className={"text-xs rounded-full px-2 py-0.5 text-white " + (i.type === "LOST" ? "bg-red-500" : "bg-green-600")}>{i.type}</span>{" "}
            <b>{i.item}</b> <span className="text-xs text-gray-500">{i.status}</span>
            <div className="text-sm text-gray-600">{i.description}</div>
            <div className="text-xs text-gray-500">{[i.route, i.operator, i.tripId].filter(Boolean).join(" · ")}</div>
            {i.type === "FOUND" && i.contact && <div className="text-xs">Contact: <b>{i.contact}</b></div>}
          </div>
          {i.status === "OPEN" && i.userId === uid && <button onClick={() => resolve(i.id)} className="self-center border rounded-full px-3 py-1 text-sm hover:bg-green-50">Mark resolved</button>}
        </div>
      ))}
      {!items.length && <div className="bg-white border rounded-2xl p-6 text-center text-gray-500">No reports found.</div>}
    </>
  );
}
