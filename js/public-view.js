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

  async init() {
    this.setupEventListeners();
    await this.loadData();
  }

  async loadData() {
    if (!globalDataManager.firebaseReady) {
      console.error("Firebase não está pronto");
      return;
    }
    
    try {
      console.log("Carregando dados globais...");
      this.data = await globalDataManager.loadAllData();
      console.log("Dados carregados:", this.data);
      this.showTournaments();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
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