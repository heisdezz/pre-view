import { Text, type TextProps } from '@expo/ui/jetpack-compose';
import { Color } from 'expo-router';

const defaultTextProps: Partial<TextProps> = {
  softWrap: true,
  overflow: 'ellipsis',
};

export default function JText(props: TextProps) {
  const textColor = Color.android.dynamic.onSurface as unknown as string;
  return <Text color={textColor} {...defaultTextProps} {...props} />;
}
