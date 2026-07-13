import { asset } from '@/lib/asset'

/**
 * 3D crypto coins that fill the section's side margins with soft, drifting depth.
 * Tuned to be visible enough to fill the space, but blurred + semi-transparent
 * so they stay background texture. Pulled in from the edges so none are clipped.
 * Ornamental only (pointer-events off, hidden on small screens).
 */
const COINS = [
  // left column — top → bottom
  { img: 'btc', pos: 'left-[3%] top-[10%]', size: 'h-24 w-24', dur: 11, delay: 0 },
  { img: 'eth', pos: 'left-[6%] top-[44%]', size: 'h-16 w-16', dur: 13, delay: 1.2 },
  { img: 'ada', pos: 'left-[3%] bottom-[12%]', size: 'h-20 w-20', dur: 12, delay: 0.6 },
  // right column — top → bottom
  { img: 'xrp', pos: 'right-[4%] top-[12%]', size: 'h-20 w-20', dur: 12.5, delay: 0.3 },
  { img: 'sol', pos: 'right-[3%] top-[46%]', size: 'h-24 w-24', dur: 11.5, delay: 1 },
  { img: 'doge', pos: 'right-[6%] bottom-[14%]', size: 'h-16 w-16', dur: 14, delay: 1.5 },
  // bottom gap
  { img: 'bnb', pos: 'bottom-[10%] left-[44%]', size: 'h-14 w-14', dur: 13.5, delay: 0.4 },
]

export function FloatingCoins() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block" aria-hidden>
      {COINS.map((c, i) => (
        <img
          key={i}
          src={`${asset(`coins/${c.img}.webp`)}?v=3`}
          alt={`${c.img.toUpperCase()} coin`}
          className={`absolute select-none object-contain opacity-[0.22] blur-[1.5px] animate-float ${c.pos} ${c.size}`}
          style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}
        />
      ))}
    </div>
  )
}
