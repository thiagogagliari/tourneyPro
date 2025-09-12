class PublicTournamentViewer {
  constructor() {
    this.data = {
      tournaments: [],
      clubs: [],
      players: [],
      matches: [],
      coaches: [],
    };
    this.currentTournament = null;
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
    if (!this.db) {
      console.error("Firebase não inicializado");
      return;
    }

    try {
      console.log("Carregando dados do Firebase...");
      
      // Buscar todos os usuários
      const usersSnapshot = await this.db.collection("users").get();
      console.log(`Encontrados ${usersSnapshot.docs.length} usuários`);
      
      // Arrays para armazenar todos os dados
      let allTournaments = [];
      let allClubs = [];
      let allPlayers = [];
      let allMatches = [];
      let allCoaches = [];
      
      // Para cada usuário, buscar suas subcoleções
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        console.log(`Carregando dados do usuário: ${userId}`);
        
        try {
          const [tournaments, clubs, players, matches, coaches] = await Promise.all([
            this.db.collection("users").doc(userId).collection("data").doc("tournaments").get(),
            this.db.collection("users").doc(userId).collection("data").doc("clubs").get(),
            this.db.collection("users").doc(userId).collection("data").doc("players").get(),
            this.db.collection("users").doc(userId).collection("data").doc("matches").get(),
            this.db.collection("users").doc(userId).collection("data").doc("coaches").get(),
          ]);
          
          console.log(`Usuário ${userId} - Documentos encontrados:`, {
            tournaments: tournaments.exists,
            clubs: clubs.exists,
            players: players.exists,
            matches: matches.exists,
            coaches: coaches.exists
          });
          
          // Extrair dados dos documentos
          if (tournaments.exists) {
            const tournamentsData = tournaments.data();
            console.log(`Usuário ${userId} - Dados de torneios:`, tournamentsData);
            if (tournamentsData && tournamentsData.data) {
              allTournaments.push(...tournamentsData.data.map(item => ({ ...item, userId })));
            }
          }
          if (clubs.exists) {
            const clubsData = clubs.data();
            console.log(`Usuário ${userId} - Dados de clubes:`, clubsData);
            if (clubsData && clubsData.data) {
              allClubs.push(...clubsData.data.map(item => ({ ...item, userId })));
            }
          }
          if (players.exists) {
            const playersData = players.data();
            if (playersData && playersData.data) {
              allPlayers.push(...playersData.data.map(item => ({ ...item, userId })));
            }
          }
          if (matches.exists) {
            const matchesData = matches.data();
            if (matchesData && matchesData.data) {
              allMatches.push(...matchesData.data.map(item => ({ ...item, userId })));
            }
          }
          if (coaches.exists) {
            const coachesData = coaches.data();
            if (coachesData && coachesData.data) {
              allCoaches.push(...coachesData.data.map(item => ({ ...item, userId })));
            }
          }
          
        } catch (userError) {
          console.warn(`Erro ao carregar dados do usuário ${userId}:`, userError);
        }
      }
      
      // Atribuir aos dados da classe
      this.data.tournaments = allTournaments;
      this.data.clubs = allClubs;
      this.data.players = allPlayers;
      this.data.matches = allMatches;
      this.data.coaches = allCoaches;

      console.log("Dados carregados do Firebase:", {
        tournaments: this.data.tournaments.length,
        clubs: this.data.clubs.length,
        players: this.data.players.length,
        matches: this.data.matches.length,
        coaches: this.data.coaches.length,
      });

      // Debug detalhado
      console.log("Todos os torneios:", this.data.tournaments);
      console.log("Todos os clubes:", this.data.clubs);
      console.log("Todas as partidas:", this.data.matches);

      if (this.data.tournaments.length === 0) {
        console.warn("Nenhum torneio encontrado no Firebase!");
      }
      if (this.data.clubs.length === 0) {
        console.warn("Nenhum clube encontrado no Firebase!");
      }

      this.showTournaments();
    } catch (error) {
      console.error("Erro ao carregar dados do Firebase:", error);
    }
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const section = e.target.closest(".nav-btn").dataset.section;
        this.showSection(section);
      });
    });

    // Tournament filter
    document
      .getElementById("tournament-filter")
      .addEventListener("change", (e) => {
        this.filterMatches(e.target.value);
      });

    // Standings filter
    document
      .getElementById("standings-tournament-filter")
      .addEventListener("change", (e) => {
        this.showStandings(e.target.value);
      });

    // Players filters
    document
      .getElementById("players-tournament-filter")
      .addEventListener("change", () => {
        this.filterPlayers();
      });
    document
      .getElementById("players-club-filter")
      .addEventListener("change", () => {
        this.filterPlayers();
      });

    // Modal close
    document.querySelectorAll(".close").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.target.closest(".modal").style.display = "none";
      });
    });

    // Tournament tabs
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tab = e.target.dataset.tab;
        this.showTournamentTab(tab);
      });
    });
  }

  showSection(section) {
    // Update nav buttons
    document
      .querySelectorAll(".nav-btn")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelector(`[data-section="${section}"]`)
      .classList.add("active");

    // Show section
    document
      .querySelectorAll(".content-section")
      .forEach((sec) => sec.classList.remove("active"));
    document.getElementById(`${section}-section`).classList.add("active");

    // Load section data
    switch (section) {
      case "tournaments":
        this.showTournaments();
        break;
      case "matches":
        this.showMatches();
        break;
      case "standings":
        this.setupStandingsFilters();
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
        (c) => c.tournamentId == tournament.id
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
                    <span class="game-badge ${tournament.game.toLowerCase()}">${
        tournament.game
      }</span>
                    <span style="color: rgba(255,255,255,0.8);">${this.formatDate(
                      tournament.startDate
                    )}</span>
                </div>
                <div class="tournament-stats">
                    <div class="stat-item">
                        <span class="stat-value">${
                          tournamentClubs.length
                        }</span>
                        <span class="stat-label">Clubes</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${
                          finishedMatches.length
                        }</span>
                        <span class="stat-label">Partidas</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${this.getTotalGoals(
                          tournament.id
                        )}</span>
                        <span class="stat-label">Gols</span>
                    </div>
                </div>
            `;

      container.appendChild(card);
    });
  }

  showMatches() {
    this.setupMatchFilters();
    this.filterMatches("");
  }

  setupMatchFilters() {
    const filter = document.getElementById("tournament-filter");
    filter.innerHTML = '<option value="">Todos os Torneios</option>';

    this.data.tournaments.forEach((tournament) => {
      const option = document.createElement("option");
      option.value = tournament.id;
      option.textContent = tournament.name;
      filter.appendChild(option);
    });
  }

  filterMatches(tournamentId) {
    const container = document.getElementById("matches-container");
    container.innerHTML = "";

    let matches = this.data.matches.filter(
      (m) => m.status === "finished" || m.status === "Finalizada"
    );
    if (tournamentId) {
      matches = matches.filter((m) => m.tournamentId == tournamentId);
    }

    matches.sort((a, b) => new Date(b.date) - new Date(a.date));

    matches.forEach((match) => {
      const homeTeam = this.data.clubs.find((c) => c.id == match.homeTeamId);
      const awayTeam = this.data.clubs.find((c) => c.id == match.awayTeamId);

      const card = document.createElement("div");
      card.className = "match-card";

      card.innerHTML = `
                <div class="match-teams">
                    <div class="team">
                        <img src="${
                          homeTeam?.logo || "https://via.placeholder.com/40"
                        }" alt="${homeTeam?.name}" class="team-logo">
                        <span>${homeTeam?.name || "Time Casa"}</span>
                    </div>
                    <div class="match-score">${match.homeScore} - ${
        match.awayScore
      }</div>
                    <div class="team">
                        <span>${awayTeam?.name || "Time Visitante"}</span>
                        <img src="${
                          awayTeam?.logo || "https://via.placeholder.com/40"
                        }" alt="${awayTeam?.name}" class="team-logo">
                    </div>
                </div>
                <div class="match-info">
                    <div>${this.formatDate(match.date)}</div>
                    <div style="font-size: 0.8rem; opacity: 0.8;">Rodada ${
                      match.round
                    }</div>
                </div>
            `;

      container.appendChild(card);
    });
  }

  setupStandingsFilters() {
    const filter = document.getElementById("standings-tournament-filter");
    filter.innerHTML = '<option value="">Selecione um Torneio</option>';

    this.data.tournaments.forEach((tournament) => {
      const option = document.createElement("option");
      option.value = tournament.id;
      option.textContent = tournament.name;
      filter.appendChild(option);
    });
  }

  showStandings(tournamentId) {
    const container = document.getElementById("standings-container");

    if (!tournamentId) {
      container.innerHTML =
        '<p style="color: white; text-align: center;">Selecione um torneio para ver a classificação</p>';
      return;
    }

    const standings = this.calculateStandings(tournamentId);

    container.innerHTML = `
            <div class="standings-table">
                <table>
                    <thead>
                        <tr>
                            <th class="position">Pos</th>
                            <th>Clube</th>
                            <th>J</th>
                            <th>V</th>
                            <th>E</th>
                            <th>D</th>
                            <th>GP</th>
                            <th>GC</th>
                            <th>SG</th>
                            <th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings
                          .map(
                            (team, index) => `
                            <tr>
                                <td class="position">${index + 1}</td>
                                <td class="team-cell">
                                    <img src="${
                                      team.logo ||
                                      "https://via.placeholder.com/30"
                                    }" alt="${team.name}" class="team-logo">
                                    ${team.name}
                                </td>
                                <td>${team.matches}</td>
                                <td>${team.wins}</td>
                                <td>${team.draws}</td>
                                <td>${team.losses}</td>
                                <td>${team.goalsFor}</td>
                                <td>${team.goalsAgainst}</td>
                                <td>${team.goalDifference}</td>
                                <td><strong>${team.points}</strong></td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;
  }

  showPlayers() {
    this.setupPlayerFilters();
    this.filterPlayers();
  }

  setupPlayerFilters() {
    const tournamentFilter = document.getElementById(
      "players-tournament-filter"
    );
    const clubFilter = document.getElementById("players-club-filter");

    tournamentFilter.innerHTML = '<option value="">Todos os Torneios</option>';
    this.data.tournaments.forEach((tournament) => {
      const option = document.createElement("option");
      option.value = tournament.id;
      option.textContent = tournament.name;
      tournamentFilter.appendChild(option);
    });

    clubFilter.innerHTML = '<option value="">Todos os Clubes</option>';
    this.data.clubs.forEach((club) => {
      const option = document.createElement("option");
      option.value = club.id;
      option.textContent = club.name;
      clubFilter.appendChild(option);
    });
  }

  filterPlayers() {
    const tournamentId = document.getElementById(
      "players-tournament-filter"
    ).value;
    const clubId = document.getElementById("players-club-filter").value;
    const container = document.getElementById("players-container");

    let players = this.data.players;

    if (tournamentId) {
      const tournamentClubs = this.data.clubs.filter(
        (c) => c.tournamentId == tournamentId
      );
      players = players.filter((p) =>
        tournamentClubs.some((c) => c.id == p.clubId)
      );
    }

    if (clubId) {
      players = players.filter((p) => p.clubId == clubId);
    }

    container.innerHTML = "";

    players.forEach((player) => {
      const club = this.data.clubs.find((c) => c.id == player.clubId);
      const stats = this.getPlayerStats(player.id);

      const card = document.createElement("div");
      card.className = "player-card";
      card.onclick = () => this.showPlayerProfile(player.id);

      card.innerHTML = `
                <div class="player-header">
                    <img src="${
                      player.photo ||
                      "https://static.flashscore.com/res/image/empty-face-man-share.gif"
                    }" alt="${player.name}" class="player-photo">
                    <div class="player-info">
                        <h4>${player.name}</h4>
                        <div class="player-club">${
                          club?.name || "Sem clube"
                        }</div>
                        <span class="position-badge ${player.position?.toLowerCase()}">${
        player.position
      }</span>
                    </div>
                </div>
                <div class="player-stats-grid">
                    <div class="player-stat">
                        <span class="player-stat-value">${stats.matches}</span>
                        <span class="player-stat-label">Jogos</span>
                    </div>
                    <div class="player-stat">
                        <span class="player-stat-value">${stats.goals}</span>
                        <span class="player-stat-label">Gols</span>
                    </div>
                    <div class="player-stat">
                        <span class="player-stat-value">${stats.assists}</span>
                        <span class="player-stat-label">Assist.</span>
                    </div>
                    <div class="player-stat">
                        <span class="player-stat-value">${stats.rating}</span>
                        <span class="player-stat-label">Nota</span>
                    </div>
                </div>
            `;

      container.appendChild(card);
    });
  }

  showTournamentDetails(tournamentId) {
    this.currentTournament = this.data.tournaments.find(
      (t) => t.id == tournamentId
    );
    if (!this.currentTournament) return;

    document.getElementById("tournament-modal-name").textContent =
      this.currentTournament.name;
    document.getElementById("tournament-modal-game").textContent =
      this.currentTournament.game;
    document.getElementById(
      "tournament-modal-game"
    ).className = `game-badge ${this.currentTournament.game.toLowerCase()}`;
    document.getElementById(
      "tournament-modal-dates"
    ).textContent = `${this.formatDate(
      this.currentTournament.startDate
    )} - ${this.formatDate(this.currentTournament.endDate)}`;

    this.showTournamentTab("overview");
    document.getElementById("tournament-modal").style.display = "block";
  }

  showTournamentTab(tab) {
    document
      .querySelectorAll(".tab-btn")
      .forEach((btn) => btn.classList.remove("active"));
    document.querySelector(`[data-tab="${tab}"]`).classList.add("active");

    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.remove("active"));
    document.getElementById(`${tab}-tab`).classList.add("active");

    switch (tab) {
      case "overview":
        this.loadTournamentOverview();
        break;
      case "matches":
        this.loadTournamentMatches();
        break;
      case "standings":
        this.loadTournamentStandings();
        break;
      case "stats":
        this.loadTournamentStats();
        break;
    }
  }

  loadTournamentOverview() {
    const clubs = this.data.clubs.filter(
      (c) => c.tournamentId == this.currentTournament.id
    );
    const matches = this.data.matches.filter(
      (m) => m.tournamentId == this.currentTournament.id
    );
    const finishedMatches = matches.filter((m) => m.status === "finished");

    document.getElementById("overview-tab").innerHTML = `
            <div class="tournament-overview">
                <div class="overview-stats">
                    <div class="stat-card">
                        <h4>Clubes Participantes</h4>
                        <div class="stat-number">${clubs.length}</div>
                    </div>
                    <div class="stat-card">
                        <h4>Partidas Realizadas</h4>
                        <div class="stat-number">${finishedMatches.length}</div>
                    </div>
                    <div class="stat-card">
                        <h4>Total de Gols</h4>
                        <div class="stat-number">${this.getTotalGoals(
                          this.currentTournament.id
                        )}</div>
                    </div>
                </div>
                <div class="clubs-grid">
                    ${clubs
                      .map(
                        (club) => `
                        <div class="club-item">
                            <img src="${
                              club.logo || "https://via.placeholder.com/40"
                            }" alt="${club.name}">
                            <span>${club.name}</span>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  }

  loadTournamentMatches() {
    const matches = this.data.matches.filter(
      (m) =>
        m.tournamentId == this.currentTournament.id && m.status === "finished"
    );

    document.getElementById("matches-tab").innerHTML = `
            <div class="tournament-matches">
                ${matches
                  .map((match) => {
                    const homeTeam = this.data.clubs.find(
                      (c) => c.id == match.homeTeamId
                    );
                    const awayTeam = this.data.clubs.find(
                      (c) => c.id == match.awayTeamId
                    );

                    return `
                        <div class="match-item">
                            <div class="match-date">${this.formatDate(
                              match.date
                            )} - Rodada ${match.round}</div>
                            <div class="match-result">
                                <div class="team">
                                    <img src="${
                                      homeTeam?.logo ||
                                      "https://via.placeholder.com/30"
                                    }" alt="${homeTeam?.name}">
                                    <span>${homeTeam?.name}</span>
                                </div>
                                <div class="score">${match.homeScore} - ${
                      match.awayScore
                    }</div>
                                <div class="team">
                                    <span>${awayTeam?.name}</span>
                                    <img src="${
                                      awayTeam?.logo ||
                                      "https://via.placeholder.com/30"
                                    }" alt="${awayTeam?.name}">
                                </div>
                            </div>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        `;
  }

  loadTournamentStandings() {
    const standings = this.calculateStandings(this.currentTournament.id);

    document.getElementById("standings-tab").innerHTML = `
            <div class="standings-table">
                <table>
                    <thead>
                        <tr>
                            <th>Pos</th>
                            <th>Clube</th>
                            <th>Pts</th>
                            <th>J</th>
                            <th>V</th>
                            <th>E</th>
                            <th>D</th>
                            <th>GP</th>
                            <th>GC</th>
                            <th>SG</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${standings
                          .map(
                            (team, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td class="team-cell">
                                    <img src="${
                                      team.logo ||
                                      "https://via.placeholder.com/20"
                                    }" alt="${team.name}" class="team-logo">
                                    ${team.name}
                                </td>
                                <td><strong>${team.points}</strong></td>
                                <td>${team.matches}</td>
                                <td>${team.wins}</td>
                                <td>${team.draws}</td>
                                <td>${team.losses}</td>
                                <td>${team.goalsFor}</td>
                                <td>${team.goalsAgainst}</td>
                                <td>${team.goalDifference}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        `;
  }

  loadTournamentStats() {
    const topScorers = this.getTopScorers(this.currentTournament.id);

    document.getElementById("stats-tab").innerHTML = `
            <div class="tournament-stats-content">
                <h4>Artilheiros</h4>
                <div class="scorers-list">
                    ${topScorers
                      .slice(0, 10)
                      .map(
                        (scorer, index) => `
                        <div class="scorer-item">
                            <span class="position">${index + 1}</span>
                            <img src="${
                              scorer.photo ||
                              "https://static.flashscore.com/res/image/empty-face-man-share.gif"
                            }" alt="${scorer.name}" class="player-photo">
                            <div class="scorer-info">
                                <div class="name">${scorer.name}</div>
                                <div class="club">${scorer.clubName}</div>
                            </div>
                            <div class="goals">${scorer.goals} gols</div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  }

  showPlayerProfile(playerId) {
    const player = this.data.players.find((p) => p.id == playerId);
    if (!player) return;

    const club = this.data.clubs.find((c) => c.id == player.clubId);
    const stats = this.getPlayerStats(playerId);

    document.getElementById("player-modal-photo").src =
      player.photo ||
      "https://static.flashscore.com/res/image/empty-face-man-share.gif";
    document.getElementById("player-modal-name").textContent = player.name;
    document.getElementById("player-modal-position").textContent =
      player.position;
    document.getElementById(
      "player-modal-position"
    ).className = `position-badge ${player.position?.toLowerCase()}`;
    document.getElementById("player-modal-club").textContent =
      club?.name || "Sem clube";
    document.getElementById("player-modal-age").textContent = player.age
      ? `${player.age} anos`
      : "";

    document.getElementById("player-modal-stats").innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${stats.matches}</span>
                    <span class="stat-label">Partidas</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.goals}</span>
                    <span class="stat-label">Gols</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.assists}</span>
                    <span class="stat-label">Assistências</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.rating}</span>
                    <span class="stat-label">Nota Média</span>
                </div>
            </div>
        `;

    document.getElementById("player-modal").style.display = "block";
  }

  // Utility methods
  calculateStandings(tournamentId) {
    const clubs = this.data.clubs.filter((c) => c.tournamentId == tournamentId);
    const matches = this.data.matches.filter(
      (m) =>
        m.tournamentId == tournamentId &&
        (m.status === "finished" || m.status === "Finalizada")
    );

    const standings = clubs.map((club) => ({
      id: club.id,
      name: club.name,
      logo: club.logo,
      matches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    }));

    matches.forEach((match) => {
      const homeTeam = standings.find((s) => s.id == match.homeTeamId);
      const awayTeam = standings.find((s) => s.id == match.awayTeamId);

      if (homeTeam && awayTeam) {
        homeTeam.matches++;
        awayTeam.matches++;
        homeTeam.goalsFor += match.homeScore || 0;
        homeTeam.goalsAgainst += match.awayScore || 0;
        awayTeam.goalsFor += match.awayScore || 0;
        awayTeam.goalsAgainst += match.homeScore || 0;

        if (match.homeScore > match.awayScore) {
          homeTeam.wins++;
          homeTeam.points += 3;
          awayTeam.losses++;
        } else if (match.homeScore < match.awayScore) {
          awayTeam.wins++;
          awayTeam.points += 3;
          homeTeam.losses++;
        } else {
          homeTeam.draws++;
          awayTeam.draws++;
          homeTeam.points += 1;
          awayTeam.points += 1;
        }
      }
    });

    standings.forEach((team) => {
      team.goalDifference = team.goalsFor - team.goalsAgainst;
    });

    return standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference)
        return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }

  getPlayerStats(playerId) {
    const player = this.data.players.find((p) => p.id == playerId);
    const matches = this.data.matches.filter(
      (m) => m.status === "finished" || m.status === "Finalizada"
    );

    let stats = { matches: 0, goals: 0, assists: 0, rating: "0.0" };
    let totalRating = 0;
    let ratedMatches = 0;

    matches.forEach((match) => {
      if (match.events) {
        let playerInMatch = false;
        match.events.forEach((event) => {
          if (event.playerId == playerId || event.player === player?.name) {
            if (!playerInMatch) {
              stats.matches++;
              playerInMatch = true;
            }

            switch (event.type) {
              case "Gol":
                stats.goals++;
                break;
              case "Assistência":
                stats.assists++;
                break;
            }
          }
        });

        if (match.playerRatings && match.playerRatings[playerId]) {
          totalRating += match.playerRatings[playerId];
          ratedMatches++;
        }
      }
    });

    if (ratedMatches > 0) {
      stats.rating = (totalRating / ratedMatches).toFixed(1);
    }

    return stats;
  }

  getTotalGoals(tournamentId) {
    const matches = this.data.matches.filter(
      (m) =>
        m.tournamentId == tournamentId &&
        (m.status === "finished" || m.status === "Finalizada")
    );
    return matches.reduce(
      (total, match) => total + (match.homeScore || 0) + (match.awayScore || 0),
      0
    );
  }

  getTopScorers(tournamentId) {
    const tournamentClubs = this.data.clubs.filter(
      (c) => c.tournamentId == tournamentId
    );
    const players = this.data.players.filter((p) =>
      tournamentClubs.some((c) => c.id == p.clubId)
    );
    const matches = this.data.matches.filter(
      (m) =>
        m.tournamentId == tournamentId &&
        (m.status === "finished" || m.status === "Finalizada")
    );

    const scorers = players.map((player) => {
      const club = this.data.clubs.find((c) => c.id == player.clubId);
      let goals = 0;

      matches.forEach((match) => {
        if (match.events) {
          match.events.forEach((event) => {
            if (
              (event.playerId == player.id || event.player === player.name) &&
              event.type === "Gol"
            ) {
              goals++;
            }
          });
        }
      });

      return {
        ...player,
        goals,
        clubName: club?.name || "Sem clube",
      };
    });

    return scorers.filter((s) => s.goals > 0).sort((a, b) => b.goals - a.goals);
  }

  formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  }
}

// Initialize when page loads
let publicViewer;
document.addEventListener("DOMContentLoaded", () => {
  publicViewer = new PublicTournamentViewer();
});
