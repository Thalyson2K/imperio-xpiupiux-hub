const APP_CONFIG = {
  guildName: 'IMPÉRIO XPIUPIUX',
  nomeGuild: 'Imperio XPiuPiuX',
  nomeHub: 'Império XPiuPiuX Hub',
  urlOficial: 'https://mulotus.net',
  urlMercado: 'https://mulotus.net/market/items',
  urlInvasoes: 'https://mulotus.net/guide/invasoes',
  filters: ['Todos', 'Boss', 'Raid', 'Evento', 'VIP'],
  schedule: [
    { id: 1, title: 'Dark Lord', category: 'Boss', time: '19:00', map: 'Map 1', reward: 'Rune / Soul', status: 'Respawn em', color: 'red' },
    { id: 2, title: 'Castle Siege', category: 'Raid', time: '20:00', map: 'Castle', reward: 'Guild Points', status: 'Abertura', color: 'amber' },
    { id: 3, title: 'Chaos Castle', category: 'Evento', time: '21:30', map: 'Map 5', reward: 'Gem / Capa', status: 'Preparação', color: 'violet' },
    { id: 4, title: 'VIP Boost', category: 'VIP', time: '22:15', map: 'Guild', reward: 'Match & Oferta', status: 'Ativo', color: 'emerald' }
  ],
  ranking: [
    { name: 'Wiloow', className: 'Dark Lord', resets: 12, participations: 34, frequency: '91%' },
    { name: 'Nim', className: 'Elf', resets: 10, participations: 30, frequency: '88%' },
    { name: 'Lika', className: 'Summoner', resets: 9, participations: 28, frequency: '84%' },
    { name: 'Breno', className: 'Magic Gladiator', resets: 8, participations: 25, frequency: '79%' }
  ],
  defaults: {
    adminUser: 'guildmaster',
    adminPassword: 'imperio123'
  },
  moedas: [
    { id: 'WC', nome: 'WC (WCoins)', cor: 'text-amber-400 bg-amber-950/80 border-amber-600' },
    { id: 'HP', nome: 'HP (Hunt Points)', cor: 'text-purple-400 bg-purple-950/80 border-purple-600' },
    { id: 'CREDITOS', nome: 'Créditos Web', cor: 'text-emerald-400 bg-emerald-950/80 border-emerald-600' },
    { id: 'ZEN', nome: 'Zen', cor: 'text-yellow-300 bg-yellow-950/80 border-yellow-600' }
  ],
  eventos: [
    { nome: 'Invasão Dourada (Golden Monsters)', categoria: 'invasao', mapa: 'Lorencia, Noria, Devias, Atlans, Tarkan', drop: 'Box of Kundun +1, +2, +3, +4, +5', horarios: ['01:00', '03:00', '05:00', '07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00', '23:00'] },
    { nome: 'Invasão Red Dragon (Dragão Vermelho)', categoria: 'invasao', mapa: 'Lorencia, Noria, Devias', drop: 'Joias, WCoins e HP', horarios: ['03:30', '07:30', '11:30', '15:30', '19:30', '23:30'] },
    { nome: 'Invasão White Wizard & Orcs', categoria: 'invasao', mapa: 'Lorencia, Noria, Devias', drop: "Wizard's Ring (+10% Dano/Speed), Jewel of Bless", horarios: ['02:00', '06:00', '10:00', '14:00', '18:00', '22:00'] },
    { nome: 'Invasão Skeleton King (Rei Esqueleto)', categoria: 'invasao', mapa: 'Lorencia, Noria', drop: 'Box of Luck, Jewel of Chaos/Bless', horarios: ['00:30', '02:30', '04:30', '06:30', '08:30', '10:30', '12:30', '14:30', '16:30', '18:30', '20:30', '22:30'] },
    { nome: 'Invasão Cursed Wizard / Zaikan', categoria: 'invasao', mapa: 'Tarkan 2, Devias', drop: 'Jewel of Soul/Life, Itens Excelentes', horarios: ['01:30', '04:30', '07:30', '10:30', '13:30', '16:30', '19:30', '22:30'] },
    { nome: 'Invasão Coelho Lunar', categoria: 'invasao', mapa: 'Lorencia, Noria', drop: 'Jewel of Creation, Zen', horarios: ['00:15', '06:15', '12:15', '18:15'] },
    { nome: 'Blood Castle', categoria: 'evento', mapa: 'Lorencia (Archangel)', drop: 'EXP Alta, Jewel of Chaos/Bless', horarios: ['01:00', '03:00', '05:00', '07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00', '23:00'] },
    { nome: 'Devil Square', categoria: 'evento', mapa: 'Noria (Charon)', drop: 'EXP Máxima', horarios: ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'] },
    { nome: 'Chaos Castle', categoria: 'evento', mapa: 'Devias', drop: 'Sets Ancient, Jewel of Creation', horarios: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'] },
    { nome: 'Castle Siege', categoria: 'evento', mapa: 'Valley of Loren', drop: 'Land of Trials / Senhor do Castelo', horarios: ['Domingo - 20:00'] }
  ]
};

const CONFIG = APP_CONFIG;

const MEMBERS = [
  { id: 1, name: 'Wiloow', className: 'Dark Lord', email: 'wiloow@imperio.com', password: '123456', level: 280, approved: true },
  { id: 2, name: 'Nim', className: 'Elf', email: 'nim@imperio.com', password: '123456', level: 250, approved: true },
  { id: 3, name: 'Lika', className: 'Summoner', email: 'lika@imperio.com', password: '123456', level: 220, approved: true },
  { id: 4, name: 'Breno', className: 'Magic Gladiator', email: 'breno@imperio.com', password: '123456', level: 240, approved: true }
];

const MARKET_OFFERS = [
  { id: 1, title: 'Evento de Boss', price: '12.000', seller: 'Guild Master', description: 'Acesso VIP e prioridade em pool de loot.', favorite: true },
  { id: 2, title: 'Pack de Lançamento', price: '8.500', seller: 'Nim', description: 'Jogo+consultoria para nível e setup.', favorite: false },
  { id: 3, title: 'Oferta de Suporte', price: '6.000', seller: 'Lika', description: 'Support para farm e ajuste de build.', favorite: true }
];

const PENDING_MEMBERS = [
  { id: 10, name: 'Lunaris', className: 'Magic Gladiator', email: 'lunaris@imperio.com', level: 190 },
  { id: 11, name: 'Zerak', className: 'Dark Knight', email: 'zerak@imperio.com', level: 210 }
];
