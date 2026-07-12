import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

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
      channelId: "UC9Zf_V_itV_4mP_P_K_D_3g",
      online: true,
      logoBg: "bg-slate-950",
      logoHtml: `<div class="relative w-7 h-7 flex items-center justify-center bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-600 rounded-full"><div class="w-3 h-3 bg-slate-950 rounded-full"></div></div>`,
      currentShow: "Almorzando con Juana",
      region: "Nacional (CABA)",
      viewerCount: 22100
  },
  {
      id: "elnueve",
      name: "El Nueve",
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
      channelId: "UCj6PcyIvBYnX20nJdx9E9GA",
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

export default function App() {
  const [channels, setChannels] = useState(CHANNELS_DATA);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
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

  useEffect(() => {
    const saved = localStorage.getItem('tda_favs');
    if (saved) setFavorites(JSON.parse(saved));
    
    const interval = setInterval(() => {
        setTimeString(new Date().toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const selectChannel = async (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel) return;

    setActiveChannelId(channelId);
    setPlayerState('loading');
    setActiveVideoId(null);
    setApiRequestsCount(c => c + 1);
    addLog(`GET /api/canales/${channel.id} - Petición HTTP recibida.`);

    let isCacheHit = false;
    let data;
    const now = Date.now();
    const cachedItem = serverCache.current[channel.id];

    try {
        if (cachedItem && (now - cachedItem.timestamp < CACHE_LIFETIME)) {
            isCacheHit = true;
            setCacheHitsCount(c => c + 1);
            data = cachedItem.data;
            addLog(`[CACHÉ HIT] Datos retornados para ${channel.id}. Expira en ${Math.round((CACHE_LIFETIME - (now - cachedItem.timestamp))/1000)}s.`);
        } else {
            addLog(`[CACHÉ MISS] Solicitando API directo para canal ${channel.id}.`);
            const res = await axios.get(`/api/canales/${channel.id}`);
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
      const activeChannel = channels.find(c => c.id === activeChannelId);
      const shareUrl = `${window.location.origin}/share/channel/${activeChannelId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
          showToast(`¡Enlace copiado! (${activeChannel?.name})`);
          addLog(`[SHARE API] Compartido canal ${activeChannelId}. Enlace de invitación generado.`);
      }).catch(() => {
          showToast("Error al copiar enlace");
      });
  };

  let filteredChannels = channels;
  if (selectedCategory === 'favoritos') {
      filteredChannels = channels.filter(c => favorites.includes(c.id));
  } else if (selectedCategory !== 'all') {
      filteredChannels = channels.filter(c => c.category === selectedCategory);
  }
  if (searchQuery) {
      filteredChannels = filteredChannels.filter(c => 
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          c.region.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }

  const activeChannel = channels.find(c => c.id === activeChannelId);
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
                                      : "Elegí cualquier señal de la grilla inferior para iniciar la simulación de streaming en vivo."}
                              </p>
                              {activeChannel && (
                                  <button onClick={() => selectChannel(activeChannel.id)} className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md inline-flex items-center gap-2">
                                      <i className="fa-solid fa-rotate-right"></i> Reintentar Conexión
                                  </button>
                              )}
                          </div>
                      </div>

                      {/* YouTube Live Player Container */}
                      <div id="player-iframe-container" className={cn("absolute inset-0 w-full h-full transition-opacity duration-300", playerState === 'online' ? 'opacity-100 z-20 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none')}>
                          {activeVideoId && playerState === 'online' && (
                              <iframe 
                                  key={activeVideoId}
                                  src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&showinfo=0`}
                                  className="w-full h-full absolute top-0 left-0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title="Reproductor de TV en Vivo"
                              ></iframe>
                          )}
                      </div>

                      {/* Loading Spinner */}
                      <div className={cn("absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-30", playerState === 'loading' ? 'flex' : 'hidden')}>
                          <div className="relative w-12 h-12">
                              <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                              <div className="absolute inset-0 rounded-full border-4 border-t-sky-500 animate-spin"></div>
                          </div>
                          <p className="text-xs text-sky-400 mt-4 tracking-widest font-mono">RESOLVIENDO STREAM CACHÉ...</p>
                      </div>
                  </div>

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
                  <button onClick={() => setSelectedCategory('favoritos')} className={cn("px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all", selectedCategory === 'favoritos' ? "bg-sky-500 text-white shadow-md" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200")}>
                      <i className="fa-solid fa-star mr-1.5 text-yellow-500"></i>Favoritos 
                      {favorites.length > 0 && <span className="bg-slate-800 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full ml-1">{favorites.length}</span>}
                  </button>
              </div>

              {/* Grid of Channels */}
              <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Grilla de Emisores</h3>
                  
                  {filteredChannels.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {filteredChannels.map(channel => {
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
                      <div className="py-12 text-center">
                          <div className="text-slate-600 text-4xl mb-3"><i className="fa-solid fa-magnifying-glass"></i></div>
                          <p className="text-sm text-slate-400">No encontramos ningún canal que coincida con tu búsqueda.</p>
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
                      {channels.slice(0, 8).map((channel, idx) => (
                          <div key={`epg-${channel.id}`} className="flex items-center gap-3 p-2.5 bg-slate-950/50 rounded-xl border border-slate-850 hover:bg-slate-950 transition-colors">
                              <div className={`w-8 h-8 rounded-lg ${channel.logoBg} flex-shrink-0 flex items-center justify-center p-1 text-[8px]`} dangerouslySetInnerHTML={{ __html: channel.logoHtml }} />
                              <div className="flex-grow min-w-0">
                                  <div className="flex justify-between items-center mb-1 text-[11px]">
                                      <span className="font-bold text-slate-200 truncate">{channel.name}</span>
                                      <span className="text-sky-500 font-semibold font-mono text-[9px]">13:00 - 17:00</span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 truncate font-semibold mb-1.5">{channel.currentShow}</p>
                                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                      <div className="bg-gradient-to-r from-sky-500 to-blue-500 h-full rounded-full" style={{ width: `${10 + (idx * 7) % 80}%` }}></div>
                                  </div>
                              </div>
                          </div>
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

      {/* Toast System */}
      {toastMessage && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 border border-slate-800 text-sky-400 text-xs font-semibold rounded-xl shadow-2xl transition-all z-50 flex items-center gap-2 animate-bounce">
              <i className="fa-solid fa-circle-info text-sky-500"></i> {toastMessage}
          </div>
      )}
    </>
  );
}
