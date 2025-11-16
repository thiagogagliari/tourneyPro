// Sistema apenas Firebase (online)
class CloudStorage {
  constructor() {
    this.currentUser = null;
    this.firebaseReady = false;

    // Configuração do Firebase
    this.firebaseConfig = {
      apiKey: "AIzaSyD4fzDTkT8PYZzxzJL9pEaFUIx0V0H8gPk",
      authDomain: "meu-torneio-pro.firebaseapp.com",
      projectId: "meu-torneio-pro",
      storageBucket: "meu-torneio-pro.firebasestorage.app",
      messagingSenderId: "769236217387",
      appId: "1:769236217387:web:7f188f16c93da66a99446e",
    };

    // Verificar usuário local primeiro
    this.checkLocalUser();
    
    // Inicializar Firebase
    this.initFirebase();
  }

  async initFirebase() {
    try {
      // Verificar se Firebase está disponível
      if (typeof firebase === "undefined") {
        console.warn("Firebase não carregado - modo offline");
        return;
      }

      // Verificar se já foi inicializado
      if (firebase.apps.length === 0) {
        firebase.initializeApp(this.firebaseConfig);
      }
      
      this.db = firebase.firestore();
      this.auth = firebase.auth();
      
      // Testar conectividade
      await this.testConnection();
      
      this.firebaseReady = true;
      console.log("Firebase inicializado com sucesso");

      // Listener de autenticação
      this.auth.onAuthStateChanged((user) => {
        this.currentUser = user;
      });
    } catch (error) {
      console.error("Erro ao inicializar Firebase:", error);
      this.firebaseReady = false;
    }
  }

  async testConnection() {
    try {
      // Teste simples de conectividade
      await this.db.collection('test').limit(1).get();
    } catch (error) {
      if (error.code === 'unavailable' || error.message.includes('network')) {
        throw new Error('Sem conexão com a internet');
      }
      throw error;
    }
  }

  // Salvar dados (Firebase ou localStorage como fallback)
  async saveData(key, data) {
    if (this.firebaseReady && this.currentUser) {
      try {
        return await this.saveToCloud(key, data);
      } catch (error) {
        console.warn('Erro ao salvar no Firebase, usando localStorage:', error);
        return this.saveToLocal(key, data);
      }
    } else {
      return this.saveToLocal(key, data);
    }
  }

  // Carregar dados (Firebase ou localStorage como fallback)
  async loadData(key) {
    if (this.firebaseReady && this.currentUser) {
      try {
        const data = await this.loadFromCloud(key);
        return data || [];
      } catch (error) {
        console.warn('Erro ao carregar do Firebase, usando localStorage:', error);
        return this.loadFromLocal(key);
      }
    } else {
      return this.loadFromLocal(key);
    }
  }

  // Métodos de localStorage como fallback
  saveToLocal(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`${key} salvo no localStorage`);
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  }

  loadFromLocal(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao carregar do localStorage:', error);
      return [];
    }
  }

  // Remover campos undefined de um objeto
  cleanData(obj) {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.cleanData(item));
    }
    if (obj && typeof obj === "object") {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.cleanData(value);
        }
      }
      return cleaned;
    }
    return obj;
  }

  // Salvar na nuvem
  async saveToCloud(key, data) {
    if (!this.firebaseReady || !this.currentUser) {
      throw new Error("Firebase não disponível ou usuário não logado");
    }

    try {
      const cleanedData = this.cleanData(data);
      console.log(`Salvando ${key} na nuvem:`, cleanedData.length, "itens");

      // Para players, dividir em chunks para evitar limite de 1MB
      if (key === "players" && cleanedData.length > 50) {
        await this.savePlayersInChunks(cleanedData);
      } else {
        await this.db
          .collection("users")
          .doc(this.currentUser.uid)
          .collection("data")
          .doc(key)
          .set({
            data: cleanedData,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
          });
      }
      console.log(`${key} salvo com sucesso na nuvem`);
    } catch (error) {
      console.error("Erro ao salvar na nuvem:", error);
      throw error;
    }
  }

  // Salvar jogadores em chunks
  async savePlayersInChunks(players) {
    const chunkSize = 50;
    const chunks = [];

    for (let i = 0; i < players.length; i += chunkSize) {
      chunks.push(players.slice(i, i + chunkSize));
    }

    const batch = this.db.batch();

    // Limpar documentos antigos
    const existingDocs = await this.db
      .collection("users")
      .doc(this.currentUser.uid)
      .collection("data")
      .where(firebase.firestore.FieldPath.documentId(), ">=", "players")
      .where(firebase.firestore.FieldPath.documentId(), "<", "playerz")
      .get();

    existingDocs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Salvar novos chunks
    chunks.forEach((chunk, index) => {
      const docRef = this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .collection("data")
        .doc(`players_${index}`);

      batch.set(docRef, {
        data: chunk,
        chunkIndex: index,
        totalChunks: chunks.length,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  }

  // Carregar da nuvem
  async loadFromCloud(key) {
    if (!this.firebaseReady || !this.currentUser) return null;

    try {
      console.log(`Carregando ${key} da nuvem...`);

      // Para players, carregar de múltiplos chunks
      if (key === "players") {
        return await this.loadPlayersFromChunks();
      }

      const doc = await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .collection("data")
        .doc(key)
        .get();

      if (doc.exists) {
        const data = doc.data().data;
        console.log(`${key} carregado da nuvem:`, data.length, "itens");
        return data;
      } else {
        console.log(`${key} não encontrado na nuvem`);
        return [];
      }
    } catch (error) {
      console.error("Erro ao carregar da nuvem:", error);
      throw error;
    }
  }

  // Carregar jogadores de chunks
  async loadPlayersFromChunks() {
    try {
      const playerDocs = await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .collection("data")
        .where(firebase.firestore.FieldPath.documentId(), ">=", "players_")
        .where(firebase.firestore.FieldPath.documentId(), "<", "players`")
        .orderBy(firebase.firestore.FieldPath.documentId())
        .get();

      if (playerDocs.empty) {
        // Tentar carregar do documento único antigo
        const oldDoc = await this.db
          .collection("users")
          .doc(this.currentUser.uid)
          .collection("data")
          .doc("players")
          .get();

        if (oldDoc.exists) {
          return oldDoc.data().data || [];
        }
        return [];
      }

      let allPlayers = [];
      playerDocs.forEach((doc) => {
        const data = doc.data().data || [];
        allPlayers = allPlayers.concat(data);
      });

      console.log(`players carregado da nuvem:`, allPlayers.length, "itens");
      return allPlayers;
    } catch (error) {
      console.error("Erro ao carregar players da nuvem:", error);
      return [];
    }
  }

  // Autenticação
  async signIn(email, password) {
    if (this.firebaseReady) {
      try {
        const result = await this.auth.signInWithEmailAndPassword(email, password);
        return { success: true, user: result.user };
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Autenticação local como fallback
      return this.signInLocal(email, password);
    }
  }

  async signUp(email, password) {
    if (this.firebaseReady) {
      try {
        const result = await this.auth.createUserWithEmailAndPassword(email, password);
        return { success: true, user: result.user };
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Registro local como fallback
      return this.signUpLocal(email, password);
    }
  }

  // Autenticação local
  signInLocal(email, password) {
    const users = JSON.parse(localStorage.getItem('localUsers') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      this.currentUser = { uid: user.id, email: user.email };
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      return { success: true, user: this.currentUser };
    } else {
      return { success: false, error: 'Email ou senha inválidos' };
    }
  }

  signUpLocal(email, password) {
    const users = JSON.parse(localStorage.getItem('localUsers') || '[]');
    
    if (users.find(u => u.email === email)) {
      return { success: false, error: 'Email já cadastrado' };
    }
    
    const newUser = {
      id: Date.now().toString(),
      email,
      password,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('localUsers', JSON.stringify(users));
    
    this.currentUser = { uid: newUser.id, email: newUser.email };
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    
    return { success: true, user: this.currentUser };
  }

  async signOut() {
    if (this.firebaseReady && this.auth) {
      await this.auth.signOut();
    }
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  // Verificar se há usuário logado localmente
  checkLocalUser() {
    if (!this.currentUser) {
      const localUser = localStorage.getItem('currentUser');
      if (localUser) {
        this.currentUser = JSON.parse(localUser);
      }
    }
  }

  // Status da conexão
  getStatus() {
    this.checkLocalUser();
    return {
      firebaseReady: this.firebaseReady,
      loggedIn: !!this.currentUser,
      mode: this.firebaseReady ? "Firebase Online" : "Modo Local",
    };
  }
}

// Instância global
const cloudStorage = new CloudStorage();
