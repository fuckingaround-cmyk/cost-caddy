import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server hydrate when opened from another device on the LAN
  // (e.g. testing the auditor mobile flow on a phone) instead of localhost.
  allowedDevOrigins: ['192.168.31.172'],
  // playwright-core/@sparticuz/chromium resolve their binary dynamically at runtime;
  // Next's file tracer can't see that, so it must not try to bundle/tree-shake them.
  serverExternalPackages: ['playwright-core', '@sparticuz/chromium'],
  // Marking them external stops bundling, but the tracer still needs to know to physically
  // copy their non-JS assets (playwright-core's browsers.json, @sparticuz/chromium's
  // brotli-compressed binary) into the deployed function — it can't discover those via
  // static require() analysis, so BUG-027 recurred with just serverExternalPackages alone.
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/playwright-core/**/*',
      './node_modules/@sparticuz/chromium/**/*',
    ],
  },
};

export default nextConfig;
