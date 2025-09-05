# 🔥 Firebase - Configuração Rápida

## 1. Criar Projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique "Criar projeto"
3. Nome: `meu-torneio-pro`
4. Desabilite Analytics
5. Clique "Criar projeto"

## 2. Configurar Firestore

1. Menu lateral > "Firestore Database"
2. "Criar banco de dados"
3. "Iniciar no modo de teste"
4. Escolha localização: `southamerica-east1`

## 3. Configurar Authentication

1. Menu lateral > "Authentication"
2. Aba "Sign-in method"
3. Ative "Email/senha"
4. Aba "Settings"
5. Seção "Authorized domains"
6. Clique "Add domain"
7. Adicione: `meutorneiopro.vercel.app`
8. Salvar

## 4. Registrar App Web

1. Página inicial do projeto > ícone `</>`
2. Nome: `TourneyPro`
3. **NÃO** marque Firebase Hosting
4. "Registrar app"
5. **COPIE** as configurações

## 5. Atualizar Código

No arquivo `js/cloud-storage.js`, linha 8-14, substitua:

```javascript
this.firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

## 6. Testar

1. Abra o site
2. **Sem login:** Dados salvos localmente
3. **Com login:** Dados sincronizados na nuvem

## ✅ Pronto!

Agora seus dados ficam salvos na nuvem e sincronizam automaticamente!

## 🔧 Problemas Comuns

### Erro: "Domain not authorized"
**Solução:**
1. Firebase Console > Authentication > Settings
2. Aba "Authorized domains"
3. Adicione seu domínio (ex: `meutorneiopro.vercel.app`)
4. Aguarde alguns minutos para propagar

### Dados não aparecem
**Verificar:**
1. Console do navegador (F12) para erros
2. Configuração do Firebase está correta
3. Regras do Firestore em modo teste
4. Usuário está logado no Firebase
