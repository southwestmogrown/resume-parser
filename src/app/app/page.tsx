import { Suspense } from "react";
import type { Metadata } from "next";
import AppExperience from "@/components/AppExperience";

export const metadata: Metadata = {
  title: "PassStack App — See what the ATS sees, then fix it",
  description:
    "Upload your resume, paste the job posting, and find out exactly what's getting you filtered — then fix it. $5 one time. No account. No subscription.",
};

export default function AppPage() {
  return (
    <Suspense>
      <AppExperience />
    </Suspense>
  );
}
