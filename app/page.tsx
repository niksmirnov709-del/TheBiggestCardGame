"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type FighterId = "p1" | "p2";
type Phase = "studio" | "battle";
type AttackShape = "projectile" | "beam" | "burst" | "trap";
type AttackEffect = "push" | "burn" | "slow" | "pierce";

type Fighter = {
  name: string;
  ink: string;
  image: string;
  hand: { x: number; y: number };
};

type AttackDraft = {
  name: string;
  fantasy: string;
  shape: AttackShape;
  effect: AttackEffect;
  power: number;
};

type Ruleset = {
  damage: number;
  cooldown: number;
  speed: number;
  size: number;
  energyCost: number;
  warning: string;
  corrections: string[];
};

type PlayerState = {
  x: number;
  y: number;
  vx: number;
  hp: number;
  energy: number;
  facing: number;
  cooldown: number;
  windup: number;
  shield: number;
  lastHit: number;
};

type Projectile = {
  owner: FighterId;
  x: number;
  y: number;
  vx: number;
  life: number;
  size: number;
  damage: number;
  effect: AttackEffect;
  trail: string;
};

const defaultFighters: Record<FighterId, Fighter> = {
  p1: {
    name: "Jugador 1",
    ink: "#1d4ed8",
    image: "",
    hand: { x: 152, y: 96 },
  },
  p2: {
    name: "Jugador 2",
    ink: "#be123c",
    image: "",
    hand: { x: 72, y: 96 },
  },
};

const defaultAttacks: Record<FighterId, AttackDraft> = {
  p1: {
    name: "Rayo Mandoble",
    fantasy: "Saca la mano, junta pintura azul y dispara una espada de energia.",
    shape: "projectile",
    effect: "push",
    power: 5,
  },
  p2: {
    name: "Bomba Garabato",
    fantasy: "Tira una mancha viva que explota y deja lento al enemigo.",
    shape: "burst",
    effect: "slow",
    power: 6,
  },
};

const effectLabels: Record<AttackEffect, string> = {
  push: "empuja",
  burn: "quema",
  slow: "ralentiza",
  pierce: "atraviesa",
};

const shapeLabels: Record<AttackShape, string> = {
  projectile: "proyectil recto",
  beam: "rayo corto",
  burst: "explosion",
  trap: "trampa",
};

const palette = ["#111827", "#1d4ed8", "#be123c", "#15803d", "#f59e0b", "#ffffff"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function makeRules(attack: AttackDraft): Ruleset {
  const shapeWeight = {
    projectile: 1,
    beam: 1.25,
    burst: 1.45,
    trap: 1.15,
  }[attack.shape];

  const effectWeight = {
    push: 0.7,
    burn: 1,
    slow: 0.8,
    pierce: 1.25,
  }[attack.effect];

  const raw = attack.power * shapeWeight + effectWeight;
  const damage = Math.round(8 + raw * 2.7);
  const cooldown = Number((1.2 + raw * 0.22).toFixed(1));
  const speed = attack.shape === "beam" ? 8.5 : attack.shape === "burst" ? 5.4 : 6.8;
  const size = attack.shape === "burst" ? 28 : attack.shape === "beam" ? 14 : 18;
  const energyCost = Math.round(13 + raw * 3);

  const corrections = [
    "NO ataque infinito: le puse energia y recarga.",
    "NO animar todo frame a frame: uso mano marcada + pose falsa.",
    "NO perder la imaginacion: el nombre y la descripcion son libres.",
  ];

  if (attack.power >= 8 || attack.effect === "pierce") {
    corrections.push("NO poder roto gratis: si atraviesa o pega fuerte, tarda mas.");
  }

  if (attack.shape === "burst") {
    corrections.push("NO explosion imposible de esquivar: viaja mas lenta.");
  }

  return {
    damage,
    cooldown,
    speed,
    size,
    energyCost,
    warning:
      attack.power > 7
        ? "Fuerte, pero con castigo claro."
        : "Raro, usable y todavia justo.",
    corrections,
  };
}

function DrawingPad({
  fighter,
  onChange,
}: {
  fighter: Fighter;
  onChange: (fighter: Fighter) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<"draw" | "hand">("draw");
  const [color, setColor] = useState(fighter.ink);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function saveImage(nextHand = fighter.hand) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange({ ...fighter, image: canvas.toDataURL("image/png"), ink: color, hand: nextHand });
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pos = point(event);
    if (mode === "hand") {
      saveImage(pos);
      return;
    }
    setDrawing(true);
    canvas.setPointerCapture(event.pointerId);
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !drawing || mode !== "draw") return;
    const pos = point(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    saveImage();
  }

  function stop() {
    if (!drawing) return;
    setDrawing(false);
    saveImage();
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange({ ...fighter, image: canvas.toDataURL("image/png") });
  }

  return (
    <section className="studioPanel">
      <div className="panelTitle">
        <input
          aria-label="Nombre del personaje"
          value={fighter.name}
          onChange={(event) => onChange({ ...fighter, name: event.target.value })}
        />
        <div className="modeSwitch">
          <button className={mode === "draw" ? "active" : ""} onClick={() => setMode("draw")}>
            dibujar
          </button>
          <button className={mode === "hand" ? "active" : ""} onClick={() => setMode("hand")}>
            mano
          </button>
        </div>
      </div>

      <div className="canvasWrap">
        <canvas
          ref={canvasRef}
          width={240}
          height={220}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={stop}
          onPointerCancel={stop}
          aria-label={`Lienzo de ${fighter.name}`}
        />
        <span
          className="handPin"
          style={{
            left: `${(fighter.hand.x / 240) * 100}%`,
            top: `${(fighter.hand.y / 220) * 100}%`,
          }}
        />
      </div>

      <div className="tools">
        <div className="swatches" aria-label="Colores">
          {palette.map((item) => (
            <button
              key={item}
              className={item === color ? "selected" : ""}
              style={{ backgroundColor: item }}
              title={`Color ${item}`}
              onClick={() => setColor(item)}
            />
          ))}
        </div>
        <button className="ghostBtn" onClick={clear}>
          limpiar
        </button>
      </div>
    </section>
  );
}

function AttackBuilder({
  attack,
  onChange,
}: {
  attack: AttackDraft;
  onChange: (attack: AttackDraft) => void;
}) {
  const rules = useMemo(() => makeRules(attack), [attack]);

  return (
    <section className="studioPanel attackPanel">
      <div className="panelTitle compact">
        <input
          aria-label="Nombre del ataque"
          value={attack.name}
          onChange={(event) => onChange({ ...attack, name: event.target.value })}
        />
      </div>

      <textarea
        aria-label="Descripcion inventada del ataque"
        value={attack.fantasy}
        onChange={(event) => onChange({ ...attack, fantasy: event.target.value })}
      />

      <div className="formGrid">
        <label>
          forma
          <select
            value={attack.shape}
            onChange={(event) => onChange({ ...attack, shape: event.target.value as AttackShape })}
          >
            {Object.entries(shapeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          efecto
          <select
            value={attack.effect}
            onChange={(event) =>
              onChange({ ...attack, effect: event.target.value as AttackEffect })
            }
          >
            {Object.entries(effectLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="slider">
        poder {attack.power}
        <input
          type="range"
          min="1"
          max="10"
          value={attack.power}
          onChange={(event) => onChange({ ...attack, power: Number(event.target.value) })}
        />
      </label>

      <div className="rulesCard">
        <strong>{rules.warning}</strong>
        <span>{rules.damage} dano</span>
        <span>{rules.cooldown}s recarga</span>
        <span>{rules.energyCost} energia</span>
      </div>
    </section>
  );
}

function BattleCanvas({
  fighters,
  attacks,
}: {
  fighters: Record<FighterId, Fighter>;
  attacks: Record<FighterId, AttackDraft>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keys = useRef<Record<string, boolean>>({});
  const images = useRef<Partial<Record<FighterId, HTMLImageElement>>>({});
  const players = useRef<Record<FighterId, PlayerState>>({
    p1: { x: 180, y: 320, vx: 0, hp: 100, energy: 100, facing: 1, cooldown: 0, windup: 0, shield: 0, lastHit: 0 },
    p2: { x: 700, y: 320, vx: 0, hp: 100, energy: 100, facing: -1, cooldown: 0, windup: 0, shield: 0, lastHit: 0 },
  });
  const projectiles = useRef<Projectile[]>([]);
  const [, forceUi] = useState(0);

  useEffect(() => {
    (["p1", "p2"] as FighterId[]).forEach((id) => {
      if (!fighters[id].image) return;
      const img = new Image();
      img.src = fighters[id].image;
      images.current[id] = img;
    });
  }, [fighters]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = true;
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };
    const up = (event: KeyboardEvent) => {
      keys.current[event.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  function reset() {
    players.current = {
      p1: { x: 180, y: 320, vx: 0, hp: 100, energy: 100, facing: 1, cooldown: 0, windup: 0, shield: 0, lastHit: 0 },
      p2: { x: 700, y: 320, vx: 0, hp: 100, energy: 100, facing: -1, cooldown: 0, windup: 0, shield: 0, lastHit: 0 },
    };
    projectiles.current = [];
    forceUi((tick) => tick + 1);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let last = performance.now();

    const socketWorld = (id: FighterId) => {
      const player = players.current[id];
      const fighter = fighters[id];
      const scale = 0.54;
      const localX = (fighter.hand.x - 120) * scale * player.facing;
      const localY = (fighter.hand.y - 110) * scale;
      const reach = player.windup > 0 ? 24 * player.facing : 0;
      return { x: player.x + localX + reach, y: player.y + localY };
    };

    const fire = (owner: FighterId) => {
      const player = players.current[owner];
      const rules = makeRules(attacks[owner]);
      if (player.cooldown > 0 || player.energy < rules.energyCost || player.hp <= 0) return;
      const origin = socketWorld(owner);
      player.cooldown = rules.cooldown;
      player.energy -= rules.energyCost;
      player.windup = 0.24;
      projectiles.current.push({
        owner,
        x: origin.x,
        y: origin.y,
        vx: player.facing * rules.speed,
        life: attacks[owner].shape === "beam" ? 42 : attacks[owner].shape === "trap" ? 120 : 95,
        size: rules.size,
        damage: rules.damage,
        effect: attacks[owner].effect,
        trail: owner === "p1" ? "#38bdf8" : "#fb7185",
      });
    };

    const loop = (now: number) => {
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      step(dt);
      draw(ctx, canvas);
      raf = requestAnimationFrame(loop);
    };

    const step = (dt: number) => {
      const state = players.current;
      movePlayer("p1", keys.current.a, keys.current.d, dt);
      movePlayer("p2", keys.current.arrowleft, keys.current.arrowright, dt);

      if (keys.current.f) fire("p1");
      if (keys.current.l) fire("p2");
      if (keys.current.g) state.p1.shield = 0.2;
      if (keys.current.k) state.p2.shield = 0.2;

      (["p1", "p2"] as FighterId[]).forEach((id) => {
        const player = state[id];
        player.cooldown = Math.max(0, player.cooldown - dt);
        player.windup = Math.max(0, player.windup - dt);
        player.shield = Math.max(0, player.shield - dt);
        player.energy = Math.min(100, player.energy + dt * 11);
        player.lastHit = Math.max(0, player.lastHit - dt);
      });

      projectiles.current = projectiles.current
        .map((shot) => ({ ...shot, x: shot.x + shot.vx, life: shot.life - 1 }))
        .filter((shot) => shot.life > 0 && shot.x > -80 && shot.x < canvas.width + 80);

      for (const shot of projectiles.current) {
        const targetId: FighterId = shot.owner === "p1" ? "p2" : "p1";
        const target = state[targetId];
        if (target.hp <= 0) continue;
        const hit = Math.abs(shot.x - target.x) < 44 + shot.size && Math.abs(shot.y - target.y) < 58 + shot.size;
        if (!hit) continue;
        const blocked = target.shield > 0 && shot.effect !== "pierce";
        if (!blocked) {
          target.hp = clamp(target.hp - shot.damage, 0, 100);
          target.lastHit = 0.22;
          if (shot.effect === "push") target.x += shot.vx > 0 ? 28 : -28;
          if (shot.effect === "slow") target.vx *= 0.35;
          if (shot.effect === "burn") target.hp = clamp(target.hp - 4, 0, 100);
        }
        shot.life = 0;
      }
    };

    const movePlayer = (id: FighterId, left?: boolean, right?: boolean, dt?: number) => {
      const player = players.current[id];
      if (player.hp <= 0) return;
      const accel = 680 * (dt ?? 0);
      if (left) {
        player.vx -= accel;
        player.facing = -1;
      }
      if (right) {
        player.vx += accel;
        player.facing = 1;
      }
      player.vx *= 0.84;
      player.x = clamp(player.x + player.vx * (dt ?? 0), 70, canvas.width - 70);
      player.y = 320 + Math.sin(nowish() / 180 + player.x * 0.02) * 2;
    };

    const drawFighter = (id: FighterId) => {
      const player = players.current[id];
      const img = images.current[id];
      const wobble = player.windup > 0 ? Math.sin(performance.now() / 38) * 0.04 : 0;
      const hurt = player.lastHit > 0 ? 1 : 0;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.scale(player.facing * (0.82 + wobble), 0.82 - wobble);
      ctx.rotate(player.windup > 0 ? player.facing * -0.08 : 0);
      ctx.globalAlpha = player.hp <= 0 ? 0.42 : 1;
      if (img?.complete && img.naturalWidth) {
        ctx.drawImage(img, -98, -100, 196, 180);
      } else {
        ctx.fillStyle = id === "p1" ? "#2563eb" : "#e11d48";
        ctx.beginPath();
        ctx.arc(0, -34, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-26, -12, 52, 76);
      }
      if (hurt) {
        ctx.fillStyle = "rgba(255,255,255,.45)";
        ctx.fillRect(-98, -100, 196, 180);
      }
      ctx.restore();

      const hand = socketWorld(id);
      const shoulderX = player.x - player.facing * 8;
      const shoulderY = player.y - 28;
      ctx.lineWidth = player.windup > 0 ? 13 : 7;
      ctx.lineCap = "round";
      ctx.strokeStyle = id === "p1" ? "#67e8f9" : "#fda4af";
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(hand.x, hand.y);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = id === "p1" ? "#0891b2" : "#be123c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hand.x, hand.y, player.windup > 0 ? 12 : 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (player.shield > 0) {
        ctx.strokeStyle = "rgba(125, 211, 252, .85)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(player.x, player.y - 24, 76, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const draw = (context: CanvasRenderingContext2D, area: HTMLCanvasElement) => {
      context.clearRect(0, 0, area.width, area.height);
      const ground = context.createLinearGradient(0, 220, 0, area.height);
      ground.addColorStop(0, "#f8fafc");
      ground.addColorStop(1, "#d9f99d");
      context.fillStyle = ground;
      context.fillRect(0, 0, area.width, area.height);
      context.fillStyle = "#fef3c7";
      context.fillRect(0, 348, area.width, 86);
      context.fillStyle = "rgba(15,23,42,.1)";
      for (let x = 0; x < area.width; x += 34) {
        context.fillRect(x, 384, 18, 4);
      }

      projectiles.current.forEach((shot) => {
        context.strokeStyle = shot.trail;
        context.lineWidth = shot.size * 0.55;
        context.lineCap = "round";
        context.globalAlpha = 0.45;
        context.beginPath();
        context.moveTo(shot.x - shot.vx * 3, shot.y);
        context.lineTo(shot.x, shot.y);
        context.stroke();
        context.globalAlpha = 1;
        context.fillStyle = shot.effect === "burn" ? "#f97316" : shot.effect === "slow" ? "#60a5fa" : shot.effect === "pierce" ? "#a855f7" : "#facc15";
        context.beginPath();
        context.arc(shot.x, shot.y, shot.size, 0, Math.PI * 2);
        context.fill();
      });

      drawFighter("p1");
      drawFighter("p2");

      const p1 = players.current.p1;
      const p2 = players.current.p2;
      drawBar(28, 22, p1.hp, "#2563eb", fighters.p1.name);
      drawBar(area.width - 268, 22, p2.hp, "#e11d48", fighters.p2.name);
      drawEnergy(28, 54, p1.energy);
      drawEnergy(area.width - 268, 54, p2.energy);

      const winner = p1.hp <= 0 ? fighters.p2.name : p2.hp <= 0 ? fighters.p1.name : "";
      if (winner) {
        context.fillStyle = "rgba(17,24,39,.78)";
        context.fillRect(0, 0, area.width, area.height);
        context.fillStyle = "#ffffff";
        context.textAlign = "center";
        context.font = "700 34px Arial";
        context.fillText(`${winner} gana`, area.width / 2, 210);
        context.font = "500 16px Arial";
        context.fillText("Pulsa reiniciar para otra ronda", area.width / 2, 242);
      }
    };

    const drawBar = (x: number, y: number, value: number, color: string, label: string) => {
      ctx.fillStyle = "rgba(15,23,42,.18)";
      ctx.fillRect(x, y, 240, 18);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 240 * (value / 100), 18);
      ctx.fillStyle = "#111827";
      ctx.font = "700 13px Arial";
      ctx.fillText(label, x, y - 6);
    };

    const drawEnergy = (x: number, y: number, value: number) => {
      ctx.fillStyle = "rgba(15,23,42,.14)";
      ctx.fillRect(x, y, 240, 8);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(x, y, 240 * (value / 100), 8);
    };

    const nowish = () => performance.now();
    raf = requestAnimationFrame(loop);
    const ui = window.setInterval(() => forceUi((tick) => tick + 1), 300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(ui);
    };
  }, [attacks, fighters]);

  const p1Rules = makeRules(attacks.p1);
  const p2Rules = makeRules(attacks.p2);

  return (
    <section className="battleShell">
      <div className="battleTop">
        <div>
          <strong>{attacks.p1.name}</strong>
          <span>{p1Rules.cooldown}s / {p1Rules.energyCost} energia</span>
        </div>
        <button onClick={reset}>reiniciar</button>
        <div>
          <strong>{attacks.p2.name}</strong>
          <span>{p2Rules.cooldown}s / {p2Rules.energyCost} energia</span>
        </div>
      </div>
      <canvas ref={canvasRef} width={900} height={430} className="arena" />
      <div className="controls">
        <span>J1: A/D mover, F ataque, G escudo</span>
        <span>J2: flechas mover, L ataque, K escudo</span>
      </div>
    </section>
  );
}

function NoAnalyzer({ attacks }: { attacks: Record<FighterId, AttackDraft> }) {
  const combined = [...makeRules(attacks.p1).corrections, ...makeRules(attacks.p2).corrections];
  const unique = Array.from(new Set(combined));

  return (
    <section className="noPanel">
      <div>
        <p>Analizador de NOs</p>
        <h2>La idea sigue siendo Paint, pero el juego hace de arbitro.</h2>
      </div>
      <div className="noList">
        {unique.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("studio");
  const [fighters, setFighters] = useState<Record<FighterId, Fighter>>(defaultFighters);
  const [attacks, setAttacks] = useState<Record<FighterId, AttackDraft>>(defaultAttacks);

  return (
    <main className="appShell">
      <header className="topBar">
        <div>
          <p>Paint Fighter Prototype</p>
          <h1>Dibuja, marca la mano y pelea con ataques inventados.</h1>
        </div>
        <div className="phaseTabs">
          <button className={phase === "studio" ? "active" : ""} onClick={() => setPhase("studio")}>
            crear
          </button>
          <button className={phase === "battle" ? "active" : ""} onClick={() => setPhase("battle")}>
            pelear
          </button>
        </div>
      </header>

      {phase === "studio" ? (
        <div className="studioGrid">
          <div className="playerColumn">
            <DrawingPad fighter={fighters.p1} onChange={(fighter) => setFighters({ ...fighters, p1: fighter })} />
            <AttackBuilder attack={attacks.p1} onChange={(attack) => setAttacks({ ...attacks, p1: attack })} />
          </div>
          <NoAnalyzer attacks={attacks} />
          <div className="playerColumn">
            <DrawingPad fighter={fighters.p2} onChange={(fighter) => setFighters({ ...fighters, p2: fighter })} />
            <AttackBuilder attack={attacks.p2} onChange={(attack) => setAttacks({ ...attacks, p2: attack })} />
          </div>
        </div>
      ) : (
        <BattleCanvas fighters={fighters} attacks={attacks} />
      )}
    </main>
  );
}
