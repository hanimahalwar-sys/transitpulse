import { useState } from "react";
import { api } from "../api";

export default function AdminLogin({ onLogin }) {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const r = await api.post("/auth/login", { username, password });
      localStorage.setItem("tp_token", r.data.token);
      onLogin();
    } catch (e2) {
      setErr(e2.response ? "Invalid username or password" : "Backend not reachable");
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10 border rounded-2xl p-6 shadow-lg up">
      <h2 className="text-xl font-bold mb-1">Admin Login</h2>
      <p className="text-xs text-gray-500 mb-4">Platform administrators and fleet operators only (JWT secured).</p>
      <form onSubmit={submit} className="space-y-3">
        <input className="border rounded-xl p-2 w-full" placeholder="Username" value={username} onChange={(e) => setU(e.target.value)} />
        <input className="border rounded-xl p-2 w-full" type="password" placeholder="Password" value={password} onChange={(e) => setP(e.target.value)} />
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="w-full bg-brand text-white font-bold rounded-full py-2 hover:scale-105 transition">Login</button>
      </form>
    </div>
  );
}
