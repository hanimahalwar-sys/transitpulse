// SAMPLE platform policy (real operators may differ - always confirm with the operator)
export const RULES = {
  "AC Sleeper": { free: 15, perKg: 12, max: 30, bags: 2, note: "Berth storage is limited" },
  "Non-AC Sleeper": { free: 15, perKg: 10, max: 30, bags: 2, note: "Berth storage is limited" },
  "AC Seater": { free: 20, perKg: 10, max: 35, bags: 3, note: "Under-seat + dicky storage" },
  "Non-AC Seater": { free: 25, perKg: 8, max: 40, bags: 3, note: "Roof / dicky storage" },
};
export const ITEMS = {
  none: { label: "No special item" },
  bicycle: { label: "Bicycle", sleeper: "no", seater: 300 },
  instrument: { label: "Large musical instrument", sleeper: 200, seater: 150 },
  box: { label: "Large cardboard box / appliance", sleeper: "no", seater: 250 },
  hazard: { label: "Gas cylinder / fireworks / flammable", sleeper: "no", seater: "no" },
  pet: { label: "Pet animal", sleeper: "no", seater: "no" },
};
export function checkLuggage(type, { bags, kg, pax, item }) {
  const r = RULES[type] || RULES["Non-AC Seater"], sl = type.includes("Sleeper");
  const msgs = []; let fee = 0, status = "ok";
  const free = r.free * pax;
  if (kg > r.max * pax) { status = "no"; msgs.push(`Over the ${r.max * pax} kg maximum for ${pax} passenger(s)`); }
  else if (kg > free) { fee += Math.round((kg - free) * r.perKg); status = "fee"; msgs.push(`${kg - free} kg over free ${free} kg → ₹${fee} extra`); }
  if (bags > r.bags * pax) { status = "no"; msgs.push(`Max ${r.bags} bags per passenger`); }
  const it = ITEMS[item];
  if (it && item !== "none") {
    const rule = sl ? it.sleeper : it.seater;
    if (rule === "no") { status = "no"; msgs.push(`${it.label} not allowed on ${type}`); }
    else { fee += rule; if (status === "ok") status = "fee"; msgs.push(`${it.label}: ₹${rule} handling fee`); }
  }
  if (status === "ok") msgs.push(`Within free allowance (${free} kg). ${r.note}.`);
  return { status, fee, msgs };
}
