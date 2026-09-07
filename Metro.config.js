// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
 
const config = getDefaultConfig(__dirname);
 
// O Firebase (a partir da v10+) tem o campo "exports" do package.json
// mal configurado para React Native: em plataformas nativas (Android/iOS),
// o Metro do Expo SDK 53+ acaba resolvendo o bundle WEB do Firebase em vez
// do bundle React Native, quebrando globals como StyleSheet/document.
//
// Não podemos desabilitar "exports" globalmente porque o react-native-web
// (usado quando rodamos no navegador) depende desse mesmo mecanismo pra
// funcionar corretamente.
//
// Solução: interceptar só os módulos "firebase/*" e, apenas em Android/iOS
// (plataforma !== "web"), forçar a resolução sem usar "exports" — o Web
// continua resolvendo normalmente.
const defaultResolveRequest = config.resolver.resolveRequest;
 
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== "web" && moduleName.startsWith("firebase/")) {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false },
      moduleName,
      platform
    );
  }
 
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
 
  return context.resolveRequest(context, moduleName, platform);
};
 
module.exports = config;