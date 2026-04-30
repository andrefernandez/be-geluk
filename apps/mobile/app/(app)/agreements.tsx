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
    <View className="flex-1 bg-[#f7f7f9]">
      <View className="px-6 mt-16 mb-8 flex-row items-center">
        <TouchableOpacity 
          className="bg-white border border-zinc-200 p-3 rounded-full shadow-sm shadow-zinc-200 mr-4"
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color="#18181b" />
        </TouchableOpacity>
        <Text className="text-zinc-900 text-2xl font-extrabold tracking-tight">Acordos</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#d4f34a" />
        </View>
      ) : (
        <FlatList
          data={agreements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className="bg-white p-5 rounded-[28px] mb-4 shadow-sm shadow-zinc-200/30 border border-zinc-100/80">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-zinc-900 font-bold text-[17px] flex-1 mr-2">{item.client?.name || 'Cliente'}</Text>
                <View className={`px-3 py-1.5 rounded-full ${item.status === 'ACTIVE' ? 'bg-sky-50' : item.status === 'COMPLETED' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  <Text className={`text-[10px] font-bold uppercase ${item.status === 'ACTIVE' ? 'text-sky-600' : item.status === 'COMPLETED' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.status}
                  </Text>
                </View>
              </View>
              
              <Text className="text-[#65a30d] font-extrabold text-2xl tracking-tight mb-2">
                {formatCurrency(item.totalValue)}
              </Text>
              
              <View className="flex-row items-center mt-3 pt-3 border-t border-zinc-100 justify-between">
                <View className="flex-row items-center">
                  <Feather name="layers" size={12} color="#a1a1aa" className="mr-1" />
                  <Text className="text-zinc-500 text-[12px] ml-1">{item.installmentsCount} parcelas</Text>
                </View>
                <View className="flex-row items-center">
                  <Feather name="calendar" size={12} color="#a1a1aa" className="mr-1" />
                  <Text className="text-zinc-400 text-[11px] font-medium ml-1">{formatDate(item.createdAt)}</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-zinc-400 text-center mt-10">Nenhum acordo encontrado.</Text>
          }
        />
      )}
    </View>
  );
}
