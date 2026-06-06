import { NextResponse } from "next/server";

import type { ParsedOrderHistoryPayload } from "@/lib/order-import";
import { createClient } from "@/lib/supabase/server";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";
const AI_GATEWAY_MODEL = "openai/gpt-4o-mini";

function getMimeType(file: File) {
  if (file.type) return file.type;
  if (file.name.toLowerCase().endsWith(".pdf")) return "application/pdf";
  if (file.name.toLowerCase().endsWith(".png")) return "image/png";
  if (file.name.toLowerCase().endsWith(".jpg") || file.name.toLowerCase().endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function buildSchema() {
  return {
    type: "json_schema",
    name: "order_history_import",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["source_name", "summary", "confidence_notes", "items"],
      properties: {
        source_name: { type: "string" },
        summary: { type: "string" },
        confidence_notes: {
          type: "array",
          items: { type: "string" }
        },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["order_date", "item_name", "quantity", "unit", "category", "notes"],
            properties: {
              order_date: {
                anyOf: [{ type: "string" }, { type: "null" }]
              },
              item_name: { type: "string" },
              quantity: {
                anyOf: [{ type: "string" }, { type: "null" }]
              },
              unit: {
                anyOf: [{ type: "string" }, { type: "null" }]
              },
              category: {
                anyOf: [{ type: "string" }, { type: "null" }]
              },
              notes: {
                anyOf: [{ type: "string" }, { type: "null" }]
              }
            }
          }
        }
      }
    }
  };
}

function extractStructuredText(payload: any): string | null {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (Array.isArray(payload?.output)) {
    for (const item of payload.output) {
      if (!Array.isArray(item?.content)) continue;

      for (const content of item.content) {
        if (typeof content?.text === "string" && content.text.trim()) {
          return content.text.trim();
        }

        if (typeof content?.json === "string" && content.json.trim()) {
          return content.json.trim();
        }

        if (content?.json && typeof content.json === "object") {
          return JSON.stringify(content.json);
        }
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI_GATEWAY_API_KEY is not configured." }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing upload file." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File too large. Keep uploads below 10 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const mimeType = getMimeType(file);

  const response = await fetch(`${AI_GATEWAY_BASE_URL}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: AI_GATEWAY_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "Extract supermarket order history from the uploaded file. Return normalized JSON only. Use ISO dates when the order date is visible. Keep quantity and unit exactly as best inferred from the document. If uncertain, put the uncertainty into notes or confidence_notes rather than inventing values."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Parse this supermarket order PDF or screenshot into structured order history rows for a family grocery planner."
            },
            {
              type: "input_file",
              filename: file.name,
              file_data: `data:${mimeType};base64,${base64}`
            }
          ]
        }
      ],
      text: {
        format: buildSchema()
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ error: `AI Gateway parse failed: ${errorText}` }, { status: 500 });
  }

  const payload = await response.json();
  const outputText = extractStructuredText(payload);

  if (!outputText) {
    return NextResponse.json(
      {
        error: "Model returned no structured output.",
        response_shape: {
          has_output_text: typeof payload?.output_text === "string",
          output_items: Array.isArray(payload?.output) ? payload.output.length : 0
        }
      },
      { status: 500 }
    );
  }

  const parsed = JSON.parse(outputText) as ParsedOrderHistoryPayload;
  return NextResponse.json(parsed);
}
