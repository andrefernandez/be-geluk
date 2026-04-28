import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

// URL do seu servidor local rodando o Next.js
const API_URL = 'http://localhost:3000/api/mobile/operations';

export default function OperationsScreen() {
  const router = useRouter();
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperations();
  }, []);

  const fetchOperations = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setOperations(data);
    } catch (error) {
      console.error('Erro ao buscar operações:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
        <Text className="text-white text-2xl font-bold">Operações</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#38bdf8" />
        </View>
      ) : (
        <FlatList
          data={operations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View className="bg-slate-800 p-5 rounded-2xl mb-4 border border-slate-700">
              <View className="flex-row justify-between items-center mb-3">
                <View className="flex-row items-center">
                  <View className="bg-sky-500/20 p-2 rounded-lg mr-3">
                    <Feather name="briefcase" size={16} color="#38bdf8" />
                  </View>
                  <Text className="text-slate-300 font-semibold">{item.client?.name || 'Cliente Desconhecido'}</Text>
                </View>
                <Text className="text-slate-400 text-xs">
                  {new Date(item.date).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              
              <View className="flex-row justify-between items-end mt-2">
                <View>
                  <Text className="text-slate-500 text-xs mb-1">Valor Bruto</Text>
                  <Text className="text-white font-bold text-lg">{formatCurrency(item.valorBruto)}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-slate-500 text-xs mb-1">Valor Líquido</Text>
                  <Text className="text-emerald-400 font-bold text-lg">{formatCurrency(item.valorLiquido)}</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text className="text-slate-400 text-center mt-10">Nenhuma operação encontrada.</Text>
          }
        />
      )}
    </View>
  );
}
