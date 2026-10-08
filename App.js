import { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { ActivityIndicator, Alert, AppState, Platform, View } from 'react-native';
import { supabase } from './supabase';
import { clearRecoveryPending, isRecoveryPending } from './recoveryPending';
import LoginScreen from './screens/LoginScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import BookingScreen from './screens/BookingScreen';
import ProfileScreen from './screens/ProfileScreen';
import SignUpScreen from './screens/SignUpScreen';
import NotificationsScreen from './screens/NotificationsScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return token;
}

function TabNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Booking" component={BookingScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();
  const [sessionReady, setSessionReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Login');

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications().then(async token => {
      if (!token) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('user_id', user.id)
          .select('id');
        if (updateError) {
          console.warn('Could not update push token', updateError);
          return;
        }
        if (updated && updated.length > 0) return;

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: user.id, push_token: token });
        if (insertError) console.warn('Could not save push token', insertError);
      } catch (err) {
        console.warn('Could not save push token', err);
      }
    }).catch(err => {
      console.warn('Could not register for push notifications', err);
    });

    // Listen for notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let channel = null;
    let currentUserId = null;
    const seen = new Set();
    const queue = [];
    let showing = false;

    const markRead = async (id) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .select('id');
      if (error || !data || data.length !== 1) {
        console.warn('Failed to mark notification read', { id, error, updated: data?.length ?? 0 });
        seen.delete(id);
        return false;
      }
      return true;
    };

    const openNotifications = () => {
      if (navigationRef.isReady()) navigationRef.navigate('Notifications');
    };

    const pump = () => {
      if (!active || showing) return;
      const next = queue.shift();
      if (!next) return;
      showing = true;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        markRead(next.id).finally(() => {
          showing = false;
          if (active) pump();
        });
      };
      const more = next.moreCount > 0 ? `\n\nYou have ${next.moreCount} more unread.` : '';
      const buttons = [{ text: 'OK', onPress: finish }];
      if (next.moreCount > 0) {
        buttons.unshift({
          text: 'View notifications',
          onPress: () => {
            finish();
            openNotifications();
          },
        });
      }
      Alert.alert(next.title || 'Notification', `${next.body || ''}${more}`, buttons, {
        cancelable: true,
        onDismiss: finish,
      });
    };

    const presentUnread = (rows) => {
      const fresh = [];
      (rows || []).forEach((row) => {
        if (!row?.id || row.read === true || seen.has(row.id)) return;
        if (currentUserId && row.user_id && row.user_id !== currentUserId) return;
        fresh.push(row);
      });
      if (!fresh.length) return;
      fresh.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
      fresh.forEach((row) => seen.add(row.id));
      queue.push({ ...fresh[0], moreCount: fresh.length - 1 });
      pump();
    };

    const loadUnread = async (userId) => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, read, user_id, created_at')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false });
      if (!active || currentUserId !== userId) return;
      presentUnread(data || []);
    };

    const subscribe = (userId) => {
      if (channel) supabase.removeChannel(channel);
      channel = supabase
        .channel(`client-unread-notifications-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.new) presentUnread([payload.new]);
          }
        )
        .subscribe();
    };

    const startForUser = (userId) => {
      if (!userId || !active) return;
      if (currentUserId !== userId) {
        currentUserId = userId;
        subscribe(userId);
      }
      loadUnread(userId);
    };

    const stop = () => {
      currentUserId = null;
      queue.length = 0;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      let recoveryPending = false;
      try {
        recoveryPending = await isRecoveryPending();
      } catch (err) {
        console.warn('Could not read password recovery flag', err);
      }
      if (recoveryPending) {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.warn('Could not end password recovery session', err);
        }
        try {
          const { data: after } = await supabase.auth.getSession();
          if (!after.session) await clearRecoveryPending();
        } catch (err) {
          console.warn('Could not clear password recovery flag', err);
        }
        if (!active) return;
        setInitialRoute('Login');
        setSessionReady(true);
        return;
      }
      if (data.session?.user?.id) {
        setInitialRoute('Main');
        startForUser(data.session.user.id);
      }
      setSessionReady(true);
    }).catch(() => {
      if (active) setSessionReady(true);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id || null;
      setTimeout(() => {
        if (!active) return;
        if (userId) startForUser(userId);
        else stop();
      }, 0);
    });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && currentUserId) loadUnread(currentUserId);
    });

    return () => {
      active = false;
      appStateSub.remove();
      authSub.subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (!sessionReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator color="#3D52A0" />
      </View>
    );
  }

  return (
    <StripeProvider publishableKey="pk_live_51TBfSlCv6ZSrYUtDHAxWCTQdDrNg8MEyS0CRNYbonrSqN84RWLFEWmYBNyeAPlagZ6NinoGNATZ74Nxtvy2CIxBk00RoTcRDf9">
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Main" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </StripeProvider>
  );
}