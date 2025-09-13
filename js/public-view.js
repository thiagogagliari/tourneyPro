class PublicTournamentViewer {
  constructor() {
    this.data = {
      tournaments: [],
      clubs: [],
      players: [],
      matches: [],
      coaches: [],
    };
    this.init();
  }

  init() {
    this.initFirebase();
    this.setupEventListeners();
    this.loadData();
  }

  initFirebase() {
    if (typeof firebase === "undefined") {
      console.error("Firebase não carregado");
      return;
    }

    const firebaseConfig = {
      apiKey: "AIzaSyD4fzDTkT8PYZzxzJL9pEaFUIx0V0H8gPk",
      authDomain: "meu-torneio-pro.firebaseapp.com",
      projectId: "meu-torneio-pro",
      storageBucket: "meu-torneio-pro.firebasestorage.app",
      messagingSenderId: "769236217387",
      appId: "1:769236217387:web:7f188f16c93da66a99446e",
    };

    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    this.db = firebase.firestore();
  }

  async loadData() {
    if (this.db) {
      try {
        await this.loadFromFirebase();
        return;
      } catch (error) {
        console.warn("Erro no Firebase, tentando localStorage:", error);
      }
    }
    
    this.loadFromLocalStorage();
  }

  async loadFromFirebase() {
    console.log("Carregando dados do Firebase...");
    
    // Fazer login anônimo para acessar dados públicos
    await firebase.auth().signInAnonymously();
    
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
            allData[collection].push(...doc.data().data.map(item => ({ ...item, userId })));
          }
        }
      } catch (error) {
        console.warn(`Erro ao carregar dados do usuário ${userId}:`, error);
      }
    }
    
    Object.assign(this.data, allData);
    console.log("Dados Firebase carregados:", this.data);
    this.showTournaments();
  }

  loadFromLocalStorage() {
    console.log("Carregando dados do localStorage...");
    const keys = ['tournaments', 'clubs', 'players', 'matches', 'coaches'];
    
    keys.forEach(key => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          this.data[key] = JSON.parse(stored);
        } catch (e) {
          console.warn(`Erro ao parsear ${key}:`, e);
          this.data[key] = [];
        }
      }
    });
    
    console.log("Dados localStorage carregados:", this.data);
    this.showTournaments();
  }

  setupEventListeners() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const section = e.target.closest(".nav-btn").dataset.section;
        this.showSection(section);
      });
    });
  }

  showSection(section) {
    document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.remove("active"));
    document.querySelector(`[data-section="${section}"]`).classList.add("active");

    document.querySelectorAll(".content-section").forEach((sec) => sec.classList.remove("active"));
    document.getElementById(`${section}-section`).classList.add("active");

    switch (section) {
      case "tournaments":
        this.showTournaments();
        break;
      case "matches":
        this.showMatches();
        break;
      case "standings":
        this.showStandings();
        break;
      case "players":
        this.showPlayers();
        break;
    }
  }

  showTournaments() {
    const container = document.getElementById("tournaments-grid");
    if (!container) return;
    container.innerHTML = "";

    this.data.tournaments.forEach((tournament) => {
      const tournamentClubs = this.data.clubs.filter(
        (c) => (c.tournamentIds && c.tournamentIds.includes(tournament.id)) || c.tournamentId == tournament.id
      );
      const tournamentMatches = this.data.matches.filter(
        (m) => m.tournamentId == tournament.id
      );
      const finishedMatches = tournamentMatches.filter(
        (m) => m.status === "finished" || m.status === "Finalizada"
      );

      const card = document.createElement("div");
      card.className = "tournament-card";
      card.onclick = () => this.showTournamentDetails(tournament.id);

      card.innerHTML = `
        <h3>${tournament.name}</h3>
        <div class="tournament-meta">
          <span class="game-badge ${tournament.game.toLowerCase()}">${tournament.game}</span>
          <span style="color: rgba(255,255,255,0.8);">${this.formatDate(tournament.startDate)}</span>
        </div>
        <div class="tournament-stats">
          <div class="stat-item">
            <span class="stat-value">${tournamentClubs.length}</span>
            <span class="stat-label">Clubes</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${finishedMatches.length}</span>
            <span class="stat-label">Partidas</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${tournament.type === 'knockout' ? 'Mata-mata' : tournament.type === 'champions' ? 'Champions' : tournament.type === 'national' ? 'Liga' : 'Padrão'}</span>
            <span class="stat-label">Formato</span>
          </div>
        </div>
      `;
      
      container.appendChild(card);
    });
  }

  showMatches() {
    const container = document.getElementById("matches-container");
    if (!container) return;
    
    container.innerHTML = "<p>Funcionalidade em desenvolvimento...</p>";
  }

  showStandings() {
    const container = document.getElementById("standings-container");
    if (!container) return;
    
    container.innerHTML = "<p>Funcionalidade em desenvolvimento...</p>";
  }

  showPlayers() {
    const container = document.getElementById("players-container");
    if (!container) return;
    
    container.innerHTML = "<p>Funcionalidade em desenvolvimento...</p>";
  }

  showTournamentDetails(tournamentId) {
    console.log('Mostrar detalhes do torneio:', tournamentId);
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  }
}

// Inicializar o visualizador público
const publicViewer = new PublicTournamentViewer();