import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  name: string;
  onContinue: () => void;
}

const WelcomeScreen: React.FC<Props> = ({ name, onContinue }) => {
  useEffect(() => {
    const timer = setTimeout(onContinue, 2000); // ⏳ 2s delay then go to Dashboard
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome, {name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  text: { fontSize: 24, fontWeight: 'bold' },
});

export default WelcomeScreen;
