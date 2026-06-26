import Phaser from 'phaser'
import { IsoGrid } from '../objects/IsoGrid'
import { FarmEntity } from '../objects/FarmEntity'
import { useFarmStore, FARM_GRID, type Chicken, type PlacedCorn } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'
import chickenSheetUrl from '@/assets/sprites/chicken_sheet.png'
import farmerSheetUrl from '@/assets/sprites/farmer_sheet.png'
import eggUrl from '@/assets/sprites/egg.png'
import cornScatterUrl from '@/assets/sprites/corn_scatter.png'
import terrainUrl from '@/assets/sprites/terrain_tiles.png'
import fenceUrl from '@/assets/sprites/fence_sheet.png'
import decorationsUrl from '@/assets/sprites/decorations_sheet.png'
import butterflyUrl from '@/assets/sprites/butterfly_sheet.png'
import backgroundUrl from '@/assets/sprites/background.jpg'
import cornWarehouseUrl from '@/assets/sprites/corn_warehouse.png'
import cornStockBadgeUrl from '@/assets/sprites/corn_stock_badge.png'
import coinUrl from '@/assets/sprites/coin.png'

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
const CHICKEN_ANIM = {
  idle: { start: 0, end: 3, rate: 4 },
  walk: { start: 6, end: 11, rate: 8 },
  eat: { start: 12, end: 15, rate: 6 },
  lay: { start: 18, end: 22, rate: 5 },
} as const

const FARMER_ANIM = {
  idle: { start: 0, end: 5, rate: 5, repeat: -1 },
  walk: { start: 6, end: 11, rate: 8, repeat: -1 },
  collect: { start: 12, end: 15, rate: 7, repeat: 0 },
  carry: { start: 18, end: 23, rate: 8, repeat: -1 },
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

export class FarmScene extends Phaser.Scene {
  private iso!: IsoGrid
  private farmer!: Phaser.GameObjects.Sprite
  private farmerCarrying = false
  private farmerPrevState: 'idle' | 'working' = 'idle'
  private truck!: FarmEntity
  private cornWarehouseSprite!: Phaser.GameObjects.Sprite
  private cornStockBadge!: Phaser.GameObjects.Sprite
  private cornPriceCoin!: Phaser.GameObjects.Sprite
  private cornPriceText!: Phaser.GameObjects.Text
  private eggWarehouse!: FarmEntity
  private cart!: FarmEntity
  private chickenShop!: FarmEntity
  private bgImage!: Phaser.GameObjects.Image
  private tileSprites: Phaser.GameObjects.Image[] = []
  private fenceSprites: Phaser.GameObjects.Image[] = []
  private decorationSprites: Phaser.GameObjects.Image[] = []
  private butterflies: Phaser.GameObjects.Sprite[] = []
  private butterflyTime = 0

  // Animated chicken sprites
  private chickenSprites = new Map<string, Phaser.GameObjects.Sprite>()
  private chickenHungerBars = new Map<string, Phaser.GameObjects.Graphics>()
  private chickenHungerAlerts = new Map<string, Phaser.GameObjects.Text>()

  private eggSprites = new Map<string, Phaser.GameObjects.Image>()
  private placedCornSprites = new Map<string, Phaser.GameObjects.Sprite>()
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
    this.load.spritesheet('farmer', farmerSheetUrl, {
      frameWidth: 128,
      frameHeight: 128,
    })
    this.load.image('egg', eggUrl)
    this.load.spritesheet('corn_scatter', cornScatterUrl, { frameWidth: 192, frameHeight: 96 })
    this.load.spritesheet('terrain', terrainUrl, { frameWidth: 96, frameHeight: 48 })
    this.load.spritesheet('fence', fenceUrl, { frameWidth: 96, frameHeight: 128 })
    this.load.spritesheet('decorations', decorationsUrl, { frameWidth: 96, frameHeight: 128 })
    this.load.spritesheet('butterfly', butterflyUrl, { frameWidth: 32, frameHeight: 32 })
    this.load.image('background', backgroundUrl)
    this.load.spritesheet('corn_warehouse', cornWarehouseUrl, { frameWidth: 256, frameHeight: 256 })
    this.load.spritesheet('corn_stock_badge', cornStockBadgeUrl, {
      frameWidth: 64,
      frameHeight: 64,
    })
    this.load.spritesheet('coin', coinUrl, { frameWidth: 64, frameHeight: 64 })
  }

  create(): void {
    const { width, height } = this.scale

    this.bgImage = this.add
      .image(0, 0, 'background')
      .setOrigin(0, 0)
      .setDisplaySize(width, height)
      .setDepth(-100)

    this.iso = new IsoGrid({
      originX: width / 2,
      originY: height * 0.25,
      tileWidth: 96,
      tileHeight: 48,
    })

    this.placeTileSprites()
    this.placeFenceSprites()
    this.placeDecorations()
    this.createTileZones()

    // Butterfly animation
    this.anims.create({
      key: 'butterfly_fly',
      frames: this.anims.generateFrameNumbers('butterfly', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    })
    this.createButterflies()

    // Corn scatter animations
    this.anims.create({
      key: 'corn_scatter',
      frames: this.anims.generateFrameNumbers('corn_scatter', { start: 0, end: 4 }),
      frameRate: 10,
      repeat: 0,
    })
    this.anims.create({
      key: 'corn_idle',
      frames: this.anims.generateFrameNumbers('corn_scatter', { start: 4, end: 5 }),
      frameRate: 2,
      repeat: -1,
    })
    this.anims.create({
      key: 'coin_spin',
      frames: this.anims.generateFrameNumbers('coin', { start: 0, end: 7 }),
      frameRate: 8,
      repeat: -1,
    })

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
      repeat: -1,
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

    // Farmer animations
    this.anims.create({
      key: 'farmer_idle',
      frames: this.anims.generateFrameNumbers('farmer', {
        start: FARMER_ANIM.idle.start,
        end: FARMER_ANIM.idle.end,
      }),
      frameRate: FARMER_ANIM.idle.rate,
      repeat: FARMER_ANIM.idle.repeat,
    })
    this.anims.create({
      key: 'farmer_walk',
      frames: this.anims.generateFrameNumbers('farmer', {
        start: FARMER_ANIM.walk.start,
        end: FARMER_ANIM.walk.end,
      }),
      frameRate: FARMER_ANIM.walk.rate,
      repeat: FARMER_ANIM.walk.repeat,
    })
    this.anims.create({
      key: 'farmer_collect',
      frames: this.anims.generateFrameNumbers('farmer', {
        start: FARMER_ANIM.collect.start,
        end: FARMER_ANIM.collect.end,
      }),
      frameRate: FARMER_ANIM.collect.rate,
      repeat: FARMER_ANIM.collect.repeat,
    })
    this.anims.create({
      key: 'farmer_carry',
      frames: this.anims.generateFrameNumbers('farmer', {
        start: FARMER_ANIM.carry.start,
        end: FARMER_ANIM.carry.end,
      }),
      frameRate: FARMER_ANIM.carry.rate,
      repeat: FARMER_ANIM.carry.repeat,
    })

    // Farmer sprite
    this.farmerHome.set(width / 2, height * 0.82)
    this.farmer = this.add
      .sprite(this.farmerHome.x, this.farmerHome.y, 'farmer')
      .setOrigin(0.5, 0.62)
      .setScale(FARM_LEVEL1.farmerScale)
      .setDepth(50)
    this.farmer.play('farmer_idle')

    // Truck — off-screen right until a sale is triggered
    this.truck = new FarmEntity(this, width + 150, height * 0.85, {
      icon: '🚚',
      color: COLORS.truck,
      size: SZ.truck,
    })
    this.truck.setDepth(60)

    // Corn warehouse — left side near the farm grid
    this.cornWarehouseSprite = this.add
      .sprite(width * 0.25, height * 0.25, 'corn_warehouse', 0)
      .setOrigin(0.5, 0.5)
      .setScale(0.75)
      .setDepth(30)
      .setInteractive({ useHandCursor: true })
    this.cornWarehouseSprite.on('pointerdown', () => {
      useFarmStore.getState().rechargeCorn()
      this.cornWarehouseSprite.setFrame(1)
      this.time.delayedCall(400, () => this.cornWarehouseSprite.setFrame(0))
    })

    this.cornStockBadge = this.add
      .sprite(width * 0.25 + 105, height * 0.25, 'corn_stock_badge', 0)
      .setOrigin(0.5, 0.5)
      .setScale(1.2)
      .setDepth(32)

    // Corn price — coin + text to the LEFT of the warehouse barn (visible only when store is open)
    const cornBatchPrice = FARM_LEVEL1.cornUnitCost * FARM_LEVEL1.cornPerRecharge
    this.cornPriceCoin = this.add
      .sprite(width * 0.25 - 26, height * 0.25 - 90, 'coin', 0)
      .setOrigin(0.5, 0.5)
      .setScale(0.55)
      .setDepth(33)
      .setVisible(false)
    this.cornPriceCoin.play('coin_spin')
    this.cornPriceText = this.add
      .text(width * 0.25 - 8, height * 0.25 - 90, `$${cornBatchPrice}`, {
        fontSize: '28px',
        color: '#FFD700',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5)
      .setDepth(33)
      .setVisible(false)

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
    this.reconcilePlacedCorn(farm.placedCorn, farm.chickens)
    this.reconcileEggs(farm.groundEggs)
    this.moveFarmer(farm)

    const cornStock = farm.cornStock
    this.cornStockBadge.setFrame(Math.min(5, cornStock))
    const storeOpen = cornStock === 0
    this.cornWarehouseSprite.setAlpha(storeOpen ? 1 : 0.45)
    this.cornPriceCoin.setVisible(storeOpen)
    this.cornPriceText.setVisible(storeOpen)

    const full = farm.warehouseEggs >= FARM_LEVEL1.maxWarehouseEggs
    this.eggWarehouse.setLabel(
      `🥚 ${farm.warehouseEggs}/${FARM_LEVEL1.maxWarehouseEggs}${full ? '  ¡LLENO!' : ''}`
    )
    this.eggWarehouse.setAlpha(full ? 0.85 : 1)

    this.chickenShop.setAlpha(farm.chickens.length >= FARM_LEVEL1.maxChickens ? 0.4 : 1)

    if (farm.saleState === 'in-transit' && !this.truckAnimating) {
      this.startTruckAnimation()
    }

    this.updateButterflies()
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

        const sprite = this.add
          .sprite(pos.x, pos.y, 'chicken')
          .setOrigin(0.5, 0.75)
          .setScale(FARM_LEVEL1.chickenScale)
          .setDepth(15)
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
      sprite.x += dx * FARM_LEVEL1.chickenLerpSpeed
      sprite.y += dy * FARM_LEVEL1.chickenLerpSpeed

      // Animation: wandering uses walk/idle based on actual pixel movement
      const currentAnim = sprite.anims.currentAnim?.key
      let desiredAnim: string
      if (chicken.state === 'laying') desiredAnim = 'chicken_lay'
      else if (chicken.state === 'eating') desiredAnim = 'chicken_eat'
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
    const top = sprite.y - (128 * FARM_LEVEL1.chickenScale) / 2 - 12

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

  // Tile variants at specific positions (rest alternate plain/dark grass)
  private static readonly TILE_VARIANTS: Record<string, number> = {
    '2,3': 1,
    '5,7': 1,
    '8,2': 1,
    '10,9': 1,
    '3,10': 1,
    '7,4': 1,
    '11,6': 1,
    '1,8': 4,
    '9,3': 4,
    '4,11': 4,
    '6,1': 5,
    '1,1': 5,
    '1,2': 5,
    '0,0': 6,
    '0,1': 6,
    '0,2': 6,
    '0,3': 6,
    '0,4': 6,
    '0,5': 6,
    '0,6': 6,
    '0,7': 6,
    '0,8': 6,
    '0,9': 6,
    '0,10': 6,
    '0,11': 6,
    '2,6': 0,
    '2,7': 0,
    '2,8': 0,
    '3,6': 0,
    '3,7': 0,
    '3,8': 0,
    '4,6': 0,
    '4,7': 0,
    '3,11': 0,
    '4,10': 0,
    '10,11': 6,
    '10,10': 6,
    '11,10': 6,
    '11,11': 6,
    '8,11': 7,
    '8,10': 7,
    '9,10': 7,
    '9,11': 7,
    '9,9': 7,
  }

  private placeTileSprites(): void {
    this.tileSprites.forEach((s) => s.destroy())
    this.tileSprites = []
    for (let row = 0; row < FARM_GRID.rows; row++) {
      for (let col = 0; col < FARM_GRID.cols; col++) {
        const pos = this.iso.toScreen(col, row)
        const key = `${col},${row}`
        const frame = FarmScene.TILE_VARIANTS[key] ?? 3
        const img = this.add.image(pos.x, pos.y, 'terrain', frame).setOrigin(0.5, 0.5).setDepth(-1)
        this.tileSprites.push(img)
      }
    }
  }

  private placeFenceSprites(): void {
    this.fenceSprites.forEach((s) => s.destroy())
    this.fenceSprites = []
    const hw = this.iso.tileWidth / 2 // 48
    const hh = this.iso.tileHeight / 2 // 24

    // Left edge (col=0): start from row=1 to avoid crossing at the top corner
    for (let row = 1; row < FARM_GRID.rows; row++) {
      const c = this.iso.toScreen(0, row)
      this.fenceSprites.push(
        this.add
          .image(c.x + hw / 2, c.y + hh / 2, 'fence', 1)
          .setOrigin(0.5, 1)
          .setDepth(2)
      )
    }
    // Top edge (row=0): start from col=1 to avoid crossing at the top corner
    for (let col = 1; col < FARM_GRID.cols; col++) {
      const c = this.iso.toScreen(col, 0)
      this.fenceSprites.push(
        this.add
          .image(c.x - hw / 2, c.y + hh / 2, 'fence', 0)
          .setOrigin(0.5, 1)
          .setDepth(2)
      )
    }
  }

  private placeDecorations(): void {
    this.decorationSprites.forEach((s) => s.destroy())
    this.decorationSprites = []

    // Place decorations just outside the grid boundary (not on walkable tiles)
    const rightMid = this.iso.toScreen(FARM_GRID.cols - 1, Math.floor(FARM_GRID.rows / 2))

    const spots = [
      { x: rightMid.x + 80, y: rightMid.y + 40, frame: 3 }, // well — right lower
    ]

    for (const s of spots) {
      this.decorationSprites.push(
        this.add.image(s.x, s.y, 'decorations', s.frame).setOrigin(0.5, 1).setDepth(4)
      )
    }
  }

  private createButterflies(): void {
    this.butterflies.forEach((b) => b.destroy())
    this.butterflies = []

    // One near the left edge, one near the right edge
    const leftBase = this.iso.toScreen(0, Math.floor(FARM_GRID.rows / 2))
    const rightBase = this.iso.toScreen(FARM_GRID.cols - 1, Math.floor(FARM_GRID.rows / 2))

    for (const base of [leftBase, rightBase]) {
      const b = this.add
        .sprite(base.x, base.y, 'butterfly')
        .setScale(0.7)
        .setDepth(25)
        .setAlpha(0.85)
      b.play('butterfly_fly')
      this.butterflies.push(b)
    }
  }

  private updateButterflies(): void {
    this.butterflyTime += 0.012
    const leftBase = this.iso.toScreen(0, Math.floor(FARM_GRID.rows / 2))
    const rightBase = this.iso.toScreen(FARM_GRID.cols - 1, Math.floor(FARM_GRID.rows / 2))
    const bases = [leftBase, rightBase]
    const phases = [0, Math.PI]

    for (let i = 0; i < this.butterflies.length; i++) {
      const t = this.butterflyTime + phases[i]
      const base = bases[i]
      const bx = base.x + 30 * Math.sin(t)
      const by = base.y + 15 * Math.sin(t * 2) - 20
      const b = this.butterflies[i]
      if (b.x - bx > 1) b.setFlipX(true)
      if (bx - b.x > 1) b.setFlipX(false)
      b.x = bx
      b.y = by
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

  private reconcilePlacedCorn(corns: PlacedCorn[], _chickens: Chicken[]): void {
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
        const sprite = this.add
          .sprite(pos.x, pos.y, 'corn_scatter')
          .setOrigin(0.5, 0.5)
          .setScale(0.5)
          .setDepth(8)
        sprite.play('corn_scatter')
        sprite.once('animationcomplete', () => sprite.play('corn_idle'))
        this.placedCornSprites.set(corn.id, sprite)
      }

      // Shrink based on remaining energy — reflects real consumption across all chickens
      const consumed = 1 - corn.remainingEnergy / FARM_LEVEL1.chickenCornEnergyRestore
      const sprite = this.placedCornSprites.get(corn.id)!
      sprite.setScale(0.5 * (1 - consumed * 0.85))
      sprite.setAlpha(1 - consumed * 0.5)
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
        sprite = this.add
          .image(pos.x, pos.y, 'egg')
          .setOrigin(0.5, 0.85)
          .setScale(SZ.egg / 64)
          .setDepth(10)
          .setInteractive({ useHandCursor: true })
        sprite.on('pointerdown', () => useFarmStore.getState().requestCollect(egg.id))
        this.eggSprites.set(egg.id, sprite)
      }

      const spoilRatio = egg.ageTimerSec / FARM_LEVEL1.eggSpoilTimeSec
      if (egg.collecting) {
        sprite.setTint(0xffd54f).setAlpha(1)
      } else if (spoilRatio >= 0.8) {
        sprite.setTint(0xe53935).setAlpha(0.35 + 0.65 * Math.abs(Math.sin(this.time.now / 160)))
      } else if (spoilRatio >= 0.5) {
        sprite.setTint(0xff8f00).setAlpha(1)
      } else {
        sprite.clearTint().setAlpha(1)
      }
    }
  }

  private moveFarmer(farm: ReturnType<typeof useFarmStore.getState>): void {
    let targetX = this.farmerHome.x
    let targetY = this.farmerHome.y
    let goingToEgg = false

    if (farm.farmer.state === 'working' && farm.farmer.targetEggId) {
      const egg = farm.groundEggs.find((e) => e.id === farm.farmer.targetEggId)
      if (egg) {
        const pos = this.iso.toScreen(egg.col, egg.row)
        targetX = pos.x
        targetY = pos.y
        goingToEgg = true
      }
    }

    const dx = targetX - this.farmer.x
    const dy = targetY - this.farmer.y
    const isMoving = Math.sqrt(dx * dx + dy * dy) > 4

    // Flip toward movement direction
    if (Math.abs(dx) > 2) this.farmer.setFlipX(dx < 0)

    this.farmer.x += dx * FARM_LEVEL1.farmerLerpSpeed
    this.farmer.y += dy * FARM_LEVEL1.farmerLerpSpeed

    // Track carrying: set true when store transitions working→idle (egg just collected),
    // clear when farmer physically arrives back home.
    if (this.farmerPrevState === 'working' && farm.farmer.state === 'idle') {
      this.farmerCarrying = true
    }
    if (farm.farmer.state === 'idle' && !isMoving) {
      this.farmerCarrying = false
    }
    this.farmerPrevState = farm.farmer.state

    // Animation
    const currentAnim = this.farmer.anims.currentAnim?.key
    let desiredAnim: string
    if (goingToEgg && !isMoving) {
      desiredAnim = 'farmer_collect'
    } else if (this.farmerCarrying && isMoving) {
      desiredAnim = 'farmer_carry'
    } else if (isMoving) {
      desiredAnim = 'farmer_walk'
    } else {
      desiredAnim = 'farmer_idle'
    }
    if (currentAnim !== desiredAnim) this.farmer.play(desiredAnim)
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  private relayout(): void {
    const { width, height } = this.scale
    this.bgImage.setDisplaySize(width, height)
    this.iso.setOrigin(width / 2, height * 0.25)

    this.placeTileSprites()
    this.placeFenceSprites()
    this.placeDecorations()
    this.createButterflies()

    this.tileZones.forEach((z) => z.destroy())
    this.tileZones = []
    this.createTileZones()

    this.cornWarehouseSprite.setPosition(width * 0.25, height * 0.25)
    this.cornStockBadge.setPosition(width * 0.25 + 105, height * 0.25)
    this.cornPriceCoin.setPosition(width * 0.25 - 26, height * 0.25 - 90)
    this.cornPriceText.setPosition(width * 0.25 - 8, height * 0.25 - 90)
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
