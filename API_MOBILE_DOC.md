# Documentação da API - Be-Geluk

Esta documentação descreve os endpoints disponíveis no backend do sistema Be-Geluk, focando especialmente na integração com o aplicativo mobile.

## Base URL
- **Local:** `http://localhost:3000/api`
- **Produção (Vercel):** `https://be-geluk.vercel.app/api`

---

## 1. Autenticação Mobile

### **POST** `/mobile/login`
Autentica um usuário para acesso via aplicativo mobile.

**Corpo da Requisição (JSON):**
```json
{
  "email": "usuario@exemplo.com",
  "password": "sua_senha_aqui"
}
```

**Resposta de Sucesso (200 OK):**
```json
{
  "id": "cl...id_usuario",
  "name": "Nome do Usuário",
  "email": "usuario@exemplo.com",
  "role": "ADMIN" // ou "USER", "INVESTOR", "CONTADOR", "COMERCIAL"
}
```

**Resposta de Erro (401 Unauthorized):**
```json
{ "error": "Credenciais inválidas" }
```

---

## 2. Dashboard Financeiro

### **GET** `/mobile/dash`
Retorna os indicadores chave de desempenho (KPIs) financeiros.

**Parâmetros de Query:**
- `month` (opcional): Filtra os dados por um mês específico no formato `YYYY-MM` (ex: `2026-04`). Se omitido ou definido como `all`, retorna o consolidado do ano de 2026.

**Resposta de Sucesso (200 OK):**
```json
{
  "totalOperado": 3379378.33,
  "receitaBruta": 523327.82,
  "lucroLiquido": 22906.79,
  "rentabilidade": 0.677,
  "percentualDeclarado": 100,
  "custos": 500421.03
}
```

---

## 3. Clientes

### **GET** `/mobile/clients`
Retorna uma lista dos clientes cadastrados no sistema.

**Resposta de Sucesso (200 OK):**
```json
[
  {
    "id": "cl...",
    "name": "Nome do Cliente",
    "cnpj": "00.000.000/0001-00",
    "status": "ACTIVE",
    "taxaFator": 2.5,
    "taxaAdValorem": 0.5,
    "taxaTarifa": 15.0,
    "representativeId": "cl..."
  }
]
```
*Nota: Retorna os primeiros 20 clientes ordenados por nome.*

---

## 4. Operações

### **GET** `/mobile/operations`
Retorna a lista das operações financeiras mais recentes.

**Resposta de Sucesso (200 OK):**
```json
[
  {
    "id": "cl...",
    "date": "2026-04-27T00:00:00.000Z",
    "valorBruto": 15000.00,
    "valorLiquido": 14250.00,
    "fator": 375.00,
    "tarifas": 15.00,
    "adValorem": 75.00,
    "client": {
      "name": "Nome do Cliente"
    }
  }
]
```
*Nota: Retorna as últimas 20 operações ordenadas por data decrescente.*

---

## Observações Técnicas

### CORS (Cross-Origin Resource Sharing)
O backend está configurado para permitir requisições de origens externas (especialmente para o desenvolvimento mobile web na porta 8081). Se encontrar erros de CORS, certifique-se de que o servidor Next.js foi reiniciado após as últimas alterações no `next.config.ts`.

### Segurança
Atualmente, as rotas `/mobile/clients`, `/mobile/operations` e `/mobile/dash` não exigem Token JWT no header para facilitar o desenvolvimento inicial, mas recomenda-se a implementação de proteção por middleware em fases futuras de produção.
