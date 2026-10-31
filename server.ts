import express from "express";
import path from "path";
import axios from "axios";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

interface CacheEntry {
  data: {
    status: 'online' | 'offline';
    videoId: string | null;
    title: string | null;
  };
  timestamp: number;
}

const CACHE_DURATION_MS = 5 * 60 * 1000;
// Expected broadcaster names: verify every configured YouTube channel before advertising a live signal.
// A verified channel lookup is cached, and unknown/mismatched channels remain unavailable.
const CHANNEL_NAMES: Record<string, string[]> = {
  "tv-publica": ["tv pública", "televisión pública", "tv publica"],
  "eltrece": ["eltrece", "el trece"],
  "elnueve": ["elnueve", "el nueve", "canal 9"],
  "americatv": ["américa tv", "america tv", "america televisión"],
  "telefe": ["telefe"],
  "tn": ["tn", "todo noticias"],
  "c5n": ["c5n"],
  "ln-mas": ["la nacion", "la nación", "ln+", "ln mas"],
  "a24": ["a24", "américa 24", "america 24"],
  "cronica": ["crónica", "cronica"],
  "canal26": ["canal 26", "canal26"],
  "ip-noticias": ["ip noticias", "argentina 12"],
  "el-tres-rosario": ["el tres", "canal 3 rosario"],
  "el-doce-cordoba": ["el doce", "canal 12 córdoba", "eldoce"],
  "canal-9-mendoza": ["canal 9 mendoza", "nueve mendoza", "televida"],
  "canal-10-cordoba": ["canal 10", "cba24n", "universidad nacional de córdoba"],
  "chaco-tv": ["chaco tv", "chaco televisión"],
  "canal-7-chubut": ["canal 7 chubut", "chubut tv"]
};
const verifiedChannelCache = new Map<string, { ok: boolean; at: number }>();
const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
 // 5 minutes
const channelCache: Record<string, CacheEntry> = {};

// Channel mapping ID -> YouTube Channel ID
const CHANNELS: Record<string, string> = {
  // Principales
  "tv-publica": "UC7Z_40wZasf_7_bgnM2vVAg",
  "eltrece": "UC0DM_mHV2u6dj8ig51GkQwg",
  "elnueve": "UCZ496WYLWnyUv2I08vKvxGA",
  "americatv": "UC_83bfeC_zZNSvN287B9xOQ",
  "telefe": "UCzSQKUenBCK-XkU_VldC0BQ", // Generic fallback if needed
  
  // Noticias
  "tn": "UCj6PcyLvpnIRT_2W_mwa9Aw",
  "c5n": "UCuY095izSIn7wVbV6vW6u6Q",
  "ln-mas": "UC7w_Z0_XgZf8H_SgRbcHIsA",
  "a24": "UC1E_4gK7_rT_T_8V06qA4bA",
  "cronica": "UCv20mX_UuLw7EwP8E48aWww",
  "canal26": "UCdtI7_6Gz_f8-G_h8uBv0pA",
  "ip-noticias": "UC8M3O_01hGId8bO0pA_XNlg",
  
  // Interior
  "el-tres-rosario": "UCjZ62N3XgV8z70I_gU6P_XQ",
  "el-doce-cordoba": "UCg-T9w_r2Bv2R8Xw5Nf_EAg",
  "canal-9-mendoza": "UCnO60jB1hO_3p6ZcW7-qCGA",
  "canal-10-cordoba": "UCx7Wz0V4D7b_8eLwXvN6Z_g",
  "chaco-tv": "UCJ3XwXf8_hK8a7lVb270Eog",
  "canal-7-chubut": "UC-Q6zM_AihgP2Kx6_vS30zA"
};

// Initialize Gemini
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
} catch (error) {
  console.warn("Failed to initialize Gemini:", error);
}

export async function startServer(serverless = false) {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // AI Endpoint for TV analysis and questions
  app.post("/api/ai/ask", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({ error: "Gemini no está configurado (Falta GEMINI_API_KEY)" });
      }

      const { prompt, isComplex } = req.body;
      
      const model = isComplex ? "gemini-3.1-pro-preview" : "gemini-3.5-flash";
      const config: any = {
        systemInstruction: "Sos un asistente experto en televisión argentina (TDA y canales de cable). Ayudás a los usuarios a encontrar programas, responder preguntas sobre programación, figuras de TV, periodistas y analizar el contenido televisivo de Argentina. Respondé de manera concisa y amigable en español rioplatense (usando vos)."
      };

      if (isComplex) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config
      });

      res.json({ answer: response.text });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Ocurrió un error al procesar tu consulta con IA." });
    }
  });

  // API Routes
  app.get("/api/canales/:id", async (req, res) => {
    const channelId = req.params.id;
    const ytChannelId = CHANNELS[channelId];
    
    if (!ytChannelId) {
      return res.status(404).json({ error: "Canal no encontrado" });
    }

    const refresh = req.query.refresh === 'true';
    const now = Date.now();
    const cached = channelCache[channelId];

    if (!refresh && cached && (now - cached.timestamp < CACHE_DURATION_MS)) {
      return res.json(cached.data);
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey || apiKey === 'MY_YOUTUBE_API_KEY') {
      return res.status(503).json({
        status: "unavailable",
        videoId: null,
        title: null,
        error: "YOUTUBE_API_KEY no configurada; no se puede verificar la transmisión en vivo.",
        channelUrl: `https://www.youtube.com/channel/${ytChannelId}/live`
      });
    }

    try {
      const check = verifiedChannelCache.get(channelId);
      if (!check || now - check.at > CACHE_DURATION_MS) {
        const channelInfo = await axios.get("https://www.googleapis.com/youtube/v3/channels", {
          params: { part: "snippet", id: ytChannelId, key: apiKey, fields: "items(snippet/title)" },
          timeout: 8000
        });
        const actualName = normalized(channelInfo.data.items?.[0]?.snippet?.title || "");
        const ok = Boolean(actualName && CHANNEL_NAMES[channelId]?.some(name => actualName.includes(normalized(name))));
        verifiedChannelCache.set(channelId, { ok, at: now });
      }
      if (!verifiedChannelCache.get(channelId)?.ok) {
        return res.json({ status: "offline", videoId: null, title: null, reason: "El identificador de YouTube no corresponde a un canal verificado." });
      }
      // Search for active live streams on the channel
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          channelId: ytChannelId,
          eventType: 'live',
          type: 'video',
          key: apiKey,
          fields: 'items(id/videoId,snippet/title)',
          maxResults: 5
        }
      });

      const items = response.data.items;
      // Only YouTube API live search results are eligible; no fabricated fallback IDs.
      
      let resultData;
      if (items && items.length > 0) {
        resultData = {
          status: 'online',
          videoId: items[0].id.videoId,
          title: items[0].snippet.title
        };
      } else {
        resultData = {
          status: 'offline',
          videoId: null,
          title: null
        };
      }

      // Update cache
      channelCache[channelId] = {
        data: resultData as any,
        timestamp: now
      };

      res.json(resultData);
    } catch (error: any) {
      const statusCode = error.response?.status;
      
      if (statusCode !== 403 && statusCode !== 400) {
        console.error(`Error fetching YouTube API for ${channelId}:`, error.message);
      }
      
      // Fallback to cache if available, even if expired
      if (cached) {
        return res.json(cached.data);
      }
      

      res.json({
        status: 'error',
        videoId: null,
        title: null
      });
    }
  });
  
  // Endpoint to get all channels info
  app.get("/api/channels-list", (req, res) => {
    res.json(Object.keys(CHANNELS));
  });

  // Public IPTV playlists only. Deny private/reserved networks and unsafe redirects.
  app.get("/api/iptv/proxy", async (req, res) => {
    const requestedUrl = typeof req.query.url === "string" ? req.query.url : "";
    if (!requestedUrl) return res.status(400).json({ error: "Falta parámetro 'url'" });
    try {
      const dns = await import("node:dns/promises");
      const net = await import("node:net");
      const validate = async (raw: string) => {
        const parsed = new URL(raw);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Solo HTTP/HTTPS");
        if (parsed.username || parsed.password) throw new Error("URL con credenciales no permitida");
        const hostname = parsed.hostname.toLowerCase().replace(/\\.$/, "");
        if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) throw new Error("Host local no permitido");
        const addresses = net.isIP(hostname) ? [{ address: hostname }] : await dns.lookup(hostname, { all: true, verbatim: true });
        if (!addresses.length) throw new Error("Host sin resolución pública");
        for (const { address } of addresses) {
          const parts = address.split(".").map(Number);
          if (net.isIP(address) === 4 && (
            parts[0] === 0 || parts[0] === 10 || parts[0] === 127 || parts[0] >= 224 ||
            (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
            (parts[0] === 192 && parts[1] === 168) || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
            (parts[0] === 192 && parts[1] === 0) || (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19))
          )) throw new Error("Dirección IP no pública");
          if (net.isIP(address) === 6 && (
            address === "::1" || address === "::" || address.toLowerCase().startsWith("fc") ||
            address.toLowerCase().startsWith("fd") || /^fe[89ab]/i.test(address) || address.toLowerCase().startsWith("::ffff:")
          )) throw new Error("Dirección IP no pública");
        }
        return parsed.toString();
      };
      // Only allow maintained public playlist hosts. This also avoids DNS rebinding to private services.
      const allowedHosts = new Set(["iptv-org.github.io", "raw.githubusercontent.com", "gist.githubusercontent.com"]);
      let next = requestedUrl;
      for (let hop = 0; hop < 4; hop++) {
        const safe = await validate(next);
        if (!allowedHosts.has(new URL(safe).hostname.toLowerCase())) throw new Error("Fuente IPTV no autorizada para importación por URL; usá la opción Archivo");
        const upstream = await axios.get(safe, {
          responseType: "text", timeout: 9000, maxContentLength: 2_000_000,
          maxRedirects: 0, validateStatus: status => status >= 200 && status < 400
        });
        if (upstream.status >= 300) {
          if (!upstream.headers.location) throw new Error("Redirección sin destino");
          next = new URL(upstream.headers.location, safe).toString();
          continue;
        }
        const content = String(upstream.data);
        if (content.length > 2_000_000 || !content.trimStart().startsWith("#EXTM3U")) throw new Error("La respuesta no es una lista M3U válida");
        res.type("text/plain; charset=utf-8").send(content);
        return;
      }
      return res.status(502).json({ error: "Demasiadas redirecciones" });
    } catch (error: any) {
      console.warn("IPTV import failed:", error?.message);
      return res.status(422).json({ error: "No se pudo importar la lista: " + (error?.message || "origen no disponible") });
    }
  });

  // Vite middleware for development
  if (!serverless && process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!serverless) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  return app;
}

if (process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}
