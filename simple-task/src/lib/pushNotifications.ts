import { supabase } from '@/integrations/supabase/client';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

// Firebase configuration
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBqK5vWx9xZGYxQxZ8dQ0J9xYxYxYxYxYx",
  authDomain: "payfesa-88c91.firebaseapp.com",
  projectId: "payfesa-88c91",
  storageBucket: "payfesa-88c91.firebasestorage.app",
  messagingSenderId: "100627410442",
  appId: "1:100627410442:web:abcdef123456"
};

let messaging: Messaging | null = null;
let app: FirebaseApp | null = null;

export async function initializeFirebase(): Promise<Messaging | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Push notifications not supported in this environment');
    return null;
  }

  try {
    if (!app) {
      app = initializeApp(FIREBASE_CONFIG);
    }
    
    if (!messaging) {
      messaging = getMessaging(app);

      onMessage(messaging, (payload) => {
        console.log('Message received in foreground:', payload);
        
        if (payload.notification) {
          new Notification(payload.notification.title || 'PayFesa', {
            body: payload.notification.body,
            icon: '/payfesa-icon.jpg',
          });
        }
      });
    }

    return messaging;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

export async function registerFCMToken(userId: string): Promise<string | null> {
  try {
    if (!messaging) {
      messaging = await initializeFirebase();
    }

    if (!messaging) {
      console.error('Firebase messaging not initialized');
      return null;
    }

    const permission = await requestNotificationPermission();
    if (!permission) {
      console.log('Notification permission denied');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: 'BNxK3vY8zQ9xZ1xY2xY3xY4xY5xY6xY7xY8xY9xY0xY1xY2xY3xY4xY5xY6xY7xY8xY9xY0xY1xY'
    });

    if (token) {
      console.log('FCM token obtained:', token);

      const deviceType = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
      const deviceName = navigator.userAgent;

      const { error } = await supabase
        .from('fcm_tokens')
        .upsert({
          user_id: userId,
          token,
          device_type: deviceType,
          device_name: deviceName,
          last_used_at: new Date().toISOString(),
          is_active: true,
        }, {
          onConflict: 'token'
        });

      if (error) {
        console.error('Error saving FCM token:', error);
        return null;
      }

      return token;
    }

    return null;
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return null;
  }
}

export async function unregisterFCMToken(token: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('fcm_tokens')
      .update({ is_active: false })
      .eq('token', token);

    if (error) {
      console.error('Error unregistering FCM token:', error);
    }
  } catch (error) {
    console.error('Error unregistering FCM token:', error);
  }
}

export async function sendPushNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: userIds,
        title,
        body,
        data,
      },
    });

    if (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }

    console.log('Push notification sent:', result);
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}
