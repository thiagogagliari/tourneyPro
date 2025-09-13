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
        this.firebaseReady = true;
        console.log("Firebase inicializado para dados globais");
      }
    } catch (error) {
      console.error("Erro ao inicializar Firebase global:", error);
    }
  }

  // Carregar todos os dados de todos os usuários
  async loadAllData() {
    if (!this.firebaseReady) {
      console.error("Firebase não está pronto");
      return { tournaments: [], clubs: [], players: [], matches: [], coaches: [] };
    }

    try {
      console.log("Carregando dados globais de todos os usuários...");
      
      const usersSnapshot = await this.db.collection("users").get();
      console.log(`Encontrados ${usersSnapshot.docs.length} usuários`);
      
      let allData = { tournaments: [], clubs: [], players: [], matches: [], coaches: [] };
      
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        console.log(`Carregando dados do usuário: ${userId}`);
        
        try {
          const dataCollections = ['tournaments', 'clubs', 'players', 'matches', 'coaches'];
          
          for (const collection of dataCollections) {
            const doc = await this.db.collection("users").doc(userId).collection("data").doc(collection).get();
            
            if (doc.exists && doc.data().data) {
              const userData = doc.data().data.map(item => ({ ...item, userId }));
              allData[collection].push(...userData);
            }
          }
        } catch (error) {
          console.warn(`Erro ao carregar dados do usuário ${userId}:`, error);
        }
      }
      
      console.log("Dados globais carregados:", {
        tournaments: allData.tournaments.length,
        clubs: allData.clubs.length,
        players: allData.players.length,
        matches: allData.matches.length,
        coaches: allData.coaches.length
      });
      
      return allData;
    } catch (error) {
      console.error("Erro ao carregar dados globais:", error);
      return { tournaments: [], clubs: [], players: [], matches: [], coaches: [] };
    }
  }

  // Salvar dados globalmente (para um usuário específico)
  async saveGlobalData(userId, type, data) {
    if (!this.firebaseReady) {
      throw new Error("Firebase não está pronto");
    }

    try {
      const cleanedData = this.cleanData(data);
      await this.db
        .collection("users")
        .doc(userId)
        .collection("data")
        .doc(type)
        .set({
          data: cleanedData,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        });
      console.log(`${type} salvo globalmente para usuário ${userId}`);
    } catch (error) {
      console.error(`Erro ao salvar ${type} globalmente:`, error);
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