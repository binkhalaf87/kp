import { list, put } from "@vercel/blob";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(["csv", "xls", "xlsx"]);

function safeFileName(value: string): string {
  return value.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/-+/g, "-").slice(-140);
}

export async function POST(request: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Cloud file storage is not configured" }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const fileHash = String(form.get("fileHash") || "").trim();
    const reportType = String(form.get("reportType") || "UNKNOWN");
    const periodStart = String(form.get("periodStart") || "") || null;
    const periodEnd = String(form.get("periodEnd") || "") || null;

    if (!(file instanceof File) || !fileHash) {
      return Response.json({ error: "Missing report file or hash" }, { status: 400 });
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.has(extension) || file.size > MAX_FILE_BYTES) {
      return Response.json({ error: "Unsupported file or file is too large" }, { status: 400 });
    }

    const prefix = `rewaa/${fileHash}-`;
    const existing = await list({
      prefix,
      limit: 1,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    if (existing.blobs.length > 0) {
      return Response.json({ ok: true, duplicate: true, pathname: existing.blobs[0].pathname });
    }

    const blob = await put(`rewaa/${fileHash}-${safeFileName(file.name)}`, file, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return Response.json({
      ok: true,
      duplicate: false,
      pathname: blob.pathname,
      reportType,
      periodStart,
      periodEnd,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cloud report upload failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "تعذر حفظ ملف التقرير سحابيًا" }, { status: 502 });
  }
}
