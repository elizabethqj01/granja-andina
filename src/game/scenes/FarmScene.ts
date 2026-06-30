import Phaser from 'phaser'
import { IsoGrid } from '../objects/IsoGrid'

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
import warehouseUrl from '@/assets/sprites/warehouse..png'
import truckUrl from '@/assets/sprites/truck.png'
import scrollIconUrl from '@/assets/sprites/scroll_icon.png'

// ─── Scene layout calibration ──────────────────────────────────────────────────
// All x/y are fractions of canvas width/height. offX/offY are fixed pixel
// offsets on top of the fractional base. Change here → moves everywhere.
const LAYOUT = {
  cornWarehouse: { x: 0.25, y: 0.25, scale: 0.75 },
  cornStockBadge: { x: 0.26, y: 0.25, offX: 105, offY: 0, scale: 1.2 },
  cornPriceCoin: { x: 0.25, y: 0.25, offX: -26, offY: -90, scale: 0.55 },
  cornPriceText: { x: 0.25, y: 0.25, offX: -8, offY: -90 },
  warehouseSprite: { x: 0.86, y: 0.88, scale: 1.2 },
  scrollMPD: { x: 0.18, y: 0.22 },
  scrollWIP: { x: 0.8, y: 0.38 },
  scrollPT: { x: 0.79, y: 0.82 },
  farmerHome: { x: 0.5, y: 0.82 },
  truck: { y: 0.85 },
  scrollIcon: { scale: 0.88 },
} as const

// ─── Visual sizes ──────────────────────────────────────────────────────────────
const SZ = {
  egg: 34,
  corn: 30,
  farmer: 48,
  cornWarehouse: 66,
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

export class FarmScene extends Phaser.Scene {
  private iso!: IsoGrid
  private farmer!: Phaser.GameObjects.Sprite
  private farmerCarrying = false
  private farmerPrevState: 'idle' | 'working' = 'idle'
  private truckSprite!: Phaser.GameObjects.Sprite
  private truckBubble!: Phaser.GameObjects.Text
  private warehouseSprite!: Phaser.GameObjects.Sprite
  private scrollMPD!: Phaser.GameObjects.Container
  private scrollWIP!: Phaser.GameObjects.Container
  private scrollPT!: Phaser.GameObjects.Container
  private cornWarehouseSprite!: Phaser.GameObjects.Sprite
  private cornTooltip!: Phaser.GameObjects.Text
  private warehouseTooltip!: Phaser.GameObjects.Text
  private cornStockBadge!: Phaser.GameObjects.Sprite
  private cornPriceCoin!: Phaser.GameObjects.Sprite
  private cornPriceText!: Phaser.GameObjects.Text
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
  private dyingChickenIds = new Set<string>()
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
    this.load.spritesheet('warehouse', warehouseUrl, { frameWidth: 128, frameHeight: 160 })
    this.load.spritesheet('truck', truckUrl, { frameWidth: 128, frameHeight: 112 })
    this.load.spritesheet('scroll_icon', scrollIconUrl, { frameWidth: 64, frameHeight: 64 })
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

    this.anims.create({
      key: 'truck_roll',
      frames: this.anims.generateFrameNumbers('truck', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1,
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
    this.truckSprite = this.add
      .sprite(width + 150, height * 0.85, 'truck', 0)
      .setOrigin(0.5, 0.5)
      .setScale(0.85)
      .setDepth(60)

    this.truckBubble = this.add
      .text(width + 150, height * 0.85 - 70, '', {
        fontSize: '20px',
        fontFamily: 'Kalam',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(61)
      .setVisible(false)

    // Corn warehouse — left side near the farm grid
    this.cornWarehouseSprite = this.add
      .sprite(width * LAYOUT.cornWarehouse.x, height * LAYOUT.cornWarehouse.y, 'corn_warehouse', 0)
      .setOrigin(0.5, 0.5)
      .setScale(LAYOUT.cornWarehouse.scale)
      .setDepth(30)
      .setInteractive({ useHandCursor: true })
    this.cornWarehouseSprite.on('pointerdown', () => {
      useFarmStore.getState().rechargeCorn()
      this.cornWarehouseSprite.setFrame(1)
      this.time.delayedCall(400, () => this.cornWarehouseSprite.setFrame(0))
    })
    this.cornTooltip = this.add
      .text(
        width * LAYOUT.cornWarehouse.x,
        height * LAYOUT.cornWarehouse.y - 120,
        '🌽 Tienda de maíz',
        {
          fontFamily: 'Kalam',
          fontSize: '17px',
          color: '#FFD700',
          backgroundColor: '#1a0800ee',
          padding: { x: 10, y: 5 },
          stroke: '#000000',
          strokeThickness: 3,
        }
      )
      .setOrigin(0.5, 1)
      .setDepth(60)
      .setVisible(false)
    this.addHoverEffect(this.cornWarehouseSprite, this.cornTooltip, LAYOUT.cornWarehouse.scale)

    this.cornStockBadge = this.add
      .sprite(
        width * LAYOUT.cornStockBadge.x + LAYOUT.cornStockBadge.offX,
        height * LAYOUT.cornStockBadge.y + LAYOUT.cornStockBadge.offY,
        'corn_stock_badge',
        0
      )
      .setOrigin(0.5, 0.5)
      .setScale(LAYOUT.cornStockBadge.scale)
      .setDepth(32)

    // Corn price — coin + text to the LEFT of the warehouse barn (visible only when store is open)
    const cornBatchPrice = FARM_LEVEL1.cornUnitCost * FARM_LEVEL1.cornPerRecharge
    this.cornPriceCoin = this.add
      .sprite(
        width * LAYOUT.cornPriceCoin.x + LAYOUT.cornPriceCoin.offX,
        height * LAYOUT.cornPriceCoin.y + LAYOUT.cornPriceCoin.offY,
        'coin',
        0
      )
      .setOrigin(0.5, 0.5)
      .setScale(LAYOUT.cornPriceCoin.scale)
      .setDepth(33)
      .setVisible(false)
    this.cornPriceCoin.play('coin_spin')
    this.cornPriceText = this.add
      .text(
        width * LAYOUT.cornPriceText.x + LAYOUT.cornPriceText.offX,
        height * LAYOUT.cornPriceText.y + LAYOUT.cornPriceText.offY,
        `$${cornBatchPrice}`,
        {
          fontSize: '28px',
          color: '#FFD700',
          fontFamily: 'Kalam',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
        }
      )
      .setOrigin(0, 0.5)
      .setDepth(33)
      .setVisible(false)

    // Egg warehouse — bottom-right, single interactive sprite
    this.warehouseSprite = this.add
      .sprite(width * LAYOUT.warehouseSprite.x, height * LAYOUT.warehouseSprite.y, 'warehouse', 0)
      .setOrigin(0.5, 0.5)
      .setScale(LAYOUT.warehouseSprite.scale)
      .setDepth(30)
      .setInteractive({ useHandCursor: true })
    this.warehouseSprite.on('pointerdown', () => this.openSellModal())
    this.warehouseTooltip = this.add
      .text(
        width * LAYOUT.warehouseSprite.x,
        height * LAYOUT.warehouseSprite.y - 120,
        '🥚 Almacén de productos',
        {
          fontFamily: 'Kalam',
          fontSize: '17px',
          color: '#FFD700',
          backgroundColor: '#1a0800ee',
          padding: { x: 10, y: 5 },
          stroke: '#000000',
          strokeThickness: 3,
        }
      )
      .setOrigin(0.5, 1)
      .setDepth(60)
      .setVisible(false)
    this.addHoverEffect(this.warehouseSprite, this.warehouseTooltip, LAYOUT.warehouseSprite.scale)

    // Cost-flow scroll buttons — one at each production stage
    this.scrollMPD = this.createScrollButton(
      width * LAYOUT.scrollMPD.x,
      height * LAYOUT.scrollMPD.y,
      'MPD',
      'scroll-mpd'
    )
    this.scrollWIP = this.createScrollButton(
      width * LAYOUT.scrollWIP.x,
      height * LAYOUT.scrollWIP.y,
      'Producción',
      'scroll-wip'
    )
    this.scrollPT = this.createScrollButton(
      width * LAYOUT.scrollPT.x,
      height * LAYOUT.scrollPT.y,
      'PT',
      'scroll-pt'
    )

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
    this.input.enabled = useUiStore.getState().farmDialog === null

    this.reconcileChickens(farm.chickens)
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
    const fillFrame = Math.min(
      4,
      Math.floor((farm.warehouseEggs / FARM_LEVEL1.maxWarehouseEggs) * 5)
    )
    this.warehouseSprite.setFrame(fillFrame)
    this.warehouseSprite.setAlpha(full ? 0.9 : 1)

    if (farm.saleState === 'in-transit' && !this.truckAnimating) {
      this.startTruckAnimation()
    }

    this.updateButterflies()
  }

  // ── Chicken visuals ────────────────────────────────────────────────────────

  private reconcileChickens(chickens: Chicken[]): void {
    const liveIds = new Set(chickens.map((c) => c.id))

    for (const [id] of this.chickenSprites) {
      if (!liveIds.has(id)) {
        this.chickenSprites.get(id)?.destroy()
        this.chickenHungerBars.get(id)?.destroy()
        this.chickenHungerAlerts.get(id)?.destroy()
        this.chickenSprites.delete(id)
        this.chickenHungerBars.delete(id)
        this.chickenHungerAlerts.delete(id)
        this.dyingChickenIds.delete(id)
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
          .text(pos.x, pos.y, '😰 ¡Hambre!', {
            fontSize: '13px',
            color: '#ffffff',
            fontFamily: 'Kalam',
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

      // Death fade — trigger once, then skip all movement/animation
      if (chicken.dead) {
        if (!this.dyingChickenIds.has(chicken.id)) {
          this.dyingChickenIds.add(chicken.id)
          this.tweens.killTweensOf(sprite)
          this.tweens.add({ targets: sprite, alpha: 0, duration: 1500, ease: 'Quad.In' })
          this.chickenHungerBars.get(chicken.id)?.setVisible(false)
          this.chickenHungerAlerts.get(chicken.id)?.setVisible(false)
        }
        continue
      }

      const target = this.iso.toScreen(chicken.col, chicken.row)
      const dx = target.x - sprite.x
      const dy = target.y - sprite.y
      const isMoving = Math.sqrt(dx * dx + dy * dy) > 4

      // Flip horizontally based on movement direction
      if (Math.abs(dx) > 2) sprite.setFlipX(dx < 0)

      // Lerp toward target tile — faster when hungry and seeking corn
      const lerpSpeed =
        chicken.state === 'seeking'
          ? FARM_LEVEL1.chickenHungerLerpSpeed
          : FARM_LEVEL1.chickenLerpSpeed
      sprite.x += dx * lerpSpeed
      sprite.y += dy * lerpSpeed

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
        chicken
      )
    }
  }

  private drawChickenHunger(
    bar: Phaser.GameObjects.Graphics,
    alert: Phaser.GameObjects.Text,
    sprite: Phaser.GameObjects.Sprite,
    chicken: Chicken
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

    // Alert whenever hungry — so the player always knows which chickens need corn
    alert.setPosition(cx, top - 4).setVisible(isHungry)
    if (isHungry) alert.setAlpha(0.55 + 0.45 * Math.sin(this.time.now / 200))
  }

  private destroyChickenVisuals(): void {
    this.chickenSprites.forEach((s) => s.destroy())
    this.chickenHungerBars.forEach((g) => g.destroy())
    this.chickenHungerAlerts.forEach((t) => t.destroy())
    this.chickenSprites.clear()
    this.chickenHungerBars.clear()
    this.chickenHungerAlerts.clear()
    this.dyingChickenIds.clear()
  }

  // ── Hover effects ──────────────────────────────────────────────────────────

  private addHoverEffect(
    sprite: Phaser.GameObjects.Sprite,
    tooltip: Phaser.GameObjects.Text,
    baseScale: number
  ): void {
    sprite.on('pointerover', () => {
      tooltip.setPosition(sprite.x, sprite.y - sprite.displayHeight * 0.5 - 14)
      tooltip.setVisible(true)
      this.tweens.killTweensOf(sprite)
      this.tweens.add({
        targets: sprite,
        scaleX: baseScale * 1.08,
        scaleY: baseScale * 1.08,
        duration: 130,
        ease: 'Back.Out',
      })
      sprite.setTint(0xffe090)
    })
    sprite.on('pointerout', () => {
      tooltip.setVisible(false)
      this.tweens.killTweensOf(sprite)
      this.tweens.add({
        targets: sprite,
        scaleX: baseScale,
        scaleY: baseScale,
        duration: 100,
        ease: 'Quad.Out',
      })
      sprite.clearTint()
    })
  }

  // ── Truck animation ────────────────────────────────────────────────────────

  private createScrollButton(
    x: number,
    y: number,
    label: string,
    dialog: string
  ): Phaser.GameObjects.Container {
    const sprite = this.add
      .sprite(0, -6, 'scroll_icon', 0)
      .setOrigin(0.5, 0.5)
      .setScale(LAYOUT.scrollIcon.scale)

    const txt = this.add
      .text(0, 30, label, {
        fontSize: '11px',
        fontFamily: 'Kalam',
        fontStyle: 'bold',
        color: '#3B1000',
        stroke: '#FFF8E0',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)

    const container = this.add
      .container(x, y, [sprite, txt])
      .setDepth(36)
      .setSize(64, 80)
      .setInteractive({ useHandCursor: true })

    container.on('pointerover', () => sprite.setFrame(1))
    container.on('pointerout', () => sprite.setFrame(0))
    container.on('pointerdown', () => useUiStore.getState().setFarmDialog(dialog as 'scroll-mpd'))

    // Gentle float tween to draw attention
    this.tweens.add({
      targets: container,
      y: y - 6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    return container
  }

  private startTruckAnimation(): void {
    this.truckAnimating = true
    const { width, height } = this.scale
    const y = height * 0.85
    const store = useFarmStore.getState()
    const eggs = store.pendingSaleEggs
    const income = store.pendingSaleIncome

    // Truck image faces RIGHT (cab on right). Entering from right moving left → flip (face left)
    this.truckSprite.setPosition(width + 200, y).setFlipX(true)
    this.truckBubble.setPosition(width + 200, y - 70).setVisible(false)
    this.truckSprite.play('truck_roll')

    const moveBubble = () => {
      this.truckBubble.setPosition(this.truckSprite.x, this.truckSprite.y - 70)
    }

    // 1. Enter from right → park near warehouse
    this.tweens.add({
      targets: this.truckSprite,
      x: width * 0.72,
      duration: 1600,
      ease: 'Cubic.easeOut',
      onUpdate: moveBubble,
      onComplete: () => {
        this.truckSprite.stop()
        this.truckBubble.setText(`🥚 ×${eggs}`).setVisible(true)
        // 2. Leave toward city (right side) — facing right (no flip)
        this.time.delayedCall(600, () => {
          this.truckSprite.setFlipX(false)
          this.truckSprite.play('truck_roll')
          this.tweens.add({
            targets: this.truckSprite,
            x: width + 200,
            duration: 1400,
            ease: 'Cubic.easeIn',
            onUpdate: moveBubble,
            onComplete: () => {
              this.truckSprite.stop()
              this.truckBubble.setVisible(false)
              // 3. Return from right carrying money — flip to face left
              this.time.delayedCall(1200, () => {
                this.truckSprite.setPosition(width + 200, y).setFlipX(true)
                this.truckBubble
                  .setPosition(width + 200, y - 70)
                  .setText(`💰 $${income.toLocaleString('es-CO')}`)
                  .setVisible(true)
                this.truckSprite.play('truck_roll')
                this.tweens.add({
                  targets: this.truckSprite,
                  x: width * 0.72,
                  duration: 1600,
                  ease: 'Cubic.easeOut',
                  onUpdate: moveBubble,
                  onComplete: () => {
                    this.truckSprite.stop()
                    // 4. Unload — brief pause then exit to right
                    this.time.delayedCall(800, () => {
                      this.truckBubble.setVisible(false)
                      this.truckSprite.setFlipX(false)
                      this.truckSprite.play('truck_roll')
                      this.tweens.add({
                        targets: this.truckSprite,
                        x: width + 200,
                        duration: 1200,
                        ease: 'Cubic.easeIn',
                        onComplete: () => {
                          this.truckSprite.stop()
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

    this.cornTooltip.setVisible(false)
    this.warehouseTooltip.setVisible(false)
    this.cornWarehouseSprite.setPosition(
      width * LAYOUT.cornWarehouse.x,
      height * LAYOUT.cornWarehouse.y
    )
    this.cornStockBadge.setPosition(
      width * LAYOUT.cornStockBadge.x + LAYOUT.cornStockBadge.offX,
      height * LAYOUT.cornStockBadge.y + LAYOUT.cornStockBadge.offY
    )
    this.cornPriceCoin.setPosition(
      width * LAYOUT.cornPriceCoin.x + LAYOUT.cornPriceCoin.offX,
      height * LAYOUT.cornPriceCoin.y + LAYOUT.cornPriceCoin.offY
    )
    this.cornPriceText.setPosition(
      width * LAYOUT.cornPriceText.x + LAYOUT.cornPriceText.offX,
      height * LAYOUT.cornPriceText.y + LAYOUT.cornPriceText.offY
    )
    this.warehouseSprite.setPosition(
      width * LAYOUT.warehouseSprite.x,
      height * LAYOUT.warehouseSprite.y
    )
    this.scrollMPD.setPosition(width * LAYOUT.scrollMPD.x, height * LAYOUT.scrollMPD.y)
    this.scrollWIP.setPosition(width * LAYOUT.scrollWIP.x, height * LAYOUT.scrollWIP.y)
    this.scrollPT.setPosition(width * LAYOUT.scrollPT.x, height * LAYOUT.scrollPT.y)
    this.farmerHome.set(width * LAYOUT.farmerHome.x, height * LAYOUT.farmerHome.y)

    if (!this.truckAnimating) {
      this.truckSprite.setPosition(width + 150, height * LAYOUT.truck.y)
    }

    this.placedCornSprites.forEach((s) => s.destroy())
    this.placedCornSprites.clear()
    this.eggSprites.forEach((s) => s.destroy())
    this.eggSprites.clear()
  }
}
