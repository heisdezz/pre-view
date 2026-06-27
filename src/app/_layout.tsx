import { ExperimentalStack, Stack } from "expo-router";

export default function index(props: any) {
  return (
    <ExperimentalStack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
