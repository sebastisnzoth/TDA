import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import ReactPlayer from 'react-player';

const Player = ReactPlayer as any;

const getYouTubeVideoId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    let id: string | null = null;
    if (host === 'youtu.be' || host === 'www.youtu.be') id = parsed.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') id = parsed.searchParams.get('v');
      else if (parsed.pathname.startsWith('/live/') || parsed.pathname.startsWith('/embed/')) id = parsed.pathname.split('/')[2];
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
};
const isYouTubeUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(host);
  } catch { return false; }
};



// Patch HTMLMediaElement.prototype.play to handle interruption / AbortError gracefully
if (typeof window !== 'undefined' && window.HTMLMediaElement) {
  const originalPlay = window.HTMLMediaElement.prototype.play;
  window.HTMLMediaElement.prototype.play = function (...args: any[]) {
    const promise = originalPlay.apply(this, args);
    if (promise && typeof promise.catch === 'function') {
      promise.catch((err: any) => {
        // Prevent unhandled promise rejections for interrupted plays
        if (err && (err.name === 'AbortError' || String(err.message).includes('interrupted'))) {
          // Quietly ignore expected play interruptions
          return;
        }
        // For other issues, log them
        console.warn('HTMLMediaElement.play() was prevented:', err);
      });
    }
    return promise;
  };

  // Also catch unhandled promise rejections for safety
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason && (reason.name === 'AbortError' || (reason.message && String(reason.message).includes('interrupted')))) {
      event.preventDefault();
    }
  });
}

interface IptvChannel {
  id: string;
  name: string;
  streamUrl: string;
  logoUrl?: string;
  category: string;
  group: string;
}

interface IptvPlaylist {
  id: string;
  name: string;
  url?: string;
  channelsCount: number;
  channels: IptvChannel[];
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// FORMATTER
function formatNumber(num: number) {
  if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
  }
  return num;
}

// INITIAL DATA
const CHANNELS_DATA = [
  {
      id: "tv-publica",
      name: "TV Pública",
      category: "aire",
      channelId: "UC7Z_40wZasf_7_bgnM2vVAg",
      online: true,
      logoBg: "bg-white",
      logoHtml: `<div class="flex flex-col items-center"><span class="text-sky-600 font-extrabold text-xs">TVP</span><div class="w-4 h-1 bg-yellow-400 rounded-full mt-0.5"></div></div>`,
      currentShow: "Festival País (En Vivo)",
      region: "Nacional (CABA)",
      viewerCount: 15400
  },
  {
      id: "eltrece",
      name: "El Trece",
      category: "aire",
      channelId: "UC0DM_mHV2u6dj8ig51GkQwg",
      online: true,
      logoBg: "bg-slate-950",
      logoHtml: `<div class="relative w-7 h-7 flex items-center justify-center bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 rounded-full"><div class="w-3 h-3 bg-slate-950 rounded-full"></div></div>`,
      currentShow: "Almorzando con Juana",
      region: "Nacional (CABA)",
      viewerCount: 22100
  },
  {
      id: "elnueve",
      name: "Canal 9 Argentina (El Nueve)",
      category: "aire",
      channelId: "UCZ496WYLWnyUv2I08vKvxGA",
      online: true,
      logoBg: "bg-blue-600",
      logoHtml: `<div class="text-white font-black text-lg italic tracking-tighter">9</div>`,
      currentShow: "Qué Mañana! con Cala",
      region: "Nacional (CABA)",
      viewerCount: 8400
  },
  {
      id: "americatv",
      name: "América TV",
      category: "aire",
      channelId: "UC_83bfeC_zZNSvN287B9xOQ",
      online: true,
      logoBg: "bg-slate-950",
      logoHtml: `<div class="grid grid-cols-2 gap-0.5 w-6 h-6"><div class="bg-red-500 rounded-sm"></div><div class="bg-green-500 rounded-sm"></div><div class="bg-blue-500 rounded-sm"></div><div class="bg-yellow-500 rounded-sm"></div></div>`,
      currentShow: "Intrusos en Vivo",
      region: "Nacional (CABA)",
      viewerCount: 11200
  },
  {
      id: "telefe",
      name: "Telefe",
      category: "aire",
      channelId: "UCfK4_S_HOnrSreX1_fT-7qg",
      online: false, // Inherent simulation
      logoBg: "bg-slate-950",
      logoHtml: `<div class="flex gap-0.5"><div class="w-2 h-2 rounded-full bg-blue-500"></div><div class="w-2 h-2 rounded-full bg-green-500"></div><div class="w-2 h-2 rounded-full bg-red-500"></div></div>`,
      currentShow: "Ariel en su Salsa",
      region: "Nacional (CABA)",
      viewerCount: 0
  },
  {
      id: "tn",
      name: "TN (Todo Noticias)",
      category: "noticias",
      channelId: "UCj6PcyLvpnIRT_2W_mwa9Aw",
      online: true,
      logoBg: "bg-slate-950",
      logoHtml: `<div class="flex items-center font-black text-sm italic"><span class="text-blue-500">T</span><span class="text-red-500">N</span></div>`,
      currentShow: "TN Fin de Semana",
      region: "Informativo 24h",
      viewerCount: 34100
  },
  {
      id: "c5n",
      name: "C5N",
      category: "noticias",
      channelId: "UCuY095izSIn7wVbV6vW6u6Q",
      online: true,
      logoBg: "bg-red-600",
      logoHtml: `<div class="text-white font-extrabold text-xs tracking-tight">C5N</div>`,
      currentShow: "La Tarde de C5N",
      region: "Informativo 24h",
      viewerCount: 29800
  },
  {
      id: "ln-mas",
      name: "LN+",
      category: "noticias",
      channelId: "UC7w_Z0_XgZf8H_SgRbcHIsA",
      online: true,
      logoBg: "bg-indigo-950",
      logoHtml: `<div class="text-sky-400 font-serif text-sm font-bold tracking-tighter">LN+</div>`,
      currentShow: "Más de lo Mismo",
      region: "Informativo 24h",
      viewerCount: 18400
  },
  {
      id: "a24",
      name: "A24",
      category: "noticias",
      channelId: "UC1E_4gK7_rT_T_8V06qA4bA",
      online: true,
      logoBg: "bg-slate-950",
      logoHtml: `<div class="text-white bg-blue-700 font-extrabold px-1 py-0.5 rounded text-[10px]">A24</div>`,
      currentShow: "Noticiero A24",
      region: "Informativo 24h",
      viewerCount: 9500
  },
  {
      id: "cronica",
      name: "Crónica TV",
      category: "noticias",
      channelId: "UCv20mX_UuLw7EwP8E48aWww",
      online: true,
      logoBg: "bg-red-700",
      logoHtml: `<div class="text-white font-extrabold text-sm border-2 border-white px-1.5 py-px">crónica</div>`,
      currentShow: "Crónica Alerta",
      region: "Informativo 24h",
      viewerCount: 14700
  },
  {
      id: "canal26",
      name: "Canal 26",
      category: "noticias",
      channelId: "UCdtI7_6Gz_f8-G_h8uBv0pA",
      online: true,
      logoBg: "bg-blue-900",
      logoHtml: `<div class="text-yellow-400 font-black text-sm italic border border-yellow-400 px-1 rounded-full">26</div>`,
      currentShow: "Noticias 26 Internacional",
      region: "Informativo 24h",
      viewerCount: 7100
  },
  {
      id: "ip-noticias",
      name: "IP Noticias",
      category: "noticias",
      channelId: "UC8M3O_01hGId8bO0pA_XNlg",
      online: true,
      logoBg: "bg-slate-950",
      logoHtml: `<div class="text-white bg-slate-800 font-bold px-1.5 py-0.5 rounded border border-blue-500 text-[10px]">IP</div>`,
      currentShow: "IP Informativo",
      region: "Informativo 24h",
      viewerCount: 3900
  },
  {
      id: "el-tres-rosario",
      name: "El Tres Rosario",
      category: "interior",
      channelId: "UCjZ62N3XgV8z70I_gU6P_XQ",
      online: true,
      logoBg: "bg-slate-950",
      logoHtml: `<div class="text-sky-400 font-extrabold text-sm tracking-tight border-b-2 border-sky-400">TRES</div>`,
      currentShow: "De Doce a Catorce",
      region: "Rosario (Santa Fe)",
      viewerCount: 5200
  },
  {
      id: "el-doce-cordoba",
      name: "El Doce Córdoba",
      category: "interior",
      channelId: "UCg-T9w_r2Bv2R8Xw5Nf_EAg",
      online: true,
      logoBg: "bg-orange-500",
      logoHtml: `<div class="text-white font-extrabold text-sm">12</div>`,
      currentShow: "Noticiero Doce",
      region: "Córdoba (Cap.)",
      viewerCount: 6800
  },
  {
      id: "canal-9-mendoza",
      name: "Canal 9 Mendoza",
      category: "interior",
      channelId: "UCnO60jB1hO_3p6ZcW7-qCGA",
      online: true,
      logoBg: "bg-blue-800",
      logoHtml: `<div class="text-white font-bold text-xs">MZA 9</div>`,
      currentShow: "Noticiero 9",
      region: "Mendoza (Cap.)",
      viewerCount: 4500
  },
  {
      id: "canal-10-cordoba",
      name: "Canal 10 Córdoba",
      category: "interior",
      channelId: "UCx7Wz0V4D7b_8eLwXvN6Z_g",
      online: true,
      logoBg: "bg-slate-950",
      logoHtml: `<div class="text-green-500 font-extrabold text-xs">C10</div>`,
      currentShow: "Crónica Matinal",
      region: "Córdoba (UNC)",
      viewerCount: 3100
  },
  {
      id: "chaco-tv",
      name: "Chaco TV",
      category: "interior",
      channelId: "UCJ3XwXf8_hK8a7lVb270Eog",
      online: true,
      logoBg: "bg-slate-950",
      logoHtml: `<div class="text-white font-bold text-[10px] bg-sky-500 px-1 rounded">CHACO</div>`,
      currentShow: "Chaco Noticias",
      region: "Resistencia (Chaco)",
      viewerCount: 2200
  },
  {
      id: "canal-7-chubut",
      name: "Canal 7 Chubut",
      category: "interior",
      channelId: "UC-Q6zM_AihgP2Kx6_vS30zA",
      online: true,
      logoBg: "bg-slate-950",
      logoHtml: `<div class="text-sky-300 font-bold text-[10px] border border-sky-800 px-1.5 py-0.5 rounded">CHB 7</div>`,
      currentShow: "Informativo 7",
      region: "Rawson (Chubut)",
      viewerCount: 1800
  }
];

function calculateSchedule(idx: number) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  let slotDuration = 120; // 2 hours in minutes by default
  if (idx % 3 === 0) {
    slotDuration = 60; // 1 hour for some
  } else if (idx % 4 === 0) {
    slotDuration = 180; // 3 hours for others
  }
  
  const totalMinutes = currentHour * 60 + currentMinute;
  
  const offset = (idx * 15) % slotDuration; 
  let startMinutes = Math.floor((totalMinutes - offset) / slotDuration) * slotDuration + offset;
  
  if (startMinutes > totalMinutes) {
    startMinutes -= slotDuration;
  }
  
  const endMinutes = startMinutes + slotDuration;
  
  const formatTime = (minutes: number) => {
    const mins = (minutes + 1440) % 1440; 
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };
  
  const timeLabel = `${formatTime(startMinutes)} - ${formatTime(endMinutes)}`;
  
  const elapsed = totalMinutes - startMinutes;
  const progress = Math.max(0, Math.min(100, Math.round((elapsed / slotDuration) * 100)));
  
  return {
    timeLabel,
    progress
  };
}

function useEpgSchedule(idx: number) {
  const [schedule, setSchedule] = useState(() => calculateSchedule(idx));

  useEffect(() => {
    const timer = setInterval(() => {
      setSchedule(calculateSchedule(idx));
    }, 60000); 
    return () => clearInterval(timer);
  }, [idx]);

  return schedule;
}

interface EpgRowProps {
  channel: any;
  idx: number;
  onClick: () => void;
}

function EpgRow({ channel, idx, onClick }: EpgRowProps) {
  const schedule = useEpgSchedule(idx);
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-3 p-2.5 bg-slate-950/50 rounded-xl border border-slate-850 hover:border-sky-500/50 hover:bg-slate-950/80 transition-all cursor-pointer group active:scale-[0.98]"
    >
        <div className={`w-8 h-8 rounded-lg ${channel.logoBg} flex-shrink-0 flex items-center justify-center p-1 text-[8px]`} dangerouslySetInnerHTML={{ __html: channel.logoHtml }} />
        <div className="flex-grow min-w-0">
            <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="font-bold text-slate-200 group-hover:text-sky-400 transition-colors truncate">{channel.name}</span>
                <span className="text-sky-500 font-semibold font-mono text-[9px]">{schedule.timeLabel}</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate font-semibold mb-1.5">{channel.currentShow}</p>
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${schedule.progress}%` }}></div>
            </div>
        </div>
        <div className="text-slate-600 group-hover:text-sky-400 transition-colors shrink-0 pl-1">
            <i className="fa-solid fa-chevron-right text-xs"></i>
        </div>
    </div>
  );
}

function getExtendedProgramDetails(channel: any, idx: number) {
  const schedule = calculateSchedule(idx);
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const totalMinutes = currentHour * 60 + currentMinute;
  
  const times = schedule.timeLabel.split(" - ");
  const endParts = times[1].split(":");
  let endHour = parseInt(endParts[0], 10);
  const endMinute = parseInt(endParts[1], 10);
  
  if (endHour < currentHour) {
    endHour += 24;
  }
  const endTotalMinutes = endHour * 60 + endMinute;
  const remainingMinutes = Math.max(0, endTotalMinutes - totalMinutes);

  const showsDescriptions: Record<string, string> = {
    "Festival País (En Vivo)": "Transmisión cultural de la TV Pública recorriendo los festivales folclóricos, musicales y tradicionales de cada rincón de la República Argentina.",
    "Almorzando con Juana": "La clásica mesa de los almuerzos de la televisión argentina con invitados especiales del mundo del espectáculo, política, periodismo y cultura.",
    "Qué Mañana! con Cala": "Un programa matutino lleno de recetas deliciosas, consejos para el hogar, humor, información del espectáculo y la calidez de siempre.",
    "Crónica Matinal": "Toda la información del amanecer cordobés con el estilo directo, ágil y comprometido de Canal 10. Con móviles en vivo, reportes de tránsito y opinión.",
    "Chaco Noticias": "El panorama informativo completo de la provincia del Chaco, con la cobertura federal de Chaco TV, entrevistas a especialistas y análisis político.",
    "Informativo 7": "La actualidad y los hechos más relevantes de la Patagonia norte. Transmisión de Canal 7 de Chubut desde Rawson para toda la región.",
    "Telediario": "Noticiero federal e informes especiales del interior argentino. Segmentos de agro, economía regional y análisis de actualidad.",
    "Noticiero Trece": "El clásico informativo del mediodía con las noticias de último momento, actualidad nacional, internacional, espectáculos y deportes.",
    "El Noticiero de la Gente": "La información explicada con cercanía, investigaciones especiales y las problemáticas de la comunidad explicadas en vivo por expertos.",
    "América Noticias": "Análisis en profundidad, debates de actualidad y primicias periodísticas que marcan la agenda política y social del país con destacados columnistas.",
    "Telenueve": "El noticiero con fuerte presencia vecinal, casos policiales explicados con objetividad, economía familiar y la actualidad del Gran Buenos Aires.",
    "La Cornisa": "Periodismo de investigación riguroso, entrevistas exclusivas con protagonistas políticos y debates profundos sobre la coyuntura de la República.",
    "TN Fin de Semana": "La señal líder de noticias en Argentina acompaña tu fin de semana con coberturas federales en directo, móviles en todo el país y lo que hay que saber.",
    "C5N en Vivo": "La señal nacional de noticias con análisis del panorama político, cobertura económica, opinión calificada y debates de actualidad en vivo.",
    "LN+ Vivo": "Análisis político de primer nivel con periodistas destacados, entrevistas a fondo y el seguimiento al minuto de las decisiones de gobierno.",
    "Canal 26 Noticias": "Información al instante de la escena internacional, geopolítica mundial, avances tecnológicos y la actualidad nacional de Argentina.",
    "A24 Noticias": "El ritmo de la noticia en tiempo real con periodistas con fuerte opinión, investigación de casos del día y cobertura federal rápida."
  };

  const defaultDesc = `Transmisión en directo del canal ${channel.name}. Contenido local y regional de interés general en alta definición y con bitrate adaptativo para optimizar tu experiencia de streaming offline/online.`;
  const synopsis = showsDescriptions[channel.currentShow] || defaultDesc;

  const resolution = channel.category === 'iptv' ? "1080p (Stream HLS / MPEG-TS)" : "1080p Full HD (Feed YouTube Live)";
  const bitrate = channel.category === 'iptv' ? "~2.8 - 4.2 Mbps (Variable)" : "~3.5 Mbps (CBR Stream)";
  const codec = "H.264 (AVC) / AAC Stereo 48kHz";
  const source = channel.category === 'iptv' ? `Servidor IPTV / M3U: ${channel.region}` : `Feed Oficial YouTube (${channel.channelId || 'LIVE'})`;
  const latency = channel.category === 'iptv' ? "6.8s (Segmentación HLS)" : "3.9s (Ultra Low Latency)";

  const startParts = times[0].split(":");
  const startH = parseInt(startParts[0], 10);
  const startM = parseInt(startParts[1], 10);

  const getOffsetTime = (h: number, m: number, offsetMins: number) => {
    const total = h * 60 + m + offsetMins;
    const finalH = Math.floor(total / 60) % 24;
    const finalM = total % 60;
    return `${finalH.toString().padStart(2, '0')}:${finalM.toString().padStart(2, '0')}`;
  };

  const episodes = [
    { time: times[0], title: "Apertura y Bloque Informativo Principal", desc: "Resumen de títulos y presentación de los temas que marcarán la transmisión." },
    { time: getOffsetTime(startH, startM, 20), title: "Móviles en Vivo y Testimonios", desc: "Enlaces satelitales en directo con cronistas informando desde el lugar de los hechos." },
    { time: getOffsetTime(startH, startM, 50), title: "Entrevista Especial / Mesa de Debate", desc: "Diálogo a fondo con especialistas, funcionarios o figuras destacadas de la jornada." },
    { time: getOffsetTime(startH, startM, 85), title: "Segmento de Servicios y Agenda Regional", desc: "Pronóstico del tiempo extendido, alertas de tránsito e información de utilidad vecinal." },
    { time: getOffsetTime(startH, startM, 110), title: "Cierre, Redes y Adelanto de Grilla", desc: "Repaso interactivo de la opinión de la audiencia y avance de la siguiente señal." }
  ];

  return {
    synopsis,
    remainingMinutes,
    scheduleInfo: schedule,
    technical: {
      resolution,
      bitrate,
      codec,
      source,
      latency
    },
    episodes: episodes.slice(0, idx % 2 === 0 ? 4 : 5)
  };
}

interface EpgProgramDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: any;
  idx: number;
  onPlayChannel: (channelId: string) => void;
}

function EpgProgramDetailModal({ isOpen, onClose, channel, idx, onPlayChannel }: EpgProgramDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'tech' | 'episodes'>('info');
  
  if (!isOpen || !channel) return null;

  const details = getExtendedProgramDetails(channel, idx);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity cursor-pointer"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-slate-900 border border-slate-850 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in-50 zoom-in-95 duration-150">
        
        {/* Header decoration */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg ${channel.logoBg} flex items-center justify-center p-1 text-[8px] shrink-0`} dangerouslySetInnerHTML={{ __html: channel.logoHtml }} />
            <div className="min-w-0">
              <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider font-mono">{channel.region || 'Guía de Señales'}</span>
              <h3 className="text-sm font-bold text-slate-100 truncate max-w-[280px]">{channel.name}</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
          >
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Dynamic Show Card */}
        <div className="p-6 bg-gradient-to-b from-slate-950/40 to-transparent border-b border-slate-800/50">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="bg-sky-500/10 text-sky-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-sky-500/15 uppercase tracking-wide">
              En Vivo Ahora
            </span>
            <span className="text-xs text-sky-400 font-bold font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-850/60">
              {details.scheduleInfo.timeLabel}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-100 tracking-tight leading-snug">
            {channel.currentShow}
          </h2>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5 font-semibold">
              <span>Progreso del bloque</span>
              <span className="font-mono text-sky-400 font-bold">{details.scheduleInfo.progress}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-sky-400 via-sky-500 to-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${details.scheduleInfo.progress}%` }} />
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 px-4">
          <button 
            onClick={() => setActiveTab('info')}
            className={cn(
              "px-4 py-3 text-xs font-bold transition-all border-b-2",
              activeTab === 'info' 
                ? "border-sky-500 text-sky-400 bg-sky-500/5" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            <i className="fa-solid fa-circle-info mr-1.5"></i>
            Sinopsis
          </button>
          <button 
            onClick={() => setActiveTab('tech')}
            className={cn(
              "px-4 py-3 text-xs font-bold transition-all border-b-2",
              activeTab === 'tech' 
                ? "border-sky-500 text-sky-400 bg-sky-500/5" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            <i className="fa-solid fa-sliders mr-1.5"></i>
            Datos Técnicos
          </button>
          <button 
            onClick={() => setActiveTab('episodes')}
            className={cn(
              "px-4 py-3 text-xs font-bold transition-all border-b-2",
              activeTab === 'episodes' 
                ? "border-sky-500 text-sky-400 bg-sky-500/5" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            <i className="fa-solid fa-list-ul mr-1.5"></i>
            Segmentos ({details.episodes.length})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-grow space-y-4 max-h-[320px]">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Sinopsis del Programa</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {details.synopsis}
                </p>
              </div>

              <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <i className="fa-regular fa-clock text-sm"></i>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Duración Restante</span>
                    <span className="text-xs font-bold text-slate-200">
                      {details.remainingMinutes} {details.remainingMinutes === 1 ? 'minuto' : 'minutos'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-extrabold uppercase border border-emerald-500/15">
                    Estable
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tech' && (
            <div className="space-y-3.5">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Metadatos de Señal de Streaming</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Resolución</span>
                  <span className="text-xs font-bold text-slate-200">{details.technical.resolution}</span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Bitrate Promedio</span>
                  <span className="text-xs font-bold text-slate-200">{details.technical.bitrate}</span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Codec de Video/Audio</span>
                  <span className="text-xs font-bold text-slate-200">{details.technical.codec}</span>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                  <span className="text-[9px] text-slate-500 block uppercase font-bold">Latencia Medida</span>
                  <span className="text-xs font-bold text-slate-200">{details.technical.latency}</span>
                </div>
              </div>

              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-850/60">
                <span className="text-[9px] text-slate-500 block uppercase font-bold mb-0.5">Dirección de Origen</span>
                <span className="text-xs font-mono text-slate-300 break-all select-all font-medium bg-slate-950 px-2 py-1 rounded block border border-slate-900 mt-1">
                  {details.technical.source}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'episodes' && (
            <div className="space-y-4">
              <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Estructura del Bloque (Horarios)</h4>
              
              <div className="relative border-l-2 border-slate-800 ml-2.5 pl-4 space-y-4 py-1.5">
                {details.episodes.map((episode, i) => {
                  const totalEpisodes = details.episodes.length;
                  const currentThreshold = (details.scheduleInfo.progress / 100) * totalEpisodes;
                  const isPassed = i < Math.floor(currentThreshold);
                  const isActive = i === Math.floor(currentThreshold);

                  return (
                    <div key={`episode-${i}`} className="relative">
                      {/* Timeline Dot */}
                      <span className={cn(
                        "absolute -left-[25px] top-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all",
                        isPassed 
                          ? "bg-sky-500 border-sky-500 text-[8px] text-slate-950 font-bold" 
                          : isActive 
                            ? "bg-slate-900 border-sky-400 animate-pulse text-[8px] text-sky-400" 
                            : "bg-slate-900 border-slate-700"
                      )}>
                        {isPassed && <i className="fa-solid fa-check text-[7px]"></i>}
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-mono font-bold",
                            isActive ? "text-sky-400" : isPassed ? "text-slate-400" : "text-slate-500"
                          )}>
                            {episode.time} hs
                          </span>
                          {isActive && (
                            <span className="bg-sky-400/10 text-sky-400 text-[8px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider animate-pulse">
                              Actual
                            </span>
                          )}
                        </div>
                        <h5 className={cn(
                          "text-xs font-bold mt-0.5",
                          isActive ? "text-slate-100" : isPassed ? "text-slate-300" : "text-slate-400"
                        )}>
                          {episode.title}
                        </h5>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-semibold">
                          {episode.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-slate-950 border-t border-slate-800/80 flex gap-3">
          <button
            onClick={() => {
              onPlayChannel(channel.id);
              onClose();
            }}
            className="flex-grow py-3 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950 hover:text-black font-extrabold text-xs rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-circle-play text-sm"></i>
            Sintonizar Señal en Vivo
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [channels, setChannels] = useState(CHANNELS_DATA);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [selectedEpgProgram, setSelectedEpgProgram] = useState<{ channel: any; idx: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<'home' | 'all' | 'ar' | 'br'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isDevConsoleOpen, setIsDevConsoleOpen] = useState(true);
  
  // Player state
  const [playerState, setPlayerState] = useState<'idle' | 'loading' | 'online' | 'offline' | 'error'>('idle');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  
  // Gemini AI state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isComplexQuery, setIsComplexQuery] = useState(false);
  
  // Simulator state
  const [logs, setLogs] = useState<string[]>(['[SYSTEM] Servidor Express levantado correctamente en puerto 3000.', '[SYSTEM] Caché inicializada para 18 señales argentinas.']);
  const [apiRequestsCount, setApiRequestsCount] = useState(0);
  const [cacheHitsCount, setCacheHitsCount] = useState(0);
  const [apiResponse, setApiResponse] = useState<any>({ status: "waiting", message: "Hace clic en un canal para ver el payload retornado por la API" });
  const [timeString, setTimeString] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const serverCache = useRef<Record<string, { timestamp: number; data: any }>>({});
  const CACHE_LIFETIME = 300 * 1000;

  // IPTV custom lists state
  const [iptvPlaylists, setIptvPlaylists] = useState<IptvPlaylist[]>(() => {
    const saved = localStorage.getItem('tda_iptv_playlists');
    return saved ? JSON.parse(saved) : [];
  });
  const [isIptvModalOpen, setIsIptvModalOpen] = useState(false);
  const [iptvName, setIptvName] = useState('');
  const [iptvUrl, setIptvUrl] = useState('');
  const [iptvRawText, setIptvRawText] = useState('');
  const [isIptvLoading, setIsIptvLoading] = useState(false);
  const [iptvImportTab, setIptvImportTab] = useState<'file' | 'url' | 'raw'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // IPTV player controls & manual tuner state
  const [aspectMode, setAspectMode] = useState<'contain' | '4-3' | 'fill' | 'cover'>('contain');
  const [playerPlaying, setPlayerPlaying] = useState(true);
  const [playerVolume, setPlayerVolume] = useState(0.8);
  const [playerMuted, setPlayerMuted] = useState(false);
  const [selectedIptvGroup, setSelectedIptvGroup] = useState('all');
  const [quickStreamUrl, setQuickStreamUrl] = useState('');
  const [quickStreamName, setQuickStreamName] = useState('');

  const handleFileLoad = (file: File) => {
    if (!file) return;
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'm3u' && extension !== 'm3u8' && extension !== 'txt') {
      showToast("Subí un archivo .m3u, .m3u8 o .txt válido");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        showToast("El archivo seleccionado está vacío");
        return;
      }
      setIptvRawText(text);
      setUploadedFileName(file.name);
      
      if (!iptvName.trim()) {
        const cleanName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());
        setIptvName(cleanName);
      }
      
      showToast(`¡Archivo "${file.name}" cargado!`);
      addLog(`[IPTV FILE] Archivo "${file.name}" cargado y procesado localmente.`);
    };
    reader.onerror = () => {
      showToast("Error al leer el archivo");
    };
    reader.readAsText(file);
  };

  // Memoized all channels joining built-in and custom IPTV channels
  const allChannels = React.useMemo(() => {
    const customChannels = iptvPlaylists.flatMap(playlist => 
      playlist.channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        category: 'iptv',
        channelId: '', 
        online: true,
        logoBg: 'bg-slate-950',
        logoHtml: ch.logoUrl 
          ? `<img src="${ch.logoUrl}" class="w-full h-full object-contain rounded-lg" referrerPolicy="no-referrer" />` 
          : `<div class="flex flex-col items-center justify-center text-purple-400 font-bold text-[10px] w-full h-full"><i class="fa-solid fa-play text-purple-500 mb-0.5 text-xs"></i>IPTV</div>`,
        currentShow: ch.group || 'Canal IPTV',
        region: playlist.name,
        viewerCount: Math.floor(Math.random() * 2000) + 100,
        streamUrl: ch.streamUrl,
        group: ch.group || 'IPTV General'
      }))
    );
    return [...channels, ...customChannels];
  }, [channels, iptvPlaylists]);

  useEffect(() => {
    const saved = localStorage.getItem('tda_favs');
    if (saved) setFavorites(JSON.parse(saved));
    
    const interval = setInterval(() => {
        setTimeString(new Date().toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const parseM3u = (text: string): { name: string; streamUrl: string; logoUrl?: string; group: string }[] => {
    const lines = text.split('\n');
    const channelsList: { name: string; streamUrl: string; logoUrl?: string; group: string }[] = [];
    
    let currentInfo: { name: string; logoUrl?: string; group: string } | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      if (line.startsWith('#EXTINF:')) {
        let logoUrl = '';
        let group = 'IPTV General';
        let name = 'Canal IPTV';
        
        const logoMatch = line.match(/tvg-logo="([^"]+)"/) || line.match(/logo="([^"]+)"/);
        if (logoMatch) logoUrl = logoMatch[1];
        
        const groupMatch = line.match(/group-title="([^"]+)"/);
        if (groupMatch) group = groupMatch[1];
        
        const commaIndex = line.lastIndexOf(',');
        if (commaIndex !== -1) {
          name = line.substring(commaIndex + 1).trim();
        }
        
        currentInfo = { name, logoUrl, group };
      } else if (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('rtmp://')) {
        if (currentInfo) {
          channelsList.push({
            name: currentInfo.name,
            streamUrl: line,
            logoUrl: currentInfo.logoUrl,
            group: currentInfo.group
          });
          currentInfo = null;
        } else {
          channelsList.push({
            name: `Stream ${channelsList.length + 1}`,
            streamUrl: line,
            group: 'IPTV General'
          });
        }
      }
    }
    return channelsList;
  };

  // Ship the user's Argentina playlist with TDA; update existing bundled copy on app release.
  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}listas/argentina-usuario.m3u`)
      .then(response => {
        if (!response.ok) throw new Error('Lista local no disponible');
        return response.text();
      })
      .then(text => {
        if (cancelled) return;
        const parsed = parseM3u(text);
        if (parsed.length === 0) return;
        const bundled: IptvPlaylist = {
          id: 'tda-argentina-usuario',
          name: 'Argentina — Lista incorporada',
          url: '/listas/argentina-usuario.m3u',
          channelsCount: parsed.length,
          channels: parsed.map((ch, index) => ({
            id: `tda-ar-${index}`,
            name: ch.name,
            streamUrl: ch.streamUrl,
            logoUrl: ch.logoUrl,
            category: 'iptv',
            group: ch.group
          }))
        };
        setIptvPlaylists(previous => {
          const updated = [...previous.filter(p => p.id !== bundled.id), bundled];
          try { localStorage.setItem('tda_iptv_playlists', JSON.stringify(updated)); } catch {}
          return updated;
        });
      })
      .catch(error => console.warn('[TDA] No se pudo cargar la lista argentina incluida:', error));
    return () => { cancelled = true; };
  }, []);

  // Brazil Free-TV: separate imported channel group, loaded from static GitHub Pages assets.
  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}listas/brasil-free-tv.m3u`)
      .then(response => {
        if (!response.ok) throw new Error('Lista Brasil no disponible');
        return response.text();
      })
      .then(text => {
        if (cancelled) return;
        const parsed = parseM3u(text);
        if (parsed.length === 0) return;
        const bundled: IptvPlaylist = {
          id: 'tda-brasil-free-tv',
          name: 'Brasil — Free-TV',
          url: 'listas/brasil-free-tv.m3u',
          channelsCount: parsed.length,
          channels: parsed.map((ch, index) => ({
            id: `tda-br-${index}`,
            name: ch.name,
            streamUrl: ch.streamUrl,
            logoUrl: ch.logoUrl,
            category: 'iptv',
            group: ch.group
          }))
        };
        setIptvPlaylists(previous => {
          const updated = [...previous.filter(p => p.id !== bundled.id), bundled];
          try { localStorage.setItem('tda_iptv_playlists', JSON.stringify(updated)); } catch {}
          return updated;
        });
      })
      .catch(error => console.warn('[TDA] No se pudo cargar Free-TV Brasil:', error));
    return () => { cancelled = true; };
  }, []);

  const handleImportIptv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iptvName.trim()) {
      showToast("Ingresá un nombre para la lista");
      return;
    }
    
    let m3uText = '';
    setIsIptvLoading(true);
    
    try {
      if (iptvUrl.trim()) {
        addLog(`[IPTV IMPORT] Descargando lista desde ${iptvUrl}...`);
        const res = await axios.get(iptvUrl.trim());
        m3uText = res.data;
      } else if (iptvRawText.trim()) {
        addLog(`[IPTV IMPORT] Procesando texto raw de M3U pasteado...`);
        m3uText = iptvRawText;
      } else {
        showToast("Ingresá una URL o pegá el contenido de la lista");
        setIsIptvLoading(false);
        return;
      }
      
      const parsedChannels = parseM3u(m3uText);
      if (parsedChannels.length === 0) {
        showToast("No se encontraron canales válidos en el archivo M3U");
        setIsIptvLoading(false);
        return;
      }
      
      const playlistId = `playlist-${Date.now()}`;
      const newPlaylist: IptvPlaylist = {
        id: playlistId,
        name: iptvName.trim(),
        url: iptvUrl.trim() || undefined,
        channelsCount: parsedChannels.length,
        channels: parsedChannels.map((ch, index) => ({
          id: `iptv-${playlistId}-${index}`,
          name: ch.name,
          streamUrl: ch.streamUrl,
          logoUrl: ch.logoUrl,
          category: 'iptv',
          group: ch.group
        }))
      };
      
      setIptvPlaylists(prev => {
        const updated = [...prev, newPlaylist];
        localStorage.setItem('tda_iptv_playlists', JSON.stringify(updated));
        return updated;
      });
      
      showToast(`¡Lista "${iptvName}" importada con ${parsedChannels.length} canales!`);
      addLog(`[SUCCESS] Lista IPTV "${iptvName}" importada correctamente con ${parsedChannels.length} señales.`);
      
      setIptvName('');
      setIptvUrl('');
      setIptvRawText('');
      setUploadedFileName('');
      setIsIptvModalOpen(false);
      setSelectedCategory('iptv');
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || 'Error desconocido';
      showToast(`Error al importar: ${errMsg}`);
      addLog(`[ERROR] Falló la importación de lista IPTV: ${errMsg}`);
    } finally {
      setIsIptvLoading(false);
    }
  };

  const handleDeletePlaylist = (playlistId: string, name: string) => {
    if (confirm(`¿Estás seguro de que querés eliminar la lista IPTV "${name}"?`)) {
      setIptvPlaylists(prev => {
        const updated = prev.filter(p => p.id !== playlistId);
        localStorage.setItem('tda_iptv_playlists', JSON.stringify(updated));
        return updated;
      });
      showToast(`Lista "${name}" eliminada`);
      addLog(`[SYSTEM] Lista IPTV "${name}" eliminada del almacenamiento local.`);
    }
  };

  const playQuickStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStreamUrl.trim()) {
      showToast("Ingresá una URL de stream válida");
      return;
    }
    const name = quickStreamName.trim() || 'Señal Manual';
    const playlistId = 'manual-streams-playlist';
    
    let manualPlaylist = iptvPlaylists.find(p => p.id === playlistId);
    if (!manualPlaylist) {
      manualPlaylist = {
        id: playlistId,
        name: 'Sintonizaciones Manuales',
        channelsCount: 0,
        channels: []
      };
    }
    
    const newChannel = {
      id: `iptv-manual-${Date.now()}`,
      name,
      streamUrl: quickStreamUrl.trim(),
      category: 'iptv',
      group: 'Sintonizador Manual'
    };
    
    const updatedPlaylist = {
      ...manualPlaylist,
      channelsCount: manualPlaylist.channelsCount + 1,
      channels: [...manualPlaylist.channels, newChannel]
    };
    
    setIptvPlaylists(prev => {
      const filtered = prev.filter(p => p.id !== playlistId);
      const updated = [...filtered, updatedPlaylist];
      localStorage.setItem('tda_iptv_playlists', JSON.stringify(updated));
      return updated;
    });
    
    setQuickStreamUrl('');
    setQuickStreamName('');
    showToast(`¡Señal "${name}" guardada y sintonizada!`);
    addLog(`[SINTONIZADOR] Guardado stream individual "${name}" en lista manual.`);
    
    setTimeout(() => {
      selectChannel(newChannel.id);
    }, 150);
  };

  const PRESET_LISTS = [
    {
      name: "Brasil — Catálogo IPTV-org",
      url: "https://iptv-org.github.io/iptv/countries/br.m3u",
      desc: "Señales brasileñas comunitarias. Algunas pueden requerir permisos regionales o no reproducirse en el navegador.",
      badge: "Brasil"
    },
    {
      name: "Argentina — Canales públicos",
      url: "https://iptv-org.github.io/iptv/countries/ar.m3u",
      desc: "Catálogo comunitario de transmisiones abiertas de Argentina. La disponibilidad depende de cada canal.",
      badge: "Argentina"
    },
    {
      name: "Ciudad de Buenos Aires",
      url: "https://iptv-org.github.io/iptv/subdivisions/ar-c.m3u",
      desc: "Emisiones públicas clasificadas en CABA.",
      badge: "CABA"
    },
    {
      name: "Provincia de Buenos Aires",
      url: "https://iptv-org.github.io/iptv/subdivisions/ar-b.m3u",
      desc: "Señales públicas de la provincia de Buenos Aires.",
      badge: "Provincia"
    },
    {
      name: "Córdoba",
      url: "https://iptv-org.github.io/iptv/subdivisions/ar-x.m3u",
      desc: "Canales públicos clasificados en Córdoba.",
      badge: "Interior"
    },
    {
      name: "Santa Fe",
      url: "https://iptv-org.github.io/iptv/subdivisions/ar-s.m3u",
      desc: "Canales públicos clasificados en Santa Fe.",
      badge: "Interior"
    },
    {
      name: "Noticias internacionales",
      url: "https://iptv-org.github.io/iptv/categories/news.m3u",
      desc: "Señales de noticias públicas, disponibles según región.",
      badge: "Noticias"
    }
  ];
  const [presetSearch, setPresetSearch] = useState('');
  const filteredPresets = PRESET_LISTS.filter(preset =>
    `${preset.name} ${preset.desc} ${preset.badge}`.toLocaleLowerCase('es').includes(presetSearch.trim().toLocaleLowerCase('es'))
  );

  const importPresetIptv = async (name: string, url: string) => {
    setIsIptvLoading(true);
    setIsIptvModalOpen(true);
    setIptvName(name);
    setIptvUrl(url);
    setIptvRawText('');
    addLog(`[IPTV PRESET] Iniciando importación de lista preestablecida "${name}"...`);
    
    try {
      addLog(`[IPTV PRESET] Descargando desde ${url}...`);
      const res = await axios.get(url.trim(), { timeout: 15000, responseType: 'text' });
      const m3uText = res.data;
      
      const parsedChannels = parseM3u(m3uText);
      if (parsedChannels.length === 0) {
        showToast("No se encontraron canales válidos en el archivo M3U");
        setIsIptvLoading(false);
        return;
      }
      
      const playlistId = `playlist-${Date.now()}`;
      const newPlaylist: IptvPlaylist = {
        id: playlistId,
        name: name,
        url: url,
        channelsCount: parsedChannels.length,
        channels: parsedChannels.map((ch, index) => ({
          id: `iptv-${playlistId}-${index}`,
          name: ch.name,
          streamUrl: ch.streamUrl,
          logoUrl: ch.logoUrl,
          category: 'iptv',
          group: ch.group
        }))
      };
      
      setIptvPlaylists(prev => {
        const updated = [...prev, newPlaylist];
        localStorage.setItem('tda_iptv_playlists', JSON.stringify(updated));
        return updated;
      });
      
      showToast(`¡Lista "${name}" importada con ${parsedChannels.length} canales!`);
      addLog(`[SUCCESS] Lista IPTV "${name}" importada correctamente con ${parsedChannels.length} señales.`);
      
      setIptvName('');
      setIptvUrl('');
      setIptvRawText('');
      setIsIptvModalOpen(false);
      setSelectedCategory('iptv');
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || 'Error desconocido';
      showToast(`Error al importar: ${errMsg}`);
      addLog(`[ERROR] Falló la importación preestablecida de IPTV: ${errMsg}`);
    } finally {
      setIsIptvLoading(false);
    }
  };

  const loadDemoPlaylist = () => {
    setIptvName("Argentina IPTV Demo");
    setIptvRawText(`#EXTM3U
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/LaPlatita/TDA-IPTV/main/logos/c26.png" group-title="Noticias",Canal 26 HD
https://rtmp.canal26.com/live/canal26.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/LaPlatita/TDA-IPTV/main/logos/telemax.png" group-title="Entretenimiento",Telemax HD
https://rtmp.canal26.com/live/telemax.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/LaPlatita/TDA-IPTV/main/logos/construir.png" group-title="TDA",Construir TV (Demo Mux)
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/LaPlatita/TDA-IPTV/main/logos/encuentro.png" group-title="Cultura",Canal Encuentro (Demo Akamai)
https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8
#EXTINF:-1 tvg-logo="https://raw.githubusercontent.com/LaPlatita/TDA-IPTV/main/logos/depor-tv.png" group-title="Deportes",DeporTV (Demo BipBop)
https://playertest.longtailvideo.com/adaptive/bipbop/bipbop.m3u8`);
    setIptvImportTab('raw');
    showToast("Campos rellenados con lista de demostración");
  };

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsAiLoading(true);
    setAiResponse('');
    
    try {
      const res = await axios.post('/api/ai/ask', {
        prompt: aiPrompt,
        isComplex: isComplexQuery
      });
      setAiResponse(res.data.answer);
    } catch (err: any) {
      setAiResponse("Hubo un error al procesar tu consulta con Gemini. Por favor, reintentá más tarde.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const addLog = (msg: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLogs(prev => [...prev, `<span class="text-slate-500">[${time}]</span> ${msg}`]);
  };

  const selectChannel = async (channelId: string, forceRefresh: boolean = false) => {
    const channel = allChannels.find(c => c.id === channelId);
    if (!channel) return;

    if (/^canal\\s*8\\s*(?:mdq|mar del plata)$/i.test(channel.name.trim())) {
      setActiveChannelId(channelId);
      setActiveVideoId(null);
      setPlayerState('offline');
      setApiResponse({ status: 'external_only', channelUrl: 'https://mi8.com.ar/en-vivo/', title: 'Canal 8 MDQ — emisión oficial' });
      return;
    }

    setActiveChannelId(channelId);
    setPlayerState('loading');
    setActiveVideoId(null);

    const knownLiveVideos: Record<string, string> = {
      'tn': 'cb12KmMMDJA',
      'americatv': 'Q32ajLjh8SU',
      'tv-publica': 'Vh8xmLBJtR8',
      'c5n': 'rZtTUCxpPuI',
      'cronica': 'hw4uHyct4vg',
      'canal26': '9i6d_Z8X0qY',
      'ln-mas': 'FEWZjXJ7M0c',
      'el-doce-cordoba': 'nndzeKDSjuc',
      'eltrece': 'nndzeKDSjuc',
      'elnueve': 'yGLVhAklLyM'
    };
    const normalizedName = channel.name.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const canonicalId = channel.id === 'elnueve' || /^(el nueve|canal 9(?: argentina)?)$/.test(normalizedName) ? 'elnueve'
      : channel.id === 'eltrece' || /^el trece$/.test(normalizedName) ? 'eltrece'
      : channel.id === 'el-doce-cordoba' || /^el doce(?: cordoba| argentina)?$/.test(normalizedName) ? 'el-doce-cordoba'
      : channel.id === 'tn' || /^tn(?: todo noticias| \(todo noticias\))?$/.test(normalizedName) ? 'tn'
      : channel.id === 'tv-publica' || /^(tv publica|television publica|tvp(?: argentina)?|television publica argentina)$/.test(normalizedName) || (('streamUrl' in channel) && String((channel as any).streamUrl).includes('Vh8xmLBJtR8')) ? 'tv-publica'
      : channel.id === 'americatv' || /^america(?:\s+(?:tv|television|en vivo))?(?:\s+hd)?$/.test(normalizedName) || (('streamUrl' in channel) && String((channel as any).streamUrl).includes('Q32ajLjh8SU')) ? 'americatv'
      : channel.id === 'c5n' || normalizedName === 'c5n' ? 'c5n'
      : channel.id === 'canal26' || /^canal\s*26$/.test(normalizedName) || (('streamUrl' in channel) && String((channel as any).streamUrl).includes('9i6d_Z8X0qY')) ? 'canal26'
      : channel.id === 'cronica' || /^cronica(?: tv)?$/.test(normalizedName) ? 'cronica'
      : channel.id === 'ln-mas' || normalizedName === 'ln+' || normalizedName === 'ln mas' ? 'ln-mas'
      : null;
    if (canonicalId && knownLiveVideos[canonicalId]) {
      const videoId = knownLiveVideos[canonicalId];
      setActiveVideoId(videoId);
      setApiResponse({ status: 'video_detected', videoId, title: `${channel.name} — video de YouTube identificado`, embedUrl: `https://www.youtube.com/embed/${videoId}` });
      setPlayerState('online');
      addLog('[YOUTUBE] Cargando emisión de YouTube identificada.');
      return;
    }

    // YouTube channel pages cannot be embedded as video frames without an actual live video ID.
    // Only individual YouTube videos may be embedded; otherwise link to the broadcaster's official page.
    if ('streamUrl' in channel && (channel as any).streamUrl && isYouTubeUrl((channel as any).streamUrl)) {
      const youtubeUrl = (channel as any).streamUrl as string;
      const id = getYouTubeVideoId(youtubeUrl);
      setApiResponse({ status: id ? 'video_detected' : 'external_only', title: channel.name, source: youtubeUrl });
      if (id) {
        setActiveVideoId(id);
        setPlayerState('online');
      } else {
        setPlayerState('offline');
        addLog(`[YOUTUBE] La URL de "${channel.name}" es una página, no un video insertable; usar enlace oficial.`);
      }
      return;
    }

    // A playlist URL is not proof of an active stream. Wait for actual playback.
    if ('streamUrl' in channel && (channel as any).streamUrl) {
      const streamUrl = (channel as any).streamUrl;
      addLog(`[IPTV STREAM] Intentando reproducir "${channel.name}"...`);
      setApiResponse({
        status: "loading",
        streamUrl,
        title: channel.name,
        source: `IPTV Playlist: ${channel.region}`,
        cached: false,
        serverTime: new Date().toISOString()
      });
      return;
    }

    if (import.meta.env.PROD && import.meta.env.BASE_URL !== '/') {
      setPlayerState('offline');
      setApiResponse({ status: 'external_only', channelUrl: channel.channelId ? `https://www.youtube.com/channel/${channel.channelId}/live` : null });
      addLog(`[GITHUB PAGES] El canal ${channel.name} requiere resolver su video en vivo desde YouTube; abrilo en el sitio oficial.`);
      return;
    }

    setApiRequestsCount(c => c + 1);
    addLog(`GET /api/canales/${channel.id}${forceRefresh ? '?refresh=true' : ''} - Petición HTTP recibida.`);

    let isCacheHit = false;
    let data;
    const now = Date.now();
    const cachedItem = serverCache.current[channel.id];

    try {
        if (!forceRefresh && cachedItem && (now - cachedItem.timestamp < CACHE_LIFETIME)) {
            isCacheHit = true;
            setCacheHitsCount(c => c + 1);
            data = cachedItem.data;
            addLog(`[CACHÉ HIT] Datos retornados para ${channel.id}. Expira en ${Math.round((CACHE_LIFETIME - (now - cachedItem.timestamp))/1000)}s.`);
        } else {
            addLog(`[CACHÉ MISS] Solicitando API directo para canal ${channel.id}.`);
            const res = await axios.get(`/api/canales/${channel.id}${forceRefresh ? '?refresh=true' : ''}`);
            data = res.data;
            serverCache.current[channel.id] = { timestamp: now, data };
        }

        const isLocallyOnline = channel.online;
        const finalStatus = isLocallyOnline ? data.status : 'offline';
        const finalVideoId = finalStatus === 'online' ? data.videoId : null;

        setApiResponse({
            status: finalStatus,
            videoId: finalVideoId,
            title: finalStatus === 'online' ? data.title : null,
            cached: isCacheHit,
            cacheAge: isCacheHit ? `${Math.round((now - cachedItem.timestamp)/1000)}s` : '0s',
            serverTime: new Date().toISOString()
        });

        if (finalStatus === 'online' && finalVideoId) {
            setPlayerState('online');
            setActiveVideoId(finalVideoId);
            addLog(`[SUCCESS] Stream del canal ${channel.id} cargado nativamente en el front.`);
        } else {
            setPlayerState('offline');
            setActiveVideoId(null);
            addLog(`[WARNING] Stream del canal ${channel.id} denegado. Código de respuesta: OFFLINE.`);
        }

    } catch (err) {
        addLog(`[ERROR] Falló la petición para ${channel.id}.`);
        setPlayerState('offline');
        setActiveVideoId(null);
    }
  };

  const handlePlayerError = (error: any) => {
    addLog(`[ERROR] Falló la reproducción en cliente para ${activeChannelId}. (Error de YT)`);
    setPlayerState('error');
    // Mantenemos activeVideoId para que pueda reintentar
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
        const newFavs = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
        localStorage.setItem('tda_favs', JSON.stringify(newFavs));
        showToast(prev.includes(id) ? "Canal removido de favoritos" : "Canal agregado a favoritos");
        return newFavs;
    });
  };

  const toggleChannelSignal = (id: string) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, online: !c.online } : c));
    delete serverCache.current[id];
    const channel = channels.find(c => c.id === id);
    addLog(`[MANUAL STATE] ${channel?.name} cambiado a ${!channel?.online ? 'ONLINE' : 'OFFLINE'}. Caché invalidada.`);
    if (activeChannelId === id) {
        selectChannel(id);
    }
  };

  const clearServerCache = () => {
    serverCache.current = {};
    setCacheHitsCount(0);
    setApiRequestsCount(0);
    addLog(`[SYSTEM] Caché limpiada en memoria del servidor Express.`);
    showToast("Memoria de Caché vaciada correctamente");
  };

  const handleFullscreen = () => {
    if (!activeChannelId) {
        showToast("No hay señal activa reproduciéndose");
        return;
    }
    const elem = document.getElementById("player-iframe-container");
    if (elem?.requestFullscreen) {
        elem.requestFullscreen();
    }
  };

  const shareActiveChannel = () => {
      if (!activeChannelId) {
          showToast("Primero selecciona un canal");
          return;
      }
      const activeChannel = allChannels.find(c => c.id === activeChannelId);
      const shareUrl = `${window.location.origin}/share/channel/${activeChannelId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
          showToast(`¡Enlace copiado! (${activeChannel?.name})`);
          addLog(`[SHARE API] Compartido canal ${activeChannelId}. Enlace de invitación generado.`);
      }).catch(() => {
          showToast("Error al copiar enlace");
      });
  };

  // Memoized unique groups for custom IPTV channels
  const iptvGroups = React.useMemo(() => {
    const groupsSet = new Set<string>();
    iptvPlaylists.forEach(playlist => {
      playlist.channels.forEach(ch => {
        if (ch.group) groupsSet.add(ch.group);
      });
    });
    return Array.from(groupsSet).sort();
  }, [iptvPlaylists]);

  let filteredChannels = allChannels;
  if (selectedCategory === 'favoritos') {
      filteredChannels = allChannels.filter(c => favorites.includes(c.id));
  } else if (selectedCategory !== 'all') {
      filteredChannels = allChannels.filter(c => c.category === selectedCategory);
  }

  // Home only shows a small curated group, never the entire IPTV directory.
  if (selectedCountry === 'home' && !searchQuery.trim()) {
    const featuredIds = new Set(['tn', 'tv-publica', 'americatv', 'c5n', 'cronica', 'canal26', 'ln-mas', 'eltrece', 'elnueve']);
    filteredChannels = filteredChannels.filter(channel => featuredIds.has(channel.id));
  }

  // Separate countries without changing the existing category, search or favorites filters.
  if (selectedCountry !== 'all' && selectedCountry !== 'home') {
    filteredChannels = filteredChannels.filter(channel => {
      if (!('streamUrl' in channel)) return selectedCountry === 'ar';
      const region = String(channel.region || '').toLowerCase();
      const group = String(('group' in channel ? channel.group : '') || '').toLowerCase();
      const metadata = region + ' ' + group;
      // Imported playlists without trustworthy country metadata must not be labeled Argentine.
      // Never guess Argentina merely because a channel is not from Brazil.
      const explicitlyBrazilian = /\\b(brasil|brazil|brasileir[oa]|br\\s*-\\s*free-tv)\\b/i.test(metadata);
      const explicitlyArgentine = /\\b(argentina|argentine|argentino|argentina\\s*-|\\bar\\s*-\\s*iptv)\\b/i.test(metadata);
      const foreign = /\\b(china|chinese|chino|chinos|chines|hong\\s*kong|taiwan|japan|jap[oó]n|corea|korea|uruguay|chile|mexico|méxico|españa|spain|usa|united states)\\b/i.test(channel.name + ' ' + metadata) || /[\\u3400-\\u9fff]/u.test(channel.name);
      if (selectedCountry === 'ar') return explicitlyArgentine && !explicitlyBrazilian && !foreign;
      if (selectedCountry === 'br') return explicitlyBrazilian && !foreign;
      return false;
    });
  }

  // Extra filter for IPTV group
  if (selectedCategory === 'iptv' && selectedIptvGroup !== 'all') {
      filteredChannels = filteredChannels.filter(c => 'group' in c && (c as any).group === selectedIptvGroup);
  }

  if (searchQuery) {
      filteredChannels = filteredChannels.filter(c => 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          c.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ('group' in c && (c as any).group?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }

  const activeChannel = allChannels.find(c => c.id === activeChannelId);
  const ratio = apiRequestsCount > 0 ? Math.round((cacheHitsCount / apiRequestsCount) * 1000)/10 : 100;

  return (
    <>
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                      <i className="fa-solid fa-tv text-white text-lg"></i>
                  </div>
                  <div>
                      <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-sky-400 to-white bg-clip-text text-transparent">
                          TDA ARGENTINA
                      </h1>
                      <p className="text-xs text-slate-400">Televisión Digital Abierta · Portal Interactivo</p>
                  </div>
              </div>

              {/* Global Search & Stats */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <i className="fa-solid fa-magnifying-glass text-slate-500 text-sm"></i>
                      </span>
                      <input 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar canal, señal o provincia..." 
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-9 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
                      />
                  </div>
                  <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-lg text-xs font-semibold text-white transition-all shadow-md active:scale-95 whitespace-nowrap border border-indigo-400/30">
                      <i className="fa-solid fa-sparkles"></i>
                      <span>Guía IA</span>
                  </button>
                  <button onClick={() => {setIsDevConsoleOpen(!isDevConsoleOpen); showToast("Consola de simulación conmutada");}} className="relative flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-sky-400 border border-sky-500/20 transition-all shadow-md active:scale-95 whitespace-nowrap">
                      <i className="fa-solid fa-code"></i>
                      <span>Simulador Backend</span>
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                  </button>
              </div>
          </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 flex flex-col lg:flex-row gap-6 relative">
          
          {/* Left Column: App UI & Player (70%) */}
          <div className="flex-grow lg:w-2/3 flex flex-col gap-6">

              {/* Active Video Player Section */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative">
                  {/* Video Screen Wrapper */}
                  <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                      
                      {/* Color Bars / Offline Placeholder */}
                      <div className={cn("absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-10", playerState === 'online' || playerState === 'loading' ? 'hidden' : 'flex')}>
                          <div className="absolute inset-0 opacity-10 flex flex-row">
                              <div className="flex-1 bg-white"></div>
                              <div className="flex-1 bg-yellow-400"></div>
                              <div className="flex-1 bg-cyan-400"></div>
                              <div className="flex-1 bg-emerald-400"></div>
                              <div className="flex-1 bg-fuchsia-500"></div>
                              <div className="flex-1 bg-red-600"></div>
                              <div className="flex-1 bg-blue-700"></div>
                          </div>
                          
                          <div className="relative z-20 text-center px-6">
                              <div className="w-16 h-16 mx-auto mb-4 bg-slate-900/90 border border-slate-800 rounded-full flex items-center justify-center text-slate-500 text-2xl animate-pulse">
                                  <i className={cn("fa-solid", activeChannel ? "fa-triangle-exclamation text-rose-500 text-3xl" : "fa-satellite-dish text-red-500")}></i>
                              </div>
                              <h3 className="text-lg font-bold text-slate-100">
                                  {activeChannel 
                                      ? (playerState === 'error' ? "Error de Reproducción" : "Transmisión Interrumpida / Offline") 
                                      : "Sin Señal / Seleccioná un Canal"}
                              </h3>
                              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                                  {activeChannel 
                                      ? (playerState === 'error' ? "El video no está disponible (puede requerir reproducirse en YouTube o fue eliminado)." : `${activeChannel.name} se encuentra fuera de transmisión o su reproductor requiere validación de región.`) 
                                      : "Elegí un canal de la grilla inferior para comprobar su señal."}
                              </p>
                              {activeChannel && 'streamUrl' in activeChannel && isYouTubeUrl(String((activeChannel as any).streamUrl)) && (
                                  <a href={String((activeChannel as any).streamUrl)}
                                     target="_blank" rel="noopener noreferrer"
                                     className="mt-3 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                                    Abrir transmisión en YouTube
                                  </a>
                              )}
                              {activeChannel && !('streamUrl' in activeChannel) && activeChannel.channelId && (
                                 <a href={`https://www.youtube.com/channel/${activeChannel.channelId}/live`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="mt-3 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
                                   Ver canal oficial en YouTube
                                 </a>
                              )}
                              {activeChannel && (
                                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                      <button onClick={() => selectChannel(activeChannel.id)} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md inline-flex items-center gap-2">
                                          <i className="fa-solid fa-rotate-right"></i> Reintentar Conexión
                                      </button>
                                      <button onClick={() => selectChannel(activeChannel.id, true)} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md inline-flex items-center gap-2">
                                          <i className="fa-solid fa-bolt"></i> Refresh Stream
                                      </button>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Live Player Container */}
                      <div id="player-iframe-container" className={cn("absolute inset-0 w-full h-full transition-opacity duration-300 bg-black", (playerState === 'online' || (playerState === 'loading' && activeChannel && 'streamUrl' in activeChannel)) ? 'opacity-100 z-20 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none')}>
                          {(playerState === 'online' || (playerState === 'loading' && activeChannel && 'streamUrl' in activeChannel)) && (
                              activeChannel && 'streamUrl' in activeChannel && (activeChannel as any).streamUrl && !isYouTubeUrl((activeChannel as any).streamUrl) ? (
                                  <Player
                                      key={String((activeChannel as any).streamUrl)}
                                      src={String((activeChannel as any).streamUrl)}
                                      playing={playerPlaying}
                                      controls
                                      volume={playerVolume}
                                      muted={playerMuted}
                                      playsInline
                                      width="100%"
                                      height="100%"
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        objectFit: aspectMode === 'fill' ? 'fill' : aspectMode === 'cover' ? 'cover' : 'contain'
                                      }}
                                      onPlaying={() => {
                                        setPlayerState('online');
                                        setApiResponse(prev => ({ ...prev, status: 'online', message: 'IPTV: reproducción iniciada' }));
                                        addLog('[IPTV] Reproducción iniciada.');
                                      }}
                                      onError={(err: any) => {
                                        console.error('IPTV playback error:', err);
                                        setApiResponse(prev => ({
                                          ...prev,
                                          status: 'error',
                                          message: 'No se pudo reproducir la señal. Puede estar caída, bloqueada por CORS, región o HTTPS.',
                                          streamUrl: String((activeChannel as any).streamUrl)
                                        }));
                                        handlePlayerError(err);
                                      }}
                                  />                              ) : (
                                  activeVideoId && (
                                      <iframe 
                                          key={activeVideoId}
                                          src={activeVideoId === "Q32ajLjh8SU" ? "https://www.youtube.com/embed/Q32ajLjh8SU?si=7WQTJ2eyIzr2syx3&autoplay=1&playsinline=1" : `https://www.youtube.com/embed/${activeVideoId}?autoplay=1&playsinline=1&rel=0`}
                                          className="w-full h-full absolute top-0 left-0"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                          allowFullScreen
                                          referrerPolicy="strict-origin-when-cross-origin"
                                          title="Reproductor de TV en Vivo"
                                      ></iframe>
                                  )
                              )
                          )}
                      </div>

                      {activeChannel && /^canal\\s*8\\s*(?:mdq|mar del plata)$/i.test(activeChannel.name.trim()) && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950 p-5">
                          <div className="text-center space-y-4">
                            <p className="text-white font-bold">Canal 8 MDQ — Mar del Plata</p>
                            <p className="text-slate-300 text-sm">No hay una señal HLS verificable para reproducir aquí.</p>
                            <a href="https://mi8.com.ar/en-vivo/" target="_blank" rel="noopener noreferrer" className="inline-block px-5 py-3 rounded-xl bg-sky-600 text-white font-semibold">Ver transmisión en el sitio oficial ↗</a>
                          </div>
                        </div>
                      )}
                      {/* Loading Spinner */}
                      <div className={cn("absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-30", playerState === 'loading' && !(activeChannel && 'streamUrl' in activeChannel) ? 'flex' : 'hidden')}>
                          <div className="relative w-12 h-12">
                              <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                              <div className="absolute inset-0 rounded-full border-4 border-t-sky-500 animate-spin"></div>
                          </div>
                          <p className="text-xs text-sky-400 mt-4 tracking-widest font-mono">RESOLVIENDO STREAM CACHÉ...</p>
                      </div>
                  </div>

                  {/* IPTV Advanced Controls HUD */}
                  {playerState === 'online' && activeChannel && 'streamUrl' in activeChannel && (activeChannel as any).streamUrl && (
                      <div className="bg-slate-950 border-t border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-4 select-none">
                          {/* Playback Controls */}
                          <div className="flex items-center gap-3">
                              <button 
                                  onClick={() => setPlayerPlaying(!playerPlaying)}
                                  className="w-9 h-9 rounded-full bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 flex items-center justify-center transition-all shadow active:scale-95"
                                  title={playerPlaying ? "Pausar" : "Reproducir"}
                              >
                                  <i className={cn("fa-solid text-sm", playerPlaying ? "fa-pause" : "fa-play pl-0.5")}></i>
                              </button>

                              <button 
                                  onClick={() => selectChannel(activeChannel.id)}
                                  className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-all shadow active:scale-95"
                                  title="Recargar señal"
                              >
                                  <i className="fa-solid fa-arrows-rotate text-xs"></i>
                              </button>

                              {/* Volume Controls */}
                              <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 px-3 py-1 rounded-xl">
                                  <button 
                                      onClick={() => setPlayerMuted(!playerMuted)}
                                      className="text-slate-400 hover:text-slate-200 transition-colors"
                                      title={playerMuted ? "Activar Sonido" : "Silenciar"}
                                  >
                                      <i className={cn("fa-solid text-xs w-4", playerMuted || playerVolume === 0 ? "fa-volume-xmark text-red-400" : playerVolume < 0.4 ? "fa-volume-low" : "fa-volume-high")}></i>
                                  </button>
                                  <input 
                                      type="range"
                                      min="0"
                                      max="1"
                                      step="0.05"
                                      value={playerMuted ? 0 : playerVolume}
                                      onChange={(e) => {
                                          setPlayerVolume(parseFloat(e.target.value));
                                          if (playerMuted) setPlayerMuted(false);
                                      }}
                                      className="w-20 accent-purple-500 h-1 rounded-lg cursor-pointer bg-slate-800"
                                      title={`Volumen: ${Math.round((playerMuted ? 0 : playerVolume) * 100)}%`}
                                  />
                                  <span className="text-[10px] text-slate-500 font-mono font-bold w-6 text-right">
                                      {Math.round((playerMuted ? 0 : playerVolume) * 100)}%
                                  </span>
                              </div>
                          </div>

                          {/* Aspect Ratio controls */}
                          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-850 p-1 rounded-xl">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-2">Aspecto:</span>
                              {(['contain', '4-3', 'fill', 'cover'] as const).map((mode) => (
                                  <button
                                      key={mode}
                                      onClick={() => {
                                          setAspectMode(mode);
                                          showToast(`Aspecto cambiado a: ${mode === 'contain' ? '16:9 Original' : mode === '4-3' ? '4:3 Clásico' : mode === 'fill' ? 'Estirado (Rellenar)' : 'Expandido (Cover)'}`);
                                      }}
                                      className={cn(
                                          "px-2 py-1 text-[10px] font-bold rounded-lg transition-all",
                                          aspectMode === mode 
                                              ? "bg-purple-600 text-white shadow" 
                                              : "text-slate-400 hover:text-slate-200"
                                      )}
                                  >
                                      {mode === 'contain' ? '16:9' : mode === '4-3' ? '4:3' : mode === 'fill' ? 'Estirar' : 'Expandir'}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Player Control Info bar */}
                  <div className="p-4 bg-slate-900 border-t border-slate-800/60">
                      {/* Video Title */}
                      <h2 className="font-bold text-lg md:text-xl text-slate-50 mb-3">
                          {activeChannel ? (playerState === 'online' ? `${activeChannel.currentShow} - EN VIVO` : "Transmisión no disponible") : "Esperando selección..."}
                      </h2>
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          {/* Channel Info & Subscribe */}
                          <div className="flex items-center gap-3">
                              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border border-slate-700 text-lg font-bold p-1 overflow-hidden", activeChannel && playerState === 'online' ? activeChannel.logoBg : "bg-slate-950 text-slate-500")}
                                   dangerouslySetInnerHTML={{ __html: activeChannel && playerState === 'online' ? activeChannel.logoHtml : '<i class="fa-solid fa-tv text-slate-600"></i>' }}>
                              </div>
                              <div className="flex flex-col justify-center">
                                  <h3 className="font-bold text-sm text-slate-100 leading-tight flex items-center gap-1">
                                      {activeChannel ? activeChannel.name : "TDA Canal"}
                                      {activeChannel && <i className="fa-solid fa-circle-check text-slate-400 text-[10px]"></i>}
                                  </h3>
                                  <p className="text-[11px] text-slate-400">
                                      {activeChannel ? `${formatNumber(Math.floor(Math.random() * 800) + 100)} mil suscriptores` : ""}
                                  </p>
                              </div>
                              <button 
                                  onClick={(e) => activeChannel && toggleFavorite(activeChannel.id, e)} 
                                  className={cn("ml-1 sm:ml-3 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors", 
                                      favorites.includes(activeChannelId || '') ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-white hover:bg-slate-200 text-slate-950"
                                  )}
                              >
                                  <span className="hidden sm:inline">{favorites.includes(activeChannelId || '') ? "Suscrito" : "Suscribirse"}</span>
                                  <span className="sm:hidden">{favorites.includes(activeChannelId || '') ? "Suscrito" : "Suscribir"}</span>
                                  {favorites.includes(activeChannelId || '') && <i className="fa-regular fa-bell ml-2"></i>}
                              </button>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                              <div className="flex items-center bg-slate-800 rounded-full">
                                  <button className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-slate-700 rounded-l-full text-xs sm:text-sm font-semibold text-slate-200 border-r border-slate-700 transition-colors">
                                      <i className="fa-regular fa-thumbs-up"></i>
                                      <span>12k</span>
                                  </button>
                                  <button className="flex items-center px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-slate-700 rounded-r-full text-xs sm:text-sm text-slate-200 transition-colors">
                                      <i className="fa-regular fa-thumbs-down"></i>
                                  </button>
                              </div>
                              
                              <button onClick={shareActiveChannel} className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-xs sm:text-sm font-semibold text-slate-200 transition-colors whitespace-nowrap">
                                  <i className="fa-solid fa-share"></i>
                                  <span className="hidden sm:inline">Compartir</span>
                              </button>

                              <button onClick={handleFullscreen} className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-xs sm:text-sm font-semibold text-slate-200 transition-colors whitespace-nowrap" title="Pantalla Completa">
                                  <i className="fa-solid fa-expand"></i>
                              </button>
                          </div>
                      </div>
                      
                      {/* Description Box (YouTube style) */}
                      {activeChannel && playerState === 'online' && (
                          <div className="mt-4 bg-slate-800/50 hover:bg-slate-800 transition-colors p-3 rounded-xl cursor-pointer">
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 mb-1">
                                  <span className="flex items-center text-red-500 font-bold">
                                      <i className="fa-solid fa-tower-broadcast mr-1.5 text-xs"></i>
                                      En vivo
                                  </span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-300">{formatNumber(activeChannel.viewerCount)} espectadores</span>
                              </div>
                              <p className="text-sm text-slate-300 mt-1">
                                  Estás viendo <strong>{activeChannel.currentShow}</strong> en la transmisión oficial de {activeChannel.name} ({activeChannel.region}). 
                              </p>
                          </div>
                      )}
                  </div>
              </div>

              {/* Country tabs: keep existing category filters underneath. */}
              <nav aria-label="País de los canales" className="flex items-center gap-2 overflow-x-auto pb-3">
                {([
                  { id: 'home', label: '🏠 Inicio' },
                  { id: 'ar', label: '🇦🇷 Argentina' },
                  { id: 'br', label: '🇧🇷 Brasil' },
                  { id: 'all', label: '🌎 Todos los países' }
                ] as const).map(country => (
                  <button
                    key={country.id}
                    type="button"
                    onClick={() => { setSelectedCountry(country.id); setSelectedIptvGroup('all'); }}
                    aria-pressed={selectedCountry === country.id}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors border",
                      selectedCountry === country.id
                        ? "bg-sky-600 border-sky-400 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    {country.label}
                  </button>
                ))}
              </nav>

              {/* Categories / Navigation Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-900">
                  <button onClick={() => setSelectedCategory('all')} className={cn("px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shadow-md", selectedCategory === 'all' ? "bg-sky-500 text-white" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                      Todos los Canales
                  </button>
                  <button onClick={() => setSelectedCategory('aire')} className={cn("px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all", selectedCategory === 'aire' ? "bg-sky-500 text-white shadow-md" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                      <i className="fa-solid fa-broadcast-tower mr-1.5 text-amber-500"></i>Canales de Aire
                  </button>
                  <button onClick={() => setSelectedCategory('noticias')} className={cn("px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all", selectedCategory === 'noticias' ? "bg-sky-500 text-white shadow-md" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                      <i className="fa-solid fa-newspaper mr-1.5 text-blue-500"></i>Señales de Noticias
                  </button>
                  <button onClick={() => setSelectedCategory('interior')} className={cn("px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all", selectedCategory === 'interior' ? "bg-sky-500 text-white shadow-md" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                      <i className="fa-solid fa-map-location-dot mr-1.5 text-emerald-500"></i>Provincias / Interior
                  </button>
                  <button onClick={() => setSelectedCategory('iptv')} className={cn("px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all", selectedCategory === 'iptv' ? "bg-sky-500 text-white shadow-md" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                      <i className="fa-solid fa-list-ul mr-1.5 text-purple-400"></i>Mis Listas IPTV
                  </button>
                  <button onClick={() => setSelectedCategory('favoritos')} className={cn("px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all", selectedCategory === 'favoritos' ? "bg-sky-500 text-white shadow-md" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                      <i className="fa-solid fa-star mr-1.5 text-yellow-500"></i>Favoritos 
                      {favorites.length > 0 && <span className="bg-slate-800 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full ml-1">{favorites.length}</span>}
                  </button>
              </div>

              {/* IPTV Playlists Management section */}
              {selectedCategory === 'iptv' && (
                  <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 sm:p-5 mb-2">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                          <div>
                              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                  <i className="fa-solid fa-folder-open text-purple-400"></i>
                                  Administrador de Listas IPTV (.m3u)
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">
                                  Cargá playlists externas desde URL o pegando su código para integrarlas a la grilla y reproducirlas directamente.
                              </p>
                          </div>
                          <button onClick={() => setIsIptvModalOpen(true)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-2">
                              <i className="fa-solid fa-plus"></i> Importar Lista M3U
                          </button>
                      </div>

                      {iptvPlaylists.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {iptvPlaylists.map(playlist => (
                                  <div key={playlist.id} className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between group">
                                      <div className="min-w-0">
                                          <h4 className="font-bold text-sm text-slate-200 truncate">{playlist.name}</h4>
                                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                              <span className="bg-purple-950/50 text-purple-400 border border-purple-900/40 px-1.5 py-0.5 rounded">
                                                  {playlist.channelsCount} señales
                                              </span>
                                              {playlist.url ? (
                                                  <span className="truncate max-w-[150px]" title={playlist.url}>
                                                      <i className="fa-solid fa-link mr-1"></i>{playlist.url}
                                                  </span>
                                              ) : (
                                                  <span><i className="fa-solid fa-file-code mr-1"></i>Texto Raw</span>
                                              )}
                                          </p>
                                      </div>
                                      <button onClick={() => handleDeletePlaylist(playlist.id, playlist.name)} className="text-slate-500 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-all" title="Eliminar Playlist">
                                          <i className="fa-regular fa-trash-can"></i>
                                      </button>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-6 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
                              <p className="text-xs text-slate-500">No tenés listas IPTV importadas actualmente en el almacenamiento del navegador.</p>
                              <button onClick={() => setIsIptvModalOpen(true)} className="text-xs font-semibold text-sky-400 hover:text-sky-300 mt-2 inline-flex items-center gap-1.5">
                                  <i className="fa-solid fa-cloud-arrow-down"></i> Importá una lista de prueba ahora
                              </button>
                          </div>
                      )}

                      {/* Presets Grid */}
                      <div className="mt-6 pt-5 border-t border-slate-800/40">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                              <i className="fa-solid fa-wand-magic-sparkles text-purple-400 animate-pulse"></i>
                              Listas Recomendadas de Argentina (Un Click para Importar)
                          </h4>
                          <input
                            type="search"
                            value={presetSearch}
                            onChange={(event) => setPresetSearch(event.target.value)}
                            placeholder="Buscar listas: Argentina, Buenos Aires, Córdoba, noticias..."
                            aria-label="Buscar listas IPTV"
                            className="mb-3 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500"
                          />
                          {filteredPresets.length === 0 && <p className="mb-3 text-xs text-slate-400">No encontramos listas para esa búsqueda.</p>}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {filteredPresets.map((preset) => {
                                  const alreadyImported = iptvPlaylists.some(p => p.url === preset.url || p.name === preset.name);
                                  return (
                                      <div key={preset.name} className="bg-slate-950/40 border border-slate-850 hover:border-slate-800 p-3.5 rounded-xl flex flex-col justify-between transition-all hover:bg-slate-950/70">
                                          <div>
                                              <div className="flex justify-between items-start gap-2">
                                                  <span className="font-bold text-xs text-slate-200">{preset.name}</span>
                                                  <span className="bg-purple-500/10 text-purple-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-purple-500/20">{preset.badge}</span>
                                              </div>
                                              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">{preset.desc}</p>
                                          </div>
                                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-900/60 pt-2.5">
                                              <span className="text-[9px] text-slate-500 font-mono truncate max-w-[120px] sm:max-w-[160px]" title={preset.url}>{preset.url}</span>
                                              {alreadyImported ? (
                                                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                                                      <i className="fa-solid fa-circle-check"></i> Importada
                                                  </span>
                                              ) : (
                                                  <button 
                                                      onClick={() => importPresetIptv(preset.name, preset.url)}
                                                      className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/20 hover:border-purple-500 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5 shrink-0"
                                                  >
                                                      <i className="fa-solid fa-cloud-arrow-down"></i> Importar
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      {/* Sintonizador Manual Form */}
                      <div className="mt-6 pt-5 border-t border-slate-800/40">
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                              <i className="fa-solid fa-satellite-dish text-purple-400"></i>
                              Sintonizador Manual de Señales (Stream Individual)
                          </h4>
                          <form onSubmit={playQuickStream} className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/80 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre del Canal / Transmisión</label>
                                      <input 
                                          type="text"
                                          value={quickStreamName}
                                          onChange={(e) => setQuickStreamName(e.target.value)}
                                          placeholder="Ej: TN HLS Backup, Canal Local"
                                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">URL Directa del Stream (HLS .m3u8, .mp4, etc.)</label>
                                      <input 
                                          type="url"
                                          value={quickStreamUrl}
                                          onChange={(e) => setQuickStreamUrl(e.target.value)}
                                          placeholder="https://example.com/live/playlist.m3u8"
                                          required
                                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                                      />
                                  </div>
                              </div>
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-1">
                                  <span className="text-[10px] text-slate-500">Soporta enlaces HLS (.m3u8), MP4 directos, y streaming nativo de audio/video. Se guardará en "Sintonizaciones Manuales".</span>
                                  <button 
                                      type="submit"
                                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow active:scale-95 shrink-0"
                                  >
                                      <i className="fa-solid fa-play"></i> Sintonizar y Guardar
                                  </button>
                              </div>
                          </form>
                      </div>
                  </div>
              )}

              {/* Grid of Channels */}
              <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                      {selectedCategory === 'iptv' ? "Señales IPTV Importadas" : "Grilla de Emisores"}
                  </h3>

                  {selectedCategory === 'iptv' && iptvPlaylists.length > 0 && (
                      <div className="mb-4 bg-slate-900/40 border border-slate-850 p-3 rounded-xl">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2"><i className="fa-solid fa-filter text-purple-400 mr-1.5"></i>Filtrar por Grupo / Categoría de la Lista:</span>
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
                              <button 
                                  onClick={() => setSelectedIptvGroup('all')}
                                  className={cn(
                                      "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                                      selectedIptvGroup === 'all' 
                                          ? "bg-purple-600 text-white shadow-sm" 
                                          : "bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-slate-850"
                                  )}
                              >
                                  Todos los Grupos ({iptvPlaylists.reduce((acc, p) => acc + p.channels.length, 0)})
                              </button>
                              {iptvGroups.map((groupName) => {
                                  const count = iptvPlaylists.reduce((acc, p) => acc + p.channels.filter(ch => ch.group === groupName).length, 0);
                                  return (
                                      <button 
                                          key={groupName}
                                          onClick={() => setSelectedIptvGroup(groupName)}
                                          className={cn(
                                              "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                                              selectedIptvGroup === groupName 
                                                  ? "bg-purple-600 text-white shadow-sm" 
                                                  : "bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-slate-850"
                                          )}
                                      >
                                          {groupName} ({count})
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  )}
                  
                  {filteredChannels.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {filteredChannels.slice(0, selectedCountry === 'home' && !searchQuery.trim() ? 9 : filteredChannels.length).map(channel => {
                              const isFav = favorites.includes(channel.id);
                              const isActive = activeChannelId === channel.id;
                              
                              return (
                                  <div key={channel.id} onClick={() => selectChannel(channel.id)} className={cn("bg-slate-900 border rounded-xl p-3 cursor-pointer transition-all duration-200 relative group", isActive ? "border-sky-500 shadow-sky-500/10 shadow-lg scale-[1.02]" : "border-slate-800/80 hover:border-slate-700 hover:scale-[1.01]")}>
                                      <div className="flex items-start justify-between mb-2">
                                          <div className={`w-10 h-10 rounded-lg ${channel.logoBg} text-slate-100 flex items-center justify-center p-1.5 shadow-inner`} dangerouslySetInnerHTML={{ __html: channel.logoHtml }} />
                                          <div className="flex items-center gap-1">
                                              {channel.online ? 
                                                  <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">Vivo</span> : 
                                                  <span className="bg-rose-500/10 text-rose-400 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-rose-500/20 uppercase tracking-wider">Offline</span>
                                              }
                                              <button onClick={(e) => toggleFavorite(channel.id, e)} className="text-slate-600 hover:text-yellow-400 p-1 transition-colors">
                                                  <i className={cn("text-xs", isFav ? "fa-solid fa-star text-yellow-400" : "fa-regular fa-star")}></i>
                                              </button>
                                          </div>
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-sm text-slate-100 truncate group-hover:text-sky-400 transition-colors">{channel.name}</h4>
                                          <p className="text-[10px] text-slate-400 truncate">{channel.region}</p>
                                      </div>
                                      <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                                          <span className="text-slate-500 font-medium truncate max-w-[120px]">{channel.currentShow}</span>
                                          <span className="text-slate-600 font-mono"><i className="fa-solid fa-users mr-1"></i>{channel.online ? formatNumber(channel.viewerCount) : 0}</span>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="py-12 text-center bg-slate-900/20 rounded-2xl border border-slate-800/50 p-6">
                          <div className="text-slate-600 text-4xl mb-3">
                              {selectedCategory === 'iptv' ? (
                                  <i className="fa-solid fa-tv text-purple-400/40"></i>
                              ) : (
                                  <i className="fa-solid fa-magnifying-glass text-slate-700"></i>
                              )}
                          </div>
                          <h4 className="font-bold text-slate-300 text-sm mb-1">
                              {selectedCategory === 'iptv' ? "No hay canales IPTV importados" : "No encontramos canales"}
                          </h4>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                              {selectedCategory === 'iptv' 
                                  ? "Importá una lista M3U con transmisiones en directo en formato m3u8 o rtmp para expandir tu panel de streaming."
                                  : "No encontramos ningún canal que coincida con tu búsqueda. Verificá los filtros de categorías superiores."}
                          </p>
                          {selectedCategory === 'iptv' && (
                              <button onClick={() => setIsIptvModalOpen(true)} className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md">
                                  Importar Primera Playlist
                              </button>
                          )}
                      </div>
                  )}
              </div>

              {/* Guía de TV / EPG */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800/80 p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                          <i className="fa-regular fa-calendar-days text-sky-400"></i>
                          <h3 className="font-bold text-slate-100">Guía de Programación de Hoy</h3>
                      </div>
                      <span className="text-[10px] bg-slate-950 px-2 py-1 rounded text-slate-400 font-mono">{timeString}</span>
                  </div>
                  
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {allChannels.slice(0, 8).map((channel, idx) => (
                          <EpgRow 
                              key={`epg-${channel.id}`} 
                              channel={channel} 
                              idx={idx} 
                              onClick={() => setSelectedEpgProgram({ channel, idx })}
                          />
                      ))}
                  </div>
              </div>

          </div>

          {/* Right Column: API Simulator & Controller (30%) */}
          <div className={cn("w-full lg:w-1/3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-fit lg:sticky lg:top-20 transition-all duration-300", isDevConsoleOpen ? "block" : "hidden lg:flex")}>
              
              {/* Header of Simulator */}
              <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-xs font-extrabold text-slate-300 tracking-wider uppercase">SIMULADOR BACKEND NODE.JS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                      <button onClick={clearServerCache} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 rounded transition-colors" title="Vaciar caché en memoria">
                          <i className="fa-solid fa-trash-can mr-1"></i>Vaciar Caché
                      </button>
                      <button onClick={() => setIsDevConsoleOpen(false)} className="lg:hidden text-slate-400 hover:text-white px-1">
                          <i className="fa-solid fa-times"></i>
                      </button>
                  </div>
              </div>

              {/* Server Performance Indicator Bar */}
              <div className="bg-slate-900 p-3 border-b border-slate-800 flex justify-between text-[11px] font-mono text-slate-400">
                  <div>Status: <span className="text-emerald-400 font-bold">EXPRESS_OK (3000)</span></div>
                  <div>Caché: <span className="text-sky-400 font-bold">{ratio}%</span> (Ratio)</div>
              </div>

              {/* Channel Status Switches Controller */}
              <div className="p-4 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Controlador de Señal (API Switches)</h4>
                  <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">Podes "apagar" o "encender" la señal de los canales para testear el sistema de control de fallos y de respuesta Offline de tu App móvil.</p>
                  
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {channels.map(channel => (
                          <div key={channel.id} className="flex items-center justify-between p-2 bg-slate-950 rounded-lg border border-slate-800/60">
                              <div className="flex items-center gap-2 min-w-0">
                                  <span className={cn("w-2 h-2 rounded-full", channel.online ? 'bg-emerald-500' : 'bg-rose-500')}></span>
                                  <span className="text-[11px] font-bold text-slate-300 truncate">{channel.name}</span>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={channel.online} onChange={() => toggleChannelSignal(channel.id)} className="sr-only peer" />
                                  <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Live JSON Response Inspector */}
              <div className="p-4 bg-slate-950 flex-grow">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Respuesta JSON de la API</span>
                  <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-3 h-36 overflow-y-auto">
                      <pre className="font-mono text-[10px] text-sky-400 whitespace-pre-wrap">
                          {JSON.stringify(apiResponse, null, 2)}
                      </pre>
                  </div>
              </div>
          </div>

      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 px-4 mt-12 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
              <p>© 2026 TDA Argentina App Demo. Creado para simulación educativa y diseño de arquitectura móvil.</p>
              <p className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-900 rounded text-slate-400">v1.2.0-stable</span>
                  <span className="px-2 py-0.5 bg-sky-950/40 text-sky-400 rounded border border-sky-900/30">HLS/M3U8 Ready</span>
              </p>
          </div>
      </footer>

      {/* AI Assistant Modal */}
      {isAiModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex justify-between items-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                              <i className="fa-solid fa-sparkles text-white text-xs"></i>
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-slate-100">Guía IA de TDA</h3>
                              <p className="text-[10px] text-slate-400">Potenciado por Gemini 3.5</p>
                          </div>
                      </div>
                      <button onClick={() => setIsAiModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                          <i className="fa-solid fa-times"></i>
                      </button>
                  </div>
                  
                  <div className="p-5 flex-grow overflow-y-auto">
                      <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4 mb-4 text-xs text-indigo-200">
                          <p><i className="fa-solid fa-circle-info mr-1 text-indigo-400"></i> Preguntame sobre la grilla, los conductores, análisis de programas o información histórica de los canales de la televisión argentina.</p>
                      </div>

                      {aiResponse && (
                          <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700/50 relative">
                              <div className="absolute -top-3 left-4 bg-slate-900 px-2 text-[10px] font-bold text-purple-400 uppercase tracking-wider">Respuesta de IA</div>
                              <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed mt-1">
                                  {aiResponse}
                              </div>
                          </div>
                      )}

                      {isAiLoading && (
                          <div className="flex items-center gap-3 text-indigo-400 text-xs font-semibold p-4">
                              <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
                              <span>Procesando consulta...</span>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-slate-950 border-t border-slate-800">
                      <form onSubmit={handleAskAI} className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={isComplexQuery} onChange={(e) => setIsComplexQuery(e.target.checked)} className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500" />
                                  <span className="text-[11px] text-slate-400 font-semibold">Análisis profundo (ThinkingLevel.HIGH)</span>
                              </label>
                          </div>
                          <div className="flex gap-2">
                              <input 
                                  type="text" 
                                  value={aiPrompt}
                                  onChange={(e) => setAiPrompt(e.target.value)}
                                  placeholder="Ej: ¿Qué pasan en TN a la noche?" 
                                  className="flex-grow bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                              />
                              <button disabled={isAiLoading || !aiPrompt.trim()} type="submit" className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold text-sm transition-all shadow-md">
                                  <i className="fa-solid fa-paper-plane"></i>
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* IPTV Playlist Import Modal */}
      {isIptvModalOpen && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-purple-500/30 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex justify-between items-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                              <i className="fa-solid fa-cloud-arrow-down text-white text-xs"></i>
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-slate-100">Importar Lista IPTV (.m3u)</h3>
                              <p className="text-[10px] text-slate-400">Expandí tu grilla de transmisiones móviles</p>
                          </div>
                      </div>
                      <button onClick={() => setIsIptvModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                          <i className="fa-solid fa-times"></i>
                      </button>
                  </div>

                  {/* Modal Body */}
                  <form onSubmit={handleImportIptv} className="flex flex-col flex-grow overflow-hidden">
                      <div className="p-5 flex-grow overflow-y-auto space-y-4">
                           {/* Quick Presets Selection in Modal */}
                           <div className="bg-purple-950/25 border border-purple-900/40 rounded-xl p-3.5 space-y-2.5">
                               <span className="flex items-center gap-1.5 text-xs text-purple-200 font-bold">
                                   <i className="fa-solid fa-wand-magic-sparkles text-purple-400"></i>
                                   Preajustes / Listas Rápidas de Argentina:
                               </span>
                               <div className="flex flex-wrap gap-2">
                                   <button 
                                       type="button" 
                                       onClick={loadDemoPlaylist} 
                                       className="px-2.5 py-1 bg-slate-850 hover:bg-slate-750 text-slate-200 text-[10px] font-semibold rounded border border-slate-750 transition-all flex items-center gap-1"
                                   >
                                       <i className="fa-solid fa-play text-sky-400"></i>Demo Local
                                   </button>
                                   {PRESET_LISTS.map((preset) => (
                                       <button 
                                           key={`modal-preset-${preset.name}`}
                                           type="button" 
                                           onClick={() => {
                                               setIptvName(preset.name);
                                               setIptvUrl(preset.url);
                                               setIptvRawText('');
                                               showToast(`Rellenado con: ${preset.name}`);
                                           }} 
                                           className="px-2.5 py-1 bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 font-semibold rounded text-[10px] border border-purple-500/25 transition-all flex items-center gap-1"
                                       >
                                           <i className="fa-solid fa-cloud-arrow-down text-purple-400"></i>
                                           {preset.name.replace("Argentina ", "")}
                                       </button>
                                   ))}
                               </div>
                           </div>

                          {/* Playlist Name Input */}
                          <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre de la Lista</label>
                              <input 
                                  type="text" 
                                  required
                                  value={iptvName}
                                  onChange={(e) => setIptvName(e.target.value)}
                                  placeholder="Ej: Argentina Deportes, Mi Lista Local, etc." 
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                              />
                          </div>

                          {/* Playlist URL Input */}
                          {/* Segmented Import Method Tab Selector */}
                          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850/60">
                              <button 
                                  type="button"
                                  onClick={() => {
                                      setIptvImportTab('file');
                                      setIptvUrl('');
                                  }}
                                  className={cn(
                                      "flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                                      iptvImportTab === 'file' 
                                          ? "bg-purple-600 text-white shadow" 
                                          : "text-slate-400 hover:text-slate-200"
                                  )}
                              >
                                  <i className="fa-solid fa-file-arrow-up text-[10px]"></i>
                                  Subir Archivo
                              </button>
                              <button 
                                  type="button"
                                  onClick={() => {
                                      setIptvImportTab('url');
                                      setIptvRawText('');
                                      setUploadedFileName('');
                                  }}
                                  className={cn(
                                      "flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                                      iptvImportTab === 'url' 
                                          ? "bg-purple-600 text-white shadow" 
                                          : "text-slate-400 hover:text-slate-200"
                                  )}
                              >
                                  <i className="fa-solid fa-link text-[10px]"></i>
                                  Enlace URL
                              </button>
                              <button 
                                  type="button"
                                  onClick={() => {
                                      setIptvImportTab('raw');
                                      setIptvUrl('');
                                      setUploadedFileName('');
                                  }}
                                  className={cn(
                                      "flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                                      iptvImportTab === 'raw' 
                                          ? "bg-purple-600 text-white shadow" 
                                          : "text-slate-400 hover:text-slate-200"
                                  )}
                              >
                                  <i className="fa-solid fa-code text-[10px]"></i>
                                  Pegar M3U
                              </button>
                          </div>

                          {/* Dynamic Tab Content: File Dropzone */}
                          {iptvImportTab === 'file' && (
                              <div className="space-y-2">
                                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Cargar Lista (.m3u, .m3u8, .txt)</label>
                                  
                                  {uploadedFileName ? (
                                      <div className="border border-emerald-500/35 bg-emerald-500/5 rounded-xl p-4 flex items-center justify-between animate-in fade-in duration-200">
                                          <div className="flex items-center gap-3 min-w-0">
                                              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                                                  <i className="fa-solid fa-file-video text-lg"></i>
                                              </div>
                                              <div className="min-w-0">
                                                  <span className="text-xs font-bold text-slate-200 block truncate max-w-[280px]">{uploadedFileName}</span>
                                                  <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider block">Lista cargada localmente</span>
                                              </div>
                                          </div>
                                          <button 
                                              type="button" 
                                              onClick={() => { 
                                                  setUploadedFileName(''); 
                                                  setIptvRawText(''); 
                                                  showToast("Archivo removido");
                                              }} 
                                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition-all shrink-0"
                                              title="Remover archivo"
                                          >
                                              <i className="fa-solid fa-trash-can text-xs"></i>
                                          </button>
                                      </div>
                                  ) : (
                                      <div 
                                          onDragOver={(e) => {
                                              e.preventDefault();
                                              setIsDragging(true);
                                          }}
                                          onDragLeave={() => setIsDragging(false)}
                                          onDrop={(e) => {
                                              e.preventDefault();
                                              setIsDragging(false);
                                              if (e.dataTransfer.files?.[0]) {
                                                  handleFileLoad(e.dataTransfer.files[0]);
                                              }
                                          }}
                                          onClick={() => {
                                              const fileInput = document.getElementById('iptv-file-input');
                                              if (fileInput) fileInput.click();
                                          }}
                                          className={cn(
                                              "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer group flex flex-col items-center justify-center gap-2 transition-all duration-200 min-h-[140px]",
                                              isDragging 
                                                  ? "border-purple-500 bg-purple-500/10 scale-[0.99]" 
                                                  : "border-slate-800 bg-slate-950/40 hover:border-purple-500/40 hover:bg-slate-950/80"
                                          )}
                                      >
                                          <input 
                                              id="iptv-file-input"
                                              type="file" 
                                              accept=".m3u,.m3u8,.txt" 
                                              className="hidden" 
                                              onChange={(e) => { 
                                                  if (e.target.files?.[0]) handleFileLoad(e.target.files[0]); 
                                              }} 
                                          />
                                          <div className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-purple-400 group-hover:scale-110 group-hover:bg-purple-950/20 transition-all duration-200 shadow-inner">
                                              <i className="fa-solid fa-file-arrow-up text-lg"></i>
                                          </div>
                                          <div className="space-y-0.5">
                                              <span className="text-xs font-bold text-slate-300 block">Arrastrá tu archivo aquí</span>
                                              <span className="text-[10px] text-slate-500 font-semibold block">o hacé clic para explorar carpetas</span>
                                          </div>
                                          <span className="text-[8px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono font-bold tracking-wider">
                                              SOPORTA .M3U / .M3U8 / .TXT
                                          </span>
                                      </div>
                                  )}
                              </div>
                          )}

                          {/* Dynamic Tab Content: URL Input */}
                          {iptvImportTab === 'url' && (
                              <div className="animate-in fade-in duration-200">
                                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">URL de la Lista (M3U)</label>
                                  <div className="relative">
                                      <input 
                                          type="url" 
                                          value={iptvUrl}
                                          onChange={(e) => {
                                              setIptvUrl(e.target.value);
                                              if(e.target.value) setIptvRawText('');
                                          }}
                                          required={iptvImportTab === 'url'}
                                          placeholder="https://example.com/lista-canales.m3u" 
                                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                                      />
                                      <i className="fa-solid fa-link absolute left-4 top-3.5 text-slate-600 text-xs"></i>
                                  </div>
                                  <p className="text-[10px] text-slate-500 mt-1">El servidor actuará de proxy seguro para saltear bloqueos de seguridad de CORS.</p>
                              </div>
                          )}

                          {/* Dynamic Tab Content: Raw Code Paste Area */}
                          {iptvImportTab === 'raw' && (
                              <div className="animate-in fade-in duration-200">
                                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Código M3U Formateado</label>
                                  <textarea 
                                      value={iptvRawText}
                                      onChange={(e) => {
                                          setIptvRawText(e.target.value);
                                          if(e.target.value) setIptvUrl('');
                                      }}
                                      required={iptvImportTab === 'raw'}
                                      rows={6}
                                      placeholder={`#EXTM3U\n#EXTINF:-1 tvg-logo="https://..." group-title="Aire",Canal Ejemplo\nhttps://example.com/live.m3u8`} 
                                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-mono text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                                  />
                              </div>
                          )}
                      </div>

                      {/* Modal Footer Controls */}
                      <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-3">
                          <button 
                              type="button" 
                              onClick={() => setIsIptvModalOpen(false)}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                          >
                              Cancelar
                          </button>
                          <button 
                              type="submit" 
                              disabled={isIptvLoading || (!iptvUrl.trim() && !iptvRawText.trim()) || !iptvName.trim()}
                              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-2"
                          >
                              {isIptvLoading ? (
                                  <>
                                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                                      <span>Procesando...</span>
                                  </>
                              ) : (
                                  <>
                                      <i className="fa-solid fa-cloud-arrow-down"></i>
                                      <span>Importar Lista</span>
                                  </>
                              )}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Extended EPG Program Details Modal */}
      {selectedEpgProgram && (
          <EpgProgramDetailModal 
              isOpen={!!selectedEpgProgram}
              onClose={() => setSelectedEpgProgram(null)}
              channel={selectedEpgProgram.channel}
              idx={selectedEpgProgram.idx}
              onPlayChannel={selectChannel}
          />
      )}

      {/* Toast System */}
      {toastMessage && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 border border-slate-800 text-sky-400 text-xs font-semibold rounded-xl shadow-2xl transition-all z-50 flex items-center gap-2 animate-bounce">
              <i className="fa-solid fa-circle-info text-sky-500"></i> {toastMessage}
          </div>
      )}
    </>
  );
}
