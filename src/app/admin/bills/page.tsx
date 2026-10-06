"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect old /admin/bills route to the merged /admin/payments page
export default function BillsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/payments");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-40">
      <p className="text-xs text-[#6B7280]">Redirecting to Payments & Bills...</p>
    </div>
  );
}
