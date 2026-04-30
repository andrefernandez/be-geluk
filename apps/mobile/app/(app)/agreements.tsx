import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

const API_URL = 'https://be-geluk.vercel.app/api/mobile/agreements';

export default function AgreementsScreen() {
  const router = useRouter();
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgreements();
  }, []);

  const fetchAgreements = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setAgreements(data);
    } catch (error) {
      console.error('Erro ao buscar acordos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
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
        <Text className="text-white text-2xl font-bold">Acordos</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : (
        <FlatList
          data={agreements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View className="bg-slate-800 p-4 rounded-2xl mb-4 border border-slate-700">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white font-bold text-lg">{item.client?.name || 'Cliente'}</Text>
                <View className={`px-2 py-1 rounded-md ${item.status === 'ACTIVE' ? 'bg-sky-500/20' : item.status === 'COMPLETED' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
                  <Text className={`text-xs font-bold ${item.status === 'ACTIVE' ? 'text-sky-400' : item.status === 'COMPLETED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text className="text-emerald-400 font-bold text-lg mb-1">{formatCurrency(item.totalValue)}</Text>
              <Text className="text-slate-400 text-sm mb-2">{item.installmentsCount} parcelas</Text>
              <Text className="text-slate-500 text-xs">Criado em: {formatDate(item.createdAt)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-slate-400 text-center mt-10">Nenhum acordo encontrado.</Text>
          }
        />
      )}
    </View>
  );
}
