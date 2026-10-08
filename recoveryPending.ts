import AsyncStorage from '@react-native-async-storage/async-storage';

const RECOVERY_PENDING_KEY = 'abc.passwordRecoveryPending';

export async function setRecoveryPending(): Promise<void> {
  await AsyncStorage.setItem(RECOVERY_PENDING_KEY, '1');
}

export async function clearRecoveryPending(): Promise<void> {
  await AsyncStorage.removeItem(RECOVERY_PENDING_KEY);
}

export async function isRecoveryPending(): Promise<boolean> {
  return (await AsyncStorage.getItem(RECOVERY_PENDING_KEY)) === '1';
}
