import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  UserPlus, 
  Play, 
  CheckCircle2, 
  RotateCcw, 
  Flame,
  Crown,
  Sparkles,
  UserCheck,
  UserX,
  Trash2,
  ListOrdered,
  LogOut,
  X,
  Printer,
  Clock,
  Link,
  Unlink,
  LayoutGrid,
  Upload,
  ClipboardPaste,
  Edit2,
  Check,
  Layers,
  GitBranch,
  History,
  Repeat,
  Medal,
  TrendingUp,
  Filter,
  Search,
  Activity,
  ShieldAlert
} from 'lucide-react';

// --- DYNAMIC COURT / LEVEL BADGE COLOR HELPER ---
const getCourtLevelBadgeStyle = (value) => {
  const num = parseInt(value, 10) || 1;
  switch (num) {
    case 1:
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 2:
      return 'bg-cyan-100 text-cyan-900 border-cyan-300';
    case 3:
      return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    case 4:
      return 'bg-purple-100 text-purple-900 border-purple-300';
    case 5:
      return 'bg-rose-100 text-rose-900 border-rose-300';
    case 6:
      return 'bg-blue-100 text-blue-900 border-blue-300';
    case 7:
      return 'bg-indigo-100 text-indigo-900 border-indigo-300';
    case 8:
      return 'bg-orange-100 text-orange-900 border-orange-300';
    default:
      return 'bg-slate-100 text-slate-900 border-slate-300';
  }
};

// Custom Logo Component
function PBLLogo({ className = "w-20 h-20" }) {
  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-xl flex items-center justify-center bg-gray-100 border border-gray-200`}>
      <img 
        src="./logo.jfif" 
        alt="PBL Queueing Logo" 
        className="w-full h-full object-cover"
      />
    </div>
  );
}

// --- SCHEDULE STRENGTH (SoS) CALCULATION HELPER ---
const calculateScheduleStrength = (playerId, rosterData, historyData) => {
  const opponentIds = new Set();

  historyData.forEach(match => {
    const isTeamA = match.teamAPlayerIds.includes(playerId);
    const isTeamB = match.teamBPlayerIds.includes(playerId);

    if (isTeamA) {
      match.teamBPlayerIds.forEach(id => opponentIds.add(id));
    } else if (isTeamB) {
      match.teamAPlayerIds.forEach(id => opponentIds.add(id));
    }
  });

  if (opponentIds.size === 0) return 0;

  let totalOpponentWinRate = 0;
  let countedOpponents = 0;

  opponentIds.forEach(oppId => {
    const opp = rosterData.find(p => p.id === oppId);
    if (opp && opp.gamesPlayed > 0) {
      totalOpponentWinRate += (opp.wins / opp.gamesPlayed);
      countedOpponents++;
    }
  });

  if (countedOpponents === 0) return 0;
  return Math.round((totalOpponentWinRate / countedOpponents) * 100);
};

// --- CORE BAYESIAN & RANKING METRIC CALCULATOR ---
const calculateAdvancedPlayerMetrics = (player) => {
  const games = player.gamesPlayed || 0;
  const wins = player.wins || 0;
  
  // Bayesian Average Parameters
  const m = 5; // Pseudo-games weight
  const mu = 0.50; // Global target win rate baseline (50%)
  
  // 1. Bayesian Adjusted Win Rate
  const bayesianWinRate = (wins + (m * mu)) / (games + m);

  // 2. Active Participation Multiplier: 1 - e^(-k * Games)
  const k = 0.2; 
  const participationMultiplier = 1 - Math.exp(-k * games);

  // 3. Final Score
  const finalScore = bayesianWinRate * participationMultiplier;

  // 4. Minimum Game Threshold Qualifier Flag
  const MIN_GAMES_THRESHOLD = 5;
  const isQualified = games >= MIN_GAMES_THRESHOLD;

  return {
    rawWinRate: games > 0 ? (wins / games) : 0,
    bayesianWinRate,
    finalScore,
    isQualified
  };
};

export default function App() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('courts'); 
  const [now, setNow] = useState(Date.now()); 
  const [leaderboardFilter, setLeaderboardFilter] = useState('all');
  const [leaderboardSearch, setLeaderboardSearch] = useState('');

  const [queueMode, setQueueMode] = useState(() => {
    return localStorage.getItem('pickleq_queue_mode') || 'independent';
  });

  const [totalCourtCount, setTotalCourtCount] = useState(() => {
    return parseInt(localStorage.getItem('pickleq_court_count') || '3', 10);
  });

  const [sessionActive, setSessionActive] = useState(() => {
    return JSON.parse(localStorage.getItem('pickleq_session_active') || 'false');
  });

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTextContent, setImportTextContent] = useState('');

  const [editingCourtId, setEditingCourtId] = useState(null);
  const [tempCourtName, setTempCourtName] = useState('');

  const [partnerP1, setPartnerP1] = useState('');
  const [partnerP2, setPartnerP2] = useState('');

  const [courts, setCourts] = useState(() => {
    const saved = localStorage.getItem('pickleq_courts');
    if (saved) return JSON.parse(saved);
    return Array.from({ length: totalCourtCount }, (_, i) => ({
      id: i + 1,
      name: `Court 0${i + 1}`,
      teamA: [],
      teamB: [],
      isLive: false,
      startTime: null,
      totalPlayTimeSec: 0
    }));
  });

  const [roster, setRoster] = useState(() => {
    const saved = localStorage.getItem('pickleq_roster');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Alex Rivera', gamesPlayed: 6, wins: 5, losses: 1, level: 1, assignedCourt: 1, courtGames: {}, timePlayedSec: 1800, isCheckedIn: true, partnerId: '2', checkedInAt: Date.now() - 620000, headToHead: {}, scheduleStrength: 0 },
      { id: '2', name: 'Jordan Chen', gamesPlayed: 6, wins: 4, losses: 2, level: 1, assignedCourt: 1, courtGames: {}, timePlayedSec: 1800, isCheckedIn: true, partnerId: '1', checkedInAt: Date.now() - 510000, headToHead: {}, scheduleStrength: 0 },
      { id: '3', name: 'Sam Taylor', gamesPlayed: 2, wins: 2, losses: 0, level: 2, assignedCourt: 2, courtGames: {}, timePlayedSec: 600, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 415000, headToHead: {}, scheduleStrength: 0 },
      { id: '4', name: 'Morgan Smith', gamesPlayed: 5, wins: 3, losses: 2, level: 2, assignedCourt: 2, courtGames: {}, timePlayedSec: 1500, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 305000, headToHead: {}, scheduleStrength: 0 },
      { id: '5', name: 'Chris Lee', gamesPlayed: 1, wins: 1, losses: 0, level: 3, assignedCourt: 3, courtGames: {}, timePlayedSec: 300, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 210000, headToHead: {}, scheduleStrength: 0 },
      { id: '6', name: 'Pat Gomez', gamesPlayed: 5, wins: 1, losses: 4, level: 3, assignedCourt: 3, courtGames: {}, timePlayedSec: 1500, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 95000, headToHead: {}, scheduleStrength: 0 },
    ];
  });

  const [matchHistory, setMatchHistory] = useState(() => {
    const saved = localStorage.getItem('pickleq_match_history');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [playerName, setPlayerName] = useState('');
  const [totalMatches, setTotalMatches] = useState(() => {
    return parseInt(localStorage.getItem('pickleq_matches') || '0', 10);
  });

  const fileInputRef = useRef(null);

  // --- ADVANCED RANKING HOOK WITH BAYESIAN SMOOTHING & PROVISIONAL TIER ---
  const rankedRoster = useMemo(() => {
    const getHeadToHeadWinner = (playerA, playerB) => {
      if (!playerA.headToHead || !playerB.headToHead) return 0;
      const recordAtoB = playerA.headToHead[playerB.id];
      const recordBtoA = playerB.headToHead[playerA.id];
      const winsA = recordAtoB ? recordAtoB.winsAgainst : 0;
      const winsB = recordBtoA ? recordBtoA.winsAgainst : 0;

      if (winsA > winsB) return -1;
      if (winsB > winsA) return 1;
      return 0;
    };

    const eligibleRoster = roster.map(player => {
      const metrics = calculateAdvancedPlayerMetrics(player);
      return { ...player, ...metrics };
    }).filter((p) => p.isCheckedIn || p.gamesPlayed > 0);

    const sorted = [...eligibleRoster].sort((a, b) => {
      if (a.isQualified !== b.isQualified) {
        return a.isQualified ? -1 : 1;
      }

      if (queueMode === 'dependent') {
        const courtA = a.assignedCourt || totalCourtCount;
        const courtB = b.assignedCourt || totalCourtCount;
        if (courtA !== courtB) return courtA - courtB;

        if (a.finalScore !== b.finalScore) return b.finalScore - a.finalScore;

        const sosA = a.scheduleStrength || 0;
        const sosB = b.scheduleStrength || 0;
        if (sosA !== sosB) return sosB - sosA;

        return getHeadToHeadWinner(a, b);
      } else {
        if (b.level !== a.level) return b.level - a.level;

        if (a.finalScore !== b.finalScore) return b.finalScore - a.finalScore;

        const sosA = a.scheduleStrength || 0;
        const sosB = b.scheduleStrength || 0;
        if (sosA !== sosB) return sosB - sosA;

        return getHeadToHeadWinner(a, b);
      }
    });

    let currentRank = 1;
    return sorted.map((player, index, arr) => {
      if (index > 0) {
        const prev = arr[index - 1];
        const prevCourt = prev.assignedCourt || totalCourtCount;
        const currCourt = player.assignedCourt || totalCourtCount;

        const isDifferent = queueMode === 'dependent'
          ? (prev.isQualified !== player.isQualified || prevCourt !== currCourt || prev.finalScore !== player.finalScore || (prev.scheduleStrength || 0) !== (player.scheduleStrength || 0) || getHeadToHeadWinner(prev, player) !== 0)
          : (prev.isQualified !== player.isQualified || prev.level !== player.level || prev.finalScore !== player.finalScore || (prev.scheduleStrength || 0) !== (player.scheduleStrength || 0) || getHeadToHeadWinner(prev, player) !== 0);

        if (isDifferent) {
          currentRank += 1;
        }
      }
      return { ...player, calculatedRank: currentRank };
    });
  }, [roster, queueMode, totalCourtCount]);

  const qualifiedRoster = useMemo(() => rankedRoster.filter(p => p.isQualified), [rankedRoster]);
  const provisionalRoster = useMemo(() => rankedRoster.filter(p => !p.isQualified), [rankedRoster]);

  const podiumData = useMemo(() => {
    const rank1 = qualifiedRoster.filter(p => p.calculatedRank === 1);
    const rank2 = qualifiedRoster.filter(p => p.calculatedRank === 2);
    const rank3 = qualifiedRoster.filter(p => p.calculatedRank === 3);
    return { rank1, rank2, rank3, hasPodium: rank1.length > 0 };
  }, [qualifiedRoster]);

  const filteredLeaderboard = useMemo(() => {
    return rankedRoster.filter(player => {
      const matchesFilter = leaderboardFilter === 'checkedIn' ? player.isCheckedIn : true;
      const matchesSearch = player.name.toLowerCase().includes(leaderboardSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [rankedRoster, leaderboardFilter, leaderboardSearch]);

  const activeCourtPlayerIds = new Set(
    courts.flatMap((c) => [...c.teamA, ...c.teamB].map((p) => p.id))
  );

  const checkedInQueue = roster.filter(
    (p) => p.isCheckedIn && !activeCourtPlayerIds.has(p.id)
  );

  useEffect(() => localStorage.setItem('pickleq_queue_mode', queueMode), [queueMode]);
  useEffect(() => localStorage.setItem('pickleq_court_count', totalCourtCount.toString()), [totalCourtCount]);
  useEffect(() => localStorage.setItem('pickleq_session_active', JSON.stringify(sessionActive)), [sessionActive]);
  useEffect(() => localStorage.setItem('pickleq_courts', JSON.stringify(courts)), [courts]);
  useEffect(() => localStorage.setItem('pickleq_roster', JSON.stringify(roster)), [roster]);
  useEffect(() => localStorage.setItem('pickleq_matches', totalMatches.toString()), [totalMatches]);
  useEffect(() => localStorage.setItem('pickleq_match_history', JSON.stringify(matchHistory)), [matchHistory]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCourtCountChange = (newCount) => {
    const count = Math.max(1, Math.min(10, parseInt(newCount, 10) || 1));
    setTotalCourtCount(count);
    
    setCourts((prevCourts) => {
      if (count > prevCourts.length) {
        const added = Array.from({ length: count - prevCourts.length }, (_, i) => {
          const newIdx = prevCourts.length + i + 1;
          return {
            id: newIdx,
            name: `Court 0${newIdx}`,
            teamA: [],
            teamB: [],
            isLive: false,
            startTime: null,
            totalPlayTimeSec: 0
          };
        });
        return [...prevCourts, ...added];
      } else {
        return prevCourts.slice(0, count);
      }
    });
  };

  const handleSaveCourtName = (courtId) => {
    if (!tempCourtName.trim()) return;
    setCourts((prev) =>
      prev.map((c) => (c.id === courtId ? { ...c, name: tempCourtName.trim() } : c))
    );
    setEditingCourtId(null);
    setTempCourtName('');
  };

  const handleLinkPartners = (e) => {
    e.preventDefault();
    if (!partnerP1 || !partnerP2 || partnerP1 === partnerP2) {
      alert('Please select two different players to partner up.');
      return;
    }

    setRoster((prev) =>
      prev.map((p) => {
        if (p.id === partnerP1) return { ...p, partnerId: partnerP2 };
        if (p.id === partnerP2) return { ...p, partnerId: partnerP1 };
        return p;
      })
    );

    setPartnerP1('');
    setPartnerP2('');
  };

  const handleUnlinkPartner = (playerId) => {
    const targetPlayer = roster.find((p) => p.id === playerId);
    if (!targetPlayer || !targetPlayer.partnerId) return;

    const partnerId = targetPlayer.partnerId;
    setRoster((prev) =>
      prev.map((p) => (p.id === playerId || p.id === partnerId ? { ...p, partnerId: null } : p))
    );
  };

  const handleReorderQueue = (playerId, direction, currentQueue) => {
    const index = currentQueue.findIndex(p => p.id === playerId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentQueue.length) return;

    const playerA = currentQueue[index];
    const playerB = currentQueue[targetIndex];

    const timeA = playerA.checkedInAt || Date.now();
    const timeB = playerB.checkedInAt || Date.now();

    setRoster(prev => prev.map(p => {
      if (p.id === playerA.id) return { ...p, checkedInAt: timeB };
      if (p.id === playerB.id) return { ...p, checkedInAt: timeA };
      return p;
    }));
  };

  const handleToggleSession = () => {
    if (!sessionActive) {
      setSessionActive(true);
      setShowSummaryModal(false);
      if (queueMode === 'dependent') {
        setTimeout(() => initializeSnakeDraftAcrossCourts(), 50);
      }
    } else {
      if (window.confirm("End session and generate player stats summary?")) {
        setSessionActive(false);
        setShowSummaryModal(true);
      }
    }
  };

  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const newPlayer = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: playerName.trim(),
      gamesPlayed: 0, 
      wins: 0,
      losses: 0,
      level: 1, 
      assignedCourt: 1,
      courtGames: {},
      timePlayedSec: 0,
      isCheckedIn: false,
      partnerId: null,
      checkedInAt: null,
      headToHead: {},
      scheduleStrength: 0
    };

    setRoster((prev) => [...prev, newPlayer]);
    setPlayerName('');
  };

  const parseAndAddPlayerLines = (rawContent) => {
    const lines = rawContent.split(/\r?\n/);
    const newPlayers = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (index === 0 && (trimmed.toLowerCase().includes('name') || trimmed.toLowerCase().includes('player'))) return;

      const parts = trimmed.split(/[,;\t]+/).map(p => p.trim());
      const name = parts[0];
      if (!name) return;

      newPlayers.push({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6) + index,
        name: name,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        level: 1,
        assignedCourt: 1,
        courtGames: {},
        timePlayedSec: 0,
        isCheckedIn: false,
        partnerId: null,
        checkedInAt: null,
        headToHead: {},
        scheduleStrength: 0
      });
    });

    if (newPlayers.length > 0) {
      setRoster((prev) => [...prev, ...newPlayers]);
      alert(`Successfully imported ${newPlayers.length} players!`);
      setShowImportModal(false);
      setImportTextContent('');
    } else {
      alert("No valid players found to import.");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string') return;
      parseAndAddPlayerLines(content);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleToggleCheckIn = (playerId) => {
    setRoster((prev) => {
      const target = prev.find((p) => p.id === playerId);
      if (!target) return prev;

      const nextState = !target.isCheckedIn;
      const partnerId = target.partnerId;

      return prev.map((p) => {
        if (p.id === playerId || (partnerId && p.id === partnerId)) {
          return {
            ...p,
            isCheckedIn: nextState,
            checkedInAt: nextState ? Date.now() : null
          };
        }
        return p;
      });
    });

    if (queueMode === 'dependent') {
      setTimeout(() => initializeSnakeDraftAcrossCourts(), 50);
    }
  };

  const handleRemoveFromRoster = (playerId) => {
    handleUnlinkPartner(playerId);
    setRoster((prev) => prev.filter((p) => p.id !== playerId));
  };

  const initializeSnakeDraftAcrossCourts = () => {
    const availableQueuePlayers = roster
      .filter((p) => p.isCheckedIn && !activeCourtPlayerIds.has(p.id) && p.gamesPlayed === 0 && (!p.assignedCourt || p.assignedCourt > totalCourtCount))
      .sort((a, b) => (a.checkedInAt || 0) - (b.checkedInAt || 0));

    if (availableQueuePlayers.length === 0) return;

    const courtAssignments = Array.from({ length: totalCourtCount }, () => []);
    let courtIndex = 0;
    const processedIds = new Set();

    availableQueuePlayers.forEach((player) => {
      if (processedIds.has(player.id)) return;

      let partner = null;
      if (player.partnerId) {
        partner = availableQueuePlayers.find((p) => p.id === player.partnerId && !processedIds.has(p.id));
      }

      let iterations = 0;
      while (courtAssignments[courtIndex].length >= 4 && iterations < totalCourtCount) {
        courtIndex = (courtIndex + 1) % totalCourtCount;
        iterations++;
      }

      if (iterations >= totalCourtCount) return;

      courtAssignments[courtIndex].push(player);
      processedIds.add(player.id);

      if (partner) {
        if (courtAssignments[courtIndex].length < 4) {
          courtAssignments[courtIndex].push(partner);
          processedIds.add(partner.id);
        } else {
          let found = false;
          for (let i = 0; i < totalCourtCount; i++) {
            if (courtAssignments[i].length < 4) {
              courtAssignments[i].push(partner);
              processedIds.add(partner.id);
              found = true;
              break;
            }
          }
          if (!found) {
            courtAssignments[courtIndex].pop();
            processedIds.delete(player.id);
            return;
          }
        }
      }

      if (courtAssignments[courtIndex].length >= 4) {
        courtIndex = (courtIndex + 1) % totalCourtCount;
      }
    });

    setRoster((prev) =>
      prev.map((player) => {
        if (player.gamesPlayed > 0 || player.assignedCourt) return player;
        for (let i = 0; i < totalCourtCount; i++) {
          if (courtAssignments[i].some((p) => p.id === player.id)) {
            return { ...player, assignedCourt: i + 1 };
          }
        }
        return player;
      })
    );
  };

  useEffect(() => {
    if (sessionActive && queueMode === 'dependent') {
      initializeSnakeDraftAcrossCourts();
    }
  }, [totalCourtCount, sessionActive, queueMode]);

  const getQueueForCourtDependent = (courtId) => {
    return checkedInQueue
      .filter((player) => {
        if (player.gamesPlayed === 0) return true;
        return player.assignedCourt === courtId;
      })
      .sort((a, b) => (a.checkedInAt || 0) - (b.checkedInAt || 0));
  };

  const getQueueForLevelIndependent = (levelNum) => {
    return roster
      .filter((p) => p.isCheckedIn && !activeCourtPlayerIds.has(p.id) && p.level === levelNum)
      .sort((a, b) => (a.checkedInAt || 0) - (b.checkedInAt || 0));
  };

  const formatWaitTime = (checkedInAt) => {
    if (!checkedInAt) return '0m 0s';
    const totalSec = Math.max(0, Math.floor((now - checkedInAt) / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs}s`;
  };

  const getNextMatchFromQueueIndependent = (levelNum) => {
    const levelQueue = getQueueForLevelIndependent(levelNum);
    if (levelQueue.length < 4) return { teamA: [], teamB: [], valid: false };

    const selected = [];
    const usedIds = new Set();

    const partnerPair = levelQueue.find(p => p.partnerId && levelQueue.some(partner => partner.id === p.partnerId && !usedIds.has(partner.id)));
    if (partnerPair) {
      const partner = levelQueue.find(p => p.id === partnerPair.partnerId);
      if (partner) {
        selected.push(partnerPair, partner);
        usedIds.add(partnerPair.id);
        usedIds.add(partner.id);
      }
    }

    for (const p of levelQueue) {
      if (usedIds.has(p.id)) continue;
      
      if (p.partnerId) {
        const partner = levelQueue.find((item) => item.id === p.partnerId && !usedIds.has(item.id));
        if (partner && selected.length <= 2) {
          selected.push(p, partner);
          usedIds.add(p.id);
          usedIds.add(partner.id);
        } else if (!partner) {
          selected.push(p);
          usedIds.add(p.id);
        }
      } else {
        selected.push(p);
        usedIds.add(p.id);
      }
      if (selected.length >= 4) break;
    }

    if (selected.length < 4) return { teamA: [], teamB: [], valid: false };

    let teamA = [];
    let teamB = [];

    const p0 = selected[0];
    const p1 = selected[1];
    const p2 = selected[2];
    const p3 = selected[3];

    const isP0P1Partner = p0.partnerId === p1.id;
    const isP2P3Partner = p2.partnerId === p3.id;

    if (isP0P1Partner) {
      teamA = [p0, p1];
      teamB = [p2, p3];
    } else if (isP2P3Partner) {
      teamA = [p2, p3];
      teamB = [p0, p1];
    } else {
      teamA = [p0, p3];
      teamB = [p1, p2];
    }

    return { teamA, teamB, valid: true, level: levelNum };
  };

  const getPrioritizedCandidateMatchesIndependent = () => {
    const candidateMatches = [];

    for (let lvl = 1; lvl <= totalCourtCount; lvl++) {
      const match = getNextMatchFromQueueIndependent(lvl);
      if (match.valid) {
        const allPlayers = [...match.teamA, ...match.teamB];
        const minCheckedInAt = Math.min(...allPlayers.map((p) => p.checkedInAt || Date.now()));

        candidateMatches.push({
          level: lvl,
          matchData: match,
          minCheckedInAt
        });
      }
    }

    candidateMatches.sort((a, b) => {
      if (a.minCheckedInAt !== b.minCheckedInAt) {
        return a.minCheckedInAt - b.minCheckedInAt;
      }
      return b.level - a.level;
    });

    return candidateMatches;
  };

  const generateMatchForCourt = (courtId) => {
    if (!sessionActive) {
      alert("Please click 'Start Session' first!");
      return;
    }

    if (queueMode === 'independent') {
      const candidateMatches = getPrioritizedCandidateMatchesIndependent();
      if (candidateMatches.length === 0) {
        alert(`No level queue currently has at least 4 checked-in players ready to play.`);
        return;
      }

      const bestMatch = candidateMatches[0];
      setCourts((prev) =>
        prev.map((c) => {
          if (c.id === courtId) {
            return {
              ...c,
              teamA: bestMatch.matchData.teamA,
              teamB: bestMatch.matchData.teamB,
              level: bestMatch.level,
              isLive: true,
              startTime: Date.now()
            };
          }
          return c;
        })
      );
    } else {
      const unplayedCount = checkedInQueue.filter((p) => p.gamesPlayed === 0).length;
      if (unplayedCount > 0) {
        initializeSnakeDraftAcrossCourts();
      }

      const courtQueue = getQueueForCourtDependent(courtId);
      const targetCourt = courts.find(c => c.id === courtId);
      const courtDisplayName = targetCourt ? targetCourt.name : `Court 0${courtId}`;

      if (courtQueue.length < 4) {
        alert(`${courtDisplayName} needs at least 4 checked-in players. Available: ${courtQueue.length}`);
        return;
      }

      let teamA = [];
      let teamB = [];
      const selected = [];
      const usedIds = new Set();

      const partnerPair = courtQueue.find(p => p.partnerId && courtQueue.some(partner => partner.id === p.partnerId && !usedIds.has(partner.id)));
      if (partnerPair) {
        const partner = courtQueue.find(p => p.id === partnerPair.partnerId);
        if (partner) {
          selected.push(partnerPair, partner);
          usedIds.add(partnerPair.id);
          usedIds.add(partner.id);
        }
      }

      for (const p of courtQueue) {
        if (usedIds.has(p.id)) continue;
        if (p.partnerId) {
          const partner = courtQueue.find((item) => item.id === p.partnerId && !usedIds.has(item.id));
          if (partner && selected.length <= 2) {
            selected.push(p, partner);
            usedIds.add(p.id);
            usedIds.add(partner.id);
          } else if (!partner) {
            selected.push(p);
            usedIds.add(p.id);
          }
        } else {
          selected.push(p);
          usedIds.add(p.id);
        }
        if (selected.length >= 4) break;
      }

      if (selected.length < 4) {
        alert("Could not pair available players evenly.");
        return;
      }

      const p0 = selected[0];
      const p1 = selected[1];
      const p2 = selected[2];
      const p3 = selected[3];

      if (p0.partnerId === p1.id) {
        teamA = [p0, p1];
        teamB = [p2, p3];
      } else if (p2.partnerId === p3.id) {
        teamA = [p2, p3];
        teamB = [p0, p1];
      } else {
        teamA = [p0, p3];
        teamB = [p1, p2];
      }

      setCourts((prev) =>
        prev.map((c) => {
          if (c.id === courtId) {
            return {
              ...c,
              teamA,
              teamB,
              isLive: true,
              startTime: Date.now()
            };
          }
          return c;
        })
      );
    }
  };

  const handleFinishMatch = (courtId, winningTeamKey) => {
    setCourts((prevCourts) => {
      const courtIndex = prevCourts.findIndex((c) => c.id === courtId);
      const currentCourt = prevCourts[courtIndex];

      const durationSec = currentCourt.startTime
        ? Math.round((Date.now() - currentCourt.startTime) / 1000)
        : 0;

      const winners = winningTeamKey === 'A' ? currentCourt.teamA : currentCourt.teamB;
      const losers = winningTeamKey === 'A' ? currentCourt.teamB : currentCourt.teamA;

      const updatedPlayerMap = new Map();

      if (queueMode === 'independent') {
        const calculateNewLevel = (currentLevel, isWinner) => {
          if (isWinner) {
            return currentLevel < totalCourtCount ? currentLevel + 1 : currentLevel;
          } else {
            return currentLevel > 1 ? currentLevel - 1 : 1;
          }
        };

        winners.forEach((p) => {
          const existing = updatedPlayerMap.get(p.id) || {};
          updatedPlayerMap.set(p.id, { ...existing, isWinner: true, newLevel: calculateNewLevel(currentCourt.level, true) });
        });

        losers.forEach((p) => {
          const existing = updatedPlayerMap.get(p.id) || {};
          updatedPlayerMap.set(p.id, { ...existing, isWinner: false, newLevel: calculateNewLevel(currentCourt.level, false) });
        });

        setRoster((prevRoster) => {
          const intermediateRoster = prevRoster.map((player) => {
            if (updatedPlayerMap.has(player.id)) {
              const data = updatedPlayerMap.get(player.id);
              return {
                ...player,
                gamesPlayed: player.gamesPlayed + 1,
                wins: player.wins + (data.isWinner ? 1 : 0),
                losses: player.losses + (data.isWinner ? 0 : 1),
                level: data.newLevel,
                timePlayedSec: (player.timePlayedSec || 0) + durationSec,
                isCheckedIn: true,
                checkedInAt: Date.now()
              };
            }
            return player;
          });

          const finalRoster = intermediateRoster.map(player => {
            let updatedH2H = { ...(player.headToHead || {}) };
            winners.forEach(w => {
              losers.forEach(l => {
                if (player.id === w.id) {
                  if (!updatedH2H[l.id]) updatedH2H[l.id] = { winsAgainst: 0, totalAgainst: 0 };
                  updatedH2H[l.id].winsAgainst += 1;
                  updatedH2H[l.id].totalAgainst += 1;
                }
                if (player.id === l.id) {
                  if (!updatedH2H[w.id]) updatedH2H[w.id] = { winsAgainst: 0, totalAgainst: 0 };
                  updatedH2H[w.id].totalAgainst += 1;
                }
              });
            });
            return { ...player, headToHead: updatedH2H };
          });

          return finalRoster.map(player => ({
            ...player,
            scheduleStrength: calculateScheduleStrength(player.id, finalRoster, matchHistory)
          }));
        });

      } else {
        const getNextCourt = (isWinner) => {
          if (courtId === 1) return isWinner ? 1 : 2;
          if (courtId === totalCourtCount) return isWinner ? courtId - 1 : courtId;
          return isWinner ? courtId - 1 : courtId + 1;
        };

        winners.forEach((p) => {
          updatedPlayerMap.set(p.id, { isWinner: true, nextCourt: getNextCourt(true) });
        });

        losers.forEach((p) => {
          updatedPlayerMap.set(p.id, { isWinner: false, nextCourt: getNextCourt(false) });
        });

        setRoster((prevRoster) => {
          const intermediateRoster = prevRoster.map((player) => {
            if (updatedPlayerMap.has(player.id)) {
              const { isWinner, nextCourt } = updatedPlayerMap.get(player.id);
              const currentCourtGames = player.courtGames || {};
              const prevCourtCount = currentCourtGames[courtId] || 0;

              return {
                ...player,
                gamesPlayed: player.gamesPlayed + 1,
                wins: player.wins + (isWinner ? 1 : 0),
                losses: player.losses + (isWinner ? 0 : 1),
                assignedCourt: nextCourt,
                timePlayedSec: (player.timePlayedSec || 0) + durationSec,
                courtGames: { ...currentCourtGames, [courtId]: prevCourtCount + 1 },
                isCheckedIn: true,
                checkedInAt: Date.now()
              };
            }
            return player;
          });

          return intermediateRoster.map(player => ({
            ...player,
            scheduleStrength: calculateScheduleStrength(player.id, intermediateRoster, matchHistory)
          }));
        });
      }

      const newMatchRecord = {
        id: Date.now().toString(),
        matchNumber: totalMatches + 1,
        courtId: currentCourt.id,
        courtName: currentCourt.name,
        level: currentCourt.level || 1,
        teamAPlayerIds: currentCourt.teamA.map(p => p.id),
        teamBPlayerIds: currentCourt.teamB.map(p => p.id),
        teamA: currentCourt.teamA.map(p => p.name),
        teamB: currentCourt.teamB.map(p => p.name),
        winningTeam: winningTeamKey,
        durationSec,
        timestamp: Date.now()
      };

      setMatchHistory((prev) => [newMatchRecord, ...prev]);

      let newCourts = [...prevCourts];
      newCourts[courtIndex] = { 
        ...currentCourt, 
        teamA: [], 
        teamB: [], 
        isLive: false, 
        startTime: null,
        totalPlayTimeSec: (currentCourt.totalPlayTimeSec || 0) + durationSec
      };

      setTotalMatches((prev) => prev + 1);
      return newCourts;
    });
  };

  const handleSwapMatchWinner = (matchRecordId) => {
    const targetMatch = matchHistory.find(m => m.id === matchRecordId);
    if (!targetMatch) return;

    const newWinningTeam = targetMatch.winningTeam === 'A' ? 'B' : 'A';
    const matchLevel = targetMatch.level;
    const matchCourtId = targetMatch.courtId;

    setRoster(prevRoster => {
      const intermediateRoster = prevRoster.map(player => {
        const isTeamA = targetMatch.teamAPlayerIds.includes(player.id);
        const isTeamB = targetMatch.teamBPlayerIds.includes(player.id);

        if (!isTeamA && !isTeamB) return player;

        const wasWinner = (isTeamA && targetMatch.winningTeam === 'A') || (isTeamB && targetMatch.winningTeam === 'B');
        const isNowWinner = (isTeamA && newWinningTeam === 'A') || (isTeamB && newWinningTeam === 'B');

        let updatedWins = player.wins;
        let updatedLosses = player.losses;

        if (wasWinner && !isNowWinner) {
          updatedWins = Math.max(0, player.wins - 1);
          updatedLosses = player.losses + 1;
        } else if (!wasWinner && isNowWinner) {
          updatedWins = player.wins + 1;
          updatedLosses = Math.max(0, player.losses - 1);
        }

        let updatedLevel = player.level;
        let updatedAssignedCourt = player.assignedCourt;

        if (queueMode === 'independent') {
          if (isNowWinner) {
            updatedLevel = matchLevel < totalCourtCount ? matchLevel + 1 : matchLevel;
          } else {
            updatedLevel = matchLevel > 1 ? matchLevel - 1 : 1;
          }
        } else {
          if (isNowWinner) {
            if (matchCourtId === 1) updatedAssignedCourt = 1;
            else if (matchCourtId === totalCourtCount) updatedAssignedCourt = matchCourtId - 1;
            else updatedAssignedCourt = matchCourtId - 1;
          } else {
            if (matchCourtId === 1) updatedAssignedCourt = 2;
            else if (matchCourtId === totalCourtCount) updatedAssignedCourt = matchCourtId;
            else updatedAssignedCourt = matchCourtId + 1;
          }
        }

        return {
          ...player,
          wins: updatedWins,
          losses: updatedLosses,
          level: updatedLevel,
          assignedCourt: updatedAssignedCourt
        };
      });

      const updatedHistory = matchHistory.map(m => (m.id === matchRecordId ? { ...m, winningTeam: newWinningTeam } : m));

      return intermediateRoster.map(player => ({
        ...player,
        scheduleStrength: calculateScheduleStrength(player.id, intermediateRoster, updatedHistory)
      }));
    });

    setMatchHistory(prev =>
      prev.map(m => (m.id === matchRecordId ? { ...m, winningTeam: newWinningTeam } : m))
    );
  };

  const handleResetSession = () => {
    if (window.confirm("Reset all session data, courts, and queues?")) {
      localStorage.clear();
      setSessionActive(false);
      setShowSummaryModal(false);
      setCourts(Array.from({ length: totalCourtCount }, (_, i) => ({ 
        id: i + 1, 
        name: `Court 0${i + 1}`, 
        teamA: [], 
        teamB: [], 
        isLive: false, 
        startTime: null,
        totalPlayTimeSec: 0 
      })));
      setRoster([]);
      setMatchHistory([]);
      setTotalMatches(0);
    }
  };

  const formatDuration = (seconds = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getPartnerName = (partnerId) => {
    const partner = roster.find((p) => p.id === partnerId);
    return partner ? partner.name : null;
  };

  // --- PODIUM RENDER HELPER ---
  const renderPodiumStep = (players, rankNum) => {
    if (!players || players.length === 0) return null;

    const namesJoined = players.map(p => p.name).join(' | ');
    const samplePlayer = players[0];
    const rawWinRatePercent = Math.round(samplePlayer.rawWinRate * 100);
    const courtOrLevelVal = queueMode === 'dependent' ? (samplePlayer.assignedCourt || 1) : samplePlayer.level;

    if (rankNum === 1) {
      return (
        <div className="bg-gradient-to-b from-amber-50 to-yellow-100/60 border-2 border-amber-400 rounded-2xl p-6 shadow-md flex flex-col items-center justify-between relative overflow-hidden order-1 md:order-2 ring-4 ring-amber-400/20">
          <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 font-black text-xs px-3 py-1 rounded-bl-xl flex items-center gap-1">
            <Crown className="w-3 h-3 fill-amber-950" /> #1 CHAMPION {players.length > 1 && `(${players.length}-Way Tie)`}
          </div>
          <div className="flex flex-col items-center text-center w-full">
            <div className="w-16 h-16 rounded-full bg-amber-300 border-2 border-amber-500 flex items-center justify-center mb-2 shadow-inner relative">
              <Crown className="w-8 h-8 text-amber-700 fill-amber-500 animate-bounce" />
            </div>
            <div className="space-y-2 w-full my-1">
              <h3 className="font-extrabold text-gray-900 text-lg tracking-wide">{namesJoined}</h3>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{queueMode === 'dependent' ? 'Court' : 'Level'}</span>
                <span className={`text-xs font-extrabold px-3 py-0.5 rounded-lg border shadow-2xs ${getCourtLevelBadgeStyle(courtOrLevelVal)}`}>
                  {courtOrLevelVal}
                </span>
              </div>
              <div className="mt-1 flex flex-col justify-center items-center gap-1 text-xs">
                <span className="text-emerald-700 font-bold">{samplePlayer.wins}W - {samplePlayer.losses}L</span>
                <span className="text-amber-700 font-extrabold bg-amber-200/60 px-2.5 py-0.5 rounded-md border border-amber-300">Raw Win: {rawWinRatePercent}%</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (rankNum === 2) {
      return (
        <div className="bg-gradient-to-b from-gray-50 to-slate-100 border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-between relative overflow-hidden order-2 md:order-1">
          <div className="absolute top-0 right-0 bg-slate-300 text-slate-800 font-extrabold text-xs px-3 py-1 rounded-bl-xl">
            #2 {players.length > 1 && `(${players.length}-Way Tie)`}
          </div>
          <div className="flex flex-col items-center text-center w-full">
            <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-slate-400 flex items-center justify-center mb-2 shadow-inner">
              <Medal className="w-6 h-6 text-slate-600" />
            </div>
            <div className="space-y-2 w-full my-1">
              <h3 className="font-bold text-gray-900 text-base">{namesJoined}</h3>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{queueMode === 'dependent' ? 'Court' : 'Level'}</span>
                <span className={`text-xs font-extrabold px-3 py-0.5 rounded-lg border shadow-2xs ${getCourtLevelBadgeStyle(courtOrLevelVal)}`}>
                  {courtOrLevelVal}
                </span>
              </div>
              <div className="mt-1 flex flex-col justify-center items-center gap-1 text-xs font-semibold">
                <span className="text-emerald-600">{samplePlayer.wins}W - {samplePlayer.losses}L</span>
                <span className="text-slate-700 font-bold bg-slate-200/70 px-2 py-0.5 rounded-md border border-slate-300">Raw Win: {rawWinRatePercent}%</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (rankNum === 3) {
      return (
        <div className="bg-gradient-to-b from-gray-50 to-amber-900/5 border border-amber-800/20 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-between relative overflow-hidden order-3">
          <div className="absolute top-0 right-0 bg-amber-800/20 text-amber-900 font-extrabold text-xs px-3 py-1 rounded-bl-xl">
            #3 {players.length > 1 && `(${players.length}-Way Tie)`}
          </div>
          <div className="flex flex-col items-center text-center w-full">
            <div className="w-12 h-12 rounded-full bg-amber-100 border-2 border-amber-700/40 flex items-center justify-center mb-2 shadow-inner">
              <Medal className="w-6 h-6 text-amber-800" />
            </div>
            <div className="space-y-2 w-full my-1">
              <h3 className="font-bold text-gray-900 text-base">{namesJoined}</h3>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{queueMode === 'dependent' ? 'Court' : 'Level'}</span>
                <span className={`text-xs font-extrabold px-3 py-0.5 rounded-lg border shadow-2xs ${getCourtLevelBadgeStyle(courtOrLevelVal)}`}>
                  {courtOrLevelVal}
                </span>
              </div>
              <div className="mt-1 flex flex-col justify-center items-center gap-1 text-xs font-semibold">
                <span className="text-emerald-600">{samplePlayer.wins}W - {samplePlayer.losses}L</span>
                <span className="text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300/40">Raw Win: {rawWinRatePercent}%</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-4 md:p-8 font-sans antialiased">
      {/* HEADER */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center pb-6 mb-8 border-b border-gray-200 gap-4">
        <div className="flex items-center gap-4">
          <PBLLogo className="w-24 h-24" />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider text-gray-900 uppercase">
              PBL Queueing
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {queueMode === 'independent' ? 'Court-Independent Level Queue & Rating System' : 'Highest Court Priority Ladder & Rating System'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleToggleSession}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition cursor-pointer shadow-md ${
              sessionActive 
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/10' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/10'
            }`}
          >
            {sessionActive ? (
              <><LogOut className="w-4 h-4" /> End Session</>
            ) : (
              <><Play className="w-4 h-4 fill-current" /> Start Session</>
            )}
          </button>

          <div className="bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-2xs">
            <Flame className="w-5 h-5 text-amber-500" />
            <div>
              <div className="text-[10px] text-gray-500 font-medium">MATCHES</div>
              <div className="text-base font-bold text-gray-900">{totalMatches}</div>
            </div>
          </div>

          <button
            onClick={handleResetSession}
            className="p-2.5 bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 border border-gray-200 hover:border-rose-200 rounded-xl transition cursor-pointer"
            title="Reset Session"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* IMPORT LIST MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-5 right-5 p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <ClipboardPaste className="w-6 h-6 text-cyan-600" />
              <h2 className="text-xl font-bold text-gray-900">Import Player List</h2>
            </div>

            <p className="text-gray-500 text-xs mb-4 leading-relaxed">
              Paste your list of players below (one player per line).
            </p>

            <textarea
              rows="8"
              placeholder="Alex Rivera&#10;Jordan Chen&#10;Sam Taylor&#10;Morgan Smith"
              value={importTextContent}
              onChange={(e) => setImportTextContent(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-cyan-500 rounded-xl p-3.5 text-sm font-mono text-gray-900 placeholder-gray-400 outline-none transition mb-4 resize-y"
            ></textarea>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv, .txt"
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer border border-gray-200"
              >
                <Upload className="w-4 h-4" /> Upload CSV/TXT File
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => parseAndAddPlayerLines(importTextContent)}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  Import Players
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY MODAL */}
      {showSummaryModal && (
        <section className="max-w-7xl mx-auto mb-8 bg-gray-50 border border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-xl relative animate-in fade-in slide-in-from-top-4 duration-300">
          <button
            onClick={() => setShowSummaryModal(false)}
            className="absolute top-5 right-5 p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="mb-6">
            <div className="flex items-center gap-3">
              <Trophy className="w-7 h-7 text-amber-500" />
              <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-wide uppercase">
                Session Final Summary
              </h2>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Completed Matches: <span className="text-amber-600 font-bold">{totalMatches}</span> | Ranked Players: <span className="text-cyan-600 font-bold">{qualifiedRoster.length}</span>
            </p>
          </div>

          {podiumData.hasPodium && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {renderPodiumStep(podiumData.rank2, 2)}
              {renderPodiumStep(podiumData.rank1, 1)}
              {renderPodiumStep(podiumData.rank3, 3)}
            </div>
          )}

          <div className="space-y-3 mb-6">
            {qualifiedRoster.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 italic">
                No qualified players (5+ games) recorded in this session.
              </div>
            ) : (
              <div>
                <div className="hidden md:grid grid-cols-5 gap-4 px-4 pb-2 text-[11px] font-extrabold uppercase text-gray-400 tracking-wider">
                  <div className="font-bold">Rank & Player</div>
                  <div className="text-center font-bold">{queueMode === 'dependent' ? 'Court' : 'Level'}</div>
                  <div className="font-bold">Raw Win %</div>
                  <div className="md:col-span-2 text-center font-bold">Performance Stats</div>
                </div>

                <div className="space-y-3">
                  {qualifiedRoster.map((player) => {
                    const rawWinRatePercent = Math.round(player.rawWinRate * 100);
                    const partnerName = getPartnerName(player.partnerId);
                    const courtOrLevelVal = queueMode === 'dependent' ? (player.assignedCourt || 1) : player.level;

                    return (
                      <div
                        key={player.id}
                        className={`bg-white border rounded-2xl p-4 transition-all shadow-2xs grid grid-cols-1 md:grid-cols-5 items-center gap-4 relative overflow-hidden ${
                          player.calculatedRank === 1 
                            ? 'border-amber-300 ring-2 ring-amber-300/20 bg-amber-50/20' 
                            : player.calculatedRank === 2
                            ? 'border-slate-300 bg-slate-50/20'
                            : player.calculatedRank === 3
                            ? 'border-amber-800/30 bg-amber-900/5'
                            : 'border-gray-200'
                        }`}
                      >
                        {/* Col 1: Rank & Name */}
                        <div className="flex items-center gap-3.5 md:col-span-1">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                            player.calculatedRank === 1 
                              ? 'bg-amber-400 text-amber-950 shadow-xs' 
                              : player.calculatedRank === 2
                              ? 'bg-slate-300 text-slate-800'
                              : player.calculatedRank === 3
                              ? 'bg-amber-800/20 text-amber-900'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            #{player.calculatedRank}
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-gray-900 truncate">{player.name}</span>
                              {player.calculatedRank === 1 && <Crown className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />}
                            </div>

                            {partnerName && (
                              <div className="text-[11px] font-semibold text-cyan-700 flex items-center gap-1">
                                <Link className="w-3 h-3 shrink-0" /> Partner: {partnerName}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Col 2: Court / Level (Separate Column with distinct background color) */}
                        <div className="flex items-center md:justify-center">
                          <span className={`px-3 py-1 rounded-lg font-extrabold text-xs border shadow-2xs inline-block text-center min-w-[36px] ${getCourtLevelBadgeStyle(courtOrLevelVal)}`}>
                            {courtOrLevelVal}
                          </span>
                        </div>

                        {/* Col 3: Raw Win % */}
                        <div className="space-y-1.5 md:col-span-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-amber-600">{rawWinRatePercent}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                rawWinRatePercent >= 60 ? 'bg-emerald-500' : rawWinRatePercent >= 45 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${rawWinRatePercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Col 4 & 5: Stats */}
                        <div className="grid grid-cols-4 gap-2 md:col-span-2 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 text-xs font-semibold text-center">
                          <div className="px-1">
                            <span className="text-[10px] text-gray-400 block uppercase font-bold">Played</span>
                            <span className="text-cyan-700 font-extrabold text-sm">{player.gamesPlayed}</span>
                          </div>

                          <div className="px-1">
                            <span className="text-[10px] text-gray-400 block uppercase font-bold">W / L</span>
                            <span className="text-gray-800 font-bold">
                              <span className="text-emerald-600">{player.wins}</span> - <span className="text-rose-600">{player.losses}</span>
                            </span>
                          </div>

                          <div className="px-1">
                            <span className="text-[10px] text-gray-400 block uppercase font-bold" title="Schedule Strength">SoS</span>
                            <span className="text-purple-600 font-bold">{player.scheduleStrength || 0}%</span>
                          </div>

                          <div className="px-1">
                            <span className="text-[10px] text-gray-400 block uppercase font-bold">Time</span>
                            <span className="text-cyan-700 font-bold font-mono">{formatDuration(player.timePlayedSec)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {provisionalRoster.length > 0 && (
            <div className="pt-4 border-t border-gray-200 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="text-md font-bold text-gray-800 uppercase tracking-wide">
                  Not Ranked (Provisional - Played &lt; 5 Games)
                </h3>
              </div>

              <div className="space-y-2">
                {provisionalRoster.map((player) => {
                  const partnerName = getPartnerName(player.partnerId);
                  const courtOrLevelVal = queueMode === 'dependent' ? (player.assignedCourt || 1) : player.level;

                  return (
                    <div
                      key={player.id}
                      className="bg-gray-100/60 border border-gray-200 border-dashed rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-gray-900">{player.name}</span>
                        <span className={`px-2.5 py-0.5 rounded-lg font-extrabold text-[11px] border shadow-2xs ${getCourtLevelBadgeStyle(courtOrLevelVal)}`}>
                          {courtOrLevelVal}
                        </span>
                        {partnerName && (
                          <span className="text-[10px] font-semibold text-cyan-700 flex items-center gap-0.5">
                            <Link className="w-3 h-3" /> Partner: {partnerName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-gray-600 font-medium">
                        <span>Played: <strong className="text-gray-900">{player.gamesPlayed}</strong></span>
                        <span>Record: <strong className="text-emerald-600">{player.wins}W</strong> - <strong className="text-rose-600">{player.losses}L</strong></span>
                        <span>SoS: <strong className="text-purple-600">{player.scheduleStrength || 0}%</strong></span>
                        <span>Time: <strong className="text-cyan-700 font-mono">{formatDuration(player.timePlayedSec)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center flex-wrap gap-4 pt-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print / Save Summary
            </button>
            <button
              onClick={() => setShowSummaryModal(false)}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              Close Summary Panel
            </button>
          </div>
        </section>
      )}

      {/* SEPARATED SYSTEM SETTINGS (Queue Match Type & Courts) */}
      <div className="max-w-7xl mx-auto mb-4 bg-white border border-gray-200 rounded-2xl p-3 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-2xs">
        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-cyan-600" />
            <label className="text-xs font-semibold text-gray-900">Match Mode:</label>
            <select
              value={queueMode}
              onChange={(e) => setQueueMode(e.target.value)}
              className="bg-white border border-gray-200 text-cyan-700 font-bold rounded-lg px-2 py-1 text-xs outline-none cursor-pointer focus:border-cyan-500 shadow-2xs"
            >
              <option value="independent">Court-Independent (Level / Longest Wait)</option>
              <option value="dependent">Court-Dependent (Highest Court Priority & Ladder)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5 text-cyan-600" />
            <label className="text-xs font-semibold text-gray-900">Courts:</label>
            <select
              value={totalCourtCount}
              onChange={(e) => handleCourtCountChange(e.target.value)}
              className="bg-white border border-gray-200 text-cyan-700 font-bold rounded-lg px-2 py-1 text-xs outline-none cursor-pointer focus:border-cyan-500 shadow-2xs"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Court' : 'Courts'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS (Aligned Left) */}
      <div className="max-w-7xl mx-auto mb-8 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 flex items-center justify-start gap-2 shadow-2xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('courts')}
          className={`px-5 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'courts' ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <LayoutGrid className="w-4 h-4" /> Courts & Queues
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`px-5 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'players' ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" /> Players Roster
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-5 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'leaderboard' ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Trophy className="w-4 h-4" /> Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('matchLogs')}
          className={`px-5 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'matchLogs' ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <History className="w-4 h-4" /> Match Logs
        </button>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto space-y-8">
        
        {/* TAB 1: COURTS AND QUEUES */}
        {activeTab === 'courts' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {queueMode === 'independent' && (
              <div className="bg-gray-50 border border-cyan-500/30 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-cyan-600" />
                    <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">
                      Next Upcoming Match Preview
                    </h2>
                  </div>
                </div>

                <div>
                  {(() => {
                    const candidates = getPrioritizedCandidateMatchesIndependent();
                    const nextMatch = candidates[0] || null;

                    if (!nextMatch) {
                      return (
                        <div className="bg-white border border-gray-200 rounded-xl p-5 text-center flex flex-col justify-center min-h-[100px]">
                          <span className="text-xs font-bold text-gray-400">No match ready</span>
                          <span className="text-[11px] text-gray-400 italic mt-1">Waiting for at least 4 checked-in players of the same level</span>
                        </div>
                      );
                    }

                    const { matchData, level } = nextMatch;
                    const teamANames = matchData.teamA.map(p => p.name).join(' & ');
                    const teamBNames = matchData.teamB.map(p => p.name).join(' & ');

                    return (
                      <div className="bg-white rounded-xl p-4 shadow-2xs relative overflow-hidden border-2 border-emerald-500 ring-4 ring-emerald-500/10 bg-emerald-50/10">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500" />
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[11px] font-extrabold text-cyan-700 bg-cyan-50 border border-cyan-100 px-2.5 py-1 rounded">
                            Top Queue Match
                          </span>
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded border shadow-2xs ${getCourtLevelBadgeStyle(level)}`}>
                            Level {level}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-gray-800 bg-gray-50/80 border border-gray-200 p-3 rounded-lg">
                          <div><strong className="text-cyan-700 uppercase text-[10px] block mb-0.5">Team A:</strong> {teamANames}</div>
                          <div><strong className="text-rose-700 uppercase text-[10px] block mb-0.5">Team B:</strong> {teamBNames}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            <div className={`grid grid-cols-1 ${queueMode === 'independent' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-8`}>
              
              {/* ACTIVE COURTS */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Play className="w-5 h-5 text-emerald-600 fill-emerald-600" /> Active Courts {queueMode === 'dependent' && <span className="text-xs text-amber-600 font-semibold">(Court 01 is Highest Priority)</span>}
                </h2>

                <div className={`grid grid-cols-1 ${queueMode === 'dependent' ? 'md:grid-cols-2 xl:grid-cols-3' : ''} gap-4`}>
                  {courts.map((court) => {
                    const isOccupied = court.teamA.length > 0 || court.teamB.length > 0;
                    const liveElapsedSec = court.isLive && court.startTime ? Math.max(0, Math.floor((now - court.startTime) / 1000)) : 0;
                    const courtQueue = queueMode === 'dependent' ? getQueueForCourtDependent(court.id) : [];

                    return (
                      <div key={court.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex flex-wrap justify-between items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {editingCourtId === court.id ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <input
                                    type="text"
                                    value={tempCourtName}
                                    onChange={(e) => setTempCourtName(e.target.value)}
                                    className="bg-white border border-cyan-500 rounded px-2 py-1 text-xs font-bold text-gray-900 outline-none flex-1 min-w-0"
                                    autoFocus
                                  />
                                  <button onClick={() => handleSaveCourtName(court.id)} className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500 cursor-pointer shrink-0"><Check className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setEditingCourtId(null)} className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-extrabold text-base text-gray-900 truncate">{court.name}</span>
                                  {queueMode === 'independent' && (
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border shadow-2xs ${getCourtLevelBadgeStyle(court.level)}`}>
                                      Level {court.level}
                                    </span>
                                  )}
                                  <button onClick={() => { setEditingCourtId(court.id); setTempCourtName(court.name); }} className="text-gray-400 hover:text-cyan-600 cursor-pointer shrink-0"><Edit2 className="w-3.5 h-3.5" /></button>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-gray-500 font-mono bg-white border border-gray-200 px-2 py-1 rounded">
                                <Clock className="w-3 h-3 inline text-cyan-600 mr-1" /> {formatDuration(liveElapsedSec)}
                              </span>
                              {isOccupied ? (
                                <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-600 font-medium bg-gray-200 border border-gray-300 px-2.5 py-0.5 rounded-full">
                                  Ready
                                </span>
                              )}
                            </div>
                          </div>

                          {isOccupied ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
                              <div className="bg-white border-l-4 border-cyan-500 border-y border-r border-gray-200 p-2.5 rounded-lg shadow-2xs">
                                <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider block mb-1">Team A</span>
                                {court.teamA.map((p) => (
                                  <div key={p.id} className="text-xs py-0.5 font-semibold text-gray-800 truncate">
                                    {p.name} {p.partnerId && <Link className="w-3 h-3 inline text-cyan-600 ml-1" />}
                                  </div>
                                ))}
                                <button
                                  onClick={() => handleFinishMatch(court.id, 'A')}
                                  className="mt-2 w-full py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-bold text-[11px] rounded border border-cyan-200 transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Team A Wins
                                </button>
                              </div>

                              <div className="bg-white border-l-4 border-rose-500 border-y border-r border-gray-200 p-2.5 rounded-lg shadow-2xs">
                                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">Team B</span>
                                {court.teamB.map((p) => (
                                  <div key={p.id} className="text-xs py-0.5 font-semibold text-gray-800 truncate">
                                    {p.name} {p.partnerId && <Link className="w-3 h-3 inline text-rose-600 ml-1" />}
                                  </div>
                                ))}
                                <button
                                  onClick={() => handleFinishMatch(court.id, 'B')}
                                  className="mt-2 w-full py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded border border-rose-200 transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Team B Wins
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="py-3 px-2 text-center border-2 border-dashed border-gray-200 rounded-xl my-2">
                              <button
                                onClick={() => generateMatchForCourt(court.id)}
                                disabled={!sessionActive || (queueMode === 'dependent' && courtQueue.length < 4)}
                                className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Sparkles className="w-3.5 h-3.5" /> Pull Next Match to {court.name} {queueMode === 'dependent' ? `(${courtQueue.length}/4)` : ''}
                              </button>
                            </div>
                          )}
                        </div>

                        {queueMode === 'dependent' && (
                          <div className="mt-3 pt-2.5 border-t border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[11px] font-bold text-gray-700">Court Queue ({courtQueue.length})</span>
                            </div>
                            <div className="space-y-1 max-h-[120px] overflow-y-auto">
                              {courtQueue.map((p, idx) => (
                                <div key={p.id} className="flex justify-between items-center px-2 py-1 bg-white border border-gray-200 rounded text-[11px]">
                                  <span className="font-medium text-gray-800 truncate flex items-center gap-1">
                                    #{idx + 1} {p.name} 
                                    {p.partnerId && <Link className="w-3 h-3 text-cyan-600 shrink-0" title="Has Fixed Partner" />}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5">
                                      <button 
                                        onClick={() => handleReorderQueue(p.id, 'up', courtQueue)} 
                                        disabled={idx === 0} 
                                        className="text-gray-400 hover:text-cyan-600 disabled:opacity-20 cursor-pointer font-bold px-1"
                                        title="Move Up"
                                      >
                                        ▲
                                      </button>
                                      <button 
                                        onClick={() => handleReorderQueue(p.id, 'down', courtQueue)} 
                                        disabled={idx === courtQueue.length - 1} 
                                        className="text-gray-400 hover:text-cyan-600 disabled:opacity-20 cursor-pointer font-bold px-1"
                                        title="Move Down"
                                      >
                                        ▼
                                      </button>
                                    </div>
                                    <span className="text-[9px] text-cyan-600 font-mono">{p.gamesPlayed}G</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {queueMode === 'independent' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-600" /> Level Queues (Waiting Lists)
                  </h2>

                  <div className="space-y-4">
                    {Array.from({ length: totalCourtCount }, (_, i) => i + 1).map((lvl) => {
                      const levelQueue = getQueueForLevelIndependent(lvl);
                      return (
                        <div key={`level-q-${lvl}`} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-2xs">
                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                            <span className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                              Level {lvl} Queue
                            </span>
                            <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${getCourtLevelBadgeStyle(lvl)}`}>
                              {levelQueue.length} waiting
                            </span>
                          </div>

                          {levelQueue.length === 0 ? (
                            <p className="text-xs text-gray-400 italic py-3 text-center">No players currently in Level {lvl} queue</p>
                          ) : (
                            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                              {levelQueue.map((player, idx) => (
                                <div key={player.id} className="flex justify-between items-center px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs">
                                  <div className="flex items-center gap-2 truncate">
                                    <span className="font-bold text-gray-400">#{idx + 1}</span>
                                    <span className="font-bold text-gray-800 truncate flex items-center gap-1">
                                      {player.name} 
                                      {player.partnerId && <Link className="w-3 h-3 text-amber-500 shrink-0" title="Has Fixed Partner" />}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded px-1">
                                      <button 
                                        onClick={() => handleReorderQueue(player.id, 'up', levelQueue)} 
                                        disabled={idx === 0} 
                                        className="text-gray-400 hover:text-cyan-600 disabled:opacity-20 cursor-pointer font-bold px-1 text-[11px]"
                                        title="Move Up"
                                      >
                                        ▲
                                      </button>
                                      <button 
                                        onClick={() => handleReorderQueue(player.id, 'down', levelQueue)} 
                                        disabled={idx === levelQueue.length - 1} 
                                        className="text-gray-400 hover:text-cyan-600 disabled:opacity-20 cursor-pointer font-bold px-1 text-[11px]"
                                        title="Move Down"
                                      >
                                        ▼
                                      </button>
                                    </div>
                                    <span className="text-[11px] font-mono text-cyan-700 font-semibold bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-cyan-500 inline" /> {formatWaitTime(player.checkedInAt)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 2: PLAYERS ROSTER */}
        {activeTab === 'players' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-cyan-600" /> Add Player
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" /> Import List
                  </button>
                </div>

                <form onSubmit={handleAddPlayer} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Player Name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition"
                    />
                    <button
                      type="submit"
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition cursor-pointer shrink-0 shadow-2xs"
                    >
                      Add Player
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-2xs">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Link className="w-5 h-5 text-amber-500" /> Set Fixed Partner
                </h2>

                <form onSubmit={handleLinkPartners} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={partnerP1}
                      onChange={(e) => setPartnerP1(e.target.value)}
                      className="bg-white border border-gray-200 text-xs rounded-xl px-3 py-2 text-gray-900 outline-none focus:border-cyan-500"
                    >
                      <option value="">Select Player 1</option>
                      {roster.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    <select
                      value={partnerP2}
                      onChange={(e) => setPartnerP2(e.target.value)}
                      className="bg-white border border-gray-200 text-xs rounded-xl px-3 py-2 text-gray-900 outline-none focus:border-cyan-500"
                    >
                      <option value="">Select Player 2</option>
                      {roster.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Link className="w-3.5 h-3.5" /> Pair Players Together
                  </button>
                </form>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 flex flex-col justify-between shadow-2xs md:col-span-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" /> Roster ({roster.length})
                </h2>

                {roster.length === 0 ? (
                  <p className="text-center py-6 text-gray-400 text-sm italic">No players added yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {roster.map((player) => {
                      const isPlaying = activeCourtPlayerIds.has(player.id);
                      const partnerName = getPartnerName(player.partnerId);

                      return (
                        <div
                          key={player.id}
                          className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 rounded-xl border transition gap-3 ${
                            player.isCheckedIn ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-gray-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-gray-900">{player.name}</span>
                            </div>

                            {partnerName && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Link className="w-3 h-3" /> Partner: {partnerName}
                                </span>
                                <button onClick={() => handleUnlinkPartner(player.id)} className="text-[10px] text-gray-400 hover:text-rose-600 p-0.5 transition cursor-pointer">
                                  <Unlink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <div className="text-[10px] text-gray-500 mt-0.5">
                              W/L: <span className="text-emerald-600 font-bold">{player.wins}W</span>-<span className="text-rose-600 font-bold">{player.losses}L</span> | Level: {player.level}
                              {player.isCheckedIn && !isPlaying && (
                                <span className="text-cyan-700 font-mono font-bold ml-1">
                                  ({formatWaitTime(player.checkedInAt)})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {isPlaying ? (
                              <span className="text-[10px] font-bold px-2 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg">
                                On Court
                              </span>
                            ) : (
                              <button
                                onClick={() => handleToggleCheckIn(player.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                                  player.isCheckedIn ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                }`}
                              >
                                {player.isCheckedIn ? <><UserX className="w-3.5 h-3.5" /> Check Out</> : <><UserCheck className="w-3.5 h-3.5" /> Check In</>}
                              </button>
                            )}

                            <button onClick={() => handleRemoveFromRoster(player.id)} className="p-1 text-gray-400 hover:text-rose-600 transition cursor-pointer">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </section>
        )}

        {/* TAB 3: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-200">
            
            <div className="w-full space-y-6 bg-gray-50/50 border border-gray-200 rounded-3xl p-5 md:p-6 shadow-2xs">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-gray-200 rounded-2xl p-4 gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-extrabold text-gray-900 uppercase tracking-wide">
                    LeaderBoard
                  </h2>
                  <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-xl">
                    {filteredLeaderboard.length} Players
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search player..."
                      value={leaderboardSearch}
                      onChange={(e) => setLeaderboardSearch(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-cyan-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-900 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl">
                    <button
                      onClick={() => setLeaderboardFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        leaderboardFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setLeaderboardFilter('checkedIn')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        leaderboardFilter === 'checkedIn' ? 'bg-cyan-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Checked In
                    </button>
                  </div>
                </div>
              </div>

              {podiumData.hasPodium && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                  {renderPodiumStep(podiumData.rank2, 2)}
                  {renderPodiumStep(podiumData.rank1, 1)}
                  {renderPodiumStep(podiumData.rank3, 3)}
                </div>
              )}

              <div className="space-y-3">
                {filteredLeaderboard.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 italic text-sm">
                    No matching players found.
                  </div>
                ) : (
                  <div>
                    <div className="hidden md:grid grid-cols-5 gap-4 px-4 pb-2 text-[11px] font-extrabold uppercase text-gray-400 tracking-wider">
                      <div className="font-bold">Rank & Player</div>
                      <div className="text-center font-bold">{queueMode === 'dependent' ? 'Court' : 'Level'}</div>
                      <div className="font-bold">Raw Win %</div>
                      <div className="md:col-span-2 text-center font-bold">Performance Stats</div>
                    </div>

                    <div className="space-y-3">
                      {filteredLeaderboard.map((player) => {
                        const rawWinRatePercent = Math.round(player.rawWinRate * 100);
                        const partnerName = getPartnerName(player.partnerId);
                        const courtOrLevelVal = queueMode === 'dependent' ? (player.assignedCourt || 1) : player.level;

                        return (
                          <div
                            key={player.id}
                            className={`bg-white border rounded-2xl p-4 transition-all shadow-2xs grid grid-cols-1 md:grid-cols-5 items-center gap-4 relative overflow-hidden ${
                              player.calculatedRank === 1 
                                ? 'border-amber-300 ring-2 ring-amber-300/20 bg-amber-50/10' 
                                : player.calculatedRank === 2
                                ? 'border-slate-300 bg-slate-50/10'
                                : player.calculatedRank === 3
                                ? 'border-amber-800/30 bg-amber-900/5'
                                : 'border-gray-200'
                            }`}
                          >
                            {/* Col 1: Rank & Name */}
                            <div className="flex items-center gap-3.5 md:col-span-1">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                                player.calculatedRank === 1 
                                  ? 'bg-amber-400 text-amber-950 shadow-xs' 
                                  : player.calculatedRank === 2
                                  ? 'bg-slate-300 text-slate-800'
                                  : player.calculatedRank === 3
                                  ? 'bg-amber-800/20 text-amber-900'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                #{player.calculatedRank}
                              </div>

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-gray-900 truncate">{player.name}</span>
                                  {player.calculatedRank === 1 && <Crown className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />}
                                </div>

                                {partnerName && (
                                  <div className="text-[11px] font-semibold text-cyan-700 flex items-center gap-1">
                                    <Link className="w-3 h-3 shrink-0" /> Partner: {partnerName}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Col 2: Court / Level (Separate Column with distinct background color) */}
                            <div className="flex items-center md:justify-center">
                              <span className={`px-3 py-1 rounded-lg font-extrabold text-xs border shadow-2xs inline-block text-center min-w-[36px] ${getCourtLevelBadgeStyle(courtOrLevelVal)}`}>
                                {courtOrLevelVal}
                              </span>
                            </div>

                            {/* Col 3: Raw Win % */}
                            <div className="space-y-1.5 md:col-span-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-extrabold text-amber-600">{rawWinRatePercent}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden border border-gray-200">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    rawWinRatePercent >= 60 ? 'bg-emerald-500' : rawWinRatePercent >= 45 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${rawWinRatePercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Col 4 & 5: Stats */}
                            <div className="grid grid-cols-4 gap-2 md:col-span-2 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100 text-xs font-semibold text-center">
                              <div className="px-1">
                                <span className="text-[10px] text-gray-400 block uppercase font-bold">Played</span>
                                <span className="text-cyan-700 font-extrabold text-sm">{player.gamesPlayed}</span>
                              </div>

                              <div className="px-1">
                                <span className="text-[10px] text-gray-400 block uppercase font-bold">W / L</span>
                                <span className="text-gray-800 font-bold">
                                  <span className="text-emerald-600">{player.wins}</span> - <span className="text-rose-600">{player.losses}</span>
                                </span>
                              </div>

                              <div className="px-1">
                                <span className="text-[10px] text-gray-400 block uppercase font-bold" title="Schedule Strength">SoS</span>
                                <span className="text-purple-600 font-bold">{player.scheduleStrength || 0}%</span>
                              </div>

                              <div className="px-1">
                                <span className="text-[10px] text-gray-400 block uppercase font-bold">Time</span>
                                <span className="text-cyan-700 font-bold font-mono">{formatDuration(player.timePlayedSec)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: MATCH LOGS */}
        {activeTab === 'matchLogs' && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-200">
            
            <div className="w-full space-y-4 bg-gray-50/50 border border-gray-200 rounded-3xl p-5 md:p-6 shadow-2xs">
              <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-600" />
                  <h2 className="text-lg font-extrabold text-gray-900 uppercase tracking-wide">
                    Match Logs
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
                    {matchHistory.length} Matches Recorded
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {matchHistory.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400 italic text-sm">
                    No completed matches recorded yet.
                  </div>
                ) : (
                  matchHistory.map((m) => (
                    <div key={m.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-gray-900 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">
                            Match #{m.matchNumber}
                          </span>
                          <span className="text-xs font-bold text-cyan-700">
                            {m.courtName}
                          </span>
                          <span className="text-[10px] font-semibold text-gray-400 font-mono">
                            ({formatDuration(m.durationSec)})
                          </span>
                        </div>
                        <div className="text-xs font-medium text-gray-800">
                          <span className={m.winningTeam === 'A' ? 'font-bold text-emerald-600' : 'text-gray-600'}>
                            {m.teamA.join(' & ')}
                          </span>
                          <span className="text-gray-400 mx-2">vs</span>
                          <span className={m.winningTeam === 'B' ? 'font-bold text-emerald-600' : 'text-gray-600'}>
                            {m.teamB.join(' & ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gray-100 pt-2 md:pt-0">
                        <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Winner: Team {m.winningTeam}
                        </span>
                        <button
                          onClick={() => handleSwapMatchWinner(m.id)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-gray-200"
                          title="Swap Match Winner"
                        >
                          <Repeat className="w-3.5 h-3.5" /> Swap Winner
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
