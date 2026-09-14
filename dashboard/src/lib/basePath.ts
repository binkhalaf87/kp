// The dashboard is nested under this real URL segment (see
// src/app/dashboard/) rather than using Next's `basePath` config — Vercel
// rejects `basePath` combined with a multi-builder root vercel.json
// (error: NEXT_BASEPATH_LEGACY_BUILDS). Used to build hrefs/fetch URLs from
// components that don't already sit under app/dashboard implicitly.
export const BASE_PATH = "/dashboard";
