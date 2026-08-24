"use client";

import { useEffect, useMemo, useState } from "react";

type PlayerId = "p1" | "p2";
type Screen = "menu" | "cover" | "pick" | "build" | "battle" | "rules";
type AttackTier = "normal" | "super" | "hyper";
type DefenseTier = "normal" | "hyper";
type AttackBehavior = "rapido" | "pesado" | "doble" | "cargado" | "rompedefensa" | "fragmenta" | "anulador";
type DefenseBehavior = "bloqueo" | "reflector" | "absorbe";
type CharacterId = "planner" | "tank" | "shield" | "striker";
type PaintTool = "pencil" | "eraser" | "fill" | "picker";

type Pixel = string | null;
type PixelArt = Pixel[];

type AttackCard = {
  id: string;
  owner: PlayerId;
  kind: "attack";
  tier: AttackTier;
  name: string;
  behavior: AttackBehavior;
  art: PixelArt;
};

type DefenseCard = {
  id: string;
  owner: PlayerId;
  kind: "defense";
  tier: DefenseTier;
  name: string;
  behavior: DefenseBehavior;
  art: PixelArt;
  used: boolean;
};

type GameCard = AttackCard | DefenseCard;

type Projectile = {
  id: number;
  owner: PlayerId;
  lane: number;
  x: number;
  hp: number;
  damage: number;
  speed: number;
  size: number;
  tier: AttackTier;
  behavior: AttackBehavior;
  name: string;
  art: PixelArt;
  charge: number;
};

type Defense = {
  id: number;
  owner: PlayerId;
  lane: number;
  hp: number;
  ttl: number;
  tier: DefenseTier;
  behavior: DefenseBehavior;
  name: string;
  art: PixelArt;
};

type Blast = {
  id: number;
  lane: number;
  x: number;
  ttl: number;
  color: string;
  label?: string;
  kind?: "cast" | "hit" | "base";
};

type PlayerState = {
  baseHp: number;
  character: CharacterId;
  shieldReady: boolean;
};

const lanes = [0, 1, 2, 3, 4];
const gridSize = 16;
const emptyArt = Array<Pixel>(gridSize * gridSize).fill(null);
const colors = [
  "#111827",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#2563eb",
  "#a855f7",
  "#ec4899",
  "#64748b",
  "#78350f",
];

const attackLabels: Record<AttackBehavior, string> = {
  rapido: "rapido",
  pesado: "pesado",
  doble: "doble",
  cargado: "cargado",
  rompedefensa: "rompe defensa",
  fragmenta: "se divide",
  anulador: "anula ataques",
};

const defenseLabels: Record<DefenseBehavior, string> = {
  bloqueo: "bloqueo",
  reflector: "reflector",
  absorbe: "absorbe dano",
};

const attackTips: Record<AttackBehavior, string> = {
  rapido: "sale veloz y presiona carriles vacios",
  pesado: "aguanta choques y pega fuerte",
  doble: "lanza dos copias por el mismo carril",
  cargado: "espera un momento y golpea mas duro",
  rompedefensa: "perfora defensas normales e hiper",
  fragmenta: "abre el ataque hacia carriles vecinos",
  anulador: "gana fuerza cuando choca con ataques rivales",
};

const defenseTips: Record<DefenseBehavior, string> = {
  bloqueo: "mucha vida para parar golpes directos",
  reflector: "devuelve ataques que no sean hiper",
  absorbe: "cura un poco la base al recibir dano",
};

const characters: Record<CharacterId, { name: string; text: string }> = {
  planner: {
    name: "Estratega",
    text: "tiene el mazo mas flexible para futuras versiones",
  },
  tank: {
    name: "Tanque",
    text: "empieza con mas vida de base",
  },
  shield: {
    name: "Guardian",
    text: "tiene un escudo de emergencia una vez por partida",
  },
  striker: {
    name: "Impulsor",
    text: "sus ataques viajan un poco mas rapido",
  },
};

function artFromRows(rows: string[], map: Record<string, string>): PixelArt {
  return rows.flatMap((row) =>
    row.padEnd(gridSize, ".").slice(0, gridSize).split("").map((char) => map[char] ?? null),
  );
}

const art = {
  bolt: artFromRows(
    [
      "................",
      "......YY........",
      ".....YYYY.......",
      "....YYYY........",
      "...YYYY.........",
      "....YYYYYY......",
      ".....YYYYYY.....",
      "......YYYY......",
      "......YYY.......",
      ".....YYY........",
      "....YYY.........",
      "...YYY..........",
      "..YY............",
      "................",
      "................",
      "................",
    ],
    { Y: "#facc15" },
  ),
  comet: artFromRows(
    [
      "................",
      "................",
      "...RR...........",
      "..RROO..........",
      ".RROOOO.........",
      "RROOWWWO........",
      ".ROWWWWOO.......",
      "..OOWWWWO.......",
      "...OOWWO........",
      "....OOOO........",
      ".....OO.........",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    { R: "#ef4444", O: "#f97316", W: "#ffffff" },
  ),
  shard: artFromRows(
    [
      "................",
      ".......C........",
      "......CCC.......",
      ".....CCWC.......",
      "....CCWWC.......",
      "...CCWWWC.......",
      "..CCWWWWC.......",
      "...CCWWC........",
      "....CCC.........",
      ".....C..........",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    { C: "#06b6d4", W: "#ffffff" },
  ),
  drill: artFromRows(
    [
      "................",
      "................",
      ".......K........",
      "......KKK.......",
      ".....KKSKK......",
      "....KKSSSKK.....",
      "...KKSSSSSKK....",
      "....KKSSSKK.....",
      ".....KKSKK......",
      "......KKK.......",
      ".......K........",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    { K: "#111827", S: "#64748b" },
  ),
  wall: artFromRows(
    [
      "................",
      "...BBBBBBBBBB...",
      "...BWWBWWBWWB...",
      "...BBBBBBBBBB...",
      "...WWBWWBWWBW...",
      "...BBBBBBBBBB...",
      "...BWWBWWBWWB...",
      "...BBBBBBBBBB...",
      "...WWBWWBWWBW...",
      "...BBBBBBBBBB...",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    { B: "#2563eb", W: "#93c5fd" },
  ),
  prism: artFromRows(
    [
      "................",
      ".......P........",
      "......PPP.......",
      ".....PPWPP......",
      "....PPWWWPP.....",
      "...PPWWWWWPP....",
      "...PPWWWWWPP....",
      "....PPWWWPP.....",
      ".....PPWPP......",
      "......PPP.......",
      ".......P........",
      "................",
      "................",
      "................",
      "................",
      "................",
    ],
    { P: "#a855f7", W: "#ffffff" },
  ),
};

const initialAttacks: Record<PlayerId, AttackCard[]> = {
  p1: [
    { id: "p1-a1", owner: "p1", kind: "attack", tier: "normal", name: "Normal 1", behavior: "rapido", art: [...emptyArt] },
    { id: "p1-a2", owner: "p1", kind: "attack", tier: "normal", name: "Normal 2", behavior: "doble", art: [...emptyArt] },
    { id: "p1-a3", owner: "p1", kind: "attack", tier: "super", name: "Super", behavior: "fragmenta", art: [...emptyArt] },
    { id: "p1-a4", owner: "p1", kind: "attack", tier: "hyper", name: "Hiper", behavior: "rompedefensa", art: [...emptyArt] },
  ],
  p2: [
    { id: "p2-a1", owner: "p2", kind: "attack", tier: "normal", name: "Normal 1", behavior: "rapido", art: [...emptyArt] },
    { id: "p2-a2", owner: "p2", kind: "attack", tier: "normal", name: "Normal 2", behavior: "doble", art: [...emptyArt] },
    { id: "p2-a3", owner: "p2", kind: "attack", tier: "super", name: "Super", behavior: "fragmenta", art: [...emptyArt] },
    { id: "p2-a4", owner: "p2", kind: "attack", tier: "hyper", name: "Hiper", behavior: "rompedefensa", art: [...emptyArt] },
  ],
};

const initialDefenses: Record<PlayerId, DefenseCard[]> = {
  p1: [
    { id: "p1-d1", owner: "p1", kind: "defense", tier: "normal", name: "Defensa", behavior: "bloqueo", art: [...emptyArt], used: false },
    { id: "p1-d2", owner: "p1", kind: "defense", tier: "hyper", name: "Defensa Hiper", behavior: "reflector", art: [...emptyArt], used: false },
  ],
  p2: [
    { id: "p2-d1", owner: "p2", kind: "defense", tier: "normal", name: "Defensa", behavior: "bloqueo", art: [...emptyArt], used: false },
    { id: "p2-d2", owner: "p2", kind: "defense", tier: "hyper", name: "Defensa Hiper", behavior: "reflector", art: [...emptyArt], used: false },
  ],
};

function tint(source: PixelArt, color: string): PixelArt {
  return source.map((pixel) => (pixel && pixel !== "#ffffff" ? color : pixel));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function playerName(player: PlayerId) {
  return player === "p1" ? "Jugador 1" : "Jugador 2";
}

function otherPlayer(player: PlayerId): PlayerId {
  return player === "p1" ? "p2" : "p1";
}

function attackStats(card: AttackCard) {
  const tier = {
    normal: { damage: 11, hp: 10, speed: 8, size: 22, charge: 0 },
    super: { damage: 25, hp: 24, speed: 4.8, size: 28, charge: 0 },
    hyper: { damage: 42, hp: 38, speed: 3.7, size: 34, charge: 0 },
  }[card.tier];

  const behavior = {
    rapido: { damage: -2, hp: -2, speed: 2.7, charge: 0 },
    pesado: { damage: 9, hp: 10, speed: -2, charge: 0 },
    doble: { damage: -4, hp: -3, speed: 0.4, charge: 0 },
    cargado: { damage: 12, hp: 3, speed: -1, charge: 1.2 },
    rompedefensa: { damage: 4, hp: 8, speed: -1.2, charge: 0.3 },
    fragmenta: { damage: -5, hp: -4, speed: 0.8, charge: 0 },
    anulador: { damage: -1, hp: 6, speed: 0.2, charge: 0 },
  }[card.behavior];

  return {
    damage: Math.max(4, tier.damage + behavior.damage),
    hp: Math.max(3, tier.hp + behavior.hp),
    speed: Math.max(1.8, tier.speed + behavior.speed),
    size: tier.size,
    charge: tier.charge + behavior.charge,
  };
}

function defenseStats(card: DefenseCard) {
  const tier = card.tier === "hyper" ? { hp: 76, ttl: 24 } : { hp: 38, ttl: 16 };
  const behavior = {
    bloqueo: { hp: 18, ttl: 0 },
    reflector: { hp: -6, ttl: -4 },
    absorbe: { hp: -2, ttl: 5 },
  }[card.behavior];
  return {
    hp: Math.max(14, tier.hp + behavior.hp),
    ttl: Math.max(8, tier.ttl + behavior.ttl),
  };
}

function primaryColor(artPixels: PixelArt, fallback: string) {
  return artPixels.find((pixel) => pixel && pixel !== "#ffffff") ?? fallback;
}

function PixelSprite({ art: artPixels, small = false }: { art: PixelArt; small?: boolean }) {
  return (
    <div className={small ? "pixelSprite small" : "pixelSprite"}>
      {artPixels.map((pixel, index) => (
        <span key={index} style={{ backgroundColor: pixel ?? "transparent" }} />
      ))}
    </div>
  );
}

function PixelEditor({
  art: artPixels,
  onChange,
}: {
  art: PixelArt;
  onChange: (art: PixelArt) => void;
}) {
  const [color, setColor] = useState(colors[2]);
  const [painting, setPainting] = useState(false);
  const [tool, setTool] = useState<PaintTool>("pencil");

  function paint(index: number) {
    const next = [...artPixels];
    next[index] = color;
    onChange(next);
  }

  function erase(index: number) {
    const next = [...artPixels];
    next[index] = null;
    onChange(next);
  }

  function fill(index: number) {
    const target = artPixels[index];
    if (target === color) return;
    const next = [...artPixels];
    const stack = [index];
    const seen = new Set<number>();
    while (stack.length) {
      const current = stack.pop();
      if (current === undefined || seen.has(current) || next[current] !== target) continue;
      seen.add(current);
      next[current] = color;
      const x = current % gridSize;
      const y = Math.floor(current / gridSize);
      if (x > 0) stack.push(current - 1);
      if (x < gridSize - 1) stack.push(current + 1);
      if (y > 0) stack.push(current - gridSize);
      if (y < gridSize - 1) stack.push(current + gridSize);
    }
    onChange(next);
  }

  function applyTool(index: number) {
    if (tool === "eraser") erase(index);
    else if (tool === "fill") fill(index);
    else if (tool === "picker") {
      const picked = artPixels[index];
      if (picked) setColor(picked);
      setTool("pencil");
    } else paint(index);
  }

  function mirror() {
    const next = [...emptyArt];
    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        next[y * gridSize + x] = artPixels[y * gridSize + (gridSize - 1 - x)];
      }
    }
    onChange(next);
  }

  function rotate() {
    const next = [...emptyArt];
    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        next[x * gridSize + (gridSize - 1 - y)] = artPixels[y * gridSize + x];
      }
    }
    onChange(next);
  }

  function shift(dx: number, dy: number) {
    const next = [...emptyArt];
    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
          next[ny * gridSize + nx] = artPixels[y * gridSize + x];
        }
      }
    }
    onChange(next);
  }

  function outline() {
    const next = [...artPixels];
    artPixels.forEach((pixel, index) => {
      if (!pixel) return;
      const x = index % gridSize;
      const y = Math.floor(index / gridSize);
      [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].forEach(([nx, ny]) => {
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
          const target = ny * gridSize + nx;
          if (!artPixels[target]) next[target] = color;
        }
      });
    });
    onChange(next);
  }

  function frame() {
    const next = [...artPixels];
    for (let i = 0; i < gridSize; i += 1) {
      next[i] = color;
      next[(gridSize - 1) * gridSize + i] = color;
      next[i * gridSize] = color;
      next[i * gridSize + gridSize - 1] = color;
    }
    onChange(next);
  }

  return (
    <div className="pixelEditor">
      <div className="toolStrip" aria-label="Herramientas de dibujo">
        {([
          ["pencil", "lapiz"],
          ["eraser", "goma"],
          ["fill", "relleno"],
          ["picker", "color"],
        ] as [PaintTool, string][]).map(([value, label]) => (
          <button key={value} className={tool === value ? "active" : ""} onClick={() => setTool(value)}>
            {label}
          </button>
        ))}
      </div>
      <div
        className="pixelBoard"
        onPointerLeave={() => setPainting(false)}
        onPointerUp={() => setPainting(false)}
      >
        {artPixels.map((pixel, index) => (
          <button
            key={index}
            aria-label={`pixel ${index + 1}`}
            style={{ backgroundColor: pixel ?? "#e5e7eb" }}
            onPointerDown={(event) => {
              event.preventDefault();
              setPainting(true);
              if (event.button === 2) erase(index);
              else applyTool(index);
            }}
            onPointerEnter={() => {
              if (painting && (tool === "pencil" || tool === "eraser")) applyTool(index);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              erase(index);
            }}
          />
        ))}
      </div>
      <div className="paintTools">
        <div className="palette" aria-label="Paleta">
          {colors.map((item) => (
            <button
              key={item}
              className={item === color ? "active" : ""}
              style={{ backgroundColor: item }}
              onClick={() => setColor(item)}
              title={item}
            />
          ))}
        </div>
        <button className="toolButton" onClick={() => onChange([...emptyArt])}>limpiar</button>
        <button className="toolButton" onClick={outline}>contorno</button>
        <button className="toolButton" onClick={frame}>marco</button>
        <button className="toolButton" onClick={mirror}>espejo</button>
        <button className="toolButton" onClick={rotate}>rotar</button>
      </div>
      <div className="nudgeTools" aria-label="Mover dibujo">
        <button onClick={() => shift(0, -1)}>arriba</button>
        <button onClick={() => shift(-1, 0)}>izq</button>
        <button onClick={() => shift(1, 0)}>der</button>
        <button onClick={() => shift(0, 1)}>abajo</button>
      </div>
    </div>
  );
}

function CardView({
  card,
  active,
  spent,
  onClick,
}: {
  card: GameCard;
  active?: boolean;
  spent?: boolean;
  onClick: () => void;
}) {
  const label = card.kind === "attack" ? card.tier : `${card.tier} defensa`;
  const badge = card.kind === "attack" ? card.tier.slice(0, 1).toUpperCase() : "D";
  const mechanic = card.kind === "attack" ? attackLabels[card.behavior] : defenseLabels[card.behavior];
  const icon = card.kind === "attack" ? card.behavior : card.behavior;
  const blank = card.art.every((pixel) => !pixel);
  return (
    <button className={`card ${card.owner} ${card.kind} ${card.kind === "attack" ? card.tier : card.tier} ${active ? "active" : ""} ${spent ? "spent" : ""}`} onClick={onClick}>
      <span className="cardRibbon">{label}</span>
      <span className={spent ? "cardUsed" : "cardCost"}>{spent ? "usada" : badge}</span>
      <span className={`cardArtFrame ${blank ? "blank" : ""}`}>
        <span className={`aiIcon ${icon}`} aria-hidden="true" />
        <PixelSprite art={card.art} />
      </span>
      <span className="cardName">{card.name}</span>
      <span className="cardMeta">{mechanic}</span>
    </button>
  );
}

function CardEditor({
  selected,
  attacks,
  defenses,
  onAttackChange,
  onDefenseChange,
}: {
  selected: GameCard;
  attacks: Record<PlayerId, AttackCard[]>;
  defenses: Record<PlayerId, DefenseCard[]>;
  onAttackChange: (card: AttackCard) => void;
  onDefenseChange: (card: DefenseCard) => void;
}) {
  const ownerCards = selected.kind === "attack" ? attacks[selected.owner] : defenses[selected.owner];

  function updateName(name: string) {
    if (selected.kind === "attack") onAttackChange({ ...selected, name });
    else onDefenseChange({ ...selected, name });
  }

  function updateArt(next: PixelArt) {
    if (selected.kind === "attack") onAttackChange({ ...selected, art: next });
    else onDefenseChange({ ...selected, art: next });
  }

  function applyTemplate(template: PixelArt) {
    updateArt(template);
  }

  return (
    <section className="editorPanel">
      <div className="sectionTitle">
        <span>Editor pixel 16x16</span>
        <strong>{selected.owner === "p1" ? "Jugador 1" : "Jugador 2"}</strong>
      </div>
      <div className="editorGrid">
        <PixelEditor art={selected.art} onChange={updateArt} />
        <div className="editorControls">
          <label>
            nombre
            <input value={selected.name} onChange={(event) => updateName(event.target.value)} />
          </label>

          <div className={`editorPreview ${selected.kind === "attack" ? selected.tier : "defense"}`}>
            <span>vista de carta</span>
            <PixelSprite art={selected.art} />
            <strong>{selected.name}</strong>
            <small>
              {selected.kind === "attack"
                ? `${selected.tier} / ${attackLabels[selected.behavior]}`
                : `${selected.tier} / ${defenseLabels[selected.behavior]}`}
            </small>
          </div>

          <div className="templateBox">
            <span>plantillas rapidas</span>
            <div>
              {(selected.kind === "attack"
                ? [
                    ["rayo", art.bolt],
                    ["cometa", art.comet],
                    ["taladro", art.drill],
                    ["astilla", art.shard],
                  ]
                : [
                    ["muro", art.wall],
                    ["prisma", art.prism],
                    ["muro color", tint(art.wall, primaryColor(selected.art, "#38bdf8"))],
                  ]
              ).map(([name, template]) => (
                <button key={name as string} onClick={() => applyTemplate(template as PixelArt)}>
                  {name as string}
                </button>
              ))}
            </div>
          </div>

          <div className="aiAssetPanel">
            <span>iconos ia</span>
            <div className="aiIconGrid" aria-hidden="true">
              {(selected.kind === "attack"
                ? Object.keys(attackLabels)
                : Object.keys(defenseLabels)
              ).map((value) => (
                <i key={value} className={`aiIcon ${value}`} />
              ))}
            </div>
          </div>

          {selected.kind === "attack" ? (
            <>
              <label>
                mecanica
                <select
                  value={selected.behavior}
                  onChange={(event) =>
                    onAttackChange({ ...selected, behavior: event.target.value as AttackBehavior })
                  }
                >
                  {Object.entries(attackLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <div className="statBox">
                <strong>{selected.tier.toUpperCase()}</strong>
                <span>dano {attackStats(selected).damage}</span>
                <span>velocidad {attackStats(selected).speed.toFixed(1)}</span>
                <small>{attackTips[selected.behavior]}.</small>
              </div>
            </>
          ) : (
            <>
              <label>
                defensa
                <select
                  value={selected.behavior}
                  onChange={(event) =>
                    onDefenseChange({ ...selected, behavior: event.target.value as DefenseBehavior })
                  }
                >
                  {Object.entries(defenseLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <div className="statBox">
                <strong>{selected.tier.toUpperCase()}</strong>
                <span>vida {defenseStats(selected).hp}</span>
                <span>dura {defenseStats(selected).ttl}s</span>
                <small>{defenseTips[selected.behavior]}.</small>
              </div>
            </>
          )}

          <div className="miniDeck">
            {ownerCards.map((card) => (
              <span key={card.id} className={card.id === selected.id ? "selectedDot" : ""}>
                {card.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CharacterPick({
  player,
  state,
  onPick,
}: {
  player: PlayerId;
  state: PlayerState;
  onPick: (id: CharacterId) => void;
}) {
  return (
    <div className={`characterPick ${player}`}>
      {Object.entries(characters).map(([id, item]) => (
        <button
          key={id}
          className={state.character === id ? "active" : ""}
          onClick={() => onPick(id as CharacterId)}
        >
          <strong>{item.name}</strong>
          <span>{item.text}</span>
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [phasePlayer, setPhasePlayer] = useState<PlayerId>("p1");
  const [coverNext, setCoverNext] = useState<Screen>("pick");
  const [attacks, setAttacks] = useState<Record<PlayerId, AttackCard[]>>(initialAttacks);
  const [defenses, setDefenses] = useState<Record<PlayerId, DefenseCard[]>>(initialDefenses);
  const [selectedId, setSelectedId] = useState("p1-a1");
  const [selectedToPlay, setSelectedToPlay] = useState<GameCard>(initialAttacks.p1[0]);
  const [players, setPlayers] = useState<Record<PlayerId, PlayerState>>({
    p1: { baseHp: 100, character: "planner", shieldReady: true },
    p2: { baseHp: 100, character: "planner", shieldReady: true },
  });
  const [usedCards, setUsedCards] = useState<Record<PlayerId, string[]>>({ p1: [], p2: [] });
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [placedDefenses, setPlacedDefenses] = useState<Defense[]>([]);
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [round, setRound] = useState(1);
  const [running, setRunning] = useState(true);
  const [nextId, setNextId] = useState(1);
  const [log, setLog] = useState<string[]>(["Beta lista: empieza una partida nueva."]);

  const allCards = useMemo(
    () => [...attacks.p1, ...attacks.p2, ...defenses.p1, ...defenses.p2],
    [attacks, defenses],
  );
  const selectedForEdit = allCards.find((card) => card.id === selectedId) ?? attacks.p1[0];
  const winner = players.p1.baseHp <= 0 ? "Jugador 2" : players.p2.baseHp <= 0 ? "Jugador 1" : "";

  function addLog(message: string) {
    setLog((current) => [message, ...current].slice(0, 6));
  }

  function goPrivate(player: PlayerId, next: Screen) {
    setPhasePlayer(player);
    setCoverNext(next);
    setScreen("cover");
  }

  function enterPrivateScreen() {
    setScreen(coverNext);
    if (coverNext === "battle") {
      const firstCard = selectFirstReady(phasePlayer);
      if (firstCard) setSelectedToPlay(firstCard);
      addLog(`${playerName(phasePlayer)} tiene el turno.`);
    }
    if (coverNext === "build") {
      setSelectedId(attacks[phasePlayer][0].id);
    }
  }

  function newGame() {
    setAttacks(initialAttacks);
    setDefenses(initialDefenses);
    setPlayers({
      p1: { baseHp: 100, character: "planner", shieldReady: true },
      p2: { baseHp: 100, character: "planner", shieldReady: true },
    });
    setUsedCards({ p1: [], p2: [] });
    setProjectiles([]);
    setPlacedDefenses([]);
    setBlasts([]);
    setRound(1);
    setRunning(false);
    setNextId(1);
    setPhasePlayer("p1");
    setSelectedId("p1-a1");
    setSelectedToPlay(initialAttacks.p1[0]);
    setLog(["Nueva partida: Jugador 1 elige personaje."]);
    setScreen("pick");
  }

  function updateAttack(card: AttackCard) {
    setAttacks((current) => ({
      ...current,
      [card.owner]: current[card.owner].map((item) => (item.id === card.id ? card : item)),
    }));
    if (selectedToPlay.id === card.id) setSelectedToPlay(card);
  }

  function updateDefense(card: DefenseCard) {
    setDefenses((current) => ({
      ...current,
      [card.owner]: current[card.owner].map((item) => (item.id === card.id ? card : item)),
    }));
    if (selectedToPlay.id === card.id) setSelectedToPlay(card);
  }

  function allCardsUsed(player: PlayerId, used = usedCards) {
    const ids = [...attacks[player], ...defenses[player]].map((card) => card.id);
    return ids.every((id) => used[player].includes(id));
  }

  function selectFirstReady(player: PlayerId, used = usedCards) {
    return [...attacks[player], ...defenses[player]].find((card) => !used[player].includes(card.id));
  }

  function finishCardUse(owner: PlayerId, cardId: string) {
    const nextUsed = {
      ...usedCards,
      [owner]: Array.from(new Set([...usedCards[owner], cardId])),
    };
    setUsedCards(nextUsed);

    const p1Done = allCardsUsed("p1", nextUsed);
    const p2Done = allCardsUsed("p2", nextUsed);
    if (p1Done && p2Done) {
      window.setTimeout(() => nextRound(), 650);
      return;
    }

    if (allCardsUsed(owner, nextUsed)) {
      const next = otherPlayer(owner);
      const nextCard = selectFirstReady(next, nextUsed);
      if (nextCard) setSelectedToPlay(nextCard);
      window.setTimeout(() => goPrivate(next, "battle"), 450);
      addLog(`${playerName(owner)} gasto todas sus cartas. Turno de ${playerName(next)}.`);
      return;
    }

    const ready = selectFirstReady(owner, nextUsed);
    if (ready) setSelectedToPlay(ready);
  }

  function playLane(lane: number) {
    if (winner) return;
    if (selectedToPlay.owner !== phasePlayer || screen !== "battle") return;
    if (usedCards[phasePlayer].includes(selectedToPlay.id)) return;
    if (selectedToPlay.kind === "attack") {
      const stats = attackStats(selectedToPlay);
      const copies =
        selectedToPlay.behavior === "doble"
          ? [{ lane, offset: -2.2, power: 1 }, { lane, offset: 2.2, power: 1 }]
          : selectedToPlay.behavior === "fragmenta"
            ? [lane - 1, lane, lane + 1]
                .filter((targetLane) => targetLane >= 0 && targetLane <= 4)
                .map((targetLane) => ({ lane: targetLane, offset: 0, power: targetLane === lane ? 1 : 0.74 }))
            : [{ lane, offset: 0, power: 1 }];
      const speedBoost = players[selectedToPlay.owner].character === "striker" ? 1.16 : 1;
      const created = copies.map((copy) => ({
        id: nextId + copy.lane + copy.offset + Math.random(),
        owner: selectedToPlay.owner,
        lane: copy.lane,
        x: selectedToPlay.owner === "p1" ? 7 + copy.offset : 93 - copy.offset,
        hp: stats.hp * copy.power,
        damage: stats.damage * copy.power,
        speed: stats.speed * speedBoost,
        size: stats.size,
        tier: selectedToPlay.tier,
        behavior: selectedToPlay.behavior,
        name: selectedToPlay.name,
        art: selectedToPlay.art,
        charge: stats.charge,
      }));
      setProjectiles((current) => [...current, ...created]);
      setBlasts((current) => [
        ...current,
        {
          id: nextId + 500,
          lane,
          x: selectedToPlay.owner === "p1" ? 8 : 92,
          ttl: 8,
          color: primaryColor(selectedToPlay.art, "#facc15"),
          label: "LANZA",
          kind: "cast",
        },
      ]);
      setNextId((id) => id + 3);
      addLog(`${playerName(selectedToPlay.owner)} lanzo ${selectedToPlay.name} en carril ${lane + 1}.`);
      finishCardUse(selectedToPlay.owner, selectedToPlay.id);
      return;
    }

    const stats = defenseStats(selectedToPlay);
    const duplicate = placedDefenses.some(
      (item) => item.owner === selectedToPlay.owner && item.lane === lane,
    );
    if (duplicate) return;
    setPlacedDefenses((current) => [
      ...current,
      {
        id: nextId,
        owner: selectedToPlay.owner,
        lane,
        hp: stats.hp,
        ttl: stats.ttl,
        tier: selectedToPlay.tier,
        behavior: selectedToPlay.behavior,
        name: selectedToPlay.name,
        art: selectedToPlay.art,
      },
    ]);
    setNextId((id) => id + 1);
    updateDefense({ ...selectedToPlay, used: true });
    setBlasts((current) => [
      ...current,
      {
        id: nextId + 700,
        lane,
        x: selectedToPlay.owner === "p1" ? 14 : 82,
        ttl: 8,
        color: primaryColor(selectedToPlay.art, "#38bdf8"),
        label: "DEF",
        kind: "cast",
      },
    ]);
    addLog(`${playerName(selectedToPlay.owner)} puso ${selectedToPlay.name} en carril ${lane + 1}.`);
    finishCardUse(selectedToPlay.owner, selectedToPlay.id);
  }

  function resetMatch() {
    newGame();
  }

  function nextRound() {
    setRound((value) => value + 1);
    setProjectiles([]);
    setPlacedDefenses((current) => current.filter((item) => item.ttl > 8));
    setUsedCards({ p1: [], p2: [] });
    setDefenses((current) => ({
      p1: current.p1.map((card) => ({ ...card, used: false })),
      p2: current.p2.map((card) => ({ ...card, used: false })),
    }));
    setPhasePlayer("p1");
    setSelectedToPlay(attacks.p1[0]);
    goPrivate("p1", "battle");
    addLog(`Ronda ${round + 1}: todas las cartas vuelven a estar disponibles.`);
  }

  function pickCharacter(player: PlayerId, id: CharacterId) {
    setPlayers((current) => {
      const bonusHp = id === "tank" ? 115 : 100;
      return {
        ...current,
        [player]: {
          ...current[player],
          character: id,
          baseHp: Math.max(current[player].baseHp, bonusHp),
        },
      };
    });
  }

  function finishPick() {
    addLog(`${playerName(phasePlayer)} eligio ${characters[players[phasePlayer].character].name}.`);
    if (phasePlayer === "p1") goPrivate("p2", "pick");
    else goPrivate("p1", "build");
  }

  function finishBuild() {
    addLog(`${playerName(phasePlayer)} cerro sus cartas.`);
    if (phasePlayer === "p1") goPrivate("p2", "build");
    else {
      setRunning(true);
      goPrivate("p1", "battle");
    }
  }

  function changeTurn() {
    const next = otherPlayer(phasePlayer);
    setRunning(false);
    goPrivate(next, "battle");
  }

  function continueBattle() {
    setRunning(true);
    enterPrivateScreen();
  }

  useEffect(() => {
    if (!running || winner || screen !== "battle") return;
    const timer = window.setInterval(() => {
      setBlasts((current) => current.map((item) => ({ ...item, ttl: item.ttl - 1 })).filter((item) => item.ttl > 0));
      setPlacedDefenses((current) =>
        current.map((item) => ({ ...item, ttl: item.ttl - 0.25 })).filter((item) => item.ttl > 0 && item.hp > 0),
      );

      setProjectiles((current) => {
        const next = current
          .map((shot) => {
            if (shot.charge > 0) return { ...shot, charge: shot.charge - 0.25 };
            return {
              ...shot,
              x: shot.owner === "p1" ? shot.x + shot.speed : shot.x - shot.speed,
            };
          })
          .filter((shot) => shot.hp > 0);

        const changed = [...next];
        const newBlasts: Blast[] = [];
        const defenseDamage = new Map<number, number>();
        const reflected: Projectile[] = [];
        const baseDamage: Partial<Record<PlayerId, number>> = { p1: 0, p2: 0 };

        for (let i = 0; i < changed.length; i += 1) {
          const shot = changed[i];
          if (!shot) continue;
          const targetOwner: PlayerId = shot.owner === "p1" ? "p2" : "p1";
          const defenseX = targetOwner === "p1" ? 14 : 82;
          const defense = placedDefenses.find(
            (item) => item.owner === targetOwner && item.lane === shot.lane && Math.abs(defenseX - shot.x) < 8,
          );
          if (defense) {
            const pierce = shot.behavior === "rompedefensa";
            const dealt = pierce ? shot.damage * 1.7 : shot.damage;
            defenseDamage.set(defense.id, (defenseDamage.get(defense.id) ?? 0) + dealt);
            changed[i] = { ...shot, hp: pierce ? shot.hp - 8 : 0 };
            newBlasts.push({
              id: nextId + i,
              lane: shot.lane,
              x: shot.x,
              ttl: 6,
              color: primaryColor(shot.art, "#facc15"),
              label: pierce ? "ROMPE" : "HIT",
              kind: "hit",
            });
            if (defense.behavior === "reflector" && shot.tier !== "hyper") {
              reflected.push({
                ...shot,
                id: nextId + 50 + i,
                owner: targetOwner,
                hp: Math.max(3, shot.hp / 2),
                damage: Math.max(4, shot.damage / 2),
                x: targetOwner === "p1" ? 16 : 84,
                charge: 0,
              });
            }
            if (defense.behavior === "absorbe") {
              setPlayers((playersNow) => ({
                ...playersNow,
                [targetOwner]: {
                  ...playersNow[targetOwner],
                  baseHp: clamp(playersNow[targetOwner].baseHp + 3, 0, 130),
                },
              }));
            }
          }
        }

        for (let i = 0; i < changed.length; i += 1) {
          for (let j = i + 1; j < changed.length; j += 1) {
            const a = changed[i];
            const b = changed[j];
            if (!a || !b || a.owner === b.owner || a.lane !== b.lane || Math.abs(a.x - b.x) > 5) continue;
            const aDamage = a.behavior === "anulador" ? a.damage * 1.75 : a.damage;
            const bDamage = b.behavior === "anulador" ? b.damage * 1.75 : b.damage;
            changed[i] = { ...a, hp: a.hp - bDamage };
            changed[j] = { ...b, hp: b.hp - aDamage };
            newBlasts.push({
              id: nextId + 100 + i + j,
              lane: a.lane,
              x: (a.x + b.x) / 2,
              ttl: 5,
              color: "#ffffff",
              label: "CHOQUE",
              kind: "hit",
            });
          }
        }

        const survived = [...changed, ...reflected].filter((shot) => {
          if (shot.owner === "p1" && shot.x >= 97) {
            baseDamage.p2 = (baseDamage.p2 ?? 0) + shot.damage;
            newBlasts.push({
              id: nextId + 800 + shot.id,
              lane: shot.lane,
              x: 96,
              ttl: 8,
              color: primaryColor(shot.art, "#fb7185"),
              label: `-${Math.round(shot.damage)}`,
              kind: "base",
            });
            return false;
          }
          if (shot.owner === "p2" && shot.x <= 3) {
            baseDamage.p1 = (baseDamage.p1 ?? 0) + shot.damage;
            newBlasts.push({
              id: nextId + 900 + shot.id,
              lane: shot.lane,
              x: 4,
              ttl: 8,
              color: primaryColor(shot.art, "#38bdf8"),
              label: `-${Math.round(shot.damage)}`,
              kind: "base",
            });
            return false;
          }
          return shot.x > -8 && shot.x < 108 && shot.hp > 0;
        });

        if ((baseDamage.p1 ?? 0) > 0 || (baseDamage.p2 ?? 0) > 0) {
          setPlayers((playersNow) => {
            const blockP1 = playersNow.p1.character === "shield" && playersNow.p1.shieldReady && (baseDamage.p1 ?? 0) >= 25;
            const blockP2 = playersNow.p2.character === "shield" && playersNow.p2.shieldReady && (baseDamage.p2 ?? 0) >= 25;
            return {
              p1: {
                ...playersNow.p1,
                baseHp: clamp(playersNow.p1.baseHp - (blockP1 ? 0 : baseDamage.p1 ?? 0), 0, 130),
                shieldReady: blockP1 ? false : playersNow.p1.shieldReady,
              },
              p2: {
                ...playersNow.p2,
                baseHp: clamp(playersNow.p2.baseHp - (blockP2 ? 0 : baseDamage.p2 ?? 0), 0, 130),
                shieldReady: blockP2 ? false : playersNow.p2.shieldReady,
              },
            };
          });
        }

        if (defenseDamage.size > 0) {
          setPlacedDefenses((defs) =>
            defs.map((item) => ({ ...item, hp: item.hp - (defenseDamage.get(item.id) ?? 0) })),
          );
        }
        if (newBlasts.length > 0) setBlasts((currentBlasts) => [...currentBlasts, ...newBlasts]);
        return survived;
      });
    }, 250);

    return () => window.clearInterval(timer);
  }, [running, winner, placedDefenses, nextId, screen]);

  return (
    <main className={`app ${screen === "battle" ? "battleApp" : ""}`}>
      <header className="hud">
        <div>
          <span className="eyebrow">Beta local 1 vs 1</span>
          <h1>Card Lane Duel</h1>
        </div>
        <nav className="tabs" aria-label="Menu">
          <button className={screen === "menu" ? "active" : ""} onClick={() => setScreen("menu")}>menu</button>
          <button className={screen === "rules" ? "active" : ""} onClick={() => setScreen("rules")}>reglas</button>
          <button onClick={newGame}>nuevo juego</button>
        </nav>
      </header>

      {screen === "menu" && <MenuScreen onStart={newGame} onRules={() => setScreen("rules")} />}

      {screen === "cover" && (
        <CoverScreen
          player={phasePlayer}
          next={coverNext}
          onEnter={coverNext === "battle" ? continueBattle : enterPrivateScreen}
        />
      )}

      {screen === "pick" && (
        <PickScreen
          player={phasePlayer}
          state={players[phasePlayer]}
          onPick={(id) => pickCharacter(phasePlayer, id)}
          onDone={finishPick}
        />
      )}

      {screen === "build" && (
        <section className="buildScreen">
          <div className="buildIntro">
            <span className="eyebrow">{playerName(phasePlayer)}</span>
            <h2>Crea tus cartas en secreto</h2>
            <p>Prepara 2 normales, 1 super, 1 hiper y tus 2 defensas. Cuando termines pulsa pasar.</p>
          </div>
          <div className="buildGrid">
            <div className={`cardsColumn ${phasePlayer}`}>
              <h2>Tu mazo</h2>
              <Deck
                attacks={attacks[phasePlayer]}
                defenses={defenses[phasePlayer]}
                selected={selectedForEdit}
                onSelect={(card) => setSelectedId(card.id)}
                onEdit={(card) => setSelectedId(card.id)}
              />
            </div>
            <CardEditor
              selected={selectedForEdit.owner === phasePlayer ? selectedForEdit : attacks[phasePlayer][0]}
              attacks={attacks}
              defenses={defenses}
              onAttackChange={updateAttack}
              onDefenseChange={updateDefense}
            />
            <div className="secretPanel">
              <span>cartas enemigas ocultas</span>
              <strong>????</strong>
              <p>Esta pantalla es solo para {playerName(phasePlayer)}. El otro jugador no deberia mirar hasta que pulses pasar.</p>
              <button className="resetButton" onClick={finishBuild}>pasar al otro jugador</button>
            </div>
          </div>
        </section>
      )}

      {screen === "battle" && (
        <section className="gameTable">
          <div className="tableTop">
            <PlayerStatus player="p1" state={players.p1} />
            <OpponentSeat player={otherPlayer(phasePlayer)} used={usedCards[otherPlayer(phasePlayer)].length} />
            <PlayerStatus player="p2" state={players.p2} />
          </div>

          <section className="arenaPanel tableArena">
            <div className="roundBar">
              <button onClick={() => setRunning((value) => !value)}>{running ? "pausar" : "seguir"}</button>
              <strong>Ronda {round}</strong>
              <span>pista central</span>
            </div>

            <div className="arenaBoard">
              <div className="base p1">
                <span>{Math.round(players.p1.baseHp)}</span>
              </div>
              <div className="base p2">
                <span>{Math.round(players.p2.baseHp)}</span>
              </div>

              {lanes.map((lane) => (
                <button key={lane} className="lane" onClick={() => playLane(lane)}>
                  <span className="laneNumber">{lane + 1}</span>
                  {placedDefenses
                    .filter((item) => item.lane === lane)
                    .map((item) => (
                      <span
                        key={item.id}
                        className={`defenseToken ${item.owner}`}
                        style={{ left: `${item.owner === "p1" ? 14 : 82}%` }}
                        title={`${item.name} ${Math.round(item.hp)} vida`}
                      >
                        <PixelSprite art={item.art} small />
                        <b>{Math.round(item.hp)}</b>
                      </span>
                    ))}
                  {projectiles
                    .filter((item) => item.lane === lane)
                    .map((item) => (
                      <span
                        key={item.id}
                        className={`shot ${item.owner} ${item.tier} ${item.behavior} ${item.charge > 0 ? "charging" : ""}`}
                        style={{ left: `${item.x}%`, width: item.size, height: item.size }}
                        title={item.name}
                      >
                        <PixelSprite art={item.art} small />
                      </span>
                    ))}
                  {blasts
                    .filter((item) => item.lane === lane)
                    .map((item) => (
                      <span
                        key={item.id}
                        className={`blast ${item.kind ?? "hit"}`}
                        style={{ left: `${item.x}%`, backgroundColor: item.color }}
                      >
                        {item.label && <em>{item.label}</em>}
                      </span>
                    ))}
                </button>
              ))}
              {winner && <div className="winner">{winner} gana</div>}
            </div>
          </section>

          <section className="playerHand">
            <div className="handHeader">
              <div className="turnBanner">
                <span>mano actual</span>
                <strong>{playerName(phasePlayer)}</strong>
              </div>
              <div className="selectedPlay">
                <PixelSprite art={selectedToPlay.art} small />
                <span>
                  seleccionada: <strong>{selectedToPlay.name}</strong>
                </span>
                <small>
                  {selectedToPlay.kind === "attack"
                    ? `${selectedToPlay.tier} / ${attackLabels[selectedToPlay.behavior]}`
                    : `${selectedToPlay.tier} / ${defenseLabels[selectedToPlay.behavior]}`}
                </small>
              </div>
              <button className="resetButton" onClick={changeTurn}>cambiar turno</button>
            </div>
            <Deck
              attacks={attacks[phasePlayer]}
              defenses={defenses[phasePlayer]}
              selected={selectedToPlay}
              usedIds={usedCards[phasePlayer]}
              allowEdit={false}
              onSelect={(card) => setSelectedToPlay(card)}
              onEdit={() => undefined}
            />
            <div className="battleLog tableLog">
              <span className="deckLabel">bitacora</span>
              {log.slice(0, 3).map((entry) => <p key={entry}>{entry}</p>)}
            </div>
          </section>
        </section>
      )}

      {screen === "rules" && (
        <section className="rulesScreen">
          <div className="ruleCard">
            <span>1</span>
            <h2>Siempre 1 vs 1</h2>
            <p>Dos bases, cinco carriles, sin caminar por el mapa y sin muros creados por cartas.</p>
          </div>
          <div className="ruleCard">
            <span>2</span>
            <h2>Cartas por ronda</h2>
            <p>Primero cada jugador crea sus cartas en privado. En batalla una carta usada queda gastada hasta la siguiente ronda.</p>
          </div>
          <div className="ruleCard">
            <span>3</span>
            <h2>Defensas especiales</h2>
            <p>Hay 2 defensas por jugador: una normal y una hiper. Se colocan en carriles y con el tiempo desaparecen.</p>
          </div>
          <div className="ruleCard">
            <span>4</span>
            <h2>Dibujo libre, reglas claras</h2>
            <p>Dibujas el sprite en pixel art. El juego solo necesita saber su comportamiento para animarlo y balancearlo.</p>
          </div>
          <button className="resetButton" onClick={resetMatch}>empezar partida nueva</button>
        </section>
      )}
    </main>
  );
}

function MenuScreen({ onStart, onRules }: { onStart: () => void; onRules: () => void }) {
  return (
    <section className="menuScreen">
      <div className="menuHero">
        <span className="eyebrow">duelo local por turnos</span>
        <h2>Crea cartas secretas y rompe la base rival.</h2>
        <p>Beta de prueba: eliges personaje, dibujas tus cartas desde cero, las bloqueas y luego peleas por cinco carriles.</p>
        <div className="menuActions">
          <button onClick={onStart}>empezar juego nuevo</button>
          <button onClick={onRules}>ver reglas</button>
        </div>
      </div>
    </section>
  );
}

function CoverScreen({
  player,
  next,
  onEnter,
}: {
  player: PlayerId;
  next: Screen;
  onEnter: () => void;
}) {
  const action = next === "pick" ? "elegir personaje" : next === "build" ? "crear cartas" : "jugar turno";
  return (
    <section className="coverScreen">
      <span className="eyebrow">pantalla privada</span>
      <h2>Que mire solo {playerName(player)}</h2>
      <p>El otro jugador debe apartarse un momento. Al pulsar el boton se mostrara su parte secreta para {action}.</p>
      <button onClick={onEnter}>soy {playerName(player)}</button>
    </section>
  );
}

function PickScreen({
  player,
  state,
  onPick,
  onDone,
}: {
  player: PlayerId;
  state: PlayerState;
  onPick: (id: CharacterId) => void;
  onDone: () => void;
}) {
  return (
    <section className="pickScreen">
      <div className="buildIntro">
        <span className="eyebrow">{playerName(player)}</span>
        <h2>Elige personaje antes de crear cartas</h2>
        <p>Cada personaje cambia la partida un poco. Todavia son simples, pero ya dan identidad al estilo de juego.</p>
      </div>
      <CharacterPick player={player} state={state} onPick={onPick} />
      <button className="resetButton" onClick={onDone}>confirmar personaje</button>
    </section>
  );
}

function OpponentSeat({ player, used }: { player: PlayerId; used: number }) {
  const remaining = Math.max(0, 6 - used);
  return (
    <div className={`opponentSeat ${player}`}>
      <span>{playerName(player)}</span>
      <strong>{remaining} cartas</strong>
      <div className="hiddenHand" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <i key={index} className={index >= remaining ? "gone" : ""} />
        ))}
      </div>
    </div>
  );
}

function PlayerStatus({ player, state }: { player: PlayerId; state: PlayerState }) {
  return (
    <div className={`playerStatus ${player}`}>
      <span>{player === "p1" ? "Jugador 1" : "Jugador 2"}</span>
      <strong>{characters[state.character].name}</strong>
      <div className="bars">
        <label>
          base
          <i><b style={{ width: `${clamp(state.baseHp, 0, 115) / 1.15}%` }} /></i>
        </label>
        <label>
          escudo
          <i><b style={{ width: state.shieldReady ? "100%" : "0%" }} /></i>
        </label>
      </div>
    </div>
  );
}

function Deck({
  attacks,
  defenses,
  selected,
  usedIds = [],
  allowEdit = true,
  onSelect,
  onEdit,
}: {
  attacks: AttackCard[];
  defenses: DefenseCard[];
  selected: GameCard;
  usedIds?: string[];
  allowEdit?: boolean;
  onSelect: (card: GameCard) => void;
  onEdit: (card: GameCard) => void;
}) {
  return (
    <div className="deck">
      <div className="deckGroup">
        <span className="deckLabel">ataques</span>
        {attacks.map((card) => (
          <div key={card.id} className="cardWrap">
            <CardView card={card} active={selected.id === card.id} spent={usedIds.includes(card.id)} onClick={() => !usedIds.includes(card.id) && onSelect(card)} />
            {allowEdit && <button className="editMini" onClick={() => onEdit(card)}>editar</button>}
          </div>
        ))}
      </div>
      <div className="deckGroup">
        <span className="deckLabel">defensas</span>
        {defenses.map((card) => (
          <div key={card.id} className="cardWrap">
            <CardView card={card} active={selected.id === card.id} spent={usedIds.includes(card.id)} onClick={() => !usedIds.includes(card.id) && onSelect(card)} />
            {allowEdit && <button className="editMini" onClick={() => onEdit(card)}>editar</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
