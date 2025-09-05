# 🔥 Configuração Firebase - Armazenamento em Nuvem

## 📋 O que é o Firebase?
- **Gratuito** até 1GB de dados e 50k leituras/dia
- **Banco de dados em tempo real** (Firestore)
- **Autenticação** integrada
- **Funciona offline** e sincroniza quando volta online

## 🚀 Passos para Configurar

### 1. Criar Projeto Firebase
1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em "Criar projeto"
3. Nome: `meu-torneio-pro`
4. Desabilite Google Analytics (opcional)
5. Clique em "Criar projeto"

### 2. Configurar Firestore Database
1. No menu lateral, clique em "Firestore Database"
2. Clique em "Criar banco de dados"
3. Escolha "Iniciar no modo de teste" (por enquanto)
4. Escolha a localização mais próxima (southamerica-east1)

### 3. Configurar Authentication
1. No menu lateral, clique em "Authentication"
2. Vá na aba "Sign-in method"
3. Ative "Email/senha"
4. Clique em "Salvar"

### 4. Registrar App Web
1. Na página inicial do projeto, clique no ícone `</>`
2. Nome do app: `TourneyPro`
3. **NÃO** marque "Firebase Hosting"
4. Clique em "Registrar app"
5. **COPIE** as configurações que aparecem

### 5. Atualizar Código
No arquivo `js/cloud-storage.js`, substitua:

```javascript
this.firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 6. Adicionar Firebase ao HTML
No `index.html`, adicione antes do `</body>`:

```html
<!-- Firebase -->
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-auth-compat.js"></script>

<!-- Seu código -->
<script src="js/cloud-storage.js"></script>
```

## 🔧 Como Funciona

### ✅ Modo Híbrido:
- **Offline:** Dados salvos no localStorage
- **Online + Logado:** Dados sincronizados com Firebase
- **Automático:** Sincroniza quando volta online

### 🔐 Autenticação:
- **Com Firebase:** Login real, dados na nuvem
- **Sem Firebase:** Modo local, dados no navegador

### 📊 Vantagens:
- **Sempre funciona** (mesmo offline)
- **Dados seguros** na nuvem
- **Acesso de qualquer lugar**
- **Backup automático**
- **Gratuito** para uso pessoal

## 🛠️ Integração com App Atual

Modifique o `js/app.js` para usar o cloudStorage:

```javascript
// Substituir localStorage por cloudStorage
// De:
localStorage.setItem('tournaments', JSON.stringify(tournaments));

// Para:
cloudStorage.saveData('tournaments', tournaments);

// De:
const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]');

// Para:
const tournaments = cloudStorage.loadData('tournaments');
```

## 🔒 Regras de Segurança (Firestore)

No console Firebase > Firestore > Regras, use:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários só acessam seus próprios dados
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 📱 Teste

1. **Sem login:** Dados salvos localmente
2. **Com login:** Dados sincronizados na nuvem
3. **Offline:** Continua funcionando
4. **Volta online:** Sincroniza automaticamente

## 💰 Limites Gratuitos

- **Armazenamento:** 1 GB
- **Leituras:** 50.000/dia
- **Escritas:** 20.000/dia
- **Usuários:** Ilimitados

Para um sistema de torneios pessoal, é mais que suficiente!