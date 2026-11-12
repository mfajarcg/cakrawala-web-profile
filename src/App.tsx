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
import { JourneyController } from './journey/JourneyController'
import { LanguageProvider } from './lib/i18n'
import { World } from './three/World'

export default function App() {
  return (
    <LanguageProvider>
      <JourneyController />
      <World />
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
    </LanguageProvider>
  )
}
