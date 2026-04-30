import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

const API_URL = 'https://be-geluk.vercel.app/api/mobile/bos';

export default function BosScreen() {
  const router = useRouter();
  const [bos, setBos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBos();
  }, []);

  const fetchBos = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setBos(data);
    } catch (error) {
      console.error('Erro ao buscar BOs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <View className="flex-1 bg-slate-900 pt-16">
      <View className="flex-row items-center px-6 mb-8">
        <TouchableOpacity 
          className="bg-slate-800 p-3 rounded-full mr-4"
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold">B.O's</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : (
        <FlatList
          data={bos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View className="bg-slate-800 p-4 rounded-2xl mb-4 border border-slate-700">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white font-bold text-lg">{item.title}</Text>
                <View className={`px-2 py-1 rounded-md ${item.status === 'OPEN' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                  <Text className={`text-xs font-bold ${item.status === 'OPEN' ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {item.status}
                  </Text>
                </View>
              </View>
              {item.description && <Text className="text-slate-400 text-sm mb-2">{item.description}</Text>}
              <Text className="text-slate-500 text-xs">Criado em: {formatDate(item.createdAt)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-slate-400 text-center mt-10">Nenhum B.O encontrado.</Text>
          }
        />
      )}
    </View>
  );
}
