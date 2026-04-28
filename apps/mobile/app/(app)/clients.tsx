import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

// URL do seu servidor local rodando o Next.js (Mude para o IP da sua máquina se rodar no celular físico)
// Exemplo: http://192.168.1.XX:3000/api/mobile/clients
const API_URL = 'http://localhost:3000/api/mobile/clients';

export default function ClientsScreen() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // Quando for usar no celular de verdade, troque localhost pelo IP da sua máquina rodando o backend
      // pois 'localhost' no celular aponta para o próprio celular.
      const res = await fetch(API_URL);
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
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
        <Text className="text-white text-2xl font-bold">Clientes</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View className="bg-slate-800 p-4 rounded-2xl mb-4 border border-slate-700">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white font-bold text-lg">{item.name}</Text>
                <View className={`px-2 py-1 rounded-md ${item.status === 'ATIVO' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                  <Text className={`text-xs font-bold ${item.status === 'ATIVO' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.status}
                  </Text>
                </View>
              </View>
              {item.cnpj && <Text className="text-slate-400 text-sm">CNPJ: {item.cnpj}</Text>}
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-slate-400 text-center mt-10">Nenhum cliente encontrado.</Text>
          }
        />
      )}
    </View>
  );
}
