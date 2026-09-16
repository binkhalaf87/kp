import "server-only";

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const STATE_SHEET = "Dashboard_State";
const CHUNK_SIZE = 30_000;

interface DriveItemReference {
  id: string;
  parentReference?: { driveId?: string };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function encodeSharingUrl(url: string): string {
  return `u!${Buffer.from(url, "utf8").toString("base64url")}`;
}

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: requireEnv("MICROSOFT_CLIENT_ID"),
    client_secret: requireEnv("MICROSOFT_CLIENT_SECRET"),
    refresh_token: requireEnv("MICROSOFT_REFRESH_TOKEN"),
    grant_type: "refresh_token",
    scope: "offline_access Files.ReadWrite User.Read",
  });
  const response = await fetch("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || "Microsoft token exchange failed");
  }
  return payload.access_token;
}

async function graphFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GRAPH_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Microsoft Graph ${response.status}: ${details.slice(0, 500)}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

async function getWorkbookContext() {
  const accessToken = await getAccessToken();
  const shareId = encodeSharingUrl(requireEnv("ONEDRIVE_WORKBOOK_SHARE_URL"));
  const item = await graphFetch<DriveItemReference>(accessToken, `/shares/${shareId}/driveItem?$select=id,parentReference`);
  const driveId = item.parentReference?.driveId;
  if (!driveId) throw new Error("The OneDrive share does not expose a drive id");
  const base = `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(item.id)}/workbook`;
  const session = await graphFetch<{ id: string }>(accessToken, `${base}/createSession`, {
    method: "POST",
    body: JSON.stringify({ persistChanges: true }),
  });
  return { accessToken, base, sessionId: session.id };
}

function workbookHeaders(sessionId: string): HeadersInit {
  return { "workbook-session-id": sessionId };
}

async function ensureStateSheet(accessToken: string, base: string, sessionId: string) {
  try {
    await graphFetch(accessToken, `${base}/worksheets/${encodeURIComponent(STATE_SHEET)}`, {
      headers: workbookHeaders(sessionId),
    });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Microsoft Graph 404")) throw error;
    await graphFetch(accessToken, `${base}/worksheets/add`, {
      method: "POST",
      headers: workbookHeaders(sessionId),
      body: JSON.stringify({ name: STATE_SHEET }),
    });
  }
}

export function isOneDriveConfigured(): boolean {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID &&
      process.env.MICROSOFT_CLIENT_SECRET &&
      process.env.MICROSOFT_REFRESH_TOKEN &&
      process.env.ONEDRIVE_WORKBOOK_SHARE_URL
  );
}

export async function readDashboardState(): Promise<unknown | null> {
  const { accessToken, base, sessionId } = await getWorkbookContext();
  await ensureStateSheet(accessToken, base, sessionId);
  const result = await graphFetch<{ values?: unknown[][] }>(
    accessToken,
    `${base}/worksheets/${encodeURIComponent(STATE_SHEET)}/usedRange(valuesOnly=true)`,
    { headers: workbookHeaders(sessionId) }
  );
  const rows = result.values ?? [];
  if (rows.length < 2) return null;
  const encoded = rows
    .slice(1)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map((row) => String(row[1] ?? ""))
    .join("");
  if (!encoded) return null;
  const { gunzipSync } = await import("node:zlib");
  return JSON.parse(gunzipSync(Buffer.from(encoded, "base64")).toString("utf8"));
}

export async function writeDashboardState(state: unknown): Promise<void> {
  const serialized = JSON.stringify(state);
  if (Buffer.byteLength(serialized, "utf8") > 8_000_000) {
    throw new Error("Dashboard state exceeds the 8 MB safety limit");
  }
  const { gzipSync } = await import("node:zlib");
  const encoded = gzipSync(serialized).toString("base64");
  const chunks = Array.from({ length: Math.ceil(encoded.length / CHUNK_SIZE) }, (_, index) =>
    encoded.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
  );
  const updatedAt = new Date().toISOString();
  const values: (string | number)[][] = [
    ["chunk_index", "payload", "updated_at"],
    ...chunks.map((chunk, index) => [index, chunk, updatedAt]),
  ];

  const { accessToken, base, sessionId } = await getWorkbookContext();
  await ensureStateSheet(accessToken, base, sessionId);
  await graphFetch(accessToken, `${base}/worksheets/${encodeURIComponent(STATE_SHEET)}/range(address='A:C')/clear`, {
    method: "POST",
    headers: workbookHeaders(sessionId),
    body: JSON.stringify({ applyTo: "All" }),
  });
  const lastRow = values.length;
  await graphFetch(accessToken, `${base}/worksheets/${encodeURIComponent(STATE_SHEET)}/range(address='A1:C${lastRow}')`, {
    method: "PATCH",
    headers: workbookHeaders(sessionId),
    body: JSON.stringify({ values }),
  });
}
