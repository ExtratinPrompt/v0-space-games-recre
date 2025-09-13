import SpaceShooterGame from "@/components/space-shooter-game"

export default function Home() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-8 font-mono">SPACE SHOOTER</h1>
        <SpaceShooterGame />
        <div className="mt-6 text-white/70 text-sm font-mono">
          <p>Use ARROW KEYS to move • SPACEBAR to shoot</p>
          <p>Destroy all enemies to advance to the next level!</p>
        </div>
      </div>
    </main>
  )
}
