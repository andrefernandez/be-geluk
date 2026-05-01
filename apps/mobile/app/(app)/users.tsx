import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

const API_URL = 'https://be-geluk.vercel.app/api/mobile/users';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  USER: 'Usuário',
  MANAGER: 'Gestor',
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  ADMIN: { bg: '#fef3c7', text: '#d97706' },
  USER: { bg: '#f0fdf4', text: '#16a34a' },
  MANAGER: { bg: '#eff6ff', text: '#2563eb' },
};

export default function UsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
            <Text className="text-zinc-900 text-2xl font-bold">Usuários</Text>
            <Text className="text-zinc-400 text-sm">{users.length} cadastrado(s)</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#18181b" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24 }}
          renderItem={({ item }) => {
            const roleStyle = ROLE_COLORS[item.role] || ROLE_COLORS['USER'];
            const roleLabel = ROLE_LABELS[item.role] || item.role;
            return (
              <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm shadow-zinc-200/80 border border-zinc-100">
                <View className="flex-row items-center">
                  {/* Avatar */}
                  <View className="w-12 h-12 rounded-full bg-zinc-100 items-center justify-center mr-4">
                    <Text className="text-zinc-900 font-bold text-lg">
                      {item.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1">
                    <Text className="text-zinc-900 font-bold text-[16px]">{item.name}</Text>
                    <Text className="text-zinc-400 text-sm" numberOfLines={1}>{item.email}</Text>
                    {item.createdAt && (
                      <Text className="text-zinc-300 text-xs mt-1">
                        Desde {formatDate(item.createdAt)}
                      </Text>
                    )}
                  </View>

                  {/* Role badge */}
                  <View
                    style={{ backgroundColor: roleStyle.bg }}
                    className="px-3 py-1 rounded-full"
                  >
                    <Text style={{ color: roleStyle.text }} className="text-xs font-bold">
                      {roleLabel}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text className="text-zinc-400 text-center mt-10">Nenhum usuário encontrado.</Text>
          }
        />
      )}
    </View>
  );
}
