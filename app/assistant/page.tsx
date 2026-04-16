import { Suspense } from "react";
import { AssistantPage } from "@/components/assistant/AssistantPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen px-4 py-16 text-center text-sm text-gray-500">Loading...</div>}>
      <AssistantPage />
    </Suspense>
  );
}

