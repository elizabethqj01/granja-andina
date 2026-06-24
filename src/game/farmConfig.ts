import Phaser from 'phaser'
import { FarmScene } from './scenes/FarmScene'

export function createFarmConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#88c057',
    scene: [FarmScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    fps: { target: 60, forceSetTimeOut: false },
    render: { antialias: true, pixelArt: false },
    input: { mouse: { preventDefaultDown: false } },
  }
}
