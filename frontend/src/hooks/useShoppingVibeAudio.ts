import { useEffect, useRef } from "react";
import type { ShoppingVibeMode } from "@/lib/shopping-vibe-urls";

const FADE_MS = 900;
const TARGET_VOLUME = 0.25;

function cancelRaf(id: React.MutableRefObject<number | null>) {
  if (id.current != null) {
    cancelAnimationFrame(id.current);
    id.current = null;
  }
}

function fadeVolume(
  audio: HTMLAudioElement,
  to: number,
  durationMs: number,
  rafRef: React.MutableRefObject<number | null>,
  onComplete?: () => void
) {
  cancelRaf(rafRef);
  const from = audio.volume;
  const start = performance.now();

  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    const smooth = t * t * (3 - 2 * t);
    audio.volume = from + (to - from) * smooth;
    if (t < 1) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
      onComplete?.();
    }
  };
  rafRef.current = requestAnimationFrame(tick);
}

type Options = {
  panelOpen: boolean;
  enabled: boolean;
  mode: ShoppingVibeMode;
  urls: Record<ShoppingVibeMode, string>;
  /** e.g. autoplay policy after reopening panel — sync UI toggle off */
  onPlaybackFailed?: () => void;
};

function resolveUrl(url: string) {
  try {
    return new URL(url, typeof window !== "undefined" ? window.location.href : undefined).href;
  } catch {
    return url;
  }
}

/**
 * HTML5 Audio loop with fade-in on play. Never starts until `enabled` is true (user gesture).
 * Stops immediately when disabled or unmounts (no fade-out so off feels instant).
 */
export function useShoppingVibeAudio({ panelOpen, enabled, mode, urls, onPlaybackFailed }: Options) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  const panelOpenRef = useRef(panelOpen);
  const enabledRef = useRef(enabled);
  const onPlaybackFailedRef = useRef(onPlaybackFailed);
  const effectGenRef = useRef(0);
  panelOpenRef.current = panelOpen;
  enabledRef.current = enabled;
  onPlaybackFailedRef.current = onPlaybackFailed;

  useEffect(() => {
    const myGen = ++effectGenRef.current;
    const stale = () => effectGenRef.current !== myGen;

    const dispose = () => {
      const a = audioRef.current;
      if (!a) return;
      a.pause();
      a.removeAttribute("src");
      a.load();
      audioRef.current = null;
    };

    const active = panelOpen && enabled;

    if (!active) {
      cancelRaf(fadeRafRef);
      const a = audioRef.current;
      if (a) dispose();
      return () => {
        cancelRaf(fadeRafRef);
      };
    }

    const url = resolveUrl(urls[mode]);
    const el = audioRef.current;
    const sameTrack = el && resolveUrl(el.currentSrc || el.src) === url;

    const startFresh = () => {
      if (stale()) return;
      dispose();
      const next = new Audio();
      next.loop = true;
      next.preload = "auto";
      next.volume = 0;
      next.src = urls[mode];
      audioRef.current = next;
      next.addEventListener(
        "error",
        () => {
          if (stale()) return;
          if (audioRef.current === next) dispose();
        },
        { once: true }
      );
      void next
        .play()
        .then(() => {
          if (stale() || !panelOpenRef.current || !enabledRef.current || audioRef.current !== next) {
            next.pause();
            if (audioRef.current === next) dispose();
            return;
          }
          fadeVolume(next, TARGET_VOLUME, FADE_MS, fadeRafRef);
        })
        .catch(() => {
          if (!stale() && audioRef.current === next) dispose();
          if (!stale()) onPlaybackFailedRef.current?.();
        });
    };

    if (!el || !sameTrack) {
      if (el && el.src) {
        fadeVolume(el, 0, Math.round(FADE_MS * 0.65), fadeRafRef, () => {
          if (stale()) return;
          el.pause();
          dispose();
          startFresh();
        });
      } else {
        startFresh();
      }
    } else if (el.paused) {
      el.volume = 0;
      void el
        .play()
        .then(() => {
          if (stale() || !panelOpenRef.current || !enabledRef.current || audioRef.current !== el) return;
          fadeVolume(el, TARGET_VOLUME, FADE_MS, fadeRafRef);
        })
        .catch(() => {
          if (!stale()) dispose();
          if (!stale()) onPlaybackFailedRef.current?.();
        });
    } else if (el.volume < TARGET_VOLUME * 0.9) {
      fadeVolume(el, TARGET_VOLUME, Math.round(FADE_MS * 0.45), fadeRafRef);
    }

    return () => {
      cancelRaf(fadeRafRef);
    };
  }, [panelOpen, enabled, mode, urls]);

  useEffect(() => {
    return () => {
      effectGenRef.current += 1;
      cancelRaf(fadeRafRef);
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.removeAttribute("src");
        a.load();
        audioRef.current = null;
      }
    };
  }, []);
}
