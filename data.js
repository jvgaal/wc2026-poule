// data.js — 2026 FIFA World Cup Tournament Data

const WC = {
  name: "FIFA World Cup 2026",
  host: "USA · Canada · Mexico",
  start: "2026-06-11",
  end: "2026-07-19",
  finalVenue: "MetLife Stadium, New York / New Jersey",

  teams: {
    // Group A
    MEX: { name: "Mexico",              flag: "🇲🇽" },
    RSA: { name: "South Africa",        flag: "🇿🇦" },
    KOR: { name: "Korea Republic",      flag: "🇰🇷" },
    CZE: { name: "Czechia",             flag: "🇨🇿" },
    // Group B
    CAN: { name: "Canada",              flag: "🇨🇦" },
    SUI: { name: "Switzerland",         flag: "🇨🇭" },
    QAT: { name: "Qatar",               flag: "🇶🇦" },
    BIH: { name: "Bosnia & Herz.",      flag: "🇧🇦" },
    // Group C
    BRA: { name: "Brazil",              flag: "🇧🇷" },
    MAR: { name: "Morocco",             flag: "🇲🇦" },
    HAI: { name: "Haiti",               flag: "🇭🇹" },
    SCO: { name: "Scotland",            flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
    // Group D
    USA: { name: "USA",                 flag: "🇺🇸" },
    PAR: { name: "Paraguay",            flag: "🇵🇾" },
    AUS: { name: "Australia",           flag: "🇦🇺" },
    TUR: { name: "Türkiye",             flag: "🇹🇷" },
    // Group E
    GER: { name: "Germany",             flag: "🇩🇪" },
    CUW: { name: "Curaçao",             flag: "🇨🇼" },
    CIV: { name: "Côte d'Ivoire",       flag: "🇨🇮" },
    ECU: { name: "Ecuador",             flag: "🇪🇨" },
    // Group F
    NED: { name: "Netherlands",         flag: "🇳🇱" },
    JPN: { name: "Japan",               flag: "🇯🇵" },
    TUN: { name: "Tunisia",             flag: "🇹🇳" },
    SWE: { name: "Sweden",              flag: "🇸🇪" },
    // Group G
    BEL: { name: "Belgium",             flag: "🇧🇪" },
    EGY: { name: "Egypt",               flag: "🇪🇬" },
    IRN: { name: "Iran",                flag: "🇮🇷" },
    NZL: { name: "New Zealand",         flag: "🇳🇿" },
    // Group H
    ESP: { name: "Spain",               flag: "🇪🇸" },
    CPV: { name: "Cabo Verde",          flag: "🇨🇻" },
    KSA: { name: "Saudi Arabia",        flag: "🇸🇦" },
    URU: { name: "Uruguay",             flag: "🇺🇾" },
    // Group I
    FRA: { name: "France",              flag: "🇫🇷" },
    SEN: { name: "Senegal",             flag: "🇸🇳" },
    NOR: { name: "Norway",              flag: "🇳🇴" },
    IRQ: { name: "Iraq",                flag: "🇮🇶" },
    // Group J
    ARG: { name: "Argentina",           flag: "🇦🇷" },
    ALG: { name: "Algeria",             flag: "🇩🇿" },
    AUT: { name: "Austria",             flag: "🇦🇹" },
    JOR: { name: "Jordan",              flag: "🇯🇴" },
    // Group K
    POR: { name: "Portugal",            flag: "🇵🇹" },
    UZB: { name: "Uzbekistan",          flag: "🇺🇿" },
    COL: { name: "Colombia",            flag: "🇨🇴" },
    COD: { name: "Congo DR",            flag: "🇨🇩" },
    // Group L
    ENG: { name: "England",             flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    CRO: { name: "Croatia",             flag: "🇭🇷" },
    GHA: { name: "Ghana",               flag: "🇬🇭" },
    PAN: { name: "Panama",              flag: "🇵🇦" },
  },

  groups: [
    { id: "A", teams: ["MEX", "RSA", "KOR", "CZE"] },
    { id: "B", teams: ["CAN", "SUI", "QAT", "BIH"] },
    { id: "C", teams: ["BRA", "MAR", "HAI", "SCO"] },
    { id: "D", teams: ["USA", "PAR", "AUS", "TUR"] },
    { id: "E", teams: ["GER", "CUW", "CIV", "ECU"] },
    { id: "F", teams: ["NED", "JPN", "TUN", "SWE"] },
    { id: "G", teams: ["BEL", "EGY", "IRN", "NZL"] },
    { id: "H", teams: ["ESP", "CPV", "KSA", "URU"] },
    { id: "I", teams: ["FRA", "SEN", "NOR", "IRQ"] },
    { id: "J", teams: ["ARG", "ALG", "AUT", "JOR"] },
    { id: "K", teams: ["POR", "UZB", "COL", "COD"] },
    { id: "L", teams: ["ENG", "CRO", "GHA", "PAN"] },
  ],

  scoring: {
    groupExact:  3,
    groupResult: 1,
    ko: { r32: 2, r16: 3, qf: 4, sf: 5, third: 3, final: 8 },
    bonus: {
      winner: 10, runner_up: 5, golden_boot: 8, golden_ball: 5,
      golden_glove: 4, best_young: 3,
      total_goals_3: 5, total_goals_8: 3, total_goals_15: 1,
      first_out: 3, red_card_final: 2, top_scoring_team: 4
    }
  },

  koRounds: [
    { id: "r32",   name: "Round of 32",    short: "R32", matches: 16, pts: 2, lockDate: "2026-06-28", startMatch: 73  },
    { id: "r16",   name: "Round of 16",    short: "R16", matches: 8,  pts: 3, lockDate: "2026-07-05", startMatch: 89  },
    { id: "qf",    name: "Quarter-Finals", short: "QF",  matches: 4,  pts: 4, lockDate: "2026-07-10", startMatch: 97  },
    { id: "sf",    name: "Semi-Finals",    short: "SF",  matches: 2,  pts: 5, lockDate: "2026-07-14", startMatch: 101 },
    { id: "third", name: "3rd Place",      short: "3rd", matches: 1,  pts: 3, lockDate: "2026-07-18", startMatch: 103 },
    { id: "final", name: "Final",          short: "F",   matches: 1,  pts: 8, lockDate: "2026-07-19", startMatch: 104 },
  ],

  bonusQuestions: [
    {
      id: "winner", emoji: "🏆",
      question: "Who will win the 2026 World Cup?",
      type: "team", points: 10,
      tip: "Spain (+450) · France (+550) · England (+650) · Brazil (+850) · Argentina (+850)",
      links: [
        { label: "Oddschecker",    url: "https://www.oddschecker.com/football/world-cup/winner" },
        { label: "ESPN Betting",   url: "https://www.espn.com/espn/betting/story/_/id/48386952/espn-soccer-futbol-world-cup-betting-odds-championship-groups" },
        { label: "Covers.com",     url: "https://www.covers.com/world-cup/odds" },
        { label: "Polymarket",     url: "https://polymarket.com/event/2026-fifa-world-cup-winner-595" },
      ]
    },
    {
      id: "runner_up", emoji: "🥈",
      question: "Who will be the runner-up (reach the Final)?",
      type: "team", points: 5,
      tip: "Which bracket half has the weaker route to the final? Big teams on opposite sides increases your odds.",
      links: [
        { label: "Bracket analysis – Rotowire", url: "https://www.rotowire.com/soccer/article/2026-world-cup-group-previews-lineups-odds-predictions-and-tactics-for-all-12-groups-111248" },
        { label: "Tournament odds",             url: "https://www.oddschecker.com/football/world-cup/winner" },
      ]
    },
    {
      id: "golden_boot", emoji: "👟",
      question: "Who wins the Golden Boot (top scorer)?",
      type: "player", points: 8,
      tip: "Mbappé (+650) · Kane (+700) · Messi (+1200) · Haaland (+1400) · Yamal (+1800)",
      links: [
        { label: "Top scorer odds – NBC Sports",  url: "https://www.nbcsports.com/soccer/news/betting-odds-for-2026-world-cup-who-are-the-favorites-dark-horses-top-scorers" },
        { label: "Yahoo Sports full preview",     url: "https://sports.yahoo.com/soccer/betting/article/ultimate-2026-world-cup-betting-preview-odds-best-bets-for-every-group-golden-boot-and-winner-195049054.html" },
        { label: "Player stats – Transfermarkt",  url: "https://www.transfermarkt.com" },
      ]
    },
    {
      id: "golden_ball", emoji: "🌟",
      question: "Who wins the Golden Ball (best player)?",
      type: "player", points: 5,
      tip: "Can go to someone from a losing team — think playmakers, dribblers. Messi won it in 2022 despite Argentina winning.",
      links: [
        { label: "Player form – Sofascore", url: "https://www.sofascore.com" },
      ]
    },
    {
      id: "golden_glove", emoji: "🧤",
      question: "Who wins the Golden Glove (best goalkeeper)?",
      type: "player", points: 4,
      tip: "Usually goes to a keeper from a deep-running, defensively solid team. Clean sheets and big saves matter.",
      links: [
        { label: "Keeper stats – Sofascore", url: "https://www.sofascore.com" },
      ]
    },
    {
      id: "best_young", emoji: "🌱",
      question: "Who wins the Best Young Player award?",
      type: "player", points: 3,
      tip: "Born on or after 1 Jan 2002. Hot picks: Yamal (Spain), Bellingham (Eng), Gakpo (NED), Reijnders (NED), Camavinga (FRA)",
      links: [
        { label: "Young stars to watch – ESPN", url: "https://www.espn.com/soccer/story/_/id/47108758/2026-fifa-world-cup-format-tiebreakers-fixtures-schedule" },
      ]
    },
    {
      id: "total_goals", emoji: "⚽",
      question: "How many total goals will be scored in the entire tournament?",
      type: "number", points: "5 pts (±3) · 3 pts (±8) · 1 pt (±15)",
      tip: "2022 World Cup: 172 goals in 64 games (2.69/game). With 104 games in 2026, estimate is ~280 goals.",
      links: [
        { label: "Historical WC stats – Wikipedia", url: "https://en.wikipedia.org/wiki/FIFA_World_Cup_statistics" },
      ]
    },
    {
      id: "first_out", emoji: "🃏",
      question: "Which team will be eliminated first?",
      type: "team", points: 3,
      tip: "Tough draws for: Haiti (Group C with Brazil/Morocco), Jordan (Group J with Argentina), Uzbekistan, Curaçao.",
      links: [
        { label: "Group odds",             url: "https://www.oddschecker.com/football/world-cup" },
        { label: "Group previews – Rotowire", url: "https://www.rotowire.com/soccer/article/2026-world-cup-group-previews-lineups-odds-predictions-and-tactics-for-all-12-groups-111248" },
      ]
    },
    {
      id: "red_card_final", emoji: "🔴",
      question: "Will there be a red card shown in the Final?",
      type: "boolean", points: 2,
      tip: "Rare — only a handful in WC history. Most famous: Zidane's headbutt in 2006. History says no, but stranger things have happened.",
      links: []
    },
    {
      id: "top_scoring_team", emoji: "⚡",
      question: "Which team will score the most goals in the whole tournament?",
      type: "team", points: 4,
      tip: "Usually (but not always) the champion. Attacking powerhouses: France, Germany, Spain, Brazil all have strong firepower.",
      links: [
        { label: "Team odds – Covers", url: "https://www.covers.com/world-cup/odds" },
      ]
    },
  ],
};

// Generate all 72 group stage matches
(() => {
  // Standard FIFA group-stage pairing order: R1=[0v1,2v3] R2=[0v2,1v3] R3=[0v3,1v2]
  const pairings = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];
  const rounds   = [   1,   1,   2,   2,   3,   3];

  WC.matches   = [];
  WC.matchById = {};

  WC.groups.forEach(g => {
    pairings.forEach(([i, j], idx) => {
      const m = {
        id:    `${g.id}${idx + 1}`,
        group: g.id,
        round: rounds[idx],
        home:  g.teams[i],
        away:  g.teams[j],
      };
      WC.matches.push(m);
      WC.matchById[m.id] = m;
    });
  });

  // Alphabetical sorted team list for dropdowns
  WC.teamList = Object.entries(WC.teams)
    .map(([code, t]) => ({ code, ...t }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Matches per group lookup
  WC.matchesByGroup = {};
  WC.groups.forEach(g => {
    WC.matchesByGroup[g.id] = WC.matches.filter(m => m.group === g.id);
  });
})();
