import { useEffect } from 'react'
import { About } from './blocks/About'
import { Contact } from './blocks/Contact'
import { Credibility } from './blocks/Credibility'
import { Footer } from './blocks/Footer'
import { Hero } from './blocks/Hero'
import { Market } from './blocks/Market'
import { Nav } from './blocks/Nav'
import { Numbers } from './blocks/Numbers'
import { PlayMoment } from './blocks/PlayMoment'
import { Services } from './blocks/Services'
import { Signature } from './blocks/Signature'
import { Story } from './blocks/Story'
import { TributeOverlay } from './blocks/TributeOverlay'
import { GameFade } from './game/GameFade'
import { GameHud } from './game/GameHud'
import { useGame } from './game/store'
import { JourneyController } from './journey/JourneyController'
import { LanguageProvider } from './lib/i18n'
import { applyTheme, useTheme } from './lib/theme'
import { World } from './three/World'

export default function App() {
  const mode = useGame((s) => s.mode)
  const inGame = mode === 'game'
  const night = useTheme((s) => s.night)

  useEffect(() => {
    applyTheme(night)
  }, [night])

  return (
    <LanguageProvider>
      <JourneyController />
      <World />
      <div
        aria-hidden={inGame}
        className={`relative z-10 transition-opacity duration-300 md:w-[46%] ${
          inGame ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <Nav />
        <main className="relative">
          <Hero />
          <Story />
          <Services />
          <Credibility />
          <Numbers />
          <Signature />
          <Market />
          <About />
          <PlayMoment />
          <Contact />
          <Footer />
        </main>
      </div>
      {inGame && <GameHud />}
      <GameFade />
      <TributeOverlay />
    </LanguageProvider>
  )
}
