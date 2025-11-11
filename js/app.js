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
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    console.log("Firebase ready:", cloudStorage.firebaseReady);
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

    // Preencher anos dinamicamente
    this.updateCurrentYear();

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
      const currentPlayer = this.data.players[playerIndex];

      // Se mudou de clube, adicionar ao histórico
      if (data.clubId && data.clubId != currentPlayer.clubId) {
        const clubHistory = currentPlayer.clubHistory || [];
        clubHistory.push({
          clubId: data.clubId,
          joinDate: new Date().toISOString(),
        });
        data.clubHistory = clubHistory;
      }

      this.data.players[playerIndex] = {
        ...currentPlayer,
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

    // Atualizar checkboxes de torneios para clubes
    this.updateTournamentCheckboxes();
  }

  updateTournamentCheckboxes() {
    const tournaments = this.getUserData("tournaments");
    const container = document.getElementById("club-tournaments-checkboxes");
    if (container) {
      container.innerHTML = tournaments
        .map(
          (t) => `
          <label class="checkbox-item">
            <input type="checkbox" value="${t.id}" name="tournament">
            <span>${t.name}</span>
          </label>
        `
        )
        .join("");
    }
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
        const tournaments = this.data.tournaments.filter(
          (t) => club.tournamentIds && club.tournamentIds.includes(t.id)
        );
        const tournamentNames =
          tournaments.map((t) => t.name).join(", ") || "Nenhum";
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
          <p><strong>Torneios:</strong> ${tournamentNames}</p>
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
    document.getElementById("club-primary-color").value =
      club.primaryColor || "#ffffff";
    document.getElementById("club-secondary-color").value =
      club.secondaryColor || "#000000";
    document.getElementById("club-text-color").value =
      club.textColor || "#000000";
    // Marcar checkboxes dos torneios do clube
    const clubTournaments = club.tournamentIds || [];
    document
      .querySelectorAll('#club-tournaments-checkboxes input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = clubTournaments.includes(parseInt(checkbox.value));
      });

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
      clubHistory: data.clubId
        ? [
            {
              clubId: data.clubId,
              joinDate: new Date().toISOString(),
            },
          ]
        : [],
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
            ${
              club?.logo
                ? `<img src="${club.logo}" alt="${club.name}" class="coach-club-badge">`
                : ""
            }
          </div>
          <h3>${coach.name}</h3>
          <p><strong>Nacionalidade:</strong> ${coach.nationality}</p>
          <p><strong>Experiência:</strong> ${coach.experience || "N/A"} anos</p>
          <p><strong>Formação:</strong> ${coach.formation || "N/A"}</p>
          <p><strong>Clubes:</strong> ${
            this.getCoachClubs(coach.id)
              .map((c) => c.name)
              .join(", ") || "Livre"
          }</p>
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
            <button class="btn-edit" onclick="app.editMatch(${
              match.id
            })">Editar</button>
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

    // Carregar resumo dos gols
    this.loadMatchGoalsSummary(match);

    // Carregar eventos
    this.loadMatchEvents(match);

    // Carregar melhor jogador da partida
    this.loadMatchMotm(match);

    document.getElementById("match-details-modal").style.display = "block";
  }

  loadMatchGoalsSummary(match) {
    const container = document.getElementById("match-goals-summary");

    if (!match.events || match.events.length === 0) {
      container.style.display = "none";
      return;
    }

    const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
    const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);

    const homeGoals = match.events.filter(
      (e) => e.type === "Gol" && e.team === homeTeam?.name
    );
    const awayGoals = match.events.filter(
      (e) => e.type === "Gol" && e.team === awayTeam?.name
    );

    if (homeGoals.length === 0 && awayGoals.length === 0) {
      container.style.display = "none";
      return;
    }

    container.style.display = "flex";
    container.innerHTML = `
      <div class="goals-list">
        ${homeGoals
          .map(
            (goal) => `
          <div class="goal-item">
            <span class="goal-minute">${goal.minute}'</span>
            <span class="goal-player">${goal.player}</span>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="goals-list">
        ${awayGoals
          .map(
            (goal) => `
          <div class="goal-item">
            <span class="goal-minute">${goal.minute}'</span>
            <span class="goal-player">${goal.player}</span>
          </div>
        `
          )
          .join("")}
      </div>
    `;
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

    // Agrupar eventos por minuto e time
    const eventsByMinute = {};
    match.events.forEach((event) => {
      const key = `${event.minute}-${event.team}`;
      if (!eventsByMinute[key]) {
        eventsByMinute[key] = [];
      }
      eventsByMinute[key].push(event);
    });

    // Ordenar por minuto
    const sortedMinutes = Object.keys(eventsByMinute).sort((a, b) => {
      const minuteA = parseInt(a.split("-")[0]);
      const minuteB = parseInt(b.split("-")[0]);
      return minuteA - minuteB;
    });

    container.innerHTML = sortedMinutes
      .map((key) => {
        const events = eventsByMinute[key];
        const minute = parseInt(key.split("-")[0]);
        const team = key.split("-")[1];
        const isHomeTeam = team === homeTeam?.name;

        // Separar gol e assistência
        const goal = events.find((e) => e.type === "Gol");
        const assist = events.find((e) => e.type === "Assistência");
        const otherEvents = events.filter(
          (e) => e.type !== "Gol" && e.type !== "Assistência"
        );

        let html = "";

        // Se há gol e assistência no mesmo minuto, mostrar juntos
        if (goal && assist) {
          const goalPlayer = this.data.players.find(
            (p) => p.id == goal.playerId || p.name === goal.player
          );
          const assistPlayer = this.data.players.find(
            (p) => p.id == assist.playerId || p.name === assist.player
          );

          html += `
            <div class="match-event-item goal-event ${
              isHomeTeam ? "home-event" : "away-event"
            }">
              <div class="event-minute">${minute}'</div>
              <div class="event-content">
                <div class="event-icon">⚽</div>
                <div class="event-details">
                  <div class="goal-assist-combo">
                    <div class="goal-info">
                      <span class="event-type">Gol</span>
                      <div class="event-player">
                        <img src="${
                          goalPlayer?.photo ||
                          "https://static.flashscore.com/res/image/empty-face-man-share.gif"
                        }" class="event-player-photo" alt="${goal.player}">
                        <span class="player-name">${goal.player}</span>
                      </div>
                    </div>
                    <div class="assist-info">
                      <span class="assist-label">Assistência:</span>
                      <div class="event-player">
                        <img src="${
                          assistPlayer?.photo ||
                          "https://static.flashscore.com/res/image/empty-face-man-share.gif"
                        }" class="event-player-photo" alt="${assist.player}">
                        <span class="player-name">${assist.player}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="event-team">
                <img src="${
                  isHomeTeam
                    ? homeTeam?.logo
                    : awayTeam?.logo || "https://via.placeholder.com/25"
                }" class="event-team-logo" alt="${team}">
              </div>
            </div>
          `;
        } else {
          // Mostrar eventos individuais
          events.forEach((event) => {
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
              case "Gol Contra":
                eventIcon = "⭕";
                eventClass = "own-goal-event";
                break;
              case "Pênalti Perdido":
                eventIcon = "❌";
                eventClass = "missed-penalty-event";
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
              case "Substituição":
                eventIcon = "🔄";
                eventClass = "substitution-event";
                break;
              default:
                eventIcon = "⚪";
                eventClass = "other-event";
            }

            html += `
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
                <div class="event-team">
                  <img src="${
                    isHomeTeam
                      ? homeTeam?.logo
                      : awayTeam?.logo || "https://via.placeholder.com/25"
                  }" class="event-team-logo" alt="${team}">
                </div>
              </div>
            `;
          });
        }

        return html;
      })
      .join("");
  }

  loadMatchMotm(match) {
    const container = document.getElementById("match-motm-section");

    if (!match.motm || !match.motm.playerId) {
      container.style.display = "none";
      return;
    }

    const player = this.data.players.find((p) => p.id == match.motm.playerId);
    const club = this.data.clubs.find((c) => c.id == player?.clubId);

    if (player) {
      container.style.display = "block";
      container.innerHTML = `
        <h3>⭐ Melhor Jogador da Partida</h3>
        <div class="motm-player-card" onclick="app.showPlayerProfile(${
          player.id
        })">
          <img src="${
            player.photo ||
            "https://static.flashscore.com/res/image/empty-face-man-share.gif"
          }" class="motm-player-photo" alt="${player.name}">
          <div class="motm-player-info">
            <div class="motm-player-name">${player.name}</div>
            <div class="motm-player-club">${club?.name || "Sem clube"}</div>
            <div class="motm-player-rating">Nota: ${match.motm.rating}/10</div>
          </div>
        </div>
      `;
    } else {
      container.style.display = "none";
    }
  }

  closeMatchDetails() {
    document.getElementById("match-details-modal").style.display = "none";
  }

  calculateDefensiveRatings(match) {
    if (match.status !== "finished") return;

    const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
    const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);

    if (!homeTeam || !awayTeam) return;

    // Jogadores que participaram dos eventos
    const playersWithEvents = new Set();
    if (match.events) {
      match.events.forEach((event) => {
        if (event.playerId) playersWithEvents.add(event.playerId);
      });
    }

    // Calcular notas para time da casa
    const homePlayers = this.data.players.filter(
      (p) => p.clubId == match.homeTeamId
    );
    const homeDefenders = homePlayers.filter(
      (p) =>
        ["Goleiro", "Zagueiro", "Lateral"].includes(p.position) &&
        !playersWithEvents.has(p.id)
    );

    homeDefenders.forEach((player) => {
      let rating = 6.0; // Nota base

      // Bônus por não sofrer gols
      if (match.awayScore === 0) {
        rating += player.position === "Goleiro" ? 2.0 : 1.5;
      } else if (match.awayScore === 1) {
        rating += player.position === "Goleiro" ? 0.5 : 0.3;
      } else {
        // Penalidade por sofrer muitos gols
        rating -=
          (match.awayScore - 1) * (player.position === "Goleiro" ? 0.8 : 0.5);
      }

      // Bônus por vitória
      if (match.homeScore > match.awayScore) {
        rating += 0.5;
      } else if (match.homeScore < match.awayScore) {
        rating -= 0.3;
      }

      rating = Math.max(4.0, Math.min(10.0, rating));

      if (!match.defensiveRatings) match.defensiveRatings = {};
      match.defensiveRatings[player.id] = parseFloat(rating.toFixed(1));
    });

    // Calcular notas para time visitante
    const awayPlayers = this.data.players.filter(
      (p) => p.clubId == match.awayTeamId
    );
    const awayDefenders = awayPlayers.filter(
      (p) =>
        ["Goleiro", "Zagueiro", "Lateral"].includes(p.position) &&
        !playersWithEvents.has(p.id)
    );

    awayDefenders.forEach((player) => {
      let rating = 6.0;

      if (match.homeScore === 0) {
        rating += player.position === "Goleiro" ? 2.0 : 1.5;
      } else if (match.homeScore === 1) {
        rating += player.position === "Goleiro" ? 0.5 : 0.3;
      } else {
        rating -=
          (match.homeScore - 1) * (player.position === "Goleiro" ? 0.8 : 0.5);
      }

      if (match.awayScore > match.homeScore) {
        rating += 0.5;
      } else if (match.awayScore < match.homeScore) {
        rating -= 0.3;
      }

      rating = Math.max(4.0, Math.min(10.0, rating));

      if (!match.defensiveRatings) match.defensiveRatings = {};
      match.defensiveRatings[player.id] = parseFloat(rating.toFixed(1));
    });
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

    // Calcular notas defensivas se a partida estiver finalizada
    if (match.status === "finished") {
      this.calculateDefensiveRatings(match);
    }

    console.log("Partida criada:", match);
    this.data.matches.push(match);
    await this.saveData("matches");
    this.loadMatches();
    this.updateStats();
  }

  editMatch(matchId) {
    const match = this.data.matches.find((m) => m.id === matchId);
    if (!match) return;

    // Atualizar selects de treinadores primeiro
    this.updateCoachSelects();

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

    // Carregar treinadores se existirem
    if (match.homeCoachId) {
      document.getElementById("home-coach").value = match.homeCoachId;
    }
    if (match.awayCoachId) {
      document.getElementById("away-coach").value = match.awayCoachId;
    }

    if (match.homeScore !== undefined && match.awayScore !== undefined) {
      document.getElementById("match-played").checked = true;
      document.getElementById("home-score").value = match.homeScore;
      document.getElementById("away-score").value = match.awayScore;
      document.getElementById("match-events-section").style.display = "block";
      document.getElementById("home-score").required = true;
      document.getElementById("away-score").required = true;

      // Carregar eventos existentes
      if (match.events && match.events.length > 0) {
        match.events.forEach((event, index) => {
          this.addMatchEvent();
          const eventItem = document.querySelectorAll(".event-item")[index];
          if (eventItem) {
            eventItem.querySelector(
              `input[name="event_minute_${index}"]`
            ).value = event.minute;
            eventItem.querySelector(
              `select[name="event_type_${index}"]`
            ).value = event.type;
            eventItem.querySelector(
              `select[name="event_team_${index}"]`
            ).value = event.team;

            // Atualizar jogadores e selecionar o correto
            this.updateEventPlayers(index);
            setTimeout(() => {
              const playerSelect = eventItem.querySelector(
                `select[name="event_player_${index}"]`
              );
              if (playerSelect) {
                playerSelect.value = event.player;
              }
            }, 100);
          }
        });
      }

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

    // ALTERAÇÃO: filtrar clubes por array tournamentIds
    const clubs = this.getUserData("clubs").filter(
      (c) =>
        Array.isArray(c.tournamentIds) &&
        c.tournamentIds.includes(parseInt(tournamentId))
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
        rating: 0,
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

        // Adicionar nota defensiva automática se existir
        if (match.defensiveRatings && match.defensiveRatings[player.id]) {
          stats.totalEvents++; // Contar como participação
        }
      });

      // Calcular nota automática
      stats.rating = this.calculatePlayerRating(stats, player.position);

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

    // Calcular melhores jogadores da temporada (MOTM)
    const motmStats = {};
    matches.forEach((match) => {
      if (match.motm && match.motm.playerId) {
        const player = players.find((p) => p.id == match.motm.playerId);
        const club = clubs.find((c) => c.id == player?.clubId);
        if (player) {
          if (!motmStats[player.id]) {
            motmStats[player.id] = {
              player,
              club: club?.name || "N/A",
              motmCount: 0,
              totalRating: 0,
              avgRating: 0,
            };
          }
          motmStats[player.id].motmCount++;
          motmStats[player.id].totalRating += match.motm.rating;
          motmStats[player.id].avgRating = (
            motmStats[player.id].totalRating / motmStats[player.id].motmCount
          ).toFixed(1);
        }
      }
    });

    const topMotmPlayers = Object.values(motmStats)
      .sort((a, b) => {
        if (b.motmCount !== a.motmCount) return b.motmCount - a.motmCount;
        return b.avgRating - a.avgRating;
      })
      .slice(0, 10);

    container.innerHTML = `
      <div class="statistics-sections">
        <div class="statistics-table">
          <h3>Estatísticas Gerais dos Jogadores</h3>
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
                <th>Nota</th>
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
                  <td><strong style="color: #4CAF50;">${
                    stats.goals
                  }</strong></td>
                  <td><strong style="color: #2196F3;">${
                    stats.assists
                  }</strong></td>
                  <td>${stats.yellowCards > 0 ? stats.yellowCards : "-"}</td>
                  <td>${stats.redCards > 0 ? stats.redCards : "-"}</td>
                  <td><span class="rating-badge ${this.getRatingClass(
                    stats.rating
                  )}">${
                    stats.rating > 0 ? stats.rating.toFixed(1) : "-"
                  }</span></td>
                  <td><strong>${stats.totalEvents}</strong></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        ${
          topMotmPlayers.length > 0
            ? `
        <div class="statistics-table motm-table">
          <h3>⭐ Melhores Jogadores da Temporada</h3>
          <table>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Jogador</th>
                <th>Clube</th>
                <th>MOTM</th>
                <th>Nota Média</th>
              </tr>
            </thead>
            <tbody>
              ${topMotmPlayers
                .map(
                  (stats, index) => `
                <tr onclick="app.showPlayerProfile(${
                  stats.player.id
                })" style="cursor: pointer;">
                  <td>${index + 1}</td>
                  <td><strong>${stats.player.name}</strong></td>
                  <td>${stats.club}</td>
                  <td><strong style="color: #FFD700;">${
                    stats.motmCount
                  }</strong></td>
                  <td><strong style="color: #FF6B35;">${
                    stats.avgRating
                  }</strong></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
        `
            : ""
        }
        
        <div class="statistics-table rating-table">
          <h3>🏆 Melhores Jogadores por Desempenho</h3>
          <table>
            <thead>
              <tr>
                <th>Pos</th>
                <th>Jogador</th>
                <th>Clube</th>
                <th>Posição</th>
                <th>Jogos</th>
                <th>Nota Média</th>
              </tr>
            </thead>
            <tbody>
              ${activePlayerStats
                .filter((stats) => stats.rating > 0)
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 15)
                .map(
                  (stats, index) => `
                <tr onclick="app.showPlayerProfile(${
                  stats.id
                })" style="cursor: pointer;">
                  <td>${index + 1}</td>
                  <td><strong>${stats.name}</strong></td>
                  <td>${stats.club}</td>
                  <td><span class="position-badge ${stats.position.toLowerCase()}">${
                    stats.position
                  }</span></td>
                  <td>${stats.matches}</td>
                  <td><span class="rating-badge ${this.getRatingClass(
                    stats.rating
                  )}">${stats.rating.toFixed(1)}</span></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
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
    // ALTERAÇÃO: filtrar clubes por array tournamentIds
    const clubs = this.getUserData("clubs").filter(
      (c) =>
        Array.isArray(c.tournamentIds) &&
        c.tournamentIds.includes(parseInt(tournamentId))
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
    // ALTERAÇÃO: filtrar clubes por array tournamentIds
    const clubs = this.getUserData("clubs").filter(
      (c) =>
        Array.isArray(c.tournamentIds) &&
        c.tournamentIds.includes(parseInt(tournamentId))
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
    // ALTERAÇÃO: filtrar clubes por array tournamentIds
    const clubs = this.getUserData("clubs").filter(
      (c) =>
        Array.isArray(c.tournamentIds) &&
        c.tournamentIds.includes(parseInt(tournamentId))
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
    // ALTERAÇÃO: filtrar clubes por array tournamentIds
    const clubs = this.getUserData("clubs").filter(
      (c) =>
        Array.isArray(c.tournamentIds) &&
        c.tournamentIds.includes(parseInt(tournamentId))
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
          <option value="Gol Contra">Gol Contra</option>
          <option value="Pênalti Perdido">Pênalti Perdido</option>
          <option value="Assistência">Assistência</option>
          <option value="Cartão Amarelo">Cartão Amarelo</option>
          <option value="Cartão Vermelho">Cartão Vermelho</option>
          <option value="Substituição">Substituição</option>
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

  // Função para calcular nota automática do jogador
  calculatePlayerRating(playerStats, position) {
    if (playerStats.matches === 0) return 0;

    let baseRating = 5.0; // Nota base
    let totalRating = 0;
    let ratingCount = 0;

    // Verificar se há notas defensivas automáticas
    const matches = this.getUserData("matches").filter(
      (m) => m.status === "finished"
    );
    matches.forEach((match) => {
      if (match.defensiveRatings && match.defensiveRatings[playerStats.id]) {
        totalRating += match.defensiveRatings[playerStats.id];
        ratingCount++;
      }
    });

    // Se há notas defensivas, usar média delas
    if (ratingCount > 0) {
      return totalRating / ratingCount;
    }

    // Caso contrário, usar sistema antigo baseado em eventos
    // Pontuação por eventos positivos
    const goalPoints = playerStats.goals * 1.5;
    const assistPoints = playerStats.assists * 1.0;

    // Penalização por cartões
    const yellowCardPenalty = playerStats.yellowCards * 0.3;
    const redCardPenalty = playerStats.redCards * 1.0;

    // Bônus por posição (atacantes ganham mais por gols, defensores menos penalizados por cartões)
    let positionMultiplier = 1.0;
    if (position === "Atacante") {
      positionMultiplier = 1.2; // Atacantes ganham mais por gols
    } else if (position === "Meia") {
      positionMultiplier = 1.1; // Meias ganham mais por assistências
    } else if (position === "Goleiro") {
      positionMultiplier = 0.8; // Goleiros têm menos oportunidades de eventos
    }

    // Calcular nota final
    const totalPositivePoints =
      (goalPoints + assistPoints) * positionMultiplier;
    const totalPenalty = yellowCardPenalty + redCardPenalty;
    const averagePerformance =
      (totalPositivePoints - totalPenalty) / playerStats.matches;

    let finalRating = baseRating + averagePerformance;

    // Limitar entre 1.0 e 10.0
    finalRating = Math.max(1.0, Math.min(10.0, finalRating));

    return finalRating;
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
      "Irlanda do Norte": "https://flagcdn.com/w20/gb-nir.png",
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
      "Costa do Marfim": "https://flagcdn.com/w20/ci.png",
      Senegal: "https://flagcdn.com/w20/sn.png",
      Togo: "https://flagcdn.com/w20/tg.png",
      Guiné: "https://flagcdn.com/w20/gn.png",
      Zâmbia: "https://flagcdn.com/w20/zm.png",
      Moçambique: "https://flagcdn.com/w20/mz.png",
      Angola: "https://flagcdn.com/w20/ao.png",
      Mali: "https://flagcdn.com/w20/ml.png",
      Níger: "https://flagcdn.com/w20/ne.png",
      Chade: "https://flagcdn.com/w20/td.png",
      "Arábia Saudita": "https://flagcdn.com/w20/sa.png",
      Irã: "https://flagcdn.com/w20/ir.png",
      Iraque: "https://flagcdn.com/w20/iq.png",
      Síria: "https://flagcdn.com/w20/sy.png",
      Líbano: "https://flagcdn.com/w20/lb.png",
      Jordânia: "https://flagcdn.com/w20/jo.png",
      Kosovo: "https://flagcdn.com/w20/xk.png",
      Albânia: "https://flagcdn.com/w20/al.png",
      "Macedônia do Norte": "https://flagcdn.com/w20/mk.png",
      Montenegro: "https://flagcdn.com/w20/me.png",
      Bielorrússia: "https://flagcdn.com/w20/by.png",
      Armênia: "https://flagcdn.com/w20/am.png",
      Azerbaijão: "https://flagcdn.com/w20/az.png",
      Cazaquistão: "https://flagcdn.com/w20/kz.png",
      Uzbequistão: "https://flagcdn.com/w20/uz.png",
      "Nova Zelândia": "https://flagcdn.com/w20/nz.png",
      Fiji: "https://flagcdn.com/w20/fj.png",
      Samoa: "https://flagcdn.com/w20/ws.png",
      Indonésia: "https://flagcdn.com/w20/id.png",
      Malásia: "https://flagcdn.com/w20/my.png",
      Singapura: "https://flagcdn.com/w20/sg.png",
      Tailândia: "https://flagcdn.com/w20/th.png",
      Vietnã: "https://flagcdn.com/w20/vn.png",
      Filipinas: "https://flagcdn.com/w20/ph.png",
      Bangladesh: "https://flagcdn.com/w20/bd.png",
      Paquistão: "https://flagcdn.com/w20/pk.png",
      "Sri Lanka": "https://flagcdn.com/w20/lk.png",
      Bolívia: "https://flagcdn.com/w20/bo.png",
      "República Dominicana": "https://flagcdn.com/w20/do.png",
      "República Centro Africana": "https://flagcdn.com/w20/cf.png",
      Haiti: "https://flagcdn.com/w20/ht.png",
      Cuba: "https://flagcdn.com/w20/cu.png",
      "Burkina Faso": "https://flagcdn.com/w20/bf.png",
      Benin: "https://flagcdn.com/w20/bj.png",
      Gabão: "https://flagcdn.com/w20/ga.png",
      Eslovênia: "https://flagcdn.com/w20/si.png",
      "Coréia do Sul": "https://flagcdn.com/w20/kr.png",
      "Coréia do Norte": "https://flagcdn.com/w20/kp.png",
      "Bósnia e Herzegovina": "https://flagcdn.com/w20/ba.png",
      Gâmbia: "https://flagcdn.com/w20/gm.png",
      Libéria: "https://flagcdn.com/w20/lr.png",
      Seychelles: "https://flagcdn.com/w20/sc.png",
      Suriname: "https://flagcdn.com/w20/sr.png",
      Guiana: "https://flagcdn.com/w20/gy.png",
      Belize: "https://flagcdn.com/w20/bz.png",
      "El Salvador": "https://flagcdn.com/w20/sv.png",
      "Guiné-Bissau": "https://flagcdn.com/w20/gw.png",
      "São Tomé e Príncipe": "https://flagcdn.com/w20/st.png",
      "Timor-Leste": "https://flagcdn.com/w20/tl.png",
      "Guinea Equatorial": "https://flagcdn.com/w20/gq.png",
      "Ilhas Salomão": "https://flagcdn.com/w20/sb.png",
      "Papua Nova Guiné": "https://flagcdn.com/w20/pg.png",
      "Cabo Verde": "https://flagcdn.com/w20/cv.png",
      Zimbábue: "https://flagcdn.com/w20/zw.png",
      Líbia: "https://flagcdn.com/w20/ly.png",
      Moldávia: "https://flagcdn.com/w20/md.png",
      Burundi: "https://flagcdn.com/w20/bi.png",
      Ruanda: "https://flagcdn.com/w20/rw.png",
      Honduras: "https://flagcdn.com/w20/hn.png",
      Nicarágua: "https://flagcdn.com/w20/ni.png",
      "El Salvador": "https://flagcdn.com/w20/sv.png",
      "Serra Leoa": "https://flagcdn.com/w20/sl.png",
      Comores: "https://flagcdn.com/w20/km.png",
      "Ilhas Maurício": "https://flagcdn.com/w20/mu.png",
      "Ilhas Fiji": "https://flagcdn.com/w20/fj.png",
      Madagascar: "https://flagcdn.com/w20/mg.png",
      Guadalupe: "https://flagcdn.com/w20/gp.png",
      Mauritânia: "https://flagcdn.com/w20/mr.png",
      "Porto Rico": "https://flagcdn.com/w20/pr.png",
      Curaçao: "https://flagcdn.com/w20/cw.png",
      "Guiana-Francesa": "https://flagcdn.com/w20/gf.png",
      Guiana: "https://flagcdn.com/w20/gy.png",
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

    // Calcular estatísticas do jogador (apenas do clube atual)
    const playerStats = {
      matches: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      matchHistory: [],
      totalRating: 0,
      averageRating: 0,
    };

    matches.forEach((match) => {
      let playerInMatch = false;
      let playerInCurrentClub = false;
      const matchEvents = [];
      const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
      const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);

      if (match.events) {
        match.events.forEach((event) => {
          if (event.playerId == player.id || event.player === player.name) {
            playerInMatch = true;
            matchEvents.push(event);

            // Verificar se jogou pelo clube atual
            if (
              (event.team === homeTeam?.name &&
                homeTeam?.id == player.clubId) ||
              (event.team === awayTeam?.name && awayTeam?.id == player.clubId)
            ) {
              playerInCurrentClub = true;

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
          }
        });
      }

      if (playerInMatch && playerInCurrentClub) {
        playerStats.matches++;
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
    const automaticRating = this.calculatePlayerRating(
      playerStats,
      player.position
    );
    const ratingElement = document.getElementById("profile-rating");
    if (playerStats.matches > 0) {
      ratingElement.textContent = automaticRating.toFixed(1);
      ratingElement.className = `stat-number rating-badge ${this.getRatingClass(
        automaticRating
      )}`;
    } else {
      ratingElement.textContent = "-";
      ratingElement.className = "stat-number";
    }

    this.loadPlayerClubHistory(player);
    this.loadPlayerMatches(playerStats.matchHistory);

    document.getElementById("player-profile-modal").style.display = "block";
  }

  loadPlayerClubHistory(player) {
    const container = document.getElementById("profile-club-history");
    const matches = this.getUserData("matches").filter(
      (m) => m.status === "finished"
    );
    const clubStats = {};
    const currentYear = new Date().getFullYear();

    // Sempre incluir o clube atual do jogador
    if (player.clubId) {
      const currentClub = this.data.clubs.find((c) => c.id == player.clubId);
      if (currentClub) {
        clubStats[currentClub.id] = {
          club: currentClub,
          matches: new Set(),
          goals: 0,
          assists: 0,
        };
      }
    }

    // Incluir clubes do histórico se existir
    const clubHistory = player.clubHistory || [];
    clubHistory.forEach((historyItem) => {
      const club = this.data.clubs.find((c) => c.id == historyItem.clubId);
      if (club && !clubStats[club.id]) {
        clubStats[club.id] = {
          club: club,
          matches: new Set(),
          goals: 0,
          assists: 0,
        };
      }
    });

    // Analisar cada partida para determinar estatísticas por clube
    matches.forEach((match) => {
      if (match.events) {
        match.events.forEach((event) => {
          if (event.playerId == player.id || event.player === player.name) {
            let playerClub = null;
            const homeTeam = this.data.clubs.find(
              (c) => c.id == match.homeTeamId
            );
            const awayTeam = this.data.clubs.find(
              (c) => c.id == match.awayTeamId
            );

            if (event.team === homeTeam?.name) playerClub = homeTeam;
            else if (event.team === awayTeam?.name) playerClub = awayTeam;

            if (playerClub && clubStats[playerClub.id]) {
              clubStats[playerClub.id].matches.add(match.id);
              if (event.type === "Gol") clubStats[playerClub.id].goals++;
              if (event.type === "Assistência")
                clubStats[playerClub.id].assists++;
            }
          }
        });
      }
    });

    // Converter Set para número
    Object.values(clubStats).forEach((stats) => {
      stats.matches = stats.matches.size;
    });

    const clubHistoryList = Object.values(clubStats);

    if (clubHistoryList.length === 0) {
      container.innerHTML =
        '<div class="no-matches">Nenhum histórico encontrado</div>';
      return;
    }

    container.innerHTML = clubHistoryList
      .map((history) => {
        const isCurrent = history.club.id == player.clubId;
        return `
      <div class="club-history-item ${isCurrent ? "current-season" : ""}">
        <img src="${
          history.club.logo || "https://via.placeholder.com/40"
        }" class="club-history-logo" alt="${history.club.name}">
        <div class="club-history-info">
          <div class="club-history-name">
            ${history.club.name}
            ${
              isCurrent ? '<span class="current-season-badge">Atual</span>' : ""
            }
          </div>
          <div class="club-history-period">${currentYear}</div>
        </div>
        <div class="season-stats">
          <div class="season-stat">
            <div class="season-stat-number">${history.matches}</div>
            <div class="season-stat-label">Jogos</div>
          </div>
          <div class="season-stat">
            <div class="season-stat-number">${history.goals}</div>
            <div class="season-stat-label">Gols</div>
          </div>
          <div class="season-stat">
            <div class="season-stat-number">${history.assists}</div>
            <div class="season-stat-label">Assists</div>
          </div>
        </div>
      </div>
    `;
      })
      .join("");
  }

  loadPlayerMatches(matchHistory) {
    const timeline = document.getElementById("profile-matches-timeline");
    if (matchHistory.length === 0) {
      timeline.innerHTML =
        '<div class="no-matches">Nenhuma partida encontrada na temporada atual</div>';
      return;
    }

    // ALTERAÇÃO: ordenar do mais recente para o mais antigo
    const orderedHistory = [...matchHistory].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    timeline.innerHTML = orderedHistory
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
              let title = "";
              switch (event.type) {
                case "Gol":
                  className = "event-goal";
                  icon = "⚽";
                  title = `Gol aos ${event.minute}'`;
                  break;
                case "Assistência":
                  className = "event-assist";
                  icon = "🅰👟";
                  title = `Assistência aos ${event.minute}'`;
                  break;
                case "Cartão Amarelo":
                  className = "event-yellow";
                  icon = "🟨";
                  title = `Cartão amarelo aos ${event.minute}'`;
                  break;
                case "Cartão Vermelho":
                  className = "event-red";
                  icon = "🟥";
                  title = `Cartão vermelho aos ${event.minute}'`;
                  break;
                case "Gol Contra":
                  className = "event-own-goal";
                  icon = "⭕";
                  title = `Gol contra aos ${event.minute}'`;
                  break;
                case "Pênalti Perdido":
                  className = "event-penalty-missed";
                  icon = "❌";
                  title = `Pênalti perdido aos ${event.minute}'`;
                  break;
                default:
                  return "";
              }
              return `<span class="event-badge ${className}" title="${title}">${icon}<small>${event.minute}'</small></span>`;
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

    const matches = this.getUserData("matches").filter(
      (m) =>
        m.status === "finished" &&
        (m.homeCoachId == coachId || m.awayCoachId == coachId)
    );

    // Calcular estatísticas do treinador
    const coachStats = {
      matches: matches.length,
      wins: 0,
      draws: 0,
      losses: 0,
      matchHistory: [],
    };

    matches.forEach((match) => {
      const isHomeCoach = match.homeCoachId == coachId;
      const coachScore = isHomeCoach ? match.homeScore : match.awayScore;
      const opponentScore = isHomeCoach ? match.awayScore : match.homeScore;

      const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
      const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);
      const coachTeam = isHomeCoach ? homeTeam : awayTeam;

      let result = "draw";
      if (coachScore > opponentScore) {
        coachStats.wins++;
        result = "win";
      } else if (coachScore < opponentScore) {
        coachStats.losses++;
        result = "loss";
      } else {
        coachStats.draws++;
      }

      coachStats.matchHistory.push({
        date: match.date,
        homeTeam,
        awayTeam,
        score: `${match.homeScore} - ${match.awayScore}`,
        result,
        club: coachTeam,
      });
    });

    // Preencher dados do modal
    document.getElementById("coach-profile-photo").src =
      coach.photo ||
      "https://static.flashscore.com/res/image/empty-face-man-share.gif";
    document.getElementById("coach-profile-name").textContent = coach.name;
    document.getElementById("coach-profile-age").textContent =
      this.calculateAge(coach.birthdate)
        ? `${this.calculateAge(coach.birthdate)} anos`
        : "-";
    document.getElementById("coach-profile-birthdate").textContent =
      coach.birthdate ? this.formatDate(coach.birthdate, "dd Mês yyyy") : "-";

    const nationalityFlag = document.getElementById(
      "coach-profile-nationality-flag"
    );
    const nationalityText = document.getElementById(
      "coach-profile-nationality-text"
    );
    if (coach.nationality) {
      nationalityFlag.src = this.getCountryFlag(coach.nationality);
      nationalityFlag.style.display = "inline";
      nationalityText.textContent = coach.nationality;
    } else {
      nationalityFlag.style.display = "none";
      nationalityText.textContent = "-";
    }

    document.getElementById("coach-profile-experience").textContent =
      coach.experience ? `${coach.experience} anos` : "-";
    document.getElementById("coach-profile-formation").textContent =
      coach.formation || "-";

    // Estatísticas
    document.getElementById("coach-profile-matches").textContent =
      coachStats.matches;
    document.getElementById("coach-profile-wins").textContent = coachStats.wins;
    document.getElementById("coach-profile-draws").textContent =
      coachStats.draws;
    document.getElementById("coach-profile-losses").textContent =
      coachStats.losses;
    document.getElementById("coach-profile-winrate").textContent =
      coachStats.matches > 0
        ? ((coachStats.wins / coachStats.matches) * 100).toFixed(1) + "%"
        : "-";

    this.loadCoachClubHistory(coach, coachStats.matchHistory);
    this.loadCoachMatches(coachStats.matchHistory);
    this.loadCoachOpponents(coachId);

    document.getElementById("coach-profile-modal").style.display = "block";
  }

  loadCoachClubHistory(coach, matchHistory) {
    const container = document.getElementById("coach-profile-club-history");
    const currentYear = new Date().getFullYear();

    if (matchHistory.length === 0) {
      container.innerHTML =
        '<div class="no-matches">Nenhum histórico encontrado</div>';
      return;
    }

    // Agrupar partidas por clube
    const clubStats = {};
    matchHistory.forEach((match) => {
      const clubId = match.club.id;
      if (!clubStats[clubId]) {
        clubStats[clubId] = {
          club: match.club,
          matches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
        };
      }

      clubStats[clubId].matches++;
      if (match.result === "win") clubStats[clubId].wins++;
      else if (match.result === "draw") clubStats[clubId].draws++;
      else if (match.result === "loss") clubStats[clubId].losses++;
    });

    container.innerHTML = Object.values(clubStats)
      .map(
        (stats) => `
      <div class="club-history-item current-season">
        <img src="${
          stats.club.logo || "https://via.placeholder.com/40"
        }" class="club-history-logo" alt="${stats.club.name}">
        <div class="club-history-info">
          <div class="club-history-name">
            ${stats.club.name}
            <span class="current-season-badge">Atual</span>
          </div>
          <div class="club-history-period">${currentYear}</div>
        </div>
        <div class="season-stats">
          <div class="season-stat">
            <div class="season-stat-number">${stats.matches}</div>
            <div class="season-stat-label">Jogos</div>
          </div>
          <div class="season-stat">
            <div class="season-stat-number">${stats.wins}</div>
            <div class="season-stat-label">Vitórias</div>
          </div>
          <div class="season-stat">
            <div class="season-stat-number">${stats.draws}</div>
            <div class="season-stat-label">Empates</div>
          </div>
        </div>
      </div>
    `
      )
      .join("");
  }

  loadCoachMatches(matchHistory) {
    const timeline = document.getElementById("coach-profile-matches-timeline");
    if (matchHistory.length === 0) {
      timeline.innerHTML =
        '<div class="no-matches">Nenhuma partida encontrada</div>';
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
        <div class="match-result-badge ${match.result}">
          ${match.result === "win" ? "V" : match.result === "draw" ? "E" : "D"}
        </div>
      </div>
    `
      )
      .join("");
  }

  loadCoachOpponents(coachId) {
    const select = document.getElementById("h2h-opponent-select");
    const allMatches = this.getUserData("matches").filter(
      (m) => m.status === "finished"
    );
    const opponentIds = new Set();

    allMatches.forEach((match) => {
      if (match.homeCoachId == coachId && match.awayCoachId) {
        opponentIds.add(match.awayCoachId);
      } else if (match.awayCoachId == coachId && match.homeCoachId) {
        opponentIds.add(match.homeCoachId);
      }
    });

    const opponents = Array.from(opponentIds)
      .map((id) => this.data.coaches.find((c) => c.id == id))
      .filter(Boolean);

    select.innerHTML =
      '<option value="">Selecione um adversário</option>' +
      opponents
        .map((coach) => `<option value="${coach.id}">${coach.name}</option>`)
        .join("");

    select.dataset.currentCoachId = coachId;
  }

  loadCoachH2H() {
    const select = document.getElementById("h2h-opponent-select");
    const coachId = parseInt(select.dataset.currentCoachId);
    const opponentId = parseInt(select.value);

    if (!opponentId) return;

    const coach = this.data.coaches.find((c) => c.id == coachId);
    const opponent = this.data.coaches.find((c) => c.id == opponentId);
    const matches = this.getUserData("matches").filter(
      (m) =>
        m.status === "finished" &&
        ((m.homeCoachId == coachId && m.awayCoachId == opponentId) ||
          (m.homeCoachId == opponentId && m.awayCoachId == coachId))
    );

    let coachWins = 0,
      opponentWins = 0,
      draws = 0;
    let coachGoals = 0,
      opponentGoals = 0;

    matches.forEach((match) => {
      const coachIsHome = match.homeCoachId == coachId;
      const coachScore = coachIsHome ? match.homeScore : match.awayScore;
      const opponentScore = coachIsHome ? match.awayScore : match.homeScore;

      coachGoals += coachScore;
      opponentGoals += opponentScore;

      if (coachScore > opponentScore) coachWins++;
      else if (opponentScore > coachScore) opponentWins++;
      else draws++;
    });

    const container = document.getElementById("coach-h2h-results");
    container.innerHTML = `
      <div class="h2h-header">
        <div class="h2h-coach">
          <img src="${
            coach.photo ||
            "https://static.flashscore.com/res/image/empty-face-man-share.gif"
          }" alt="${coach.name}">
          <span>${coach.name}</span>
        </div>
        <div class="h2h-vs">vs</div>
        <div class="h2h-coach">
          <img src="${
            opponent.photo ||
            "https://static.flashscore.com/res/image/empty-face-man-share.gif"
          }" alt="${opponent.name}">
          <span>${opponent.name}</span>
        </div>
      </div>
      
      <div class="h2h-stats">
        <div class="h2h-stat">
          <div class="stat-number">${matches.length}</div>
          <div class="stat-label">Jogos</div>
        </div>
        <div class="h2h-stat">
          <div class="stat-number">${coachWins}</div>
          <div class="stat-label">Vitórias</div>
        </div>
        <div class="h2h-stat">
          <div class="stat-number">${draws}</div>
          <div class="stat-label">Empates</div>
        </div>
        <div class="h2h-stat">
          <div class="stat-number">${opponentWins}</div>
          <div class="stat-label">Vitórias</div>
        </div>
        <div class="h2h-stat">
          <div class="stat-number">${coachGoals}</div>
          <div class="stat-label">Gols</div>
        </div>
        <div class="h2h-stat">
          <div class="stat-number">${opponentGoals}</div>
          <div class="stat-label">Gols</div>
        </div>
      </div>
      
      ${
        matches.length > 0
          ? `
      <div class="h2h-matches">
        <h4>Últimos Confrontos</h4>
        ${matches
          .slice(-5)
          .reverse()
          .map((match) => {
            const homeTeam = this.data.clubs.find(
              (c) => c.id == match.homeTeamId
            );
            const awayTeam = this.data.clubs.find(
              (c) => c.id == match.awayTeamId
            );
            const coachIsHome = match.homeCoachId == coachId;
            const result =
              match.homeScore > match.awayScore
                ? coachIsHome
                  ? "win"
                  : "loss"
                : match.homeScore < match.awayScore
                ? coachIsHome
                  ? "loss"
                  : "win"
                : "draw";

            return `
            <div class="h2h-match-item ${result}">
              <div class="h2h-match-teams">
                <span>${homeTeam?.name || "Time"}</span>
                <span class="h2h-score">${match.homeScore} - ${
              match.awayScore
            }</span>
                <span>${awayTeam?.name || "Time"}</span>
              </div>
              <div class="h2h-match-date">${new Date(
                match.date
              ).toLocaleDateString("pt-BR")}</div>
            </div>
          `;
          })
          .join("")}
      </div>
      `
          : ""
      }
    `;
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

    // Salvar clubId no modal para uso posterior
    document.getElementById("club-profile-modal").dataset.clubId = clubId;
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

    matches.sort((a, b) => new Date(b.date) - new Date(a.date));

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

    // Carregar formação se for a aba de formação
    if (tabName === "formation") {
      const clubId = parseInt(
        document.getElementById("club-profile-modal").dataset.clubId
      );
      this.loadClubFormation(clubId);
    }
  }

  // Carregar formação do clube
  loadClubFormation(clubId) {
    const club = this.data.clubs.find((c) => c.id === clubId);
    const players = this.getUserData("players").filter(
      (p) => p.clubId == clubId
    );

    if (players.length === 0) {
      document.getElementById("club-formation-field").innerHTML =
        '<div class="no-data">Nenhum jogador encontrado para montar a formação</div>';
      return;
    }

    const formation = club.formation || "4-3-3";
    const lineup =
      club.lineup || this.generateDefaultLineup(players, formation);
    this.renderFormationEditor(lineup, formation, club, players);
  }

  // Gerar escalação padrão
  generateDefaultLineup(players, formation) {
    const formations = {
      "4-3-3": { def: 4, mid: 3, att: 3 },
      "4-4-2": { def: 4, mid: 4, att: 2 },
      "3-5-2": { def: 3, mid: 5, att: 2 },
      "4-2-3-1": { def: 4, mid: 5, att: 1 },
      "5-3-2": { def: 5, mid: 3, att: 2 },
    };

    const formationData = formations[formation] || formations["4-3-3"];
    const goalkeepers = players.filter((p) => p.position === "Goleiro");
    const defenders = players.filter((p) =>
      ["Zagueiro", "Lateral"].includes(p.position)
    );
    const midfielders = players.filter((p) =>
      ["Volante", "Meia"].includes(p.position)
    );
    const forwards = players.filter((p) => p.position === "Atacante");

    return {
      goalkeeper: goalkeepers[0]?.id || null,
      defenders: defenders.slice(0, formationData.def).map((p) => p.id),
      midfielders: midfielders.slice(0, formationData.mid).map((p) => p.id),
      forwards: forwards.slice(0, formationData.att).map((p) => p.id),
    };
  }

  // Renderizar editor de formação
  renderFormationEditor(lineup, formation, club, allPlayers) {
    const container = document.getElementById("club-formation-field");

    container.innerHTML = `
      <div class="formation-header">
        <div class="club-formation-info">
          <img src="${
            club.logo || "https://via.placeholder.com/40"
          }" class="formation-club-logo" alt="${club.name}">
          <div>
            <h3>${club.name}</h3>
            <select id="formation-select" onchange="app.changeFormation(${
              club.id
            })">
              <option value="4-3-3" ${
                formation === "4-3-3" ? "selected" : ""
              }>4-3-3</option>
              <option value="4-4-2" ${
                formation === "4-4-2" ? "selected" : ""
              }>4-4-2</option>
              <option value="3-5-2" ${
                formation === "3-5-2" ? "selected" : ""
              }>3-5-2</option>
              <option value="4-2-3-1" ${
                formation === "4-2-3-1" ? "selected" : ""
              }>4-2-3-1</option>
              <option value="5-3-2" ${
                formation === "5-3-2" ? "selected" : ""
              }>5-3-2</option>
            </select>
          </div>
        </div>
        <button class="btn-primary" onclick="app.saveLineup(${
          club.id
        })">Salvar Escalação</button>
      </div>
      <div class="football-field">
        <div class="field-lines">
          <div class="center-circle"></div>
          <div class="center-line"></div>
          <div class="penalty-area penalty-top"></div>
          <div class="penalty-area penalty-bottom"></div>
        </div>
        <div class="players-positions">
          ${this.renderEditablePositions(lineup, formation, allPlayers)}
        </div>
      </div>
    `;
  }

  // Renderizar posições editáveis
  renderEditablePositions(lineup, formation, allPlayers) {
    const formations = {
      "4-3-3": { def: 4, mid: 3, att: 3 },
      "4-4-2": { def: 4, mid: 4, att: 2 },
      "3-5-2": { def: 3, mid: 5, att: 2 },
      "4-2-3-1": { def: 4, mid: 5, att: 1 },
      "5-3-2": { def: 5, mid: 3, att: 2 },
    };

    const formationData = formations[formation] || formations["4-3-3"];

    // Ajustar arrays para o tamanho correto da formação
    const adjustedLineup = {
      goalkeeper: lineup.goalkeeper,
      defenders: (lineup.defenders || []).slice(0, formationData.def),
      midfielders: (lineup.midfielders || []).slice(0, formationData.mid),
      forwards: (lineup.forwards || []).slice(0, formationData.att),
    };

    // Preencher com nulls se necessário
    while (adjustedLineup.defenders.length < formationData.def) {
      adjustedLineup.defenders.push(null);
    }
    while (adjustedLineup.midfielders.length < formationData.mid) {
      adjustedLineup.midfielders.push(null);
    }
    while (adjustedLineup.forwards.length < formationData.att) {
      adjustedLineup.forwards.push(null);
    }

    // Renderizar meio-campo especial para 4-2-3-1
    let midfieldHtml = "";
    if (formation === "4-2-3-1") {
      const defensiveMids = adjustedLineup.midfielders.slice(0, 2);
      const offensiveMids = adjustedLineup.midfielders.slice(2, 5);

      midfieldHtml = `
        <div class="position-line midfielders-line offensive-mids">
          ${this.renderPositionSlots(
            "midfielder",
            3,
            offensiveMids,
            allPlayers,
            2
          )}
        </div>
        <div class="position-line midfielders-line defensive-mids">
          ${this.renderPositionSlots(
            "midfielder",
            2,
            defensiveMids,
            allPlayers,
            0
          )}
        </div>
      `;
    } else {
      midfieldHtml = `
        <div class="position-line midfielders-line">
          ${this.renderPositionSlots(
            "midfielder",
            formationData.mid,
            adjustedLineup.midfielders,
            allPlayers
          )}
        </div>
      `;
    }

    return `
      <div class="position-line forwards-line">
        ${this.renderPositionSlots(
          "forward",
          formationData.att,
          adjustedLineup.forwards,
          allPlayers
        )}
      </div>
      ${midfieldHtml}
      <div class="position-line defenders-line">
        ${this.renderPositionSlots(
          "defender",
          formationData.def,
          adjustedLineup.defenders,
          allPlayers
        )}
      </div>
      <div class="position-line goalkeeper-line">
        ${this.renderPositionSlots(
          "goalkeeper",
          1,
          [adjustedLineup.goalkeeper],
          allPlayers
        )}
      </div>
    `;
  }

  // Formatar nome do jogador para exibição na formação
  formatPlayerName(fullName) {
    if (!fullName) return "";
    const nameParts = fullName.trim().split(" ");
    if (nameParts.length === 1) {
      return nameParts[0]; // Apenas um nome
    }
    // Nome e sobrenome: primeira letra + sobrenome
    return nameParts[0].charAt(0) + ". " + nameParts.slice(1).join(" ");
  }

  // Renderizar slots de posição
  renderPositionSlots(
    positionType,
    count,
    selectedIds,
    allPlayers,
    indexOffset = 0
  ) {
    const slots = [];
    const clubId = parseInt(
      document.getElementById("club-profile-modal").dataset.clubId
    );
    const club = this.data.clubs.find((c) => c.id === clubId);

    for (let i = 0; i < count; i++) {
      const actualIndex = i + indexOffset;
      const playerId = selectedIds[i];
      const player = playerId ? allPlayers.find((p) => p.id == playerId) : null;

      const clubColors = club
        ? {
            primary: club.primaryColor || "#ffffff",
            secondary: club.secondaryColor || "#000000",
            text: club.textColor || "#000000",
          }
        : { primary: "#ffffff", secondary: "#000000", text: "#000000" };

      slots.push(`
        <div class="player-slot" data-position="${positionType}" data-index="${actualIndex}">
          ${
            player
              ? `
            <div class="player-card" onclick="app.showPlayerProfile(${
              player.id
            })" 
                 style="background: linear-gradient(135deg, ${
                   clubColors.primary
                 } 0%, ${clubColors.secondary} 100%); color: ${
                  clubColors.text
                };">
              <img src="${
                player.photo ||
                "https://static.flashscore.com/res/image/empty-face-man-share.gif"
              }" alt="${player.name}">
              <div class="player-info">
                <span class="player-name" style="color: ${
                  clubColors.text
                }; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">${this.formatPlayerName(
                  player.name
                )}</span>
                <span class="player-number" style="background: rgba(255,255,255,0.2); color: ${
                  clubColors.text
                };">${player.number || "?"}</span>
              </div>
              <button class="remove-player" onclick="app.removeFromLineup('${positionType}', ${actualIndex})">&times;</button>
            </div>
          `
              : `
            <div class="empty-slot" onclick="app.showPlayerSelector('${positionType}', ${actualIndex})">
              <i class="fas fa-plus"></i>
              <span>Adicionar</span>
            </div>
          `
          }
        </div>
      `);
    }
    return slots.join("");
  }

  // Mudar formação
  changeFormation(clubId) {
    const formation = document.getElementById("formation-select").value;
    const club = this.data.clubs.find((c) => c.id === clubId);
    const players = this.getUserData("players").filter(
      (p) => p.clubId == clubId
    );

    club.formation = formation;
    // Gerar nova escalação baseada na formação selecionada
    club.lineup = this.generateDefaultLineup(players, formation);
    this.loadClubFormation(clubId);
  }

  // Salvar escalação
  async saveLineup(clubId) {
    const club = this.data.clubs.find((c) => c.id === clubId);
    const formation = document.getElementById("formation-select").value;

    const lineup = {
      goalkeeper: null,
      defenders: [],
      midfielders: [],
      forwards: [],
    };

    // Coletar jogadores selecionados
    document.querySelectorAll(".player-slot").forEach((slot) => {
      const position = slot.dataset.position;
      const index = parseInt(slot.dataset.index);
      const playerCard = slot.querySelector(".player-card");

      if (playerCard) {
        const playerId = parseInt(
          playerCard.getAttribute("onclick").match(/\d+/)[0]
        );

        if (position === "goalkeeper") {
          lineup.goalkeeper = playerId;
        } else if (position === "defender") {
          lineup.defenders[index] = playerId;
        } else if (position === "midfielder") {
          lineup.midfielders[index] = playerId;
        } else if (position === "forward") {
          lineup.forwards[index] = playerId;
        }
      }
    });

    club.formation = formation;
    club.lineup = lineup;
    await this.saveData("clubs");
    alert("Escalação salva com sucesso!");
  }

  // Mostrar seletor de jogador
  showPlayerSelector(position, index) {
    const clubId = parseInt(
      document.getElementById("club-profile-modal").dataset.clubId
    );
    const players = this.getUserData("players").filter(
      (p) => p.clubId == clubId
    );

    const positionFilters = {
      goalkeeper: ["Goleiro"],
      defender: ["Zagueiro", "Lateral"],
      midfielder: ["Volante", "Meia"],
      forward: ["Atacante"],
    };

    const availablePlayers = players.filter((p) =>
      positionFilters[position].includes(p.position)
    );

    if (availablePlayers.length === 0) {
      alert("Nenhum jogador disponível para esta posição");
      return;
    }

    const playerList = availablePlayers
      .map(
        (p) =>
          `<div class="player-option" onclick="app.selectPlayer('${position}', ${index}, ${
            p.id
          })">
        <img src="${
          p.photo ||
          "https://static.flashscore.com/res/image/empty-face-man-share.gif"
        }" alt="${p.name}">
        <span>${p.name} (${p.number || "?"})</span>
      </div>`
      )
      .join("");

    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div class="player-selector-modal" id="player-selector">
        <div class="player-selector-content">
          <h3>Selecionar Jogador</h3>
          <div class="player-options">${playerList}</div>
          <button onclick="app.closePlayerSelector()">Cancelar</button>
        </div>
      </div>
    `
    );
  }

  // Selecionar jogador
  selectPlayer(position, index, playerId) {
    const slot = document.querySelector(
      `[data-position="${position}"][data-index="${index}"]`
    );
    const player = this.data.players.find((p) => p.id == playerId);

    slot.innerHTML = `
      <div class="player-card" onclick="app.showPlayerProfile(${player.id})">
        <img src="${
          player.photo ||
          "https://static.flashscore.com/res/image/empty-face-man-share.gif"
        }" alt="${player.name}">
        <div class="player-info">
          <span class="player-name">${player.name}</span>
          <span class="player-number">${player.number || "?"}</span>
        </div>
        <button class="remove-player" onclick="app.removeFromLineup('${position}', ${index})">&times;</button>
      </div>
    `;

    this.closePlayerSelector();
  }

  // Remover da escalação
  removeFromLineup(position, index) {
    const slot = document.querySelector(
      `[data-position="${position}"][data-index="${index}"]`
    );
    slot.innerHTML = `
      <div class="empty-slot" onclick="app.showPlayerSelector('${position}', ${index})">
        <i class="fas fa-plus"></i>
        <span>Adicionar</span>
      </div>
    `;
  }

  // Fechar seletor
  closePlayerSelector() {
    const modal = document.getElementById("player-selector");
    if (modal) modal.remove();
  }

  closeClubProfile() {
    document.getElementById("club-profile-modal").style.display = "none";
  }

  // Perfil do Torneio
  showTournamentProfile(tournamentId) {
    const tournament = this.data.tournaments.find((t) => t.id === tournamentId);
    if (!tournament) return;

    // ALTERAÇÃO: filtrar clubes por array tournamentIds
    const tournamentClubs = this.getUserData("clubs").filter(
      (c) =>
        Array.isArray(c.tournamentIds) &&
        c.tournamentIds.includes(tournament.id)
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

    document.getElementById("tournament-profile-modal").dataset.tournamentId =
      tournamentId;
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

    // Calcular últimos 5 jogos para cada time
    standings.forEach((team) => {
      const teamMatches = matches
        .filter(
          (m) =>
            (m.homeTeamId == team.club.id || m.awayTeamId == team.club.id) &&
            m.status === "finished"
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

      team.recentResults = teamMatches.map((match) => {
        const isHome = match.homeTeamId == team.club.id;
        const teamScore = isHome ? match.homeScore : match.awayScore;
        const opponentScore = isHome ? match.awayScore : match.homeScore;

        if (teamScore > opponentScore) return "V";
        if (teamScore < opponentScore) return "D";
        return "E";
      });
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

        const recentResultsHtml = team.recentResults
          .map((result) => {
            let className = "";
            if (result === "V") className = "result-win";
            else if (result === "E") className = "result-draw";
            else if (result === "D") className = "result-loss";
            return `<span class="recent-result ${className}">${result}</span>`;
          })
          .join("");

        return `
        <tr>
          <td class="pos-col"><div class="standings-position ${positionClass}">${
          index + 1
        }</div></td>
          <td class="team-col">
            <div class="team-info">
              <img src="${
                team.club.logo || "https://via.placeholder.com/30"
              }" class="team-logo" alt="${
          team.club.name
        }" onclick="app.showClubProfile(${team.club.id})">
              <span class="team-name" onclick="app.showClubProfile(${
                team.club.id
              })">${team.club.name}</span>
              <button class="btn-history" onclick="event.stopPropagation(); app.showTeamHistoryOptions(${
                team.club.id
              }, ${tournamentId})" title="Ver histórico">📊</button>
            </div>
          </td>
          <td class="stat-number mobile-hide">${team.matches}</td>
          <td class="stat-number mobile-hide">${team.wins}</td>
          <td class="stat-number mobile-hide">${team.draws}</td>
          <td class="stat-number mobile-hide">${team.losses}</td>
          <td class="stat-number mobile-hide">${team.goalsFor}</td>
          <td class="stat-number mobile-hide">${team.goalsAgainst}</td>
          <td class="stat-number mobile-hide">${
            team.goalDifference > 0 ? "+" : ""
          }${team.goalDifference}</td>
          <td class="stat-number pts-col">${team.points}</td>
          <td class="recent-col">
            <div class="recent-results">${recentResultsHtml}</div>
          </td>
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

    const rounds = Object.keys(matchesByRound).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );

    // Encontrar próxima rodada
    let currentRound = null;
    for (const round of rounds) {
      const roundMatches = matchesByRound[round];
      const hasUnfinished = roundMatches.some((m) => m.status !== "finished");
      if (hasUnfinished) {
        currentRound = round;
        break;
      }
    }

    // Se não há rodada atual, usar a última
    if (!currentRound && rounds.length > 0) {
      currentRound = rounds[rounds.length - 1];
    }

    let html = "";

    // Rodada atual em destaque
    if (currentRound) {
      const currentMatches = matchesByRound[currentRound];
      const hasUnfinished = currentMatches.some((m) => m.status !== "finished");

      html += `
        <div class="rounds-carousel">
          <div class="current-round-section">
            <div class="current-round-header">
              <div class="current-round-title">Rodada ${currentRound}</div>
              <div class="current-round-subtitle">${
                hasUnfinished ? "Em andamento" : "Finalizada"
              }</div>
            </div>
            <div class="current-round-matches">
              ${currentMatches
                .map((match) => {
                  const homeTeam = this.data.clubs.find(
                    (c) => c.id == match.homeTeamId
                  );
                  const awayTeam = this.data.clubs.find(
                    (c) => c.id == match.awayTeamId
                  );
                  const isFinished = match.status === "finished";

                  return `
                  <div class="current-match-item" ${
                    isFinished
                      ? `onclick="app.showMatchDetails(${match.id})" style="cursor: pointer;"`
                      : ""
                  }>
                    <div class="current-match-teams">
                      <div class="current-match-team home">
                        <img src="${
                          homeTeam?.logo || "https://via.placeholder.com/30"
                        }" class="current-match-logo" alt="${homeTeam?.name}">
                        <span class="current-match-name">${
                          homeTeam?.name
                        }</span>
                      </div>
                      <div class="current-match-vs">
                        ${
                          isFinished
                            ? match.homeScore > match.awayScore
                              ? `<span class="score-winner">${match.homeScore}</span> - <span class="score-loser">${match.awayScore}</span>`
                              : match.homeScore < match.awayScore
                              ? `<span class="score-loser">${match.homeScore}</span> - <span class="score-winner">${match.awayScore}</span>`
                              : `<span class="score-draw">${match.homeScore} - ${match.awayScore}</span>`
                            : "vs"
                        }
                      </div>
                      <div class="current-match-team away">
                        <img src="${
                          awayTeam?.logo || "https://via.placeholder.com/30"
                        }" class="current-match-logo" alt="${awayTeam?.name}">
                        <span class="current-match-name">${
                          awayTeam?.name
                        }</span>
                      </div>
                    </div>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>
        </div>
      `;
    }

    // Separar rodadas finalizadas e futuras
    const otherRounds = rounds.filter((r) => r !== currentRound);
    const finishedRounds = [];
    const futureRounds = [];

    otherRounds.forEach((round) => {
      const roundMatches = matchesByRound[round];
      const allFinished = roundMatches.every((m) => m.status === "finished");
      if (allFinished) {
        finishedRounds.push(round);
      } else {
        futureRounds.push(round);
      }
    });

    // Última rodada finalizada primeiro, depois futuras em ordem crescente
    const lastFinished = finishedRounds.sort(
      (a, b) => parseInt(b) - parseInt(a)
    )[0];
    const orderedRounds = [];

    if (lastFinished) {
      orderedRounds.push(lastFinished);
    }

    // Adicionar rodadas futuras em ordem crescente
    futureRounds
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((round) => {
        orderedRounds.push(round);
      });

    // Adicionar outras rodadas finalizadas (exceto a última)
    finishedRounds
      .filter((r) => r !== lastFinished)
      .sort((a, b) => parseInt(b) - parseInt(a))
      .forEach((round) => {
        orderedRounds.push(round);
      });

    orderedRounds.forEach((round) => {
      const roundMatches = matchesByRound[round];
      const allFinished = roundMatches.every((m) => m.status === "finished");

      html += `
        <div class="finished-round-card">
          <div class="round-header">
            <div class="round-title">Rodada ${round} ${
        allFinished ? "(Finalizada)" : "(Pendente)"
      }</div>
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
                          ? match.homeScore > match.awayScore
                            ? `<span class="score-winner">${match.homeScore}</span> - <span class="score-loser">${match.awayScore}</span>`
                            : match.homeScore < match.awayScore
                            ? `<span class="score-loser">${match.homeScore}</span> - <span class="score-winner">${match.awayScore}</span>`
                            : `<span class="score-draw">${match.homeScore} - ${match.awayScore}</span>`
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
                  ${
                    isFinished
                      ? `<div class="tournament-match-actions"><button class="btn-match-details" onclick="app.showMatchDetails(${match.id})">Ver Detalhes</button></div>`
                      : ""
                  }
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  loadTournamentStatistics(matches) {
    const scorers = {};
    const assists = {};
    const playerStats = {};

    matches.forEach((match) => {
      if (match.events) {
        match.events.forEach((event) => {
          const player = this.data.players.find(
            (p) => p.id == event.playerId || p.name === event.player
          );
          const club = this.data.clubs.find((c) => c.id == player?.clubId);

          if (player) {
            if (!playerStats[player.id]) {
              playerStats[player.id] = {
                player,
                club,
                goals: 0,
                assists: 0,
                matches: new Set(),
                totalRating: 0,
                motmCount: 0
              };
            }

            playerStats[player.id].matches.add(match.id);

            if (event.type === "Gol") {
              scorers[player.id] = scorers[player.id] || {
                player,
                club,
                goals: 0,
              };
              scorers[player.id].goals++;
              playerStats[player.id].goals++;
            } else if (event.type === "Assistência") {
              assists[player.id] = assists[player.id] || {
                player,
                club,
                assists: 0,
              };
              assists[player.id].assists++;
              playerStats[player.id].assists++;
            }
          }
        });
      }

      // Adicionar MOTM
      if (match.motm && match.motm.playerId) {
        const player = this.data.players.find((p) => p.id == match.motm.playerId);
        const club = this.data.clubs.find((c) => c.id == player?.clubId);
        
        if (player) {
          if (!playerStats[player.id]) {
            playerStats[player.id] = {
              player,
              club,
              goals: 0,
              assists: 0,
              matches: new Set(),
              totalRating: 0,
              motmCount: 0
            };
          }
          
          playerStats[player.id].motmCount++;
          playerStats[player.id].totalRating += parseFloat(match.motm.rating);
        }
      }
    });

    // Calcular pontuação final para cada jogador
    Object.values(playerStats).forEach(stats => {
      stats.matchCount = stats.matches.size;
      stats.avgRating = stats.motmCount > 0 ? (stats.totalRating / stats.motmCount) : 0;
      
      // Sistema de pontuação: gols (3pts) + assistências (2pts) + MOTM (5pts) + nota média
      stats.totalPoints = (stats.goals * 3) + (stats.assists * 2) + (stats.motmCount * 5) + stats.avgRating;
    });

    // Top 3 jogadores da temporada
    const topPlayers = Object.values(playerStats)
      .filter(stats => stats.totalPoints > 0)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 3);

    const topPlayersContainer = document.getElementById("tournament-top-players-list");
    if (topPlayers.length === 0) {
      topPlayersContainer.innerHTML = '<div class="no-data">Nenhum jogador encontrado</div>';
    } else {
      topPlayersContainer.innerHTML = topPlayers
        .map((stats, index) => `
          <div class="top-player-item" onclick="app.showPlayerProfile(${stats.player.id})">
            <div class="top-player-rank">${index + 1}</div>
            <img src="${
              stats.player.photo ||
              "https://static.flashscore.com/res/image/empty-face-man-share.gif"
            }" class="top-player-photo" alt="${stats.player.name}">
            <div class="top-player-info">
              <div class="top-player-name">${stats.player.name}</div>
              <div class="top-player-club-info">
                <img src="${
                  stats.club?.logo || "https://via.placeholder.com/20"
                }" class="top-player-club-logo" alt="${stats.club?.name || "Clube"}">
                <span class="top-player-club-name">${stats.club?.name || "Sem clube"}</span>
              </div>
            </div>
            <div class="top-player-stats">
              <div class="top-player-rating">
                <div class="top-player-rating-value">${stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}</div>
                <div class="top-player-rating-label">Nota</div>
              </div>
              <div class="top-player-points">
                <div class="top-player-points-value">${stats.totalPoints.toFixed(1)}</div>
                <div class="top-player-points-label">Pontos</div>
              </div>
            </div>
          </div>
        `)
        .join("");
    }

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
            <div class="tournament-player-photo-container">
              <img src="${
                scorer.player.photo ||
                "https://static.flashscore.com/res/image/empty-face-man-share.gif"
              }" class="tournament-player-photo" alt="${scorer.player.name}">
              <img src="${
                scorer.club?.logo || "https://via.placeholder.com/24"
              }" alt="${
            scorer.club?.name || "Clube"
          }" class="tournament-player-club-badge">
            </div>
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
            <div class="tournament-player-photo-container">
              <img src="${
                assist.player.photo ||
                "https://static.flashscore.com/res/image/empty-face-man-share.gif"
              }" class="tournament-player-photo" alt="${assist.player.name}">
              <img src="${
                assist.club?.logo || "https://via.placeholder.com/24"
              }" alt="${
            assist.club?.name || "Clube"
          }" class="tournament-player-club-badge">
            </div>
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

    if (tabName === "roundteam") {
      this.loadRoundTeams();
    }
  }

  loadRoundTeams() {
    const tournamentId = document.getElementById("tournament-profile-modal")
      .dataset.tournamentId;
    if (!tournamentId) return;

    const matches = this.getUserData("matches").filter(
      (m) => m.tournamentId == tournamentId && m.status === "finished"
    );

    const roundNumbers = [...new Set(matches.map((m) => m.round))].sort(
      (a, b) => b - a
    );

    const container = document.getElementById("round-team-container");

    if (roundNumbers.length === 0) {
      container.innerHTML =
        '<div class="no-data">Nenhuma rodada finalizada encontrada</div>';
      return;
    }

    container.innerHTML = `
      <div class="round-team-selector">
        <select id="round-team-select" onchange="app.generateRoundTeam()">
          <option value="">Selecione uma rodada</option>
          ${roundNumbers
            .map((round) => `<option value="${round}">Rodada ${round}</option>`)
            .join("")}
        </select>
      </div>
      <div id="round-team-display"></div>
    `;
  }

  generateRoundTeam() {
    const roundNumber = document.getElementById("round-team-select").value;
    if (!roundNumber) {
      document.getElementById("round-team-display").innerHTML = "";
      return;
    }

    const tournamentId = document.getElementById("tournament-profile-modal")
      .dataset.tournamentId;
    const matches = this.getUserData("matches").filter(
      (m) =>
        m.tournamentId == tournamentId &&
        m.round == roundNumber &&
        m.status === "finished"
    );

    const playerStats = {};

    matches.forEach((match) => {
      // Calcular notas defensivas
      this.calculateDefensiveRatings(match);

      // Coletar estatísticas dos jogadores
      if (match.events) {
        match.events.forEach((event) => {
          const player = this.data.players.find(
            (p) => p.id == event.playerId || p.name === event.player
          );
          if (player) {
            if (!playerStats[player.id]) {
              playerStats[player.id] = {
                player,
                goals: 0,
                assists: 0,
                cards: 0,
                rating: 6.0,
              };
            }

            if (event.type === "Gol") playerStats[player.id].goals++;
            if (event.type === "Assistência") playerStats[player.id].assists++;
            if (event.type.includes("Cartão")) playerStats[player.id].cards++;
          }
        });
      }

      // Adicionar notas defensivas
      if (match.defensiveRatings) {
        Object.keys(match.defensiveRatings).forEach((playerId) => {
          const player = this.data.players.find((p) => p.id == playerId);
          if (player) {
            if (!playerStats[playerId]) {
              playerStats[playerId] = {
                player,
                goals: 0,
                assists: 0,
                cards: 0,
                rating: match.defensiveRatings[playerId],
              };
            } else {
              playerStats[playerId].rating = match.defensiveRatings[playerId];
            }
          }
        });
      }
    });

    // Calcular notas finais
    Object.values(playerStats).forEach((stats) => {
      let finalRating = stats.rating;
      finalRating += stats.goals * 1.5;
      finalRating += stats.assists * 1.0;
      finalRating -= stats.cards * 0.5;
      stats.finalRating = Math.max(4.0, Math.min(10.0, finalRating));
    });

    // Selecionar melhores por posição (1 goleiro, 4 defensores, 3 meias, 3 atacantes)
    const positions = {
      Goleiro: 1,
      Zagueiro: 2,
      Lateral: 2,
      Volante: 1,
      Meia: 3,
      Atacante: 3,
    };

    const bestPlayers = {};
    Object.keys(positions).forEach((position) => {
      const positionPlayers = Object.values(playerStats)
        .filter((stats) => stats.player.position === position)
        .sort((a, b) => b.finalRating - a.finalRating)
        .slice(0, positions[position]);
      bestPlayers[position] = positionPlayers;
    });

    this.renderRoundTeam(roundNumber, bestPlayers);
  }

  renderRoundTeam(roundNumber, bestPlayers) {
    const container = document.getElementById("round-team-display");

    container.innerHTML = `
      <div class="round-team-formation">
        <div class="round-team-header">
          <div class="round-team-title">⭐ Equipe da Rodada ${roundNumber}</div>
          <div class="round-team-subtitle">Formação 4-4-2</div>
        </div>
        <div class="round-team-field">
          <div class="round-team-positions">
            <div class="round-team-line">
              ${(bestPlayers.Atacante || [])
                .map((stats) => this.renderRoundTeamPlayer(stats))
                .join("")}
            </div>
            <div class="round-team-line">
              ${(bestPlayers.Meia || [])
                .map((stats) => this.renderRoundTeamPlayer(stats))
                .join("")}
              ${(bestPlayers.Volante || [])
                .map((stats) => this.renderRoundTeamPlayer(stats))
                .join("")}
            </div>
            <div class="round-team-line">
              ${(bestPlayers.Lateral || [])
                .map((stats) => this.renderRoundTeamPlayer(stats))
                .join("")}
              ${(bestPlayers.Zagueiro || [])
                .map((stats) => this.renderRoundTeamPlayer(stats))
                .join("")}
            </div>
            <div class="round-team-line">
              ${(bestPlayers.Goleiro || [])
                .map((stats) => this.renderRoundTeamPlayer(stats))
                .join("")}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderRoundTeamPlayer(stats) {
    const club = this.data.clubs.find((c) => c.id == stats.player.clubId);
    return `
      <div class="round-team-player" onclick="app.showPlayerProfile(${
        stats.player.id
      })">
        <img src="${
          stats.player.photo ||
          "https://static.flashscore.com/res/image/empty-face-man-share.gif"
        }" class="round-team-player-photo" alt="${stats.player.name}">
        <div class="round-team-player-name">${this.formatPlayerName(
          stats.player.name
        )}</div>
        <img src="${
          club?.logo || "https://via.placeholder.com/16"
        }" class="round-team-player-club" alt="${club?.name}">
        <div class="round-team-player-rating">${stats.finalRating.toFixed(
          1
        )}</div>
      </div>
    `;
  }

  closeTournamentProfile() {
    document.getElementById("tournament-profile-modal").style.display = "none";
  }

  // Histórico de Confrontos
  showMatchHistory(club1Id, club2Id) {
    const club1 = this.data.clubs.find((c) => c.id == club1Id);
    const club2 = this.data.clubs.find((c) => c.id == club2Id);

    if (!club1 || !club2) return;

    const matches = this.getUserData("matches").filter(
      (m) =>
        m.status === "finished" &&
        ((m.homeTeamId == club1Id && m.awayTeamId == club2Id) ||
          (m.homeTeamId == club2Id && m.awayTeamId == club1Id))
    );

    // Calcular estatísticas do confronto
    let club1Wins = 0,
      club2Wins = 0,
      draws = 0;
    let club1Goals = 0,
      club2Goals = 0;

    matches.forEach((match) => {
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
    document.getElementById("history-club1-logo").src =
      club1.logo || "https://via.placeholder.com/60";
    document.getElementById("history-club1-name").textContent = club1.name;
    document.getElementById("history-club2-logo").src =
      club2.logo || "https://via.placeholder.com/60";
    document.getElementById("history-club2-name").textContent = club2.name;

    document.getElementById("history-total-matches").textContent =
      matches.length;
    document.getElementById("history-club1-wins").textContent = club1Wins;
    document.getElementById("history-draws").textContent = draws;
    document.getElementById("history-club2-wins").textContent = club2Wins;
    document.getElementById("history-club1-goals").textContent = club1Goals;
    document.getElementById("history-club2-goals").textContent = club2Goals;

    // Carregar lista de partidas
    const container = document.getElementById("history-matches-list");
    if (matches.length === 0) {
      container.innerHTML =
        '<div class="no-data">Nenhum confronto encontrado</div>';
    } else {
      container.innerHTML = matches
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map((match) => {
          const homeTeam = this.data.clubs.find(
            (c) => c.id == match.homeTeamId
          );
          const awayTeam = this.data.clubs.find(
            (c) => c.id == match.awayTeamId
          );
          const tournament = this.data.tournaments.find(
            (t) => t.id == match.tournamentId
          );

          return `
          <div class="history-match-item" onclick="app.showMatchDetails(${
            match.id
          })">
            <div class="history-match-date">${new Date(
              match.date
            ).toLocaleDateString("pt-BR")}</div>
            <div class="history-match-teams">
              <div class="history-match-team">
                <img src="${
                  homeTeam?.logo || "https://via.placeholder.com/30"
                }" alt="${homeTeam?.name}">
                <span>${homeTeam?.name}</span>
              </div>
              <div class="history-match-score">${match.homeScore} - ${
            match.awayScore
          }</div>
              <div class="history-match-team">
                <span>${awayTeam?.name}</span>
                <img src="${
                  awayTeam?.logo || "https://via.placeholder.com/30"
                }" alt="${awayTeam?.name}">
              </div>
            </div>
            <div class="history-match-tournament">${
              tournament?.name || "Torneio"
            }</div>
          </div>
        `;
        })
        .join("");
    }

    document.getElementById("match-history-modal").style.display = "block";
  }

  closeMatchHistory() {
    document.getElementById("match-history-modal").style.display = "none";
  }

  showTeamHistoryOptions(clubId, tournamentId) {
    const club = this.data.clubs.find((c) => c.id == clubId);
    // ALTERAÇÃO: filtrar clubes por array tournamentIds
    const otherClubs = this.getUserData("clubs").filter(
      (c) =>
        Array.isArray(c.tournamentIds) &&
        c.tournamentIds.includes(parseInt(tournamentId)) &&
        c.id != clubId
    );

    if (otherClubs.length === 0) {
      alert("Não há outros clubes neste torneio para comparar.");
      return;
    }

    document.getElementById("history-options-club-name").textContent =
      club.name;
    document.getElementById("history-options-club-logo").src =
      club.logo || "https://via.placeholder.com/40";

    const container = document.getElementById("history-options-list");
    container.innerHTML = otherClubs
      .map((otherClub) => {
        const matches = this.getUserData("matches").filter(
          (m) =>
            m.status === "finished" &&
            ((m.homeTeamId == clubId && m.awayTeamId == otherClub.id) ||
              (m.homeTeamId == otherClub.id && m.awayTeamId == clubId))
        );

        return `
        <div class="history-option-item" onclick="app.showMatchHistory(${clubId}, ${
          otherClub.id
        }); app.closeHistoryOptions();">
          <img src="${
            otherClub.logo || "https://via.placeholder.com/30"
          }" alt="${otherClub.name}">
          <span class="opponent-name">${otherClub.name}</span>
          <span class="matches-count">${matches.length} jogos</span>
        </div>
      `;
      })
      .join("");

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
    const matches = this.getUserData("matches").filter(
      (m) => m.homeCoachId == coachId || m.awayCoachId == coachId
    );
    const clubs = matches
      .map((m) => {
        const clubId = m.homeCoachId == coachId ? m.homeTeamId : m.awayTeamId;
        return this.data.clubs.find((c) => c.id == clubId);
      })
      .filter(
        (club, index, arr) =>
          club && arr.findIndex((c) => c.id === club.id) === index
      );

    return clubs;
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

  updateCurrentYear() {
    const currentYear = new Date().getFullYear();
    const yearElements = [
      "current-year-scorers",
      "current-year-assists",
      "current-year-player",
      "current-year-club-scorers",
      "current-year-club-assists",
    ];

    yearElements.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = currentYear;
    });
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
        // Coletar torneios selecionados
        const selectedTournaments = [];
        document
          .querySelectorAll(
            '#club-tournaments-checkboxes input[type="checkbox"]:checked'
          )
          .forEach((checkbox) => {
            selectedTournaments.push(parseInt(checkbox.value));
          });

        const data = {
          name: document.getElementById("club-name").value,
          country: document.getElementById("club-country").value,
          logo: document.getElementById("club-logo").value,
          primaryColor: document.getElementById("club-primary-color").value,
          secondaryColor: document.getElementById("club-secondary-color").value,
          textColor: document.getElementById("club-text-color").value,
          tournamentIds: selectedTournaments,
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

        // Adicionar treinadores se selecionados
        const homeCoachId = document.getElementById("home-coach").value;
        const awayCoachId = document.getElementById("away-coach").value;
        if (homeCoachId) data.homeCoachId = parseInt(homeCoachId);
        if (awayCoachId) data.awayCoachId = parseInt(awayCoachId);

        console.log("Dados da partida sendo salvos:", data);

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
          const matchIndex = this.data.matches.findIndex((m) => m.id == editId);
          if (matchIndex !== -1) {
            this.data.matches[matchIndex] = {
              ...this.data.matches[matchIndex],
              ...data,
              id: parseInt(editId),
              status:
                data.homeScore !== undefined && data.awayScore !== undefined
                  ? "finished"
                  : "scheduled",
            };

            // Calcular notas defensivas se a partida estiver finalizada
            if (this.data.matches[matchIndex].status === "finished") {
              this.calculateDefensiveRatings(this.data.matches[matchIndex]);
            }

            await this.saveData("matches");
            this.loadMatches();
            this.updateStats();
          }
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

  // Função para determinar classe de cor da nota
  getRatingClass(rating) {
    if (rating < 5.0) return "rating-very-poor";
    if (rating >= 5.0 && rating <= 6.4) return "rating-poor";
    if (rating >= 6.5 && rating <= 7.0) return "rating-average";
    if (rating >= 7.1 && rating <= 8.9) return "rating-good";
    if (rating >= 9.0) return "rating-excellent";
    return "";
  }
}

// Funções globais
function showLogin() {
  document.getElementById("landing-screen").classList.remove("active");
  document.getElementById("login-screen").classList.add("active");
}

// Inicializar aplicação
const app = new TournamentManager();
