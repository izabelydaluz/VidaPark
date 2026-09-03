import React, { useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Platform, AppState } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import Entypo from '@expo/vector-icons/Entypo';
 
import Login from './Screens/Views/Auth/Login'

import ADM from "./Screens/Views/Admin/adm";
import GerenciarProduto from "./Screens/Views/Admin/GerenciarProduto";
import AddProdutos from "./Screens/Views/Admin/AddProduto";
import Pagamento from "./Screens/Views/Checkout/Pagamento";
import Cadastrar from "./Screens/Views/Auth/Cadastrar";
import EditProduct from "./Screens/Views/Admin/EditProduct";
import { ProductProvider } from "./context/ProductContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import Profile from './Screens/Views/Profile/Profile';
import EditProfile from './Screens/Views/Auth/EditProfile';
import ChangePassword from './Screens/Views/Auth/ChangePassword';
import Purchases from './Screens/Views/Profile/Purchases';
import Addresses from './Screens/Views/Profile/Addresses';
import Settings from './Screens/Views/Profile/Settings';
import GerenciarCliente from './Screens/Views/Admin/GerenciarCliente';
import GerenciarVendas from "./Screens/Views/Admin/GerenciarVendas";
import Home from "./Screens/Home";
import CatalogoSalgados from "./Screens/Views/Main/CatalogoSalgados";
import MonteSeuCombo from "./Screens/Views/Checkout/MonteSeuCombo";
import Carrinho from "./Screens/Views/Checkout/Carrinho";
import Checkout from "./Screens/Views/Checkout/Checkout";
import MeusPedidos from "./Screens/MeusPedidos";
 
function TabNavigate() {
  const Tab = createBottomTabNavigator();
  const { theme } = useTheme();
 
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
      }}
    >

      <Tab.Screen name="Home" component={Home}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Entypo name="home" size={20} color={color} />
          )
        }} />

        <Tab.Screen name="Catalogo" component={CatalogoSalgados}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Entypo name="shopping-bag" size={20} color={color} />
            
          )
        }} />

        <Tab.Screen name="Combo" component={MonteSeuCombo}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Entypo name="shop" size={20} color={color} />
          )
        }} />
        
       
 
      
 
      <Tab.Screen name="Carrinho" component={Carrinho}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Entypo name="shopping-cart" size={20} color={color} />
          )
        }} />
 
      <Tab.Screen name="Perfil" component={Profile}
        options={{
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Entypo name="user" size={20} color={color} />
          )
        }} />
    </Tab.Navigator>
  )
}
 
function AppContent() {
  const Stack = createStackNavigator();
  const { theme } = useTheme();
  const appState = useRef(AppState.currentState);
 
  useEffect(() => {
    if (Platform.OS !== "android") return;
 
    async function hideBar() {
      await NavigationBar.setVisibilityAsync("hidden");
    }
    hideBar();
 
    const sub = AppState.addEventListener("change", (next) => {
      if (appState.current.match(/background/) && next === "active") {
        hideBar();
      }
      appState.current = next;
    });
 
    return () => sub.remove();
  }, []);
 
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          cardStyle: { backgroundColor: theme.background },
        }}
      >

        




        <Stack.Screen name="Login" component={Login} options={{
          headerShown: false
        }} />
 
        <Stack.Screen name="Cadastrar" component={Cadastrar} options={{
          title: "Cadastrar",
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: "#fff",
          headerTitleStyle: { color: "#fff" },
        }} />
 
        <Stack.Screen name="ADM" component={ADM} options={{
          headerShown: false
        }} />
 
        <Stack.Screen name="GerenciarProduto" component={GerenciarProduto} options={{
          title: 'Gerenciar Produto',
          headerStyle: { backgroundColor: '#202040' },
          headerTintColor: '#F8F8F8',
        }} />
 
        <Stack.Screen name="GerenciarVendas" component={GerenciarVendas} options={{
          title: 'Gerenciar Vendas',
          headerStyle: { backgroundColor: '#202040' },
          headerTintColor: '#F8F8F8',
        }} />
 
        <Stack.Screen name="GerenciarCliente" component={GerenciarCliente} options={{
          title: 'Gerenciar Cliente',
          headerStyle: { backgroundColor: '#202040' },
          headerTintColor: '#F8F8F8',
        }} />
 
        <Stack.Screen name="AddProdutos" component={AddProdutos} options={{
          headerShown: false
        }} />
        <Stack.Screen name="EditProduct" component={EditProduct} options={{
          headerShown: false
        }} />


    


          <Stack.Screen name="Home" component={TabNavigate} options={{
          headerShown: false
        }} />

        <Stack.Screen name="catalogo" component={TabNavigate} options={{
          headerShown: false
        }} />

        <Stack.Screen name="Combo" component={TabNavigate} options={{
          headerShown: false
        }} />

        

        
        <Stack.Screen name="Checkout" component={Checkout} options={{
          headerShown: false
        }} />

        <Stack.Screen name="MeusPedidos" component={MeusPedidos} options={{
          headerShown: false
        }} />


        <Stack.Screen name="EditProfile" component={EditProfile} options={{
          headerShown: false
        }} />
        <Stack.Screen name="ChangePassword" component={ChangePassword} options={{
          headerShown: false
        }} />
        <Stack.Screen name="Purchases" component={Purchases} options={{
          headerShown: false
        }} />
        <Stack.Screen name="Addresses" component={Addresses} options={{
          headerShown: false
        }} />
        <Stack.Screen name="Settings" component={Settings} options={{
          headerShown: false
        }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
 
export default function App() {
  return (
    <ThemeProvider>
      <ProductProvider>
        <AppContent />
      </ProductProvider>
    </ThemeProvider>
  );
}