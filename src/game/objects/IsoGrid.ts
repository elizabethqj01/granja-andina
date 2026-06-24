/**
 * Isometric (2.5D) grid projection helper.
 *
 * Converts logical tile coordinates (col, row) to screen coordinates on a
 * diamond grid and back. Pure math — no Phaser dependency — so the same
 * projection can be reused by the scene and tested in isolation.
 *
 * Today entities render as flat placeholder squares; this projection is what
 * makes them sit on a 3D-looking grid once real sprites are dropped in.
 */
export interface IsoGridConfig {
  originX: number // screen x of tile (0,0) center
  originY: number // screen y of tile (0,0) center
  tileWidth: number // full diamond width
  tileHeight: number // full diamond height
}

export class IsoGrid {
  constructor(private cfg: IsoGridConfig) {}

  setOrigin(x: number, y: number): void {
    this.cfg = { ...this.cfg, originX: x, originY: y }
  }

  get tileWidth(): number {
    return this.cfg.tileWidth
  }

  get tileHeight(): number {
    return this.cfg.tileHeight
  }

  /** Tile (col,row) → screen center point. */
  toScreen(col: number, row: number): { x: number; y: number } {
    return {
      x: this.cfg.originX + (col - row) * (this.cfg.tileWidth / 2),
      y: this.cfg.originY + (col + row) * (this.cfg.tileHeight / 2),
    }
  }

  /** Screen point → nearest tile (col,row). Inverse of toScreen. */
  toTile(x: number, y: number): { col: number; row: number } {
    const dx = (x - this.cfg.originX) / (this.cfg.tileWidth / 2)
    const dy = (y - this.cfg.originY) / (this.cfg.tileHeight / 2)
    return {
      col: Math.round((dx + dy) / 2),
      row: Math.round((dy - dx) / 2),
    }
  }

  /** Four screen corners of a tile's diamond — for drawing the floor. */
  diamondPoints(col: number, row: number): { x: number; y: number }[] {
    const c = this.toScreen(col, row)
    const hw = this.cfg.tileWidth / 2
    const hh = this.cfg.tileHeight / 2
    return [
      { x: c.x, y: c.y - hh },
      { x: c.x + hw, y: c.y },
      { x: c.x, y: c.y + hh },
      { x: c.x - hw, y: c.y },
    ]
  }
}
