"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const code = (params?.code as string) || "";

  useEffect(() => {
    if (code) {
      router.replace(`/?ref=${encodeURIComponent(code)}`);
    } else {
      router.replace("/");
    }
  }, [code, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <p className="text-gray-500 dark:text-gray-400">Redirecting...</p>
    </div>
  );
}
