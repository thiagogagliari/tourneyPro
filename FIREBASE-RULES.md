# Regras do Firebase para TourneyPro

## 🔧 Configuração Necessária

Para que o sistema funcione corretamente, você precisa configurar as seguintes regras no Firebase Console:

### 1. Firestore Security Rules

Acesse o Firebase Console → Firestore Database → Rules e configure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura pública da coleção public
    match /public/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Permitir acesso aos dados do usuário autenticado
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /data/{document} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 2. Authentication

Acesse Firebase Console → Authentication → Sign-in method e habilite:

- **Email/Password**: Para login de usuários
- **Anonymous**: Para acesso público de leitura

### 3. Estrutura de Dados

O sistema usa a seguinte estrutura:

```
/public/
  tournaments/
    data: [array de todos os torneios]
  clubs/
    data: [array de todos os clubes]
  players/
    data: [array de todos os jogadores]
  matches/
    data: [array de todas as partidas]
  coaches/
    data: [array de todos os treinadores]

/users/{userId}/
  data/
    tournaments/
      data: [torneios do usuário]
    clubs/
      data: [clubes do usuário]
    players/
      data: [jogadores do usuário]
    matches/
      data: [partidas do usuário]
    coaches/
      data: [treinadores do usuário]
```

## 🚀 Como Funciona

### Sistema Principal (index.html)
1. Usuário faz login com email/senha
2. Dados são salvos em `/users/{userId}/data/`
3. Dados também são copiados para `/public/` para visibilidade global

### Visualizador Público (public.html)
1. Usa autenticação anônima automaticamente
2. Lê dados apenas da coleção `/public/`
3. Mostra todos os torneios de todos os usuários

## ⚠️ Importante

- As regras permitem **leitura pública** da coleção `public`
- Apenas usuários **autenticados** podem escrever
- Cada usuário só pode editar seus **próprios dados**
- Dados são **automaticamente compartilhados** na coleção pública

## 🔍 Verificação

Para testar se as regras estão funcionando:

1. Abra `public.html` - deve carregar torneios sem login
2. Faça login em `index.html` - deve permitir criar torneios
3. Verifique se novos torneios aparecem em `public.html`

## 🛠️ Solução de Problemas

### Erro "Missing or insufficient permissions"
- Verifique se as regras do Firestore estão configuradas corretamente
- Confirme se a autenticação anônima está habilitada
- Teste as regras no Firebase Console

### Dados não aparecem no visualizador público
- Verifique se os dados estão sendo salvos na coleção `public`
- Confirme se a estrutura de dados está correta
- Verifique o console do navegador para erros