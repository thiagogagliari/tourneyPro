// // Dados de exemplo para testes
// const sampleData = {
//   // Usuário de exemplo
//   users: [
//     {
//       id: 1,
//       username: "admin",
//       password: "123456",
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//   ],

//   // Torneios de exemplo
//   tournaments: [
//     {
//       id: 1,
//       userId: 1,
//       name: "Liga Brasileira eFootball 2024",
//       game: "efootball",
//       startDate: "2024-01-15",
//       description:
//         "Campeonato brasileiro de eFootball com os principais clubes do país",
//       status: "Ativo",
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 2,
//       userId: 1,
//       name: "Copa FIFA Champions",
//       game: "fifa",
//       startDate: "2024-02-01",
//       description: "Torneio eliminatório estilo Champions League",
//       status: "Ativo",
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//   ],

//   // Clubes de exemplo
//   clubs: [
//     {
//       id: 1,
//       userId: 1,
//       name: "Flamengo",
//       country: "Brasil",
//       logo: "https://upload.wikimedia.org/wikipedia/commons/9/93/Flamengo-RJ_%28BRA%29.png",
//       tournamentId: 1,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 2,
//       userId: 1,
//       name: "Palmeiras",
//       country: "Brasil",
//       logo: "https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg",
//       tournamentId: 1,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 3,
//       userId: 1,
//       name: "Corinthians",
//       country: "Brasil",
//       logo: "https://upload.wikimedia.org/wikipedia/en/5/5a/Corinthians_logo.svg",
//       tournamentId: 1,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 4,
//       userId: 1,
//       name: "São Paulo",
//       country: "Brasil",
//       logo: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Brasao_do_Sao_Paulo_Futebol_Clube.svg",
//       tournamentId: 1,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//   ],

//   // Treinadores de exemplo
//   coaches: [
//     {
//       id: 1,
//       userId: 1,
//       name: "Jorge Jesus",
//       birthdate: "1954-07-24",
//       nationality: "Portugal",
//       experience: 35,
//       formation: "4-2-3-1",
//       photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
//       clubId: 1,
//       clubStartDate: "2024-01-01T00:00:00.000Z",
//       clubHistory: [],
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 2,
//       userId: 1,
//       name: "Abel Ferreira",
//       birthdate: "1978-12-22",
//       nationality: "Portugal",
//       experience: 15,
//       formation: "4-3-3",
//       photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
//       clubId: 2,
//       clubStartDate: "2024-01-01T00:00:00.000Z",
//       clubHistory: [],
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 3,
//       userId: 1,
//       name: "Mano Menezes",
//       birthdate: "1962-06-11",
//       nationality: "Brasil",
//       experience: 25,
//       formation: "4-4-2",
//       photo: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150&h=150&fit=crop&crop=face",
//       clubId: 3,
//       clubStartDate: "2024-01-01T00:00:00.000Z",
//       clubHistory: [],
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 4,
//       userId: 1,
//       name: "Dorival Júnior",
//       birthdate: "1962-04-25",
//       nationality: "Brasil",
//       experience: 30,
//       formation: "4-2-3-1",
//       photo: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=150&h=150&fit=crop&crop=face",
//       clubId: 4,
//       clubStartDate: "2024-01-01T00:00:00.000Z",
//       clubHistory: [],
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//   ],

//   // Jogadores de exemplo
//   players: [
//     // Flamengo
//     {
//       id: 1,
//       userId: 1,
//       name: "Gabriel Barbosa",
//       age: 27,
//       position: "ATA",
//       nationality: "Brasil",
//       photo:
//         "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=150&h=150&fit=crop&crop=face",
//       clubId: 1,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 2,
//       userId: 1,
//       name: "Arrascaeta",
//       age: 29,
//       position: "MEI",
//       nationality: "Uruguai",
//       photo:
//         "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
//       clubId: 1,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 3,
//       userId: 1,
//       name: "Everton Ribeiro",
//       age: 34,
//       position: "MEI",
//       nationality: "Brasil",
//       photo:
//         "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
//       clubId: 1,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },

//     // Palmeiras
//     {
//       id: 4,
//       userId: 1,
//       name: "Endrick",
//       age: 17,
//       position: "ATA",
//       nationality: "Brasil",
//       photo:
//         "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
//       clubId: 2,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 5,
//       userId: 1,
//       name: "Raphael Veiga",
//       age: 28,
//       position: "MEI",
//       nationality: "Brasil",
//       photo:
//         "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
//       clubId: 2,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },

//     // Corinthians
//     {
//       id: 6,
//       userId: 1,
//       name: "Yuri Alberto",
//       age: 22,
//       position: "ATA",
//       nationality: "Brasil",
//       photo:
//         "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face",
//       clubId: 3,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 7,
//       userId: 1,
//       name: "Renato Augusto",
//       age: 35,
//       position: "MEI",
//       nationality: "Brasil",
//       photo:
//         "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150&h=150&fit=crop&crop=face",
//       clubId: 3,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },

//     // São Paulo
//     {
//       id: 8,
//       userId: 1,
//       name: "Calleri",
//       age: 30,
//       position: "ATA",
//       nationality: "Argentina",
//       photo:
//         "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=150&h=150&fit=crop&crop=face",
//       clubId: 4,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//     {
//       id: 9,
//       userId: 1,
//       name: "Lucas Moura",
//       age: 31,
//       position: "MEI",
//       nationality: "Brasil",
//       photo:
//         "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
//       clubId: 4,
//       createdAt: "2024-01-01T00:00:00.000Z",
//     },
//   ],

//   // Partidas de exemplo
//   matches: [
//     {
//       id: 1,
//       userId: 1,
//       homeTeamId: 1, // Flamengo
//       awayTeamId: 2, // Palmeiras
//       homeScore: 2,
//       awayScore: 1,
//       round: 1,
//       date: "2024-01-20T20:00:00",
//       tournamentId: 1,
//       status: "finished",
//       events: [
//         {
//           minute: 15,
//           type: "Gol",
//           playerId: 1,
//           player: "Gabriel Barbosa",
//           team: "Flamengo",
//         },
//         {
//           minute: 23,
//           type: "Assistência",
//           playerId: 2,
//           player: "Arrascaeta",
//           team: "Flamengo",
//         },
//         {
//           minute: 45,
//           type: "Gol",
//           playerId: 4,
//           player: "Endrick",
//           team: "Palmeiras",
//         },
//         {
//           minute: 78,
//           type: "Gol",
//           playerId: 3,
//           player: "Everton Ribeiro",
//           team: "Flamengo",
//         },
//         {
//           minute: 82,
//           type: "Cartão Amarelo",
//           playerId: 5,
//           player: "Raphael Veiga",
//           team: "Palmeiras",
//         },
//       ],
//       createdAt: "2024-01-20T00:00:00.000Z",
//     },
//     {
//       id: 2,
//       userId: 1,
//       homeTeamId: 3, // Corinthians
//       awayTeamId: 4, // São Paulo
//       homeScore: 1,
//       awayScore: 1,
//       round: 1,
//       date: "2024-01-21T16:00:00",
//       tournamentId: 1,
//       status: "finished",
//       events: [
//         {
//           minute: 30,
//           type: "Gol",
//           playerId: 6,
//           player: "Yuri Alberto",
//           team: "Corinthians",
//         },
//         {
//           minute: 67,
//           type: "Gol",
//           playerId: 8,
//           player: "Calleri",
//           team: "São Paulo",
//         },
//         {
//           minute: 89,
//           type: "Cartão Amarelo",
//           playerId: 7,
//           player: "Renato Augusto",
//           team: "Corinthians",
//         },
//       ],
//       createdAt: "2024-01-21T00:00:00.000Z",
//     },
//     {
//       id: 3,
//       userId: 1,
//       homeTeamId: 2, // Palmeiras
//       awayTeamId: 3, // Corinthians
//       homeScore: 3,
//       awayScore: 0,
//       round: 2,
//       date: "2024-01-28T18:00:00",
//       tournamentId: 1,
//       status: "finished",
//       events: [
//         {
//           minute: 12,
//           type: "Gol",
//           playerId: 4,
//           player: "Endrick",
//           team: "Palmeiras",
//         },
//         {
//           minute: 34,
//           type: "Gol",
//           playerId: 5,
//           player: "Raphael Veiga",
//           team: "Palmeiras",
//         },
//         {
//           minute: 56,
//           type: "Gol",
//           playerId: 4,
//           player: "Endrick",
//           team: "Palmeiras",
//         },
//         {
//           minute: 71,
//           type: "Cartão Vermelho",
//           playerId: 6,
//           player: "Yuri Alberto",
//           team: "Corinthians",
//         },
//       ],
//       createdAt: "2024-01-28T00:00:00.000Z",
//     },
//     // Partidas agendadas
//     {
//       id: 4,
//       userId: 1,
//       homeTeamId: 1, // Flamengo
//       awayTeamId: 4, // São Paulo
//       round: 2,
//       date: "2024-02-05T20:00:00",
//       tournamentId: 1,
//       status: "scheduled",
//       createdAt: "2024-01-28T00:00:00.000Z",
//     },
//     {
//       id: 5,
//       userId: 1,
//       homeTeamId: 3, // Corinthians
//       awayTeamId: 2, // Palmeiras
//       round: 3,
//       date: "2024-02-10T16:00:00",
//       tournamentId: 1,
//       status: "scheduled",
//       createdAt: "2024-01-28T00:00:00.000Z",
//     },
//   ],

//   // Rodadas de exemplo
//   rounds: [
//     {
//       id: 1,
//       userId: 1,
//       tournamentId: 1,
//       number: 1,
//       date: "2024-01-20",
//       matches: [
//         { homeTeamId: 1, awayTeamId: 2 },
//         { homeTeamId: 3, awayTeamId: 4 },
//       ],
//       createdAt: "2024-01-15T00:00:00.000Z",
//     },
//     {
//       id: 2,
//       userId: 1,
//       tournamentId: 1,
//       number: 2,
//       date: "2024-01-28",
//       matches: [
//         { homeTeamId: 2, awayTeamId: 3 },
//         { homeTeamId: 1, awayTeamId: 4 },
//       ],
//       createdAt: "2024-01-15T00:00:00.000Z",
//     },
//     {
//       id: 3,
//       userId: 1,
//       tournamentId: 1,
//       number: 3,
//       date: "2024-02-10",
//       matches: [
//         { homeTeamId: 3, awayTeamId: 2 },
//         { homeTeamId: 4, awayTeamId: 1 },
//       ],
//       createdAt: "2024-01-15T00:00:00.000Z",
//     },
//   ],
// };
