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
  Settings,
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
  Repeat
} from 'lucide-react';

// Custom Logo Component using src/assets/logo.jfif
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
  // Returns Schedule Strength as a percentage (0-100)
  return Math.round((totalOpponentWinRate / countedOpponents) * 100);
};

export default function App() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('courts'); // 'courts' or 'players'
  const [now, setNow] = useState(Date.now()); // Live clock state for 1-second UI updates

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
      name: i === 0 ? `👑 Court 01` : `Court 0${i + 1}`,
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
      { id: '1', name: 'Alex Rivera', gamesPlayed: 0, wins: 0, losses: 0, level: 1, assignedCourt: 1, courtGames: {}, timePlayedSec: 0, isCheckedIn: true, partnerId: '2', checkedInAt: Date.now() - 620000, headToHead: {}, scheduleStrength: 0 },
      { id: '2', name: 'Jordan Chen', gamesPlayed: 0, wins: 0, losses: 0, level: 1, assignedCourt: 1, courtGames: {}, timePlayedSec: 0, isCheckedIn: true, partnerId: '1', checkedInAt: Date.now() - 510000, headToHead: {}, scheduleStrength: 0 },
      { id: '3', name: 'Sam Taylor', gamesPlayed: 0, wins: 0, losses: 0, level: 2, assignedCourt: 2, courtGames: {}, timePlayedSec: 0, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 415000, headToHead: {}, scheduleStrength: 0 },
      { id: '4', name: 'Morgan Smith', gamesPlayed: 0, wins: 0, losses: 0, level: 2, assignedCourt: 2, courtGames: {}, timePlayedSec: 0, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 305000, headToHead: {}, scheduleStrength: 0 },
      { id: '5', name: 'Chris Lee', gamesPlayed: 0, wins: 0, losses: 0, level: 3, assignedCourt: 3, courtGames: {}, timePlayedSec: 0, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 210000, headToHead: {}, scheduleStrength: 0 },
      { id: '6', name: 'Pat Gomez', gamesPlayed: 0, wins: 0, losses: 0, level: 3, assignedCourt: 3, courtGames: {}, timePlayedSec: 0, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 95000, headToHead: {}, scheduleStrength: 0 },
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

  // --- COMPREHENSIVE SORTING & RANKING HOOK ---
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

    const eligibleRoster = roster.filter((p) => p.isCheckedIn || p.gamesPlayed > 0);

    const sorted = [...eligibleRoster].sort((a, b) => {
      if (queueMode === 'dependent') {
        // Court-Dependent Mode: Prioritize players based on their Court / Priority (starting with Court 1 as the highest tier)
        const courtA = a.assignedCourt || totalCourtCount;
        const courtB = b.assignedCourt || totalCourtCount;
        if (courtA !== courtB) {
          return courtA - courtB;
        }

        // Secondary sorting for ties in court-dependent mode
        const winRateA = a.gamesPlayed > 0 ? (a.wins / a.gamesPlayed) : 0;
        const winRateB = b.gamesPlayed > 0 ? (b.wins / b.gamesPlayed) : 0;
        if (winRateA !== winRateB) return winRateB - winRateA;

        const sosA = a.scheduleStrength || 0;
        const sosB = b.scheduleStrength || 0;
        if (sosA !== sosB) return sosB - sosA;

        return getHeadToHeadWinner(a, b);
      } else {
        // Court-Independent Mode: Group and rank players primarily by their Level, followed by win percentage, schedule strength (SoS), and head-to-head records
        
        // 1. Level
        if (b.level !== a.level) {
          return b.level - a.level;
        }

        // 2. Win Percentage
        const winRateA = a.gamesPlayed > 0 ? (a.wins / a.gamesPlayed) : 0;
        const winRateB = b.gamesPlayed > 0 ? (b.wins / b.gamesPlayed) : 0;
        if (winRateA !== winRateB) {
          return winRateB - winRateA;
        }

        // 3. Schedule Strength (SoS)
        const sosA = a.scheduleStrength || 0;
        const sosB = b.scheduleStrength || 0;
        if (sosA !== sosB) {
          return sosB - sosA;
        }

        // 4. Head-to-Head Records
        const h2h = getHeadToHeadWinner(a, b);
        if (h2h !== 0) {
          return h2h;
        }

        return 0;
      }
    });

    let currentRank = 1;
    return sorted.map((player, index, arr) => {
      if (index > 0) {
        const prev = arr[index - 1];
        const prevWinRate = prev.gamesPlayed > 0 ? (prev.wins / prev.gamesPlayed) : 0;
        const currWinRate = player.gamesPlayed > 0 ? (player.wins / player.gamesPlayed) : 0;
        const prevCourt = prev.assignedCourt || totalCourtCount;
        const currCourt = player.assignedCourt || totalCourtCount;

        const isDifferent = queueMode === 'dependent'
          ? (prevCourt !== currCourt || prevWinRate !== currWinRate || (prev.scheduleStrength || 0) !== (player.scheduleStrength || 0) || getHeadToHeadWinner(prev, player) !== 0)
          : (prev.level !== player.level || prevWinRate !== currWinRate || (prev.scheduleStrength || 0) !== (player.scheduleStrength || 0) || getHeadToHeadWinner(prev, player) !== 0);

        if (isDifferent) {
          currentRank = index + 1;
        }
      }
      return { ...player, calculatedRank: currentRank };
    });
  }, [roster, queueMode, totalCourtCount]);

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
            name: newIdx === 1 ? `👑 Court 01` : `Court 0${newIdx}`,
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

    for (const p of levelQueue) {
      if (usedIds.has(p.id)) continue;
      if (p.partnerId) {
        const partner = levelQueue.find((item) => item.id === p.partnerId && !usedIds.has(item.id));
        if (partner && selected.length <= 2) {
          selected.push(p, partner);
          usedIds.add(p.id);
          usedIds.add(partner.id);
        } else if (!partner) {
          continue;
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
    if (selected[0].partnerId === selected[1].id) {
      teamA = [selected[0], selected[1]];
      teamB = [selected[2], selected[3]];
    } else if (selected[2].partnerId === selected[3].id) {
      teamA = [selected[2], selected[3]];
      teamB = [selected[0], selected[1]];
    } else {
      teamA = [selected[0], selected[3]];
      teamB = [selected[1], selected[2]];
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
        alert(`No level queue currently has at least 4 checked-in players of the same level ready to play.`);
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

      for (const p of courtQueue) {
        if (usedIds.has(p.id)) continue;
        if (p.partnerId) {
          const partner = courtQueue.find((item) => item.id === p.partnerId && !usedIds.has(item.id));
          if (partner && selected.length <= 2) {
            selected.push(p, partner);
            usedIds.add(p.id);
            usedIds.add(partner.id);
          } else if (!partner) {
            continue;
          }
        } else {
          selected.push(p);
          usedIds.add(p.id);
        }
        if (selected.length >= 4) break;
      }

      if (selected.length < 4) {
        alert("Could not pair available players evenly with active fixed partners.");
        return;
      }

      if (selected[0].partnerId === selected[1].id) {
        teamA = [selected[0], selected[1]];
        teamB = [selected[2], selected[3]];
      } else if (selected[2].partnerId === selected[3].id) {
        teamA = [selected[2], selected[3]];
        teamB = [selected[0], selected[1]];
      } else {
        teamA = [selected[0], selected[3]];
        teamB = [selected[1], selected[2]];
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
        name: i === 0 ? `👑 Court 01` : `Court 0${i + 1}`, 
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
              {queueMode === 'independent' ? 'Court-Independent Level Queue & Longest-Wait Match Generation' : '👑 Court-Dependent Highest Court Priority & Ladder Match System'}
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

      {/* SUMMARY BANNER */}
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
                Session Final Summary (Ranked System)
              </h2>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Completed Matches: <span className="text-amber-600 font-bold">{totalMatches}</span> | Ranked Players: <span className="text-cyan-600 font-bold">{rankedRoster.length}</span>
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white mb-6">
            <table className="w-full text-left text-xs text-gray-900">
              <thead className="bg-gray-100 text-gray-700 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Player Name</th>
                  <th className="py-3.5 px-4 text-center">Fixed Partner</th>
                  <th className="py-3.5 px-4 text-center">
                    {queueMode === 'dependent' ? 'Court' : 'Level'}
                  </th>
                  <th className="py-3.5 px-4 text-center text-cyan-600">Games Played</th>
                  <th className="py-3.5 px-4 text-center text-emerald-600">Wins</th>
                  <th className="py-3.5 px-4 text-center text-rose-600">Losses</th>
                  <th className="py-3.5 px-4 text-center text-amber-600">Win Rate %</th>
                  <th className="py-3.5 px-4 text-center text-purple-600">Schedule Strength (SoS)</th>
                  <th className="py-3.5 px-4 text-right">Total Play Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {rankedRoster.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-6 text-center text-gray-400 italic">No checked-in players recorded in this session.</td>
                  </tr>
                ) : (
                  rankedRoster.map((player) => {
                    const winRate = player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;
                    const partnerName = getPartnerName(player.partnerId);

                    return (
                      <tr key={player.id} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900 text-xs">#{player.calculatedRank}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">{player.name}</td>
                        <td className="py-3.5 px-4 text-center">
                          {partnerName ? (
                            <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                              <Link className="w-3 h-3" /> {partnerName}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px] italic">Solo</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-md font-bold text-xs bg-amber-50 text-amber-700 border border-amber-200">
                            {queueMode === 'dependent' ? `Court ${player.assignedCourt || 1}` : `Level ${player.level}`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-cyan-600 text-sm">{player.gamesPlayed}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600 text-sm">{player.wins}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-rose-600 text-sm">{player.losses}</td>
                        <td className="py-3.5 px-4 text-center font-semibold text-amber-600">{winRate}%</td>
                        <td className="py-3.5 px-4 text-center font-semibold text-purple-600">{player.scheduleStrength || 0}%</td>
                        <td className="py-3.5 px-4 text-right font-mono text-gray-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {formatDuration(player.timePlayedSec)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

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

      {/* SETTINGS BAR & TABS */}
      <div className="max-w-7xl mx-auto mb-8 bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xs">
        <div className="flex items-center gap-2 bg-white border border-gray-200 p-1 rounded-xl shadow-2xs w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('courts')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'courts' ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Courts & Queues
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'players' ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/10' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" /> Players Roster
          </button>
        </div>

        <div className="flex items-center gap-4 flex-wrap w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-cyan-600" />
            <label className="text-sm font-semibold text-gray-900">Queue Match Type:</label>
            <select
              value={queueMode}
              onChange={(e) => setQueueMode(e.target.value)}
              className="bg-white border border-gray-200 text-cyan-700 font-bold rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer focus:border-cyan-500 shadow-2xs"
            >
              <option value="independent">Court-Independent (Level / Longest Wait)</option>
              <option value="dependent">Court-Dependent (👑 Highest Court Priority & Ladder)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cyan-600" />
            <label className="text-sm font-semibold text-gray-900">Courts:</label>
            <select
              value={totalCourtCount}
              onChange={(e) => handleCourtCountChange(e.target.value)}
              className="bg-white border border-gray-200 text-cyan-700 font-bold rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer focus:border-cyan-500 shadow-2xs"
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
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
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
                  <Play className="w-5 h-5 text-emerald-600 fill-emerald-600" /> Active Courts {queueMode === 'dependent' && <span className="text-xs text-amber-600 font-semibold">(👑 Court 01 is Highest Priority)</span>}
                </h2>

                <div className={`grid grid-cols-1 ${queueMode === 'dependent' ? 'md:grid-cols-2 xl:grid-cols-3' : ''} gap-4`}>
                  {courts.map((court) => {
                    const isOccupied = court.teamA.length > 0 || court.teamB.length > 0;
                    const liveElapsedSec = court.isLive && court.startTime ? Math.max(0, Math.floor((now - court.startTime) / 1000)) : 0;
                    const courtQueue = queueMode === 'dependent' ? getQueueForCourtDependent(court.id) : [];

                    return (
                      <div key={court.id} className={`bg-gray-50 border rounded-2xl p-4 shadow-2xs flex flex-col justify-between ${court.id === 1 ? 'border-amber-400 ring-1 ring-amber-400/30' : 'border-gray-200'}`}>
                        <div>
                          <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              <div>
                                {editingCourtId === court.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={tempCourtName}
                                      onChange={(e) => setTempCourtName(e.target.value)}
                                      className="bg-white border border-cyan-500 rounded px-2 py-1 text-xs font-bold text-gray-900 outline-none"
                                      autoFocus
                                    />
                                    <button onClick={() => handleSaveCourtName(court.id)} className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500 cursor-pointer"><Check className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setEditingCourtId(null)} className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-base text-gray-900">{court.id === 1 && !court.name.includes('👑') ? `👑 ${court.name}` : court.name}</span>
                                    {queueMode === 'independent' && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                                        Level {court.level}
                                      </span>
                                    )}
                                    <button onClick={() => { setEditingCourtId(court.id); setTempCourtName(court.name); }} className="text-gray-400 hover:text-cyan-600 cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
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
                              <span className="text-[11px] font-bold text-gray-700">{court.id === 1 ? '👑 ' : ''}Court Queue ({courtQueue.length})</span>
                            </div>
                            <div className="space-y-1 max-h-[100px] overflow-y-auto">
                              {courtQueue.map((p, idx) => (
                                <div key={p.id} className="flex justify-between items-center px-2 py-1 bg-white border border-gray-200 rounded text-[11px]">
                                  <span className="font-medium text-gray-800">#{idx + 1} {p.name}</span>
                                  <span className="text-[9px] text-cyan-600 font-mono">{p.gamesPlayed}G</span>
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
                              <Crown className="w-4 h-4 text-amber-500" /> Level {lvl} Queue
                            </span>
                            <span className="text-xs font-bold px-2.5 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full">
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
                                    <span className="font-bold text-gray-800 truncate">
                                      {player.name} {player.partnerId && <Link className="w-3 h-3 inline text-amber-500 ml-1" />}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-mono text-cyan-700 font-semibold bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-cyan-500 inline" /> {formatWaitTime(player.checkedInAt)}
                                  </span>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
                    {roster.map((player) => {
                      const isPlaying = activeCourtPlayerIds.has(player.id);
                      const partnerName = getPartnerName(player.partnerId);

                      return (
                        <div
                          key={player.id}
                          className={`flex justify-between items-center p-3 rounded-xl border transition ${
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

                          <div className="flex items-center gap-2">
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

        {/* LEADERBOARD & MATCH HISTORY */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pt-6 border-t border-gray-200">
          
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-2xs">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                <Trophy className="w-5 h-5 text-amber-500" /> Leaderboard
              </h2>
              <span className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-xl">
                {rankedRoster.length} Ranked
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-2xs">
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-xs text-gray-900">
                  <thead className="bg-gray-100 text-gray-700 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="py-3 px-3">Rank</th>
                      <th className="py-3 px-3">Player</th>
                      <th className="py-3 px-3 text-center">
                        {queueMode === 'dependent' ? 'Court' : 'Level'}
                      </th>
                      <th className="py-3 px-3 text-center text-cyan-600">P</th>
                      <th className="py-3 px-3 text-center text-emerald-600">W</th>
                      <th className="py-3 px-3 text-center text-rose-600">L</th>
                      <th className="py-3 px-3 text-center text-amber-600">Win%</th>
                      <th className="py-3 px-3 text-center text-purple-600">SoS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {rankedRoster.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-gray-400 italic">No checked-in players to rank.</td>
                      </tr>
                    ) : (
                      rankedRoster.map((player) => {
                        const winRate = player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;
                        return (
                          <tr key={player.id} className="hover:bg-gray-50 transition">
                            <td className="py-3 px-3 font-bold text-gray-900 flex items-center gap-1">
                              {player.calculatedRank === 1 && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 inline" />}
                              #{player.calculatedRank}
                            </td>
                            <td className="py-3 px-3 font-bold text-gray-900 truncate max-w-[120px]">
                              {player.name}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
                                {queueMode === 'dependent' ? `Court ${player.assignedCourt || 1}` : `Level ${player.level}`}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-cyan-600">{player.gamesPlayed}</td>
                            <td className="py-3 px-3 text-center font-bold text-emerald-600">{player.wins}</td>
                            <td className="py-3 px-3 text-center font-bold text-rose-600">{player.losses}</td>
                            <td className="py-3 px-3 text-center font-semibold text-amber-600">{winRate}%</td>
                            <td className="py-3 px-3 text-center font-semibold text-purple-600">{player.scheduleStrength || 0}%</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-2xs">
              <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                <History className="w-5 h-5 text-cyan-600" /> Match History
              </h2>
              {matchHistory.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm("Clear match history records?")) setMatchHistory([]);
                  }}
                  className="px-2.5 py-1 bg-gray-200 hover:bg-rose-50 text-gray-600 hover:text-rose-600 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Clear Log
                </button>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-2xs">
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-xs text-gray-900">
                  <thead className="bg-gray-100 text-gray-700 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="py-3 px-3">#</th>
                      <th className="py-3 px-3">Court</th>
                      <th className="py-3 px-3">Teams</th>
                      <th className="py-3 px-3 text-center">Winner / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {matchHistory.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-gray-400 italic">No completed matches yet.</td>
                      </tr>
                    ) : (
                      matchHistory.map((match) => (
                        <tr key={match.id} className="hover:bg-gray-50 transition">
                          <td className="py-3 px-3 font-bold text-gray-900">#{match.matchNumber}</td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-cyan-700">{match.courtName}</span>
                          </td>
                          <td className="py-3 px-3 text-[11px]">
                            <div><strong className="text-cyan-600">A:</strong> {match.teamA.join(' & ')}</div>
                            <div><strong className="text-rose-600">B:</strong> {match.teamB.join(' & ')}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                match.winningTeam === 'A' ? 'bg-cyan-100 text-cyan-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                Team {match.winningTeam} Won
                              </span>
                              <button
                                onClick={() => handleSwapMatchWinner(match.id)}
                                title="Swap Winner"
                                className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[10px] font-bold cursor-pointer"
                              >
                                <Repeat className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
