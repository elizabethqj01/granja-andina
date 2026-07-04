import Phaser from 'phaser'
import { FarmScene } from './scenes/FarmScene'

export function createFarmConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  // `resolution` was removed from Phaser 3.80 types but is still read by the
  // WebGL renderer at runtime to scale the canvas buffer to device pixel ratio.
  // Object.assign bypasses the excess-property check.
  return Object.assign(
    {
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
      render: { antialias: true, pixelArt: false, roundPixels: false },
      input: { mouse: { preventDefaultDown: false } },
    } satisfies Phaser.Types.Core.GameConfig,
    { resolution: window.devicePixelRatio || 1 }
  )
}
