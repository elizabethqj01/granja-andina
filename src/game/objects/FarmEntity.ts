import Phaser from 'phaser'

export type EntityRenderMode = 'placeholder' | 'sprite'

export interface FarmEntityConfig {
  label?: string
  icon?: string // emoji rendered inside the box
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
    const size = cfg.size ?? 28

    if (cfg.spriteKey && scene.textures.exists(cfg.spriteKey)) {
      this.mode = 'sprite'
      this.sprite = scene.add.image(0, 0, cfg.spriteKey).setOrigin(0.5, 0.85)
      this.add(this.sprite)
    } else {
      this.mode = 'placeholder'
      this.box = scene.add
        .rectangle(0, 0, size, size, cfg.color)
        .setStrokeStyle(2, 0x000000, 0.3)
        .setOrigin(0.5, 0.85)
      this.add(this.box)
    }

    // Emoji icon centered inside the box (origin 0.5,0.85 → center ≈ y = -size*0.35)
    if (cfg.icon) {
      const iconSize = Math.max(12, Math.floor(size * 0.55))
      this.add(
        scene.add
          .text(0, -(size * 0.35), cfg.icon, { fontSize: `${iconSize}px` })
          .setOrigin(0.5, 0.5)
      )
    }

    if (cfg.label) {
      this.text = scene.add
        .text(0, 6, cfg.label, {
          fontSize: '10px',
          color: '#ffffff',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0)
      this.add(this.text)
    }

    if (cfg.interactive) {
      const hit = scene.add
        .zone(0, 0, size + 8, size + 8)
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
