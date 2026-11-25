import { OPS } from "../utils";

export default function Safety() {
  return (
    <div className="border rounded-2xl p-4 my-3 up">
      <h2 className="font-bold text-lg">Travel Safety Score (transparent)</h2>
      {Object.entries(OPS).map(([n, [ot, cn, am, rt]]) => {
        const sc = Math.round(0.4 * ot + 0.2 * (100 - 10 * cn) + 0.2 * (rt / 5) * 100 + 0.2 * (am / 4) * 100);
        return (
          <div key={n} className="my-3">
            <b>{n}</b> <span className="text-xs bg-green-600 text-white rounded-full px-2">{sc}/100</span>
            <div className="h-2 rounded bg-gray-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-brand to-green-500 transition-all duration-1000" style={{ width: sc + "%" }} /></div>
            <div className="text-xs text-gray-500">on-time {ot}% · cancellations {cn}% · amenities {am}/4 (CCTV, GPS, exits, SOS) · rating {rt}</div>
          </div>
        );
      })}
    </div>
  );
}
