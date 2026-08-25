import { useState } from 'react'
import GlobeBadge from './GlobeBadge.jsx'
import Nav from './Nav.jsx'
import styles from './Screen6.module.css'

// The swatch changes the whole theme, not just the jacket: background gradient
// and headline colour shift with it. Headline weight is a constant 800 across
// all three. Both clouds use the same bitmap across themes — the tint comes
// from the gradient behind them.
const THEMES = {
  blue:   { from: '#dff6ff', via: '#bfeeff', ink: '#88daf9', dot: '#3B7CD1',
            jacket: '/screen6/jacket-blue.png',   jacketH: '36.736vw' }, // 529/1440
  orange: { from: '#fff8f3', via: '#ffe3ce', ink: '#ffc190', dot: '#FF834E',
            jacket: '/screen6/jacket-orange.png', jacketH: '35.0vw'   }, // 504/1440
  pink:   { from: '#fff4f9', via: '#ffd6e9', ink: '#ffaed3', dot: '#FF54A4',
            jacket: '/screen6/jacket-pink.png',   jacketH: '35.486vw' }, // 511/1440
}
const ORDER = ['blue', 'orange', 'pink']

export default function Screen6({ onBack }) {
  const [theme, setTheme] = useState('blue')
  const t = THEMES[theme]

  return (
    <div
      className={styles.root}
      style={{ '--s6-from': t.from, '--s6-via': t.via, '--s6-ink': t.ink }}
    >
      <h1 className={styles.headline}>{'The Future Wears\nMany Worlds'}</h1>

      {/* Cloud 2 behind the jacket */}
      <img src="/cloud-1.png" alt="" className={styles.cloud2} />

      <div className={styles.jacketWrap}>
        <div className={styles.jacketFloat}>
          {ORDER.map(name => (
            <img
              key={name}
              src={THEMES[name].jacket}
              alt=""
              className={`${styles.jacketLayer} ${theme === name ? styles.jacketOn : ''}`}
              style={{ '--jh': THEMES[name].jacketH }}
            />
          ))}
        </div>
      </div>

      {/* Cloud 1 in front of the jacket — this is what dissolves its lower left */}
      <img src="/cloud-1.png" alt="" className={styles.cloud1} />

      <p className={styles.copy}>
        An apparel solutions partner shaping the future across lifestyle, sportswear, home and workwear.
      </p>

      <div className={styles.swatches} role="group" aria-label="Garment colour">
        {ORDER.map(name => (
          <button
            key={name}
            type="button"
            className={`${styles.swatch} ${theme === name ? styles.swatchActive : ''}`}
            style={{ '--dot': THEMES[name].dot }}
            aria-label={name}
            aria-pressed={theme === name}
            onClick={() => setTheme(name)}
          />
        ))}
      </div>

      <Nav />
      <GlobeBadge onClick={onBack} />
    </div>
  )
}
