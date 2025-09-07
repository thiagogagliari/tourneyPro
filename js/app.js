// Sistema de Gerenciamento de Torneios
class TournamentManager {
  constructor() {
    this.currentUser = null;
    this.data = {
      users: [],
      tournaments: [],
      clubs: [],
      players: [],
      coaches: [],
      matches: [],
      rounds: [],
    };
    this.init();
  }

  async init() {
    this.loadTheme();
    this.setupEventListeners();
    
    // Aguardar Firebase estar pronto
    await this.waitForFirebase();
    await this.checkAuth();
  }

  // Aguardar Firebase estar pronto
  async waitForFirebase() {
    let attempts = 0;
    while (!cloudStorage.firebaseReady && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    console.log('Firebase ready:', cloudStorage.firebaseReady);
  }

  // Autenticação
  async checkAuth() {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser && cloudStorage.currentUser) {
      this.currentUser = JSON.parse(savedUser);
      await this.showDashboard();
    } else {
      document.getElementById("landing-screen").classList.add("active");
    }
  }

  async login(email, password) {
    // Tentar login no Firebase primeiro
    if (cloudStorage.firebaseReady) {
      const result = await cloudStorage.signIn(email, password);
      if (result.success) {
        // Aguardar carregamento dos dados da nuvem
        await this.loadCloudData();

        // Criar ou encontrar usuário local
        let user = this.data.users.find((u) => u.email === email);
        if (!user) {
          user = {
            id: Date.now(),
            email,
            username: email.split("@")[0],
            createdAt: new Date().toISOString(),
          };
          this.data.users.push(user);
          this.saveData("users");
        }
        this.currentUser = user;
        localStorage.setItem("currentUser", JSON.stringify(user));
        this.showDashboard();
        return true;
      }
    }

    // Fallback para sistema local
    const user = this.data.users.find(
      (u) =>
        (u.email === email || u.username === email) && u.password === password
    );

    if (user) {
      this.currentUser = user;
      localStorage.setItem("currentUser", JSON.stringify(user));
      this.showDashboard();
      return true;
    }
    return false;
  }

  async register(email, password) {
    // Tentar registro no Firebase primeiro
    if (cloudStorage.firebaseReady) {
      const result = await cloudStorage.signUp(email, password);
      if (result.success) {
        const newUser = {
          id: Date.now(),
          email,
          username: email.split("@")[0],
          createdAt: new Date().toISOString(),
        };
        this.data.users.push(newUser);
        cloudStorage.saveData("users", this.data.users);
        return true;
      } else {
        throw new Error(result.error);
      }
    }

    // Fallback para sistema local
    const existingUser = this.data.users.find(
      (u) => u.email === email || u.username === email
    );
    if (existingUser) {
      return false;
    }

    const newUser = {
      id: Date.now(),
      email,
      username: email.split("@")[0],
      password,
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    cloudStorage.saveData("users", this.data.users);
    return true;
  }

  async logout() {
    await cloudStorage.signOut();
    this.currentUser = null;
    localStorage.removeItem("currentUser");
    this.showLogin();
  }

  // Interface
  showLogin() {
    document.getElementById("landing-screen").classList.remove("active");
    document.getElementById("login-screen").classList.add("active");
    document.getElementById("dashboard-screen").classList.remove("active");
  }

  async showDashboard() {
    document.getElementById("landing-screen").classList.remove("active");
    document.getElementById("login-screen").classList.remove("active");
    document.getElementById("dashboard-screen").classList.add("active");
    document.getElementById("user-name").textContent =
      this.currentUser.username ||
      this.currentUser.email?.split("@")[0] ||
      "Usuário";

    // Carregar dados da nuvem antes de atualizar a interface
    await this.loadCloudData();

    this.updateStats();
    this.loadDashboardData();
  }

  showSection(sectionName) {
    document.querySelectorAll(".content-section").forEach((section) => {
      section.classList.remove("active");
    });

    document.getElementById(`${sectionName}-content`).classList.add("active");

    document.querySelectorAll(".menu a").forEach((link) => {
      link.classList.remove("active");
    });
    document
      .querySelector(`[data-screen="${sectionName}"]`)
      .classList.add("active");

    this.loadSectionData(sectionName);
  }

  // Dados
  async saveData(type) {
    try {
      console.log(`Tentando salvar ${type}:`, {
        firebaseReady: cloudStorage.firebaseReady,
        currentUser: !!cloudStorage.currentUser,
        dataLength: this.data[type].length,
      });
      await cloudStorage.saveData(type, this.data[type]);
      console.log(`${type} salvo com sucesso`);
    } catch (error) {
      console.error(`Erro ao salvar ${type}:`, error);
      alert(`Erro ao salvar ${type}: ${error.message}`);
    }
  }

  getUserData(type) {
    // Se não há currentUser, retorna array vazio
    if (!this.currentUser) return [];

    // Filtra por userId do usuário atual, mas se não encontrar nada, retorna todos os dados
    const filtered = this.data[type].filter(
      (item) => item.userId === this.currentUser.id
    );

    // Se não há dados filtrados por usuário, retorna todos (para compatibilidade)
    const result = filtered.length > 0 ? filtered : this.data[type];

    console.log(
      `getUserData(${type}): ${result.length} itens (${filtered.length} do usuário ${this.currentUser.id})`
    );
    return result;
  }

  updateStats() {
    const matches = this.getUserData("matches");
    const totalGoals = matches.reduce((total, match) => {
      if (match.events) {
        return (
          total + match.events.filter((event) => event.type === "Gol").length
        );
      }
      return total;
    }, 0);

    document.getElementById("total-tournaments").textContent =
      this.getUserData("tournaments").length;
    document.getElementById("total-clubs").textContent =
      this.getUserData("clubs").length;
    document.getElementById("total-players").textContent =
      this.getUserData("players").length;
    document.getElementById("total-coaches").textContent =
      this.getUserData("coaches").length;
    document.getElementById("total-matches").textContent = matches.length;
    document.getElementById("total-goals").textContent = totalGoals;
  }

  loadDashboardData() {
    this.loadTournaments();
    this.loadClubs();
    this.loadPlayers();
    this.loadCoaches();
    this.loadMatches();
    this.loadScorers();
    this.loadStatistics();
    this.loadRounds();
  }

  loadSectionData(section) {
    switch (section) {
      case "tournaments":
        this.loadTournaments();
        break;
      case "clubs":
        this.loadClubs();
        break;
      case "players":
        this.loadPlayers();
        break;
      case "coaches":
        this.loadCoaches();
        break;
      case "matches":
        this.loadMatches();
        break;
      case "scorers":
        this.loadScorers();
        break;
      case "statistics":
        this.loadStatistics();
        break;
      case "rounds":
        this.loadRounds();
        break;
    }
  }

  // Torneios
  loadTournaments() {
    let tournaments = this.getUserData("tournaments");
    const searchTerm = document
      .getElementById("tournaments-search")
      .value.toLowerCase();

    if (searchTerm) {
      tournaments = tournaments.filter(
        (tournament) =>
          tournament.name.toLowerCase().includes(searchTerm) ||
          tournament.description.toLowerCase().includes(searchTerm) ||
          tournament.game.toLowerCase().includes(searchTerm)
      );
    }

    const container = document.getElementById("tournaments-list");
    container.innerHTML = tournaments
      .map(
        (tournament) => `
        <div class="card">
          <h3>${tournament.name}</h3>
          <p><strong>Jogo:</strong> ${
            tournament.game === "efootball"
              ? "eFootball"
              : tournament.game === "fifa"
              ? "FIFA"
              : tournament.game
          }</p>
          <p><strong>Início:</strong> ${new Date(
            tournament.startDate
          ).toLocaleDateString("pt-BR")}</p>
          <p><strong>Descrição:</strong> ${
            tournament.description || "Sem descrição"
          }</p>
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="btn-primary" onclick="app.showTournamentProfile(${
              tournament.id
            })" style="flex: 1;">Ver Torneio</button>
            <button class="btn-edit" onclick="app.editTournament(${
              tournament.id
            })">Editar</button>
            <button class="btn-danger" onclick="app.deleteTournament(${
              tournament.id
            })">Excluir</button>
          </div>
        </div>
      `
      )
      .join("");

    this.updateTournamentSelects();
  }

  async createTournament(data) {
    const tournament = {
      id: Date.now(),
      userId: this.currentUser.id,
      ...data,
      createdAt: new Date().toISOString(),
      status: "Ativo",
    };

    this.data.tournaments.push(tournament);
    await this.saveData("tournaments");
    this.loadTournaments();
    this.updateStats();
  }

  editTournament(tournamentId) {
    const tournament = this.data.tournaments.find((t) => t.id === tournamentId);
    if (!tournament) return;

    document.getElementById("tournament-name").value = tournament.name;
    document.getElementById("tournament-logo").value = tournament.logo || "";
    document.getElementById("tournament-game").value = tournament.game;
    document.getElementById("tournament-type").value = tournament.type || "";
    document.getElementById("tournament-start").value = tournament.startDate;
    document.getElementById("tournament-description").value =
      tournament.description || "";

    document.getElementById("tournament-modal").style.display = "block";

    const form = document.getElementById("tournament-form");
    form.dataset.editId = tournamentId;

    document.querySelector("#tournament-modal h3").textContent =
      "Editar Torneio";
  }

  async updateTournament(tournamentId, data) {
    const tournamentIndex = this.data.tournaments.findIndex(
      (t) => t.id == tournamentId
    );
    if (tournamentIndex !== -1) {
      this.data.tournaments[tournamentIndex] = {
        ...this.data.tournaments[tournamentIndex],
        ...data,
      };
      await this.saveData("tournaments");
      this.loadTournaments();

      document.querySelector("#tournament-modal h3").textContent =
        "Novo Torneio";
    }
  }

  async updateClub(clubId, data) {
    const clubIndex = this.data.clubs.findIndex((c) => c.id == clubId);
    if (clubIndex !== -1) {
      this.data.clubs[clubIndex] = {
        ...this.data.clubs[clubIndex],
        ...data,
      };
      await this.saveData("clubs");
      this.loadClubs();

      document.querySelector("#club-modal h3").textContent = "Novo Clube";
    }
  }

  async updatePlayer(playerId, data) {
    const playerIndex = this.data.players.findIndex((p) => p.id == playerId);
    if (playerIndex !== -1) {
      this.data.players[playerIndex] = {
        ...this.data.players[playerIndex],
        ...data,
      };
      await this.saveData("players");
      this.loadPlayers();

      document.querySelector("#player-modal h3").textContent = "Novo Jogador";
    }
  }

  async updateCoach(coachId, data) {
    const coachIndex = this.data.coaches.findIndex((c) => c.id == coachId);
    if (coachIndex !== -1) {
      this.data.coaches[coachIndex] = {
        ...this.data.coaches[coachIndex],
        ...data,
      };
      await this.saveData("coaches");
      this.loadCoaches();

      document.querySelector("#coach-modal h3").textContent = "Novo Treinador";
    }
  }

  async updateMatch(matchId, data) {
    const matchIndex = this.data.matches.findIndex((m) => m.id == matchId);
    if (matchIndex !== -1) {
      const updatedMatch = {
        ...this.data.matches[matchIndex],
        ...data,
        id: parseInt(matchId),
        status:
          data.homeScore !== undefined && data.awayScore !== undefined
            ? "finished"
            : "scheduled",
      };

      this.data.matches[matchIndex] = updatedMatch;
      await this.saveData("matches");
      this.loadMatches();
      this.updateStats();

      document.querySelector("#match-modal h3").textContent = "Nova Partida";
    }
  }

  deleteTournament(tournamentId) {
    const tournament = this.data.tournaments.find((t) => t.id === tournamentId);
    if (!tournament) return;

    const matchesCount = this.getUserData("matches").filter(
      (m) => m.tournamentId == tournamentId
    ).length;

    let confirmMessage = `Tem certeza que deseja excluir o torneio "${tournament.name}"?\n\n`;
    confirmMessage += `Esta ação irá excluir:\n`;
    confirmMessage += `• O torneio\n`;
    if (matchesCount > 0)
      confirmMessage += `• ${matchesCount} partida(s) do torneio\n`;
    confirmMessage += `• Todas as rodadas do torneio\n\n`;
    confirmMessage += `Os clubes e jogadores serão mantidos e poderão ser usados em outros torneios.\n\n`;
    confirmMessage += `Esta ação NÃO PODE ser desfeita!`;

    if (confirm(confirmMessage)) {
      // Remover apenas o torneio
      this.data.tournaments = this.data.tournaments.filter(
        (t) => t.id !== tournamentId
      );

      // Desvincular clubes do torneio (mantê-los, mas remove a ligação)
      this.data.clubs = this.data.clubs.map((club) => {
        if (club.tournamentId == tournamentId) {
          return { ...club, tournamentId: null };
        }
        return club;
      });

      // Remover apenas partidas e rodadas do torneio
      this.data.matches = this.data.matches.filter(
        (m) => m.tournamentId != tournamentId
      );
      this.data.rounds = this.data.rounds.filter(
        (r) => r.tournamentId != tournamentId
      );

      // Salvar alterações
      this.saveData("tournaments");
      this.saveData("clubs");
      this.saveData("matches");
      this.saveData("rounds");

      // Recarregar interface
      this.loadTournaments();
      this.updateStats();

      alert(
        `Torneio "${tournament.name}" excluído com sucesso!\nClubes e jogadores foram mantidos.`
      );
    }
  }

  updateTournamentSelects() {
    const tournaments = this.getUserData("tournaments");
    const selects = [
      "club-tournament",
      "tournament-scorers-filter",
      "tournament-statistics-filter",
      "match-tournament",
      "tournament-rounds-filter",
    ];

    selects.forEach((selectId) => {
      const select = document.getElementById(selectId);
      if (select) {
        const currentValue = select.value;
        select.innerHTML =
          '<option value="">Selecione um torneio</option>' +
          tournaments
            .map((t) => `<option value="${t.id}">${t.name}</option>`)
            .join("");
        select.value = currentValue;
      }
    });
  }

  // Clubes
  loadClubs() {
    let clubs = this.getUserData("clubs");
    const searchTerm = document
      .getElementById("clubs-search")
      .value.toLowerCase();

    if (searchTerm) {
      clubs = clubs.filter(
        (club) =>
          club.name.toLowerCase().includes(searchTerm) ||
          club.country.toLowerCase().includes(searchTerm)
      );
    }

    const container = document.getElementById("clubs-list");
    container.innerHTML = clubs
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((club) => {
        const tournament = this.data.tournaments.find(
          (t) => t.id == club.tournamentId
        );
        return `
        <div class="card">
          <img src="${club.logo || "https://via.placeholder.com/50"}" alt="${
          club.name
        }" style="width: 50px; height: 50px; object-fit: cover;">
          <h3>${club.name}</h3>
          <p><strong>País:</strong> 
            <img src="${this.getCountryFlag(
              club.country
            )}" class="flag-icon" alt="${
          club.country
        }" style="width: 20px; height: 15px; margin-left: 5px;">
          </p>
          <p><strong>Torneio:</strong> ${tournament?.name || "Nenhum"}</p>
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="btn-primary" onclick="app.showClubProfile(${
              club.id
            })" style="flex: 1;">Ver Clube</button>
            <button class="btn-edit" onclick="app.editClub(${
              club.id
            })">Editar</button>
          </div>
        </div>
      `;
      })
      .join("");

    this.updateClubSelects();
  }

  async createClub(data) {
    const club = {
      id: Date.now(),
      userId: this.currentUser.id,
      ...data,
      createdAt: new Date().toISOString(),
    };

    this.data.clubs.push(club);
    await this.saveData("clubs");
    this.loadClubs();
    this.updateStats();
  }

  editClub(clubId) {
    const club = this.data.clubs.find((c) => c.id === clubId);
    if (!club) return;

    document.getElementById("club-name").value = club.name;
    document.getElementById("club-country").value = club.country;
    document.getElementById("club-logo").value = club.logo || "";
    document.getElementById("club-tournament").value = club.tournamentId || "";

    document.getElementById("club-modal").style.display = "block";

    const form = document.getElementById("club-form");
    form.dataset.editId = clubId;

    document.querySelector("#club-modal h3").textContent = "Editar Clube";
  }

  updateClubSelects() {
    const clubs = this.getUserData("clubs");
    const selects = [
      "player-club",
      "coach-club",
      "club-filter",
      "coaches-club-filter",
      "home-team",
      "away-team",
    ];

    selects.forEach((selectId) => {
      const select = document.getElementById(selectId);
      if (select) {
        const currentValue = select.value;
        const baseOptions =
          selectId === "club-filter" || selectId === "coaches-club-filter"
            ? '<option value="">Todos os clubes</option>'
            : '<option value="">Selecione o clube</option>';

        select.innerHTML =
          baseOptions +
          clubs
            .map((c) => `<option value="${c.id}">${c.name}</option>`)
            .join("");
        select.value = currentValue;
      }
    });
  }

  // Jogadores
  loadPlayers() {
    let players = this.getUserData("players");
    const clubFilter = document.getElementById("club-filter").value;
    const searchTerm = document
      .getElementById("players-search")
      .value.toLowerCase();

    if (clubFilter) {
      players = players.filter((p) => p.clubId == clubFilter);
    }

    if (searchTerm) {
      players = players.filter(
        (player) =>
          player.name.toLowerCase().includes(searchTerm) ||
          player.position.toLowerCase().includes(searchTerm) ||
          player.nationality.toLowerCase().includes(searchTerm)
      );
    }

    const container = document.getElementById("players-list");
    container.innerHTML = players
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((player) => {
        const club = this.data.clubs.find((c) => c.id == player.clubId);
        return `
        <div class="card">
          <div class="player-photo-container">
            <img src="${
              player.photo ||
              "https://static.flashscore.com/res/image/empty-face-man-share.gif"
            }" alt="${
          player.name
        }" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
            <img src="${club?.logo || "https://via.placeholder.com/24"}" alt="${
          club?.name || "Clube"
        }" class="player-club-badge">
          </div>
          <h3>${player.name}</h3>
          <p><strong>Posição:</strong> <span class="position-badge ${player.position.toLowerCase()}">${
          player.position
        }</span></p>
          <p><strong>Idade:</strong> ${
            this.calculateAge(player.birthdate) || "N/A"
          } anos</p>
          <p><strong>Nacionalidade:</strong> 
            <span class="nationality-flag">
              <img src="${this.getCountryFlag(
                player.nationality
              )}" class="flag-icon" alt="${
          player.nationality
        }" style="width: 16px; height: 12px; margin-right: 5px;">
              ${player.nationality}
            </span>
          </p>
          <p><strong>Clube:</strong> ${club ? club.name : "Sem clube"}</p>
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="btn-primary" onclick="app.showPlayerProfile(${
              player.id
            })" style="flex: 1;">Ver Perfil</button>
            <button class="btn-edit" onclick="app.editPlayer(${
              player.id
            })">Editar</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  async createPlayer(data) {
    const player = {
      id: Date.now(),
      userId: this.currentUser.id,
      ...data,
      createdAt: new Date().toISOString(),
    };

    this.data.players.push(player);
    await this.saveData("players");
    this.loadPlayers();
    this.updateStats();
  }

  editPlayer(playerId) {
    const player = this.data.players.find((p) => p.id === playerId);
    if (!player) return;

    document.getElementById("player-name").value = player.name;
    document.getElementById("player-birthdate").value = player.birthdate || "";
    document.getElementById("player-position").value = player.position;
    document.getElementById("player-nationality").value = player.nationality;
    document.getElementById("player-number").value = player.number || "";
    document.getElementById("player-height").value = player.height || "";
    document.getElementById("player-photo").value = player.photo || "";
    document.getElementById("player-club").value = player.clubId;

    document.getElementById("player-modal").style.display = "block";

    const form = document.getElementById("player-form");
    form.dataset.editId = playerId;

    document.querySelector("#player-modal h3").textContent = "Editar Jogador";
  }

  // Treinadores
  loadCoaches() {
    let coaches = this.getUserData("coaches");
    const clubFilter = document.getElementById("coaches-club-filter").value;
    const searchTerm = document
      .getElementById("coaches-search")
      .value.toLowerCase();

    if (clubFilter) {
      coaches = coaches.filter((c) => c.clubId == clubFilter);
    }

    if (searchTerm) {
      coaches = coaches.filter(
        (coach) =>
          coach.name.toLowerCase().includes(searchTerm) ||
          coach.nationality.toLowerCase().includes(searchTerm) ||
          coach.formation.toLowerCase().includes(searchTerm)
      );
    }

    const container = document.getElementById("coaches-list");
    container.innerHTML = coaches
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((coach) => {
        const club = this.data.clubs.find((c) => c.id == coach.clubId);
        return `
        <div class="card">
          <div class="coach-photo-container">
            <img src="${
              coach.photo ||
              "https://static.flashscore.com/res/image/empty-face-man-share.gif"
            }" alt="${
          coach.name
        }" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
            <img src="${club?.logo || "https://via.placeholder.com/24"}" alt="${
          club?.name || "Clube"
        }" class="coach-club-badge">
          </div>
          <h3>${coach.name}</h3>
          <p><strong>Nacionalidade:</strong> ${coach.nationality}</p>
          <p><strong>Experiência:</strong> ${coach.experience || "N/A"} anos</p>
          <p><strong>Formação:</strong> ${coach.formation || "N/A"}</p>
          <p><strong>Clubes:</strong> ${this.getCoachClubs(coach.id).map(c => c.name).join(", ") || "Sem clube"}</p>
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button class="btn-primary" onclick="app.showCoachProfile(${
              coach.id
            })" style="flex: 1;">Ver Perfil</button>
            <button class="btn-edit" onclick="app.editCoach(${
              coach.id
            })">Editar</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  async createCoach(data) {
    const coach = {
      id: Date.now(),
      userId: this.currentUser.id,
      ...data,
      createdAt: new Date().toISOString(),
    };

    this.data.coaches.push(coach);
    await this.saveData("coaches");
    this.loadCoaches();
    this.updateStats();
  }

  editCoach(coachId) {
    const coach = this.data.coaches.find((c) => c.id === coachId);
    if (!coach) return;

    document.getElementById("coach-name").value = coach.name;
    document.getElementById("coach-birthdate").value = coach.birthdate || "";
    document.getElementById("coach-nationality").value = coach.nationality;
    document.getElementById("coach-experience").value = coach.experience || "";
    document.getElementById("coach-formation").value = coach.formation || "";
    document.getElementById("coach-photo").value = coach.photo || "";
    
    // Selecionar múltiplos clubes
    const clubSelect = document.getElementById("coach-club");
    const coachClubs = coach.clubIds || (coach.clubId ? [coach.clubId] : []);
    Array.from(clubSelect.options).forEach(option => {
      option.selected = coachClubs.includes(parseInt(option.value));
    });

    document.getElementById("coach-modal").style.display = "block";

    const form = document.getElementById("coach-form");
    form.dataset.editId = coachId;

    document.querySelector("#coach-modal h3").textContent = "Editar Treinador";
  }

  // Partidas
  loadMatches() {
    let matches = this.getUserData("matches");
    const searchTerm = document
      .getElementById("matches-search")
      .value.toLowerCase();

    if (searchTerm) {
      matches = matches.filter((match) => {
        const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
        const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);
        const tournament = this.data.tournaments.find(
          (t) => t.id == match.tournamentId
        );

        return (
          homeTeam?.name.toLowerCase().includes(searchTerm) ||
          awayTeam?.name.toLowerCase().includes(searchTerm) ||
          tournament?.name.toLowerCase().includes(searchTerm) ||
          `rodada ${match.round}`.includes(searchTerm)
        );
      });
    }

    const container = document.getElementById("matches-list");
    container.innerHTML = matches
      .map((match) => {
        const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
        const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);
        const tournament = this.data.tournaments.find(
          (t) => t.id == match.tournamentId
        );
        const isFinished = match.status === "finished";

        return `
        <div class="card match-card ${
          isFinished ? "finished" : "scheduled"
        }" onclick="${
          isFinished ? `app.showMatchDetails(${match.id})` : ""
        }" style="${isFinished ? "cursor: pointer;" : ""}">
          <div class="match-header">
            <h3>${homeTeam?.name || "Time"} vs ${awayTeam?.name || "Time"}</h3>
            <span class="match-status">${
              isFinished ? "Finalizada" : "Agendada"
            }</span>
          </div>
          <div class="match-details">
            <p><strong>Placar:</strong> ${
              isFinished
                ? `${match.homeScore} - ${match.awayScore}`
                : "A definir"
            }</p>
            <p><strong>Rodada:</strong> ${match.round}</p>
            <p><strong>Data:</strong> ${new Date(match.date).toLocaleDateString(
              "pt-BR"
            )}</p>
            <p><strong>Torneio:</strong> ${tournament?.name || "Torneio"}</p>
          </div>
          <div class="match-actions">
            ${
              isFinished
                ? `<button class="btn-primary" onclick="event.stopPropagation(); app.showMatchDetails(${match.id})">Ver Detalhes</button>`
                : ""
            }
            ${
              !isFinished
                ? `<button class="btn-edit" onclick="app.editMatch(${match.id})">Editar</button>`
                : ""
            }
            <button class="btn-danger" onclick="app.deleteMatch(${
              match.id
            })">Excluir</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  showMatchDetails(matchId) {
    const match = this.data.matches.find((m) => m.id === matchId);
    if (!match || match.status !== "finished") return;

    const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
    const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);
    const tournament = this.data.tournaments.find(
      (t) => t.id == match.tournamentId
    );

    // Preencher cabeçalho
    document.getElementById("match-detail-home-logo").src =
      homeTeam?.logo || "https://via.placeholder.com/60";
    document.getElementById("match-detail-home-name").textContent =
      homeTeam?.name || "Time";
    document.getElementById("match-detail-away-logo").src =
      awayTeam?.logo || "https://via.placeholder.com/60";
    document.getElementById("match-detail-away-name").textContent =
      awayTeam?.name || "Time";
    document.getElementById(
      "match-detail-score"
    ).textContent = `${match.homeScore} - ${match.awayScore}`;
    document.getElementById("match-detail-date").textContent = new Date(
      match.date
    ).toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    document.getElementById("match-detail-tournament").textContent =
      tournament?.name || "Torneio";
    document.getElementById(
      "match-detail-round"
    ).textContent = `Rodada ${match.round}`;

    // Carregar eventos
    this.loadMatchEvents(match);

    document.getElementById("match-details-modal").style.display = "block";
  }

  loadMatchEvents(match) {
    const container = document.getElementById("match-events-timeline");

    if (!match.events || match.events.length === 0) {
      container.innerHTML =
        '<div class="no-events">Nenhum evento registrado nesta partida</div>';
      return;
    }

    const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
    const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);

    const sortedEvents = match.events.sort((a, b) => a.minute - b.minute);

    container.innerHTML = sortedEvents
      .map((event) => {
        const isHomeTeam = event.team === homeTeam?.name;
        const player = this.data.players.find(
          (p) => p.id == event.playerId || p.name === event.player
        );

        let eventIcon = "";
        let eventClass = "";

        switch (event.type) {
          case "Gol":
            eventIcon = "⚽";
            eventClass = "goal-event";
            break;
          case "Assistência":
            eventIcon = "🅰️";
            eventClass = "assist-event";
            break;
          case "Cartão Amarelo":
            eventIcon = "🟨";
            eventClass = "yellow-card-event";
            break;
          case "Cartão Vermelho":
            eventIcon = "🟥";
            eventClass = "red-card-event";
            break;
          default:
            eventIcon = "⚪";
            eventClass = "other-event";
        }

        return `
        <div class="match-event-item ${eventClass} ${
          isHomeTeam ? "home-event" : "away-event"
        }">
          <div class="event-minute">${event.minute}'</div>
          <div class="event-content">
            <div class="event-icon">${eventIcon}</div>
            <div class="event-details">
              <div class="event-type">${event.type}</div>
              <div class="event-player">
                <img src="${
                  player?.photo ||
                  "https://static.flashscore.com/res/image/empty-face-man-share.gif"
                }" class="event-player-photo" alt="${event.player}">
                <span class="player-name">${event.player}</span>
              </div>
            </div>
          </div>
          <div class="event-team">${event.team}</div>
        </div>
      `;
      })
      .join("");
  }

  closeMatchDetails() {
    document.getElementById("match-details-modal").style.display = "none";
  }

  async createMatch(data) {
    const match = {
      id: Date.now(),
      userId: this.currentUser.id,
      ...data,
      status:
        data.homeScore !== undefined && data.awayScore !== undefined
          ? "finished"
          : "scheduled",
      createdAt: new Date().toISOString(),
    };

    this.data.matches.push(match);
    await this.saveData("matches");
    this.loadMatches();
    this.updateStats();
  }

  editMatch(matchId) {
    const match = this.data.matches.find((m) => m.id === matchId);
    if (!match) return;

    document.getElementById("home-team").value = match.homeTeamId;
    document.getElementById("away-team").value = match.awayTeamId;
    document.getElementById("match-tournament").value = match.tournamentId;
    document.getElementById("match-round").value = match.round;
    const dateValue = match.date.includes("T")
      ? match.date.split("T")[0] +
        "T" +
        match.date.split("T")[1].substring(0, 5)
      : match.date;
    document.getElementById("match-date").value = dateValue;

    if (match.homeScore !== undefined && match.awayScore !== undefined) {
      document.getElementById("match-played").checked = true;
      document.getElementById("home-score").value = match.homeScore;
      document.getElementById("away-score").value = match.awayScore;
      document.getElementById("match-events-section").style.display = "block";
      document.getElementById("home-score").required = true;
      document.getElementById("away-score").required = true;

      // Carregar dados do MOTM
      this.updateMotmPlayers();
      if (match.motm) {
        document.getElementById("motm-player").value = match.motm.playerId;
        document.getElementById("motm-rating").value = match.motm.rating;
      }
    }

    document.getElementById("match-modal").style.display = "block";

    const form = document.getElementById("match-form");
    form.dataset.editId = matchId;

    document.querySelector("#match-modal h3").textContent = "Editar Partida";
  }

  deleteMatch(matchId) {
    const match = this.data.matches.find((m) => m.id === matchId);
    if (!match) return;

    const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
    const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);

    if (
      confirm(
        `Tem certeza que deseja excluir a partida ${
          homeTeam?.name || "Time"
        } vs ${awayTeam?.name || "Time"}?`
      )
    ) {
      this.data.matches = this.data.matches.filter((m) => m.id !== matchId);
      this.saveData("matches");
      this.loadMatches();
      this.updateStats();
    }
  }

  // Artilharia
  loadScorers() {
    const tournamentId = document.getElementById(
      "tournament-scorers-filter"
    ).value;
    if (!tournamentId) {
      document.getElementById("scorers-table").innerHTML =
        "<p>Selecione um torneio para ver a artilharia.</p>";
      return;
    }

    const matches = this.getUserData("matches").filter(
      (m) => m.tournamentId == tournamentId && m.status === "finished"
    );

    const scorers = {};

    matches.forEach((match) => {
      if (match.events) {
        match.events.forEach((event) => {
          if (event.type === "Gol") {
            const playerId = event.playerId || event.player;
            if (!scorers[playerId]) {
              const player = this.data.players.find(
                (p) => p.id == playerId || p.name === event.player
              );
              const club = this.data.clubs.find((c) => c.id == player?.clubId);
              scorers[playerId] = {
                name: player?.name || event.player,
                club: club?.name || event.team,
                goals: 0,
              };
            }
            scorers[playerId].goals++;
          }
        });
      }
    });

    const scorersList = Object.values(scorers).sort(
      (a, b) => b.goals - a.goals
    );

    const container = document.getElementById("scorers-table");
    container.innerHTML = `
      <div class="standings-table">
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Jogador</th>
              <th>Clube</th>
              <th>Gols</th>
            </tr>
          </thead>
          <tbody>
            ${scorersList
              .map(
                (scorer, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${scorer.name}</strong></td>
                  <td>${scorer.club}</td>
                  <td><strong>${scorer.goals}</strong></td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // Estatísticas
  loadStatistics() {
    const tournamentId = document.getElementById(
      "tournament-statistics-filter"
    ).value;
    if (!tournamentId) {
      document.getElementById("statistics-container").innerHTML =
        "<p>Selecione um torneio para ver as estatísticas dos jogadores.</p>";
      return;
    }

    const clubs = this.getUserData("clubs").filter(
      (c) => c.tournamentId == tournamentId
    );
    const players = this.getUserData("players").filter((p) => {
      const club = clubs.find((c) => c.id == p.clubId);
      return club;
    });
    const matches = this.getUserData("matches").filter(
      (m) => m.tournamentId == tournamentId && m.status === "finished"
    );

    const playerStats = players.map((player) => {
      const club = clubs.find((c) => c.id == player.clubId);
      const stats = {
        id: player.id,
        name: player.name,
        club: club?.name || "N/A",
        position: player.position,
        matches: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        totalEvents: 0,
      };

      matches.forEach((match) => {
        const isPlayerInMatch = match.events?.some(
          (event) => event.playerId == player.id || event.player === player.name
        );
        if (isPlayerInMatch) {
          stats.matches++;
        }
      });

      matches.forEach((match) => {
        if (match.events) {
          match.events.forEach((event) => {
            if (event.playerId == player.id || event.player === player.name) {
              stats.totalEvents++;
              switch (event.type) {
                case "Gol":
                  stats.goals++;
                  break;
                case "Assistência":
                  stats.assists++;
                  break;
                case "Cartão Amarelo":
                  stats.yellowCards++;
                  break;
                case "Cartão Vermelho":
                  stats.redCards++;
                  break;
              }
            }
          });
        }
      });

      return stats;
    });

    const activePlayerStats = playerStats.filter(
      (stats) => stats.totalEvents > 0
    );
    activePlayerStats.sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      return b.matches - a.matches;
    });

    const container = document.getElementById("statistics-container");

    if (activePlayerStats.length === 0) {
      container.innerHTML =
        "<p>Nenhuma estatística encontrada para este torneio.</p>";
      return;
    }

    container.innerHTML = `
      <div class="statistics-table">
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Jogador</th>
              <th>Clube</th>
              <th>Posição</th>
              <th>Jogos</th>
              <th>Gols</th>
              <th>Assists</th>
              <th>🟨</th>
              <th>🟥</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${activePlayerStats
              .map(
                (stats, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><strong>${stats.name}</strong></td>
                <td>${stats.club}</td>
                <td><span class="position-badge ${stats.position.toLowerCase()}">${
                  stats.position
                }</span></td>
                <td>${stats.matches}</td>
                <td><strong style="color: #4CAF50;">${stats.goals}</strong></td>
                <td><strong style="color: #2196F3;">${
                  stats.assists
                }</strong></td>
                <td>${stats.yellowCards > 0 ? stats.yellowCards : "-"}</td>
                <td>${stats.redCards > 0 ? stats.redCards : "-"}</td>
                <td><strong>${stats.totalEvents}</strong></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // Rodadas
  loadRounds() {
    const tournamentId = document.getElementById(
      "tournament-rounds-filter"
    ).value;
    const container = document.getElementById("rounds-container");

    if (!tournamentId) {
      container.innerHTML =
        "<p>Selecione um torneio para gerenciar as rodadas.</p>";
      return;
    }

    const tournament = this.data.tournaments.find((t) => t.id == tournamentId);
    const rounds = this.getUserData("rounds").filter(
      (r) => r.tournamentId == tournamentId
    );
    const clubs = this.getUserData("clubs").filter(
      (c) => c.tournamentId == tournamentId
    );

    if (clubs.length < 2) {
      container.innerHTML =
        "<p>Adicione pelo menos 2 clubes ao torneio para criar rodadas.</p>";
      return;
    }

    const tournamentType = tournament?.type;
    const isChampions = tournamentType === "champions";
    const isNational = tournamentType === "national";

    container.innerHTML = `
      <div class="rounds-header">
        <button class="btn-primary" onclick="app.showCreateRoundModal(${tournamentId})">
          <i class="fas fa-plus"></i> ${
            isChampions ? "Nova Fase" : "Nova Rodada"
          }
        </button>
        ${
          isChampions || isNational
            ? `
          <button class="btn-secondary" onclick="app.generateTournamentStructure(${tournamentId})">
            <i class="fas fa-trophy"></i> Gerar Estrutura ${
              isChampions ? "Champions" : "Liga Nacional"
            }
          </button>
        `
            : ""
        }
      </div>
      <div class="rounds-list">
        ${
          rounds.length === 0
            ? "<p>Nenhuma rodada criada ainda.</p>"
            : this.renderRounds(rounds, clubs, tournamentType)
        }
      </div>
    `;
  }

  renderRounds(rounds, clubs, tournamentType) {
    if (tournamentType === "champions") {
      return this.renderChampionsLeagueRounds(rounds, clubs);
    } else if (tournamentType === "national") {
      return this.renderNationalLeagueRounds(rounds, clubs);
    }

    return rounds
      .map(
        (round) => `
      <div class="round-card">
        <div class="round-header">
          <h3>Rodada ${round.number}</h3>
          <span class="round-date">${new Date(round.date).toLocaleDateString(
            "pt-BR"
          )}</span>
        </div>
        <div class="round-matches">
          ${round.matches
            .map((match) => {
              const homeTeam = clubs.find((c) => c.id == match.homeTeamId);
              const awayTeam = clubs.find((c) => c.id == match.awayTeamId);
              return `
              <div class="round-match">
                <span class="team">${homeTeam?.name || "Time"}</span>
                <span class="vs">-</span>
                <span class="team">${awayTeam?.name || "Time"}</span>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `
      )
      .join("");
  }

  renderChampionsLeagueRounds(rounds, clubs) {
    const groupStageRounds = rounds.filter((r) => r.number <= 8);
    const knockoutRounds = rounds.filter((r) => r.number > 8);

    let html = "";

    if (groupStageRounds.length > 0) {
      html += `
        <div class="champions-phase">
          <div class="phase-header">
            <h2><i class="fas fa-users"></i> Fase de Grupos</h2>
          </div>
          ${groupStageRounds
            .map(
              (round) => `
            <div class="round-card group-stage">
              <div class="round-header">
                <h3>Rodada ${round.number}</h3>
                <span class="round-date">${new Date(
                  round.date
                ).toLocaleDateString("pt-BR")}</span>
              </div>
              <div class="round-matches">
                ${round.matches
                  .map((match) => {
                    const homeTeam = clubs.find(
                      (c) => c.id == match.homeTeamId
                    );
                    const awayTeam = clubs.find(
                      (c) => c.id == match.awayTeamId
                    );
                    return `
                    <div class="round-match">
                      <span class="team">${homeTeam?.name || "Time"}</span>
                      <span class="vs">-</span>
                      <span class="team">${awayTeam?.name || "Time"}</span>
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }

    if (knockoutRounds.length > 0) {
      const phases = {
        9: "Quartas - Ida",
        10: "Quartas - Volta",
        11: "Semifinal - Ida",
        12: "Semifinal - Volta",
        13: "Final",
      };

      html += `
        <div class="champions-phase">
          <div class="phase-header">
            <h2><i class="fas fa-trophy"></i> Mata-mata</h2>
          </div>
          ${knockoutRounds
            .map(
              (round) => `
            <div class="knockout-round">
              <div class="knockout-header">
                <h3>${phases[round.number] || `Fase ${round.number}`}</h3>
                <span class="round-date">${new Date(
                  round.date
                ).toLocaleDateString("pt-BR")}</span>
              </div>
              <div class="knockout-matches">
                ${round.matches
                  .map((match) => {
                    const homeTeam = clubs.find(
                      (c) => c.id == match.homeTeamId
                    );
                    const awayTeam = clubs.find(
                      (c) => c.id == match.awayTeamId
                    );
                    return `
                    <div class="knockout-match">
                      <span class="team">${homeTeam?.name || "A definir"}</span>
                      <span class="vs">vs</span>
                      <span class="team">${awayTeam?.name || "A definir"}</span>
                    </div>
                  `;
                  })
                  .join("")}
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }

    return html;
  }

  renderNationalLeagueRounds(rounds, clubs) {
    return rounds
      .map(
        (round) => `
      <div class="round-card national-league">
        <div class="round-header">
          <h3>Rodada ${round.number}</h3>
          <span class="round-date">${new Date(round.date).toLocaleDateString(
            "pt-BR"
          )}</span>
        </div>
        <div class="round-matches">
          ${round.matches
            .map((match) => {
              const homeTeam = clubs.find((c) => c.id == match.homeTeamId);
              const awayTeam = clubs.find((c) => c.id == match.awayTeamId);
              return `
              <div class="round-match">
                <span class="team">${homeTeam?.name || "Time"}</span>
                <span class="vs">-</span>
                <span class="team">${awayTeam?.name || "Time"}</span>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `
      )
      .join("");
  }

  generateTournamentStructure(tournamentId) {
    const tournament = this.data.tournaments.find((t) => t.id == tournamentId);
    const clubs = this.getUserData("clubs").filter(
      (c) => c.tournamentId == tournamentId
    );

    if (tournament.type === "champions") {
      if (clubs.length !== 36) {
        alert("Liga dos Campeões requer exatamente 36 clubes!");
        return;
      }
      this.generateChampionsStructure(tournamentId, clubs);
    } else if (tournament.type === "national") {
      if (clubs.length !== 20) {
        alert("Liga Nacional requer exatamente 20 clubes!");
        return;
      }
      this.generateNationalStructure(tournamentId, clubs);
    }
  }

  generateChampionsStructure(tournamentId, clubs) {
    this.data.rounds = this.data.rounds.filter(
      (r) => r.tournamentId != tournamentId
    );
    this.data.matches = this.data.matches.filter(
      (m) => m.tournamentId != tournamentId
    );

    this.generateChampionsGroupStage(tournamentId, clubs);
    this.generateKnockoutStructure(tournamentId);

    this.saveData("rounds");
    this.saveData("matches");
    this.loadRounds();

    alert("Estrutura da Liga dos Campeões gerada!");
  }

  generateNationalStructure(tournamentId, clubs) {
    this.data.rounds = this.data.rounds.filter(
      (r) => r.tournamentId != tournamentId
    );
    this.data.matches = this.data.matches.filter(
      (m) => m.tournamentId != tournamentId
    );

    this.generateNationalLeague(tournamentId, clubs);

    this.saveData("rounds");
    this.saveData("matches");
    this.loadRounds();

    alert("Estrutura da Liga Nacional gerada!");
  }

  generateChampionsGroupStage(tournamentId, clubs) {
    const baseDate = new Date();

    // Gerar 8 rodadas com confrontos únicos
    for (let round = 1; round <= 8; round++) {
      const roundDate = new Date(baseDate);
      roundDate.setDate(baseDate.getDate() + (round - 1) * 7);

      const matches = [];
      const shuffledClubs = [...clubs].sort(() => Math.random() - 0.5);

      // Cada time joga contra um adversário diferente a cada rodada
      for (let i = 0; i < shuffledClubs.length; i += 2) {
        if (i + 1 < shuffledClubs.length) {
          matches.push({
            homeTeamId: shuffledClubs[i].id,
            awayTeamId: shuffledClubs[i + 1].id,
          });
        }
      }

      const roundData = {
        id: Date.now() + round,
        userId: this.currentUser.id,
        tournamentId: tournamentId,
        number: round,
        date: roundDate.toISOString().split("T")[0],
        matches: matches,
        createdAt: new Date().toISOString(),
      };

      this.data.rounds.push(roundData);

      matches.forEach((match) => {
        this.createMatch({
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          tournamentId: tournamentId,
          round: round,
          date: roundDate.toISOString().split("T")[0] + "T20:00:00",
        });
      });
    }
  }

  generateNationalLeague(tournamentId, clubs) {
    const baseDate = new Date();

    // Gerar 38 rodadas (todos contra todos, ida e volta)
    for (let round = 1; round <= 38; round++) {
      const roundDate = new Date(baseDate);
      roundDate.setDate(baseDate.getDate() + (round - 1) * 7);

      const matches = [];
      const isSecondHalf = round > 19;
      const actualRound = isSecondHalf ? round - 19 : round;

      // Algoritmo round-robin para todos contra todos
      for (let i = 0; i < clubs.length - 1; i++) {
        const homeIndex = (actualRound - 1 + i) % (clubs.length - 1);
        const awayIndex =
          (clubs.length - 1 - i + actualRound - 1) % (clubs.length - 1);

        if (
          homeIndex < clubs.length - 1 &&
          awayIndex < clubs.length - 1 &&
          homeIndex !== awayIndex
        ) {
          const homeTeam = clubs[homeIndex];
          const awayTeam = clubs[awayIndex];

          // No segundo turno, inverter mando de campo
          matches.push({
            homeTeamId: isSecondHalf ? awayTeam.id : homeTeam.id,
            awayTeamId: isSecondHalf ? homeTeam.id : awayTeam.id,
          });
        }
      }

      // Adicionar jogo com o último time
      if (actualRound <= clubs.length / 2) {
        const lastTeamIndex = clubs.length - 1;
        const opponentIndex = (actualRound - 1) % (clubs.length - 1);

        matches.push({
          homeTeamId: isSecondHalf
            ? clubs[opponentIndex].id
            : clubs[lastTeamIndex].id,
          awayTeamId: isSecondHalf
            ? clubs[lastTeamIndex].id
            : clubs[opponentIndex].id,
        });
      }

      const roundData = {
        id: Date.now() + round,
        userId: this.currentUser.id,
        tournamentId: tournamentId,
        number: round,
        date: roundDate.toISOString().split("T")[0],
        matches: matches,
        createdAt: new Date().toISOString(),
      };

      this.data.rounds.push(roundData);

      matches.forEach((match) => {
        this.createMatch({
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          tournamentId: tournamentId,
          round: round,
          date: roundDate.toISOString().split("T")[0] + "T20:00:00",
        });
      });
    }
  }

  generateKnockoutStructure(tournamentId) {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 60);

    const phases = [
      { round: 9, matches: 2, offset: 0 },
      { round: 10, matches: 2, offset: 7 },
      { round: 11, matches: 1, offset: 14 },
      { round: 12, matches: 1, offset: 21 },
      { round: 13, matches: 1, offset: 28 },
    ];

    phases.forEach((phase) => {
      const phaseDate = new Date(baseDate);
      phaseDate.setDate(baseDate.getDate() + phase.offset);

      const matches = [];
      for (let i = 0; i < phase.matches; i++) {
        matches.push({ homeTeamId: null, awayTeamId: null });
      }

      const roundData = {
        id: Date.now() + phase.round,
        userId: this.currentUser.id,
        tournamentId: tournamentId,
        number: phase.round,
        date: phaseDate.toISOString().split("T")[0],
        matches: matches,
        createdAt: new Date().toISOString(),
      };

      this.data.rounds.push(roundData);
    });
  }

  showCreateRoundModal(tournamentId) {
    document.getElementById("round-modal").style.display = "block";
    document.getElementById("round-form").dataset.tournamentId = tournamentId;

    const rounds = this.getUserData("rounds").filter(
      (r) => r.tournamentId == tournamentId
    );
    const nextRound =
      rounds.length > 0 ? Math.max(...rounds.map((r) => r.number)) + 1 : 1;
    document.getElementById("round-number").value = nextRound;
  }

  generateMatches() {
    const tournamentId =
      document.getElementById("round-form").dataset.tournamentId;
    const clubs = this.getUserData("clubs").filter(
      (c) => c.tournamentId == tournamentId
    );
    const container = document.getElementById("round-matches");

    if (clubs.length < 2) {
      alert("Adicione pelo menos 2 times ao torneio!");
      return;
    }

    const matches = [];
    for (let i = 0; i < clubs.length; i += 2) {
      if (i + 1 < clubs.length) {
        matches.push({
          homeTeamId: clubs[i].id,
          awayTeamId: clubs[i + 1].id,
        });
      }
    }

    container.innerHTML =
      matches
        .map((match, index) => {
          const homeTeam = clubs.find((c) => c.id == match.homeTeamId);
          const awayTeam = clubs.find((c) => c.id == match.awayTeamId);
          return `
            <div class="match-pair">
              <select name="homeTeam_${index}" required>
                ${clubs
                  .map(
                    (c) =>
                      `<option value="${c.id}" ${
                        c.id == match.homeTeamId ? "selected" : ""
                      }>${c.name}</option>`
                  )
                  .join("")}
              </select>
              <span class="vs">-</span>
              <select name="awayTeam_${index}" required>
                ${clubs
                  .map(
                    (c) =>
                      `<option value="${c.id}" ${
                        c.id == match.awayTeamId ? "selected" : ""
                      }>${c.name}</option>`
                  )
                  .join("")}
              </select>
              <button type="button" onclick="this.parentElement.remove()">Remover</button>
            </div>
          `;
        })
        .join("") +
      `
        <button type="button" onclick="app.addMatchPair()">Adicionar Jogo</button>
      `;
  }

  addMatchPair() {
    const tournamentId =
      document.getElementById("round-form").dataset.tournamentId;
    const clubs = this.getUserData("clubs").filter(
      (c) => c.tournamentId == tournamentId
    );
    const container = document.getElementById("round-matches");
    const index = container.querySelectorAll(".match-pair").length;

    const matchDiv = document.createElement("div");
    matchDiv.className = "match-pair";
    matchDiv.innerHTML = `
      <select name="homeTeam_${index}" required>
        <option value="">Selecione o time da casa</option>
        ${clubs
          .map((c) => `<option value="${c.id}">${c.name}</option>`)
          .join("")}
      </select>
      <span class="vs">-</span>
      <select name="awayTeam_${index}" required>
        <option value="">Selecione o time visitante</option>
        ${clubs
          .map((c) => `<option value="${c.id}">${c.name}</option>`)
          .join("")}
      </select>
      <button type="button" onclick="this.parentElement.remove()">Remover</button>
    `;

    container.insertBefore(matchDiv, container.lastElementChild);
  }

  addMatchEvent() {
    const container = document.getElementById("events-container");
    const eventIndex = container.children.length;

    const homeTeamId = document.getElementById("home-team").value;
    const awayTeamId = document.getElementById("away-team").value;

    if (!homeTeamId || !awayTeamId) {
      alert("Selecione os times da partida primeiro!");
      return;
    }

    const homeTeam = this.data.clubs.find((c) => c.id == homeTeamId);
    const awayTeam = this.data.clubs.find((c) => c.id == awayTeamId);
    const homePlayers = this.getUserData("players").filter(
      (p) => p.clubId == homeTeamId
    );
    const awayPlayers = this.getUserData("players").filter(
      (p) => p.clubId == awayTeamId
    );

    const eventDiv = document.createElement("div");
    eventDiv.className = "event-item";
    eventDiv.innerHTML = `
      <div class="event-fields">
        <input type="number" name="event_minute_${eventIndex}" placeholder="Minuto" min="1" max="120" required>
        <select name="event_type_${eventIndex}" required>
          <option value="">Tipo de evento</option>
          <option value="Gol">Gol</option>
          <option value="Assistência">Assistência</option>
          <option value="Cartão Amarelo">Cartão Amarelo</option>
          <option value="Cartão Vermelho">Cartão Vermelho</option>
        </select>
        <select name="event_team_${eventIndex}" onchange="app.updateEventPlayers(${eventIndex})" required>
          <option value="">Selecione o time</option>
          <option value="${homeTeam.name}" data-team-id="${homeTeamId}">${homeTeam.name}</option>
          <option value="${awayTeam.name}" data-team-id="${awayTeamId}">${awayTeam.name}</option>
        </select>
        <select name="event_player_${eventIndex}" required>
          <option value="">Selecione o jogador</option>
        </select>
        <button type="button" onclick="this.parentElement.parentElement.remove()">Remover</button>
      </div>
    `;

    container.appendChild(eventDiv);
  }

  updateEventPlayers(eventIndex) {
    const teamSelect = document.querySelector(
      `select[name="event_team_${eventIndex}"]`
    );
    const playerSelect = document.querySelector(
      `select[name="event_player_${eventIndex}"]`
    );
    const selectedOption = teamSelect.options[teamSelect.selectedIndex];

    if (!selectedOption.dataset.teamId) {
      playerSelect.innerHTML = '<option value="">Selecione o jogador</option>';
      return;
    }

    const teamId = selectedOption.dataset.teamId;
    const players = this.getUserData("players").filter(
      (p) => p.clubId == teamId
    );

    playerSelect.innerHTML =
      '<option value="">Selecione o jogador</option>' +
      players
        .map(
          (p) =>
            `<option value="${p.name}" data-player-id="${p.id}">${p.name} (${p.position})</option>`
        )
        .join("");
  }

  updateMotmPlayers() {
    const homeTeamId = document.getElementById("home-team").value;
    const awayTeamId = document.getElementById("away-team").value;
    const motmSelect = document.getElementById("motm-player");

    if (!homeTeamId || !awayTeamId) {
      motmSelect.innerHTML =
        '<option value="">Selecione os times primeiro</option>';
      return;
    }

    const homePlayers = this.getUserData("players").filter(
      (p) => p.clubId == homeTeamId
    );
    const awayPlayers = this.getUserData("players").filter(
      (p) => p.clubId == awayTeamId
    );

    const homeTeam = this.data.clubs.find((c) => c.id == homeTeamId);
    const awayTeam = this.data.clubs.find((c) => c.id == awayTeamId);

    motmSelect.innerHTML =
      '<option value="">Selecione o melhor jogador</option>';

    if (homePlayers.length > 0) {
      motmSelect.innerHTML += `<optgroup label="${
        homeTeam?.name || "Time Casa"
      }">`;
      homePlayers.forEach((player) => {
        motmSelect.innerHTML += `<option value="${player.id}">${player.name} (${player.position})</option>`;
      });
      motmSelect.innerHTML += "</optgroup>";
    }

    if (awayPlayers.length > 0) {
      motmSelect.innerHTML += `<optgroup label="${
        awayTeam?.name || "Time Visitante"
      }">`;
      awayPlayers.forEach((player) => {
        motmSelect.innerHTML += `<option value="${player.id}">${player.name} (${player.position})</option>`;
      });
      motmSelect.innerHTML += "</optgroup>";
    }
  }

  async createRound(data) {
    const round = {
      id: Date.now(),
      userId: this.currentUser.id,
      ...data,
      createdAt: new Date().toISOString(),
    };

    this.data.rounds.push(round);
    await this.saveData("rounds");

    for (const match of data.matches) {
      await this.createMatch({
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        tournamentId: data.tournamentId,
        round: data.number,
        date: data.date + "T20:00:00",
      });
    }

    this.loadRounds();
  }

  // Função para calcular idade corretamente
  calculateAge(birthdate) {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  }

  // Função para formatar data corretamente (evita problema de fuso horário)
  formatDate(dateString, format = "dd/mm/yyyy") {
    if (!dateString) return "-";

    // Criar data local sem conversão de fuso horário
    const parts = dateString.split("-");
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    if (format === "dd Mês yyyy") {
      const months = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ];
      return `${date.getDate()} ${
        months[date.getMonth()]
      } ${date.getFullYear()}`;
    }

    // Formato padrão dd/mm/yyyy
    return `${date.getDate().toString().padStart(2, "0")}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  }

  // Função para obter bandeira do país
  getCountryFlag(country) {
    const flags = {
      Brasil: "https://flagcdn.com/w20/br.png",
      Argentina: "https://flagcdn.com/w20/ar.png",
      Uruguai: "https://flagcdn.com/w20/uy.png",
      Chile: "https://flagcdn.com/w20/cl.png",
      Colômbia: "https://flagcdn.com/w20/co.png",
      Peru: "https://flagcdn.com/w20/pe.png",
      Equador: "https://flagcdn.com/w20/ec.png",
      Venezuela: "https://flagcdn.com/w20/ve.png",
      Bolívia: "https://flagcdn.com/w20/bo.png",
      Paraguai: "https://flagcdn.com/w20/py.png",
      Portugal: "https://flagcdn.com/w20/pt.png",
      Espanha: "https://flagcdn.com/w20/es.png",
      França: "https://flagcdn.com/w20/fr.png",
      Itália: "https://flagcdn.com/w20/it.png",
      Alemanha: "https://flagcdn.com/w20/de.png",
      Inglaterra: "https://flagcdn.com/w20/gb-eng.png",
      Holanda: "https://flagcdn.com/w20/nl.png",
      Bélgica: "https://flagcdn.com/w20/be.png",
      Croácia: "https://flagcdn.com/w20/hr.png",
      Sérvia: "https://flagcdn.com/w20/rs.png",
      Polônia: "https://flagcdn.com/w20/pl.png",
      "República Tcheca": "https://flagcdn.com/w20/cz.png",
      Dinamarca: "https://flagcdn.com/w20/dk.png",
      Suécia: "https://flagcdn.com/w20/se.png",
      Noruega: "https://flagcdn.com/w20/no.png",
      Finlândia: "https://flagcdn.com/w20/fi.png",
      Japão: "https://flagcdn.com/w20/jp.png",
      "Coreia do Sul": "https://flagcdn.com/w20/kr.png",
      Austrália: "https://flagcdn.com/w20/au.png",
      "Estados Unidos": "https://flagcdn.com/w20/us.png",
      Canadá: "https://flagcdn.com/w20/ca.png",
      México: "https://flagcdn.com/w20/mx.png",
      "Costa Rica": "https://flagcdn.com/w20/cr.png",
      Panamá: "https://flagcdn.com/w20/pa.png",
      Jamaica: "https://flagcdn.com/w20/jm.png",
      Marrocos: "https://flagcdn.com/w20/ma.png",
      Argélia: "https://flagcdn.com/w20/dz.png",
      Tunísia: "https://flagcdn.com/w20/tn.png",
      Egito: "https://flagcdn.com/w20/eg.png",
      Nigéria: "https://flagcdn.com/w20/ng.png",
      Gana: "https://flagcdn.com/w20/gh.png",
      Senegal: "https://flagcdn.com/w20/sn.png",
      Camarões: "https://flagcdn.com/w20/cm.png",
      "África do Sul": "https://flagcdn.com/w20/za.png",
      Escócia: "https://flagcdn.com/w20/gb-sct.png",
      Turquia: "https://flagcdn.com/w20/tr.png",
      Rússia: "https://flagcdn.com/w20/ru.png",
      Ucrânia: "https://flagcdn.com/w20/ua.png",
      Eslováquia: "https://flagcdn.com/w20/sk.png",
      "DR Congo": "https://flagcdn.com/w20/cd.png",
      Geórgia: "https://flagcdn.com/w20/ge.png",
      Romênia: "https://flagcdn.com/w20/ro.png",
      Hungria: "https://flagcdn.com/w20/hu.png",
      Israel: "https://flagcdn.com/w20/il.png",
      Grécia: "https://flagcdn.com/w20/gr.png",
      Bulgária: "https://flagcdn.com/w20/bg.png",
      Suíça: "https://flagcdn.com/w20/ch.png",
      Áustria: "https://flagcdn.com/w20/at.png",
      Irlanda: "https://flagcdn.com/w20/ie.png",
      "País de Gales": "https://flagcdn.com/w20/gb-wls.png",
      Islândia: "https://flagcdn.com/w20/is.png",
      Lituânia: "https://flagcdn.com/w20/lt.png",
      Letônia: "https://flagcdn.com/w20/lv.png",
      Estônia: "https://flagcdn.com/w20/ee.png",
      Chipre: "https://flagcdn.com/w20/cy.png",
      Malta: "https://flagcdn.com/w20/mt.png",
      Luxemburgo: "https://flagcdn.com/w20/lu.png",
      Andorra: "https://flagcdn.com/w20/ad.png",
      Mônaco: "https://flagcdn.com/w20/mc.png",
      Liechtenstein: "https://flagcdn.com/w20/li.png",
      "San Marino": "https://flagcdn.com/w20/sm.png",
      Vaticano: "https://flagcdn.com/w20/va.png",
    };
    return flags[country] || "https://flagcdn.com/w20/xx.png";
  }

  // Perfil do Jogador
  showPlayerProfile(playerId) {
    const player = this.data.players.find((p) => p.id === playerId);
    if (!player) return;

    const club = this.data.clubs.find((c) => c.id == player.clubId);
    const matches = this.getUserData("matches").filter(
      (m) => m.status === "finished"
    );

    // Calcular estatísticas do jogador
    const playerStats = {
      matches: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      matchHistory: [],
    };

    matches.forEach((match) => {
      let playerInMatch = false;
      const matchEvents = [];

      if (match.events) {
        match.events.forEach((event) => {
          if (event.playerId == player.id || event.player === player.name) {
            playerInMatch = true;
            matchEvents.push(event);

            switch (event.type) {
              case "Gol":
                playerStats.goals++;
                break;
              case "Assistência":
                playerStats.assists++;
                break;
              case "Cartão Amarelo":
                playerStats.yellowCards++;
                break;
              case "Cartão Vermelho":
                playerStats.redCards++;
                break;
            }
          }
        });
      }

      if (playerInMatch) {
        playerStats.matches++;
        const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
        const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);

        playerStats.matchHistory.push({
          date: match.date,
          homeTeam: homeTeam,
          awayTeam: awayTeam,
          score: `${match.homeScore} - ${match.awayScore}`,
          events: matchEvents,
        });
      }
    });

    // Preencher dados do modal
    document.getElementById("profile-photo").src =
      player.photo ||
      "https://static.flashscore.com/res/image/empty-face-man-share.gif";
    document.getElementById("profile-name").textContent = player.name;
    const positionElement = document.getElementById("profile-position");
    positionElement.textContent = player.position;
    positionElement.className = `player-position-badge position-badge ${player.position.toLowerCase()}`;
    document.getElementById("profile-club-logo").src =
      club?.logo || "https://via.placeholder.com/30";
    document.getElementById("profile-club-name").textContent =
      club?.name || "Sem clube";
    document.getElementById("profile-age").textContent = player.age
      ? `${player.age} anos`
      : "-";
    document.getElementById("profile-birthdate").textContent = player.birthdate
      ? this.formatDate(player.birthdate, "dd Mês yyyy")
      : "-";
    // Nacionalidade com bandeira
    const nationalityFlag = document.getElementById("profile-nationality-flag");
    const nationalityText = document.getElementById("profile-nationality-text");
    if (player.nationality) {
      nationalityFlag.src = this.getCountryFlag(player.nationality);
      nationalityFlag.style.display = "inline";
      nationalityText.textContent = player.nationality;
    } else {
      nationalityFlag.style.display = "none";
      nationalityText.textContent = "-";
    }
    document.getElementById("profile-height").textContent = player.height
      ? `${player.height} cm`
      : "-";
    document.getElementById("profile-number").textContent =
      player.number || "-";

    // Estatísticas
    document.getElementById("profile-matches").textContent =
      playerStats.matches;
    document.getElementById("profile-goals").textContent = playerStats.goals;
    document.getElementById("profile-assists").textContent =
      playerStats.assists;
    document.getElementById("profile-yellow-cards").textContent =
      playerStats.yellowCards;
    document.getElementById("profile-red-cards").textContent =
      playerStats.redCards;
    document.getElementById("profile-rating").textContent =
      playerStats.matches > 0
        ? (
            (playerStats.goals * 2 + playerStats.assists) /
            playerStats.matches
          ).toFixed(1)
        : "-";

    document.getElementById("player-profile-modal").style.display = "block";
  }

  loadPlayerClubHistory(player) {
    const container = document.getElementById("profile-club-history");
    const currentClub = this.data.clubs.find((c) => c.id == player.clubId);
    const currentYear = new Date().getFullYear();

    // Simular histórico de clubes (na prática, isso viria do banco de dados)
    const clubHistory = [];

    // Clube atual (temporada atual)
    if (currentClub) {
      const currentSeasonMatches = this.getUserData("matches").filter(
        (m) =>
          m.status === "finished" &&
          m.events &&
          m.events.some(
            (e) => e.playerId == player.id || e.player === player.name
          )
      );

      let currentSeasonStats = {
        matches: 0,
        goals: 0,
        assists: 0,
      };

      currentSeasonMatches.forEach((match) => {
        let playerInMatch = false;
        match.events.forEach((event) => {
          if (event.playerId == player.id || event.player === player.name) {
            if (!playerInMatch) {
              currentSeasonStats.matches++;
              playerInMatch = true;
            }
            if (event.type === "Gol") currentSeasonStats.goals++;
            if (event.type === "Assistência") currentSeasonStats.assists++;
          }
        });
      });

      clubHistory.push({
        club: currentClub,
        period: `${currentYear} - Atual`,
        isCurrent: true,
        stats: currentSeasonStats,
      });
    }

    // Adicionar clubes anteriores (exemplo)
    const previousClubs = [
      {
        name: "Clube Anterior 1",
        period: `${currentYear - 1}`,
        stats: { matches: 25, goals: 8, assists: 5 },
      },
      {
        name: "Clube Anterior 2",
        period: `${currentYear - 2}`,
        stats: { matches: 30, goals: 12, assists: 7 },
      },
    ];

    if (clubHistory.length === 0 && previousClubs.length === 0) {
      container.innerHTML =
        '<div class="no-matches">Nenhum histórico encontrado</div>';
      return;
    }

    container.innerHTML = clubHistory
      .map(
        (history) => `
      <div class="club-history-item ${
        history.isCurrent ? "current-season" : ""
      }">
        <img src="${
          history.club.logo || "https://via.placeholder.com/40"
        }" class="club-history-logo" alt="${history.club.name}">
        <div class="club-history-info">
          <div class="club-history-name">
            ${history.club.name}
            ${
              history.isCurrent
                ? '<span class="current-season-badge">Temporada Atual</span>'
                : ""
            }
          </div>
          <div class="club-history-period">${history.period}</div>
        </div>
        <div class="season-stats">
          <div class="season-stat">
            <div class="season-stat-number">${history.stats.matches}</div>
            <div class="season-stat-label">Jogos</div>
          </div>
          <div class="season-stat">
            <div class="season-stat-number">${history.stats.goals}</div>
            <div class="season-stat-label">Gols</div>
          </div>
          <div class="season-stat">
            <div class="season-stat-number">${history.stats.assists}</div>
            <div class="season-stat-label">Assists</div>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  loadPlayerMatches(matchHistory) {
    const timeline = document.getElementById("profile-matches-timeline");
    if (matchHistory.length === 0) {
      timeline.innerHTML =
        '<div class="no-matches">Nenhuma partida encontrada na temporada atual</div>';
      return;
    }

    timeline.innerHTML = matchHistory
      .map(
        (match) => `
      <div class="match-timeline-item">
        <div class="match-date">${new Date(match.date).toLocaleDateString(
          "pt-BR"
        )}</div>
        <div class="match-teams">
          <div class="match-team-logos">
            <img src="${
              match.homeTeam?.logo || "https://via.placeholder.com/25"
            }" class="match-team-logo" alt="${match.homeTeam?.name}">
            <span class="match-vs">vs</span>
            <img src="${
              match.awayTeam?.logo || "https://via.placeholder.com/25"
            }" class="match-team-logo" alt="${match.awayTeam?.name}">
          </div>
        </div>
        <div class="match-result">${match.score}</div>
        <div class="match-events">
          ${match.events
            .map((event) => {
              let className = "";
              let icon = "";
              switch (event.type) {
                case "Gol":
                  className = "event-goal";
                  icon = "⚽";
                  break;
                case "Assistência":
                  className = "event-assist";
                  icon = "🅰️";
                  break;
                case "Cartão Amarelo":
                  className = "event-yellow";
                  icon = "🟨";
                  break;
                case "Cartão Vermelho":
                  className = "event-red";
                  icon = "🟥";
                  break;
                default:
                  return "";
              }
              return `<span class="event-badge ${className}">${icon}</span>`;
            })
            .join("")}
        </div>
      </div>
    `
      )
      .join("");
  }

  closePlayerProfile() {
    document.getElementById("player-profile-modal").style.display = "none";
  }

  // Perfil do Treinador
  showCoachProfile(coachId) {
    const coach = this.data.coaches.find((c) => c.id === coachId);
    if (!coach) return;

    const clubs = this.getUserData("clubs").filter((c) => c.id == coach.clubId);
    const matches = this.getUserData("matches").filter((m) => m.status === "finished");

    // Calcular estatísticas do treinador
    const coachStats = {
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      matchHistory: [],
    };

    clubs.forEach(club => {
      const clubMatches = matches.filter(m => 
        m.homeTeamId == club.id || m.awayTeamId == club.id
      );
      
      clubMatches.forEach(match => {
        coachStats.matches++;
        const isHome = match.homeTeamId == club.id;
        const clubScore = isHome ? match.homeScore : match.awayScore;
        const opponentScore = isHome ? match.awayScore : match.homeScore;
        
        const homeTeam = this.data.clubs.find(c => c.id == match.homeTeamId);
        const awayTeam = this.data.clubs.find(c => c.id == match.awayTeamId);
        
        let result = 'draw';
        if (clubScore > opponentScore) {
          coachStats.wins++;
          result = 'win';
        } else if (clubScore < opponentScore) {
          coachStats.losses++;
          result = 'loss';
        } else {
          coachStats.draws++;
        }
        
        coachStats.matchHistory.push({
          date: match.date,
          homeTeam,
          awayTeam,
          score: `${match.homeScore} - ${match.awayScore}`,
          result,
          club
        });
      });
    });

    // Preencher dados do modal
    document.getElementById("coach-profile-photo").src = coach.photo || "https://static.flashscore.com/res/image/empty-face-man-share.gif";
    document.getElementById("coach-profile-name").textContent = coach.name;
    document.getElementById("coach-profile-age").textContent = this.calculateAge(coach.birthdate) ? `${this.calculateAge(coach.birthdate)} anos` : "-";
    document.getElementById("coach-profile-birthdate").textContent = coach.birthdate ? this.formatDate(coach.birthdate, "dd Mês yyyy") : "-";
    
    const nationalityFlag = document.getElementById("coach-profile-nationality-flag");
    const nationalityText = document.getElementById("coach-profile-nationality-text");
    if (coach.nationality) {
      nationalityFlag.src = this.getCountryFlag(coach.nationality);
      nationalityFlag.style.display = "inline";
      nationalityText.textContent = coach.nationality;
    } else {
      nationalityFlag.style.display = "none";
      nationalityText.textContent = "-";
    }
    
    document.getElementById("coach-profile-experience").textContent = coach.experience ? `${coach.experience} anos` : "-";
    document.getElementById("coach-profile-formation").textContent = coach.formation || "-";

    // Estatísticas
    document.getElementById("coach-profile-matches").textContent = coachStats.matches;
    document.getElementById("coach-profile-wins").textContent = coachStats.wins;
    document.getElementById("coach-profile-draws").textContent = coachStats.draws;
    document.getElementById("coach-profile-losses").textContent = coachStats.losses;
    document.getElementById("coach-profile-winrate").textContent = coachStats.matches > 0 ? ((coachStats.wins / coachStats.matches) * 100).toFixed(1) + "%" : "-";

    this.loadCoachClubHistory(coach, clubs);
    this.loadCoachMatches(coachStats.matchHistory);

    document.getElementById("coach-profile-modal").style.display = "block";
  }

  loadCoachClubHistory(coach, clubs) {
    const container = document.getElementById("coach-profile-club-history");
    const currentYear = new Date().getFullYear();

    if (clubs.length === 0) {
      container.innerHTML = '<div class="no-matches">Nenhum histórico encontrado</div>';
      return;
    }

    container.innerHTML = clubs.map(club => {
      const clubMatches = this.getUserData("matches").filter(m => 
        (m.homeTeamId == club.id || m.awayTeamId == club.id) && m.status === "finished"
      );
      
      let wins = 0, draws = 0, losses = 0;
      clubMatches.forEach(match => {
        const isHome = match.homeTeamId == club.id;
        const clubScore = isHome ? match.homeScore : match.awayScore;
        const opponentScore = isHome ? match.awayScore : match.homeScore;
        
        if (clubScore > opponentScore) wins++;
        else if (clubScore === opponentScore) draws++;
        else losses++;
      });
      
      return `
        <div class="club-history-item current-season">
          <img src="${club.logo || "https://via.placeholder.com/40"}" class="club-history-logo" alt="${club.name}">
          <div class="club-history-info">
            <div class="club-history-name">
              ${club.name}
              <span class="current-season-badge">Atual</span>
            </div>
            <div class="club-history-period">${currentYear}</div>
          </div>
          <div class="season-stats">
            <div class="season-stat">
              <div class="season-stat-number">${clubMatches.length}</div>
              <div class="season-stat-label">Jogos</div>
            </div>
            <div class="season-stat">
              <div class="season-stat-number">${wins}</div>
              <div class="season-stat-label">Vitórias</div>
            </div>
            <div class="season-stat">
              <div class="season-stat-number">${draws}</div>
              <div class="season-stat-label">Empates</div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  loadCoachMatches(matchHistory) {
    const timeline = document.getElementById("coach-profile-matches-timeline");
    if (matchHistory.length === 0) {
      timeline.innerHTML = '<div class="no-matches">Nenhuma partida encontrada</div>';
      return;
    }

    timeline.innerHTML = matchHistory.map(match => `
      <div class="match-timeline-item">
        <div class="match-date">${new Date(match.date).toLocaleDateString("pt-BR")}</div>
        <div class="match-teams">
          <div class="match-team-logos">
            <img src="${match.homeTeam?.logo || "https://via.placeholder.com/25"}" class="match-team-logo" alt="${match.homeTeam?.name}">
            <span class="match-vs">vs</span>
            <img src="${match.awayTeam?.logo || "https://via.placeholder.com/25"}" class="match-team-logo" alt="${match.awayTeam?.name}">
          </div>
        </div>
        <div class="match-result">${match.score}</div>
        <div class="match-result-badge ${match.result}">
          ${match.result === 'win' ? 'V' : match.result === 'draw' ? 'E' : 'D'}
        </div>
      </div>
    `).join("");
  }

  closeCoachProfile() {
    document.getElementById("coach-profile-modal").style.display = "none";
  }

  // Perfil do Clube
  showClubProfile(clubId) {
    const club = this.data.clubs.find((c) => c.id === clubId);
    if (!club) return;

    const tournament = this.data.tournaments.find(
      (t) => t.id == club.tournamentId
    );
    const clubPlayers = this.getUserData("players").filter(
      (p) => p.clubId == club.id
    );
    const clubMatches = this.getUserData("matches").filter(
      (m) => m.homeTeamId == club.id || m.awayTeamId == club.id
    );

    // Calcular estatísticas do clube
    const clubStats = {
      matches: clubMatches.length,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
    };

    clubMatches.forEach((match) => {
      const isHome = match.homeTeamId == club.id;
      const clubScore = isHome ? match.homeScore : match.awayScore;
      const opponentScore = isHome ? match.awayScore : match.homeScore;

      clubStats.goalsFor += clubScore;
      clubStats.goalsAgainst += opponentScore;

      if (clubScore > opponentScore) {
        clubStats.wins++;
      } else if (clubScore === opponentScore) {
        clubStats.draws++;
      } else {
        clubStats.losses++;
      }
    });

    // Preencher dados do modal
    document.getElementById("club-profile-logo").src =
      club.logo || "https://via.placeholder.com/120";
    document.getElementById("club-profile-name").textContent = club.name;
    const countryElement = document.getElementById("club-profile-country");
    countryElement.innerHTML = `<img src="${this.getCountryFlag(
      club.country
    )}" class="flag-icon" alt="${
      club.country
    }" style="width: 20px; height: 15px; margin-right: 5px;">${club.country}`;
    document.getElementById("club-profile-tournament").textContent =
      tournament?.name || "Nenhum torneio";

    // Estatísticas gerais
    document.getElementById("club-total-matches").textContent =
      clubStats.matches;
    document.getElementById("club-wins").textContent = clubStats.wins;
    document.getElementById("club-draws").textContent = clubStats.draws;
    document.getElementById("club-losses").textContent = clubStats.losses;
    document.getElementById("club-goals-for").textContent = clubStats.goalsFor;
    document.getElementById("club-goals-against").textContent =
      clubStats.goalsAgainst;

    // Informações do elenco
    document.getElementById("club-total-players").textContent =
      clubPlayers.length;
    const avgAge =
      clubPlayers.length > 0
        ? Math.round(
            clubPlayers.reduce(
              (sum, p) => sum + (this.calculateAge(p.birthdate) || 0),
              0
            ) / clubPlayers.length
          )
        : 0;
    document.getElementById("club-avg-age").textContent = avgAge;
    const foreignPlayers = clubPlayers.filter(
      (p) => p.nationality !== club.country
    ).length;
    document.getElementById("club-foreign-players").textContent =
      foreignPlayers;

    this.loadClubSquad(clubPlayers);
    this.loadClubMatches(clubMatches, club);
    this.loadClubStatistics(clubPlayers, clubMatches);

    document.getElementById("club-profile-modal").style.display = "block";
  }

  loadClubSquad(players) {
    const container = document.getElementById("club-squad-list");
    if (players.length === 0) {
      container.innerHTML =
        '<div class="no-data">Nenhum jogador encontrado</div>';
      return;
    }

    // Ordenar por posição: atacantes, meias, defensores, goleiros
    const positionOrder = {
      Atacante: 1,
      Meia: 2,
      Volante: 3,
      Lateral: 4,
      Zagueiro: 5,
      Goleiro: 6,
    };
    const sortedPlayers = players.sort((a, b) => {
      const orderA = positionOrder[a.position] || 7;
      const orderB = positionOrder[b.position] || 7;
      return orderA - orderB;
    });

    container.innerHTML = sortedPlayers
      .map(
        (player) => `
      <div class="squad-player-card" onclick="app.showPlayerProfile(${
        player.id
      })">
        <div class="squad-player-header">
          <img src="${
            player.photo ||
            "https://static.flashscore.com/res/image/empty-face-man-share.gif"
          }" class="squad-player-photo" alt="${player.name}">
          <div class="squad-player-info">
            <h4>${player.name}</h4>
            <span class="squad-player-position">${player.position}</span>
          </div>
        </div>
        <div class="squad-player-details">
          <div class="squad-player-detail">
            <span>Idade</span>
            <span>${this.calculateAge(player.birthdate) || "-"}</span>
          </div>
          <div class="squad-player-detail">
            <span>Número</span>
            <span>${player.number || "-"}</span>
          </div>
          <div class="squad-player-detail">
            <span>Nacionalidade</span>
            <span class="nationality-flag" style="display: flex; align-items: center; gap: 5px;">
              ${
                player.nationality
                  ? `<img src="${this.getCountryFlag(
                      player.nationality
                    )}" style="width: 16px; height: 12px;" alt="${
                      player.nationality
                    }">`
                  : ""
              }
              ${player.nationality || "-"}
            </span>
          </div>
          <div class="squad-player-detail">
            <span>Altura</span>
            <span>${player.height ? player.height + " cm" : "-"}</span>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  loadClubMatches(matches, club) {
    const container = document.getElementById("club-matches-list");
    if (matches.length === 0) {
      container.innerHTML =
        '<div class="no-data">Nenhuma partida encontrada</div>';
      return;
    }

    container.innerHTML = matches
      .map((match) => {
        const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
        const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);
        const isHome = match.homeTeamId == club.id;
        const isFinished = match.status === "finished";

        let resultClass = "result-scheduled";
        let resultText = "A";
        let scoreDisplay = "vs";

        if (isFinished) {
          const clubScore = isHome ? match.homeScore : match.awayScore;
          const opponentScore = isHome ? match.awayScore : match.homeScore;
          scoreDisplay = `${match.homeScore} - ${match.awayScore}`;

          resultClass = "result-draw";
          resultText = "E";
          if (clubScore > opponentScore) {
            resultClass = "result-win";
            resultText = "V";
          } else if (clubScore < opponentScore) {
            resultClass = "result-loss";
            resultText = "D";
          }
        }

        return `
        <div class="club-match-item">
          <div class="club-match-date">${new Date(
            match.date
          ).toLocaleDateString("pt-BR")}</div>
          <div class="club-match-teams">
            <div class="club-match-team home">
              <span class="club-match-team-name">${homeTeam?.name}</span>
              <img src="${
                homeTeam?.logo || "https://via.placeholder.com/30"
              }" class="club-match-team-logo" alt="${homeTeam?.name}">
            </div>
            <div class="club-match-score">${scoreDisplay}</div>
            <div class="club-match-team">
              <img src="${
                awayTeam?.logo || "https://via.placeholder.com/30"
              }" class="club-match-team-logo" alt="${awayTeam?.name}">
              <span class="club-match-team-name">${awayTeam?.name}</span>
            </div>
          </div>
          <div class="club-match-result ${resultClass}">${resultText}</div>
        </div>
      `;
      })
      .join("");
  }

  loadClubStatistics(players, matches) {
    // Artilheiros do clube
    const scorers = {};
    const assists = {};

    matches.forEach((match) => {
      if (match.events) {
        match.events.forEach((event) => {
          const player = players.find(
            (p) => p.id == event.playerId || p.name === event.player
          );
          if (player) {
            if (event.type === "Gol") {
              scorers[player.id] = scorers[player.id] || { player, goals: 0 };
              scorers[player.id].goals++;
            } else if (event.type === "Assistência") {
              assists[player.id] = assists[player.id] || { player, assists: 0 };
              assists[player.id].assists++;
            }
          }
        });
      }
    });

    // Top scorers
    const topScorers = Object.values(scorers)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5);
    const scorersContainer = document.getElementById("club-top-scorers");
    if (topScorers.length === 0) {
      scorersContainer.innerHTML =
        '<div class="no-data">Nenhum artilheiro encontrado</div>';
    } else {
      scorersContainer.innerHTML = topScorers
        .map(
          (scorer) => `
        <div class="top-player-item" onclick="app.showPlayerProfile(${
          scorer.player.id
        })">
          <div class="top-player-info">
            <img src="${
              scorer.player.photo ||
              "https://static.flashscore.com/res/image/empty-face-man-share.gif"
            }" class="top-player-photo" alt="${scorer.player.name}">
            <div>
              <div class="top-player-name">${scorer.player.name}</div>
              <div class="top-player-position">${scorer.player.position}</div>
            </div>
          </div>
          <div class="top-player-stat">${scorer.goals}</div>
        </div>
      `
        )
        .join("");
    }

    // Top assists
    const topAssists = Object.values(assists)
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 5);
    const assistsContainer = document.getElementById("club-top-assists");
    if (topAssists.length === 0) {
      assistsContainer.innerHTML =
        '<div class="no-data">Nenhuma assistência encontrada</div>';
    } else {
      assistsContainer.innerHTML = topAssists
        .map(
          (assist) => `
        <div class="top-player-item" onclick="app.showPlayerProfile(${
          assist.player.id
        })">
          <div class="top-player-info">
            <img src="${
              assist.player.photo ||
              "https://static.flashscore.com/res/image/empty-face-man-share.gif"
            }" class="top-player-photo" alt="${assist.player.name}">
            <div>
              <div class="top-player-name">${assist.player.name}</div>
              <div class="top-player-position">${assist.player.position}</div>
            </div>
          </div>
          <div class="top-player-stat">${assist.assists}</div>
        </div>
      `
        )
        .join("");
    }
  }

  showClubTab(tabName) {
    // Remover classe active de todas as abas
    document
      .querySelectorAll(".club-tab")
      .forEach((tab) => tab.classList.remove("active"));
    document
      .querySelectorAll(".club-tab-content")
      .forEach((content) => content.classList.remove("active"));

    // Ativar aba selecionada
    event.target.classList.add("active");
    document.getElementById(`club-${tabName}`).classList.add("active");
  }

  closeClubProfile() {
    document.getElementById("club-profile-modal").style.display = "none";
  }

  // Perfil do Torneio
  showTournamentProfile(tournamentId) {
    const tournament = this.data.tournaments.find((t) => t.id === tournamentId);
    if (!tournament) return;

    const tournamentClubs = this.getUserData("clubs").filter(
      (c) => c.tournamentId == tournament.id
    );
    const tournamentMatches = this.getUserData("matches").filter(
      (m) => m.tournamentId == tournament.id
    );

    // Preencher dados do modal
    document.getElementById("tournament-profile-logo").src =
      tournament.logo || "https://via.placeholder.com/120";
    document.getElementById("tournament-profile-name").textContent =
      tournament.name;
    document.getElementById("tournament-profile-game").textContent =
      tournament.game === "efootball"
        ? "eFootball"
        : tournament.game === "fifa"
        ? "FIFA"
        : tournament.game;
    document.getElementById(
      "tournament-profile-dates"
    ).textContent = `Início: ${new Date(
      tournament.startDate
    ).toLocaleDateString("pt-BR")}`;

    this.loadTournamentStandings(
      tournamentClubs,
      tournamentMatches,
      tournament.id
    );
    this.loadTournamentMatches(tournamentMatches);
    this.loadTournamentStatistics(tournamentMatches);
    this.loadTournamentClubs(tournamentClubs, tournamentMatches);

    document.getElementById("tournament-profile-modal").style.display = "block";
  }

  loadTournamentStandings(clubs, matches, tournamentId) {
    if (clubs.length === 0) {
      document.querySelector("#tournament-standings-table tbody").innerHTML =
        '<tr><td colspan="10" class="no-data">Nenhum clube encontrado</td></tr>';
      return;
    }

    // Calcular classificação
    const standings = clubs.map((club) => {
      const clubMatches = matches.filter(
        (m) =>
          (m.homeTeamId == club.id || m.awayTeamId == club.id) &&
          m.status === "finished"
      );

      const stats = {
        club,
        matches: clubMatches.length,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      };

      clubMatches.forEach((match) => {
        const isHome = match.homeTeamId == club.id;
        const clubScore = isHome ? match.homeScore : match.awayScore;
        const opponentScore = isHome ? match.awayScore : match.homeScore;

        stats.goalsFor += clubScore;
        stats.goalsAgainst += opponentScore;

        if (clubScore > opponentScore) {
          stats.wins++;
          stats.points += 3;
        } else if (clubScore === opponentScore) {
          stats.draws++;
          stats.points += 1;
        } else {
          stats.losses++;
        }
      });

      stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
      return stats;
    });

    // Ordenar por pontos, saldo de gols, gols pró
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference)
        return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    const tbody = document.querySelector("#tournament-standings-table tbody");
    tbody.innerHTML = standings
      .map((team, index) => {
        let positionClass = "";
        const tournament = this.data.tournaments.find(
          (t) => t.id == tournamentId
        );

        if (tournament?.type === "champions") {
          // Liga dos Campeões: top 8 se classificam
          if (index < 8) positionClass = "position-qualified";
          else if (index >= 8) positionClass = "position-eliminated";
        } else if (tournament?.type === "national") {
          // Liga Nacional: 1º campeão, últimos 4 rebaixados
          if (index === 0) positionClass = "position-champion";
          else if (index >= standings.length - 4)
            positionClass = "position-relegation";
        } else {
          // Torneio padrão
          if (index === 0) positionClass = "position-champion";
          else if (index < 4) positionClass = "position-qualified";
          else if (index >= standings.length - 2)
            positionClass = "position-relegation";
        }

        return `
        <tr>
          <td><div class="standings-position ${positionClass}">${
          index + 1
        }</div></td>
          <td>
            <div class="team-info">
              <img src="${
                team.club.logo || "https://via.placeholder.com/30"
              }" class="team-logo" alt="${team.club.name}" onclick="app.showClubProfile(${
              team.club.id
            })">
              <span class="team-name" onclick="app.showClubProfile(${
              team.club.id
            })">${team.club.name}</span>
              <button class="btn-history" onclick="event.stopPropagation(); app.showTeamHistoryOptions(${team.club.id}, ${tournamentId})" title="Ver histórico">📊</button>
            </div>
          </td>
          <td class="stat-number">${team.matches}</td>
          <td class="stat-number">${team.wins}</td>
          <td class="stat-number">${team.draws}</td>
          <td class="stat-number">${team.losses}</td>
          <td class="stat-number">${team.goalsFor}</td>
          <td class="stat-number">${team.goalsAgainst}</td>
          <td class="stat-number">${team.goalDifference > 0 ? "+" : ""}${
          team.goalDifference
        }</td>
          <td class="stat-number" style="font-weight: 700; color: var(--primary-color);">${
            team.points
          }</td>
        </tr>
      `;
      })
      .join("");
  }

  loadTournamentMatches(matches) {
    const container = document.getElementById("tournament-matches-container");
    if (matches.length === 0) {
      container.innerHTML =
        '<div class="no-data">Nenhuma partida encontrada</div>';
      return;
    }

    // Agrupar por rodada
    const matchesByRound = {};
    matches.forEach((match) => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });

    container.innerHTML = Object.keys(matchesByRound)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map((round) => {
        const roundMatches = matchesByRound[round];
        return `
          <div class="round-section">
            <div class="round-header">
              <div class="round-title">Rodada ${round}</div>
            </div>
            <div class="round-matches">
              ${roundMatches
                .map((match) => {
                  const homeTeam = this.data.clubs.find(
                    (c) => c.id == match.homeTeamId
                  );
                  const awayTeam = this.data.clubs.find(
                    (c) => c.id == match.awayTeamId
                  );
                  const isFinished = match.status === "finished";

                  return `
                  <div class="tournament-match-item">
                    <div class="tournament-match-time">${new Date(
                      match.date
                    ).toLocaleDateString("pt-BR")}</div>
                    <div class="tournament-match-teams">
                      <div class="tournament-match-team home">
                        <span class="tournament-match-team-name">${
                          homeTeam?.name
                        }</span>
                        <img src="${
                          homeTeam?.logo || "https://via.placeholder.com/25"
                        }" class="tournament-match-team-logo" alt="${
                    homeTeam?.name
                  }">
                      </div>
                      <div class="tournament-match-score">
                        ${
                          isFinished
                            ? `${match.homeScore} - ${match.awayScore}`
                            : "vs"
                        }
                      </div>
                      <div class="tournament-match-team">
                        <img src="${
                          awayTeam?.logo || "https://via.placeholder.com/25"
                        }" class="tournament-match-team-logo" alt="${
                    awayTeam?.name
                  }">
                        <span class="tournament-match-team-name">${
                          awayTeam?.name
                        }</span>
                      </div>
                    </div>
                    <div class="tournament-match-actions">
                      <div class="match-status-badge ${
                        isFinished ? "status-finished" : "status-scheduled"
                      }">
                        ${isFinished ? "Finalizada" : "Agendada"}
                      </div>
                      ${
                        isFinished
                          ? `<button class="btn-match-details" onclick="app.showMatchDetails(${match.id})">Ver Detalhes</button>`
                          : ""
                      }
                    </div>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>
        `;
      })
      .join("");
  }

  loadTournamentStatistics(matches) {
    const scorers = {};
    const assists = {};

    matches.forEach((match) => {
      if (match.events) {
        match.events.forEach((event) => {
          const player = this.data.players.find(
            (p) => p.id == event.playerId || p.name === event.player
          );
          const club = this.data.clubs.find((c) => c.id == player?.clubId);

          if (player && event.type === "Gol") {
            scorers[player.id] = scorers[player.id] || {
              player,
              club,
              goals: 0,
            };
            scorers[player.id].goals++;
          } else if (player && event.type === "Assistência") {
            assists[player.id] = assists[player.id] || {
              player,
              club,
              assists: 0,
            };
            assists[player.id].assists++;
          }
        });
      }
    });

    // Top scorers
    const topScorers = Object.values(scorers)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10);
    const scorersContainer = document.getElementById(
      "tournament-top-scorers-list"
    );
    if (topScorers.length === 0) {
      scorersContainer.innerHTML =
        '<div class="no-data">Nenhum artilheiro encontrado</div>';
    } else {
      scorersContainer.innerHTML = topScorers
        .map(
          (scorer) => `
        <div class="tournament-player-item" onclick="app.showPlayerProfile(${
          scorer.player.id
        })">
          <div class="tournament-player-info">
            <img src="${
              scorer.player.photo ||
              "https://static.flashscore.com/res/image/empty-face-man-share.gif"
            }" class="tournament-player-photo" alt="${scorer.player.name}">
            <div class="tournament-player-details">
              <div class="tournament-player-name">${scorer.player.name}</div>
              <div class="tournament-player-club">${
                scorer.club?.name || "Sem clube"
              }</div>
            </div>
          </div>
          <div class="tournament-player-stat">${scorer.goals}</div>
        </div>
      `
        )
        .join("");
    }

    // Top assists
    const topAssists = Object.values(assists)
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 10);
    const assistsContainer = document.getElementById(
      "tournament-top-assists-list"
    );
    if (topAssists.length === 0) {
      assistsContainer.innerHTML =
        '<div class="no-data">Nenhuma assistência encontrada</div>';
    } else {
      assistsContainer.innerHTML = topAssists
        .map(
          (assist) => `
        <div class="tournament-player-item" onclick="app.showPlayerProfile(${
          assist.player.id
        })">
          <div class="tournament-player-info">
            <img src="${
              assist.player.photo ||
              "https://static.flashscore.com/res/image/empty-face-man-share.gif"
            }" class="tournament-player-photo" alt="${assist.player.name}">
            <div class="tournament-player-details">
              <div class="tournament-player-name">${assist.player.name}</div>
              <div class="tournament-player-club">${
                assist.club?.name || "Sem clube"
              }</div>
            </div>
          </div>
          <div class="tournament-player-stat">${assist.assists}</div>
        </div>
      `
        )
        .join("");
    }
  }

  loadTournamentClubs(clubs, matches) {
    const container = document.getElementById("tournament-clubs-list");
    if (clubs.length === 0) {
      container.innerHTML =
        '<div class="no-data">Nenhum clube encontrado</div>';
      return;
    }

    container.innerHTML = clubs
      .map((club) => {
        const clubMatches = matches.filter(
          (m) =>
            (m.homeTeamId == club.id || m.awayTeamId == club.id) &&
            m.status === "finished"
        );
        const clubPlayers = this.getUserData("players").filter(
          (p) => p.clubId == club.id
        );

        let wins = 0;
        clubMatches.forEach((match) => {
          const isHome = match.homeTeamId == club.id;
          const clubScore = isHome ? match.homeScore : match.awayScore;
          const opponentScore = isHome ? match.awayScore : match.homeScore;
          if (clubScore > opponentScore) wins++;
        });

        return `
        <div class="tournament-club-card" onclick="app.showClubProfile(${
          club.id
        })">
          <div class="tournament-club-header">
            <img src="${
              club.logo || "https://via.placeholder.com/60"
            }" class="tournament-club-logo" alt="${club.name}">
            <div class="tournament-club-info">
              <h4>${club.name}</h4>
              <div class="tournament-club-country">
                <img src="${this.getCountryFlag(
                  club.country
                )}" class="flag-icon" alt="${
          club.country
        }" style="width: 16px; height: 12px; margin-right: 5px;">
                ${club.country}
              </div>
            </div>
          </div>
          <div class="tournament-club-stats">
            <div class="tournament-club-stat">
              <div class="tournament-club-stat-number">${
                clubMatches.length
              }</div>
              <div class="tournament-club-stat-label">Jogos</div>
            </div>
            <div class="tournament-club-stat">
              <div class="tournament-club-stat-number">${wins}</div>
              <div class="tournament-club-stat-label">Vitórias</div>
            </div>
            <div class="tournament-club-stat">
              <div class="tournament-club-stat-number">${
                clubPlayers.length
              }</div>
              <div class="tournament-club-stat-label">Jogadores</div>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  showTournamentTab(tabName) {
    document
      .querySelectorAll(".tournament-tab")
      .forEach((tab) => tab.classList.remove("active"));
    document
      .querySelectorAll(".tournament-tab-content")
      .forEach((content) => content.classList.remove("active"));

    event.target.classList.add("active");
    document.getElementById(`tournament-${tabName}`).classList.add("active");
  }

  closeTournamentProfile() {
    document.getElementById("tournament-profile-modal").style.display = "none";
  }

  // Histórico de Confrontos
  showMatchHistory(club1Id, club2Id) {
    const club1 = this.data.clubs.find(c => c.id == club1Id);
    const club2 = this.data.clubs.find(c => c.id == club2Id);
    
    if (!club1 || !club2) return;
    
    const matches = this.getUserData("matches").filter(m => 
      m.status === "finished" && 
      ((m.homeTeamId == club1Id && m.awayTeamId == club2Id) || 
       (m.homeTeamId == club2Id && m.awayTeamId == club1Id))
    );
    
    // Calcular estatísticas do confronto
    let club1Wins = 0, club2Wins = 0, draws = 0;
    let club1Goals = 0, club2Goals = 0;
    
    matches.forEach(match => {
      const club1IsHome = match.homeTeamId == club1Id;
      const club1Score = club1IsHome ? match.homeScore : match.awayScore;
      const club2Score = club1IsHome ? match.awayScore : match.homeScore;
      
      club1Goals += club1Score;
      club2Goals += club2Score;
      
      if (club1Score > club2Score) club1Wins++;
      else if (club2Score > club1Score) club2Wins++;
      else draws++;
    });
    
    // Preencher modal
    document.getElementById("history-club1-logo").src = club1.logo || "https://via.placeholder.com/60";
    document.getElementById("history-club1-name").textContent = club1.name;
    document.getElementById("history-club2-logo").src = club2.logo || "https://via.placeholder.com/60";
    document.getElementById("history-club2-name").textContent = club2.name;
    
    document.getElementById("history-total-matches").textContent = matches.length;
    document.getElementById("history-club1-wins").textContent = club1Wins;
    document.getElementById("history-draws").textContent = draws;
    document.getElementById("history-club2-wins").textContent = club2Wins;
    document.getElementById("history-club1-goals").textContent = club1Goals;
    document.getElementById("history-club2-goals").textContent = club2Goals;
    
    // Carregar lista de partidas
    const container = document.getElementById("history-matches-list");
    if (matches.length === 0) {
      container.innerHTML = '<div class="no-data">Nenhum confronto encontrado</div>';
    } else {
      container.innerHTML = matches.sort((a, b) => new Date(b.date) - new Date(a.date)).map(match => {
        const homeTeam = this.data.clubs.find(c => c.id == match.homeTeamId);
        const awayTeam = this.data.clubs.find(c => c.id == match.awayTeamId);
        const tournament = this.data.tournaments.find(t => t.id == match.tournamentId);
        
        return `
          <div class="history-match-item" onclick="app.showMatchDetails(${match.id})">
            <div class="history-match-date">${new Date(match.date).toLocaleDateString("pt-BR")}</div>
            <div class="history-match-teams">
              <div class="history-match-team">
                <img src="${homeTeam?.logo || "https://via.placeholder.com/30"}" alt="${homeTeam?.name}">
                <span>${homeTeam?.name}</span>
              </div>
              <div class="history-match-score">${match.homeScore} - ${match.awayScore}</div>
              <div class="history-match-team">
                <span>${awayTeam?.name}</span>
                <img src="${awayTeam?.logo || "https://via.placeholder.com/30"}" alt="${awayTeam?.name}">
              </div>
            </div>
            <div class="history-match-tournament">${tournament?.name || "Torneio"}</div>
          </div>
        `;
      }).join("");
    }
    
    document.getElementById("match-history-modal").style.display = "block";
  }
  
  closeMatchHistory() {
    document.getElementById("match-history-modal").style.display = "none";
  }
  
  showTeamHistoryOptions(clubId, tournamentId) {
    const club = this.data.clubs.find(c => c.id == clubId);
    const otherClubs = this.getUserData("clubs").filter(c => 
      c.tournamentId == tournamentId && c.id != clubId
    );
    
    if (otherClubs.length === 0) {
      alert("Não há outros clubes neste torneio para comparar.");
      return;
    }
    
    document.getElementById("history-options-club-name").textContent = club.name;
    document.getElementById("history-options-club-logo").src = club.logo || "https://via.placeholder.com/40";
    
    const container = document.getElementById("history-options-list");
    container.innerHTML = otherClubs.map(otherClub => {
      const matches = this.getUserData("matches").filter(m => 
        m.status === "finished" && 
        ((m.homeTeamId == clubId && m.awayTeamId == otherClub.id) || 
         (m.homeTeamId == otherClub.id && m.awayTeamId == clubId))
      );
      
      return `
        <div class="history-option-item" onclick="app.showMatchHistory(${clubId}, ${otherClub.id}); app.closeHistoryOptions();">
          <img src="${otherClub.logo || "https://via.placeholder.com/30"}" alt="${otherClub.name}">
          <span class="opponent-name">${otherClub.name}</span>
          <span class="matches-count">${matches.length} jogos</span>
        </div>
      `;
    }).join("");
    
    document.getElementById("history-options-modal").style.display = "block";
  }
  
  closeHistoryOptions() {
    document.getElementById("history-options-modal").style.display = "none";
  }
  
  updateCoachSelects() {
    const coaches = this.getUserData("coaches");
    const selects = ["home-coach", "away-coach"];

    selects.forEach((selectId) => {
      const select = document.getElementById(selectId);
      if (select) {
        const currentValue = select.value;
        select.innerHTML =
          '<option value="">Selecione o treinador</option>' +
          coaches
            .map((c) => `<option value="${c.id}">${c.name}</option>`)
            .join("");
        select.value = currentValue;
      }
    });
  }

  getCoachClubs(coachId) {
    return this.getUserData("matches")
      .filter(m => m.homeCoachId == coachId || m.awayCoachId == coachId)
      .map(m => {
        const clubId = m.homeCoachId == coachId ? m.homeTeamId : m.awayTeamId;
        return this.data.clubs.find(c => c.id == clubId);
      })
      .filter((club, index, arr) => club && arr.findIndex(c => c.id === club.id) === index);
  }

  // Theme
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);

    const themeIcon = document.querySelector("#theme-toggle i");
    themeIcon.className = newTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }

  loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);

    const themeIcon = document.querySelector("#theme-toggle i");
    if (themeIcon) {
      themeIcon.className =
        savedTheme === "dark" ? "fas fa-sun" : "fas fa-moon";
    }
  }

  resetModalForms(modal) {
    if (modal.id === "tournament-modal") {
      const form = modal.querySelector("form");
      if (form.dataset.editId) {
        delete form.dataset.editId;
        modal.querySelector("h3").textContent = "Novo Torneio";
      }
    } else if (modal.id === "player-modal") {
      const form = modal.querySelector("form");
      if (form.dataset.editId) {
        delete form.dataset.editId;
        modal.querySelector("h3").textContent = "Novo Jogador";
      }
    } else if (modal.id === "coach-modal") {
      const form = modal.querySelector("form");
      if (form.dataset.editId) {
        delete form.dataset.editId;
        modal.querySelector("h3").textContent = "Novo Treinador";
      }
    } else if (modal.id === "match-modal") {
      const form = modal.querySelector("form");
      if (form.dataset.editId) {
        delete form.dataset.editId;
        modal.querySelector("h3").textContent = "Nova Partida";
      }
    } else if (modal.id === "club-modal") {
      const form = modal.querySelector("form");
      if (form.dataset.editId) {
        delete form.dataset.editId;
        modal.querySelector("h3").textContent = "Novo Clube";
      }
    }
  }

  // Carregar dados da nuvem
  async loadCloudData() {
    if (cloudStorage.firebaseReady && cloudStorage.currentUser) {
      console.log("Carregando todos os dados da nuvem...");

      try {
        // Carregar cada tipo de dado
        this.data.users = await cloudStorage.loadData("users");
        this.data.tournaments = await cloudStorage.loadData("tournaments");
        this.data.clubs = await cloudStorage.loadData("clubs");
        this.data.players = await cloudStorage.loadData("players");
        this.data.coaches = await cloudStorage.loadData("coaches");
        this.data.matches = await cloudStorage.loadData("matches");
        this.data.rounds = await cloudStorage.loadData("rounds");

        console.log("Dados carregados da nuvem:", {
          tournaments: this.data.tournaments.length,
          clubs: this.data.clubs.length,
          players: this.data.players.length,
          matches: this.data.matches.length,
        });
      } catch (error) {
        console.error("Erro ao carregar dados da nuvem:", error);
      }
    }
  }

  // Mobile Menu Functions
  toggleMobileMenu() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("active");
  }

  closeMobileMenu() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.remove("active");
  }

  // Event Listeners
  setupEventListeners() {
    // Login
    document
      .getElementById("login-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        try {
          if (await this.login(email, password)) {
            document.getElementById("login-form").reset();
          } else {
            alert("Email ou senha incorretos!");
          }
        } catch (error) {
          alert("Erro no login: " + error.message);
        }
      });

    document
      .getElementById("register-btn")
      .addEventListener("click", async () => {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        if (!email || !password) {
          alert("Preencha todos os campos!");
          return;
        }

        if (password.length < 6) {
          alert("A senha deve ter pelo menos 6 caracteres!");
          return;
        }

        try {
          if (await this.register(email, password)) {
            alert("Conta criada com sucesso! Faça login.");
            document.getElementById("login-form").reset();
          } else {
            alert("Email já existe!");
          }
        } catch (error) {
          alert("Erro no cadastro: " + error.message);
        }
      });

    document
      .getElementById("logout-btn")
      .addEventListener("click", async () => {
        await this.logout();
      });

    // Theme toggle
    document.getElementById("theme-toggle").addEventListener("click", () => {
      this.toggleTheme();
    });

    // Menu
    document.querySelectorAll(".menu a").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const screen = e.target.closest("a").dataset.screen;
        this.showSection(screen);
        // Fechar menu mobile após clicar
        this.closeMobileMenu();
      });
    });

    // Modais
    this.setupModalListeners();

    // Formulários
    this.setupFormListeners();

    // Filtros
    document.getElementById("club-filter").addEventListener("change", () => {
      this.loadPlayers();
    });

    document
      .getElementById("coaches-club-filter")
      .addEventListener("change", () => {
        this.loadCoaches();
      });

    // Filtros de busca
    document
      .getElementById("tournaments-search")
      .addEventListener("input", () => {
        this.loadTournaments();
      });

    document.getElementById("clubs-search").addEventListener("input", () => {
      this.loadClubs();
    });

    document.getElementById("players-search").addEventListener("input", () => {
      this.loadPlayers();
    });

    document.getElementById("coaches-search").addEventListener("input", () => {
      this.loadCoaches();
    });

    document.getElementById("matches-search").addEventListener("input", () => {
      this.loadMatches();
    });

    document
      .getElementById("tournament-scorers-filter")
      .addEventListener("change", () => {
        this.loadScorers();
      });

    document
      .getElementById("tournament-statistics-filter")
      .addEventListener("change", () => {
        this.loadStatistics();
      });

    document
      .getElementById("tournament-rounds-filter")
      .addEventListener("change", () => {
        this.loadRounds();
      });

    // Mobile menu
    document
      .getElementById("mobile-menu-toggle")
      .addEventListener("click", () => {
        this.toggleMobileMenu();
      });

    document.getElementById("sidebar-overlay").addEventListener("click", () => {
      this.closeMobileMenu();
    });

    document.getElementById("match-played").addEventListener("change", (e) => {
      const eventsSection = document.getElementById("match-events-section");
      const homeScore = document.getElementById("home-score");
      const awayScore = document.getElementById("away-score");

      if (e.target.checked) {
        eventsSection.style.display = "block";
        homeScore.required = true;
        awayScore.required = true;
        this.updateMotmPlayers();
      } else {
        eventsSection.style.display = "none";
        homeScore.required = false;
        awayScore.required = false;
        homeScore.value = "";
        awayScore.value = "";
        document.getElementById("events-container").innerHTML = "";
      }
    });

    document.getElementById("home-team").addEventListener("change", () => {
      this.updateMotmPlayers();
    });

    document.getElementById("away-team").addEventListener("change", () => {
      this.updateMotmPlayers();
    });

    // Atualizar selects de treinadores quando modal abrir
    document.getElementById("add-match-btn").addEventListener("click", () => {
      this.updateCoachSelects();
    });
  }

  setupModalListeners() {
    const modals = [
      "tournament-modal",
      "club-modal",
      "player-modal",
      "coach-modal",
      "match-modal",
      "round-modal",
    ];
    const buttons = [
      "add-tournament-btn",
      "add-club-btn",
      "add-player-btn",
      "add-coach-btn",
      "add-match-btn",
    ];

    buttons.forEach((btnId, index) => {
      document.getElementById(btnId).addEventListener("click", () => {
        document.getElementById(modals[index]).style.display = "block";
      });
    });

    document.querySelectorAll(".close").forEach((closeBtn) => {
      closeBtn.addEventListener("click", (e) => {
        const modal = e.target.closest(".modal");
        modal.style.display = "none";
        this.resetModalForms(modal);
      });
    });

    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        e.target.style.display = "none";
        this.resetModalForms(e.target);
      }
      if (e.target.classList.contains("player-profile-modal")) {
        this.closePlayerProfile();
      }
      if (e.target.classList.contains("club-profile-modal")) {
        this.closeClubProfile();
      }
      if (e.target.classList.contains("tournament-profile-modal")) {
        this.closeTournamentProfile();
      }
      if (e.target.classList.contains("match-details-modal")) {
        this.closeMatchDetails();
      }
      if (e.target.classList.contains("coach-profile-modal")) {
        this.closeCoachProfile();
      }
      if (e.target.classList.contains("match-history-modal")) {
        this.closeMatchHistory();
      }
      if (e.target.classList.contains("history-options-modal")) {
        this.closeHistoryOptions();
      }
    });

    document
      .getElementById("generate-matches-btn")
      .addEventListener("click", () => {
        this.generateMatches();
      });

    document.getElementById("add-event-btn").addEventListener("click", () => {
      this.addMatchEvent();
    });
  }

  setupFormListeners() {
    // Tournament form
    document
      .getElementById("tournament-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = {
          name: document.getElementById("tournament-name").value,
          logo: document.getElementById("tournament-logo").value,
          game: document.getElementById("tournament-game").value,
          type: document.getElementById("tournament-type").value,
          startDate: document.getElementById("tournament-start").value,
          description: document.getElementById("tournament-description").value,
        };

        const editId = e.target.dataset.editId;
        if (editId) {
          await this.updateTournament(parseInt(editId), data);
          delete e.target.dataset.editId;
        } else {
          await this.createTournament(data);
        }

        document.getElementById("tournament-modal").style.display = "none";
        e.target.reset();
      });

    // Club form
    document
      .getElementById("club-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = {
          name: document.getElementById("club-name").value,
          country: document.getElementById("club-country").value,
          logo: document.getElementById("club-logo").value,
          tournamentId:
            parseInt(document.getElementById("club-tournament").value) || null,
        };

        const editId = e.target.dataset.editId;
        if (editId) {
          await this.updateClub(parseInt(editId), data);
          delete e.target.dataset.editId;
        } else {
          await this.createClub(data);
        }

        document.getElementById("club-modal").style.display = "none";
        e.target.reset();
      });

    // Player form
    document
      .getElementById("player-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const birthdate = document.getElementById("player-birthdate").value;
        const age = this.calculateAge(birthdate);

        const data = {
          name: document.getElementById("player-name").value,
          birthdate: birthdate,
          age: age,
          position: document.getElementById("player-position").value,
          nationality: document.getElementById("player-nationality").value,
          number:
            parseInt(document.getElementById("player-number").value) || null,
          height:
            parseInt(document.getElementById("player-height").value) || null,
          photo: document.getElementById("player-photo").value,
          clubId:
            parseInt(document.getElementById("player-club").value) || null,
        };

        const editId = e.target.dataset.editId;
        if (editId) {
          await this.updatePlayer(parseInt(editId), data);
          delete e.target.dataset.editId;
        } else {
          await this.createPlayer(data);
        }

        document.getElementById("player-modal").style.display = "none";
        e.target.reset();
      });

    // Coach form
    document
      .getElementById("coach-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const data = {
          name: document.getElementById("coach-name").value,
          birthdate: document.getElementById("coach-birthdate").value,
          nationality: document.getElementById("coach-nationality").value,
          experience:
            parseInt(document.getElementById("coach-experience").value) || null,
          formation: document.getElementById("coach-formation").value,
          photo: document.getElementById("coach-photo").value,
        };

        const editId = e.target.dataset.editId;
        if (editId) {
          await this.updateCoach(parseInt(editId), data);
          delete e.target.dataset.editId;
        } else {
          await this.createCoach(data);
        }

        document.getElementById("coach-modal").style.display = "none";
        e.target.reset();
      });

    // Match form
    document
      .getElementById("match-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const data = {
          homeTeamId: parseInt(document.getElementById("home-team").value),
          awayTeamId: parseInt(document.getElementById("away-team").value),
          round: parseInt(document.getElementById("match-round").value),
          date: document.getElementById("match-date").value,
          tournamentId: parseInt(
            document.getElementById("match-tournament").value
          ),
        };

        // Adicionar scores apenas se preenchidos
        const homeScore = document.getElementById("home-score").value;
        const awayScore = document.getElementById("away-score").value;
        if (homeScore) data.homeScore = parseInt(homeScore);
        if (awayScore) data.awayScore = parseInt(awayScore);

        // Adicionar dados do melhor jogador da partida
        const motmPlayerId = document.getElementById("motm-player").value;
        const motmRating = document.getElementById("motm-rating").value;
        if (motmPlayerId && motmRating) {
          data.motm = {
            playerId: parseInt(motmPlayerId),
            rating: parseFloat(motmRating),
          };
        }

        // Processar eventos
        const events = [];
        const eventItems = document.querySelectorAll(".event-item");
        eventItems.forEach((item, index) => {
          const minute = formData.get(`event_minute_${index}`);
          const type = formData.get(`event_type_${index}`);
          const playerSelect = item.querySelector(
            `select[name="event_player_${index}"]`
          );
          const team = formData.get(`event_team_${index}`);

          if (minute && type && playerSelect.value && team) {
            const selectedPlayerOption =
              playerSelect.options[playerSelect.selectedIndex];
            events.push({
              minute: parseInt(minute),
              type: type,
              player: playerSelect.value,
              playerId: selectedPlayerOption.dataset.playerId || null,
              team: team,
            });
          }
        });

        if (events.length > 0) {
          data.events = events;
        }

        const editId = e.target.dataset.editId;
        if (editId) {
          await this.updateMatch(parseInt(editId), data);
          delete e.target.dataset.editId;
        } else {
          await this.createMatch(data);
        }

        document.getElementById("match-modal").style.display = "none";
        document.getElementById("events-container").innerHTML = "";
        e.target.reset();
      });

    // Round form
    document
      .getElementById("round-form")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
          tournamentId: parseInt(e.target.dataset.tournamentId),
          number: parseInt(formData.get("round-number")),
          date: formData.get("round-date"),
          matches: [],
        };

        const matchPairs = e.target.querySelectorAll(".match-pair");
        matchPairs.forEach((pair) => {
          const homeSelect = pair.querySelector("select[name^='homeTeam_']");
          const awaySelect = pair.querySelector("select[name^='awayTeam_']");
          if (homeSelect.value && awaySelect.value) {
            data.matches.push({
              homeTeamId: parseInt(homeSelect.value),
              awayTeamId: parseInt(awaySelect.value),
            });
          }
        });

        await this.createRound(data);
        document.getElementById("round-modal").style.display = "none";
        e.target.reset();
        document.getElementById("round-matches").innerHTML = "";
      });
  }
}

// Funções globais
function showLogin() {
  document.getElementById("landing-screen").classList.remove("active");
  document.getElementById("login-screen").classList.add("active");
}

// Inicializar aplicação
const app = new TournamentManager();
