import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: '#1e40af' }, headerTintColor: '#fff' }}>
        <Stack.Screen name="index" options={{ title: 'PAMS Waterworks' }} />
        <Stack.Screen name="login" options={{ title: 'Login', headerShown: false }} />
        <Stack.Screen name="supplies" options={{ title: 'My Supplies' }} />
        <Stack.Screen name="accounts/[supplyId]" options={{ title: 'Accounts' }} />
        <Stack.Screen name="reading/[accountId]" options={{ title: 'Submit Reading' }} />
        <Stack.Screen name="history" options={{ title: 'My Submissions' }} />
      </Stack>
    </>
  );
}
