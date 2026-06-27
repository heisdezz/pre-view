import { ExperimentalStack } from "expo-router";

// Side-effect import: defines the background sync task at module scope, as
// required by expo-task-manager (must exist before the OS can invoke it,
// even with no UI mounted).
import "@/client/background-sync";
import QueryProvider from "@/providers/QueryProvider";
import { useMediaSync } from "@/hooks/use-media-sync";

function AppContent() {
  useMediaSync();
  return (
    <ExperimentalStack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

export default function index(props: any) {
  return (
    <QueryProvider>
      <AppContent />
    </QueryProvider>
  );
}
