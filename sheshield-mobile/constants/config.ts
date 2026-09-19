/**
 * SheShield — Shared API configuration
 *
 * LOCAL:      Wi-Fi IP 10.11.27.52 (phone on same network)
 * PRODUCTION: Set EXPO_PUBLIC_API_URL env var to your Render URL
 *
 * After deploying backend to Render, update RENDER_URL below.
 */

const RENDER_URL   = 'https://sheshield-backend.onrender.com'; // ← update after deploy
const LOCAL_WIFI   = 'http://10.11.27.52:5000';
const LOCAL_WEB    = 'http://localhost:5000';

const isWeb = typeof document !== 'undefined';

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ||          // set this in .env for prod builds
  (isWeb ? LOCAL_WEB : LOCAL_WIFI);
