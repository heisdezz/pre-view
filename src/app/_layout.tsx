import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Side-effect import: defines the background sync task at module scope, as
// required by expo-task-manager (must exist before the OS can invoke it,
// even with no UI mounted).
import "@/client/background-sync";
import QueryProvider from "@/providers/QueryProvider";
import { useMediaSync } from "@/hooks/use-media-sync";

function AppContent() {
  useMediaSync();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* `view/[id]` needs `presentation`/`animation`, which the gamma
          `ExperimentalStack` used everywhere else doesn't support yet (it
          warns and drops them) — the regular `Stack` here covers both. */}
      <Stack.Screen
        name="view/[id]"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}

export default function index(props: any) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <AppContent />
      </QueryProvider>
    </GestureHandlerRootView>
  );
}
