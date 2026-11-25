import { isSleeper, seatsFor, seatStatus } from "../utils";

// Sleeper bus -> two decks (lower / upper), 2+1 berths.  Seater bus -> one deck, 2+2 seats.
// selected = array of chosen seats
export default function SeatMatrix({ tripId, type, booked, selected, onPick, women, pref, deck }) {
  const sl = isSleeper(type);
  const draw = (list, d) =>
    list.flatMap((s, i) => {
      const col = i % (sl ? 3 : 4);
      const win = sl ? col !== 1 : col === 0 || col === 3;
      const c = seatStatus(booked, tripId, s, type);
      const on = selected.includes(s);
      const rec = selected.length === 0 && (women ? c === "f" : !c && (pref === "aisle" ? !win : win) && (!deck || !sl || d === deck));
      const cls = c === "b" ? "bg-red-50 text-red-300 cursor-not-allowed line-through" : on ? "bg-green-500 text-white scale-110 font-bold shadow-lg" : c === "f" ? "bg-pink-200 hover:scale-110" : "bg-white hover:bg-green-100 hover:scale-110 hover:shadow";
      const btn = (
        <button key={s} disabled={c === "b"} onClick={() => onPick(s)}
          className={`${sl ? "h-14 border-t-4 border-t-gray-400" : "h-10"} rounded-lg border text-xs transition ${cls} ${rec ? "ring-2 ring-yellow-400 animate-pulse" : ""}`}>{s}</button>
      );
      return col === 1 ? [btn, <span key={s + "g"} />] : [btn];
    });

  const all = seatsFor(type);
  return (
    <div>
      <div className="text-xs text-gray-500 mb-2">{type} · {all.length} {sl ? "berths · 2+1 sleeper layout" : "seats · 2+2 seater layout"}</div>
      {sl ? (
        <div className="flex flex-wrap gap-6">
          {["L", "U"].map((d) => (
            <div key={d} className="flex-1 min-w-[190px] bg-gray-50 rounded-2xl p-3 border">
              <h3 className="font-bold mb-2">{d === "L" ? "Lower" : "Upper"} deck</h3>
              <div className="grid grid-cols-4 gap-1.5">{draw(all.filter((s) => s[0] === d), d)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-xs bg-gray-50 rounded-2xl p-3 border">
          <div className="text-right text-xl mb-1">🛞 <span className="text-xs text-gray-500">Driver</span></div>
          <div className="grid grid-cols-5 gap-1.5">{draw(all, "L")}</div>
        </div>
      )}
    </div>
  );
}
