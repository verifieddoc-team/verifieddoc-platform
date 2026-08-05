import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgetpassword" />
      <Stack.Screen name="otp-verification" />
      <Stack.Screen name="create-new-password" />
      <Stack.Screen name="reset-successful" />
    </Stack>
  );
}
