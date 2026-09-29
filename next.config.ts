import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
  poweredByHeader: false,
  outputFileTracingIncludes: { "/api/demo": ["./samples/**/*"] },
};
export default config;
