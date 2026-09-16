import { NextRequest } from "next/server";
import { readDashboardState, isOneDriveConfigured, writeDashboardState } from "@/lib/onedrive/graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOneDriveConfigured()) return Response.json({ configured: false, state: null });
  try {
    return Response.json({ configured: true, state: await readDashboardState() });
  } catch (error) {
    console.error("OneDrive read failed", error);
    return Response.json({ configured: true, error: "تعذر قراءة ملف OneDrive" }, { status: 502 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isOneDriveConfigured()) return Response.json({ error: "OneDrive is not configured" }, { status: 503 });
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 8_500_000) return Response.json({ error: "Payload too large" }, { status: 413 });
  try {
    const state = await request.json();
    await writeDashboardState(state);
    return Response.json({ ok: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error("OneDrive write failed", error);
    return Response.json({ error: "تعذر حفظ البيانات في OneDrive" }, { status: 502 });
  }
}
