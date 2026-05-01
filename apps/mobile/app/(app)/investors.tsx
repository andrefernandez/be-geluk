import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

const API_URL = 'https://be-geluk.vercel.app/api/mobile/investors';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function InvestorsScreen() {
  const router = useRouter();
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvestors();
  }, []);

  const fetchInvestors = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setInvestors(data);
    } catch (error) {
      console.error('Erro ao buscar investidores:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#f7f7f9]">
      {/* Header */}
      <View className="bg-white px-6 pt-16 pb-6 border-b border-zinc-100 shadow-sm shadow-zinc-200/50">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="bg-zinc-100 p-3 rounded-full mr-4"
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={20} color="#18181b" />
          </TouchableOpacity>
          <View>
            <Text className="text-zinc-900 text-2xl font-bold">Investidores</Text>
            <Text className="text-zinc-400 text-sm">{investors.length} cadastrado(s)</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#18181b" />
        </View>
      ) : (
        <FlatList
          data={investors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24 }}
          renderItem={({ item }) => (
            <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm shadow-zinc-200/80 border border-zinc-100">
              {/* Nome e ícone */}
              <View className="flex-row items-center mb-4">
                <View className="w-11 h-11 rounded-full bg-zinc-100 items-center justify-center mr-3">
                  <Feather name="user" size={20} color="#18181b" />
                </View>
                <View className="flex-1">
                  <Text className="text-zinc-900 font-bold text-[16px]">{item.name}</Text>
                  {item.rate != null && (
                    <Text className="text-zinc-400 text-sm">Taxa: {item.rate}% a.m.</Text>
                  )}
                </View>
              </View>

              {/* Métricas */}
              <View className="flex-row justify-between pt-4 border-t border-zinc-100">
                <View className="items-center flex-1">
                  <Text className="text-zinc-400 text-xs mb-1">Aportado</Text>
                  <Text className="text-zinc-900 font-bold text-[13px]">
                    {formatCurrency(item.totalInvested)}
                  </Text>
                </View>
                <View className="w-px bg-zinc-100" />
                <View className="items-center flex-1">
                  <Text className="text-zinc-400 text-xs mb-1">Retirado</Text>
                  <Text className="text-rose-500 font-bold text-[13px]">
                    {formatCurrency(item.totalWithdrawn)}
                  </Text>
                </View>
                <View className="w-px bg-zinc-100" />
                <View className="items-center flex-1">
                  <Text className="text-zinc-400 text-xs mb-1">Saldo</Text>
                  <Text className="text-emerald-600 font-bold text-[13px]">
                    {formatCurrency(item.balance)}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-zinc-400 text-center mt-10">Nenhum investidor encontrado.</Text>
          }
        />
      )}
    </View>
  );
}
