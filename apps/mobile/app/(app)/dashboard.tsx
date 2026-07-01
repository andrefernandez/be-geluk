import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

const API_URL = 'https://be-geluk.vercel.app/api/mobile';

const MONTHS = [
  { label: 'Geral (Todo Período)', value: 'all', short: 'Todos' },
  { label: 'Maio/26', value: '2026-05', short: 'Mai' },
  { label: 'Abril/26', value: '2026-04', short: 'Abr' },
  { label: 'Março/26', value: '2026-03', short: 'Mar' },
  { label: 'Fevereiro/26', value: '2026-02', short: 'Fev' },
  { label: 'Janeiro/26', value: '2026-01', short: 'Jan' },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isMonthModalVisible, setMonthModalVisible] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Busca os KPIs principais
        const res = await fetch(`${API_URL}/dash?month=${selectedMonth}`);
        if (res.ok) {
          const data = await res.json();
          setDashData(data);
        }

        // 2. Busca o histórico mês a mês na mão para montar o gráfico 
        // (Isso garante que o gráfico funcione AGORA sem você precisar dar push na Vercel)
        const historyPromises = MONTHS.filter(m => m.value !== 'all').slice().reverse().map(async (m) => {
          const r = await fetch(`${API_URL}/dash?month=${m.value}`);
          const monthData = await r.json();
          return {
            label: m.short,
            value: m.value,
            totalOperado: monthData.totalOperado || 0,
            lucroLiquido: monthData.lucroLiquido || 0,
            rentabilidade: monthData.rentabilidade || 0 // A API antiga devolvia 'rentabilidade'
          };
        });
        
        const historyResults = await Promise.all(historyPromises);
        setChartDataState(historyResults);

      } catch (error) {
        console.log('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  const [chartDataState, setChartDataState] = useState<any[]>([]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const chartData = chartDataState.length > 0 ? chartDataState : (dashData?.history || []);
  const maxChartValue = Math.max(...chartData.map((d: any) => d.totalOperado), 1);
  const selectedMonthLabel = MONTHS.find(m => m.value === selectedMonth)?.label;

  return (
    <View className="flex-1 bg-[#f7f7f9]">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140, paddingTop: 70 }} showsVerticalScrollIndicator={false}>
        
        {/* Logo Superior Centralizado */}
        <View className="px-6 mb-8 flex-row justify-between items-center">
          {/* Espaçador para manter o equilíbrio */}
          <View style={{ width: 40 }} />
          
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={{ width: 160, height: 55, tintColor: '#18181b' }} 
            resizeMode="contain" 
          />

          <TouchableOpacity onPress={() => router.replace('/')} className="bg-white border border-zinc-200 p-2.5 rounded-full shadow-sm shadow-zinc-200">
             <Feather name="log-out" size={18} color="#71717a" />
          </TouchableOpacity>
        </View>

        {/* Header - Seleção de Mês */}
        <View className="px-6 mb-8 flex-row justify-end items-center">
          <TouchableOpacity 
            className="bg-white border border-zinc-200 py-2 px-4 rounded-full flex-row items-center shadow-sm shadow-zinc-200/50"
            onPress={() => setMonthModalVisible(true)}
          >
            <Text className="text-zinc-900 font-bold text-sm mr-2">{selectedMonthLabel}</Text>
            <Feather name="chevron-down" size={16} color="#71717a" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#d4f34a" style={{ marginTop: 50 }} />
        ) : (
          <>
            {/* KPI 1: Total Operado (Destaque Principal) */}
            <View className="px-6 mb-6">
              <View className="bg-[#121212] rounded-[32px] p-7 relative overflow-hidden shadow-2xl shadow-zinc-900/20">
                <View className="absolute top-0 right-0 w-48 h-48 bg-[#d4f34a]/15 rounded-full -mr-20 -mt-20 blur-3xl" />
                <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-widest mb-3">Total Operado</Text>
                <Text className="text-white text-4xl font-extrabold tracking-tighter" numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(dashData?.totalOperado)}
                </Text>
              </View>
            </View>

            {/* Outros KPIs (Estilo Grid) */}
            <View className="px-6 mb-10 flex-row flex-wrap justify-between">
              
              {/* Receita Bruta */}
              <View className="bg-white w-[48%] rounded-[28px] p-5 mb-4 shadow-sm shadow-zinc-200/50 border border-zinc-100">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase mb-2">Receita Bruta</Text>
                <Text className="text-zinc-900 font-extrabold text-[18px]" numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(dashData?.receitaBruta)}
                </Text>
                <View className="mt-3">
                  <Text className="text-zinc-500 text-[10px]">IOF: {formatCurrency(dashData?.iofTotal)}</Text>
                  <Text className="text-zinc-500 text-[10px]">Rent.: {dashData?.rentabilidadeBruta?.toFixed(2)}%</Text>
                </View>
              </View>

              {/* Lucro Líquido */}
              <View className="bg-white w-[48%] rounded-[28px] p-5 mb-4 shadow-sm shadow-zinc-200/50 border border-zinc-100">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase mb-2">Lucro Líquido</Text>
                <Text className="text-[#65a30d] font-extrabold text-[18px]" numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(dashData?.lucroLiquido)}
                </Text>
                <View className="mt-3">
                  <Text className="text-zinc-500 text-[10px]">Rent. Líquida: {dashData?.rentabilidadeLiquida?.toFixed(2)}%</Text>
                </View>
              </View>

              {/* Custos Totais */}
              <View className="bg-white w-[48%] rounded-[28px] p-5 shadow-sm shadow-zinc-200/50 border border-zinc-100">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase mb-2">Custos Totais</Text>
                <Text className="text-zinc-900 font-extrabold text-[18px]" numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(dashData?.custos)}
                </Text>
              </View>

              {/* Operações (Volume) */}
              <View className="bg-white w-[48%] rounded-[28px] p-5 shadow-sm shadow-zinc-200/50 border border-zinc-100">
                <Text className="text-zinc-400 text-[10px] font-bold uppercase mb-2">Volume Declarado</Text>
                <Text className="text-[#0284c7] font-extrabold text-[18px]" numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(dashData?.valorDeclarado)}
                </Text>
                <Text className="text-zinc-500 text-[10px] mt-3">Declarado: {dashData?.percentualDeclarado?.toFixed(2)}%</Text>
              </View>
            </View>

            {/* Gráfico Histórico removido temporariamente a pedido do usuário */}
          </>
        )}

        {/* Seções */}
        <View className="px-6">
          <Text className="text-zinc-900 text-xl font-extrabold tracking-tight mb-5">Seções</Text>
          
          <View>
            {/* B.O's */}
            <TouchableOpacity 
              className="bg-white flex-row items-center p-5 rounded-[28px] mb-4 shadow-sm shadow-zinc-200/30 border border-zinc-100/80"
              onPress={() => router.push('/(app)/bos')}
            >
              <View className="w-14 h-14 rounded-full bg-zinc-50 items-center justify-center mr-5">
                <Feather name="alert-circle" size={22} color="#18181b" />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-900 font-bold text-[17px] mb-1">B.O's</Text>
                <Text className="text-zinc-400 text-[12px]">Pendências e Tarefas</Text>
              </View>
              <View className="bg-zinc-50 w-10 h-10 rounded-full items-center justify-center">
                <Feather name="chevron-right" size={18} color="#a1a1aa" />
              </View>
            </TouchableOpacity>

            {/* Acordos */}
            <TouchableOpacity 
              className="bg-white flex-row items-center p-5 rounded-[28px] mb-4 shadow-sm shadow-zinc-200/30 border border-zinc-100/80"
              onPress={() => router.push('/(app)/agreements')}
            >
              <View className="w-14 h-14 rounded-full bg-[#d4f34a]/20 items-center justify-center mr-5">
                <Feather name="file-text" size={22} color="#65a30d" />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-900 font-bold text-[17px] mb-1">Acordos</Text>
                <Text className="text-zinc-400 text-[12px]">Negociações ativas</Text>
              </View>
              <View className="bg-zinc-50 w-10 h-10 rounded-full items-center justify-center">
                <Feather name="chevron-right" size={18} color="#a1a1aa" />
              </View>
            </TouchableOpacity>

            {/* Investidores */}
            <TouchableOpacity 
              className="bg-white flex-row items-center p-5 rounded-[28px] mb-4 shadow-sm shadow-zinc-200/30 border border-zinc-100/80"
              onPress={() => router.push('/(app)/investors')}
            >
              <View className="w-14 h-14 rounded-full bg-sky-50 items-center justify-center mr-5">
                <Feather name="trending-up" size={22} color="#0284c7" />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-900 font-bold text-[17px] mb-1">Investidores</Text>
                <Text className="text-zinc-400 text-[12px]">Captação e carteira</Text>
              </View>
              <View className="bg-zinc-50 w-10 h-10 rounded-full items-center justify-center">
                <Feather name="chevron-right" size={18} color="#a1a1aa" />
              </View>
            </TouchableOpacity>

            {/* Usuários */}
            <TouchableOpacity 
              className="bg-white flex-row items-center p-5 rounded-[28px] shadow-sm shadow-zinc-200/30 border border-zinc-100/80"
              onPress={() => router.push('/(app)/users')}
            >
              <View className="w-14 h-14 rounded-full bg-purple-50 items-center justify-center mr-5">
                <Feather name="users" size={22} color="#9333ea" />
              </View>
              <View className="flex-1">
                <Text className="text-zinc-900 font-bold text-[17px] mb-1">Usuários</Text>
                <Text className="text-zinc-400 text-[12px]">Gestão de acessos</Text>
              </View>
              <View className="bg-zinc-50 w-10 h-10 rounded-full items-center justify-center">
                <Feather name="chevron-right" size={18} color="#a1a1aa" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Modal de Seleção de Mês */}
      <Modal
        visible={isMonthModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMonthModalVisible(false)}
      >
        <Pressable 
          className="flex-1 bg-black/40 justify-end" 
          onPress={() => setMonthModalVisible(false)}
        >
          <Pressable className="bg-white rounded-t-[36px] p-6 pb-12">
            <View className="w-12 h-1.5 bg-zinc-200 rounded-full self-center mb-6" />
            <Text className="text-zinc-900 text-xl font-bold mb-6 px-2">Selecione o Período</Text>
            
            {MONTHS.map((month) => {
              const isSelected = selectedMonth === month.value;
              return (
                <TouchableOpacity
                  key={month.value}
                  onPress={() => {
                    setSelectedMonth(month.value);
                    setMonthModalVisible(false);
                  }}
                  className={`flex-row justify-between items-center p-4 mb-2 rounded-2xl ${isSelected ? 'bg-[#d4f34a]/20' : 'bg-transparent'}`}
                >
                  <Text className={`text-[16px] font-bold ${isSelected ? 'text-[#65a30d]' : 'text-zinc-700'}`}>
                    {month.label}
                  </Text>
                  {isSelected && <Feather name="check" size={20} color="#65a30d" />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
