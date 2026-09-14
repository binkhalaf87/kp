// Must match `basePath` in next.config.mjs. Only needed for the handful of
// places (login form, logout button) that build a URL themselves instead of
// using next/link or next/navigation, which apply the basePath automatically.
export const BASE_PATH = "/dashboard";
