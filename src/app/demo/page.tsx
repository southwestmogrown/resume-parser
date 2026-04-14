import { Suspense } from "react";
import DemoExperience from "@/components/DemoExperience";

export const metadata = {
  title: "PassStack Demo — See the full analysis",
  description: "An interactive guided tour of the PassStack resume analysis pipeline. No account or payment required.",
};

export default function DemoPage() {
  return (
    <Suspense>
      <DemoExperience />
    </Suspense>
  );
}
