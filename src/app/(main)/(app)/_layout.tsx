import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function index(props: any) {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index"></NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore"></NativeTabs.Trigger>
    </NativeTabs>
  );
}
