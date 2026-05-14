import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PiperScreen } from './src/screens/PiperScreen';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'light-content'} backgroundColor="#0F1115" />
      <PiperScreen />
    </SafeAreaProvider>
  );
}

export default App;
