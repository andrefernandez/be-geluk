import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorField, setErrorField] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email && !password) {
      setErrorField('both');
      Alert.alert('Atenção', 'Por favor, preencha o e-mail e a senha.');
      return;
    }
    if (!email) {
      setErrorField('email');
      Alert.alert('Atenção', 'Por favor, preencha o e-mail.');
      return;
    }
    if (!password) {
      setErrorField('password');
      Alert.alert('Atenção', 'Por favor, preencha a senha.');
      return;
    }

    setLoading(true);
    setErrorField(null);
    try {
      const response = await fetch('https://be-geluk.vercel.app/api/mobile/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorField('general');
        Alert.alert('Erro de Acesso', data.error || 'E-mail ou senha inválidos.');
        return;
      }

      // Login bem-sucedido
      router.replace('/(app)/dashboard');
    } catch (error) {
      Alert.alert('Erro de Conexão', 'Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const hasEmailError = errorField === 'email' || errorField === 'both' || errorField === 'general';
  const hasPasswordError = errorField === 'password' || errorField === 'both' || errorField === 'general';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-[#f7f7f9]"
    >
      <View className="flex-1 justify-center px-8">
        <View className="mb-14 items-center">
          <Image 
            source={require('../assets/images/logo.png')} 
            style={{ width: 180, height: 60, tintColor: '#18181b', marginBottom: 16 }} 
            resizeMode="contain" 
          />
          <Text className="text-[15px] font-medium text-zinc-500">Acesse sua conta para continuar</Text>
        </View>

        <View className="w-full">
          <View className="mb-5">
            <Text className="text-[13px] font-bold uppercase tracking-wider text-zinc-400 mb-2 ml-2">E-mail</Text>
            <View className={`flex-row items-center bg-white rounded-[24px] border px-5 h-[60px] shadow-sm shadow-zinc-200/50 ${hasEmailError ? 'border-red-500' : 'border-zinc-200/80'}`}>
              <Feather name="mail" size={20} color={hasEmailError ? '#ef4444' : '#a1a1aa'} className="mr-3" />
              <TextInput
                className="flex-1 text-zinc-900 text-[16px] h-full font-medium"
                placeholder="seu@email.com"
                placeholderTextColor="#d4d4d8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errorField) setErrorField(null);
                }}
                editable={!loading}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-[13px] font-bold uppercase tracking-wider text-zinc-400 mb-2 ml-2">Senha</Text>
            <View className={`flex-row items-center bg-white rounded-[24px] border px-5 h-[60px] shadow-sm shadow-zinc-200/50 ${hasPasswordError ? 'border-red-500' : 'border-zinc-200/80'}`}>
              <Feather name="lock" size={20} color={hasPasswordError ? '#ef4444' : '#a1a1aa'} className="mr-3" />
              <TextInput
                className="flex-1 text-zinc-900 text-[16px] h-full font-medium"
                placeholder="••••••••"
                placeholderTextColor="#d4d4d8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorField) setErrorField(null);
                }}
                editable={!loading}
              />
              <TouchableOpacity
                className="p-2 -mr-2"
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={hasPasswordError ? '#ef4444' : '#a1a1aa'} />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-10" />

          <TouchableOpacity 
            className={`rounded-[24px] h-[60px] flex-row items-center justify-center shadow-lg shadow-zinc-900/20 ${loading ? 'bg-zinc-700' : 'bg-[#18181b]'}`}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text className="text-white text-[16px] font-bold mr-2">Entrar</Text>
                <Feather name="arrow-right" size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
