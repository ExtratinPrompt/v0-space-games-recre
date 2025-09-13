"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface GameObject {
  x: number
  y: number
  width: number
  height: number
  active: boolean
}

interface Player extends GameObject {
  speed: number
}

interface Enemy extends GameObject {
  speed: number
  direction: number
}

interface Bullet extends GameObject {
  speed: number
  isPlayerBullet: boolean
}

interface Star {
  x: number
  y: number
  speed: number
  brightness: number
}

export default function SpaceShooterGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const keysRef = useRef<Set<string>>(new Set())

  const [gameState, setGameState] = useState({
    score: 0,
    level: 1,
    lives: 3,
    gameOver: false,
    paused: false,
  })

  const gameObjectsRef = useRef({
    player: { x: 400, y: 550, width: 30, height: 20, speed: 5, active: true } as Player,
    enemies: [] as Enemy[],
    bullets: [] as Bullet[],
    stars: [] as Star[],
  })

  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 600
  const ENEMY_ROWS = 5
  const ENEMY_COLS = 10

  // Initialize stars for background
  const initStars = useCallback(() => {
    const stars: Star[] = []
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.8 + 0.2,
      })
    }
    gameObjectsRef.current.stars = stars
  }, [])

  // Initialize enemies
  const initEnemies = useCallback(() => {
    const enemies: Enemy[] = []
    const startX = 100
    const startY = 50
    const spacingX = 60
    const spacingY = 50

    for (let row = 0; row < ENEMY_ROWS; row++) {
      for (let col = 0; col < ENEMY_COLS; col++) {
        enemies.push({
          x: startX + col * spacingX,
          y: startY + row * spacingY,
          width: 25,
          height: 20,
          speed: 1,
          direction: 1,
          active: true,
        })
      }
    }
    gameObjectsRef.current.enemies = enemies
  }, [])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code)
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  // Game logic
  const updateGame = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return

    const { player, enemies, bullets, stars } = gameObjectsRef.current

    // Update stars
    stars.forEach((star) => {
      star.y += star.speed
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0
        star.x = Math.random() * CANVAS_WIDTH
      }
    })

    // Handle player movement
    if (keysRef.current.has("ArrowLeft") && player.x > 0) {
      player.x -= player.speed
    }
    if (keysRef.current.has("ArrowRight") && player.x < CANVAS_WIDTH - player.width) {
      player.x += player.speed
    }
    if (keysRef.current.has("ArrowUp") && player.y > CANVAS_HEIGHT / 2) {
      player.y -= player.speed
    }
    if (keysRef.current.has("ArrowDown") && player.y < CANVAS_HEIGHT - player.height) {
      player.y += player.speed
    }

    // Handle shooting
    if (keysRef.current.has("Space")) {
      const now = Date.now()
      if (!player.lastShot || now - player.lastShot > 200) {
        bullets.push({
          x: player.x + player.width / 2 - 2,
          y: player.y,
          width: 4,
          height: 10,
          speed: 8,
          isPlayerBullet: true,
          active: true,
        })
        player.lastShot = now
      }
    }

    // Update bullets
    bullets.forEach((bullet) => {
      if (bullet.isPlayerBullet) {
        bullet.y -= bullet.speed
        if (bullet.y < 0) bullet.active = false
      } else {
        bullet.y += bullet.speed
        if (bullet.y > CANVAS_HEIGHT) bullet.active = false
      }
    })

    // Update enemies
    let moveDown = false
    enemies.forEach((enemy) => {
      if (!enemy.active) return

      enemy.x += enemy.speed * enemy.direction

      if (enemy.x <= 0 || enemy.x >= CANVAS_WIDTH - enemy.width) {
        moveDown = true
      }
    })

    if (moveDown) {
      enemies.forEach((enemy) => {
        if (enemy.active) {
          enemy.direction *= -1
          enemy.y += 20
        }
      })
    }

    // Enemy shooting
    if (Math.random() < 0.02) {
      const activeEnemies = enemies.filter((e) => e.active)
      if (activeEnemies.length > 0) {
        const shooter = activeEnemies[Math.floor(Math.random() * activeEnemies.length)]
        bullets.push({
          x: shooter.x + shooter.width / 2 - 2,
          y: shooter.y + shooter.height,
          width: 4,
          height: 8,
          speed: 3,
          isPlayerBullet: false,
          active: true,
        })
      }
    }

    // Collision detection
    bullets.forEach((bullet) => {
      if (!bullet.active) return

      if (bullet.isPlayerBullet) {
        // Player bullet hits enemy
        enemies.forEach((enemy) => {
          if (
            enemy.active &&
            bullet.x < enemy.x + enemy.width &&
            bullet.x + bullet.width > enemy.x &&
            bullet.y < enemy.y + enemy.height &&
            bullet.y + bullet.height > enemy.y
          ) {
            enemy.active = false
            bullet.active = false
            setGameState((prev) => ({ ...prev, score: prev.score + 10 }))
          }
        })
      } else {
        // Enemy bullet hits player
        if (
          bullet.x < player.x + player.width &&
          bullet.x + bullet.width > player.x &&
          bullet.y < player.y + player.height &&
          bullet.y + bullet.height > player.y
        ) {
          bullet.active = false
          setGameState((prev) => {
            const newLives = prev.lives - 1
            return {
              ...prev,
              lives: newLives,
              gameOver: newLives <= 0,
            }
          })
        }
      }
    })

    // Remove inactive bullets
    gameObjectsRef.current.bullets = bullets.filter((b) => b.active)

    // Check if all enemies are destroyed
    const activeEnemies = enemies.filter((e) => e.active)
    if (activeEnemies.length === 0) {
      setGameState((prev) => ({ ...prev, level: prev.level + 1 }))
      initEnemies()
    }

    // Check if enemies reached player
    enemies.forEach((enemy) => {
      if (enemy.active && enemy.y + enemy.height >= player.y) {
        setGameState((prev) => ({ ...prev, gameOver: true }))
      }
    })
  }, [gameState.gameOver, gameState.paused, initEnemies])

  // Render game
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = "#000011"
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const { player, enemies, bullets, stars } = gameObjectsRef.current

    // Draw stars
    stars.forEach((star) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`
      ctx.fillRect(star.x, star.y, 1, 1)
    })

    // Draw player
    if (player.active) {
      ctx.fillStyle = "#00ff00"
      ctx.fillRect(player.x, player.y, player.width, player.height)

      // Draw player ship details
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(player.x + 12, player.y - 5, 6, 8)
      ctx.fillRect(player.x + 5, player.y + 15, 8, 3)
      ctx.fillRect(player.x + 17, player.y + 15, 8, 3)
    }

    // Draw enemies
    enemies.forEach((enemy) => {
      if (enemy.active) {
        ctx.fillStyle = "#ff4444"
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height)

        // Draw enemy ship details
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(enemy.x + 8, enemy.y + 5, 9, 4)
        ctx.fillRect(enemy.x + 3, enemy.y + 12, 6, 3)
        ctx.fillRect(enemy.x + 16, enemy.y + 12, 6, 3)
      }
    })

    // Draw bullets
    bullets.forEach((bullet) => {
      if (bullet.active) {
        ctx.fillStyle = bullet.isPlayerBullet ? "#00ffff" : "#ffff00"
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      }
    })

    // Draw UI
    ctx.fillStyle = "#ffffff"
    ctx.font = "20px monospace"
    ctx.fillText(`SCORE: ${gameState.score}`, 20, 30)
    ctx.fillText(`LEVEL: ${gameState.level.toString().padStart(2, "0")}`, CANVAS_WIDTH - 120, 30)
    ctx.fillText(`LIVES: ${gameState.lives}`, 20, CANVAS_HEIGHT - 20)

    if (gameState.gameOver) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      ctx.fillStyle = "#ff0000"
      ctx.font = "48px monospace"
      ctx.textAlign = "center"
      ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)

      ctx.fillStyle = "#ffffff"
      ctx.font = "24px monospace"
      ctx.fillText(`Final Score: ${gameState.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50)
      ctx.fillText("Press R to Restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100)
      ctx.textAlign = "left"
    }
  }, [gameState])

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      updateGame()
      render()
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [updateGame, render])

  // Initialize game
  useEffect(() => {
    initStars()
    initEnemies()
  }, [initStars, initEnemies])

  // Handle restart
  useEffect(() => {
    const handleRestart = (e: KeyboardEvent) => {
      if (e.code === "KeyR" && gameState.gameOver) {
        setGameState({
          score: 0,
          level: 1,
          lives: 3,
          gameOver: false,
          paused: false,
        })
        gameObjectsRef.current.player = {
          x: 400,
          y: 550,
          width: 30,
          height: 20,
          speed: 5,
          active: true,
        }
        gameObjectsRef.current.bullets = []
        initEnemies()
      }
    }

    window.addEventListener("keydown", handleRestart)
    return () => window.removeEventListener("keydown", handleRestart)
  }, [gameState.gameOver, initEnemies])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-blue-500 bg-black"
        tabIndex={0}
      />
    </div>
  )
}
