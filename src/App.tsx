import { useEffect, useMemo, useRef, useState } from "react";
import { getLanguage, getLocale, setLanguage, toStoredLabel, translate } from "./translations";
import {
  eliminarInforme,
  guardarInforme,
  obtenerInformes,
  obtenerDatosCuenta,
  guardarDatosCuenta,
  type Informe
} from "./api";
import { authClient } from "./src/auth-client";
import AuthScreen from "./src/AuthScreen";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import {
  House, CalendarDays, Leaf, Timer, ChartNoAxesColumn, BookOpenText, Bell, Settings,
  CircleHelp, LayoutGrid, Plus, ChevronLeft, ChevronRight, Clock3, Check, X, Search,
  Download, Trash2, Pencil, Play, Pause, RotateCcw, Moon, Sun, Sprout, BookMarked,
  GraduationCap, Users, FileText, CircleCheck, CalendarCheck, Volume2, UserRound,
  Menu, Save, ExternalLink, Sparkles, ArrowUpRight, MoreHorizontal, ShieldCheck, Database,
  Flame, Target, MapPin, Tag, History, Upload, Quote, Globe, ChevronDown, Minus, Maximize2, Move
} from "lucide-react";

type Page = "Inicio"|"Calendario"|"Rutinas"|"Enfoque"|"Servicio"|"Discursos"|"Recordatorios"|"Reuniones"|"Estudio"|"Seguimiento"|"Perfil"|"Administrador"|"Ajustes"|"Ayuda";
type Category = "Predicación"|"Reunión"|"La Atalaya"|"Reunión semanal"|"Texto del día"|"Lectura bíblica"|"Estudio personal"|"Discurso"|"Personal";
type EventItem = {id:string;title:string;category:Category;date:string;time:string;notes:string;done:boolean;generated?:boolean};
type Report = {id:string;date:string;hours:number;minutes:number;creditHours:number;creditMinutes:number;studies:number;publications:number;videos:number;notes:string;location?:string;companion?:string};
type TalkAttachment = {id:string;name:string;type:string;size:number};
type StoredTalkAttachment = TalkAttachment & {blob:Blob};
type TalkDraft = Omit<Talk,"attachments"> & {attachments:TalkAttachment[];newFiles:File[];removeAttachmentIds:string[]};
type Talk = {id:string;title:string;kind:string;status:string;date:string;content:string;topic?:string;texts?:string;tags?:string[];attachments:TalkAttachment[]};
type FocusSession = {id:string;date:string;label:string;seconds:number};
type Reminder = {id:string;title:string;date:string;time:string;repeat:string;enabled:boolean};
type MeetingSchedule = {id:string;title:string;weekday:number;time:string};
type MeetingPreparation = {id:string;date:string;meetingType:string;assignment:string;notes:string;done:boolean};
type StudyItem = {id:string;reference:string;notes:string;done:boolean};
type StudyPlan = {id:string;title:string;goal:string;items:StudyItem[]};
type FollowUp = {id:string;dueDate:string;category:string;nextStep:string;notes:string;done:boolean};
type PersonalGoals = {weeklyStudyHours:number;monthlyServiceHours:number};
const BIBLE_VERSES = [
  { text: "Jehová está de mi parte, no tendré miedo. ¿Qué puede hacerme el hombre?", ref: "Salmo 118:6" },
  { text: "Cuando cruces las aguas, yo estaré contigo y, al atravesar los ríos, estos no te cubrirán.", ref: "Isaías 43:2" },
  { text: "Incluso cuando yo ande en medio del peligro, tú me mantendrás con vida.", ref: "Salmo 138:7" },
  { text: "Porque Jehová consolará a Sion. Traerá consuelo a todas sus ruinas.", ref: "Isaías 51:3" },
  { text: "Que el Dios que da aguante y consuelo les conceda a todos ustedes tener la misma actitud mental que tuvo Cristo Jesús.", ref: "Romanos 15:5" }
];

const TRANSLATIONS = {
  es: { title: "Hola", desc: "Un espacio tranquilo para organizar tu rutina.", verse: "Versículo del día", settings: "Ajustes", theme: "Tema", lang: "Idioma", save: "Guardar", logout: "Salir", notifTitle: "¡Es hora de tu actividad!", notifBody: "Recuerda: " },
  en: { title: "Hello", desc: "A quiet space to organize your routine.", verse: "Verse of the day", settings: "Settings", theme: "Theme", lang: "Language", save: "Save", logout: "Logout", notifTitle: "It's time for your activity!", notifBody: "Reminder: " },
  fr: { title: "Bonjour", desc: "Un espace calme pour organiser votre routine.", verse: "Verset du jour", settings: "Paramètres", theme: "Thème", lang: "Langue", save: "Enregistrer", logout: "Déconnexion", notifTitle: "Il est temps pour votre activité!", notifBody: "Rappel: " },
  pt: { title: "Olá", desc: "Um espaço tranquilo para organizar sua rotina.", verse: "Versículo do dia", settings: "Configurações", theme: "Tema", lang: "Idioma", save: "Salvar", logout: "Sair", notifTitle: "É hora da sua atividade!", notifBody: "Lembrete: " }
};

const KEY="jw-tracker-v1";
const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const today=()=>dateKey(new Date());
const uid=()=>crypto.randomUUID?.() ?? String(Date.now()+Math.random());

const nav: {name:Page;icon:typeof House}[]=[
  {name:"Inicio",icon:House},{name:"Calendario",icon:CalendarDays},{name:"Rutinas",icon:Leaf},
  {name:"Enfoque",icon:Timer},{name:"Servicio",icon:ChartNoAxesColumn},{name:"Discursos",icon:BookOpenText},
  {name:"Recordatorios",icon:Bell},{name:"Reuniones",icon:Users},{name:"Estudio",icon:BookMarked},
  {name:"Seguimiento",icon:MapPin},{name:"Perfil",icon:UserRound},{name:"Administrador",icon:ShieldCheck},
  {name:"Ajustes",icon:Settings},{name:"Ayuda",icon:CircleHelp}
];

const categories:Category[]=["Predicación","Reunión","La Atalaya","Reunión semanal","Texto del día","Lectura bíblica","Estudio personal","Discurso","Personal"];
const routineList=["Texto del día","Lectura bíblica","Estudio personal","Preparación de La Atalaya","Preparación reunión semanal","Predicación"];
const accents=["bosque","salvia","pino","graphite"] as const;
const MAX_TALK_ATTACHMENTS=5;
const MAX_TALK_ATTACHMENT_BYTES=20*1024*1024;
const ATTACHMENT_DB="jw-tracker-files-v1";
const ATTACHMENT_STORE="talk-attachments";
const attachmentExtensions=["pdf","doc","docx"];
const bibleBooks=[
 "Génesis","Éxodo","Levítico","Números","Deuteronomio","Josué","Jueces","Rut","1 Samuel","2 Samuel","1 Reyes","2 Reyes",
 "1 Crónicas","2 Crónicas","Esdras","Nehemías","Ester","Job","Salmos","Proverbios","Eclesiastés","El Cantar de los Cantares",
 "Isaías","Jeremías","Lamentaciones","Ezequiel","Daniel","Oseas","Joel","Amós","Abdías","Jonás","Miqueas","Nahúm","Habacuc",
 "Sofonías","Ageo","Zacarías","Malaquías","Mateo","Marcos","Lucas","Juan","Hechos","Romanos","1 Corintios","2 Corintios",
 "Gálatas","Efesios","Filipenses","Colosenses","1 Tesalonicenses","2 Tesalonicenses","1 Timoteo","2 Timoteo","Tito","Filemón",
 "Hebreos","Santiago","1 Pedro","2 Pedro","1 Juan","2 Juan","3 Juan","Judas","Apocalipsis"
];
const bibleBookAliases=["Gén","Gn","Éx","Ex","Lev","Lv","Núm","Num","Dt","Deut","Jos","Jue","Juec","1 Sam","1Sa","2 Sam","2Sa","1 Rey","1Re","2 Rey","2Re","1 Cr","1Cr","2 Cr","2Cr","Esd","Neh","Est","Salmos","Salmo","Sal","Sl","Prov","Pr","Ecl","Ec","Cant","Can","Is","Isa","Jer","Lam","Ez","Dan","Ose","Os","Am","Abd","Jon","Miq","Mi","Nah","Hab","Sof","Age","Zac","Mal","Mt","Mat","Mr","Mar","Lu","Lc","Jn","Jua","Hch","Hech","Ro","Rom","1 Cor","1Co","2 Cor","2Co","Gal","Ga","Ef","Fil","Flp","Col","1 Tes","1Te","2 Tes","2Te","1 Tim","1Ti","2 Tim","2Ti","Tit","Flm","Heb","Sant","Stg","1 Ped","1Pe","2 Ped","2Pe","1 Jn","1Jn","2 Jn","2Jn","3 Jn","3Jn","Jud","Apoc","Rev"];
const bibleBookPattern=[...bibleBooks,...bibleBookAliases].map(book=>book.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).sort((a,b)=>b.length-a.length).join("|");
const bibleReferencePattern=new RegExp(`(^|[^\\p{L}\\d])(${bibleBookPattern})\\s+\\d{1,3}:\\d{1,3}(?:[-–]\\d{1,3})?(?:,\\s*\\d{1,3}(?:[-–]\\d{1,3})?)*`,"giu");

const emptyState={
  events:[] as EventItem[], reports:[] as Report[], talks:[] as Talk[], reminders:[] as Reminder[], focusSessions:[] as FocusSession[],
  meetingSchedules:[] as MeetingSchedule[], meetingPreparations:[] as MeetingPreparation[], studyPlans:[] as StudyPlan[], followUps:[] as FollowUp[],
  routineDone:{} as Record<string,boolean>, goals:{weeklyStudyHours:0,monthlyServiceHours:0} as PersonalGoals,
  profile:{name:"",congregation:""}, theme:"light" as "light"|"dark",
  sound:true, accent:"bosque", lang:"es" as "es"|"en"|"fr"|"pt"
};

function load():typeof emptyState{
  try {
    const stored:unknown=JSON.parse(localStorage.getItem(KEY)||"{}");
    if(!isRecord(stored))return emptyState;
    const talks=Array.isArray(stored.talks)?stored.talks.map((talk:Talk)=>({...talk,attachments:Array.isArray(talk.attachments)?talk.attachments:[]})):emptyState.talks;
    const savedGoals=isRecord(stored.goals)?stored.goals:{};
    const lang=["es","en","fr","pt"].includes(String(stored.lang))?stored.lang as typeof emptyState.lang:emptyState.lang;
    return {...emptyState,...stored,talks,goals:{...emptyState.goals,...savedGoals},lang};
  }
  catch { return emptyState; }
}

function isRecord(value:unknown):value is Record<string,unknown>{return typeof value==="object"&&value!==null&&!Array.isArray(value)}
function isDate(value:unknown):value is string{
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const [year,month,day]=value.split("-").map(Number);
  const date=new Date(year,month-1,day,12);
  return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day;
}

function parseBackup(value:unknown):typeof emptyState{
  const backup=isRecord(value)&&isRecord(value.data)?value.data:value;
  if(!isRecord(backup))throw new Error("El archivo no contiene una copia de JW Tracker.");
  const isEvent=(item:unknown):item is EventItem=>isRecord(item)&&typeof item.id==="string"&&typeof item.title==="string"&&typeof item.category==="string"&&categories.some(category=>category===item.category)&&isDate(item.date)&&typeof item.time==="string"&&typeof item.notes==="string"&&typeof item.done==="boolean";
  const isReport=(item:unknown):item is Report=>isRecord(item)&&typeof item.id==="string"&&isDate(item.date)&&["hours","minutes","creditHours","creditMinutes","studies","publications","videos"].every(key=>typeof item[key]==="number"&&Number.isFinite(item[key])&&item[key]>=0)&&typeof item.notes==="string"&&(item.location===undefined||typeof item.location==="string")&&(item.companion===undefined||typeof item.companion==="string");
  const isAttachment=(item:unknown):item is TalkAttachment=>isRecord(item)&&typeof item.id==="string"&&typeof item.name==="string"&&typeof item.type==="string"&&typeof item.size==="number"&&Number.isFinite(item.size)&&item.size>=0;
  const isTalk=(item:unknown):item is Talk=>isRecord(item)&&typeof item.id==="string"&&typeof item.title==="string"&&typeof item.kind==="string"&&typeof item.status==="string"&&(item.date===""||isDate(item.date))&&typeof item.content==="string"&&(item.topic===undefined||typeof item.topic==="string")&&(item.texts===undefined||typeof item.texts==="string")&&(item.tags===undefined||Array.isArray(item.tags)&&item.tags.every(tag=>typeof tag==="string"))&&(item.attachments===undefined||Array.isArray(item.attachments)&&item.attachments.every(isAttachment));
  const isReminder=(item:unknown):item is Reminder=>isRecord(item)&&typeof item.id==="string"&&typeof item.title==="string"&&isDate(item.date)&&typeof item.time==="string"&&typeof item.repeat==="string"&&typeof item.enabled==="boolean";
  const isFocusSession=(item:unknown):item is FocusSession=>isRecord(item)&&typeof item.id==="string"&&isDate(item.date)&&typeof item.label==="string"&&typeof item.seconds==="number"&&Number.isFinite(item.seconds)&&item.seconds>=0;
  const isMeetingSchedule=(item:unknown):item is MeetingSchedule=>isRecord(item)&&typeof item.id==="string"&&typeof item.title==="string"&&Number.isInteger(item.weekday)&&Number(item.weekday)>=0&&Number(item.weekday)<=6&&typeof item.time==="string"&&/^\d{2}:\d{2}$/.test(item.time);
  const isMeetingPreparation=(item:unknown):item is MeetingPreparation=>isRecord(item)&&typeof item.id==="string"&&isDate(item.date)&&typeof item.meetingType==="string"&&typeof item.assignment==="string"&&typeof item.notes==="string"&&typeof item.done==="boolean";
  const isStudyItem=(item:unknown):item is StudyItem=>isRecord(item)&&typeof item.id==="string"&&typeof item.reference==="string"&&typeof item.notes==="string"&&typeof item.done==="boolean";
  const isStudyPlan=(item:unknown):item is StudyPlan=>isRecord(item)&&typeof item.id==="string"&&typeof item.title==="string"&&typeof item.goal==="string"&&Array.isArray(item.items)&&item.items.every(isStudyItem);
  const isFollowUp=(item:unknown):item is FollowUp=>isRecord(item)&&typeof item.id==="string"&&isDate(item.dueDate)&&typeof item.category==="string"&&typeof item.nextStep==="string"&&typeof item.notes==="string"&&typeof item.done==="boolean";
  if(!Array.isArray(backup.events)||!backup.events.every(isEvent)||!Array.isArray(backup.reports)||!backup.reports.every(isReport)||!Array.isArray(backup.talks)||!backup.talks.every(isTalk)||!Array.isArray(backup.reminders)||!backup.reminders.every(isReminder))throw new Error("La copia está incompleta o contiene registros no válidos.");
  const focusSessions=backup.focusSessions===undefined?[]:backup.focusSessions;
  if(!Array.isArray(focusSessions)||!focusSessions.every(isFocusSession))throw new Error("La copia contiene sesiones de enfoque no válidas.");
  const meetingSchedules=backup.meetingSchedules??[];
  const meetingPreparations=backup.meetingPreparations??[];
  const studyPlans=backup.studyPlans??[];
  const followUps=backup.followUps??[];
  if(!Array.isArray(meetingSchedules)||!meetingSchedules.every(isMeetingSchedule)||!Array.isArray(meetingPreparations)||!meetingPreparations.every(isMeetingPreparation)||!Array.isArray(studyPlans)||!studyPlans.every(isStudyPlan)||!Array.isArray(followUps)||!followUps.every(isFollowUp))throw new Error("La copia contiene datos de estudio o reuniones no válidos.");
  const goals=backup.goals??emptyState.goals;
  if(!isRecord(goals)||typeof goals.weeklyStudyHours!=="number"||!Number.isFinite(goals.weeklyStudyHours)||goals.weeklyStudyHours<0||typeof goals.monthlyServiceHours!=="number"||!Number.isFinite(goals.monthlyServiceHours)||goals.monthlyServiceHours<0)throw new Error("La copia contiene metas personales no válidas.");
  const routineDone=backup.routineDone??{};
  if(!isRecord(routineDone)||!Object.values(routineDone).every(done=>typeof done==="boolean"))throw new Error("La copia contiene rutinas no válidas.");
  const profile=backup.profile??emptyState.profile;
  if(!isRecord(profile)||typeof profile.name!=="string"||typeof profile.congregation!=="string")throw new Error("La copia contiene un perfil no válido.");
  const theme=backup.theme??emptyState.theme;
  if(theme!=="light"&&theme!=="dark")throw new Error("La copia contiene un tema no válido.");
  const requestedAccent=backup.accent??emptyState.accent;
  const accent=accents.find(item=>item===requestedAccent);
  if(!accent)throw new Error("La copia contiene un color de acento no válido.");
  const sound=backup.sound??emptyState.sound;
  if(typeof sound!=="boolean")throw new Error("La copia contiene preferencias no válidas.");
  const lang=backup.lang??emptyState.lang;
  if(typeof lang!=="string"||!["es","en","fr","pt"].includes(lang))throw new Error("La copia contiene un idioma no válido.");
  return {events:backup.events,reports:backup.reports,talks:backup.talks.map((talk:Talk)=>({...talk,attachments:[]})),reminders:backup.reminders,focusSessions,meetingSchedules,meetingPreparations,studyPlans,followUps,goals:{weeklyStudyHours:goals.weeklyStudyHours,monthlyServiceHours:goals.monthlyServiceHours},routineDone: routineDone as Record<string,boolean>,profile:{name:profile.name,congregation:profile.congregation},theme,sound,accent,lang:lang as any};
}

function dateLabel(date:string, opts:Intl.DateTimeFormatOptions={weekday:"long",day:"numeric",month:"long"}){
  return new Intl.DateTimeFormat(getLocale(),opts).format(new Date(date+"T12:00:00"));
}
function monthLabel(date:Date){return new Intl.DateTimeFormat(getLocale(),{month:"long",year:"numeric"}).format(date);}
function weekStart(){const date=new Date(today()+"T12:00:00");date.setDate(date.getDate()-((date.getDay()+6)%7));return dateKey(date);}
function meetingOccurrences(schedules:MeetingSchedule[],start:string,end:string):EventItem[]{
  const date=new Date(start+"T12:00:00");
  const finalDate=new Date(end+"T12:00:00");
  const occurrences:EventItem[]=[];
  while(date<=finalDate){
    schedules.filter(schedule=>schedule.weekday===date.getDay()).forEach(schedule=>occurrences.push({id:`meeting-${schedule.id}-${dateKey(date)}`,title:schedule.title,category:"Reunión",date:dateKey(date),time:schedule.time,notes:"Horario semanal",done:false,generated:true}));
    date.setDate(date.getDate()+1);
  }
  return occurrences;
}
function formatDuration(seconds:number){
  const minutes=Math.floor(seconds/60);
  const hours=Math.floor(minutes/60);
  const formatUnit=(value:number,unit:"hour"|"minute"|"second")=>new Intl.NumberFormat(getLocale(),{style:"unit",unit,unitDisplay:"short"}).format(value);
  if(hours)return `${formatUnit(hours,"hour")} ${formatUnit(minutes%60,"minute")}`;
  if(minutes)return formatUnit(minutes,"minute");
  return formatUnit(seconds,"second");
}
function formatFileSize(bytes:number){return bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/(1024*1024)).toFixed(1)} MB`;}
function downloadBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
function normalizeText(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function findBibleReferences(value:string):string[]{
  const references:string[]=[];
  bibleReferencePattern.lastIndex=0;
  let match:RegExpExecArray|null;
  while((match=bibleReferencePattern.exec(value))!==null)references.push(match[0].slice(match[1].length).trim());
  return [...new Set(references)];
}

function openAttachmentDatabase():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    if(!("indexedDB" in window)){reject(new Error("Este navegador no permite guardar adjuntos localmente."));return;}
    const request=window.indexedDB.open(ATTACHMENT_DB,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(ATTACHMENT_STORE))request.result.createObjectStore(ATTACHMENT_STORE,{keyPath:"id"});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error??new Error("No se pudo abrir el almacenamiento de adjuntos."));
    request.onblocked=()=>reject(new Error("El almacenamiento de adjuntos está bloqueado por otra pestaña."));
  });
}

async function updateStoredAttachments(put:StoredTalkAttachment[],removeIds:string[]):Promise<void>{
  const db=await openAttachmentDatabase();
  try{
    await new Promise<void>((resolve,reject)=>{
      const transaction=db.transaction(ATTACHMENT_STORE,"readwrite");
      const store=transaction.objectStore(ATTACHMENT_STORE);
      put.forEach(file=>store.put(file));
      removeIds.forEach(id=>store.delete(id));
      transaction.oncomplete=()=>resolve();
      transaction.onerror=()=>reject(transaction.error??new Error("No se pudieron guardar los adjuntos."));
      transaction.onabort=()=>reject(transaction.error??new Error("Se canceló el guardado de adjuntos."));
    });
  }finally{db.close();}
}

async function readStoredAttachment(id:string):Promise<StoredTalkAttachment>{
  const db=await openAttachmentDatabase();
  try{
    return await new Promise((resolve,reject)=>{
      const request=db.transaction(ATTACHMENT_STORE,"readonly").objectStore(ATTACHMENT_STORE).get(id);
      request.onsuccess=()=>request.result?resolve(request.result as StoredTalkAttachment):reject(new Error("No se encontró el archivo adjunto en este dispositivo."));
      request.onerror=()=>reject(request.error??new Error("No se pudo leer el archivo adjunto."));
    });
  }finally{db.close();}
}

function calculateStreak(data:typeof emptyState){
  const activeDays=new Set<string>();
  data.reports.forEach(report=>activeDays.add(report.date));
  data.focusSessions.forEach(session=>activeDays.add(session.date));
  data.events.filter(event=>event.done).forEach(event=>activeDays.add(event.date));
  Object.entries(data.routineDone).forEach(([key,done])=>{if(done)activeDays.add(key.slice(0,10));});
  const date=new Date(today()+"T12:00:00");
  if(!activeDays.has(today()))date.setDate(date.getDate()-1);
  let streak=0;
  while(activeDays.has(dateKey(date))){streak++;date.setDate(date.getDate()-1);}
  return streak;
}
function routineCountForDay(done:Record<string,boolean>,day:string){return routineList.filter(item=>done[day+":"+item]).length;}
function calculateRoutineStreak(done:Record<string,boolean>){
  const activeDays=new Set(Object.entries(done).filter(([,complete])=>complete).map(([key])=>key.slice(0,10)));
  const date=new Date(today()+"T12:00:00");
  if(!activeDays.has(today()))date.setDate(date.getDate()-1);
  let streak=0;
  while(activeDays.has(dateKey(date))){streak++;date.setDate(date.getDate()-1);}
  return streak;
}

function scheduleNotification(title: string, time: string, delayMs: number) {
  if (!("Notification" in window)) return;
  const triggerNotification = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode); gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine'; oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(); oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
    const language=TRANSLATIONS[getLanguage()];
    new Notification(language.notifTitle, { body: `${language.notifBody}${title} (${time})`, icon: "/icon-192.png" } as any);
  };
  if (Notification.permission === "granted") setTimeout(triggerNotification, delayMs);
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => { if (permission === "granted") setTimeout(triggerNotification, delayMs); });
  }
}

function reportToApi(report:Report):Informe{
  return {
    fecha:report.date,
    horas:report.hours,
    minutos:report.minutes,
    credit_hours:report.creditHours,
    credit_minutes:report.creditMinutes,
    cursos_biblicos:report.studies,
    participo:0,
    studies:report.studies,
    publications:report.publications,
    videos:report.videos,
    notas:report.notes,
    location:report.location,
    companion:report.companion,
  };
}

function apiReportToLocal(report:Informe):Report{
  return {
    id:String(report.id),
    date:report.fecha,
    hours:Number(report.horas)||0,
    minutes:Number(report.minutos)||0,
    creditHours:Number(report.credit_hours)||0,
    creditMinutes:Number(report.credit_minutes)||0,
    studies:Number(report.studies ?? report.cursos_biblicos)||0,
    publications:Number(report.publications)||0,
    videos:Number(report.videos)||0,
    notes:report.notas||"",
    location:report.location||"",
    companion:report.companion||"",
  };
}

function App(){
  const { data: authSession, isPending: authPending } = authClient.useSession();
  const [data,setData]=useState(load);
  const [cloudReady,setCloudReady]=useState(false);
  const syncedUserRef=useRef<string|null>(null);
  const [,refreshLocale]=useState(0);
  const [page,setPage]=useState<Page>("Inicio");
  const [month,setMonth]=useState(new Date());
  const [selectedDate,setSelectedDate]=useState(today());
  const [modal,setModal]=useState<"event"|"report"|"talk"|"reminder"|null>(null);
  const [editing,setEditing]=useState<string|null>(null);
  const [mobileMenu,setMobileMenu]=useState(false);
  const [toast,setToast]=useState("");
  const [loading, setLoading] = useState(true);
  const [verseIndex, setVerseIndex] = useState(0);
  const [activeBibleReference,setActiveBibleReference]=useState<string|null>(null);
  const [biblePanelMinimized,setBiblePanelMinimized]=useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setVerseIndex((prev) => (prev + 1) % BIBLE_VERSES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);
// Guarda los datos localmente después de cargar la información de la cuenta.
useEffect(() => {
  if (!cloudReady || !authSession?.user?.id) return;

  localStorage.setItem(KEY, JSON.stringify(data));
}, [data, cloudReady, authSession?.user?.id]);

// Carga los datos de la cuenta y los informes desde la nube.
useEffect(() => {
  const userId = authSession?.user?.id;

  if (authPending || !userId) {
    setCloudReady(false);
    syncedUserRef.current = null;
    return;
  }

  let cancelled = false;

  setCloudReady(false);

  const syncAccount = async () => {
    try {
      const remoteData = await obtenerDatosCuenta<Partial<typeof emptyState>>();
      const remoteReports = await obtenerInformes();

      if (cancelled) return;

      const cloudReports = remoteReports.map(apiReportToLocal);
      const cloudIds = new Set(cloudReports.map(report => report.id));

      setData(current => {
        const localOnlyReports = current.reports.filter(
          report => !cloudIds.has(report.id)
        );

        if (remoteData) {
          return {
            ...emptyState,
            ...remoteData,
            reports: [...cloudReports, ...localOnlyReports],
          };
        }

        return {
          ...current,
          reports: [...cloudReports, ...localOnlyReports],
        };
      });

      syncedUserRef.current = userId;
      setCloudReady(true);

    } catch (error) {
      if (!cancelled) {
        setCloudReady(false);
        setToast(
          error instanceof Error
            ? `Sincronización pendiente: ${error.message}`
            : "No se pudieron cargar los datos de la nube."
        );
      }
    }
  };

  void syncAccount();

  return () => {
    cancelled = true;
  };
}, [authPending, authSession?.user?.id]);

// Sincroniza los cambios de la cuenta con la nube.
useEffect(() => {
  const userId = authSession?.user?.id;

  if (
    !cloudReady ||
    !userId ||
    syncedUserRef.current !== userId
  ) {
    return;
  }

  const timer = window.setTimeout(() => {
    const accountData = Object.fromEntries(
      Object.entries(data).filter(([key]) => key !== "reports")
    );

    void guardarDatosCuenta(accountData).catch(error => {
      setToast(
        error instanceof Error
          ? `No se pudieron guardar los datos: ${error.message}`
          : "Error al guardar los datos en la nube."
      );
    });
  }, 700);

  return () => window.clearTimeout(timer);
}, [data, cloudReady, authSession?.user?.id]);
  useEffect(()=>{
    setLanguage(data.lang);
    document.documentElement.lang=data.lang;
    document.title=`JW Tracker — ${translate("Mi vida espiritual, organizada",data.lang)}`;
    setToast("");
    refreshLocale(value=>value+1);
  },[data.lang]);
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(""),2600);return()=>clearTimeout(t);},[toast]);

 useEffect(() => {
  if (authPending || !authSession?.user?.id) return;

  const timer = window.setTimeout(() => {
    setLoading(false);
  }, 5000);

  return () => window.clearTimeout(timer);
}, [authPending, authSession?.user?.id]);

  const update=(patch:Partial<typeof data>)=>setData(d=>({...d,...patch}));
  const t = TRANSLATIONS[data.lang || 'es'];

  const events=data.events;
  const todaysEvents=[...events.filter(event=>event.date===today()),...meetingOccurrences(data.meetingSchedules,today(),today())].sort((a,b)=>a.time.localeCompare(b.time));
  const monthStart=dateKey(new Date(month.getFullYear(),month.getMonth(),1));
  const monthEnd=dateKey(new Date(month.getFullYear(),month.getMonth()+1,0));
  const monthEvents=[...events.filter(event=>event.date.startsWith(`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`)),...meetingOccurrences(data.meetingSchedules,monthStart,monthEnd)].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  const currentMonthReports=data.reports.filter(r=>r.date.startsWith(today().slice(0,7)));
  const serviceMinutes=currentMonthReports.reduce((s,r)=>s+r.hours*60+r.minutes,0);
  const creditMinutes=currentMonthReports.reduce((s,r)=>s+r.creditHours*60+r.creditMinutes,0);
  const todayFocusSeconds=data.focusSessions.filter(session=>session.date===today()).reduce((total,session)=>total+session.seconds,0);
  const weeklyFocusSessions=data.focusSessions.filter(session=>session.date>=weekStart()&&session.date<=today()).length;
  const weeklyFocusPercent=Math.min(100,Math.round(weeklyFocusSessions/5*100));
  const weeklyStudySeconds=data.focusSessions.filter(session=>session.date>=weekStart()&&session.date<=today()).reduce((total,session)=>total+session.seconds,0);
  const monthlyServiceGoalProgress=data.goals.monthlyServiceHours>0?Math.min(100,Math.round(serviceMinutes/(data.goals.monthlyServiceHours*60)*100)):0;
  const weeklyStudyGoalProgress=data.goals.weeklyStudyHours>0?Math.min(100,Math.round(weeklyStudySeconds/(data.goals.weeklyStudyHours*3600)*100)):0;
  const currentStreak=calculateStreak(data);
  const routineStreak=calculateRoutineStreak(data.routineDone);

  const openModal=(kind:NonNullable<typeof modal>,id?:string)=>{setEditing(id||null);setModal(kind);};
  const saveEvent=(form:EventItem)=>{update({events:editing?events.map(e=>e.id===editing?form:e):[...events,form]});setModal(null);setToast(translate("Actividad guardada"));};
  const removeEvent=(id:string)=>{update({events:events.filter(e=>e.id!==id)});setToast(translate("Actividad eliminada"));};
  const removeReport=async(id:string)=>{
    try{
      if(/^\d+$/.test(id)) await eliminarInforme(Number(id));
      update({reports:data.reports.filter(report=>report.id!==id)});
      setToast(translate("Informe eliminado"));
    }catch(error){
      setToast(error instanceof Error?`No se pudo eliminar: ${error.message}`:"No se pudo eliminar el informe.");
    }
  };
  const saveReport=async(form:Report)=>{
    try{
      const saved=await guardarInforme(reportToApi(form),/^\d+$/.test(form.id)?Number(form.id):undefined);
      const localReport={...form,id:String(saved.id)};
      update({reports:editing?data.reports.map(r=>r.id===editing?localReport:r):[...data.reports,localReport]});
      setModal(null);
      setToast(translate("Informe guardado y sincronizado"));
    }catch(error){
      setToast(error instanceof Error?`No se pudo sincronizar: ${error.message}`:"No se pudo guardar el informe.");
      throw error;
    }
  };
  const saveTalk=async(form:TalkDraft)=>{
    const {newFiles,removeAttachmentIds,attachments,...talk}=form;
    const storedFiles=newFiles.map(file=>({id:uid(),name:file.name,type:file.type,size:file.size,blob:file}));
    if(storedFiles.length||removeAttachmentIds.length)await updateStoredAttachments(storedFiles,removeAttachmentIds);
    const savedTalk:Talk={...talk,attachments:[...attachments,...storedFiles.map(({blob:_blob,...attachment})=>attachment)]};
    update({talks:editing?data.talks.map(item=>item.id===editing?savedTalk:item):[...data.talks,savedTalk]});
    setModal(null);
    setToast(translate("Documento guardado"));
  };
  const removeTalk=async(id:string)=>{
    const talk=data.talks.find(item=>item.id===id);
    if(!talk)return;
    if(talk.attachments.length)await updateStoredAttachments([],talk.attachments.map(attachment=>attachment.id));
    update({talks:data.talks.filter(item=>item.id!==id)});
    setToast(translate("Documento y adjuntos eliminados"));
  };
  const downloadTalkAttachment=async(attachment:TalkAttachment)=>{
    const stored=await readStoredAttachment(attachment.id);
    downloadBlob(stored.blob,stored.name);
  };
  const saveMeetingSchedule=(schedule:MeetingSchedule)=>{update({meetingSchedules:[...data.meetingSchedules,schedule]});setToast(translate("Horario semanal guardado"));};
  const removeMeetingSchedule=(id:string)=>{update({meetingSchedules:data.meetingSchedules.filter(schedule=>schedule.id!==id)});setToast(translate("Horario eliminado"));};
  const saveMeetingPreparation=(preparation:MeetingPreparation)=>{update({meetingPreparations:[...data.meetingPreparations,preparation]});setToast(translate("Preparación guardada"));};
  const toggleMeetingPreparation=(id:string)=>update({meetingPreparations:data.meetingPreparations.map(item=>item.id===id?{...item,done:!item.done}:item)});
  const removeMeetingPreparation=(id:string)=>{update({meetingPreparations:data.meetingPreparations.filter(item=>item.id!==id)});setToast(translate("Preparación eliminada"));};
  const saveStudyPlan=(plan:StudyPlan)=>{update({studyPlans:[...data.studyPlans,plan]});setToast(translate("Plan de estudio guardado"));};
  const removeStudyPlan=(id:string)=>{update({studyPlans:data.studyPlans.filter(plan=>plan.id!==id)});setToast(translate("Plan eliminado"));};
  const addStudyItem=(planId:string,item:StudyItem)=>update({studyPlans:data.studyPlans.map(plan=>plan.id===planId?{...plan,items:[...plan.items,item]}:plan)});
  const toggleStudyItem=(planId:string,itemId:string)=>update({studyPlans:data.studyPlans.map(plan=>plan.id===planId?{...plan,items:plan.items.map(item=>item.id===itemId?{...item,done:!item.done}:item)}:plan)});
  const removeStudyItem=(planId:string,itemId:string)=>update({studyPlans:data.studyPlans.map(plan=>plan.id===planId?{...plan,items:plan.items.filter(item=>item.id!==itemId)}:plan)});
  const saveFollowUp=(followUp:FollowUp)=>{update({followUps:[...data.followUps,followUp]});setToast(translate("Seguimiento guardado"));};
  const toggleFollowUp=(id:string)=>update({followUps:data.followUps.map(item=>item.id===id?{...item,done:!item.done}:item)});
  const removeFollowUp=(id:string)=>{update({followUps:data.followUps.filter(item=>item.id!==id)});setToast(translate("Seguimiento eliminado"));};

  const saveReminder=(form:Reminder)=>{
    update({reminders:editing?data.reminders.map(r=>r.id===editing?form:r):[...data.reminders,form]});
    setModal(null);
    setToast(translate("Recordatorio guardado"));
    const reminderDate = new Date(`${form.date}T${form.time}`);
    const delay = reminderDate.getTime() - new Date().getTime();
    if (delay > 0) scheduleNotification(form.title, form.time, delay);
  };

  const saveFocusSession=(seconds:number,label:string)=>{const session={id:uid(),date:today(),label,seconds};setData(current=>({...current,focusSessions:[...current.focusSessions,session]}));setToast(`${translate("Sesión guardada")}: ${translate(label)} · ${formatDuration(seconds)}`);};
  const removeFocusSession=(id:string)=>{setData(current=>({...current,focusSessions:current.focusSessions.filter(session=>session.id!==id)}));setToast(translate("Sesión eliminada"));};
  const exportData=()=>{const backup={...data,talks:data.talks.map(({attachments:_attachments,...talk})=>talk)};downloadBlob(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}),"jw-tracker-backup.json");};
  const importData=async(backup:typeof emptyState)=>{
    if(!window.confirm(translate("Importar esta copia reemplazará los datos generales actuales de la aplicación. Los informes se gestionan por separado y los adjuntos locales actuales se eliminarán. ¿Deseas continuar?")))return false;
    const currentAttachmentIds=data.talks.flatMap(talk=>talk.attachments.map(attachment=>attachment.id));
    if(currentAttachmentIds.length)await updateStoredAttachments([],currentAttachmentIds);
    setData(backup);
    setToast(translate("Copia de seguridad restaurada"));
    return true;
  };

  const exportMonthlySummary=()=>{
    const reports=[...currentMonthReports].sort((a,b)=>a.date.localeCompare(b.date));
    const totals={
      service:reports.reduce((total,report)=>total+report.hours*60+report.minutes,0),
      credit:reports.reduce((total,report)=>total+report.creditHours*60+report.creditMinutes,0),
      studies:reports.reduce((total,report)=>total+report.studies,0),
      publications:reports.reduce((total,report)=>total+report.publications,0),
      videos:reports.reduce((total,report)=>total+report.videos,0)
    };
    const cell=(value:string|number)=>`"${String(value).replace(/"/g,'""')}"`;
    const rows=[
      [translate("Resumen mensual de servicio"),monthLabel(new Date(today()+"T12:00:00"))],
      [translate("Registros"),reports.length],
      [translate("Tiempo de predicación"),`${Math.floor(totals.service/60)}h ${totals.service%60}m`],
      [translate("Horas de crédito"),`${Math.floor(totals.credit/60)}h ${totals.credit%60}m`],
      [translate("Cursos bíblicos"),totals.studies],
      [translate("Publicaciones"),totals.publications],
      [translate("Videos"),totals.videos],
      [],
      ["Fecha","Predicación","Crédito","Cursos bíblicos","Publicaciones","Videos","Lugar","Acompañante","Notas"].map(label=>translate(label)),
      ...reports.map(report=>[
        report.date,`${report.hours}h ${report.minutes}m`,`${report.creditHours}h ${report.creditMinutes}m`,
        report.studies,report.publications,report.videos,report.location||"",report.companion||"",report.notes
      ])
    ];
    const csv=rows.map(row=>row.map(cell).join(";")).join("\r\n");
    downloadBlob(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}),`resumen-servicio-${today().slice(0,7)}.csv`);
  };

  const resetData=async()=>{
    if(!confirm(translate("¿Reiniciar los datos de la aplicación y eliminar los adjuntos locales? Los informes guardados en el servidor se gestionan por separado.")))return;
    try{
      const attachmentIds=data.talks.flatMap(talk=>talk.attachments.map(attachment=>attachment.id));
      if(attachmentIds.length)await updateStoredAttachments([],attachmentIds);
      localStorage.removeItem(KEY);
      setData(emptyState);
      setToast(translate("Datos reiniciados"));
    }catch(reason){
      window.alert(reason instanceof Error?`${translate("No se pudieron borrar los datos")}: ${translate(reason.message)}`:translate("No se pudieron borrar todos los datos locales."));
    }
  };
  const saveProfile=(name:string,congregation:string)=>{update({profile:{name,congregation}});setToast(translate("Perfil guardado"));};
  const upcomingEnd=new Date(today()+"T12:00:00");upcomingEnd.setDate(upcomingEnd.getDate()+30);
  const activeEvents=[...events.filter(event=>event.date>=today()&&!event.done),...meetingOccurrences(data.meetingSchedules,today(),dateKey(upcomingEnd))].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,4);

  if(authPending){
    return <div className={`app ${data.theme}`}><div className="splash-screen"><div className="splash-card"><Brand/><p className="splash-text">{translate("Comprobando tu sesión…")}</p></div></div></div>;
  }
  if(!authSession?.user){
    return <AuthScreen onAuthenticated={()=>window.location.reload()} />;
  }

  // Pantalla de carga original de JW Tracker.
  if (loading) {
    return (
      <div className={`app ${data.theme}`}>
        <AnimatePresence>
          <motion.div
            className="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(20px)", scale: 1.05 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <motion.div
              className="splash-card"
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="splash-brand">
                <Brand />
              </div>

              <div className="splash-progress-bar">
                <motion.div
                  className="splash-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 5, ease: "linear" }}
                />
              </div>

              <motion.p
                className="splash-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {translate("PREPARANDO TU ESPACIO")}{" "}</motion.p>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }
  // FIN DEL BLOQUE QUE FALTABA

  return <div className={`app ${data.theme}`} data-accent={data.accent}>
    <a className="skip-link" href="#main-content" style={{position:"fixed",top:8,left:8,zIndex:9999,transform:"translateY(-160%)",background:"white",padding:10,borderRadius:8}} onFocus={event=>{event.currentTarget.style.transform="translateY(0)";}} onBlur={event=>{event.currentTarget.style.transform="translateY(-160%)";}}>{translate("Saltar al contenido principal")}</a>
    <aside className="sidebar">
      <Brand/>
      <div className="nav-label">{translate("ESPACIO PERSONAL")}</div>
      <nav aria-label={translate("Navegación principal")}>{nav.map(n=><button key={n.name} className={`nav-item ${page===n.name?"active":""}`} aria-current={page===n.name?"page":undefined} onClick={()=>setPage(n.name)}><n.icon size={18}/><span>{translate(n.name)}</span>{n.name==="Recordatorios"&&data.reminders.filter(r=>r.enabled).length>0&&<i/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="profile-chip"><button className="profile-chip-main" onClick={()=>setPage("Perfil")} aria-label={translate("Abrir perfil")}><div className="avatar"><UserRound size={17}/></div><div className="profile-copy"><b>{data.profile.name||translate("Mi espacio")}</b><small>{data.profile.congregation||translate("Añadir congregación")}</small></div></button><button className="profile-settings-button" onClick={()=>setPage("Ajustes")} aria-label={translate("Abrir ajustes")}><MoreHorizontal size={17}/></button></div>
        <div className="local-note"><span className="status-dot"/> {translate("Informes en la nube · resto en este dispositivo")}</div><button className="text-button" type="button" onClick={()=>{void authClient.signOut();}}>{translate("Cerrar sesión")}</button>
      </div>
    </aside>

<header className="mobile-header">
  <Brand compact />
  <button
    className="icon-button"
    onClick={() => setPage("Perfil")}
    aria-label={translate("Abrir perfil")}
  >
    <UserRound />
  </button>
</header>

{mobileMenu && (
  <>
    <button
      type="button"
      className="mobile-sheet-backdrop"
      aria-label={translate("Cerrar menú")}
      onClick={() => setMobileMenu(false)}
    />

    <section
      className="mobile-sheet"
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label={translate("Más secciones")}
    >
      <div className="mobile-sheet-handle" />

      <div className="mobile-sheet-header">
        <div>
          <h2>{translate("Más secciones")}</h2>
          <p>{translate("Accede a todas las herramientas de JW Tracker")}</p>
        </div>

        <button
          className="icon-button"
          type="button"
          onClick={() => setMobileMenu(false)}
          aria-label={translate("Cerrar menú")}
        >
          <X />
        </button>
      </div>

      <nav className="mobile-sheet-grid" aria-label={translate("Otras secciones")}>
        {nav.slice(4).map(n => (
          <button
            key={n.name}
            type="button"
            className={`mobile-sheet-item ${page === n.name ? "active" : ""}`}
            aria-current={page === n.name ? "page" : undefined}
            onClick={() => {
              setPage(n.name);
              setMobileMenu(false);
            }}
          >
            <n.icon size={20} />
            <span>{translate(n.name)}</span>
          </button>
        ))}
      </nav>
    </section>
  </>
)}

    <main className="main" id="main-content" tabIndex={-1}>
      <div className="topline"><div className="breadcrumb">{translate("Mi espacio")}{" "}<span>/</span> {translate(page)}</div><div className="top-actions"><span className="today-pill"><span className="status-dot"/>{dateLabel(today(),{day:"numeric",month:"short"})}</span><button className="icon-button" title={translate("Ajustes")} aria-label={translate("Abrir ajustes")} onClick={()=>setPage("Ajustes")}><Settings size={18}/></button><button className="avatar small" onClick={()=>setPage("Perfil")} aria-label={translate("Abrir perfil")}><UserRound size={15}/></button></div></div>
      <AnimatePresence mode="wait"><motion.div key={page} initial={{opacity:0,y:9}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.2}}>
        {page==="Inicio"&&<Dashboard name={data.profile.name} events={todaysEvents} next={activeEvents} service={serviceMinutes} credit={creditMinutes} routines={data.routineDone} streak={currentStreak} weeklyFocusSessions={weeklyFocusSessions} weeklyFocusPercent={weeklyFocusPercent} todayFocusSeconds={todayFocusSeconds} weeklyStudySeconds={weeklyStudySeconds} goals={data.goals} monthlyServiceGoalProgress={monthlyServiceGoalProgress} weeklyStudyGoalProgress={weeklyStudyGoalProgress} setPage={setPage} add={()=>openModal("event")} verse={BIBLE_VERSES[verseIndex]} onBibleReference={setActiveBibleReference} t={t}/>}
        {page==="Calendario"&&<CalendarPage month={month} setMonth={setMonth} selected={selectedDate} setSelected={setSelectedDate} events={monthEvents} add={()=>openModal("event")} edit={(id:string)=>openModal("event",id)} remove={removeEvent} />}
        {page==="Rutinas"&&<Routines done={data.routineDone} streak={routineStreak} toggle={(key:string)=>update({routineDone:{...data.routineDone,[today()+":"+key]:!data.routineDone[today()+":"+key]}})} />}
        {page==="Enfoque"&&<FocusPage sessions={data.focusSessions} onSave={saveFocusSession} onRemove={removeFocusSession}/>}
        {page==="Servicio"&&<ServicePage reports={data.reports} save={()=>openModal("report")} edit={(id:string)=>openModal("report",id)} remove={removeReport} service={serviceMinutes} credit={creditMinutes} exportSummary={exportMonthlySummary}/>}
        {page==="Discursos"&&<TalksPage talks={data.talks} add={()=>openModal("talk")} edit={(id:string)=>openModal("talk",id)} remove={removeTalk} downloadAttachment={downloadTalkAttachment} onBibleReference={(reference:string)=>{setActiveBibleReference(reference);setBiblePanelMinimized(false);}}/>}
        {page==="Recordatorios"&&<RemindersPage reminders={data.reminders} add={()=>openModal("reminder")} edit={(id:string)=>openModal("reminder",id)} toggle={(id:string)=>update({reminders:data.reminders.map(r=>r.id===id?{...r,enabled:!r.enabled}:r)})} remove={(id:string)=>update({reminders:data.reminders.filter(r=>r.id!==id)})}/>}
        {page==="Reuniones"&&<MeetingsPage schedules={data.meetingSchedules} preparations={data.meetingPreparations} saveSchedule={saveMeetingSchedule} removeSchedule={removeMeetingSchedule} savePreparation={saveMeetingPreparation} togglePreparation={toggleMeetingPreparation} removePreparation={removeMeetingPreparation}/>}
        {page==="Estudio"&&<StudyPage plans={data.studyPlans} savePlan={saveStudyPlan} removePlan={removeStudyPlan} addItem={addStudyItem} toggleItem={toggleStudyItem} removeItem={removeStudyItem}/>}
        {page==="Seguimiento"&&<FollowUpsPage items={data.followUps} save={saveFollowUp} toggle={toggleFollowUp} remove={removeFollowUp}/>}
      {page==="Perfil"&&<ProfilePage profile={data.profile} save={saveProfile} user={authSession.user}/>}
        {page==="Administrador"&&<AdminPage data={data} setPage={setPage} exportData={exportData} importData={importData} reset={resetData}/>}
        {page==="Ajustes"&&<SettingsPage data={data} update={update} exportData={exportData} importData={importData} reset={resetData} t={t}/>}
        {page==="Ayuda"&&<HelpPage setPage={setPage}/>}
      </motion.div></AnimatePresence>
    </main>

<nav className="mobile-nav" aria-label={translate("Navegación móvil")}>
  {nav.slice(0, 4).map(n => (
    <button
      key={n.name}
      type="button"
      className={page === n.name ? "selected" : ""}
      aria-current={page === n.name ? "page" : undefined}
      onClick={() => setPage(n.name)}
    >
      <n.icon size={21} />
      <span>{translate(n.name)}</span>
    </button>
  ))}

  <button
    type="button"
    className={mobileMenu || nav.slice(4).some(n => n.name === page) ? "selected" : ""}
    onClick={() => setMobileMenu(!mobileMenu)}
    aria-label={translate("Mostrar más secciones")}
    aria-expanded={mobileMenu}
    aria-controls="mobile-menu"
  >
    <LayoutGrid size={21} />
    <span>{translate("Más")}</span>
  </button>
</nav>

    {modal&&    <Modal title={modal==="event"?translate("Nueva actividad"):modal==="report"?translate("Informe de servicio"):modal==="talk"?translate("Documento espiritual"):translate("Nuevo recordatorio")} close={()=>setModal(null)}>
      {modal==="event"&&<EventForm initial={events.find(e=>e.id===editing)} date={selectedDate} save={saveEvent}/>}
      {modal==="report"&&<ReportForm initial={data.reports.find(r=>r.id===editing)} save={saveReport}/>}
      {modal==="talk"&&<TalkForm initial={data.talks.find(t=>t.id===editing)} save={saveTalk} onBibleReference={(reference:string)=>{setActiveBibleReference(reference);setBiblePanelMinimized(false);}}/>}
      {modal==="reminder"&&<ReminderForm initial={data.reminders.find(r=>r.id===editing)} save={saveReminder}/>}
    </Modal>}
    <AnimatePresence>{activeBibleReference&&<BibleReferencePanel reference={activeBibleReference} minimized={biblePanelMinimized} setMinimized={setBiblePanelMinimized} close={()=>{setActiveBibleReference(null);setBiblePanelMinimized(false);}}/>}</AnimatePresence>
    <AnimatePresence>{toast&&<motion.div className="toast glass-panel" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}><CircleCheck size={17}/>{toast}</motion.div>}</AnimatePresence>
  </div>;
}


function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark">
        <img
          src="/favicon.svg"
          alt="JW Tracker"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      {!compact && (
        <div>
          <b>JW Tracker</b>
          <small>{translate("Mi vida espiritual, organizada")}</small>
        </div>
      )}
    </div>
  );
}


function PageHeading({eyebrow,title,desc,action}:{eyebrow?:string;title:string;desc:string;action?:React.ReactNode}){return <div className="page-heading"><div>{eyebrow&&<div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{desc}</p></div>{action}</div>}

function Dashboard({name,events,next,service,credit,routines,streak,routineStreak,weeklyFocusSessions,weeklyFocusPercent,todayFocusSeconds,weeklyStudySeconds,goals,monthlyServiceGoalProgress,weeklyStudyGoalProgress,setPage,add,verse,onBibleReference,t}:any){
 const done=routineList.filter(k=>routines[today()+":"+k]).length;
 return <>
  <PageHeading eyebrow={dateLabel(today())} title={`${t.title}${name?" "+name.split(" ")[0]:""}`} desc={t.desc} action={<button className="button primary" onClick={add}><Plus size={17}/> {translate("Añadir actividad")}</button>}/>
  <motion.section className="hero-card glass-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="hero-orb orb-one"/><div className="hero-orb orb-two"/>
      <div className="hero-content" style={{ maxWidth: '100%', textAlign: 'center' }}>
        <div className="hero-kicker" style={{ justifyContent: 'center' }}><Quote size={14}/> {t.verse}</div>
        <AnimatePresence mode="wait">
          <motion.div key={verse.text} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ padding: '20px 0' }}>
            <h2 style={{ fontSize: '22px', lineHeight: '1.4', fontStyle: 'italic', marginBottom: '10px' }}>“{verse.text}”</h2>
            <button className="verse-reference" onClick={()=>onBibleReference(verse.ref)} aria-label={`${translate("Abrir referencia")} ${verse.ref}`}>— {verse.ref}</button>
          </motion.div>
        </AnimatePresence>
      </div>
  </motion.section>
  <div className="stats-grid dashboard-stats">
   <StatCard icon={CalendarCheck} label={translate("Actividades hoy")} value={events.length} detail={translate("Programadas para hoy")}/>
   <StatCard icon={Clock3} label={translate("Predicación · mes")} value={`${Math.floor(service/60)}h ${service%60}m`} detail={translate("Tiempo de predicación")}/>
   <StatCard icon={BookMarked} label={translate("Crédito · mes")} value={`${Math.floor(credit/60)}h ${credit%60}m`} detail={translate("Contabilizado por separado")}/>
   <StatCard icon={Flame} label={translate("Racha actual")} value={`${streak} ${translate(streak===1?"día":"días")}`} detail={translate(streak?"Con actividad registrada":"Registra hoy para comenzar")}/>
   <StatCard icon={Target} label={translate("Meta semanal")} value={`${weeklyFocusPercent}%`} detail={`${weeklyFocusSessions} ${translate("de")} 5 ${translate("sesiones de enfoque")}`} progress={weeklyFocusPercent}/>
   <StatCard icon={Timer} label={translate("Enfoque hoy")} value={formatDuration(todayFocusSeconds)} detail={translate("Tiempo registrado en el temporizador")}/>
   <GoalCard icon={BookMarked} label={translate("Estudio esta semana")} value={formatDuration(weeklyStudySeconds)} goal={goals.weeklyStudyHours} goalLabel={translate("h/semana")} progress={weeklyStudyGoalProgress} onConfigure={()=>setPage("Ajustes")}/>
   <GoalCard icon={ChartNoAxesColumn} label={translate("Servicio este mes")} value={formatDuration(service*60)} goal={goals.monthlyServiceHours} goalLabel={translate("h/mes")} progress={monthlyServiceGoalProgress} onConfigure={()=>setPage("Ajustes")}/>
  </div>
  <div className="content-grid">
   <section className="panel"><div className="panel-head"><div><div className="eyebrow">{translate("AGENDA")}</div><h3>{translate("Para hoy")}</h3></div><button className="text-button" onClick={()=>setPage("Calendario")}>{translate("Ver calendario")}{" "}<ArrowUpRight size={15}/></button></div>{events.length?events.map((event:any)=><EventRow key={event.id} event={event}/>):<Empty icon={CalendarDays} title={translate("Tu agenda está despejada")} text={translate("Añade una actividad para organizar tu día.")}/>}</section>
   <section className="panel"><div className="panel-head"><div><div className="eyebrow">{translate("PRÓXIMOS DÍAS")}</div><h3>{translate("Lo que viene")}</h3></div><button className="icon-button" aria-label={translate("Abrir calendario")} onClick={()=>setPage("Calendario")}><ArrowUpRight size={17}/></button></div>{next.length?next.map((event:any)=><EventRow key={event.id} event={event} compact/>):<Empty icon={Sprout} title={translate("Sin próximas actividades")} text={translate("Tus próximas actividades aparecerán aquí.")}/>}</section>
  </div>
  <div className="bottom-grid"><button className="quick-card" onClick={()=>setPage("Servicio")}><div className="quick-icon"><ChartNoAxesColumn/></div><div><b>{translate("Registrar servicio")}</b><small>{translate("Horas, cursos bíblicos y actividad")}</small></div><ArrowUpRight size={17}/></button><button className="quick-card" onClick={()=>setPage("Discursos")}><div className="quick-icon"><BookOpenText/></div><div><b>{translate("Preparar una participación")}</b><small>{translate("Guarda tus ideas y bosquejos")}</small></div><ArrowUpRight size={17}/></button><button className="quick-card" onClick={()=>setPage("Reuniones")}><div className="quick-icon"><Users/></div><div><b>{translate("Preparar reuniones")}</b><small>{translate("Horarios, asignaciones y notas")}</small></div><ArrowUpRight size={17}/></button><button className="quick-card" onClick={()=>setPage("Estudio")}><div className="quick-icon"><BookMarked/></div><div><b>{translate("Continuar estudio")}</b><small>{translate("Planes y referencias bíblicas")}</small></div><ArrowUpRight size={17}/></button></div>
 </>;
}

function StatCard({icon:Icon,label,value,detail,progress}:{icon:any;label:string;value:string|number;detail:string;progress?:number}){return <div className="stat-card glass-panel"><div className="stat-top"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><small>{detail}</small>{progress!==undefined&&<div className="stat-progress" role="progressbar" aria-label={translate("Progreso de la meta semanal")} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${progress}%`}}/></div>}</div>}
function GoalCard({icon:Icon,label,value,goal,goalLabel,progress,onConfigure}:{icon:any;label:string;value:string;goal:number;goalLabel:string;progress:number;onConfigure:()=>void}){
 const configured=goal>0;
 return <div className="stat-card glass-panel goal-stat"><div className="stat-top"><span>{label}</span><Icon size={18}/></div><strong>{value}</strong><small>{configured?`${translate("Meta")}: ${goal} ${translate(goalLabel)} · ${progress}%`:translate("Aún no has configurado una meta")}</small>{configured?<div className="stat-progress" role="progressbar" aria-label={`${translate("Progreso de")} ${label}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${progress}%`}}/></div>:<button className="goal-configure" onClick={onConfigure}>{translate("Configurar meta")}</button>}</div>;
}
function EventRow({event,compact=false}:{event:EventItem;compact?:boolean}){return <div className="event-row"><span className={`event-marker marker-${event.category==="Predicación"?"green":event.category==="Reunión"?"blue":event.category==="Discurso"?"orange":"sage"}`}/><div className="event-info"><b>{event.title}</b><small>{compact?dateLabel(event.date,{weekday:"short",day:"numeric",month:"short"}):translate(event.category)}</small></div><span className="event-time">{event.time||"—"}</span></div>}
function Empty({icon:Icon,title,text}:{icon:any;title:string;text:string}){return <div className="empty"><div><Icon size={21}/></div><b>{title}</b><p>{text}</p></div>}

function CalendarPage({month,setMonth,selected,setSelected,events,add,edit,remove}:any){
 const first=new Date(month.getFullYear(),month.getMonth(),1);
 const offset=(first.getDay()+6)%7;
 const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const cells=[...Array(offset).fill(0),...Array.from({length:days},(_,index)=>index+1)];
 const chosen=events.filter((e:any)=>e.date===selected);
 return <>
  <PageHeading eyebrow={translate("PLANIFICACIÓN")} title={translate("Calendario")} desc={translate("Visualiza tus reuniones, preparación y actividades personales.")} action={<button className="button primary" onClick={add}><Plus size={17}/> {translate("Nueva actividad")}</button>}/>
  <div className="calendar-layout">
   <section className="panel calendar-panel">
    <div className="calendar-toolbar"><button className="icon-button" aria-label={translate("Mes anterior")} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft/></button><h3>{monthLabel(month)}</h3><button className="icon-button" aria-label={translate("Mes siguiente")} onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight/></button><button className="text-button today-button" onClick={()=>{setMonth(new Date());setSelected(today())}}>{translate("Hoy")}</button></div>
    <div className="calendar-grid">
     {Array.from({length:7},(_,index)=>new Intl.DateTimeFormat(getLocale(),{weekday:"short"}).format(new Date(2023,0,2+index)).replace(/\.$/,"")).map((dayName,index)=><div className="weekday" key={index}>{dayName}</div>)}
     {cells.map((day,index)=>{
      const date=day?`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`:"";
      const dayEvents=events.filter((event:any)=>event.date===date);
      return <button key={day?date:`blank-${index}`} className={`day-cell ${!day?"blank":""} ${date===selected?"chosen":""} ${date===today()?"is-today":""}`} disabled={!day} onClick={()=>setSelected(date)}><span>{day||""}</span>{dayEvents.slice(0,3).map((event:any)=><i key={event.id} className={`dot dot-${event.category==="Predicación"?"green":event.category==="Reunión"?"blue":"sage"}`}/>)}</button>;
     })}
    </div>
   </section>
   <section className="panel selected-panel">
    <div className="panel-head"><div><div className="eyebrow">{translate("DÍA SELECCIONADO")}</div><h3>{dateLabel(selected,{weekday:"long",day:"numeric",month:"long"})}</h3></div><button className="icon-button" aria-label={translate("Añadir actividad")} onClick={add}><Plus size={18}/></button></div>
    {chosen.length?chosen.map((event:any)=><div className="manage-row" key={event.id}><div className="event-info"><b>{event.title}</b><small>{translate(event.category)} {translate("·")}{" "}{event.time||translate("Sin hora")}{event.generated?` ${translate("·")} ${translate("Horario semanal")}`:""}</small></div>{!event.generated&&<><button className="icon-button" aria-label={`${translate("Editar ")}${event.title}`} onClick={()=>edit(event.id)}><Pencil size={15}/></button><button className="icon-button danger" aria-label={`${translate("Eliminar ")}${event.title}`} onClick={()=>remove(event.id)}><Trash2 size={15}/></button></>}</div>):<Empty icon={CalendarDays} title={translate("No hay actividades")} text={translate("Este día todavía no tiene actividades programadas.")}/>}
   </section>
  </div>
 </>;
}

function MeetingsPage({schedules,preparations,saveSchedule,removeSchedule,savePreparation,togglePreparation,removePreparation}:any){
 const weekdays=Array.from({length:7},(_,day)=>new Intl.DateTimeFormat(getLocale(),{weekday:"long"}).format(new Date(2023,0,1+day)));
 const meetingTypes=["Reunión de entre semana","Reunión del fin de semana","Otra reunión"];
 const [showScheduleForm,setShowScheduleForm]=useState(false);
 const [showPreparationForm,setShowPreparationForm]=useState(false);
 const [schedule,setSchedule]=useState({title:"",weekday:"0",time:""});
 const [preparation,setPreparation]=useState({date:today(),meetingType:meetingTypes[0],assignment:"",notes:""});
 const orderedPreparations=[...preparations].sort((a:MeetingPreparation,b:MeetingPreparation)=>Number(a.done)-Number(b.done)||a.date.localeCompare(b.date));
 const submitSchedule=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();saveSchedule({id:uid(),title:schedule.title.trim(),weekday:Number(schedule.weekday),time:schedule.time});setSchedule({title:"",weekday:"0",time:""});setShowScheduleForm(false);};
 const submitPreparation=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();savePreparation({...preparation,id:uid(),assignment:preparation.assignment.trim(),notes:preparation.notes.trim(),done:false});setPreparation({date:today(),meetingType:meetingTypes[0],assignment:"",notes:""});setShowPreparationForm(false);};
 return <>
  <PageHeading eyebrow={translate("REUNIONES Y PREPARACIÓN")} title={translate("Reuniones")} desc={translate("Configura tus horarios semanales y organiza tus asignaciones con notas personales.")} action={<button className="button primary" onClick={()=>setShowPreparationForm(value=>!value)}><Plus size={17}/> {translate("Nueva preparación")}</button>}/>
  <div className="meeting-grid">
   <section className="panel meeting-schedules">
    <div className="panel-head"><div><div className="eyebrow">{translate("CALENDARIO CONGREGACIONAL")}</div><h3>{translate("Horario semanal")}</h3></div><button className="button secondary small" onClick={()=>setShowScheduleForm(value=>!value)}><Plus size={15}/> {translate("Añadir horario")}</button></div>
    <p className="settings-copy">{translate("Añade los días y horas que correspondan a tu congregación. Se mostrarán como eventos recurrentes en el calendario.")}</p>
    {showScheduleForm&&<form className="inline-form" onSubmit={submitSchedule}>
     <label className="field">{translate("Nombre del horario")}<input required value={schedule.title} onChange={event=>setSchedule(current=>({...current,title:event.target.value}))} placeholder={translate("Nombre de la reunión")}/></label>
     <div className="form-two"><label className="field">{translate("Día")}<select value={schedule.weekday} onChange={event=>setSchedule(current=>({...current,weekday:event.target.value}))}>{weekdays.map((day,index)=><option key={index} value={index}>{day}</option>)}</select></label><label className="field">{translate("Hora")}<input required type="time" value={schedule.time} onChange={event=>setSchedule(current=>({...current,time:event.target.value}))}/></label></div>
     <div className="form-footer"><button type="button" className="button secondary" onClick={()=>setShowScheduleForm(false)}>{translate("Cancelar")}</button><button className="button primary"><Save size={15}/> {translate("Guardar horario")}</button></div>
    </form>}
    {schedules.length?schedules.map((item:MeetingSchedule)=><div className="meeting-schedule-row" key={item.id}><span className="quick-icon"><CalendarDays size={18}/></span><div className="event-info"><b>{item.title}</b><small>{weekdays[item.weekday]} {translate("·")}{" "}{item.time}</small></div><button className="icon-button danger" onClick={()=>removeSchedule(item.id)} aria-label={`${translate("Eliminar horario")} ${item.title}`}><Trash2 size={15}/></button></div>):<Empty icon={CalendarDays} title={translate("Sin horarios configurados")} text={translate("Agrega tus reuniones semanales para verlas en el calendario.")}/>}
   </section>
   <section className="panel meeting-preparations">
    <div className="panel-head"><div><div className="eyebrow">{translate("ASIGNACIONES Y NOTAS")}</div><h3>{translate("Preparación personal")}</h3></div><span className="count-pill">{preparations.filter((item:MeetingPreparation)=>!item.done).length} {translate("pendientes")}</span></div>
    {showPreparationForm&&<form className="inline-form" onSubmit={submitPreparation}>
     <div className="form-two"><label className="field">{translate("Reunión")}<select value={translate(preparation.meetingType)} onChange={event=>setPreparation(current=>({...current,meetingType:toStoredLabel(event.target.value,meetingTypes)}))}>{meetingTypes.map(item=><option key={item} value={translate(item)}>{translate(item)}</option>)}</select></label><label className="field">{translate("Fecha")}<input required type="date" value={preparation.date} onChange={event=>setPreparation(current=>({...current,date:event.target.value}))}/></label></div>
     <label className="field">{translate("Asignación o tema")}<input required value={preparation.assignment} onChange={event=>setPreparation(current=>({...current,assignment:event.target.value}))} placeholder={translate("Título de tu preparación")}/></label>
     <label className="field">{translate("Notas personales")}<textarea rows={3} value={preparation.notes} onChange={event=>setPreparation(current=>({...current,notes:event.target.value}))} placeholder={translate("Tus propias ideas y puntos de preparación")}/></label>
     <div className="form-footer"><button type="button" className="button secondary" onClick={()=>setShowPreparationForm(false)}>{translate("Cancelar")}</button><button className="button primary"><Save size={15}/> {translate("Guardar preparación")}</button></div>
    </form>}
    {orderedPreparations.length?orderedPreparations.map((item:MeetingPreparation)=><article className={`meeting-prep-row ${item.done?"completed":""}`} key={item.id}><button className="check-circle" aria-label={`${item.done?translate("Marcar pendiente"):translate("Marcar lista")}: ${item.assignment}`} aria-pressed={item.done} onClick={()=>togglePreparation(item.id)}>{item.done&&<Check size={15}/>}</button><div className="event-info"><b>{item.assignment}</b><small>{translate(item.meetingType)} {translate("·")}{" "}{dateLabel(item.date,{day:"numeric",month:"short",year:"numeric"})}</small>{item.notes&&<p>{item.notes}</p>}</div><button className="icon-button danger" aria-label={`${translate("Eliminar preparación")} ${item.assignment}`} onClick={()=>removePreparation(item.id)}><Trash2 size={15}/></button></article>):!showPreparationForm&&<Empty icon={BookOpenText} title={translate("Sin preparaciones")} text={translate("Guarda asignaciones y notas para tus próximas reuniones.")}/>}
   </section>
  </div>
 </>;
}

function StudyPage({plans,savePlan,removePlan,addItem,toggleItem,removeItem}:any){
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [showPlanForm,setShowPlanForm]=useState(false);
 const [showItemForm,setShowItemForm]=useState(false);
 const [planDraft,setPlanDraft]=useState({title:"",goal:""});
 const [itemDraft,setItemDraft]=useState({reference:"",notes:""});
 const selectedPlan=plans.find((plan:StudyPlan)=>plan.id===selectedId)||plans[0];
 const completed=selectedPlan?.items.filter((item:StudyItem)=>item.done).length||0;
 const saveNewPlan=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();const plan={id:uid(),title:planDraft.title.trim(),goal:planDraft.goal.trim(),items:[]};savePlan(plan);setSelectedId(plan.id);setPlanDraft({title:"",goal:""});setShowPlanForm(false);};
 const saveNewItem=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!selectedPlan)return;addItem(selectedPlan.id,{...itemDraft,id:uid(),reference:itemDraft.reference.trim(),notes:itemDraft.notes.trim(),done:false});setItemDraft({reference:"",notes:""});setShowItemForm(false);};
 return <>
  <PageHeading eyebrow={translate("LECTURA Y ESTUDIO PERSONAL")} title={translate("Planes de estudio")} desc={translate("Crea tus propios planes, añade referencias bíblicas y registra tu progreso.")} action={<button className="button primary" onClick={()=>setShowPlanForm(value=>!value)}><Plus size={17}/> {translate("Nuevo plan")}</button>}/>
  {showPlanForm&&<section className="panel plan-form-panel"><div className="panel-head"><div><div className="eyebrow">{translate("PLAN PERSONAL")}</div><h3>{translate("Crear un plan")}</h3></div></div><form className="inline-form" onSubmit={saveNewPlan}><label className="field">{translate("Nombre del plan")}<input required value={planDraft.title} onChange={event=>setPlanDraft(current=>({...current,title:event.target.value}))} placeholder={translate("Nombre del plan")}/></label><label className="field">{translate("Objetivo personal")}<textarea rows={2} value={planDraft.goal} onChange={event=>setPlanDraft(current=>({...current,goal:event.target.value}))} placeholder={translate("Opcional")}/></label><div className="form-footer"><button type="button" className="button secondary" onClick={()=>setShowPlanForm(false)}>{translate("Cancelar")}</button><button className="button primary"><Save size={15}/> {translate("Crear plan")}</button></div></form></section>}
  {plans.length?<div className="study-layout"><section className="study-plan-list">{plans.map((plan:StudyPlan)=>{const complete=plan.items.filter(item=>item.done).length;const percent=plan.items.length?Math.round(complete/plan.items.length*100):0;return <button key={plan.id} className={`panel study-plan-card ${selectedPlan?.id===plan.id?"selected":""}`} onClick={()=>{setSelectedId(plan.id);setShowItemForm(false)}}><span className="quick-icon"><BookOpenText size={18}/></span><span className="study-plan-copy"><b>{plan.title}</b><small>{plan.items.length} {translate("referencias ·")}{" "}{percent}{translate("% completado")}</small>{plan.goal&&<small>{plan.goal}</small>}</span><span className="study-plan-progress" aria-hidden="true"><i style={{width:`${percent}%`}}/></span></button>})}</section>
   {selectedPlan&&<section className="panel study-detail"><div className="panel-head"><div><div className="eyebrow">{translate("PLAN SELECCIONADO")}</div><h3>{selectedPlan.title}</h3></div><button className="icon-button danger" onClick={()=>{removePlan(selectedPlan.id);setSelectedId(null);setShowItemForm(false)}} aria-label={`${translate("Eliminar plan")} ${selectedPlan.title}`}><Trash2 size={15}/></button></div>{selectedPlan.goal&&<p className="settings-copy">{selectedPlan.goal}</p>}<div className="study-summary"><span>{completed} {translate("de")}{" "}{selectedPlan.items.length} {translate("referencias completadas")}</span><button className="button secondary small" onClick={()=>setShowItemForm(value=>!value)}><Plus size={14}/> {translate("Añadir referencia")}</button></div>
    {showItemForm&&<form className="inline-form" onSubmit={saveNewItem}><label className="field">{translate("Referencia bíblica")}<input required value={itemDraft.reference} onChange={event=>setItemDraft(current=>({...current,reference:event.target.value}))} placeholder={translate("Libro, capítulo y versículos")}/></label><label className="field">{translate("Notas personales")}<textarea rows={2} value={itemDraft.notes} onChange={event=>setItemDraft(current=>({...current,notes:event.target.value}))} placeholder={translate("Opcional; evita copiar publicaciones protegidas")}/></label><div className="form-footer"><button type="button" className="button secondary" onClick={()=>setShowItemForm(false)}>{translate("Cancelar")}</button><button className="button primary"><Save size={15}/> {translate("Guardar referencia")}</button></div></form>}
    {selectedPlan.items.length?selectedPlan.items.map((item:StudyItem)=><article className={`study-item-row ${item.done?"completed":""}`} key={item.id}><button className="check-circle" aria-label={`${translate(item.done?"Marcar pendiente":"Marcar completada")}: ${item.reference}`} aria-pressed={item.done} onClick={()=>toggleItem(selectedPlan.id,item.id)}>{item.done&&<Check size={15}/>}</button><div className="event-info"><b>{item.reference}</b>{item.notes&&<small>{item.notes}</small>}</div><button className="icon-button danger" aria-label={`${translate("Eliminar referencia")} ${item.reference}`} onClick={()=>removeItem(selectedPlan.id,item.id)}><Trash2 size={15}/></button></article>):!showItemForm&&<Empty icon={BookMarked} title={translate("Plan sin referencias")} text={translate("Añade las referencias que quieras estudiar.")}/>}
   </section>}
  </div>:!showPlanForm&&<section className="panel"><Empty icon={BookOpenText} title={translate("Aún no tienes planes")} text={translate("Crea un plan y añade tus propias referencias bíblicas y notas.")}/><button className="button primary small" onClick={()=>setShowPlanForm(true)}><Plus size={15}/> {translate("Crear primer plan")}</button></section>}
 </>;
}

function FollowUpsPage({items,save,toggle,remove}:any){
 const [showForm,setShowForm]=useState(false);
 const [draft,setDraft]=useState({dueDate:today(),category:"Visita pendiente",nextStep:"",notes:""});
 const ordered=[...items].sort((a:FollowUp,b:FollowUp)=>Number(a.done)-Number(b.done)||a.dueDate.localeCompare(b.dueDate));
 const submit=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();save({...draft,id:uid(),nextStep:draft.nextStep.trim(),notes:draft.notes.trim(),done:false});setDraft({dueDate:today(),category:"Visita pendiente",nextStep:"",notes:""});setShowForm(false);};
 return <>
  <PageHeading eyebrow={translate("MINISTERIO · TAREAS PERSONALES")} title={translate("Seguimiento")} desc={translate("Organiza próximos pasos de forma anónima, sin guardar información de contacto.")} action={<button className="button primary" onClick={()=>setShowForm(value=>!value)}><Plus size={17}/> {translate("Añadir seguimiento")}</button>}/>
  <div className="privacy-note"><ShieldCheck size={18}/><p><b>{translate("Privacidad:")}</b> {translate("los registros no tienen campos para nombres, teléfonos ni direcciones. Evita incluir datos identificables en las notas; esta app guarda información localmente sin cifrado.")}</p></div>
  {showForm&&<section className="panel followup-form-panel"><div className="panel-head"><div><div className="eyebrow">{translate("NUEVA TAREA ANÓNIMA")}</div><h3>{translate("Próximo paso")}</h3></div></div><form className="inline-form" onSubmit={submit}><div className="form-two"><label className="field">{translate("Tipo")}<select value={translate(draft.category)} onChange={event=>setDraft(current=>({...current,category:toStoredLabel(event.target.value,["Visita pendiente","Curso bíblico","Conversación","Otro"])}))}>{["Visita pendiente","Curso bíblico","Conversación","Otro"].map(category=><option key={category} value={translate(category)}>{translate(category)}</option>)}</select></label><label className="field">{translate("Fecha de seguimiento")}<input type="date" required value={draft.dueDate} onChange={event=>setDraft(current=>({...current,dueDate:event.target.value}))}/></label></div><label className="field">{translate("Próximo paso")}<input required value={draft.nextStep} onChange={event=>setDraft(current=>({...current,nextStep:event.target.value}))} placeholder={translate("Describe la tarea sin identificar a nadie")}/></label><label className="field">{translate("Nota general")}<textarea rows={2} value={draft.notes} onChange={event=>setDraft(current=>({...current,notes:event.target.value}))} placeholder={translate("Sin nombres ni datos de contacto")}/></label><div className="form-footer"><button type="button" className="button secondary" onClick={()=>setShowForm(false)}>{translate("Cancelar")}</button><button className="button primary"><Save size={15}/> {translate("Guardar tarea")}</button></div></form></section>}
  <section className="panel followup-list"><div className="panel-head"><div><div className="eyebrow">{translate("TAREAS")}</div><h3>{translate("Próximos seguimientos")}</h3></div><span className="count-pill">{items.filter((item:FollowUp)=>!item.done).length} {translate("pendientes")}</span></div>{ordered.length?ordered.map((item:FollowUp)=><article className={`followup-row ${item.done?"completed":""} ${!item.done&&item.dueDate<today()?"overdue":""}`} key={item.id}><button className="check-circle" aria-label={`${item.done?translate("Marcar pendiente"):translate("Marcar completado")}: ${item.nextStep}`} aria-pressed={item.done} onClick={()=>toggle(item.id)}>{item.done&&<Check size={15}/>}</button><div className="event-info"><b>{item.nextStep}</b><small>{translate(item.category)} {translate("·")}{" "}{dateLabel(item.dueDate,{day:"numeric",month:"short",year:"numeric"})}{!item.done&&item.dueDate<today()?` ${translate("·")} ${translate("Vencido")}`:""}</small>{item.notes&&<p>{item.notes}</p>}</div><button className="icon-button danger" aria-label={`${translate("Eliminar tarea:")} ${item.nextStep}`} onClick={()=>remove(item.id)}><Trash2 size={15}/></button></article>):<Empty icon={MapPin} title={translate("Sin seguimientos pendientes")} text={translate("Añade un próximo paso personal, sin guardar datos de contacto.")}/>}</section>
 </>;
}

function Routines({done,toggle,streak}:{done:Record<string,boolean>;toggle:(key:string)=>void;streak:number}){
 const count=routineCountForDay(done,today());
 const history=Array.from({length:7},(_,index)=>{const date=new Date(today()+"T12:00:00");date.setDate(date.getDate()-6+index);const key=dateKey(date);return {key,count:routineCountForDay(done,key),label:new Intl.DateTimeFormat(getLocale(),{weekday:"short"}).format(date),day:date.getDate(),isToday:key===today()};});
 return <>
  <PageHeading eyebrow={translate("HÁBITOS Y CONSTANCIA")} title={translate("Rutinas espirituales")} desc={translate("Marca las actividades que has completado hoy y revisa tu constancia de los últimos siete días.")}/>
  <div className="routine-history-grid" aria-label={translate("Resumen de rutinas de los últimos siete días")}>
   <section className="panel routine-streak-card"><div className="quick-icon"><Flame size={19}/></div><div><div className="eyebrow">{translate("RACHA DE RUTINAS")}</div><strong>{streak} {translate(streak===1?"día":"días")}</strong><small>{translate("Con al menos una rutina completada al día")}</small></div></section>
   <section className="panel routine-week-card"><div className="panel-head"><div><div className="eyebrow">{translate("CONSTANCIA")}</div><h3>{translate("Últimos 7 días")}</h3></div><CalendarDays size={19}/></div><div className="routine-week-days">{history.map(day=><div className={`routine-day ${day.count===routineList.length?"complete":day.count>0?"partial":""} ${day.isToday?"today":""}`} key={day.key} aria-label={`${day.label} ${day.day}: ${day.count} ${translate("de")} ${routineList.length} ${translate("rutinas")}`}><span>{day.label}</span><b>{day.day}</b><i>{day.count}</i></div>)}</div></section>
  </div>
  <section className="panel routine-panel"><div className="routine-progress"><div><span>{translate("PROGRESO DE HOY")}</span><b>{count} {translate("de")}{" "}{routineList.length}</b></div><div className="progress-track"><i style={{width:`${count/routineList.length*100}%`}}/></div></div>{routineList.map((routine,index)=>{const checked=!!done[today()+":"+routine];const icons=[Sparkles,BookOpenText,GraduationCap,BookMarked,Users,Leaf];const Icon=icons[index];return <button key={routine} className={`routine-row ${checked?"completed":""}`} aria-pressed={checked} onClick={()=>toggle(routine)}><span className="routine-icon"><Icon size={19}/></span><span className="routine-copy"><b>{translate(routine)}</b><small>{translate(["Dedica un momento al texto diario","Avanza en tu lectura de las Escrituras","Reserva tiempo para el estudio personal","Prepara el estudio de La Atalaya","Repasa el programa de la reunión","Organiza tu participación en el ministerio"][index])}</small></span><span className="check-circle">{checked&&<Check size={16}/>}</span></button>})}</section>
 </>;
}

function FocusPage({sessions,onSave,onRemove}:any){
 const [duration,setDuration]=useState(25);
 const [remaining,setRemaining]=useState(1500);
 const [running,setRunning]=useState(false);
 const [label,setLabel]=useState("Estudio personal");
 const [isOpen, setIsOpen] = useState(false);
 const options = ["Estudio personal", "Lectura bíblica", "Preparación de La Atalaya", "Preparación reunión semanal", "Preparación de discurso", "Estudio de publicaciones"];
 const todaySessions=sessions.filter((session:any)=>session.date===today());
 const todaySeconds=todaySessions.reduce((total:any,session:any)=>total+session.seconds,0);
 const history=[...sessions].reverse().slice(0,8);
 const elapsedSeconds=duration*60-remaining;
 useEffect(()=>{
  if(!running)return;
  const id=setInterval(()=>setRemaining(value=>Math.max(0,value-1)),1000);
  return()=>clearInterval(id);
 },[running]);
 useEffect(()=>{
  if(!running||remaining!==0)return;
  setRunning(false);
  onSave(duration*60,label);
  setRemaining(duration*60);
 },[remaining,running,duration,label,onSave]);
 const reset=(minutes=duration)=>{setRunning(false);setDuration(minutes);setRemaining(minutes*60)};
 const finishSession=()=>{if(elapsedSeconds<=0)return;setRunning(false);onSave(elapsedSeconds,label);setRemaining(duration*60)};
 const fmt=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
 const progress=(duration*60-remaining)/(duration*60)*100;
 return <>
  <PageHeading eyebrow={translate("TIEMPO CON PROPÓSITO")} title={translate("Enfoque")} desc={translate("Dedica tiempo a tus actividades y consulta el historial de sesiones completadas.")}/>
  <div className="focus-layout">
   <section className="panel focus-panel glass-panel">
    <div className="eyebrow">{translate("SESIÓN ACTUAL")}</div>
    <div className="custom-select" onClick={() => setIsOpen(!isOpen)}>
      <div className="select-trigger">
        <span>{translate(label)}</span>
        <ChevronDown size={16} className={`select-icon ${isOpen ? 'open' : ''}`}/>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="select-dropdown glass-panel"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {options.map((opt) => (
              <div
                key={opt}
                className={`select-option ${label === opt ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setLabel(opt);
                  setIsOpen(false);
                }}
              >
                {translate(opt)}
                {label === opt && <Check size={14} />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    <div className="timer-ring" style={{"--progress":`${progress}%`} as React.CSSProperties}><div><strong>{fmt(remaining)}</strong><small>{translate(running?"MANTÉN EL ENFOQUE":"TIEMPO DISPONIBLE")}</small></div></div>
    <div className="timer-controls">
     <button className="button primary" onClick={()=>setRunning(!running)}>{running?<Pause size={17}/>:<Play size={17}/>} {translate(running?"Pausar":elapsedSeconds?"Reanudar":"Comenzar")}</button>
     {elapsedSeconds>0&&<button className="button secondary" onClick={finishSession}><Check size={16}/> {translate("Guardar tiempo")}</button>}
     <button className="button secondary" onClick={()=>reset()}><RotateCcw size={16}/> {translate("Reiniciar")}</button>
    </div>
    <div className="presets">{[15,25,45,60].map(minutes=><button key={minutes} className={duration===minutes?"active":""} onClick={()=>reset(minutes)}>{minutes} {translate("min")}</button>)}</div>
   </section>
   <aside className="panel focus-aside"><div className="quick-icon large"><Sprout size={25}/></div><h3>{translate("Un momento para concentrarte")}</h3><p>{translate("Al completar el temporizador, la sesión se guarda automáticamente. También puedes guardar el tiempo transcurrido antes de terminar.")}</p><div className="focus-tip"><Sparkles size={16}/><span>{translate("La constancia se construye con pequeños espacios de atención cada día.")}</span></div></aside>
  </div>
  <section className="panel focus-history">
   <div className="panel-head"><div><div className="eyebrow">{translate("SEGUIMIENTO PERSONAL")}</div><h3>{translate("Historial de enfoque")}</h3></div><div className="focus-total"><span>{translate("Hoy")}</span><strong>{formatDuration(todaySeconds)}</strong></div></div>
   {history.length?history.map((session:any)=><div className="focus-session-row" key={session.id}><span className="focus-session-icon"><Timer size={17}/></span><div className="event-info"><b>{translate(session.label)}</b><small>{session.date===today()?translate("Hoy"):dateLabel(session.date,{weekday:"short",day:"numeric",month:"short"})}</small></div><strong>{formatDuration(session.seconds)}</strong><button className="icon-button danger" onClick={()=>onRemove(session.id)} aria-label={translate("Eliminar sesión")}><Trash2 size={15}/></button></div>):<Empty icon={History} title={translate("Aún no hay sesiones guardadas")} text={translate("Completa una sesión para empezar tu historial de enfoque.")}/>}
  </section>
 </>;
}

function ServicePage({reports,save,edit,remove,service,credit,exportSummary}:any){
 const rows=[...reports].sort((a:any,b:any)=>b.date.localeCompare(a.date));
 const currentMonth=reports.filter((report:any)=>report.date.startsWith(today().slice(0,7)));
 const courses=currentMonth.reduce((total:any,report:any)=>total+report.studies,0);
 return <><PageHeading eyebrow={translate("REGISTRO PERSONAL")} title={translate("Informe de servicio")} desc={translate("Registra cada salida y consulta un resumen mensual listo para compartir o archivar.")} action={<div className="heading-actions"><button className="button secondary" onClick={exportSummary}><Download size={16}/> {translate("Resumen mensual")}</button><button className="button primary" onClick={save}><Plus size={17}/> {translate("Añadir registro")}</button></div>}/><div className="stats-grid two service-stats"><StatCard icon={Clock3} label={translate("Tiempo de predicación")} value={`${Math.floor(service/60)}h ${service%60}m`} detail={translate("Total del mes actual")}/><StatCard icon={Sprout} label={translate("Horas de crédito")} value={`${Math.floor(credit/60)}h ${credit%60}m`} detail={translate("Separadas del tiempo de predicación")}/><StatCard icon={BookOpenText} label={translate("Cursos bíblicos")} value={courses} detail={translate("Registrados este mes")}/><StatCard icon={CalendarDays} label={translate("Registros del mes")} value={currentMonth.length} detail={translate("Salidas registradas")}/></div><section className="panel"><div className="panel-head"><div><div className="eyebrow">{translate("HISTORIAL")}</div><h3>{translate("Registros de actividad")}</h3></div><span className="count-pill">{rows.length} {translate("registros")}</span></div>{rows.length?rows.map((report:any)=><div className="report-row" key={report.id}> <div className="date-tile"><b>{new Date(report.date+"T12:00:00").getDate()}</b><small>{new Intl.DateTimeFormat(getLocale(),{month:"short"}).format(new Date(report.date+"T12:00:00"))}</small></div><div className="report-details"><b>{report.hours}{translate("h")}{" "}{report.minutes}{translate("m de predicación")}</b><small>{report.studies} {translate("cursos bíblicos ·")}{" "}{report.publications} {translate("publicaciones ·")}{" "}{report.videos} {translate("videos")}</small><small>{translate("Crédito:")}{" "}{report.creditHours}{translate("h")}{" "}{report.creditMinutes}{translate("m")}</small>{(report.location||report.companion)&&<small className="report-context">{[report.location&&`${translate("Lugar:")} ${report.location}`,report.companion&&`${translate("Acompañante:")} ${report.companion}`].filter(Boolean).join(" · ")}</small>}</div><button className="icon-button" onClick={()=>edit(report.id)} aria-label={translate("Editar registro")}><Pencil size={15}/></button><button className="icon-button danger" onClick={()=>remove(report.id)} aria-label={translate("Eliminar registro")}><Trash2 size={15}/></button></div>):<Empty icon={ChartNoAxesColumn} title={translate("Todavía no hay registros")} text={translate("Añade tu primera actividad para empezar el historial mensual.")}/>}</section><p className="subtle-note">{translate("Este registro es personal y flexible. No sustituye los procedimientos oficiales de informe de tu congregación.")}</p></>;
}

function TalksPage({talks,add,edit,remove,downloadAttachment,onBibleReference}:any){
 const [query,setQuery]=useState("");
 const [filter,setFilter]=useState("Todos");
 const [error,setError]=useState("");
 const filters=["Todos","Tema","Texto","Discurso"];
 const visibleTalks=useMemo(()=>{
  const search=normalizeText(query.trim());
  return talks.filter((talk:any)=>{
   const matchesSearch=!search||normalizeText([talk.title,talk.content,talk.topic||"",talk.texts||"",talk.kind,...(talk.tags||[])].join(" ")).includes(search);
   const matchesFilter=filter==="Todos"||(filter==="Tema"&&!!talk.topic?.trim())||(filter==="Texto"&&!!talk.texts?.trim())||(filter==="Discurso"&&(talk.kind==="Discurso"||talk.tags?.some((tag:any)=>normalizeText(tag)==="discurso")));
   return matchesSearch&&matchesFilter;
  });
 },[talks,query,filter]);
 const handleDownload=async(attachment:TalkAttachment)=>{setError("");try{await downloadAttachment(attachment);}catch(reason){setError(reason instanceof Error?translate(reason.message):translate("No se pudo descargar el adjunto."));}};
 const handleRemove=async(id:string)=>{setError("");try{await remove(id);}catch(reason){setError(reason instanceof Error?translate(reason.message):translate("No se pudo eliminar el documento y sus adjuntos."));}};
 return <>
  <PageHeading eyebrow={translate("PREPARACIÓN Y NOTAS")} title={translate("Biblioteca de discursos")} desc={translate("Organiza discursos y participaciones con temas, textos y etiquetas fáciles de encontrar.")} action={<button className="button primary" onClick={add}><Plus size={17}/> {translate("Nuevo documento")}</button>}/>
  <section className="panel library-tools"><label className="search-field"><Search size={17}/><input aria-label={translate("Buscar en la biblioteca")} value={query} onChange={event=>setQuery(event.target.value)} placeholder={translate("Buscar por título, tema, texto o etiqueta")}/></label><div className="library-filter-row"><div className="library-filters">{filters.map(item=><button key={item} className={filter===item?"active":""} aria-pressed={filter===item} onClick={()=>setFilter(item)}>{translate(item)}</button>)}</div><span className="count-pill">{visibleTalks.length} {translate(visibleTalks.length===1?"documento":"documentos")}</span></div></section>
  {error&&<p className="backup-error" role="alert">{error}</p>}
  {visibleTalks.length?<div className="talk-grid">{visibleTalks.map((talk:Talk)=><article className="talk-card" key={talk.id}>
   <div className="talk-card-top"><span className="file-icon"><FileText size={20}/></span><span className={`status-tag ${talk.status.toLowerCase()}`}>{translate(talk.status)}</span></div>
   <h3>{talk.title}</h3><p>{translate(talk.kind)} {talk.date?`· ${dateLabel(talk.date,{day:"numeric",month:"short"})}`:""}</p>
   {(talk.topic||talk.texts||(talk.tags?.length??0)>0)&&<div className="talk-tags">{talk.topic&&<span><Tag size={12}/> {translate("Tema:")}{" "}{talk.topic}</span>}{talk.texts&&<span><BookOpenText size={12}/> {talk.texts}</span>}{talk.tags?.map(tag=><span key={tag}><Tag size={12}/>{tag}</span>)}</div>}
   <div className="talk-preview">{talk.content.slice(0,160)||translate("Sin contenido todavía.")}</div>
   <BibleReferenceButtons value={`${talk.content} ${talk.texts||""}`} onSelect={onBibleReference}/>
   {!!talk.attachments.length&&<div className="talk-attachments"><b>{translate("Adjuntos ·")}{" "}{talk.attachments.length}{translate("/")}{MAX_TALK_ATTACHMENTS}</b>{talk.attachments.map(attachment=><div className="talk-attachment-row" key={attachment.id}><span><FileText size={14}/>{attachment.name}<small>{formatFileSize(attachment.size)}</small></span><button className="icon-button" onClick={()=>handleDownload(attachment)} aria-label={`${translate("Descargar")} ${attachment.name}`}><Download size={15}/></button></div>)}</div>}
   <div className="talk-actions"><button className="button secondary small" onClick={()=>edit(talk.id)}><Pencil size={14}/> {translate("Abrir y editar")}</button><button className="icon-button danger" onClick={()=>handleRemove(talk.id)} aria-label={`${translate("Eliminar ")}${talk.title} ${translate("y sus adjuntos")}`}><Trash2 size={15}/></button></div>
  </article>)}</div>:<section className="panel"><Empty icon={BookOpenText} title={translate(talks.length?"No hay coincidencias":"Tu biblioteca está vacía")} text={translate(talks.length?"Prueba con otra búsqueda o cambia el filtro.":"Crea un documento y añade temas, textos y etiquetas para encontrarlo fácilmente.")}/></section>}
 </>;
}

function BibleReferenceButtons({value,onSelect}:{value:string;onSelect:(reference:string)=>void}){
 const references=useMemo(()=>findBibleReferences(value),[value]);
 if(!references.length)return null;
 return <div className="bible-reference-buttons" aria-label={translate("Referencias bíblicas detectadas")}>{references.map(reference=><button type="button" key={reference} className="bible-reference-chip" onClick={()=>onSelect(reference)}><BookOpenText size={14}/>{reference}</button>)}</div>;
}

function BibleReferencePanel({reference,minimized,setMinimized,close}:{reference:string;minimized:boolean;setMinimized:(value:boolean)=>void;close:()=>void}){
 const dragControls=useDragControls();
 return <motion.aside className={`bible-reference-panel ${minimized?"minimized":""}`} drag dragControls={dragControls} dragListener={false} dragMomentum={false} dragElastic={0.04} initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:.98}} transition={{duration:.2}} aria-label={translate("Panel de referencia bíblica")}>
  <header className="bible-panel-header" onPointerDown={event=>{if(event.target instanceof HTMLElement&&event.target.closest("button"))return;dragControls.start(event);}}><span className="bible-panel-handle"><Move size={14}/></span><span><b>{translate("Referencia bíblica")}</b><small>{reference}</small></span><button className="icon-button" aria-label={translate(minimized?"Restaurar panel":"Minimizar panel")} onClick={()=>setMinimized(!minimized)}>{minimized?<Maximize2 size={16}/>:<Minus size={16}/>}</button><button className="icon-button" aria-label={translate("Cerrar panel bíblico")} onClick={close}><X size={16}/></button></header>
  {!minimized&&<div className="bible-panel-content"><p>{translate("Consulta esta referencia en el sitio oficial. El panel no reproduce el texto bíblico.")}</p><a className="button primary" href={`https://www.jw.org/es/busqueda/?q=${encodeURIComponent(reference)}`} target="_blank" rel="noreferrer">{translate("Buscar en JW.ORG")}{" "}<ExternalLink size={15}/></a></div>}
 </motion.aside>;
}

function RemindersPage({reminders,add,edit,toggle,remove}:any){
 return <>
  <PageHeading eyebrow={translate("AVISOS PERSONALES")} title={translate("Recordatorios")} desc={translate("Programa avisos para tus actividades y compromisos.")} action={<button className="button primary" onClick={add}><Plus size={17}/> {translate("Nuevo recordatorio")}</button>}/>
  <section className="panel">{reminders.length?reminders.map((reminder:any)=><div className="reminder-row" key={reminder.id}><div className="reminder-icon"><Bell size={18}/></div><div className="event-info"><b>{reminder.title}</b><small>{dateLabel(reminder.date,{day:"numeric",month:"short",year:"numeric"})} {translate("·")}{" "}{reminder.time} {translate("·")}{" "}{translate(reminder.repeat)}</small></div><button className={`toggle ${reminder.enabled?"on":""}`} onClick={()=>toggle(reminder.id)} aria-label={`${translate(reminder.enabled?"Desactivar":"Activar")} ${reminder.title}`} aria-pressed={reminder.enabled}><i/></button><button className="icon-button" onClick={()=>edit(reminder.id)} aria-label={`${translate("Editar ")}${reminder.title}`}><Pencil size={15}/></button><button className="icon-button danger" onClick={()=>remove(reminder.id)} aria-label={`${translate("Eliminar ")}${reminder.title}`}><Trash2 size={15}/></button></div>):<Empty icon={Bell} title={translate("Sin recordatorios")} text={translate("Añade avisos para no olvidar tus actividades importantes.")}/>}</section>
  <div className="notice"><Bell size={17}/><p>{translate("Los avisos dentro de la aplicación funcionan mientras JW Tracker está abierto. Las notificaciones fiables con la aplicación cerrada requieren configurar notificaciones push y un servicio backend.")}</p></div>
 </>;
}


function ProfilePage({profile,save,user}:any){
 const [name,setName]=useState(profile.name || user?.name || "");
 const [congregation,setCongregation]=useState(profile.congregation || "");

 useEffect(()=>{
  setName(profile.name || user?.name || "");
  setCongregation(profile.congregation || "");
 },[profile.name,profile.congregation,user?.name]);

 return <>
  <PageHeading
   eyebrow={translate("TU ESPACIO")}
   title={translate("Perfil")}
   desc={translate("Personaliza tu espacio con tu nombre y congregación.")}
  />
  <div className="profile-layout">
   <section className="panel profile-card">
    <div className="profile-avatar-large"><UserRound size={28}/></div>
    <div>
     <div className="eyebrow">{translate("CUENTA PERSONAL")}</div>
     <h2>{name || translate("Mi perfil")}</h2>
     <p>{user?.email || translate("Correo no disponible")}</p>
     <p>{congregation || translate("Aún no has añadido una congregación")}</p>
    </div>
    <span className="connection-pill">
     <span className="status-dot"/> {translate("Cuenta conectada")}
    </span>
   </section>

   <section className="panel profile-form">
    <div className="panel-head">
     <div>
      <div className="eyebrow">{translate("INFORMACIÓN PERSONAL")}</div>
      <h3>{translate("Datos del perfil")}</h3>
     </div>
     <UserRound size={20}/>
    </div>
    <form onSubmit={e=>{
     e.preventDefault();
     save(name.trim(),congregation.trim());
    }}>
     <label className="field">
      {translate("Nombre")}
      <input value={name} onChange={e=>setName(e.target.value)} placeholder={translate("Tu nombre")}/>
     </label>
     <label className="field">
      {translate("Correo electrónico")}
      <input value={user?.email || ""} readOnly/>
     </label>
     <label className="field">
      {translate("Congregación")}
      <input value={congregation} onChange={e=>setCongregation(e.target.value)} placeholder={translate("Nombre de la congregación")}/>
     </label>
     <p className="settings-copy">
      {translate("Tu cuenta está vinculada a este perfil. Puedes actualizar tu nombre y congregación.")}
     </p>
     <button className="button primary" type="submit">
      <Save size={16}/> {translate("Guardar perfil")}
     </button>
    </form>
   </section>
  </div>
 </>;
}

function BackupImport({onImport}:any){
 const inputRef=useRef<HTMLInputElement>(null);
 const [error,setError]=useState("");
 const readFile=async(event:any)=>{
  const input=event.currentTarget;
  const file=input.files?.[0];
  if(!file)return;
  setError("");
  try{
   if(file.size>5*1024*1024)throw new Error(translate("El archivo supera el límite de 5 MB."));
   const backup=parseBackup(JSON.parse(await file.text()));
   await onImport(backup);
  }catch(reason){
   setError(reason instanceof SyntaxError?translate("El archivo no contiene un JSON válido."):reason instanceof Error?translate(reason.message):translate("No se pudo leer la copia de seguridad."));
  }finally{input.value="";}
 };
 return <div className="backup-import">
  <input ref={inputRef} className="visually-hidden" type="file" accept=".json,application/json" tabIndex={-1} aria-hidden="true" onChange={readFile}/>
  <button type="button" className="button secondary full" onClick={()=>inputRef.current?.click()}><Upload size={16}/> {translate("Importar copia de seguridad (.json)")}</button>
  {error&&<p className="backup-error" role="alert">{error}</p>}
 </div>;
}


function AdminPage({data,setPage,exportData,importData,reset}:any){
 const completedRoutines=routineList.filter(item=>data.routineDone[today()+":"+item]).length;

 return <>
  <PageHeading
   eyebrow={translate("GESTIÓN DE DATOS")}
   title={translate("Administrador")}
   desc={translate("Resumen y herramientas para organizar la información de tu cuenta.")}
  />

  <div className="admin-notice">
   <ShieldCheck size={19}/>
   <p>
    <b>{translate("Cuenta y almacenamiento")}</b>{" "}
    {translate("Los datos generales pueden sincronizarse con tu cuenta cuando tienes una sesión activa. Los informes se gestionan por separado y los archivos adjuntos permanecen almacenados en este dispositivo.")}
   </p>
  </div>

  <div className="stats-grid admin-stats">
   <StatCard icon={CalendarDays} label={translate("Actividades")} value={data.events.length} detail={translate("En tu calendario")}/>
   <StatCard icon={Users} label={translate("Horarios semanales")} value={data.meetingSchedules.length} detail={translate("Reuniones configuradas")}/>
   <StatCard icon={BookOpenText} label={translate("Preparaciones")} value={data.meetingPreparations.length} detail={translate("Asignaciones personales")}/>
   <StatCard icon={BookMarked} label={translate("Planes de estudio")} value={data.studyPlans.length} detail={translate("Planes creados")}/>
   <StatCard icon={MapPin} label={translate("Seguimientos")} value={data.followUps.length} detail={translate("Tareas anónimas")}/>
   <StatCard icon={ChartNoAxesColumn} label={translate("Informes")} value={data.reports.length} detail={translate("Registros de servicio")}/>
   <StatCard icon={FileText} label={translate("Documentos")} value={data.talks.length} detail={translate("Bosquejos y notas")}/>
   <StatCard icon={Timer} label={translate("Sesiones de enfoque")} value={data.focusSessions.length} detail={translate("Temporizadores completados")}/>
   <StatCard icon={Bell} label={translate("Recordatorios")} value={data.reminders.length} detail={translate("Avisos configurados")}/>
  </div>

  <div className="admin-grid">
   <section className="panel">
    <div className="panel-head">
     <div>
      <div className="eyebrow">{translate("GESTIÓN")}</div>
      <h3>{translate("Accesos rápidos")}</h3>
     </div>
     <Database size={20}/>
    </div>

    <div className="admin-links">
     <button className="admin-link" onClick={()=>setPage("Perfil")}>
      <UserRound size={18}/>
      <span>
       <b>{translate("Perfil y congregación")}</b>
       <small>{data.profile.name||translate("Completa la información del perfil")}</small>
      </span>
      <ArrowUpRight size={16}/>
     </button>

     <button className="admin-link" onClick={()=>setPage("Calendario")}>
      <CalendarDays size={18}/>
      <span>
       <b>{translate("Administrar actividades")}</b>
       <small>{translate("Revisar el calendario y sus registros")}</small>
      </span>
      <ArrowUpRight size={16}/>
     </button>

     <button className="admin-link" onClick={()=>setPage("Servicio")}>
      <ChartNoAxesColumn size={18}/>
      <span>
       <b>{translate("Revisar informes")}</b>
       <small>{translate("Consultar y editar registros de servicio")}</small>
      </span>
      <ArrowUpRight size={16}/>
     </button>

     <button className="admin-link" onClick={()=>setPage("Recordatorios")}>
      <Bell size={18}/>
      <span>
       <b>{translate("Gestionar recordatorios")}</b>
       <small>{data.reminders.filter((reminder:any)=>reminder.enabled).length} {translate("activos")}</small>
      </span>
      <ArrowUpRight size={16}/>
     </button>
    </div>
   </section>

   <section className="panel admin-data-panel">
    <div className="panel-head">
     <div>
      <div className="eyebrow">{translate("RESPALDO Y CONTROL")}</div>
      <h3>{translate("Datos de la aplicación")}</h3>
     </div>
     <Database size={20}/>
    </div>

    <p className="settings-copy">
     {translate("La copia JSON contiene los datos de la aplicación, incluidos los informes exportados. Los archivos adjuntos de los documentos se almacenan por separado y no se incluyen en el respaldo.")}
    </p>

    <button className="button secondary full" onClick={exportData}>
     <Download size={16}/> {translate("Descargar copia de seguridad")}
    </button>

    <BackupImport onImport={importData}/>

    <p className="backup-note">
     {translate("Al restaurar, se reemplaza el estado de la aplicación y se eliminan los adjuntos locales actuales. Los informes se gestionan por separado y esta restauración no garantiza que se reemplacen en el servidor.")}
    </p>


    <button className="button danger-outline full" onClick={reset}>
     <Trash2 size={16}/> {translate("Reiniciar datos de la aplicación")}
    </button>

    <p className="backup-note">
     {translate("El reinicio también puede sincronizar los datos generales vacíos con tu cuenta. Los informes del servidor se gestionan por separado y no se eliminan automáticamente con esta acción.")}
    </p>

    <button className="text-button admin-help-link" onClick={()=>setPage("Ayuda")}>
     <CircleHelp size={15}/> {translate("Ver ayuda y privacidad")}
    </button>
   </section>
  </div>

  <div className="admin-footer">
   <span>
    <Check size={15}/> {translate("Rutinas de hoy:")}{" "}
    {completedRoutines} {translate("de")}{" "}
    {routineList.length}
   </span>
   <span>
    <Database size={15}/> {translate("Sincronización de cuenta disponible")}
   </span>
  </div>
 </>;
}


function GoalSettings({goals,save}:{goals:PersonalGoals;save:(goals:PersonalGoals)=>void}){
 const [weekly,setWeekly]=useState(String(goals.weeklyStudyHours));
 const [monthly,setMonthly]=useState(String(goals.monthlyServiceHours));
 const [error,setError]=useState("");
 useEffect(()=>{setWeekly(String(goals.weeklyStudyHours));setMonthly(String(goals.monthlyServiceHours));},[goals.weeklyStudyHours,goals.monthlyServiceHours]);
 const submit=(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  const weeklyStudyHours=Number(weekly),monthlyServiceHours=Number(monthly);
  if(!Number.isFinite(weeklyStudyHours)||weeklyStudyHours<0||weeklyStudyHours>168||!Number.isFinite(monthlyServiceHours)||monthlyServiceHours<0||monthlyServiceHours>744){setError(translate("Usa valores válidos: hasta 168 h por semana y 744 h por mes."));return;}
  setError("");
  save({weeklyStudyHours,monthlyServiceHours});
 };
 return <section className="panel goal-settings"><div className="panel-head"><div><div className="eyebrow">{translate("METAS PERSONALES")}</div><h3>{translate("Objetivos de tiempo")}</h3></div><Target size={20}/></div><p className="settings-copy">{translate("Define tus objetivos para ver el avance en Inicio. Usa 0 si no quieres establecer una meta.")}</p><form className="goal-settings-form" onSubmit={submit}><label className="field">{translate("Estudio semanal (horas)")}<input type="number" min="0" max="168" step="0.5" required value={weekly} onChange={event=>setWeekly(event.target.value)}/></label><label className="field">{translate("Servicio mensual (horas)")}<input type="number" min="0" max="744" step="0.5" required value={monthly} onChange={event=>setMonthly(event.target.value)}/></label><button className="button primary"><Save size={15}/> {translate("Guardar metas")}</button>{error&&<p className="backup-error" role="alert">{error}</p>}</form></section>;
}

function SettingsPage({data,update,exportData,importData,reset,t}:any){
 return <>
  <PageHeading eyebrow={translate("PREFERENCIAS")} title={t.settings} desc={translate("Personaliza la apariencia y administra la privacidad de este dispositivo.")}/>
  <div className="settings-grid">
   <GoalSettings goals={data.goals} save={(goals:PersonalGoals)=>update({goals})}/>
   <section className="panel"><div className="panel-head"><div><div className="eyebrow">{translate("APARIENCIA")}</div><h3>{translate("Tema de color")}</h3></div><Sparkles size={20}/></div><div className="theme-options">
    <button className={`theme-option ${data.theme==="light"?"active":""}`} aria-pressed={data.theme==="light"} onClick={()=>update({theme:"light"})}><span className="theme-preview preview-light"><Sun size={20}/></span><span><b>{translate("Blanco")}</b><small>{translate("Interfaz clara y luminosa")}</small></span>{data.theme==="light"&&<Check size={17}/>}</button>
    <button className={`theme-option ${data.theme==="dark"?"active":""}`} aria-pressed={data.theme==="dark"} onClick={()=>update({theme:"dark"})}><span className="theme-preview preview-dark"><Moon size={20}/></span><span><b>{translate("Negro")}</b><small>{translate("Interfaz oscura y de alto contraste")}</small></span>{data.theme==="dark"&&<Check size={17}/>}</button>
   </div>
   <div className="setting-row"><div><b>{translate("Color de acento")}</b><small>{translate("Elige el tono de los detalles")}</small></div><div className="swatches">
    <button className={`swatch forest ${data.accent==="bosque"?"selected":""}`} onClick={()=>update({accent:"bosque"})} title={translate("Bosque")} aria-label={translate("Acento bosque")} aria-pressed={data.accent==="bosque"}/>
    <button className={`swatch sage ${data.accent==="salvia"?"selected":""}`} onClick={()=>update({accent:"salvia"})} title={translate("Salvia")} aria-label={translate("Acento salvia")} aria-pressed={data.accent==="salvia"}/>
    <button className={`swatch pine ${data.accent==="pino"?"selected":""}`} onClick={()=>update({accent:"pino"})} title={translate("Pino")} aria-label={translate("Acento pino")} aria-pressed={data.accent==="pino"}/>
    <button className={`swatch graphite ${data.accent==="graphite"?"selected":""}`} onClick={()=>update({accent:"graphite"})} title={translate("Grafito")} aria-label={translate("Acento grafito")} aria-pressed={data.accent==="graphite"}/>
   </div></div>
   <div className="setting-row"><div><b>{t.lang}</b><small>{translate("Elige el idioma")}</small></div><div className="segmented"><button className={data.lang==="es"?"active":""} onClick={()=>update({lang:"es"})}>{translate("ES")}</button><button className={data.lang==="en"?"active":""} onClick={()=>update({lang:"en"})}>{translate("EN")}</button><button className={data.lang==="fr"?"active":""} onClick={()=>update({lang:"fr"})}>{translate("FR")}</button><button className={data.lang==="pt"?"active":""} onClick={()=>update({lang:"pt"})}>{translate("PT")}</button></div></div>
   <div className="setting-row"><div><b>{translate("Sonido de interfaz")}</b><small>{translate("Preferencia de sonido para avisos")}</small></div><button className={`toggle ${data.sound?"on":""}`} aria-pressed={data.sound} aria-label={translate("Activar o desactivar sonido")} onClick={()=>update({sound:!data.sound})}><i/></button></div></section>
   <section className="panel"><div className="panel-head"><div><div className="eyebrow">{translate("TUS DATOS")}</div><h3>{translate("Respaldo y privacidad")}</h3></div><Database size={20}/></div><p className="settings-copy">{translate("Los datos generales se conservan en el navegador y, cuando tienes una sesión activa, se sincronizan con tu cuenta. Los informes se gestionan por separado. Los archivos adjuntos permanecen en este dispositivo y no se incluyen en el respaldo JSON.")}</p><button className="button secondary full" onClick={exportData}><Download size={16}/> {translate("Exportar copia de seguridad (.json)")}</button><BackupImport onImport={importData}/><p className="backup-note">{translate("Restaurar una copia reemplazará los datos de la aplicación en este dispositivo y eliminará los adjuntos locales actuales. Los informes se gestionan mediante su sincronización independiente.")}</p><button className="button danger-outline full" onClick={reset}><Trash2 size={16}/> {translate("Borrar todos los datos locales")}</button></section>
   <section className="panel">
  <div className="eyebrow">{translate("ESTADO DE LA CUENTA")}</div>
  <h3>{translate("Cuenta y sincronización")}</h3>
  <p className="settings-copy">
    {translate("JW Tracker utiliza Better Auth para gestionar las sesiones. Los datos generales de tu cuenta se sincronizan mediante la API de Cloudflare y mantienen una copia local en el navegador. Los informes utilizan endpoints independientes; los archivos adjuntos permanecen en este dispositivo.")}
  </p>
  <span className="connection-pill">
    <span className="status-dot"/>
    {translate("Almacenamiento local y sincronización de cuenta")}
  </span>
</section>
  </div>
 </>;
}

function HelpPage({ setPage }: any) {
  return (
    <>
      <PageHeading
        eyebrow={translate("INFORMACIÓN")}
        title={translate("Ayuda y privacidad")}
        desc={translate("Conoce cómo funciona JW Tracker, dónde se guardan tus datos y cómo proteger tu información.")}
      />

      <div className="help-actions">
        <button className="help-action" onClick={() => setPage("Perfil")}>
          <UserRound size={18} />
          <span>
            <b>{translate("Configurar mi perfil")}</b>
            <small>{translate("Nombre y congregación")}</small>
          </span>
          <ArrowUpRight size={16} />
        </button>

        <button className="help-action" onClick={() => setPage("Ajustes")}>
          <Sun size={18} />
          <span>
            <b>{translate("Personalizar la aplicación")}</b>
            <small>{translate("Tema, apariencia y preferencias")}</small>
          </span>
          <ArrowUpRight size={16} />
        </button>

        <button className="help-action" onClick={() => setPage("Reuniones")}>
          <Users size={18} />
          <span>
            <b>{translate("Preparar reuniones")}</b>
            <small>{translate("Horarios y asignaciones personales")}</small>
          </span>
          <ArrowUpRight size={16} />
        </button>

        <button className="help-action" onClick={() => setPage("Estudio")}>
          <BookMarked size={18} />
          <span>
            <b>{translate("Planes de estudio")}</b>
            <small>{translate("Objetivos, referencias y notas")}</small>
          </span>
          <ArrowUpRight size={16} />
        </button>

        <button className="help-action" onClick={() => setPage("Administrador")}>
          <ShieldCheck size={18} />
          <span>
            <b>{translate("Panel de administración")}</b>
            <small>{translate("Gestión y respaldo de tus datos")}</small>
          </span>
          <ArrowUpRight size={16} />
        </button>
      </div>

      <div className="help-list">
        <article className="panel">
          <div className="help-title">
            <Database size={18} />
            <h3>{translate("¿Dónde se guardan mis datos?")}</h3>
          </div>
          <p>
            {translate("JW Tracker utiliza almacenamiento local y sincronización con el servidor. Los datos generales de tu cuenta se guardan mediante la API de Cloudflare y se conserva una copia local en el navegador para facilitar el funcionamiento de la aplicación.")}
          </p>
        </article>

        <article className="panel">
          <div className="help-title">
            <ShieldCheck size={18} />
            <h3>{translate("¿Cómo funciona mi cuenta?")}</h3>
          </div>
          <p>
            {translate("La autenticación utiliza Better Auth. Tu sesión permite identificar tu cuenta y asociar tus datos personales a ella. No compartas tus credenciales con otras personas.")}
          </p>
        </article>

        <article className="panel">
          <div className="help-title">
            <FileText size={18} />
            <h3>{translate("¿Qué información se sincroniza?")}</h3>
          </div>
          <p>
            {translate("Los informes de servicio se gestionan mediante endpoints independientes. Los datos generales de la aplicación, como perfil, actividades, rutinas, metas, reuniones y planes de estudio, se sincronizan mediante la API de cuenta. La sincronización requiere conexión a Internet.")}
          </p>
        </article>

        <article className="panel">
          <div className="help-title">
            <Database size={18} />
            <h3>{translate("¿Qué ocurre con mis archivos adjuntos?")}</h3>
          </div>
          <p>
            {translate("Los archivos PDF, DOC y DOCX asociados a los discursos se guardan en IndexedDB en este dispositivo. Actualmente no se sincronizan con Cloudflare ni se incluyen en el respaldo JSON. Si utilizas otro dispositivo, tendrás que añadirlos nuevamente.")}
          </p>
        </article>

        <article className="panel">
          <div className="help-title">
            <ShieldCheck size={18} />
            <h3>{translate("¿Cómo proteger mi privacidad?")}</h3>
          </div>
          <p>
            {translate("Evita introducir información personal innecesaria en tus notas y seguimientos. Protege tu dispositivo, utiliza una contraseña segura y cierra tu sesión cuando utilices un equipo compartido. La copia local del navegador no debe considerarse un almacenamiento cifrado.")}
          </p>
        </article>

        <article className="panel">
          <div className="help-title">
            <FileText size={18} />
            <h3>{translate("¿Cómo funcionan las copias de seguridad?")}</h3>
          </div>
          <p>
            {translate("Puedes utilizar las opciones de respaldo del panel de administración para exportar y restaurar los datos compatibles. El archivo JSON no contiene los archivos adjuntos de los discursos. Conserva tus copias en un lugar seguro.")}
          </p>
        </article>

        <article className="panel">
          <div className="help-title">
            <BookMarked size={18} />
            <h3>{translate("¿Cómo funcionan las referencias bíblicas?")}</h3>
          </div>
          <p>
            {translate("JW Tracker permite detectar referencias bíblicas en tus discursos y notas. Puedes seleccionarlas para abrir el panel de consulta y acceder a una búsqueda en JW.ORG.")}
          </p>
        </article>

        <article className="panel">
          <div className="help-title">
            <Bell size={18} />
            <h3>{translate("¿Cómo funcionan los recordatorios?")}</h3>
          </div>
          <p>
            {translate("Los recordatorios ayudan a organizar tus actividades. La disponibilidad de avisos depende de las funciones de notificación implementadas y de los permisos de tu dispositivo. No todos los recordatorios implican notificaciones push en segundo plano.")}
          </p>
        </article>

        <article className="panel">
          <div className="help-title">
            <CircleHelp size={18} />
            <h3>{translate("¿JW Tracker es una aplicación oficial?")}</h3>
          </div>
          <p>
            {translate("No. JW Tracker es una herramienta independiente de organización personal. No está afiliada, patrocinada ni respaldada por los Testigos de Jehová ni por ninguna entidad oficial. No sustituye a JW.ORG ni a las publicaciones oficiales.")}
          </p>
        </article>
      </div>
    </>
  );
}


function Modal({title,close,children}:any){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><motion.div className="modal" initial={{opacity:0,y:15,scale:.98}} animate={{opacity:1,y:0,scale:1}}><div className="modal-head"><h3>{title}</h3><button className="icon-button" aria-label={translate("Cerrar")} onClick={close}><X size={18}/></button></div>{children}</motion.div></div>}

function EventForm({initial,date,save}:any){
 const [title,setTitle]=useState(initial?.title||"");
 const [category,setCategory]=useState(initial?.category||"Predicación");
 const [day,setDay]=useState(initial?.date||date);
 const [time,setTime]=useState(initial?.time||"09:00");
 const [notes,setNotes]=useState(initial?.notes||"");
 return <form onSubmit={event=>{event.preventDefault();save({id:initial?.id||uid(),title,category,date:day,time,notes,done:initial?.done||false})}}>
  <label className="field">{translate("Nombre de la actividad")}<input required value={title} onChange={event=>setTitle(event.target.value)} placeholder={translate("Nombre breve de la actividad")}/></label>
  <div className="form-two"><label className="field">{translate("Categoría")}<select value={category} onChange={event=>setCategory(event.target.value)}>{categories.map(item=><option key={item} value={item}>{translate(item)}</option>)}</select></label><label className="field">{translate("Fecha")}<input type="date" required value={day} onChange={event=>setDay(event.target.value)}/></label></div>
  <label className="field">{translate("Hora")}<input type="time" value={time} onChange={event=>setTime(event.target.value)}/></label>
  <label className="field">{translate("Notas")}<textarea value={notes} onChange={event=>setNotes(event.target.value)} rows={3} placeholder={translate("Detalles adicionales")}/></label>
  <FormActions/>
 </form>;
}

function ReportForm({initial,save}:any){
 const [v,setV]=useState({date:initial?.date||today(),hours:initial?.hours||0,minutes:initial?.minutes||0,creditHours:initial?.creditHours||0,creditMinutes:initial?.creditMinutes||0,studies:initial?.studies||0,publications:initial?.publications||0,videos:initial?.videos||0,notes:initial?.notes||"",location:initial?.location||"",companion:initial?.companion||""});
 const set=(key:any,value:any)=>setV(previous=>({...previous,[key]:value}));
 return <form onSubmit={event=>{event.preventDefault();save({id:initial?.id||uid(),...v})}}><label className="field">{translate("Fecha del registro")}<input type="date" value={v.date} onChange={event=>set("date",event.target.value)}/></label><div className="form-two"><label className="field">{translate("Lugar")}<input value={v.location} onChange={event=>set("location",event.target.value)} placeholder={translate("Zona o lugar de predicación")}/></label><label className="field">{translate("Acompañante")}<input value={v.companion} onChange={event=>set("companion",event.target.value)} placeholder={translate("Nombre del acompañante")}/></label></div><div className="form-section-title">{translate("Tiempo de predicación")}</div><div className="form-two"><label className="field">{translate("Horas")}<input type="number" min="0" value={v.hours} onChange={event=>set("hours",+event.target.value)}/></label><label className="field">{translate("Minutos")}<input type="number" min="0" max="59" value={v.minutes} onChange={event=>set("minutes",+event.target.value)}/></label></div><div className="form-section-title">{translate("Horas de crédito · separadas")}</div><div className="form-two"><label className="field">{translate("Horas")}<input type="number" min="0" value={v.creditHours} onChange={event=>set("creditHours",+event.target.value)}/></label><label className="field">{translate("Minutos")}<input type="number" min="0" max="59" value={v.creditMinutes} onChange={event=>set("creditMinutes",+event.target.value)}/></label></div><div className="form-section-title">{translate("Actividad adicional")}</div><div className="form-three"><label className="field">{translate("Cursos bíblicos")}<input type="number" min="0" value={v.studies} onChange={event=>set("studies",+event.target.value)}/></label><label className="field">{translate("Publicaciones")}<input type="number" min="0" value={v.publications} onChange={event=>set("publications",+event.target.value)}/></label><label className="field">{translate("Videos")}<input type="number" min="0" value={v.videos} onChange={event=>set("videos",+event.target.value)}/></label></div><label className="field">{translate("Notas")}<textarea rows={2} value={v.notes} onChange={event=>set("notes",event.target.value)}/></label><FormActions/></form>;
}

function TalkForm({initial,save,onBibleReference}:{initial:Talk|undefined;save:(talk:TalkDraft)=>Promise<void>;onBibleReference:(reference:string)=>void}){
 const [v,setV]=useState({title:initial?.title||"",kind:initial?.kind||"Discurso",status:initial?.status||"Borrador",date:initial?.date||"",content:initial?.content||"",topic:initial?.topic||"",texts:initial?.texts||""});
 const [tags,setTags]=useState((initial?.tags||[]).join(", "));
 const [newFiles,setNewFiles]=useState<File[]>([]);
 const [removedAttachmentIds,setRemovedAttachmentIds]=useState<string[]>([]);
 const [attachmentError,setAttachmentError]=useState("");
 const [saving,setSaving]=useState(false);
 const set=(key:any,value:any)=>setV(previous=>({...previous,[key]:value}));
 const keptAttachments=(initial?.attachments||[]).filter(file=>!removedAttachmentIds.includes(file.id));
 const references=useMemo(()=>findBibleReferences(`${v.content} ${v.texts}`),[v.content,v.texts]);
 const addFiles=(event:React.ChangeEvent<HTMLInputElement>)=>{
  const selected=Array.from(event.currentTarget.files||[]);
  const accepted:File[]=[];
  const errors:string[]=[];
  for(const file of selected){
   const extension=file.name.split(".").pop()?.toLowerCase()||"";
   if(!attachmentExtensions.includes(extension)){errors.push(`${file.name}: ${translate("formato no permitido.")}`);continue;}
   if(file.size>MAX_TALK_ATTACHMENT_BYTES){errors.push(`${file.name}: ${translate("supera el límite de 20 MB.")}`);continue;}
   if(keptAttachments.length+newFiles.length+accepted.length>=MAX_TALK_ATTACHMENTS){errors.push(translate("Solo puedes adjuntar hasta 5 archivos por discurso."));continue;}
   accepted.push(file);
  }
  if(accepted.length)setNewFiles(current=>[...current,...accepted]);
  setAttachmentError(errors.join(" "));
  event.currentTarget.value="";
 };
 const submit=async(event:React.FormEvent<HTMLFormElement>)=>{
  event.preventDefault();
  setAttachmentError("");
  setSaving(true);
  try{
   await save({id:initial?.id||uid(),...v,tags:tags.split(",").map(tag=>tag.trim()).filter(Boolean),attachments:keptAttachments,newFiles,removeAttachmentIds:removedAttachmentIds});
  }catch(reason){
   setAttachmentError(reason instanceof Error?translate(reason.message):translate("No se pudo guardar el documento y sus adjuntos."));
  }finally{setSaving(false);}
 };
 const download=()=>downloadBlob(new Blob([v.content],{type:"text/markdown"}),(v.title||"bosquejo").replace(/[^a-z0-9-_]/gi,"-")+".md");
 return <form className="talk-form" onSubmit={submit}>
  <label className="field">{translate("Título")}<input required value={v.title} onChange={event=>set("title",event.target.value)} placeholder={translate("Título del bosquejo")}/></label>
  <div className="form-two"><label className="field">{translate("Tipo")}<select value={translate(v.kind)} onChange={event=>set("kind",toStoredLabel(event.target.value,["Discurso","Comentario","Demostración","Asignación estudiantil","Notas de reunión"]))}>{["Discurso","Comentario","Demostración","Asignación estudiantil","Notas de reunión"].map(item=><option key={item} value={translate(item)}>{translate(item)}</option>)}</select></label><label className="field">{translate("Estado")}<select value={translate(v.status)} onChange={event=>set("status",toStoredLabel(event.target.value,["Borrador","Preparando","Listo","Presentado"]))}>{["Borrador","Preparando","Listo","Presentado"].map(item=><option key={item} value={translate(item)}>{translate(item)}</option>)}</select></label></div>
  <div className="form-two"><label className="field">{translate("Tema")}<input value={v.topic} onChange={event=>set("topic",event.target.value)} placeholder={translate("Tema principal")}/></label><label className="field">{translate("Textos bíblicos")}<input value={v.texts} onChange={event=>set("texts",event.target.value)} placeholder={translate("Textos separados por punto y coma")}/></label></div>
  <label className="field">{translate("Etiquetas")}<input value={tags} onChange={event=>setTags(event.target.value)} placeholder={translate("Etiquetas separadas por comas")}/></label>
  <label className="field">{translate("Fecha (opcional)")}<input type="date" value={v.date} onChange={event=>set("date",event.target.value)}/></label>
  <label className="field">{translate("Bosquejo y notas")}<textarea className="editor" rows={10} value={v.content} onChange={event=>set("content",event.target.value)} placeholder={translate("Escribe aquí tu bosquejo y notas.")}/></label>
  {references.length>0&&<div className="detected-reference-section"><b>{translate("Referencias detectadas")}</b><BibleReferenceButtons value={`${v.content} ${v.texts}`} onSelect={onBibleReference}/><small>{translate("Selecciona una referencia para abrir el panel de consulta.")}</small></div>}
  <section className="talk-attachment-editor"><div><b>{translate("Adjuntos")}</b><small>{keptAttachments.length+newFiles.length} {translate("de")}{" "}{MAX_TALK_ATTACHMENTS} {translate("· PDF, DOC o DOCX · hasta 20 MB cada uno")}</small></div><label className="button secondary small attachment-picker"><Plus size={14}/> {translate("Añadir archivos")}<input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple onChange={addFiles} disabled={keptAttachments.length+newFiles.length>=MAX_TALK_ATTACHMENTS}/></label>
   {keptAttachments.map(file=><div className="talk-attachment-row" key={file.id}><span><FileText size={14}/>{file.name}<small>{formatFileSize(file.size)}</small></span><button type="button" className="icon-button danger" aria-label={`${translate("Quitar")} ${file.name}`} onClick={()=>setRemovedAttachmentIds(current=>[...current,file.id])}><Trash2 size={15}/></button></div>)}
   {newFiles.map((file,index)=><div className="talk-attachment-row" key={`${file.name}-${index}`}><span><FileText size={14}/>{file.name}<small>{formatFileSize(file.size)} {translate("· Pendiente de guardar")}</small></span><button type="button" className="icon-button danger" aria-label={`${translate("Quitar")} ${file.name}`} onClick={()=>setNewFiles(current=>current.filter((_,fileIndex)=>fileIndex!==index))}><Trash2 size={15}/></button></div>)}
   {attachmentError&&<p className="backup-error" role="alert">{attachmentError}</p>}
  </section>
  <div className="form-footer"><button type="button" className="button secondary" onClick={download}><Download size={15}/> {translate("Descargar .md")}</button><button className="button primary" disabled={saving}><Save size={15}/> {translate(saving?"Guardando…":"Guardar documento")}</button></div>
 </form>;
}

function ReminderForm({initial,save}:any){
 const [v,setV]=useState({title:initial?.title||"",date:initial?.date||today(),time:initial?.time||"19:00",repeat:initial?.repeat||"No repetir",enabled:initial?.enabled??true});
 return <form onSubmit={event=>{event.preventDefault();save({id:initial?.id||uid(),...v})}}>
  <label className="field">{translate("Nombre")}<input required value={v.title} onChange={event=>setV(previous=>({...previous,title:event.target.value}))} placeholder={translate("Nombre del recordatorio")}/></label>
  <div className="form-two"><label className="field">{translate("Fecha")}<input type="date" value={v.date} onChange={event=>setV(previous=>({...previous,date:event.target.value}))}/></label><label className="field">{translate("Hora")}<input type="time" value={v.time} onChange={event=>setV(previous=>({...previous,time:event.target.value}))}/></label></div>
  <label className="field">{translate("Repetición")}<select value={translate(v.repeat)} onChange={event=>setV(previous=>({...previous,repeat:toStoredLabel(event.target.value,["No repetir","Cada día","Cada semana"])}))}>{["No repetir","Cada día","Cada semana"].map(item=><option key={item} value={translate(item)}>{translate(item)}</option>)}</select></label>
  <FormActions/>
 </form>;
}

function FormActions(){return <div className="form-footer"><button className="button primary"><Save size={15}/> {translate("Guardar")}</button></div>}

export default App;
