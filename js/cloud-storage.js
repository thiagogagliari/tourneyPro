// Sistema híbrido: localStorage + Firebase
class CloudStorage {
  constructor() {
    this.isOnline = navigator.onLine;
    this.currentUser = null;
    this.firebaseReady = false;

    // Configuração do Firebase (substitua pelos seus dados)
    this.firebaseConfig = {
      apiKey: "AIzaSyD4fzDTkT8PYZzxzJL9pEaFUIx0V0H8gPk", // Substitua pela sua API Key
      authDomain: "meu-torneio-pro.firebaseapp.com",
      projectId: "meu-torneio-pro",
      storageBucket: "meu-torneio-pro.firebasestorage.app",
      messagingSenderId: "769236217387",
      appId: "1:769236217387:web:7f188f16c93da66a99446e",
    };

    this.initFirebase();
    this.setupEventListeners();
  }

  async initFirebase() {
    try {
      // Verifica se Firebase está disponível
      if (typeof firebase !== "undefined") {
        firebase.initializeApp(this.firebaseConfig);
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.firebaseReady = true;

        // Listener de autenticação
        this.auth.onAuthStateChanged((user) => {
          this.currentUser = user;
          if (user && this.isOnline) {
            this.syncToCloud();
          }
        });
      }
    } catch (error) {
      console.log("Firebase não disponível, usando apenas localStorage");
    }
  }

  setupEventListeners() {
    // Detecta quando fica online/offline
    window.addEventListener("online", () => {
      this.isOnline = true;
      if (this.currentUser) this.syncToCloud();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  // Salvar dados (sempre localStorage + nuvem se possível)
  saveData(key, data) {
    // Sempre salva no localStorage
    localStorage.setItem(key, JSON.stringify(data));

    // Se online e logado, salva na nuvem
    if (this.isOnline && this.currentUser && this.firebaseReady) {
      this.saveToCloud(key, data);
    }
  }

  // Carregar dados (apenas localStorage)
  loadData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  // Salvar na nuvem
  async saveToCloud(key, data) {
    if (!this.firebaseReady || !this.currentUser) return;

    try {
      console.log(`Salvando ${key} na nuvem:`, data.length, "itens");
      await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .collection("data")
        .doc(key)
        .set({
          data: data,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        });
      console.log(`${key} salvo com sucesso na nuvem`);
    } catch (error) {
      console.log("Erro ao salvar na nuvem:", error);
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
        return null;
      }
    } catch (error) {
      console.log("Erro ao carregar da nuvem:", error);
      return null;
    }
  }

  // Sincronizar todos os dados para a nuvem
  async syncToCloud() {
    if (!this.firebaseReady || !this.currentUser) return;

    const keys = [
      "tournaments",
      "clubs",
      "players",
      "matches",
      "rounds",
      "coaches",
      "users",
    ];

    for (const key of keys) {
      const localData = this.loadData(key);
      if (localData.length > 0) {
        await this.saveToCloud(key, localData);
      }
    }
  }

  // Sincronizar da nuvem para localStorage
  async syncFromCloud() {
    if (!this.firebaseReady || !this.currentUser) return;

    const keys = [
      "tournaments",
      "clubs", 
      "players",
      "matches",
      "rounds",
      "coaches",
      "users",
    ];

    for (const key of keys) {
      const cloudData = await this.loadFromCloud(key);
      if (cloudData && cloudData.length > 0) {
        localStorage.setItem(key, JSON.stringify(cloudData));
      }
    }
  }

  // Autenticação
  async signIn(email, password) {
    if (!this.firebaseReady) {
      return {
        success: false,
        error: "Modo offline - dados salvos localmente",
      };
    }

    try {
      const result = await this.auth.signInWithEmailAndPassword(
        email,
        password
      );
      // Após login, sincroniza dados da nuvem
      await this.syncFromCloud();
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signUp(email, password) {
    if (!this.firebaseReady) {
      return {
        success: false,
        error: "Modo offline - dados salvos localmente",
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
      online: this.isOnline,
      firebaseReady: this.firebaseReady,
      loggedIn: !!this.currentUser,
      mode: this.currentUser ? "Nuvem" : "Local",
    };
  }
}

// Instância global
const cloudStorage = new CloudStorage();
