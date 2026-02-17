import { Alert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

const alert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean }
): void => {
  if (Platform.OS === 'web') {
    // Web fallback using window.confirm
    const result = window.confirm(
      [title, message].filter(Boolean).join('\n\n')
    );

    if (buttons && buttons.length > 0) {
      if (result) {
        // User clicked OK - find the confirm button
        const confirmButton = buttons.find(btn => btn.style !== 'cancel');
        if (confirmButton && confirmButton.onPress) {
          confirmButton.onPress();
        }
      } else {
        // User clicked Cancel - find the cancel button
        const cancelButton = buttons.find(btn => btn.style === 'cancel');
        if (cancelButton && cancelButton.onPress) {
          cancelButton.onPress();
        }
      }
    }
  } else {
    // Use native Alert for iOS and Android
    Alert.alert(title, message, buttons as any, options);
  }
};

export default alert;