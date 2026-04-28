import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    // Aqui vai a chamada de API depois
    console.log('Login with:', email, password);
    router.replace('/(app)/dashboard');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-900"
    >
      <View className="flex-1 justify-center px-6">
        <View className="mb-12 items-center">
          <Text className="text-3xl font-extrabold text-white tracking-widest mb-2">BE GELUK</Text>
          <Text className="text-base text-slate-400">Acesse o portal do cliente</Text>
        </View>

        <View className="w-full">
          <View className="mb-5">
            <Text className="text-sm font-semibold text-slate-300 mb-2 ml-1">E-mail</Text>
            <View className="flex-row items-center bg-slate-800 rounded-2xl border border-slate-700 px-4 h-14">
              <Feather name="mail" size={20} color="#64748b" className="mr-3" />
              <TextInput
                className="flex-1 text-white text-base h-full"
                placeholder="seu@email.com"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-sm font-semibold text-slate-300 mb-2 ml-1">Senha</Text>
            <View className="flex-row items-center bg-slate-800 rounded-2xl border border-slate-700 px-4 h-14">
              <Feather name="lock" size={20} color="#64748b" className="mr-3" />
              <TextInput
                className="flex-1 text-white text-base h-full"
                placeholder="••••••••"
                placeholderTextColor="#475569"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                className="p-2"
                onPress={() => setShowPassword(!showPassword)}
              >
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity className="self-end mb-8">
            <Text className="text-sky-400 text-sm font-semibold">Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="bg-sky-500 rounded-2xl h-14 flex-row items-center justify-center gap-2"
            onPress={handleLogin}
          >
            <Text className="text-white text-base font-bold">Entrar</Text>
            <Feather name="arrow-right" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
