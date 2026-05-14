import { useState, useEffect } from "react";

const SUPA_URL = "https://kboumpkcrdeuteiiodjp.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib3VtcGtjcmRldXRlaWlvZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODA2MTQsImV4cCI6MjA5NDI1NjYxNH0.gTjqSnxI8F7ozcLSWB2rCDexP7ubgX1fwG2uOM3L0rI";
const H = { "Content-Type": "application/json", "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Prefer": "return=representation" };

async function dbGet(table) { const r = await fetch(`${SUPA_URL}/rest/v1/${table}?select=*`, { headers: H }); return r.json(); }
async function dbUpsert(table, data) { await fetch(`${SUPA_URL}/rest/v1/${table}`, { method: "POST", headers: { ...H, "Prefer": "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(data) }); }
async function dbDelete(table, id) { await fetch(`${SUPA_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: H }); }

const ROLES = { SUPERADMIN: "superadmin", SUPERVISOR: "supervisor", AUXILIAR: "auxiliar", INSTALADOR: "instalador" };

const ELEMENTOS_DEFAULT = [
  { id: "e1",  nombre: "Puerta principal",        unidad: "und", precio: 55000 },
  { id: "e2",  nombre: "Puerta habitación",        unidad: "und", precio: 55000 },
  { id: "e3",  nombre: "Chapa puerta principal",   unidad: "und", precio: 10000 },
  { id: "e4",  nombre: "Moldura puerta principal", unidad: "und", precio: 10000 },
  { id: "e19", nombre: "Chapa WC principal",       unidad: "und", precio: 10000 },
  { id: "e20", nombre: "Moldura WC principal",     unidad: "und", precio: 10000 },
  { id: "e21", nombre: "Chapa WC social",          unidad: "und", precio: 10000 },
  { id: "e22", nombre: "Moldura WC social",        unidad: "und", precio: 10000 },
  { id: "e23", nombre: "Chapa alcoba 2",           unidad: "und", precio: 10000 },
  { id: "e24", nombre: "Moldura alcoba 2",         unidad: "und", precio: 10000 },
  { id: "e25", nombre: "Chapa alcoba 3",           unidad: "und", precio: 10000 },
  { id: "e26", nombre: "Moldura alcoba 3",         unidad: "und", precio: 10000 },
  { id: "e5",  nombre: "Closet alcoba principal",  unidad: "und", precio: 150000 },
  { id: "e6",  nombre: "Closet alcoba 2",          unidad: "und", precio: 120000 },
  { id: "e7",  nombre: "Closet alcoba 3",          unidad: "und", precio: 120000 },
  { id: "e8",  nombre: "Mueble WC principal",      unidad: "und", precio: 25000 },
  { id: "e9",  nombre: "Mueble WC social",         unidad: "und", precio: 25000 },
  { id: "e10", nombre: "Vestier enfrentado",       unidad: "und", precio: 110000 },
  { id: "e11", nombre: "Vestier en L",             unidad: "und", precio: 110000 },
  { id: "e12", nombre: "Vestier en U",             unidad: "und", precio: 150000 },
  { id: "e13", nombre: "Mueble alto cocina",       unidad: "und", precio: 0 },
  { id: "e14", nombre: "Mueble bajo cocina",       unidad: "und", precio: 0 },
  { id: "e15", nombre: "Mueble isla",              unidad: "und", precio: 0 },
  { id: "e16", nombre: "Mueble lavadero",          unidad: "und", precio: 30000 },
  { id: "e17", nombre: "Zócalo",                   unidad: "ml",  precio: 2500 },
];

const USUARIOS_DEFAULT = [
  { id: "sa1", nombre: "César Betancur",                   rol: ROLES.SUPERADMIN, email: "cesar@obra.com",        pin: "1111", cedula: "3113410458", telefono: "", banco: "", cuenta: "" },
  { id: "sa2", nombre: "Sandra Marin",                     rol: ROLES.SUPERADMIN, email: "sandra@obra.com",       pin: "2222", cedula: "3006903514", telefono: "", banco: "", cuenta: "" },
  { id: "sa3", nombre: "Andres Londoño",                   rol: ROLES.SUPERADMIN, email: "andres@obra.com",       pin: "3333", cedula: "3189180703", telefono: "", banco: "", cuenta: "" },
  { id: "sa4", nombre: "Luz Toro",                         rol: ROLES.SUPERADMIN, email: "luz@obra.com",          pin: "4444", cedula: "3046063039", telefono: "", banco: "", cuenta: "" },
  { id: "ax1", nombre: "Lauren Zapata",                    rol: ROLES.AUXILIAR,   email: "lauren@obra.com",       pin: "5555", cedula: "3180803364", telefono: "", banco: "", cuenta: "" },
  { id: "i01", nombre: "Albeiro De Jesús Sanchez Alvarez", rol: ROLES.INSTALADOR, email: "3366950@obra.com",      pin: "6950", cedula: "3366950",    telefono: "", banco: "", cuenta: "" },
  { id: "i02", nombre: "Arnovis Enrique Romero Gaviria",   rol: ROLES.INSTALADOR, email: "10889524@obra.com",     pin: "9524", cedula: "10889524",   telefono: "", banco: "", cuenta: "" },
  { id: "i03", nombre: "Alejandro Caballero Navas",        rol: ROLES.INSTALADOR, email: "1041894977@obra.com",   pin: "4977", cedula: "1041894977", telefono: "", banco: "", cuenta: "" },
  { id: "i04", nombre: "Andrés Polo Gomez",                rol: ROLES.INSTALADOR, email: "72238095@obra.com",     pin: "8095", cedula: "72238095",   telefono: "", banco: "", cuenta: "" },
  { id: "i05", nombre: "Angie Guisela Gonzales Toro",      rol: ROLES.INSTALADOR, email: "32209550@obra.com",     pin: "9550", cedula: "32209550",   telefono: "", banco: "", cuenta: "" },
  { id: "i06", nombre: "Carlos Albeiro Bedoya",            rol: ROLES.INSTALADOR, email: "98537380@obra.com",     pin: "7380", cedula: "98537380",   telefono: "", banco: "", cuenta: "" },
  { id: "i07", nombre: "Claudia Marcela Uribe Lopez",      rol: ROLES.INSTALADOR, email: "1112765279@obra.com",   pin: "5279", cedula: "1112765279", telefono: "", banco: "", cuenta: "" },
  { id: "i08", nombre: "Claudia Patricia Higuita Muñoz",   rol: ROLES.INSTALADOR, email: "43164453@obra.com",     pin: "4453", cedula: "43164453",   telefono: "", banco: "", cuenta: "" },
  { id: "i09", nombre: "Cristian Alexis Marin Gonzales",   rol: ROLES.INSTALADOR, email: "1015278020@obra.com",   pin: "8020", cedula: "1015278020", telefono: "", banco: "", cuenta: "" },
  { id: "i10", nombre: "Elfa Nataly Rueda Vargas",         rol: ROLES.INSTALADOR, email: "43991850@obra.com",     pin: "1850", cedula: "43991850",   telefono: "", banco: "", cuenta: "" },
  { id: "i11", nombre: "Erika Baza Camacho",               rol: ROLES.INSTALADOR, email: "1096195897@obra.com",   pin: "5897", cedula: "1096195897", telefono: "", banco: "", cuenta: "" },
  { id: "i12", nombre: "Emiliano De Jesus Callejas Rios",  rol: ROLES.INSTALADOR, email: "70541496@obra.com",     pin: "1496", cedula: "70541496",   telefono: "", banco: "", cuenta: "" },
  { id: "i13", nombre: "Greis Pola Jaraba Correa",         rol: ROLES.INSTALADOR, email: "1045691681@obra.com",   pin: "1681", cedula: "1045691681", telefono: "", banco: "", cuenta: "" },
  { id: "i14", nombre: "Harrison Martinez Lopez",          rol: ROLES.INSTALADOR, email: "1053796113@obra.com",   pin: "6113", cedula: "1053796113", telefono: "", banco: "", cuenta: "" },
  { id: "i15", nombre: "Jose Alfredo Taborda Marin",       rol: ROLES.INSTALADOR, email: "1033337255@obra.com",   pin: "7255", cedula: "1033337255", telefono: "", banco: "", cuenta: "" },
  { id: "i16", nombre: "José Gabriel Mesa Martínez",       rol: ROLES.INSTALADOR, email: "98642537@obra.com",     pin: "2537", cedula: "98642537",   telefono: "", banco: "", cuenta: "" },
  { id: "i17", nombre: "Jose Luis Basanta Coa",            rol: ROLES.INSTALADOR, email: "1258625@obra.com",      pin: "8625", cedula: "1258625",    telefono: "", banco: "", cuenta: "" },
  { id: "i18", nombre: "Jorge Leonardo Viloria Romero",    rol: ROLES.INSTALADOR, email: "1104413901@obra.com",   pin: "3901", cedula: "1104413901", telefono: "", banco: "", cuenta: "" },
  { id: "i19", nombre: "Juan Carlos Cardenas Vega",        rol: ROLES.INSTALADOR, email: "1098813472@obra.com",   pin: "3472", cedula: "1098813472", telefono: "", banco: "", cuenta: "" },
  { id: "i20", nombre: "Juan Martin Osorio Saldarriaga",   rol: ROLES.INSTALADOR, email: "71646955@obra.com",     pin: "6955", cedula: "71646955",   telefono: "", banco: "", cuenta: "" },
  { id: "i21", nombre: "Kateryn Carmona",                  rol: ROLES.INSTALADOR, email: "1214743439@obra.com",   pin: "3439", cedula: "1214743439", telefono: "", banco: "", cuenta: "" },
  { id: "i22", nombre: "Leder De Jesus Herrera Arrieta",   rol: ROLES.INSTALADOR, email: "1104410561@obra.com",   pin: "0561", cedula: "1104410561", telefono: "", banco: "", cuenta: "" },
  { id: "i23", nombre: "Leider Arturo Herrera Arrieta",    rol: ROLES.INSTALADOR, email: "1005677345@obra.com",   pin: "7345", cedula: "1005677345", telefono: "", banco: "", cuenta: "" },
  { id: "i24", nombre: "Leon Jaime Taborda Marin",         rol: ROLES.INSTALADOR, email: "1033339839@obra.com",   pin: "9839", cedula: "1033339839", telefono: "", banco: "", cuenta: "" },
  { id: "i25", nombre: "Luis Alberto Goez Goez",           rol: ROLES.INSTALADOR, email: "1152453118@obra.com",   pin: "3118", cedula: "1152453118", telefono: "", banco: "", cuenta: "" },
  { id: "i26", nombre: "Luis Felipe Meza Martinez",        rol: ROLES.INSTALADOR, email: "1148205348@obra.com",   pin: "5348", cedula: "1148205348", telefono: "", banco: "", cuenta: "" },
  { id: "i27", nombre: "Luis Fernando Aguirre Giraldo",    rol: ROLES.INSTALADOR, email: "71698074@obra.com",     pin: "8074", cedula: "71698074",   telefono: "", banco: "", cuenta: "" },
  { id: "i28", nombre: "Maria Luz Dary Rincon",            rol: ROLES.INSTALADOR, email: "66916338@obra.com",     pin: "6338", cedula: "66916338",   telefono: "", banco: "", cuenta: "" },
  { id: "i29", nombre: "Mario Lemus Arboleda",             rol: ROLES.INSTALADOR, email: "1001846248@obra.com",   pin: "6248", cedula: "1001846248", telefono: "", banco: "", cuenta: "" },
  { id: "i30", nombre: "Nelson Dario Correa Acosta",       rol: ROLES.INSTALADOR, email: "98527601@obra.com",     pin: "7601", cedula: "98527601",   telefono: "", banco: "", cuenta: "" },
  { id: "i31", nombre: "Omar De Jesus Ortiz Montoya",      rol: ROLES.INSTALADOR, email: "98528420@obra.com",     pin: "8420", cedula: "98528420",   telefono: "", banco: "", cuenta: "" },
  { id: "i32", nombre: "Oscar Mauricio Lopez",             rol: ROLES.INSTALADOR, email: "98538605@obra.com",     pin: "8605", cedula: "98538605",   telefono: "", banco: "", cuenta: "" },
  { id: "i33", nombre: "Oved Dario Pulgarin",              rol: ROLES.INSTALADOR, email: "98693472@obra.com",     pin: "3472", cedula: "98693472",   telefono: "", banco: "", cuenta: "" },
  { id: "i34", nombre: "Steve Brahayan Alvarez Reyes",     rol: ROLES.INSTALADOR, email: "PT1277581@obra.com",    pin: "7581", cedula: "PT-1277581", telefono: "", banco: "", cuenta: "" },
  { id: "i35", nombre: "Pedro Felix Moreno Cortes",        rol: ROLES.INSTALADOR, email: "98457089@obra.com",     pin: "7089", cedula: "98457089",   telefono: "", banco: "", cuenta: "" },
  { id: "i36", nombre: "Robinson Alberto Orozco Muñoz",    rol: ROLES.INSTALADOR, email: "71386134@obra.com",     pin: "6134", cedula: "71386134",   telefono: "", banco: "", cuenta: "" },
  { id: "i37", nombre: "Yefferson Sanchez Henao",          rol: ROLES.INSTALADOR, email: "1214720944@obra.com",   pin: "0944", cedula: "1214720944", telefono: "", banco: "", cuenta: "" },
];

const fmt = n => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);

function getCorteFechas() {
  const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth();
  const cortes = [];
  [-2, -1, 0, 1].forEach(delta => {
    const mm = m + delta, yr = mm < 0 ? y - 1 : mm > 11 ? y + 1 : y, mr = ((mm % 12) + 12) % 12;
    const dias = new Date(yr, mr + 1, 0).getDate();
    cortes.push({ label: `1–13 ${new Date(yr,mr,13).toLocaleString("es-CO",{month:"long",year:"numeric"})}`, desde: new Date(yr,mr,1), hasta: new Date(yr,mr,13) });
    cortes.push({ label: `14–${Math.min(28,dias)} ${new Date(yr,mr,Math.min(28,dias)).toLocaleString("es-CO",{month:"long",year:"numeric"})}`, desde: new Date(yr,mr,14), hasta: new Date(yr,mr,Math.min(28,dias)) });
  });
  return cortes.sort((a,b) => b.desde - a.desde).slice(0, 10);
}

function fechaDentroCorte(fechaStr, desde, hasta) {
  if (!fechaStr) return false;
  const [d,m,y] = fechaStr.split("/").map(Number);
  return new Date(y, m-1, d) >= desde && new Date(y, m-1, d) <= hasta;
}

function Badge({ color, children }) {
  const cols = { green:{bg:"#EAF3DE",text:"#3B6D11",b:"#97C459"}, amber:{bg:"#FAEEDA",text:"#854F0B",b:"#EF9F27"}, blue:{bg:"#E6F1FB",text:"#185FA5",b:"#85B7EB"}, gray:{bg:"#F1EFE8",text:"#5F5E5A",b:"#B4B2A9"}, coral:{bg:"#FAECE7",text:"#993C1D",b:"#F0997B"}, purple:{bg:"#EEEDFE",text:"#534AB7",b:"#AFA9EC"} };
  const c = cols[color] || cols.gray;
  return <span style={{background:c.bg,color:c.text,border:`1px solid ${c.b}`,borderRadius:6,padding:"2px 10px",fontSize:12,fontWeight:500}}>{children}</span>;
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => { document.body.style.overflow="hidden"; return ()=>{document.body.style.overflow="";}; }, []);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#fff",borderRadius:16,border:"1px solid #ddd",maxWidth:wide?720:560,width:"94%",maxHeight:"88vh",overflowY:"auto",padding:"1.5rem",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:500,color:"#111"}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:24,color:"#555"}}>×</button>
        </div>
        <div style={{color:"#111"}}>{children}</div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return <div style={{marginBottom:14}}>{label&&<label style={{fontSize:13,color:"#555",display:"block",marginBottom:4}}>{label}</label>}<input style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:14}} {...props}/></div>;
}
function Select({ label, children, ...props }) {
  return <div style={{marginBottom:14}}>{label&&<label style={{fontSize:13,color:"#555",display:"block",marginBottom:4}}>{label}</label>}<select style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:14}} {...props}>{children}</select></div>;
}
function Btn({ children, onClick, variant="default", disabled, style={} }) {
  const s = {default:{bg:"#f5f5f5",b:"#ddd",c:"#333"},primary:{bg:"#534AB7",b:"#534AB7",c:"#fff"},danger:{bg:"#FCEBEB",b:"#F09595",c:"#A32D2D"},success:{bg:"#EAF3DE",b:"#97C459",c:"#3B6D11"},amber:{bg:"#FAEEDA",b:"#EF9F27",c:"#854F0B"}};
  const v = s[variant]||s.default;
  return <button onClick={onClick} disabled={disabled} style={{background:v.bg,border:`1px solid ${v.b}`,color:v.c,borderRadius:8,padding:"8px 16px",cursor:disabled?"not-allowed":"pointer",fontSize:14,fontWeight:500,opacity:disabled?0.5:1,...style}}>{children}</button>;
}
function Notif({ notifs, setNotifs }) {
  if (!notifs.length) return null;
  return <div style={{position:"fixed",top:16,right:16,zIndex:99999,display:"flex",flexDirection:"column",gap:8,maxWidth:320}}>
    {notifs.map(n=><div key={n.id} style={{background:n.tipo==="success"?"#EAF3DE":"#E6F1FB",border:`1px solid ${n.tipo==="success"?"#97C459":"#85B7EB"}`,borderRadius:10,padding:"12px 16px",display:"flex",gap:10}}>
      <span>{n.tipo==="success"?"✓":"🔔"}</span>
      <div style={{flex:1,fontSize:13,color:n.tipo==="success"?"#3B6D11":"#185FA5"}}>{n.msg}</div>
      <button onClick={()=>setNotifs(ns=>ns.filter(x=>x.id!==n.id))} style={{background:"none",border:"none",cursor:"pointer",fontSize:16}}>×</button>
    </div>)}
  </div>;
}

export default function App() {
  const [user, setUser] = useState(() => { try { const s=localStorage.getItem("gob_session"); return s?JSON.parse(s):null; } catch { return null; } });
  const [obras, setObras] = useState([]);
  const [elementos, setElementos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("obras");
  const [selectedObra, setSelectedObra] = useState(null);
  const [selectedPiso, setSelectedPiso] = useState(null);
  const [selectedApto, setSelectedApto] = useState(null);
  const [modals, setModals] = useState({});
  const [loginData, setLoginData] = useState({ email:"", pin:"" });
  const [loginError, setLoginError] = useState("");
  const [notifs, setNotifs] = useState([]);

  const openModal = k => setModals(m=>({...m,[k]:true}));
  const closeModal = k => setModals(m=>({...m,[k]:false}));
  const pushNotif = (msg, tipo="info") => { const id=Date.now(); setNotifs(ns=>[...ns,{id,msg,tipo}]); setTimeout(()=>setNotifs(ns=>ns.filter(x=>x.id!==id)),5000); };

  async function loadAll() {
    setLoading(true);
    try {
      const [u,e,o,l] = await Promise.all([dbGet("usuarios"),dbGet("elementos"),dbGet("obras"),dbGet("liquidaciones")]);
      if (!u.length) { await Promise.all(USUARIOS_DEFAULT.map(x=>dbUpsert("usuarios",x))); setUsuarios(USUARIOS_DEFAULT); } else setUsuarios(u);
      if (!e.length) { await Promise.all(ELEMENTOS_DEFAULT.map(x=>dbUpsert("elementos",x))); setElementos(ELEMENTOS_DEFAULT); } else setElementos(e);
      setObras(o.map(ob=>({...ob,tipologias:ob.tipologias||[],pisos:ob.pisos||[],instaladoresAutorizados:ob.instaladores_autorizados||[],solicitudes:ob.solicitudes||[],preciosOverride:ob.precios_override||{},coordinadorId:ob.coordinador_id||""})));
      setLiquidaciones(l);
    } catch { pushNotif("Error conectando","error"); }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function saveObra(obra) {
    await dbUpsert("obras", { id:obra.id, nombre:obra.nombre, direccion:obra.direccion, estado:obra.estado, tipologias:obra.tipologias||[], pisos:obra.pisos||[], instaladores_autorizados:obra.instaladoresAutorizados||[], solicitudes:obra.solicitudes||[], precios_override:obra.preciosOverride||{}, coordinador_id:obra.coordinadorId||"" });
  }

  async function updateObra(obraId, updater) {
    setObras(obs => { const updated=obs.map(o=>o.id===obraId?updater(o):o); const obra=updated.find(o=>o.id===obraId); if(obra)saveObra(obra); return updated; });
  }

  function login() {
    const u = usuarios.find(x=>x.email===loginData.email&&x.pin===loginData.pin);
    if (u) { setUser(u); localStorage.setItem("gob_session",JSON.stringify(u)); setLoginError(""); }
    else setLoginError("Correo o PIN incorrecto");
  }

  function logout() { setUser(null); localStorage.removeItem("gob_session"); }

  // Precio efectivo: override por obra/corte > precio estándar
  function getPrecio(elementoId, obraId, corteLabel) {
    const obra = obras.find(o=>o.id===obraId);
    const key = `${corteLabel}__${elementoId}`;
    if (obra?.preciosOverride?.[key] !== undefined) return obra.preciosOverride[key];
    return elementos.find(e=>e.id===elementoId)?.precio || 0;
  }

  function calcLiquidacion(instaladorId, desde, hasta, obraId=null, corteLabel=null) {
    let total = 0;
    obras.forEach(obra => {
      if (obraId && obra.id !== obraId) return;
      obra.pisos?.forEach(piso => piso.aptos?.forEach(apto => apto.elementos?.forEach(el => {
        if (el.completado && el.instaladorId===instaladorId) {
          if (desde && hasta && !fechaDentroCorte(el.fecha,desde,hasta)) return;
          total += getPrecio(el.elementoId, obra.id, corteLabel) * (el.cantidad||1);
        }
      })));
    });
    return total;
  }

  function calcAvanceObra(obra) {
    let t=0,c=0; obra.pisos?.forEach(p=>p.aptos?.forEach(a=>a.elementos?.forEach(el=>{t++;if(el.completado)c++;})));
    return t===0?0:Math.round(c/t*100);
  }
  function calcAvanceApto(apto) {
    const t=apto.elementos?.length||0, c=apto.elementos?.filter(e=>e.completado).length||0;
    return t===0?0:Math.round(c/t*100);
  }

  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"system-ui"}}><div style={{fontSize:36}}>🏗️</div><p style={{color:"#777"}}>Cargando...</p></div>;
  if (!user) return <LoginScreen loginData={loginData} setLoginData={setLoginData} login={login} error={loginError}/>;

  const shared = { obras, setObras, updateObra, saveObra, elementos, setElementos, usuarios, setUsuarios, openModal, closeModal, modals, pushNotif, user, liquidaciones, setLiquidaciones, loadAll, getPrecio, calcLiquidacion };

  return (
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:920,margin:"0 auto",padding:"1rem"}}>
      <Notif notifs={notifs} setNotifs={setNotifs}/>
      <Header user={user} logout={logout} view={view} setView={setView} selectedObra={selectedObra} setSelectedObra={setSelectedObra} setSelectedPiso={setSelectedPiso} setSelectedApto={setSelectedApto} usuarios={usuarios}/>
      {view==="obras" && <ObrasView {...shared} calcAvanceObra={calcAvanceObra} setSelectedObra={o=>{setSelectedObra(o);setView("obra_detalle");}}/>}
      {view==="obra_detalle" && selectedObra && <ObraDetalle {...shared} obra={obras.find(o=>o.id===selectedObra.id)||selectedObra} calcAvanceApto={calcAvanceApto} setSelectedApto={(a,p)=>{setSelectedApto(a);setSelectedPiso(p);setView("apto_detalle");}} getPrecio={getPrecio}/>}
      {view==="apto_detalle" && selectedApto && selectedObra && <AptoDetalle {...shared} apto={selectedApto} piso={selectedPiso} obra={obras.find(o=>o.id===selectedObra.id)} calcAvanceApto={calcAvanceApto}/>}
      {view==="elementos" && user.rol===ROLES.SUPERADMIN && <ElementosView {...shared}/>}
      {view==="liquidacion" && <LiquidacionView {...shared} calcLiquidacion={calcLiquidacion} calcAvanceObra={calcAvanceObra}/>}
      {view==="usuarios" && user.rol===ROLES.SUPERADMIN && <UsuariosView {...shared}/>}
    </div>
  );
}

function LoginScreen({ loginData, setLoginData, login, error }) {
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f5f5f5",fontFamily:"system-ui"}}>
      <div style={{background:"#fff",border:"1px solid #ddd",borderRadius:16,padding:"2rem",width:340,boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:52,height:52,background:"#EEEDFE",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",fontSize:26}}>🏗️</div>
          <h2 style={{margin:0,fontSize:20,fontWeight:500}}>Gestión de Obras</h2>
          <p style={{margin:"6px 0 0",fontSize:13,color:"#777"}}>Ingresa con tu correo y PIN</p>
        </div>
        <Input label="Correo" type="email" placeholder="cedula@obra.com" value={loginData.email} onChange={e=>setLoginData(d=>({...d,email:e.target.value}))}/>
        <Input label="PIN" type="password" placeholder="••••" value={loginData.pin} onChange={e=>setLoginData(d=>({...d,pin:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&login()}/>
        {error && <p style={{color:"#A32D2D",fontSize:13,margin:"-8px 0 12px"}}>{error}</p>}
        <Btn variant="primary" onClick={login} style={{width:"100%",padding:"10px"}}>Ingresar</Btn>
      </div>
    </div>
  );
}

function Header({ user, logout, view, setView, selectedObra, setSelectedObra, setSelectedPiso, setSelectedApto, usuarios }) {
  const rolColor={superadmin:"purple",supervisor:"blue",auxiliar:"amber",instalador:"green"};
  const rolLabel={superadmin:"Superadmin",supervisor:"Supervisor",auxiliar:"Auxiliar",instalador:"Instalador"};
  const nav=[{key:"obras",label:"Obras",roles:[ROLES.SUPERADMIN,ROLES.SUPERVISOR,ROLES.AUXILIAR,ROLES.INSTALADOR]},{key:"elementos",label:"Elementos",roles:[ROLES.SUPERADMIN]},{key:"liquidacion",label:"Liquidación",roles:[ROLES.SUPERADMIN,ROLES.SUPERVISOR,ROLES.AUXILIAR,ROLES.INSTALADOR]},{key:"usuarios",label:"Usuarios",roles:[ROLES.SUPERADMIN]}];
  return (
    <div style={{marginBottom:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🏗️</span>
          <div><div style={{fontWeight:500,fontSize:15}}>{user.nombre}</div><Badge color={rolColor[user.rol]}>{rolLabel[user.rol]}</Badge></div>
        </div>
        <Btn onClick={logout}>Salir</Btn>
      </div>
      {(view==="obra_detalle"||view==="apto_detalle")&&(
        <div style={{fontSize:13,color:"#777",marginBottom:8,display:"flex",gap:6,alignItems:"center"}}>
          <span style={{cursor:"pointer",color:"#534AB7"}} onClick={()=>{setView("obras");setSelectedObra(null);setSelectedPiso(null);setSelectedApto(null);}}>Obras</span>
          {selectedObra&&<><span>›</span><span style={{cursor:"pointer",color:view==="apto_detalle"?"#534AB7":"#111"}} onClick={()=>{setView("obra_detalle");setSelectedPiso(null);setSelectedApto(null);}}>{selectedObra.nombre}</span></>}
          {view==="apto_detalle"&&<><span>›</span><span>Apartamento</span></>}
        </div>
      )}
      <div style={{display:"flex",gap:8,borderBottom:"1px solid #eee",paddingBottom:12}}>
        {nav.filter(n=>n.roles.includes(user.rol)).map(n=>(
          <button key={n.key} onClick={()=>setView(n.key)} style={{background:view===n.key?"#EEEDFE":"transparent",color:view===n.key?"#534AB7":"#777",border:view===n.key?"1px solid #AFA9EC":"1px solid transparent",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:14,fontWeight:view===n.key?500:400}}>{n.label}</button>
        ))}
      </div>
    </div>
  );
}

function ObrasView({ obras, setObras, updateObra, saveObra, user, usuarios, calcAvanceObra, setSelectedObra, openModal, closeModal, modals, pushNotif }) {
  const [form, setForm] = useState({nombre:"",direccion:"",coordinadorId:"",pisos:1,aptosPorPiso:1});
  const [editObra, setEditObra] = useState(null);
  const [editObraForm, setEditObraForm] = useState({});
  const [accesoModal, setAccesoModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const superadmins = usuarios.filter(u=>u.rol===ROLES.SUPERADMIN);
  const instaladores = usuarios.filter(u=>u.rol===ROLES.INSTALADOR);

  async function crearObra() {
    if (!form.nombre) return;
    const pisos = Array.from({length:Number(form.pisos)},(_,pi)=>({id:`p${Date.now()}${pi}`,numero:pi+1,aptos:Array.from({length:Number(form.aptosPorPiso)},(_,ai)=>({id:`a${Date.now()}${pi}${ai}`,numero:ai+1,nombre:`${pi+1}${String(ai+1).padStart(2,"0")}`,tipologia:"",elementos:[]}))}));
    const nueva = {id:`obra${Date.now()}`,nombre:form.nombre,direccion:form.direccion,coordinadorId:form.coordinadorId,pisos,estado:"activa",tipologias:[],instaladoresAutorizados:[],solicitudes:[],preciosOverride:{}};
    await saveObra(nueva);
    setObras(obs=>[...obs,nueva]);
    setForm({nombre:"",direccion:"",coordinadorId:"",pisos:1,aptosPorPiso:1});
    closeModal("nuevaObra");
  }

  async function editarObra() {
    if (!editObraForm.nombre) return;
    await updateObra(editObra, o => ({ ...o, nombre: editObraForm.nombre, direccion: editObraForm.direccion, coordinadorId: editObraForm.coordinadorId }));
    pushNotif("Obra actualizada", "success");
    setEditObra(null);
  }
  async function eliminarObra(obraId) {
    await dbDelete("obras", obraId);
    setObras(obs=>obs.filter(o=>o.id!==obraId));
    setConfirmDelete(null);
    pushNotif("Obra eliminada","success");
  }

  async function solicitarAcceso(obraId) {
    await updateObra(obraId, o=>{
      if ((o.solicitudes||[]).find(s=>s.userId===user.id)) return o;
      return {...o,solicitudes:[...(o.solicitudes||[]),{userId:user.id,fecha:new Date().toLocaleDateString("es-CO"),estado:"pendiente"}]};
    });
    pushNotif("Solicitud enviada","success");
  }

  const obrasVisibles = obras.filter(o=>user.rol!==ROLES.INSTALADOR||(o.instaladoresAutorizados||[]).includes(user.id));
  const obrasSinAcceso = user.rol===ROLES.INSTALADOR?obras.filter(o=>!(o.instaladoresAutorizados||[]).includes(user.id)):[];

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:500}}>Obras</h2>
        {user.rol===ROLES.SUPERADMIN&&<Btn variant="primary" onClick={()=>openModal("nuevaObra")}>+ Nueva obra</Btn>}
      </div>
      {obrasVisibles.length===0&&user.rol!==ROLES.INSTALADOR&&(
        <div style={{textAlign:"center",padding:"3rem",color:"#777",background:"#f9f9f9",borderRadius:12}}>
          <div style={{fontSize:36,marginBottom:12}}>🏢</div><p>No hay obras registradas</p>
          {user.rol===ROLES.SUPERADMIN&&<Btn variant="primary" onClick={()=>openModal("nuevaObra")}>Crear primera obra</Btn>}
        </div>
      )}
      <div style={{display:"grid",gap:12,marginBottom:24}}>
        {obrasVisibles.map(obra=>{
          const av=calcAvanceObra(obra), totalAptos=obra.pisos?.reduce((a,p)=>a+(p.aptos?.length||0),0)||0;
          const coord=usuarios.find(u=>u.id===obra.coordinadorId);
          const pends=(obra.solicitudes||[]).filter(s=>s.estado==="pendiente").length;
          return (
            <div key={obra.id} style={{background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1rem 1.25rem",cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#AFA9EC"} onMouseLeave={e=>e.currentTarget.style.borderColor="#eee"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}} onClick={()=>setSelectedObra(obra)}>
                <div>
                  <div style={{fontWeight:500,fontSize:16,marginBottom:2}}>{obra.nombre}</div>
                  <div style={{fontSize:13,color:"#777"}}>{obra.direccion}</div>
                  {coord&&<div style={{fontSize:12,color:"#534AB7",marginTop:2}}>👤 {coord.nombre}</div>}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  {pends>0&&user.rol===ROLES.SUPERADMIN&&<span onClick={e=>{e.stopPropagation();setAccesoModal(obra.id);}} style={{background:"#FAEEDA",color:"#854F0B",border:"1px solid #EF9F27",borderRadius:20,padding:"3px 10px",fontSize:12,cursor:"pointer",fontWeight:500}}>{pends} solicitud{pends>1?"es":""}</span>}
                  <Badge color="green">{obra.estado}</Badge>
                  {user.rol===ROLES.SUPERADMIN&&<button onClick={e=>{e.stopPropagation();setEditObraForm({nombre:obra.nombre,direccion:obra.direccion,coordinadorId:obra.coordinadorId||""});setEditObra(obra.id);}} style={{background:"#E6F1FB",border:"1px solid #85B7EB",color:"#185FA5",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:500}}>✎ Editar</button>}
                  {user.rol===ROLES.SUPERADMIN&&<button onClick={e=>{e.stopPropagation();setConfirmDelete(obra.id);}} style={{background:"#FCEBEB",border:"1px solid #F09595",color:"#A32D2D",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:500}}>🗑 Eliminar</button>}
                </div>
              </div>
              <div style={{display:"flex",gap:20,marginTop:14,fontSize:13,alignItems:"center"}} onClick={()=>setSelectedObra(obra)}>
                <span style={{color:"#777"}}>{obra.pisos?.length||0} pisos · {totalAptos} aptos</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:"#777"}}>Avance</span><span style={{fontWeight:500}}>{av}%</span></div>
                  <div style={{height:6,background:"#f0f0f0",borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${av}%`,background:"#639922",borderRadius:4}}/></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {user.rol===ROLES.INSTALADOR&&obrasSinAcceso.length>0&&(
        <div>
          <div style={{fontSize:14,fontWeight:500,color:"#777",marginBottom:10,borderBottom:"1px solid #eee",paddingBottom:8}}>Obras disponibles — solicitar acceso</div>
          {obrasSinAcceso.map(obra=>{
            const sol=obra.solicitudes?.find(s=>s.userId===user.id);
            return <div key={obra.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f9f9f9",border:"1px solid #eee",borderRadius:10,padding:"12px 16px",marginBottom:8}}>
              <div><div style={{fontWeight:500,fontSize:14}}>{obra.nombre}</div><div style={{fontSize:13,color:"#777"}}>{obra.direccion}</div></div>
              {!sol&&<Btn onClick={()=>solicitarAcceso(obra.id)}>Solicitar acceso</Btn>}
              {sol?.estado==="pendiente"&&<Badge color="amber">Solicitud pendiente</Badge>}
              {sol?.estado==="rechazado"&&<Badge color="coral">Acceso denegado</Badge>}
            </div>;
          })}
        </div>
      )}

      {editObra&&<Modal title="Editar obra" onClose={()=>setEditObra(null)}>
        <Input label="Nombre de la obra" value={editObraForm.nombre} onChange={e=>setEditObraForm(f=>({...f,nombre:e.target.value}))}/>
        <Input label="Dirección" value={editObraForm.direccion} onChange={e=>setEditObraForm(f=>({...f,direccion:e.target.value}))}/>
        <Select label="Coordinador responsable" value={editObraForm.coordinadorId} onChange={e=>setEditObraForm(f=>({...f,coordinadorId:e.target.value}))}>
          <option value="">— Sin asignar —</option>
          {superadmins.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Select>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
          <Btn onClick={()=>setEditObra(null)}>Cancelar</Btn>
          <Btn variant="primary" onClick={editarObra}>Guardar cambios</Btn>
        </div>
      </Modal>}

      {confirmDelete&&<Modal title="Confirmar eliminación" onClose={()=>setConfirmDelete(null)}>
        <p style={{fontSize:14,color:"#333",marginBottom:20}}>¿Estás seguro de que deseas eliminar esta obra? Se perderán todos los datos de pisos, apartamentos y avances. Esta acción no se puede deshacer.</p>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn onClick={()=>setConfirmDelete(null)}>Cancelar</Btn>
          <Btn variant="danger" onClick={()=>eliminarObra(confirmDelete)}>Sí, eliminar obra</Btn>
        </div>
      </Modal>}

      {accesoModal&&<Modal title={`Accesos — ${obras.find(o=>o.id===accesoModal)?.nombre}`} onClose={()=>setAccesoModal(null)} wide>
        {(()=>{
          const obra=obras.find(o=>o.id===accesoModal)||{};
          const pends=(obra.solicitudes||[]).filter(s=>s.estado==="pendiente");
          return <div>
            {pends.length>0&&<div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:"#854F0B"}}>Solicitudes pendientes</div>
              {pends.map(s=>{const inst=usuarios.find(u=>u.id===s.userId);return <div key={s.userId} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#FAEEDA",border:"1px solid #EF9F27",borderRadius:10,marginBottom:8}}>
                <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{inst?.nombre}</div><div style={{fontSize:12,color:"#777"}}>Solicitó el {s.fecha}</div></div>
                <Btn variant="success" onClick={()=>{updateObra(accesoModal,o=>({...o,solicitudes:(o.solicitudes||[]).map(x=>x.userId===s.userId?{...x,estado:"aprobado"}:x),instaladoresAutorizados:[...new Set([...(o.instaladoresAutorizados||[]),s.userId])]}));pushNotif(`Acceso aprobado para ${inst?.nombre}`,"success");}}>Aprobar</Btn>
                <Btn variant="danger" onClick={()=>updateObra(accesoModal,o=>({...o,solicitudes:(o.solicitudes||[]).map(x=>x.userId===s.userId?{...x,estado:"rechazado"}:x)}))}>Rechazar</Btn>
              </div>;})}
            </div>}
            <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Todos los instaladores</div>
            <div style={{display:"grid",gap:8,maxHeight:360,overflowY:"auto"}}>
              {instaladores.map(inst=>{
                const aut=(obra.instaladoresAutorizados||[]).includes(inst.id);
                return <div key={inst.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:aut?"#EAF3DE":"#f9f9f9",border:`1px solid ${aut?"#97C459":"#eee"}`,borderRadius:10}}>
                  <div style={{width:36,height:36,borderRadius:50,background:aut?"#C0DD97":"#ddd",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:aut?"#27500A":"#555",flexShrink:0}}>{inst.nombre.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{inst.nombre}</div><div style={{fontSize:12,color:"#777"}}>C.C. {inst.cedula||"—"}</div></div>
                  <button onClick={()=>updateObra(accesoModal,o=>{const a=o.instaladoresAutorizados||[];return{...o,instaladoresAutorizados:a.includes(inst.id)?a.filter(id=>id!==inst.id):[...a,inst.id]};})} style={{background:aut?"#FCEBEB":"#EAF3DE",border:`1px solid ${aut?"#F09595":"#97C459"}`,color:aut?"#A32D2D":"#3B6D11",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:500}}>{aut?"Revocar":"Dar acceso"}</button>
                </div>;
              })}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><Btn onClick={()=>setAccesoModal(null)}>Cerrar</Btn></div>
          </div>;
        })()}
      </Modal>}

      {modals.nuevaObra&&<Modal title="Nueva obra" onClose={()=>closeModal("nuevaObra")}>
        <Input label="Nombre de la obra" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Conjunto El Prado"/>
        <Input label="Dirección" value={form.direccion} onChange={e=>setForm(f=>({...f,direccion:e.target.value}))}/>
        <Select label="Coordinador / Superadmin responsable" value={form.coordinadorId} onChange={e=>setForm(f=>({...f,coordinadorId:e.target.value}))}>
          <option value="">— Seleccionar —</option>
          {superadmins.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Select>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Número de pisos" type="number" min="1" max="50" value={form.pisos} onChange={e=>setForm(f=>({...f,pisos:e.target.value}))}/>
          <Input label="Aptos por piso (base)" type="number" min="1" max="20" value={form.aptosPorPiso} onChange={e=>setForm(f=>({...f,aptosPorPiso:e.target.value}))}/>
        </div>
        <p style={{fontSize:12,color:"#777",margin:"-8px 0 14px"}}>Podrás agregar, quitar y renombrar apartamentos después de crear la obra.</p>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn onClick={()=>closeModal("nuevaObra")}>Cancelar</Btn>
          <Btn variant="primary" onClick={crearObra}>Crear obra</Btn>
        </div>
      </Modal>}
    </div>
  );
}

function ObraDetalle({ obra, obras, updateObra, user, calcAvanceApto, elementos, usuarios, setSelectedApto, openModal, closeModal, modals, pushNotif, getPrecio }) {
  const [editTip, setEditTip] = useState(null);
  const [tipForm, setTipForm] = useState({nombre:"",elementoIds:[]});
  const [replicaSel, setReplicaSel] = useState({reglas:[]});
  const [replicaModal, setReplicaModal] = useState(false);
  const [asignando, setAsignando] = useState(null);
  const [accesoObraModal, setAccesoObraModal] = useState(false);
  const [vistaInstalador, setVistaInstalador] = useState(null); // instaladorId seleccionado
  const [editPisoModal, setEditPisoModal] = useState(null); // pisoId
  const [preciosModal, setPreciosModal] = useState(false);
  const [preciosCorte, setPreciosCorte] = useState("");
  const [preciosTmp, setPreciosTmp] = useState({});

  const currentObra = obras.find(o=>o.id===obra.id)||obra;
  const tipologias = currentObra.tipologias||[];
  const numerosApto = [...new Set(currentObra.pisos?.flatMap(p=>p.aptos?.map(a=>String(a.numero)))||[])].sort((a,b)=>Number(a)-Number(b));
  const cortes = getCorteFechas();

  // Instaladores activos en esta obra
  const instaladoresActivos = (currentObra.instaladoresAutorizados||[]).map(id=>usuarios.find(u=>u.id===id)).filter(Boolean);

  // Para instalador: solo sus aptos
  const misAptos = user.rol===ROLES.INSTALADOR ? currentObra.pisos?.flatMap(p=>p.aptos?.filter(a=>a.elementos?.some(el=>el.instaladorId===user.id))||[]) : [];

  function abrirNuevaTip(){setEditTip(null);setTipForm({nombre:"",elementoIds:[]});openModal("tipModal");}
  function abrirEditTip(t){setEditTip(t.id);setTipForm({nombre:t.nombre,elementoIds:[...t.elementoIds]});openModal("tipModal");}

  async function guardarTip() {
    if (!tipForm.nombre) return;
    if (editTip) {
      await updateObra(obra.id, o=>({...o,tipologias:(o.tipologias||[]).map(t=>t.id===editTip?{...t,nombre:tipForm.nombre,elementoIds:tipForm.elementoIds}:t),pisos:o.pisos.map(p=>({...p,aptos:p.aptos.map(a=>{if(a.tipologia!==editTip)return a;return{...a,elementos:tipForm.elementoIds.map(eid=>a.elementos?.find(e=>e.elementoId===eid)||{elementoId:eid,completado:false,instaladorId:null,fecha:null,cantidad:1})};})}))}));
    } else {
      const t={id:`t${Date.now()}`,nombre:tipForm.nombre,elementoIds:tipForm.elementoIds};
      await updateObra(obra.id, o=>({...o,tipologias:[...(o.tipologias||[]),t]}));
    }
    pushNotif("Tipología guardada","success"); closeModal("tipModal"); setEditTip(null);
  }

  async function asignarTipologia(pisoId, aptoId, tipId) {
    const tip=tipologias.find(t=>t.id===tipId);
    const nuevosEls=(tip?.elementoIds||[]).map(eid=>({elementoId:eid,completado:false,instaladorId:null,fecha:null,cantidad:1}));
    await updateObra(obra.id, o=>({...o,pisos:o.pisos.map(p=>p.id!==pisoId?p:{...p,aptos:p.aptos.map(a=>a.id!==aptoId?a:{...a,tipologia:tipId,elementos:nuevosEls})})}));
    setAsignando(null);
  }

  async function replicarEnSerie() {
    let count=0;
    await updateObra(obra.id, o=>({...o,pisos:o.pisos.map(p=>({...p,aptos:p.aptos.map(a=>{const regla=replicaSel.reglas.find(r=>r.sufijo===String(a.numero)&&r.tipId);if(!regla)return a;const tip=tipologias.find(t=>t.id===regla.tipId);if(!tip)return a;count++;return{...a,tipologia:tip.id,elementos:tip.elementoIds.map(eid=>a.elementos?.find(e=>e.elementoId===eid)||{elementoId:eid,completado:false,instaladorId:null,fecha:null,cantidad:1})};})}))}));
    pushNotif(`Tipologías replicadas en ${count} apto(s)`,"success");
    setReplicaModal(false); setReplicaSel({reglas:[]});
  }

  // Editar aptos de un piso
  async function agregarApto(pisoId) {
    await updateObra(obra.id, o=>({...o,pisos:o.pisos.map(p=>{if(p.id!==pisoId)return p;const num=p.aptos.length+1;return{...p,aptos:[...p.aptos,{id:`a${Date.now()}`,numero:num,nombre:`${p.numero}${String(num).padStart(2,"0")}`,tipologia:"",elementos:[]}]};})}));
  }
  async function eliminarApto(pisoId, aptoId) {
    await updateObra(obra.id, o=>({...o,pisos:o.pisos.map(p=>p.id!==pisoId?p:{...p,aptos:p.aptos.filter(a=>a.id!==aptoId)})}));
  }
  async function renombrarApto(pisoId, aptoId, nuevoNombre) {
    await updateObra(obra.id, o=>({...o,pisos:o.pisos.map(p=>p.id!==pisoId?p:{...p,aptos:p.aptos.map(a=>a.id!==aptoId?a:{...a,nombre:nuevoNombre})})}));
  }

  // Precios override
  function guardarPrecios() {
    if (!preciosCorte) return;
    updateObra(obra.id, o=>({...o,preciosOverride:{...(o.preciosOverride||{}),...Object.fromEntries(Object.entries(preciosTmp).map(([eid,v])=>[`${preciosCorte}__${eid}`,Number(v)]))}}));
    pushNotif("Precios guardados","success"); setPreciosModal(false); setPreciosTmp({});
  }

  // Vista instalador específico
  if (user.rol===ROLES.INSTALADOR) {
    return (
      <div>
        <div style={{marginBottom:18}}>
          <h2 style={{margin:0,fontSize:18,fontWeight:500}}>{obra.nombre}</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#777"}}>{obra.direccion}</p>
        </div>
        {misAptos.length===0&&<div style={{textAlign:"center",padding:"3rem",color:"#777",background:"#f9f9f9",borderRadius:12}}><p>No tienes apartamentos asignados en esta obra aún.</p></div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
          {misAptos.map(apto=>{
            const piso=currentObra.pisos?.find(p=>p.aptos?.some(a=>a.id===apto.id));
            const av=calcAvanceApto(apto);
            const tip=tipologias?.find(t=>t.id===apto.tipologia);
            return <div key={apto.id} onClick={()=>piso&&setSelectedApto(apto,piso)} style={{background:"#fff",border:"1px solid #eee",borderRadius:10,padding:12,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#AFA9EC"} onMouseLeave={e=>e.currentTarget.style.borderColor="#eee"}>
              <div style={{fontWeight:500,fontSize:14,marginBottom:4}}>{apto.nombre||apto.id}</div>
              {tip&&<div style={{fontSize:11,color:"#777",marginBottom:6}}>{tip.nombre}</div>}
              <div style={{height:4,background:"#f0f0f0",borderRadius:4,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${av}%`,background:av===100?"#639922":"#534AB7",borderRadius:4}}/></div>
              <div style={{fontSize:11,color:"#777"}}>{av}%</div>
            </div>;
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div><h2 style={{margin:0,fontSize:18,fontWeight:500}}>{obra.nombre}</h2><p style={{margin:"4px 0 0",fontSize:13,color:"#777"}}>{obra.direccion}</p></div>
        {user.rol===ROLES.SUPERADMIN&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={()=>{setPreciosTmp({});setPreciosCorte("");setPreciosModal(true);}}>💰 Precios</Btn>
          <Btn onClick={()=>setAccesoObraModal(true)}>👷 Accesos</Btn>
          <Btn onClick={()=>setReplicaModal(true)}>Replicar</Btn>
          <Btn variant="primary" onClick={abrirNuevaTip}>+ Tipología</Btn>
        </div>}
      </div>

      {/* Tabs: Vista general / Por instalador */}
      <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"1px solid #eee",paddingBottom:12}}>
        <button onClick={()=>setVistaInstalador(null)} style={{background:!vistaInstalador?"#EEEDFE":"transparent",color:!vistaInstalador?"#534AB7":"#777",border:!vistaInstalador?"1px solid #AFA9EC":"1px solid transparent",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:14,fontWeight:!vistaInstalador?500:400}}>Vista general</button>
        {instaladoresActivos.map(inst=><button key={inst.id} onClick={()=>setVistaInstalador(inst.id)} style={{background:vistaInstalador===inst.id?"#EAF3DE":"transparent",color:vistaInstalador===inst.id?"#3B6D11":"#777",border:vistaInstalador===inst.id?"1px solid #97C459":"1px solid transparent",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:vistaInstalador===inst.id?500:400}}>{inst.nombre.split(" ")[0]}</button>)}
      </div>

      {tipologias.length>0&&<div style={{marginBottom:18,padding:"12px 16px",background:"#f9f9f9",borderRadius:10}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:8}}>Tipologías</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {tipologias.map(t=><div key={t.id} style={{display:"flex",alignItems:"center",gap:6,background:"#EEEDFE",border:"1px solid #AFA9EC",borderRadius:20,padding:"4px 12px"}}>
            <span style={{fontSize:13,color:"#534AB7"}}>{t.nombre} · {t.elementoIds?.length||0} elem.</span>
            {user.rol===ROLES.SUPERADMIN&&<span onClick={()=>abrirEditTip(t)} style={{cursor:"pointer",fontSize:13,color:"#534AB7",fontWeight:500}}>✎</span>}
          </div>)}
        </div>
      </div>}

      {currentObra.pisos?.map(piso=>{
        const aptosVista = vistaInstalador
          ? piso.aptos?.filter(a=>a.elementos?.some(el=>el.instaladorId===vistaInstalador))
          : piso.aptos;
        if (vistaInstalador && !aptosVista?.length) return null;
        return (
          <div key={piso.id} style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,borderBottom:"1px solid #eee",paddingBottom:8}}>
              <div style={{fontSize:14,fontWeight:500,color:"#777"}}>Piso {piso.numero}</div>
              {user.rol===ROLES.SUPERADMIN&&!vistaInstalador&&<button onClick={()=>setEditPisoModal(piso.id)} style={{fontSize:12,background:"#f5f5f5",border:"1px solid #ddd",borderRadius:6,padding:"3px 10px",cursor:"pointer"}}>✎ Editar aptos</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
              {aptosVista?.map(apto=>{
                const av=calcAvanceApto(apto), tip=tipologias?.find(t=>t.id===apto.tipologia);
                const instaladorApto=apto.elementos?.find(el=>el.instaladorId)?.instaladorId;
                const instNombre=instaladorApto?usuarios.find(u=>u.id===instaladorApto)?.nombre?.split(" ")[0]:null;
                return (
                  <div key={apto.id} onClick={()=>apto.tipologia?setSelectedApto(apto,piso):null} style={{background:"#fff",border:"1px solid #eee",borderRadius:10,padding:12,cursor:apto.tipologia?"pointer":"default"}} onMouseEnter={e=>apto.tipologia&&(e.currentTarget.style.borderColor="#AFA9EC")} onMouseLeave={e=>(e.currentTarget.style.borderColor="#eee")}>
                    <div style={{fontWeight:500,fontSize:14,marginBottom:2}}>{apto.nombre||`${piso.numero}${String(apto.numero).padStart(2,"0")}`}</div>
                    {instNombre&&<div style={{fontSize:11,color:"#534AB7",marginBottom:4}}>👷 {instNombre}</div>}
                    {tip?(<>
                      <div style={{fontSize:11,color:"#777",marginBottom:6}}>{tip.nombre}</div>
                      <div style={{height:4,background:"#f0f0f0",borderRadius:4,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${av}%`,background:av===100?"#639922":"#534AB7",borderRadius:4}}/></div>
                      <div style={{fontSize:11,color:"#777"}}>{av}%</div>
                    </>):user.rol!==ROLES.AUXILIAR?(
                      asignando===apto.id?<select style={{width:"100%",fontSize:11,marginTop:4}} onClick={e=>e.stopPropagation()} onChange={e=>e.target.value&&asignarTipologia(piso.id,apto.id,e.target.value)}><option value="">Seleccionar...</option>{tipologias?.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
                      :<button onClick={e=>{e.stopPropagation();setAsignando(apto.id);}} style={{fontSize:11,color:"#534AB7",background:"#EEEDFE",border:"1px solid #AFA9EC",borderRadius:6,padding:"3px 6px",cursor:"pointer",marginTop:4}}>+ tipología</button>
                    ):<div style={{fontSize:11,color:"#777"}}>Sin asignar</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Modal editar aptos de un piso */}
      {editPisoModal&&(()=>{
        const piso=currentObra.pisos?.find(p=>p.id===editPisoModal);
        return <Modal title={`Editar apartamentos — Piso ${piso?.numero}`} onClose={()=>setEditPisoModal(null)} wide>
          <div style={{display:"grid",gap:8,marginBottom:16,maxHeight:300,overflowY:"auto"}}>
            {piso?.aptos?.map(apto=>(
              <div key={apto.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#f9f9f9",border:"1px solid #eee",borderRadius:8}}>
                <input value={apto.nombre||`${piso.numero}${String(apto.numero).padStart(2,"0")}`} onChange={e=>renombrarApto(editPisoModal,apto.id,e.target.value)} style={{flex:1,padding:"4px 8px",border:"1px solid #ddd",borderRadius:6,fontSize:14}}/>
                <button onClick={()=>eliminarApto(editPisoModal,apto.id)} style={{background:"#FCEBEB",border:"1px solid #F09595",color:"#A32D2D",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:13}}>✕</button>
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <Btn onClick={()=>agregarApto(editPisoModal)}>+ Agregar apartamento</Btn>
            <Btn variant="primary" onClick={()=>setEditPisoModal(null)}>Listo</Btn>
          </div>
        </Modal>;
      })()}

      {/* Modal precios por corte */}
      {preciosModal&&<Modal title={`Precios por corte — ${obra.nombre}`} onClose={()=>setPreciosModal(false)} wide>
        <Select label="Corte de pago" value={preciosCorte} onChange={e=>{setPreciosCorte(e.target.value);setPreciosTmp({});}}>
          <option value="">— Seleccionar corte —</option>
          {cortes.map((c,i)=><option key={i} value={c.label}>{c.label}</option>)}
        </Select>
        {preciosCorte&&<>
          <p style={{fontSize:13,color:"#777",margin:"0 0 12px"}}>Modifica el precio que aplica para este corte en esta obra. Deja en blanco para usar el precio estándar.</p>
          <div style={{maxHeight:300,overflowY:"auto",display:"grid",gap:8}}>
            {elementos.map(el=>{
              const keyStd=`${preciosCorte}__${el.id}`;
              const override=currentObra.preciosOverride?.[keyStd];
              return <div key={el.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",background:"#f9f9f9",borderRadius:8}}>
                <div style={{flex:1,fontSize:14}}>{el.nombre} <span style={{fontSize:12,color:"#777"}}>({fmt(el.precio)} estándar)</span></div>
                <input type="number" min="0" placeholder={String(el.precio)} value={preciosTmp[el.id]??override??""} onChange={e=>setPreciosTmp(t=>({...t,[el.id]:e.target.value}))} style={{width:110,padding:"4px 8px",border:"1px solid #ddd",borderRadius:6,fontSize:13,textAlign:"right"}}/>
              </div>;
            })}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:16}}>
            <Btn onClick={()=>setPreciosModal(false)}>Cancelar</Btn>
            <Btn variant="primary" onClick={guardarPrecios}>Guardar precios</Btn>
          </div>
        </>}
      </Modal>}

      {accesoObraModal&&<Modal title={`Accesos — ${currentObra.nombre}`} onClose={()=>setAccesoObraModal(false)} wide>
        {(()=>{
          const pends=(currentObra.solicitudes||[]).filter(s=>s.estado==="pendiente");
          const instaladores=usuarios.filter(u=>u.rol===ROLES.INSTALADOR);
          return <div>
            {pends.length>0&&<div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:"#854F0B"}}>Solicitudes pendientes</div>
              {pends.map(s=>{const inst=usuarios.find(u=>u.id===s.userId);return <div key={s.userId} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:"#FAEEDA",border:"1px solid #EF9F27",borderRadius:10,marginBottom:8}}>
                <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{inst?.nombre}</div><div style={{fontSize:12,color:"#777"}}>{s.fecha}</div></div>
                <Btn variant="success" onClick={()=>{updateObra(obra.id,o=>({...o,solicitudes:(o.solicitudes||[]).map(x=>x.userId===s.userId?{...x,estado:"aprobado"}:x),instaladoresAutorizados:[...new Set([...(o.instaladoresAutorizados||[]),s.userId])]}));pushNotif(`Acceso aprobado para ${inst?.nombre}`,"success");}}>Aprobar</Btn>
                <Btn variant="danger" onClick={()=>updateObra(obra.id,o=>({...o,solicitudes:(o.solicitudes||[]).map(x=>x.userId===s.userId?{...x,estado:"rechazado"}:x)}))}>Rechazar</Btn>
              </div>;})}
            </div>}
            <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Todos los instaladores</div>
            <div style={{display:"grid",gap:8,maxHeight:360,overflowY:"auto"}}>
              {instaladores.map(inst=>{
                const aut=(currentObra.instaladoresAutorizados||[]).includes(inst.id);
                return <div key={inst.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:aut?"#EAF3DE":"#f9f9f9",border:`1px solid ${aut?"#97C459":"#eee"}`,borderRadius:10}}>
                  <div style={{width:36,height:36,borderRadius:50,background:aut?"#C0DD97":"#ddd",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:500,color:aut?"#27500A":"#555",flexShrink:0}}>{inst.nombre.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1}}><div style={{fontWeight:500,fontSize:14}}>{inst.nombre}</div><div style={{fontSize:12,color:"#777"}}>C.C. {inst.cedula||"—"}</div></div>
                  <button onClick={()=>updateObra(obra.id,o=>{const a=o.instaladoresAutorizados||[];return{...o,instaladoresAutorizados:a.includes(inst.id)?a.filter(id=>id!==inst.id):[...a,inst.id]};})} style={{background:aut?"#FCEBEB":"#EAF3DE",border:`1px solid ${aut?"#F09595":"#97C459"}`,color:aut?"#A32D2D":"#3B6D11",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,fontWeight:500}}>{aut?"Revocar":"Dar acceso"}</button>
                </div>;
              })}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><Btn onClick={()=>setAccesoObraModal(false)}>Cerrar</Btn></div>
          </div>;
        })()}
      </Modal>}

      {modals.tipModal&&<Modal title={editTip?"Editar tipología":"Nueva tipología"} onClose={()=>closeModal("tipModal")}>
        <Input label="Nombre" value={tipForm.nombre} onChange={e=>setTipForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Tipo A — 3 alcobas"/>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:13,color:"#555",display:"block",marginBottom:8}}>Elementos incluidos</label>
          <div style={{maxHeight:260,overflowY:"auto",border:"1px solid #ddd",borderRadius:8,padding:8,background:"#fff"}}>
            {elementos.map(el=><label key={el.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 8px",cursor:"pointer",fontSize:14,borderRadius:6,background:tipForm.elementoIds.includes(el.id)?"#f0effe":"transparent"}}>
              <input type="checkbox" checked={tipForm.elementoIds.includes(el.id)} onChange={e=>setTipForm(f=>({...f,elementoIds:e.target.checked?[...f.elementoIds,el.id]:f.elementoIds.filter(x=>x!==el.id)}))}/>
              <span style={{flex:1,color:"#111"}}>{el.nombre}</span>
              <span style={{fontSize:12,color:"#777"}}>{el.unidad} · {fmt(el.precio)}</span>
            </label>)}
          </div>
          <div style={{fontSize:12,color:"#777",marginTop:6}}>{tipForm.elementoIds.length} elemento(s) seleccionado(s)</div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn onClick={()=>closeModal("tipModal")}>Cancelar</Btn>
          <Btn variant="primary" onClick={guardarTip}>{editTip?"Guardar cambios":"Crear"}</Btn>
        </div>
      </Modal>}

      {replicaModal&&<Modal title="Replicar tipologías por número de apartamento" onClose={()=>setReplicaModal(false)} wide>
        <p style={{fontSize:13,color:"#777",margin:"0 0 16px"}}>Asigna una tipología a cada número de apartamento en todos los pisos.</p>
        <div style={{display:"grid",gap:10,marginBottom:16}}>
          {numerosApto.map(sufijo=>{
            const regla=replicaSel.reglas.find(r=>r.sufijo===sufijo), tipId=regla?.tipId||"";
            const cantidad=currentObra.pisos?.reduce((n,p)=>n+(p.aptos?.filter(a=>String(a.numero)===sufijo).length||0),0);
            return <div key={sufijo} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:tipId?"#EEEDFE":"#f9f9f9",border:`1px solid ${tipId?"#AFA9EC":"#eee"}`,borderRadius:10}}>
              <div style={{minWidth:80}}><div style={{fontWeight:500,fontSize:14,color:tipId?"#534AB7":"#111"}}>Apto ×{sufijo}</div><div style={{fontSize:12,color:"#777"}}>{cantidad} apto(s)</div></div>
              <select style={{flex:1,padding:"6px 8px",border:"1px solid #ddd",borderRadius:8,fontSize:14}} value={tipId} onChange={e=>{const val=e.target.value;setReplicaSel(r=>{const n=r.reglas.filter(x=>x.sufijo!==sufijo);if(val)n.push({sufijo,tipId:val});return{reglas:n};});}}>
                <option value="">— Sin asignar —</option>
                {tipologias.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              {tipId&&<span style={{fontSize:18,color:"#534AB7"}}>✓</span>}
            </div>;
          })}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:"#777"}}>{replicaSel.reglas.filter(r=>r.tipId).length} número(s) asignado(s)</span>
          <div style={{display:"flex",gap:10}}>
            <Btn onClick={()=>setReplicaModal(false)}>Cancelar</Btn>
            <Btn variant="primary" disabled={!replicaSel.reglas.filter(r=>r.tipId).length} onClick={replicarEnSerie}>Aplicar</Btn>
          </div>
        </div>
      </Modal>}
    </div>
  );
}

function AptoDetalle({ apto, piso, obra, obras, updateObra, user, elementos, usuarios, calcAvanceApto, pushNotif, getPrecio }) {
  const currentObra=obras.find(o=>o.id===obra.id);
  const currentPiso=currentObra?.pisos?.find(p=>p.id===piso.id);
  const currentApto=currentPiso?.aptos?.find(a=>a.id===apto.id)||apto;
  const tip=currentObra?.tipologias?.find(t=>t.id===currentApto.tipologia);
  const av=calcAvanceApto(currentApto);
  const supervisores=usuarios.filter(u=>u.rol===ROLES.SUPERVISOR);
  const [pendientes,setPendientes]=useState({});
  const [cantidades,setCantidades]=useState({});
  const [ajusteLocal,setAjusteLocal]=useState({pasajes:"",bonificacion:""});
  const hayPendientes=Object.keys(pendientes).length>0||ajusteLocal.pasajes||ajusteLocal.bonificacion;

  // Bloqueo: instalador solo puede entrar a sus propios aptos
  const tieneAcceso = user.rol!==ROLES.INSTALADOR || currentApto.elementos?.some(el=>el.instaladorId===user.id) || !currentApto.elementos?.some(el=>el.completado);

  function togglePendiente(idx){
    if(user.rol!==ROLES.INSTALADOR)return;
    const el=currentApto.elementos[idx];
    if(el.completado&&el.instaladorId!==user.id)return;
    if(el.completado)return;
    setPendientes(p=>{const c={...p};if(c[idx]!==undefined)delete c[idx];else c[idx]=true;return c;});
  }

  async function guardarCambios() {
    await updateObra(obra.id, o=>({...o,pisos:o.pisos.map(p=>{if(p.id!==piso.id)return p;return{...p,aptos:p.aptos.map(a=>{if(a.id!==apto.id)return a;
      const newEls=a.elementos.map((el,i)=>{let u={...el};if(cantidades[i]!==undefined)u.cantidad=cantidades[i];if(pendientes[i]){u.completado=true;u.instaladorId=user.id;u.fecha=new Date().toLocaleDateString("es-CO");}return u;});
      // Guardar ajuste de pasajes/bonificacion como elemento especial
      const ajustes=[];
      if(ajusteLocal.pasajes)ajustes.push({elementoId:"__pasajes__",completado:true,instaladorId:user.id,fecha:new Date().toLocaleDateString("es-CO"),cantidad:1,valorManual:Number(ajusteLocal.pasajes),aprobado:false});
      if(ajusteLocal.bonificacion)ajustes.push({elementoId:"__bonificacion__",completado:true,instaladorId:user.id,fecha:new Date().toLocaleDateString("es-CO"),cantidad:1,valorManual:Number(ajusteLocal.bonificacion),aprobado:false});
      const newElsFinal=[...newEls.filter(e=>e.elementoId!=="__pasajes__"&&e.elementoId!=="__bonificacion__"),...ajustes];
      const allDone=newEls.every(e=>e.completado);
      if(allDone)supervisores.forEach(s=>pushNotif(`🔔 ${s.nombre}: Apto completado en ${obra.nombre}`,"info"));
      return{...a,elementos:newElsFinal};})};})}));
    pushNotif("Guardado correctamente","success");
    setPendientes({}); setCantidades({}); setAjusteLocal({pasajes:"",bonificacion:""});
  }

  async function desmarcarElemento(idx) {
    await updateObra(obra.id, o=>({...o,pisos:o.pisos.map(p=>p.id!==piso.id?p:{...p,aptos:p.aptos.map(a=>a.id!==apto.id?a:{...a,elementos:a.elementos.map((el,i)=>i!==idx?el:{...el,completado:false,instaladorId:null,fecha:null})})})}));
    pushNotif("Elemento desmarcado","success");
  }

  async function aprobarAjuste(idx) {
    await updateObra(obra.id, o=>({...o,pisos:o.pisos.map(p=>p.id!==piso.id?p:{...p,aptos:p.aptos.map(a=>a.id!==apto.id?a:{...a,elementos:a.elementos.map((el,i)=>i!==idx?el:{...el,aprobado:true})})})}));
    pushNotif("Ajuste aprobado","success");
  }

  const canEdit=user.rol===ROLES.SUPERADMIN||user.rol===ROLES.SUPERVISOR;
  const cortes=getCorteFechas();
  const corteActual=cortes[0];

  const elementosNormales=currentApto.elementos?.filter(e=>e.elementoId!=="__pasajes__"&&e.elementoId!=="__bonificacion__")||[];
  const ajustesGuardados=currentApto.elementos?.filter(e=>e.elementoId==="__pasajes__"||e.elementoId==="__bonificacion__")||[];

  const totalLiquidado=elementosNormales.filter(e=>e.completado).reduce((s,el)=>{const precio=getPrecio(el.elementoId,obra.id,corteActual.label);return s+precio*(el.cantidad||1);},0)||0;
  const totalAjustes=ajustesGuardados.filter(e=>e.aprobado).reduce((s,e)=>s+(e.valorManual||0),0);
  const totalPendiente=Object.keys(pendientes).reduce((s,idx)=>{const el=elementosNormales[parseInt(idx)];const precio=getPrecio(el?.elementoId,obra.id,corteActual.label);const cant=cantidades[idx]??el?.cantidad??1;return s+precio*cant;},0)+(Number(ajusteLocal.pasajes)||0)+(Number(ajusteLocal.bonificacion)||0);

  if (!tieneAcceso) return <div style={{textAlign:"center",padding:"3rem",color:"#777",background:"#f9f9f9",borderRadius:12}}><p>No tienes acceso a este apartamento.</p></div>;

  return (
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:500}}>Apto {apto.nombre||`${piso.numero}${String(apto.numero).padStart(2,"0")}`} — {tip?.nombre||"Sin tipología"}</h2>
        <p style={{margin:"4px 0 0",fontSize:13,color:"#777"}}>{obra.nombre} · Piso {piso.numero}</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
        {[["Avance",`${av}%`],["Instalados",`${elementosNormales.filter(e=>e.completado).length||0}/${elementosNormales.length||0}`],[user.rol===ROLES.INSTALADOR?"Mi liquidación":"Liquidación",fmt(totalLiquidado+totalAjustes)]].map(([l,v])=>(
          <div key={l} style={{background:"#f9f9f9",borderRadius:8,padding:"12px 14px"}}><div style={{fontSize:12,color:"#777",marginBottom:4}}>{l}</div><div style={{fontSize:16,fontWeight:500}}>{v}</div></div>
        ))}
      </div>
      {canEdit&&<div style={{marginBottom:14,padding:"10px 14px",background:"#FAEEDA",border:"1px solid #EF9F27",borderRadius:10,fontSize:13,color:"#854F0B"}}>Puedes desmarcar elementos con ✕ y aprobar ajustes de pasajes/bonificación.</div>}
      {user.rol===ROLES.INSTALADOR&&<div style={{marginBottom:14,padding:"10px 14px",background:"#EEEDFE",border:"1px solid #AFA9EC",borderRadius:10,fontSize:13,color:"#534AB7"}}>Marca los elementos terminados y agrega pasajes/bonificación si aplica. Presiona <strong>Guardar</strong>.{hayPendientes&&<span style={{marginLeft:8,fontWeight:500}}>· +{fmt(totalPendiente)}</span>}</div>}

      <div style={{display:"grid",gap:8,marginBottom:16}}>
        {elementosNormales.map((el,idx)=>{
          const elem=elementos.find(e=>e.id===el.elementoId);
          const inst=usuarios.find(u=>u.id===el.instaladorId);
          const esPend=!!pendientes[idx], marcado=el.completado||esPend;
          const canToggle=user.rol===ROLES.INSTALADOR&&!el.completado;
          const cantActual=cantidades[idx]??el.cantidad??1;
          const precio=getPrecio(el.elementoId,obra.id,corteActual.label);
          return (
            <div key={idx} onClick={()=>canToggle&&togglePendiente(idx)} style={{display:"flex",alignItems:"center",gap:12,background:el.completado?"#EAF3DE":esPend?"#EEEDFE":"#fff",border:`1.5px solid ${el.completado?"#97C459":esPend?"#AFA9EC":"#eee"}`,borderRadius:10,padding:"12px 14px",cursor:canToggle?"pointer":"default"}}>
              <div style={{width:28,height:28,borderRadius:8,flexShrink:0,border:`2px solid ${el.completado?"#639922":esPend?"#534AB7":"#ccc"}`,background:el.completado?"#639922":esPend?"#534AB7":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {marcado&&<span style={{color:"#fff",fontSize:16,fontWeight:700}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:500,fontSize:14,color:el.completado?"#27500A":esPend?"#3C3489":"#111"}}>{elem?.nombre||el.elementoId}</div>
                {el.completado&&inst&&<div style={{fontSize:12,color:"#3B6D11"}}>{inst.nombre} · {el.fecha}</div>}
                {esPend&&<div style={{fontSize:12,color:"#534AB7"}}>Pendiente de guardar</div>}
              </div>
              {(elem?.unidad==="ml"||elem?.unidad==="m2")&&<div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:12,color:"#777"}}>{elem.unidad}</span>
                <input type="number" min="0.1" step="0.1" value={cantActual} disabled={el.completado&&user.rol===ROLES.INSTALADOR} onChange={e=>setCantidades(c=>({...c,[idx]:Number(e.target.value)}))} style={{width:64,textAlign:"center",fontSize:13,padding:"4px",border:"1px solid #ddd",borderRadius:6}}/>
              </div>}
              <div style={{textAlign:"right",minWidth:90}}>
                <div style={{fontSize:14,fontWeight:500}}>{fmt(precio*cantActual)}</div>
                <div style={{fontSize:11,color:"#777"}}>{elem?.unidad}</div>
              </div>
              {canEdit&&el.completado&&<button onClick={e=>{e.stopPropagation();desmarcarElemento(idx);}} style={{marginLeft:4,width:28,height:28,borderRadius:6,border:"1px solid #F09595",background:"#FCEBEB",color:"#A32D2D",cursor:"pointer",fontSize:15,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>}
            </div>
          );
        })}
      </div>

      {/* Sección pasajes y bonificación */}
      <div style={{borderTop:"1px solid #eee",paddingTop:16,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12,color:"#555"}}>Pasajes y Bonificación</div>
        {ajustesGuardados.length>0&&ajustesGuardados.map((aj,idx)=>(
          <div key={idx} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:aj.aprobado?"#EAF3DE":"#FAEEDA",border:`1px solid ${aj.aprobado?"#97C459":"#EF9F27"}`,borderRadius:10,marginBottom:8}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:500,fontSize:14}}>{aj.elementoId==="__pasajes__"?"Pasajes":"Bonificación"}</div>
              <div style={{fontSize:12,color:"#777"}}>{aj.fecha} · {aj.aprobado?"✓ Aprobado":"Pendiente de aprobación"}</div>
            </div>
            <div style={{fontWeight:500,fontSize:14}}>{fmt(aj.valorManual)}</div>
            {canEdit&&!aj.aprobado&&<Btn variant="success" onClick={()=>aprobarAjuste(currentApto.elementos.indexOf(aj))}>Aprobar</Btn>}
          </div>
        ))}
        {user.rol===ROLES.INSTALADOR&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Pasajes ($)" type="number" min="0" value={ajusteLocal.pasajes} onChange={e=>setAjusteLocal(a=>({...a,pasajes:e.target.value}))} placeholder="0"/>
          <Input label="Bonificación ($)" type="number" min="0" value={ajusteLocal.bonificacion} onChange={e=>setAjusteLocal(a=>({...a,bonificacion:e.target.value}))} placeholder="0"/>
        </div>}
      </div>

      {user.rol===ROLES.INSTALADOR&&<div style={{position:"sticky",bottom:0,background:"#fff",borderTop:"1px solid #eee",padding:"14px 0 4px",display:"flex",justifyContent:"flex-end",gap:10}}>
        {hayPendientes&&<span style={{fontSize:14,color:"#777",alignSelf:"center"}}>Listo para guardar</span>}
        <Btn variant="primary" disabled={!hayPendientes} onClick={guardarCambios} style={{padding:"10px 28px",fontSize:15}}>Guardar</Btn>
      </div>}
    </div>
  );
}

function ElementosView({ elementos, setElementos, openModal, closeModal, modals }) {
  const [form,setForm]=useState({nombre:"",unidad:"und",precio:0});
  const [editId,setEditId]=useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  async function eliminarUsuario(id) {
    await dbDelete("usuarios", id);
    setUsuarios(us => us.filter(u => u.id !== id));
    setConfirmDeleteUser(null);
  }

  async function guardar(){
    if(!form.nombre)return;
    const el=editId?{...elementos.find(e=>e.id===editId),...form,precio:Number(form.precio)}:{id:`e${Date.now()}`,...form,precio:Number(form.precio)};
    await dbUpsert("elementos",el);
    if(editId)setElementos(els=>els.map(e=>e.id===editId?el:e));else setElementos(els=>[...els,el]);
    setEditId(null);setForm({nombre:"",unidad:"und",precio:0});closeModal("elModal");
  }
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:500}}>Elementos</h2>
        <Btn variant="primary" onClick={()=>{setEditId(null);setForm({nombre:"",unidad:"und",precio:0});openModal("elModal");}}>+ Nuevo</Btn>
      </div>
      <div style={{display:"grid",gap:6}}>
        {elementos.map(el=><div key={el.id} style={{display:"flex",alignItems:"center",gap:12,background:"#fff",border:"1px solid #eee",borderRadius:10,padding:"10px 14px"}}>
          <div style={{flex:1}}><span style={{fontWeight:500,fontSize:14}}>{el.nombre}</span> <Badge color="gray">{el.unidad}</Badge></div>
          <div style={{fontWeight:500,fontSize:14,minWidth:110,textAlign:"right"}}>{fmt(el.precio)}</div>
          <Btn onClick={()=>{setEditId(el.id);setForm({nombre:el.nombre,unidad:el.unidad,precio:el.precio});openModal("elModal");}}>Editar</Btn>
        </div>)}
      </div>
      {modals.elModal&&<Modal title={editId?"Editar elemento":"Nuevo elemento"} onClose={()=>closeModal("elModal")}>
        <Input label="Nombre" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}/>
        <Select label="Unidad" value={form.unidad} onChange={e=>setForm(f=>({...f,unidad:e.target.value}))}>
          <option value="und">und — Unidad</option><option value="ml">ml — Metro lineal</option><option value="m2">m2 — Metro cuadrado</option><option value="gl">gl — Global</option>
        </Select>
        <Input label="Precio ($)" type="number" min="0" value={form.precio} onChange={e=>setForm(f=>({...f,precio:e.target.value}))}/>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><Btn onClick={()=>closeModal("elModal")}>Cancelar</Btn><Btn variant="primary" onClick={guardar}>{editId?"Guardar":"Crear"}</Btn></div>
      </Modal>}
    </div>
  );
}

function LiquidacionView({ obras, elementos, usuarios, user, calcLiquidacion, liquidaciones, setLiquidaciones, getPrecio }) {
  const cortes=getCorteFechas();
  const [corteIdx,setCorteIdx]=useState(0);
  const [exportModal,setExportModal]=useState(null);
  const [verHistorial,setVerHistorial]=useState(false);
  const corte=cortes[corteIdx];
  const instaladores=user.rol===ROLES.INSTALADOR?usuarios.filter(u=>u.id===user.id):usuarios.filter(u=>u.rol===ROLES.INSTALADOR);
  const puedeExportar=[ROLES.SUPERADMIN,ROLES.SUPERVISOR,ROLES.AUXILIAR].includes(user.rol);

  function detalleInstalador(instId,desde,hasta){
    const rows=[];
    obras.forEach(obra=>obra.pisos?.forEach(piso=>piso.aptos?.forEach(apto=>apto.elementos?.forEach(el=>{
      if(el.completado&&el.instaladorId===instId&&fechaDentroCorte(el.fecha,desde,hasta)){
        if(el.elementoId==="__pasajes__"){rows.push({obra:obra.nombre,apto:`${piso.numero}${String(apto.numero).padStart(2,"0")}`,elemento:"Pasajes",cantidad:1,precio:el.valorManual||0,fecha:el.fecha,esAjuste:true,aprobado:el.aprobado});return;}
        if(el.elementoId==="__bonificacion__"){rows.push({obra:obra.nombre,apto:`${piso.numero}${String(apto.numero).padStart(2,"0")}`,elemento:"Bonificación",cantidad:1,precio:el.valorManual||0,fecha:el.fecha,esAjuste:true,aprobado:el.aprobado});return;}
        const elem=elementos.find(e=>e.id===el.elementoId);
        rows.push({obra:obra.nombre,apto:`${piso.numero}${String(apto.numero).padStart(2,"0")}`,elemento:elem?.nombre,cantidad:el.cantidad||1,precio:getPrecio(el.elementoId,obra.id,corte.label),fecha:el.fecha,esAjuste:false,aprobado:true});
      }
    }))));
    return rows;
  }

  function calcResumenFull(instId){
    const rows=detalleInstalador(instId,corte.desde,corte.hasta);
    const bruto=rows.filter(r=>!r.esAjuste).reduce((s,r)=>s+r.precio*r.cantidad,0);
    const retencion=Math.round(bruto*0.10);
    const subtotal=bruto-retencion;
    const pasajes=rows.filter(r=>r.esAjuste&&r.elemento==="Pasajes"&&r.aprobado).reduce((s,r)=>s+r.precio,0);
    const bonificacion=rows.filter(r=>r.esAjuste&&r.elemento==="Bonificación"&&r.aprobado).reduce((s,r)=>s+r.precio,0);
    const pendAjustes=rows.filter(r=>r.esAjuste&&!r.aprobado).length;
    return{bruto,retencion,subtotal,pasajes,bonificacion,total:subtotal+pasajes+bonificacion,pendAjustes,rows};
  }

  async function cerrarLiquidacion(inst){
    const{rows,...resumen}=calcResumenFull(inst.id);
    const liq={id:`liq-${Date.now()}-${inst.id}`,inst_id:inst.id,inst_nombre:inst.nombre,inst_cedula:inst.cedula,inst_telefono:inst.telefono,inst_banco:inst.banco,inst_cuenta:inst.cuenta,corte:corte.label,fecha_cierre:new Date().toLocaleDateString("es-CO"),cerrado_por:user.nombre,rows,...resumen,estado:"pagado"};
    await dbUpsert("liquidaciones",liq);
    setLiquidaciones(ls=>[...ls,liq]);
  }

  function yaCerrada(instId){return liquidaciones.some(l=>l.inst_id===instId&&l.corte===corte.label);}

  function exportarPDF(inst,rows,resumen){setExportModal({tipo:"pdf",inst,rows,resumen});}
  function exportarExcel(inst,rows,resumen){
    const lines=[`Liquidación — ${inst.nombre} (C.C. ${inst.cedula}) — Corte: ${corte.label}`,`Tel: ${inst.telefono||"-"} | Banco: ${inst.banco||"-"} | Cta: ${inst.cuenta||"-"}`,"",["Obra","Apto","Elemento","Cant.","Precio","Total","Fecha","Estado"].join("\t"),...rows.map(r=>[r.obra,r.apto,r.elemento,r.cantidad,r.precio,r.precio*r.cantidad,r.fecha,r.esAjuste?(r.aprobado?"Aprobado":"Pendiente"):"Instalado"].join("\t")),"",["Total bruto","","","","",resumen.bruto,"",""].join("\t"),["Retención 10%","","","","",-resumen.retencion,"",""].join("\t"),["Subtotal","","","","",resumen.subtotal,"",""].join("\t"),["Pasajes","","","","",resumen.pasajes,"",""].join("\t"),["Bonificación","","","","",resumen.bonificacion,"",""].join("\t"),["TOTAL A PAGAR","","","","",resumen.total,"",""].join("\t")].join("\n");
    setExportModal({tipo:"excel",inst,rows,resumen,texto:lines});
  }

  return (
    <div>
      {exportModal&&<Modal title={exportModal.tipo==="pdf"?"Reporte — Imprimir":"Excel — Copiar"} onClose={()=>setExportModal(null)} wide>
        {exportModal.tipo==="pdf"?(<div style={{border:"1px solid #ddd",borderRadius:10,padding:20,fontSize:13,lineHeight:1.7}}>
          <div style={{borderBottom:"2px solid #534AB7",paddingBottom:12,marginBottom:16}}>
            <div style={{fontSize:17,fontWeight:500}}>Liquidación de instalación</div>
            <div><strong>{exportModal.inst.nombre}</strong> — C.C. {exportModal.inst.cedula}</div>
            <div style={{color:"#777",fontSize:12}}>Tel: {exportModal.inst.telefono||"-"} · Banco: {exportModal.inst.banco||"-"} · Cta: {exportModal.inst.cuenta||"-"}</div>
            <div style={{marginTop:6}}><Badge color="purple">Corte: {corte.label}</Badge></div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:16}}>
            <thead><tr style={{background:"#EEEDFE"}}>{["Obra","Apto","Elemento","Cant.","Precio","Total","Fecha"].map(h=><th key={h} style={{padding:"6px 8px",textAlign:"left",fontWeight:500,color:"#534AB7",borderBottom:"1px solid #AFA9EC"}}>{h}</th>)}</tr></thead>
            <tbody>{exportModal.rows.filter(r=>!r.esAjuste||r.aprobado).map((r,i)=><tr key={i} style={{background:i%2===0?"transparent":"#f9f9f9"}}><td style={{padding:"5px 8px"}}>{r.obra}</td><td style={{padding:"5px 8px"}}>{r.apto}</td><td style={{padding:"5px 8px"}}>{r.elemento}</td><td style={{padding:"5px 8px",textAlign:"center"}}>{r.cantidad}</td><td style={{padding:"5px 8px",textAlign:"right"}}>{fmt(r.precio)}</td><td style={{padding:"5px 8px",textAlign:"right",fontWeight:500}}>{fmt(r.precio*r.cantidad)}</td><td style={{padding:"5px 8px"}}>{r.fecha}</td></tr>)}</tbody>
          </table>
          <div style={{background:"#f9f9f9",borderRadius:8,padding:"12px 16px",fontSize:13}}>
            {[["Total bruto instalado",exportModal.resumen.bruto],["Retención 10%",-exportModal.resumen.retencion],["Subtotal",exportModal.resumen.subtotal],exportModal.resumen.pasajes>0?["Pasajes",exportModal.resumen.pasajes]:null,exportModal.resumen.bonificacion>0?["Bonificación",exportModal.resumen.bonificacion]:null,["Total a pagar",exportModal.resumen.total]].filter(Boolean).map(([l,v],i,arr)=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:i<arr.length-1?"1px solid #eee":"none",fontWeight:i===arr.length-1?500:400,fontSize:i===arr.length-1?15:13,color:i===arr.length-1?"#3B6D11":"#111",marginTop:i===arr.length-1?6:0}}><span>{l}</span><span>{v<0?`— ${fmt(Math.abs(v))}`:fmt(v)}</span></div>
            ))}
          </div>
          <div style={{marginTop:12,fontSize:11,color:"#999"}}>Generado el {new Date().toLocaleDateString("es-CO")} — Sistema de Gestión de Obras</div>
        </div>):(<div>
          <p style={{fontSize:13,color:"#777",margin:"0 0 12px"}}>Copia y pega en Excel o Google Sheets.</p>
          <textarea readOnly value={exportModal.texto} style={{width:"100%",height:260,fontFamily:"monospace",fontSize:12,padding:12,borderRadius:8,border:"1px solid #ddd",background:"#f9f9f9",boxSizing:"border-box",resize:"vertical"}} onFocus={e=>e.target.select()}/>
          <p style={{fontSize:12,color:"#777",margin:"8px 0 0"}}>Clic → Ctrl+A → Ctrl+C</p>
        </div>)}
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><Btn onClick={()=>setExportModal(null)}>Cerrar</Btn></div>
      </Modal>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:500}}>Liquidación</h2>
        <Btn onClick={()=>setVerHistorial(!verHistorial)} variant={verHistorial?"primary":"default"}>{verHistorial?"Ver corte actual":"Historial de pagos"}</Btn>
      </div>

      {verHistorial?<HistorialLiquidaciones liquidaciones={liquidaciones} user={user} usuarios={usuarios}/>:(
        <>
          <div style={{marginBottom:20}}>
            <label style={{fontSize:13,color:"#777",display:"block",marginBottom:6}}>Corte de pago</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {cortes.map((c,i)=><button key={i} onClick={()=>setCorteIdx(i)} style={{background:corteIdx===i?"#EEEDFE":"#f5f5f5",color:corteIdx===i?"#534AB7":"#777",border:`1px solid ${corteIdx===i?"#AFA9EC":"#ddd"}`,borderRadius:20,padding:"5px 14px",cursor:"pointer",fontSize:13,fontWeight:corteIdx===i?500:400}}>{c.label}</button>)}
            </div>
            <p style={{fontSize:12,color:"#777",margin:"8px 0 0"}}>Del {corte.desde.toLocaleDateString("es-CO")} al {corte.hasta.toLocaleDateString("es-CO")}</p>
          </div>
          {instaladores.map(inst=>{
            const{rows,...resumen}=calcResumenFull(inst.id), cerrada=yaCerrada(inst.id);
            return <div key={inst.id} style={{background:"#fff",border:`1px solid ${cerrada?"#97C459":"#eee"}`,borderRadius:12,padding:"1rem 1.25rem",marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontWeight:500,fontSize:15}}>{inst.nombre}</div>
                  <div style={{fontSize:13,color:"#777",marginTop:2}}>C.C. {inst.cedula||"—"} · {inst.telefono||"—"}</div>
                  <div style={{fontSize:13,color:"#777"}}>{inst.banco?`${inst.banco} — Cta: ${inst.cuenta}`:"Sin datos bancarios"}</div>
                  <div style={{marginTop:6,display:"flex",gap:6}}><Badge color="green">Instalador</Badge>{cerrada&&<Badge color="green">✓ Cerrada</Badge>}{resumen.pendAjustes>0&&<Badge color="amber">{resumen.pendAjustes} ajuste(s) pendiente(s)</Badge>}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:12,color:"#777"}}>Total a pagar</div>
                  <div style={{fontSize:22,fontWeight:500,color:"#3B6D11"}}>{fmt(resumen.total)}</div>
                </div>
              </div>
              {rows.length>0&&<div style={{borderTop:"1px solid #eee",paddingTop:12,marginBottom:12}}>
                {rows.map((r,i)=><div key={i} style={{display:"flex",gap:10,fontSize:13,padding:"5px 0",borderBottom:"1px solid #f5f5f5",flexWrap:"wrap",opacity:r.esAjuste&&!r.aprobado?0.6:1}}>
                  <span style={{color:"#777",minWidth:80}}>{r.obra?.substring(0,14)}</span>
                  <span>Apto {r.apto}</span>
                  <span style={{flex:1}}>{r.elemento}{r.esAjuste&&!r.aprobado&&<span style={{marginLeft:6,fontSize:11,color:"#854F0B"}}>(pendiente aprobación)</span>}</span>
                  <span style={{fontWeight:500,minWidth:90,textAlign:"right"}}>{fmt(r.precio*r.cantidad)}</span>
                </div>)}
              </div>}
              {rows.length>0&&<div style={{background:"#f9f9f9",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:12}}>
                {[["Total bruto instalado",resumen.bruto],["Retención 10%",-resumen.retencion],["Subtotal",resumen.subtotal],resumen.pasajes>0?["Pasajes",resumen.pasajes]:null,resumen.bonificacion>0?["Bonificación",resumen.bonificacion]:null].filter(Boolean).map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:"1px solid #eee"}}><span style={{color:"#777"}}>{l}</span><span>{v<0?`— ${fmt(Math.abs(v))}`:fmt(v)}</span></div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 0",fontWeight:500,fontSize:15,color:"#3B6D11"}}><span>Total a pagar</span><span>{fmt(resumen.total)}</span></div>
              </div>}
              {rows.length===0&&<p style={{fontSize:13,color:"#777",margin:"8px 0"}}>Sin instalaciones en este corte.</p>}
              {puedeExportar&&rows.length>0&&<div style={{display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap"}}>
                <Btn variant="success" onClick={()=>exportarExcel(inst,rows,resumen)}>Excel</Btn>
                <Btn variant="primary" onClick={()=>exportarPDF(inst,rows,resumen)}>PDF</Btn>
                {!cerrada&&user.rol===ROLES.SUPERADMIN&&<Btn variant="amber" onClick={()=>cerrarLiquidacion(inst)}>✓ Cerrar y aprobar</Btn>}
              </div>}
            </div>;
          })}
        </>
      )}
    </div>
  );
}

function HistorialLiquidaciones({ liquidaciones, user, usuarios }) {
  const [filtroInst,setFiltroInst]=useState("");
  const [detalle,setDetalle]=useState(null);
  const instaladores=usuarios.filter(u=>u.rol===ROLES.INSTALADOR);
  const liqs=liquidaciones.filter(l=>user.rol===ROLES.INSTALADOR?l.inst_id===user.id:(!filtroInst||l.inst_id===filtroInst)).sort((a,b)=>b.id.localeCompare(a.id));
  return (
    <div>
      <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:500}}>Historial de liquidaciones</h3>
      {user.rol!==ROLES.INSTALADOR&&<Select label="Filtrar por instalador" value={filtroInst} onChange={e=>setFiltroInst(e.target.value)}><option value="">Todos</option>{instaladores.map(i=><option key={i.id} value={i.id}>{i.nombre}</option>)}</Select>}
      {liqs.length===0&&<p style={{fontSize:13,color:"#777"}}>No hay liquidaciones cerradas aún.</p>}
      <div style={{display:"grid",gap:10}}>
        {liqs.map(l=><div key={l.id} style={{background:"#fff",border:"1px solid #97C459",borderRadius:12,padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontWeight:500,fontSize:15}}>{l.inst_nombre}</div>
              <div style={{fontSize:12,color:"#777"}}>C.C. {l.inst_cedula} · Corte: {l.corte}</div>
              <div style={{fontSize:12,color:"#777"}}>Cerrado el {l.fecha_cierre} por {l.cerrado_por}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,color:"#777"}}>Total pagado</div>
              <div style={{fontSize:18,fontWeight:500,color:"#3B6D11"}}>{fmt(l.total)}</div>
              <button onClick={()=>setDetalle(detalle?.id===l.id?null:l)} style={{fontSize:12,background:"#EEEDFE",border:"1px solid #AFA9EC",color:"#534AB7",borderRadius:8,padding:"3px 10px",cursor:"pointer",marginTop:4}}>{detalle?.id===l.id?"Ocultar":"Ver detalle"}</button>
            </div>
          </div>
          {detalle?.id===l.id&&<div style={{marginTop:12,borderTop:"1px solid #eee",paddingTop:12}}>
            {(l.rows||[]).map((r,i)=><div key={i} style={{display:"flex",gap:10,fontSize:12,padding:"4px 0",borderBottom:"1px solid #f5f5f5",flexWrap:"wrap"}}><span style={{color:"#777",minWidth:80}}>{r.obra?.substring(0,14)}</span><span>Apto {r.apto}</span><span style={{flex:1}}>{r.elemento}</span><span style={{fontWeight:500,minWidth:90,textAlign:"right"}}>{fmt(r.precio*r.cantidad)}</span></div>)}
            <div style={{marginTop:10,background:"#f9f9f9",borderRadius:8,padding:"8px 12px",fontSize:12}}>
              {[["Total bruto",l.bruto],["Retención 10%",-l.retencion],["Subtotal",l.subtotal],l.pasajes>0?["Pasajes",l.pasajes]:null,l.bonificacion>0?["Bonificación",l.bonificacion]:null,["Total pagado",l.total]].filter(Boolean).map(([lb,v],i,arr)=>(
                <div key={lb} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontWeight:i===arr.length-1?500:400,color:i===arr.length-1?"#3B6D11":"#111"}}><span>{lb}</span><span>{v<0?`— ${fmt(Math.abs(v))}`:fmt(v)}</span></div>
              ))}
            </div>
          </div>}
        </div>)}
      </div>
    </div>
  );
}

function UsuariosView({ usuarios, setUsuarios, openModal, closeModal, modals }) {
  const empty={nombre:"",email:"",rol:ROLES.INSTALADOR,pin:"",cedula:"",telefono:"",banco:"",cuenta:""};
  const [form,setForm]=useState(empty);
  const [editId,setEditId]=useState(null);
  const rolColor={superadmin:"purple",supervisor:"blue",auxiliar:"amber",instalador:"green"};
  const rolLabel={superadmin:"Superadmin",supervisor:"Supervisor",auxiliar:"Auxiliar",instalador:"Instalador"};

  async function guardar(){
    if(!form.nombre||!form.email||(!editId&&!form.pin))return;
    const u=editId?{...usuarios.find(x=>x.id===editId),...form}:{id:`u${Date.now()}`,...form};
    await dbUpsert("usuarios",u);
    if(editId)setUsuarios(us=>us.map(x=>x.id===editId?u:x));else setUsuarios(us=>[...us,u]);
    setForm(empty);setEditId(null);closeModal("userModal");
  }
  function editar(u){setEditId(u.id);setForm({nombre:u.nombre,email:u.email,rol:u.rol,pin:u.pin,cedula:u.cedula||"",telefono:u.telefono||"",banco:u.banco||"",cuenta:u.cuenta||""});openModal("userModal");}

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <h2 style={{margin:0,fontSize:18,fontWeight:500}}>Usuarios</h2>
        <Btn variant="primary" onClick={()=>{setEditId(null);setForm(empty);openModal("userModal");}}>+ Nuevo usuario</Btn>
      </div>
      <div style={{display:"grid",gap:8}}>
        {usuarios.map(u=><div key={u.id} style={{display:"flex",alignItems:"center",gap:12,background:"#fff",border:"1px solid #eee",borderRadius:10,padding:"10px 14px"}}>
          <div style={{width:38,height:38,borderRadius:50,background:"#EEEDFE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:500,color:"#534AB7",flexShrink:0}}>{u.nombre.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:500,fontSize:14}}>{u.nombre}</div>
            <div style={{fontSize:13,color:"#777"}}>{u.email}{u.cedula?` · C.C. ${u.cedula}`:""}</div>
            {u.rol===ROLES.INSTALADOR&&u.banco&&<div style={{fontSize:12,color:"#777"}}>{u.banco} — {u.cuenta}</div>}
          </div>
          <Badge color={rolColor[u.rol]}>{rolLabel[u.rol]}</Badge>
          <Btn onClick={()=>editar(u)}>Editar</Btn>
          <Btn variant="danger" onClick={()=>setConfirmDeleteUser(u.id)}>Eliminar</Btn>
        </div>)}
      </div>
      {confirmDeleteUser&&<Modal title="Eliminar usuario" onClose={()=>setConfirmDeleteUser(null)}>
        <p style={{fontSize:14,color:"#333",marginBottom:20}}>¿Estás seguro de que deseas eliminar a <strong>{usuarios.find(u=>u.id===confirmDeleteUser)?.nombre}</strong>? Esta acción no se puede deshacer.</p>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn onClick={()=>setConfirmDeleteUser(null)}>Cancelar</Btn>
          <Btn variant="danger" onClick={()=>eliminarUsuario(confirmDeleteUser)}>Sí, eliminar</Btn>
        </div>
      </Modal>}

      {modals.userModal&&<Modal title={editId?"Editar usuario":"Nuevo usuario"} onClose={()=>closeModal("userModal")} wide>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <Input label="Nombre completo" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))}/>
          <Input label="Correo" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
          <Input label="Cédula" value={form.cedula} onChange={e=>setForm(f=>({...f,cedula:e.target.value}))}/>
          <Input label="Teléfono" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <Select label="Rol" value={form.rol} onChange={e=>setForm(f=>({...f,rol:e.target.value}))}>
            <option value={ROLES.INSTALADOR}>Instalador</option><option value={ROLES.AUXILIAR}>Auxiliar</option><option value={ROLES.SUPERVISOR}>Supervisor</option><option value={ROLES.SUPERADMIN}>Superadmin</option>
          </Select>
          <Input label={editId?"Nuevo PIN (vacío = no cambiar)":"PIN (4 dígitos)"} type="password" maxLength={4} value={form.pin} onChange={e=>setForm(f=>({...f,pin:e.target.value}))} placeholder="••••"/>
        </div>
        {form.rol===ROLES.INSTALADOR&&<>
          <div style={{fontSize:13,fontWeight:500,margin:"4px 0 10px",color:"#777",borderTop:"1px solid #eee",paddingTop:12}}>Datos bancarios</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Input label="Banco" value={form.banco} onChange={e=>setForm(f=>({...f,banco:e.target.value}))} placeholder="Ej: Bancolombia"/>
            <Input label="Número de cuenta" value={form.cuenta} onChange={e=>setForm(f=>({...f,cuenta:e.target.value}))}/>
          </div>
        </>}
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
          <Btn onClick={()=>closeModal("userModal")}>Cancelar</Btn>
          <Btn variant="primary" onClick={guardar}>{editId?"Guardar cambios":"Crear usuario"}</Btn>
        </div>
      </Modal>}
    </div>
  );
}