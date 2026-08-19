import React, { useState, useEffect, useRef } from 'react';
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
  ClipboardPaste
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

export default function App() {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('courts'); // 'courts' or 'players'

  const [totalCourtCount, setTotalCourtCount] = useState(() => {
    return parseInt(localStorage.getItem('pickleq_court_count') || '3', 10);
  });

  const [sessionActive, setSessionActive] = useState(() => {
    return JSON.parse(localStorage.getItem('pickleq_session_active') || 'false');
  });

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTextContent, setImportTextContent] = useState('');

  // Fixed Partnering selections
  const [partnerP1, setPartnerP1] = useState('');
  const [partnerP2, setPartnerP2] = useState('');

  const [courts, setCourts] = useState(() => {
    const saved = localStorage.getItem('pickleq_courts');
    if (saved) return JSON.parse(saved);
    return Array.from({ length: totalCourtCount }, (_, i) => ({
      id: i + 1,
      teamA: [],
      teamB: [],
      isLive: false,
      startTime: null
    }));
  });

  // Roster
  const [roster, setRoster] = useState(() => {
    const saved = localStorage.getItem('pickleq_roster');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Alex Rivera', rank: 95, gamesPlayed: 0, wins: 0, losses: 0, courtGames: {}, timePlayedSec: 0, assignedCourt: 1, isCheckedIn: true, partnerId: '2', checkedInAt: Date.now() - 6000 },
      { id: '2', name: 'Jordan Chen', rank: 90, gamesPlayed: 0, wins: 0, losses: 0, courtGames: {}, timePlayedSec: 0, assignedCourt: 1, isCheckedIn: true, partnerId: '1', checkedInAt: Date.now() - 5000 },
      { id: '3', name: 'Sam Taylor', rank: 85, gamesPlayed: 0, wins: 0, losses: 0, courtGames: {}, timePlayedSec: 0, assignedCourt: 2, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 4000 },
      { id: '4', name: 'Morgan Smith', rank: 80, gamesPlayed: 0, wins: 0, losses: 0, courtGames: {}, timePlayedSec: 0, assignedCourt: 2, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 3000 },
      { id: '5', name: 'Chris Lee', rank: 75, gamesPlayed: 0, wins: 0, losses: 0, courtGames: {}, timePlayedSec: 0, assignedCourt: 3, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 2000 },
      { id: '6', name: 'Pat Gomez', rank: 70, gamesPlayed: 0, wins: 0, losses: 0, courtGames: {}, timePlayedSec: 0, assignedCourt: 3, isCheckedIn: true, partnerId: null, checkedInAt: Date.now() - 1000 },
    ];
  });

  const [playerName, setPlayerName] = useState('');
  const [playerRank, setPlayerRank] = useState('');
  const [totalMatches, setTotalMatches] = useState(() => {
    return parseInt(localStorage.getItem('pickleq_matches') || '0', 10);
  });

  // Ref for bulk import file input
  const fileInputRef = useRef(null);

  const activeCourtPlayerIds = new Set(
    courts.flatMap((c) => [...c.teamA, ...c.teamB].map((p) => p.id))
  );

  const checkedInQueue = roster.filter(
    (p) => p.isCheckedIn && !activeCourtPlayerIds.has(p.id)
  );

  // LocalStorage Persistence
  useEffect(() => localStorage.setItem('pickleq_court_count', totalCourtCount.toString()), [totalCourtCount]);
  useEffect(() => localStorage.setItem('pickleq_session_active', JSON.stringify(sessionActive)), [sessionActive]);
  useEffect(() => localStorage.setItem('pickleq_courts', JSON.stringify(courts)), [courts]);
  useEffect(() => localStorage.setItem('pickleq_roster', JSON.stringify(roster)), [roster]);
  useEffect(() => localStorage.setItem('pickleq_matches', totalMatches.toString()), [totalMatches]);

  const handleCourtCountChange = (newCount) => {
    const count = Math.max(1, Math.min(10, parseInt(newCount, 10) || 1));
    setTotalCourtCount(count);
    
    setCourts((prevCourts) => {
      if (count > prevCourts.length) {
        const added = Array.from({ length: count - prevCourts.length }, (_, i) => ({
          id: prevCourts.length + i + 1,
          teamA: [],
          teamB: [],
          isLive: false,
          startTime: null
        }));
        return [...prevCourts, ...added];
      } else {
        return prevCourts.slice(0, count);
      }
    });
  };

  // FIXED PARTNER HANDLERS
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
      prev.map((p) => {
        if (p.id === playerId || p.id === partnerId) {
          return { ...p, partnerId: null };
        }
        return p;
      })
    );
  };

  // SESSION HANDLERS
  const handleToggleSession = () => {
    if (!sessionActive) {
      setSessionActive(true);
      setShowSummaryModal(false);
      setTimeout(() => {
        initializeSnakeDraftAcrossCourts();
      }, 50);
    } else {
      if (window.confirm("End session and generate player stats summary?")) {
        setSessionActive(false);
        setShowSummaryModal(true);
      }
    }
  };

  // ADD PLAYER LOGIC (Default rank is 50 internally, but input field is removed/hidden)
  const handleAddPlayer = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const newPlayer = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name: playerName.trim(),
      rank: 50,
      gamesPlayed: 0, 
      wins: 0,
      losses: 0,
      courtGames: {},
      timePlayedSec: 0,
      assignedCourt: totalCourtCount,
      isCheckedIn: false,
      partnerId: null,
      checkedInAt: null
    };

    setRoster((prev) => [...prev, newPlayer]);
    setPlayerName('');
  };

  // PROCESS RAW TEXT OR IMPORTED FILE CONTENT INTO ROSTER
  const parseAndAddPlayerLines = (rawContent) => {
    const lines = rawContent.split(/\r?\n/);
    const newPlayers = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (index === 0 && (trimmed.toLowerCase().includes('name') || trimmed.toLowerCase().includes('player'))) {
        return;
      }

      const parts = trimmed.split(/[,;\t]+/).map(p => p.trim());
      const name = parts[0];
      if (!name) return;

      newPlayers.push({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6) + index,
        name: name,
        rank: 50,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        courtGames: {},
        timePlayedSec: 0,
        assignedCourt: totalCourtCount,
        isCheckedIn: false,
        partnerId: null,
        checkedInAt: null
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

  // BULK IMPORT FILE UPLOAD
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== 'string') return;
      parseAndAddPlayerLines(content);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

    setTimeout(() => {
      initializeSnakeDraftAcrossCourts();
    }, 50);
  };

  const handleRemoveFromRoster = (playerId) => {
    handleUnlinkPartner(playerId);
    setRoster((prev) => prev.filter((p) => p.id !== playerId));
  };

  // SAFE SEQUENTIAL CHECK-IN DRAFT ASSIGNMENT ACROSS ALL COURTS
  const initializeSnakeDraftAcrossCourts = () => {
    // 1. Grab ALL checked-in players who are waiting and have NOT played yet and lack a court assignment
    const availableQueuePlayers = roster
      .filter((p) => p.isCheckedIn && !activeCourtPlayerIds.has(p.id) && p.gamesPlayed === 0 && (!p.assignedCourt || p.assignedCourt > totalCourtCount))
      .sort((a, b) => {
        return (a.checkedInAt || 0) - (b.checkedInAt || 0);
      });

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

    // Update roster assignments only for unassigned players
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
    if (sessionActive) {
      initializeSnakeDraftAcrossCourts();
    }
  }, [totalCourtCount, sessionActive]);

  // QUEUE FILTERING LOGIC: Pure FIFO (First-In, First-Out) based on check-in time
  const getQueueForCourt = (courtId) => {
    return checkedInQueue
      .filter((player) => {
        // If the player has 0 games played, they show up in all court queues
        if (player.gamesPlayed === 0) return true;
        // Otherwise, they only show up on their assigned court based on ladder movement
        return player.assignedCourt === courtId;
      })
      .sort((a, b) => {
        // Sort strictly by check-in timestamp so newly checked-in/added players go to the bottom
        return (a.checkedInAt || 0) - (b.checkedInAt || 0);
      });
  };


  const generateMatchForCourt = (courtId) => {
    if (!sessionActive) {
      alert("Please click 'Start Session' first!");
      return;
    }

    const unplayedCount = checkedInQueue.filter((p) => p.gamesPlayed === 0).length;
    if (unplayedCount > 0) {
      initializeSnakeDraftAcrossCourts();
    }

    const courtQueue = getQueueForCourt(courtId);

    if (courtQueue.length < 4) {
      alert(`Court 0${courtId} needs at least 4 checked-in players. Available: ${courtQueue.length}`);
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
  };

  // FINISH MATCH
  const handleFinishMatch = (courtId, winningTeamKey) => {
    setCourts((prevCourts) => {
      const courtIndex = prevCourts.findIndex((c) => c.id === courtId);
      const currentCourt = prevCourts[courtIndex];

      const durationSec = currentCourt.startTime
        ? Math.round((Date.now() - currentCourt.startTime) / 1000)
        : 0;

      const winners = winningTeamKey === 'A' ? currentCourt.teamA : currentCourt.teamB;
      const losers = winningTeamKey === 'A' ? currentCourt.teamB : currentCourt.teamA;

      const updatedMap = new Map();

      const getNextCourt = (isWinner) => {
        if (courtId === 1) return isWinner ? 1 : 2;
        if (courtId === totalCourtCount) return isWinner ? courtId - 1 : courtId;
        return isWinner ? courtId - 1 : courtId + 1;
      };

      winners.forEach((p) => {
        updatedMap.set(p.id, {
          isWinner: true,
          nextCourt: getNextCourt(true)
        });
      });

      losers.forEach((p) => {
        updatedMap.set(p.id, {
          isWinner: false,
          nextCourt: getNextCourt(false)
        });
      });

      setRoster((prevRoster) =>
        prevRoster.map((player) => {
          if (updatedMap.has(player.id)) {
            const { isWinner, nextCourt } = updatedMap.get(player.id);
            const currentCourtGames = player.courtGames || {};
            const prevCourtCount = currentCourtGames[courtId] || 0;

            return {
              ...player,
              gamesPlayed: player.gamesPlayed + 1,
              wins: player.wins + (isWinner ? 1 : 0),
              losses: player.losses + (isWinner ? 0 : 1),
              assignedCourt: nextCourt,
              timePlayedSec: (player.timePlayedSec || 0) + durationSec,
              courtGames: {
                ...currentCourtGames,
                [courtId]: prevCourtCount + 1
              },
              isCheckedIn: true,
              checkedInAt: Date.now()
            };
          }
          return player;
        })
      );

      let newCourts = [...prevCourts];
      newCourts[courtIndex] = { ...currentCourt, teamA: [], teamB: [], isLive: false, startTime: null };

      setTotalMatches((prev) => prev + 1);
      return newCourts;
    });
  };

  const handleResetSession = () => {
    if (window.confirm("Reset all session data, courts, and queues?")) {
      localStorage.clear();
      setSessionActive(false);
      setShowSummaryModal(false);
      setCourts(Array.from({ length: totalCourtCount }, (_, i) => ({ id: i + 1, teamA: [], teamB: [], isLive: false, startTime: null })));
      setRoster([]);
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
        <div>
          <div className="flex items-center gap-4">
            <PBLLogo className="w-24 h-24" />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-wider text-gray-900 uppercase">
                PBL Queueing
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Courts-Aware Snake First Draft • Ladder Movement
              </p>
            </div>
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

      {/* IMPORT LIST DIALOG / MODAL */}
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
              Paste your list of players below (one player per line). Imported players will remain unchecked by default. Alternatively, upload a file using the button below.
            </p>

            <textarea
              rows="8"
              placeholder="Alex Rivera&#10;Jordan Chen&#10;Sam Taylor&#10;Morgan Smith"
              value={importTextContent}
              onChange={(e) => setImportTextContent(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 focus:border-cyan-500 rounded-xl p-3.5 text-sm font-mono text-gray-900 placeholder-gray-400 outline-none transition mb-4 resize-y"
            ></textarea>

            {/* Hidden file input */}
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
              <h2 className="text-2xl font-black text-gray-900 tracking-wide uppercase">
                Session Final Summary
              </h2>
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Completed Matches: <span className="text-amber-600 font-bold">{totalMatches}</span> | Total Players: <span className="text-cyan-600 font-bold">{roster.length}</span>
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white mb-6">
            <table className="w-full text-left text-xs text-gray-900">
              <thead className="bg-gray-100 text-gray-700 uppercase text-[11px] font-bold tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">Rank</th>
                  <th className="py-3.5 px-4">Player Name</th>
                  <th className="py-3.5 px-4 text-center">Fixed Partner</th>
                  <th className="py-3.5 px-4 text-center">Final Tier</th>
                  <th className="py-3.5 px-4 text-center text-cyan-600">Games Played</th>
                  <th className="py-3.5 px-4 text-center text-emerald-600">Wins</th>
                  <th className="py-3.5 px-4 text-center text-rose-600">Losses</th>
                  <th className="py-3.5 px-4 text-center text-amber-600">Win Rate</th>
                  <th className="py-3.5 px-4 text-center">Court Breakdown</th>
                  <th className="py-3.5 px-4 text-right">Time Played</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {roster.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-6 text-center text-gray-400 italic">No players recorded in this session.</td>
                  </tr>
                ) : (
                  [...roster]
                   .sort((a, b) => {
                      // 1. Sort by assigned court first (top to bottom)
                      if (a.assignedCourt !== b.assignedCourt) return a.assignedCourt - b.assignedCourt;
                      
                      // 2. Compare win percentage
                      const rateA = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
                      const rateB = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
                      if (rateB !== rateA) return rateB - rateA;

                      // 3. Tie-breaker: Weight games by higher courts (Court 1 is worth more than Court 2, etc.)
                      const getWeightedCourtScore = (player) => {
                        const courtGames = player.courtGames || {};
                        let score = 0;
                        for (const [cId, count] of Object.entries(courtGames)) {
                          // Higher weight given to lower court IDs (e.g., Court 1)
                          const weight = Math.max(1, totalCourtCount - parseInt(cId, 10) + 1);
                          score += count * weight;
                        }
                        return score;
                      };

                      return getWeightedCourtScore(b) - getWeightedCourtScore(a);
                    })
                    .map((player, index) => {
                      const winRate = player.gamesPlayed > 0 
                        ? Math.round((player.wins / player.gamesPlayed) * 100) 
                        : 0;
                      const partnerName = getPartnerName(player.partnerId);

                      return (
                        <tr key={player.id} className="hover:bg-gray-50 transition">
                          <td className="py-3.5 px-4 font-bold text-gray-900 text-xs">#{index + 1}</td>
                          <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-2">
                            {player.assignedCourt === 1 && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            {player.name}
                          </td>
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
                            <span className={`inline-block px-2.5 py-1 rounded-md font-bold text-xs ${
                              player.assignedCourt === 1 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                : player.assignedCourt === totalCourtCount
                                ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            }`}>
                              {player.assignedCourt === 1 ? 'King Court (01)' : `Court 0${player.assignedCourt}`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-cyan-600 text-sm">{player.gamesPlayed}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-600 text-sm">{player.wins}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-rose-600 text-sm">{player.losses}</td>
                          <td className="py-3.5 px-4 text-center font-semibold text-amber-600">{winRate}%</td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex justify-center gap-1 flex-wrap">
                              {Array.from({ length: totalCourtCount }, (_, i) => i + 1).map((cId) => (
                                <span key={cId} className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 text-[10px] rounded text-gray-600 shadow-2xs">
                                  C{cId}: <strong className="text-gray-900">{player.courtGames?.[cId] || 0}</strong>
                                </span>
                              ))}
                            </div>
                          </td>
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
        {/* TABS SELECTION */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 p-1 rounded-xl shadow-2xs w-full md:w-auto">
          <button
            onClick={() => setActiveTab('courts')}
            className={`flex-1 md:flex-initial px-5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'courts'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/10'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <LayoutGrid className="w-4 h-4" /> Courts and Queue
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex-1 md:flex-initial px-5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'players'
                ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/10'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" /> Players
          </button>
        </div>

        {/* COURT COUNT SETTING */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-cyan-600" />
            <label className="text-sm font-semibold text-gray-900">Total Active Courts:</label>
            <select
              value={totalCourtCount}
              onChange={(e) => handleCourtCountChange(e.target.value)}
              className="bg-white border border-gray-200 text-cyan-700 font-bold rounded-lg px-3 py-1.5 text-sm outline-none cursor-pointer focus:border-cyan-500 shadow-2xs"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num} className="bg-white text-gray-900">
                  {num} {num === 1 ? 'Court' : 'Courts'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto space-y-8">
        
        {/* TAB 1: COURTS AND QUEUE */}
        {activeTab === 'courts' && (
          <section className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-600 fill-emerald-600" /> Courts & Specific Queues
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-md flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-500" /> Court 01 = King Court
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courts.map((court) => {
                const isOccupied = court.teamA.length > 0 || court.teamB.length > 0;
                const isKingCourt = court.id === 1;
                const isBottomCourt = court.id === totalCourtCount;
                const courtQueue = getQueueForCourt(court.id);

                return (
                  <div
                    key={court.id}
                    className={`relative bg-gray-50 border rounded-2xl p-4 flex flex-col justify-between shadow-2xs transition-all ${
                      isKingCourt
                        ? 'border-amber-400 shadow-amber-500/5 ring-1 ring-amber-300'
                        : 'border-gray-200'
                    }`}
                  >
                    <div>
                      {/* COURT TITLE */}
                      <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-base text-gray-900">
                            Court 0{court.id}
                          </span>
                          {isKingCourt ? (
                            <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5" /> King Court
                            </span>
                          ) : isBottomCourt ? (
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                              Bottom Court
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                              Middle Court
                            </span>
                          )}
                        </div>
                        
                        {isOccupied ? (
                          <span className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-600 font-medium bg-gray-200 border border-gray-300 px-2 py-0.5 rounded-full">
                            Ready
                          </span>
                        )}
                      </div>

                      {/* LIVE MATCH */}
                      {isOccupied ? (
                        <div className="space-y-2.5 my-2">
                          {/* TEAM A */}
                          <div className="bg-white border-l-4 border-cyan-500 border-y border-r border-gray-200 p-2.5 rounded-lg shadow-2xs">
                            <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider block mb-1">
                              Team A
                            </span>
                            {court.teamA.map((p) => (
                              <div key={p.id} className="flex justify-between text-xs py-0.5">
                                <span className="font-semibold text-gray-800 truncate flex items-center gap-1 max-w-[150px]">
                                  {p.partnerId && <Link className="w-3 h-3 text-cyan-600 shrink-0" />} {p.name}
                                </span>
                              </div>
                            ))}
                            
                            <button
                              onClick={() => handleFinishMatch(court.id, 'A')}
                              className="mt-2 w-full py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-bold text-[11px] rounded border border-cyan-200 transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Team A Wins
                            </button>
                          </div>

                          <div className="text-center text-[9px] font-black text-gray-400 tracking-widest">VS</div>

                          {/* TEAM B */}
                          <div className="bg-white border-l-4 border-rose-500 border-y border-r border-gray-200 p-2.5 rounded-lg shadow-2xs">
                            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
                              Team B
                            </span>
                            {court.teamB.map((p) => (
                              <div key={p.id} className="flex justify-between text-xs py-0.5">
                                <span className="font-semibold text-gray-800 truncate flex items-center gap-1 max-w-[150px]">
                                  {p.partnerId && <Link className="w-3 h-3 text-rose-600 shrink-0" />} {p.name}
                                </span>
                              </div>
                            ))}

                            <button
                              onClick={() => handleFinishMatch(court.id, 'B')}
                              className="mt-2 w-full py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded border border-rose-200 transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Team B Wins
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 px-2 text-center border-2 border-dashed border-gray-200 rounded-xl my-2 flex flex-col items-center justify-center gap-3">
                          <button
                            onClick={() => generateMatchForCourt(court.id)}
                            disabled={!sessionActive || courtQueue.length < 4}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              sessionActive && courtQueue.length >= 4
                                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-900/10'
                                : 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Start Match ({courtQueue.length}/4)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* QUEUE */}
                    <div className="mt-3 pt-2.5 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                          <ListOrdered className="w-3 h-3 text-cyan-600" /> Queue
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-gray-200 text-gray-700 rounded-md border border-gray-300">
                          {courtQueue.length}
                        </span>
                      </div>

                      {courtQueue.length === 0 ? (
                        <p className="text-[10px] text-gray-400 italic py-2 text-center">Empty queue</p>
                      ) : (
                        <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                          {courtQueue.map((player, idx) => (
                            <div
                              key={player.id}
                              className={`flex justify-between items-center px-2 py-1 rounded-md border text-[11px] ${
                                player.gamesPlayed === 0
                                  ? 'bg-cyan-50/60 border-cyan-200/80'
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-gray-400 text-[9px]">#{idx + 1}</span>
                                <span className="font-medium text-gray-800 truncate flex items-center gap-1">
                                  {player.partnerId && <Link className="w-2.5 h-2.5 text-amber-500 shrink-0" />} {player.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[9px] bg-gray-100 text-cyan-700 px-1 py-0.2 rounded font-mono border border-gray-200">
                                  {player.gamesPlayed}G
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TAB 2: PLAYERS */}
        {activeTab === 'players' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            
            {/* COLUMN 1: ADD PLAYER & BULK IMPORT TRIGGER */}
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
                    title="Import or Paste Player List"
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

            {/* COLUMN 2: FIX PARTNER PAIRING CONTROL */}
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
                      <option value="" className="bg-white text-gray-900">Select Player 1</option>
                      {roster.map((p) => (
                        <option key={p.id} value={p.id} className="bg-white text-gray-900">
                          {p.name} {p.partnerId ? '(Paired)' : ''}
                        </option>
                      ))}
                    </select>

                    <select
                      value={partnerP2}
                      onChange={(e) => setPartnerP2(e.target.value)}
                      className="bg-white border border-gray-200 text-xs rounded-xl px-3 py-2 text-gray-900 outline-none focus:border-cyan-500"
                    >
                      <option value="" className="bg-white text-gray-900">Select Player 2</option>
                      {roster.map((p) => (
                        <option key={p.id} value={p.id} className="bg-white text-gray-900">
                          {p.name} {p.partnerId ? '(Paired)' : ''}
                        </option>
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

            {/* COLUMN 3: ROSTER */}
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
                            player.isCheckedIn 
                              ? 'bg-emerald-50/60 border-emerald-200' 
                              : 'bg-white border-gray-200'
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
                                <button
                                  onClick={() => handleUnlinkPartner(player.id)}
                                  className="text-[10px] text-gray-400 hover:text-rose-600 p-0.5 transition cursor-pointer"
                                  title="Unlink Fixed Partner"
                                >
                                  <Unlink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <div className="text-[10px] text-gray-500 mt-0.5">
                              W/L: <span className="text-emerald-600 font-bold">{player.wins}W</span>-<span className="text-rose-600 font-bold">{player.losses}L</span> | Tier: {' '}
                              <span className="text-amber-600 font-bold">
                                {player.gamesPlayed === 0 ? `Court ${player.assignedCourt}` : `Court 0${player.assignedCourt}`}
                              </span>
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
                                  player.isCheckedIn
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                }`}
                              >
                                {player.isCheckedIn ? (
                                  <><UserX className="w-3.5 h-3.5" /> Check Out</>
                                ) : (
                                  <><UserCheck className="w-3.5 h-3.5" /> Check In</>
                                )}
                              </button>
                            )}

                            <button
                              onClick={() => handleRemoveFromRoster(player.id)}
                              className="p-1 text-gray-400 hover:text-rose-600 transition cursor-pointer"
                            >
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

      </main>

    </div>
  );
}
