import { useState } from 'react'
import './AboutModal.css'

export default function AboutModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="about-trigger" onClick={() => setOpen(true)}>
        Made by innovators in Cambridge
      </button>

      {open && (
        <div className="about-backdrop" onClick={() => setOpen(false)}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>
            <button className="about-modal__close" onClick={() => setOpen(false)}>
              &times;
            </button>
            <h2 className="about-modal__title">About This Hub</h2>
            <div className="about-modal__body">
              <p>
                This started over a coffee and a shared frustration: too many
                event pages, not enough time.
              </p>
              <p>
                Cambridge Innovation Events Hub is a simple page of links. We
                don't organise, host, or take ownership of any event listed
                here. All credit belongs to the event organisers themselves.
              </p>
              <p>
                This is an open-source, volunteer effort built in a few days to
                answer one question: <em>can we please have one page with all
                the events we need to attend in Cambridge innovation?</em>
              </p>
              <p>
                If you find it useful, send a kind word to{' '}
                <a href="https://www.linkedin.com/in/anton-chepaldin/" target="_blank" rel="noopener noreferrer"><strong>Anton</strong></a>,
                the developer behind it.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
