import Phaser from 'phaser'
import { IsoGrid } from '../objects/IsoGrid'
import { FarmEntity } from '../objects/FarmEntity'
import { useFarmStore, FARM_GRID, type Chicken, type PlacedCorn } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'
import chickenSheetUrl from '@/assets/sprites/chicken_sheet.png'

// ─── Visual sizes ──────────────────────────────────────────────────────────────
const SZ = {
  egg: 34,
  corn: 30,
  farmer: 48,
  truck: 70,
  cornWarehouse: 66,
  chickenShop: 58,
  eggWarehouse: 66,
  cart: 58,
} as const

// Chicken sprite sheet layout (128×128 px per frame, 6 cols × 4 rows = 768×512)
const CHICKEN_SCALE = 0.52 // renders ~66px on screen
const CHICKEN_ANIM = {
  idle: { start: 0, end: 3, rate: 4 },
  walk: { start: 6, end: 11, rate: 8 },
  eat: { start: 12, end: 15, rate: 6 },
  lay: { start: 18, end: 22, rate: 5 },
} as const

const COLORS = {
  bg: 0x88c057,
  tileA: 0x7cb342,
  tileB: 0x8bc34a,
  tileLine: 0x558b2f,
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

  // Animated chicken sprites
  private chickenSprites = new Map<string, Phaser.GameObjects.Sprite>()
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

  preload(): void {
    this.load.spritesheet('chicken', chickenSheetUrl, {
      frameWidth: 128,
      frameHeight: 128,
    })
  }

  create(): void {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.bg)

    this.iso = new IsoGrid({
      originX: width / 2,
      originY: height * 0.18,
      tileWidth: 96,
      tileHeight: 48,
    })

    this.floor = this.add.graphics().setDepth(-1)
    this.drawFloor()
    this.createTileZones()

    // Register chicken animations
    this.anims.create({
      key: 'chicken_idle',
      frames: this.anims.generateFrameNumbers('chicken', {
        start: CHICKEN_ANIM.idle.start,
        end: CHICKEN_ANIM.idle.end,
      }),
      frameRate: CHICKEN_ANIM.idle.rate,
      repeat: -1,
    })
    this.anims.create({
      key: 'chicken_walk',
      frames: this.anims.generateFrameNumbers('chicken', {
        start: CHICKEN_ANIM.walk.start,
        end: CHICKEN_ANIM.walk.end,
      }),
      frameRate: CHICKEN_ANIM.walk.rate,
      repeat: -1,
    })
    this.anims.create({
      key: 'chicken_eat',
      frames: this.anims.generateFrameNumbers('chicken', {
        start: CHICKEN_ANIM.eat.start,
        end: CHICKEN_ANIM.eat.end,
      }),
      frameRate: CHICKEN_ANIM.eat.rate,
      repeat: 0,
    })
    this.anims.create({
      key: 'chicken_lay',
      frames: this.anims.generateFrameNumbers('chicken', {
        start: CHICKEN_ANIM.lay.start,
        end: CHICKEN_ANIM.lay.end,
      }),
      frameRate: CHICKEN_ANIM.lay.rate,
      repeat: 0,
    })

    // Farmer
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

    // Corn warehouse — top-center
    this.cornWarehouse = new FarmEntity(this, width / 2, height * 0.09, {
      icon: '🌽',
      label: `Comprar maíz ×${FARM_LEVEL1.cornPerRecharge}  $${CORN_BATCH_PRICE}`,
      color: COLORS.corn,
      size: SZ.cornWarehouse,
      interactive: true,
    }).onClick(() => useFarmStore.getState().rechargeCorn())

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

    // Egg warehouse — bottom-right
    this.eggWarehouse = new FarmEntity(this, width * 0.86, height * 0.88, {
      icon: '🥚',
      label: 'Almacén',
      color: COLORS.eggWarehouse,
      size: SZ.eggWarehouse,
      interactive: true,
    }).onClick(() => this.openSellModal())

    // Cart — bottom-left
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

    const cornStock = farm.cornStock
    this.cornStockText.setText(`🌽 ×${cornStock}`)
    this.cornStockText.setColor(cornStock > 0 ? '#fdd835' : '#ffffff66')

    const full = farm.warehouseEggs >= FARM_LEVEL1.maxWarehouseEggs
    this.eggWarehouse.setLabel(
      `🥚 ${farm.warehouseEggs}/${FARM_LEVEL1.maxWarehouseEggs}${full ? '  ¡LLENO!' : ''}`
    )
    this.eggWarehouse.setAlpha(full ? 0.85 : 1)

    this.chickenShop.setAlpha(farm.chickens.length >= FARM_LEVEL1.maxChickens ? 0.4 : 1)

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

        const sprite = this.add.sprite(pos.x, pos.y, 'chicken').setScale(CHICKEN_SCALE).setDepth(15)
        sprite.play('chicken_idle')
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

      const sprite = this.chickenSprites.get(chicken.id)!
      const target = this.iso.toScreen(chicken.col, chicken.row)
      const dx = target.x - sprite.x
      const dy = target.y - sprite.y
      const isMoving = Math.sqrt(dx * dx + dy * dy) > 4

      // Flip horizontally based on movement direction
      if (Math.abs(dx) > 2) sprite.setFlipX(dx < 0)

      // Lerp toward target tile
      sprite.x += dx * 0.12
      sprite.y += dy * 0.12

      // Animation: wandering uses walk/idle based on actual pixel movement
      const currentAnim = sprite.anims.currentAnim?.key
      let desiredAnim: string
      if (chicken.state === 'laying') desiredAnim = 'chicken_lay'
      else if (chicken.state === 'seeking') desiredAnim = 'chicken_walk'
      else desiredAnim = isMoving ? 'chicken_walk' : 'chicken_idle'
      if (currentAnim !== desiredAnim) sprite.play(desiredAnim)

      this.drawChickenHunger(
        this.chickenHungerBars.get(chicken.id)!,
        this.chickenHungerAlerts.get(chicken.id)!,
        sprite,
        chicken,
        placedCornCount
      )
    }
  }

  private drawChickenHunger(
    bar: Phaser.GameObjects.Graphics,
    alert: Phaser.GameObjects.Text,
    sprite: Phaser.GameObjects.Sprite,
    chicken: Chicken,
    placedCornCount: number
  ): void {
    const energyFrac = chicken.energy / FARM_LEVEL1.chickenMaxEnergy
    const isHungry = chicken.energy <= FARM_LEVEL1.chickenHungerThreshold
    const barColor = isHungry ? 0xe53935 : energyFrac < 0.6 ? 0xfb8c00 : 0x43a047

    const w = 54
    const h = 7
    const cx = sprite.x
    const top = sprite.y - (128 * CHICKEN_SCALE) / 2 - 12

    bar.clear()
    bar.fillStyle(0x000000, 0.45)
    bar.fillRoundedRect(cx - w / 2, top, w, h, 2)
    if (energyFrac > 0) {
      bar.fillStyle(barColor, 1)
      bar.fillRoundedRect(cx - w / 2, top, w * energyFrac, h, 2)
    }
    bar.lineStyle(1, 0x000000, 0.5)
    bar.strokeRoundedRect(cx - w / 2, top, w, h, 2)

    // Alert when hungry AND no corn available to eat
    const showAlert = isHungry && placedCornCount === 0
    alert.setPosition(cx, top - 4).setVisible(showAlert)
    if (showAlert) alert.setAlpha(0.55 + 0.45 * Math.sin(this.time.now / 200))
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

    this.tweens.add({
      targets: this.truck,
      x: width * 0.5,
      duration: 900,
      ease: 'Linear',
      onStart: () => this.truck.setScale(-1, 1),
      onComplete: () => {
        this.time.delayedCall(350, () => {
          this.tweens.add({
            targets: this.truck,
            x: -150,
            duration: 700,
            ease: 'Linear',
            onComplete: () => {
              this.time.delayedCall(500, () => {
                this.truck.setScale(1, 1)
                this.tweens.add({
                  targets: this.truck,
                  x: width * 0.5,
                  duration: 900,
                  ease: 'Linear',
                  onComplete: () => {
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
    this.iso.setOrigin(width / 2, height * 0.18)
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
