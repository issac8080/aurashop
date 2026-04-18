"use client";

import dynamic from "next/dynamic";

/** Loads after first paint — keeps initial JS smaller (framer-motion, chat stream, etc.). */
export const ChatWidgetDynamic = dynamic(
  () => import("./ChatWidget").then((m) => ({ default: m.ChatWidget })),
  { ssr: false, loading: () => null }
);
