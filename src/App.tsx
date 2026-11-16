import { About } from './blocks/About'
import { Contact } from './blocks/Contact'
import { Credibility } from './blocks/Credibility'
import { Footer } from './blocks/Footer'
import { Hero } from './blocks/Hero'
import { Market } from './blocks/Market'
import { Nav } from './blocks/Nav'
import { Numbers } from './blocks/Numbers'
import { PlayMoment } from './blocks/PlayMoment'
import { PovButton } from './blocks/PovButton'
import { Services } from './blocks/Services'
import { Signature } from './blocks/Signature'
import { Story } from './blocks/Story'
import { GameFade } from './game/GameFade'
import { GameHud } from './game/GameHud'
import { useGame } from './game/store'
import { JourneyController } from './journey/JourneyController'
import { LanguageProvider } from './lib/i18n'
import { World } from './three/World'

export default function App() {
  const mode = useGame((s) => s.mode)
  const inGame = mode === 'game'

  return (
    <LanguageProvider>
      <JourneyController />
      <World />
      <div
        aria-hidden={inGame}
        className={`transition-opacity duration-300 ${
          inGame ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <Nav />
        <PovButton />
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
    </LanguageProvider>
  )
}
