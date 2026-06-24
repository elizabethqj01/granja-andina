import Phaser from 'phaser'
import { IsoGrid } from '../objects/IsoGrid'
import { FarmEntity } from '../objects/FarmEntity'
import { useFarmStore, FARM_GRID } from '@/store/farmStore'

const COLORS = {
  bg: 0x88c057,
  tileA: 0x7cb342,
  tileB: 0x8bc34a,
  tileLine: 0x558b2f,
  chicken: 0xffffff,
  egg: 0xfff3c4,
  eggCollecting: 0xffd54f,
  farmer: 0x6d4c41,
  corn: 0xfbc02d,
  eggWarehouse: 0xbcaaa4,
  cart: 0x8d6e63,
}

/**
 * Level 1 farm scene. Renders a 2.5D isometric field with placeholder squares
 * and reconciles its visuals from `farmStore` every frame (polling keeps it
 * simple and 60 FPS-friendly). All gameplay state lives in the store; the scene
 * is purely a view + input layer.
 */
export class FarmScene extends Phaser.Scene {
  private iso!: IsoGrid
  private chicken!: FarmEntity
  private farmer!: FarmEntity
  private cornWarehouse!: FarmEntity
  private eggWarehouse!: FarmEntity
  private cart!: FarmEntity
  private floor!: Phaser.GameObjects.Graphics

  private eggSprites = new Map<string, FarmEntity>()
  private farmerHome = new Phaser.Math.Vector2()

  constructor() {
    super({ key: 'Farm' })
  }

  create(): void {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor(COLORS.bg)

    this.iso = new IsoGrid({
      originX: width / 2,
      originY: height * 0.28,
      tileWidth: 72,
      tileHeight: 36,
    })

    this.floor = this.add.graphics().setDepth(-1)
    this.drawFloor()

    // Static actors anchored on the field.
    const chickenPos = this.iso.toScreen(2, 2)
    this.chicken = new FarmEntity(this, chickenPos.x, chickenPos.y, {
      label: 'Gallina',
      color: COLORS.chicken,
      size: 26,
    })

    this.farmerHome.set(width / 2, height * 0.62)
    this.farmer = new FarmEntity(this, this.farmerHome.x, this.farmerHome.y, {
      label: 'Granjero',
      color: COLORS.farmer,
      size: 24,
    })
    this.farmer.setDepth(50)

    // Corn warehouse (top-center) — click to buy/refill corn (MPD).
    this.cornWarehouse = new FarmEntity(this, width / 2, height * 0.1, {
      label: 'Maíz: 0',
      color: COLORS.corn,
      size: 38,
      interactive: true,
    }).onClick(() => useFarmStore.getState().rechargeCorn())

    // Egg warehouse (bottom-right) — holds collected eggs (PT).
    this.eggWarehouse = new FarmEntity(this, width * 0.82, height * 0.82, {
      label: 'Huevos: 0',
      color: COLORS.eggWarehouse,
      size: 40,
    })

    // Sell cart (bottom-left) — click to sell warehouse eggs.
    this.cart = new FarmEntity(this, width * 0.16, height * 0.82, {
      label: 'Vender',
      color: COLORS.cart,
      size: 38,
      interactive: true,
    }).onClick(() => useFarmStore.getState().sellEggs())

    this.scale.on('resize', () => this.relayout())
  }

  shutdown(): void {
    this.eggSprites.forEach((s) => s.destroy())
    this.eggSprites.clear()
  }

  update(): void {
    const farm = useFarmStore.getState()

    this.cornWarehouse.setLabel(`Maíz: ${farm.cornStock}`)
    this.eggWarehouse.setLabel(`Huevos: ${farm.warehouseEggs}`)

    this.reconcileEggs(farm.groundEggs)
    this.moveFarmer(farm)
  }

  // ── Rendering helpers ─────────────────────────────────────────────────────

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

  private reconcileEggs(
    eggs: { id: string; col: number; row: number; collecting: boolean }[]
  ): void {
    const liveIds = new Set(eggs.map((e) => e.id))

    // Remove deposited / missing eggs.
    for (const [id, sprite] of this.eggSprites) {
      if (!liveIds.has(id)) {
        sprite.destroy()
        this.eggSprites.delete(id)
      }
    }

    // Add new eggs + refresh appearance.
    for (const egg of eggs) {
      let sprite = this.eggSprites.get(egg.id)
      if (!sprite) {
        const pos = this.iso.toScreen(egg.col, egg.row)
        sprite = new FarmEntity(this, pos.x, pos.y, {
          color: COLORS.egg,
          size: 16,
          interactive: true,
        }).onClick(() => useFarmStore.getState().requestCollect(egg.id))
        sprite.setDepth(10)
        this.eggSprites.set(egg.id, sprite)
      }
      sprite.setColor(egg.collecting ? COLORS.eggCollecting : COLORS.egg)
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

    // Smooth lerp toward the target each frame.
    this.farmer.x += (targetX - this.farmer.x) * 0.15
    this.farmer.y += (targetY - this.farmer.y) * 0.15
  }

  private relayout(): void {
    const { width, height } = this.scale
    this.iso.setOrigin(width / 2, height * 0.28)
    this.drawFloor()

    const chickenPos = this.iso.toScreen(2, 2)
    this.chicken.setPosition(chickenPos.x, chickenPos.y)
    this.farmerHome.set(width / 2, height * 0.62)
    this.cornWarehouse.setPosition(width / 2, height * 0.1)
    this.eggWarehouse.setPosition(width * 0.82, height * 0.82)
    this.cart.setPosition(width * 0.16, height * 0.82)

    // Eggs reposition on next reconcile via fresh sprites; clear stale ones.
    this.eggSprites.forEach((s) => s.destroy())
    this.eggSprites.clear()
  }
}
