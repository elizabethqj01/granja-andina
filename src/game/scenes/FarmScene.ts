import Phaser from 'phaser'
import { IsoGrid } from '../objects/IsoGrid'
import { FarmEntity } from '../objects/FarmEntity'
import { useFarmStore, FARM_GRID, type Chicken, type PlacedCorn } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'

// ─── Visual sizes ──────────────────────────────────────────────────────────────
// Entities on the field are rendered LARGER than their logical tile (64×32).
// This matches Farm Frenzy's style: 1-tile logic, oversized sprite.
const SZ = {
  chicken: 52, // ~0.8× tile diagonal — dominates the tile visually
  egg: 34, // half the chicken — clearly visible
  corn: 30, // slightly smaller than egg so stacking reads cleanly
  farmer: 48,
  truck: 70,
  cornWarehouse: 66,
  chickenShop: 58,
  eggWarehouse: 66,
  cart: 58,
} as const

const COLORS = {
  bg: 0x3a6b1a, // dark grass outside the farm
  tileA: 0x7ec850, // bright farm tile A
  tileB: 0x95d95f, // bright farm tile B
  tileLine: 0x4e9a28,
  chicken: 0xfff9c4,
  egg: 0xfff3c4,
  eggCollecting: 0xffd54f,
  farmer: 0x6d4c41,
  corn: 0xfbc02d,
  eggWarehouse: 0xbcaaa4,
  cart: 0x8d6e63,
  truck: 0x546e7a,
  chickenShop: 0xc8e6c9,
}

const CORN_BATCH_PRICE = FARM_LEVEL1.cornUnitCost * FARM_LEVEL1.cornPerRecharge

export class FarmScene extends Phaser.Scene {
  private iso!: IsoGrid
  private farmer!: FarmEntity
  private truck!: FarmEntity
  private cornWarehouse!: FarmEntity
  private cornStockText!: Phaser.GameObjects.Text
  private eggWarehouse!: FarmEntity
  private cart!: FarmEntity
  private chickenShop!: FarmEntity
  private floor!: Phaser.GameObjects.Graphics

  private chickenSprites = new Map<string, FarmEntity>()
  private chickenHungerBars = new Map<string, Phaser.GameObjects.Graphics>()
  private chickenHungerAlerts = new Map<string, Phaser.GameObjects.Text>()

  private eggSprites = new Map<string, FarmEntity>()
  private placedCornSprites = new Map<string, FarmEntity>()
  private tileZones: Phaser.GameObjects.Zone[] = []
  private farmerHome = new Phaser.Math.Vector2()
  private truckAnimating = false

  constructor() {
    super({ key: 'Farm' })
  }

  create(): void {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.bg)

    this.iso = new IsoGrid({
      originX: width / 2,
      originY: height * 0.26,
      tileWidth: 96,
      tileHeight: 48,
    })

    this.floor = this.add.graphics().setDepth(-1)
    this.drawFloor()
    this.createTileZones()

    // Farmer — parked at the bottom-center when idle
    this.farmerHome.set(width / 2, height * 0.82)
    this.farmer = new FarmEntity(this, this.farmerHome.x, this.farmerHome.y, {
      icon: '👨‍🌾',
      label: 'Granjero',
      color: COLORS.farmer,
      size: SZ.farmer,
    })
    this.farmer.setDepth(50)

    // Truck — off-screen right until a sale is triggered
    this.truck = new FarmEntity(this, width + 150, height * 0.85, {
      icon: '🚚',
      color: COLORS.truck,
      size: SZ.truck,
    })
    this.truck.setDepth(60)

    // Corn warehouse — top-center, clickable
    this.cornWarehouse = new FarmEntity(this, width / 2, height * 0.09, {
      icon: '🌽',
      label: `Comprar maíz ×${FARM_LEVEL1.cornPerRecharge}  $${CORN_BATCH_PRICE}`,
      color: COLORS.corn,
      size: SZ.cornWarehouse,
      interactive: true,
    }).onClick(() => useFarmStore.getState().rechargeCorn())

    // Corn stock counter — to the right of the warehouse
    this.cornStockText = this.add
      .text(width / 2 + 74, height * 0.09, '🌽 ×0', {
        fontSize: '16px',
        color: '#fdd835',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5)
      .setDepth(30)

    // Chicken shop — top-left
    this.chickenShop = new FarmEntity(this, width * 0.11, height * 0.09, {
      icon: '🐔',
      label: `Comprar gallina  $${FARM_LEVEL1.chickenBuyPrice}`,
      color: COLORS.chickenShop,
      size: SZ.chickenShop,
      interactive: true,
    }).onClick(() => useFarmStore.getState().buyChicken())

    // Egg warehouse — bottom-right, opens sell modal
    this.eggWarehouse = new FarmEntity(this, width * 0.86, height * 0.88, {
      icon: '🥚',
      label: 'Almacén',
      color: COLORS.eggWarehouse,
      size: SZ.eggWarehouse,
      interactive: true,
    }).onClick(() => this.openSellModal())

    // Cart — bottom-left, also opens sell modal
    this.cart = new FarmEntity(this, width * 0.13, height * 0.88, {
      icon: '🛒',
      label: 'Vender',
      color: COLORS.cart,
      size: SZ.cart,
      interactive: true,
    }).onClick(() => this.openSellModal())

    this.scale.on('resize', () => this.relayout())
  }

  private openSellModal(): void {
    if (useFarmStore.getState().saleState !== 'idle') return
    useUiStore.getState().setFarmDialog('sell')
  }

  shutdown(): void {
    this.destroyChickenVisuals()
    this.eggSprites.forEach((s) => s.destroy())
    this.eggSprites.clear()
    this.placedCornSprites.forEach((s) => s.destroy())
    this.placedCornSprites.clear()
    this.tileZones.forEach((z) => z.destroy())
    this.tileZones = []
  }

  update(): void {
    const farm = useFarmStore.getState()

    this.reconcileChickens(farm.chickens, farm.placedCorn.length)
    this.reconcilePlacedCorn(farm.placedCorn)
    this.reconcileEggs(farm.groundEggs)
    this.moveFarmer(farm)

    // Corn stock counter
    const cornStock = farm.cornStock
    this.cornStockText.setText(`🌽 ×${cornStock}`)
    this.cornStockText.setColor(cornStock > 0 ? '#fdd835' : '#ffffff66')

    // Egg warehouse — live count + LLENO warning
    const full = farm.warehouseEggs >= FARM_LEVEL1.maxWarehouseEggs
    this.eggWarehouse.setLabel(
      `🥚 ${farm.warehouseEggs}/${FARM_LEVEL1.maxWarehouseEggs}${full ? '  ¡LLENO!' : ''}`
    )
    this.eggWarehouse.setAlpha(full ? 0.85 : 1)

    // Chicken shop — dim when at max
    this.chickenShop.setAlpha(farm.chickens.length >= FARM_LEVEL1.maxChickens ? 0.4 : 1)

    // Truck animation
    if (farm.saleState === 'in-transit' && !this.truckAnimating) {
      this.startTruckAnimation()
    }
  }

  // ── Chicken visuals ────────────────────────────────────────────────────────

  private reconcileChickens(chickens: Chicken[], placedCornCount: number): void {
    const liveIds = new Set(chickens.map((c) => c.id))

    for (const [id] of this.chickenSprites) {
      if (!liveIds.has(id)) {
        this.chickenSprites.get(id)?.destroy()
        this.chickenHungerBars.get(id)?.destroy()
        this.chickenHungerAlerts.get(id)?.destroy()
        this.chickenSprites.delete(id)
        this.chickenHungerBars.delete(id)
        this.chickenHungerAlerts.delete(id)
      }
    }

    for (const chicken of chickens) {
      if (!this.chickenSprites.has(chicken.id)) {
        const pos = this.iso.toScreen(chicken.col, chicken.row)
        const sprite = new FarmEntity(this, pos.x, pos.y, {
          icon: '🐔',
          color: COLORS.chicken,
          size: SZ.chicken,
        })
        sprite.setDepth(15)
        this.chickenSprites.set(chicken.id, sprite)

        const bar = this.add.graphics().setDepth(20)
        this.chickenHungerBars.set(chicken.id, bar)

        const alert = this.add
          .text(pos.x, pos.y, '🌽 ¡Sin maíz!', {
            fontSize: '13px',
            color: '#ffffff',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            backgroundColor: '#c62828',
            padding: { x: 5, y: 3 },
          })
          .setOrigin(0.5, 1)
          .setDepth(21)
          .setVisible(false)
        this.chickenHungerAlerts.set(chicken.id, alert)
      }

      // Lerp sprite toward target tile
      const sprite = this.chickenSprites.get(chicken.id)!
      const target = this.iso.toScreen(chicken.col, chicken.row)
      sprite.x += (target.x - sprite.x) * 0.12
      sprite.y += (target.y - sprite.y) * 0.12

      this.drawChickenHunger(
        this.chickenHungerBars.get(chicken.id)!,
        this.chickenHungerAlerts.get(chicken.id)!,
        sprite,
        chicken,
        placedCornCount
      )
    }
  }

  /**
   * Activity bar above each chicken.
   * - laying   → green fill (progress to egg)
   * - seeking  → orange (walking to corn)
   * - wandering + corn available → yellow
   * - wandering + no corn → red empty + blinking alert
   */
  private drawChickenHunger(
    bar: Phaser.GameObjects.Graphics,
    alert: Phaser.GameObjects.Text,
    sprite: FarmEntity,
    chicken: Chicken,
    placedCornCount: number
  ): void {
    let frac: number
    let barColor: number

    if (chicken.state === 'laying') {
      frac = Phaser.Math.Clamp(chicken.layTimerSec / FARM_LEVEL1.eggLayTimeSec, 0, 1)
      barColor = 0x43a047
    } else if (chicken.state === 'seeking') {
      frac = 0.4
      barColor = 0xfb8c00
    } else {
      frac = placedCornCount > 0 ? 0.2 : 0
      barColor = placedCornCount > 0 ? 0xfdd835 : 0xe53935
    }

    const w = 54
    const h = 7
    const cx = sprite.x
    // The chicken box top is at sprite.y - SZ.chicken*0.85
    const top = sprite.y - SZ.chicken * 0.85 - 12

    bar.clear()
    bar.fillStyle(0x000000, 0.45)
    bar.fillRoundedRect(cx - w / 2, top, w, h, 2)
    if (frac > 0) {
      bar.fillStyle(barColor, 1)
      bar.fillRoundedRect(cx - w / 2, top, w * frac, h, 2)
    }
    bar.lineStyle(1, 0x000000, 0.5)
    bar.strokeRoundedRect(cx - w / 2, top, w, h, 2)

    const hungry = chicken.state === 'wandering' && placedCornCount === 0
    alert.setPosition(cx, top - 4).setVisible(hungry)
    if (hungry) alert.setAlpha(0.55 + 0.45 * Math.sin(this.time.now / 200))
  }

  private destroyChickenVisuals(): void {
    this.chickenSprites.forEach((s) => s.destroy())
    this.chickenHungerBars.forEach((g) => g.destroy())
    this.chickenHungerAlerts.forEach((t) => t.destroy())
    this.chickenSprites.clear()
    this.chickenHungerBars.clear()
    this.chickenHungerAlerts.clear()
  }

  // ── Truck animation ────────────────────────────────────────────────────────

  private startTruckAnimation(): void {
    this.truckAnimating = true
    const { width, height } = this.scale
    const y = height * 0.85

    this.truck.setPosition(width + 150, y).setScale(1, 1)

    // Phase 1: enter from right (faces left)
    this.tweens.add({
      targets: this.truck,
      x: width * 0.5,
      duration: 900,
      ease: 'Linear',
      onStart: () => this.truck.setScale(-1, 1),
      onComplete: () => {
        // Phase 2: pause, then exit left (to market)
        this.time.delayedCall(350, () => {
          this.tweens.add({
            targets: this.truck,
            x: -150,
            duration: 700,
            ease: 'Linear',
            onComplete: () => {
              // Phase 3: return from left (faces right, carrying cash)
              this.time.delayedCall(500, () => {
                this.truck.setScale(1, 1)
                this.tweens.add({
                  targets: this.truck,
                  x: width * 0.5,
                  duration: 900,
                  ease: 'Linear',
                  onComplete: () => {
                    // Phase 4: pause, exit right
                    this.time.delayedCall(350, () => {
                      this.tweens.add({
                        targets: this.truck,
                        x: width + 150,
                        duration: 700,
                        ease: 'Linear',
                        onComplete: () => {
                          useFarmStore.getState().completeSale()
                          this.truckAnimating = false
                        },
                      })
                    })
                  },
                })
              })
            },
          })
        })
      },
    })
  }

  // ── Grid floor & zones ─────────────────────────────────────────────────────

  private drawFloor(): void {
    this.floor.clear()
    for (let row = 0; row < FARM_GRID.rows; row++) {
      for (let col = 0; col < FARM_GRID.cols; col++) {
        const pts = this.iso.diamondPoints(col, row)
        this.floor.fillStyle((col + row) % 2 === 0 ? COLORS.tileA : COLORS.tileB, 1)
        this.floor.lineStyle(1, COLORS.tileLine, 0.4)
        this.floor.beginPath()
        this.floor.moveTo(pts[0].x, pts[0].y)
        pts.slice(1).forEach((p) => this.floor.lineTo(p.x, p.y))
        this.floor.closePath()
        this.floor.fillPath()
        this.floor.strokePath()
      }
    }
  }

  private createTileZones(): void {
    for (let row = 0; row < FARM_GRID.rows; row++) {
      for (let col = 0; col < FARM_GRID.cols; col++) {
        const pos = this.iso.toScreen(col, row)
        const zone = this.add
          .zone(pos.x, pos.y, this.iso.tileWidth, this.iso.tileHeight)
          .setDepth(-2)
          .setInteractive({ useHandCursor: true })
        zone.on('pointerdown', () => useFarmStore.getState().placeCorn(col, row))
        this.tileZones.push(zone)
      }
    }
  }

  // ── Entity reconcilers ─────────────────────────────────────────────────────

  private reconcilePlacedCorn(corns: PlacedCorn[]): void {
    const liveIds = new Set(corns.map((c) => c.id))
    for (const [id, sprite] of this.placedCornSprites) {
      if (!liveIds.has(id)) {
        sprite.destroy()
        this.placedCornSprites.delete(id)
      }
    }
    for (const corn of corns) {
      if (!this.placedCornSprites.has(corn.id)) {
        const pos = this.iso.toScreen(corn.col, corn.row)
        const sprite = new FarmEntity(this, pos.x, pos.y, {
          icon: '🌽',
          color: COLORS.corn,
          size: SZ.corn,
        })
        sprite.setDepth(8)
        this.placedCornSprites.set(corn.id, sprite)
      }
    }
  }

  private reconcileEggs(
    eggs: { id: string; col: number; row: number; collecting: boolean; ageTimerSec: number }[]
  ): void {
    const liveIds = new Set(eggs.map((e) => e.id))
    for (const [id, sprite] of this.eggSprites) {
      if (!liveIds.has(id)) {
        sprite.destroy()
        this.eggSprites.delete(id)
      }
    }
    for (const egg of eggs) {
      let sprite = this.eggSprites.get(egg.id)
      if (!sprite) {
        const pos = this.iso.toScreen(egg.col, egg.row)
        sprite = new FarmEntity(this, pos.x, pos.y, {
          icon: '🥚',
          color: COLORS.egg,
          size: SZ.egg,
          interactive: true,
        }).onClick(() => useFarmStore.getState().requestCollect(egg.id))
        sprite.setDepth(10)
        this.eggSprites.set(egg.id, sprite)
      }

      // Urgency color + alpha pulse near spoil
      const spoilRatio = egg.ageTimerSec / FARM_LEVEL1.eggSpoilTimeSec
      let eggColor: number
      let eggAlpha = 1
      if (egg.collecting) {
        eggColor = COLORS.eggCollecting
      } else if (spoilRatio >= 0.8) {
        eggColor = 0xe53935
        eggAlpha = 0.35 + 0.65 * Math.abs(Math.sin(this.time.now / 160))
      } else if (spoilRatio >= 0.5) {
        eggColor = 0xff8f00
      } else {
        eggColor = COLORS.egg
      }
      sprite.setColor(eggColor)
      sprite.setAlpha(eggAlpha)
    }
  }

  private moveFarmer(farm: ReturnType<typeof useFarmStore.getState>): void {
    let targetX = this.farmerHome.x
    let targetY = this.farmerHome.y

    if (farm.farmer.state === 'working' && farm.farmer.targetEggId) {
      const egg = farm.groundEggs.find((e) => e.id === farm.farmer.targetEggId)
      if (egg) {
        const pos = this.iso.toScreen(egg.col, egg.row)
        targetX = pos.x
        targetY = pos.y
      }
    }

    this.farmer.x += (targetX - this.farmer.x) * 0.15
    this.farmer.y += (targetY - this.farmer.y) * 0.15
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  private relayout(): void {
    const { width, height } = this.scale
    this.iso.setOrigin(width / 2, height * 0.26)
    this.drawFloor()

    this.tileZones.forEach((z) => z.destroy())
    this.tileZones = []
    this.createTileZones()

    this.cornWarehouse.setPosition(width / 2, height * 0.09)
    this.cornStockText.setPosition(width / 2 + 74, height * 0.09)
    this.chickenShop.setPosition(width * 0.11, height * 0.09)
    this.eggWarehouse.setPosition(width * 0.86, height * 0.88)
    this.cart.setPosition(width * 0.13, height * 0.88)
    this.farmerHome.set(width / 2, height * 0.82)

    if (!this.truckAnimating) {
      this.truck.setPosition(width + 150, height * 0.85)
    }

    this.placedCornSprites.forEach((s) => s.destroy())
    this.placedCornSprites.clear()
    this.eggSprites.forEach((s) => s.destroy())
    this.eggSprites.clear()
  }
}
