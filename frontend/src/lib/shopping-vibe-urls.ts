export type ShoppingVibeMode = "chill" | "energetic" | "calm";

/**
 * Remote audio only (no bundled files). Override per environment with NEXT_PUBLIC_*.
 * Defaults: SoundHelix example MP3s — allowed for commercial use per SoundHelix license;
 * swap URLs for your own CDN or licensed provider in production.
 */
const REMOTE_DEFAULTS: Record<ShoppingVibeMode, string> = {
  chill: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  energetic: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  calm: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
};

export function getShoppingVibeUrls(): Record<ShoppingVibeMode, string> {
  return {
    chill: process.env.NEXT_PUBLIC_SHOPPING_VIBE_CHILL_URL?.trim() || REMOTE_DEFAULTS.chill,
    energetic: process.env.NEXT_PUBLIC_SHOPPING_VIBE_ENERGETIC_URL?.trim() || REMOTE_DEFAULTS.energetic,
    calm: process.env.NEXT_PUBLIC_SHOPPING_VIBE_CALM_URL?.trim() || REMOTE_DEFAULTS.calm,
  };
}
