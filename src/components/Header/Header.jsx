import { VIEWS } from '../../config/constants'
import { useTheme } from '../../hooks/useTheme'
import './Header.css'

export default function Header({ view, onViewChange }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__brand">
          <img src="/favicon.svg" alt="" className="header__logo" />
          <div className="header__brand-text">
            <h1 className="header__title">
              <span className="header__title-full">Cambridge Innovation Events Hub</span>
              <span className="header__title-short">CIE Hub</span>
            </h1>
            <p className="header__subtitle">One hub for all event links</p>
          </div>
        </div>
        <div className="header__controls">
          <nav className="header__nav" role="tablist" aria-label="View">
            <div className="header__toggle">
              <div
                className="header__toggle-indicator"
                style={{ transform: `translateX(${VIEWS.findIndex((v) => v.id === view) * 100}%)` }}
              />
              {VIEWS.map(({ id, label }) => (
                <button
                  key={id}
                  className={`header__toggle-btn ${view === id ? 'header__toggle-btn--active' : ''}`}
                  onClick={() => onViewChange(id)}
                  role="tab"
                  aria-selected={view === id}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>
          <button
            className="header__theme-btn"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '\u2600' : '\u263D'}
          </button>
        </div>
      </div>
    </header>
  )
}
