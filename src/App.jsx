import { useState, useEffect } from "react";

const SUPA_URL = "https://kboumpkcrdeuteiiodjp.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtib3VtcGtjcmRldXRlaWlvZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODA2MTQsImV4cCI6MjA5NDI1NjYxNH0.gTjqSnxI8F7ozcLSWB2rCDexP7ubgX1fwG2uOM3L0rI";
const H = { "Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":`Bearer ${SUPA_KEY}`,"Prefer":"return=representation" };
async function dbGet(t){const r=await fetch(`${SUPA_URL}/rest/v1/${t}?select=*`,{headers:H});return r.json();}
async function dbUpsert(t,d){await fetch(`${SUPA_URL}/rest/v1/${t}`,{method:"POST",headers:{...H,"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(d)});}
async function dbDelete(t,id){await fetch(`${SUPA_URL}/rest/v1/${t}?id=eq.${id}`,{method:"DELETE",headers:H});}

// ─── TOKENS ───────────────────────────────────────────────
const C={orange:"#F97316",orangeD:"#EA6A0A",orangeL:"#FFF7ED",orangeMid:"#FED7AA",black:"#111",gray900:"#1C1C1E",gray800:"#2C2C2E",gray700:"#3A3A3C",gray500:"#636366",gray400:"#8E8E93",gray300:"#C7C7CC",gray200:"#D1D1D6",gray100:"#F2F2F7",gray50:"#F9F9FB",white:"#FFFFFF",green:"#22C55E",greenL:"#DCFCE7",greenD:"#15803D",red:"#EF4444",redL:"#FEE2E2",amber:"#F59E0B",amberL:"#FEF3C7"};
const card={background:C.white,border:`1px solid ${C.gray200}`,borderRadius:12,padding:"1rem 1.25rem",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"};
const inputSt={width:"100%",boxSizing:"border-box",padding:"9px 12px",border:`1px solid ${C.gray200}`,borderRadius:8,fontSize:14,fontFamily:"system-ui",outline:"none",color:C.black,background:C.white};
const selectSt={...inputSt,background:C.white};
const btnV={
  primary:{background:C.orange,border:`1px solid ${C.orange}`,color:C.white},
  default:{background:C.white,border:`1px solid ${C.gray200}`,color:C.black},
  danger:{background:C.redL,border:"1px solid #FECACA",color:C.red},
  success:{background:C.greenL,border:"1px solid #BBF7D0",color:C.greenD},
  amber:{background:C.amberL,border:"1px solid #FDE68A",color:"#B45309"},
};
function badge(type){
  const m={green:{bg:C.greenL,c:C.greenD,b:"#BBF7D0"},orange:{bg:C.orangeL,c:C.orangeD,b:C.orangeMid},amber:{bg:C.amberL,c:"#B45309",b:"#FDE68A"},red:{bg:C.redL,c:C.red,b:"#FECACA"},gray:{bg:C.gray100,c:C.gray500,b:C.gray200}};
  const v=m[type]||m.gray;
  return{background:v.bg,color:v.c,border:`1px solid ${v.b}`,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:500,display:"inline-block"};
}

// ─── ROLES / DATOS ────────────────────────────────────────
const ROLES={SUPERADMIN:"superadmin",SUPERVISOR:"supervisor",AUXILIAR:"auxiliar",INSTALADOR:"instalador"};
const ELEMENTOS_DEFAULT=[
  {id:"e1",nombre:"Puerta principal",unidad:"und",precio:55000},{id:"e2",nombre:"Puerta habitación",unidad:"und",precio:55000},
  {id:"e3",nombre:"Chapa puerta principal",unidad:"und",precio:10000},  {id:"e4",nombre:"Moldura puerta principal",unidad:"und",precio:10000},
  {id:"e19",nombre:"Chapa WC principal",unidad:"und",precio:10000},{id:"e20",nombre:"Moldura WC principal",unidad:"und",precio:10000},
  {id:"e21",nombre:"Chapa WC social",unidad:"und",precio:10000},{id:"e22",nombre:"Moldura WC social",unidad:"und",precio:10000},
  {id:"e23",nombre:"Chapa alcoba 2",unidad:"und",precio:10000},{id:"e24",nombre:"Moldura alcoba 2",unidad:"und",precio:10000},
  {id:"e25",nombre:"Chapa alcoba 3",unidad:"und",precio:10000},{id:"e26",nombre:"Moldura alcoba 3",unidad:"und",precio:10000},
  {id:"e5",nombre:"Closet alcoba principal",unidad:"und",precio:150000},{id:"e6",nombre:"Closet alcoba 2",unidad:"und",precio:120000},
  {id:"e7",nombre:"Closet alcoba 3",unidad:"und",precio:120000},{id:"e8",nombre:"Mueble WC principal",unidad:"und",precio:25000},
  {id:"e9",nombre:"Mueble WC social",unidad:"und",precio:25000},{id:"e10",nombre:"Vestier enfrentado",unidad:"und",precio:110000},
  {id:"e11",nombre:"Vestier en L",unidad:"und",precio:110000},{id:"e12",nombre:"Vestier en U",unidad:"und",precio:150000},
  {id:"e13",nombre:"Mueble alto cocina",unidad:"und",precio:0},{id:"e14",nombre:"Mueble bajo cocina",unidad:"und",precio:0},
  {id:"e15",nombre:"Mueble isla",unidad:"und",precio:0},{id:"e16",nombre:"Mueble lavadero",unidad:"und",precio:30000},
  {id:"e17",nombre:"Zócalo",unidad:"ml",precio:2500},
];
const USUARIOS_DEFAULT=[
  {id:"sa1",nombre:"César Betancur",rol:ROLES.SUPERADMIN,email:"cesar@obra.com",pin:"1111",cedula:"3113410458",telefono:"",banco:"",cuenta:""},
  {id:"sa2",nombre:"Sandra Marin",rol:ROLES.SUPERADMIN,email:"sandra@obra.com",pin:"2222",cedula:"3006903514",telefono:"",banco:"",cuenta:""},
  {id:"sa3",nombre:"Andres Londoño",rol:ROLES.SUPERADMIN,email:"andres@obra.com",pin:"3333",cedula:"3189180703",telefono:"",banco:"",cuenta:""},
  {id:"sa4",nombre:"Luz Toro",rol:ROLES.SUPERADMIN,email:"luz@obra.com",pin:"4444",cedula:"3046063039",telefono:"",banco:"",cuenta:""},
  {id:"ax1",nombre:"Lauren Zapata",rol:ROLES.AUXILIAR,email:"lauren@obra.com",pin:"5555",cedula:"3180803364",telefono:"",banco:"",cuenta:""},
  {id:"i01",nombre:"Albeiro De Jesús Sanchez Alvarez",rol:ROLES.INSTALADOR,email:"3366950@obra.com",pin:"6950",cedula:"3366950",telefono:"",banco:"",cuenta:""},
  {id:"i02",nombre:"Arnovis Enrique Romero Gaviria",rol:ROLES.INSTALADOR,email:"10889524@obra.com",pin:"9524",cedula:"10889524",telefono:"",banco:"",cuenta:""},
  {id:"i03",nombre:"Alejandro Caballero Navas",rol:ROLES.INSTALADOR,email:"1041894977@obra.com",pin:"4977",cedula:"1041894977",telefono:"",banco:"",cuenta:""},
  {id:"i04",nombre:"Andrés Polo Gomez",rol:ROLES.INSTALADOR,email:"72238095@obra.com",pin:"8095",cedula:"72238095",telefono:"",banco:"",cuenta:""},
  {id:"i05",nombre:"Angie Guisela Gonzales Toro",rol:ROLES.INSTALADOR,email:"32209550@obra.com",pin:"9550",cedula:"32209550",telefono:"",banco:"",cuenta:""},
  {id:"i06",nombre:"Carlos Albeiro Bedoya",rol:ROLES.INSTALADOR,email:"98537380@obra.com",pin:"7380",cedula:"98537380",telefono:"",banco:"",cuenta:""},
  {id:"i07",nombre:"Claudia Marcela Uribe Lopez",rol:ROLES.INSTALADOR,email:"1112765279@obra.com",pin:"5279",cedula:"1112765279",telefono:"",banco:"",cuenta:""},
  {id:"i08",nombre:"Claudia Patricia Higuita Muñoz",rol:ROLES.INSTALADOR,email:"43164453@obra.com",pin:"4453",cedula:"43164453",telefono:"",banco:"",cuenta:""},
  {id:"i09",nombre:"Cristian Alexis Marin Gonzales",rol:ROLES.INSTALADOR,email:"1015278020@obra.com",pin:"8020",cedula:"1015278020",telefono:"",banco:"",cuenta:""},
  {id:"i10",nombre:"Elfa Nataly Rueda Vargas",rol:ROLES.INSTALADOR,email:"43991850@obra.com",pin:"1850",cedula:"43991850",telefono:"",banco:"",cuenta:""},
  {id:"i11",nombre:"Erika Baza Camacho",rol:ROLES.INSTALADOR,email:"1096195897@obra.com",pin:"5897",cedula:"1096195897",telefono:"",banco:"",cuenta:""},
  {id:"i12",nombre:"Emiliano De Jesus Callejas Rios",rol:ROLES.INSTALADOR,email:"70541496@obra.com",pin:"1496",cedula:"70541496",telefono:"",banco:"",cuenta:""},
  {id:"i13",nombre:"Greis Pola Jaraba Correa",rol:ROLES.INSTALADOR,email:"1045691681@obra.com",pin:"1681",cedula:"1045691681",telefono:"",banco:"",cuenta:""},
  {id:"i14",nombre:"Harrison Martinez Lopez",rol:ROLES.INSTALADOR,email:"1053796113@obra.com",pin:"6113",cedula:"1053796113",telefono:"",banco:"",cuenta:""},
  {id:"i15",nombre:"Jose Alfredo Taborda Marin",rol:ROLES.INSTALADOR,email:"1033337255@obra.com",pin:"7255",cedula:"1033337255",telefono:"",banco:"",cuenta:""},
  {id:"i16",nombre:"José Gabriel Mesa Martínez",rol:ROLES.INSTALADOR,email:"98642537@obra.com",pin:"2537",cedula:"98642537",telefono:"",banco:"",cuenta:""},
  {id:"i17",nombre:"Jose Luis Basanta Coa",rol:ROLES.INSTALADOR,email:"1258625@obra.com",pin:"8625",cedula:"1258625",telefono:"",banco:"",cuenta:""},
  {id:"i18",nombre:"Jorge Leonardo Viloria Romero",rol:ROLES.INSTALADOR,email:"1104413901@obra.com",pin:"3901",cedula:"1104413901",telefono:"",banco:"",cuenta:""},
  {id:"i19",nombre:"Juan Carlos Cardenas Vega",rol:ROLES.INSTALADOR,email:"1098813472@obra.com",pin:"3472",cedula:"1098813472",telefono:"",banco:"",cuenta:""},
  {id:"i20",nombre:"Juan Martin Osorio Saldarriaga",rol:ROLES.INSTALADOR,email:"71646955@obra.com",pin:"6955",cedula:"71646955",telefono:"",banco:"",cuenta:""},
  {id:"i21",nombre:"Kateryn Carmona",rol:ROLES.INSTALADOR,email:"1214743439@obra.com",pin:"3439",cedula:"1214743439",telefono:"",banco:"",cuenta:""},
  {id:"i22",nombre:"Leder De Jesus Herrera Arrieta",rol:ROLES.INSTALADOR,email:"1104410561@obra.com",pin:"0561",cedula:"1104410561",telefono:"",banco:"",cuenta:""},
  {id:"i23",nombre:"Leider Arturo Herrera Arrieta",rol:ROLES.INSTALADOR,email:"1005677345@obra.com",pin:"7345",cedula:"1005677345",telefono:"",banco:"",cuenta:""},
  {id:"i24",nombre:"Leon Jaime Taborda Marin",rol:ROLES.INSTALADOR,email:"1033339839@obra.com",pin:"9839",cedula:"1033339839",telefono:"",banco:"",cuenta:""},
  {id:"i25",nombre:"Luis Alberto Goez Goez",rol:ROLES.INSTALADOR,email:"1152453118@obra.com",pin:"3118",cedula:"1152453118",telefono:"",banco:"",cuenta:""},
  {id:"i26",nombre:"Luis Felipe Meza Martinez",rol:ROLES.INSTALADOR,email:"1148205348@obra.com",pin:"5348",cedula:"1148205348",telefono:"",banco:"",cuenta:""},
  {id:"i27",nombre:"Luis Fernando Aguirre Giraldo",rol:ROLES.INSTALADOR,email:"71698074@obra.com",pin:"8074",cedula:"71698074",telefono:"",banco:"",cuenta:""},
  {id:"i28",nombre:"Maria Luz Dary Rincon",rol:ROLES.INSTALADOR,email:"66916338@obra.com",pin:"6338",cedula:"66916338",telefono:"",banco:"",cuenta:""},
  {id:"i29",nombre:"Mario Lemus Arboleda",rol:ROLES.INSTALADOR,email:"1001846248@obra.com",pin:"6248",cedula:"1001846248",telefono:"",banco:"",cuenta:""},
  {id:"i30",nombre:"Nelson Dario Correa Acosta",rol:ROLES.INSTALADOR,email:"98527601@obra.com",pin:"7601",cedula:"98527601",telefono:"",banco:"",cuenta:""},
  {id:"i31",nombre:"Omar De Jesus Ortiz Montoya",rol:ROLES.INSTALADOR,email:"98528420@obra.com",pin:"8420",cedula:"98528420",telefono:"",banco:"",cuenta:""},
  {id:"i32",nombre:"Oscar Mauricio Lopez",rol:ROLES.INSTALADOR,email:"98538605@obra.com",pin:"8605",cedula:"98538605",telefono:"",banco:"",cuenta:""},
  {id:"i33",nombre:"Oved Dario Pulgarin",rol:ROLES.INSTALADOR,email:"98693472@obra.com",pin:"3472",cedula:"98693472",telefono:"",banco:"",cuenta:""},
  {id:"i34",nombre:"Steve Brahayan Alvarez Reyes",rol:ROLES.INSTALADOR,email:"PT1277581@obra.com",pin:"7581",cedula:"PT-1277581",telefono:"",banco:"",cuenta:""},
  {id:"i35",nombre:"Pedro Felix Moreno Cortes",rol:ROLES.INSTALADOR,email:"98457089@obra.com",pin:"7089",cedula:"98457089",telefono:"",banco:"",cuenta:""},
  {id:"i36",nombre:"Robinson Alberto Orozco Muñoz",rol:ROLES.INSTALADOR,email:"71386134@obra.com",pin:"6134",cedula:"71386134",telefono:"",banco:"",cuenta:""},
  {id:"i37",nombre:"Yefferson Sanchez Henao",rol:ROLES.INSTALADOR,email:"1214720944@obra.com",pin:"0944",cedula:"1214720944",telefono:"",banco:"",cuenta:""},
];

const fmt=n=>new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",maximumFractionDigits:0}).format(n||0);

function getCorteFechas(){
  const hoy=new Date(),y=hoy.getFullYear(),m=hoy.getMonth();
  const cortes=[];
  [-2,-1,0,1].forEach(d=>{
    const mm=m+d,yr=mm<0?y-1:mm>11?y+1:y,mr=((mm%12)+12)%12;
    const dias=new Date(yr,mr+1,0).getDate();
    cortes.push({label:`1–13 ${new Date(yr,mr,13).toLocaleString("es-CO",{month:"long",year:"numeric"})}`,desde:new Date(yr,mr,1),hasta:new Date(yr,mr,13)});
    cortes.push({label:`14–${Math.min(28,dias)} ${new Date(yr,mr,Math.min(28,dias)).toLocaleString("es-CO",{month:"long",year:"numeric"})}`,desde:new Date(yr,mr,14),hasta:new Date(yr,mr,Math.min(28,dias))});
  });
  return cortes.sort((a,b)=>b.desde-a.desde).slice(0,10);
}
function fechaDentroCorte(fs,desde,hasta){if(!fs)return false;const[d,m,y]=fs.split("/").map(Number);const f=new Date(y,m-1,d);return f>=desde&&f<=hasta;}

// ─── UI COMPONENTS ────────────────────────────────────────
function Badge({color,children}){const m={green:"green",orange:"orange",amber:"amber",coral:"red",gray:"gray",purple:"gray",blue:"gray"};return<span style={badge(m[color]||"gray")}>{children}</span>;}

function Modal({title,onClose,children,wide}){
  useEffect(()=>{document.body.style.overflow="hidden";return()=>{document.body.style.overflow="";};},[]);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:C.white,borderRadius:16,border:`1px solid ${C.gray200}`,maxWidth:wide?720:560,width:"94%",maxHeight:"88vh",overflowY:"auto",padding:"1.5rem",boxSizing:"border-box",boxShadow:"0 16px 48px rgba(0,0,0,0.18)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:600,color:C.black}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:24,color:C.gray400,lineHeight:1}}>×</button>
        </div>
        <div style={{color:C.black}}>{children}</div>
      </div>
    </div>
  );
}
// Orden correcto: Nombres primero, apellidos después
function Input({label,...props}){return<div style={{marginBottom:14}}>{label&&<label style={{fontSize:12,color:C.gray500,display:"block",marginBottom:4,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.04em"}}>{label}</label>}<input style={inputSt}{...props}/></div>;}
function Select({label,children,...props}){return<div style={{marginBottom:14}}>{label&&<label style={{fontSize:12,color:C.gray500,display:"block",marginBottom:4,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.04em"}}>{label}</label>}<select style={selectSt}{...props}>{children}</select></div>;}
function Btn({children,onClick,variant="default",disabled,style:st={}}){const v=btnV[variant]||btnV.default;return<button onClick={onClick} disabled={disabled} style={{...v,borderRadius:8,padding:"8px 16px",cursor:disabled?"not-allowed":"pointer",fontSize:14,fontWeight:500,opacity:disabled?0.45:1,fontFamily:"system-ui",...st}}>{children}</button>;}
function Notif({notifs,setNotifs}){
  if(!notifs.length)return null;
  return<div style={{position:"fixed",top:16,right:16,zIndex:99999,display:"flex",flexDirection:"column",gap:8,maxWidth:320}}>
    {notifs.map(n=><div key={n.id} style={{background:n.tipo==="success"?C.greenL:C.orangeL,border:`1px solid ${n.tipo==="success"?"#BBF7D0":C.orangeMid}`,borderRadius:10,padding:"12px 16px",display:"flex",gap:10,boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>
      <span style={{color:n.tipo==="success"?C.greenD:C.orangeD}}>{n.tipo==="success"?"✓":"🔔"}</span>
      <div style={{flex:1,fontSize:13,color:n.tipo==="success"?C.greenD:C.orangeD}}>{n.msg}</div>
      <button onClick={()=>setNotifs(ns=>ns.filter(x=>x.id!==n.id))} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.gray400}}>×</button>
    </div>)}
  </div>;
}

// ─── APP ──────────────────────────────────────────────────
export default function App(){
  const[user,setUser]=useState(()=>{try{const s=localStorage.getItem("gob_session");return s?JSON.parse(s):null;}catch{return null;}});
  const[obras,setObras]=useState([]);
  const[elementos,setElementos]=useState([]);
  const[usuarios,setUsuarios]=useState([]);
  const[liquidaciones,setLiquidaciones]=useState([]);
  const[loading,setLoading]=useState(true);
  const[view,setView]=useState("obras");
  const[selectedObra,setSelectedObra]=useState(null);
  const[selectedPiso,setSelectedPiso]=useState(null);
  const[selectedApto,setSelectedApto]=useState(null);
  const[modals,setModals]=useState({});
  const[loginData,setLoginData]=useState({email:"",pin:""});
  const[loginError,setLoginError]=useState("");
  const[notifs,setNotifs]=useState([]);

  const openModal=k=>setModals(m=>({...m,[k]:true}));
  const closeModal=k=>setModals(m=>({...m,[k]:false}));
  const pushNotif=(msg,tipo="info")=>{const id=Date.now();setNotifs(ns=>[...ns,{id,msg,tipo}]);setTimeout(()=>setNotifs(ns=>ns.filter(x=>x.id!==id)),5000);};

  async function loadAll(){
    setLoading(true);
    try{
      const[u,e,o,l]=await Promise.all([dbGet("usuarios"),dbGet("elementos"),dbGet("obras"),dbGet("liquidaciones")]);
      if(!u.length){await Promise.all(USUARIOS_DEFAULT.map(x=>dbUpsert("usuarios",x)));setUsuarios(USUARIOS_DEFAULT);}else setUsuarios(u);
      if(!e.length){await Promise.all(ELEMENTOS_DEFAULT.map(x=>dbUpsert("elementos",x)));setElementos(ELEMENTOS_DEFAULT);}else setElementos(e);
      setObras(o.map(ob=>({...ob,tipologias:ob.tipologias||[],pisos:ob.pisos||[],instaladoresAutorizados:ob.instaladores_autorizados||[],solicitudes:ob.solicitudes||[],preciosOverride:ob.precios_override||{},coordinadorId:ob.coordinador_id||""})));
      setLiquidaciones(l);
    }catch{pushNotif("Error conectando","error");}
    setLoading(false);
  }
  useEffect(()=>{
    loadAll();
    const channel = supaRealtime();
    return ()=>{ channel.unsubscribe(); };
  },[]);

  function supaRealtime(){
    const{createClient}=window.supabase||{};
    try{
      const client=window._supaClient||(window._supaClient=window.supabase.createClient(SUPA_URL,SUPA_KEY));
      const channel=client.channel("db-changes")
        .on("postgres_changes",{event:"*",schema:"public",table:"obras"},()=>dbGet("obras").then(o=>setObras(o.map(ob=>({...ob,tipologias:ob.tipologias||[],pisos:ob.pisos||[],instaladoresAutorizados:ob.instaladores_autorizados||[],solicitudes:ob.solicitudes||[],preciosOverride:ob.precios_override||{},coordinadorId:ob.coordinador_id||""})))))
        .on("postgres_changes",{event:"*",schema:"public",table:"usuarios"},()=>dbGet("usuarios").then(u=>setUsuarios(u)))
        .on("postgres_changes",{event:"*",schema:"public",table:"elementos"},()=>dbGet("elementos").then(e=>setElementos(e)))
        .on("postgres_changes",{event:"*",schema:"public",table:"liquidaciones"},()=>dbGet("liquidaciones").then(l=>setLiquidaciones(l)))
        .subscribe();
      return channel;
    }catch(e){console.warn("Realtime no disponible",e);return{unsubscribe:()=>{}};}
  }

  async function saveObra(o){await dbUpsert("obras",{id:o.id,nombre:o.nombre,direccion:o.direccion,estado:o.estado,tipologias:o.tipologias||[],pisos:o.pisos||[],instaladores_autorizados:o.instaladoresAutorizados||[],solicitudes:o.solicitudes||[],precios_override:o.preciosOverride||{},coordinador_id:o.coordinadorId||""});}
  async function updateObra(obraId,updater){setObras(obs=>{const updated=obs.map(o=>o.id===obraId?updater(o):o);const obra=updated.find(o=>o.id===obraId);if(obra)saveObra(obra);return updated;});}

  function login(){const u=usuarios.find(x=>x.email===loginData.email&&x.pin===loginData.pin);if(u){setUser(u);localStorage.setItem("gob_session",JSON.stringify(u));setLoginError("");}else setLoginError("Correo o PIN incorrecto");}
  function logout(){setUser(null);localStorage.removeItem("gob_session");}

  function getPrecio(elementoId,obraId,corteLabel){const o=obras.find(x=>x.id===obraId);const k=`${corteLabel}__${elementoId}`;if(o?.preciosOverride?.[k]!==undefined)return o.preciosOverride[k];return elementos.find(e=>e.id===elementoId)?.precio||0;}

  function calcAvanceObra(obra){let t=0,c=0;obra.pisos?.forEach(p=>p.aptos?.forEach(a=>a.elementos?.forEach(el=>{t++;if(el.completado)c++;})));return t===0?0:Math.round(c/t*100);}
  function calcAvanceApto(apto){const t=apto.elementos?.length||0,c=apto.elementos?.filter(e=>e.completado).length||0;return t===0?0:Math.round(c/t*100);}

  if(loading)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"system-ui",background:C.black}}><div style={{width:60,height:60,background:C.orange,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🏗️</div><p style={{color:C.white,fontSize:16}}>Cargando...</p></div>;
  if(!user)return<LoginScreen loginData={loginData} setLoginData={setLoginData} login={login} error={loginError}/>;

  const shared={obras,setObras,updateObra,saveObra,elementos,setElementos,usuarios,setUsuarios,openModal,closeModal,modals,pushNotif,user,liquidaciones,setLiquidaciones,loadAll,getPrecio};

  return(
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:920,margin:"0 auto",padding:"1rem",background:C.gray50,minHeight:"100vh"}}>
      <Notif notifs={notifs} setNotifs={setNotifs}/>
      <Header user={user} logout={logout} view={view} setView={setView} selectedObra={selectedObra} setSelectedObra={setSelectedObra} setSelectedPiso={setSelectedPiso} setSelectedApto={setSelectedApto} usuarios={usuarios}/>
      {view==="obras"&&<ObrasView{...shared}calcAvanceObra={calcAvanceObra}setSelectedObra={o=>{setSelectedObra(o);setView("obra_detalle");}}/>}
      {view==="obra_detalle"&&selectedObra&&<ObraDetalle{...shared}obra={obras.find(o=>o.id===selectedObra.id)||selectedObra}calcAvanceApto={calcAvanceApto}setSelectedApto={(a,p)=>{setSelectedApto(a);setSelectedPiso(p);setView("apto_detalle");}}/>}
      {view==="apto_detalle"&&selectedApto&&selectedObra&&<AptoDetalle{...shared}apto={selectedApto}piso={selectedPiso}obra={obras.find(o=>o.id===selectedObra.id)}calcAvanceApto={calcAvanceApto}/>}
      {view==="elementos"&&user.rol===ROLES.SUPERADMIN&&<ElementosView{...shared}/>}
      {view==="liquidacion"&&<LiquidacionView{...shared}calcAvanceObra={calcAvanceObra}/>}
      {view==="usuarios"&&user.rol===ROLES.SUPERADMIN&&<UsuariosView{...shared}/>}
    </div>
  );
}

function LoginScreen({loginData,setLoginData,login,error}){
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${C.black} 0%,${C.gray800} 100%)`,fontFamily:"system-ui"}}>
      <div style={{background:C.white,borderRadius:20,padding:"2.5rem",width:360,boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:64,height:64,background:C.orange,borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:30}}>🏗️</div>
          <h2 style={{margin:0,fontSize:22,fontWeight:700,color:C.black}}>Gestión de Obras</h2>
          <p style={{margin:"8px 0 0",fontSize:14,color:C.gray500}}>Ingresa con tu correo y PIN</p>
        </div>
        <Input label="Correo" type="email" placeholder="cedula@obra.com" value={loginData.email} onChange={e=>setLoginData(d=>({...d,email:e.target.value}))}/>
        <Input label="PIN" type="password" placeholder="••••" value={loginData.pin} onChange={e=>setLoginData(d=>({...d,pin:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&login()}/>
        {error&&<p style={{color:C.red,fontSize:13,margin:"-8px 0 12px"}}>{error}</p>}
        <button onClick={login} style={{...btnV.primary,width:"100%",padding:"12px",fontSize:15,borderRadius:10,fontWeight:600,fontFamily:"system-ui",cursor:"pointer"}}>Ingresar</button>
      </div>
    </div>
  );
}

function Header({user,logout,view,setView,selectedObra,setSelectedObra,setSelectedPiso,setSelectedApto}){
  const rolLabel={superadmin:"Superadmin",supervisor:"Supervisor",auxiliar:"Auxiliar",instalador:"Instalador"};
  const nav=[{key:"obras",label:"Obras",roles:[ROLES.SUPERADMIN,ROLES.SUPERVISOR,ROLES.AUXILIAR,ROLES.INSTALADOR]},{key:"elementos",label:"Elementos",roles:[ROLES.SUPERADMIN]},{key:"liquidacion",label:"Liquidación",roles:[ROLES.SUPERADMIN,ROLES.SUPERVISOR,ROLES.AUXILIAR,ROLES.INSTALADOR]},{key:"usuarios",label:"Usuarios",roles:[ROLES.SUPERADMIN]}];
  return(
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,padding:"12px 18px",background:C.black,borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:38,height:38,background:C.orange,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏗️</div>
          <div>
            <div style={{fontWeight:600,fontSize:15,color:C.white}}>{user.nombre}</div>
            <span style={{...badge("orange"),fontSize:11,padding:"2px 8px"}}>{rolLabel[user.rol]}</span>
          </div>
        </div>
        <button onClick={logout} style={{background:"transparent",border:`1px solid ${C.gray700}`,color:C.gray300,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:13,fontFamily:"system-ui"}}>Salir</button>
      </div>
      {(view==="obra_detalle"||view==="apto_detalle")&&(
        <div style={{fontSize:13,color:C.gray500,marginBottom:8,display:"flex",gap:6,alignItems:"center",padding:"0 4px"}}>
          <span style={{cursor:"pointer",color:C.orange,fontWeight:600}} onClick={()=>{setView("obras");setSelectedObra(null);setSelectedPiso(null);setSelectedApto(null);}}>Obras</span>
          {selectedObra&&<><span style={{color:C.gray300}}>›</span><span style={{cursor:"pointer",color:view==="apto_detalle"?C.orange:C.black,fontWeight:500}} onClick={()=>{setView("obra_detalle");setSelectedPiso(null);setSelectedApto(null);}}>{selectedObra.nombre}</span></>}
          {view==="apto_detalle"&&<><span style={{color:C.gray300}}>›</span><span style={{color:C.black}}>Apartamento</span></>}
        </div>
      )}
      <div style={{display:"flex",gap:4,borderBottom:`2px solid ${C.gray200}`,paddingBottom:0,background:C.white,borderRadius:"8px 8px 0 0",padding:"4px 4px 0"}}>
        {nav.filter(n=>n.roles.includes(user.rol)).map(n=>(
          <button key={n.key} onClick={()=>setView(n.key)} style={{background:"transparent",color:view===n.key?C.orange:C.gray500,border:"none",borderBottom:view===n.key?`2.5px solid ${C.orange}`:"2.5px solid transparent",borderRadius:0,padding:"10px 16px",cursor:"pointer",fontSize:14,fontWeight:view===n.key?600:400,marginBottom:-2,transition:"color 0.15s",fontFamily:"system-ui"}}>{n.label}</button>
        ))}
      </div>
    </div>
  );
}

function ObrasView({obras,setObras,updateObra,saveObra,user,usuarios,calcAvanceObra,setSelectedObra,openModal,closeModal,modals,pushNotif}){
  const[form,setForm]=useState({nombre:"",direccion:"",coordinadorId:"",pisos:1,aptosPorPiso:1});
  const[accesoModal,setAccesoModal]=useState(null);
  const[confirmDelete,setConfirmDelete]=useState(null);
  const[editObra,setEditObra]=useState(null);
  const[editObraForm,setEditObraForm]=useState({nombre:"",direccion:"",coordinadorId:""});
  const superadmins=usuarios.filter(u=>u.rol===ROLES.SUPERADMIN);
  const instaladores=usuarios.filter(u=>u.rol===ROLES.INSTALADOR);

  async function crearObra(){
    if(!form.nombre)return;
    const pisos=Array.from({length:Number(form.pisos)},(_,pi)=>({id:`p${Date.now()}${pi}`,numero:pi+1,aptos:Array.from({length:Number(form.aptosPorPiso)},(_,ai)=>({id:`a${Date.now()}${pi}${ai}`,numero:ai+1,nombre:`${pi+1}${String(ai+1).padStart(2,"0")}`,tipologia:"",elementos:[]}))}));
    const nueva={id:`obra${Date.now()}`,nombre:form.nombre,direccion:form.direccion,coordinadorId:form.coordinadorId,pisos,estado:"activa",tipologias:[],instaladoresAutorizados:[],solicitudes:[],preciosOverride:{}};
    await saveObra(nueva);setObras(obs=>[...obs,nueva]);setForm({nombre:"",direccion:"",coordinadorId:"",pisos:1,aptosPorPiso:1});closeModal("nuevaObra");
  }
  async function editarObra(){
    if(!editObraForm.nombre)return;
    await updateObra(editObra,o=>({...o,nombre:editObraForm.nombre,direccion:editObraForm.direccion,coordinadorId:editObraForm.coordinadorId}));
    pushNotif("Obra actualizada","success");setEditObra(null);
  }
  async function eliminarObra(obraId){
    await dbDelete("obras",obraId);setObras(obs=>obs.filter(o=>o.id!==obraId));setConfirmDelete(null);pushNotif("Obra eliminada","success");
  }
  async function solicitarAcceso(obraId){
    await updateObra(obraId,o=>{if((o.solicitudes||[]).find(s=>s.userId===user.id))return o;return{...o,solicitudes:[...(o.solicitudes||[]),{userId:user.id,fecha:new Date().toLocaleDateString("es-CO"),estado:"pendiente"}]};});
    pushNotif("Solicitud enviada","success");
  }

  const obrasVisibles=obras.filter(o=>user.rol!==ROLES.INSTALADOR||(o.instaladoresAutorizados||[]).includes(user.id));
  const obrasSinAcceso=user.rol===ROLES.INSTALADOR?obras.filter(o=>!(o.instaladoresAutorizados||[]).includes(user.id)):[];

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.black}}>Obras</h2>
        {user.rol===ROLES.SUPERADMIN&&<Btn variant="primary" onClick={()=>openModal("nuevaObra")}>+ Nueva obra</Btn>}
      </div>
      {obrasVisibles.length===0&&user.rol!==ROLES.INSTALADOR&&(
        <div style={{textAlign:"center",padding:"4rem",color:C.gray400,background:C.white,borderRadius:12,border:`1px solid ${C.gray200}`}}>
          <div style={{fontSize:48,marginBottom:12}}>🏢</div><p style={{fontSize:16}}>No hay obras registradas</p>
          {user.rol===ROLES.SUPERADMIN&&<Btn variant="primary" onClick={()=>openModal("nuevaObra")}>Crear primera obra</Btn>}
        </div>
      )}
      <div style={{display:"grid",gap:14,marginBottom:24}}>
        {obrasVisibles.map(obra=>{
          const av=calcAvanceObra(obra),totalAptos=obra.pisos?.reduce((a,p)=>a+(p.aptos?.length||0),0)||0;
          const coord=usuarios.find(u=>u.id===obra.coordinadorId);
          const pends=(obra.solicitudes||[]).filter(s=>s.estado==="pendiente").length;
          return(
            <div key={obra.id} style={{...card,cursor:"pointer",transition:"border-color 0.15s,box-shadow 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.orange;e.currentTarget.style.boxShadow=`0 4px 20px rgba(249,115,22,0.12)`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.gray200;e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.06)";}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}} onClick={()=>setSelectedObra(obra)}>
                <div>
                  <div style={{fontWeight:700,fontSize:17,marginBottom:2,color:C.black}}>{obra.nombre}</div>
                  <div style={{fontSize:13,color:C.gray500}}>{obra.direccion}</div>
                  {coord&&<div style={{fontSize:12,color:C.orange,marginTop:3,fontWeight:600}}>👤 {coord.nombre}</div>}
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  {pends>0&&user.rol===ROLES.SUPERADMIN&&<span onClick={e=>{e.stopPropagation();setAccesoModal(obra.id);}} style={{...badge("amber"),cursor:"pointer"}}>{pends} sol.</span>}
                  <span style={badge("green")}>{obra.estado}</span>
                  {user.rol===ROLES.SUPERADMIN&&<>
                    <button onClick={e=>{e.stopPropagation();setEditObraForm({nombre:obra.nombre,direccion:obra.direccion,coordinadorId:obra.coordinadorId||""});setEditObra(obra.id);}} style={{...badge("gray"),cursor:"pointer",border:`1px solid ${C.gray200}`}}>✎</button>
                    <button onClick={e=>{e.stopPropagation();setAccesoModal(obra.id);}} style={{...badge("gray"),cursor:"pointer",border:`1px solid ${C.gray200}`}}>👷</button>
                    <button onClick={e=>{e.stopPropagation();setConfirmDelete(obra.id);}} style={{...badge("red"),cursor:"pointer"}}>🗑</button>
                  </>}
                </div>
              </div>
              <div style={{display:"flex",gap:20,marginTop:16,fontSize:13,alignItems:"center"}} onClick={()=>setSelectedObra(obra)}>
                <span style={{color:C.gray500,fontWeight:500}}>{obra.pisos?.length||0} pisos · {totalAptos} aptos</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{color:C.gray400,fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Avance</span>
                    <span style={{fontWeight:700,fontSize:14,color:av===100?C.green:C.orange}}>{av}%</span>
                  </div>
                  <div style={{height:8,background:C.gray100,borderRadius:10,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${av}%`,background:av===100?C.green:C.orange,borderRadius:10,transition:"width 0.4s"}}/>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {user.rol===ROLES.INSTALADOR&&obrasSinAcceso.length>0&&(
        <div>
          <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:600,color:C.gray500}}>Obras disponibles — solicitar acceso</h3>
          {obrasSinAcceso.map(obra=>{
            const sol=obra.solicitudes?.find(s=>s.userId===user.id);
            return<div key={obra.id} style={{...card,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div><div style={{fontWeight:600,fontSize:14}}>{obra.nombre}</div><div style={{fontSize:13,color:C.gray500}}>{obra.direccion}</div></div>
              {!sol&&<Btn onClick={()=>solicitarAcceso(obra.id)}>Solicitar acceso</Btn>}
              {sol?.estado==="pendiente"&&<span style={badge("amber")}>Solicitud pendiente</span>}
              {sol?.estado==="rechazado"&&<span style={badge("red")}>Acceso denegado</span>}
            </div>;
          })}
        </div>
      )}

      {editObra&&<Modal title="Editar obra" onClose={()=>setEditObra(null)}>
        <Input label="Nombre" value={editObraForm.nombre} onChange={e=>setEditObraForm(f=>({...f,nombre:e.target.value}))}/>
        <Input label="Dirección" value={editObraForm.direccion} onChange={e=>setEditObraForm(f=>({...f,direccion:e.target.value}))}/>
        <Select label="Coordinador" value={editObraForm.coordinadorId} onChange={e=>setEditObraForm(f=>({...f,coordinadorId:e.target.value}))}>
          <option value="">— Sin asignar —</option>
          {superadmins.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Select>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><Btn onClick={()=>setEditObra(null)}>Cancelar</Btn><Btn variant="primary" onClick={editarObra}>Guardar cambios</Btn></div>
      </Modal>}

      {confirmDelete&&<Modal title="Confirmar eliminación" onClose={()=>setConfirmDelete(null)}>
        <p style={{fontSize:14,color:C.gray700,marginBottom:20}}>¿Estás seguro de que deseas eliminar esta obra? Se perderán todos los datos. Esta acción no se puede deshacer.</p>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><Btn onClick={()=>setConfirmDelete(null)}>Cancelar</Btn><Btn variant="danger" onClick={()=>eliminarObra(confirmDelete)}>Sí, eliminar</Btn></div>
      </Modal>}

      {accesoModal&&<Modal title={`Accesos — ${obras.find(o=>o.id===accesoModal)?.nombre}`} onClose={()=>setAccesoModal(null)} wide>
        {(()=>{
          const obra=obras.find(o=>o.id===accesoModal)||{};
          const pends=(obra.solicitudes||[]).filter(s=>s.estado==="pendiente");
          return<div>
            {pends.length>0&&<div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:10,color:"#B45309"}}>Solicitudes pendientes</div>
              {pends.map(s=>{const inst=usuarios.find(u=>u.id===s.userId);return<div key={s.userId} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.amberL,border:"1px solid #FDE68A",borderRadius:10,marginBottom:8}}>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{inst?.nombre}</div><div style={{fontSize:12,color:C.gray500}}>{s.fecha}</div></div>
                <Btn variant="success" onClick={()=>{updateObra(accesoModal,o=>({...o,solicitudes:(o.solicitudes||[]).map(x=>x.userId===s.userId?{...x,estado:"aprobado"}:x),instaladoresAutorizados:[...new Set([...(o.instaladoresAutorizados||[]),s.userId])]}));pushNotif(`Acceso aprobado para ${inst?.nombre}`,"success");}}>Aprobar</Btn>
                <Btn variant="danger" onClick={()=>updateObra(accesoModal,o=>({...o,solicitudes:(o.solicitudes||[]).map(x=>x.userId===s.userId?{...x,estado:"rechazado"}:x)}))}>Rechazar</Btn>
              </div>;})}
            </div>}
            <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Todos los instaladores</div>
            <div style={{display:"grid",gap:8,maxHeight:360,overflowY:"auto"}}>
              {instaladores.map(inst=>{
                const aut=(obra.instaladoresAutorizados||[]).includes(inst.id);
                return<div key={inst.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:aut?C.greenL:C.gray50,border:`1px solid ${aut?"#BBF7D0":C.gray200}`,borderRadius:10}}>
                  <div style={{width:36,height:36,borderRadius:50,background:aut?C.green:C.gray300,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:C.white,flexShrink:0}}>{inst.nombre.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{inst.nombre}</div><div style={{fontSize:12,color:C.gray500}}>C.C. {inst.cedula||"—"}</div></div>
                  <button onClick={()=>updateObra(accesoModal,o=>{const a=o.instaladoresAutorizados||[];return{...o,instaladoresAutorizados:a.includes(inst.id)?a.filter(id=>id!==inst.id):[...a,inst.id]};})} style={{...badge(aut?"red":"green"),cursor:"pointer"}}>{aut?"Revocar":"Dar acceso"}</button>
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
        <Select label="Coordinador responsable" value={form.coordinadorId} onChange={e=>setForm(f=>({...f,coordinadorId:e.target.value}))}>
          <option value="">— Seleccionar —</option>
          {superadmins.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Select>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Número de pisos" type="number" min="1" max="50" value={form.pisos} onChange={e=>setForm(f=>({...f,pisos:e.target.value}))}/>
          <Input label="Aptos por piso" type="number" min="1" max="20" value={form.aptosPorPiso} onChange={e=>setForm(f=>({...f,aptosPorPiso:e.target.value}))}/>
        </div>
        <p style={{fontSize:12,color:C.gray400,margin:"-8px 0 14px"}}>Podrás editar aptos por piso después de crear la obra.</p>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><Btn onClick={()=>closeModal("nuevaObra")}>Cancelar</Btn><Btn variant="primary" onClick={crearObra}>Crear obra</Btn></div>
      </Modal>}
    </div>
  );
}

function ObraDetalle({obra,obras,updateObra,user,calcAvanceApto,elementos,usuarios,setSelectedApto,openModal,closeModal,modals,pushNotif,getPrecio}){
  const[editTip,setEditTip]=useState(null);
  const[tipForm,setTipForm]=useState({nombre:"",elementoIds:[]});
  const[replicaSel,setReplicaSel]=useState({reglas:[]});
  const[replicaModal,setReplicaModal]=useState(false);
  const[asignando,setAsignando]=useState(null);
  const[accesoObraModal,setAccesoObraModal]=useState(false);
  const[vistaInstalador,setVistaInstalador]=useState(null);
  const[editPisoModal,setEditPisoModal]=useState(null);
  const[preciosModal,setPreciosModal]=useState(false);
  const[preciosCorte,setPreciosCorte]=useState("");
  const[preciosTmp,setPreciosTmp]=useState({});
  const currentObra=obras.find(o=>o.id===obra.id)||obra;
  const tipologias=currentObra.tipologias||[];
  const numerosApto=[...new Set(currentObra.pisos?.flatMap(p=>p.aptos?.map(a=>String(a.numero)))||[])].sort((a,b)=>Number(a)-Number(b));
  const cortes=getCorteFechas();
  const instaladoresActivos=(currentObra.instaladoresAutorizados||[]).map(id=>usuarios.find(u=>u.id===id)).filter(Boolean);

  function abrirNuevaTip(){setEditTip(null);setTipForm({nombre:"",elementoIds:[]});openModal("tipModal");}
  function abrirEditTip(t){setEditTip(t.id);setTipForm({nombre:t.nombre,elementoIds:[...t.elementoIds]});openModal("tipModal");}

  async function guardarTip(){
    if(!tipForm.nombre)return;
    if(editTip){await updateObra(obra.id,o=>({...o,tipologias:(o.tipologias||[]).map(t=>t.id===editTip?{...t,nombre:tipForm.nombre,elementoIds:tipForm.elementoIds}:t),pisos:o.pisos.map(p=>({...p,aptos:p.aptos.map(a=>{if(a.tipologia!==editTip)return a;return{...a,elementos:tipForm.elementoIds.map(eid=>a.elementos?.find(e=>e.elementoId===eid)||{elementoId:eid,completado:false,instaladorId:null,fecha:null,cantidad:1})};})}))}));}
    else{const t={id:`t${Date.now()}`,nombre:tipForm.nombre,elementoIds:tipForm.elementoIds};await updateObra(obra.id,o=>({...o,tipologias:[...(o.tipologias||[]),t]}));}
    pushNotif("Tipología guardada","success");closeModal("tipModal");setEditTip(null);
  }

  async function asignarInstaladorApto(pisoId, aptoId, instaladorId){
    await updateObra(obra.id, o=>({...o, pisos:o.pisos.map(p=>p.id!==pisoId?p:{...p, aptos:p.aptos.map(a=>a.id!==aptoId?a:{...a, instaladorAsignado:instaladorId||null})})}));
    pushNotif(instaladorId?"Instalador asignado":"Instalador removido","success");
  }
  async function asignarTipologia(pisoId,aptoId,tipId){
    const tip=tipologias.find(t=>t.id===tipId);
    const nuevosEls=(tip?.elementoIds||[]).map(eid=>({elementoId:eid,completado:false,instaladorId:null,fecha:null,cantidad:1}));
    await updateObra(obra.id,o=>({...o,pisos:o.pisos.map(p=>p.id!==pisoId?p:{...p,aptos:p.aptos.map(a=>a.id!==aptoId?a:{...a,tipologia:tipId,elementos:nuevosEls})})}));
    setAsignando(null);
  }

  function quitarTipologiaApto(pisoId, aptoId) {
    updateObra(obra.id, o => ({...o, pisos: o.pisos.map(p => p.id !== pisoId ? p : {...p, aptos: p.aptos.map(a => a.id !== aptoId ? a : {...a, tipologia: "", elementos: []})})}));
  }

  async function replicarEnSerie(){
    let count=0;
    await updateObra(obra.id,o=>({...o,pisos:o.pisos.map(p=>({...p,aptos:p.aptos.map(a=>{const regla=replicaSel.reglas.find(r=>r.sufijo===String(a.numero)&&r.tipId);if(!regla)return a;const tip=tipologias.find(t=>t.id===regla.tipId);if(!tip)return a;count++;return{...a,tipologia:tip.id,elementos:tip.elementoIds.map(eid=>a.elementos?.find(e=>e.elementoId===eid)||{elementoId:eid,completado:false,instaladorId:null,fecha:null,cantidad:1})};})}))}));
    pushNotif(`Replicadas en ${count} apto(s)`,"success");setReplicaModal(false);setReplicaSel({reglas:[]});
  }

  async function agregarApto(pisoId){await updateObra(obra.id,o=>({...o,pisos:o.pisos.map(p=>{if(p.id!==pisoId)return p;const num=p.aptos.length+1;return{...p,aptos:[...p.aptos,{id:`a${Date.now()}`,numero:num,nombre:`${p.numero}${String(num).padStart(2,"0")}`,tipologia:"",elementos:[]}]};})}));}
  async function eliminarApto(pisoId,aptoId){await updateObra(obra.id,o=>({...o,pisos:o.pisos.map(p=>p.id!==pisoId?p:{...p,aptos:p.aptos.filter(a=>a.id!==aptoId)})}));}
  async function renombrarApto(pisoId,aptoId,nombre){await updateObra(obra.id,o=>({...o,pisos:o.pisos.map(p=>p.id!==pisoId?p:{...p,aptos:p.aptos.map(a=>a.id!==aptoId?a:{...a,nombre})})}));}

  function guardarPrecios(){
    if(!preciosCorte)return;
    updateObra(obra.id,o=>({...o,preciosOverride:{...(o.preciosOverride||{}),...Object.fromEntries(Object.entries(preciosTmp).map(([eid,v])=>[`${preciosCorte}__${eid}`,Number(v)]))}}));
    pushNotif("Precios guardados","success");setPreciosModal(false);setPreciosTmp({});
  }

  if(user.rol===ROLES.INSTALADOR){
    const misAptos=currentObra.pisos?.flatMap(p=>p.aptos?.filter(a=>a.instaladorAsignado===user.id)||[])||[];
    const aptosDisponibles=currentObra.pisos?.flatMap(p=>p.aptos?.filter(a=>!a.instaladorAsignado&&a.tipologia)||[])||[];

    async function tomarApto(pisoId, aptoId){
      await updateObra(obra.id, o=>({...o, pisos:o.pisos.map(p=>p.id!==pisoId?p:{...p, aptos:p.aptos.map(a=>a.id!==aptoId?a:{...a, instaladorAsignado:user.id})})}));
      pushNotif("Apartamento tomado","success");
    }

    return(
      <div>
        <div style={{marginBottom:18}}><h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.black}}>{obra.nombre}</h2><p style={{margin:"4px 0 0",fontSize:13,color:C.gray500}}>{obra.direccion}</p></div>

        {misAptos.length>0&&<>
          <div style={{fontSize:12,fontWeight:700,color:C.gray500,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Mis apartamentos</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:24}}>
            {misAptos.map(apto=>{
              const piso=currentObra.pisos?.find(p=>p.aptos?.some(a=>a.id===apto.id));
              const av=calcAvanceApto(apto);const tip=tipologias?.find(t=>t.id===apto.tipologia);
              return<div key={apto.id} onClick={()=>piso&&setSelectedApto(apto,piso)} style={{...card,cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.orange} onMouseLeave={e=>e.currentTarget.style.borderColor=C.gray200}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{apto.nombre||apto.id}</div>
                {tip&&<div style={{fontSize:11,color:C.gray500,marginBottom:6}}>{tip.nombre}</div>}
                <div style={{height:5,background:C.gray100,borderRadius:10,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${av}%`,background:av===100?C.green:C.orange,borderRadius:10}}/></div>
                <div style={{fontSize:11,color:C.gray400,fontWeight:600}}>{av}%</div>
              </div>;
            })}
          </div>
        </>}

        {aptosDisponibles.length>0&&<>
          <div style={{fontSize:12,fontWeight:700,color:C.gray500,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Apartamentos disponibles</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
            {aptosDisponibles.map(apto=>{
              const piso=currentObra.pisos?.find(p=>p.aptos?.some(a=>a.id===apto.id));
              const tip=tipologias?.find(t=>t.id===apto.tipologia);
              return<div key={apto.id} style={{...card,background:C.gray50,border:`1px dashed ${C.gray300}`}}>
                <div style={{fontWeight:700,fontSize:14,marginBottom:4,color:C.gray500}}>{apto.nombre||apto.id}</div>
                {tip&&<div style={{fontSize:11,color:C.gray400,marginBottom:8}}>{tip.nombre}</div>}
                <button onClick={()=>piso&&tomarApto(piso.id,apto.id)} style={{...badge("orange"),cursor:"pointer",fontSize:11,width:"100%",textAlign:"center"}}>Tomar apto</button>
              </div>;
            })}
          </div>
        </>}

        {misAptos.length===0&&aptosDisponibles.length===0&&<div style={{textAlign:"center",padding:"3rem",color:C.gray400,background:C.white,borderRadius:12,border:`1px solid ${C.gray200}`}}><p>No hay apartamentos disponibles aún.</p></div>}
      </div>
    );
  }

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div><h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.black}}>{obra.nombre}</h2><p style={{margin:"4px 0 0",fontSize:13,color:C.gray500}}>{obra.direccion}</p></div>
        {user.rol===ROLES.SUPERADMIN&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={()=>{setPreciosTmp({});setPreciosCorte("");setPreciosModal(true);}}>💰 Precios</Btn>
          <Btn onClick={()=>setAccesoObraModal(true)}>👷 Accesos</Btn>
          <Btn onClick={()=>setReplicaModal(true)}>Replicar</Btn>
          <Btn variant="primary" onClick={abrirNuevaTip}>+ Tipología</Btn>
        </div>}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:16,borderBottom:`2px solid ${C.gray200}`,paddingBottom:0}}>
        <button onClick={()=>setVistaInstalador(null)} style={{background:"transparent",color:!vistaInstalador?C.orange:C.gray500,border:"none",borderBottom:!vistaInstalador?`2.5px solid ${C.orange}`:"2.5px solid transparent",padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:!vistaInstalador?600:400,marginBottom:-2,fontFamily:"system-ui"}}>Vista general</button>
        {instaladoresActivos.map(inst=><button key={inst.id} onClick={()=>setVistaInstalador(inst.id)} style={{background:"transparent",color:vistaInstalador===inst.id?C.green:C.gray500,border:"none",borderBottom:vistaInstalador===inst.id?`2.5px solid ${C.green}`:"2.5px solid transparent",padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:vistaInstalador===inst.id?600:400,marginBottom:-2,fontFamily:"system-ui"}}>{inst.nombre.split(" ")[0]}</button>)}
      </div>

      {tipologias.length>0&&<div style={{marginBottom:18,padding:"12px 16px",background:C.white,borderRadius:10,border:`1px solid ${C.gray200}`}}>
        <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:C.gray500,textTransform:"uppercase",letterSpacing:"0.06em"}}>Tipologías</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {tipologias.map(t=><div key={t.id} style={{display:"flex",alignItems:"center",gap:6,...badge("orange")}}>
            <span>{t.nombre} · {t.elementoIds?.length||0} elem.</span>
            {user.rol===ROLES.SUPERADMIN&&<span onClick={()=>abrirEditTip(t)} style={{cursor:"pointer",fontWeight:700}}>✎</span>}
          </div>)}
        </div>
      </div>}

      {currentObra.pisos?.map(piso=>{
        const aptosVista=vistaInstalador?piso.aptos?.filter(a=>a.elementos?.some(el=>el.instaladorId===vistaInstalador)):piso.aptos;
        if(vistaInstalador&&!aptosVista?.length)return null;
        return(
          <div key={piso.id} style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,borderBottom:`2px solid ${C.gray100}`,paddingBottom:8}}>
              <div style={{fontSize:13,fontWeight:700,color:C.gray500,textTransform:"uppercase",letterSpacing:"0.06em"}}>Piso {piso.numero}</div>
              {user.rol===ROLES.SUPERADMIN&&!vistaInstalador&&<button onClick={()=>setEditPisoModal(piso.id)} style={{...badge("gray"),cursor:"pointer",border:`1px solid ${C.gray200}`,fontSize:11}}>✎ Editar aptos</button>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10}}>
              {aptosVista?.map(apto=>{
                const av=calcAvanceApto(apto),tip=tipologias?.find(t=>t.id===apto.tipologia);
                const instaladorApto=apto.elementos?.find(el=>el.instaladorId&&!el.esAdicional)?.instaladorId;
                const instNombre=instaladorApto?usuarios.find(u=>u.id===instaladorApto)?.nombre?.split(" ")[0]:null;
                return(
                  <div key={apto.id} onClick={()=>apto.tipologia?setSelectedApto(apto,piso):null} style={{...card,cursor:apto.tipologia?"pointer":"default",padding:"10px 12px"}} onMouseEnter={e=>apto.tipologia&&(e.currentTarget.style.borderColor=C.orange)} onMouseLeave={e=>(e.currentTarget.style.borderColor=C.gray200)}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{apto.nombre||`${piso.numero}${String(apto.numero).padStart(2,"0")}`}</div>
                    {instNombre&&<div style={{fontSize:10,color:C.orange,marginBottom:4,fontWeight:600}}>👷 {instNombre}</div>}
                    {tip?(<>
                      <div style={{fontSize:10,color:C.gray500,marginBottom:5}}>{tip.nombre}</div>
                      <div style={{height:5,background:C.gray100,borderRadius:10,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${av}%`,background:av===100?C.green:C.orange,borderRadius:10}}/></div>
                      <div style={{fontSize:10,color:C.gray400,fontWeight:600,marginBottom:4}}>{av}%</div>
                      {user.rol!==ROLES.AUXILIAR&&(
                        <div style={{display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
                          <select style={{fontSize:9,padding:"2px 3px",border:`1px solid ${C.gray200}`,borderRadius:4,flex:1,color:C.gray500}} defaultValue="" onChange={e=>{if(e.target.value)asignarTipologia(piso.id,apto.id,e.target.value);}}>
                            <option value="">Cambiar...</option>
                            {tipologias?.filter(t=>t.id!==apto.tipologia).map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}
                          </select>
                          <button onClick={e=>{e.stopPropagation();quitarTipologiaApto(piso.id,apto.id);}} style={{fontSize:9,background:C.redL,border:"1px solid #FECACA",color:C.red,borderRadius:4,padding:"2px 5px",cursor:"pointer"}}>✕</button>
                        </div>
                      )}
                    </>):user.rol!==ROLES.AUXILIAR?(
                      asignando===apto.id?<select style={{width:"100%",fontSize:10,marginTop:4,padding:"3px",border:`1px solid ${C.gray200}`,borderRadius:6}} onClick={e=>e.stopPropagation()} onChange={e=>e.target.value&&asignarTipologia(piso.id,apto.id,e.target.value)}><option value="">Seleccionar...</option>{tipologias?.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
                      :<button onClick={e=>{e.stopPropagation();setAsignando(apto.id);}} style={{fontSize:10,...badge("orange"),cursor:"pointer",marginTop:4}}>+ tipología</button>
                    ):<div style={{fontSize:10,color:C.gray400}}>Sin asignar</div>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {editPisoModal&&(()=>{const piso=currentObra.pisos?.find(p=>p.id===editPisoModal);return<Modal title={`Editar apartamentos — Piso ${piso?.numero}`} onClose={()=>setEditPisoModal(null)} wide>
        <div style={{display:"grid",gap:8,marginBottom:16,maxHeight:300,overflowY:"auto"}}>
          {piso?.aptos?.map(apto=><div key={apto.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.gray50,border:`1px solid ${C.gray200}`,borderRadius:8}}>
            <input value={apto.nombre||`${piso.numero}${String(apto.numero).padStart(2,"0")}`} onChange={e=>renombrarApto(editPisoModal,apto.id,e.target.value)} style={{flex:1,padding:"5px 8px",border:`1px solid ${C.gray200}`,borderRadius:6,fontSize:14}}/>
            <button onClick={()=>eliminarApto(editPisoModal,apto.id)} style={{...badge("red"),cursor:"pointer"}}>✕</button>
          </div>)}
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <Btn onClick={()=>agregarApto(editPisoModal)}>+ Agregar apartamento</Btn>
          <Btn variant="primary" onClick={()=>setEditPisoModal(null)}>Listo</Btn>
        </div>
      </Modal>;})()||null}

      {preciosModal&&<Modal title={`Precios por corte — ${obra.nombre}`} onClose={()=>setPreciosModal(false)} wide>
        <Select label="Corte de pago" value={preciosCorte} onChange={e=>{setPreciosCorte(e.target.value);setPreciosTmp({});}}>
          <option value="">— Seleccionar corte —</option>
          {cortes.map((c,i)=><option key={i} value={c.label}>{c.label}</option>)}
        </Select>
        {preciosCorte&&<>
          <p style={{fontSize:13,color:C.gray500,margin:"0 0 12px"}}>Modifica el precio para este corte en esta obra.</p>
          <div style={{maxHeight:300,overflowY:"auto",display:"grid",gap:8}}>
            {elementos.map(el=>{const k=`${preciosCorte}__${el.id}`;const ov=currentObra.preciosOverride?.[k];return<div key={el.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.gray50,borderRadius:8}}>
              <div style={{flex:1,fontSize:14}}>{el.nombre} <span style={{fontSize:12,color:C.gray400}}>({fmt(el.precio)} estándar)</span></div>
              <input type="number" min="0" placeholder={String(el.precio)} value={preciosTmp[el.id]??ov??""} onChange={e=>setPreciosTmp(t=>({...t,[el.id]:e.target.value}))} style={{width:110,padding:"5px 8px",border:`1px solid ${C.gray200}`,borderRadius:6,fontSize:13,textAlign:"right"}}/>
            </div>;})}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:16}}><Btn onClick={()=>setPreciosModal(false)}>Cancelar</Btn><Btn variant="primary" onClick={guardarPrecios}>Guardar precios</Btn></div>
        </>}
      </Modal>}

      {accesoObraModal&&<Modal title={`Accesos — ${currentObra.nombre}`} onClose={()=>setAccesoObraModal(false)} wide>
        {(()=>{
          const pends=(currentObra.solicitudes||[]).filter(s=>s.estado==="pendiente");
          const instaladores=usuarios.filter(u=>u.rol===ROLES.INSTALADOR);
          return<div>
            {pends.length>0&&<div style={{marginBottom:20}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:10,color:"#B45309"}}>Solicitudes pendientes</div>
              {pends.map(s=>{const inst=usuarios.find(u=>u.id===s.userId);return<div key={s.userId} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.amberL,border:"1px solid #FDE68A",borderRadius:10,marginBottom:8}}>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{inst?.nombre}</div><div style={{fontSize:12,color:C.gray500}}>{s.fecha}</div></div>
                <Btn variant="success" onClick={()=>{updateObra(obra.id,o=>({...o,solicitudes:(o.solicitudes||[]).map(x=>x.userId===s.userId?{...x,estado:"aprobado"}:x),instaladoresAutorizados:[...new Set([...(o.instaladoresAutorizados||[]),s.userId])]}));pushNotif(`Aprobado ${inst?.nombre}`,"success");}}>Aprobar</Btn>
                <Btn variant="danger" onClick={()=>updateObra(obra.id,o=>({...o,solicitudes:(o.solicitudes||[]).map(x=>x.userId===s.userId?{...x,estado:"rechazado"}:x)}))}>Rechazar</Btn>
              </div>;})}
            </div>}
            <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>Todos los instaladores</div>
            <div style={{display:"grid",gap:8,maxHeight:360,overflowY:"auto"}}>
              {instaladores.map(inst=>{const aut=(currentObra.instaladoresAutorizados||[]).includes(inst.id);return<div key={inst.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:aut?C.greenL:C.gray50,border:`1px solid ${aut?"#BBF7D0":C.gray200}`,borderRadius:10}}>
                <div style={{width:36,height:36,borderRadius:50,background:aut?C.green:C.gray300,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:C.white,flexShrink:0}}>{inst.nombre.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{inst.nombre}</div><div style={{fontSize:12,color:C.gray500}}>C.C. {inst.cedula||"—"}</div></div>
                <button onClick={()=>updateObra(obra.id,o=>{const a=o.instaladoresAutorizados||[];return{...o,instaladoresAutorizados:a.includes(inst.id)?a.filter(id=>id!==inst.id):[...a,inst.id]};})} style={{...badge(aut?"red":"green"),cursor:"pointer"}}>{aut?"Revocar":"Dar acceso"}</button>
              </div>;})}
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><Btn onClick={()=>setAccesoObraModal(false)}>Cerrar</Btn></div>
          </div>;
        })()}
      </Modal>}

      {modals.tipModal&&<Modal title={editTip?"Editar tipología":"Nueva tipología"} onClose={()=>closeModal("tipModal")}>
        <Input label="Nombre" value={tipForm.nombre} onChange={e=>setTipForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Tipo A — 3 alcobas"/>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,color:C.gray500,display:"block",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"}}>Elementos incluidos</label>
          <div style={{maxHeight:260,overflowY:"auto",border:`1px solid ${C.gray200}`,borderRadius:8,padding:8,background:C.white}}>
            {elementos.map(el=><label key={el.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 8px",cursor:"pointer",fontSize:14,borderRadius:6,background:tipForm.elementoIds.includes(el.id)?C.orangeL:"transparent"}}>
              <input type="checkbox" checked={tipForm.elementoIds.includes(el.id)} onChange={e=>setTipForm(f=>({...f,elementoIds:e.target.checked?[...f.elementoIds,el.id]:f.elementoIds.filter(x=>x!==el.id)}))}/>
              <span style={{flex:1,color:C.black}}>{el.nombre}</span>
              <span style={{fontSize:12,color:C.gray400}}>{el.unidad} · {fmt(el.precio)}</span>
            </label>)}
          </div>
          <div style={{fontSize:12,color:C.gray400,marginTop:6}}>{tipForm.elementoIds.length} elemento(s) seleccionado(s)</div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><Btn onClick={()=>closeModal("tipModal")}>Cancelar</Btn><Btn variant="primary" onClick={guardarTip}>{editTip?"Guardar cambios":"Crear"}</Btn></div>
      </Modal>}

      {replicaModal&&<Modal title="Replicar tipologías por número" onClose={()=>setReplicaModal(false)} wide>
        <p style={{fontSize:13,color:C.gray500,margin:"0 0 16px"}}>Asigna una tipología a cada número de apartamento en todos los pisos.</p>
        <div style={{display:"grid",gap:10,marginBottom:16}}>
          {numerosApto.map(sufijo=>{
            const regla=replicaSel.reglas.find(r=>r.sufijo===sufijo),tipId=regla?.tipId||"";
            const cantidad=currentObra.pisos?.reduce((n,p)=>n+(p.aptos?.filter(a=>String(a.numero)===sufijo).length||0),0);
            return<div key={sufijo} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:tipId?C.orangeL:C.gray50,border:`1px solid ${tipId?C.orangeMid:C.gray200}`,borderRadius:10}}>
              <div style={{minWidth:80}}><div style={{fontWeight:700,fontSize:14,color:tipId?C.orangeD:C.black}}>Apto ×{sufijo}</div><div style={{fontSize:12,color:C.gray400}}>{cantidad} apto(s)</div></div>
              <select style={{flex:1,padding:"7px 10px",border:`1px solid ${C.gray200}`,borderRadius:8,fontSize:14}} value={tipId} onChange={e=>{const val=e.target.value;setReplicaSel(r=>{const n=r.reglas.filter(x=>x.sufijo!==sufijo);if(val)n.push({sufijo,tipId:val});return{reglas:n};});}}>
                <option value="">— Sin asignar —</option>
                {tipologias.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              {tipId&&<span style={{fontSize:18,color:C.orange,fontWeight:700}}>✓</span>}
            </div>;
          })}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:C.gray400}}>{replicaSel.reglas.filter(r=>r.tipId).length} asignado(s)</span>
          <div style={{display:"flex",gap:10}}><Btn onClick={()=>setReplicaModal(false)}>Cancelar</Btn><Btn variant="primary" disabled={!replicaSel.reglas.filter(r=>r.tipId).length} onClick={replicarEnSerie}>Aplicar</Btn></div>
        </div>
      </Modal>}
    </div>
  );
}

function AptoDetalle({apto,piso,obra,obras,updateObra,user,elementos,usuarios,calcAvanceApto,pushNotif,getPrecio}){
  const currentObra=obras.find(o=>o.id===obra.id);
  const currentPiso=currentObra?.pisos?.find(p=>p.id===piso.id);
  const currentApto=currentPiso?.aptos?.find(a=>a.id===apto.id)||apto;
  const tip=currentObra?.tipologias?.find(t=>t.id===currentApto.tipologia);
  const av=calcAvanceApto(currentApto);
  const supervisores=usuarios.filter(u=>u.rol===ROLES.SUPERVISOR);
  const[pendientes,setPendientes]=useState({});
  const[cantidades,setCantidades]=useState({});
  const[ajusteLocal,setAjusteLocal]=useState({pasajes:"",bonificacion:""});
  const[nuevoAdicional,setNuevoAdicional]=useState({descripcion:"",cantidad:1,valorUnitario:0});
  const[agregarAdicional,setAgregarAdicional]=useState(false);
  const hayPendientes=Object.keys(pendientes).length>0||ajusteLocal.pasajes||ajusteLocal.bonificacion;
  const canToggle=(idx)=>{const el=currentApto.elementos?.[idx];if(!el||el.completado)return false;return[ROLES.INSTALADOR,ROLES.SUPERADMIN,ROLES.SUPERVISOR].includes(user.rol);};
  const canEdit=user.rol===ROLES.SUPERADMIN||user.rol===ROLES.SUPERVISOR;
  const corteActual=getCorteFechas()[0];

  function togglePendiente(idx){if(!canToggle(idx))return;setPendientes(p=>{const c={...p};if(c[idx]!==undefined)delete c[idx];else c[idx]=true;return c;});}

  async function guardarCambios(){
    await updateObra(obra.id,o=>({...o,pisos:o.pisos.map(p=>{if(p.id!==piso.id)return p;return{...p,aptos:p.aptos.map(a=>{if(a.id!==apto.id)return a;
      const newEls=a.elementos.map((el,i)=>{let u={...el};if(cantidades[i]!==undefined)u.cantidad=cantidades[i];if(pendientes[i]){u.completado=true;u.instaladorId=user.id;u.fecha=new Date().toLocaleDateString("es-CO");}return u;});
      const ajustes=[];
      if(ajusteLocal.pasajes)ajustes.push({elementoId:"__pasajes__",completado:true,instaladorId:user.id,fecha:new Date().toLocaleDateString("es-CO"),cantidad:1,valorManual:Number(ajusteLocal.pasajes),aprobado:false});
      if(ajusteLocal.bonificacion)ajustes.push({elementoId:"__bonificacion__",completado:true,instaladorId:user.id,fecha:new Date().toLocaleDateString("es-CO"),cantidad:1,valorManual:Number(ajusteLocal.bonificacion),aprobado:false});
      const newElsFinal=[...newEls.filter(e=>e.elementoId!=="__pasajes__"&&e.elementoId!=="__bonificacion__"),...ajustes];
      const allDone=newEls.filter(e=>!e.esAdicional&&!e.elementoId?.startsWith("__")).every(e=>e.completado);
      if(allDone)supervisores.forEach(s=>pushNotif(`🔔 ${s.nombre}: Apto completado en ${obra.nombre}`,"info"));
      return{...a,elementos:newElsFinal};})};})}));
    pushNotif("Guardado correctamente","success");setPendientes({});setCantidades({});setAjusteLocal({pasajes:"",bonificacion:""});
  }

  async function desmarcarElemento(idx){
    await updateObra(obra.id,o=>({...o,pisos:o.pisos.map(p=>p.id!==piso.id?p:{...p,aptos:p.aptos.map(a=>a.id!==apto.id?a:{...a,elementos:a.elementos.map((el,i)=>i!==idx?el:{...el,completado:false,instaladorId:null,fecha:null})})})}));
    pushNotif("Elemento desmarcado","success");
  }

  async function aprobarAjuste(idx){
    await updateObra(obra.id,o=>({...o,pisos:o.pisos.map(p=>p.id!==piso.id?p:{...p,aptos:p.aptos.map(a=>a.id!==apto.id?a:{...a,elementos:a.elementos.map((el,i)=>i!==idx?el:{...el,aprobado:true})})})}));
    pushNotif("Ajuste aprobado","success");
  }

  async function guardarAdicional(){
    if(!nuevoAdicional.descripcion||!nuevoAdicional.valorUnitario)return;
    const el={elementoId:`__adicional__${Date.now()}`,descripcion:nuevoAdicional.descripcion,cantidad:Number(nuevoAdicional.cantidad),valorUnitario:Number(nuevoAdicional.valorUnitario),completado:false,instaladorId:null,fecha:null,esAdicional:true,aprobado:false};
    await updateObra(obra.id,o=>({...o,pisos:o.pisos.map(p=>p.id!==piso.id?p:{...p,aptos:p.aptos.map(a=>a.id!==apto.id?a:{...a,elementos:[...(a.elementos||[]),el]})})}));
    setNuevoAdicional({descripcion:"",cantidad:1,valorUnitario:0});setAgregarAdicional(false);pushNotif("Elemento adicional agregado","success");
  }

  async function eliminarAdicional(idx){
    await updateObra(obra.id,o=>({...o,pisos:o.pisos.map(p=>p.id!==piso.id?p:{...p,aptos:p.aptos.map(a=>a.id!==apto.id?a:{...a,elementos:a.elementos.filter((_,i)=>i!==idx)})})}));
  }

  const elementosNormales=currentApto.elementos?.filter(e=>!e.esAdicional&&e.elementoId!=="__pasajes__"&&e.elementoId!=="__bonificacion__")||[];
  const elementosAdicionales=currentApto.elementos?.filter(e=>e.esAdicional)||[];
  const ajustesGuardados=currentApto.elementos?.filter(e=>e.elementoId==="__pasajes__"||e.elementoId==="__bonificacion__")||[];

  const totalNormal=elementosNormales.filter(e=>e.completado).reduce((s,el)=>s+getPrecio(el.elementoId,obra.id,corteActual.label)*(el.cantidad||1),0);
  const totalAdicionales=elementosAdicionales.filter(e=>e.completado&&e.aprobado).reduce((s,e)=>s+e.valorUnitario*e.cantidad,0);
  const totalAjustes=ajustesGuardados.filter(e=>e.aprobado).reduce((s,e)=>s+(e.valorManual||0),0);
  const totalLiquidado=totalNormal+totalAdicionales+totalAjustes;
  const totalPendiente=Object.keys(pendientes).reduce((s,idx)=>{const el=elementosNormales[parseInt(idx)];const precio=getPrecio(el?.elementoId,obra.id,corteActual.label);return s+precio*(cantidades[idx]??el?.cantidad??1);},0)+(Number(ajusteLocal.pasajes)||0)+(Number(ajusteLocal.bonificacion)||0);

  const canAct=[ROLES.INSTALADOR,ROLES.SUPERADMIN,ROLES.SUPERVISOR].includes(user.rol);

  return(
    <div>
      <div style={{marginBottom:18}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.black}}>Apto {apto.nombre||`${piso.numero}${String(apto.numero).padStart(2,"0")}`} — {tip?.nombre||"Sin tipología"}</h2>
        <p style={{margin:"4px 0 0",fontSize:13,color:C.gray500}}>{obra.nombre} · Piso {piso.numero}</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        {[["Avance",`${av}%`],["Instalados",`${elementosNormales.filter(e=>e.completado).length}/${elementosNormales.length}`],[user.rol===ROLES.INSTALADOR?"Mi liquidación":"Liquidación",fmt(totalLiquidado)]].map(([l,v])=>(
          <div key={l} style={{background:C.white,borderRadius:10,padding:"14px 16px",border:`1px solid ${C.gray200}`,boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{fontSize:11,color:C.gray400,marginBottom:4,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>{l}</div>
            <div style={{fontSize:18,fontWeight:700,color:l==="Avance"?(av===100?C.green:C.orange):l.includes("liquidación")||l==="Liquidación"?C.greenD:C.black}}>{v}</div>
          </div>
        ))}
      </div>

      {canEdit&&<div style={{marginBottom:14,padding:"10px 14px",background:C.amberL,border:"1px solid #FDE68A",borderRadius:10,fontSize:13,color:"#B45309",fontWeight:500}}>Como {user.rol} puedes desmarcar elementos con ✕ y aprobar ajustes.</div>}
      {user.rol===ROLES.INSTALADOR&&<div style={{marginBottom:14,padding:"10px 14px",background:C.orangeL,border:`1px solid ${C.orangeMid}`,borderRadius:10,fontSize:13,color:C.orangeD,fontWeight:500}}>Marca los elementos terminados y presiona <strong>Guardar</strong>.{hayPendientes&&<span style={{marginLeft:8}}>· +{fmt(totalPendiente)}</span>}</div>}

      {/* Elementos tipología */}
      <div style={{display:"grid",gap:8,marginBottom:16}}>
        {elementosNormales.map((el,idx)=>{
          const elem=elementos.find(e=>e.id===el.elementoId);
          const inst=usuarios.find(u=>u.id===el.instaladorId);
          const esPend=!!pendientes[idx],marcado=el.completado||esPend;
          const cT=canToggle(idx);
          const cantActual=cantidades[idx]??el.cantidad??1;
          const precio=getPrecio(el.elementoId,obra.id,corteActual.label);
          return(
            <div key={idx} onClick={()=>cT&&togglePendiente(idx)} style={{display:"flex",alignItems:"center",gap:12,background:el.completado?C.greenL:esPend?C.orangeL:C.white,border:`1.5px solid ${el.completado?"#BBF7D0":esPend?C.orangeMid:C.gray200}`,borderRadius:10,padding:"12px 14px",cursor:cT?"pointer":"default",transition:"all 0.12s"}}>
              <div style={{width:26,height:26,borderRadius:7,flexShrink:0,border:`2.5px solid ${el.completado?C.green:esPend?C.orange:C.gray300}`,background:el.completado?C.green:esPend?C.orange:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {marcado&&<span style={{color:C.white,fontSize:14,fontWeight:700}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14,color:el.completado?C.greenD:esPend?C.orangeD:C.black}}>{elem?.nombre||el.elementoId}</div>
                {el.completado&&inst&&<div style={{fontSize:12,color:C.greenD,fontWeight:500}}>{inst.nombre} · {el.fecha}</div>}
                {esPend&&<div style={{fontSize:12,color:C.orangeD,fontWeight:500}}>Pendiente de guardar</div>}
              </div>
              {(elem?.unidad==="ml"||elem?.unidad==="m2")&&<div onClick={e=>e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:12,color:C.gray400}}>{elem.unidad}</span>
                <input type="number" min="0.1" step="0.1" value={cantActual} disabled={el.completado&&user.rol===ROLES.INSTALADOR} onChange={e=>setCantidades(c=>({...c,[idx]:Number(e.target.value)}))} style={{width:64,textAlign:"center",fontSize:13,padding:"4px",border:`1px solid ${C.gray200}`,borderRadius:6}}/>
              </div>}
              <div style={{textAlign:"right",minWidth:90}}>
                <div style={{fontSize:14,fontWeight:700}}>{fmt(precio*cantActual)}</div>
                <div style={{fontSize:11,color:C.gray400}}>{elem?.unidad}</div>
              </div>
              {canEdit&&el.completado&&<button onClick={e=>{e.stopPropagation();desmarcarElemento(idx);}} style={{marginLeft:4,width:28,height:28,borderRadius:6,...badge("red"),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:14,fontWeight:700}}>✕</button>}
            </div>
          );
        })}
      </div>

      {/* Elementos adicionales */}
      <div style={{borderTop:`2px solid ${C.gray100}`,paddingTop:16,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,color:C.black}}>Elementos adicionales</div>
          {canAct&&<button onClick={()=>setAgregarAdicional(!agregarAdicional)} style={{...badge("orange"),cursor:"pointer"}}>+ Agregar</button>}
        </div>
        {agregarAdicional&&<div style={{background:C.orangeL,border:`1px solid ${C.orangeMid}`,borderRadius:10,padding:"14px",marginBottom:12}}>
          <Input label="Descripción" value={nuevoAdicional.descripcion} onChange={e=>setNuevoAdicional(n=>({...n,descripcion:e.target.value}))} placeholder="Ej: Arreglo puerta, corte moldura..."/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="Cantidad" type="number" min="0.1" step="0.1" value={nuevoAdicional.cantidad} onChange={e=>setNuevoAdicional(n=>({...n,cantidad:e.target.value}))}/>
            <Input label="Valor unitario ($)" type="number" min="0" value={nuevoAdicional.valorUnitario} onChange={e=>setNuevoAdicional(n=>({...n,valorUnitario:e.target.value}))}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:C.greenD,fontWeight:700}}>Total: {fmt(Number(nuevoAdicional.cantidad)*Number(nuevoAdicional.valorUnitario))}</span>
            <div style={{display:"flex",gap:8}}><Btn onClick={()=>setAgregarAdicional(false)}>Cancelar</Btn><Btn variant="primary" onClick={guardarAdicional}>Guardar</Btn></div>
          </div>
        </div>}
        {elementosAdicionales.map((el,i)=>{
          const idxReal=currentApto.elementos.indexOf(el);
          const esPend=!!pendientes[idxReal],marcado=el.completado||esPend;
          const cT=canToggle(idxReal);
          return<div key={i} style={{display:"flex",alignItems:"center",gap:12,background:el.completado?C.greenL:esPend?C.orangeL:C.white,border:`1.5px solid ${el.completado?"#BBF7D0":esPend?C.orangeMid:C.gray200}`,borderRadius:10,padding:"12px 14px",marginBottom:8,cursor:cT?"pointer":"default"}} onClick={()=>cT&&togglePendiente(idxReal)}>
            <div style={{width:26,height:26,borderRadius:7,flexShrink:0,border:`2.5px solid ${el.completado?C.green:esPend?C.orange:C.gray300}`,background:el.completado?C.green:esPend?C.orange:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {marcado&&<span style={{color:C.white,fontSize:14,fontWeight:700}}>✓</span>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14}}>{el.descripcion}</div>
              <div style={{fontSize:12,color:C.gray400}}>Adicional · cant: {el.cantidad} · {fmt(el.valorUnitario)} c/u</div>
              {el.completado&&<div style={{fontSize:12,color:C.greenD,fontWeight:500}}>{usuarios.find(u=>u.id===el.instaladorId)?.nombre} · {el.fecha}</div>}
            </div>
            <div style={{textAlign:"right",minWidth:90}}>
              <div style={{fontSize:14,fontWeight:700}}>{fmt(el.valorUnitario*el.cantidad)}</div>
            </div>
            {canEdit&&!el.completado&&<button onClick={e=>{e.stopPropagation();eliminarAdicional(idxReal);}} style={{...badge("red"),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,width:28,height:28,borderRadius:6,fontSize:14,fontWeight:700}}>✕</button>}
            {canEdit&&el.completado&&<button onClick={e=>{e.stopPropagation();desmarcarElemento(idxReal);}} style={{...badge("red"),cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,width:28,height:28,borderRadius:6,fontSize:14,fontWeight:700}}>✕</button>}
          </div>;
        })}
        {elementosAdicionales.length===0&&!agregarAdicional&&<p style={{fontSize:13,color:C.gray300,margin:0}}>Sin elementos adicionales.</p>}
      </div>

      {/* Pasajes y bonificación */}
      <div style={{borderTop:`2px solid ${C.gray100}`,paddingTop:16,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.black,marginBottom:12}}>Pasajes y Bonificación</div>
        {ajustesGuardados.map((aj,idx)=>(
          <div key={idx} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:aj.aprobado?C.greenL:C.amberL,border:`1px solid ${aj.aprobado?"#BBF7D0":"#FDE68A"}`,borderRadius:10,marginBottom:8}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:14}}>{aj.elementoId==="__pasajes__"?"Pasajes":"Bonificación"}</div>
              <div style={{fontSize:12,color:C.gray500}}>{aj.fecha} · {aj.aprobado?"✓ Aprobado":"Pendiente de aprobación"}</div>
            </div>
            <div style={{fontWeight:700,fontSize:14}}>{fmt(aj.valorManual)}</div>
            {canEdit&&!aj.aprobado&&<Btn variant="success" onClick={()=>aprobarAjuste(currentApto.elementos.indexOf(aj))}>Aprobar</Btn>}
          </div>
        ))}
        {user.rol===ROLES.INSTALADOR&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Input label="Pasajes ($)" type="number" min="0" value={ajusteLocal.pasajes} onChange={e=>setAjusteLocal(a=>({...a,pasajes:e.target.value}))} placeholder="0"/>
          <Input label="Bonificación ($)" type="number" min="0" value={ajusteLocal.bonificacion} onChange={e=>setAjusteLocal(a=>({...a,bonificacion:e.target.value}))} placeholder="0"/>
        </div>}
      </div>

      {canAct&&<div style={{position:"sticky",bottom:0,background:C.white,borderTop:`2px solid ${C.gray100}`,padding:"14px 0 4px",display:"flex",justifyContent:"flex-end",gap:10}}>
        {hayPendientes&&<span style={{fontSize:14,color:C.gray500,alignSelf:"center"}}>Listo para guardar</span>}
        <Btn variant="primary" disabled={!hayPendientes} onClick={guardarCambios} style={{padding:"10px 28px",fontSize:15,fontWeight:700}}>Guardar</Btn>
      </div>}
    </div>
  );
}

function ElementosView({elementos,setElementos,openModal,closeModal,modals}){
  const[form,setForm]=useState({nombre:"",unidad:"und",precio:0});
  const[editId,setEditId]=useState(null);
  async function guardar(){
    if(!form.nombre)return;
    const el=editId?{...elementos.find(e=>e.id===editId),...form,precio:Number(form.precio)}:{id:`e${Date.now()}`,...form,precio:Number(form.precio)};
    await dbUpsert("elementos",el);
    if(editId)setElementos(els=>els.map(e=>e.id===editId?el:e));else setElementos(els=>[...els,el]);
    setEditId(null);setForm({nombre:"",unidad:"und",precio:0});closeModal("elModal");
  }
  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.black}}>Elementos</h2>
        <Btn variant="primary" onClick={()=>{setEditId(null);setForm({nombre:"",unidad:"und",precio:0});openModal("elModal");}}>+ Nuevo</Btn>
      </div>
      <div style={{display:"grid",gap:8}}>
        {elementos.map(el=><div key={el.id} style={{...card,display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}><span style={{fontWeight:600,fontSize:14}}>{el.nombre}</span> <span style={{...badge("gray"),marginLeft:6,fontSize:11}}>{el.unidad}</span></div>
          <div style={{fontWeight:700,fontSize:14,minWidth:110,textAlign:"right",color:C.black}}>{fmt(el.precio)}</div>
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

function LiquidacionView({obras,elementos,usuarios,user,liquidaciones,setLiquidaciones,getPrecio,calcAvanceObra}){
  const cortes=getCorteFechas();
  const[corteIdx,setCorteIdx]=useState(0);
  const[exportModal,setExportModal]=useState(null);
  const[verHistorial,setVerHistorial]=useState(false);
  const corte=cortes[corteIdx];
  const instaladores=user.rol===ROLES.INSTALADOR?usuarios.filter(u=>u.id===user.id):usuarios.filter(u=>u.rol===ROLES.INSTALADOR);
  const puedeExportar=[ROLES.SUPERADMIN,ROLES.SUPERVISOR,ROLES.AUXILIAR].includes(user.rol);

  function detalleInstalador(instId,desde,hasta){
    const rows=[];
    obras.forEach(obra=>obra.pisos?.forEach(piso=>piso.aptos?.forEach(apto=>apto.elementos?.forEach(el=>{
      if(el.completado&&el.instaladorId===instId&&fechaDentroCorte(el.fecha,desde,hasta)){
        if(el.elementoId==="__pasajes__"){rows.push({obra:obra.nombre,apto:`${piso.numero}${String(apto.numero).padStart(2,"0")}`,elemento:"Pasajes",cantidad:1,precio:el.valorManual||0,fecha:el.fecha,esAjuste:true,aprobado:el.aprobado});return;}
        if(el.elementoId==="__bonificacion__"){rows.push({obra:obra.nombre,apto:`${piso.numero}${String(apto.numero).padStart(2,"0")}`,elemento:"Bonificación",cantidad:1,precio:el.valorManual||0,fecha:el.fecha,esAjuste:true,aprobado:el.aprobado});return;}
        if(el.esAdicional){rows.push({obra:obra.nombre,apto:`${piso.numero}${String(apto.numero).padStart(2,"0")}`,elemento:`[Adicional] ${el.descripcion}`,cantidad:el.cantidad||1,precio:el.valorUnitario||0,fecha:el.fecha,esAjuste:false,aprobado:true});return;}
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
    await dbUpsert("liquidaciones",liq);setLiquidaciones(ls=>[...ls,liq]);
  }

  function yaCerrada(instId){return liquidaciones.some(l=>l.inst_id===instId&&l.corte===corte.label);}

  function exportarExcel(inst,rows,resumen){
    const lines=[`Liquidación — ${inst.nombre} (C.C. ${inst.cedula}) — Corte: ${corte.label}`,`Tel: ${inst.telefono||"-"} | Banco: ${inst.banco||"-"} | Cta: ${inst.cuenta||"-"}`,"",["Obra","Apto","Elemento","Cant.","Precio","Total","Fecha"].join("\t"),...rows.map(r=>[r.obra,r.apto,r.elemento,r.cantidad,r.precio,r.precio*r.cantidad,r.fecha].join("\t")),"",["Total bruto","","","","",resumen.bruto,""].join("\t"),["Retención 10%","","","","",-resumen.retencion,""].join("\t"),["Subtotal","","","","",resumen.subtotal,""].join("\t"),["Pasajes","","","","",resumen.pasajes,""].join("\t"),["Bonificación","","","","",resumen.bonificacion,""].join("\t"),["TOTAL A PAGAR","","","","",resumen.total,""].join("\t")].join("\n");
    setExportModal({tipo:"excel",inst,rows,resumen,texto:lines});
  }
  function exportarPDF(inst,rows,resumen){setExportModal({tipo:"pdf",inst,rows,resumen});}

  return(
    <div>
      {exportModal&&<Modal title={exportModal.tipo==="pdf"?"Reporte":"Excel — Copiar"} onClose={()=>setExportModal(null)} wide>
        {exportModal.tipo==="pdf"?(<div style={{border:`1px solid ${C.gray200}`,borderRadius:12,padding:20,fontSize:13,lineHeight:1.7}}>
          <div style={{borderBottom:`3px solid ${C.orange}`,paddingBottom:12,marginBottom:16}}>
            <div style={{fontSize:18,fontWeight:700,color:C.black}}>Liquidación de instalación</div>
            <div style={{marginTop:4}}><strong>{exportModal.inst.nombre}</strong> — C.C. {exportModal.inst.cedula}</div>
            <div style={{color:C.gray500,fontSize:12}}>Tel: {exportModal.inst.telefono||"-"} · Banco: {exportModal.inst.banco||"-"} · Cta: {exportModal.inst.cuenta||"-"}</div>
            <div style={{marginTop:6}}><span style={badge("orange")}>Corte: {corte.label}</span></div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:16}}>
            <thead><tr style={{background:C.orangeL}}>{["Obra","Apto","Elemento","Cant.","P. unit.","Total","Fecha"].map(h=><th key={h} style={{padding:"7px 8px",textAlign:"left",fontWeight:700,color:C.orangeD,borderBottom:`2px solid ${C.orangeMid}`}}>{h}</th>)}</tr></thead>
            <tbody>{exportModal.rows.filter(r=>!r.esAjuste||r.aprobado).map((r,i)=><tr key={i} style={{background:i%2===0?"transparent":C.gray50}}><td style={{padding:"5px 8px"}}>{r.obra}</td><td style={{padding:"5px 8px"}}>{r.apto}</td><td style={{padding:"5px 8px"}}>{r.elemento}</td><td style={{padding:"5px 8px",textAlign:"center"}}>{r.cantidad}</td><td style={{padding:"5px 8px",textAlign:"right"}}>{fmt(r.precio)}</td><td style={{padding:"5px 8px",textAlign:"right",fontWeight:700}}>{fmt(r.precio*r.cantidad)}</td><td style={{padding:"5px 8px"}}>{r.fecha}</td></tr>)}</tbody>
          </table>
          <div style={{background:C.gray50,borderRadius:8,padding:"12px 16px",fontSize:13}}>
            {[["Total bruto instalado",exportModal.resumen.bruto],["Retención 10%",-exportModal.resumen.retencion],["Subtotal",exportModal.resumen.subtotal],exportModal.resumen.pasajes>0?["Pasajes",exportModal.resumen.pasajes]:null,exportModal.resumen.bonificacion>0?["Bonificación",exportModal.resumen.bonificacion]:null,["Total a pagar",exportModal.resumen.total]].filter(Boolean).map(([l,v],i,arr)=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:i<arr.length-1?`1px solid ${C.gray200}`:"none",fontWeight:i===arr.length-1?700:400,fontSize:i===arr.length-1?16:13,color:i===arr.length-1?C.greenD:C.black,marginTop:i===arr.length-1?6:0}}><span>{l}</span><span>{v<0?`— ${fmt(Math.abs(v))}`:fmt(v)}</span></div>
            ))}
          </div>
        </div>):(<div>
          <p style={{fontSize:13,color:C.gray500,margin:"0 0 12px"}}>Copia y pega en Excel o Google Sheets.</p>
          <textarea readOnly value={exportModal.texto} style={{width:"100%",height:260,fontFamily:"monospace",fontSize:12,padding:12,borderRadius:8,border:`1px solid ${C.gray200}`,background:C.gray50,boxSizing:"border-box",resize:"vertical"}} onFocus={e=>e.target.select()}/>
          <p style={{fontSize:12,color:C.gray400,margin:"8px 0 0"}}>Clic → Ctrl+A → Ctrl+C</p>
        </div>)}
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><Btn onClick={()=>setExportModal(null)}>Cerrar</Btn></div>
      </Modal>}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.black}}>Liquidación</h2>
        <Btn onClick={()=>setVerHistorial(!verHistorial)} variant={verHistorial?"primary":"default"}>{verHistorial?"Ver corte actual":"Historial de pagos"}</Btn>
      </div>

      {verHistorial?<HistorialLiquidaciones liquidaciones={liquidaciones} user={user} usuarios={usuarios}/>:(
        <>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:12,color:C.gray500,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Corte de pago</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {cortes.map((c,i)=><button key={i} onClick={()=>setCorteIdx(i)} style={{...badge(corteIdx===i?"orange":"gray"),cursor:"pointer",fontWeight:corteIdx===i?700:400}}>{c.label}</button>)}
            </div>
            <p style={{fontSize:12,color:C.gray400,margin:"8px 0 0"}}>Del {corte.desde.toLocaleDateString("es-CO")} al {corte.hasta.toLocaleDateString("es-CO")}</p>
          </div>
          {instaladores.map(inst=>{
            const{rows,...resumen}=calcResumenFull(inst.id),cerrada=yaCerrada(inst.id);
            return<div key={inst.id} style={{...card,marginBottom:16,borderLeft:`4px solid ${cerrada?C.green:rows.length>0?C.orange:C.gray200}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontWeight:700,fontSize:16,color:C.black}}>{inst.nombre}</div>
                  <div style={{fontSize:13,color:C.gray500,marginTop:2}}>C.C. {inst.cedula||"—"} · {inst.telefono||"—"}</div>
                  <div style={{fontSize:13,color:C.gray500}}>{inst.banco?`${inst.banco} — Cta: ${inst.cuenta}`:"Sin datos bancarios"}</div>
                  <div style={{marginTop:6,display:"flex",gap:6,flexWrap:"wrap"}}>
                    <span style={badge("green")}>Instalador</span>
                    {cerrada&&<span style={badge("green")}>✓ Cerrada</span>}
                    {resumen.pendAjustes>0&&<span style={badge("amber")}>{resumen.pendAjustes} ajuste(s) pendiente(s)</span>}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:12,color:C.gray400,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Total a pagar</div>
                  <div style={{fontSize:24,fontWeight:700,color:C.greenD}}>{fmt(resumen.total)}</div>
                </div>
              </div>
              {rows.length>0&&<div style={{borderTop:`1px solid ${C.gray200}`,paddingTop:12,marginBottom:12}}>
                {rows.map((r,i)=><div key={i} style={{display:"flex",gap:10,fontSize:13,padding:"5px 0",borderBottom:`1px solid ${C.gray100}`,flexWrap:"wrap",opacity:r.esAjuste&&!r.aprobado?0.55:1}}>
                  <span style={{color:C.gray400,minWidth:80}}>{r.obra?.substring(0,14)}</span>
                  <span style={{fontWeight:500}}>Apto {r.apto}</span>
                  <span style={{flex:1}}>{r.elemento}{r.esAjuste&&!r.aprobado&&<span style={{marginLeft:6,fontSize:11,...badge("amber")}}>pendiente</span>}</span>
                  <span style={{fontWeight:700,minWidth:90,textAlign:"right"}}>{fmt(r.precio*r.cantidad)}</span>
                </div>)}
              </div>}
              {rows.length>0&&<div style={{background:C.gray50,borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:12}}>
                {[["Total bruto instalado",resumen.bruto],["Retención 10%",-resumen.retencion],["Subtotal",resumen.subtotal],resumen.pasajes>0?["Pasajes",resumen.pasajes]:null,resumen.bonificacion>0?["Bonificación",resumen.bonificacion]:null].filter(Boolean).map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${C.gray200}`}}><span style={{color:C.gray500}}>{l}</span><span style={{fontWeight:500}}>{v<0?`— ${fmt(Math.abs(v))}`:fmt(v)}</span></div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0 0",fontWeight:700,fontSize:16,color:C.greenD}}><span>Total a pagar</span><span>{fmt(resumen.total)}</span></div>
              </div>}
              {rows.length===0&&<p style={{fontSize:13,color:C.gray300,margin:"8px 0"}}>Sin instalaciones en este corte.</p>}
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

function HistorialLiquidaciones({liquidaciones,user,usuarios}){
  const[filtroInst,setFiltroInst]=useState("");
  const[detalle,setDetalle]=useState(null);
  const instaladores=usuarios.filter(u=>u.rol===ROLES.INSTALADOR);
  const liqs=liquidaciones.filter(l=>user.rol===ROLES.INSTALADOR?l.inst_id===user.id:(!filtroInst||l.inst_id===filtroInst)).sort((a,b)=>b.id.localeCompare(a.id));
  return(
    <div>
      <h3 style={{margin:"0 0 16px",fontSize:16,fontWeight:700,color:C.black}}>Historial de liquidaciones</h3>
      {user.rol!==ROLES.INSTALADOR&&<Select label="Filtrar por instalador" value={filtroInst} onChange={e=>setFiltroInst(e.target.value)}><option value="">Todos</option>{instaladores.map(i=><option key={i.id} value={i.id}>{i.nombre}</option>)}</Select>}
      {liqs.length===0&&<p style={{fontSize:13,color:C.gray400}}>No hay liquidaciones cerradas aún.</p>}
      <div style={{display:"grid",gap:10}}>
        {liqs.map(l=><div key={l.id} style={{...card,borderLeft:`4px solid ${C.green}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:C.black}}>{l.inst_nombre}</div>
              <div style={{fontSize:12,color:C.gray500}}>C.C. {l.inst_cedula} · Corte: {l.corte}</div>
              <div style={{fontSize:12,color:C.gray500}}>Cerrado el {l.fecha_cierre} por {l.cerrado_por}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:12,color:C.gray400,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Total pagado</div>
              <div style={{fontSize:20,fontWeight:700,color:C.greenD}}>{fmt(l.total)}</div>
              <button onClick={()=>setDetalle(detalle?.id===l.id?null:l)} style={{...badge("orange"),cursor:"pointer",marginTop:4}}>{detalle?.id===l.id?"Ocultar":"Ver detalle"}</button>
            </div>
          </div>
          {detalle?.id===l.id&&<div style={{marginTop:12,borderTop:`1px solid ${C.gray200}`,paddingTop:12}}>
            {(l.rows||[]).map((r,i)=><div key={i} style={{display:"flex",gap:10,fontSize:12,padding:"4px 0",borderBottom:`1px solid ${C.gray100}`,flexWrap:"wrap"}}><span style={{color:C.gray400,minWidth:80}}>{r.obra?.substring(0,14)}</span><span>Apto {r.apto}</span><span style={{flex:1}}>{r.elemento}</span><span style={{fontWeight:700,minWidth:90,textAlign:"right"}}>{fmt(r.precio*r.cantidad)}</span></div>)}
            <div style={{marginTop:10,background:C.gray50,borderRadius:8,padding:"8px 12px",fontSize:12}}>
              {[["Total bruto",l.bruto],["Retención 10%",-l.retencion],["Subtotal",l.subtotal],l.pasajes>0?["Pasajes",l.pasajes]:null,l.bonificacion>0?["Bonificación",l.bonificacion]:null,["Total pagado",l.total]].filter(Boolean).map(([lb,v],i,arr)=>(
                <div key={lb} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontWeight:i===arr.length-1?700:400,color:i===arr.length-1?C.greenD:C.black}}><span>{lb}</span><span>{v<0?`— ${fmt(Math.abs(v))}`:fmt(v)}</span></div>
              ))}
            </div>
          </div>}
        </div>)}
      </div>
    </div>
  );
}

function UsuariosView({usuarios,setUsuarios,openModal,closeModal,modals}){
  const empty={nombre:"",email:"",rol:ROLES.INSTALADOR,pin:"",cedula:"",telefono:"",banco:"",cuenta:""};
  const[form,setForm]=useState(empty);
  const[editId,setEditId]=useState(null);
  const[confirmDeleteUser,setConfirmDeleteUser]=useState(null);
  const rolLabel={superadmin:"Superadmin",supervisor:"Supervisor",auxiliar:"Auxiliar",instalador:"Instalador"};
  const rolBadge={superadmin:"orange",supervisor:"amber",auxiliar:"gray",instalador:"green"};

  async function eliminarUsuario(id){await dbDelete("usuarios",id);setUsuarios(us=>us.filter(u=>u.id!==id));setConfirmDeleteUser(null);}
  async function guardar(){
    if(!form.nombre||!form.email||(!editId&&!form.pin))return;
    const u=editId?{...usuarios.find(x=>x.id===editId),...form}:{id:`u${Date.now()}`,...form};
    await dbUpsert("usuarios",u);
    if(editId)setUsuarios(us=>us.map(x=>x.id===editId?u:x));else setUsuarios(us=>[...us,u]);
    setForm(empty);setEditId(null);closeModal("userModal");
  }
  function editar(u){setEditId(u.id);setForm({nombre:u.nombre,email:u.email,rol:u.rol,pin:u.pin,cedula:u.cedula||"",telefono:u.telefono||"",banco:u.banco||"",cuenta:u.cuenta||""});openModal("userModal");}

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.black}}>Usuarios</h2>
        <Btn variant="primary" onClick={()=>{setEditId(null);setForm(empty);openModal("userModal");}}>+ Nuevo usuario</Btn>
      </div>
      <div style={{display:"grid",gap:8}}>
        {usuarios.map(u=><div key={u.id} style={{...card,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:50,background:u.rol===ROLES.SUPERADMIN?C.orange:u.rol===ROLES.INSTALADOR?C.green:C.gray300,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:C.white,flexShrink:0}}>{u.nombre.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14,color:C.black}}>{u.nombre}</div>
            <div style={{fontSize:13,color:C.gray500}}>{u.email}{u.cedula?` · C.C. ${u.cedula}`:""}</div>
            {u.rol===ROLES.INSTALADOR&&u.banco&&<div style={{fontSize:12,color:C.gray400}}>{u.banco} — {u.cuenta}</div>}
          </div>
          <span style={badge(rolBadge[u.rol]||"gray")}>{rolLabel[u.rol]}</span>
          <Btn onClick={()=>editar(u)}>Editar</Btn>
          <Btn variant="danger" onClick={()=>setConfirmDeleteUser(u.id)}>Eliminar</Btn>
        </div>)}
      </div>

      {confirmDeleteUser&&<Modal title="Eliminar usuario" onClose={()=>setConfirmDeleteUser(null)}>
        <p style={{fontSize:14,color:C.gray700,marginBottom:20}}>¿Estás seguro de eliminar a <strong>{usuarios.find(u=>u.id===confirmDeleteUser)?.nombre}</strong>? Esta acción no se puede deshacer.</p>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><Btn onClick={()=>setConfirmDeleteUser(null)}>Cancelar</Btn><Btn variant="danger" onClick={()=>eliminarUsuario(confirmDeleteUser)}>Sí, eliminar</Btn></div>
      </Modal>}

      {modals.userModal&&<Modal title={editId?"Editar usuario":"Nuevo usuario"} onClose={()=>closeModal("userModal")} wide>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <Input label="Nombre completo (nombres y apellidos)" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Yarlinton Arboleda Lemus"/>
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
          <div style={{fontSize:12,fontWeight:600,margin:"4px 0 10px",color:C.gray500,borderTop:`1px solid ${C.gray200}`,paddingTop:12,textTransform:"uppercase",letterSpacing:"0.06em"}}>Datos bancarios</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
            <Input label="Banco" value={form.banco} onChange={e=>setForm(f=>({...f,banco:e.target.value}))} placeholder="Ej: Bancolombia"/>
            <Input label="Número de cuenta" value={form.cuenta} onChange={e=>setForm(f=>({...f,cuenta:e.target.value}))}/>
          </div>
        </>}
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}><Btn onClick={()=>closeModal("userModal")}>Cancelar</Btn><Btn variant="primary" onClick={guardar}>{editId?"Guardar cambios":"Crear usuario"}</Btn></div>
      </Modal>}
    </div>
  );
}