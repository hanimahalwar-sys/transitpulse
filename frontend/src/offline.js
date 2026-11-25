import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { M, hash } from "./utils";

const KEY = "tp_passes";
export const listPasses = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
export function savePass(p) {
  const all = listPasses().filter((x) => x.pnr !== p.pnr);
  all.unshift(p);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 30)));
}
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// one self-contained HTML file: works with zero internet
export function passHtml(p) {
  const qr = renderToStaticMarkup(createElement(QRCodeSVG, { value: `TP|${p.pnr}|${hash(p.pnr + "salt")}`, size: 150 }));
  const rows = (p.legs || []).map((l) => `<tr><td><b>${esc(l.f)} → ${esc(l.t)}</b><br>${esc(l.op)} · ${esc(l.type)}</td><td>${M(l.dep)}</td><td><b>${esc((l.seats || []).join(", "))}</b></td><td>${esc(l.boarding || "-")}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline Pass ${esc(p.pnr)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:560px;margin:16px auto;padding:0 12px;color:#1c1c28}.c{border:2px dashed #d84e55;border-radius:16px;padding:16px;margin:12px 0}h1{color:#d84e55;margin:0}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #eee;text-align:left;font-size:14px}li{margin:4px 0}.s{color:#1f9d55;font-weight:700}</style></head><body>
<h1>TransitPulse · Offline Journey Pass</h1><div class="c"><div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">${qr}<div><div>Booking ID / PNR</div><h2 style="margin:0">${esc(p.pnr)}</h2><div class="s">${esc(p.status || "CONFIRMED")}</div><div>${p.date ? "Date: " + esc(p.date) + "<br>" : ""}${p.passengers && p.passengers.length ? "Passengers: " + esc(p.passengers.join(", ")) + "<br>" : ""}${p.contact && p.contact.phone ? "Contact: +91 " + esc(p.contact.phone) + "<br>" : ""}Total paid: ₹${esc(p.total)}</div></div></div></div>
<table><tr><th>Route</th><th>Departs</th><th>Seat(s)</th><th>Boarding point</th></tr>${rows}</table>
<div class="c"><b>Boarding instructions</b><ul><li>Reach your boarding point 20 minutes early.</li><li>Carry a valid photo ID.</li><li>Show this QR code or the PNR to the conductor - it works without internet.</li><li>Keep your luggage within the free limit for your bus type.</li><li>Emergency: 112 · Ambulance 108 · Police 100 · NHAI highway helpline 1033</li></ul></div>
<p style="font-size:12px;color:#888">Saved ${new Date().toLocaleString()} · TransitPulse</p></body></html>`;
}
export function downloadPass(p) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([passHtml(p)], { type: "text/html" }));
  a.download = `TransitPulse_${p.pnr}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
