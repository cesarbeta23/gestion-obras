import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const ROLES = { SUPERADMIN: "superadmin", SUPERVISOR: "supervisor", AUXILIAR: "auxiliar", INSTALADOR: "instalador" };

const ELEMENTOS_DEFAULT = [
  { id: "e1",  nombre: "Puerta principal",         unidad: "und", precio: 55000 },
  { id: "e2",  nombre: "Puerta habitación",         unidad: "und", precio: 55000 },
  { id: "e3",  nombre: "Chapa puerta principal",    unidad: "und", precio: 10000 },
  { id: "e4",  nombre: "Moldura puerta principal",  unidad: "und",  precio: 10000 },
  { id: "e19", nombre: "Chapa WC principal",        unidad: "und", precio: 10000 },
  { id: "e20", nombre: "Moldura WC principal",      unidad: "und",  precio: 10000 },
  { id: "e21", nombre: "Chapa WC social",           unidad: "und", precio: 10000 },
  { id: "e22", nombre: "Moldura WC social",         unidad: "und",  precio: 10000 },
  { id: "e23", nombre: "Chapa alcoba 2",            unidad: "und", precio: 10000 },
  { id: "e24", nombre: "Moldura alcoba 2",          unidad: "und",  precio: 10000 },
  { id: "e25", nombre: "Chapa alcoba 3",            unidad: "und", precio: 10000 },
  { id: "e26", nombre: "Moldura alcoba 3",          unidad: "und",  precio: 10000 },
  { id: "e5",  nombre: "Closet alcoba principal",   unidad: "und", precio: 150000 },
  { id: "e6",  nombre: "Closet alcoba 2",           unidad: "und", precio: 120000 },
  { id: "e7",  nombre: "Closet alcoba 3",           unidad: "und", precio: 120000 },
  { id: "e8",  nombre: "Mueble WC principal",       unidad: "und", precio: 25000 },
  { id: "e9",  nombre: "Mueble WC social",          unidad: "und", precio: 25000 },
  { id: "e10", nombre: "Vestier enfrentado",        unidad: "und", precio: 110000 },
  { id: "e11", nombre: "Vestier en L",              unidad: "und", precio: 110000 },
  { id: "e12", nombre: "Vestier en U",              unidad: "und", precio: 150000 },
  { id: "e13", nombre: "Mueble alto cocina",        unidad: "und", precio: 0 },
  { id: "e14", nombre: "Mueble bajo cocina",        unidad: "und", precio: 0 },
  { id: "e15", nombre: "Mueble isla",               unidad: "und", precio: 0 },
  { id: "e16", nombre: "Mueble lavadero",           unidad: "und", precio: 30000 },
  { id: "e17", nombre: "Zócalo",                    unidad: "ml",  precio: 2500 },
];

const USUARIOS_DEMO = [
  // Superadmins
  { id: "sa1", nombre: "César Betancur",      rol: ROLES.SUPERADMIN, email: "cesar@obra.com",   pin: "1111", cedula: "3113410458", telefono: "", banco: "", cuenta: "" },
  { id: "sa2", nombre: "Sandra Marin",         rol: ROLES.SUPERADMIN, email: "sandra@obra.com",  pin: "2222", cedula: "3006903514", telefono: "", banco: "", cuenta: "" },
  { id: "sa3", nombre: "Andres Londoño",       rol: ROLES.SUPERADMIN, email: "andres@obra.com",  pin: "3333", cedula: "3189180703", telefono: "", banco: "", cuenta: "" },
  { id: "sa4", nombre: "Luz Toro",             rol: ROLES.SUPERADMIN, email: "luz@obra.com",     pin: "4444", cedula: "3046063039", telefono: "", banco: "", cuenta: "" },
  // Auxiliar
  { id: "ax1", nombre: "Lauren Zapata",        rol: ROLES.AUXILIAR,   email: "lauren@obra.com",  pin: "5555", cedula: "3180803364", telefono: "", banco: "", cuenta: "" },
  // Instaladores — correo: cedula@obra.com | PIN: últimos 4 dígitos cédula
  { id: "i01", nombre: "Albeiro De Jesús Sanchez Alvarez",    rol: ROLES.INSTALADOR, email: "3366950@obra.com",    pin: "6950", cedula: "3366950",    telefono: "", banco: "", cuenta: "" },
  { id: "i02", nombre: "Arnovis Enrique Romero Gaviria",      rol: ROLES.INSTALADOR, email: "10889524@obra.com",   pin: "9524", cedula: "10889524",   telefono: "", banco: "", cuenta: "" },
  { id: "i03", nombre: "Alejandro Caballero Navas",           rol: ROLES.INSTALADOR, email: "1041894977@obra.com", pin: "4977", cedula: "1041894977", telefono: "", banco: "", cuenta: "" },
  { id: "i04", nombre: "Andrés Polo Gomez",                   rol: ROLES.INSTALADOR, email: "72238095@obra.com",   pin: "8095", cedula: "72238095",   telefono: "", banco: "", cuenta: "" },
  { id: "i05", nombre: "Angie Guisela Gonzales Toro",         rol: ROLES.INSTALADOR, email: "32209550@obra.com",   pin: "9550", cedula: "32209550",   telefono: "", banco: "", cuenta: "" },
  { id: "i06", nombre: "Carlos Albeiro Bedoya",               rol: ROLES.INSTALADOR, email: "98537380@obra.com",   pin: "7380", cedula: "98537380",   telefono: "", banco: "", cuenta: "" },
  { id: "i07", nombre: "Claudia Marcela Uribe Lopez",         rol: ROLES.INSTALADOR, email: "1112765279@obra.com", pin: "5279", cedula: "1112765279", telefono: "", banco: "", cuenta: "" },
  { id: "i08", nombre: "Claudia Patricia Higuita Muñoz",      rol: ROLES.INSTALADOR, email: "43164453@obra.com",   pin: "4453", cedula: "43164453",   telefono: "", banco: "", cuenta: "" },
  { id: "i09", nombre: "Cristian Alexis Marin Gonzales",      rol: ROLES.INSTALADOR, email: "1015278020@obra.com", pin: "8020", cedula: "1015278020", telefono: "", banco: "", cuenta: "" },
  { id: "i10", nombre: "Elfa Nataly Rueda Vargas",            rol: ROLES.INSTALADOR, email: "43991850@obra.com",   pin: "1850", cedula: "43991850",   telefono: "", banco: "", cuenta: "" },
  { id: "i11", nombre: "Erika Baza Camacho",                  rol: ROLES.INSTALADOR, email: "1096195897@obra.com", pin: "5897", cedula: "1096195897", telefono: "", banco: "", cuenta: "" },
  { id: "i12", nombre: "Emiliano De Jesus Callejas Rios",     rol: ROLES.INSTALADOR, email: "70541496@obra.com",   pin: "1496", cedula: "70541496",   telefono: "", banco: "", cuenta: "" },
  { id: "i13", nombre: "Greis Pola Jaraba Correa",            rol: ROLES.INSTALADOR, email: "1045691681@obra.com", pin: "1681", cedula: "1045691681", telefono: "", banco: "", cuenta: "" },
  { id: "i14", nombre: "Harrison Martinez Lopez",             rol: ROLES.INSTALADOR, email: "1053796113@obra.com", pin: "6113", cedula: "1053796113", telefono: "", banco: "", cuenta: "" },
  { id: "i15", nombre: "Jose Alfredo Taborda Marin",          rol: ROLES.INSTALADOR, email: "1033337255@obra.com", pin: "7255", cedula: "1033337255", telefono: "", banco: "", cuenta: "" },
  { id: "i16", nombre: "José Gabriel Mesa Martínez",          rol: ROLES.INSTALADOR, email: "98642537@obra.com",   pin: "2537", cedula: "98642537",   telefono: "", banco: "", cuenta: "" },
  { id: "i17", nombre: "Jose Luis Basanta Coa",               rol: ROLES.INSTALADOR, email: "1258625@obra.com",    pin: "8625", cedula: "1258625",    telefono: "", banco: "", cuenta: "" },
  { id: "i18", nombre: "Jorge Leonardo Viloria Romero",       rol: ROLES.INSTALADOR, email: "1104413901@obra.com", pin: "3901", cedula: "1104413901", telefono: "", banco: "", cuenta: "" },
  { id: "i19", nombre: "Juan Carlos Cardenas Vega",           rol: ROLES.INSTALADOR, email: "1098813472@obra.com", pin: "3472", cedula: "1098813472", telefono: "", banco: "", cuenta: "" },
  { id: "i20", nombre: "Juan Martin Osorio Saldarriaga",      rol: ROLES.INSTALADOR, email: "71646955@obra.com",   pin: "6955", cedula: "71646955",   telefono: "", banco: "", cuenta: "" },
  { id: "i21", nombre: "Kateryn Carmona",                     rol: ROLES.INSTALADOR, email: "1214743439@obra.com", pin: "3439", cedula: "1214743439", telefono: "", banco: "", cuenta: "" },
  { id: "i22", nombre: "Leder De Jesus Herrera Arrieta",      rol: ROLES.INSTALADOR, email: "1104410561@obra.com", pin: "0561", cedula: "1104410561", telefono: "", banco: "", cuenta: "" },
  { id: "i23", nombre: "Leider Arturo Herrera Arrieta",       rol: ROLES.INSTALADOR, email: "1005677345@obra.com", pin: "7345", cedula: "1005677345", telefono: "", banco: "", cuenta: "" },
  { id: "i24", nombre: "Leon Jaime Taborda Marin",            rol: ROLES.INSTALADOR, email: "1033339839@obra.com", pin: "9839", cedula: "1033339839", telefono: "", banco: "", cuenta: "" },
  { id: "i25", nombre: "Luis Alberto Goez Goez",              rol: ROLES.INSTALADOR, email: "1152453118@obra.com", pin: "3118", cedula: "1152453118", telefono: "", banco: "", cuenta: "" },
  { id: "i26", nombre: "Luis Felipe Meza Martinez",           rol: ROLES.INSTALADOR, email: "1148205348@obra.com", pin: "5348", cedula: "1148205348", telefono: "", banco: "", cuenta: "" },
  { id: "i27", nombre: "Luis Fernando Aguirre Giraldo",       rol: ROLES.INSTALADOR, email: "71698074@obra.com",   pin: "8074", cedula: "71698074",   telefono: "", banco: "", cuenta: "" },
  { id: "i28", nombre: "Maria Luz Dary Rincon",               rol: ROLES.INSTALADOR, email: "66916338@obra.com",   pin: "6338", cedula: "66916338",   telefono: "", banco: "", cuenta: "" },
  { id: "i29", nombre: "Mario Lemus Arboleda",                rol: ROLES.INSTALADOR, email: "1001846248@obra.com", pin: "6248", cedula: "1001846248", telefono: "", banco: "", cuenta: "" },
  { id: "i30", nombre: "Nelson Dario Correa Acosta",          rol: ROLES.INSTALADOR, email: "98527601@obra.com",   pin: "7601", cedula: "98527601",   telefono: "", banco: "", cuenta: "" },
  { id: "i31", nombre: "Omar De Jesus Ortiz Montoya",         rol: ROLES.INSTALADOR, email: "98528420@obra.com",   pin: "8420", cedula: "98528420",   telefono: "", banco: "", cuenta: "" },
  { id: "i32", nombre: "Oscar Mauricio Lopez",                rol: ROLES.INSTALADOR, email: "98538605@obra.com",   pin: "8605", cedula: "98538605",   telefono: "", banco: "", cuenta: "" },
  { id: "i33", nombre: "Oved Dario Pulgarin",                 rol: ROLES.INSTALADOR, email: "98693472@obra.com",   pin: "3472", cedula: "98693472",   telefono: "", banco: "", cuenta: "" },
  { id: "i34", nombre: "Steve Brahayan Alvarez Reyes",        rol: ROLES.INSTALADOR, email: "PT1277581@obra.com",  pin: "7581", cedula: "PT-1277581", telefono: "", banco: "", cuenta: "" },
  { id: "i35", nombre: "Pedro Felix Moreno Cortes",           rol: ROLES.INSTALADOR, email: "98457089@obra.com",   pin: "7089", cedula: "98457089",   telefono: "", banco: "", cuenta: "" },
  { id: "i36", nombre: "Robinson Alberto Orozco Muñoz",       rol: ROLES.INSTALADOR, email: "71386134@obra.com",   pin: "6134", cedula: "71386134",   telefono: "", banco: "", cuenta: "" },
  { id: "i37", nombre: "Yefferson Sanchez Henao",             rol: ROLES.INSTALADOR, email: "1214720944@obra.com", pin: "0944", cedula: "1214720944", telefono: "", banco: "", cuenta: "" },
];

function fmt(n) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

function getCorteFechas() {
  const hoy = new Date();
  const y = hoy.getFullYear(), m = hoy.getMonth();
  const cortes = [];
  [-2, -1, 0, 1].forEach(delta => {
    const mm = m + delta;
    const yr = mm < 0 ? y - 1 : mm > 11 ? y + 1 : y;
    const mr = ((mm % 12) + 12) % 12;
    const dias = new Date(yr, mr + 1, 0).getDate();
    const c13 = new Date(yr, mr, 13);
    const c28 = new Date(yr, mr, Math.min(28, dias));
    cortes.push({ label: `1–13 ${c13.toLocaleString("es-CO", { month: "long", year: "numeric" })}`, desde: new Date(yr, mr, 1), hasta: c13 });
    cortes.push({ label: `14–${Math.min(28, dias)} ${c28.toLocaleString("es-CO", { month: "long", year: "numeric" })}`, desde: new Date(yr, mr, 14), hasta: c28 });
  });
  cortes.sort((a, b) => b.desde - a.desde);
  return cortes.slice(0, 10);
}

function fechaDentroCorte(fechaStr, desde, hasta) {
  if (!fechaStr) return false;
  const [d, m, y] = fechaStr.split("/").map(Number);
  const f = new Date(y, m - 1, d);
  return f >= desde && f <= hasta;
}

function Badge({ color, children }) {
  const colors = {
    green: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" },
    amber: { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" },
    blue: { bg: "#E6F1FB", text: "#185FA5", border: "#85B7EB" },
    gray: { bg: "#F1EFE8", text: "#5F5E5A", border: "#B4B2A9" },
    coral: { bg: "#FAECE7", text: "#993C1D", border: "#F0997B" },
    purple: { bg: "#EEEDFE", text: "#534AB7", border: "#AFA9EC" },
  };
  const c = colors[color] || colors.gray;
  return <span style={{ background: c.bg, color: c.text, border: `0.5px solid ${c.border}`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 500 }}>{children}</span>;
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ddd", minWidth: 340, maxWidth: wide ? 720 : 560, width: "94%", maxHeight: "88vh", overflowY: "auto", padding: "1.5rem", boxSizing: "border-box", position: "relative", zIndex: 10000 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, color: "#111" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, color: "#555", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
        <div style={{ color: "#111" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{label}</label>}
      <input style={{ width: "100%", boxSizing: "border-box" }} {...props} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{label}</label>}
      <select style={{ width: "100%", boxSizing: "border-box" }} {...props}>{children}</select>
    </div>
  );
}

function Btn({ children, onClick, variant = "default", disabled, style = {} }) {
  const s = {
    default: { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-primary)" },
    primary: { background: "#534AB7", border: "0.5px solid #534AB7", color: "#fff" },
    danger: { background: "#FCEBEB", border: "0.5px solid #F09595", color: "#A32D2D" },
    success: { background: "#EAF3DE", border: "0.5px solid #97C459", color: "#3B6D11" },
    amber: { background: "#FAEEDA", border: "0.5px solid #EF9F27", color: "#854F0B" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...s[variant], borderRadius: 8, padding: "8px 16px", cursor: disabled ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 500, opacity: disabled ? 0.5 : 1, ...style }}>
      {children}
    </button>
  );
}

function Notif({ notifs, setNotifs }) {
  if (!notifs.length) return null;
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 2000, display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      {notifs.map(n => (
        <div key={n.id} style={{ background: n.tipo === "success" ? "#EAF3DE" : "#E6F1FB", border: `0.5px solid ${n.tipo === "success" ? "#97C459" : "#85B7EB"}`, borderRadius: 10, padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16 }}>{n.tipo === "success" ? "✓" : "🔔"}</span>
          <div style={{ flex: 1, fontSize: 13, color: n.tipo === "success" ? "#3B6D11" : "#185FA5" }}>{n.msg}</div>
          <button onClick={() => setNotifs(ns => ns.filter(x => x.id !== n.id))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, lineHeight: 1, color: "inherit" }}>×</button>
        </div>
      ))}
    </div>
  );
}

function usePersistedState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = window.storage && false; // placeholder, use localStorage via window
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch { return defaultValue; }
  });
  const set = (val) => {
    setState(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return [state, set];
}

export default function App() {
  const [user, setUser] = useState(null);
  const [obras, setObras] = usePersistedState("gob_obras", []);
  const [elementos, setElementos] = usePersistedState("gob_elementos", ELEMENTOS_DEFAULT);
  const [usuarios, setUsuarios] = usePersistedState("gob_usuarios", USUARIOS_DEMO);
  const [liquidacionesCerradas, setLiquidacionesCerradas] = usePersistedState("gob_liquidaciones", []);
  const [view, setView] = useState("obras");
  const [selectedObra, setSelectedObra] = useState(null);
  const [selectedPiso, setSelectedPiso] = useState(null);
  const [selectedApto, setSelectedApto] = useState(null);
  const [modals, setModals] = useState({});
  const [loginData, setLoginData] = useState({ email: "", pin: "" });
  const [loginError, setLoginError] = useState("");
  const [notifs, setNotifs] = useState([]);

  const openModal = k => setModals(m => ({ ...m, [k]: true }));
  const closeModal = k => setModals(m => ({ ...m, [k]: false }));

  function pushNotif(msg, tipo = "info") {
    const id = Date.now();
    setNotifs(ns => [...ns, { id, msg, tipo }]);
    setTimeout(() => setNotifs(ns => ns.filter(x => x.id !== id)), 5000);
  }

  function login() {
    const u = usuarios.find(x => x.email === loginData.email && x.pin === loginData.pin);
    if (u) { setUser(u); setLoginError(""); }
    else setLoginError("Correo o PIN incorrecto");
  }

  function calcLiquidacion(instaladorId, desde, hasta) {
    let total = 0;
    obras.forEach(obra => {
      obra.pisos?.forEach(piso => {
        piso.aptos?.forEach(apto => {
          apto.elementos?.forEach(el => {
            if (el.completado && el.instaladorId === instaladorId) {
              if (desde && hasta && !fechaDentroCorte(el.fecha, desde, hasta)) return;
              const elem = elementos.find(e => e.id === el.elementoId);
              total += (elem?.precio || 0) * (el.cantidad || 1);
            }
          });
        });
      });
    });
    return total;
  }

  function calcAvanceObra(obra) {
    let total = 0, comp = 0;
    obra.pisos?.forEach(p => p.aptos?.forEach(a => a.elementos?.forEach(el => { total++; if (el.completado) comp++; })));
    return total === 0 ? 0 : Math.round((comp / total) * 100);
  }

  function calcAvanceApto(apto) {
    const total = apto.elementos?.length || 0;
    const comp = apto.elementos?.filter(e => e.completado).length || 0;
    return total === 0 ? 0 : Math.round((comp / total) * 100);
  }

  if (!user) return <LoginScreen loginData={loginData} setLoginData={setLoginData} login={login} error={loginError} />;

  const sharedProps = { obras, setObras, elementos, usuarios, setUsuarios, openModal, closeModal, modals, pushNotif, user, liquidacionesCerradas, setLiquidacionesCerradas };

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 920, margin: "0 auto", padding: "1rem" }}>
      <Notif notifs={notifs} setNotifs={setNotifs} />
      <Header user={user} setUser={setUser} view={view} setView={setView} selectedObra={selectedObra} setSelectedObra={setSelectedObra} setSelectedPiso={setSelectedPiso} setSelectedApto={setSelectedApto} />

      {view === "obras" && <ObrasView {...sharedProps} calcAvanceObra={calcAvanceObra} setSelectedObra={o => { setSelectedObra(o); setView("obra_detalle"); }} />}      {view === "obra_detalle" && selectedObra && (
        <ObraDetalle {...sharedProps} obra={obras.find(o => o.id === selectedObra.id) || selectedObra}
          calcAvanceApto={calcAvanceApto}
          setSelectedApto={(a, p) => { setSelectedApto(a); setSelectedPiso(p); setView("apto_detalle"); }} />
      )}
      {view === "apto_detalle" && selectedApto && selectedObra && (
        <AptoDetalle {...sharedProps} apto={selectedApto} piso={selectedPiso}
          obra={obras.find(o => o.id === selectedObra.id)}
          calcAvanceApto={calcAvanceApto} pushNotif={pushNotif} />
      )}
      {view === "elementos" && user.rol === ROLES.SUPERADMIN && <ElementosView {...sharedProps} setElementos={setElementos} />}
      {view === "liquidacion" && <LiquidacionView {...sharedProps} calcLiquidacion={calcLiquidacion} liquidacionesCerradas={liquidacionesCerradas} setLiquidacionesCerradas={setLiquidacionesCerradas} />}
      {view === "usuarios" && user.rol === ROLES.SUPERADMIN && <UsuariosView {...sharedProps} />}
    </div>
  );
}

function LoginScreen({ loginData, setLoginData, login, error }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "2rem", width: 340 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, background: "#EEEDFE", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 26 }}>🏗️</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>Gestión de Obras</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>Ingresa con tu correo y PIN</p>
        </div>
        <Input label="Correo" type="email" placeholder="correo@empresa.com" value={loginData.email} onChange={e => setLoginData(d => ({ ...d, email: e.target.value }))} />
        <Input label="PIN" type="password" placeholder="••••" value={loginData.pin} onChange={e => setLoginData(d => ({ ...d, pin: e.target.value }))} onKeyDown={e => e.key === "Enter" && login()} />
        {error && <p style={{ color: "#A32D2D", fontSize: 13, margin: "-8px 0 12px" }}>{error}</p>}
        <Btn variant="primary" onClick={login} style={{ width: "100%", padding: "10px" }}>Ingresar</Btn>
        <div style={{ marginTop: 16, padding: 12, background: "var(--color-background-secondary)", borderRadius: 10, fontSize: 12, color: "var(--color-text-secondary)" }}>
          <strong>Demo:</strong> admin@obra.com / 1234 · juan@obra.com / 3333
        </div>
      </div>
    </div>
  );
}

function Header({ user, setUser, view, setView, selectedObra, setSelectedObra, setSelectedPiso, setSelectedApto }) {
  const rolColor = { superadmin: "purple", supervisor: "blue", auxiliar: "amber", instalador: "green" };
  const rolLabel = { superadmin: "Superadmin", supervisor: "Supervisor", auxiliar: "Auxiliar", instalador: "Instalador" };
  const nav = [
    { key: "obras",       label: "Obras",       roles: [ROLES.SUPERADMIN, ROLES.SUPERVISOR, ROLES.AUXILIAR, ROLES.INSTALADOR] },
    { key: "elementos",   label: "Elementos",   roles: [ROLES.SUPERADMIN] },
    { key: "liquidacion", label: "Liquidación", roles: [ROLES.SUPERADMIN, ROLES.SUPERVISOR, ROLES.AUXILIAR, ROLES.INSTALADOR] },
    { key: "usuarios",    label: "Usuarios",    roles: [ROLES.SUPERADMIN] },
  ];
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 22 }}>🏗️</span>
          <div>
            <div style={{ fontWeight: 500, fontSize: 15 }}>{user.nombre}</div>
            <Badge color={rolColor[user.rol]}>{rolLabel[user.rol]}</Badge>
          </div>
        </div>
        <Btn onClick={() => setUser(null)}>Salir</Btn>
      </div>
      {(view === "obra_detalle" || view === "apto_detalle") && (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 8, display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ cursor: "pointer", color: "#534AB7" }} onClick={() => { setView("obras"); setSelectedObra(null); setSelectedPiso(null); setSelectedApto(null); }}>Obras</span>
          {selectedObra && <><span>›</span><span style={{ cursor: "pointer", color: view === "apto_detalle" ? "#534AB7" : "var(--color-text-primary)" }} onClick={() => { setView("obra_detalle"); setSelectedPiso(null); setSelectedApto(null); }}>{selectedObra.nombre}</span></>}
          {view === "apto_detalle" && <><span>›</span><span>Apartamento</span></>}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 12 }}>
        {nav.filter(n => n.roles.includes(user.rol)).map(n => (
          <button key={n.key} onClick={() => setView(n.key)}
            style={{ background: view === n.key ? "#EEEDFE" : "transparent", color: view === n.key ? "#534AB7" : "var(--color-text-secondary)", border: view === n.key ? "0.5px solid #AFA9EC" : "0.5px solid transparent", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 14, fontWeight: view === n.key ? 500 : 400 }}>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ObrasView({ obras, setObras, user, calcAvanceObra, setSelectedObra, openModal, closeModal, modals }) {
  const [form, setForm] = useState({ nombre: "", direccion: "", pisos: 1, aptosPorPiso: 1 });
  function crearObra() {
    if (!form.nombre) return;
    const pisos = Array.from({ length: Number(form.pisos) }, (_, pi) => ({
      id: `p${Date.now()}${pi}`, numero: pi + 1,
      aptos: Array.from({ length: Number(form.aptosPorPiso) }, (_, ai) => ({
        id: `a${Date.now()}${pi}${ai}`, numero: ai + 1, tipologia: "", elementos: []
      }))
    }));
    setObras(o => [...o, { id: `obra${Date.now()}`, nombre: form.nombre, direccion: form.direccion, pisos, estado: "activa", tipologias: [] }]);
    setForm({ nombre: "", direccion: "", pisos: 1, aptosPorPiso: 1 });
    closeModal("nuevaObra");
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Obras</h2>
        {user.rol === ROLES.SUPERADMIN && <Btn variant="primary" onClick={() => openModal("nuevaObra")}>+ Nueva obra</Btn>}
      </div>
      {obras.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)", background: "var(--color-background-secondary)", borderRadius: 12 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
          <p>No hay obras registradas</p>
          {user.rol === ROLES.ADMIN && <Btn variant="primary" onClick={() => openModal("nuevaObra")}>Crear primera obra</Btn>}
        </div>
      )}
      <div style={{ display: "grid", gap: 12 }}>
        {obras.map(obra => {
          const av = calcAvanceObra(obra);
          const totalAptos = obra.pisos?.reduce((a, p) => a + (p.aptos?.length || 0), 0) || 0;
          return (
            <div key={obra.id} onClick={() => setSelectedObra(obra)}
              style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1rem 1.25rem", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#AFA9EC"}
              onMouseLeave={e => e.currentTarget.style.borderColor = ""}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div><div style={{ fontWeight: 500, fontSize: 16, marginBottom: 4 }}>{obra.nombre}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{obra.direccion}</div></div>
                <Badge color="green">{obra.estado}</Badge>
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 14, fontSize: 13, alignItems: "center" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>{obra.pisos?.length || 0} pisos · {totalAptos} aptos</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Avance</span>
                    <span style={{ fontWeight: 500 }}>{av}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${av}%`, background: "#639922", borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {modals.nuevaObra && (
        <Modal title="Nueva obra" onClose={() => closeModal("nuevaObra")}>
          <Input label="Nombre de la obra" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Conjunto El Prado" />
          <Input label="Dirección" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Número de pisos" type="number" min="1" max="50" value={form.pisos} onChange={e => setForm(f => ({ ...f, pisos: e.target.value }))} />
            <Input label="Aptos por piso" type="number" min="1" max="20" value={form.aptosPorPiso} onChange={e => setForm(f => ({ ...f, aptosPorPiso: e.target.value }))} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <Btn onClick={() => closeModal("nuevaObra")}>Cancelar</Btn>
            <Btn variant="primary" onClick={crearObra}>Crear obra</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ObraDetalle({ obra, obras, setObras, user, calcAvanceApto, elementos, usuarios, setSelectedApto, openModal, closeModal, modals, pushNotif }) {
  const [editTip, setEditTip] = useState(null);
  const [tipForm, setTipForm] = useState({ nombre: "", elementoIds: [] });
  const [replicaModal, setReplicaModal] = useState(false);
  const [replicaSel, setReplicaSel] = useState({ reglas: [] });
  const [asignando, setAsignando] = useState(null);
  const currentObra = obras.find(o => o.id === obra.id) || obra;
  const tipologias = currentObra.tipologias || [];

  // Números únicos de apartamentos en esta obra
  const numerosApto = [...new Set(currentObra.pisos?.flatMap(p => p.aptos?.map(a => String(a.numero))) || [])].sort((a, b) => Number(a) - Number(b));

  function saveTipologias(tips) {
    setObras(obs => obs.map(o => o.id === obra.id ? { ...o, tipologias: tips } : o));
  }

  function abrirNuevaTip() {
    setEditTip(null);
    setTipForm({ nombre: "", elementoIds: [] });
    openModal("tipModal");
  }

  function abrirEditTip(t) {
    setEditTip(t.id);
    setTipForm({ nombre: t.nombre, elementoIds: [...t.elementoIds] });
    openModal("tipModal");
  }

  function guardarTip() {
    if (!tipForm.nombre) return;
    if (editTip) {
      const updated = tipologias.map(t => t.id === editTip ? { ...t, nombre: tipForm.nombre, elementoIds: tipForm.elementoIds } : t);
      saveTipologias(updated);
      // Actualizar aptos que usan esta tipología
      setObras(obs => obs.map(o => {
        if (o.id !== obra.id) return o;
        return {
          ...o, tipologias: updated,
          pisos: o.pisos.map(p => ({
            ...p, aptos: p.aptos.map(a => {
              if (a.tipologia !== editTip) return a;
              const nuevosEls = tipForm.elementoIds.map(eid => {
                const exist = a.elementos?.find(e => e.elementoId === eid);
                return exist || { elementoId: eid, completado: false, instaladorId: null, fecha: null, cantidad: 1 };
              });
              return { ...a, elementos: nuevosEls };
            })
          }))
        };
      }));
      pushNotif(`Tipología "${tipForm.nombre}" actualizada`, "success");
    } else {
      const t = { id: `t${Date.now()}`, nombre: tipForm.nombre, elementoIds: tipForm.elementoIds };
      saveTipologias([...tipologias, t]);
      pushNotif(`Tipología "${tipForm.nombre}" creada`, "success");
    }
    closeModal("tipModal");
    setEditTip(null);
  }

  function asignarTipologia(pisoId, aptoId, tipId) {
    const tip = tipologias.find(t => t.id === tipId);
    const nuevosEls = (tip?.elementoIds || []).map(eid => ({ elementoId: eid, completado: false, instaladorId: null, fecha: null, cantidad: 1 }));
    setObras(obs => obs.map(o => {
      if (o.id !== obra.id) return o;
      return { ...o, pisos: o.pisos.map(p => p.id !== pisoId ? p : { ...p, aptos: p.aptos.map(a => a.id !== aptoId ? a : { ...a, tipologia: tipId, elementos: nuevosEls }) }) };
    }));
    setAsignando(null);
  }

  function replicarEnSerie() {
    let count = 0;
    setObras(obs => obs.map(o => {
      if (o.id !== obra.id) return o;
      return {
        ...o, pisos: o.pisos.map(p => ({
          ...p, aptos: p.aptos.map(a => {
            const sufijo = String(a.numero);
            const regla = replicaSel.reglas.find(r => r.sufijo === sufijo && r.tipId);
            if (!regla) return a;
            const tip = tipologias.find(t => t.id === regla.tipId);
            if (!tip) return a;
            const nuevosEls = tip.elementoIds.map(eid => {
              const exist = a.elementos?.find(e => e.elementoId === eid);
              return exist || { elementoId: eid, completado: false, instaladorId: null, fecha: null, cantidad: 1 };
            });
            count++;
            return { ...a, tipologia: tip.id, elementos: nuevosEls };
          })
        }))
      };
    }));
    pushNotif(`Tipologías replicadas en ${count} apartamento(s)`, "success");
    setReplicaModal(false);
    setReplicaSel({ reglas: [] });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{obra.nombre}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>{obra.direccion}</p>
        </div>
          {user.rol === ROLES.SUPERADMIN && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn onClick={() => setAccesoObraModal(true)}>👷 Accesos</Btn>
              <Btn onClick={() => setReplicaModal(true)}>Replicar en serie</Btn>
              <Btn variant="primary" onClick={abrirNuevaTip}>+ Tipología</Btn>
            </div>
          )}
      </div>

      {tipologias.length > 0 && (
        <div style={{ marginBottom: 18, padding: "12px 16px", background: "var(--color-background-secondary)", borderRadius: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Tipologías</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tipologias.map(t => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 20, padding: "4px 12px" }}>
                <span style={{ fontSize: 13, color: "#534AB7" }}>{t.nombre} · {t.elementoIds?.length || 0} elem.</span>
              {user.rol === ROLES.SUPERADMIN && (
                  <span onClick={() => abrirEditTip(t)} style={{ cursor: "pointer", fontSize: 13, color: "#534AB7", fontWeight: 500 }}>✎</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {currentObra.pisos?.map(piso => (
        <div key={piso.id} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 10, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 8 }}>
            Piso {piso.numero}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {piso.aptos?.map(apto => {
              const av = calcAvanceApto(apto);
              const tip = tipologias?.find(t => t.id === apto.tipologia);
              return (
                <div key={apto.id} onClick={() => apto.tipologia ? setSelectedApto(apto, piso) : null}
                  style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: 12, cursor: apto.tipologia ? "pointer" : "default" }}
                  onMouseEnter={e => apto.tipologia && (e.currentTarget.style.borderColor = "#AFA9EC")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "")}>
                  <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>
                    {piso.numero}{String(apto.numero).padStart(2, "0")}
                  </div>
                  {tip ? (
                    <>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>{tip.nombre}</div>
                      <div style={{ height: 4, background: "var(--color-background-secondary)", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
                        <div style={{ height: "100%", width: `${av}%`, background: av === 100 ? "#639922" : "#534AB7", borderRadius: 4 }} />
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{av}%</div>
                    </>
                  ) : user.rol !== ROLES.INSTALADOR && user.rol !== ROLES.AUXILIAR ? (
                    asignando === apto.id ? (
                      <select style={{ width: "100%", fontSize: 11, marginTop: 4 }} onClick={e => e.stopPropagation()} onChange={e => e.target.value && asignarTipologia(piso.id, apto.id, e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {tipologias?.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                      </select>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); setAsignando(apto.id); }}
                        style={{ fontSize: 11, color: "#534AB7", background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 6, padding: "3px 6px", cursor: "pointer", marginTop: 4 }}>
                        + tipología
                      </button>
                    )
                  ) : <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Sin asignar</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {accesoObraModal && (
        <Modal title={`Accesos — ${currentObra.nombre}`} onClose={() => setAccesoObraModal(false)} wide>
          {(() => {
            const solicitudesPendientes = (currentObra.solicitudes || []).filter(s => s.estado === "pendiente");
            const instaladores = usuarios.filter(u => u.rol === ROLES.INSTALADOR);
            return (
              <div>
                {solicitudesPendientes.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10, color: "#854F0B" }}>Solicitudes pendientes</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {solicitudesPendientes.map(s => {
                        const inst = usuarios.find(u => u.id === s.userId);
                        return (
                          <div key={s.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#FAEEDA", border: "0.5px solid #EF9F27", borderRadius: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, fontSize: 14 }}>{inst?.nombre}</div>
                              <div style={{ fontSize: 12, color: "#666" }}>Solicitó el {s.fecha}</div>
                            </div>
                            <Btn variant="success" onClick={() => {
                              setObras(obs => obs.map(o => {
                                if (o.id !== obra.id) return o;
                                return { ...o, solicitudes: (o.solicitudes||[]).map(x => x.userId===s.userId ? {...x, estado:"aprobado"} : x), instaladoresAutorizados: [...new Set([...(o.instaladoresAutorizados||[]), s.userId])] };
                              }));
                              pushNotif(`Acceso aprobado para ${inst?.nombre}`, "success");
                            }}>Aprobar</Btn>
                            <Btn variant="danger" onClick={() => {
                              setObras(obs => obs.map(o => {
                                if (o.id !== obra.id) return o;
                                return { ...o, solicitudes: (o.solicitudes||[]).map(x => x.userId===s.userId ? {...x, estado:"rechazado"} : x) };
                              }));
                              pushNotif(`Acceso rechazado para ${inst?.nombre}`, "success");
                            }}>Rechazar</Btn>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Todos los instaladores</div>
                <div style={{ display: "grid", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                  {instaladores.map(inst => {
                    const autorizado = (currentObra.instaladoresAutorizados || []).includes(inst.id);
                    return (
                      <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: autorizado ? "#EAF3DE" : "#f9f9f9", border: `0.5px solid ${autorizado ? "#97C459" : "#ddd"}`, borderRadius: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 50, background: autorizado ? "#C0DD97" : "#ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: autorizado ? "#27500A" : "#555", flexShrink: 0 }}>
                          {inst.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{inst.nombre}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>C.C. {inst.cedula || "—"}</div>
                        </div>
                        <button onClick={() => {
                          setObras(obs => obs.map(o => {
                            if (o.id !== obra.id) return o;
                            const aut = o.instaladoresAutorizados || [];
                            return { ...o, instaladoresAutorizados: aut.includes(inst.id) ? aut.filter(id => id !== inst.id) : [...aut, inst.id] };
                          }));
                        }} style={{ background: autorizado ? "#FCEBEB" : "#EAF3DE", border: `0.5px solid ${autorizado ? "#F09595" : "#97C459"}`, color: autorizado ? "#A32D2D" : "#3B6D11", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
                          {autorizado ? "Revocar" : "Dar acceso"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <Btn onClick={() => setAccesoObraModal(false)}>Cerrar</Btn>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {modals.tipModal && (
        <Modal title={editTip ? "Editar tipología" : "Nueva tipología"} onClose={() => closeModal("tipModal")}>
          <Input label="Nombre" value={tipForm.nombre} onChange={e => setTipForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Tipo A — 3 alcobas" />
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 8 }}>Elementos incluidos</label>
            <div style={{ maxHeight: 260, overflowY: "auto", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 8, background: "var(--color-background-primary)" }}>
              {elementos.map(el => (
                <label key={el.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", cursor: "pointer", fontSize: 14, borderRadius: 6, background: tipForm.elementoIds.includes(el.id) ? "var(--color-background-secondary)" : "transparent" }}>
                  <input type="checkbox" checked={tipForm.elementoIds.includes(el.id)}
                    onChange={e => setTipForm(f => ({ ...f, elementoIds: e.target.checked ? [...f.elementoIds, el.id] : f.elementoIds.filter(x => x !== el.id) }))} />
                  <span style={{ flex: 1, color: "var(--color-text-primary)" }}>{el.nombre}</span>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{el.unidad} · {fmt(el.precio)}</span>
                </label>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 6 }}>
              {tipForm.elementoIds.length} elemento(s) seleccionado(s)
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn onClick={() => closeModal("tipModal")}>Cancelar</Btn>
            <Btn variant="primary" onClick={guardarTip}>{editTip ? "Guardar cambios" : "Crear"}</Btn>
          </div>
        </Modal>
      )}

      {replicaModal && (
        <Modal title="Replicar tipologías por número de apartamento" onClose={() => setReplicaModal(false)} wide>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
            Asigna una tipología a cada número de apartamento. Se aplicará en todos los pisos automáticamente.
            Por ejemplo: todos los apartamentos que terminan en <strong>01</strong> recibirán la tipología que selecciones aquí.
          </p>
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            {numerosApto.map(sufijo => {
              const regla = replicaSel.reglas.find(r => r.sufijo === sufijo);
              const tipId = regla?.tipId || "";
              // Cuántos aptos tienen este número
              const cantidad = currentObra.pisos?.reduce((n, p) => n + (p.aptos?.filter(a => String(a.numero) === sufijo).length || 0), 0);
              return (
                <div key={sufijo} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: tipId ? "#EEEDFE" : "var(--color-background-secondary)", border: `0.5px solid ${tipId ? "#AFA9EC" : "var(--color-border-tertiary)"}`, borderRadius: 10 }}>
                  <div style={{ minWidth: 80 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: tipId ? "#534AB7" : "var(--color-text-primary)" }}>
                      Apto ×{sufijo}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{cantidad} apto(s) en obra</div>
                  </div>
                  <select style={{ flex: 1 }} value={tipId}
                    onChange={e => {
                      const val = e.target.value;
                      setReplicaSel(r => {
                        const nuevas = r.reglas.filter(x => x.sufijo !== sufijo);
                        if (val) nuevas.push({ sufijo, tipId: val });
                        return { reglas: nuevas };
                      });
                    }}>
                    <option value="">— Sin asignar —</option>
                    {tipologias.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                  {tipId && <span style={{ fontSize: 18, color: "#534AB7" }}>✓</span>}
                </div>
              );
            })}
          </div>
          {numerosApto.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Esta obra no tiene apartamentos configurados aún.</p>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              {replicaSel.reglas.filter(r => r.tipId).length} número(s) con tipología asignada
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => setReplicaModal(false)}>Cancelar</Btn>
              <Btn variant="primary" disabled={!replicaSel.reglas.filter(r => r.tipId).length} onClick={replicarEnSerie}>
                Aplicar en toda la obra
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AptoDetalle({ apto, piso, obra, obras, setObras, user, elementos, usuarios, calcAvanceApto, pushNotif }) {
  const currentObra = obras.find(o => o.id === obra.id);
  const currentPiso = currentObra?.pisos?.find(p => p.id === piso.id);
  const currentApto = currentPiso?.aptos?.find(a => a.id === apto.id) || apto;
  const tip = currentObra?.tipologias?.find(t => t.id === currentApto.tipologia);
  const av = calcAvanceApto(currentApto);
  const supervisores = usuarios.filter(u => u.rol === ROLES.SUPERVISOR);

  // Estado local de cambios pendientes
  const [pendientes, setPendientes] = useState({});
  const [cantidades, setCantidades] = useState({});
  const hayPendientes = Object.keys(pendientes).length > 0;

  function togglePendiente(idx) {
    if (user.rol === ROLES.ADMIN) return;
    const el = currentApto.elementos[idx];
    if (el.completado) return; // no se puede desmarcar lo ya guardado
    setPendientes(p => {
      const copy = { ...p };
      if (copy[idx] !== undefined) delete copy[idx];
      else copy[idx] = true;
      return copy;
    });
  }

  function setCantidad(idx, val) {
    setCantidades(c => ({ ...c, [idx]: Number(val) }));
  }

  function guardarCambios() {
    const supervisores = usuarios.filter(u => u.rol === ROLES.SUPERVISOR);
    setObras(obs => obs.map(o => {
      if (o.id !== obra.id) return o;
      return {
        ...o, pisos: o.pisos.map(p => {
          if (p.id !== piso.id) return p;
          return {
            ...p, aptos: p.aptos.map(a => {
              if (a.id !== apto.id) return a;
              const newEls = a.elementos.map((el, i) => {
                let updated = { ...el };
                if (cantidades[i] !== undefined) updated.cantidad = cantidades[i];
                if (pendientes[i]) {
                  updated.completado = true;
                  updated.instaladorId = user.id;
                  updated.fecha = new Date().toLocaleDateString("es-CO");
                }
                return updated;
              });
              const allDone = newEls.every(e => e.completado);
              if (allDone) supervisores.forEach(s => pushNotif(`🔔 ${s.nombre}: Apto ${piso.numero}${String(a.numero).padStart(2, "0")} completado en ${obra.nombre}`, "info"));
              return { ...a, elementos: newEls };
            })
          };
        })
      };
    }));
    pushNotif(`Elementos guardados correctamente`, "success");
    setPendientes({});
    setCantidades({});
  }

  const totalLiquidado = currentApto.elementos?.filter(e => e.completado).reduce((s, el) => {
    const elem = elementos.find(x => x.id === el.elementoId);
    return s + (elem?.precio || 0) * (el.cantidad || 1);
  }, 0) || 0;

  const totalPendiente = Object.keys(pendientes).reduce((s, idx) => {
    const el = currentApto.elementos[parseInt(idx)];
    const elem = elementos.find(x => x.id === el?.elementoId);
    const cant = cantidades[idx] ?? el?.cantidad ?? 1;
    return s + (elem?.precio || 0) * cant;
  }, 0);

  const canEdit = user.rol === ROLES.SUPERADMIN || user.rol === ROLES.SUPERVISOR;

  function desmarcarElemento(idx) {
    setObras(obs => obs.map(o => {
      if (o.id !== obra.id) return o;
      return {
        ...o, pisos: o.pisos.map(p => {
          if (p.id !== piso.id) return p;
          return {
            ...p, aptos: p.aptos.map(a => {
              if (a.id !== apto.id) return a;
              return { ...a, elementos: a.elementos.map((el, i) => i !== idx ? el : { ...el, completado: false, instaladorId: null, fecha: null }) };
            })
          };
        })
      };
    }));
    pushNotif("Elemento desmarcado como instalado", "success");
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
          Apto {piso.numero}{String(apto.numero).padStart(2, "0")} — {tip?.nombre || "Sin tipología"}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-secondary)" }}>{obra.nombre} · Piso {piso.numero}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          ["Avance", `${av}%`],
          ["Instalados", `${currentApto.elementos?.filter(e => e.completado).length || 0} / ${currentApto.elementos?.length || 0}`],
          [user.rol === ROLES.INSTALADOR ? "Mi liquidación" : "Liquidación apto", fmt(totalLiquidado)]        ].map(([l, v]) => (
          <div key={l} style={{ background: "var(--color-background-secondary)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>

      {canEdit && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "#FAEEDA", border: "0.5px solid #EF9F27", borderRadius: 10, fontSize: 13, color: "#854F0B" }}>
          Como {user.rol}, puedes desmarcar cualquier elemento instalado presionando el botón <strong>✕</strong> para corregirlo.
        </div>
      )}

      {user.rol === ROLES.INSTALADOR && (
        <div style={{ marginBottom: 14, padding: "10px 14px", background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 10, fontSize: 13, color: "#534AB7" }}>
          Selecciona los elementos que terminaste y presiona <strong>Guardar</strong> para registrarlos.
          {hayPendientes && <span style={{ marginLeft: 8, fontWeight: 500 }}>· {Object.keys(pendientes).length} por guardar · +{fmt(totalPendiente)}</span>}
        </div>
      )}

      <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
        {currentApto.elementos?.map((el, idx) => {
          const elem = elementos.find(e => e.id === el.elementoId);
          const instalador = usuarios.find(u => u.id === el.instaladorId);
          const esPendiente = !!pendientes[idx];
          const marcado = el.completado || esPendiente;
  const canToggle = user.rol === ROLES.INSTALADOR && !el.completado;
          const cantActual = cantidades[idx] ?? el.cantidad ?? 1;

          return (
            <div key={idx}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                background: el.completado ? "#EAF3DE" : esPendiente ? "#EEEDFE" : "var(--color-background-primary)",
                border: `1.5px solid ${el.completado ? "#97C459" : esPendiente ? "#AFA9EC" : "var(--color-border-tertiary)"}`,
                borderRadius: 10, padding: "12px 14px", transition: "all 0.15s",
                cursor: canToggle ? "pointer" : "default"
              }}
              onClick={() => canToggle && togglePendiente(idx)}>

              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                border: `2px solid ${el.completado ? "#639922" : esPendiente ? "#534AB7" : "#B4B2A9"}`,
                background: el.completado ? "#639922" : esPendiente ? "#534AB7" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {marcado && <span style={{ color: "#fff", fontSize: 16, lineHeight: 1, fontWeight: 700 }}>✓</span>}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14, color: el.completado ? "#27500A" : esPendiente ? "#3C3489" : "var(--color-text-primary)" }}>
                  {elem?.nombre || el.elementoId}
                </div>
                {el.completado && instalador && (
                  <div style={{ fontSize: 12, color: "#3B6D11" }}>{instalador.nombre} · {el.fecha}</div>
                )}
                {esPendiente && <div style={{ fontSize: 12, color: "#534AB7" }}>Pendiente de guardar</div>}
              </div>

              {(elem?.unidad === "ml" || elem?.unidad === "m2") && (
                <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{elem.unidad}</span>
                  <input type="number" min="0.1" step="0.1" value={cantActual}
                    disabled={el.completado && user.rol === ROLES.INSTALADOR}
                    onChange={e => setCantidad(idx, e.target.value)}
                    style={{ width: 64, textAlign: "center", fontSize: 13 }} />
                </div>
              )}

              <div style={{ textAlign: "right", minWidth: 90 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{fmt((elem?.precio || 0) * cantActual)}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{elem?.unidad}</div>
              </div>

              {canEdit && el.completado && (
                <button onClick={e => { e.stopPropagation(); desmarcarElemento(idx); }}
                  title="Desmarcar como instalado"
                  style={{ marginLeft: 4, width: 28, height: 28, borderRadius: 6, border: "0.5px solid #F09595", background: "#FCEBEB", color: "#A32D2D", cursor: "pointer", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {user.rol === ROLES.INSTALADOR && (
        <div style={{ position: "sticky", bottom: 0, background: "var(--color-background-primary)", borderTop: "0.5px solid var(--color-border-tertiary)", padding: "14px 0 4px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {hayPendientes && (
            <span style={{ fontSize: 14, color: "var(--color-text-secondary)", alignSelf: "center" }}>
              {Object.keys(pendientes).length} elemento(s) listos para guardar
            </span>
          )}
          <Btn variant="primary" disabled={!hayPendientes} onClick={guardarCambios} style={{ padding: "10px 28px", fontSize: 15 }}>
            Guardar instalados
          </Btn>
        </div>
      )}
    </div>
  );
}

function ElementosView({ elementos, setElementos, openModal, closeModal, modals }) {
  const [form, setForm] = useState({ nombre: "", unidad: "und", precio: 0 });
  const [editId, setEditId] = useState(null);
  function guardar() {
    if (!form.nombre) return;
    if (editId) setElementos(els => els.map(e => e.id === editId ? { ...e, ...form, precio: Number(form.precio) } : e));
    else setElementos(els => [...els, { id: `e${Date.now()}`, ...form, precio: Number(form.precio) }]);
    setEditId(null); setForm({ nombre: "", unidad: "und", precio: 0 }); closeModal("elModal");
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Elementos</h2>
        <Btn variant="primary" onClick={() => { setEditId(null); setForm({ nombre: "", unidad: "und", precio: 0 }); openModal("elModal"); }}>+ Nuevo</Btn>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {elementos.map(el => (
          <div key={el.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ flex: 1 }}><span style={{ fontWeight: 500, fontSize: 14 }}>{el.nombre}</span> <Badge color="gray">{el.unidad}</Badge></div>
            <div style={{ fontWeight: 500, fontSize: 14, minWidth: 110, textAlign: "right" }}>{fmt(el.precio)}</div>
            <Btn onClick={() => { setEditId(el.id); setForm({ nombre: el.nombre, unidad: el.unidad, precio: el.precio }); openModal("elModal"); }}>Editar</Btn>
          </div>
        ))}
      </div>
      {modals.elModal && (
        <Modal title={editId ? "Editar elemento" : "Nuevo elemento"} onClose={() => closeModal("elModal")}>
          <Input label="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          <Select label="Unidad" value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
            <option value="und">und — Unidad</option>
            <option value="ml">ml — Metro lineal</option>
            <option value="m2">m2 — Metro cuadrado</option>
            <option value="gl">gl — Global</option>
          </Select>
          <Input label="Precio de instalación ($)" type="number" min="0" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn onClick={() => closeModal("elModal")}>Cancelar</Btn>
            <Btn variant="primary" onClick={guardar}>{editId ? "Guardar" : "Crear"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LiquidacionView({ obras, elementos, usuarios, user, calcLiquidacion }) {
  const cortes = getCorteFechas();
  const [corteIdx, setCorteIdx] = useState(0);
  const corte = cortes[corteIdx];
  const [exportModal, setExportModal] = useState(null);
  const instaladores = user.rol === ROLES.INSTALADOR ? usuarios.filter(u => u.id === user.id) : usuarios.filter(u => u.rol === ROLES.INSTALADOR);

  function detalleInstalador(instId) {
    const rows = [];
    obras.forEach(obra => {
      obra.pisos?.forEach(piso => {
        piso.aptos?.forEach(apto => {
          apto.elementos?.forEach(el => {
            if (el.completado && el.instaladorId === instId && fechaDentroCorte(el.fecha, corte.desde, corte.hasta)) {
              const elem = elementos.find(e => e.id === el.elementoId);
              rows.push({ obra: obra.nombre, apto: `${piso.numero}${String(apto.numero).padStart(2, "0")}`, elemento: elem?.nombre, cantidad: el.cantidad || 1, precio: elem?.precio || 0, fecha: el.fecha });
            }
          });
        });
      });
    });
    return rows;
  }

  function exportarExcel(inst, rows, total) {
    const header = ["Obra", "Apartamento", "Elemento", "Cantidad", "Precio unitario", "Total", "Fecha"];
    const lines = [
      `Liquidación — ${inst.nombre} (C.C. ${inst.cedula}) — Corte: ${corte.label}`,
      `Banco: ${inst.banco || "-"} | Cuenta: ${inst.cuenta || "-"} | Tel: ${inst.telefono || "-"}`,
      "",
      header.join("\t"),
      ...rows.map(r => [r.obra, r.apto, r.elemento, r.cantidad, r.precio, r.precio * r.cantidad, r.fecha].join("\t")),
      ["", "", "", "", "TOTAL", total, ""].join("\t")
    ].join("\n");
    setExportModal({ tipo: "excel", inst, rows, total, texto: lines });
  }

  function exportarPDF(inst, rows, total) {
    setExportModal({ tipo: "pdf", inst, rows, total, texto: null });
  }

  return (
    <div>
      {exportModal && (
        <Modal title={exportModal.tipo === "pdf" ? "Reporte PDF — Imprimir" : "Reporte Excel — Copiar datos"} onClose={() => setExportModal(null)} wide>
          {exportModal.tipo === "pdf" ? (
            <div>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
                Selecciona todo el contenido del recuadro, cópialo y pégalo en Word o Google Docs para imprimir, o usa Ctrl+P directamente en esta ventana.
              </p>
              <div id="pdf-content" style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "20px", fontSize: 13, lineHeight: 1.7 }}>
                <div style={{ borderBottom: "2px solid #534AB7", paddingBottom: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>Liquidación de instalación</div>
                  <div style={{ marginTop: 6 }}><strong>{exportModal.inst.nombre}</strong> — C.C. {exportModal.inst.cedula}</div>
                  <div style={{ color: "var(--color-text-secondary)" }}>Tel: {exportModal.inst.telefono || "-"} &nbsp;|&nbsp; Banco: {exportModal.inst.banco || "-"} &nbsp;|&nbsp; Cta: {exportModal.inst.cuenta || "-"}</div>
                  <div style={{ color: "var(--color-text-secondary)" }}>Correo: {exportModal.inst.email}</div>
                  <div style={{ marginTop: 8 }}><Badge color="purple">Corte: {corte.label}</Badge></div>
                  <div style={{ fontSize: 22, fontWeight: 500, color: "#3B6D11", marginTop: 8 }}>{fmt(exportModal.total)}</div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#EEEDFE" }}>
                      {["Obra","Apto","Elemento","Cant.","P. unitario","Total","Fecha"].map(h => (
                        <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 500, color: "#534AB7", borderBottom: "1px solid #AFA9EC" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exportModal.rows.map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "var(--color-background-secondary)" }}>
                        <td style={{ padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{r.obra}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{r.apto}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{r.elemento}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)", textAlign: "center" }}>{r.cantidad}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)", textAlign: "right" }}>{fmt(r.precio)}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)", textAlign: "right", fontWeight: 500 }}>{fmt(r.precio * r.cantidad)}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{r.fecha}</td>
                      </tr>
                    ))}
                    <tr style={{ background: "#EAF3DE" }}>
                      <td colSpan={5} style={{ padding: "8px", fontWeight: 500 }}>TOTAL CORTE</td>
                      <td style={{ padding: "8px", fontWeight: 500, fontSize: 14, color: "#3B6D11" }}>{fmt(exportModal.total)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 16, fontSize: 11, color: "var(--color-text-secondary)" }}>
                  Generado el {new Date().toLocaleDateString("es-CO")} — Sistema de Gestión de Obras
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 12px" }}>
                Copia el texto de abajo y pégalo directamente en Excel o Google Sheets. Cada columna quedará separada automáticamente.
              </p>
              <textarea readOnly value={exportModal.texto}
                style={{ width: "100%", height: 260, fontFamily: "var(--font-mono)", fontSize: 12, padding: 12, borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", boxSizing: "border-box", resize: "vertical" }}
                onFocus={e => e.target.select()} />
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "8px 0 0" }}>
                Haz clic en el recuadro y presiona Ctrl+A para seleccionar todo, luego Ctrl+C para copiar.
              </p>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Btn onClick={() => setExportModal(null)}>Cerrar</Btn>
          </div>
        </Modal>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Liquidación</h2>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: "var(--color-text-secondary)", display: "block", marginBottom: 6 }}>Corte de pago</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {cortes.map((c, i) => (
            <button key={i} onClick={() => setCorteIdx(i)}
              style={{ background: corteIdx === i ? "#EEEDFE" : "var(--color-background-secondary)", color: corteIdx === i ? "#534AB7" : "var(--color-text-secondary)", border: `0.5px solid ${corteIdx === i ? "#AFA9EC" : "var(--color-border-tertiary)"}`, borderRadius: 20, padding: "5px 14px", cursor: "pointer", fontSize: 13, fontWeight: corteIdx === i ? 500 : 400 }}>
              {c.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "8px 0 0" }}>
          Corte: {corte.desde.toLocaleDateString("es-CO")} al {corte.hasta.toLocaleDateString("es-CO")} (reporte máximo 2 días antes del pago)
        </p>
      </div>

      {instaladores.map(inst => {
        const rows = detalleInstalador(inst.id);
        const total = calcLiquidacion(inst.id, corte.desde, corte.hasta);
        return (
          <div key={inst.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 15 }}>{inst.nombre}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 2 }}>C.C. {inst.cedula} · {inst.telefono}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{inst.banco ? `${inst.banco} — Cta: ${inst.cuenta}` : "Sin datos bancarios"}</div>
                <div style={{ marginTop: 6 }}><Badge color="green">Instalador</Badge></div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Total corte</div>
                <div style={{ fontSize: 22, fontWeight: 500, color: "#3B6D11" }}>{fmt(total)}</div>
                {rows.length > 0 && [ROLES.SUPERADMIN, ROLES.SUPERVISOR, ROLES.AUXILIAR].includes(user.rol) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                    <Btn variant="success" onClick={() => exportarExcel(inst, rows, total)}>Excel</Btn>
                    <Btn variant="primary" onClick={() => exportarPDF(inst, rows, total)}>PDF</Btn>
                  </div>
                )}
              </div>
            </div>
            {rows.length > 0 ? (
              <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12 }}>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>Detalle del corte</div>
                {rows.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, padding: "6px 0", borderBottom: "0.5px solid var(--color-border-tertiary)", flexWrap: "wrap" }}>
                    <span style={{ color: "var(--color-text-secondary)", minWidth: 80 }}>{r.obra.substring(0, 14)}</span>
                    <span>Apto {r.apto}</span>
                    <span style={{ flex: 1 }}>{r.elemento}</span>
                    <span style={{ color: "var(--color-text-secondary)" }}>{r.cantidad > 1 ? `×${r.cantidad}` : ""}</span>
                    <span style={{ fontWeight: 500, minWidth: 90, textAlign: "right" }}>{fmt(r.precio * r.cantidad)}</span>
                    <span style={{ color: "var(--color-text-secondary)", minWidth: 80, textAlign: "right" }}>{r.fecha}</span>
                  </div>
                ))}
              </div>
            ) : <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Sin instalaciones en este corte.</p>}
          </div>
        );
      })}
    </div>
  );
}

function UsuariosView({ usuarios, setUsuarios, openModal, closeModal, modals }) {
  const empty = { nombre: "", email: "", rol: ROLES.INSTALADOR, pin: "", cedula: "", telefono: "", banco: "", cuenta: "" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const rolColor = { superadmin: "purple", supervisor: "blue", auxiliar: "amber", instalador: "green" };
  const rolLabel = { superadmin: "Superadmin", supervisor: "Supervisor", auxiliar: "Auxiliar", instalador: "Instalador" };

  function guardar() {
    if (!form.nombre || !form.email || (!editId && !form.pin)) return;
    if (editId) setUsuarios(us => us.map(u => u.id === editId ? { ...u, ...form } : u));
    else setUsuarios(us => [...us, { id: `u${Date.now()}`, ...form }]);
    setForm(empty); setEditId(null); closeModal("userModal");
  }

  function editar(u) {
    setEditId(u.id);
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol, pin: u.pin, cedula: u.cedula || "", telefono: u.telefono || "", banco: u.banco || "", cuenta: u.cuenta || "" });
    openModal("userModal");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>Usuarios</h2>
        <Btn variant="primary" onClick={() => { setEditId(null); setForm(empty); openModal("userModal"); }}>+ Nuevo usuario</Btn>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {usuarios.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ width: 38, height: 38, borderRadius: 50, background: "#EEEDFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 500, color: "#534AB7", flexShrink: 0 }}>
              {u.nombre.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{u.nombre}</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{u.email} {u.cedula ? `· C.C. ${u.cedula}` : ""}</div>
              {u.rol === ROLES.INSTALADOR && u.banco && <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{u.banco} — {u.cuenta}</div>}
            </div>
            <Badge color={rolColor[u.rol]}>{rolLabel[u.rol]}</Badge>
            <Btn onClick={() => editar(u)}>Editar</Btn>
          </div>
        ))}
      </div>

      {modals.userModal && (
        <Modal title={editId ? "Editar usuario" : "Nuevo usuario"} onClose={() => closeModal("userModal")} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Input label="Nombre completo" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            <Input label="Correo" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Cédula" value={form.cedula} onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))} />
            <Input label="Teléfono" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Select label="Rol" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
              <option value={ROLES.INSTALADOR}>Instalador</option>
              <option value={ROLES.SUPERVISOR}>Supervisor</option>
              <option value={ROLES.ADMIN}>Administrador</option>
            </Select>
            <Input label={editId ? "Nuevo PIN (dejar vacío para no cambiar)" : "PIN (4 dígitos)"} type="password" maxLength={4} value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} placeholder="••••" />
          </div>
          {form.rol === ROLES.INSTALADOR && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, margin: "4px 0 10px", color: "var(--color-text-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 12 }}>Datos bancarios</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                <Input label="Banco" value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))} placeholder="Ej: Bancolombia" />
                <Input label="Número de cuenta" value={form.cuenta} onChange={e => setForm(f => ({ ...f, cuenta: e.target.value }))} />
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <Btn onClick={() => closeModal("userModal")}>Cancelar</Btn>
            <Btn variant="primary" onClick={guardar}>{editId ? "Guardar cambios" : "Crear usuario"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}