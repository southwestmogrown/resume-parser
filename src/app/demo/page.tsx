import { Suspense } from "react";
import DemoExperience from "@/components/DemoExperience";

export const metadata = {
  title: "PassStack Demo — See the full analysis before you commit",
  description: "Run the full PassStack analysis with sample data. All seven phases in under 30 seconds. No upload, no payment, no account.",
};

export default function DemoPage() {
  return (
    <Suspense>
      <DemoExperience />
    </Suspense>
  );
}
