import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { User } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

interface AuthenticatedRequest extends Request {
  user?: User;
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Inicializar Inteligencia Artificial (Gemini)
const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

app.use(cors());
app.use(express.json());

const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) return res.status(401).json({ error: "Invalid token" });
  req.user = user;
  next();
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/risks", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("risks")
      .select("*, companies(name)")
      .order("risk_level", { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/risks/:id", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("risks")
      .select("*, companies(name)")
      .eq("id", req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/risks", authenticate, async (req, res) => {
  try {
    const payload = { ...req.body, owner_id: req.user.id };
    const { data, error } = await supabase.from("risks").insert(payload).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/risks/:id", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("risks")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/risks/:id", authenticate, async (req, res) => {
  try {
    const { error } = await supabase.from("risks").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/actions", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("actions")
      .select("*, risks(name)")
      .order("due_date", { ascending: true, nullsFirst: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/actions", authenticate, async (req, res) => {
  try {
    const payload = { ...req.body, owner_id: req.user.id };
    const { data, error } = await supabase.from("actions").insert(payload).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/actions/:id", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("actions")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/actions/:id", authenticate, async (req, res) => {
  try {
    const { error } = await supabase.from("actions").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/companies", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/companies", authenticate, async (req, res) => {
  try {
    const payload = { ...req.body, owner_id: req.user.id };
    const { data, error } = await supabase.from("companies").insert(payload).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/evidences", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("evidences")
      .select("*, risks(name), actions(description)")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/alerts", authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard/stats", authenticate, async (_req, res) => {
  try {
    const [{ data: risks }, { data: actions }, { data: evidences }] = await Promise.all([
      supabase.from("risks").select("id, risk_level, status"),
      supabase.from("actions").select("id, status, due_date"),
      supabase.from("evidences").select("id"),
    ]);
    
    const score = risks?.length
      ? Math.round((risks.reduce((sum, r) => sum + r.risk_level, 0) / risks.length) * 10) / 10
      : 0;
    
    res.json({
      score,
      totalRisks: risks?.length || 0,
      activeRisks: risks?.filter(r => r.status === "active").length || 0,
      totalActions: actions?.length || 0,
      completedActions: actions?.filter(a => a.status === "completed").length || 0,
      totalEvidences: evidences?.length || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai/predict-risks", authenticate, async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ error: "La API Key de Gemini (GEMINI_API_KEY) no está configurada en el servidor (.env)." });
    }
    
    const { companyId } = req.body;
    
    let query = supabase.from("risks").select("name, type, risk_level, status, description");
    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    
    const { data: risks, error } = await query;
    if (error) throw error;
    
    if (!risks || risks.length === 0) {
      return res.json({ prediction: "No hay riesgos registrados en esta empresa para analizar." });
    }
    
    const prompt = `
      Eres un consultor experto en gestión de riesgos corporativos, con conocimiento en múltiples estándares y normativas (ISO 27001, ISO 31000, SG-SST, entre otros).
      Analiza la siguiente lista de riesgos extraída de la base de datos de una organización y proporciona:
      1. Un resumen ejecutivo del nivel de amenaza actual (máximo 3 líneas).
      2. Los 3 riesgos más críticos o urgentes a mitigar enfocándote en los de nivel de riesgo ('risk_level') más alto.
      3. Sugerencias de acciones correctivas inmediatas y medidas preventivas.
      
      Lista de Riesgos:
      ${JSON.stringify(risks, null, 2)}
      
      Importante: Responde en formato Markdown limpio. Evita repetir literalmente el JSON en la respuesta. Usa encabezados, listas y negritas para facilitar la lectura. No uses etiquetas HTML.
    `;
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    res.json({ prediction: text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`API REST corriendo en http://localhost:${PORT}`);
  console.log("Endpoints disponibles:");
  console.log("  GET  /api/health");
  console.log("  GET  /api/risks");
  console.log("  POST /api/risks");
  console.log("  PUT  /api/risks/:id");
  console.log("  DEL  /api/risks/:id");
  console.log("  GET  /api/actions");
  console.log("  POST /api/actions");
  console.log("  PUT  /api/actions/:id");
  console.log("  DEL  /api/actions/:id");
  console.log("  GET  /api/companies");
  console.log("  POST /api/companies");
  console.log("  GET  /api/evidences");
  console.log("  GET  /api/alerts");
  console.log("  GET  /api/dashboard/stats");
  console.log("  POST /api/ai/predict-risks");
});

export default app;
