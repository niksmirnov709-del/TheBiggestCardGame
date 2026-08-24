"use client";

import { useEffect, useMemo, useState } from "react";

type PlayerId = "p1" | "p2";
type Tab = "arena" | "cartas" | "reglas";
type AttackTier = "normal" | "super" | "hyper";
type DefenseTier = "normal" | "hyper";
type AttackBehavior = "rapido" | "pesado" | "doble" | "cargado" | "rompedefensa";
type DefenseBehavior = "bloqueo" | "reflector" | "absorbe";
type CharacterId = "planner" | "tank" | "shield" | "charger";

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
};

type PlayerState = {
  baseHp: number;
  energy: number;
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
};

const defenseLabels: Record<DefenseBehavior, string> = {
  bloqueo: "bloqueo",
  reflector: "reflector",
  absorbe: "absorbe energia",
};

const characters: Record<CharacterId, { name: string; text: string }> = {
  planner: {
    name: "Estratega",
    text: "puede llevar 5 cartas de ataque cuando lo activemos",
  },
  tank: {
    name: "Tanque",
    text: "empieza con mas vida de base",
  },
  shield: {
    name: "Guardian",
    text: "tiene un escudo de emergencia una vez por partida",
  },
  charger: {
    name: "Cargador",
    text: "genera energia un poco mas rapido",
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
    { id: "p1-a1", owner: "p1", kind: "attack", tier: "normal", name: "Chispa", behavior: "rapido", art: art.bolt },
    { id: "p1-a2", owner: "p1", kind: "attack", tier: "normal", name: "Astilla", behavior: "doble", art: art.shard },
    { id: "p1-a3", owner: "p1", kind: "attack", tier: "super", name: "Cometa", behavior: "pesado", art: art.comet },
    { id: "p1-a4", owner: "p1", kind: "attack", tier: "hyper", name: "Taladro Hiper", behavior: "rompedefensa", art: art.drill },
  ],
  p2: [
    { id: "p2-a1", owner: "p2", kind: "attack", tier: "normal", name: "Rayo Rosa", behavior: "rapido", art: tint(art.bolt, "#ec4899") },
    { id: "p2-a2", owner: "p2", kind: "attack", tier: "normal", name: "Eco Doble", behavior: "doble", art: tint(art.shard, "#22c55e") },
    { id: "p2-a3", owner: "p2", kind: "attack", tier: "super", name: "Bomba Pixel", behavior: "cargado", art: tint(art.comet, "#a855f7") },
    { id: "p2-a4", owner: "p2", kind: "attack", tier: "hyper", name: "Perforador", behavior: "rompedefensa", art: art.drill },
  ],
};

const initialDefenses: Record<PlayerId, DefenseCard[]> = {
  p1: [
    { id: "p1-d1", owner: "p1", kind: "defense", tier: "normal", name: "Barrera", behavior: "bloqueo", art: art.wall, used: false },
    { id: "p1-d2", owner: "p1", kind: "defense", tier: "hyper", name: "Prisma", behavior: "reflector", art: art.prism, used: false },
  ],
  p2: [
    { id: "p2-d1", owner: "p2", kind: "defense", tier: "normal", name: "Muro Rosa", behavior: "bloqueo", art: tint(art.wall, "#ec4899"), used: false },
    { id: "p2-d2", owner: "p2", kind: "defense", tier: "hyper", name: "Absorbe", behavior: "absorbe", art: tint(art.prism, "#22c55e"), used: false },
  ],
};

function tint(source: PixelArt, color: string): PixelArt {
  return source.map((pixel) => (pixel && pixel !== "#ffffff" ? color : pixel));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function attackStats(card: AttackCard) {
  const tier = {
    normal: { cost: 2, damage: 11, hp: 10, speed: 8, size: 22, charge: 0 },
    super: { cost: 5, damage: 25, hp: 24, speed: 4.8, size: 28, charge: 0 },
    hyper: { cost: 8, damage: 42, hp: 38, speed: 3.7, size: 34, charge: 0 },
  }[card.tier];

  const behavior = {
    rapido: { cost: 0, damage: -2, hp: -2, speed: 2.7, charge: 0 },
    pesado: { cost: 1, damage: 9, hp: 10, speed: -2, charge: 0 },
    doble: { cost: 1, damage: -4, hp: -3, speed: 0.4, charge: 0 },
    cargado: { cost: 0, damage: 12, hp: 3, speed: -1, charge: 1.2 },
    rompedefensa: { cost: 1, damage: 4, hp: 8, speed: -1.2, charge: 0.3 },
  }[card.behavior];

  return {
    cost: tier.cost + behavior.cost,
    damage: Math.max(4, tier.damage + behavior.damage),
    hp: Math.max(3, tier.hp + behavior.hp),
    speed: Math.max(1.8, tier.speed + behavior.speed),
    size: tier.size,
    charge: tier.charge + behavior.charge,
  };
}

function defenseStats(card: DefenseCard) {
  const tier = card.tier === "hyper" ? { hp: 76, ttl: 24, cost: 0 } : { hp: 38, ttl: 16, cost: 0 };
  const behavior = {
    bloqueo: { hp: 18, ttl: 0 },
    reflector: { hp: -6, ttl: -4 },
    absorbe: { hp: -2, ttl: 5 },
  }[card.behavior];
  return {
    hp: Math.max(14, tier.hp + behavior.hp),
    ttl: Math.max(8, tier.ttl + behavior.ttl),
    cost: tier.cost,
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

  function mirror() {
    const next = [...emptyArt];
    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        next[y * gridSize + x] = artPixels[y * gridSize + (gridSize - 1 - x)];
      }
    }
    onChange(next);
  }

  return (
    <div className="pixelEditor">
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
              else paint(index);
            }}
            onPointerEnter={() => {
              if (painting) paint(index);
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
        <button className="toolButton" onClick={mirror}>espejo</button>
      </div>
    </div>
  );
}

function CardView({
  card,
  active,
  onClick,
}: {
  card: GameCard;
  active?: boolean;
  onClick: () => void;
}) {
  const label = card.kind === "attack" ? card.tier : `${card.tier} defensa`;
  return (
    <button className={`card ${card.owner} ${active ? "active" : ""}`} onClick={onClick}>
      <PixelSprite art={card.art} />
      <span className="cardName">{card.name}</span>
      <span className="cardMeta">{label}</span>
      {card.kind === "attack" ? (
        <span className="cardCost">{attackStats(card).cost}</span>
      ) : (
        <span className={card.used ? "cardUsed" : "cardCost"}>{card.used ? "usada" : "def"}</span>
      )}
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
                <span>coste {attackStats(selected).cost}</span>
                <span>dano {attackStats(selected).damage}</span>
                <span>velocidad {attackStats(selected).speed.toFixed(1)}</span>
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
  const [tab, setTab] = useState<Tab>("arena");
  const [attacks, setAttacks] = useState<Record<PlayerId, AttackCard[]>>(initialAttacks);
  const [defenses, setDefenses] = useState<Record<PlayerId, DefenseCard[]>>(initialDefenses);
  const [selectedId, setSelectedId] = useState("p1-a1");
  const [selectedToPlay, setSelectedToPlay] = useState<GameCard>(initialAttacks.p1[0]);
  const [players, setPlayers] = useState<Record<PlayerId, PlayerState>>({
    p1: { baseHp: 100, energy: 6, character: "planner", shieldReady: true },
    p2: { baseHp: 115, energy: 6, character: "tank", shieldReady: true },
  });
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [placedDefenses, setPlacedDefenses] = useState<Defense[]>([]);
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [round, setRound] = useState(1);
  const [running, setRunning] = useState(true);
  const [nextId, setNextId] = useState(1);

  const allCards = useMemo(
    () => [...attacks.p1, ...attacks.p2, ...defenses.p1, ...defenses.p2],
    [attacks, defenses],
  );
  const selectedForEdit = allCards.find((card) => card.id === selectedId) ?? attacks.p1[0];
  const winner = players.p1.baseHp <= 0 ? "Jugador 2" : players.p2.baseHp <= 0 ? "Jugador 1" : "";

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

  function spendEnergy(owner: PlayerId, cost: number) {
    let ok = false;
    setPlayers((current) => {
      if (current[owner].energy < cost) return current;
      ok = true;
      return {
        ...current,
        [owner]: { ...current[owner], energy: current[owner].energy - cost },
      };
    });
    return ok;
  }

  function playLane(lane: number) {
    if (winner) return;
    if (selectedToPlay.kind === "attack") {
      const stats = attackStats(selectedToPlay);
      if (!spendEnergy(selectedToPlay.owner, stats.cost)) return;
      const copies = selectedToPlay.behavior === "doble" ? [-2.2, 2.2] : [0];
      const created = copies.map((offset) => ({
        id: nextId + offset + Math.random(),
        owner: selectedToPlay.owner,
        lane,
        x: selectedToPlay.owner === "p1" ? 7 + offset : 93 - offset,
        hp: stats.hp,
        damage: stats.damage,
        speed: stats.speed,
        size: stats.size,
        tier: selectedToPlay.tier,
        behavior: selectedToPlay.behavior,
        name: selectedToPlay.name,
        art: selectedToPlay.art,
        charge: stats.charge,
      }));
      setProjectiles((current) => [...current, ...created]);
      setNextId((id) => id + 3);
      return;
    }

    if (selectedToPlay.used) return;
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
  }

  function resetMatch() {
    setPlayers({
      p1: { baseHp: 100, energy: 6, character: "planner", shieldReady: true },
      p2: { baseHp: 115, energy: 6, character: "tank", shieldReady: true },
    });
    setProjectiles([]);
    setPlacedDefenses([]);
    setBlasts([]);
    setRound(1);
    setRunning(true);
    setDefenses(initialDefenses);
  }

  function nextRound() {
    setRound((value) => value + 1);
    setProjectiles([]);
    setPlacedDefenses((current) => current.filter((item) => item.ttl > 8));
    setPlayers((current) => ({
      p1: { ...current.p1, energy: 7 },
      p2: { ...current.p2, energy: 7 },
    }));
    setDefenses((current) => ({
      p1: current.p1.map((card) => ({ ...card, used: false })),
      p2: current.p2.map((card) => ({ ...card, used: false })),
    }));
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

  useEffect(() => {
    if (!running || winner) return;
    const timer = window.setInterval(() => {
      setPlayers((current) => {
        const p1Gain = current.p1.character === "charger" ? 0.45 : 0.32;
        const p2Gain = current.p2.character === "charger" ? 0.45 : 0.32;
        return {
          p1: { ...current.p1, energy: clamp(current.p1.energy + p1Gain, 0, 10) },
          p2: { ...current.p2, energy: clamp(current.p2.energy + p2Gain, 0, 10) },
        };
      });

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
                  energy: clamp(playersNow[targetOwner].energy + 0.5, 0, 10),
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
            changed[i] = { ...a, hp: a.hp - b.damage };
            changed[j] = { ...b, hp: b.hp - a.damage };
            newBlasts.push({
              id: nextId + 100 + i + j,
              lane: a.lane,
              x: (a.x + b.x) / 2,
              ttl: 5,
              color: "#ffffff",
            });
          }
        }

        const survived = [...changed, ...reflected].filter((shot) => {
          if (shot.owner === "p1" && shot.x >= 97) {
            baseDamage.p2 = (baseDamage.p2 ?? 0) + shot.damage;
            return false;
          }
          if (shot.owner === "p2" && shot.x <= 3) {
            baseDamage.p1 = (baseDamage.p1 ?? 0) + shot.damage;
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
  }, [running, winner, placedDefenses, nextId]);

  return (
    <main className="app">
      <header className="hud">
        <div>
          <span className="eyebrow">Prueba de idea</span>
          <h1>Card Lane Duel</h1>
        </div>
        <nav className="tabs" aria-label="Pantallas">
          {(["arena", "cartas", "reglas"] as Tab[]).map((item) => (
            <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </nav>
      </header>

      {tab === "arena" && (
        <section className="battleLayout">
          <aside className="sidePanel left">
            <PlayerStatus player="p1" state={players.p1} />
            <CharacterPick player="p1" state={players.p1} onPick={(id) => pickCharacter("p1", id)} />
            <Deck
              attacks={attacks.p1}
              defenses={defenses.p1}
              selected={selectedToPlay}
              onSelect={(card) => setSelectedToPlay(card)}
              onEdit={(card) => {
                setSelectedId(card.id);
                setTab("cartas");
              }}
            />
          </aside>

          <section className="arenaPanel">
            <div className="roundBar">
              <button onClick={() => setRunning((value) => !value)}>{running ? "pausar" : "seguir"}</button>
              <strong>Ronda {round}</strong>
              <button onClick={nextRound}>siguiente ronda</button>
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
                        className={`shot ${item.owner} ${item.tier} ${item.charge > 0 ? "charging" : ""}`}
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
                        className="blast"
                        style={{ left: `${item.x}%`, backgroundColor: item.color }}
                      />
                    ))}
                </button>
              ))}
              {winner && <div className="winner">{winner} gana</div>}
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
          </section>

          <aside className="sidePanel right">
            <PlayerStatus player="p2" state={players.p2} />
            <CharacterPick player="p2" state={players.p2} onPick={(id) => pickCharacter("p2", id)} />
            <Deck
              attacks={attacks.p2}
              defenses={defenses.p2}
              selected={selectedToPlay}
              onSelect={(card) => setSelectedToPlay(card)}
              onEdit={(card) => {
                setSelectedId(card.id);
                setTab("cartas");
              }}
            />
          </aside>
        </section>
      )}

      {tab === "cartas" && (
        <section className="cardsScreen">
          <div className="cardsColumn">
            <h2>Jugador 1</h2>
            <Deck
              attacks={attacks.p1}
              defenses={defenses.p1}
              selected={selectedForEdit}
              onSelect={(card) => setSelectedId(card.id)}
              onEdit={(card) => setSelectedId(card.id)}
            />
          </div>
          <CardEditor
            selected={selectedForEdit}
            attacks={attacks}
            defenses={defenses}
            onAttackChange={updateAttack}
            onDefenseChange={updateDefense}
          />
          <div className="cardsColumn">
            <h2>Jugador 2</h2>
            <Deck
              attacks={attacks.p2}
              defenses={defenses.p2}
              selected={selectedForEdit}
              onSelect={(card) => setSelectedId(card.id)}
              onEdit={(card) => setSelectedId(card.id)}
            />
          </div>
        </section>
      )}

      {tab === "reglas" && (
        <section className="rulesScreen">
          <div className="ruleCard">
            <span>1</span>
            <h2>Siempre 1 vs 1</h2>
            <p>Dos bases, cinco carriles, sin caminar por el mapa y sin muros creados por cartas.</p>
          </div>
          <div className="ruleCard">
            <span>2</span>
            <h2>Cartas por ronda</h2>
            <p>Cada jugador usa 2 ataques normales, 1 super y 1 hiper. La siguiente ronda puede cambiar la idea.</p>
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
          <button className="resetButton" onClick={resetMatch}>reiniciar partida</button>
        </section>
      )}
    </main>
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
          energia
          <i><b style={{ width: `${state.energy * 10}%` }} /></i>
        </label>
      </div>
    </div>
  );
}

function Deck({
  attacks,
  defenses,
  selected,
  onSelect,
  onEdit,
}: {
  attacks: AttackCard[];
  defenses: DefenseCard[];
  selected: GameCard;
  onSelect: (card: GameCard) => void;
  onEdit: (card: GameCard) => void;
}) {
  return (
    <div className="deck">
      <div className="deckGroup">
        <span className="deckLabel">ataques</span>
        {attacks.map((card) => (
          <div key={card.id} className="cardWrap">
            <CardView card={card} active={selected.id === card.id} onClick={() => onSelect(card)} />
            <button className="editMini" onClick={() => onEdit(card)}>editar</button>
          </div>
        ))}
      </div>
      <div className="deckGroup">
        <span className="deckLabel">defensas</span>
        {defenses.map((card) => (
          <div key={card.id} className="cardWrap">
            <CardView card={card} active={selected.id === card.id} onClick={() => onSelect(card)} />
            <button className="editMini" onClick={() => onEdit(card)}>editar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
