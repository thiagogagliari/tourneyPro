// Sistema de dados globais compartilhados
class GlobalDataManager {
  constructor() {
    this.firebaseConfig = {
      apiKey: "AIzaSyD4fzDTkT8PYZzxzJL9pEaFUIx0V0H8gPk",
      authDomain: "meu-torneio-pro.firebaseapp.com",
      projectId: "meu-torneio-pro",
      storageBucket: "meu-torneio-pro.firebasestorage.app",
      messagingSenderId: "769236217387",
      appId: "1:769236217387:web:7f188f16c93da66a99446e",
    };
    
    this.db = null;
    this.firebaseReady = false;
    this.init();
  }

  async init() {
    try {
      if (typeof firebase !== "undefined") {
        if (!firebase.apps.length) {
          firebase.initializeApp(this.firebaseConfig);
        }
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        
        // Autenticação anônima para leitura
        await this.auth.signInAnonymously();
        
        this.firebaseReady = true;
        console.log("Firebase inicializado para dados globais");
      }
    } catch (error) {
      console.error("Erro ao inicializar Firebase global:", error);
    }
  }

  // Carregar dados da coleção pública
  async loadAllData() {
    if (!this.firebaseReady) {
      console.error("Firebase não está pronto");
      return { tournaments: [], clubs: [], players: [], matches: [], coaches: [] };
    }

    try {
      console.log("Carregando dados da coleção pública...");
      
      let allData = { tournaments: [], clubs: [], players: [], matches: [], coaches: [] };
      const dataCollections = ['tournaments', 'clubs', 'players', 'matches', 'coaches'];
      
      for (const collection of dataCollections) {
        try {
          const snapshot = await this.db.collection("public").doc(collection).get();
          
          if (snapshot.exists && snapshot.data().data) {
            allData[collection] = snapshot.data().data;
          }
        } catch (error) {
          console.warn(`Erro ao carregar ${collection}:`, error);
        }
      }
      
      console.log("Dados públicos carregados:", {
        tournaments: allData.tournaments.length,
        clubs: allData.clubs.length,
        players: allData.players.length,
        matches: allData.matches.length,
        coaches: allData.coaches.length
      });
      
      return allData;
    } catch (error) {
      console.error("Erro ao carregar dados públicos:", error);
      return { tournaments: [], clubs: [], players: [], matches: [], coaches: [] };
    }
  }

  // Salvar dados na coleção pública
  async savePublicData(type, data) {
    if (!this.firebaseReady) {
      throw new Error("Firebase não está pronto");
    }

    try {
      const cleanedData = this.cleanData(data);
      await this.db
        .collection("public")
        .doc(type)
        .set({
          data: cleanedData,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        });
      console.log(`${type} salvo na coleção pública`);
    } catch (error) {
      console.error(`Erro ao salvar ${type} publicamente:`, error);
      throw error;
    }
  }

  // Limpar dados removendo undefined
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
}

// Instância global
const globalDataManager = new GlobalDataManager();