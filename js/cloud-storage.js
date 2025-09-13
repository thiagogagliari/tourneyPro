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

    this.initFirebase();
  }

  async initFirebase() {
    try {
      if (typeof firebase !== "undefined") {
        firebase.initializeApp(this.firebaseConfig);
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.firebaseReady = true;

        // Listener de autenticação
        this.auth.onAuthStateChanged((user) => {
          this.currentUser = user;
        });
      }
    } catch (error) {
      console.error("Erro ao inicializar Firebase:", error);
    }
  }



  // Salvar dados apenas no Firebase
  async saveData(key, data) {
    if (!this.firebaseReady || !this.currentUser) {
      throw new Error("Usuário não logado ou Firebase não disponível");
    }
    return await this.saveToCloud(key, data);
  }

  // Carregar dados apenas do Firebase
  async loadData(key) {
    if (!this.firebaseReady || !this.currentUser) {
      return [];
    }
    const data = await this.loadFromCloud(key);
    return data || [];
  }

  // Remover campos undefined de um objeto
  cleanData(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanData(item));
    }
    if (obj && typeof obj === 'object') {
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
      // Limpar dados removendo undefined
      const cleanedData = this.cleanData(data);
      console.log(`Salvando ${key} na nuvem:`, cleanedData.length, "itens");
      await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .collection("data")
        .doc(key)
        .set({
          data: cleanedData,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        });
      console.log(`${key} salvo com sucesso na nuvem`);
    } catch (error) {
      console.error("Erro ao salvar na nuvem:", error);
      throw error;
    }
  }

  // Carregar da nuvem
  async loadFromCloud(key) {
    if (!this.firebaseReady || !this.currentUser) return null;

    try {
      console.log(`Carregando ${key} da nuvem...`);
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



  // Autenticação
  async signIn(email, password) {
    if (!this.firebaseReady) {
      return {
        success: false,
        error: "Firebase não disponível",
      };
    }

    try {
      const result = await this.auth.signInWithEmailAndPassword(
        email,
        password
      );
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signUp(email, password) {
    if (!this.firebaseReady) {
      return {
        success: false,
        error: "Firebase não disponível",
      };
    }

    try {
      const result = await this.auth.createUserWithEmailAndPassword(
        email,
        password
      );
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    if (this.firebaseReady && this.auth) {
      await this.auth.signOut();
    }
    this.currentUser = null;
  }

  // Status da conexão
  getStatus() {
    return {
      firebaseReady: this.firebaseReady,
      loggedIn: !!this.currentUser,
      mode: "Firebase Online",
    };
  }
}

// Instância global
const cloudStorage = new CloudStorage();
