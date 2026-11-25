import { useState } from "react";
import { FAC } from "../utils";

export default function Sos({ route }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-2xl p-4 my-3 text-center up">
      <h2 className="font-bold text-lg">Emergency Travel Assistance</h2>
      <button onClick={() => setOpen(true)} className="my-4 w-24 h-24 rounded-full bg-brand text-white text-2xl font-extrabold animate-pulse">SOS</button>
      {open ? (
        <div className="text-left max-w-sm mx-auto text-sm space-y-1">
          <div><b className="text-red-600">112</b> National emergency</div><div><b>108</b> Ambulance</div><div><b>100</b> Police</div><div><b>1033</b> NHAI highway helpline</div>
          <div>🏥 {(FAC[route.f] || FAC.default)[0]} · 👮 {(FAC[route.f] || FAC.default)[1]} <span className="text-gray-500">(sample directory near {route.f})</span></div>
        </div>
      ) : <p className="text-gray-500 text-sm">Tap for helplines and nearest listed facilities.</p>}
    </div>
  );
}
