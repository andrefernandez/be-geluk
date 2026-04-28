import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

// Para o app mobile acessar o backend na sua máquina, precisamos usar o IP da rede em vez de localhost
const API_URL = 'http://192.168.1.62:3000/api/mobile';

const MONTHS = [
  { label: 'Geral', value: 'all' },
  { label: 'Mai/26', value: '2026-05' },
  { label: 'Abr/26', value: '2026-04' },
  { label: 'Mar/26', value: '2026-03' },
  { label: 'Fev/26', value: '2026-02' },
  { label: 'Jan/26', value: '2026-01' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => {
    // Simulação da chamada da API que acabamos de criar
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/dash?month=${selectedMonth}`);
        if (response.ok) {
          const data = await response.json();
          setDashData(data);
        } else {
          // Dados mocados temporários gerando números variados dependendo do mês
          setDashData({
            totalOperado: selectedMonth === 'all' ? 1500000.00 : Math.random() * 500000 + 100000,
            receitaBruta: selectedMonth === 'all' ? 45000.00 : Math.random() * 15000 + 5000,
            lucroLiquido: selectedMonth === 'all' ? 38000.00 : Math.random() * 12000 + 3000,
            rentabilidade: selectedMonth === 'all' ? 2.53 : (Math.random() * 2) + 1
          });
        }
      } catch (error) {
        console.log('Erro ao buscar dados do dashboard:', error);
        // Fallback de dados
        setDashData({
          totalOperado: selectedMonth === 'all' ? 1500000.00 : Math.random() * 500000 + 100000,
          receitaBruta: selectedMonth === 'all' ? 45000.00 : Math.random() * 15000 + 5000,
          lucroLiquido: selectedMonth === 'all' ? 38000.00 : Math.random() * 12000 + 3000,
          rentabilidade: selectedMonth === 'all' ? 2.53 : (Math.random() * 2) + 1
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [selectedMonth]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <ScrollView className="flex-1 bg-slate-900 pt-16" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6 px-6">
        <View>
          <Text className="text-white text-2xl font-bold">Olá, Usuário</Text>
          <Text className="text-slate-400">Resumo Geral</Text>
        </View>
        <TouchableOpacity 
          className="bg-slate-800 p-3 rounded-full"
          onPress={() => router.replace('/')}
        >
          <Feather name="log-out" size={20} color="#f87171" />
        </TouchableOpacity>
      </View>

      {/* Seletor de Meses */}
      <View className="mb-8">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}>
          {MONTHS.map((month) => {
            const isSelected = selectedMonth === month.value;
            return (
              <TouchableOpacity
                key={month.value}
                onPress={() => setSelectedMonth(month.value)}
                className={`px-5 py-2 rounded-full border ${
                  isSelected ? 'bg-sky-500 border-sky-400' : 'bg-slate-800 border-slate-700'
                }`}
              >
                <Text className={`font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                  {month.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* KPI Section - Integrado com a API */}
      <View className="mb-8 px-6">
        <Text className="text-slate-400 font-bold mb-4 uppercase tracking-wider text-xs">Indicadores Principais</Text>
        
        {loading ? (
          <View className="py-8">
            <ActivityIndicator size="large" color="#38bdf8" />
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {/* KPI 1 */}
            <View className="bg-slate-800 w-[48%] p-4 rounded-2xl mb-4 border border-slate-700">
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Total Operado</Text>
              <Text className="text-white font-bold text-lg" numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(dashData?.totalOperado || 0)}
              </Text>
            </View>

            {/* KPI 2 */}
            <View className="bg-slate-800 w-[48%] p-4 rounded-2xl mb-4 border border-slate-700">
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Receita Bruta</Text>
              <Text className="text-white font-bold text-lg" numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(dashData?.receitaBruta || 0)}
              </Text>
            </View>

            {/* KPI 3 */}
            <View className="bg-slate-800 w-[48%] p-4 rounded-2xl mb-4 border border-slate-700">
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Lucro Líquido</Text>
              <Text className="text-emerald-400 font-bold text-lg" numberOfLines={1} adjustsFontSizeToFit>
                {formatCurrency(dashData?.lucroLiquido || 0)}
              </Text>
            </View>

            {/* KPI 4 */}
            <View className="bg-slate-800 w-[48%] p-4 rounded-2xl mb-4 border border-slate-700">
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Rentabilidade</Text>
              <Text className="text-sky-400 font-bold text-lg">
                {dashData?.rentabilidade?.toFixed(2) || '0.00'}%
              </Text>
            </View>
          </View>
        )}
      </View>

      <View className="px-6">
        <Text className="text-slate-400 font-bold mb-4 uppercase tracking-wider text-xs">Acesso Rápido</Text>
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
          </TouchableOpacity>

          {/* Card Câmera */}
          <TouchableOpacity 
            className="bg-slate-800 w-full p-4 rounded-2xl mb-4 border border-slate-700 flex-row items-center"
            onPress={() => router.push('/(app)/camera')}
          >
            <View className="bg-emerald-500/20 w-12 h-12 rounded-xl items-center justify-center mr-4">
              <Feather name="camera" size={24} color="#34d399" />
            </View>
            <View>
              <Text className="text-white font-bold text-lg">Escanear Documento</Text>
              <Text className="text-slate-400 text-sm">Tirar foto para vistoria</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
