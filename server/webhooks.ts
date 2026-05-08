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

type WebhookEvent = {
  id: string;
  name: string;
  url: string;
  active: boolean;
  created_at: string;
};

type WebhookLog = {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  status: "success" | "failed";
  response_code: number | null;
  error_message: string | null;
  created_at: string;
};

async function getActiveWebhooks(): Promise<WebhookEvent[]> {
  const { data } = await supabase
    .from("webhooks")
    .select("*")
    .eq("active", true);
  return data || [];
}

async function logWebhookCall(
  webhookId: string,
  eventType: string,
  payload: any,
  status: "success" | "failed",
  responseCode: number | null,
  errorMessage: string | null
) {
  await supabase.from("webhook_logs").insert({
    webhook_id: webhookId,
    event_type: eventType,
    payload,
    status,
    response_code: responseCode,
    error_message: errorMessage,
  });
}

export async function triggerWebhook(
  eventType: string,
  payload: Record<string, any>
) {
  const webhooks = await getActiveWebhooks();
  
  const results = await Promise.allSettled(
    webhooks.map(async (webhook) => {
      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Event": eventType,
            "X-Webhook-Signature": generateSignature(payload),
          },
          body: JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            data: payload,
          }),
        });

        const success = response.ok;
        await logWebhookCall(
          webhook.id,
          eventType,
          payload,
          success ? "success" : "failed",
          response.status,
          success ? null : await response.text()
        );

        return { webhookId: webhook.id, success };
      } catch (error: any) {
        await logWebhookCall(
          webhook.id,
          eventType,
          payload,
          "failed",
          null,
          error.message
        );
        return { webhookId: webhook.id, success: false, error: error.message };
      }
    })
  );

  return results;
}

function generateSignature(payload: Record<string, any>): string {
  const secret = process.env.WEBHOOK_SECRET || "default-secret";
  const payloadString = JSON.stringify(payload);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(payloadString + secret);
  
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return hash.toString(16);
}

export async function onRiskCreated(payload: any) {
  return triggerWebhook("risk.created", payload);
}

export async function onRiskUpdated(payload: any) {
  return triggerWebhook("risk.updated", payload);
}

export async function onActionCompleted(payload: any) {
  return triggerWebhook("action.completed", payload);
}

export async function onActionOverdue(payload: any) {
  return triggerWebhook("action.overdue", payload);
}

export async function onCriticalRiskDetected(payload: any) {
  return triggerWebhook("risk.critical", payload);
}

export async function onEvidenceUploaded(payload: any) {
  return triggerWebhook("evidence.uploaded", payload);
}

if (require.main === module) {
  console.log("Webhook service initialized");
  console.log("Available functions:");
  console.log("  - onRiskCreated(payload)");
  console.log("  - onRiskUpdated(payload)");
  console.log("  - onActionCompleted(payload)");
  console.log("  - onActionOverdue(payload)");
  console.log("  - onCriticalRiskDetected(payload)");
  console.log("  - onEvidenceUploaded(payload)");
}

export default {
  triggerWebhook,
  onRiskCreated,
  onRiskUpdated,
  onActionCompleted,
  onActionOverdue,
  onCriticalRiskDetected,
  onEvidenceUploaded,
};
