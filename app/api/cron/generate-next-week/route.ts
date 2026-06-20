import { NextResponse } from "next/server";

import { generateAndStoreNextWeeklyPlan } from "@/lib/weekly-plan-generation";

function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const userAgent = request.headers.get("user-agent") ?? "";

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return userAgent.includes("vercel-cron/1.0");
}

function getAucklandCronWindow() {
  const formatter = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    weekday: values.weekday,
    hour: values.hour,
    minute: values.minute
  };
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  const cronWindow = getAucklandCronWindow();

  if (cronWindow.weekday !== "Fri" || cronWindow.hour !== "00") {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Outside Friday midnight Pacific/Auckland execution hour.",
      cronWindow
    });
  }

  try {
    const result = await generateAndStoreNextWeeklyPlan();

    return NextResponse.json({
      ok: true,
      skipped: false,
      ...result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate the next weekly plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
