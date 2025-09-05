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
4. Salvar

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
