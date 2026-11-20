/*
 * The banner's picture: one house, its yard and a tree, drawn in a 400 x 150 space with everything
 * on the right (the words sit on the left). The season changes the sky, the grass and the tree;
 * events add to it: lights and a wreath for Christmas, bunting and balloons for a birthday, and
 * gifts by the door on the day and just after. Colors come from CSS (.banner.s-<season>), with
 * light and dark versions.
 */

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export interface SceneEvents {
  christmas?: boolean;
  /** Someone's birthday is coming up (or is today): their color and initial. */
  birthday?: { color: string; initial: string; today: boolean };
  /** Gifts by the door: on the day, and when there's something to see in Received. */
  gifts?: boolean;
}

/** The season by month (northern hemisphere): spring from March, summer from June, fall from September, winter from December. */
export function seasonOf(d = new Date()): Season {
  const m = d.getMonth();
  return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'fall' : 'winter';
}

/** A small wrapped present, its bottom-left corner at (x, y + h). */
function Gift({ x, y, w, h, body, ribbon }: { x: number; y: number; w: number; h: number; body: string; ribbon: string }) {
  const mid = x + w / 2, lid = Math.round(h * .3);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={body} />
      <rect x={mid - 3} y={y} width={6} height={h} fill={ribbon} />
      <rect x={x - 2} y={y - lid + 2} width={w + 4} height={lid} rx={3} fill={body} />
      <rect x={mid - 3} y={y - lid + 2} width={6} height={lid} fill={ribbon} />
      <ellipse cx={mid - 6} cy={y - lid} rx={6.5} ry={4} transform={`rotate(-20 ${mid - 6} ${y - lid})`} fill={ribbon} />
      <ellipse cx={mid + 6} cy={y - lid} rx={6.5} ry={4} transform={`rotate(20 ${mid + 6} ${y - lid})`} fill={ribbon} />
    </g>
  );
}

const LIGHTS = ['var(--accent)', 'var(--gold)', '#5B7FD6', 'var(--pine)'];

export function HouseScene({ season, events = {} }: { season: Season; events?: SceneEvents }) {
  const winter = season === 'winter';
  const b = events.birthday;
  return (
    <svg className="scene" viewBox="0 0 400 150" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      {/* Sky, sun, far hill */}
      <rect width="400" height="150" fill="var(--sc-sky)" />
      {season !== 'winter' && <circle cx="376" cy="26" r={season === 'fall' ? 11 : 13} fill="var(--sc-sun)" />}
      {winter && <circle cx="378" cy="24" r="10" fill="var(--sc-sun)" opacity=".8" />}
      <path d="M110 150 C 190 112 300 102 400 108 V150 Z" fill="var(--sc-hill)" />

      {/* Tree */}
      <rect x="224" y="94" width="8" height="40" rx="3" fill="var(--sc-trunk)" />
      {winter ? (
        <g stroke="var(--sc-trunk)" strokeLinecap="round" fill="none">
          <path d="M228 102 L210 78 M228 98 L246 74 M228 104 L228 62" strokeWidth="4" />
          <path d="M215 85 L206 80 M241 81 L251 77 M228 74 L219 64 M228 70 L237 61 M210 78 L208 70 M246 74 L249 66" strokeWidth="2.5" />
        </g>
      ) : (
        <g fill="var(--sc-leaf)">
          <circle cx="228" cy="76" r="22" />
          <circle cx="212" cy="90" r="14" />
          <circle cx="244" cy="90" r="14" />
        </g>
      )}
      {season === 'spring' && <g fill="var(--sc-blossom)">
        {[[218, 70], [234, 64], [240, 82], [214, 88], [226, 90], [246, 94], [222, 58], [208, 80]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3" />)}
      </g>}
      {season === 'fall' && <g>
        {[[200, 108, 'var(--accent)'], [256, 112, 'var(--gold)'], [214, 126, 'var(--sc-leaf)'], [250, 128, 'var(--accent)'], [190, 130, 'var(--gold)']].map(([x, y, c], n) =>
          <ellipse key={n} cx={x as number} cy={y as number} rx="4" ry="2.2" fill={c as string} transform={`rotate(${n * 40 - 30} ${x} ${y})`} />)}
      </g>}

      {/* Yard */}
      <path d="M150 150 C 220 126 320 122 400 128 V150 Z" fill="var(--sc-ground)" />
      {(season === 'spring' || season === 'summer') && <g>
        {[[196, 140, 'var(--accent)'], [210, 144, 'var(--gold)'], [268, 140, '#F4A7B9'], [370, 140, 'var(--gold)'], [384, 145, 'var(--accent)']].map(([x, y, c]) =>
          <circle key={`${x}`} cx={x as number} cy={y as number} r="2.6" fill={c as string} />)}
      </g>}

      {/* House */}
      <rect x="282" y="94" width="72" height="42" rx="3" fill="var(--sc-house)" />
      <rect x="336" y="66" width="9" height="20" fill="var(--sc-roof)" />
      <path d="M274 97 L318 62 L362 97 Z" fill="var(--sc-roof)" stroke="var(--sc-roof)" strokeWidth="5" strokeLinejoin="round" />
      {winter && <path d="M272 96 L318 60 L364 96 L357 96 L318 66 L279 96 Z" fill="var(--sc-snow)" />}
      <rect x="310" y="110" width="15" height="26" rx="3" fill="var(--sc-door)" />
      <circle cx="321" cy="124" r="1.4" fill="var(--sc-house)" />
      <rect x="289" y="104" width="14" height="13" rx="2" fill="var(--sc-window)" />
      <rect x="333" y="104" width="14" height="13" rx="2" fill="var(--sc-window)" />
      <path d="M296 104 v13 M289 110.5 h14 M340 104 v13 M333 110.5 h14" stroke="var(--sc-house)" strokeWidth="1.4" />

      {/* Christmas: lights along the roof, a wreath on the door */}
      {events.christmas && <g>
        {Array.from({ length: 11 }, (_, i) => {
          const t = i / 10, x = 276 + 84 * t, y = t <= .5 ? 97 - 70 * t : 27 + 70 * t;
          return <circle key={i} cx={x} cy={y + 3} r="2.4" fill={LIGHTS[i % LIGHTS.length]} className={i % 3 ? undefined : 'twinkle'} />;
        })}
        <circle cx="317.5" cy="116" r="5" fill="none" stroke="var(--sc-wreath)" strokeWidth="3" />
        <circle cx="317.5" cy="111.5" r="1.8" fill="var(--accent)" />
      </g>}

      {/* Birthday: bunting from the tree to the house, balloons by the door */}
      {b && <g>
        <path d="M236 70 Q 260 86 288 84" fill="none" stroke="var(--ink-2)" strokeOpacity=".5" strokeWidth="1.2" />
        {[[244, 76.5, 'var(--accent)'], [255, 80.6, 'var(--gold)'], [266, 83, b.color], [277, 84.2, 'var(--pine)']].map(([x, y, c]) =>
          <path key={`${x}`} d={`M${(x as number) - 5} ${y} H${(x as number) + 5} L${x} ${(y as number) + 9} Z`} fill={c as string} />)}
        <path d="M368 134 Q 366 112 372 92 M368 134 Q 376 114 386 98 M368 134 Q 360 116 360 104" fill="none" stroke="var(--ink-2)" strokeOpacity=".6" strokeWidth="1" />
        <ellipse cx="360" cy="96" rx="8" ry="10" fill="var(--gold)" />
        <ellipse cx="386" cy="90" rx="8" ry="10" fill="var(--accent)" />
        <ellipse cx="372" cy="82" rx="10" ry="12" fill={b.color} />
        <text x="372" y="87" textAnchor="middle" fontFamily="var(--sans)" fontWeight="800" fontSize="13" fill="#fff">{b.initial}</text>
      </g>}

      {/* Gifts by the door */}
      {events.gifts && <g>
        <Gift x={286} y={127} w={15} h={10} body="var(--accent)" ribbon="var(--gold)" />
        <Gift x={331} y={126} w={14} h={11} body="#5B7FD6" ribbon="#fff" />
        <Gift x={347} y={130} w={10} h={7} body="var(--gold)" ribbon="var(--accent)" />
      </g>}

      {/* Snow falling */}
      {winter && <g fill="var(--sc-snow)">
        {[[200, 20], [236, 40], [262, 14], [300, 30], [344, 18], [392, 52], [214, 56], [376, 70], [280, 48], [250, 64]].map(([x, y], n) =>
          <circle key={n} cx={x} cy={y} r={n % 2 ? 1.6 : 2.2} opacity=".9" />)}
      </g>}
    </svg>
  );
}
