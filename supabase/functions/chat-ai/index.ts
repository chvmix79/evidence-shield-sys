import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { message, messages, mode, company_id, empresa_id, direct_api_key } = body;

    let systemPrompt = "Eres un experto en gestión de riesgos y ciberseguridad.";
    let userPrompt = message || (messages && messages[messages.length - 1]?.content) || "";

    const finalCompanyId = company_id || empresa_id;

    if (mode === 'risk_analysis' && finalCompanyId) {
      const [{ data: company }, { data: risks }] = await Promise.all([
        supabaseClient.from('companies').select('name').eq('id', finalCompanyId).single(),
        supabaseClient.from('risks').select('name, risk_level, type, status').eq('company_id', finalCompanyId)
      ]);

      const risksSummary = (risks || []).map(r => 
        `- ${r.name} (Nivel: ${r.risk_level}, Tipo: ${r.type}, Estado: ${r.status})`
      ).join('\n');

      systemPrompt = `Eres un experto consultor de riesgos de la empresa ${company?.name || 'la organización'}. 
      A continuación se presenta la lista de riesgos actuales de la empresa. 
      Tu tarea es analizarlos, identificar patrones de peligro y dar 3 recomendaciones estratégicas y breves para mitigarlos.
      Responde de forma ejecutiva y profesional.
      
      RIESGOS:
      ${risksSummary || 'No hay riesgos registrados aún.'}`;
      
      userPrompt = "Realiza el análisis predictivo y dame recomendaciones.";
    } else if (mode === 'ciberseguridad' && finalCompanyId) {
      // Soporte para legado/compatibilidad
      const { data: empresa } = await supabaseClient
        .from('companies')
        .select('*')
        .eq('id', finalCompanyId)
        .single();
      
      systemPrompt = `Eres un Experto en Ciberseguridad para la empresa ${empresa?.name}. Da consejos prácticos.`;
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY') || direct_api_key;
    if (!apiKey) throw new Error("GEMINI_API_KEY no configurada.");

    const tryModels = ["gemini-2.0-flash", "gemini-1.5-flash"];
    
    let lastError = "";
    let aiText = "";

    for (const modelName of tryModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nUSER: ${userPrompt}` }] }],
            generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
          })
        });

        const aiData = await response.json();
        if (aiData.error) {
          lastError = aiData.error.message;
          continue;
        }

        aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (aiText) break;
      } catch (err) {
        lastError = err.message;
      }
    }

    if (!aiText) throw new Error(`Error de IA: ${lastError}`);

    return new Response(JSON.stringify({ reply: aiText, content: aiText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    });
  }
});
