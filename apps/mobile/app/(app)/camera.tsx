import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function CameraScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    // Camera permissions are still loading.
    return <View className="flex-1 bg-slate-900 justify-center items-center" />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center px-6">
        <Feather name="camera-off" size={64} color="#64748b" className="mb-4" />
        <Text className="text-white text-center text-lg mb-6">
          Precisamos da sua permissão para acessar a câmera.
        </Text>
        <TouchableOpacity 
          className="bg-sky-500 px-6 py-3 rounded-xl"
          onPress={requestPermission}
        >
          <Text className="text-white font-bold">Conceder Permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView 
        style={styles.camera} 
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr", "pdf417"],
        }}
        onBarcodeScanned={scanned ? undefined : ({ data }) => {
          setScanned(true);
          alert(`Código lido: ${data}`);
          setTimeout(() => setScanned(false), 2000);
        }}
      >
        <View className="flex-1 p-6 justify-between">
          <View className="flex-row justify-between items-center mt-12">
            <TouchableOpacity 
              className="bg-black/50 p-3 rounded-full"
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg bg-black/50 px-4 py-2 rounded-full">
              Escaneie o documento
            </Text>
            <View className="w-12" /> {/* Spacer */}
          </View>
          
          <View className="items-center mb-12">
            <TouchableOpacity className="bg-white p-4 rounded-full">
              <Feather name="camera" size={32} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
});
