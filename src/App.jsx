import { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const SUPA_URL = "https://kboumpkcrdeuteiiodjp.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib3VtcGtjcmRldXRlaWlvZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODA2MTQsImV4cCI6MjA5NDI1NjYxNH0.gTjqSnxI8F7ozcLSWB2rCDexP7ubgX1fwG2uOM3L0rI";
// Pase de sesión que entrega /api/login. Con él la base sabe quién está pidiendo los datos.
let _pase = null;
const setPase = t => { _pase = t || null; };
const H = () => ({ "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": `Bearer ${_pase || SUPA_KEY}`, "Prefer": "return=representation" });
const API = import.meta.env.DEV ? "http://localhost:3001" : "";
const ERP_URL = "https://santa-lucia-erp.vercel.app";

// Abre el ERP con la sesión actual, sin volver a ingresar
async function irAlERP(toast) {
  // la pestaña se abre de una para que el navegador no la bloquee
  const ventana = window.open("about:blank", "_blank");
  try {
    const r = await fetch(`${API}/api/pase-erp`, { method: "POST", headers: { Authorization: `Bearer ${_pase}` } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.token) { ventana?.close(); toast(data.error || "No se pudo abrir el ERP", "error"); return; }
    const sso = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const url = `${ERP_URL}/#sso=${encodeURIComponent(sso)}`;
    if (ventana) ventana.location.href = url; else window.location.href = url;
  } catch { ventana?.close(); toast("Error de conexión", "error"); }
}
// ═══════════════════════════════════════════════════════════
//  Trabajo sin señal
//  En obra hay sótanos sin línea. La app guarda en el teléfono la última carga de
//  datos y una cola con lo que se marcó sin red; cuando vuelve la señal, la cola se
//  despacha sola. Se usa IndexedDB (localStorage se queda corto con obras grandes).
// ═══════════════════════════════════════════════════════════
const DB_NOMBRE = "obras-local", DB_ALMACEN = "kv";
let _idb = null;
function abrirIdb() {
  if (_idb) return _idb;
  _idb = new Promise((ok, mal) => {
    const req = indexedDB.open(DB_NOMBRE, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_ALMACEN);
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
  }).catch(() => null);
  return _idb;
}
async function localGet(clave) {
  try {
    const db = await abrirIdb(); if (!db) return null;
    return await new Promise(ok => {
      const r = db.transaction(DB_ALMACEN).objectStore(DB_ALMACEN).get(clave);
      r.onsuccess = () => ok(r.result ?? null); r.onerror = () => ok(null);
    });
  } catch { return null; }
}
async function localSet(clave, valor) {
  try {
    const db = await abrirIdb(); if (!db) return false;
    return await new Promise(ok => {
      const tx = db.transaction(DB_ALMACEN, "readwrite");
      tx.objectStore(DB_ALMACEN).put(valor, clave);
      tx.oncomplete = () => ok(true); tx.onerror = () => ok(false); tx.onabort = () => ok(false);
    });
  } catch { return false; }
}
// Un fallo de red lanza excepción; un rechazo del servidor responde con error HTTP.
// Solo lo primero se encola: lo segundo hay que mostrarlo, no reintentarlo para siempre.
const sinRed = () => typeof navigator !== "undefined" && navigator.onLine === false;

const dbGet = async (t, sel = "*") => (await fetch(`${SUPA_URL}/rest/v1/${t}?select=${sel}`, { headers: H() })).json();
const dbUpsert = async (t, d) => fetch(`${SUPA_URL}/rest/v1/${t}`, { method: "POST", headers: { ...H(), "Prefer": "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(d) });
// return=minimal: el borrado no devuelve la fila. Si la devolviera, en "usuarios" vendría el PIN.
const dbDel = async (t, id) => fetch(`${SUPA_URL}/rest/v1/${t}?id=eq.${id}`, { method: "DELETE", headers: { ...H(), "Prefer": "return=minimal" } });
// Funciones de la base (security definer). Se usan para tocar solo la columna "ajustes"
// de usuarios, sin mandar la fila entera desde el navegador.
const dbRpc = async (fn, args) => fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...H(), "Prefer": "return=minimal" }, body: JSON.stringify(args) });
// Insert y update sueltos. A diferencia de dbUpsert no generan ON CONFLICT, que exige
// permiso de SELECT sobre toda la tabla y por eso choca con el blindaje del PIN.
const dbInsert = async (t, d) => fetch(`${SUPA_URL}/rest/v1/${t}`, { method: "POST", headers: { ...H(), "Prefer": "return=minimal" }, body: JSON.stringify(d) });
const dbPatch = async (t, id, d) => fetch(`${SUPA_URL}/rest/v1/${t}?id=eq.${id}`, { method: "PATCH", headers: { ...H(), "Prefer": "return=minimal" }, body: JSON.stringify(d) });

// ── Frontera DB↔app para "liquidaciones" ──────────────────
// La tabla usa nombres largos (retencion/subtotal/pasajes/bonificacion); la UI usa los cortos
// (ret/sub/pas/bon). Todo el mapeo vive acá para que ningún componente conozca las columnas.
// pendAdj es estado de UI y no se persiste.
const liqToDb = l => ({
  id: l.id, inst_id: l.inst_id, inst_nombre: l.inst_nombre, inst_cedula: l.inst_cedula,
  inst_telefono: l.inst_telefono, inst_banco: l.inst_banco, inst_cuenta: l.inst_cuenta,
  corte: l.corte, fecha_cierre: l.fecha_cierre, cerrado_por: l.cerrado_por, estado: l.estado,
  bruto: l.bruto, retencion: l.ret, subtotal: l.sub, pasajes: l.pas, bonificacion: l.bon,
  total: l.total, rows: l.rows,
});
const mapLiq = r => ({ ...r, ret: r.retencion ?? 0, sub: r.subtotal ?? 0, pas: r.pasajes ?? 0, bon: r.bonificacion ?? 0 });

// En Gestión de Obras la oficina (superadmin, supervisor y auxiliar) tiene acceso completo;
// los instaladores siguen con su vista limitada.
const OFICINA = ["superadmin", "supervisor", "auxiliar"];
const esOficina = u => OFICINA.includes(u?.rol);

// Para el avance cuentan los elementos de la tipología del apto Y los de las tipologías
// extra (un apto puede llevar dos portones, por ejemplo). No cuentan los adicionales ni
// los viejos __pasajes__/__bonificacion__: son trabajos sueltos, no parte de la instalación.
const elsAvance = a => [...(a.elementos || []), ...(a.elementosExtra || [])]
  .filter(e => !e.esAdicional && !e.elementoId?.startsWith("__"));

const ROLES = { SA: "superadmin", SV: "supervisor", AX: "auxiliar", IN: "instalador" };

// Las cantidades no siempre llegan como número: los <input type="number"> devuelven
// texto y en importaciones aparecen con coma decimal ("1,5"). Normaliza a número;
// si no hay nada usable devuelve `fallback`.
const numCant = (v, fallback = 1) => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const red4 = n => Math.round(n * 10000) / 10000;   // evita 2.9999999996 en el reporte

// Alias de "unidad" que conviven en la base: el ERP escribe "un" y esta app "und".
// No se normalizan los datos porque son del ERP; se acepta el alias y punto.
const ALIAS_UND = ["und", "un", "u", "unidad"];
// Solo los elementos por unidad se pueden marcar parcialmente. Se compara en
// positivo y normalizado: cualquier otra cosa (ml, m2, gl, unidad vacía, con
// espacios o en mayúsculas, o elemento no encontrado) se marca COMPLETA.
// La lista negra anterior (unidad !== "ml" && unidad !== "m2") dejaba pasar
// " ML ", "m²" y null, y por ahí se colaba el selector en los zócalos.
const esPorUnidad = u => ALIAS_UND.includes(String(u ?? "").trim().toLowerCase());
// Además del tipo de unidad, partir exige un entero > 1: no hay "1 de 2.5 und".
const puedePartirse = (unidad, cant) => esPorUnidad(unidad) && Number.isInteger(Number(cant)) && Number(cant) > 1;

const C = {
  or: "#F97316", orD: "#EA6A0A", orL: "#FFF7ED", orM: "#FED7AA",
  bk: "#111", g9: "#1C1C1E", g8: "#2C2C2E", g5: "#636366", g4: "#8E8E93",
  g3: "#C7C7CC", g2: "#D1D1D6", g1: "#F2F2F7", g0: "#F9F9FB", wh: "#FFFFFF",
  gn: "#22C55E", gnL: "#DCFCE7", gnD: "#15803D", rd: "#EF4444", rdL: "#FEE2E2",
  am: "#F59E0B", amL: "#FEF3C7"
};

const card = { background: C.wh, border: `1px solid ${C.g2}`, borderRadius: 12, padding: "1rem 1.25rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const iSt = { width: "100%", boxSizing: "border-box", padding: "9px 12px", border: `1px solid ${C.g2}`, borderRadius: 8, fontSize: 14, fontFamily: "system-ui", color: C.bk, background: C.wh };
const bV = {
  primary: { background: C.or, border: `1px solid ${C.or}`, color: C.wh },
  default: { background: C.wh, border: `1px solid ${C.g2}`, color: C.bk },
  danger: { background: C.rdL, border: "1px solid #FECACA", color: C.rd },
  success: { background: C.gnL, border: "1px solid #BBF7D0", color: C.gnD },
  amber: { background: C.amL, border: "1px solid #FDE68A", color: "#B45309" },
};

const fmt = n => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
const lbl = () => ({ fontSize: 12, color: C.g5, display: "block", marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" });

// Un elemento que nació del contrato puede servir para varias torres (obras) del mismo proyecto
const esDeObra = (e, obraId) => e.obra_id === obraId || (e.obras_extra || []).includes(obraId);

// Orden alfabético "de gente": no distingue mayúsculas ni tildes, y los números
// los lee como números, para que Torre 2 vaya antes que Torre 10.
const cmpTxt = (a, b) => String(a ?? "").localeCompare(String(b ?? ""), "es", { numeric: true, sensitivity: "base" });
const porNombre = (a, b) => cmpTxt(a?.nombre, b?.nombre);
const ordNom = xs => [...(xs || [])].sort(porNombre);
// Listas que guardan ids (instaladores asignados a un apto): se ordenan por el nombre del dueño del id.
const ordIds = (ids, users) => [...(ids || [])].sort((a, b) => cmpTxt(users.find(u => u.id === a)?.nombre || a, users.find(u => u.id === b)?.nombre || b));

const GRUPOS = ["Puertas", "Closets y vestier", "Cocinas", "Zócalos y molduras", "Pisos", "Otros"];

function bdg(t) {
  const m = { green: { bg: C.gnL, c: C.gnD, b: "#BBF7D0" }, orange: { bg: C.orL, c: C.orD, b: C.orM }, amber: { bg: C.amL, c: "#B45309", b: "#FDE68A" }, red: { bg: C.rdL, c: C.rd, b: "#FECACA" }, gray: { bg: C.g1, c: C.g5, b: C.g2 } };
  const v = m[t] || m.gray;
  return { background: v.bg, color: v.c, border: `1px solid ${v.b}`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 500, display: "inline-block" };
}

function getCorteFechas() {
  const h = new Date(), y = h.getFullYear(), m = h.getMonth();
  const r = [];
  [-2, -1, 0, 1].forEach(d => {
    const mm = m + d, yr = mm < 0 ? y - 1 : mm > 11 ? y + 1 : y, mr = ((mm % 12) + 12) % 12;
    const diasMes = new Date(yr, mr + 1, 0).getDate();
    const nomMes = new Date(yr, mr, 1).toLocaleString("es-CO", { month: "long", year: "numeric" });
    r.push({ label: `1–14 ${nomMes}`, desde: new Date(yr, mr, 1), hasta: new Date(yr, mr, 14) });
    r.push({ label: `15–${diasMes} ${nomMes}`, desde: new Date(yr, mr, 15), hasta: new Date(yr, mr, diasMes) });
  });
  return r.sort((a, b) => b.desde - a.desde).slice(0, 10);
}

function enCorte(fs, d, h) {
  if (!fs) return false;
  const [dd, mm, yy] = fs.split("/").map(Number);
  const f = new Date(yy, mm - 1, dd);
  return f >= d && f <= h;
}

// Saldo de préstamo de una persona: lo prestado menos lo abonado. Un solo saldo
// consolidado, no un préstamo por separado.
function saldoPrestamo(movs, uid) {
  return (movs || []).filter(m => m.usuario_id === uid)
    .reduce((s, m) => s + (m.tipo === "abono" ? -Number(m.valor || 0) : Number(m.valor || 0)), 0);
}

// Lee el ajuste (pasajes/bonificación) de un instalador para un corte. Tolera ausencia de .ajustes.
function ajusteDe(usuarios, iid, corteLabel) {
  const a = usuarios.find(x => x.id === iid)?.ajustes?.[corteLabel] || {};
  // Días laborados: jornales pagados en el corte, por obra. No llevan retención (igual que pasajes).
  const dias = Array.isArray(a.dias) ? a.dias.filter(d => Number(d.dias) > 0) : [];
  const diasVal = dias.reduce((s, d) => s + Number(d.dias || 0) * Number(d.valorDia || 0), 0);
  return { pasajes: Number(a.pasajes) || 0, bonificacion: Number(a.bonificacion) || 0, dias, diasVal,
           abono: Number(a.abono) || 0,   // descuento de préstamo de este corte (lo pone la oficina)
           aprobado: !!a.aprobado, editadoPor: a.editadoPor || "" };
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: C.wh, borderRadius: 16, border: `1px solid ${C.g2}`, maxWidth: wide ? 720 : 560, width: "94%", maxHeight: "88vh", overflowY: "auto", padding: "1.5rem", boxSizing: "border-box", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: C.bk }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, color: C.g4 }}>×</button>
        </div>
        <div style={{ color: C.bk }}>{children}</div>
      </div>
    </div>
  );
}

function Inp({ label, ...p }) {
  return <div style={{ marginBottom: 14 }}>{label && <label style={lbl()}>{label}</label>}<input style={iSt} {...p} /></div>;
}
function Sel({ label, children, ...p }) {
  return <div style={{ marginBottom: 14 }}>{label && <label style={lbl()}>{label}</label>}<select style={{ ...iSt, background: C.wh }} {...p}>{children}</select></div>;
}
function Btn({ children, onClick, variant = "default", disabled, style: s = {} }) {
  const v = bV[variant] || bV.default;
  return <button onClick={onClick} disabled={disabled} style={{ ...v, borderRadius: 8, padding: "8px 16px", cursor: disabled ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 500, opacity: disabled ? 0.45 : 1, fontFamily: "system-ui", ...s }}>{children}</button>;
}
function Toast({ items, setItems }) {
  if (!items.length) return null;
  return <div style={{ position: "fixed", top: 16, right: 16, zIndex: 99999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
    {items.map(n => <div key={n.id} style={{ background: n.t === "ok" ? C.gnL : C.orL, border: `1px solid ${n.t === "ok" ? "#BBF7D0" : C.orM}`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <span style={{ color: n.t === "ok" ? C.gnD : C.orD }}>{n.t === "ok" ? "✓" : "🔔"}</span>
      <div style={{ flex: 1, fontSize: 13, color: n.t === "ok" ? C.gnD : C.orD }}>{n.msg}</div>
      <button onClick={() => setItems(x => x.filter(i => i.id !== n.id))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.g4 }}>×</button>
    </div>)}
  </div>;
}

const ELEMENTOS_DEF = [
  { id: "e1", nombre: "Puerta principal", unidad: "und", precio: 55000 },
  { id: "e2", nombre: "Puerta habitación", unidad: "und", precio: 55000 },
  { id: "e3", nombre: "Chapa puerta principal", unidad: "und", precio: 10000 },
  { id: "e4", nombre: "Moldura puerta principal", unidad: "und", precio: 10000 },
  { id: "e19", nombre: "Chapa WC principal", unidad: "und", precio: 10000 },
  { id: "e20", nombre: "Moldura WC principal", unidad: "und", precio: 10000 },
  { id: "e21", nombre: "Chapa WC social", unidad: "und", precio: 10000 },
  { id: "e22", nombre: "Moldura WC social", unidad: "und", precio: 10000 },
  { id: "e23", nombre: "Chapa alcoba 2", unidad: "und", precio: 10000 },
  { id: "e24", nombre: "Moldura alcoba 2", unidad: "und", precio: 10000 },
  { id: "e25", nombre: "Chapa alcoba 3", unidad: "und", precio: 10000 },
  { id: "e26", nombre: "Moldura alcoba 3", unidad: "und", precio: 10000 },
  { id: "e5", nombre: "Closet alcoba principal", unidad: "und", precio: 150000 },
  { id: "e6", nombre: "Closet alcoba 2", unidad: "und", precio: 120000 },
  { id: "e7", nombre: "Closet alcoba 3", unidad: "und", precio: 120000 },
  { id: "e8", nombre: "Mueble WC principal", unidad: "und", precio: 25000 },
  { id: "e9", nombre: "Mueble WC social", unidad: "und", precio: 25000 },
  { id: "e10", nombre: "Vestier enfrentado", unidad: "und", precio: 110000 },
  { id: "e11", nombre: "Vestier en L", unidad: "und", precio: 110000 },
  { id: "e12", nombre: "Vestier en U", unidad: "und", precio: 150000 },
  { id: "e13", nombre: "Mueble alto cocina", unidad: "und", precio: 0 },
  { id: "e14", nombre: "Mueble bajo cocina", unidad: "und", precio: 0 },
  { id: "e15", nombre: "Mueble isla", unidad: "und", precio: 0 },
  { id: "e16", nombre: "Mueble lavadero", unidad: "und", precio: 30000 },
  { id: "e17", nombre: "Zócalo", unidad: "ml", precio: 2500 },
];

// La lista de usuarios vive solo en Supabase (antes estaba escrita aquí con cédulas y PIN).

// ── Diagnóstico de cantidades vs. tipología (SOLO LECTURA) ───────────────────
// Recorre TODAS las obras y compara la cantidad de cada elemento con la que dicta
// su tipología. No escribe nada: ni estado de React, ni Supabase. Devuelve datos.
function diagnosticarCantidades(obras, elems, liqs) {
  // Las filas de una liquidación guardan NOMBRES (obra/apto/elemento), no ids
  // —ver detalle() en Liquidacion—, así que el cruce solo puede ser por nombre.
  // Un homónimo daría falso positivo, y aquí un falso positivo solo marca el
  // elemento como intocable: es el lado seguro del error.
  const kLiq = (o, ap, el) => `${o}|||${ap}|||${el}`;
  const liqKeys = new Set();
  (liqs || []).forEach(l => (l.rows || []).forEach(r => liqKeys.add(kLiq(r.obra, r.apto, r.el))));

  const nombreEl = eid => (elems || []).find(e => e.id === eid)?.nombre || eid;
  const rows = [];

  (obras || []).forEach(o => (o.pisos || []).forEach(p => (p.aptos || []).forEach(a => {
    const aptoNom = a.nombre || `${p.numero}${String(a.numero ?? "").padStart(2, "0")}`;

    // Se agrupa por elemento porque un completado parcial parte la fila en dos
    // (ver marcar() en Apto): la cantidad real del apto es la SUMA de las partes.
    const revisar = (lista, ambito) => {
      const grupos = new Map();
      (lista || []).forEach(el => {
        if (el.esAdicional) return;                                 // no lo dicta ninguna tipología
        if (String(el.elementoId || "").startsWith("__")) return;   // __pasajes__ / __bonificacion__ viejos
        const tipId = ambito === "extra" ? el.tipologiaId : (el.tipologiaId || a.tipologia);
        if (!tipId) return;                                         // sin tipología no hay referencia
        const k = `${tipId}|${el.elementoId}`;
        if (!grupos.has(k)) grupos.set(k, { tipId, elementoId: el.elementoId, partes: [] });
        grupos.get(k).partes.push(el);
      });

      grupos.forEach(g => {
        const tip = (o.tipologias || []).find(t => t.id === g.tipId);
        if (!tip) return;
        if (!(tip.elementoIds || []).includes(g.elementoId)) return;  // huérfano: la tipología no lo dicta

        // fallback 0 = "la tipología no define una cantidad usable" (vacío, texto basura o 0).
        const crudaN = numCant(tip.cantidades?.[g.elementoId], 0);
        const porDefecto = !(crudaN > 0);
        const correcta = porDefecto ? 1 : crudaN;
        const actual = g.partes.reduce((s, e) => s + numCant(e.cantidad, 1), 0);
        if (Math.abs(actual - correcta) <= 0.01) return;   // tolerancia: decimales, no diferencias reales

        const instalado = g.partes.some(e => e.completado);
        const detallado = g.partes.some(e => e.detCompletado);
        const elNom = nombreEl(g.elementoId);
        const liquidado = liqKeys.has(kLiq(o.nombre, aptoNom, elNom));

        rows.push({
          obraId: o.id, obra: o.nombre, piso: p.numero, aptoId: a.id, apto: aptoNom,
          ambito, tipId: tip.id, tipologia: tip.nombre,
          elementoId: g.elementoId, elemento: elNom,
          actual: red4(actual), correcta: red4(correcta), partes: g.partes.length,
          // La tipología no define cantidad para este elemento: "correcta" es el
          // fallback 1, no un dato guardado. Revisar a mano antes de confiar.
          porDefecto,
          instalado, detallado, liquidado,
          bloqueado: instalado || detallado || liquidado,
        });
      });
    };

    revisar(a.elementos, "principal");
    revisar(a.elementosExtra, "extra");
  })));

  rows.sort((x, y) => String(x.obra).localeCompare(String(y.obra))
    || (Number(x.piso) - Number(y.piso))
    || String(x.apto).localeCompare(String(y.apto))
    || String(x.elemento).localeCompare(String(y.elemento)));

  const porObra = [];
  rows.forEach(r => {
    let g = porObra.find(x => x.obraId === r.obraId);
    if (!g) { g = { obraId: r.obraId, obra: r.obra, _aptos: new Set(), elementos: 0, instalados: 0, detallados: 0, liquidados: 0, bloqueados: 0, porDefecto: 0 }; porObra.push(g); }
    g._aptos.add(r.aptoId); g.elementos++;
    if (r.instalado) g.instalados++;
    if (r.detallado) g.detallados++;
    if (r.liquidado) g.liquidados++;
    if (r.bloqueado) g.bloqueados++;
    if (r.porDefecto) g.porDefecto++;
  });
  porObra.forEach(g => { g.aptos = g._aptos.size; delete g._aptos; g.corregibles = g.elementos - g.bloqueados; });
  porObra.sort((x, y) => y.elementos - x.elementos);

  const tot = porObra.reduce((s, g) => ({
    aptos: s.aptos + g.aptos, elementos: s.elementos + g.elementos,
    instalados: s.instalados + g.instalados, detallados: s.detallados + g.detallados,
    liquidados: s.liquidados + g.liquidados, bloqueados: s.bloqueados + g.bloqueados,
    porDefecto: s.porDefecto + g.porDefecto, corregibles: s.corregibles + g.corregibles,
  }), { aptos: 0, elementos: 0, instalados: 0, detallados: 0, liquidados: 0, bloqueados: 0, porDefecto: 0, corregibles: 0 });

  // Lo que la app tiene en memoria tras loadAll(). Sirve para contrastarlo contra el
  // total real de la tabla (ver verifCarga): si no cuadra, el reporte está incompleto.
  const cargado = { obras: (obras || []).length, elems: (elems || []).length, liqs: (liqs || []).length };

  return { rows, porObra, tot, cargado };
}

// CSV con ";" y BOM: así Excel en es-CO lo abre en columnas sin pasar por el asistente.
function csvCantidades({ rows, porObra, tot }) {
  const esc = v => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linea = a => a.map(esc).join(";");
  const si = b => b ? "SI" : "";
  return "\uFEFF" + [
    linea(["DETALLE"]),
    linea(["Obra", "Piso", "Apto", "Ambito", "Tipologia", "Elemento", "Cant. actual", "Cant. correcta", "Cant. por defecto", "Partes", "Instalado", "Detallado", "Liquidado", "Accion paso 3"]),
    ...rows.map(r => linea([r.obra, r.piso, r.apto, r.ambito, r.tipologia, r.elemento, r.actual, r.correcta,
      si(r.porDefecto), r.partes, si(r.instalado), si(r.detallado), si(r.liquidado), r.bloqueado ? "NO TOCAR" : "corregir"])),
    "",
    linea(["RESUMEN POR OBRA"]),
    linea(["Obra", "Aptos afectados", "Elementos afectados", "Instalados", "Detallados", "Liquidados", "Bloqueados", "Cant. por defecto", "Corregibles"]),
    ...porObra.map(g => linea([g.obra, g.aptos, g.elementos, g.instalados, g.detallados, g.liquidados, g.bloqueados, g.porDefecto, g.corregibles])),
    linea(["TOTAL", tot.aptos, tot.elementos, tot.instalados, tot.detallados, tot.liquidados, tot.bloqueados, tot.porDefecto, tot.corregibles]),
  ].join("\r\n");
}

// Cuenta filas sin traerlas: select=id + Prefer:count=exact deja el total en el
// header Content-Range ("0-N/TOTAL"). `filas` es lo que realmente devolvió esa
// misma petición: si filas < total, PostgREST está truncando (max-rows).
async function contarTabla(tabla, headers) {
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/${tabla}?select=id`, {
      headers: { ...headers, Prefer: "count=exact" },   // pisa el return=representation de H()
    });
    const cr = r.headers.get("content-range");
    const body = await r.json().catch(() => null);
    const total = cr && cr.includes("/") ? Number(cr.split("/")[1]) : NaN;
    return {
      ok: r.ok, status: r.status, contentRange: cr,
      total: Number.isFinite(total) ? total : null,
      filas: Array.isArray(body) ? body.length : null,
      error: Array.isArray(body) ? null : body,
    };
  } catch (e) {
    return { ok: false, status: 0, contentRange: null, total: null, filas: null, error: String(e) };
  }
}

export default function App() {
  const [user, setUser] = useState(() => {
    // Llegó desde el ERP con un pase: se guarda como sesión y se limpia la URL
    try {
      const m = window.location.hash.match(/^#sso=(.+)$/);
      if (m) {
        const data = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
        if (data?.token && data?.exp && data.exp * 1000 > Date.now()) {
          localStorage.setItem("gs", JSON.stringify({ user: data.user, token: data.token, exp: data.exp }));
        }
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch { /* pase dañado: se sigue con el login normal */ }
    try {
      const s = JSON.parse(localStorage.getItem("gs") || "null");
      if (!s?.token || !s?.exp || s.exp * 1000 < Date.now()) { localStorage.removeItem("gs"); return null; }
      setPase(s.token);
      return { ...s.user, _exp: s.exp };
    } catch { return null; }
  });
  const [obras, setObras] = useState([]);
  const [elems, setElems] = useState([]);
  const [users, setUsers] = useState([]);
  const [liqs, setLiqs] = useState([]);
  const [movPres, setMovPres] = useState([]);   // préstamos y abonos de los instaladores
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("obras");
  const [selObra, setSelObra] = useState(null);
  const [selPiso, setSelPiso] = useState(null);
  const [selApto, setSelApto] = useState(null);
  const [modals, setModals] = useState({});
  const [login, setLogin] = useState({ email: "", pin: "" });
  const [loginErr, setLoginErr] = useState("");
  const [toasts, setToasts] = useState([]);

  const openM = k => setModals(m => ({ ...m, [k]: true }));
  const closeM = k => setModals(m => ({ ...m, [k]: false }));
  const toast = (msg, t = "info") => { const id = Date.now(); setToasts(x => [...x, { id, msg, t }]); setTimeout(() => setToasts(x => x.filter(i => i.id !== id)), 5000); };

  const mapObra = ob => ({
    ...ob,
    tipologias: ob.tipologias || [],
    pisos: ob.pisos || [],
    instaladoresAutorizados: ob.instaladores_autorizados || [],
    aptosHabilitados: ob.aptos_habilitados || {},
    solicitudes: ob.solicitudes || [],
    preciosOverride: ob.precios_override || {},
    coordinadorId: ob.coordinador_id || ""
  });

  async function loadAll() {
    setLoading(true);
    try {
      const [u, e, o, l, mp] = await Promise.all([
        dbGet("usuarios", "id,nombre,email,rol,oficio,cedula,telefono,banco,cuenta,ajustes"),   // sin PIN
        dbGet("elementos"), dbGet("obras"), dbGet("liquidaciones"),
        dbGet("movimientos_prestamo").catch(() => []),   // si la tabla aún no existe, se sigue sin ella
      ]);
      setUsers(ordNom(u));
      setMovPres(Array.isArray(mp) ? mp : []);
      if (!e.length) { await Promise.all(ELEMENTOS_DEF.map(x => dbUpsert("elementos", x))); setElems(ELEMENTOS_DEF); } else setElems(ordNom(e));
      setObras(ordNom(o.map(mapObra)));
      setLiqs(l.map(mapLiq));
      // Copia en el teléfono, para poder abrir la app en un sótano sin señal
      localSet("datos", { u, e: e.length ? e : ELEMENTOS_DEF, o, l, mp: Array.isArray(mp) ? mp : [], fecha: Date.now() });
      setDesdeLocal(null);
      despacharCola();          // por si quedaron marcas de la última vez sin señal
    } catch (err) {
      // Sin línea: se abre con lo último que se alcanzó a guardar
      const g = await localGet("datos");
      if (g) {
        setUsers(ordNom(g.u)); setElems(ordNom(g.e)); setObras(ordNom((g.o || []).map(mapObra))); setLiqs((g.l || []).map(mapLiq)); setMovPres(g.mp || []);
        setDesdeLocal(g.fecha || Date.now());
        toast("Sin señal: mostrando los últimos datos guardados", "info");
      } else {
        toast("Error conectando", "error");
      }
    }
    setLoading(false);
  }
  useEffect(() => { if (user) loadAll(); else setLoading(false); }, [user]);

  // ── Cola de marcas sin señal ──────────────────────────────
  const [pendientes, setPendientes] = useState(0);
  const [enLinea, setEnLinea] = useState(() => typeof navigator === "undefined" || navigator.onLine !== false);
  const [desdeLocal, setDesdeLocal] = useState(null);   // fecha de los datos locales, si se abrió sin señal
  const despachando = useRef(false);

  const leerCola = async () => (await localGet("cola")) || [];
  async function encolar(op) {
    const cola = await leerCola();
    // Si ya hay algo pendiente del mismo apto, se reemplaza: vale la última versión
    const i = cola.findIndex(x => x.obra === op.obra && x.piso === op.piso && x.apto === op.apto);
    if (i >= 0) cola[i] = op; else cola.push(op);
    await localSet("cola", cola);
    setPendientes(cola.length);
  }
  async function despacharCola() {
    if (despachando.current) return;
    despachando.current = true;
    try {
      let cola = await leerCola();
      while (cola.length) {
        const op = cola[0];
        try {
          const res = await dbRpc("guardar_apto", { p_obra: op.obra, p_piso: op.piso, p_apto: op.apto, p_datos: op.datos });
          if (res.status === 401 || res.status === 403) {
            // La sesión venció mientras estaba sin señal. Las marcas NO se botan:
            // se quedan en la cola hasta que vuelva a entrar.
            toast("Tu sesión venció. Vuelve a entrar y las marcas pendientes se suben solas.", "err");
            break;
          }
          setEnLinea(true);                    // si respondió, hay red (aunque el celular diga que no)
          if (!res.ok) {                       // rechazo del servidor: no sirve reintentar
            console.error("cola: guardar_apto rechazado", res.status, await res.text().catch(() => ""));
            toast("Una marca guardada sin señal no fue aceptada. Revísala en la obra.", "err");
          }
        } catch { break; }                      // se cayó la red otra vez: queda para después
        cola = cola.slice(1);
        await localSet("cola", cola);
        setPendientes(cola.length);
      }
      if (!cola.length) setPendientes(0);
    } finally { despachando.current = false; }
  }
  // Al arrancar, al recuperar la señal y cada vez que la app vuelve al frente
  useEffect(() => {
    leerCola().then(c => setPendientes(c.length));
    const arriba = () => { setEnLinea(true); despacharCola(); };
    const abajo  = () => setEnLinea(false);
    const visible = () => { if (document.visibilityState === "visible") despacharCola(); };
    window.addEventListener("online", arriba);
    window.addEventListener("offline", abajo);
    document.addEventListener("visibilitychange", visible);
    // El aviso de "volvió la red" del celular no es de fiar: a veces dice que hay
    // internet cuando todavía no, y a veces no avisa. Por eso se reintenta solo,
    // cada 15 segundos, mientras haya algo pendiente. Si no hay red, el intento
    // falla callado y la cola se queda igual.
    const reintento = setInterval(async () => {
      const c = await leerCola();
      setPendientes(c.length);
      if (c.length) despacharCola();
    }, 15000);
    return () => {
      clearInterval(reintento);
      window.removeEventListener("online", arriba);
      window.removeEventListener("offline", abajo);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  const saveObra = async o => dbUpsert("obras", {
    id: o.id, nombre: o.nombre, direccion: o.direccion, estado: o.estado,
    tipologias: o.tipologias || [], pisos: o.pisos || [],
    instaladores_autorizados: o.instaladoresAutorizados || [],
    aptos_habilitados: o.aptosHabilitados || {},
    solicitudes: o.solicitudes || [],
    precios_override: o.preciosOverride || {},
    coordinador_id: o.coordinadorId || ""
  });

  // ── Guardado quirúrgico ───────────────────────────────────
  // Marcar un elemento mandaba la obra ENTERA a la base. Como cada quien carga los datos
  // al abrir la app, el que guardaba de último devolvía su copia vieja encima y borraba
  // lo que otros habían marcado mientras tanto. Ahora, si lo único que cambió son aptos,
  // se manda solo ese apto con la función guardar_apto, que toca ese pedazo del JSON y
  // deja el resto como esté en la base en ese momento. Los cambios de estructura de la
  // obra (pisos nuevos, tipologías, precios) siguen guardando la obra completa.
  const mismaEstructura = (a, b) => {
    const forma = o => JSON.stringify((o.pisos || []).map(p => [p.id, (p.aptos || []).map(x => x.id)]));
    const resto = o => JSON.stringify({
      nombre: o.nombre, direccion: o.direccion, estado: o.estado, tipologias: o.tipologias || [],
      ia: o.instaladoresAutorizados || [], ah: o.aptosHabilitados || {},
      sol: o.solicitudes || [], po: o.preciosOverride || {}, co: o.coordinadorId || "",
    });
    return forma(a) === forma(b) && resto(a) === resto(b);
  };
  const aptosCambiados = (prev, next) => {
    const out = [];
    (next.pisos || []).forEach(p => {
      const pv = (prev.pisos || []).find(x => x.id === p.id);
      (p.aptos || []).forEach(a => {
        const av = (pv?.aptos || []).find(x => x.id === a.id);
        if (JSON.stringify(av) !== JSON.stringify(a)) out.push({ pisoId: p.id, apto: a });
      });
    });
    return out;
  };
  async function guardarCambioObra(prev, next) {
    if (!prev || !mismaEstructura(prev, next)) {
      // Cambio de estructura (pisos, tipologías, precios): eso lo hace la oficina con
      // señal, así que no se encola. Si falla, se avisa y ya.
      try {
        const res = await saveObra(next);
        if (res && !res.ok) toast("No se pudo guardar el cambio de la obra", "err");
      } catch { toast("Sin señal: este cambio no se guardó", "err"); }
      return;
    }
    const cambios = aptosCambiados(prev, next);
    if (!cambios.length) return;                       // nada que guardar
    for (const c of cambios) {
      const op = { obra: next.id, piso: c.pisoId, apto: c.apto.id, datos: c.apto };
      try {
        const res = await dbRpc("guardar_apto", { p_obra: op.obra, p_piso: op.piso, p_apto: op.apto, p_datos: op.datos });
        if (!res.ok) {                                  // el servidor lo rechazó: no es falta de red
          console.error("guardar_apto falló:", res.status, await res.text().catch(() => ""));
          toast("No se pudo guardar esa marca", "err");
        }
      } catch {
        await encolar(op);                              // sin señal: queda en el teléfono
      }
    }
  }

  const updateObra = (id, fn) => setObras(obs => {
    const prev = obs.find(o => o.id === id);
    const updated = obs.map(o => o.id === id ? fn(o) : o);
    const obra = updated.find(o => o.id === id);
    if (obra) guardarCambioObra(prev, obra);
    return updated;
  });

  async function doLogin() {
    try {
      const r = await fetch(`${API}/api/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: login.email, pin: login.pin }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.token) { setLoginErr(data.error || "Correo o PIN incorrecto"); return; }
      setPase(data.token);
      localStorage.setItem("gs", JSON.stringify({ user: data.user, token: data.token, exp: data.exp }));
      setUser({ ...data.user, _exp: data.exp });
      setLoginErr("");
    } catch { setLoginErr("Error de conexión"); }
  }
  function doLogout() { setPase(null); setUser(null); localStorage.removeItem("gs"); }

  // ARREGLO 3: getPrecio ahora también busca override por apto individual (key: aptoId__eid)
  // act: "inst" (instalación) | "det" (detallado). El detallado usa sus propios
  // overrides (mismas llaves con prefijo det__) y el precio_detallado del elemento.
  const getPrecio = (eid, oid, corteLabel, aptoId, tipId, act = "inst") => {
    const o = obras.find(x => x.id === oid);
    const pre = act === "det" ? "det__" : "";
    if (aptoId) {
      const kApto = `${pre}apto__${aptoId}__${eid}`;
      if (o?.preciosOverride?.[kApto] !== undefined) return o.preciosOverride[kApto];
    }
    const k = `${pre}${corteLabel}__${eid}`;
    if (o?.preciosOverride?.[k] !== undefined) return o.preciosOverride[k];
    if (tipId) {
      const kTip = `${pre}tip__${tipId}__${eid}`;
      if (o?.preciosOverride?.[kTip] !== undefined) return o.preciosOverride[kTip];
    }
    const elem = elems.find(e => e.id === eid);
    return (act === "det" ? elem?.precio_detallado : elem?.precio) || 0;
  };

  const avanceObra = o => {
    let t = 0, c = 0;
    o.pisos?.forEach(p => p.aptos?.forEach(a => elsAvance(a).forEach(e => { t++; if (e.completado) c++; })));
    return t === 0 ? 0 : Math.round(c / t * 100);
  };
  const avanceApto = a => {
    const els = elsAvance(a);
    return els.length === 0 ? 0 : Math.round(els.filter(e => e.completado).length / els.length * 100);
  };
  // El avance mide la instalación. El detallado solo pone su chulito cuando está todo hecho.
  const detListo = a => {
    const els = elsAvance(a);
    return els.length > 0 && els.every(e => e.detCompletado);
  };

  // Diagnóstico de cantidades vs. tipología — SOLO LECTURA, no escribe en Supabase.
  // Solo se expone para superadmin. Desde la consola del navegador:
  //   diagCantidades()        → tablas en consola + descarga del CSV
  //   diagCantidades(false)   → solo consola, sin descargar
  useEffect(() => {
    if (user?.rol !== ROLES.SA) return;
    window.diagCantidades = (descargar = true) => {
      const res = diagnosticarCantidades(obras, elems, liqs);
      console.log("%cSIMULACIÓN — no se escribió nada", "background:#FEF3C7;color:#B45309;font-weight:700;padding:2px 6px");
      if (!res.rows.length) { console.log("✓ Sin diferencias: todas las cantidades coinciden con su tipología."); return res; }
      res.porObra.forEach(g => {
        console.group(`${g.obra} — ${g.elementos} elemento(s) en ${g.aptos} apto(s) · ${g.corregibles} corregible(s)`);
        console.table(res.rows.filter(r => r.obraId === g.obraId).map(r => ({
          Apto: r.apto, Ambito: r.ambito, Tipologia: r.tipologia, Elemento: r.elemento,
          Actual: r.actual, Correcta: r.correcta, PorDefecto: r.porDefecto ? "SÍ" : "",
          Partes: r.partes, Instalado: r.instalado ? "SÍ" : "", Detallado: r.detallado ? "SÍ" : "",
          Liquidado: r.liquidado ? "SÍ" : "", Paso3: r.bloqueado ? "NO TOCAR" : "corregir",
        })));
        console.groupEnd();
      });
      console.group("RESUMEN POR OBRA");
      console.table(res.porObra);
      console.log("TOTAL", res.tot);
      console.log("EN MEMORIA (loadAll)", res.cargado);
      console.groupEnd();
      if (descargar) {
        const blob = new Blob([csvCantidades(res)], { type: "text/csv;charset=utf-8;" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `cantidades_vs_tipologia_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click(); URL.revokeObjectURL(a.href);
      }
      return res;
    };

    // Verifica que loadAll() haya traído TODO. Dos preguntas distintas:
    //   1) ¿el token de la app ve más filas de las que la app cargó?  → truncamiento
    //   2) ¿la llave anon sola devuelve filas?                        → RLS abierta
    window.verifCarga = async () => {
      const { cargado } = diagnosticarCantidades(obras, elems, liqs);
      // Mismos headers que dbGet (con el pase de sesión) vs. llave anon pelada.
      const anon = { "Content-Type": "application/json", apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };
      const filasDe = { obras: cargado.obras, liquidaciones: cargado.liqs };
      const out = [];
      for (const tabla of ["obras", "liquidaciones"]) {
        const tok = await contarTabla(tabla, H());
        const an = await contarTabla(tabla, anon);
        const enMemoria = filasDe[tabla];
        out.push({
          tabla, enMemoria,
          totalToken: tok.total, filasToken: tok.filas, range: tok.contentRange, statusToken: tok.status,
          completo: tok.total === null ? "?" : (tok.total === enMemoria ? "SÍ" : "NO"),
          truncado: tok.total !== null && tok.filas !== null && tok.filas < tok.total ? "⚠️ SÍ" : "no",
          statusAnon: an.status, filasAnon: an.filas,
          rlsAbierta: an.ok && an.filas > 0 ? "⚠️ SÍ" : "no",
        });
      }
      console.table(out);
      out.forEach(r => {
        if (r.completo === "NO") console.warn(`${r.tabla}: la app cargó ${r.enMemoria} pero el token ve ${r.totalToken}. El reporte está incompleto.`);
        if (r.truncado === "⚠️ SÍ") console.warn(`${r.tabla}: PostgREST truncó (${r.filasToken}/${r.totalToken}). dbGet no pagina.`);
        if (r.rlsAbierta === "⚠️ SÍ") console.warn(`${r.tabla}: la llave anon sola devolvió ${r.filasAnon} fila(s) → RLS abierta.`);
        if (r.completo === "?") console.warn(`${r.tabla}: no llegó Content-Range (¿CORS no lo expone?). Usa filasToken=${r.filasToken} como referencia.`);
      });
      return out;
    };

    // Barrido de SOLO LECTURA sobre los datos ya cargados (sin fetch): busca
    // elementos que NO son "und" y quedaron partidos en varias filas por el
    // selector parcial, más las unidades mal escritas que dejaban pasar el guard.
    window.barridoPartidos = () => {
      const uni = {};
      (elems || []).forEach(e => { uni[e.id] = e.unidad; });

      const raras = (elems || []).filter(e => {
        const n = String(e.unidad ?? "").trim().toLowerCase();
        return !(ALIAS_UND.includes(n) || ["ml", "m2", "gl"].includes(n)) || e.unidad !== n;
      });
      console.group(`A) Unidades que no son exactamente und/ml/m2/gl: ${raras.length}`);
      console.table(raras.map(e => ({ id: e.id, nombre: e.nombre, unidad: JSON.stringify(e.unidad) })));
      console.groupEnd();

      const partidos = [];
      (obras || []).forEach(o => (o.pisos || []).forEach(p => (p.aptos || []).forEach(a => {
        const scan = (lista, ambito) => {
          const g = new Map();
          (lista || []).forEach(el => {
            if (el.esAdicional || String(el.elementoId || "").startsWith("__")) return;
            const tipId = ambito === "extra" ? el.tipologiaId : (el.tipologiaId || a.tipologia);
            const k = `${ambito}|${tipId}|${el.elementoId}`;
            if (!g.has(k)) g.set(k, { eid: el.elementoId, partes: [] });
            g.get(k).partes.push(el);
          });
          g.forEach(({ eid, partes }) => {
            if (partes.length < 2) return;
            if (esPorUnidad(uni[eid])) return;   // los "und" sí se pueden partir: no es el bug
            partidos.push({
              obra: o.nombre, apto: a.nombre || a.numero, ambito,
              elemento: (elems || []).find(e => e.id === eid)?.nombre || eid,
              unidad: uni[eid], partes: partes.length,
              cantidades: partes.map(x => x.cantidad).join(" + "),
              suma: red4(partes.reduce((s, x) => s + numCant(x.cantidad, 1), 0)),
              completados: partes.filter(x => x.completado).length,
              detallados: partes.filter(x => x.detCompletado).length,
            });
          });
        };
        scan(a.elementos, "principal");
        scan(a.elementosExtra, "extra");
      })));
      console.group(`B) Elementos NO-und partidos en varias filas: ${partidos.length}`);
      console.table(partidos);
      console.groupEnd();
      console.log("EN MEMORIA (loadAll)", { obras: (obras || []).length, elems: (elems || []).length });
      return { raras, partidos };
    };

    return () => { delete window.diagCantidades; delete window.verifCarga; delete window.barridoPartidos; };
  }, [user, obras, elems, liqs]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "system-ui", background: C.bk }}>
      <div style={{ width: 60, height: 60, background: C.or, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏗️</div>
      <p style={{ color: C.wh, fontSize: 16 }}>Cargando...</p>
    </div>
  );
  if (!user) return <LoginScreen login={login} setLogin={setLogin} doLogin={doLogin} err={loginErr} />;

  const sh = { obras, setObras, updateObra, saveObra, elems, setElems, users, setUsers, liqs, setLiqs, movPres, setMovPres, openM, closeM, modals, toast, user, getPrecio, avanceApto, detListo };

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: 920, margin: "0 auto", padding: "1rem", background: C.g0, minHeight: "100vh" }}>
      <Toast items={toasts} setItems={setToasts} />
      {/* Estado de la señal y de lo que falta por subir */}
      {(!enLinea || pendientes > 0 || desdeLocal) && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          padding: "8px 12px", borderRadius: 10, marginBottom: 10, fontSize: 13, fontWeight: 600,
          background: !enLinea ? "#FEF3C7" : pendientes > 0 ? C.orL : C.gnL,
          border: `1px solid ${!enLinea ? "#FDE68A" : pendientes > 0 ? C.orM : "#BBF7D0"}`,
          color: !enLinea ? "#92400E" : pendientes > 0 ? C.orD : C.gnD,
        }}>
          <span>{!enLinea ? "📵 Sin señal" : pendientes > 0 ? "📡 Subiendo…" : "✓ Al día"}</span>
          {pendientes > 0 && <span>· {pendientes} {pendientes === 1 ? "marca pendiente" : "marcas pendientes"} por subir</span>}
          {!enLinea && pendientes === 0 && <span style={{ fontWeight: 400 }}>· lo que marques se guarda y se sube cuando vuelva la línea</span>}
          {desdeLocal && enLinea && <span style={{ fontWeight: 400 }}>· datos del {new Date(desdeLocal).toLocaleString("es-CO")}</span>}
          {pendientes > 0 && <button onClick={despacharCola}
            style={{ marginLeft: "auto", background: C.or, color: C.wh, border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Subir ahora</button>}
          {enLinea && desdeLocal && <button onClick={loadAll}
            style={{ marginLeft: pendientes > 0 ? 8 : "auto", background: C.gnD, color: C.wh, border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Actualizar datos</button>}
        </div>
      )}
      <Header toast={toast} user={user} doLogout={doLogout} view={view} setView={setView} selObra={selObra} setSelObra={setSelObra} setSelPiso={setSelPiso} setSelApto={setSelApto} />
      {view === "obras" && <Obras {...sh} avanceObra={avanceObra} goObra={o => { setSelObra(o); setView("obra"); }} />}
      {view === "obra" && selObra && <Obra {...sh} obra={obras.find(o => o.id === selObra.id) || selObra} goApto={(a, p) => { setSelApto(a); setSelPiso(p); setView("apto"); }} />}
      {view === "apto" && selApto && selObra && <Apto {...sh} apto={selApto} piso={selPiso} obra={obras.find(o => o.id === selObra.id)} />}
      {view === "elems" && esOficina(user) && <Elementos {...sh} />}
      {view === "liqs" && <Liquidacion {...sh} avanceObra={avanceObra} />}
      {view === "reportes" && esOficina(user) && <Reportes obras={obras} elems={elems} users={users} user={user} getPrecio={getPrecio} avanceObra={avanceObra} liqs={liqs} movPres={movPres} />}
      {view === "prestamos" && user.rol === ROLES.SA && <Prestamos {...sh} />}
      {view === "users" && esOficina(user) && <Usuarios {...sh} />}
    </div>
  );
}

function LoginScreen({ login, setLogin, doLogin, err }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg,${C.bk} 0%,${C.g8} 100%)`, fontFamily: "system-ui" }}>
      <div style={{ background: C.wh, borderRadius: 20, padding: "2.5rem", width: 360, boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: C.or, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 30 }}>🏗️</div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.bk }}>Gestión de Obras</h2>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: C.g5 }}>Ingresa con tu correo y PIN</p>
        </div>
        <Inp label="Correo" type="email" placeholder="cedula@obra.com" value={login.email} onChange={e => setLogin(d => ({ ...d, email: e.target.value }))} />
        <Inp label="PIN" type="password" placeholder="••••" value={login.pin} onChange={e => setLogin(d => ({ ...d, pin: e.target.value }))} onKeyDown={e => e.key === "Enter" && doLogin()} />
        {err && <p style={{ color: C.rd, fontSize: 13, margin: "-8px 0 12px" }}>{err}</p>}
        <button onClick={doLogin} style={{ ...bV.primary, width: "100%", padding: "12px", fontSize: 15, borderRadius: 10, fontWeight: 600, fontFamily: "system-ui", cursor: "pointer" }}>Ingresar</button>
      </div>
    </div>
  );
}

// ── CAMBIAR MI PIN ────────────────────────────────────────
// Va por RPC porque el instalador no puede escribir en la tabla usuarios.
// La función de la base saca de la sesión a quién le cambia el PIN, así que
// nadie puede cambiárselo a otro, ni mandando un id distinto.
function CambiarPin({ onClose, toast }) {
  const [f, setF] = useState({ actual: "", nuevo: "", rep: "" });
  const [yendo, setYendo] = useState(false);

  async function guardar() {
    if (f.nuevo !== f.rep) { toast("El PIN nuevo y su repetición no coinciden", "error"); return; }
    if (!/^[0-9]{4,8}$/.test(f.nuevo.trim())) { toast("El PIN debe ser de 4 a 8 números", "error"); return; }
    setYendo(true);
    const r = await dbRpc("cambiar_mi_pin", { p_actual: f.actual.trim(), p_nuevo: f.nuevo.trim() });
    setYendo(false);
    if (!r.ok) {
      // La base manda el motivo en 'message'; si no, algo más raro pasó.
      const d = await r.json().catch(() => ({}));
      toast(d.message || "No se pudo cambiar el PIN", "error");
      return;
    }
    toast("PIN cambiado. Úsalo la próxima vez que entres.", "ok");
    onClose();
  }

  return (
    <Modal title="Cambiar mi PIN" onClose={onClose}>
      <p style={{ fontSize: 13, color: C.g5, margin: "0 0 14px" }}>
        Con este PIN entras a Gestión de Obras y al ERP. De 4 a 8 números.
        Nadie más lo puede ver, ni la oficina.
      </p>
      <Inp label="PIN actual" type="password" inputMode="numeric" autoComplete="current-password"
        value={f.actual} onChange={e => setF(x => ({ ...x, actual: e.target.value }))} />
      <Inp label="PIN nuevo" type="password" inputMode="numeric" autoComplete="new-password"
        value={f.nuevo} onChange={e => setF(x => ({ ...x, nuevo: e.target.value }))} />
      <Inp label="Repite el PIN nuevo" type="password" inputMode="numeric" autoComplete="new-password"
        value={f.rep} onChange={e => setF(x => ({ ...x, rep: e.target.value }))} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
        <Btn onClick={onClose}>Cancelar</Btn>
        <Btn variant="primary" disabled={yendo || !f.actual || !f.nuevo || !f.rep} onClick={guardar}>
          {yendo ? "Cambiando…" : "Cambiar PIN"}
        </Btn>
      </div>
    </Modal>
  );
}

function Header({ user, doLogout, view, setView, selObra, setSelObra, setSelPiso, setSelApto, toast }) {
  const [pinM, setPinM] = useState(false);
  const rL = { superadmin: "Gerencia", supervisor: "Coordinador", auxiliar: "Auxiliar", instalador: "Instalador" };
  const nav = [
    { k: "obras", l: "Obras", r: [ROLES.SA, ROLES.SV, ROLES.AX, ROLES.IN] },
    { k: "elems", l: "Elementos", r: [ROLES.SA, ROLES.SV, ROLES.AX] },
    { k: "liqs", l: "Liquidación", r: [ROLES.SA, ROLES.SV, ROLES.AX, ROLES.IN] },
    { k: "reportes", l: "Reportes", r: [ROLES.SA, ROLES.SV, ROLES.AX] },
    { k: "prestamos", l: "Préstamos", r: [ROLES.SA] },
    { k: "users", l: "Usuarios", r: [ROLES.SA, ROLES.SV, ROLES.AX] }
  ];
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, padding: "12px 18px", background: C.bk, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, background: C.or, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏗️</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: C.wh }}>{user.nombre}</div>
            <span style={{ ...bdg("orange"), fontSize: 11, padding: "2px 8px" }}>{rL[user.rol]}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {user.rol !== ROLES.IN && (
            <button onClick={() => irAlERP(toast)} title="Abrir el ERP sin volver a ingresar"
              style={{ background: C.or, border: "none", color: C.wh, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "system-ui" }}>↗ ERP</button>
          )}
          <button onClick={() => setPinM(true)} title="Cambiar mi PIN"
            style={{ background: "transparent", border: `1px solid ${C.g8}`, color: C.g3, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontFamily: "system-ui" }}>🔑 PIN</button>
          <button onClick={doLogout} style={{ background: "transparent", border: `1px solid ${C.g8}`, color: C.g3, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontFamily: "system-ui" }}>Salir</button>
        </div>
      </div>
      {(view === "obra" || view === "apto") && (
        <div style={{ fontSize: 13, color: C.g5, marginBottom: 8, display: "flex", gap: 6, alignItems: "center", padding: "0 4px" }}>
          <span style={{ cursor: "pointer", color: C.or, fontWeight: 600 }} onClick={() => { setView("obras"); setSelObra(null); setSelPiso(null); setSelApto(null); }}>Obras</span>
          {selObra && <><span style={{ color: C.g3 }}>›</span><span style={{ cursor: "pointer", color: view === "apto" ? C.or : C.bk, fontWeight: 500 }} onClick={() => { setView("obra"); setSelPiso(null); setSelApto(null); }}>{selObra.nombre}</span></>}
          {view === "apto" && <><span style={{ color: C.g3 }}>›</span><span style={{ color: C.bk }}>Apartamento</span></>}
        </div>
      )}
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${C.g2}`, background: C.wh, borderRadius: "8px 8px 0 0", padding: "4px 4px 0" }}>
        {nav.filter(n => n.r.includes(user.rol)).map(n => (
          <button key={n.k} onClick={() => setView(n.k)} style={{ background: "transparent", color: view === n.k ? C.or : C.g5, border: "none", borderBottom: view === n.k ? `2.5px solid ${C.or}` : "2.5px solid transparent", borderRadius: 0, padding: "10px 16px", cursor: "pointer", fontSize: 14, fontWeight: view === n.k ? 600 : 400, marginBottom: -2, fontFamily: "system-ui" }}>{n.l}</button>
        ))}
      </div>
      {pinM && <CambiarPin onClose={() => setPinM(false)} toast={toast} />}
    </div>
  );
}

// ── OBRAS ─────────────────────────────────────────────────
function Obras({ obras, setObras, updateObra, saveObra, user, users, avanceObra, goObra, openM, closeM, modals, toast }) {
  // ARREGLO 4: pisoInicio agregado al form
  const [form, setForm] = useState({ nombre: "", direccion: "", coordinadorId: "", pisoInicio: 1, pisos: 1, aptos: 1 });
  const [accM, setAccM] = useState(null);
  const [delM, setDelM] = useState(null);
  const [editM, setEditM] = useState(null);
  const [editF, setEditF] = useState({});
  const [genPisos, setGenPisos] = useState({ inicio: 1, cantidad: 1, aptos: 1 });
  const [buscaObra, setBuscaObra] = useState("");

  // Genera varios pisos con sus aptos de una vez, igual que al crear la obra.
  // Los pisos que ya existan se conservan.
  function generarPisos() {
    const obra = obras.find(o => o.id === editM);
    if (!obra) return;
    const inicio = Number(genPisos.inicio) || 1;
    const cuantos = Number(genPisos.cantidad) || 0;
    const porPiso = Number(genPisos.aptos) || 0;
    if (cuantos < 1 || porPiso < 1) { toast("Indica cuántos pisos y cuántos aptos por piso", "error"); return; }
    const existentes = new Set((obra.pisos || []).map(p => String(p.numero)));
    const nuevos = [];
    for (let pi = 0; pi < cuantos; pi++) {
      const numero = inicio + pi;
      if (existentes.has(String(numero))) continue;
      nuevos.push({
        id: `p${Date.now()}${pi}`, numero,
        aptos: Array.from({ length: porPiso }, (_, ai) => ({
          id: `a${Date.now()}${pi}${ai}`, numero: ai + 1,
          nombre: `${numero}${String(ai + 1).padStart(2, "0")}`,
          tipologia: "", elementos: [], instaladorAsignado: null, observaciones: "",
        })),
      });
    }
    if (!nuevos.length) { toast("Esos pisos ya existen", "error"); return; }
    updateObra(editM, o => ({ ...o, pisos: [...(o.pisos || []), ...nuevos].sort((a, b) => a.numero - b.numero) }));
    toast(`${nuevos.length} piso(s) creados`, "ok");
  }
  const SAs = users.filter(u => u.rol === ROLES.SA);

  async function crear() {
    if (!form.nombre) return;
    const inicio = Number(form.pisoInicio) || 1;
    // ARREGLO 4: pisos numerados desde pisoInicio
    const pisos = Array.from({ length: Number(form.pisos) }, (_, pi) => ({
      id: `p${Date.now()}${pi}`, numero: inicio + pi,
      aptos: Array.from({ length: Number(form.aptos) }, (_, ai) => ({
        id: `a${Date.now()}${pi}${ai}`, numero: ai + 1,
        nombre: `${inicio + pi}${String(ai + 1).padStart(2, "0")}`,
        tipologia: "", elementos: [], instaladorAsignado: null, observaciones: ""
      }))
    }));
    const n = { id: `o${Date.now()}`, nombre: form.nombre, direccion: form.direccion, coordinadorId: form.coordinadorId, pisos, estado: "activa", tipologias: [], instaladoresAutorizados: [], aptosHabilitados: {}, solicitudes: [], preciosOverride: {} };
    await saveObra(n); setObras(x => ordNom([...x, n])); setForm({ nombre: "", direccion: "", coordinadorId: "", pisoInicio: 1, pisos: 1, aptos: 1 }); closeM("nObra");
    toast("Obra creada", "ok");
  }

  async function editar() {
    if (!editF.nombre) return;
    await updateObra(editM, o => ({ ...o, ...editF }));
    toast("Obra actualizada", "ok"); setEditM(null);
  }

  async function eliminar(id) {
    await dbDel("obras", id); setObras(x => x.filter(o => o.id !== id)); setDelM(null); toast("Obra eliminada", "ok");
  }

  async function solicitar(oid) {
    updateObra(oid, o => {
      if ((o.solicitudes || []).find(s => s.userId === user.id)) return o;
      return { ...o, solicitudes: [...(o.solicitudes || []), { userId: user.id, fecha: new Date().toLocaleDateString("es-CO"), estado: "pendiente" }] };
    });
    toast("Solicitud enviada", "ok");
  }

  const conAcceso = obras.filter(o => user.rol === ROLES.SA || user.rol === ROLES.SV || user.rol === ROLES.AX || (user.rol === ROLES.IN && (o.instaladoresAutorizados || []).includes(user.id)));
  const q = buscaObra.trim().toLowerCase();
  const visibles = [...conAcceso]
    .filter(o => !q || (o.nombre || "").toLowerCase().includes(q) || (o.direccion || "").toLowerCase().includes(q))
    .sort(porNombre);
  const sinAcceso = user.rol === ROLES.IN ? obras.filter(o => !(o.instaladoresAutorizados || []).includes(user.id)) : [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>Obras <span style={{ fontSize: 14, color: C.g4, fontWeight: 500 }}>({conAcceso.length})</span></h2>
        {esOficina(user) && <Btn variant="primary" onClick={() => openM("nObra")}>+ Nueva obra</Btn>}
      </div>

      {/* Buscar una obra o ir directo a ella, sin bajar por toda la lista */}
      {conAcceso.length > 3 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <input placeholder="🔎 Buscar obra…" value={buscaObra} onChange={e => setBuscaObra(e.target.value)}
            style={{ flex: 1, minWidth: 180, padding: "9px 12px", border: `1px solid ${C.g2}`, borderRadius: 10, fontSize: 14, fontFamily: "system-ui" }} />
          <select value="" onChange={e => { const o = conAcceso.find(x => x.id === e.target.value); if (o) goObra(o); }}
            style={{ minWidth: 190, padding: "9px 12px", border: `1px solid ${C.g2}`, borderRadius: 10, fontSize: 14, fontFamily: "system-ui", background: C.wh }}>
            <option value="">Ir a una obra…</option>
            {ordNom(conAcceso).map(o => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
          {buscaObra && <Btn onClick={() => setBuscaObra("")}>Limpiar</Btn>}
        </div>
      )}
      {q && visibles.length === 0 && <p style={{ fontSize: 13, color: C.g4, marginBottom: 12 }}>Ninguna obra con ese nombre.</p>}

      {visibles.length === 0 && user.rol !== ROLES.IN && (
        <div style={{ textAlign: "center", padding: "4rem", color: C.g4, background: C.wh, borderRadius: 12, border: `1px solid ${C.g2}` }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
          <p>No hay obras</p>
          {esOficina(user) && <Btn variant="primary" onClick={() => openM("nObra")}>Crear primera obra</Btn>}
        </div>
      )}

      <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
        {visibles.map(o => {
          const av = avanceObra(o), tot = o.pisos?.reduce((a, p) => a + (p.aptos?.length || 0), 0) || 0;
          const coord = users.find(u => u.id === o.coordinadorId);
          const pend = (o.solicitudes || []).filter(s => s.estado === "pendiente").length;
          return (
            <div key={o.id} style={{ ...card, cursor: "pointer", transition: "border-color .15s,box-shadow .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.or; e.currentTarget.style.boxShadow = `0 4px 20px rgba(249,115,22,.12)`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.g2; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,.06)"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }} onClick={() => goObra(o)}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 2, color: C.bk }}>{o.nombre}</div>
                  <div style={{ fontSize: 13, color: C.g5 }}>{o.direccion}</div>
                  {coord && <div style={{ fontSize: 12, color: C.or, marginTop: 3, fontWeight: 600 }}>👤 {coord.nombre}</div>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {pend > 0 && esOficina(user) && <span onClick={e => { e.stopPropagation(); setAccM(o.id); }} style={{ ...bdg("amber"), cursor: "pointer" }}>{pend} sol.</span>}
                  <span style={bdg("green")}>{o.estado}</span>
                  {esOficina(user) && <>
                    <button onClick={e => { e.stopPropagation(); setEditF({ nombre: o.nombre, direccion: o.direccion, coordinadorId: o.coordinadorId || "" }); setEditM(o.id); }} style={{ ...bdg("gray"), cursor: "pointer" }}>✎</button>
                    <button onClick={e => { e.stopPropagation(); setAccM(o.id); }} style={{ ...bdg("gray"), cursor: "pointer" }}>👷</button>
                    <button onClick={e => { e.stopPropagation(); setDelM(o.id); }} style={{ ...bdg("red"), cursor: "pointer" }}>🗑</button>
                  </>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 16, fontSize: 13, alignItems: "center" }} onClick={() => goObra(o)}>
                <span style={{ color: C.g5, fontWeight: 500 }}>{o.pisos?.length || 0} pisos · {tot} aptos</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ color: C.g4, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>Avance</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: av === 100 ? C.gn : C.or }}>{av}%</span>
                  </div>
                  <div style={{ height: 8, background: C.g1, borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${av}%`, background: av === 100 ? C.gn : C.or, borderRadius: 10, transition: "width .4s" }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {user.rol === ROLES.IN && sinAcceso.length > 0 && (
        <div>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.g5 }}>Obras disponibles</h3>
          {sinAcceso.map(o => {
            const sol = o.solicitudes?.find(s => s.userId === user.id);
            return <div key={o.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{o.nombre}</div><div style={{ fontSize: 13, color: C.g5 }}>{o.direccion}</div></div>
              {!sol && <Btn onClick={() => solicitar(o.id)}>Solicitar acceso</Btn>}
              {sol?.estado === "pendiente" && <span style={bdg("amber")}>Pendiente</span>}
              {sol?.estado === "rechazado" && <span style={bdg("red")}>Denegado</span>}
            </div>;
          })}
        </div>
      )}


      {editM && <Modal title="Editar obra" onClose={() => setEditM(null)} wide>
  <Inp label="Nombre" value={editF.nombre} onChange={e => setEditF(f => ({ ...f, nombre: e.target.value }))} />
  <Inp label="Dirección" value={editF.direccion} onChange={e => setEditF(f => ({ ...f, direccion: e.target.value }))} />
  <Sel label="Coordinador" value={editF.coordinadorId} onChange={e => setEditF(f => ({ ...f, coordinadorId: e.target.value }))}>
    <option value="">— Sin asignar —</option>{SAs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
  </Sel>

  <div style={{ borderTop: `1px solid ${C.g2}`, paddingTop: 14, marginTop: 4, marginBottom: 14 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: C.g5, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Pisos y apartamentos</div>
    <div style={{ display: "grid", gap: 8, maxHeight: 300, overflowY: "auto", marginBottom: 12 }}>
      {(obras.find(o => o.id === editM)?.pisos || []).map(p => (
        <div key={p.id} style={{ padding: "10px 14px", background: C.g0, border: `1px solid ${C.g2}`, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Piso {p.numero}</div>
            <button onClick={() => {
              const obra = obras.find(o => o.id === editM);
              const pisoTieneData = p.aptos?.some(a => a.elementos?.some(e => e.completado));
              if (pisoTieneData) { toast("No se puede eliminar: tiene instalaciones registradas", "error"); return; }
              updateObra(editM, o => ({ ...o, pisos: o.pisos.filter(x => x.id !== p.id) }));
            }} style={{ ...bdg("red"), cursor: "pointer", fontSize: 11 }}>🗑 Eliminar piso</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            {p.aptos?.map(a => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 4, background: C.wh, border: `1px solid ${C.g2}`, borderRadius: 6, padding: "3px 8px", fontSize: 12 }}>
                <span>{a.nombre}</span>
                <button onClick={() => {
                  if (a.elementos?.some(e => e.completado)) { toast("Apto con instalaciones, no se puede eliminar", "error"); return; }
                  updateObra(editM, o => ({ ...o, pisos: o.pisos.map(x => x.id !== p.id ? x : { ...x, aptos: x.aptos.filter(z => z.id !== a.id) }) }));
                }} style={{ background: "none", border: "none", cursor: "pointer", color: C.rd, fontWeight: 700, fontSize: 13, padding: 0 }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={() => {
            updateObra(editM, o => ({ ...o, pisos: o.pisos.map(x => {
              if (x.id !== p.id) return x;
              const n = x.aptos.length + 1;
              return { ...x, aptos: [...x.aptos, { id: `a${Date.now()}`, numero: n, nombre: `${x.numero}${String(n).padStart(2, "0")}`, tipologia: "", elementos: [], instaladorAsignado: null, observaciones: "" }] };
            }) }));
          }} style={{ ...bdg("orange"), cursor: "pointer", fontSize: 11 }}>+ Apto</button>
        </div>
      ))}
    </div>
    <button onClick={() => {
      const obra = obras.find(o => o.id === editM);
      const pisos = obra?.pisos || [];
      const ultimoPiso = pisos.length > 0 ? Math.max(...pisos.map(p => p.numero)) : 0;
      const nuevoPiso = { id: `p${Date.now()}`, numero: ultimoPiso + 1, aptos: [] };
      updateObra(editM, o => ({ ...o, pisos: [...o.pisos, nuevoPiso] }));
    }} style={{ ...bdg("green"), cursor: "pointer" }}>+ Agregar piso</button>

    <div style={{ marginTop: 14, padding: "12px 14px", background: C.g0, border: `1px solid ${C.g2}`, borderRadius: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.g5, marginBottom: 10 }}>CREAR VARIOS PISOS DE UNA VEZ</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
        <Inp label="Piso inicial" type="number" min="1" value={genPisos.inicio}
          onChange={e => setGenPisos(g => ({ ...g, inicio: e.target.value }))} />
        <Inp label="Cantidad de pisos" type="number" min="1" value={genPisos.cantidad}
          onChange={e => setGenPisos(g => ({ ...g, cantidad: e.target.value }))} />
        <Inp label="Aptos por piso" type="number" min="1" value={genPisos.aptos}
          onChange={e => setGenPisos(g => ({ ...g, aptos: e.target.value }))} />
        <div style={{ marginBottom: 14 }}><Btn variant="primary" onClick={generarPisos}>Generar</Btn></div>
      </div>
      <div style={{ fontSize: 11, color: C.g4 }}>
        Ej: piso inicial 5, cantidad 21 → pisos 5 al 25. Nomenclatura: 501, 502… Los pisos que ya existan no se tocan.
      </div>
    </div>
  </div>

  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><Btn onClick={() => setEditM(null)}>Cancelar</Btn><Btn variant="primary" onClick={editar}>Guardar</Btn></div>
</Modal>}

      {delM && <Modal title="Eliminar obra" onClose={() => setDelM(null)}>
        <p style={{ fontSize: 14, color: C.g9, marginBottom: 20 }}>¿Eliminar esta obra? Todos los datos se perderán. Esta acción no se puede deshacer.</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><Btn onClick={() => setDelM(null)}>Cancelar</Btn><Btn variant="danger" onClick={() => eliminar(delM)}>Sí, eliminar</Btn></div>
      </Modal>}

      {accM && <ModalAccesos obraId={accM} obras={obras} users={users} updateObra={updateObra} toast={toast} onClose={() => setAccM(null)} />}

      {modals.nObra && <Modal title="Nueva obra" onClose={() => closeM("nObra")}>
        <Inp label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Conjunto El Prado" />
        <Inp label="Dirección" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
        <Sel label="Coordinador responsable" value={form.coordinadorId} onChange={e => setForm(f => ({ ...f, coordinadorId: e.target.value }))}>
          <option value="">— Seleccionar —</option>{SAs.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Sel>
        {/* ARREGLO 4: campo piso inicial */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Inp label="Piso inicial" type="number" min="1" max="50" value={form.pisoInicio} onChange={e => setForm(f => ({ ...f, pisoInicio: e.target.value }))} />
          <Inp label="Cantidad de pisos" type="number" min="1" max="50" value={form.pisos} onChange={e => setForm(f => ({ ...f, pisos: e.target.value }))} />
          <Inp label="Aptos por piso" type="number" min="1" max="20" value={form.aptos} onChange={e => setForm(f => ({ ...f, aptos: e.target.value }))} />
        </div>
        <p style={{ fontSize: 12, color: C.g4, margin: "-8px 0 12px" }}>
          Ej: piso inicial 3, cantidad 10 → pisos 3 al 12. Nomenclatura: 301, 302…
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><Btn onClick={() => closeM("nObra")}>Cancelar</Btn><Btn variant="primary" onClick={crear}>Crear</Btn></div>
      </Modal>}
    </div>
  );
}

// ── Modal Accesos ─────────────────────────────────────────
function ModalAccesos({ obraId, obras, users, updateObra, toast, onClose }) {
  const ob = obras.find(o => o.id === obraId) || {};
  const INs = users.filter(u => u.rol === ROLES.IN);
  const [instSel, setInstSel] = useState(null);
  const pends = (ob.solicitudes || []).filter(s => s.estado === "pendiente");
  const aptosHab = ob.aptosHabilitados || {};
  const todosAptos = ob.pisos?.flatMap(p => p.aptos?.map(a => ({ ...a, pisoNum: p.numero, pisoId: p.id })) || []) || [];

  function toggleApto(instId, aptoId) {
    updateObra(obraId, o => {
      const ah = { ...(o.aptosHabilitados || {}) };
      const lista = ah[instId] || [];
      ah[instId] = lista.includes(aptoId) ? lista.filter(x => x !== aptoId) : [...lista, aptoId];
      return { ...o, aptosHabilitados: ah };
    });
  }

  function toggleInst(instId) {
    updateObra(obraId, o => {
      const a = o.instaladoresAutorizados || [];
      const nuevo = a.includes(instId) ? a.filter(i => i !== instId) : [...a, instId];
      const ah = { ...(o.aptosHabilitados || {}) };
      if (!nuevo.includes(instId)) delete ah[instId];
      return { ...o, instaladoresAutorizados: nuevo, aptosHabilitados: ah };
    });
  }

  return <Modal title={`Accesos — ${ob.nombre}`} onClose={onClose} wide>
    {pends.length > 0 && <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#B45309" }}>Solicitudes pendientes</div>
      {pends.map(s => {
        const inst = users.find(u => u.id === s.userId);
        return <div key={s.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.amL, border: "1px solid #FDE68A", borderRadius: 10, marginBottom: 8 }}>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{inst?.nombre}</div><div style={{ fontSize: 12, color: C.g5 }}>{s.fecha}</div></div>
          <Btn variant="success" onClick={() => { updateObra(obraId, o => ({ ...o, solicitudes: (o.solicitudes || []).map(x => x.userId === s.userId ? { ...x, estado: "aprobado" } : x), instaladoresAutorizados: [...new Set([...(o.instaladoresAutorizados || []), s.userId])] })); toast(`Aprobado ${inst?.nombre}`, "ok"); }}>Aprobar</Btn>
          <Btn variant="danger" onClick={() => updateObra(obraId, o => ({ ...o, solicitudes: (o.solicitudes || []).map(x => x.userId === s.userId ? { ...x, estado: "rechazado" } : x) }))}>Rechazar</Btn>
        </div>;
      })}
    </div>}

    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.bk }}>Instaladores</div>
    <div style={{ display: "grid", gap: 8, maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
      {INs.map(inst => {
        const aut = (ob.instaladoresAutorizados || []).includes(inst.id);
        const numAptos = (aptosHab[inst.id] || []).length;
        return <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: aut ? C.gnL : C.g0, border: `1px solid ${aut ? "#BBF7D0" : C.g2}`, borderRadius: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 50, background: aut ? C.gn : C.g3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: C.wh, flexShrink: 0 }}>{inst.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{inst.nombre}</div>
            <div style={{ fontSize: 12, color: C.g5 }}>C.C. {inst.cedula || "—"}</div>
            {aut && <div style={{ fontSize: 11, color: C.or, fontWeight: 600 }}>{numAptos > 0 ? `${numAptos} apto(s) habilitado(s)` : "Sin aptos habilitados aún"}</div>}
          </div>
          {aut && <button onClick={() => setInstSel(instSel === inst.id ? null : inst.id)} style={{ ...bdg("orange"), cursor: "pointer" }}>🏠 Aptos</button>}
          <button onClick={() => toggleInst(inst.id)} style={{ ...bdg(aut ? "red" : "green"), cursor: "pointer" }}>{aut ? "Revocar" : "Dar acceso"}</button>
        </div>;
      })}
    </div>

    {instSel && (() => {
      const inst = users.find(u => u.id === instSel);
      const habilitados = aptosHab[instSel] || [];
      return <div style={{ background: C.orL, border: `1px solid ${C.orM}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: C.orD }}>Aptos habilitados para {inst?.nombre.split(" ")[0]}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 8, maxHeight: 260, overflowY: "auto" }}>
          {todosAptos.map(a => {
            const hab = habilitados.includes(a.id);
            const tomado = a.instaladorAsignado && a.instaladorAsignado !== instSel;
            return <button key={a.id} disabled={!!tomado} onClick={() => toggleApto(instSel, a.id)} style={{ padding: "8px 4px", borderRadius: 8, border: `1.5px solid ${hab ? C.or : tomado ? C.rd : C.g2}`, background: hab ? C.or : tomado ? C.rdL : C.wh, color: hab ? C.wh : tomado ? C.rd : C.bk, fontSize: 12, fontWeight: hab ? 700 : 400, cursor: tomado ? "not-allowed" : "pointer", opacity: tomado ? 0.5 : 1, textAlign: "center" }}>
              {a.nombre || `${a.pisoNum}${String(a.numero).padStart(2, "0")}`}
              {tomado && <div style={{ fontSize: 9 }}>ocupado</div>}
            </button>;
          })}
        </div>
        <div style={{ fontSize: 12, color: C.orD, marginTop: 8 }}>{habilitados.length} seleccionado(s)</div>
      </div>;
    })()}

    <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn onClick={onClose}>Cerrar</Btn></div>
  </Modal>;
}

// ── OBRA DETALLE ──────────────────────────────────────────
function Obra({ obra, obras, updateObra, user, avanceApto, detListo, elems, users, goApto, openM, closeM, modals, toast, getPrecio }) {
  const [tipForm, setTipForm] = useState({ nombre: "", eids: [], cantidades: {}, precios: {}, preciosDet: {} });
  const [editTip, setEditTip] = useState(null);
  const [delTipId, setDelTipId] = useState(null);
  const [cambioMasivo, setCambioMasivo] = useState(null);   // { desde, hacia }
  const [verGenerales, setVerGenerales] = useState(false);  // elementos viejos del catálogo global
  const [buscaEl, setBuscaEl] = useState("");
  const [repModal, setRepModal] = useState(false);
  const [repSel, setRepSel] = useState({ reglas: [] });
  const [asign, setAsign] = useState(null);
  const [accModal, setAccModal] = useState(false);
  const [pisoEditM, setPisoEditM] = useState(null);
  const [preciosM, setPreciosM] = useState(false);
  const [precCorte, setPrecCorte] = useState("");
  const [precTmp, setPrecTmp] = useState({});
  const [vistaInst, setVistaInst] = useState(null);
  const [nuevoPisoM, setNuevoPisoM] = useState(false);
const [nuevoPisoF, setNuevoPisoF] = useState({ numero: "", aptos: 1 });

  const cur = obras.find(o => o.id === obra.id) || obra;
  const [repNom, setRepNom] = useState(null);   // { pisoId, desde, hasta, crear }

  // Copia la nomenclatura de aptos de un piso a un rango de pisos.
  // Ej: piso 5 con 501, 502A, 502B → piso 7 queda con 701, 702A, 702B.
  function replicarNomenclatura() {
    const origen = (cur?.pisos || []).find(p => p.id === repNom.pisoId);
    if (!origen) return;
    const desde = Number(repNom.desde), hasta = Number(repNom.hasta);
    if (!desde || !hasta || hasta < desde) { toast("Revisa el rango de pisos", "error"); return; }

    // Sufijo de cada apto: lo que queda al quitarle el número del piso al nombre
    const sufijos = (origen.aptos || []).map(a => {
      const nom = String(a.nombre || "");
      const pref = String(origen.numero);
      return nom.startsWith(pref) ? nom.slice(pref.length) : nom;
    });
    if (!sufijos.length) { toast("Ese piso no tiene aptos", "error"); return; }

    let creados = 0, tocados = 0;
    updateObra(cur.id, o => {
      const pisos = [...(o.pisos || [])];
      for (let n = desde; n <= hasta; n++) {
        if (n === origen.numero) continue;
        let piso = pisos.find(p => String(p.numero) === String(n));
        if (!piso) {
          if (!repNom.crear) continue;
          piso = { id: `p${Date.now()}${n}`, numero: n, aptos: [] };
          pisos.push(piso); creados++;
        }
        const existentes = piso.aptos || [];
        const nuevos = sufijos.map((suf, i) => {
          const nombre = `${n}${suf}`;
          const ya = existentes.find(a => String(a.nombre) === nombre);
          return ya || {
            id: `a${Date.now()}${n}${i}`, numero: i + 1, nombre,
            tipologia: "", elementos: [], instaladorAsignado: null, observaciones: "",
          };
        });
        // los aptos que ya tenían trabajo marcado no se tocan
        const conDatos = existentes.filter(a =>
          !nuevos.some(x => x.id === a.id) && (a.elementos?.some(e => e.completado || e.detCompletado)));
        piso.aptos = [...nuevos, ...conDatos];
        tocados++;
      }
      return { ...o, pisos: pisos.sort((a, b) => a.numero - b.numero) };
    });
    toast(`Nomenclatura replicada en ${tocados} piso(s)${creados ? `, ${creados} creados` : ""}`, "ok");
    setRepNom(null);
  }

  const tips = ordNom(cur.tipologias);
  // Se agrupa por el número real del apartamento: lo que queda al quitarle el
  // número del piso al nombre (601, 615… → 01, 15). Así, si la obra va del 15 al 21,
  // eso es lo que se ve, y no "Apto x1, x2, x3".
  const sufijoApto = (a, p) => {
    const nom = String(a?.nombre || "");
    const pref = String(p?.numero ?? "");
    return pref && nom.startsWith(pref) && nom.length > pref.length ? nom.slice(pref.length) : String(a?.numero ?? "");
  };
  const aptosPorSufijo = (suf) => (cur.pisos || []).flatMap(p => (p.aptos || []).filter(a => sufijoApto(a, p) === suf).map(a => a.nombre || a.numero));
  const nums = [...new Set((cur.pisos || []).flatMap(p => (p.aptos || []).map(a => sufijoApto(a, p))))]
    .sort((a, b) => (Number(a) - Number(b)) || String(a).localeCompare(String(b)));
  const cortes = getCorteFechas();
  const instsActivos = (cur.instaladoresAutorizados || []).map(id => users.find(u => u.id === id)).filter(Boolean);

  const abrirNueva = () => { setEditTip(null); setTipForm({ nombre: "", eids: [], cantidades: {}, precios: {}, preciosDet: {} }); openM("tip"); };
  const abrirEditar = t => {
    const prefijo = `tip__${t.id}__`;
    const prefijoDet = `det__tip__${t.id}__`;      // el detallado usa las mismas llaves con det__
    const precios = {}, preciosDet = {};
    Object.entries(cur.preciosOverride || {}).forEach(([k, v]) => {
      if (k.startsWith(prefijoDet)) preciosDet[k.slice(prefijoDet.length)] = v;
      else if (k.startsWith(prefijo)) precios[k.slice(prefijo.length)] = v;
    });
    setEditTip(t.id);
    setTipForm({ nombre: t.nombre, eids: [...t.elementoIds], cantidades: { ...(t.cantidades || {}) }, precios, preciosDet });
    openM("tip");
  };
const [dupTip, setDupTip] = useState(null);
const [dupPrecios, setDupPrecios] = useState({});
  async function guardarTip() {
    if (!tipForm.nombre) return;
    // Aplica los precios por tipología sobre preciosOverride: setea key tip__<tipId>__<eid>
    // si hay un valor numérico válido; la elimina si el campo quedó vacío (vuelve al precio base/corte).
    const aplicarPrecios = (prev, tipId) => {
      const po = { ...(prev || {}) };
      const poner = (key, raw) => {
        const num = (raw === "" || raw === null || raw === undefined) ? NaN : Number(raw);
        if (Number.isFinite(num)) po[key] = num;
        else delete po[key];
      };
      tipForm.eids.forEach(eid => {
        poner(`tip__${tipId}__${eid}`, tipForm.precios?.[eid]);
        poner(`det__tip__${tipId}__${eid}`, tipForm.preciosDet?.[eid]);   // precio de detallado
      });
      return po;
    };
    if (editTip) {
      updateObra(obra.id, o => ({
        ...o,
        tipologias: (o.tipologias || []).map(t => t.id === editTip ? { ...t, nombre: tipForm.nombre, elementoIds: tipForm.eids, cantidades: tipForm.cantidades || {} } : t),
        preciosOverride: aplicarPrecios(o.preciosOverride, editTip),
        pisos: o.pisos.map(p => ({
          ...p, aptos: p.aptos.map(a => {
            const esPrincipal = a.tipologia === editTip;
            const esExtra = (a.tipologiasExtra || []).includes(editTip);
            if (!esPrincipal && !esExtra) return a;
            let na = a;
            // Tipología principal: sobrescribe cantidades (incluye completados), conserva completado/instaladorId/fecha.
            // PENDIENTE: revisar si debe sobrescribir cantidades de elementos ya completados/detallados.
            // replicar() ya NO lo hace (respeta lo instalado); aquí sigue sobrescribiendo, así que
            // editar una tipología puede cambiar el valor de trabajo ya ejecutado. Decisión aplazada.
            if (esPrincipal) {
              na = { ...na, elementos: tipForm.eids.map(eid => {
                const ex = na.elementos?.find(e => e.elementoId === eid);
                const cantidad = tipForm.cantidades?.[eid] || 1;
                return ex ? { ...ex, cantidad } : { elementoId: eid, completado: false, instaladorId: null, fecha: null, cantidad };
              }) };
            }
            // Tipología extra: igual, sobre los elementosExtra de esta tipología (los de otras no se tocan).
            if (esExtra) {
              const otros = (na.elementosExtra || []).filter(e => e.tipologiaId !== editTip);
              const deEsta = tipForm.eids.map(eid => {
                const ex = (na.elementosExtra || []).find(e => e.elementoId === eid && e.tipologiaId === editTip);
                const cantidad = tipForm.cantidades?.[eid] || 1;
                return ex ? { ...ex, cantidad } : { elementoId: eid, completado: false, instaladorId: null, fecha: null, cantidad, tipologiaId: editTip };
              });
              na = { ...na, elementosExtra: [...otros, ...deEsta] };
            }
            return na;
          })
        }))
      }));
    } else {
      const t = { id: `t${Date.now()}`, nombre: tipForm.nombre, elementoIds: tipForm.eids, cantidades: tipForm.cantidades || {} };
      updateObra(obra.id, o => ({ ...o, tipologias: [...(o.tipologias || []), t], preciosOverride: aplicarPrecios(o.preciosOverride, t.id) }));
    }
    toast("Tipología guardada", "ok"); closeM("tip"); setEditTip(null);
  }

  function eliminarTip(tipId) {
    updateObra(obra.id, o => ({
      ...o,
      tipologias: (o.tipologias || []).filter(t => t.id !== tipId),
      pisos: o.pisos.map(p => ({ ...p, aptos: p.aptos.map(a => a.tipologia === tipId ? { ...a, tipologia: "", elementos: [] } : a) }))
    }));
    toast("Tipología eliminada", "ok"); setDelTipId(null);
  }

  async function asignarTip(pisoId, aptoId, tipId) {
  const tip = tips.find(t => t.id === tipId);
  const elsNuevos = (tip?.elementoIds || []).map(eid => ({ elementoId: eid, completado: false, instaladorId: null, fecha: null, cantidad: tip?.cantidades?.[eid] || 1, tipologiaId: tipId }));
  updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== pisoId ? p : { ...p, aptos: p.aptos.map(a => {
    if (a.id !== aptoId) return a;
    if (!a.tipologia) return { ...a, tipologia: tipId, elementos: elsNuevos };
    // Si es la tipología principal, restaurar elementos faltantes sin borrar completados
    if (a.tipologia === tipId) {
      const existIds = new Set((a.elementos || []).map(e => e.elementoId));
      const faltantes = elsNuevos.filter(e => !existIds.has(e.elementoId));
      if (!faltantes.length) return a;
      return { ...a, elementos: [...(a.elementos || []), ...faltantes] };
    }
    // Si ya es tipología extra, restaurar faltantes en extra
    if ((a.tipologiasExtra || []).includes(tipId)) {
      const existIdsExtra = new Set((a.elementosExtra || []).filter(e => e.tipologiaId === tipId).map(e => e.elementoId));
      const faltantes = elsNuevos.filter(e => !existIdsExtra.has(e.elementoId));
      if (!faltantes.length) return a;
      return { ...a, elementosExtra: [...(a.elementosExtra || []), ...faltantes] };
    }
    return { ...a, tipologiasExtra: [...(a.tipologiasExtra || []), tipId], elementosExtra: [...(a.elementosExtra || []), ...elsNuevos] };
  }) }) }));
  toast("Tipología asignada", "ok");
  setAsign(null);
}

  // Cambia una tipología por otra en TODOS los aptos que la tengan.
  // Los aptos quedan con los elementos de la tipología nueva, sin marcar.
  function reemplazarTipologia(desdeId, haciaId) {
    const tipNueva = tips.find(t => t.id === haciaId);
    if (!tipNueva) return;
    let n = 0;
    updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => ({ ...p, aptos: p.aptos.map(a => {
      if (a.tipologia !== desdeId) return a;
      n++;
      return { ...a, tipologia: haciaId, elementos: (tipNueva.elementoIds || []).map(eid => ({
        elementoId: eid, completado: false, instaladorId: null, fecha: null,
        cantidad: tipNueva.cantidades?.[eid] || 1,
      })) };
    }) })) }));
    toast(`${n} apartamento(s) cambiados a ${tipNueva.nombre}`, "ok");
    setCambioMasivo(null);
  }

  function quitarTip(pisoId, aptoId, tipId) {
  updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== pisoId ? p : { ...p, aptos: p.aptos.map(a => {
    if (a.id !== aptoId) return a;
    // Si es la tipología principal
    if (a.tipologia === tipId) return { ...a, tipologia: "", elementos: [] };
    // Si es una tipología extra
    return { ...a, tipologiasExtra: (a.tipologiasExtra || []).filter(t => t !== tipId), elementosExtra: (a.elementosExtra || []).filter(e => e.tipologiaId !== tipId) };
  }) }) }));
}

  async function replicar() {
    let cnt = 0;
    updateObra(obra.id, o => ({
      ...o, pisos: o.pisos.map(p => ({
        ...p, aptos: p.aptos.map(a => {
          const reg = repSel.reglas.find(r => r.sufijo === sufijoApto(a, p) && r.tipId);
          if (!reg) return a;
          // Del catálogo guardado en la obra, no de `tips` (snapshot del render) ni de
          // tipForm (buffer del modal): tipForm traía las cantidades de la última
          // tipología abierta, no las de reg.tipId.
          const tip = (o.tipologias || []).find(t => t.id === reg.tipId);
          if (!tip) return a;
          cnt++;
          const ids = new Set(tip.elementoIds || []);
          const delTip = (tip.elementoIds || []).map(eid => {
            const ex = a.elementos?.find(e => e.elementoId === eid);
            const cantidad = tip.cantidades?.[eid] || 1;
            if (!ex) return { elementoId: eid, completado: false, instaladorId: null, fecha: null, cantidad };
            // Ya instalado o detallado → la cantidad es plata comprometida: no se toca.
            // Se corrige aparte, con revisión humana (ver diagnosticarCantidades).
            if (ex.completado || ex.detCompletado) return ex;
            return { ...ex, cantidad };
          });
          // Fuera de la tipología nueva pero con trabajo hecho: se conservan al final.
          // Borrarlos perdería instalación/detallado ya ejecutado (y posiblemente pagado).
          // Se sella la tipología bajo la que se ejecutó: getPrecio resuelve con
          // `el.tipologiaId || a.tipologia` (líneas 2191/2808) y, al cambiar a.tipologia,
          // sin el sello pasarían a cotizarse con los overrides tip__<nueva>__<eid>.
          const huerfanos = (a.elementos || [])
            .filter(e => !ids.has(e.elementoId) && (e.completado || e.detCompletado))
            .map(e => ({ ...e, tipologiaId: e.tipologiaId || a.tipologia }));
          return { ...a, tipologia: tip.id, elementos: [...delTip, ...huerfanos] };
        })
      }))
    }));
    toast(`Replicadas en ${cnt} apto(s)`, "ok"); setRepModal(false); setRepSel({ reglas: [] });
  }

  function asignarInst(pisoId, aptoId, instId) {
  updateObra(obra.id, o => {
    const ah = { ...(o.aptosHabilitados || {}) };
    if (instId) {
      const lista = ah[instId] || [];
      if (!lista.includes(aptoId)) ah[instId] = [...lista, aptoId];
    }
    return {
      ...o,
      aptosHabilitados: ah,
      pisos: o.pisos.map(p => p.id !== pisoId ? p : {
        ...p, aptos: p.aptos.map(a => {
          if (a.id !== aptoId) return a;
          const actuales = a.instaladoresAsignados || (a.instaladorAsignado ? [a.instaladorAsignado] : []);
          if (!instId) return { ...a, instaladorAsignado: null, instaladoresAsignados: [] };
          if (actuales.includes(instId)) return a;
          const nuevos = [...actuales, instId].slice(0, 5);
          return { ...a, instaladorAsignado: nuevos[0], instaladoresAsignados: nuevos };
        })
      })
    };
  });
  toast(instId ? "Instalador asignado" : "Instaladores removidos", "ok");
}

  const agregarApto = pid => updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => { if (p.id !== pid) return p; const n = p.aptos.length + 1; return { ...p, aptos: [...p.aptos, { id: `a${Date.now()}`, numero: n, nombre: `${p.numero}${String(n).padStart(2, "0")}`, tipologia: "", elementos: [], instaladorAsignado: null, observaciones: "" }] }; }) }));
  const eliminarApto = (pid, aid) => updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== pid ? p : { ...p, aptos: p.aptos.filter(a => a.id !== aid) }) }));
  const renombrarApto = (pid, aid, nom) => updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== pid ? p : { ...p, aptos: p.aptos.map(a => a.id !== aid ? a : { ...a, nombre: nom }) }) }));

  function guardarPrecios() {
    if (!precCorte) return;
    updateObra(obra.id, o => ({ ...o, preciosOverride: { ...(o.preciosOverride || {}), ...Object.fromEntries(Object.entries(precTmp).map(([eid, v]) => [`${precCorte}__${eid}`, Number(v)])) } }));
    toast("Precios guardados", "ok"); setPreciosM(false); setPrecTmp({});
  }

  // ARREGLO 1: Vista instalador — puede entrar a aptos habilitados aunque no tenga instaladorAsignado
  if (user.rol === ROLES.IN) {
    const aptosHab = (cur.aptosHabilitados || {})[user.id] || [];
    const todosAptos = cur.pisos?.flatMap(p => p.aptos?.map(a => ({ ...a, pisoId: p.id, pisoNum: p.numero })) || []) || [];
    const misHabilitados = todosAptos.filter(a => aptosHab.includes(a.id));
    // Tomados = habilitados donde el instalador es este usuario
    const misTomados = misHabilitados.filter(a => (a.instaladoresAsignados || (a.instaladorAsignado ? [a.instaladorAsignado] : [])).includes(user.id));
const disponibles = misHabilitados.filter(a => {
  const asignados = a.instaladoresAsignados || (a.instaladorAsignado ? [a.instaladorAsignado] : []);
  return asignados.length === 0 && a.tipologia;
});

    const tomar = (pisoId, aptoId) => {
      updateObra(cur.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== pisoId ? p : { ...p, aptos: p.aptos.map(a => a.id !== aptoId ? a : { ...a, instaladorAsignado: user.id }) }) }));
      toast("Apartamento tomado", "ok");
    };
    const liberar = (pisoId, aptoId) => {
      updateObra(cur.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== pisoId ? p : { ...p, aptos: p.aptos.map(a => a.id !== aptoId ? a : { ...a, instaladorAsignado: null }) }) }));
      toast("Apartamento liberado", "ok");
    };

    return (
      <div>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>{obra.nombre}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.g5 }}>{obra.direccion}</p>
        </div>
        {misTomados.length > 0 && <>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.g5, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Mis apartamentos</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginBottom: 24 }}>
            {misTomados.map(a => {
              const av = avanceApto(a); const tip = tips.find(t => t.id === a.tipologia);
              return <div key={a.id} onClick={() => goApto(a, cur.pisos?.find(p => p.id === a.pisoId))} style={{ ...card, cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.borderColor = C.or} onMouseLeave={e => e.currentTarget.style.borderColor = C.g2}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{a.nombre}</div>
                {tip && <div style={{ fontSize: 11, color: C.g5, marginBottom: 6 }}>{tip.nombre}</div>}
                <div style={{ height: 5, background: C.g1, borderRadius: 10, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", width: `${av}%`, background: av === 100 ? C.gn : C.or, borderRadius: 10 }} />
                </div>
                <div style={{ fontSize: 11, color: C.g4, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  {av}%
                  {detListo(a) && <span title="Detallado terminado" style={{ color: C.gnD, fontWeight: 800 }}>✓</span>}
                </div>
                <button onClick={e => { e.stopPropagation(); liberar(a.pisoId, a.id); }} style={{ ...bdg("red"), cursor: "pointer", fontSize: 10, width: "100%", textAlign: "center" }}>Liberar</button>
              </div>;
            })}
          </div>
        </>}
        {disponibles.length > 0 && <>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.g5, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Aptos habilitados disponibles</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginBottom: 24 }}>
            {disponibles.map(a => {
              const tip = tips.find(t => t.id === a.tipologia);
              return <div key={a.id} style={{ ...card, background: C.orL, border: `1px dashed ${C.or}` }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: C.orD }}>{a.nombre}</div>
                {tip && <div style={{ fontSize: 11, color: C.g5, marginBottom: 8 }}>{tip.nombre}</div>}
                <button onClick={() => tomar(a.pisoId, a.id)} style={{ ...bV.primary, width: "100%", fontSize: 11, padding: "6px", borderRadius: 6, cursor: "pointer", fontFamily: "system-ui" }}>Tomar apto</button>
              </div>;
            })}
          </div>
        </>}
        {/* ARREGLO 1: también muestra aptos habilitados con instalador asignado a otro (solo lectura) */}
        {(() => {
          const otrosOcupados = misHabilitados.filter(a => a.instaladorAsignado && a.instaladorAsignado !== user.id);
          if (!otrosOcupados.length) return null;
          return <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.g5, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Ocupados por otro instalador</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginBottom: 24 }}>
              {otrosOcupados.map(a => <div key={a.id} style={{ ...card, background: C.g1, border: `1px solid ${C.g2}`, opacity: 0.7 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: C.g5 }}>{a.nombre}</div>
                <div style={{ fontSize: 10, color: C.rd }}>Ocupado</div>
              </div>)}
            </div>
          </>;
        })()}
        {misHabilitados.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: C.g4, background: C.wh, borderRadius: 12, border: `1px solid ${C.g2}` }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏠</div>
            <p>El administrador aún no te ha habilitado apartamentos en esta obra.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>{obra.nombre}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.g5 }}>{obra.direccion}</p>
        </div>
        {esOficina(user) && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={() => { setPrecTmp({}); setPrecCorte(""); setPreciosM(true); }}>💰 Precios</Btn>
          <Btn onClick={() => setAccModal(true)}>👷 Accesos</Btn>
          <Btn onClick={() => setRepModal(true)}>Replicar</Btn>
          <Btn onClick={() => { setNuevoPisoF({ numero: "", aptos: 1 }); setNuevoPisoM(true); }}>+ Piso</Btn>
          <Btn variant="primary" onClick={abrirNueva}>+ Tipología</Btn>
        </div>}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: `2px solid ${C.g2}`, paddingBottom: 0 }}>
        <button onClick={() => setVistaInst(null)} style={{ background: "transparent", color: !vistaInst ? C.or : C.g5, border: "none", borderBottom: !vistaInst ? `2.5px solid ${C.or}` : "2.5px solid transparent", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: !vistaInst ? 600 : 400, marginBottom: -2, fontFamily: "system-ui" }}>Vista general</button>
        {instsActivos.map(i => <button key={i.id} onClick={() => setVistaInst(i.id)} style={{ background: "transparent", color: vistaInst === i.id ? C.gn : C.g5, border: "none", borderBottom: vistaInst === i.id ? `2.5px solid ${C.gn}` : "2.5px solid transparent", padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: vistaInst === i.id ? 600 : 400, marginBottom: -2, fontFamily: "system-ui" }}>{i.nombre.split(" ")[0]}</button>)}
      </div>

      {tips.length > 0 && <div style={{ marginBottom: 18, padding: "12px 16px", background: C.wh, borderRadius: 10, border: `1px solid ${C.g2}` }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: C.g5, textTransform: "uppercase", letterSpacing: ".06em" }}>Tipologías</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {tips.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, ...bdg("orange") }}>
              <span>{t.nombre} · {t.elementoIds?.length || 0} elem.</span>
              {esOficina(user) && <>
                <span onClick={() => abrirEditar(t)} style={{ cursor: "pointer", fontWeight: 700 }}>✎</span>
                <span onClick={() => setDelTipId(t.id)} style={{ cursor: "pointer", fontWeight: 700, color: C.rd, marginLeft: 2 }}>🗑</span>
<span onClick={() => { setDupTip(t); setDupPrecios({}); }} style={{ cursor: "pointer", fontWeight: 700, color: C.gnD, marginLeft: 2 }}>⧉</span>
                <span title="Cambiar por otra en toda la obra" onClick={() => setCambioMasivo({ desde: t.id, hacia: "" })} style={{ cursor: "pointer", fontWeight: 700, color: C.bk, marginLeft: 2 }}>⇄</span>
              </>}
            </div>
          ))}
        </div>
      </div>}

      {cur.pisos?.map(piso => {
        const aptosV = vistaInst ? piso.aptos?.filter(a => a.instaladorAsignado === vistaInst) : piso.aptos;
        if (vistaInst && !aptosV?.length) return null;
        return (
          <div key={piso.id} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderBottom: `2px solid ${C.g1}`, paddingBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.g5, textTransform: "uppercase", letterSpacing: ".06em" }}>Piso {piso.numero}</div>
              {esOficina(user) && !vistaInst && <div style={{ display: "flex", gap: 6 }}>
  <button onClick={() => setPisoEditM(piso.id)} style={{ ...bdg("gray"), cursor: "pointer", fontSize: 11 }}>✎ Editar aptos</button>
  <button onClick={() => setRepNom({ pisoId: piso.id, desde: piso.numero + 1, hasta: piso.numero + 1, crear: true })}
    style={{ ...bdg("orange"), cursor: "pointer", fontSize: 11 }}>⧉ Replicar nomenclatura</button>
  <button onClick={() => {
    const tieneDatos = piso.aptos?.some(a => a.elementos?.some(e => e.completado));
    if (tieneDatos) { toast("No se puede eliminar: tiene instalaciones registradas", "error"); return; }
    if (window.confirm(`¿Eliminar piso ${piso.numero} y todos sus aptos?`)) {
      updateObra(obra.id, o => ({ ...o, pisos: o.pisos.filter(p => p.id !== piso.id) }));
      toast(`Piso ${piso.numero} eliminado`, "ok");
    }
  }} style={{ ...bdg("red"), cursor: "pointer", fontSize: 11 }}>🗑 Eliminar piso</button>
</div>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10 }}>
              {aptosV?.map(apto => {
                const av = avanceApto(apto);
                const tip = tips.find(t => t.id === apto.tipologia);
                const instAsig = apto.instaladorAsignado ? users.find(u => u.id === apto.instaladorAsignado) : null;
                const canEnter = apto.tipologia && instAsig;
                const habPara = Object.entries(cur.aptosHabilitados || {}).filter(([, ids]) => ids.includes(apto.id)).map(([iid]) => users.find(u => u.id === iid)?.nombre?.split(" ")[0]).filter(Boolean);
                return (
                  <div key={apto.id} onClick={() => canEnter ? goApto(apto, piso) : null} style={{ ...card, cursor: canEnter ? "pointer" : "default", padding: "10px 12px" }} onMouseEnter={e => canEnter && (e.currentTarget.style.borderColor = C.or)} onMouseLeave={e => (e.currentTarget.style.borderColor = C.g2)}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{apto.nombre || `${piso.numero}${String(apto.numero).padStart(2, "0")}`}</div>
                {(() => {
  const asignados = apto.instaladoresAsignados || (apto.instaladorAsignado ? [apto.instaladorAsignado] : []);
  if (asignados.length > 0) {
    return <div style={{ fontSize: 10, color: C.or, marginBottom: 4, fontWeight: 700 }}>👷 {asignados.map(id => users.find(u => u.id === id)?.nombre?.split(" ")[0]).filter(Boolean).join(", ")}</div>;
  }
  return habPara.length > 0 ? <div style={{ fontSize: 10, color: C.am, marginBottom: 4 }}>🔓 {habPara.join(", ")}</div> : null;
})()}
                    {esOficina(user) && apto.tipologia && (() => {
  const asignados = apto.instaladoresAsignados || (apto.instaladorAsignado ? [apto.instaladorAsignado] : []);
  const disponibles = instsActivos.filter(i => !asignados.includes(i.id));
  if (asignados.length >= 5) return null;
  return <div onClick={e => e.stopPropagation()} style={{ marginBottom: 4 }}>
    <select style={{ width: "100%", fontSize: 10, padding: "3px 4px", border: `1px solid ${C.g2}`, borderRadius: 6, color: C.g5 }} value="" onChange={e => { if (e.target.value) asignarInst(piso.id, apto.id, e.target.value); }}>
      <option value="">+ Instalador...</option>
      {disponibles.map(i => <option key={i.id} value={i.id}>{i.nombre.split(" ")[0]}</option>)}
    </select>
  </div>;
})()}
                    {tip ? (<>
                      <div style={{ fontSize: 10, color: C.g5, marginBottom: 5 }}>{tip.nombre}</div>
                      <div style={{ height: 5, background: C.g1, borderRadius: 10, overflow: "hidden", marginBottom: 4 }}>
                        <div style={{ height: "100%", width: `${av}%`, background: av === 100 ? C.gn : C.or, borderRadius: 10 }} />
                      </div>
                      <div style={{ fontSize: 10, color: C.g4, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                        {av}%
                        {detListo(apto) && <span title="Detallado terminado" style={{ color: C.gnD, fontWeight: 800 }}>✓ detallado</span>}
                      </div>
                      {user.rol !== ROLES.AX && (
                        <div style={{ display: "flex", gap: 3 }} onClick={e => e.stopPropagation()}>
                          <select style={{ fontSize: 9, padding: "2px 3px", border: `1px solid ${C.g2}`, borderRadius: 4, flex: 1, color: C.g5 }} defaultValue="" onChange={e => { if (e.target.value) asignarTip(piso.id, apto.id, e.target.value); }}>
                            <option value="">Cambiar...</option>
                            {apto.tipologia && <option value={apto.tipologia}>↺ Restaurar tipología</option>}
                            {tips.filter(t => t.id !== apto.tipologia).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                          </select>
                          <button onClick={e => { e.stopPropagation(); quitarTip(piso.id, apto.id, apto.tipologia); }} style={{ fontSize: 9, background: C.rdL, border: "1px solid #FECACA", color: C.rd, borderRadius: 4, padding: "2px 5px", cursor: "pointer" }}>✕</button>
                        </div>
                      )}
                    </>) : user.rol !== ROLES.AX ? (
                      asign === apto.id
                        ? <select style={{ width: "100%", fontSize: 10, marginTop: 4, padding: "3px", border: `1px solid ${C.g2}`, borderRadius: 6 }} onClick={e => e.stopPropagation()} onChange={e => e.target.value && asignarTip(piso.id, apto.id, e.target.value)}>
                          <option value="">Seleccionar...</option>{tips.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                        : <button onClick={e => { e.stopPropagation(); setAsign(apto.id); }} style={{ fontSize: 10, ...bdg("orange"), cursor: "pointer", marginTop: 4 }}>+ tipología</button>
                    ) : <div style={{ fontSize: 10, color: C.g4 }}>Sin asignar</div>}
                    {esOficina(user) && (() => {
  const asignados = apto.instaladoresAsignados || (apto.instaladorAsignado ? [apto.instaladorAsignado] : []);
  if (!asignados.length) return null;
  return <div onClick={e => e.stopPropagation()} style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
    {asignados.map(id => {
      const inst = users.find(u => u.id === id);
      return <button key={id} onClick={() => {
        updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => { if (a.id !== apto.id) return a; const nuevos = (a.instaladoresAsignados || [a.instaladorAsignado]).filter(x => x !== id); return { ...a, instaladorAsignado: nuevos[0] || null, instaladoresAsignados: nuevos }; }) }) }));
        toast(`${inst?.nombre?.split(" ")[0]} removido`, "ok");
      }} style={{ fontSize: 9, ...bdg("red"), cursor: "pointer", textAlign: "center" }}>✕ {inst?.nombre?.split(" ")[0]}</button>;
    })}
  </div>;
})()}
{(apto.tipologiasExtra || []).map(tipId => {
  const t = tips.find(x => x.id === tipId);
  if (!t) return null;
  return <div key={tipId} style={{ fontSize: 9, ...bdg("amber"), marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
    <span>+{t.nombre}</span>
    {esOficina(user) && <span onClick={e => { e.stopPropagation(); quitarTip(piso.id, apto.id, tipId); }} style={{ cursor: "pointer", fontWeight: 700, color: C.rd }}>×</span>}
  </div>;
})}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
{dupTip && <Modal title={`Duplicar — ${dupTip.nombre}`} onClose={() => setDupTip(null)} wide>
  <Inp label="Nombre de la nueva tipología" defaultValue={`${dupTip.nombre} — Detalle`} onChange={e => setDupTip(t => ({ ...t, nombreDup: e.target.value }))} />
  <p style={{ fontSize: 13, color: C.g5, margin: "0 0 12px" }}>Ajusta los precios para esta tipología en esta obra. Vacío = precio estándar.</p>
  <div style={{ maxHeight: 300, overflowY: "auto", display: "grid", gap: 8, marginBottom: 16 }}>
    {dupTip.elementoIds?.map(eid => {
      const elem = elems.find(e => e.id === eid);
      if (!elem) return null;
      return <div key={eid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.g0, borderRadius: 8 }}>
        <div style={{ flex: 1, fontSize: 14 }}>{elem.nombre} <span style={{ fontSize: 12, color: C.g4 }}>std: {fmt(elem.precio)}</span></div>
        <input type="number" min="0" placeholder={String(elem.precio)} value={dupPrecios[eid] ?? ""} onChange={x => setDupPrecios(p => ({ ...p, [eid]: x.target.value }))} style={{ width: 120, padding: "5px 8px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 13, textAlign: "right" }} />
      </div>;
    })}
  </div>
  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
    <Btn onClick={() => setDupTip(null)}>Cancelar</Btn>
    <Btn variant="primary" onClick={() => {
      const nuevoId = `t${Date.now()}`;
      const nombre = dupTip.nombreDup || `${dupTip.nombre} — Detalle`;
      const nuevaTip = { id: nuevoId, nombre, elementoIds: [...dupTip.elementoIds] };
      const nuevosPrecios = Object.fromEntries(Object.entries(dupPrecios).filter(([, v]) => v !== "").map(([eid, v]) => [`tip__${nuevoId}__${eid}`, Number(v)]));
      updateObra(obra.id, o => ({
        ...o,
        tipologias: [...(o.tipologias || []), nuevaTip],
        preciosOverride: { ...(o.preciosOverride || {}), ...nuevosPrecios }
      }));
      toast(`Tipología "${nombre}" creada`, "ok");
      setDupTip(null);
    }}>Crear tipología</Btn>
  </div>
</Modal>}
      {cambioMasivo && <Modal title="Cambiar tipología en toda la obra" onClose={() => setCambioMasivo(null)}>
        {(() => {
          const desde = tips.find(t => t.id === cambioMasivo.desde);
          const cuantos = cur.pisos?.reduce((n, p) => n + (p.aptos?.filter(a => a.tipologia === cambioMasivo.desde).length || 0), 0) || 0;
          return <>
            <p style={{ fontSize: 14, marginBottom: 12 }}>
              <strong>{desde?.nombre}</strong> está en <strong>{cuantos} apartamento(s)</strong>. Elegí por cuál se cambia:
            </p>
            <Sel label="Tipología nueva" value={cambioMasivo.hacia} onChange={e => setCambioMasivo(c => ({ ...c, hacia: e.target.value }))}>
              <option value="">— Seleccionar —</option>
              {tips.filter(t => t.id !== cambioMasivo.desde).map(t => <option key={t.id} value={t.id}>{t.nombre} · {t.elementoIds?.length || 0} elem.</option>)}
            </Sel>
            <div style={{ background: C.amL, border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", margin: "12px 0 16px", fontSize: 13, color: "#B45309" }}>
              ⚠️ Esos apartamentos quedan con los elementos de la tipología nueva, <strong>sin marcar</strong>.
              Lo que ya se pagó en cortes cerrados no se toca, pero lo marcado y no liquidado hay que volverlo a marcar.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Btn onClick={() => setCambioMasivo(null)}>Cancelar</Btn>
              <Btn variant="danger" disabled={!cambioMasivo.hacia} onClick={() => reemplazarTipologia(cambioMasivo.desde, cambioMasivo.hacia)}>Sí, cambiar {cuantos} apto(s)</Btn>
            </div>
          </>;
        })()}
      </Modal>}

      {delTipId && <Modal title="Eliminar tipología" onClose={() => setDelTipId(null)}>
        {(() => {
          const tip = tips.find(t => t.id === delTipId);
          const enUso = cur.pisos?.reduce((n, p) => n + (p.aptos?.filter(a => a.tipologia === delTipId).length || 0), 0) || 0;
          return <>
            <p style={{ fontSize: 14, color: C.g9, marginBottom: 8 }}>¿Eliminar la tipología <strong>{tip?.nombre}</strong>?</p>
            {enUso > 0 && <div style={{ background: C.rdL, border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.rd }}>⚠️ Esta tipología está asignada a <strong>{enUso} apartamento(s)</strong>. Se les quitará la tipología y todos sus elementos.</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Btn onClick={() => setDelTipId(null)}>Cancelar</Btn>
              <Btn variant="danger" onClick={() => eliminarTip(delTipId)}>Sí, eliminar</Btn>
            </div>
          </>;
        })()}
      </Modal>}

      {repNom && (() => {
        const origen = (cur?.pisos || []).find(p => p.id === repNom.pisoId);
        return <Modal title={`Replicar nomenclatura del piso ${origen?.numero}`} onClose={() => setRepNom(null)}>
          <p style={{ fontSize: 13, color: C.g5, marginBottom: 12 }}>
            Se copian los aptos <strong>{(origen?.aptos || []).map(a => a.nombre).join(", ")}</strong> a los pisos que elijas,
            cambiando el número del piso.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Inp label="Desde el piso" type="number" value={repNom.desde} onChange={e => setRepNom(r => ({ ...r, desde: e.target.value }))} />
            <Inp label="Hasta el piso" type="number" value={repNom.hasta} onChange={e => setRepNom(r => ({ ...r, hasta: e.target.value }))} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, cursor: "pointer", margin: "4px 0 14px" }}>
            <input type="checkbox" checked={repNom.crear} onChange={e => setRepNom(r => ({ ...r, crear: e.target.checked }))} />
            Crear los pisos que no existan
          </label>
          <div style={{ background: C.amL, border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#B45309", marginBottom: 14 }}>
            Los aptos que ya tengan trabajo marcado se conservan. El piso de origen no se toca.
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn onClick={() => setRepNom(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={replicarNomenclatura}>Replicar</Btn>
          </div>
        </Modal>;
      })()}

      {pisoEditM && (() => {
        const p = cur.pisos?.find(x => x.id === pisoEditM);
        return <Modal title={`Editar aptos — Piso ${p?.numero}`} onClose={() => setPisoEditM(null)} wide>
          <div style={{ display: "grid", gap: 8, marginBottom: 16, maxHeight: 300, overflowY: "auto" }}>
            {p?.aptos?.map(a => <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.g0, border: `1px solid ${C.g2}`, borderRadius: 8 }}>
              <input value={a.nombre || ""} onChange={e => renombrarApto(pisoEditM, a.id, e.target.value)} style={{ flex: 1, padding: "5px 8px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 14 }} />
              <button onClick={() => eliminarApto(pisoEditM, a.id)} style={{ ...bdg("red"), cursor: "pointer" }}>✕</button>
            </div>)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><Btn onClick={() => agregarApto(pisoEditM)}>+ Agregar apto</Btn><Btn variant="primary" onClick={() => setPisoEditM(null)}>Listo</Btn></div>
        </Modal>;
      })() || null}

      {preciosM && <Modal title={`Precios por corte — ${obra.nombre}`} onClose={() => setPreciosM(false)} wide>
        <Sel label="Corte" value={precCorte} onChange={e => { setPrecCorte(e.target.value); setPrecTmp({}); }}>
          <option value="">— Seleccionar —</option>{cortes.map((c, i) => <option key={i} value={c.label}>{c.label}</option>)}
        </Sel>
        {precCorte && <><p style={{ fontSize: 13, color: C.g5, margin: "0 0 12px" }}>Modifica el precio para este corte. Vacío = precio estándar.</p>
          <div style={{ maxHeight: 300, overflowY: "auto", display: "grid", gap: 8 }}>
            {elems.filter(e => e.activo !== false && (!e.obra_id || esDeObra(e, obra.id))).map(e => {
              const k = `${precCorte}__${e.id}`; const ov = cur.preciosOverride?.[k];
              return <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: C.g0, borderRadius: 8 }}>
                <div style={{ flex: 1, fontSize: 14 }}>{e.nombre} <span style={{ fontSize: 12, color: C.g4 }}>({fmt(e.precio)} std)</span></div>
                <input type="number" min="0" placeholder={String(e.precio)} value={precTmp[e.id] ?? ov ?? ""} onChange={x => setPrecTmp(t => ({ ...t, [e.id]: x.target.value }))} style={{ width: 110, padding: "5px 8px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 13, textAlign: "right" }} />
              </div>;
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}><Btn onClick={() => setPreciosM(false)}>Cancelar</Btn><Btn variant="primary" onClick={guardarPrecios}>Guardar</Btn></div>
        </>}
      </Modal>}

      {accModal && <ModalAccesos obraId={cur.id} obras={obras} users={users} updateObra={updateObra} toast={toast} onClose={() => setAccModal(false)} />}

      {modals.tip && <Modal title={editTip ? "Editar tipología" : "Nueva tipología"} onClose={() => closeM("tip")}>
        <Inp label="Nombre" value={tipForm.nombre} onChange={e => setTipForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Tipo A — 3 alcobas" />
        <div style={{ marginBottom: 14 }}>
          {(() => {
            const propios = elems.filter(e => esDeObra(e, obra.id) && e.activo !== false).length;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <label style={{ ...lbl(), marginBottom: 0 }}>Elementos incluidos</label>
                <input placeholder="Buscar…" value={buscaEl} onChange={e => setBuscaEl(e.target.value)}
                  style={{ flex: 1, minWidth: 140, padding: "6px 10px", border: `1px solid ${C.g2}`, borderRadius: 8, fontSize: 13 }} />
                {propios > 0 && (
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.g5, cursor: "pointer" }}>
                    <input type="checkbox" checked={verGenerales} onChange={e => setVerGenerales(e.target.checked)} />
                    Ver elementos generales
                  </label>
                )}
              </div>
            );
          })()}
          <div style={{ maxHeight: 260, overflowY: "auto", border: `1px solid ${C.g2}`, borderRadius: 8, padding: 8, background: C.wh }}>
            {(() => {
              const hayPropios = elems.some(e => esDeObra(e, obra.id) && e.activo !== false);
              const q = buscaEl.trim().toLowerCase();
              return elems.filter(e =>
                (e.activo !== false || tipForm.eids.includes(e.id)) &&
                (!q || (e.nombre || "").toLowerCase().includes(q)) &&
                (tipForm.eids.includes(e.id) ||                       // los ya elegidos siempre se ven
                  (hayPropios && !verGenerales
                    ? esDeObra(e, obra.id)                             // solo los de esta obra
                    : (!e.obra_id || esDeObra(e, obra.id)))))
              .sort((a, b) => cmpTxt((a.grupo || "Sin grupo") + a.nombre, (b.grupo || "Sin grupo") + b.nombre))
              .map(e => <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", cursor: "pointer", fontSize: 14, borderRadius: 6, background: tipForm.eids.includes(e.id) ? C.orL : "transparent" }}>
              <input type="checkbox" checked={tipForm.eids.includes(e.id)} onChange={x => setTipForm(f => ({ ...f, eids: x.target.checked ? [...f.eids, e.id] : f.eids.filter(i => i !== e.id) }))} />
              <span style={{ flex: 1, color: C.bk }}>{e.nombre}<span style={{ fontSize: 11, color: C.g4, marginLeft: 6 }}>{e.grupo || "Sin grupo"}</span></span>
              <span style={{ fontSize: 12, color: C.g4 }}>{e.unidad} · {fmt(e.precio)}{Number(e.precio_detallado) ? ` + ${fmt(e.precio_detallado)}` : ""}</span>
              {tipForm.eids.includes(e.id) && (() => {
                const decimal = !esPorUnidad(e.unidad);   // todo lo que no es "und" admite decimales
                return (
                  <span onClick={x => x.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 11, color: C.g4 }}>Cant.</span>
                    <input type="number" min={decimal ? "0.1" : "1"} step={decimal ? "0.1" : "1"} placeholder="1"
                      value={tipForm.cantidades?.[e.id] ?? ""}
                      onClick={x => x.stopPropagation()}
                      onChange={x => { x.stopPropagation(); setTipForm(f => ({ ...f, cantidades: { ...f.cantidades, [e.id]: Number(x.target.value) || 1 } })); }}
                      style={{ width: 56, padding: "2px 6px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 12, textAlign: "right" }}
                    />
                  </span>
                );
              })()}
              {tipForm.eids.includes(e.id) && (
                <span onClick={x => x.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="number" min="0" step="1" title="Precio de instalación para esta tipología"
                    placeholder={e.precio != null ? String(e.precio) : "Instalación"}
                    value={tipForm.precios?.[e.id] ?? ""}
                    onClick={x => x.stopPropagation()}
                    onChange={x => { x.stopPropagation(); setTipForm(f => ({ ...f, precios: { ...f.precios, [e.id]: x.target.value } })); }}
                    style={{ width: 78, padding: "2px 6px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 12, textAlign: "right" }}
                  />
                  {/* Precio de detallado de esta tipología, aparte del de instalación */}
                  <input type="number" min="0" step="1" title="Precio de detallado para esta tipología"
                    placeholder={Number(e.precio_detallado) ? String(e.precio_detallado) : "Detall."}
                    value={tipForm.preciosDet?.[e.id] ?? ""}
                    onClick={x => x.stopPropagation()}
                    onChange={x => { x.stopPropagation(); setTipForm(f => ({ ...f, preciosDet: { ...f.preciosDet, [e.id]: x.target.value } })); }}
                    style={{ width: 70, padding: "2px 6px", border: `1px solid ${C.am}`, borderRadius: 6, fontSize: 12, textAlign: "right", background: "#FFFBEB" }}
                  />
                </span>
              )}
            </label>);
            })()}
          </div>
          <div style={{ fontSize: 12, color: C.g4, marginTop: 6, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span>{tipForm.eids.length} seleccionado(s)</span>
            <span>Las dos casillas de la derecha son el precio de <strong>instalación</strong> y el de <strong>detallado</strong> (la amarilla). Vacías = precio base del elemento.</span>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><Btn onClick={() => closeM("tip")}>Cancelar</Btn><Btn variant="primary" onClick={guardarTip}>{editTip ? "Guardar" : "Crear"}</Btn></div>
      </Modal>}
{nuevoPisoM && <Modal title="Nuevo piso" onClose={() => setNuevoPisoM(false)}>
  <Inp label="Número o nombre del piso (ej: 9801, PH, Local 1)" value={nuevoPisoF.numero} onChange={e => setNuevoPisoF(f => ({ ...f, numero: e.target.value }))} placeholder="Ej: 9801" />
  <Inp label="Cantidad de aptos iniciales" type="number" min="0" max="20" value={nuevoPisoF.aptos} onChange={e => setNuevoPisoF(f => ({ ...f, aptos: e.target.value }))} />
  <p style={{ fontSize: 12, color: C.g4, margin: "-8px 0 12px" }}>Puedes agregar o editar los aptos después desde "Editar aptos".</p>
  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
    <Btn onClick={() => setNuevoPisoM(false)}>Cancelar</Btn>
    <Btn variant="primary" onClick={() => {
      if (!nuevoPisoF.numero) return;
      const aptos = Array.from({ length: Number(nuevoPisoF.aptos) || 0 }, (_, ai) => ({
        id: `a${Date.now()}${ai}`, numero: ai + 1,
        nombre: `${nuevoPisoF.numero}${String(ai + 1).padStart(2, "0")}`,
        tipologia: "", elementos: [], instaladorAsignado: null, instaladoresAsignados: [], observaciones: ""
      }));
      const nuevoPiso = { id: `p${Date.now()}`, numero: nuevoPisoF.numero, aptos };
      updateObra(obra.id, o => ({ ...o, pisos: [...o.pisos, nuevoPiso] }));
      toast(`Piso ${nuevoPisoF.numero} creado`, "ok");
      setNuevoPisoM(false);
    }}>Crear piso</Btn>
  </div>
</Modal>}
      {repModal && <Modal title="Replicar tipologías" onClose={() => setRepModal(false)} wide>
        <p style={{ fontSize: 13, color: C.g5, margin: "0 0 16px" }}>Asigna tipología por número de apartamento en todos los pisos.</p>
        <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
          {nums.map(suf => {
            const reg = repSel.reglas.find(r => r.sufijo === suf); const tid = reg?.tipId || "";
            const ejemplos = aptosPorSufijo(suf);
            const cnt = ejemplos.length;
            return <div key={suf} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: tid ? C.orL : C.g0, border: `1px solid ${tid ? C.orM : C.g2}`, borderRadius: 10 }}>
              <div style={{ minWidth: 80 }}><div style={{ fontWeight: 700, fontSize: 14, color: tid ? C.orD : C.bk }}>Apto {suf}</div><div style={{ fontSize: 11, color: C.g5 }}>{cnt} apto(s){ejemplos.length ? ` · ${ejemplos.slice(0, 3).join(", ")}${ejemplos.length > 3 ? "…" : ""}` : ""}</div></div>
              <select style={{ flex: 1, padding: "7px 10px", border: `1px solid ${C.g2}`, borderRadius: 8, fontSize: 14 }} value={tid} onChange={e => { const v = e.target.value; setRepSel(r => { const n = r.reglas.filter(x => x.sufijo !== suf); if (v) n.push({ sufijo: suf, tipId: v }); return { reglas: n }; }); }}>
                <option value="">— Sin asignar —</option>{tips.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              {tid && <span style={{ fontSize: 18, color: C.or, fontWeight: 700 }}>✓</span>}
            </div>;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: C.g4 }}>{repSel.reglas.filter(r => r.tipId).length} asignado(s)</span>
          <div style={{ display: "flex", gap: 10 }}><Btn onClick={() => setRepModal(false)}>Cancelar</Btn><Btn variant="primary" disabled={!repSel.reglas.filter(r => r.tipId).length} onClick={replicar}>Aplicar</Btn></div>
        </div>
      </Modal>}
    </div>
  );
}

// ── APTO ──────────────────────────────────────────────────
function Apto({ apto, piso, obra, obras, updateObra, user, elems, users, avanceApto, detListo, toast, getPrecio }) {
  const cur = obras.find(o => o.id === obra.id);
  const curP = cur?.pisos?.find(p => p.id === piso.id);
  const curA = curP?.aptos?.find(a => a.id === apto.id) || apto;
  const asignadosInst = curA.instaladoresAsignados || (curA.instaladorAsignado ? [curA.instaladorAsignado] : []);
  const asignadosDet  = curA.detalladoresAsignados || [];
  const tip = cur?.tipologias?.find(t => t.id === curA.tipologia);
  const av = avanceApto(curA);
  const [pend, setPend] = useState({});
  const [cnts, setCnts] = useState({});
  // Cuántas unidades se marcan cuando el elemento trae varias (ej: 1 de 2 puertas)
  const [parcial, setParcial] = useState({});
  const [instSel, setInstSel] = useState({});
  const [nAd, setNAd] = useState({ desc: "", cant: 1, val: 0, inst: "", resp: "", memo: "" });
  const [addAd, setAddAd] = useState(false);
  // ARREGLO 3: estado para precios individuales por elemento en este apto
  const [precIndM, setPrecIndM] = useState(false);
  const [precIndTmp, setPrecIndTmp] = useState({});

  // ── Actividad activa: instalación o detallado ──
  const [act, setAct] = useState("inst");
  const esDet = act === "det";
  const asignados = esDet ? asignadosDet : asignadosInst;
  const oficio = user.oficio || "instalador";
  const canEdit = esOficina(user);
  // Un instalador solo marca su oficio; el detallado además exige que ya esté instalado.
  const canAct = canEdit || (user.rol === ROLES.IN && (
    esDet ? ["detallador", "ambos"].includes(oficio) : ["instalador", "ambos"].includes(oficio)
  ));
  const hayPend = Object.keys(pend).length > 0 || (canEdit && (curA.elementos?.some(e => e.completado) || (curA.elementosExtra || []).some(e => !e.esAdicional)));
  const pk = i => esDet ? `d${i}` : i;   // llave de lo pendiente según la actividad
  const corteAct = getCorteFechas()[0];

  // Un adicional de la obra sin memorando no se paga: no se deja marcar hasta tenerlo
  const sinMemo = e => !!e?.esAdicional && e.responsable === "obra" && !String(e.memorando || "").trim();
  const canToggle = idx => {
    const e = curA.elementos?.[idx];
    if (!e || !canAct) return false;
    if (sinMemo(e)) return false;
    if (esDet) return !!e.completado && !e.detCompletado;   // el detallado va después de instalar
    return !e.completado;
  };
  const togglePend = idx => { if (!canToggle(idx)) return; const k = pk(idx); setPend(p => { const c = { ...p }; if (c[k] !== undefined) delete c[k]; else c[k] = true; return c; }); };

  // Marcar de una vez todo lo que falte en la pestaña actual (el apto llegó completo)
  const puedeExtra = el => canAct && (esDet ? (!!el.completado && !el.detCompletado) : !el.completado);
  function marcarTodo() {
    const nuevo = {};
    (curA.elementos || []).forEach((el, i) => { if (canToggle(i)) nuevo[pk(i)] = true; });
    (curA.elementosExtra || []).forEach((el, i) => { if (puedeExtra(el)) nuevo[esDet ? `dx${i}` : `x${i}`] = true; });
    if (!Object.keys(nuevo).length) { toast(esDet ? "No hay nada pendiente de detallar" : "No hay nada pendiente de instalar", "ok"); return; }
    setPend(p => ({ ...p, ...nuevo }));
  }
  const faltantes = (curA.elementos || []).filter((el, i) => canToggle(i)).length
    + (curA.elementosExtra || []).filter(el => puedeExtra(el)).length;

  // "Ya pagado": para cargar avance viejo que se pagó en otra obra (duplicados de la
  // integración con el ERP). La marca alimenta el ERP igual, pero la liquidación la
  // salta y nunca la vuelve a cobrar. Solo oficina puede activarlo.
  const [yaPag, setYaPag] = useState(false);

  async function guardar() {
    const yaPagOn = canEdit && yaPag;   // el instalador nunca puede marcar algo como ya pagado
    updateObra(obra.id, o => ({
      ...o, pisos: o.pisos.map(p => {
        if (p.id !== piso.id) return p;
        return {
          ...p, aptos: p.aptos.map(a => {
            if (a.id !== apto.id) return a;
            // Atribución de instalador al marcar (solo cambia para SA/SV; IN siempre usa su propio id).
            // Se deriva de "a" fresco (no del closure del render) para evitar quedar vacío:
            //  - 2+ asignados: el seleccionado en el dropdown (o el primero por defecto)
            //  - 1 asignado: ese instalador automáticamente
            //  - 0 asignados o no canEdit: el usuario actual
            const asignadosA = a.instaladoresAsignados || (a.instaladorAsignado ? [a.instaladorAsignado] : []);
            const instaladorPara = key => {
              if (!canEdit) return user.id;
              if (asignadosA.length >= 2) return instSel[key] ?? asignadosA[0];
              if (asignadosA.length === 1) return asignadosA[0];
              return user.id;
            };
            const asignadosDetA = a.detalladoresAsignados || [];
            const detalladorPara = key => {
              if (!canEdit) return user.id;
              if (asignadosDetA.length >= 2) return instSel[key] ?? asignadosDetA[0];
              if (asignadosDetA.length === 1) return asignadosDetA[0];
              return user.id;
            };
            const hoy = new Date().toLocaleDateString("es-CO");
            const newEls = a.elementos.flatMap((el, i) => {
              let u = { ...el };
              if (cnts[i] !== undefined) u.cantidad = cnts[i];
              const unidadEl = elems.find(e => e.id === el.elementoId)?.unidad;
              // Si no se puede partir, `n` toma el total y el if (n < total) nunca dispara:
              // el elemento se marca completo y no se crea una segunda fila.
              const porUnidad = puedePartirse(unidadEl, u.cantidad);   // puertas, closets: se pueden partir
              const out = [u];

              // Instalación. Si trae varias y se marcaron menos, se parte: lo marcado queda
              // pagado a quien lo hizo y el resto sigue pendiente en el mismo apto.
              if (pend[i]) {
                const total = Number(u.cantidad || 1);
                const n = porUnidad ? Math.min(total, Number(parcial[i] || total)) : total;
                out[0] = { ...u, cantidad: n, completado: true, fecha: hoy,
                  yaPagado: yaPagOn,          // siempre explícito: si está apagado, se limpia lo que hubiera
                  // Un adicional ya trae instalador atribuido desde su creación (ver guardarAd): respetarlo.
                  instaladorId: (el.esAdicional && el.instaladorId) ? el.instaladorId : instaladorPara(i) };
                if (n < total) out.push({ ...u, cantidad: total - n, completado: false, instaladorId: null, fecha: null,
                  yaPagado: false, detCompletado: false, detId: null, detFecha: null, detYaPagado: false });
              }

              // Detallado: segunda marca del mismo elemento, con su propio responsable y fecha.
              if (pend[`d${i}`] && out[0].completado) {
                const base = out[0];
                const total = Number(base.cantidad || 1);
                const n = porUnidad ? Math.min(total, Number(parcial[`d${i}`] || total)) : total;
                out[0] = { ...base, cantidad: n, detCompletado: true, detId: detalladorPara(`d${i}`), detFecha: hoy,
                  detYaPagado: yaPagOn };
                if (n < total) out.splice(1, 0, { ...base, cantidad: total - n, detCompletado: false, detId: null, detFecha: null, detYaPagado: false });
              }
              return out;
            });
            // Pasajes/bonificación ya no viven en el apto (se editan en Liquidación, en user.ajustes).
            // Los __pasajes__/__bonificacion__ viejos que pudieran quedar se preservan tal cual y se ignoran en los cálculos.
            const final = newEls;
            const done = newEls.filter(e => !e.esAdicional && !e.elementoId?.startsWith("__")).every(e => e.completado);
            // Un solo aviso, sin nombres: no se le manda nada a nadie, solo se avisa en pantalla.
            if (done) toast(`✓ Apto ${a.nombre} completado en ${obra.nombre}`, "ok");
            // También guardar elementosExtra pendientes
const newElsExtra = (a.elementosExtra || []).map((el, i) => {
  let u = { ...el };
  if (cnts[`x${i}`] !== undefined) u.cantidad = cnts[`x${i}`];
  if (pend[`x${i}`]) { u.completado = true; u.instaladorId = instaladorPara(`x${i}`); u.fecha = new Date().toLocaleDateString("es-CO"); u.yaPagado = yaPagOn; }
  if (pend[`dx${i}`] && u.completado) { u.detCompletado = true; u.detId = detalladorPara(`dx${i}`); u.detFecha = new Date().toLocaleDateString("es-CO"); u.detYaPagado = yaPagOn; }
  return u;
});
return { ...a, elementos: final, elementosExtra: newElsExtra };
          })
        };
      })
    }));
    toast("Guardado", "ok"); setPend({}); setCnts({}); setInstSel({}); setParcial({});
  }

  // Al desmarcar la instalación también se cae el detallado (no puede quedar detallado sin instalar).
  const desmarcar = idx => updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementos: a.elementos.map((el, i) => i !== idx ? el : { ...el, completado: false, instaladorId: null, fecha: null, yaPagado: false, detCompletado: false, detId: null, detFecha: null, detYaPagado: false }) }) }) }));
  const desmarcarDet = idx => updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementos: a.elementos.map((el, i) => i !== idx ? el : { ...el, detCompletado: false, detId: null, detFecha: null, detYaPagado: false }) }) }) }));

  // Quitar una tipología extra del apto (con sus elementos), solo si no hay nada marcado en ella
  function quitarTipExtra(tipId) {
    const els = (curA.elementosExtra || []).filter(e => e.tipologiaId === tipId);
    if (els.some(e => e.completado || e.detCompletado)) { toast("Esa tipología ya tiene elementos marcados", "error"); return; }
    updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : ({
      ...a,
      tipologiasExtra: (a.tipologiasExtra || []).filter(t => t !== tipId),
      elementosExtra: (a.elementosExtra || []).filter(e => e.tipologiaId !== tipId),
    })) }) }));
    toast("Tipología extra quitada", "ok");
  }

  // Asignar detalladores al apto (SA/SV)
  const toggleDetallador = uid => updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => {
    if (a.id !== apto.id) return a;
    const act2 = a.detalladoresAsignados || [];
    return { ...a, detalladoresAsignados: act2.includes(uid) ? act2.filter(x => x !== uid) : [...act2, uid] };
  }) }) }));

  async function guardarAd() {
    if (!nAd.desc || !nAd.val) return;
    if (!nAd.resp) { toast("Elige si el adicional es de la obra o de Santa Lucía", "error"); return; }
    updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => {
      if (a.id !== apto.id) return a;
      // Atribución del adicional, derivada de "a" fresco (no del closure del render):
      //  - 2+ asignados: el seleccionado en el dropdown (o el primero por defecto), para cualquier rol
      //  - 1 asignado: ese instalador automáticamente
      //  - 0 asignados: el usuario actual
      const asignadosA = a.instaladoresAsignados || (a.instaladorAsignado ? [a.instaladorAsignado] : []);
      const instaladorId = asignadosA.length >= 2 ? (nAd.inst || asignadosA[0])
        : asignadosA.length === 1 ? asignadosA[0]
        : user.id;
      // responsable: "obra" = se le cobra a la constructora · "santalucia" = lo asumimos nosotros
      const el = { elementoId: `__ad__${Date.now()}`, descripcion: nAd.desc, cantidad: Number(nAd.cant), valorUnitario: Number(nAd.val), completado: false, instaladorId, fecha: null, esAdicional: true, aprobado: false, responsable: nAd.resp,
        memorando: nAd.resp === "obra" ? (String(nAd.memo || "").trim() || null) : null };
      return { ...a, elementos: [...(a.elementos || []), el] };
    }) }) }));
    if (nAd.resp === "obra" && !String(nAd.memo || "").trim()) toast("Adicional agregado. Sin memorando no se le paga al instalador.", "info");
    else toast("Adicional agregado", "ok");
    setNAd({ desc: "", cant: 1, val: 0, inst: "", resp: "", memo: "" }); setAddAd(false);
  }
  const setMemoAd = (idx, memo) => updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementos: a.elementos.map((el, i) => i !== idx ? el : { ...el, memorando: String(memo || "").trim() || null }) }) }) }));
  const setRespAd = (idx, resp) => updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementos: a.elementos.map((el, i) => i !== idx ? el : { ...el, responsable: resp }) }) }) }));
  const elimAd = idx => updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementos: a.elementos.filter((_, i) => i !== idx) }) }) }));

  // Precio individual del apto: instalación usa apto__…, detallado usa det__apto__…
  const keyPrecioApto = eid => `${esDet ? "det__" : ""}apto__${curA.id}__${eid}`;
  const [precEdit, setPrecEdit] = useState(null);   // elementoId cuyo precio se está editando en la fila

  function guardarPrecioUno(eid, valor) {
    const k = keyPrecioApto(eid);
    updateObra(obra.id, o => {
      const po = { ...(o.preciosOverride || {}) };
      if (valor === "" || valor === null) delete po[k]; else po[k] = Number(valor);
      return { ...o, preciosOverride: po };
    });
    setPrecEdit(null);
    toast(valor === "" ? "Precio vuelve al estándar" : "Precio de este apto actualizado", "ok");
  }

  // ARREGLO 3: guardar precios individuales por elemento en este apto
  function guardarPreciosInd() {
    updateObra(obra.id, o => ({
      ...o,
      preciosOverride: {
        ...(o.preciosOverride || {}),
        ...Object.fromEntries(
          Object.entries(precIndTmp)
            .filter(([, v]) => v !== "")
            .map(([eid, v]) => [keyPrecioApto(eid), Number(v)])
        )
      }
    }));
    toast("Precios individuales guardados", "ok"); setPrecIndM(false); setPrecIndTmp({});
  }

  const elsNorm = curA.elementos?.filter(e => !e.esAdicional && e.elementoId !== "__pasajes__" && e.elementoId !== "__bonificacion__") || [];
  const elsAd = curA.elementos?.filter(e => e.esAdicional) || [];
  const elsExtra = curA.elementosExtra?.filter(e => !e.esAdicional) || [];

  const totNorm = elsNorm.filter(e => e.completado).reduce((s, el) => s + getPrecio(el.elementoId, obra.id, corteAct.label, curA.id, curA.tipologia) * (el.cantidad || 1), 0);
  const totAd = elsAd.filter(e => e.completado).reduce((s, e) => s + e.valorUnitario * e.cantidad, 0);
  const totExtra = elsExtra.filter(e => e.completado).reduce((s, el) => s + getPrecio(el.elementoId, obra.id, corteAct.label, curA.id, el.tipologiaId) * (el.cantidad || 1), 0);
const totLiq = totNorm + totAd + totExtra;
  const totPend = Object.keys(pend).reduce((s, k) => {
    const det = String(k).startsWith("d");
    const i = parseInt(String(k).replace(/^[dx]/, ""));
    const el = elsNorm[i];
    if (!el) return s;
    return s + getPrecio(el.elementoId, obra.id, corteAct.label, curA.id, curA.tipologia, det ? "det" : "inst") * (parcial[k] ?? cnts[i] ?? el.cantidad ?? 1);
  }, 0);

  return (
    <div>
      <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk, display: "flex", alignItems: "center", gap: 10 }}>
            Apto {curA.nombre || `${piso.numero}${String(apto.numero).padStart(2, "0")}`} — {tip?.nombre || "Sin tipología"}
            {detListo(curA) && <span style={{ ...bdg("green"), fontSize: 12 }}>✓ Detallado</span>}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.g5 }}>{obra.nombre} · Piso {piso.numero}</p>
        </div>
        {/* ARREGLO 3: botón precios individuales para SA */}
        {esOficina(user) && tip && (
          <Btn onClick={() => { setPrecIndTmp({}); setPrecIndM(true); }}>💰 Precios apto</Btn>
        )}
      </div>

      {/* Pestañas de actividad */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.g1, padding: 4, borderRadius: 10, width: "fit-content" }}>
        {[["inst", "🔧 Instalación"], ["det", "🎨 Detallado"]].map(([k, l]) => (
          <button key={k} onClick={() => { setAct(k); setPend({}); setInstSel({}); setYaPag(false); }} style={{
            padding: "8px 16px", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "system-ui",
            fontSize: 13, fontWeight: act === k ? 700 : 500,
            background: act === k ? C.bk : "transparent", color: act === k ? C.wh : C.g5,
          }}>{l}</button>
        ))}
      </div>

      {/* Detalladores del apto */}
      {esDet && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: C.wh, border: `1px solid ${C.g2}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.g5, textTransform: "uppercase", letterSpacing: ".05em" }}>Detalladores</span>
          {asignadosDet.length === 0 && <span style={{ fontSize: 13, color: C.g4 }}>Sin asignar</span>}
          {asignadosDet.map(id => (
            <span key={id} style={{ ...bdg("amber"), display: "flex", alignItems: "center", gap: 6 }}>
              {users.find(u => u.id === id)?.nombre || id}
              {canEdit && <span onClick={() => toggleDetallador(id)} style={{ cursor: "pointer", fontWeight: 700 }}>✕</span>}
            </span>
          ))}
          {canEdit && (
            <select value="" onChange={e => e.target.value && toggleDetallador(e.target.value)}
              style={{ fontSize: 12, padding: "5px 8px", border: `1px solid ${C.g2}`, borderRadius: 6, marginLeft: "auto" }}>
              <option value="">+ Asignar detallador…</option>
              {users.filter(u => u.rol === ROLES.IN && ["detallador", "ambos"].includes(u.oficio || "instalador") && !asignadosDet.includes(u.id))
                .map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[["Avance", `${av}%`],
          // El contador incluye las tipologías extra, igual que el avance
          [esDet ? "Detallados" : "Instalados", (() => {
            const todos = elsAvance(curA);
            return `${todos.filter(e => esDet ? e.detCompletado : e.completado).length}/${todos.length}`;
          })()],
          [user.rol === ROLES.IN ? "Mi liquidación" : "Liquidación", fmt(totLiq)]].map(([l, v]) => (
          <div key={l} style={{ background: C.wh, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.g2}` }}>
            <div style={{ fontSize: 11, color: C.g4, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: l === "Avance" ? (av === 100 ? C.gn : C.or) : C.gnD }}>{v}</div>
          </div>
        ))}
      </div>
      {canEdit && <div style={{ marginBottom: 14, padding: "10px 14px", background: C.amL, border: "1px solid #FDE68A", borderRadius: 10, fontSize: 13, color: "#B45309", fontWeight: 500 }}>Puedes desmarcar elementos con ✕.</div>}
      {user.rol === ROLES.IN && <div style={{ marginBottom: 14, padding: "10px 14px", background: C.orL, border: `1px solid ${C.orM}`, borderRadius: 10, fontSize: 13, color: C.orD, fontWeight: 500 }}>Marca los elementos terminados y presiona <strong>Guardar</strong>.{hayPend && <span style={{ marginLeft: 8 }}>+{fmt(totPend)}</span>}</div>}

      {canAct && faltantes > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
          {Object.keys(pend).length > 0 && <Btn onClick={() => setPend({})}>Quitar selección</Btn>}
          <Btn onClick={marcarTodo}>
            ✓ Marcar todo {esDet ? "el detallado" : "lo instalado"} ({faltantes})
          </Btn>
        </div>
      )}

      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        {elsNorm.map((el, idx) => {
          const elem = elems.find(e => e.id === el.elementoId);
          const hecho = esDet ? !!el.detCompletado : !!el.completado;
          const quien = users.find(u => u.id === (esDet ? el.detId : el.instaladorId));
          const cuando = esDet ? el.detFecha : el.fecha;
          const eP = !!pend[pk(idx)], marc = hecho || eP;
          const cT = canToggle(idx);
          const ca = cnts[idx] ?? el.cantidad ?? 1;
          const precio = getPrecio(el.elementoId, obra.id, corteAct.label, curA.id, curA.tipologia, esDet ? "det" : "inst");
          const esperaInst = esDet && !el.completado;   // no se puede detallar sin instalar
          // Indicar si tiene precio individual
          const tieneOvInd = cur?.preciosOverride?.[keyPrecioApto(el.elementoId)] !== undefined;
          return (
            <div key={idx} onClick={() => cT && togglePend(idx)} style={{ display: "flex", alignItems: "center", gap: 12, opacity: esperaInst ? .55 : 1, background: hecho ? C.gnL : eP ? C.orL : C.wh, border: `1.5px solid ${hecho ? "#BBF7D0" : eP ? C.orM : C.g2}`, borderRadius: 10, padding: "12px 14px", cursor: cT ? "pointer" : "default", transition: "all .12s" }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, border: `2.5px solid ${hecho ? C.gn : eP ? C.or : C.g3}`, background: hecho ? C.gn : eP ? C.or : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {marc && <span style={{ color: C.wh, fontSize: 14, fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: hecho ? C.gnD : eP ? C.orD : C.bk }}>{elem?.nombre || el.elementoId}</div>
                {hecho && quien && <div style={{ fontSize: 12, color: C.gnD, fontWeight: 500 }}>
                  {quien.nombre} · {cuando}
                  {/* Sin este aviso, una marca que no se va a liquidar se ve igualita a una normal */}
                  {(esDet ? el.detYaPagado : el.yaPagado) && <span style={{ ...bdg("amber"), marginLeft: 6, fontSize: 10 }}>Ya pagado · no liquida</span>}
                </div>}
                {esperaInst && <div style={{ fontSize: 12, color: C.g4 }}>Falta instalarlo</div>}
                {esDet && el.completado && !el.detCompletado && !eP && precio === 0 && <div style={{ fontSize: 11, color: C.or, fontWeight: 600 }}>sin precio de detallado</div>}
                {eP && <div style={{ fontSize: 12, color: C.orD, fontWeight: 500 }}>Pendiente de guardar</div>}
                {tieneOvInd && <div style={{ fontSize: 10, color: C.or, fontWeight: 600 }}>precio personalizado</div>}
              </div>
              {canEdit && asignados.length >= 2 && !hecho && (
                <select onClick={e => e.stopPropagation()} value={instSel[pk(idx)] ?? asignados[0]} onChange={e => { e.stopPropagation(); setInstSel(s => ({ ...s, [pk(idx)]: e.target.value })); }} style={{ fontSize: 12, padding: "4px 6px", border: `1px solid ${C.g2}`, borderRadius: 6, maxWidth: 130 }}>
                  {ordIds(asignados, users).map(id => { const u = users.find(x => x.id === id); return <option key={id} value={id}>{u?.nombre || id}</option>; })}
                </select>
              )}
              {cT && puedePartirse(elem?.unidad, ca) && (
                <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: C.g5 }}>{esDet ? "detalló" : "instaló"}</span>
                  <select value={parcial[pk(idx)] ?? ca}
                    onChange={e => { const v = Number(e.target.value); setParcial(p => ({ ...p, [pk(idx)]: v })); if (!pend[pk(idx)]) togglePend(idx); }}
                    style={{ fontSize: 12, padding: "3px 6px", border: `1px solid ${C.g2}`, borderRadius: 6 }}>
                    {Array.from({ length: Number(ca) }, (_, k) => k + 1).map(n => <option key={n} value={n}>{n} de {ca}</option>)}
                  </select>
                </div>
              )}
              {!esPorUnidad(elem?.unidad) && <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: C.g4 }}>{elem?.unidad || "—"}</span>
                <input type="number" min="0.1" step="0.1" value={ca} disabled={el.completado && user.rol === ROLES.IN} onChange={e => setCnts(c => ({ ...c, [idx]: Number(e.target.value) }))} style={{ width: 64, textAlign: "center", fontSize: 13, padding: "4px", border: `1px solid ${C.g2}`, borderRadius: 6 }} />
              </div>}
              <div style={{ textAlign: "right", minWidth: 90 }} onClick={e => e.stopPropagation()}>
                {precEdit === el.elementoId ? (
                  <input type="number" min="0" autoFocus defaultValue={precio}
                    onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setPrecEdit(null); }}
                    onBlur={e => { const v = e.target.value; if (Number(v) !== precio) guardarPrecioUno(el.elementoId, v); else setPrecEdit(null); }}
                    style={{ width: 96, padding: "4px 6px", border: `1.5px solid ${C.or}`, borderRadius: 6, fontSize: 13, textAlign: "right" }} />
                ) : (
                  <div title={canEdit ? "Clic para cambiar el precio unitario en este apto" : ""}
                    onClick={() => canEdit && setPrecEdit(el.elementoId)}
                    style={{ fontSize: 14, fontWeight: 700, cursor: canEdit ? "pointer" : "default", borderBottom: canEdit ? `1px dashed ${C.g3}` : "none" }}>
                    {fmt(precio * (eP && parcial[pk(idx)] ? parcial[pk(idx)] : ca))}
                  </div>
                )}
                {Number(ca) > 1 && precEdit !== el.elementoId && <div style={{ fontSize: 10, color: C.g4 }}>{fmt(precio)} c/u</div>}
                <div style={{ fontSize: 11, color: C.g4 }}>{esPorUnidad(elem?.unidad) && Number(ca) > 1 ? `${ca} ${elem.unidad}` : elem?.unidad}</div>
              </div>
              {canEdit && !esDet && !el.completado && <button onClick={e => { e.stopPropagation(); updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementos: a.elementos.filter((_, i) => i !== idx) }) }) })); toast("Elemento eliminado", "ok"); }} style={{ marginLeft: 4, width: 28, height: 28, borderRadius: 6, ...bdg("red"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700 }}>🗑</button>}
{canEdit && hecho && <button onClick={e => { e.stopPropagation(); esDet ? desmarcarDet(idx) : desmarcar(idx); }} style={{ marginLeft: 4, width: 28, height: 28, borderRadius: 6, ...bdg("red"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700 }}>✕</button>}
            </div>
          );
        })}
      </div>

      <div style={{ borderTop: `2px solid ${C.g1}`, paddingTop: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.bk }}>Elementos adicionales</div>
          {canAct && <button onClick={() => setAddAd(!addAd)} style={{ ...bdg("orange"), cursor: "pointer" }}>+ Agregar</button>}
        </div>
        {addAd && <div style={{ background: C.orL, border: `1px solid ${C.orM}`, borderRadius: 10, padding: "14px", marginBottom: 12 }}>
          <Inp label="Descripción" value={nAd.desc} onChange={e => setNAd(n => ({ ...n, desc: e.target.value }))} placeholder="Ej: Arreglo puerta, corte moldura..." />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Cantidad" type="number" min="0.1" step="0.1" value={nAd.cant} onChange={e => setNAd(n => ({ ...n, cant: e.target.value }))} />
            <Inp label="Valor unitario ($)" type="number" min="0" value={nAd.val} onChange={e => setNAd(n => ({ ...n, val: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.g5, marginBottom: 6 }}>¿De quién es este adicional? *</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["obra", "🏗️ De la obra", "Se le cobra a la constructora"], ["santalucia", "🪵 Santa Lucía", "Lo asumimos nosotros"]].map(([k, t, d]) => (
                <button key={k} type="button" onClick={() => setNAd(n => ({ ...n, resp: k }))} style={{
                  textAlign: "left", padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "system-ui",
                  border: `2px solid ${nAd.resp === k ? (k === "obra" ? C.gn : C.rd) : C.g2}`,
                  background: nAd.resp === k ? (k === "obra" ? C.gnL : C.rdL) : C.wh,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div>
                  <div style={{ fontSize: 11, color: C.g5 }}>{d}</div>
                </button>
              ))}
            </div>
            {nAd.resp === "obra" && (
              <div style={{ marginTop: 10 }}>
                <Inp label="N° de memorando de la obra" value={nAd.memo} onChange={e => setNAd(n => ({ ...n, memo: e.target.value }))}
                  placeholder="Ej: 3819" hint="Sin memorando el adicional no se le paga al instalador" />
              </div>
            )}
          </div>
          {asignados.length >= 2 && (
            <Sel label="Instalador" value={nAd.inst || asignados[0]} onChange={e => setNAd(n => ({ ...n, inst: e.target.value }))}>
              {ordIds(asignados, users).map(id => { const u = users.find(x => x.id === id); return <option key={id} value={id}>{u?.nombre || id}</option>; })}
            </Sel>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: C.gnD, fontWeight: 700 }}>Total: {fmt(Number(nAd.cant) * Number(nAd.val))}</span>
            <div style={{ display: "flex", gap: 8 }}><Btn onClick={() => setAddAd(false)}>Cancelar</Btn><Btn variant="primary" onClick={guardarAd}>Guardar</Btn></div>
          </div>
        </div>}
        {elsAd.map((el, i) => {
          const ir = curA.elementos.indexOf(el);
          const eP = !!pend[ir], marc = el.completado || eP; const cT = canToggle(ir);
          return <div key={i} onClick={() => cT && togglePend(ir)} style={{ display: "flex", alignItems: "center", gap: 12, background: el.completado ? C.gnL : eP ? C.orL : C.wh, border: `1.5px solid ${el.completado ? "#BBF7D0" : eP ? C.orM : C.g2}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: cT ? "pointer" : "default" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, border: `2.5px solid ${el.completado ? C.gn : eP ? C.or : C.g3}`, background: el.completado ? C.gn : eP ? C.or : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {marc && <span style={{ color: C.wh, fontSize: 14, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{el.descripcion}</div>
              <div style={{ fontSize: 12, color: C.g4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                Adicional · {el.cantidad} · {fmt(el.valorUnitario)} c/u
                {el.responsable === "obra" && <span style={{ ...bdg("green"), fontSize: 10 }}>🏗️ De la obra{el.memorando ? ` · memo ${el.memorando}` : ""}</span>}
                {el.responsable === "santalucia" && <span style={{ ...bdg("red"), fontSize: 10 }}>🪵 Santa Lucía</span>}
                {!el.responsable && canEdit && (
                  <select onClick={e => e.stopPropagation()} value="" onChange={e => { e.stopPropagation(); if (e.target.value) setRespAd(ir, e.target.value); }}
                    style={{ fontSize: 11, padding: "2px 6px", border: `1px solid ${C.am}`, borderRadius: 6, color: "#B45309" }}>
                    <option value="">⚠️ Sin clasificar…</option>
                    <option value="obra">🏗️ De la obra</option>
                    <option value="santalucia">🪵 Santa Lucía</option>
                  </select>
                )}
              </div>
              {el.completado && <div style={{ fontSize: 12, color: C.gnD, fontWeight: 500 }}>
                {users.find(u => u.id === el.instaladorId)?.nombre} · {el.fecha}
                {el.yaPagado && <span style={{ ...bdg("amber"), marginLeft: 6, fontSize: 10 }}>Ya pagado</span>}
              </div>}
              {sinMemo(el) && (
                <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: C.rd, fontWeight: 700 }}>⛔ Sin memorando, no se paga</span>
                  {canEdit && <input placeholder="N° memorando" onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    onBlur={e => { if (e.target.value.trim()) setMemoAd(ir, e.target.value); }}
                    style={{ width: 110, padding: "3px 6px", border: `1px solid ${C.rd}`, borderRadius: 6, fontSize: 12 }} />}
                </div>
              )}
            </div>
            <div style={{ textAlign: "right", minWidth: 90 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(el.valorUnitario * el.cantidad)}</div></div>
            {canEdit && <button onClick={e => { e.stopPropagation(); el.completado ? desmarcar(ir) : elimAd(ir); }} style={{ ...bdg("red"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: 28, height: 28, borderRadius: 6, fontSize: 14, fontWeight: 700 }}>✕</button>}
          </div>;
        })}
        {elsAd.length === 0 && !addAd && <p style={{ fontSize: 13, color: C.g3, margin: 0 }}>Sin elementos adicionales.</p>}
        {elsExtra.length > 0 && <div style={{ borderTop: `2px solid ${C.g1}`, paddingTop: 16, marginBottom: 16 }}>
  {(curA.tipologiasExtra || []).map(tipId => {
    const tip = cur?.tipologias?.find(t => t.id === tipId);
    const elsDeEsta = elsExtra.filter(e => e.tipologiaId === tipId);
    if (!elsDeEsta.length) return null;
    return <div key={tipId} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.bk, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {tip?.nombre || "Tipología extra"}
          {canEdit && <span title="Quitar esta tipología del apto" onClick={() => quitarTipExtra(tipId)}
            style={{ cursor: "pointer", color: C.rd, fontWeight: 700, fontSize: 15 }}>✕</span>}
        </span>
        <span style={{ fontSize: 12, color: C.gnD, fontWeight: 600 }}>{fmt(elsDeEsta.filter(e => esDet ? e.detCompletado : e.completado).reduce((s, el) => s + getPrecio(el.elementoId, obra.id, corteAct.label, curA.id, tipId, esDet ? "det" : "inst") * (el.cantidad || 1), 0))}</span>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {elsDeEsta.map((el, idx) => {
          const irx = curA.elementosExtra.indexOf(el);
          const elem = elems.find(e => e.id === el.elementoId);
          const hecho = esDet ? !!el.detCompletado : !!el.completado;
          const inst = users.find(u => u.id === (esDet ? el.detId : el.instaladorId));
          const cuando = esDet ? el.detFecha : el.fecha;
          const kx = esDet ? `dx${irx}` : `x${irx}`;
          const eP = !!pend[kx];
          const marc = hecho || eP;
          const esperaInst = esDet && !el.completado;
          const cT = canAct && (esDet ? (!!el.completado && !el.detCompletado) : !el.completado);
          const ca = cnts[`x${irx}`] ?? el.cantidad ?? 1;
          const precio = getPrecio(el.elementoId, obra.id, corteAct.label, curA.id, tipId, esDet ? "det" : "inst");
          return <div key={irx} onClick={() => { if (!cT) return; setPend(p => { const c = {...p}; if (c[kx] !== undefined) delete c[kx]; else c[kx] = true; return c; }); }} style={{ display: "flex", alignItems: "center", gap: 12, opacity: esperaInst ? .55 : 1, background: hecho ? C.gnL : eP ? C.orL : C.wh, border: `1.5px solid ${hecho ? "#BBF7D0" : eP ? C.orM : C.g2}`, borderRadius: 10, padding: "12px 14px", cursor: cT ? "pointer" : "default" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, border: `2.5px solid ${hecho ? C.gn : eP ? C.or : C.g3}`, background: hecho ? C.gn : eP ? C.or : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {marc && <span style={{ color: C.wh, fontSize: 14, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: hecho ? C.gnD : eP ? C.orD : C.bk }}>{elem?.nombre || el.elementoId}</div>
              {hecho && inst && <div style={{ fontSize: 12, color: C.gnD }}>{inst.nombre} · {cuando}</div>}
              {esperaInst && <div style={{ fontSize: 12, color: C.g4 }}>Falta instalarlo</div>}
              {eP && <div style={{ fontSize: 12, color: C.orD }}>Pendiente de guardar</div>}
            </div>
            {canEdit && asignados.length >= 2 && !hecho && (
              <select onClick={e => e.stopPropagation()} value={instSel[kx] ?? asignados[0]} onChange={e => { e.stopPropagation(); setInstSel(s => ({ ...s, [kx]: e.target.value })); }} style={{ fontSize: 12, padding: "4px 6px", border: `1px solid ${C.g2}`, borderRadius: 6, maxWidth: 130 }}>
                {ordIds(asignados, users).map(id => { const u = users.find(x => x.id === id); return <option key={id} value={id}>{u?.nombre || id}</option>; })}
              </select>
            )}
            <div style={{ textAlign: "right", minWidth: 90 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(precio * ca)}</div>
            </div>
            {canEdit && hecho && <button onClick={e => { e.stopPropagation(); updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementosExtra: a.elementosExtra.map((x, i) => i !== irx ? x : (esDet ? { ...x, detCompletado: false, detId: null, detFecha: null, detYaPagado: false } : { ...x, completado: false, instaladorId: null, fecha: null, yaPagado: false, detCompletado: false, detId: null, detFecha: null, detYaPagado: false })) }) }) })); }} style={{ ...bdg("red"), cursor: "pointer", width: 28, height: 28, borderRadius: 6, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>}
          </div>;
        })}
      </div>
    </div>;
  })}
</div>}
      </div>

      <div style={{ borderTop: `2px solid ${C.g1}`, paddingTop: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.bk, marginBottom: 12 }}>Observaciones</div>
        <textarea
          value={curA.observaciones || ""}
          disabled={!canAct}
          onChange={e => {
            const val = e.target.value;
            updateObra(obra.id, o => ({
              ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : {
                ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, observaciones: val })
              })
            }));
          }}
          placeholder={canAct ? "Escribe observaciones sobre este apartamento..." : "Sin observaciones"}
          style={{ width: "100%", boxSizing: "border-box", minHeight: 90, padding: "10px 12px", border: `1px solid ${C.g2}`, borderRadius: 10, fontSize: 14, fontFamily: "system-ui", color: C.bk, background: canAct ? C.wh : C.g0, resize: "vertical" }}
        />
        {curA.observaciones && <div style={{ fontSize: 12, color: C.g4, marginTop: 4 }}>Visible para todos los roles.</div>}
      </div>

      {canAct && <div style={{ position: "sticky", bottom: 0, background: C.wh, borderTop: `2px solid ${C.g1}`, padding: "14px 0 4px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {canEdit && (
          <label title="Para cargar avance viejo que ya se le pagó al instalador en otra obra. Alimenta el ERP, pero no entra en la liquidación."
            style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto", cursor: "pointer", fontSize: 13,
              color: yaPag ? C.wh : C.g5, background: yaPag ? C.am : C.g0, border: `1px solid ${yaPag ? C.am : C.g2}`,
              borderRadius: 999, padding: "6px 12px", fontWeight: yaPag ? 700 : 500 }}>
            <input type="checkbox" checked={yaPag} onChange={e => setYaPag(e.target.checked)} style={{ margin: 0 }} />
            Ya pagado (no liquidar)
          </label>
        )}
        {hayPend && <span style={{ fontSize: 14, color: C.g5, alignSelf: "center" }}>Listo para guardar</span>}
        <Btn variant="primary" disabled={!hayPend} onClick={guardar} style={{ padding: "10px 28px", fontSize: 15, fontWeight: 700 }}>Guardar</Btn>
      </div>}
      {canEdit && yaPag && <div style={{ fontSize: 12, color: C.am, textAlign: "right", marginTop: 6, fontWeight: 600 }}>
        Lo que marques queda como ya pagado: se ve en el ERP pero no se liquida.
      </div>}

      {/* ARREGLO 3: Modal precios individuales por apto */}
      {precIndM && <Modal title={`Precios ${esDet ? "de detallado" : "de instalación"} — Apto ${curA.nombre}`} onClose={() => setPrecIndM(false)} wide>
        <p style={{ fontSize: 13, color: C.g5, margin: "0 0 12px" }}>
          Ajusta el precio de cada elemento solo para este apartamento. No modifica el precio base ni otros aptos.<br />
          Deja vacío para usar el precio estándar del corte.
        </p>
        <div style={{ maxHeight: 350, overflowY: "auto", display: "grid", gap: 8 }}>
          {elsNorm.map(el => {
            const elem = elems.find(e => e.id === el.elementoId);
            if (!elem) return null;
            const precioStd = getPrecio(el.elementoId, obra.id, corteAct.label, null, curA.tipologia, esDet ? "det" : "inst");
            const keyInd = keyPrecioApto(el.elementoId);
            const ovActual = cur?.preciosOverride?.[keyInd];
            return <div key={el.elementoId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: ovActual !== undefined ? C.orL : C.g0, borderRadius: 8, border: `1px solid ${ovActual !== undefined ? C.orM : C.g2}` }}>
              <div style={{ flex: 1, fontSize: 14 }}>
                {elem.nombre}
                <span style={{ fontSize: 12, color: C.g4, marginLeft: 8 }}>std: {fmt(precioStd)}</span>
                {ovActual !== undefined && <span style={{ fontSize: 11, color: C.orD, marginLeft: 6, fontWeight: 600 }}>actual: {fmt(ovActual)}</span>}
              </div>
              <input
                type="number" min="0"
                placeholder={String(precioStd)}
                value={precIndTmp[el.elementoId] ?? (ovActual !== undefined ? ovActual : "")}
                onChange={x => setPrecIndTmp(t => ({ ...t, [el.elementoId]: x.target.value }))}
                style={{ width: 120, padding: "5px 8px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 13, textAlign: "right" }}
              />
            </div>;
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <Btn onClick={() => setPrecIndM(false)}>Cancelar</Btn>
          <Btn variant="primary" onClick={guardarPreciosInd}>Guardar precios</Btn>
        </div>
      </Modal>}
    </div>
  );
}

// ── ELEMENTOS ─────────────────────────────────────────────
function Elementos({ elems, setElems, obras = [], openM, closeM, modals }) {
  const vacio = { nombre: "", unidad: "und", precio: 0, precio_detallado: 0, grupo: "Otros", activo: true };
  const [form, setForm] = useState(vacio);
  const [editId, setEditId] = useState(null);
  const [busca, setBusca] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);
  const [plegados, setPlegados] = useState({});
  const [filtObra, setFiltObra] = useState("");

  async function guardar() {
    if (!form.nombre) return;
    const base = { ...form, precio: Number(form.precio) || 0, precio_detallado: Number(form.precio_detallado) || 0 };
    const el = editId ? { ...elems.find(e => e.id === editId), ...base } : { id: `e${Date.now()}`, ...base };
    await dbUpsert("elementos", el);
    if (editId) setElems(x => ordNom(x.map(e => e.id === editId ? el : e))); else setElems(x => ordNom([...x, el]));
    setEditId(null); setForm(vacio); closeM("el");
  }

  async function toggleActivo(e) {
    const el = { ...e, activo: e.activo === false ? true : false };
    await dbUpsert("elementos", el);
    setElems(x => x.map(y => y.id === el.id ? el : y));
  }

  const abrirEdit = e => {
    setEditId(e.id);
    setForm({ nombre: e.nombre, unidad: e.unidad || "und", precio: e.precio || 0,
      precio_detallado: e.precio_detallado || 0, grupo: e.grupo || "Otros", activo: e.activo !== false });
    openM("el");
  };

  const q = busca.trim().toLowerCase();
  const visibles = elems.filter(e =>
    (verInactivos || e.activo !== false) &&
    (!q || (e.nombre || "").toLowerCase().includes(q)) &&
    (filtObra === "" || (filtObra === "gen" ? !e.obra_id : esDeObra(e, filtObra)))
  );
  const gruposUsados = [...GRUPOS, "Sin grupo"].filter(g =>
    visibles.some(e => (e.grupo || "Sin grupo") === g));
  const inactivos = elems.filter(e => e.activo === false).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>Elementos</h2>
        <Btn variant="primary" onClick={() => { setEditId(null); setForm(vacio); openM("el"); }}>+ Nuevo</Btn>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="Buscar elemento…" value={busca} onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, minWidth: 220, padding: "9px 12px", border: `1px solid ${C.g2}`, borderRadius: 10, fontSize: 14, fontFamily: "system-ui" }} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.g5, cursor: "pointer" }}>
          <input type="checkbox" checked={verInactivos} onChange={e => setVerInactivos(e.target.checked)} />
          Ver inactivos ({inactivos})
        </label>
        <select value={filtObra} onChange={e => setFiltObra(e.target.value)}
          style={{ padding: "8px 10px", border: `1px solid ${C.g2}`, borderRadius: 10, fontSize: 13 }}>
          <option value="">Todos</option>
          <option value="gen">Generales</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        <span style={{ fontSize: 13, color: C.g4 }}>{visibles.length} de {elems.length}</span>
      </div>

      {gruposUsados.map(g => {
        const delGrupo = visibles.filter(e => (e.grupo || "Sin grupo") === g)
          .sort(porNombre);
        const plegado = plegados[g];
        return (
          <div key={g} style={{ marginBottom: 14 }}>
            <div onClick={() => setPlegados(p => ({ ...p, [g]: !p[g] }))}
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "6px 2px", fontSize: 13, fontWeight: 700, color: C.bk, textTransform: "uppercase", letterSpacing: ".05em" }}>
              <span style={{ color: C.g4 }}>{plegado ? "▸" : "▾"}</span>
              {g}
              <span style={{ ...bdg("gray"), fontSize: 11 }}>{delGrupo.length}</span>
            </div>
            {!plegado && (
              <div style={{ display: "grid", gap: 6 }}>
                {delGrupo.map(e => (
                  <div key={e.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, opacity: e.activo === false ? .5 : 1, padding: "10px 14px" }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{e.nombre}</span>
                      <span style={{ ...bdg("gray"), marginLeft: 6, fontSize: 11 }}>{e.unidad}</span>
                      {e.activo === false && <span style={{ ...bdg("red"), marginLeft: 6, fontSize: 11 }}>inactivo</span>}
                      {e.obra_id && <span style={{ ...bdg("orange"), marginLeft: 6, fontSize: 11 }}>{obras.find(o => o.id === e.obra_id)?.nombre || "de obra"}</span>}
                    </div>
                    <div style={{ textAlign: "right", minWidth: 100 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(e.precio)}</div>
                      <div style={{ fontSize: 11, color: C.g4 }}>instalación</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 100 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: e.precio_detallado ? C.bk : C.g3 }}>
                        {e.precio_detallado ? fmt(e.precio_detallado) : "—"}
                      </div>
                      <div style={{ fontSize: 11, color: C.g4 }}>detallado</div>
                    </div>
                    <Btn onClick={() => abrirEdit(e)}>Editar</Btn>
                    <Btn onClick={() => toggleActivo(e)}>{e.activo === false ? "Activar" : "Inactivar"}</Btn>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {visibles.length === 0 && <p style={{ fontSize: 13, color: C.g4 }}>No hay elementos con ese nombre.</p>}

      {modals.el && <Modal title={editId ? "Editar elemento" : "Nuevo elemento"} onClose={() => closeM("el")} wide>
        <Inp label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Sel label="Grupo" value={form.grupo} onChange={e => setForm(f => ({ ...f, grupo: e.target.value }))}>
            {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
          </Sel>
          <Sel label="Unidad" value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
            <option value="und">und</option><option value="ml">ml</option><option value="m2">m2</option><option value="gl">gl</option>
          </Sel>
          <Inp label="Precio instalación ($)" type="number" min="0" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
          <Inp label="Precio detallado ($)" type="number" min="0" value={form.precio_detallado} onChange={e => setForm(f => ({ ...f, precio_detallado: e.target.value }))} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, cursor: "pointer", margin: "6px 0 14px" }}>
          <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} />
          Activo (aparece al armar tipologías)
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn onClick={() => closeM("el")}>Cancelar</Btn>
          <Btn variant="primary" onClick={guardar}>{editId ? "Guardar" : "Crear"}</Btn>
        </div>
      </Modal>}
    </div>
  );
}

// ── LIQUIDACIÓN ───────────────────────────────────────────
function Liquidacion({ obras, elems, users, setUsers, user, liqs, setLiqs, movPres, setMovPres, getPrecio, toast }) {
  const cortes = getCorteFechas();
  const [ci, setCi] = useState(0);
  const [expM, setExpM] = useState(null);
  const [hist, setHist] = useState(false);
  const [verTodos, setVerTodos] = useState(false);   // por defecto solo quien tiene corte
  const [filtInst, setFiltInst] = useState("");
  const [filtObra, setFiltObra] = useState("");
  const corte = cortes[ci];
  const INs = user.rol === ROLES.IN ? users.filter(u => u.id === user.id) : users.filter(u => u.rol === ROLES.IN);
  const canExp = [ROLES.SA, ROLES.SV, ROLES.AX].includes(user.rol);

  function detalle(iid, d, h) {
    const rows = [];
    const proc = (o, a, el, esExtra) => {
      // Detallado: segunda marca del mismo elemento, con su propio precio y corte.
      if (el.detCompletado && !el.detYaPagado && el.detId === iid && enCorte(el.detFecha, d, h) && !el.esAdicional
          && el.elementoId !== "__pasajes__" && el.elementoId !== "__bonificacion__") {
        const elemD = elems.find(e => e.id === el.elementoId);
        const tipD = esExtra ? el.tipologiaId : (el.tipologiaId || a.tipologia);
        rows.push({ obra: o.nombre, apto: a.nombre, el: `[Detallado] ${elemD?.nombre || el.elementoId}`, actividad: "Detallado",
          cant: el.cantidad || 1, precio: getPrecio(el.elementoId, o.id, corte.label, a.id, tipD, "det"), fecha: el.detFecha, adj: false, apr: true });
      }
      // yaPagado: avance cargado de una obra anterior, ya pagado. Alimenta el ERP, no se liquida.
      if (el.completado && !el.yaPagado && el.instaladorId === iid && enCorte(el.fecha, d, h)) {
        if (el.elementoId === "__pasajes__" || el.elementoId === "__bonificacion__") return; // migrados a user.ajustes
        if (el.esAdicional) {
          if (el.responsable === "obra" && !String(el.memorando || "").trim()) return;   // sin memorando no se paga
          rows.push({ obra: o.nombre, apto: a.nombre, el: `[Adicional] ${el.descripcion}`, responsable: el.responsable || null, memorando: el.memorando || null, cant: el.cantidad || 1, precio: el.valorUnitario || 0, fecha: el.fecha, adj: false, apr: true });
          return;
        }
        const elem = elems.find(e => e.id === el.elementoId);
        const tip = esExtra ? el.tipologiaId : (el.tipologiaId || a.tipologia);
        rows.push({ obra: o.nombre, apto: a.nombre, el: elem?.nombre, actividad: "Instalación", cant: el.cantidad || 1, precio: getPrecio(el.elementoId, o.id, corte.label, a.id, tip), fecha: el.fecha, adj: false, apr: true });
      }
    };
    obras.forEach(o => o.pisos?.forEach(p => p.aptos?.forEach(a => {
      a.elementos?.forEach(el => proc(o, a, el, false));
      a.elementosExtra?.forEach(el => proc(o, a, el, true));
    })));
    return rows;
  }

  function resumen(iid) {
    const rows = detalle(iid, corte.desde, corte.hasta);
    const bruto = rows.filter(r => !r.adj).reduce((s, r) => s + r.precio * r.cant, 0);
    const ret = Math.round(bruto * .10);
    const sub = bruto - ret;
    const aj = ajusteDe(users, iid, corte.label);
    const pas = aj.aprobado ? aj.pasajes : 0;
    const bon = aj.aprobado ? aj.bonificacion : 0;
    const dia = aj.aprobado ? aj.diasVal : 0;
    const pendAdj = (!aj.aprobado && (aj.pasajes || aj.bonificacion || aj.diasVal)) ? 1 : 0;
    // La descripción de la actividad queda guardada en la liquidación: cuando se cierre
    // el corte, el soporte del jornal viaja con él y no se pierde.
    const filasDias = aj.dias.map(d => ({
      obra: obras.find(o => o.id === d.obraId)?.nombre || "—", apto: "—",
      el: "Día laborado", actividad: "Día laborado",   // el nombre NO cambia: hay cálculos que lo comparan exacto
      desc: d.desc || "",                                // la actividad va en su propio campo
      cant: Number(d.dias), precio: Number(d.valorDia || 0), fecha: "", adj: true, apr: aj.aprobado,
    }));
    // El corte vale lo causado. El abono a préstamo NO entra aquí: se aplica después,
    // con el corte ya cerrado, cuando gerencia lo revisa antes de mandarlo a pagar.
    return { bruto, ret, sub, pas, bon, dia, total: sub + pas + bon + dia, pendAdj, rows: [...rows, ...filasDias] };
  }

  async function cerrar(inst) {
    // pendAdj no se destructura: es estado de UI, no columna.
    const { rows, bruto, ret, sub, pas, bon, dia, total } = resumen(inst.id);
    const l = {
      id: `l${Date.now()}${inst.id}`,
      inst_id: inst.id, inst_nombre: inst.nombre, inst_cedula: inst.cedula,
      inst_telefono: inst.telefono, inst_banco: inst.banco, inst_cuenta: inst.cuenta,
      corte: corte.label, fecha_cierre: new Date().toLocaleDateString("es-CO"),
      // "cerrado": el coordinador terminó su parte. Gerencia revisa, aplica abonos y
      // lo pasa a "pagado". Las liquidaciones viejas ya vienen marcadas "pagado".
      cerrado_por: user.nombre, estado: "cerrado",
      bruto, ret, sub, pas, bon, total, rows,
    };
    const r = await dbUpsert("liquidaciones", liqToDb(l));
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      toast(`No se pudo cerrar la liquidación (${r.status}). ${txt.slice(0, 140)}`, "error");
      return;
    }
    setLiqs(x => [...x, l]);
    toast("Corte cerrado. Queda pendiente la revisión de gerencia.", "ok");
  }

  // .find (no .some): el objeto guardado es la fuente de verdad de una liq cerrada.
  const cerrada = iid => liqs.find(l => l.inst_id === iid && l.corte === corte.label);

  // ── Revisión de gerencia sobre un corte ya cerrado ────────
  // Solo superadmin. El corte no se reescribe: el abono queda en préstamos, amarrado
  // a ese corte, y el neto se calcula restando. Así una liquidación cerrada nunca
  // cambia de número.
  const esSuper = user.rol === ROLES.SA;
  const abonoDelCorte = iid => (movPres || [])
    .filter(m => m.usuario_id === iid && m.tipo === "abono" && m.corte === corte.label)
    .reduce((s, m) => s + Number(m.valor || 0), 0);

  async function aplicarAbono(inst, valor, ev) {
    const actual = abonoDelCorte(inst.id);
    const nuevo = Math.max(0, Number(valor) || 0);
    if (nuevo === actual) return;
    const cerr = cerrada(inst.id);
    if (!cerr) return;
    if (cerr.estado === "pagado") { toast("Ese corte ya se pagó: el abono no se cambia desde aquí", "err"); if (ev) ev.target.value = actual || ""; return; }
    // Lo que ya está abonado en este corte no cuenta como deuda para el tope
    const tope = saldoPrestamo(movPres, inst.id) + actual;
    if (nuevo > tope) { toast(`No puede abonar más de lo que debe (${fmt(tope)})`, "err"); if (ev) ev.target.value = actual || ""; return; }
    if (nuevo > Number(cerr.total || 0)) { toast(`El abono no puede superar el total del corte (${fmt(cerr.total)})`, "err"); if (ev) ev.target.value = actual || ""; return; }

    // Se corrige reemplazando: se borran los abonos de este corte y se pone el nuevo
    const viejos = (movPres || []).filter(m => m.usuario_id === inst.id && m.tipo === "abono" && m.corte === corte.label);
    for (const m of viejos) {
      const rd = await dbDel("movimientos_prestamo", m.id);
      if (!rd.ok) { toast("No se pudo corregir el abono anterior", "err"); return; }
    }
    let creado = null;
    if (nuevo > 0) {
      creado = {
        id: `mp${Date.now()}${Math.floor(Math.random() * 1000)}`, usuario_id: inst.id, tipo: "abono",
        valor: nuevo, fecha: new Date().toISOString().slice(0, 10),
        concepto: `Descuento del corte ${corte.label}`, corte: corte.label, registrado_por: user.nombre,
      };
      const ri = await dbInsert("movimientos_prestamo", creado);
      if (!ri.ok) { toast("No se pudo guardar el abono", "err"); setMovPres(x => x.filter(m => !viejos.some(v2 => v2.id === m.id))); return; }
    }
    setMovPres(x => [...x.filter(m => !viejos.some(v2 => v2.id === m.id)), ...(creado ? [creado] : [])]);
    toast(nuevo > 0 ? `Abono de ${fmt(nuevo)} aplicado` : "Abono retirado", "ok");
  }

  async function marcarPagado(liq) {
    const act = { ...liq, estado: "pagado" };
    const r = await dbUpsert("liquidaciones", liqToDb(act));
    if (!r.ok) { toast("No se pudo marcar como pagado", "err"); return; }
    setLiqs(x => x.map(l => l.id === liq.id ? act : l));
    toast("Corte marcado como pagado", "ok");
  }

  // Una sola pasada de filas por IN (snapshot si está cerrada, recálculo si no):
  // la reusan los filtros y el render. [] en Historial para no calcular de más.
  const datosPorIn = hist ? [] : INs.map(inst => {
    const cerr = cerrada(inst.id);
    // pendAdj:0 porque un ajuste pendiente ya no es accionable tras el cierre.
    const { rows, ...res } = cerr
      ? { rows: cerr.rows || [], bruto: cerr.bruto, ret: cerr.ret, sub: cerr.sub, pas: cerr.pas, bon: cerr.bon, total: cerr.total, pendAdj: 0,
          dia: (cerr.rows || []).filter(r => r.adj && r.el === "Día laborado" && r.apr).reduce((x, r) => x + (r.precio || 0) * (r.cant || 1), 0) }
      : resumen(inst.id);
    return { inst, cerr, rows, res };
  });

  // Solo obras con trabajo real en este corte, no el catálogo completo de `obras`.
  // Clave = nombre, porque es lo que guardan detalle() y el snapshot cerrado.
  const obrasCorte = [...new Set(datosPorIn.flatMap(d => d.rows.map(r => r.obra)).filter(Boolean))].sort(cmpTxt);

  // AND: instalador Y obra. "" = sin filtrar.
  // Por defecto solo salen los que tienen algo en el corte: con 30 instaladores en
  // pantalla el proceso se vuelve dispendioso. El interruptor deja ver a todos.
  const tieneCorte = d => d.rows.length > 0 || d.cerr || d.res.pas > 0 || d.res.bon > 0 || d.res.dia > 0;
  const visibles = datosPorIn.filter(d =>
    (verTodos || tieneCorte(d)) &&
    (!filtInst || d.inst.id === filtInst) &&
    (!filtObra || d.rows.some(r => r.obra === filtObra))
  );
  const ocultos = datosPorIn.filter(d => !tieneCorte(d)).length;

  // ── Pasajes/Bonificación por instalador+corte (viven en user.ajustes) ──
  const [ajTmp, setAjTmp] = useState({});  // buffer local; se confirma onBlur
  // Los ajustes se guardan con funciones de la base, no mandando la fila de usuarios.
  // La base revisa quién pide: el instalador solo puede tocar su propio ajuste; aprobar
  // y eliminar quedan para oficina (superadmin, supervisor, auxiliar).
  async function rpcAjuste(fn, args, msgError) {
    const res = await dbRpc(fn, args);
    if (!res.ok) { const det = await res.text().catch(() => ""); console.error(`${fn} falló:`, res.status, det); toast(msgError, "err"); return false; }
    return true;
  }
  // IN propone (aprobado:false); oficina edita (aprobado:true automático, lo decide la base).
  async function guardarAjuste(iid, patch) {
    const u = users.find(x => x.id === iid); if (!u) return;
    const prev = u.ajustes?.[corte.label] || {};
    const { aprobado: _a, editadoPor: _e, ...limpio } = { pasajes: 0, bonificacion: 0, ...prev, ...patch };
    const ok = await rpcAjuste("guardar_ajuste",
      { p_usuario: iid, p_corte: corte.label, p_ajuste: limpio },
      "No se pudo guardar el ajuste");
    if (!ok) return;
    const nuevo = { ...limpio, aprobado: esOficina(user), editadoPor: user.id };
    const merged = { ...u, ajustes: { ...(u.ajustes || {}), [corte.label]: nuevo } };
    setUsers(xs => xs.map(x => x.id === iid ? merged : x));
  }
  async function aprobarAjuste(iid) {
    const u = users.find(x => x.id === iid); if (!u) return;
    const ok = await rpcAjuste("aprobar_ajuste",
      { p_usuario: iid, p_corte: corte.label },
      "No se pudo aprobar el ajuste");
    if (!ok) return;
    const prev = u.ajustes?.[corte.label] || {};
    const merged = { ...u, ajustes: { ...(u.ajustes || {}), [corte.label]: { ...prev, aprobado: true, aprobadoPor: user.id } } };
    setUsers(xs => xs.map(x => x.id === iid ? merged : x)); toast("Ajuste aprobado", "ok");
  }
  async function eliminarAjuste(iid) {
    const u = users.find(x => x.id === iid); if (!u) return;
    const ok = await rpcAjuste("eliminar_ajuste",
      { p_usuario: iid, p_corte: corte.label },
      "No se pudo eliminar el ajuste");
    if (!ok) return;
    const aj = { ...(u.ajustes || {}) }; delete aj[corte.label];
    setUsers(xs => xs.map(x => x.id === iid ? { ...u, ajustes: aj } : x)); toast("Ajuste eliminado", "ok");
  }

  function excelTxt(inst, rows, res) {
    return [`Liquidación — ${inst.nombre} (C.C. ${inst.cedula}) — ${corte.label}`, `Tel: ${inst.telefono || "-"} | Banco: ${inst.banco || "-"} | Cta: ${inst.cuenta || "-"}`, "", ["Obra", "Apto", "Elemento", "Cant.", "Precio", "Total", "Fecha"].join("\t"), ...rows.map(r => [r.obra, r.apto, r.el, r.cant, r.precio, r.precio * r.cant, r.fecha].join("\t")), "", `Bruto\t\t\t\t\t${res.bruto}`, `Retención 10%\t\t\t\t\t-${res.ret}`, `Subtotal\t\t\t\t\t${res.sub}`, res.pas > 0 ? `Pasajes\t\t\t\t\t${res.pas}` : "", res.bon > 0 ? `Bonificación\t\t\t\t\t${res.bon}` : "", `TOTAL\t\t\t\t\t${res.total}`].filter(x => x !== undefined).join("\n");
  }

  function descargarPDF(inst, rows, res) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;

    // ── Encabezado ──
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(inst.nombre || "—", margin, 50);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
    doc.text(`C.C. ${inst.cedula || "-"}   ·   Tel: ${inst.telefono || "-"}`, margin, 66);
    doc.text(`${inst.banco || "-"} ${inst.cuenta || ""}`.trim(), margin, 79);
    doc.setFont("helvetica", "bold"); doc.setTextColor(234, 88, 12);
    doc.text(`Corte: ${corte.label}`, margin, 95);
    doc.setTextColor(0);

    // ── Tabla de filas (paginación automática) ──
    const body = rows.filter(r => !r.adj || r.apr).map(r => [
      r.obra || "", r.apto || "", r.el || "",
      String(r.cant ?? 1), fmt(r.precio || 0), fmt((r.precio || 0) * (r.cant || 1)),
    ]);
    autoTable(doc, {
      startY: 108,
      head: [["Obra", "Apto", "Elemento", "Cant.", "P. unit.", "Total"]],
      body,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        3: { halign: "center", cellWidth: 40 },
        4: { halign: "right", cellWidth: 70 },
        5: { halign: "right", cellWidth: 78, fontStyle: "bold" },
      },
      didDrawPage: () => {
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageW - margin, pageH - 20, { align: "right" });
        doc.setTextColor(0);
      },
    });

    // ── Resumen de totales (alineado a la derecha; pagina solo si no cabe) ──
    const resumen = [
      ["Total bruto", fmt(res.bruto)],
      ["Retención 10%", `- ${fmt(res.ret)}`],
      ["Subtotal", fmt(res.sub)],
      ...(res.pas > 0 ? [["Pasajes", fmt(res.pas)]] : []),
      ...(res.bon > 0 ? [["Bonificación", fmt(res.bon)]] : []),
      ...(res.dia > 0 ? [["Días laborados", fmt(res.dia)]] : []),
      ...(res.abono > 0 ? [["Abono a préstamo", `- ${fmt(res.abono)}`]] : []),
      ["Total a pagar", fmt(res.total)],
    ];
    const totW = 240;
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      body: resumen,
      theme: "plain",
      margin: { left: pageW - margin - totW },
      tableWidth: totW,
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { textColor: 80 }, 1: { halign: "right", fontStyle: "bold" } },
      didParseCell: (data) => {
        if (data.row.index === resumen.length - 1) {   // fila "Total a pagar"
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 12;
          data.cell.styles.textColor = [22, 101, 52];
        }
      },
    });

    const slug = s => (s || "").toString().replace(/[^\w]+/g, "_");
    doc.save(`Liquidacion_${slug(inst.nombre)}_${slug(corte.label)}.pdf`);
  }

  return (
    <div>
      {expM && <Modal title={expM.tipo === "pdf" ? "Reporte" : "Excel — Copiar"} onClose={() => setExpM(null)} wide>
        {expM.tipo === "pdf" ? (<div style={{ border: `1px solid ${C.g2}`, borderRadius: 12, padding: 20, fontSize: 13, lineHeight: 1.7 }}>
          <div style={{ borderBottom: `3px solid ${C.or}`, paddingBottom: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{expM.inst.nombre}</div>
            <div style={{ fontSize: 12, color: C.g5 }}>C.C. {expM.inst.cedula} · Tel: {expM.inst.telefono || "-"} · {expM.inst.banco || "-"} {expM.inst.cuenta || ""}</div>
            <span style={{ ...bdg("orange"), marginTop: 6, display: "inline-block" }}>Corte: {corte.label}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
            <thead><tr style={{ background: C.orL }}>{["Obra", "Apto", "Elemento", "Cant.", "P.unit.", "Total", "Fecha"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: C.orD, borderBottom: `2px solid ${C.orM}` }}>{h}</th>)}</tr></thead>
            <tbody>{expM.rows.filter(r => !r.adj || r.apr).map((r, i) => <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : C.g0 }}><td style={{ padding: "5px 8px" }}>{r.obra}</td><td style={{ padding: "5px 8px" }}>{r.apto}</td><td style={{ padding: "5px 8px" }}>{r.el}{r.desc && <span style={{ color: "#8E8E93", fontStyle: "italic" }}> — {r.desc}</span>}</td><td style={{ padding: "5px 8px", textAlign: "center" }}>{r.cant}</td><td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(r.precio)}</td><td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(r.precio * r.cant)}</td><td style={{ padding: "5px 8px" }}>{r.fecha}</td></tr>)}</tbody>
          </table>
          <div style={{ background: C.g0, borderRadius: 8, padding: "12px 16px" }}>
            {[["Total bruto", expM.res.bruto], ["Retención 10%", -expM.res.ret], ["Subtotal", expM.res.sub], expM.res.pas > 0 ? ["Pasajes", expM.res.pas] : null, expM.res.bon > 0 ? ["Bonificación", expM.res.bon] : null, expM.res.abono > 0 ? ["Abono a préstamo", -expM.res.abono] : null, ["Total a pagar", expM.res.total]].filter(Boolean).map(([l, v], i, a) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < a.length - 1 ? `1px solid ${C.g2}` : "none", fontWeight: i === a.length - 1 ? 700 : 400, fontSize: i === a.length - 1 ? 16 : 13, color: i === a.length - 1 ? C.gnD : C.bk, marginTop: i === a.length - 1 ? 6 : 0 }}><span>{l}</span><span>{v < 0 ? `— ${fmt(Math.abs(v))}` : fmt(v)}</span></div>
            ))}
          </div>
        </div>) : (<div>
          <p style={{ fontSize: 13, color: C.g5, margin: "0 0 12px" }}>Copia y pega en Excel o Google Sheets.</p>
          <textarea readOnly value={expM.txt} style={{ width: "100%", height: 260, fontFamily: "monospace", fontSize: 12, padding: 12, borderRadius: 8, border: `1px solid ${C.g2}`, background: C.g0, boxSizing: "border-box", resize: "vertical" }} onFocus={e => e.target.select()} />
          <p style={{ fontSize: 12, color: C.g4, margin: "8px 0 0" }}>Clic en el área → Ctrl+A → Ctrl+C</p>
        </div>)}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          {expM.tipo === "pdf" && <Btn variant="primary" onClick={() => descargarPDF(expM.inst, expM.rows, expM.res)}>Descargar PDF</Btn>}
          <Btn onClick={() => setExpM(null)}>Cerrar</Btn>
        </div>
      </Modal>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>Liquidación</h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: -14 }}>
          {!hist && user.rol !== ROLES.IN && <div style={{ width: 170 }}>
            <Sel label="Instalador" value={filtInst} onChange={e => setFiltInst(e.target.value)}>
              <option value="">Todos</option>
              {INs.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
            </Sel>
          </div>}
          {!hist && <div style={{ width: 170 }}>
            <Sel label="Obra" value={filtObra} onChange={e => setFiltObra(e.target.value)}>
              <option value="">Todas</option>
              {obrasCorte.map(o => <option key={o} value={o}>{o}</option>)}
            </Sel>
          </div>}
          <div style={{ marginBottom: 14 }}>
            <Btn onClick={() => setHist(!hist)} variant={hist ? "primary" : "default"}>{hist ? "Ver corte actual" : "Historial"}</Btn>
          </div>
        </div>
      </div>

      {hist ? <Historial liqs={liqs} setLiqs={setLiqs} user={user} users={users} toast={toast} /> : (
        <>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: C.g5, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>Corte de pago</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {cortes.map((c, i) => <button key={i} onClick={() => setCi(i)} style={{ ...bdg(ci === i ? "orange" : "gray"), cursor: "pointer", fontWeight: ci === i ? 700 : 400 }}>{c.label}</button>)}
            </div>
            <p style={{ fontSize: 12, color: C.g4, margin: "8px 0 0" }}>Del {corte.desde.toLocaleDateString("es-CO")} al {corte.hasta.toLocaleDateString("es-CO")}</p>
          </div>
          {ocultos > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, fontSize: 13, color: C.g5, flexWrap: "wrap" }}>
              <span>{verTodos ? `Mostrando a todos (${ocultos} sin corte)` : `${ocultos} instalador(es) sin corte están ocultos`}</span>
              <button onClick={() => setVerTodos(v => !v)}
                style={{ ...bdg(verTodos ? "orange" : "gray"), cursor: "pointer", fontWeight: 600 }}>
                {verTodos ? "Ver solo los que tienen corte" : "Ver todos"}
              </button>
            </div>
          )}
          {visibles.length === 0 && (filtInst || filtObra) && <p style={{ fontSize: 13, color: C.g4 }}>Ningún instalador coincide con los filtros en este corte.</p>}
          {visibles.length === 0 && !filtInst && !filtObra && <p style={{ fontSize: 13, color: C.g4 }}>Nadie tiene movimientos en este corte todavía.</p>}
          {visibles.map(({ inst, cerr, rows, res }) => {
            return <div key={inst.id} style={{ ...card, marginBottom: 16, borderLeft: `4px solid ${cerr ? C.gn : rows.length > 0 ? C.or : C.g2}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{inst.nombre}</div>
                  <div style={{ fontSize: 13, color: C.g5, marginTop: 2 }}>C.C. {inst.cedula || "—"} · {inst.telefono || "—"}</div>
                  <div style={{ fontSize: 13, color: C.g5 }}>{inst.banco ? `${inst.banco} — ${inst.cuenta}` : "Sin datos bancarios"}</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={bdg("green")}>Instalador</span>
                    {cerr && <span style={bdg(cerr.estado === "pagado" ? "green" : "amber")}>
                      {cerr.estado === "pagado" ? "✓ Pagada" : "Cerrada · falta pago"}
                    </span>}
                    {res.pendAdj > 0 && <span style={bdg("amber")}>{res.pendAdj} ajuste(s) pendiente(s)</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: C.g4, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>Total a pagar</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: C.gnD }}>{fmt(res.total)}</div>
                </div>
              </div>
              {rows.length > 0 && <div style={{ borderTop: `1px solid ${C.g2}`, paddingTop: 12, marginBottom: 12 }}>
                {rows.map((r, i) => <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.g1}`, flexWrap: "wrap", opacity: r.adj && !r.apr ? 0.55 : 1 }}>
                  <span style={{ color: C.g4, minWidth: 80 }}>{r.obra?.substring(0, 14)}</span>
                  <span style={{ fontWeight: 500 }}>Apto {r.apto}</span>
                  <span style={{ flex: 1 }}>{r.el}{r.desc && <span style={{ color: C.g5, fontStyle: "italic" }}> — {r.desc}</span>}{r.adj && !r.apr && <span style={{ marginLeft: 6, ...bdg("amber"), fontSize: 10 }}>pendiente</span>}</span>
                  <span style={{ fontWeight: 700, minWidth: 90, textAlign: "right" }}>{fmt(r.precio * r.cant)}</span>
                </div>)}
              </div>}
              {rows.length > 0 && <div style={{ background: C.g0, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
                {[["Total bruto", res.bruto], ["Retención 10%", -res.ret], ["Subtotal", res.sub], res.pas > 0 ? ["Pasajes", res.pas] : null, res.bon > 0 ? ["Bonificación", res.bon] : null, res.dia > 0 ? ["Días laborados", res.dia] : null, res.abono > 0 ? ["Abono a préstamo", -res.abono] : null].filter(Boolean).map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${C.g2}` }}><span style={{ color: C.g5 }}>{l}</span><span style={{ fontWeight: 500 }}>{v < 0 ? `— ${fmt(Math.abs(v))}` : fmt(v)}</span></div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0", fontWeight: 700, fontSize: 16, color: C.gnD }}><span>Total a pagar</span><span>{fmt(res.total)}</span></div>
              </div>}
              {(() => {
                const aj = users.find(u => u.id === inst.id)?.ajustes?.[corte.label] || {};
                const edita = (esOficina(user) || user.rol === ROLES.IN) && !cerr;   // SA edita; IN propone
                const tmp = ajTmp[inst.id] || {};
                const diasAj = Array.isArray(aj.dias) ? aj.dias : [];
                if (!edita && !(aj.pasajes || aj.bonificacion || diasAj.length)) return null;
                const guardarDias = nuevos => guardarAjuste(inst.id, { dias: nuevos });
                return <div style={{ background: C.amL, border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#B45309", marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
                    Pasajes, bonificación y días laborados
                    {aj.aprobado ? <span style={{ ...bdg("green"), fontSize: 10 }}>✓ Aprobado</span> : (aj.pasajes || aj.bonificacion || diasAj.length) ? <span style={{ ...bdg("amber"), fontSize: 10 }}>⏳ Pendiente</span> : null}
                  </div>
                  {edita ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <Inp label="Pasajes ($)" type="number" min="0"
                      value={tmp.pasajes ?? aj.pasajes ?? ""}
                      onChange={e => setAjTmp(s => ({ ...s, [inst.id]: { ...tmp, pasajes: e.target.value } }))}
                      onBlur={e => guardarAjuste(inst.id, { pasajes: Number(e.target.value) || 0 })} />
                    <Inp label="Bonificación ($)" type="number" min="0"
                      value={tmp.bonificacion ?? aj.bonificacion ?? ""}
                      onChange={e => setAjTmp(s => ({ ...s, [inst.id]: { ...tmp, bonificacion: e.target.value } }))}
                      onBlur={e => guardarAjuste(inst.id, { bonificacion: Number(e.target.value) || 0 })} />
                  </div> : <div style={{ fontSize: 13, color: C.g5 }}>Pasajes: {fmt(aj.pasajes || 0)} · Bonificación: {fmt(aj.bonificacion || 0)}</div>}

                  {/* Días laborados: jornales del corte, por obra */}
                  <div style={{ marginTop: 10, borderTop: "1px dashed #FDE68A", paddingTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#B45309", marginBottom: 6 }}>Días laborados</div>
                    {diasAj.length === 0 && !edita && <div style={{ fontSize: 13, color: C.g5 }}>Sin días laborados.</div>}
                    {diasAj.map((d, k) => (
                      <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: edita ? "1.6fr 70px 110px 90px 28px" : "1.6fr 70px 110px 90px", gap: 6, alignItems: "center" }}>
                        {edita ? <>
                          <select value={d.obraId || ""} onChange={e => guardarDias(diasAj.map((x, j) => j === k ? { ...x, obraId: e.target.value } : x))}
                            style={{ padding: "6px 8px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 13 }}>
                            <option value="">— Obra —</option>
                            {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                          </select>
                          <input type="number" min="0" step="0.5" placeholder="Días" defaultValue={d.dias}
                            onBlur={e => guardarDias(diasAj.map((x, j) => j === k ? { ...x, dias: Number(e.target.value) || 0 } : x))}
                            style={{ padding: "6px 8px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 13, textAlign: "right" }} />
                          <input type="number" min="0" placeholder="Valor día" defaultValue={d.valorDia}
                            onBlur={e => guardarDias(diasAj.map((x, j) => j === k ? { ...x, valorDia: Number(e.target.value) || 0 } : x))}
                            style={{ padding: "6px 8px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 13, textAlign: "right" }} />
                        </> : <>
                          <span style={{ fontSize: 13 }}>{obras.find(o => o.id === d.obraId)?.nombre || "—"}</span>
                          <span style={{ fontSize: 13, textAlign: "right" }}>{d.dias} día(s)</span>
                          <span style={{ fontSize: 13, textAlign: "right" }}>{fmt(d.valorDia)}</span>
                        </>}
                        <span style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{fmt(Number(d.dias || 0) * Number(d.valorDia || 0))}</span>
                        {edita && <span onClick={() => guardarDias(diasAj.filter((_, j) => j !== k))} title="Quitar"
                          style={{ cursor: "pointer", color: C.rd, fontWeight: 700, textAlign: "center" }}>✕</span>}
                      </div>
                      {/* En qué se invirtieron esos días: sin esto, un jornal queda sin sustento */}
                      {edita
                        ? <input defaultValue={d.desc || ""} placeholder="¿En qué se invirtió el tiempo? Ej: retiro de material, apoyo en montaje…"
                            onBlur={e => guardarDias(diasAj.map((x, j) => j === k ? { ...x, desc: e.target.value.trim() } : x))}
                            style={{ width: "100%", boxSizing: "border-box", marginTop: 4, padding: "6px 8px", border: `1px solid ${d.desc ? C.g2 : "#FDBA74"}`, borderRadius: 6, fontSize: 12.5, background: d.desc ? C.wh : "#FFFBEB" }} />
                        : d.desc
                          ? <div style={{ fontSize: 12, color: C.g5, marginTop: 2, fontStyle: "italic" }}>{d.desc}</div>
                          : <div style={{ fontSize: 12, color: C.or, marginTop: 2 }}>Sin descripción de la actividad</div>}
                      </div>
                    ))}
                    {edita && <button onClick={() => guardarDias([...diasAj, { obraId: "", dias: 1, valorDia: 0, desc: "" }])}
                      style={{ ...bdg("amber"), cursor: "pointer", fontSize: 12 }}>+ Agregar días</button>}
                  </div>

                  {esOficina(user) && !cerr && (aj.pasajes || aj.bonificacion || diasAj.length) ? <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                    {!aj.aprobado && <Btn variant="success" onClick={() => aprobarAjuste(inst.id)}>Aprobar</Btn>}
                    <Btn variant="danger" onClick={() => eliminarAjuste(inst.id)}>Eliminar</Btn>
                  </div> : null}
                </div>;
              })()}
              {rows.length === 0 && <p style={{ fontSize: 13, color: C.g3, margin: "8px 0" }}>Sin instalaciones en este corte.</p>}

              {/* ── Revisión de gerencia ───────────────────────────────
                  El corte ya lo cerró el coordinador. Aquí superadmin aplica el abono
                  a préstamo y lo manda a pagar. El corte NO se reescribe: el abono vive
                  en préstamos y el neto se muestra restando. */}
              {cerr && (() => {
                const deuda = saldoPrestamo(movPres, inst.id);
                const abonado = abonoDelCorte(inst.id);
                const pagado = cerr.estado === "pagado";
                const neto = Number(cerr.total || 0) - abonado;
                if (!esSuper && !abonado && deuda <= 0) return null;
                return (
                  <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10,
                    background: pagado ? C.gnL : "#EFF6FF", border: `1px solid ${pagado ? "#BBF7D0" : "#BFDBFE"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: pagado ? C.gnD : "#1E40AF", textTransform: "uppercase", letterSpacing: ".05em" }}>
                        {pagado ? "✓ Pagado" : "Pendiente de pago — revisión de gerencia"}
                      </span>
                      {deuda > 0 && <span style={{ fontSize: 12, color: C.g5 }}>Debe de préstamos: <strong style={{ color: C.rd }}>{fmt(deuda)}</strong></span>}
                    </div>

                    <div style={{ display: "grid", gap: 3, fontSize: 13, maxWidth: 420, marginLeft: "auto" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: C.g5 }}>Total a pagar</span><strong>{fmt(cerr.total)}</strong>
                      </div>
                      {abonado > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: C.rd }}>
                        <span>Abono a préstamo</span><strong>− {fmt(abonado)}</strong>
                      </div>}
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.g2}`, paddingTop: 3, fontWeight: 800 }}>
                        <span>Valor a pagar neto</span><span style={{ color: C.gnD }}>{fmt(neto)}</span>
                      </div>
                    </div>

                    {esSuper && !pagado && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10, justifyContent: "flex-end" }}>
                        {deuda > 0 || abonado > 0 ? <>
                          <span style={{ fontSize: 13, color: C.g5 }}>Abonar al préstamo</span>
                          <input type="number" min="0" placeholder="0" defaultValue={abonado || ""}
                            onBlur={e => aplicarAbono(inst, Number(e.target.value) || 0, e)}
                            style={{ width: 120, padding: "6px 8px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 13, textAlign: "right" }} />
                        </> : null}
                        <Btn variant="success" onClick={() => marcarPagado(cerr)}>Marcar como pagado</Btn>
                      </div>
                    )}
                    {esSuper && pagado && <div style={{ fontSize: 11.5, color: C.g5, marginTop: 6, textAlign: "right" }}>
                      Ya pagado: el abono queda quieto. Si hay que corregir, regístralo en Préstamos.
                    </div>}
                    {!esSuper && !pagado && <div style={{ fontSize: 11.5, color: C.g5, marginTop: 6, textAlign: "right" }}>
                      El descuento y el pago los maneja gerencia.
                    </div>}
                  </div>
                );
              })()}

              {canExp && rows.length > 0 && <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 10 }}>
                <Btn variant="success" onClick={() => setExpM({ tipo: "excel", inst, rows, res, txt: excelTxt(inst, rows, res) })}>Excel</Btn>
                <Btn variant="primary" onClick={() => setExpM({ tipo: "pdf", inst, rows, res })}>PDF</Btn>
                {!cerr && esOficina(user) && <Btn variant="amber" onClick={() => cerrar(inst)}>✓ Cerrar corte</Btn>}
              </div>}
            </div>;
          })}
        </>
      )}
    </div>
  );
}

function Historial({ liqs, setLiqs, user, users, toast }) {
  const [fi, setFi] = useState("");
  const [det, setDet] = useState(null);
  const [editL, setEditL] = useState(null);
  const [editRows, setEditRows] = useState([]);
  const [newRow, setNewRow] = useState({ el: "", cant: 1, precio: 0 });
  const INs = users.filter(u => u.rol === ROLES.IN);
  const canEdit = esOficina(user);
  const items = liqs.filter(l => user.rol === ROLES.IN ? l.inst_id === user.id : (!fi || l.inst_id === fi)).sort((a, b) => b.id.localeCompare(a.id));
  const totalPagado = items.reduce((s, l) => s + (l.total || 0), 0);
  const totalBruto = items.reduce((s, l) => s + (l.bruto || 0), 0);

  // Las filas persistidas nunca traen ajustes: detalle() las crea con adj:false y
  // cerrar() guarda pas/bon aparte, desde user.ajustes. Sin filas adj se conservan
  // los del snapshot (base) en vez de pisarlos con cero.
  function recalcTotales(rows, base) {
    const bruto = rows.filter(r => !r.adj).reduce((s, r) => s + (r.precio || 0) * (r.cant || r.cantidad || 1), 0);
    const ret = Math.round(bruto * 0.1);
    const sub = bruto - ret;
    const fPas = rows.filter(r => r.adj && r.el === "Pasajes" && r.apr);
    const fBon = rows.filter(r => r.adj && r.el === "Bonificación" && r.apr);
    const pas = fPas.length ? fPas.reduce((s, r) => s + (r.precio || 0), 0) : (base?.pas || 0);
    const bon = fBon.length ? fBon.reduce((s, r) => s + (r.precio || 0), 0) : (base?.bon || 0);
    const dia = rows.filter(r => r.adj && r.el === "Día laborado" && r.apr).reduce((s, r) => s + (r.precio || 0) * (r.cant || 1), 0);
    return { bruto, ret, sub, pas, bon, total: sub + pas + bon + dia };
  }

  async function guardarEdicion() {
    const totales = recalcTotales(editRows, editL);
    const updated = { ...editL, rows: editRows, ...totales };
    const r = await dbUpsert("liquidaciones", liqToDb(updated));
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      toast(`No se pudo guardar la liquidación (${r.status}). ${txt.slice(0, 140)}`, "error");
      return;
    }
    setLiqs(x => x.map(l => l.id === editL.id ? updated : l));
    setEditL(null);
    toast("Liquidación actualizada", "ok");
  }

  function abrirEdicion(l) {
    setEditL(l);
    setEditRows((l.rows || []).map(r => ({ ...r })));
    setNewRow({ el: "", cant: 1, precio: 0 });
  }

  return (
    <div>
      {editL && <Modal title={`Editar liquidación — ${editL.inst_nombre}`} onClose={() => setEditL(null)} wide>
        <p style={{ fontSize: 13, color: C.g5, margin: "0 0 12px" }}>Modifica precios, agrega o elimina filas. Los totales se recalculan automáticamente.</p>
        <div style={{ maxHeight: 340, overflowY: "auto", display: "grid", gap: 6, marginBottom: 12 }}>
          {editRows.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: C.g0, borderRadius: 8, border: `1px solid ${C.g2}` }}>
              <div style={{ flex: 1, fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>{r.obra ? `${r.obra} — Apto ${r.apto}` : "Adicional"}</div>
                <div style={{ color: C.g5, fontSize: 12 }}>{r.el} × {r.cant || r.cantidad || 1}</div>
              </div>
              <input type="number" min="0" value={r.precio || 0}
                onChange={e => setEditRows(rows => rows.map((x, j) => j === i ? { ...x, precio: Number(e.target.value) } : x))}
                style={{ width: 110, padding: "5px 8px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 13, textAlign: "right" }} />
              <button onClick={() => setEditRows(rows => rows.filter((_, j) => j !== i))} style={{ ...bdg("red"), cursor: "pointer", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, fontWeight: 700 }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 14px", background: C.orL, border: `1px solid ${C.orM}`, borderRadius: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.orD, marginBottom: 8 }}>Agregar fila</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px auto", gap: 8, alignItems: "end" }}>
            <div><label style={lbl()}>Descripción</label><input value={newRow.el} onChange={e => setNewRow(n => ({ ...n, el: e.target.value }))} style={iSt} placeholder="Ej: Zócalo, Adicional..." /></div>
            <div><label style={lbl()}>Cant.</label><input type="number" min="1" step="0.1" value={newRow.cant} onChange={e => setNewRow(n => ({ ...n, cant: e.target.value }))} style={iSt} /></div>
            <div><label style={lbl()}>Precio ($)</label><input type="number" min="0" value={newRow.precio} onChange={e => setNewRow(n => ({ ...n, precio: e.target.value }))} style={iSt} /></div>
            <Btn variant="primary" onClick={() => { if (!newRow.el || !Number(newRow.precio)) return; setEditRows(rows => [...rows, { el: newRow.el, cant: Number(newRow.cant), precio: Number(newRow.precio), adj: false, apr: true }]); setNewRow({ el: "", cant: 1, precio: 0 }); }}>+</Btn>
          </div>
        </div>
        {(() => { const t = recalcTotales(editRows, editL); return (
          <div style={{ background: C.g0, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14 }}>
            {[["Total bruto", t.bruto], ["Retención 10%", -t.ret], ["Subtotal", t.sub], t.pas > 0 ? ["Pasajes", t.pas] : null, t.bon > 0 ? ["Bonificación", t.bon] : null, ["Total a pagar", t.total]].filter(Boolean).map(([lb, v], i, a) => (
              <div key={lb} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: i === a.length - 1 ? 700 : 400, color: i === a.length - 1 ? C.gnD : C.bk }}><span>{lb}</span><span>{v < 0 ? `— ${fmt(Math.abs(v))}` : fmt(v)}</span></div>
            ))}
          </div>
        ); })()}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn onClick={() => setEditL(null)}>Cancelar</Btn>
          <Btn variant="primary" onClick={guardarEdicion}>Guardar cambios</Btn>
        </div>
      </Modal>}

      <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.bk }}>Historial de liquidaciones</h3>
      {items.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {[["Cortes pagados", String(items.length)], ["Total bruto histórico", fmt(totalBruto)], ["Total neto recibido", fmt(totalPagado)]].map(([l, v]) => (
            <div key={l} style={{ background: C.wh, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.g2}` }}>
              <div style={{ fontSize: 11, color: C.g4, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.gnD }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {user.rol !== ROLES.IN && <Sel label="Filtrar por instalador" value={fi} onChange={e => setFi(e.target.value)}><option value="">Todos</option>{INs.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}</Sel>}
      {items.length === 0 && <p style={{ fontSize: 13, color: C.g4 }}>No hay liquidaciones cerradas.</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {items.map(l => <div key={l.id} style={{ ...card, borderLeft: `4px solid ${C.gn}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{l.inst_nombre}</div>
              <div style={{ fontSize: 12, color: C.g5 }}>C.C. {l.inst_cedula} · Corte: {l.corte}</div>
              <div style={{ fontSize: 12, color: C.g5 }}>Cerrado el {l.fecha_cierre} por {l.cerrado_por}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: C.g4, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>Total pagado</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.gnD }}>{fmt(l.total)}</div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 4 }}>
                <button onClick={() => setDet(det?.id === l.id ? null : l)} style={{ ...bdg("orange"), cursor: "pointer" }}>{det?.id === l.id ? "Ocultar" : "Ver detalle"}</button>
                {canEdit && <button onClick={() => abrirEdicion(l)} style={{ ...bdg("gray"), cursor: "pointer" }}>✎ Editar</button>}
              </div>
            </div>
          </div>
          {det?.id === l.id && <div style={{ marginTop: 12, borderTop: `1px solid ${C.g2}`, paddingTop: 12 }}>
            {(l.rows || []).map((r, i) => <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, padding: "4px 0", borderBottom: `1px solid ${C.g1}`, flexWrap: "wrap" }}><span style={{ color: C.g4, minWidth: 80 }}>{r.obra?.substring(0, 14)}</span><span>Apto {r.apto}</span><span style={{ flex: 1 }}>{r.el || r.elemento}</span><span style={{ fontWeight: 700, minWidth: 90, textAlign: "right" }}>{fmt((r.precio || 0) * (r.cant || r.cantidad || 1))}</span></div>)}
            <div style={{ marginTop: 10, background: C.g0, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
              {[["Total bruto", l.bruto], ["Retención 10%", -(l.ret || 0)], ["Subtotal", l.sub], l.pas > 0 ? ["Pasajes", l.pas] : null, l.bon > 0 ? ["Bonificación", l.bon] : null, ["Total pagado", l.total]].filter(Boolean).map(([lb, v], i, a) => (
                <div key={lb} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: i === a.length - 1 ? 700 : 400, color: i === a.length - 1 ? C.gnD : C.bk }}><span>{lb}</span><span>{v < 0 ? `— ${fmt(Math.abs(v))}` : fmt(v)}</span></div>
              ))}
            </div>
          </div>}
        </div>)}
      </div>
    </div>
  );
}

// ── REPORTES ──────────────────────────────────────────────
function Reportes({ obras, elems, users, user, getPrecio, avanceObra, liqs = [], movPres = [] }) {
  const [tipo, setTipo] = useState("resumen");
  const [obraId, setObraId] = useState("");
  const [instId, setInstId] = useState("");
  const [expM, setExpM] = useState(null);
  const INs = users.filter(u => u.rol === ROLES.IN);
  const [corteSel, setCorteSel] = useState("");
  const [corteVista, setCorteVista] = useState("obra");   // "obra" | "inst"
  const tabs = [
    { k: "resumen", l: "Resumen por obra" },
    { k: "detalle", l: "Detalle por obra" },
    { k: "instalador", l: "Por instalador" },
    { k: "retenidos", l: "Retenidos" },
    { k: "cortes", l: "Pagos por corte" },
    ...(user.rol === ROLES.SA ? [{ k: "prestamos", l: "Préstamos" }] : []),   // solo gerencia
  ];

  // ── Informes sobre los cortes ya cerrados (tabla liquidaciones) ──
  // Cada liquidación guarda sus filas con la obra, así que se puede repartir
  // lo causado y el retenido (10%) obra por obra.
  const esAdjRow = r => !!r.adj || r.el === "Día laborado";
  const cortes = [...new Set(liqs.map(l => l.corte))].sort().reverse();

  function porObraDeLiq(l) {
    const m = {};
    for (const r of l.rows || []) {
      if (esAdjRow(r)) continue;
      const k = r.obra || "—";
      m[k] = (m[k] || 0) + Number(r.precio || 0) * Number(r.cant || 1);
    }
    return Object.entries(m).map(([obra, causado]) => ({ obra, causado, ret: Math.round(causado * 0.1) }));
  }

  // Retenidos de un instalador, corte por corte y obra por obra
  function retenidosDe(iId) {
    const filas = [];
    for (const l of liqs.filter(x => !iId || x.inst_id === iId)) {
      for (const o of porObraDeLiq(l)) {
        filas.push({ corte: l.corte, fecha: l.fecha_cierre || l.created_at?.slice(0, 10) || "",
          inst: l.inst_nombre, obra: o.obra, causado: o.causado, ret: o.ret });
      }
    }
    return filas.sort((a, b) => String(b.corte).localeCompare(String(a.corte)) || String(a.obra).localeCompare(String(b.obra)));
  }

  // ── Exportables ───────────────────────────────────────────
  const hoyStr = () => new Date().toLocaleDateString("es-CO");

  function excel(nombreHoja, aoa, anchos, colsMoneda, archivo) {
    const hoja = XLSX.utils.aoa_to_sheet(aoa);
    hoja["!cols"] = anchos.map(w => ({ wch: w }));
    const r = XLSX.utils.decode_range(hoja["!ref"]);
    for (let i = 0; i <= r.e.r; i++) for (const c of colsMoneda) {
      const cel = hoja[XLSX.utils.encode_cell({ r: i, c })];
      if (cel && typeof cel.v === "number") cel.z = '"$"#,##0';
    }
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
    XLSX.writeFile(libro, archivo.replace(/[\\/:*?"<>|]/g, ""));
  }

  function pdfTabla(titulo, sub, head, body, archivo, alineacion = {}) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const m = 40;
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(titulo, m, 50);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
    doc.text(sub, m, 66);
    doc.text(`Generado el ${hoyStr()} · Santa Lucía Muebles y Pisos`, m, 79);
    doc.setTextColor(0);
    autoTable(doc, {
      startY: 94, head: [head], body,
      margin: { left: m, right: m },
      styles: { fontSize: 8.5, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold" },
      columnStyles: alineacion,
    });
    doc.save(archivo.replace(/[\\/:*?"<>|]/g, ""));
  }

  // Pagos de un corte, agrupados por obra
  function pagosDeCorte(label) {
    const m = {};
    let pas = 0, bon = 0, dias = 0, totalPagado = 0;
    for (const l of liqs.filter(x => x.corte === label)) {
      pas += Number(l.pas || 0); bon += Number(l.bon || 0); totalPagado += Number(l.total || 0);
      dias += (l.rows || []).filter(r => r.el === "Día laborado" && r.apr !== false)
        .reduce((s, r) => s + Number(r.precio || 0) * Number(r.cant || 1), 0);
      for (const r of l.rows || []) {
        if (esAdjRow(r)) continue;
        const k = r.obra || "—";
        const v = Number(r.precio || 0) * Number(r.cant || 1);
        const e = m[k] || (m[k] = { obra: k, causado: 0, adic: 0, personas: new Set() });
        e.causado += v;
        if (String(r.el || "").startsWith("[Adicional]")) e.adic += v;
        e.personas.add(l.inst_nombre);
      }
    }
    const obrasArr = Object.values(m).map(e => ({ ...e, personas: e.personas.size, ret: Math.round(e.causado * 0.1), neto: e.causado - Math.round(e.causado * 0.1) }))
      .sort((a, b) => b.causado - a.causado);
    return { obras: obrasArr, pas, bon, dias, totalPagado };
  }

  // Los mismos pagos del corte, pero uno por instalador. Sale de la liquidación
  // que se le cerró a cada quien, así que cuadra con lo que se le pagó.
  function pagosDeCorteInst(label) {
    const filas = liqs.filter(x => x.corte === label).map(l => {
      const dias = (l.rows || []).filter(r => r.el === "Día laborado" && r.apr !== false)
        .reduce((s, r) => s + Number(r.precio || 0) * Number(r.cant || 1), 0);
      const obrasDeEl = [...new Set((l.rows || []).filter(r => !esAdjRow(r)).map(r => r.obra || "—"))];
      return {
        id: l.id, inst: l.inst_nombre || "—", cedula: l.inst_cedula || "",
        obras: obrasDeEl, causado: Number(l.bruto || 0), ret: Number(l.ret || 0),
        sub: Number(l.sub || 0), pas: Number(l.pas || 0), bon: Number(l.bon || 0),
        dias, total: Number(l.total || 0),
      };
    }).sort((a, b) => b.total - a.total);
    const suma = k => filas.reduce((s, f) => s + f[k], 0);
    return {
      filas,
      tot: { causado: suma("causado"), ret: suma("ret"), sub: suma("sub"), pas: suma("pas"), bon: suma("bon"), dias: suma("dias"), total: suma("total") },
    };
  }

  function resumenObras() {
    return obras.map(o => {
      const av = avanceObra(o);
      const tot = o.pisos?.reduce((s, p) => s + (p.aptos?.length || 0), 0) || 0;
      const allEls = o.pisos?.flatMap(p => p.aptos?.flatMap(a => (a.elementos || []).map(el => ({ ...el, aptoId: a.id, tipId: el.tipologiaId || a.tipologia }))) || []) || [];
      const completados = allEls.filter(e => e.completado && !e.esAdicional && !e.elementoId?.startsWith("__")).length;
      // Lo marcado como ya pagado no suma al costo: se pagó en la obra anterior.
      const totalPago = allEls.filter(e => e.completado && !e.yaPagado).reduce((s, el) => {
        if (el.elementoId?.startsWith("__")) return el.aprobado ? s + (el.valorManual || 0) : s;
        if (el.esAdicional) return s + (el.valorUnitario || 0) * (el.cantidad || 1);
        return s + getPrecio(el.elementoId, o.id, "", el.aptoId, el.tipId) * (el.cantidad || 1);
      }, 0);
      return { obra: o, av, tot, completados, totalPago };
    });
  }

  function detalleObra(oId) {
    const o = obras.find(x => x.id === oId);
    if (!o) return [];
    const rows = [];
    o.pisos?.forEach(p => p.aptos?.forEach(a => {
      (a.elementos || []).forEach(el => {
        if (!el.completado) return;
        const elem = elems.find(e => e.id === el.elementoId);
        const inst = users.find(u => u.id === el.instaladorId);
        let nombre, precio;
        if (el.elementoId === "__pasajes__") { nombre = "Pasajes"; precio = el.valorManual || 0; }
        else if (el.elementoId === "__bonificacion__") { nombre = "Bonificación"; precio = el.valorManual || 0; }
        else if (el.esAdicional) { nombre = `[Ad] ${el.descripcion}`; precio = el.valorUnitario || 0; }
        else { nombre = elem?.nombre || el.elementoId; precio = getPrecio(el.elementoId, oId, "", a.id, el.tipologiaId || a.tipologia); }
        if (el.yaPagado) nombre = `[Ya pagado] ${nombre}`;   // instalado, pero pagado en la obra anterior
        rows.push({ piso: p.numero, apto: a.nombre, el: nombre, cant: el.cantidad || 1, precio: el.yaPagado ? 0 : precio, total: el.yaPagado ? 0 : precio * (el.cantidad || 1), inst: inst?.nombre || "—", fecha: el.fecha || "" });
      });
    }));
    return rows;
  }

  function detalleInstalador(iId) {
    const inst = users.find(u => u.id === iId);
    if (!inst) return { inst: null, rows: [], bruto: 0, ret: 0, sub: 0, pas: 0, bon: 0, total: 0 };
    const rows = [];
    obras.forEach(o => o.pisos?.forEach(p => p.aptos?.forEach(a => {
      (a.elementos || []).forEach(el => {
        if (!el.completado || el.yaPagado || el.instaladorId !== iId) return;   // yaPagado: se pagó en la obra anterior
        if (el.elementoId === "__pasajes__" || el.elementoId === "__bonificacion__") return; // migrados a user.ajustes
        const elem = elems.find(e => e.id === el.elementoId);
        let nombre, precio, adj = false, apr = true;
        if (el.esAdicional) { nombre = `[Ad] ${el.descripcion}`; precio = el.valorUnitario || 0; }
        else { nombre = elem?.nombre || el.elementoId; precio = getPrecio(el.elementoId, o.id, "", a.id, el.tipologiaId || a.tipologia); }
        rows.push({ obra: o.nombre, apto: a.nombre, el: nombre, cant: el.cantidad || 1, precio, total: precio * (el.cantidad || 1), fecha: el.fecha || "", adj, apr });
      });
      (a.elementosExtra || []).forEach(el => {
        if (!el.completado || el.yaPagado || el.instaladorId !== iId) return;
        const elem = elems.find(e => e.id === el.elementoId);
        const precio = getPrecio(el.elementoId, o.id, "", a.id, el.tipologiaId);
        rows.push({ obra: o.nombre, apto: a.nombre, el: elem?.nombre || el.elementoId, cant: el.cantidad || 1, precio, total: precio * (el.cantidad || 1), fecha: el.fecha || "", adj: false, apr: true });
      });
    })));
    const bruto = rows.filter(r => !r.adj).reduce((s, r) => s + r.precio * r.cant, 0);
    const ret = Math.round(bruto * 0.1);
    const sub = bruto - ret;
    // Histórico: suma pasajes/bonificación aprobados de TODOS los cortes del instalador.
    const ajs = inst.ajustes || {};
    const pas = Object.values(ajs).reduce((s, x) => s + (x?.aprobado ? Number(x.pasajes) || 0 : 0), 0);
    const bon = Object.values(ajs).reduce((s, x) => s + (x?.aprobado ? Number(x.bonificacion) || 0 : 0), 0);
    return { inst, rows, bruto, ret, sub, pas, bon, total: sub + pas + bon };
  }

  function pdfResumen(data) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("Resumen por obra", margin, 50);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
    doc.text("Gestión de Obras", margin, 66); doc.setTextColor(0);
    autoTable(doc, {
      startY: 80,
      head: [["Obra", "Aptos", "Avance", "Completados", "Total pagado"]],
      body: data.map(d => [d.obra.nombre, String(d.tot), `${d.av}%`, String(d.completados), fmt(d.totalPago)]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold" },
      columnStyles: { 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "right", fontStyle: "bold" } },
      didDrawPage: () => { doc.setFontSize(8); doc.setTextColor(150); doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageW - margin, pageH - 20, { align: "right" }); doc.setTextColor(0); },
    });
    doc.save("Resumen_por_obra.pdf");
  }

  function pdfDetalleObra(o, rows) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(`Detalle — ${o?.nombre || "—"}`, margin, 50);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
    doc.text(o?.direccion || "", margin, 66); doc.setTextColor(0);
    autoTable(doc, {
      startY: 80,
      head: [["Piso", "Apto", "Elemento", "Cant.", "Precio", "Total", "Instalador", "Fecha"]],
      body: rows.map(r => [String(r.piso ?? ""), r.apto || "", r.el || "", String(r.cant ?? 1), fmt(r.precio || 0), fmt(r.total || 0), r.inst || "—", r.fecha || ""]),
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold" },
      columnStyles: { 3: { halign: "center" }, 4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" } },
      didDrawPage: () => { doc.setFontSize(8); doc.setTextColor(150); doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageW - margin, pageH - 20, { align: "right" }); doc.setTextColor(0); },
    });
    const slug = s => (s || "").toString().replace(/[^\w]+/g, "_");
    doc.save(`Detalle_${slug(o?.nombre)}.pdf`);
  }

  function pdfInstalador(inst, rows, res) {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(inst?.nombre || "—", margin, 50);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(90);
    doc.text(`C.C. ${inst?.cedula || "-"}   ·   Tel: ${inst?.telefono || "-"}`, margin, 66);
    doc.text(`${inst?.banco || "-"} ${inst?.cuenta || ""}`.trim(), margin, 79); doc.setTextColor(0);
    const body = rows.filter(r => !r.adj || r.apr).map(r => [
      r.obra || "", r.apto || "", r.el || "", String(r.cant ?? 1), fmt(r.precio || 0), fmt((r.precio || 0) * (r.cant || 1)),
    ]);
    autoTable(doc, {
      startY: 92,
      head: [["Obra", "Apto", "Elemento", "Cant.", "P. unit.", "Total"]],
      body,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: "bold" },
      columnStyles: { 3: { halign: "center", cellWidth: 40 }, 4: { halign: "right", cellWidth: 70 }, 5: { halign: "right", cellWidth: 78, fontStyle: "bold" } },
      didDrawPage: () => { doc.setFontSize(8); doc.setTextColor(150); doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageW - margin, pageH - 20, { align: "right" }); doc.setTextColor(0); },
    });
    const resumen = [
      ["Total bruto", fmt(res.bruto)],
      ["Retención 10%", `- ${fmt(res.ret)}`],
      ["Subtotal", fmt(res.sub)],
      ...(res.pas > 0 ? [["Pasajes", fmt(res.pas)]] : []),
      ...(res.bon > 0 ? [["Bonificación", fmt(res.bon)]] : []),
      ...(res.dia > 0 ? [["Días laborados", fmt(res.dia)]] : []),
      ...(res.abono > 0 ? [["Abono a préstamo", `- ${fmt(res.abono)}`]] : []),
      ["Total a pagar", fmt(res.total)],
    ];
    const totW = 240;
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      body: resumen,
      theme: "plain",
      margin: { left: pageW - margin - totW },
      tableWidth: totW,
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { textColor: 80 }, 1: { halign: "right", fontStyle: "bold" } },
      didParseCell: (data) => { if (data.row.index === resumen.length - 1) { data.cell.styles.fontStyle = "bold"; data.cell.styles.fontSize = 12; data.cell.styles.textColor = [22, 101, 52]; } },
    });
    const slug = s => (s || "").toString().replace(/[^\w]+/g, "_");
    doc.save(`Reporte_${slug(inst?.nombre)}.pdf`);
  }

  const thSt = { padding: "8px 10px", textAlign: "left", fontWeight: 700, color: C.g5, borderBottom: `2px solid ${C.g2}`, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" };
  const tdSt = { padding: "7px 10px", borderBottom: `1px solid ${C.g1}` };

  return (
    <div>
      {expM && <Modal title={expM.tipo === "excel" ? "Exportar — Copiar" : "Reporte PDF"} onClose={() => setExpM(null)} wide>
        {expM.tipo === "excel" ? (
          <div>
            <p style={{ fontSize: 13, color: C.g5, margin: "0 0 12px" }}>Copia y pega en Excel o Google Sheets.</p>
            <textarea readOnly value={expM.txt} style={{ width: "100%", height: 280, fontFamily: "monospace", fontSize: 12, padding: 12, borderRadius: 8, border: `1px solid ${C.g2}`, background: C.g0, boxSizing: "border-box", resize: "vertical" }} onFocus={e => e.target.select()} />
            <p style={{ fontSize: 12, color: C.g4, margin: "8px 0 0" }}>Clic → Ctrl+A → Ctrl+C</p>
          </div>
        ) : (
          <div>
            <div style={{ borderBottom: `3px solid ${C.or}`, paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{expM.titulo}</div>
              <span style={{ ...bdg("orange"), marginTop: 6, display: "inline-block" }}>Gestión de Obras</span>
            </div>
            {expM.tabla}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          {expM.tipo === "pdf" && <Btn variant="primary" onClick={() => {
            if (expM.kind === "resumen") pdfResumen(expM.data);
            else if (expM.kind === "detalle") pdfDetalleObra(expM.obra, expM.rows);
            else if (expM.kind === "instalador") pdfInstalador(expM.inst, expM.rows, expM.res);
          }}>Descargar PDF</Btn>}
          <Btn onClick={() => setExpM(null)}>Cerrar</Btn>
        </div>
      </Modal>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>Reportes</h2>
      </div>
      <div style={{ display: "flex", gap: 4, borderBottom: `2px solid ${C.g2}`, marginBottom: 20 }}>
        {tabs.map(t => <button key={t.k} onClick={() => setTipo(t.k)} style={{ background: "transparent", color: tipo === t.k ? C.or : C.g5, border: "none", borderBottom: tipo === t.k ? `2.5px solid ${C.or}` : "2.5px solid transparent", padding: "10px 16px", cursor: "pointer", fontSize: 14, fontWeight: tipo === t.k ? 600 : 400, marginBottom: -2, fontFamily: "system-ui" }}>{t.l}</button>)}
      </div>

      {tipo === "resumen" && (() => {
        const data = resumenObras();
        const pdfTabla = (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: C.orL }}>{["Obra", "Aptos", "Avance", "Completados", "Total pagado"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 700, color: C.orD, borderBottom: `2px solid ${C.orM}` }}>{h}</th>)}</tr></thead>
            <tbody>{data.map((d, i) => <tr key={d.obra.id} style={{ background: i % 2 === 0 ? "transparent" : C.g0 }}><td style={{ padding: "5px 10px" }}>{d.obra.nombre}</td><td style={{ padding: "5px 10px", textAlign: "center" }}>{d.tot}</td><td style={{ padding: "5px 10px", textAlign: "center" }}>{d.av}%</td><td style={{ padding: "5px 10px", textAlign: "center" }}>{d.completados}</td><td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 700 }}>{fmt(d.totalPago)}</td></tr>)}</tbody>
          </table>
        );
        const excelTxt = ["Resumen por obra", "", ["Obra", "Aptos", "Avance %", "Completados", "Total pagado"].join("\t"), ...data.map(d => [d.obra.nombre, d.tot, `${d.av}%`, d.completados, d.totalPago].join("\t"))].join("\n");
        return (
          <div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 14 }}>
              <Btn variant="success" onClick={() => setExpM({ tipo: "excel", txt: excelTxt })}>Excel</Btn>
              <Btn variant="primary" onClick={() => setExpM({ tipo: "pdf", kind: "resumen", titulo: "Resumen por obra", tabla: pdfTabla, data })}>PDF</Btn>
            </div>
            <div style={card}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr style={{ background: C.g0 }}>{["Obra", "Aptos", "Avance", "Completados", "Total pagado"].map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                <tbody>{data.map(d => <tr key={d.obra.id}><td style={tdSt}><span style={{ fontWeight: 600 }}>{d.obra.nombre}</span><div style={{ fontSize: 12, color: C.g5 }}>{d.obra.direccion}</div></td><td style={{ ...tdSt, textAlign: "center" }}>{d.tot}</td><td style={{ ...tdSt, textAlign: "center" }}><span style={bdg(d.av === 100 ? "green" : d.av > 50 ? "orange" : "gray")}>{d.av}%</span></td><td style={{ ...tdSt, textAlign: "center" }}>{d.completados}</td><td style={{ ...tdSt, textAlign: "right", fontWeight: 700, color: C.gnD }}>{fmt(d.totalPago)}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {tipo === "detalle" && (
        <div>
          <Sel label="Seleccionar obra" value={obraId} onChange={e => setObraId(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </Sel>
          {obraId && (() => {
            const rows = detalleObra(obraId);
            const o = obras.find(x => x.id === obraId);
            const cols = ["Piso", "Apto", "Elemento", "Cant.", "Precio", "Total", "Instalador", "Fecha"];
            const pdfTabla = (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: C.orL }}>{cols.map(h => <th key={h} style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, color: C.orD, borderBottom: `2px solid ${C.orM}` }}>{h}</th>)}</tr></thead>
                <tbody>{rows.map((r, i) => <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : C.g0 }}><td style={{ padding: "5px 8px" }}>{r.piso}</td><td style={{ padding: "5px 8px" }}>{r.apto}</td><td style={{ padding: "5px 8px" }}>{r.el}{r.desc && <span style={{ color: "#8E8E93", fontStyle: "italic" }}> — {r.desc}</span>}</td><td style={{ padding: "5px 8px", textAlign: "center" }}>{r.cant}</td><td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(r.precio)}</td><td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(r.total)}</td><td style={{ padding: "5px 8px" }}>{r.inst}</td><td style={{ padding: "5px 8px" }}>{r.fecha}</td></tr>)}</tbody>
              </table>
            );
            const excelTxt = [`Detalle — ${o?.nombre}`, "", cols.join("\t"), ...rows.map(r => [r.piso, r.apto, r.el, r.cant, r.precio, r.total, r.inst, r.fecha].join("\t"))].join("\n");
            return (
              <div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 14 }}>
                  <Btn variant="success" onClick={() => setExpM({ tipo: "excel", txt: excelTxt })}>Excel</Btn>
                  <Btn variant="primary" onClick={() => setExpM({ tipo: "pdf", kind: "detalle", titulo: `Detalle — ${o?.nombre}`, tabla: pdfTabla, obra: o, rows })}>PDF</Btn>
                </div>
                <div style={card}>
                  {rows.length === 0 ? <p style={{ color: C.g4, fontSize: 14 }}>Sin instalaciones registradas.</p> : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead><tr style={{ background: C.g0 }}>{cols.map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                      <tbody>{rows.map((r, i) => <tr key={i}><td style={tdSt}>{r.piso}</td><td style={tdSt}>{r.apto}</td><td style={tdSt}>{r.el}{r.desc && <span style={{ color: "#8E8E93", fontStyle: "italic" }}> — {r.desc}</span>}</td><td style={{ ...tdSt, textAlign: "center" }}>{r.cant}</td><td style={{ ...tdSt, textAlign: "right" }}>{fmt(r.precio)}</td><td style={{ ...tdSt, textAlign: "right", fontWeight: 700, color: C.gnD }}>{fmt(r.total)}</td><td style={{ ...tdSt, color: C.g5 }}>{r.inst}</td><td style={{ ...tdSt, color: C.g5 }}>{r.fecha}</td></tr>)}</tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tipo === "instalador" && (
        <div>
          <Sel label="Seleccionar instalador" value={instId} onChange={e => setInstId(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {INs.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </Sel>
          {instId && (() => {
            const { inst, rows, bruto, ret, sub, pas, bon, total } = detalleInstalador(instId);
            const cols = ["Obra", "Apto", "Elemento", "Cant.", "Precio", "Total", "Fecha"];
            const resumen = [["Total bruto", bruto], ["Retención 10%", -ret], ["Subtotal", sub], pas > 0 ? ["Pasajes", pas] : null, bon > 0 ? ["Bonificación", bon] : null, ["Total", total]].filter(Boolean);
            const pdfTabla = (
              <div>
                <div style={{ fontSize: 13, color: C.g5, marginBottom: 12 }}>C.C. {inst?.cedula} · {inst?.banco || "—"} {inst?.cuenta || ""}</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 14 }}>
                  <thead><tr style={{ background: C.orL }}>{cols.map(h => <th key={h} style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, color: C.orD, borderBottom: `2px solid ${C.orM}` }}>{h}</th>)}</tr></thead>
                  <tbody>{rows.filter(r => !r.adj || r.apr).map((r, i) => <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : C.g0 }}><td style={{ padding: "5px 8px" }}>{r.obra}</td><td style={{ padding: "5px 8px" }}>{r.apto}</td><td style={{ padding: "5px 8px" }}>{r.el}{r.desc && <span style={{ color: "#8E8E93", fontStyle: "italic" }}> — {r.desc}</span>}</td><td style={{ padding: "5px 8px", textAlign: "center" }}>{r.cant}</td><td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(r.precio)}</td><td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(r.total)}</td><td style={{ padding: "5px 8px" }}>{r.fecha}</td></tr>)}</tbody>
                </table>
                <div style={{ background: C.g0, borderRadius: 8, padding: "10px 14px" }}>
                  {resumen.map(([lb, v], i, a) => <div key={lb} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: i === a.length - 1 ? 700 : 400, fontSize: i === a.length - 1 ? 15 : 13, color: i === a.length - 1 ? C.gnD : C.bk }}><span>{lb}</span><span>{v < 0 ? `— ${fmt(Math.abs(v))}` : fmt(v)}</span></div>)}
                </div>
              </div>
            );
            const excelTxt = [`Instalador — ${inst?.nombre} (C.C. ${inst?.cedula})`, "", cols.join("\t"), ...rows.map(r => [r.obra, r.apto, r.el, r.cant, r.precio, r.total, r.fecha].join("\t")), "", `Bruto\t\t\t\t\t${bruto}`, `Retención 10%\t\t\t\t\t-${ret}`, `Subtotal\t\t\t\t\t${sub}`, pas > 0 ? `Pasajes\t\t\t\t\t${pas}` : "", bon > 0 ? `Bonificación\t\t\t\t\t${bon}` : "", `TOTAL\t\t\t\t\t${total}`].filter(Boolean).join("\n");
            return (
              <div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 14 }}>
                  <Btn variant="success" onClick={() => setExpM({ tipo: "excel", txt: excelTxt })}>Excel</Btn>
                  <Btn variant="primary" onClick={() => setExpM({ tipo: "pdf", kind: "instalador", titulo: `Reporte — ${inst?.nombre}`, tabla: pdfTabla, inst, rows, res: { bruto, ret, sub, pas, bon, total } })}>PDF</Btn>
                </div>
                <div style={card}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{inst?.nombre}</div>
                    <div style={{ fontSize: 13, color: C.g5 }}>C.C. {inst?.cedula} · {inst?.telefono || "—"}</div>
                    {inst?.banco && <div style={{ fontSize: 13, color: C.g5 }}>{inst.banco} — {inst.cuenta}</div>}
                  </div>
                  {rows.length === 0 ? <p style={{ color: C.g4, fontSize: 14 }}>Sin instalaciones registradas.</p> : (<>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 14 }}>
                      <thead><tr style={{ background: C.g0 }}>{cols.map(h => <th key={h} style={thSt}>{h}</th>)}</tr></thead>
                      <tbody>{rows.map((r, i) => <tr key={i} style={{ opacity: r.adj && !r.apr ? 0.5 : 1 }}><td style={{ ...tdSt, color: C.g5, fontSize: 12 }}>{r.obra?.substring(0, 16)}</td><td style={tdSt}>{r.apto}</td><td style={tdSt}>{r.el}{r.desc && <span style={{ color: "#8E8E93", fontStyle: "italic" }}> — {r.desc}</span>}{r.adj && !r.apr && <span style={{ marginLeft: 6, ...bdg("amber"), fontSize: 10 }}>pend.</span>}</td><td style={{ ...tdSt, textAlign: "center" }}>{r.cant}</td><td style={{ ...tdSt, textAlign: "right" }}>{fmt(r.precio)}</td><td style={{ ...tdSt, textAlign: "right", fontWeight: 700, color: C.gnD }}>{fmt(r.total)}</td><td style={{ ...tdSt, color: C.g5 }}>{r.fecha}</td></tr>)}</tbody>
                    </table>
                    <div style={{ background: C.g0, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                      {resumen.map(([lb, v], i, a) => <div key={lb} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < a.length - 1 ? `1px solid ${C.g2}` : "none", fontWeight: i === a.length - 1 ? 700 : 400, fontSize: i === a.length - 1 ? 16 : 13, color: i === a.length - 1 ? C.gnD : C.bk, marginTop: i === a.length - 1 ? 4 : 0 }}><span>{lb}</span><span>{v < 0 ? `— ${fmt(Math.abs(v))}` : fmt(v)}</span></div>)}
                    </div>
                  </>)}
                </div>


              </div>
            );
          })()}
        </div>
      )}
      {/* ── Retenidos por instalador (todas las obras) ── */}
      {tipo === "retenidos" && (() => {
        const obraNom = obras.find(o => o.id === obraId)?.nombre;
        const filas = retenidosDe(instId).filter(f => !obraNom || f.obra === obraNom);
        const totC = filas.reduce((s, f) => s + f.causado, 0);
        const totR = filas.reduce((s, f) => s + f.ret, 0);
        return (
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
              <div style={{ minWidth: 220 }}>
                <Sel label="Instalador" value={instId} onChange={e => setInstId(e.target.value)}>
                  <option value="">Todos</option>
                  {INs.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </Sel>
              </div>
              <div style={{ minWidth: 220 }}>
                <Sel label="Obra" value={obraId} onChange={e => setObraId(e.target.value)}>
                  <option value="">Todas</option>
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.nombre}</option>
                  ))}
                </Sel>
              </div>
              <div style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ ...bdg("gray") }}>Causado {fmt(totC)}</span>
                <span style={{ ...bdg("red") }}>Retenido {fmt(totR)}</span>
                {filas.length > 0 && <>
                  <Btn onClick={() => {
                    const quien = instId ? (INs.find(i => i.id === instId)?.nombre || "") : "todos los instaladores";
                    pdfTabla("Retenidos por instalador", `${quien}${obraNom ? " · " + obraNom : ""}`,
                      ["Corte", "Cerrado", ...(instId ? [] : ["Instalador"]), "Obra", "Causado", "Retenido 10%"],
                      [...filas.map(f => [f.corte, f.fecha, ...(instId ? [] : [f.inst]), f.obra, fmt(f.causado), fmt(f.ret)]),
                       ["TOTALES", "", ...(instId ? [] : [""]), "", fmt(totC), fmt(totR)]],
                      `Retenidos ${quien}${obraNom ? " - " + obraNom : ""}.pdf`,
                      { [instId ? 4 : 5]: { halign: "right", fontStyle: "bold" }, [instId ? 3 : 4]: { halign: "right" } });
                  }}>📄 PDF</Btn>
                  <Btn variant="success" onClick={() => {
                    const quien = instId ? (INs.find(i => i.id === instId)?.nombre || "") : "Todos";
                    excel("Retenidos", [
                      [`Retenidos por instalador — ${quien}`], [`Generado el ${hoyStr()}`], [],
                      ["Corte", "Cerrado", "Instalador", "Obra", "Causado", "Retenido 10%"],
                      ...filas.map(f => [f.corte, f.fecha, f.inst, f.obra, f.causado, f.ret]),
                      [], ["TOTALES", "", "", "", totC, totR],
                    ], [26, 12, 26, 26, 16, 16], [4, 5], `Retenidos ${quien}${obraNom ? " - " + obraNom : ""} ${new Date().toISOString().slice(0, 10)}.xlsx`);
                  }}>📊 Excel</Btn>
                </>}
              </div>
            </div>
            {filas.length === 0 ? <p style={{ fontSize: 13, color: C.g4 }}>No hay cortes cerrados todavía.</p> : (
              <div style={{ ...card, padding: 0, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: C.orL }}>
                    {["Corte", "Cerrado", ...(instId ? [] : ["Instalador"]), "Obra", "Causado", "Retenido 10%"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: ["Causado", "Retenido 10%"].includes(h) ? "right" : "left", fontSize: 10, fontWeight: 700, color: C.orD, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filas.map((f, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${C.g1}` }}>
                        <td style={{ padding: "6px 10px" }}>{f.corte}</td>
                        <td style={{ padding: "6px 10px", color: C.g5 }}>{f.fecha}</td>
                        {!instId && <td style={{ padding: "6px 10px" }}>{f.inst}</td>}
                        <td style={{ padding: "6px 10px" }}>{f.obra}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(f.causado)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: C.rd, fontWeight: 700 }}>{fmt(f.ret)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: C.g1, fontWeight: 700 }}>
                      <td colSpan={instId ? 3 : 4} style={{ padding: "8px 10px", textAlign: "right" }}>TOTALES</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(totC)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.rd }}>{fmt(totR)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ fontSize: 11, color: C.g5, marginTop: 8 }}>
              El retenido es el 10% de lo causado en cada obra dentro de cada corte cerrado.
            </p>
          </div>
        );
      })()}

      {/* ── Pago total del corte, por obra ── */}
      {tipo === "prestamos" && (() => {
        // Informe aparte del de obra: el préstamo es un tema administrativo, no un
        // costo de la obra. Por eso no toca ninguno de los otros números.
        const INs = users.filter(u => u.rol === ROLES.IN);
        const filas = INs.map(u => {
          const movs = (movPres || []).filter(m => m.usuario_id === u.id);
          const prestado = movs.filter(m => m.tipo !== "abono").reduce((s2, m) => s2 + Number(m.valor || 0), 0);
          const abonado = movs.filter(m => m.tipo === "abono").reduce((s2, m) => s2 + Number(m.valor || 0), 0);
          const ultimo = movs.map(m => m.fecha).sort().pop() || "";
          return { u, movs, prestado, abonado, saldo: prestado - abonado, ultimo };
        }).filter(f => f.movs.length > 0).sort((a, b) => b.saldo - a.saldo);
        const t = {
          prestado: filas.reduce((s2, f) => s2 + f.prestado, 0),
          abonado: filas.reduce((s2, f) => s2 + f.abonado, 0),
          saldo: filas.reduce((s2, f) => s2 + f.saldo, 0),
        };
        return (
          <div>
            {filas.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <Btn onClick={() => pdfTabla("Préstamos y anticipos", `Saldos al ${hoyStr()}`,
                  ["Instalador", "Cédula", "Prestado", "Abonado", "Debe", "Último movim."],
                  [...filas.map(f => [f.u.nombre, f.u.cedula || "—", fmt(f.prestado), fmt(f.abonado), fmt(f.saldo), f.ultimo || "—"]),
                   ["TOTALES", "", fmt(t.prestado), fmt(t.abonado), fmt(t.saldo), ""]],
                  `Prestamos ${hoyStr()}.pdf`,
                  { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right", fontStyle: "bold" } })}>📄 PDF</Btn>
                <Btn variant="success" onClick={() => excel("Préstamos", [
                  ["Préstamos y anticipos a instaladores"], [`Generado el ${hoyStr()}`], [],
                  ["Instalador", "Cédula", "Prestado", "Abonado", "Debe", "Último movimiento"],
                  ...filas.map(f => [f.u.nombre, f.u.cedula || "", f.prestado, f.abonado, f.saldo, f.ultimo]),
                  [], ["TOTALES", "", t.prestado, t.abonado, t.saldo, ""],
                  [], ["DETALLE DE MOVIMIENTOS"],
                  ["Instalador", "Fecha", "Tipo", "Concepto", "Valor", "Corte"],
                  ...filas.flatMap(f => f.movs
                    .slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
                    .map(m => [f.u.nombre, m.fecha, m.tipo === "abono" ? "Abono" : "Préstamo",
                               m.concepto || "", m.tipo === "abono" ? -Number(m.valor) : Number(m.valor), m.corte || ""])),
                ], [26, 14, 16, 16, 16, 18], [2, 3, 4], `Prestamos ${hoyStr()}.xlsx`)}>📊 Excel</Btn>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
              {[["Prestado", t.prestado, C.bk], ["Abonado", t.abonado, C.gnD], ["Debe hoy", t.saldo, t.saldo > 0 ? C.rd : C.gnD]].map(([l, v2, col]) => (
                <div key={l} style={{ ...card, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: C.g5 }}>{l}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: col }}>{fmt(v2)}</div>
                </div>
              ))}
            </div>

            {filas.length === 0 ? (
              <p style={{ fontSize: 13, color: C.g4 }}>No hay préstamos registrados todavía.</p>
            ) : (
              <div style={{ ...card, padding: 0, display: "block", maxWidth: "100%", minWidth: 0, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: C.orL }}>
                    {["Instalador", "Cédula", "Prestado", "Abonado", "Debe", "Último movim."].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: h === "Instalador" || h === "Cédula" ? "left" : "right", fontSize: 10, fontWeight: 700, color: C.orD, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filas.map(f => (
                      <tr key={f.u.id} style={{ borderTop: `1px solid ${C.g1}` }}>
                        <td style={{ padding: "6px 10px", fontWeight: 600 }}>{f.u.nombre}</td>
                        <td style={{ padding: "6px 10px", color: C.g5 }}>{f.u.cedula || "—"}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(f.prestado)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: C.gnD }}>−{fmt(f.abonado)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: f.saldo > 0 ? C.rd : C.gnD }}>{fmt(f.saldo)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: C.g5 }}>{f.ultimo || "—"}</td>
                      </tr>
                    ))}
                    <tr style={{ background: C.g1, fontWeight: 700 }}>
                      <td colSpan={2} style={{ padding: "8px 10px", textAlign: "right" }}>TOTALES</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(t.prestado)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.gnD }}>−{fmt(t.abonado)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: t.saldo > 0 ? C.rd : C.gnD }}>{fmt(t.saldo)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ fontSize: 11, color: C.g5, marginTop: 8 }}>
              Los préstamos no entran en el costo de las obras: el desembolso es un egreso aparte y
              el abono es plata que vuelve. Los informes de obra siguen mostrando lo causado.
            </p>
          </div>
        );
      })()}

      {tipo === "cortes" && (() => {
        const label = corteSel || cortes[0] || "";
        const { obras: obrasCorte, pas, bon, dias, totalPagado } = pagosDeCorte(label);
        const totC = obrasCorte.reduce((s, o) => s + o.causado, 0);
        const totR = obrasCorte.reduce((s, o) => s + o.ret, 0);
        const porInst = corteVista === "inst";
        const { filas: fInst, tot: tInst } = pagosDeCorteInst(label);
        return (
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
              <Sel label="Corte (quincena)" value={label} onChange={e => setCorteSel(e.target.value)}>
                {cortes.length === 0 && <option value="">Sin cortes cerrados</option>}
                {cortes.map(c => <option key={c} value={c}>{c}</option>)}
              </Sel>
            </div>
            <div style={{ maxWidth: 220, flex: 1, minWidth: 180 }}>
              <Sel label="Ver el corte" value={corteVista} onChange={e => setCorteVista(e.target.value)}>
                <option value="obra">Por obra</option>
                <option value="inst">Por instalador</option>
              </Sel>
            </div>
            {label && porInst && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <Btn onClick={() => pdfTabla("Pagos del corte por instalador", label,
                  ["Instalador", "Obras", "Causado", "Retenido 10%", "Subtotal", "Pasajes", "Bonif.", "Días", "Valor a pagar"],
                  [...fInst.map(f => [f.inst, f.obras.join(", ") || "—", fmt(f.causado), `−${fmt(f.ret)}`, fmt(f.sub), f.pas ? `+${fmt(f.pas)}` : "—", f.bon ? `+${fmt(f.bon)}` : "—", f.dias ? `+${fmt(f.dias)}` : "—", fmt(f.total)]),
                   ["TOTALES", "", fmt(tInst.causado), `−${fmt(tInst.ret)}`, fmt(tInst.sub), `+${fmt(tInst.pas)}`, `+${fmt(tInst.bon)}`, `+${fmt(tInst.dias)}`, fmt(tInst.total)]],
                  `Pagos corte por instalador ${label}.pdf`,
                  { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right", fontStyle: "bold" } })}>📄 PDF</Btn>
                <Btn variant="success" onClick={() => excel("Pagos corte instalador", [
                  [`Pagos del corte por instalador — ${label}`], [`Generado el ${hoyStr()}`], [],
                  ["Instalador", "Cédula", "Obras", "Causado", "Retenido 10%", "Subtotal", "Pasajes", "Bonificación", "Días", "Valor a pagar"],
                  ...fInst.map(f => [f.inst, f.cedula, f.obras.join(", "), f.causado, -f.ret, f.sub, f.pas, f.bon, f.dias, f.total]),
                  [], ["TOTALES", "", "", tInst.causado, -tInst.ret, tInst.sub, tInst.pas, tInst.bon, tInst.dias, tInst.total],
                ], [26, 14, 30, 16, 14, 16, 14, 14, 12, 16], [3, 4, 5, 6, 7, 8, 9], `Pagos corte por instalador ${label}.xlsx`)}>📊 Excel</Btn>
              </div>
            )}
            {label && !porInst && obrasCorte.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <Btn onClick={() => pdfTabla("Pagos del corte por obra", label,
                  ["Obra", "Personas", "Causado", "Adicionales", "Retenido 10%", "Neto obra"],
                  [...obrasCorte.map(o => [o.obra, String(o.personas), fmt(o.causado), o.adic ? fmt(o.adic) : "—", fmt(o.ret), fmt(o.neto)]),
                   ["TOTALES", "", fmt(totC), "", fmt(totR), fmt(totC - totR)],
                   [], ["Pasajes + bonificaciones + días laborados del corte", "", "", "", "", fmt(pas + bon + dias)],
                   ["Pagado en el corte", "", "", "", "", fmt(totalPagado)]],
                  `Pagos corte ${label}.pdf`,
                  { 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" } })}>📄 PDF</Btn>
                <Btn variant="success" onClick={() => excel("Pagos corte", [
                  [`Pagos del corte por obra — ${label}`], [`Generado el ${hoyStr()}`], [],
                  ["Obra", "Personas", "Causado", "Adicionales", "Retenido 10%", "Neto obra"],
                  ...obrasCorte.map(o => [o.obra, o.personas, o.causado, o.adic, o.ret, o.neto]),
                  [], ["TOTALES", "", totC, "", totR, totC - totR],
                  [], ["Pasajes", "", "", "", "", pas], ["Bonificaciones", "", "", "", "", bon],
                  ["Días laborados", "", "", "", "", dias], ["Pagado en el corte", "", "", "", "", totalPagado],
                ], [30, 10, 16, 16, 16, 16], [2, 3, 4, 5], `Pagos corte ${label}.xlsx`)}>📊 Excel</Btn>
              </div>
            )}
            </div>
            {!label ? <p style={{ fontSize: 13, color: C.g4 }}>No hay cortes cerrados todavía.</p> : (<>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                {[["Causado", totC, C.bk], ["Retenido 10%", totR, C.rd], ["Pasajes + bonif. + días", pas + bon + dias, C.or], ["Pagado en el corte", totalPagado, C.gnD]].map(([l, v, col]) => (
                  <div key={l} style={{ ...card, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: C.g5 }}>{l}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: col }}>{fmt(v)}</div>
                  </div>
                ))}
              </div>
              {porInst ? (<>
              <div style={{ ...card, padding: 0, display: "block", maxWidth: "100%", minWidth: 0, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: C.orL }}>
                    {["Instalador", "Obras", "Causado", "Retenido 10%", "Subtotal", "Pasajes", "Bonif.", "Días", "Valor a pagar"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: h === "Instalador" || h === "Obras" ? "left" : "right", fontSize: 10, fontWeight: 700, color: C.orD, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {fInst.map(f => (
                      <tr key={f.id} style={{ borderTop: `1px solid ${C.g1}` }}>
                        <td style={{ padding: "6px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>{f.inst}</td>
                        <td style={{ padding: "6px 10px", fontSize: 11, color: C.g5 }}>{f.obras.join(", ") || "—"}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(f.causado)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: C.rd }}>−{fmt(f.ret)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(f.sub)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: f.pas ? C.or : C.g3 }}>{f.pas ? `+${fmt(f.pas)}` : "—"}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: f.bon ? C.or : C.g3 }}>{f.bon ? `+${fmt(f.bon)}` : "—"}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: f.dias ? C.or : C.g3 }}>{f.dias ? `+${fmt(f.dias)}` : "—"}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: C.gnD }}>{fmt(f.total)}</td>
                      </tr>
                    ))}
                    {fInst.length === 0 && <tr><td colSpan={9} style={{ padding: "14px 10px", color: C.g4, fontSize: 13 }}>Nadie tiene liquidación cerrada en este corte.</td></tr>}
                    <tr style={{ background: C.g1, fontWeight: 700 }}>
                      <td colSpan={2} style={{ padding: "8px 10px", textAlign: "right" }}>TOTALES</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(tInst.causado)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.rd }}>−{fmt(tInst.ret)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(tInst.sub)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.or }}>+{fmt(tInst.pas)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.or }}>+{fmt(tInst.bon)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.or }}>+{fmt(tInst.dias)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.gnD }}>{fmt(tInst.total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 11, color: C.g5, marginTop: 8 }}>
                Cada fila es la liquidación que se le cerró a esa persona en el corte, leída de izquierda a derecha:
                causado − retenido = subtotal, y a eso se le suman pasajes, bonificación y días para el valor a pagar.
              </p>
              </>) : (<>
              <div style={{ ...card, padding: 0, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: C.orL }}>
                    {["Obra", "Personas", "Causado", "Adicionales", "Retenido 10%", "Neto obra"].map(h => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: h === "Obra" ? "left" : "right", fontSize: 10, fontWeight: 700, color: C.orD, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {obrasCorte.map(o => (
                      <tr key={o.obra} style={{ borderTop: `1px solid ${C.g1}` }}>
                        <td style={{ padding: "6px 10px", fontWeight: 600 }}>{o.obra}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right" }}>{o.personas}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right" }}>{fmt(o.causado)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: C.g5 }}>{o.adic ? fmt(o.adic) : "—"}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", color: C.rd }}>{fmt(o.ret)}</td>
                        <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }}>{fmt(o.neto)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: C.g1, fontWeight: 700 }}>
                      <td colSpan={2} style={{ padding: "8px 10px", textAlign: "right" }}>TOTALES</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(totC)}</td>
                      <td />
                      <td style={{ padding: "8px 10px", textAlign: "right", color: C.rd }}>{fmt(totR)}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(totC - totR)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 11, color: C.g5, marginTop: 8 }}>
                Lo causado y el retenido se reparten por obra. Pasajes, bonificaciones y días laborados son del corte
                completo de cada persona, por eso van aparte y no se reparten.
              </p>
              </>)}
            </>)}
          </div>
        );
      })()}
    </div>
  );
}

// ── PRÉSTAMOS Y ANTICIPOS ─────────────────────────────────
// Un solo saldo consolidado por instalador. El desembolso no entra al corte
// (va como egreso aparte); lo que toca el corte es el abono, que se descuenta
// del total a pagar y se registra aquí automáticamente al cerrar la liquidación.
function Prestamos({ users, movPres, setMovPres, user, toast, liqs }) {
  const [form, setForm] = useState(null);      // { usuario_id, tipo, valor, concepto, fecha }
  const [verDe, setVerDe] = useState(null);    // instalador cuyo historial se está mirando
  const [busca, setBusca] = useState("");
  const [saving, setSaving] = useState(false);

  const INs = users.filter(u => u.rol === ROLES.IN);
  const hoy = () => new Date().toISOString().slice(0, 10);

  const filas = INs.map(u => ({ u, saldo: saldoPrestamo(movPres, u.id) }))
    .filter(f => f.saldo !== 0 || (movPres || []).some(m => m.usuario_id === f.u.id))
    .sort((a, b) => b.saldo - a.saldo);
  const q = busca.trim().toLowerCase();
  const visibles = q ? filas.filter(f => (f.u.nombre || "").toLowerCase().includes(q)) : filas;
  const totalDeuda = filas.reduce((s, f) => s + Math.max(0, f.saldo), 0);

  const movsDe = uid => (movPres || []).filter(m => m.usuario_id === uid)
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")) || String(b.id).localeCompare(String(a.id)));

  function abrir(tipo, uid) {
    setForm({ usuario_id: uid || "", tipo, valor: "", concepto: tipo === "prestamo" ? "" : "Abono", fecha: hoy() });
  }

  async function guardar() {
    const val = Number(form.valor) || 0;
    if (!form.usuario_id) { toast("Elige el instalador", "err"); return; }
    if (val <= 0) { toast("El valor debe ser mayor que cero", "err"); return; }
    if (form.tipo === "abono") {
      const deuda = saldoPrestamo(movPres, form.usuario_id);
      if (val > deuda) { toast(`No puede abonar más de lo que debe (${fmt(deuda)})`, "err"); return; }
    }
    setSaving(true);
    const mov = {
      id: `mp${Date.now()}${Math.floor(Math.random() * 1000)}`,
      usuario_id: form.usuario_id, tipo: form.tipo, valor: val,
      fecha: form.fecha || hoy(), concepto: (form.concepto || "").trim() || null,
      corte: null, registrado_por: user.nombre,
    };
    const r = await dbInsert("movimientos_prestamo", mov);
    setSaving(false);
    if (!r.ok) { console.error("prestamo:", r.status, await r.text().catch(() => "")); toast("No se pudo guardar", "err"); return; }
    setMovPres(x => [...x, mov]);
    setForm(null);
    toast(form.tipo === "prestamo" ? "Préstamo registrado" : "Abono registrado", "ok");
  }

  async function borrar(m) {
    if (m.corte) { toast("Ese abono salió de un corte cerrado. No se borra desde aquí.", "err"); return; }
    const r = await dbDel("movimientos_prestamo", m.id);
    if (!r.ok) { toast("No se pudo borrar", "err"); return; }
    setMovPres(x => x.filter(y => y.id !== m.id));
    toast("Movimiento borrado", "ok");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>Préstamos y anticipos</h2>
        <Btn variant="primary" onClick={() => abrir("prestamo")}>+ Registrar préstamo</Btn>
      </div>

      <div style={{ ...card, padding: "12px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: C.g5, textTransform: "uppercase", letterSpacing: ".06em" }}>Total prestado sin recuperar</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: totalDeuda > 0 ? C.rd : C.gnD }}>{fmt(totalDeuda)}</div>
        </div>
        <div style={{ fontSize: 12, color: C.g5, maxWidth: 380 }}>
          El desembolso va como egreso aparte, no entra en el corte. Lo que toca la liquidación
          es el abono, que se descuenta del total a pagar.
        </div>
      </div>

      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar instalador…"
        style={{ width: "100%", maxWidth: 320, boxSizing: "border-box", padding: "9px 12px", border: `1px solid ${C.g2}`, borderRadius: 8, fontSize: 14, marginBottom: 12 }} />

      {visibles.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: C.g4, padding: "2rem", fontSize: 14 }}>
          Nadie tiene préstamos registrados. Usa “Registrar préstamo” y marca el saldo que deben hoy.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {visibles.map(({ u, saldo }) => (
            <div key={u.id} style={{ ...card, padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 700 }}>{u.nombre}</div>
                  <div style={{ fontSize: 12, color: C.g5 }}>{movsDe(u.id).length} movimiento(s)</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: C.g5 }}>Debe</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: saldo > 0 ? C.rd : C.gnD }}>{fmt(saldo)}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn size="sm" onClick={() => setVerDe(verDe === u.id ? null : u.id)}>{verDe === u.id ? "Ocultar" : "Ver"}</Btn>
                  <Btn size="sm" onClick={() => abrir("prestamo", u.id)}>+ Préstamo</Btn>
                  {saldo > 0 && <Btn size="sm" variant="success" onClick={() => abrir("abono", u.id)}>Abonar</Btn>}
                </div>
              </div>

              {verDe === u.id && (
                <div style={{ marginTop: 10, borderTop: `1px solid ${C.g1}`, paddingTop: 8, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead><tr style={{ color: C.g5 }}>
                      {["Fecha", "Movimiento", "Concepto", "Valor", ""].map((h, i) =>
                        <th key={h} style={{ padding: "5px 8px", textAlign: i === 3 ? "right" : "left", fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {movsDe(u.id).map(m => (
                        <tr key={m.id} style={{ borderTop: `1px solid ${C.g1}` }}>
                          <td style={{ padding: "5px 8px", whiteSpace: "nowrap" }}>{m.fecha}</td>
                          <td style={{ padding: "5px 8px" }}>
                            <span style={{ ...bdg(m.tipo === "abono" ? "green" : "orange"), fontSize: 10 }}>
                              {m.tipo === "abono" ? "Abono" : "Préstamo"}
                            </span>
                          </td>
                          <td style={{ padding: "5px 8px", color: C.g5 }}>{m.concepto || "—"}</td>
                          <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, color: m.tipo === "abono" ? C.gnD : C.bk }}>
                            {m.tipo === "abono" ? "−" : "+"}{fmt(m.valor)}
                          </td>
                          <td style={{ padding: "5px 8px", textAlign: "center" }}>
                            {!m.corte && <span onClick={() => borrar(m)} title="Borrar movimiento"
                              style={{ cursor: "pointer", color: C.g3, fontWeight: 700 }}>✕</span>}
                          </td>
                        </tr>
                      ))}
                      {movsDe(u.id).length === 0 && <tr><td colSpan={5} style={{ padding: "10px 8px", color: C.g4 }}>Sin movimientos.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal title={form.tipo === "prestamo" ? "Registrar préstamo" : "Registrar abono"} onClose={() => setForm(null)}>
          <Sel label="Instalador" value={form.usuario_id} onChange={e => setForm(f => ({ ...f, usuario_id: e.target.value }))}>
            <option value="">— Elegir —</option>
            {INs.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </Sel>
          {form.usuario_id && (
            <div style={{ fontSize: 13, color: C.g5, margin: "-4px 0 10px" }}>
              Debe hoy: <strong style={{ color: C.rd }}>{fmt(saldoPrestamo(movPres, form.usuario_id))}</strong>
            </div>
          )}
          <Inp label="Valor ($)" type="number" min="0" value={form.valor}
            onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
          <Inp label="Fecha" type="date" value={form.fecha}
            onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
          <Inp label="Concepto" value={form.concepto}
            onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))}
            placeholder={form.tipo === "prestamo" ? "Ej: Saldo inicial, anticipo, préstamo personal…" : "Ej: Abono en efectivo"} />
          {form.tipo === "prestamo" && (
            <div style={{ fontSize: 12, color: C.g5, background: C.g0, border: `1px solid ${C.g2}`, borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
              Para arrancar con lo que ya deben, registra un préstamo con concepto <strong>“Saldo inicial”</strong> y la fecha de hoy.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn onClick={() => setForm(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={guardar} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── USUARIOS ──────────────────────────────────────────────
function Usuarios({ users, setUsers, openM, closeM, modals, toast }) {
  const emp = { nombre: "", email: "", rol: ROLES.IN, oficio: "instalador", pin: "", cedula: "", telefono: "", banco: "", cuenta: "" };
  const [form, setForm] = useState(emp);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);
  const rL = { superadmin: "Gerencia", supervisor: "Coordinador", auxiliar: "Auxiliar", instalador: "Instalador" };
  const rC = { superadmin: "orange", supervisor: "amber", auxiliar: "gray", instalador: "green" };
  const oL = { instalador: "Instalador", detallador: "Detallador", ambos: "Instalador y detallador" };
  const oC = { instalador: "green", detallador: "amber", ambos: "orange" };

  async function eliminar(id) {
    const res = await dbDel("usuarios", id);
    if (!res.ok) { console.error("borrar usuario falló:", res.status, await res.text().catch(() => "")); toast("No tienes permiso para eliminar usuarios", "err"); setDelId(null); return; }
    setUsers(x => x.filter(u => u.id !== id)); setDelId(null);
  }
  async function guardar() {
    if (!form.nombre || !form.email || (!editId && !form.pin)) return;
    const u = editId ? { ...users.find(x => x.id === editId), ...form } : { id: `u${Date.now()}`, ...form };
    if (!form.pin) delete u.pin;   // PIN vacío = se deja el que ya tenía
    // Crear con INSERT y editar con PATCH, en vez de un upsert. El upsert se traduce
    // a INSERT ... ON CONFLICT, y esa sentencia exige permiso de SELECT sobre TODA la
    // tabla — con eso no se podría dejar el PIN fuera del alcance de las apps.
    const { id: _idFijo, ...cambios } = u;   // el id no se manda en el PATCH
    const res = editId ? await dbPatch("usuarios", editId, cambios) : await dbInsert("usuarios", u);
    if (!res.ok) { console.error("guardar usuario falló:", res.status, await res.text().catch(() => "")); toast("No se pudo guardar el usuario", "err"); return; }
    if (editId) setUsers(x => ordNom(x.map(y => y.id === editId ? u : y))); else setUsers(x => ordNom([...x, u]));
    setForm(emp); setEditId(null); closeM("usr");
  }
  const editar = u => { setEditId(u.id); setForm({ nombre: u.nombre, email: u.email, rol: u.rol, oficio: u.oficio || "instalador", pin: "", cedula: u.cedula || "", telefono: u.telefono || "", banco: u.banco || "", cuenta: u.cuenta || "" }); openM("usr"); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>Usuarios</h2>
        <Btn variant="primary" onClick={() => { setEditId(null); setForm(emp); openM("usr"); }}>+ Nuevo</Btn>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {users.map(u => <div key={u.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 50, background: u.rol === ROLES.SA ? C.or : u.rol === ROLES.IN ? C.gn : C.g3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.wh, flexShrink: 0 }}>{u.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{u.nombre}</div>
            <div style={{ fontSize: 13, color: C.g5 }}>{u.email}{u.cedula ? ` · C.C. ${u.cedula}` : ""}</div>
            {u.rol === ROLES.IN && u.banco && <div style={{ fontSize: 12, color: C.g4 }}>{u.banco} — {u.cuenta}</div>}
          </div>
          {u.rol === ROLES.IN
            ? <span style={bdg(oC[u.oficio || "instalador"])}>{oL[u.oficio || "instalador"]}</span>
            : <span style={bdg(rC[u.rol] || "gray")}>{rL[u.rol]}</span>}
          <Btn onClick={() => editar(u)}>Editar</Btn>
          <Btn variant="danger" onClick={() => setDelId(u.id)}>Eliminar</Btn>
        </div>)}
      </div>
      {delId && <Modal title="Eliminar usuario" onClose={() => setDelId(null)}>
        <p style={{ fontSize: 14, color: C.g9, marginBottom: 20 }}>¿Eliminar a <strong>{users.find(u => u.id === delId)?.nombre}</strong>? Esta acción no se puede deshacer.</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><Btn onClick={() => setDelId(null)}>Cancelar</Btn><Btn variant="danger" onClick={() => eliminar(delId)}>Sí, eliminar</Btn></div>
      </Modal>}
      {modals.usr && <Modal title={editId ? "Editar usuario" : "Nuevo usuario"} onClose={() => closeM("usr")} wide>
        <p style={{ fontSize: 12, color: C.g5, margin: "-4px 0 14px", fontStyle: "italic" }}>Ingresa primero los nombres y luego los apellidos.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Inp label="Nombre completo" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Juan Carlos Pérez López" />
          <Inp label="Correo" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Inp label="Cédula" value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} />
          <Inp label="Teléfono" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Sel label="Rol" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
            <option value={ROLES.IN}>Instalador</option>
            <option value={ROLES.AX}>Auxiliar</option>
            <option value={ROLES.SV}>Coordinador</option>
            <option value={ROLES.SA}>Gerencia</option>
          </Sel>
          <Inp label={editId ? "Nuevo PIN (vacío = no cambiar)" : "PIN (4 dígitos)"} type="password" maxLength={4} value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder="••••" />
        </div>
        {form.rol === ROLES.IN && <>
          <Sel label="Oficio" value={form.oficio} onChange={e => setForm(f => ({ ...f, oficio: e.target.value }))}>
            <option value="instalador">Instalador</option>
            <option value="detallador">Detallador</option>
            <option value="ambos">Instalador y detallador</option>
          </Sel>
          <div style={{ fontSize: 12, fontWeight: 600, margin: "4px 0 10px", color: C.g5, borderTop: `1px solid ${C.g2}`, paddingTop: 12, textTransform: "uppercase", letterSpacing: ".06em" }}>Datos bancarios</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Inp label="Banco" value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} placeholder="Ej: Bancolombia" />
            <Inp label="Número de cuenta" value={form.cuenta} onChange={e => setForm(f => ({ ...f, cuenta: e.target.value }))} />
          </div>
        </>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn onClick={() => closeM("usr")}>Cancelar</Btn>
          <Btn variant="primary" onClick={guardar}>{editId ? "Guardar" : "Crear"}</Btn>
        </div>
      </Modal>}
    </div>
  );
}