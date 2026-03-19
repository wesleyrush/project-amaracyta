import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './src/context/AppContext';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ChatScreen from './src/screens/ChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import StoreScreen from './src/screens/StoreScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import PurchaseSuccessScreen from './src/screens/PurchaseSuccessScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ChildrenScreen from './src/screens/ChildrenScreen';
import SessionDrawer from './src/components/SessionDrawer';
import ModulePicker from './src/components/ModulePicker';
import { colors } from './src/theme';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerContent(props: DrawerContentComponentProps) {
  const { setCid } = useApp();
  const [showPicker, setShowPicker] = React.useState(false);

  return (
    <>
      <SessionDrawer
        onNewChat={() => setShowPicker(true)}
        onClose={() => props.navigation.closeDrawer()}
      />
      <ModulePicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSelected={(id) => {
          setCid(id);
          setShowPicker(false);
          props.navigation.closeDrawer();
        }}
      />
    </>
  );
}

function AppDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{ headerShown: false, drawerStyle: { width: 300 } }}
    >
      <Drawer.Screen name="Chat" component={ChatScreen} />
    </Drawer.Navigator>
  );
}

function AppNavigator() {
  const { authed, authReady } = useApp();

  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authed ? (
          <>
            <Stack.Screen name="Main" component={AppDrawer} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Store" component={StoreScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="PurchaseSuccess" component={PurchaseSuccessScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="Children" component={ChildrenScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
