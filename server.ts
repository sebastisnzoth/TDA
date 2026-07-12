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

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const channelCache: Record<string, CacheEntry> = {};

// Fallback video IDs for demo purposes when API quota is exceeded or key is invalid
const FALLBACK_VIDEOS: Record<string, string> = {
  "tv-publica": "eQhhPVzs6qM", // Reusing a working live for demo if needed
  "eltrece": "nndzeKDSjuc",
  "elnueve": "C1DhpJ07ZuE",
  "americatv": "Vh8xmLBJtR8",
  "telefe": "5ABLiIbQchA",
  "tn": "cb12KmMMDJA",
  "c5n": "xWG-47NFsTg",
  "ln-mas": "FEWZjXJ7M0c",
  "a24": "ArKbAx1K-2U",
  "cronica": "hw4uHyct4vg",
  "canal26": "cb12KmMMDJA",
  "ip-noticias": "cb12KmMMDJA",
  "el-tres-rosario": "cb12KmMMDJA",
  "el-doce-cordoba": "cb12KmMMDJA",
  "canal-9-mendoza": "cb12KmMMDJA",
  "canal-10-cordoba": "cb12KmMMDJA",
  "chaco-tv": "cb12KmMMDJA",
  "canal-7-chubut": "cb12KmMMDJA"
};

// Channel mapping ID -> YouTube Channel ID
const CHANNELS: Record<string, string> = {
  // Principales
  "tv-publica": "UC7Z_40wZasf_7_bgnM2vVAg",
  "eltrece": "UC9Zf_V_itV_4mP_P_K_D_3g",
  "elnueve": "UCZ496WYLWnyUv2I08vKvxGA",
  "americatv": "UC_83bfeC_zZNSvN287B9xOQ",
  "telefe": "UCzSQKUenBCK-XkU_VldC0BQ", // Generic fallback if needed
  
  // Noticias
  "tn": "UCj6PcyIvBYnX20nJdx9E9GA",
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

async function startServer() {
  const app = express();
  const PORT = 3000;

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
      console.warn(`YOUTUBE_API_KEY is not set or invalid. Returning fallback video for ${channelId}.`);
      const fallbackId = FALLBACK_VIDEOS[channelId];
      if (fallbackId) {
        return res.json({ status: "online", videoId: fallbackId, title: "En Vivo (Fallback Mode)" });
      }
      return res.json({ status: "error", videoId: null, title: null });
    }

    try {
      // Search for active live streams on the channel
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          channelId: ytChannelId,
          eventType: 'live',
          type: 'video',
          key: apiKey,
          fields: 'items(id/videoId,snippet/title)',
          maxResults: 1
        }
      });

      const items = response.data.items;
      
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
      
      // Fallback to demo videos if quota is exceeded (403) or bad request (400)
      if (statusCode === 403 || statusCode === 400) {
        const fallbackId = FALLBACK_VIDEOS[channelId];
        if (fallbackId) {
          return res.json({ status: "online", videoId: fallbackId, title: "En Vivo (Fallback Mode)" });
        }
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

  // Proxy endpoint to fetch external IPTV .m3u playlists without CORS issues
  app.get("/api/iptv/proxy", async (req, res) => {
    const url = req.query.url as string;
    if (!url) {
      return res.status(400).json({ error: "Falta parámetro 'url'" });
    }
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000 // 10s timeout
      });
      res.setHeader('Content-Type', 'text/plain');
      res.send(response.data);
    } catch (error: any) {
      console.error(`Error in IPTV proxy for ${url}:`, error.message);
      res.status(500).json({ error: `No se pudo descargar la lista de canales: ${error.message}` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
