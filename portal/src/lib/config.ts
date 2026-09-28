// Server-side only: base URLs of the backends (docker-compose service names in production).
export const APP1_API_URL = process.env.APP1_API_URL ?? "http://localhost:8001";
export const APP2_API_URL = process.env.APP2_API_URL ?? "http://localhost:8002";

export const UPSTREAMS = {
  app1: APP1_API_URL,
  app2: APP2_API_URL,
} as const;

export type UpstreamName = keyof typeof UPSTREAMS;
