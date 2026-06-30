import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const SUPA_URL = "https://kboumpkcrdeuteiiodjp.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib3VtcGtjcmRldXRlaWlvZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODA2MTQsImV4cCI6MjA5NDI1NjYxNH0.gTjqSnxI8F7ozcLSWB2rCDexP7ubgX1fwG2uOM3L0rI";
const H = { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Prefer": "return=representation" };
const dbGet = async t => (await fetch(`${SUPA_URL}/rest/v1/${t}?select=*`, { headers: H })).json();
const dbUpsert = async (t, d) => fetch(`${SUPA_URL}/rest/v1/${t}`, { method: "POST", headers: { ...H, "Prefer": "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(d) });
const dbDel = async (t, id) => fetch(`${SUPA_URL}/rest/v1/${t}?id=eq.${id}`, { method: "DELETE", headers: H });

const ROLES = { SA: "superadmin", SV: "supervisor", AX: "auxiliar", IN: "instalador" };

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

// Lee el ajuste (pasajes/bonificación) de un instalador para un corte. Tolera ausencia de .ajustes.
function ajusteDe(usuarios, iid, corteLabel) {
  const a = usuarios.find(x => x.id === iid)?.ajustes?.[corteLabel] || {};
  return { pasajes: Number(a.pasajes) || 0, bonificacion: Number(a.bonificacion) || 0, aprobado: !!a.aprobado, editadoPor: a.editadoPor || "" };
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

const USUARIOS_DEF = [
  { id: "sa1", nombre: "César Betancur", rol: ROLES.SA, email: "cesar@obra.com", pin: "1111", cedula: "3113410458", telefono: "", banco: "", cuenta: "" },
  { id: "sa2", nombre: "Sandra Marin", rol: ROLES.SA, email: "sandra@obra.com", pin: "2222", cedula: "3006903514", telefono: "", banco: "", cuenta: "" },
  { id: "sa3", nombre: "Andres Londoño", rol: ROLES.SA, email: "andres@obra.com", pin: "3333", cedula: "3189180703", telefono: "", banco: "", cuenta: "" },
  { id: "sa4", nombre: "Luz Toro", rol: ROLES.SA, email: "luz@obra.com", pin: "4444", cedula: "3046063039", telefono: "", banco: "", cuenta: "" },
  { id: "ax1", nombre: "Lauren Zapata", rol: ROLES.AX, email: "lauren@obra.com", pin: "5555", cedula: "3180803364", telefono: "", banco: "", cuenta: "" },
  { id: "i01", nombre: "Albeiro De Jesús Sanchez Alvarez", rol: ROLES.IN, email: "3366950@obra.com", pin: "6950", cedula: "3366950", telefono: "", banco: "", cuenta: "" },
  { id: "i02", nombre: "Arnovis Enrique Romero Gaviria", rol: ROLES.IN, email: "10889524@obra.com", pin: "9524", cedula: "10889524", telefono: "", banco: "", cuenta: "" },
  { id: "i03", nombre: "Alejandro Caballero Navas", rol: ROLES.IN, email: "1041894977@obra.com", pin: "4977", cedula: "1041894977", telefono: "", banco: "", cuenta: "" },
  { id: "i04", nombre: "Andrés Polo Gomez", rol: ROLES.IN, email: "72238095@obra.com", pin: "8095", cedula: "72238095", telefono: "", banco: "", cuenta: "" },
  { id: "i05", nombre: "Angie Guisela Gonzales Toro", rol: ROLES.IN, email: "32209550@obra.com", pin: "9550", cedula: "32209550", telefono: "", banco: "", cuenta: "" },
  { id: "i06", nombre: "Carlos Albeiro Bedoya", rol: ROLES.IN, email: "98537380@obra.com", pin: "7380", cedula: "98537380", telefono: "", banco: "", cuenta: "" },
  { id: "i07", nombre: "Claudia Marcela Uribe Lopez", rol: ROLES.IN, email: "1112765279@obra.com", pin: "5279", cedula: "1112765279", telefono: "", banco: "", cuenta: "" },
  { id: "i08", nombre: "Claudia Patricia Higuita Muñoz", rol: ROLES.IN, email: "43164453@obra.com", pin: "4453", cedula: "43164453", telefono: "", banco: "", cuenta: "" },
  { id: "i09", nombre: "Cristian Alexis Marin Gonzales", rol: ROLES.IN, email: "1015278020@obra.com", pin: "8020", cedula: "1015278020", telefono: "", banco: "", cuenta: "" },
  { id: "i10", nombre: "Elfa Nataly Rueda Vargas", rol: ROLES.IN, email: "43991850@obra.com", pin: "1850", cedula: "43991850", telefono: "", banco: "", cuenta: "" },
  { id: "i11", nombre: "Erika Baza Camacho", rol: ROLES.IN, email: "1096195897@obra.com", pin: "5897", cedula: "1096195897", telefono: "", banco: "", cuenta: "" },
  { id: "i12", nombre: "Emiliano De Jesus Callejas Rios", rol: ROLES.IN, email: "70541496@obra.com", pin: "1496", cedula: "70541496", telefono: "", banco: "", cuenta: "" },
  { id: "i13", nombre: "Greis Pola Jaraba Correa", rol: ROLES.IN, email: "1045691681@obra.com", pin: "1681", cedula: "1045691681", telefono: "", banco: "", cuenta: "" },
  { id: "i14", nombre: "Harrison Martinez Lopez", rol: ROLES.IN, email: "1053796113@obra.com", pin: "6113", cedula: "1053796113", telefono: "", banco: "", cuenta: "" },
  { id: "i15", nombre: "Jose Alfredo Taborda Marin", rol: ROLES.IN, email: "1033337255@obra.com", pin: "7255", cedula: "1033337255", telefono: "", banco: "", cuenta: "" },
  { id: "i16", nombre: "José Gabriel Mesa Martínez", rol: ROLES.IN, email: "98642537@obra.com", pin: "2537", cedula: "98642537", telefono: "", banco: "", cuenta: "" },
  { id: "i17", nombre: "Jose Luis Basanta Coa", rol: ROLES.IN, email: "1258625@obra.com", pin: "8625", cedula: "1258625", telefono: "", banco: "", cuenta: "" },
  { id: "i18", nombre: "Jorge Leonardo Viloria Romero", rol: ROLES.IN, email: "1104413901@obra.com", pin: "3901", cedula: "1104413901", telefono: "", banco: "", cuenta: "" },
  { id: "i19", nombre: "Juan Carlos Cardenas Vega", rol: ROLES.IN, email: "1098813472@obra.com", pin: "3472", cedula: "1098813472", telefono: "", banco: "", cuenta: "" },
  { id: "i20", nombre: "Juan Martin Osorio Saldarriaga", rol: ROLES.IN, email: "71646955@obra.com", pin: "6955", cedula: "71646955", telefono: "", banco: "", cuenta: "" },
  { id: "i21", nombre: "Kateryn Carmona", rol: ROLES.IN, email: "1214743439@obra.com", pin: "3439", cedula: "1214743439", telefono: "", banco: "", cuenta: "" },
  { id: "i22", nombre: "Leder De Jesus Herrera Arrieta", rol: ROLES.IN, email: "1104410561@obra.com", pin: "0561", cedula: "1104410561", telefono: "", banco: "", cuenta: "" },
  { id: "i23", nombre: "Leider Arturo Herrera Arrieta", rol: ROLES.IN, email: "1005677345@obra.com", pin: "7345", cedula: "1005677345", telefono: "", banco: "", cuenta: "" },
  { id: "i24", nombre: "Leon Jaime Taborda Marin", rol: ROLES.IN, email: "1033339839@obra.com", pin: "9839", cedula: "1033339839", telefono: "", banco: "", cuenta: "" },
  { id: "i25", nombre: "Luis Alberto Goez Goez", rol: ROLES.IN, email: "1152453118@obra.com", pin: "3118", cedula: "1152453118", telefono: "", banco: "", cuenta: "" },
  { id: "i26", nombre: "Luis Felipe Meza Martinez", rol: ROLES.IN, email: "1148205348@obra.com", pin: "5348", cedula: "1148205348", telefono: "", banco: "", cuenta: "" },
  { id: "i27", nombre: "Luis Fernando Aguirre Giraldo", rol: ROLES.IN, email: "71698074@obra.com", pin: "8074", cedula: "71698074", telefono: "", banco: "", cuenta: "" },
  { id: "i28", nombre: "Maria Luz Dary Rincon", rol: ROLES.IN, email: "66916338@obra.com", pin: "6338", cedula: "66916338", telefono: "", banco: "", cuenta: "" },
  { id: "i29", nombre: "Mario Lemus Arboleda", rol: ROLES.IN, email: "1001846248@obra.com", pin: "6248", cedula: "1001846248", telefono: "", banco: "", cuenta: "" },
  { id: "i30", nombre: "Nelson Dario Correa Acosta", rol: ROLES.IN, email: "98527601@obra.com", pin: "7601", cedula: "98527601", telefono: "", banco: "", cuenta: "" },
  { id: "i31", nombre: "Omar De Jesus Ortiz Montoya", rol: ROLES.IN, email: "98528420@obra.com", pin: "8420", cedula: "98528420", telefono: "", banco: "", cuenta: "" },
  { id: "i32", nombre: "Oscar Mauricio Lopez", rol: ROLES.IN, email: "98538605@obra.com", pin: "8605", cedula: "98538605", telefono: "", banco: "", cuenta: "" },
  { id: "i33", nombre: "Oved Dario Pulgarin", rol: ROLES.IN, email: "98693472@obra.com", pin: "3472", cedula: "98693472", telefono: "", banco: "", cuenta: "" },
  { id: "i34", nombre: "Steve Brahayan Alvarez Reyes", rol: ROLES.IN, email: "PT1277581@obra.com", pin: "7581", cedula: "PT-1277581", telefono: "", banco: "", cuenta: "" },
  { id: "i35", nombre: "Pedro Felix Moreno Cortes", rol: ROLES.IN, email: "98457089@obra.com", pin: "7089", cedula: "98457089", telefono: "", banco: "", cuenta: "" },
  { id: "i36", nombre: "Robinson Alberto Orozco Muñoz", rol: ROLES.IN, email: "71386134@obra.com", pin: "6134", cedula: "71386134", telefono: "", banco: "", cuenta: "" },
  { id: "i37", nombre: "Yefferson Sanchez Henao", rol: ROLES.IN, email: "1214720944@obra.com", pin: "0944", cedula: "1214720944", telefono: "", banco: "", cuenta: "" },
];

export default function App() {
  const [user, setUser] = useState(() => { try { const s = localStorage.getItem("gs"); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [obras, setObras] = useState([]);
  const [elems, setElems] = useState([]);
  const [users, setUsers] = useState([]);
  const [liqs, setLiqs] = useState([]);
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
      const [u, e, o, l] = await Promise.all([dbGet("usuarios"), dbGet("elementos"), dbGet("obras"), dbGet("liquidaciones")]);
      if (!u.length) { await Promise.all(USUARIOS_DEF.map(x => dbUpsert("usuarios", x))); setUsers(USUARIOS_DEF); } else setUsers(u);
      if (!e.length) { await Promise.all(ELEMENTOS_DEF.map(x => dbUpsert("elementos", x))); setElems(ELEMENTOS_DEF); } else setElems(e);
      setObras(o.map(mapObra));
      setLiqs(l);
    } catch (e) { toast("Error conectando", "error"); }
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  const saveObra = async o => dbUpsert("obras", {
    id: o.id, nombre: o.nombre, direccion: o.direccion, estado: o.estado,
    tipologias: o.tipologias || [], pisos: o.pisos || [],
    instaladores_autorizados: o.instaladoresAutorizados || [],
    aptos_habilitados: o.aptosHabilitados || {},
    solicitudes: o.solicitudes || [],
    precios_override: o.preciosOverride || {},
    coordinador_id: o.coordinadorId || ""
  });

  const updateObra = (id, fn) => setObras(obs => {
    const updated = obs.map(o => o.id === id ? fn(o) : o);
    const obra = updated.find(o => o.id === id);
    if (obra) saveObra(obra);
    return updated;
  });

  function doLogin() {
    const u = users.find(x => x.email === login.email && x.pin === login.pin);
    if (u) { setUser(u); localStorage.setItem("gs", JSON.stringify(u)); setLoginErr(""); }
    else setLoginErr("Correo o PIN incorrecto");
  }
  function doLogout() { setUser(null); localStorage.removeItem("gs"); }

  // ARREGLO 3: getPrecio ahora también busca override por apto individual (key: aptoId__eid)
  const getPrecio = (eid, oid, corteLabel, aptoId, tipId) => {
    const o = obras.find(x => x.id === oid);
    if (aptoId) {
      const kApto = `apto__${aptoId}__${eid}`;
      if (o?.preciosOverride?.[kApto] !== undefined) return o.preciosOverride[kApto];
    }
    const k = `${corteLabel}__${eid}`;
    if (o?.preciosOverride?.[k] !== undefined) return o.preciosOverride[k];
    if (tipId) {
      const kTip = `tip__${tipId}__${eid}`;
      if (o?.preciosOverride?.[kTip] !== undefined) return o.preciosOverride[kTip];
    }
    return elems.find(e => e.id === eid)?.precio || 0;
  };

  const avanceObra = o => { let t = 0, c = 0; o.pisos?.forEach(p => p.aptos?.forEach(a => a.elementos?.forEach(e => { t++; if (e.completado) c++; }))); return t === 0 ? 0 : Math.round(c / t * 100); };
  const avanceApto = a => { const t = a.elementos?.length || 0, c = a.elementos?.filter(e => e.completado).length || 0; return t === 0 ? 0 : Math.round(c / t * 100); };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "system-ui", background: C.bk }}>
      <div style={{ width: 60, height: 60, background: C.or, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏗️</div>
      <p style={{ color: C.wh, fontSize: 16 }}>Cargando...</p>
    </div>
  );
  if (!user) return <LoginScreen login={login} setLogin={setLogin} doLogin={doLogin} err={loginErr} />;

  const sh = { obras, setObras, updateObra, saveObra, elems, setElems, users, setUsers, liqs, setLiqs, openM, closeM, modals, toast, user, getPrecio, avanceApto };

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", maxWidth: 920, margin: "0 auto", padding: "1rem", background: C.g0, minHeight: "100vh" }}>
      <Toast items={toasts} setItems={setToasts} />
      <Header user={user} doLogout={doLogout} view={view} setView={setView} selObra={selObra} setSelObra={setSelObra} setSelPiso={setSelPiso} setSelApto={setSelApto} />
      {view === "obras" && <Obras {...sh} avanceObra={avanceObra} goObra={o => { setSelObra(o); setView("obra"); }} />}
      {view === "obra" && selObra && <Obra {...sh} obra={obras.find(o => o.id === selObra.id) || selObra} goApto={(a, p) => { setSelApto(a); setSelPiso(p); setView("apto"); }} />}
      {view === "apto" && selApto && selObra && <Apto {...sh} apto={selApto} piso={selPiso} obra={obras.find(o => o.id === selObra.id)} />}
      {view === "elems" && user.rol === ROLES.SA && <Elementos {...sh} />}
      {view === "liqs" && <Liquidacion {...sh} avanceObra={avanceObra} />}
      {view === "reportes" && [ROLES.SA, ROLES.SV].includes(user.rol) && <Reportes obras={obras} elems={elems} users={users} user={user} getPrecio={getPrecio} avanceObra={avanceObra} />}
      {view === "users" && user.rol === ROLES.SA && <Usuarios {...sh} />}
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

function Header({ user, doLogout, view, setView, selObra, setSelObra, setSelPiso, setSelApto }) {
  const rL = { superadmin: "Superadmin", supervisor: "Supervisor", auxiliar: "Auxiliar", instalador: "Instalador" };
  const nav = [
    { k: "obras", l: "Obras", r: [ROLES.SA, ROLES.SV, ROLES.AX, ROLES.IN] },
    { k: "elems", l: "Elementos", r: [ROLES.SA] },
    { k: "liqs", l: "Liquidación", r: [ROLES.SA, ROLES.SV, ROLES.AX, ROLES.IN] },
    { k: "reportes", l: "Reportes", r: [ROLES.SA, ROLES.SV] },
    { k: "users", l: "Usuarios", r: [ROLES.SA] }
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
        <button onClick={doLogout} style={{ background: "transparent", border: `1px solid ${C.g8}`, color: C.g3, borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontFamily: "system-ui" }}>Salir</button>
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
    await saveObra(n); setObras(x => [...x, n]); setForm({ nombre: "", direccion: "", coordinadorId: "", pisoInicio: 1, pisos: 1, aptos: 1 }); closeM("nObra");
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

  const visibles = obras.filter(o => user.rol === ROLES.SA || user.rol === ROLES.SV || user.rol === ROLES.AX || (user.rol === ROLES.IN && (o.instaladoresAutorizados || []).includes(user.id)));
  const sinAcceso = user.rol === ROLES.IN ? obras.filter(o => !(o.instaladoresAutorizados || []).includes(user.id)) : [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>Obras</h2>
        {user.rol === ROLES.SA && <Btn variant="primary" onClick={() => openM("nObra")}>+ Nueva obra</Btn>}
      </div>

      {visibles.length === 0 && user.rol !== ROLES.IN && (
        <div style={{ textAlign: "center", padding: "4rem", color: C.g4, background: C.wh, borderRadius: 12, border: `1px solid ${C.g2}` }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏢</div>
          <p>No hay obras</p>
          {user.rol === ROLES.SA && <Btn variant="primary" onClick={() => openM("nObra")}>Crear primera obra</Btn>}
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
                  {pend > 0 && user.rol === ROLES.SA && <span onClick={e => { e.stopPropagation(); setAccM(o.id); }} style={{ ...bdg("amber"), cursor: "pointer" }}>{pend} sol.</span>}
                  <span style={bdg("green")}>{o.estado}</span>
                  {user.rol === ROLES.SA && <>
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
function Obra({ obra, obras, updateObra, user, avanceApto, elems, users, goApto, openM, closeM, modals, toast, getPrecio }) {
  const [tipForm, setTipForm] = useState({ nombre: "", eids: [], cantidades: {}, precios: {} });
  const [editTip, setEditTip] = useState(null);
  const [delTipId, setDelTipId] = useState(null);
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
  const tips = cur.tipologias || [];
  const nums = [...new Set(cur.pisos?.flatMap(p => p.aptos?.map(a => String(a.numero))) || [])].sort((a, b) => Number(a) - Number(b));
  const cortes = getCorteFechas();
  const instsActivos = (cur.instaladoresAutorizados || []).map(id => users.find(u => u.id === id)).filter(Boolean);

  const abrirNueva = () => { setEditTip(null); setTipForm({ nombre: "", eids: [], cantidades: {}, precios: {} }); openM("tip"); };
  const abrirEditar = t => {
    const prefijo = `tip__${t.id}__`;
    const precios = {};
    Object.entries(cur.preciosOverride || {}).forEach(([k, v]) => {
      if (k.startsWith(prefijo)) precios[k.slice(prefijo.length)] = v;
    });
    setEditTip(t.id);
    setTipForm({ nombre: t.nombre, eids: [...t.elementoIds], cantidades: { ...(t.cantidades || {}) }, precios });
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
      tipForm.eids.forEach(eid => {
        const key = `tip__${tipId}__${eid}`;
        const raw = tipForm.precios?.[eid];
        const num = (raw === "" || raw === null || raw === undefined) ? NaN : Number(raw);
        if (Number.isFinite(num)) po[key] = num;
        else delete po[key];
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
          const reg = repSel.reglas.find(r => r.sufijo === String(a.numero) && r.tipId);
          if (!reg) return a;
          const tip = tips.find(t => t.id === reg.tipId);
          if (!tip) return a;
          cnt++;
          return { ...a, tipologia: tip.id, elementos: tip.elementoIds.map(eid => a.elementos?.find(e => e.elementoId === eid) || { elementoId: eid, completado: false, instaladorId: null, fecha: null, cantidad: tipForm.cantidades?.[eid] || 1 }) };
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
                <div style={{ fontSize: 11, color: C.g4, fontWeight: 600, marginBottom: 6 }}>{av}%</div>
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
        {user.rol === ROLES.SA && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
              {user.rol === ROLES.SA && <>
                <span onClick={() => abrirEditar(t)} style={{ cursor: "pointer", fontWeight: 700 }}>✎</span>
                <span onClick={() => setDelTipId(t.id)} style={{ cursor: "pointer", fontWeight: 700, color: C.rd, marginLeft: 2 }}>🗑</span>
<span onClick={() => { setDupTip(t); setDupPrecios({}); }} style={{ cursor: "pointer", fontWeight: 700, color: C.gnD, marginLeft: 2 }}>⧉</span>
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
              {user.rol === ROLES.SA && !vistaInst && <div style={{ display: "flex", gap: 6 }}>
  <button onClick={() => setPisoEditM(piso.id)} style={{ ...bdg("gray"), cursor: "pointer", fontSize: 11 }}>✎ Editar aptos</button>
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
                    {user.rol === ROLES.SA && apto.tipologia && (() => {
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
                      <div style={{ fontSize: 10, color: C.g4, fontWeight: 600, marginBottom: 4 }}>{av}%</div>
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
                    {user.rol === ROLES.SA && (() => {
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
    {user.rol === ROLES.SA && <span onClick={e => { e.stopPropagation(); quitarTip(piso.id, apto.id, tipId); }} style={{ cursor: "pointer", fontWeight: 700, color: C.rd }}>×</span>}
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
            {elems.map(e => {
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
          <label style={lbl()}>Elementos incluidos</label>
          <div style={{ maxHeight: 260, overflowY: "auto", border: `1px solid ${C.g2}`, borderRadius: 8, padding: 8, background: C.wh }}>
            {elems.map(e => <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", cursor: "pointer", fontSize: 14, borderRadius: 6, background: tipForm.eids.includes(e.id) ? C.orL : "transparent" }}>
              <input type="checkbox" checked={tipForm.eids.includes(e.id)} onChange={x => setTipForm(f => ({ ...f, eids: x.target.checked ? [...f.eids, e.id] : f.eids.filter(i => i !== e.id) }))} />
              <span style={{ flex: 1, color: C.bk }}>{e.nombre}</span>
              <span style={{ fontSize: 12, color: C.g4 }}>{e.unidad} · {fmt(e.precio)}</span>
              {tipForm.eids.includes(e.id) && (e.unidad === "ml" || e.unidad === "m2") && (
                <input type="number" min="0.1" step="0.1" placeholder="Cant."
                  value={tipForm.cantidades?.[e.id] ?? ""}
                  onClick={x => x.stopPropagation()}
                  onChange={x => { x.stopPropagation(); setTipForm(f => ({ ...f, cantidades: { ...f.cantidades, [e.id]: Number(x.target.value) } })); }}
                  style={{ width: 64, padding: "2px 6px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 12, textAlign: "right" }}
                />
              )}
              {tipForm.eids.includes(e.id) && (
                <input type="number" min="0" step="1" placeholder={e.precio != null ? String(e.precio) : "Precio"}
                  value={tipForm.precios?.[e.id] ?? ""}
                  onClick={x => x.stopPropagation()}
                  onChange={x => { x.stopPropagation(); setTipForm(f => ({ ...f, precios: { ...f.precios, [e.id]: x.target.value } })); }}
                  style={{ width: 80, padding: "2px 6px", border: `1px solid ${C.g2}`, borderRadius: 6, fontSize: 12, textAlign: "right" }}
                />
              )}
            </label>)}
          </div>
          <div style={{ fontSize: 12, color: C.g4, marginTop: 6 }}>{tipForm.eids.length} seleccionado(s)</div>
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
            const cnt = cur.pisos?.reduce((n, p) => n + (p.aptos?.filter(a => String(a.numero) === suf).length || 0), 0);
            return <div key={suf} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: tid ? C.orL : C.g0, border: `1px solid ${tid ? C.orM : C.g2}`, borderRadius: 10 }}>
              <div style={{ minWidth: 80 }}><div style={{ fontWeight: 700, fontSize: 14, color: tid ? C.orD : C.bk }}>Apto ×{suf}</div><div style={{ fontSize: 12, color: C.g4 }}>{cnt} apto(s)</div></div>
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
function Apto({ apto, piso, obra, obras, updateObra, user, elems, users, avanceApto, toast, getPrecio }) {
  const cur = obras.find(o => o.id === obra.id);
  const curP = cur?.pisos?.find(p => p.id === piso.id);
  const curA = curP?.aptos?.find(a => a.id === apto.id) || apto;
  const asignados = curA.instaladoresAsignados || (curA.instaladorAsignado ? [curA.instaladorAsignado] : []);
  const tip = cur?.tipologias?.find(t => t.id === curA.tipologia);
  const av = avanceApto(curA);
  const SVs = users.filter(u => u.rol === ROLES.SV);
  const [pend, setPend] = useState({});
  const [cnts, setCnts] = useState({});
  const [instSel, setInstSel] = useState({});
  const [nAd, setNAd] = useState({ desc: "", cant: 1, val: 0 });
  const [addAd, setAddAd] = useState(false);
  // ARREGLO 3: estado para precios individuales por elemento en este apto
  const [precIndM, setPrecIndM] = useState(false);
  const [precIndTmp, setPrecIndTmp] = useState({});

  const canAct = [ROLES.IN, ROLES.SA, ROLES.SV].includes(user.rol);
  const canEdit = user.rol === ROLES.SA || user.rol === ROLES.SV;
  const hayPend = Object.keys(pend).length > 0 || (canEdit && (curA.elementos?.some(e => e.completado) || (curA.elementosExtra || []).some(e => !e.esAdicional)));
  const corteAct = getCorteFechas()[0];

  const canToggle = idx => { const e = curA.elementos?.[idx]; if (!e || e.completado) return false; return canAct; };
  const togglePend = idx => { if (!canToggle(idx)) return; setPend(p => { const c = { ...p }; if (c[idx] !== undefined) delete c[idx]; else c[idx] = true; return c; }); };

  async function guardar() {
    // Atribución de instalador al marcar (solo cambia para SA/SV; IN siempre usa su propio id):
    //  - 2+ asignados: el seleccionado en el dropdown (o el primero por defecto)
    //  - 1 asignado: ese instalador automáticamente
    //  - 0 asignados o no canEdit: el usuario actual
    const instaladorPara = key => {
      if (!canEdit) return user.id;
      if (asignados.length >= 2) return instSel[key] ?? asignados[0];
      if (asignados.length === 1) return asignados[0];
      return user.id;
    };
    updateObra(obra.id, o => ({
      ...o, pisos: o.pisos.map(p => {
        if (p.id !== piso.id) return p;
        return {
          ...p, aptos: p.aptos.map(a => {
            if (a.id !== apto.id) return a;
            const newEls = a.elementos.map((el, i) => {
              let u = { ...el };
              if (cnts[i] !== undefined) u.cantidad = cnts[i];
              if (pend[i]) { u.completado = true; u.instaladorId = instaladorPara(i); u.fecha = new Date().toLocaleDateString("es-CO"); }
              return u;
            });
            // Pasajes/bonificación ya no viven en el apto (se editan en Liquidación, en user.ajustes).
            // Los __pasajes__/__bonificacion__ viejos que pudieran quedar se preservan tal cual y se ignoran en los cálculos.
            const final = newEls;
            const done = newEls.filter(e => !e.esAdicional && !e.elementoId?.startsWith("__")).every(e => e.completado);
            if (done) SVs.forEach(s => toast(`🔔 ${s.nombre}: Apto completado en ${obra.nombre}`));
            // También guardar elementosExtra pendientes
const newElsExtra = (a.elementosExtra || []).map((el, i) => {
  let u = { ...el };
  if (cnts[`x${i}`] !== undefined) u.cantidad = cnts[`x${i}`];
  if (pend[`x${i}`]) { u.completado = true; u.instaladorId = instaladorPara(`x${i}`); u.fecha = new Date().toLocaleDateString("es-CO"); }
  return u;
});
return { ...a, elementos: final, elementosExtra: newElsExtra };
          })
        };
      })
    }));
    toast("Guardado", "ok"); setPend({}); setCnts({}); setInstSel({});
  }

  const desmarcar = idx => updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementos: a.elementos.map((el, i) => i !== idx ? el : { ...el, completado: false, instaladorId: null, fecha: null }) }) }) }));

  async function guardarAd() {
    if (!nAd.desc || !nAd.val) return;
    const el = { elementoId: `__ad__${Date.now()}`, descripcion: nAd.desc, cantidad: Number(nAd.cant), valorUnitario: Number(nAd.val), completado: false, instaladorId: null, fecha: null, esAdicional: true, aprobado: false };
    updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementos: [...(a.elementos || []), el] }) }) }));
    setNAd({ desc: "", cant: 1, val: 0 }); setAddAd(false); toast("Adicional agregado", "ok");
  }
  const elimAd = idx => updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementos: a.elementos.filter((_, i) => i !== idx) }) }) }));

  // ARREGLO 3: guardar precios individuales por elemento en este apto
  function guardarPreciosInd() {
    updateObra(obra.id, o => ({
      ...o,
      preciosOverride: {
        ...(o.preciosOverride || {}),
        ...Object.fromEntries(
          Object.entries(precIndTmp)
            .filter(([, v]) => v !== "")
            .map(([eid, v]) => [`apto__${curA.id}__${eid}`, Number(v)])
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
  const totPend = Object.keys(pend).reduce((s, i) => { const el = elsNorm[parseInt(i)]; return s + getPrecio(el?.elementoId, obra.id, corteAct.label, curA.id, curA.tipologia) * (cnts[i] ?? el?.cantidad ?? 1); }, 0);

  return (
    <div>
      <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>Apto {curA.nombre || `${piso.numero}${String(apto.numero).padStart(2, "0")}`} — {tip?.nombre || "Sin tipología"}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.g5 }}>{obra.nombre} · Piso {piso.numero}</p>
        </div>
        {/* ARREGLO 3: botón precios individuales para SA */}
        {user.rol === ROLES.SA && tip && (
          <Btn onClick={() => { setPrecIndTmp({}); setPrecIndM(true); }}>💰 Precios apto</Btn>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[["Avance", `${av}%`], ["Instalados", `${elsNorm.filter(e => e.completado).length}/${elsNorm.length}`], [user.rol === ROLES.IN ? "Mi liquidación" : "Liquidación", fmt(totLiq)]].map(([l, v]) => (
          <div key={l} style={{ background: C.wh, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.g2}` }}>
            <div style={{ fontSize: 11, color: C.g4, marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: l === "Avance" ? (av === 100 ? C.gn : C.or) : C.gnD }}>{v}</div>
          </div>
        ))}
      </div>
      {canEdit && <div style={{ marginBottom: 14, padding: "10px 14px", background: C.amL, border: "1px solid #FDE68A", borderRadius: 10, fontSize: 13, color: "#B45309", fontWeight: 500 }}>Puedes desmarcar elementos con ✕.</div>}
      {user.rol === ROLES.IN && <div style={{ marginBottom: 14, padding: "10px 14px", background: C.orL, border: `1px solid ${C.orM}`, borderRadius: 10, fontSize: 13, color: C.orD, fontWeight: 500 }}>Marca los elementos terminados y presiona <strong>Guardar</strong>.{hayPend && <span style={{ marginLeft: 8 }}>+{fmt(totPend)}</span>}</div>}

      <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        {elsNorm.map((el, idx) => {
          const elem = elems.find(e => e.id === el.elementoId);
          const inst = users.find(u => u.id === el.instaladorId);
          const eP = !!pend[idx], marc = el.completado || eP;
          const cT = canToggle(idx);
          const ca = cnts[idx] ?? el.cantidad ?? 1;
          const precio = getPrecio(el.elementoId, obra.id, corteAct.label, curA.id, curA.tipologia);
          // Indicar si tiene precio individual
          const tieneOvInd = cur?.preciosOverride?.[`apto__${curA.id}__${el.elementoId}`] !== undefined;
          return (
            <div key={idx} onClick={() => cT && togglePend(idx)} style={{ display: "flex", alignItems: "center", gap: 12, background: el.completado ? C.gnL : eP ? C.orL : C.wh, border: `1.5px solid ${el.completado ? "#BBF7D0" : eP ? C.orM : C.g2}`, borderRadius: 10, padding: "12px 14px", cursor: cT ? "pointer" : "default", transition: "all .12s" }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, border: `2.5px solid ${el.completado ? C.gn : eP ? C.or : C.g3}`, background: el.completado ? C.gn : eP ? C.or : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {marc && <span style={{ color: C.wh, fontSize: 14, fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: el.completado ? C.gnD : eP ? C.orD : C.bk }}>{elem?.nombre || el.elementoId}</div>
                {el.completado && inst && <div style={{ fontSize: 12, color: C.gnD, fontWeight: 500 }}>{inst.nombre} · {el.fecha}</div>}
                {eP && <div style={{ fontSize: 12, color: C.orD, fontWeight: 500 }}>Pendiente de guardar</div>}
                {tieneOvInd && <div style={{ fontSize: 10, color: C.or, fontWeight: 600 }}>precio personalizado</div>}
              </div>
              {canEdit && asignados.length >= 2 && !el.completado && (
                <select onClick={e => e.stopPropagation()} value={instSel[idx] ?? asignados[0]} onChange={e => { e.stopPropagation(); setInstSel(s => ({ ...s, [idx]: e.target.value })); }} style={{ fontSize: 12, padding: "4px 6px", border: `1px solid ${C.g2}`, borderRadius: 6, maxWidth: 130 }}>
                  {asignados.map(id => { const u = users.find(x => x.id === id); return <option key={id} value={id}>{u?.nombre || id}</option>; })}
                </select>
              )}
              {(elem?.unidad === "ml" || elem?.unidad === "m2") && <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: C.g4 }}>{elem.unidad}</span>
                <input type="number" min="0.1" step="0.1" value={ca} disabled={el.completado && user.rol === ROLES.IN} onChange={e => setCnts(c => ({ ...c, [idx]: Number(e.target.value) }))} style={{ width: 64, textAlign: "center", fontSize: 13, padding: "4px", border: `1px solid ${C.g2}`, borderRadius: 6 }} />
              </div>}
              <div style={{ textAlign: "right", minWidth: 90 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(precio * ca)}</div>
                <div style={{ fontSize: 11, color: C.g4 }}>{elem?.unidad}</div>
              </div>
              {canEdit && !el.completado && <button onClick={e => { e.stopPropagation(); updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementos: a.elementos.filter((_, i) => i !== idx) }) }) })); toast("Elemento eliminado", "ok"); }} style={{ marginLeft: 4, width: 28, height: 28, borderRadius: 6, ...bdg("red"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700 }}>🗑</button>}
{canEdit && el.completado && <button onClick={e => { e.stopPropagation(); desmarcar(idx); }} style={{ marginLeft: 4, width: 28, height: 28, borderRadius: 6, ...bdg("red"), cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 14, fontWeight: 700 }}>✕</button>}
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
              <div style={{ fontSize: 12, color: C.g4 }}>Adicional · {el.cantidad} · {fmt(el.valorUnitario)} c/u</div>
              {el.completado && <div style={{ fontSize: 12, color: C.gnD, fontWeight: 500 }}>{users.find(u => u.id === el.instaladorId)?.nombre} · {el.fecha}</div>}
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
        <span>{tip?.nombre || "Tipología extra"}</span>
        <span style={{ fontSize: 12, color: C.gnD, fontWeight: 600 }}>{fmt(elsDeEsta.filter(e => e.completado).reduce((s, el) => s + getPrecio(el.elementoId, obra.id, corteAct.label, curA.id, tipId) * (el.cantidad || 1), 0))}</span>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {elsDeEsta.map((el, idx) => {
          const irx = curA.elementosExtra.indexOf(el);
          const elem = elems.find(e => e.id === el.elementoId);
          const inst = users.find(u => u.id === el.instaladorId);
          const eP = !!pend[`x${irx}`];
          const marc = el.completado || eP;
          const cT = !el.completado && canAct;
          const ca = cnts[`x${irx}`] ?? el.cantidad ?? 1;
          const precio = getPrecio(el.elementoId, obra.id, corteAct.label, curA.id, tipId);
          return <div key={irx} onClick={() => { if (!cT) return; setPend(p => { const c = {...p}; if (c[`x${irx}`] !== undefined) delete c[`x${irx}`]; else c[`x${irx}`] = true; return c; }); }} style={{ display: "flex", alignItems: "center", gap: 12, background: el.completado ? C.gnL : eP ? C.orL : C.wh, border: `1.5px solid ${el.completado ? "#BBF7D0" : eP ? C.orM : C.g2}`, borderRadius: 10, padding: "12px 14px", cursor: cT ? "pointer" : "default" }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, border: `2.5px solid ${el.completado ? C.gn : eP ? C.or : C.g3}`, background: el.completado ? C.gn : eP ? C.or : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {marc && <span style={{ color: C.wh, fontSize: 14, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: el.completado ? C.gnD : eP ? C.orD : C.bk }}>{elem?.nombre || el.elementoId}</div>
              {el.completado && inst && <div style={{ fontSize: 12, color: C.gnD }}>{inst.nombre} · {el.fecha}</div>}
              {eP && <div style={{ fontSize: 12, color: C.orD }}>Pendiente de guardar</div>}
            </div>
            {canEdit && asignados.length >= 2 && !el.completado && (
              <select onClick={e => e.stopPropagation()} value={instSel[`x${irx}`] ?? asignados[0]} onChange={e => { e.stopPropagation(); setInstSel(s => ({ ...s, [`x${irx}`]: e.target.value })); }} style={{ fontSize: 12, padding: "4px 6px", border: `1px solid ${C.g2}`, borderRadius: 6, maxWidth: 130 }}>
                {asignados.map(id => { const u = users.find(x => x.id === id); return <option key={id} value={id}>{u?.nombre || id}</option>; })}
              </select>
            )}
            <div style={{ textAlign: "right", minWidth: 90 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(precio * ca)}</div>
            </div>
            {canEdit && el.completado && <button onClick={e => { e.stopPropagation(); updateObra(obra.id, o => ({ ...o, pisos: o.pisos.map(p => p.id !== piso.id ? p : { ...p, aptos: p.aptos.map(a => a.id !== apto.id ? a : { ...a, elementosExtra: a.elementosExtra.map((x, i) => i !== irx ? x : { ...x, completado: false, instaladorId: null, fecha: null }) }) }) })); }} style={{ ...bdg("red"), cursor: "pointer", width: 28, height: 28, borderRadius: 6, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>}
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

      {canAct && <div style={{ position: "sticky", bottom: 0, background: C.wh, borderTop: `2px solid ${C.g1}`, padding: "14px 0 4px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
        {hayPend && <span style={{ fontSize: 14, color: C.g5, alignSelf: "center" }}>Listo para guardar</span>}
        <Btn variant="primary" disabled={!hayPend} onClick={guardar} style={{ padding: "10px 28px", fontSize: 15, fontWeight: 700 }}>Guardar</Btn>
      </div>}

      {/* ARREGLO 3: Modal precios individuales por apto */}
      {precIndM && <Modal title={`Precios individuales — Apto ${curA.nombre}`} onClose={() => setPrecIndM(false)} wide>
        <p style={{ fontSize: 13, color: C.g5, margin: "0 0 12px" }}>
          Ajusta el precio de cada elemento solo para este apartamento. No modifica el precio base ni otros aptos.<br />
          Deja vacío para usar el precio estándar del corte.
        </p>
        <div style={{ maxHeight: 350, overflowY: "auto", display: "grid", gap: 8 }}>
          {elsNorm.map(el => {
            const elem = elems.find(e => e.id === el.elementoId);
            if (!elem) return null;
            const precioStd = getPrecio(el.elementoId, obra.id, corteAct.label);
            const keyInd = `apto__${curA.id}__${el.elementoId}`;
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
function Elementos({ elems, setElems, openM, closeM, modals }) {
  const [form, setForm] = useState({ nombre: "", unidad: "und", precio: 0 });
  const [editId, setEditId] = useState(null);
  async function guardar() {
    if (!form.nombre) return;
    const el = editId ? { ...elems.find(e => e.id === editId), ...form, precio: Number(form.precio) } : { id: `e${Date.now()}`, ...form, precio: Number(form.precio) };
    await dbUpsert("elementos", el);
    if (editId) setElems(x => x.map(e => e.id === editId ? el : e)); else setElems(x => [...x, el]);
    setEditId(null); setForm({ nombre: "", unidad: "und", precio: 0 }); closeM("el");
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>Elementos</h2>
        <Btn variant="primary" onClick={() => { setEditId(null); setForm({ nombre: "", unidad: "und", precio: 0 }); openM("el"); }}>+ Nuevo</Btn>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {elems.map(e => <div key={e.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: 14 }}>{e.nombre}</span> <span style={{ ...bdg("gray"), marginLeft: 6, fontSize: 11 }}>{e.unidad}</span></div>
          <div style={{ fontWeight: 700, fontSize: 14, minWidth: 110, textAlign: "right" }}>{fmt(e.precio)}</div>
          <Btn onClick={() => { setEditId(e.id); setForm({ nombre: e.nombre, unidad: e.unidad, precio: e.precio }); openM("el"); }}>Editar</Btn>
        </div>)}
      </div>
      {modals.el && <Modal title={editId ? "Editar" : "Nuevo elemento"} onClose={() => closeM("el")}>
        <Inp label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
        <Sel label="Unidad" value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
          <option value="und">und</option><option value="ml">ml</option><option value="m2">m2</option><option value="gl">gl</option>
        </Sel>
        <Inp label="Precio ($)" type="number" min="0" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><Btn onClick={() => closeM("el")}>Cancelar</Btn><Btn variant="primary" onClick={guardar}>{editId ? "Guardar" : "Crear"}</Btn></div>
      </Modal>}
    </div>
  );
}

// ── LIQUIDACIÓN ───────────────────────────────────────────
function Liquidacion({ obras, elems, users, setUsers, user, liqs, setLiqs, getPrecio, toast }) {
  const cortes = getCorteFechas();
  const [ci, setCi] = useState(0);
  const [expM, setExpM] = useState(null);
  const [hist, setHist] = useState(false);
  const corte = cortes[ci];
  const INs = user.rol === ROLES.IN ? users.filter(u => u.id === user.id) : users.filter(u => u.rol === ROLES.IN);
  const canExp = [ROLES.SA, ROLES.SV, ROLES.AX].includes(user.rol);

  function detalle(iid, d, h) {
    const rows = [];
    obras.forEach(o => o.pisos?.forEach(p => p.aptos?.forEach(a => a.elementos?.forEach(el => {
      if (el.completado && el.instaladorId === iid && enCorte(el.fecha, d, h)) {
        if (el.elementoId === "__pasajes__" || el.elementoId === "__bonificacion__") return; // migrados a user.ajustes
        if (el.esAdicional) { rows.push({ obra: o.nombre, apto: a.nombre, el: `[Adicional] ${el.descripcion}`, cant: el.cantidad || 1, precio: el.valorUnitario || 0, fecha: el.fecha, adj: false, apr: true }); return; }
        const elem = elems.find(e => e.id === el.elementoId);
        rows.push({ obra: o.nombre, apto: a.nombre, el: elem?.nombre, cant: el.cantidad || 1, precio: getPrecio(el.elementoId, o.id, corte.label, a.id, el.tipologiaId || a.tipologia), fecha: el.fecha, adj: false, apr: true });
      }
    }))));
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
    const pendAdj = (!aj.aprobado && (aj.pasajes || aj.bonificacion)) ? 1 : 0;
    return { bruto, ret, sub, pas, bon, total: sub + pas + bon, pendAdj, rows };
  }

  async function cerrar(inst) {
    const { rows, ...res } = resumen(inst.id);
    const l = { id: `l${Date.now()}${inst.id}`, inst_id: inst.id, inst_nombre: inst.nombre, inst_cedula: inst.cedula, inst_telefono: inst.telefono, inst_banco: inst.banco, inst_cuenta: inst.cuenta, corte: corte.label, fecha_cierre: new Date().toLocaleDateString("es-CO"), cerrado_por: user.nombre, rows, ...res, estado: "pagado" };
    await dbUpsert("liquidaciones", l); setLiqs(x => [...x, l]);
  }

  const cerrada = iid => liqs.some(l => l.inst_id === iid && l.corte === corte.label);

  // ── Pasajes/Bonificación por instalador+corte (viven en user.ajustes) ──
  const [ajTmp, setAjTmp] = useState({});  // buffer local; se confirma onBlur
  async function upsertUsuario(u) {
    const res = await dbUpsert("usuarios", u);
    if (!res.ok) { const det = await res.text().catch(() => ""); console.error("dbUpsert usuarios falló:", res.status, det); toast("Error al guardar ajuste — ¿existe la columna 'ajustes' en Supabase?", "err"); return false; }
    return true;
  }
  // IN propone (aprobado:false); SA edita (aprobado:true automático).
  async function guardarAjuste(iid, patch) {
    const u = users.find(x => x.id === iid); if (!u) return;
    const prev = u.ajustes?.[corte.label] || {};
    const nuevo = { pasajes: 0, bonificacion: 0, ...prev, ...patch, aprobado: user.rol === ROLES.SA, editadoPor: user.id };
    const merged = { ...u, ajustes: { ...(u.ajustes || {}), [corte.label]: nuevo } };
    if (await upsertUsuario(merged)) setUsers(xs => xs.map(x => x.id === iid ? merged : x));
  }
  async function aprobarAjuste(iid) {
    const u = users.find(x => x.id === iid); if (!u) return;
    const prev = u.ajustes?.[corte.label] || {};
    const merged = { ...u, ajustes: { ...(u.ajustes || {}), [corte.label]: { ...prev, aprobado: true, editadoPor: user.id } } };
    if (await upsertUsuario(merged)) { setUsers(xs => xs.map(x => x.id === iid ? merged : x)); toast("Ajuste aprobado", "ok"); }
  }
  async function eliminarAjuste(iid) {
    const u = users.find(x => x.id === iid); if (!u) return;
    const aj = { ...(u.ajustes || {}) }; delete aj[corte.label];
    const merged = { ...u, ajustes: aj };
    if (await upsertUsuario(merged)) { setUsers(xs => xs.map(x => x.id === iid ? merged : x)); toast("Ajuste eliminado", "ok"); }
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
            <tbody>{expM.rows.filter(r => !r.adj || r.apr).map((r, i) => <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : C.g0 }}><td style={{ padding: "5px 8px" }}>{r.obra}</td><td style={{ padding: "5px 8px" }}>{r.apto}</td><td style={{ padding: "5px 8px" }}>{r.el}</td><td style={{ padding: "5px 8px", textAlign: "center" }}>{r.cant}</td><td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(r.precio)}</td><td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(r.precio * r.cant)}</td><td style={{ padding: "5px 8px" }}>{r.fecha}</td></tr>)}</tbody>
          </table>
          <div style={{ background: C.g0, borderRadius: 8, padding: "12px 16px" }}>
            {[["Total bruto", expM.res.bruto], ["Retención 10%", -expM.res.ret], ["Subtotal", expM.res.sub], expM.res.pas > 0 ? ["Pasajes", expM.res.pas] : null, expM.res.bon > 0 ? ["Bonificación", expM.res.bon] : null, ["Total a pagar", expM.res.total]].filter(Boolean).map(([l, v], i, a) => (
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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.bk }}>Liquidación</h2>
        <Btn onClick={() => setHist(!hist)} variant={hist ? "primary" : "default"}>{hist ? "Ver corte actual" : "Historial"}</Btn>
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
          {INs.map(inst => {
            const { rows, ...res } = resumen(inst.id); const cerr = cerrada(inst.id);
            return <div key={inst.id} style={{ ...card, marginBottom: 16, borderLeft: `4px solid ${cerr ? C.gn : rows.length > 0 ? C.or : C.g2}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{inst.nombre}</div>
                  <div style={{ fontSize: 13, color: C.g5, marginTop: 2 }}>C.C. {inst.cedula || "—"} · {inst.telefono || "—"}</div>
                  <div style={{ fontSize: 13, color: C.g5 }}>{inst.banco ? `${inst.banco} — ${inst.cuenta}` : "Sin datos bancarios"}</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={bdg("green")}>Instalador</span>
                    {cerr && <span style={bdg("green")}>✓ Cerrada</span>}
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
                  <span style={{ flex: 1 }}>{r.el}{r.adj && !r.apr && <span style={{ marginLeft: 6, ...bdg("amber"), fontSize: 10 }}>pendiente</span>}</span>
                  <span style={{ fontWeight: 700, minWidth: 90, textAlign: "right" }}>{fmt(r.precio * r.cant)}</span>
                </div>)}
              </div>}
              {rows.length > 0 && <div style={{ background: C.g0, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 12 }}>
                {[["Total bruto", res.bruto], ["Retención 10%", -res.ret], ["Subtotal", res.sub], res.pas > 0 ? ["Pasajes", res.pas] : null, res.bon > 0 ? ["Bonificación", res.bon] : null].filter(Boolean).map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${C.g2}` }}><span style={{ color: C.g5 }}>{l}</span><span style={{ fontWeight: 500 }}>{v < 0 ? `— ${fmt(Math.abs(v))}` : fmt(v)}</span></div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0", fontWeight: 700, fontSize: 16, color: C.gnD }}><span>Total a pagar</span><span>{fmt(res.total)}</span></div>
              </div>}
              {(() => {
                const aj = users.find(u => u.id === inst.id)?.ajustes?.[corte.label] || {};
                const edita = (user.rol === ROLES.SA || user.rol === ROLES.IN) && !cerr;   // SA edita; IN propone
                const tmp = ajTmp[inst.id] || {};
                if (!edita && !(aj.pasajes || aj.bonificacion)) return null;
                return <div style={{ background: C.amL, border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#B45309", marginBottom: 8, display: "flex", gap: 8, alignItems: "center" }}>
                    Pasajes y Bonificación
                    {aj.aprobado ? <span style={{ ...bdg("green"), fontSize: 10 }}>✓ Aprobado</span> : (aj.pasajes || aj.bonificacion) ? <span style={{ ...bdg("amber"), fontSize: 10 }}>⏳ Pendiente</span> : null}
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
                  {user.rol === ROLES.SA && !cerr && (aj.pasajes || aj.bonificacion) ? <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                    {!aj.aprobado && <Btn variant="success" onClick={() => aprobarAjuste(inst.id)}>Aprobar</Btn>}
                    <Btn variant="danger" onClick={() => eliminarAjuste(inst.id)}>Eliminar</Btn>
                  </div> : null}
                </div>;
              })()}
              {rows.length === 0 && <p style={{ fontSize: 13, color: C.g3, margin: "8px 0" }}>Sin instalaciones en este corte.</p>}
              {canExp && rows.length > 0 && <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <Btn variant="success" onClick={() => setExpM({ tipo: "excel", inst, rows, res, txt: excelTxt(inst, rows, res) })}>Excel</Btn>
                <Btn variant="primary" onClick={() => setExpM({ tipo: "pdf", inst, rows, res })}>PDF</Btn>
                {!cerr && user.rol === ROLES.SA && <Btn variant="amber" onClick={() => cerrar(inst)}>✓ Cerrar y aprobar</Btn>}
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
  const canEdit = [ROLES.SA, ROLES.SV].includes(user.rol);
  const items = liqs.filter(l => user.rol === ROLES.IN ? l.inst_id === user.id : (!fi || l.inst_id === fi)).sort((a, b) => b.id.localeCompare(a.id));
  const totalPagado = items.reduce((s, l) => s + (l.total || 0), 0);
  const totalBruto = items.reduce((s, l) => s + (l.bruto || 0), 0);

  function recalcTotales(rows) {
    const bruto = rows.filter(r => !r.adj).reduce((s, r) => s + (r.precio || 0) * (r.cant || r.cantidad || 1), 0);
    const ret = Math.round(bruto * 0.1);
    const sub = bruto - ret;
    const pas = rows.filter(r => r.adj && r.el === "Pasajes" && r.apr).reduce((s, r) => s + (r.precio || 0), 0);
    const bon = rows.filter(r => r.adj && r.el === "Bonificación" && r.apr).reduce((s, r) => s + (r.precio || 0), 0);
    return { bruto, ret, sub, pas, bon, total: sub + pas + bon };
  }

  async function guardarEdicion() {
    const totales = recalcTotales(editRows);
    const updated = { ...editL, rows: editRows, ...totales };
    await dbUpsert("liquidaciones", updated);
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
        {(() => { const t = recalcTotales(editRows); return (
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
function Reportes({ obras, elems, users, user, getPrecio, avanceObra }) {
  const [tipo, setTipo] = useState("resumen");
  const [obraId, setObraId] = useState("");
  const [instId, setInstId] = useState("");
  const [expM, setExpM] = useState(null);
  const INs = users.filter(u => u.rol === ROLES.IN);
  const tabs = [
    { k: "resumen", l: "Resumen por obra" },
    { k: "detalle", l: "Detalle por obra" },
    { k: "instalador", l: "Por instalador" },
  ];

  function resumenObras() {
    return obras.map(o => {
      const av = avanceObra(o);
      const tot = o.pisos?.reduce((s, p) => s + (p.aptos?.length || 0), 0) || 0;
      const allEls = o.pisos?.flatMap(p => p.aptos?.flatMap(a => (a.elementos || []).map(el => ({ ...el, aptoId: a.id, tipId: el.tipologiaId || a.tipologia }))) || []) || [];
      const completados = allEls.filter(e => e.completado && !e.esAdicional && !e.elementoId?.startsWith("__")).length;
      const totalPago = allEls.filter(e => e.completado).reduce((s, el) => {
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
        rows.push({ piso: p.numero, apto: a.nombre, el: nombre, cant: el.cantidad || 1, precio, total: precio * (el.cantidad || 1), inst: inst?.nombre || "—", fecha: el.fecha || "" });
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
        if (!el.completado || el.instaladorId !== iId) return;
        if (el.elementoId === "__pasajes__" || el.elementoId === "__bonificacion__") return; // migrados a user.ajustes
        const elem = elems.find(e => e.id === el.elementoId);
        let nombre, precio, adj = false, apr = true;
        if (el.esAdicional) { nombre = `[Ad] ${el.descripcion}`; precio = el.valorUnitario || 0; }
        else { nombre = elem?.nombre || el.elementoId; precio = getPrecio(el.elementoId, o.id, "", a.id, el.tipologiaId || a.tipologia); }
        rows.push({ obra: o.nombre, apto: a.nombre, el: nombre, cant: el.cantidad || 1, precio, total: precio * (el.cantidad || 1), fecha: el.fecha || "", adj, apr });
      });
      (a.elementosExtra || []).forEach(el => {
        if (!el.completado || el.instaladorId !== iId) return;
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
                <tbody>{rows.map((r, i) => <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : C.g0 }}><td style={{ padding: "5px 8px" }}>{r.piso}</td><td style={{ padding: "5px 8px" }}>{r.apto}</td><td style={{ padding: "5px 8px" }}>{r.el}</td><td style={{ padding: "5px 8px", textAlign: "center" }}>{r.cant}</td><td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(r.precio)}</td><td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(r.total)}</td><td style={{ padding: "5px 8px" }}>{r.inst}</td><td style={{ padding: "5px 8px" }}>{r.fecha}</td></tr>)}</tbody>
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
                      <tbody>{rows.map((r, i) => <tr key={i}><td style={tdSt}>{r.piso}</td><td style={tdSt}>{r.apto}</td><td style={tdSt}>{r.el}</td><td style={{ ...tdSt, textAlign: "center" }}>{r.cant}</td><td style={{ ...tdSt, textAlign: "right" }}>{fmt(r.precio)}</td><td style={{ ...tdSt, textAlign: "right", fontWeight: 700, color: C.gnD }}>{fmt(r.total)}</td><td style={{ ...tdSt, color: C.g5 }}>{r.inst}</td><td style={{ ...tdSt, color: C.g5 }}>{r.fecha}</td></tr>)}</tbody>
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
                  <tbody>{rows.filter(r => !r.adj || r.apr).map((r, i) => <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : C.g0 }}><td style={{ padding: "5px 8px" }}>{r.obra}</td><td style={{ padding: "5px 8px" }}>{r.apto}</td><td style={{ padding: "5px 8px" }}>{r.el}</td><td style={{ padding: "5px 8px", textAlign: "center" }}>{r.cant}</td><td style={{ padding: "5px 8px", textAlign: "right" }}>{fmt(r.precio)}</td><td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{fmt(r.total)}</td><td style={{ padding: "5px 8px" }}>{r.fecha}</td></tr>)}</tbody>
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
                      <tbody>{rows.map((r, i) => <tr key={i} style={{ opacity: r.adj && !r.apr ? 0.5 : 1 }}><td style={{ ...tdSt, color: C.g5, fontSize: 12 }}>{r.obra?.substring(0, 16)}</td><td style={tdSt}>{r.apto}</td><td style={tdSt}>{r.el}{r.adj && !r.apr && <span style={{ marginLeft: 6, ...bdg("amber"), fontSize: 10 }}>pend.</span>}</td><td style={{ ...tdSt, textAlign: "center" }}>{r.cant}</td><td style={{ ...tdSt, textAlign: "right" }}>{fmt(r.precio)}</td><td style={{ ...tdSt, textAlign: "right", fontWeight: 700, color: C.gnD }}>{fmt(r.total)}</td><td style={{ ...tdSt, color: C.g5 }}>{r.fecha}</td></tr>)}</tbody>
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
    </div>
  );
}

// ── USUARIOS ──────────────────────────────────────────────
function Usuarios({ users, setUsers, openM, closeM, modals }) {
  const emp = { nombre: "", email: "", rol: ROLES.IN, pin: "", cedula: "", telefono: "", banco: "", cuenta: "" };
  const [form, setForm] = useState(emp);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);
  const rL = { superadmin: "Superadmin", supervisor: "Supervisor", auxiliar: "Auxiliar", instalador: "Instalador" };
  const rC = { superadmin: "orange", supervisor: "amber", auxiliar: "gray", instalador: "green" };

  async function eliminar(id) { await dbDel("usuarios", id); setUsers(x => x.filter(u => u.id !== id)); setDelId(null); }
  async function guardar() {
    if (!form.nombre || !form.email || (!editId && !form.pin)) return;
    const u = editId ? { ...users.find(x => x.id === editId), ...form } : { id: `u${Date.now()}`, ...form };
    await dbUpsert("usuarios", u);
    if (editId) setUsers(x => x.map(y => y.id === editId ? u : y)); else setUsers(x => [...x, u]);
    setForm(emp); setEditId(null); closeM("usr");
  }
  const editar = u => { setEditId(u.id); setForm({ nombre: u.nombre, email: u.email, rol: u.rol, pin: u.pin, cedula: u.cedula || "", telefono: u.telefono || "", banco: u.banco || "", cuenta: u.cuenta || "" }); openM("usr"); };

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
          <span style={bdg(rC[u.rol] || "gray")}>{rL[u.rol]}</span>
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
            <option value={ROLES.SV}>Supervisor</option>
            <option value={ROLES.SA}>Superadmin</option>
          </Sel>
          <Inp label={editId ? "Nuevo PIN (vacío = no cambiar)" : "PIN (4 dígitos)"} type="password" maxLength={4} value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder="••••" />
        </div>
        {form.rol === ROLES.IN && <>
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