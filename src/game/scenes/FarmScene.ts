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
import sfxChickenEatUrl from '@/assets/sounds/chicken_eat.mp3'
import sfxChickenHungryUrl from '@/assets/sounds/chicken_hungry.mp3'
import sfxCornPlaceUrl from '@/assets/sounds/corn_place.mp3'
import sfxCornRechargeUrl from '@/assets/sounds/corn_recharge.mp3'
import sfxFarmerWalkUrl from '@/assets/sounds/farmer_walk.mp3'
import sfxTruckLeaveUrl from '@/assets/sounds/truck_leave.mp3'
import sfxMusicGameOverUrl from '@/assets/sounds/music_game_over.mp3'
import sfxChickenLayUrl from '@/assets/sounds/chicken_lay.mp3'
import sfxModalOpenUrl from '@/assets/sounds/modal_open.mp3'
import { playSfx } from '@/services/sfx'

// ─── Responsive scaling ────────────────────────────────────────────────────────
// Design resolution: the game was authored at 1280×720. At runtime we compute
// sf = min(viewport_w / DESIGN_W, viewport_h / DESIGN_H) and multiply every
// fixed-pixel size by sf so the game looks the same at any viewport.
// On mobile the grid shrinks to 8×8 (set by FarmGameCanvas before Phaser starts),
// so we boost sf by (12/8)=1.5 to keep tiles large and clickable.
const DESIGN_W = 1280
const DESIGN_H = 720
const BASE_TILE_W = 96
const BASE_TILE_H = 48
const DESIGN_GRID_COLS = 12 // default — used to compute mobile boost factor

// ─── Scene layout calibration ──────────────────────────────────────────────────
// All x/y are fractions of canvas width/height. offX/offY are fixed pixel
// offsets on top of the fractional base (scaled by sf at runtime).
const LAYOUT = {
  cornWarehouse: { x: 0.25, y: 0.25, scale: 0.75 },
  cornStockBadge: { x: 0.26, y: 0.25, offX: 105, offY: 0, scale: 1.2 },
  cornPriceCoin: { x: 0.25, y: 0.11, offX: -26, offY: 0, scale: 0.55 },
  cornPriceText: { x: 0.25, y: 0.11, offX: -8, offY: 0 },
  warehouseSprite: { x: 0.86, y: 0.88, scale: 1.2 },
  scrollMPD: { x: 0.18, y: 0.22 },
  scrollWIP: { x: 0.8, y: 0.38 },
  scrollPT: { x: 0.79, y: 0.82 },
  farmerHome: { x: 0.5, y: 0.9 },
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
  private sf = 1 // viewport scale factor relative to 1280×720 design resolution
  private prevFarmDialog: string | null = null
  private chickenPrevAnims = new Map<string, string>()
  private chickenHungryIds = new Set<string>()
  private levelFailedPrev = false
  private farmerWalkSound?: Phaser.Sound.BaseSound

  constructor() {
    super({ key: 'Farm' })
  }

  preload(): void {
    this.load.spritesheet('chicken', chickenSheetUrl, {
      frameWidth: 256,
      frameHeight: 247,
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
    this.load.audio('sfx_chicken_lay', sfxChickenLayUrl)
    this.load.audio('sfx_chicken_eat', sfxChickenEatUrl)
    this.load.audio('sfx_chicken_hungry', sfxChickenHungryUrl)
    this.load.audio('sfx_corn_place', sfxCornPlaceUrl)
    this.load.audio('sfx_corn_recharge', sfxCornRechargeUrl)
    this.load.audio('sfx_farmer_walk', sfxFarmerWalkUrl)
    this.load.audio('sfx_truck_leave', sfxTruckLeaveUrl)
    this.load.audio('sfx_music_game_over', sfxMusicGameOverUrl)
    this.load.audio('sfx_modal_open', sfxModalOpenUrl)
  }

  create(): void {
    const { width, height } = this.scale
    this.sf = Math.min(
      Math.min(width / DESIGN_W, height / DESIGN_H) * (DESIGN_GRID_COLS / FARM_GRID.cols),
      1.5
    )

    this.bgImage = this.add
      .image(0, 0, 'background')
      .setOrigin(0, 0)
      .setDisplaySize(width, height)
      .setDepth(-100)

    this.iso = new IsoGrid({
      originX: width / 2,
      originY: height * 0.25,
      tileWidth: BASE_TILE_W * this.sf,
      tileHeight: BASE_TILE_H * this.sf,
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

    // Farmer sprite — on web, anchor home to the bottom corner of the iso grid so it
    // scales correctly at any viewport size. On mobile keep the fixed percentage.
    const farmerHomeY =
      FARM_GRID.cols === 8
        ? height * LAYOUT.farmerHome.y
        : this.iso.toScreen(FARM_GRID.cols - 2, FARM_GRID.rows - 2).y
    this.farmerHome.set(width / 2, farmerHomeY)
    this.farmer = this.add
      .sprite(this.farmerHome.x, this.farmerHome.y, 'farmer')
      .setOrigin(0.5, 0.62)
      .setScale(FARM_LEVEL1.farmerScale * this.sf)
      .setDepth(50)
    this.farmer.play('farmer_idle')

    // Truck — off-screen right until a sale is triggered
    this.truckSprite = this.add
      .sprite(width + 150, height * 0.85, 'truck', 0)
      .setOrigin(0.5, 0.5)
      .setScale(0.85 * this.sf)
      .setDepth(60)

    this.truckBubble = this.add
      .text(width + 150, height * 0.85 - 70 * this.sf, '', {
        fontSize: `${Math.round(20 * this.sf)}px`,
        fontFamily: 'Kalam',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(61)
      .setVisible(false)

    // Corn warehouse — on desktop: left side at y=25% (same level as grid, enough space).
    // On mobile (8×8 grid) the grid also starts at y=25%, so the warehouse hitbox overlaps
    // the first-row egg tiles. Fix: move it to x=10%, y=18% and shrink its hit area to a
    // 40px-radius circle so it sits close to the farm without accidentally capturing egg taps.
    const isMobile = FARM_GRID.cols === 8
    const cwhX = isMobile ? width * 0.2 : width * LAYOUT.cornWarehouse.x
    const cwhY = isMobile ? height * 0.22 : height * LAYOUT.cornWarehouse.y
    const cwhScale = (isMobile ? 0.65 : LAYOUT.cornWarehouse.scale) * this.sf

    this.cornWarehouseSprite = this.add
      .sprite(cwhX, cwhY, 'corn_warehouse', 0)
      .setOrigin(0.5, 0.5)
      .setScale(cwhScale)
      .setDepth(30)
    if (isMobile) {
      this.cornWarehouseSprite.setInteractive({
        hitArea: new Phaser.Geom.Circle(128, 128, 65),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
        useHandCursor: true,
      })
    } else {
      this.cornWarehouseSprite.setInteractive({ useHandCursor: true })
    }
    this.cornWarehouseSprite.on('pointerdown', () => {
      useFarmStore.getState().rechargeCorn()
      this.sound.play('sfx_corn_recharge', { volume: 0.6 })
      if (!isMobile) {
        this.cornWarehouseSprite.setFrame(1)
        this.time.delayedCall(400, () => this.cornWarehouseSprite.setFrame(0))
      }
    })
    this.cornTooltip = this.add
      .text(cwhX, cwhY - 90 * this.sf, '🌽 Tienda de maíz', {
        fontFamily: 'Kalam',
        fontSize: `${Math.round(17 * this.sf)}px`,
        color: '#FFD700',
        backgroundColor: '#1a0800ee',
        padding: { x: 10, y: 5 },
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(60)
      .setVisible(false)
    if (!isMobile) {
      this.addHoverEffect(this.cornWarehouseSprite, this.cornTooltip, LAYOUT.cornWarehouse.scale)
    } else {
      this.addPressEffect(this.cornWarehouseSprite)
    }

    this.cornStockBadge = this.add
      .sprite(
        cwhX + (isMobile ? 55 : LAYOUT.cornStockBadge.offX) * this.sf,
        cwhY + (isMobile ? 28 : 0) * this.sf,
        'corn_stock_badge',
        0
      )
      .setOrigin(0.5, 0.5)
      .setScale(LAYOUT.cornStockBadge.scale * this.sf)
      .setDepth(32)

    // Corn price — on desktop: coin+text to the left above the warehouse.
    // On mobile: displayed above-right of the warehouse to stay clear of the grid.
    const cornBatchPrice = FARM_LEVEL1.cornUnitCost * FARM_LEVEL1.cornPerRecharge
    const cornPriceY = isMobile ? cwhY - 45 * this.sf : height * LAYOUT.cornPriceCoin.y
    const cornPriceCoinX = isMobile
      ? cwhX + 50 * this.sf
      : width * LAYOUT.cornPriceCoin.x + LAYOUT.cornPriceCoin.offX * this.sf
    this.cornPriceCoin = this.add
      .sprite(cornPriceCoinX, cornPriceY, 'coin', 0)
      .setOrigin(0.5, 0.5)
      .setScale(LAYOUT.cornPriceCoin.scale * this.sf)
      .setDepth(33)
      .setVisible(false)
    this.cornPriceCoin.play('coin_spin')
    this.cornPriceText = this.add
      .text(
        isMobile
          ? cwhX + 72 * this.sf
          : width * LAYOUT.cornPriceText.x + LAYOUT.cornPriceText.offX * this.sf,
        cornPriceY,
        `$${cornBatchPrice}`,
        {
          fontSize: `${Math.round(28 * this.sf)}px`,
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
      .setScale(LAYOUT.warehouseSprite.scale * this.sf)
      .setDepth(30)
      .setInteractive({ useHandCursor: true })
    this.warehouseSprite.on('pointerup', () => this.openSellModal())
    this.warehouseTooltip = this.add
      .text(
        width * LAYOUT.warehouseSprite.x,
        height * LAYOUT.warehouseSprite.y - 120 * this.sf,
        '🥚 Almacén de productos',
        {
          fontFamily: 'Kalam',
          fontSize: `${Math.round(17 * this.sf)}px`,
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
    if (!isMobile) {
      this.addHoverEffect(this.warehouseSprite, this.warehouseTooltip, LAYOUT.warehouseSprite.scale)
    } else {
      this.addPressEffect(this.warehouseSprite)
    }
    // Cost-flow scroll buttons — one at each production stage
    // On mobile the MPD scroll sits just below the corn warehouse, centred on the same X axis.
    const scrollMPDx = isMobile ? width * 0.14 : width * LAYOUT.scrollMPD.x
    const scrollMPDy = isMobile ? height * 0.32 : height * LAYOUT.scrollMPD.y
    this.scrollMPD = this.createScrollButton(scrollMPDx, scrollMPDy, 'MPD', 'scroll-mpd').setScale(
      this.sf
    )
    this.scrollWIP = this.createScrollButton(
      width * LAYOUT.scrollWIP.x,
      height * LAYOUT.scrollWIP.y,
      'Producción',
      'scroll-wip'
    ).setScale(this.sf)
    this.scrollPT = this.createScrollButton(
      width * LAYOUT.scrollPT.x,
      height * LAYOUT.scrollPT.y,
      'PT',
      'scroll-pt'
    ).setScale(this.sf)

    this.farmerWalkSound = this.sound.add('sfx_farmer_walk', { loop: true, volume: 0.4 })
    this.scale.on('resize', () => this.relayout())
  }

  private openSellModal(): void {
    if (useFarmStore.getState().saleState !== 'idle') return
    this.sound.play('sfx_modal_open', { volume: 0.6 })
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
    const dialog = useUiStore.getState().farmDialog
    // When a dialog just closed, pointerout never fired (input was disabled while finger lifted).
    // Reset all scroll sprites to their resting frame so they don't stay highlighted.
    if (this.prevFarmDialog !== null && dialog === null) {
      for (const c of [this.scrollMPD, this.scrollWIP, this.scrollPT]) {
        ;(c.list[0] as Phaser.GameObjects.Sprite).setFrame(0)
      }
    }
    this.prevFarmDialog = dialog
    this.input.enabled = dialog === null

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

    if (farm.levelFailed && !this.levelFailedPrev) {
      this.sound.play('sfx_music_game_over', { volume: 0.7 })
    }
    this.levelFailedPrev = farm.levelFailed

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
          .setScale(FARM_LEVEL1.chickenScale * this.sf)
          .setDepth(15)
        sprite.play('chicken_idle')
        this.chickenSprites.set(chicken.id, sprite)

        const bar = this.add.graphics().setDepth(20)
        this.chickenHungerBars.set(chicken.id, bar)

        const alert = this.add
          .text(pos.x, pos.y, '😰 ¡Hambre!', {
            fontSize: `${Math.round(13 * this.sf)}px`,
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
      if (currentAnim !== desiredAnim) {
        sprite.play(desiredAnim)
        if (desiredAnim === 'chicken_eat') {
          this.sound.play('sfx_chicken_eat', { volume: 0.5 })
        } else if (desiredAnim === 'chicken_lay') {
          this.sound.play('sfx_chicken_lay', { volume: 0.6 })
        }
        this.chickenPrevAnims.set(chicken.id, desiredAnim)
      }

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

    const w = 54 * this.sf
    const h = Math.max(3, 7 * this.sf)
    const cx = sprite.x
    const top = sprite.y - sprite.displayHeight / 2 - 12 * this.sf

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
    if (isHungry && !this.chickenHungryIds.has(chicken.id)) {
      this.chickenHungryIds.add(chicken.id)
      this.sound.play('sfx_chicken_hungry', { volume: 0.6 })
    } else if (!isHungry) {
      this.chickenHungryIds.delete(chicken.id)
    }
  }

  private destroyChickenVisuals(): void {
    this.chickenSprites.forEach((s) => s.destroy())
    this.chickenHungerBars.forEach((g) => g.destroy())
    this.chickenHungerAlerts.forEach((t) => t.destroy())
    this.chickenSprites.clear()
    this.chickenHungerBars.clear()
    this.chickenHungerAlerts.clear()
    this.dyingChickenIds.clear()
    this.chickenPrevAnims.clear()
    this.chickenHungryIds.clear()
  }

  // ── Hover effects ──────────────────────────────────────────────────────────

  private addHoverEffect(
    sprite: Phaser.GameObjects.Sprite,
    tooltip: Phaser.GameObjects.Text,
    layoutScale: number // base LAYOUT scale constant (without sf — sf is read at event time)
  ): void {
    sprite.on('pointerover', () => {
      const base = layoutScale * this.sf
      tooltip.setPosition(sprite.x, sprite.y - sprite.displayHeight * 0.5 - 14)
      tooltip.setVisible(true)
      this.tweens.killTweensOf(sprite)
      this.tweens.add({
        targets: sprite,
        scaleX: base * 1.08,
        scaleY: base * 1.08,
        duration: 130,
        ease: 'Back.Out',
      })
      sprite.setTint(0xffe090)
    })
    sprite.on('pointerdown', () => {
      const base = layoutScale * this.sf
      this.tweens.killTweensOf(sprite)
      this.tweens.add({
        targets: sprite,
        scaleX: base * 0.92,
        scaleY: base * 0.92,
        duration: 80,
        ease: 'Quad.In',
      })
    })
    sprite.on('pointerup', () => {
      const base = layoutScale * this.sf
      this.tweens.killTweensOf(sprite)
      this.tweens.add({
        targets: sprite,
        scaleX: base,
        scaleY: base,
        duration: 120,
        ease: 'Quad.Out',
      })
    })
    sprite.on('pointerout', () => {
      const base = layoutScale * this.sf
      tooltip.setVisible(false)
      this.tweens.killTweensOf(sprite)
      this.tweens.add({
        targets: sprite,
        scaleX: base,
        scaleY: base,
        duration: 100,
        ease: 'Quad.Out',
      })
      sprite.clearTint()
    })
  }

  private addPressEffect(sprite: Phaser.GameObjects.Sprite): void {
    sprite.on('pointerdown', () => {
      const base = sprite.scaleX
      this.tweens.killTweensOf(sprite)
      this.tweens.add({
        targets: sprite,
        scaleX: base * 0.92,
        scaleY: base * 0.92,
        duration: 80,
        ease: 'Quad.In',
        onComplete: () => {
          this.tweens.add({
            targets: sprite,
            scaleX: base,
            scaleY: base,
            duration: 120,
            ease: 'Quad.Out',
          })
        },
      })
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
    container.on('pointerdown', () => {
      this.sound.play('sfx_modal_open', { volume: 0.6 })
      useUiStore.getState().setFarmDialog(dialog as 'scroll-mpd')
    })

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
    this.truckBubble.setPosition(width + 200, y - 70 * this.sf).setVisible(false)
    this.truckSprite.play('truck_roll')

    const moveBubble = () => {
      this.truckBubble.setPosition(this.truckSprite.x, this.truckSprite.y - 70 * this.sf)
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
          this.sound.play('sfx_truck_leave', { volume: 0.6 })
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
                  .setPosition(width + 200, y - 70 * this.sf)
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
        const img = this.add
          .image(pos.x, pos.y, 'terrain', frame)
          .setOrigin(0.5, 0.5)
          .setDepth(-1)
          .setScale(this.sf)
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
          .setScale(this.sf)
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
          .setScale(this.sf)
      )
    }
  }

  private placeDecorations(): void {
    this.decorationSprites.forEach((s) => s.destroy())
    this.decorationSprites = []

    // Place decorations just outside the grid boundary (not on walkable tiles)
    const rightMid = this.iso.toScreen(FARM_GRID.cols - 1, Math.floor(FARM_GRID.rows / 2))

    const spots = [{ x: rightMid.x + 80 * this.sf, y: rightMid.y + 40 * this.sf, frame: 3 }]

    for (const s of spots) {
      this.decorationSprites.push(
        this.add
          .image(s.x, s.y, 'decorations', s.frame)
          .setOrigin(0.5, 1)
          .setDepth(4)
          .setScale(this.sf)
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
        .setScale(0.7 * this.sf)
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
        zone.on('pointerdown', () => {
          useFarmStore.getState().placeCorn(col, row)
          this.sound.play('sfx_corn_place', { volume: 0.5 })
        })
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
          .setScale(0.5 * this.sf)
          .setDepth(8)
        sprite.play('corn_scatter')
        sprite.once('animationcomplete', () => sprite.play('corn_idle'))
        this.placedCornSprites.set(corn.id, sprite)
      }

      // Shrink based on remaining energy — reflects real consumption across all chickens
      const consumed = 1 - corn.remainingEnergy / FARM_LEVEL1.chickenCornEnergyRestore
      const sprite = this.placedCornSprites.get(corn.id)!
      sprite.setScale(0.5 * this.sf * (1 - consumed * 0.85))
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
          .setScale((SZ.egg / 64) * this.sf)
          .setDepth(10)
          .setInteractive({ useHandCursor: true })
        sprite.on('pointerdown', () => {
          playSfx('btn_click')
          useFarmStore.getState().requestCollect(egg.id)
        })
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

    const shouldWalk = isMoving
    if (this.farmerWalkSound) {
      if (shouldWalk && !this.farmerWalkSound.isPlaying) {
        this.farmerWalkSound.play()
      } else if (!shouldWalk && this.farmerWalkSound.isPlaying) {
        this.farmerWalkSound.stop()
      }
    }
  }

  // ── Resize ─────────────────────────────────────────────────────────────────

  private relayout(): void {
    const { width, height } = this.scale
    this.sf = Math.min(
      Math.min(width / DESIGN_W, height / DESIGN_H) * (DESIGN_GRID_COLS / FARM_GRID.cols),
      1.5
    )

    this.bgImage.setDisplaySize(width, height)

    // Resize isometric grid tiles then rebuild all grid-derived visuals
    this.iso.setTileSize(BASE_TILE_W * this.sf, BASE_TILE_H * this.sf)
    this.iso.setOrigin(width / 2, height * 0.25)

    this.placeTileSprites()
    this.placeFenceSprites()
    this.placeDecorations()
    this.createButterflies()

    this.tileZones.forEach((z) => z.destroy())
    this.tileZones = []
    this.createTileZones()

    // Reposition and rescale static sprites
    this.cornTooltip.setVisible(false)
    this.warehouseTooltip.setVisible(false)
    const isMobile = FARM_GRID.cols === 8
    const cwhX = isMobile ? width * 0.2 : width * LAYOUT.cornWarehouse.x
    const cwhY = isMobile ? height * 0.22 : height * LAYOUT.cornWarehouse.y
    const cwhScale = (isMobile ? 0.65 : LAYOUT.cornWarehouse.scale) * this.sf
    const cornPriceY = isMobile ? cwhY - 45 * this.sf : height * LAYOUT.cornPriceCoin.y
    this.cornWarehouseSprite.setPosition(cwhX, cwhY).setScale(cwhScale)
    this.cornTooltip.setPosition(cwhX, cwhY - 90 * this.sf).setFontSize(Math.round(17 * this.sf))
    this.cornStockBadge
      .setPosition(
        cwhX + (isMobile ? 55 : LAYOUT.cornStockBadge.offX) * this.sf,
        cwhY + (isMobile ? 28 : 0) * this.sf
      )
      .setScale(LAYOUT.cornStockBadge.scale * this.sf)
    this.cornPriceCoin
      .setPosition(
        isMobile
          ? cwhX + 50 * this.sf
          : width * LAYOUT.cornPriceCoin.x + LAYOUT.cornPriceCoin.offX * this.sf,
        cornPriceY
      )
      .setScale(LAYOUT.cornPriceCoin.scale * this.sf)
    this.cornPriceText
      .setPosition(
        isMobile
          ? cwhX + 72 * this.sf
          : width * LAYOUT.cornPriceText.x + LAYOUT.cornPriceText.offX * this.sf,
        cornPriceY
      )
      .setFontSize(Math.round(28 * this.sf))
    this.warehouseSprite
      .setPosition(width * LAYOUT.warehouseSprite.x, height * LAYOUT.warehouseSprite.y)
      .setScale(LAYOUT.warehouseSprite.scale * this.sf)
    this.warehouseTooltip
      .setPosition(
        width * LAYOUT.warehouseSprite.x,
        height * LAYOUT.warehouseSprite.y - 120 * this.sf
      )
      .setFontSize(Math.round(17 * this.sf))

    // Scroll containers: kill current float tween, reposition, rescale, restart
    const scrollMPDx = isMobile ? width * 0.2 : width * LAYOUT.scrollMPD.x
    const scrollMPDy = isMobile ? height * 0.29 : height * LAYOUT.scrollMPD.y
    for (const [container, lx, ly] of [
      [this.scrollMPD, scrollMPDx / width, scrollMPDy / height],
      [this.scrollWIP, LAYOUT.scrollWIP.x, LAYOUT.scrollWIP.y],
      [this.scrollPT, LAYOUT.scrollPT.x, LAYOUT.scrollPT.y],
    ] as [Phaser.GameObjects.Container, number, number][]) {
      const nx = width * lx
      const ny = height * ly
      this.tweens.killTweensOf(container)
      container.setPosition(nx, ny).setScale(this.sf)
      this.tweens.add({
        targets: container,
        y: ny - 6,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }

    const farmerHomeY = isMobile
      ? height * LAYOUT.farmerHome.y
      : this.iso.toScreen(FARM_GRID.cols - 2, FARM_GRID.rows - 2).y
    this.farmerHome.set(width / 2, farmerHomeY)
    this.farmer.setScale(FARM_LEVEL1.farmerScale * this.sf)

    if (!this.truckAnimating) {
      this.truckSprite.setPosition(width + 150, height * LAYOUT.truck.y).setScale(0.85 * this.sf)
    }
    this.truckBubble.setFontSize(Math.round(20 * this.sf))

    // Rescale live chicken sprites and their hunger alerts
    for (const [id, sprite] of this.chickenSprites) {
      if (!this.dyingChickenIds.has(id)) {
        sprite.setScale(FARM_LEVEL1.chickenScale * this.sf)
      }
    }
    for (const [, text] of this.chickenHungerAlerts) {
      text.setFontSize(Math.round(13 * this.sf))
    }

    // Corn and egg sprites are cleared and recreated on next update() tick
    this.placedCornSprites.forEach((s) => s.destroy())
    this.placedCornSprites.clear()
    this.eggSprites.forEach((s) => s.destroy())
    this.eggSprites.clear()
  }
}
