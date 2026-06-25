import Phaser from 'phaser'

export type EntityRenderMode = 'placeholder' | 'sprite'

export interface FarmEntityConfig {
  label?: string
  icon?: string
  color: number
  size?: number
  spriteKey?: string
  interactive?: boolean
}

export class FarmEntity extends Phaser.GameObjects.Container {
  private mode: EntityRenderMode
  private box: Phaser.GameObjects.Rectangle | null = null
  private sprite: Phaser.GameObjects.Image | null = null
  private text: Phaser.GameObjects.Text | null = null

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private cfg: FarmEntityConfig
  ) {
    super(scene, x, y)
    const size = cfg.size ?? 32

    if (cfg.spriteKey && scene.textures.exists(cfg.spriteKey)) {
      this.mode = 'sprite'
      this.sprite = scene.add.image(0, 0, cfg.spriteKey).setOrigin(0.5, 0.85)
      this.add(this.sprite)
    } else {
      this.mode = 'placeholder'
      this.box = scene.add
        .rectangle(0, 0, size, size, cfg.color)
        .setStrokeStyle(2, 0x000000, 0.35)
        .setOrigin(0.5, 0.85)
      this.add(this.box)
    }

    // Emoji icon — centered inside the box.
    // Box origin is (0.5, 0.85): top at -(size*0.85), bottom at +(size*0.15)
    // Visual center ≈ -(size*0.85) + size/2 = -(size*0.35)
    if (cfg.icon) {
      const iconPx = Math.max(16, Math.floor(size * 0.65))
      this.add(
        scene.add.text(0, -(size * 0.35), cfg.icon, { fontSize: `${iconPx}px` }).setOrigin(0.5, 0.5)
      )
    }

    if (cfg.label) {
      // Place label just below the box bottom (box bottom is at +size*0.15)
      const labelY = size * 0.15 + 3
      this.text = scene.add
        .text(0, labelY, cfg.label, {
          fontSize: '13px',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 4,
        })
        .setOrigin(0.5, 0)
      this.add(this.text)
    }

    if (cfg.interactive) {
      const hit = scene.add
        .zone(0, 0, size + 10, size + 10)
        .setOrigin(0.5, 0.85)
        .setInteractive({ useHandCursor: true })
      this.add(hit)
      hit.on('pointerover', () => this.box?.setFillStyle(brighten(cfg.color)))
      hit.on('pointerout', () => this.box?.setFillStyle(cfg.color))
    }

    scene.add.existing(this)
  }

  get renderMode(): EntityRenderMode {
    return this.mode
  }

  onClick(handler: () => void): this {
    this.list.forEach((child) => {
      if (child instanceof Phaser.GameObjects.Zone) child.on('pointerdown', handler)
    })
    return this
  }

  setLabel(label: string): void {
    this.text?.setText(label)
  }

  setColor(color: number): void {
    this.cfg = { ...this.cfg, color }
    this.box?.setFillStyle(color)
  }
}

function brighten(color: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + 30)
  const g = Math.min(255, ((color >> 8) & 0xff) + 30)
  const b = Math.min(255, (color & 0xff) + 30)
  return (r << 16) | (g << 8) | b
}
