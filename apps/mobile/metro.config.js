const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Inject environment variables
process.env.EXPO_ROUTER_APP_ROOT = "./app";
process.env.EXPO_ROUTER_IMPORT_MODE = "sync";

// Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

// Force certain packages to always resolve from the app's node_modules
// to avoid duplicate instances causing runtime errors in a monorepo
config.resolver.extraNodeModules = {
  "react": path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "react-native-safe-area-context": path.resolve(projectRoot, "node_modules/react-native-safe-area-context"),
  "react-native-css-interop": path.resolve(projectRoot, "node_modules/react-native-css-interop"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
