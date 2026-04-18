import { cn } from "@/lib/utils";

/** Read-only labels for backend return statuses (IntelliReturn). */
const RETURN_STATUS: Record<string, { label: string; tone: "amber" | "blue" | "emerald" | "red" | "slate" | "teal" }> = {
  PENDING: { label: "Pending", tone: "amber" },
  MANUAL_REVIEW_PENDING: { label: "Under review", tone: "blue" },
  AI_APPROVED: { label: "Approved", tone: "emerald" },
  AI_REJECTED: { label: "Rejected", tone: "red" },
  ADMIN_APPROVED: { label: "Approved", tone: "emerald" },
  ADMIN_REJECTED: { label: "Rejected", tone: "red" },
  PROCESSING: { label: "Processing", tone: "teal" },
  COMPLETED: { label: "Completed", tone: "emerald" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
};

const toneClass: Record<string, string> = {
  amber:
    "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30",
  blue: "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30",
  emerald:
    "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/30",
  red: "bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/30",
  slate: "bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-500/30",
  teal: "bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500/30",
};

export function getReturnStatusDisplay(status: string) {
  const row = RETURN_STATUS[status];
  if (row) {
    return { label: row.label, className: cn("font-semibold border", toneClass[row.tone]) };
  }
  return {
    label: status.replace(/_/g, " "),
    className: cn("font-semibold border", toneClass.slate),
  };
}

export type ReturnOrderSummary = {
  id: number;
  order_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  order?: { product_name?: string; product_category?: string } | null;
};
