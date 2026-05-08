import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

type EmailTemplate = {
  subject: string;
  body: string;
};

const templates: Record<string, EmailTemplate> = {
  "action_overdue": {
    subject: "🔴 Acción vencida - Evidence Shield Sys",
    body: `
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">Acción Vencida</h2>
  <p>La siguiente acción ha vencido y requiere atención inmediata:</p>
  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p><strong>Descripción:</strong> {{action_description}}</p>
    <p><strong>Responsable:</strong> {{responsible}}</p>
    <p><strong>Fecha límite:</strong> {{due_date}}</p>
    <p><strong>Riesgo asociado:</strong> {{risk_name}}</p>
  </div>
  <p>Por favor, tome acción inmediata.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="color: #6b7280; font-size: 12px;">Evidence Shield Sys - Sistema de Gestión de Riesgos</p>
</body>
</html>
    `.trim(),
  },
  "critical_risk": {
    subject: "⚠️ Riesgo Crítico detectado - Evidence Shield Sys",
    body: `
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #dc2626;">Alerta de Riesgo Crítico</h2>
  <p>Se ha detectado un nuevo riesgo con nivel crítico que requiere atención:</p>
  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p><strong>Nombre:</strong> {{risk_name}}</p>
    <p><strong>Tipo:</strong> {{risk_type}}</p>
    <p><strong>Nivel:</strong> {{risk_level}}</p>
    <p><strong>Descripción:</strong> {{risk_description}}</p>
  </div>
  <p>Por favor, revise este riesgo a la brevedad.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="color: #6b7280; font-size: 12px;">Evidence Shield Sys - Sistema de Gestión de Riesgos</p>
</body>
</html>
    `.trim(),
  },
  "action_completed": {
    subject: "✅ Acción completada - Evidence Shield Sys",
    body: `
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #16a34a;">Acción Completada</h2>
  <p>Una acción ha sido marcada como completada:</p>
  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p><strong>Descripción:</strong> {{action_description}}</p>
    <p><strong>Responsable:</strong> {{responsible}}</p>
    <p><strong>Riesgo asociado:</strong> {{risk_name}}</p>
  </div>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="color: #6b7280; font-size: 12px;">Evidence Shield Sys - Sistema de Gestión de Riesgos</p>
</body>
</html>
    `.trim(),
  },
  "missing_evidence": {
    subject: "📄 Evidencia faltante - Evidence Shield Sys",
    body: `
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #ea580c;">Evidencia Requerida</h2>
  <p>Se requiere evidencia para el siguiente riesgo:</p>
  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p><strong>Riesgo:</strong> {{risk_name}}</p>
    <p><strong>Acción:</strong> {{action_description}}</p>
  </div>
  <p>Por favor, sube la evidencia correspondiente.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="color: #6b7280; font-size: 12px;">Evidence Shield Sys - Sistema de Gestión de Riesgos</p>
</body>
</html>
    `.trim(),
  },
  "weekly_summary": {
    subject: "📊 Resumen semanal - Evidence Shield Sys",
    body: `
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Resumen Semanal de Riesgos</h2>
  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p><strong>Total riesgos:</strong> {{total_risks}}</p>
    <p><strong>Riesgos activos:</strong> {{active_risks}}</p>
    <p><strong>Riesgos críticos:</strong> {{critical_risks}}</p>
    <p><strong>Acciones completadas:</strong> {{completed_actions}}</p>
    <p><strong>Acciones pendientes:</strong> {{pending_actions}}</p>
  </div>
  <p>Acceda al sistema para más detalles.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="color: #6b7280; font-size: 12px;">Evidence Shield Sys - Sistema de Gestión de Riesgos</p>
</body>
</html>
    `.trim(),
  },
};

function replacePlaceholders(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

export async function sendEmail(
  to: string,
  templateKey: string,
  data: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const template = templates[templateKey];
  if (!template) {
    return { success: false, error: `Template ${templateKey} not found` };
  }

  const subject = replacePlaceholders(template.subject, data);
  const body = replacePlaceholders(template.body, data);

  console.log(`Sending email to: ${to}`);
  console.log(`Subject: ${subject}`);

  const emailProvider = process.env.EMAIL_PROVIDER || "console";
  
  if (emailProvider === "resend") {
    return await sendWithResend(to, subject, body);
  } else if (emailProvider === "sendgrid") {
    return await sendWithSendGrid(to, subject, body);
  } else {
    console.log("Email (development mode - not sent):");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body.substring(0, 200)}...`);
    return { success: true };
  }
}

async function sendWithResend(to: string, subject: string, body: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Evidence Shield <noreply@yourdomain.com>",
        to: [to],
        subject: subject,
        html: body,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function sendWithSendGrid(to: string, subject: string, body: string) {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (!sendgridApiKey) {
    return { success: false, error: "SENDGRID_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sendgridApiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.EMAIL_FROM || "noreply@yourdomain.com" },
        subject: subject,
        content: [{ type: "text/html", value: body }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function notifyActionOverdue(action: any, risk: any) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.user.id)
    .single();

  if (profile?.email) {
    return sendEmail(profile.email, "action_overdue", {
      action_description: action.description,
      responsible: action.responsible,
      due_date: action.due_date,
      risk_name: risk?.name || "N/A",
    });
  }
}

export async function notifyCriticalRisk(risk: any) {
  const { data: users } = await supabase
    .from("profiles")
    .select("email")
    .in("role", ["admin", "auditor"]);

  if (!users) return;

  const riskTypeLabels: Record<string, string> = {
    operational: "Operativo",
    legal: "Legal",
    financial: "Financiero",
    security: "Seguridad",
  };

  for (const user of users) {
    if (user.email) {
      await sendEmail(user.email, "critical_risk", {
        risk_name: risk.name,
        risk_type: riskTypeLabels[risk.type] || risk.type,
        risk_level: String(risk.risk_level),
        risk_description: risk.description || "Sin descripción",
      });
    }
  }
}

export async function notifyActionCompleted(action: any, risk: any) {
  const { data: users } = await supabase
    .from("profiles")
    .select("email")
    .in("role", ["admin", "auditor"]);

  if (!users) return;

  for (const user of users) {
    if (user.email) {
      await sendEmail(user.email, "action_completed", {
        action_description: action.description,
        responsible: action.responsible,
        risk_name: risk?.name || "N/A",
      });
    }
  }
}

export async function sendWeeklySummary() {
  const [{ data: risks }, { data: actions }] = await Promise.all([
    supabase.from("risks").select("id, risk_level, status"),
    supabase.from("actions").select("id, status"),
  ]);

  const { data: users } = await supabase
    .from("profiles")
    .select("email");

  if (!users) return;

  for (const user of users) {
    if (user.email) {
      await sendEmail(user.email, "weekly_summary", {
        total_risks: String(risks?.length || 0),
        active_risks: String(risks?.filter(r => r.status === "active").length || 0),
        critical_risks: String(risks?.filter(r => r.risk_level >= 17).length || 0),
        completed_actions: String(actions?.filter(a => a.status === "completed").length || 0),
        pending_actions: String(actions?.filter(a => a.status !== "completed").length || 0),
      });
    }
  }
}

if (require.main === module) {
  console.log("Email notification service initialized");
  console.log("Available functions:");
  console.log("  - sendEmail(to, templateKey, data)");
  console.log("  - notifyActionOverdue(action, risk)");
  console.log("  - notifyCriticalRisk(risk)");
  console.log("  - notifyActionCompleted(action, risk)");
  console.log("  - sendWeeklySummary()");
}

export default {
  sendEmail,
  notifyActionOverdue,
  notifyCriticalRisk,
  notifyActionCompleted,
  sendWeeklySummary,
};
