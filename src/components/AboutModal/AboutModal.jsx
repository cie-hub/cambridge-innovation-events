import { useState, useEffect } from 'react'
import './AboutModal.css'

const SEEN_KEY = 'cie-disclaimer-seen'

export default function AboutModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(SEEN_KEY)) {
      setOpen(true)
    }
  }, [])

  function handleClose() {
    localStorage.setItem(SEEN_KEY, 'true')
    setOpen(false)
  }

  return (
    <>
      <button className="about-trigger" onClick={() => setOpen(true)}>
        <span className="about-trigger__beta">Open Beta</span>
        {' · '}
        Made by Innovators in Cambridge
      </button>

      {open && (
        <div className="about-backdrop" onClick={handleClose}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <button className="about-modal__close" onClick={handleClose}>
              &times;
            </button>
            <h2 className="about-modal__title">About This Hub</h2>
            <div className="about-modal__body">
              <p>
                This started over a coffee and a shared frustration: too many
                event pages, not enough time.
              </p>
              <p>
                Cambridge Innovation Events Hub is an aggregator of links. We
                don't organise, host, or own any event listed here. All credit
                belongs to the organisers.
              </p>
              <p>
                This is an open-source, non-commercial project in{' '}
                <strong>open beta</strong>. We're still finding and adding more
                links. If you know a source we're missing, share it on
                our{' '}
                <a href="https://github.com/cie-hub/cambridge-innovation-events" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>.
              </p>
              <p>
                The site currently lives on the developer's personal domain
                (chepaldin.com) as an experiment. If it proves useful, it can
                move to its own.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
