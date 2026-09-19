"use client";
import { Suspense } from "react";
import ResetPasswordPageLayout from "@/components/ResetPasswordPageLayout";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageLayout />
    </Suspense>
  );
}