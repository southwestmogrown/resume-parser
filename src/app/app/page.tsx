import { Suspense } from "react";
import type { Metadata } from "next";
import AppExperience from "@/components/AppExperience";

export const metadata: Metadata = {
  title: "PassStack App — Upload, score, and rewrite",
  description:
    "Run the PassStack workflow: upload your resume, paste the job description, and unlock the full analysis for $5 one time.",
};

export default function AppPage() {
  return (
    <Suspense>
      <AppExperience />
    </Suspense>
  );
}
