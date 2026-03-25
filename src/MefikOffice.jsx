import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TILE = 32;
const COLS = 20;
const ROWS = 14;

const PALETTE = {
  floor:    "#1a1a2e",
  floorAlt: "#16213e",
  wall:     "#0f3460",
  wallTop:  "#e94560",
  desk:     "#2d4a7a",
  deskTop:  "#3a5f8a",
  monitor:  "#0d0d0d",
  screen:   "#00ff88",
  chair:    "#1e3a5f",
  plant:    "#1a4a1a",
  plantLeaf:"#2d8a2d",
  coffee:   "#3d1f00",
  coffeeTop:"#6b3a1f",
  meeting:  "#0a2a4a",
  meetingBorder: "#1e5f8a",
  server:   "#0a1628",
  serverLight: "#00ff88",
  carpet:   "#0d1b3e",
  window:   "#87ceeb",
  windowFrame: "#2d4a7a",
};

const AGENTS = [
  { id: "tomer",  name: "TOMER",  role: "AUTOMATION",   color: "#39ff14", darkColor: "#1a8a07", emoji: "⚙" },
  { id: "dani",   name: "DANNY",  role: "DEV",           color: "#00bfff", darkColor: "#0070a0", emoji: "💻" },
  { id: "yaara",  name: "YAARA",  role: "UX/UI",         color: "#ff69b4", darkColor: "#a0205a", emoji: "🎨" },
  { id: "ronit",  name: "RONIT",  role: "PRODUCT",       color: "#ffd700", darkColor: "#a08000", emoji: "📦" },
  { id: "dana",   name: "DANA",   role: "MARKETING",     color: "#ff6347", darkColor: "#a02010", emoji: "📣" },
  { id: "eidan",  name: "EIDAN",  role: "BIZ DEV",       color: "#9370db", darkColor: "#5020a0", emoji: "📊" },
  { id: "uri",    name: "URI",    role: "PM",             color: "#ff8c00", darkColor: "#a05000", emoji: "🎯" },
];

const STATUS_LABELS = { idle: "IDLE", thinking: "THINKING", slack: "IN MEETING", github: "SCANNING CODE" };
const STATUS_ICONS  = { idle: "💤", thinking: "💡", slack: "💬", github: "🔍" };

const DESKS = [
  { x: 2, y: 2 }, { x: 5, y: 2 }, { x: 8, y: 2 },
  { x: 2, y: 6 }, { x: 5, y: 6 }, { x: 8, y: 6 }, { x: 11, y: 6 },
];

const MEETING_POS = [
  { x: 14.5, y: 2 }, { x: 16, y: 3 }, { x: 17.5, y: 2 },
  { x: 14.5, y: 5 }, { x: 16, y: 6 }, { x: 17.5, y: 5 }, { x: 16, y: 4.5 },
];

const SERVER_POS = [
  { x: 1, y: 10 }, { x: 3, y: 10 }, { x: 5, y: 10 },
  { x: 7, y: 10 }, { x: 2, y: 11 }, { x: 4, y: 11 }, { x: 6, y: 11 },
];

const COFFEE_POS = { x: 11, y: 2.5 };

function getAgentTarget(agentId, status, agentIndex) {
  switch (status) {
    case "slack":   return MEETING_POS[agentIndex] || MEETING_POS[0];
    case "github":  return SERVER_POS[agentIndex]  || SERVER_POS[0];
    default:        return DESKS[agentIndex] || DESKS[0];
  }
}

function PixelSprite({ color, darkColor, status, facing = "right" }) {
  const bodyColor = color;
  const shadowColor = darkColor;
  const isThinking = status === "thinking";
  const isMoving = status === "slack" || status === "github";

  return (
    <svg width="20" height="28" viewBox="0 0 20 28" style={{ imageRendering: "pixelated", overflow: "visible" }}>
      {/* shadow */}
      <ellipse cx="10" cy="27" rx="7" ry="2" fill="rgba(0,0,0,0.4)" />
      {/* legs animation */}
      <g>
        <rect x="6" y="20" width="3" height="5" fill={shadowColor}
          style={isMoving ? { animation: "legL 0.3s infinite alternate" } : {}} />
        <rect x="11" y="20" width="3" height="5" fill={shadowColor}
          style={isMoving ? { animation: "legR 0.3s infinite alternate" } : {}} />
      </g>
      {/* body */}
      <rect x="4" y="11" width="12" height="10" fill={bodyColor} rx="1" />
      {/* arm left */}
      <rect x="1" y="12" width="3" height="6" fill={shadowColor} rx="1" />
      {/* arm right */}
      <rect x="16" y="12" width="3" height="6" fill={shadowColor} rx="1" />
      {/* neck */}
      <rect x="8" y="8" width="4" height="4" fill="#f5c5a0" />
      {/* head */}
      <rect x="5" y="2" width="10" height="9" fill="#f5c5a0" rx="2" />
      {/* hair */}
      <rect x="5" y="2" width="10" height="3" fill={bodyColor} rx="1" />
      {/* eyes */}
      <rect x="7" y="6" width="2" height="2" fill="#1a1a2e" />
      <rect x="11" y="6" width="2" height="2" fill="#1a1a2e" />
      {/* mouth */}
      <rect x="8" y="9" width="4" height="1" fill={shadowColor} />
      {/* thinking bubble */}
      {isThinking && (
        <g>
          <circle cx="18" cy="1" r="4" fill="rgba(255,255,200,0.9)" stroke={color} strokeWidth="0.5" />
          <text x="18" y="4" textAnchor="middle" fontSize="5" fill="#1a1a2e">!</text>
          <circle cx="15" cy="5" r="1.5" fill="rgba(255,255,200,0.7)" />
          <circle cx="13" cy="8" r="1" fill="rgba(255,255,200,0.5)" />
        </g>
      )}
    </svg>
  );
}

function OfficeMap({ agentStates }) {
  const tiles = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const isAlt = (row + col) % 2 === 0;
      tiles.push(
        <rect key={`${row}-${col}`}
          x={col * TILE} y={row * TILE} width={TILE} height={TILE}
          fill={isAlt ? PALETTE.floor : PALETTE.floorAlt} />
      );
    }
  }

  return (
    <svg width={COLS * TILE} height={ROWS * TILE} style={{ imageRendering: "pixelated", display: "block" }}>
      <defs>
        <pattern id="grid" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          <rect width={TILE} height={TILE} fill={PALETTE.floor} />
          <rect width={TILE} height={TILE} fill={PALETTE.floorAlt} opacity="0.3"
            transform={`translate(${TILE/2},${TILE/2})`} />
        </pattern>
      </defs>

      {/* floor */}
      {tiles}

      {/* carpet area - desks zone */}
      <rect x={TILE} y={TILE} width={13*TILE} height={8*TILE} fill={PALETTE.carpet} opacity="0.3" rx="4" />

      {/* meeting room carpet */}
      <rect x={13*TILE} y={TILE} width={6*TILE} height={7*TILE} fill="#0a2040" opacity="0.5" rx="4" />

      {/* server room */}
      <rect x={TILE} y={9*TILE} width={10*TILE} height={4*TILE} fill="#050d1a" opacity="0.7" rx="4" />

      {/* walls top */}
      <rect x={0} y={0} width={COLS*TILE} height={TILE} fill={PALETTE.wall} />
      <rect x={0} y={0} width={COLS*TILE} height={4} fill={PALETTE.wallTop} />

      {/* windows */}
      {[2,5,8,11,15,17].map((col,i) => (
        <g key={i}>
          <rect x={col*TILE+4} y={4} width={TILE-8} height={TILE-8} fill={PALETTE.window} opacity="0.7" rx="2" />
          <rect x={col*TILE+4} y={4} width={TILE-8} height={2} fill={PALETTE.windowFrame} />
          <rect x={col*TILE+TILE/2-1} y={4} width={2} height={TILE-8} fill={PALETTE.windowFrame} />
        </g>
      ))}

      {/* desks */}
      {DESKS.map((desk, i) => (
        <g key={i} transform={`translate(${desk.x*TILE},${desk.y*TILE})`}>
          <rect x={0} y={8} width={TILE*2} height={TILE+8} fill={PALETTE.desk} rx="2" />
          <rect x={0} y={8} width={TILE*2} height={4} fill={PALETTE.deskTop} rx="2" />
          <rect x={6} y={0} width={TILE-4} height={TILE} fill={PALETTE.monitor} rx="2" />
          <rect x={8} y={2} width={TILE-8} height={TILE-6} fill={PALETTE.screen} opacity="0.8" rx="1" />
          <rect x={TILE/2-3} y={TILE} width={6} height={4} fill={PALETTE.monitor} />
          <rect x={4} y={TILE+4} width={16} height={2} fill={PALETTE.desk} />
          <rect x={2} y={TILE+8} width={4} height={8} fill={PALETTE.chair} />
          <rect x={TILE*2-6} y={TILE+8} width={4} height={8} fill={PALETTE.chair} />
          <rect x={0} y={TILE+12} width={TILE*2} height={4} fill={PALETTE.chair} rx="2" />
        </g>
      ))}

      {/* meeting table */}
      <rect x={13.5*TILE} y={2.5*TILE} width={5*TILE} height={3*TILE} fill={PALETTE.meeting} rx="4"
        stroke={PALETTE.meetingBorder} strokeWidth="2" />
      <rect x={14*TILE} y={3*TILE} width={4*TILE} height={2*TILE} fill="#0d2240" rx="2" />
      {/* meeting chairs */}
      {[14,15.5,17].map((x,i) => (
        <g key={i}>
          <rect x={x*TILE} y={2*TILE+4} width={TILE-4} height={8} fill={PALETTE.chair} rx="2" />
          <rect x={x*TILE} y={5.5*TILE+4} width={TILE-4} height={8} fill={PALETTE.chair} rx="2" />
        </g>
      ))}

      {/* server racks */}
      {[1,3,5,7,9].map((col,i) => (
        <g key={i} transform={`translate(${col*TILE},${9.5*TILE})`}>
          <rect x={0} y={0} width={TILE} height={TILE*3} fill={PALETTE.server} rx="2"
            stroke={PALETTE.serverLight} strokeWidth="0.5" strokeOpacity="0.3" />
          {[0,1,2,3,4,5,6].map(j => (
            <g key={j}>
              <rect x={4} y={j*8+4} width={TILE-8} height={4} fill="#0d2040" rx="1" />
              <circle cx={TILE-8} cy={j*8+6} r="2" fill={PALETTE.serverLight} opacity={Math.random() > 0.3 ? 1 : 0.1} />
            </g>
          ))}
        </g>
      ))}

      {/* coffee machine */}
      <g transform={`translate(${11*TILE},${1.5*TILE})`}>
        <rect x={0} y={4} width={TILE} height={TILE*1.5} fill={PALETTE.coffee} rx="3" />
        <rect x={0} y={4} width={TILE} height={6} fill={PALETTE.coffeeTop} rx="2" />
        <rect x={4} y={12} width={TILE-8} height={12} fill="#1a0a00" rx="2" />
        <circle cx={TILE/2} cy={10} r="4" fill="#3d1f00" stroke="#6b3a1f" strokeWidth="1" />
        <rect x={TILE/2-1} y={20} width={2} height={8} fill="#6b3a1f" />
        <circle cx={TILE/2} cy={30} r="4" fill="#1a0800" stroke="#6b3a1f" strokeWidth="1" />
      </g>

      {/* plant */}
      <g transform={`translate(${0.5*TILE},${9*TILE})`}>
        <rect x={4} y={TILE} width={12} height={14} fill={PALETTE.plant} rx="2" />
        <ellipse cx={TILE/2} cy={TILE} rx="10" ry="12" fill={PALETTE.plantLeaf} />
        <ellipse cx={TILE/2-8} cy={TILE+4} rx="7" ry="9" fill={PALETTE.plantLeaf} />
        <ellipse cx={TILE/2+8} cy={TILE+4} rx="7" ry="9" fill={PALETTE.plantLeaf} />
      </g>

      {/* section labels */}
      <text x={2*TILE} y={9.3*TILE} fill="#00ff88" fontSize="8" fontFamily="monospace" opacity="0.5">[ SERVER ROOM ]</text>
      <text x={14*TILE} y={1.7*TILE} fill="#00bfff" fontSize="8" fontFamily="monospace" opacity="0.5">[ MEETING ROOM ]</text>
      <text x={2*TILE} y={5.5*TILE} fill="#ffd700" fontSize="8" fontFamily="monospace" opacity="0.5">[ WORK STATIONS ]</text>

      {/* agents */}
      {AGENTS.map((agent, i) => {
        const status = agentStates[agent.id] || "idle";
        const target = getAgentTarget(agent.id, status, i);
        return (
          <foreignObject
            key={agent.id}
            x={target.x * TILE - 10}
            y={target.y * TILE - 14}
            width={36}
            height={40}
            style={{ transition: "all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)", overflow: "visible" }}
          >
            <div style={{ position: "relative", textAlign: "center" }}>
              <PixelSprite color={agent.color} darkColor={agent.darkColor} status={status} />
              <div style={{
                fontFamily: "monospace",
                fontSize: "5px",
                color: agent.color,
                textShadow: `0 0 4px ${agent.color}`,
                marginTop: "1px",
                whiteSpace: "nowrap",
                textAlign: "center",
              }}>{agent.name}</div>
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}

export default function MefikOffice() {
  const [agentStates, setAgentStates] = useState(
    Object.fromEntries(AGENTS.map(a => [a.id, "idle"]))
  );
  const [selected, setSelected] = useState(null);
  const [log, setLog] = useState([">> MEFIK AI OFFICE ONLINE", ">> ALL AGENTS STANDING BY"]);
  const [tick, setTick] = useState(0);
  const logRef = useRef(null);

  const addLog = (msg) => setLog(prev => [...prev.slice(-20), `>> ${msg}`]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const statuses = ["idle", "thinking", "slack", "github"];
    const randomAgent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
    const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
    setAgentStates(prev => ({ ...prev, [randomAgent.id]: newStatus }));
    addLog(`${randomAgent.name} → ${STATUS_LABELS[newStatus]}`);
  }, [tick]);

  const setStatus = (agentId, status) => {
    setAgentStates(prev => ({ ...prev, [agentId]: status }));
    const agent = AGENTS.find(a => a.id === agentId);
    addLog(`${agent.name} → ${STATUS_LABELS[status]} [MANUAL]`);
  };

  const runMeeting = () => {
    const statuses = ["thinking", "thinking", "slack", "slack", "slack", "github", "thinking"];
    AGENTS.forEach((agent, i) => {
      setTimeout(() => {
        setAgentStates(prev => ({ ...prev, [agent.id]: statuses[i] }));
        addLog(`${agent.name} → ${STATUS_LABELS[statuses[i]]}`);
      }, i * 400);
    });
    setTimeout(() => addLog("DAILY MEETING STARTED"), 0);
  };

  return (
    <div style={{
      background: "#050d1a",
      minHeight: "100vh",
      padding: "16px",
      fontFamily: "'Courier New', monospace",
      color: "#00ff88",
    }}>
      <style>{`
        @keyframes legL { from { transform: rotate(-15deg); } to { transform: rotate(15deg); } }
        @keyframes legR { from { transform: rotate(15deg); } to { transform: rotate(-15deg); } }
        @keyframes scanline { from { top: -10%; } to { top: 110%; } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .crt::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px);
          pointer-events: none;
          border-radius: 8px;
        }
        .btn { cursor: pointer; border: none; font-family: inherit; transition: all 0.1s; }
        .btn:active { transform: scale(0.96); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #050d1a; }
        ::-webkit-scrollbar-thumb { background: #00ff88; border-radius: 2px; }
      `}</style>

      {/* header */}
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "18px", letterSpacing: "6px", color: "#00ff88", textShadow: "0 0 20px #00ff88", marginBottom: "4px" }}>
          ★ MEFIK AI OFFICE ★
        </div>
        <div style={{ fontSize: "9px", color: "#007a40", letterSpacing: "3px" }}>
          VIRTUAL HEADQUARTERS • POWERED BY CREWAI
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", maxWidth: "900px", margin: "0 auto" }}>
        {/* map */}
        <div style={{ flex: "0 0 auto" }}>
          <div className="crt" style={{
            position: "relative",
            border: "2px solid #00ff88",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 0 30px rgba(0,255,136,0.2)",
          }}>
            <OfficeMap agentStates={agentStates} />
          </div>
        </div>

        {/* sidebar */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", minWidth: "200px" }}>
          {/* controls */}
          <div style={{
            border: "1px solid #00ff8840",
            borderRadius: "6px",
            padding: "10px",
            background: "#080f1e",
          }}>
            <div style={{ fontSize: "8px", color: "#007a40", marginBottom: "8px", letterSpacing: "2px" }}>CONTROLS</div>
            <button className="btn" onClick={runMeeting} style={{
              width: "100%",
              padding: "8px",
              background: "#0d2a0d",
              color: "#00ff88",
              border: "1px solid #00ff88",
              borderRadius: "4px",
              fontSize: "9px",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}>▶ RUN DAILY MEETING</button>
            <button className="btn" onClick={() => {
              AGENTS.forEach(a => setAgentStates(prev => ({ ...prev, [a.id]: "idle" })));
              addLog("ALL AGENTS RESET TO IDLE");
            }} style={{
              width: "100%",
              padding: "6px",
              background: "#1a0808",
              color: "#ff4444",
              border: "1px solid #ff444460",
              borderRadius: "4px",
              fontSize: "8px",
              letterSpacing: "1px",
            }}>■ RESET ALL</button>
          </div>

          {/* agents */}
          <div style={{
            border: "1px solid #00ff8840",
            borderRadius: "6px",
            padding: "10px",
            background: "#080f1e",
            flex: 1,
          }}>
            <div style={{ fontSize: "8px", color: "#007a40", marginBottom: "8px", letterSpacing: "2px" }}>AGENTS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {AGENTS.map(agent => {
                const status = agentStates[agent.id] || "idle";
                return (
                  <div key={agent.id}
                    onClick={() => setSelected(selected === agent.id ? null : agent.id)}
                    style={{
                      padding: "6px 8px",
                      background: selected === agent.id ? "#0d2040" : "#050d1a",
                      border: `1px solid ${selected === agent.id ? agent.color : "#00ff8820"}`,
                      borderRadius: "4px",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: selected === agent.id ? "6px" : 0 }}>
                      <div style={{
                        width: "8px", height: "8px", borderRadius: "0",
                        background: status === "idle" ? "#333" : agent.color,
                        animation: status !== "idle" ? "pulse 1s infinite" : "none",
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: "9px", color: agent.color, flex: 1 }}>{agent.name}</span>
                      <span style={{ fontSize: "7px", color: "#007a40" }}>{STATUS_ICONS[status]}</span>
                    </div>
                    <AnimatePresence>
                      {selected === agent.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: "hidden" }}>
                          <div style={{ fontSize: "7px", color: "#007a40", marginBottom: "6px" }}>{agent.role}</div>
                          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                            {Object.entries(STATUS_LABELS).map(([s, label]) => (
                              <button key={s} className="btn"
                                onClick={(e) => { e.stopPropagation(); setStatus(agent.id, s); }}
                                style={{
                                  padding: "3px 6px",
                                  background: status === s ? agent.color : "transparent",
                                  color: status === s ? "#050d1a" : agent.color,
                                  border: `1px solid ${agent.color}50`,
                                  borderRadius: "3px",
                                  fontSize: "6px",
                                }}>
                                {label.split(" ")[0]}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* log */}
          <div style={{
            border: "1px solid #00ff8840",
            borderRadius: "6px",
            padding: "10px",
            background: "#080f1e",
            height: "120px",
          }}>
            <div style={{ fontSize: "8px", color: "#007a40", marginBottom: "6px", letterSpacing: "2px" }}>ACTIVITY LOG</div>
            <div ref={logRef} style={{
              height: "80px",
              overflowY: "auto",
              fontSize: "7px",
              color: "#00ff88",
              lineHeight: "1.8",
            }}>
              {log.map((entry, i) => (
                <div key={i} style={{ opacity: 0.5 + (i / log.length) * 0.5 }}>{entry}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* legend */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "20px",
        marginTop: "12px",
        fontSize: "7px",
        color: "#007a40",
        letterSpacing: "1px",
      }}>
        {Object.entries(STATUS_LABELS).map(([s, label]) => (
          <span key={s}>{STATUS_ICONS[s]} {label}</span>
        ))}
      </div>
    </div>
  );
}
