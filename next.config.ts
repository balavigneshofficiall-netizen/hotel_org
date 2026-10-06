import type { NextConfig } from "next";
import os from "os";

function getAllLocalIps(): string[] {
  const ips: string[] = [];
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          ips.push(net.address);
          ips.push(`${net.address}:3000`);
        }
      }
    }
  } catch {}
  return ips;
}

const localIps = getAllLocalIps();

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.serveousercontent.com",
    "*.localhost.run",
    "*.pinggy.io",
    "*.loca.lt",
    "localhost:3000",
    "127.0.0.1:3000",
    "10.117.226.228",
    "10.117.226.228:3000",
    ...localIps,
  ],
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
