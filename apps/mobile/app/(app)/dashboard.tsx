import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-slate-900 px-6 pt-16">
      <View className="flex-row justify-between items-center mb-8">
        <View>
          <Text className="text-white text-2xl font-bold">Olá, Cliente</Text>
          <Text className="text-slate-400">Bem-vindo ao Be Geluk</Text>
        </View>
        <TouchableOpacity 
          className="bg-slate-800 p-3 rounded-full"
          onPress={() => router.replace('/')}
        >
          <Feather name="log-out" size={20} color="#f87171" />
        </TouchableOpacity>
      </View>

      <View className="flex-row flex-wrap justify-between">
        {/* Card Operações */}
        <TouchableOpacity 
          className="bg-slate-800 w-[48%] p-4 rounded-2xl mb-4 border border-slate-700"
          onPress={() => router.push('/(app)/operations')}
        >
          <View className="bg-sky-500/20 w-12 h-12 rounded-xl items-center justify-center mb-3">
            <Feather name="briefcase" size={24} color="#38bdf8" />
          </View>
          <Text className="text-white font-bold text-lg">Operações</Text>
          <Text className="text-slate-400 text-sm">Ver resumo</Text>
        </TouchableOpacity>

        {/* Card Clientes */}
        <TouchableOpacity 
          className="bg-slate-800 w-[48%] p-4 rounded-2xl mb-4 border border-slate-700"
          onPress={() => router.push('/(app)/clients')}
        >
          <View className="bg-indigo-500/20 w-12 h-12 rounded-xl items-center justify-center mb-3">
            <Feather name="users" size={24} color="#818cf8" />
          </View>
          <Text className="text-white font-bold text-lg">Clientes</Text>
          <Text className="text-slate-400 text-sm">Gerenciar</Text>
        </TouchableOpacity>

        {/* Card Câmera */}
        <TouchableOpacity 
          className="bg-slate-800 w-[48%] p-4 rounded-2xl mb-4 border border-slate-700"
          onPress={() => router.push('/(app)/camera')}
        >
          <View className="bg-emerald-500/20 w-12 h-12 rounded-xl items-center justify-center mb-3">
            <Feather name="camera" size={24} color="#34d399" />
          </View>
          <Text className="text-white font-bold text-lg">Escanear</Text>
          <Text className="text-slate-400 text-sm">Ler documento</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
