import { Color } from "expo-router";
import { PropsWithChildren } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export default function PageWrap(props: PropsWithChildren<any>) {
  const color = Color.android.dynamic;
  return (
    <SafeAreaView style={{ backgroundColor: color.background, flex: 1 }}>
      {props.children}
    </SafeAreaView>
  );
}
