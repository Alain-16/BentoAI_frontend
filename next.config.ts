import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a self-contained server into .next/standalone.
  //
  // Next works out which files each page actually needs and copies only those,
  // including the handful of node_modules that get used. The alternative is
  // shipping the whole dependency tree - about 500MB of it - to run a server
  // that touches a fraction.
  output: "standalone",
};

export default nextConfig;
