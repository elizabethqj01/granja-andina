import btnBuyUrl from '@/assets/sounds/btn_buy.mp3'
import btnClickUrl from '@/assets/sounds/btn_click.mp3'
import sellConfirmUrl from '@/assets/sounds/sell_confirm.mp3'
import levelCompleteUrl from '@/assets/sounds/level_complete.mp3'

const URLS: Record<string, string> = {
  btn_buy: btnBuyUrl,
  btn_click: btnClickUrl,
  sell_confirm: sellConfirmUrl,
  level_complete: levelCompleteUrl,
}

const pool: Record<string, HTMLAudioElement[]> = {}

export function playSfx(name: string, volume = 0.7): void {
  const url = URLS[name]
  if (!url) return
  if (!pool[name]) pool[name] = []
  let audio = pool[name].find((a) => a.paused || a.ended)
  if (!audio) {
    audio = new Audio(url)
    pool[name].push(audio)
  }
  audio.volume = volume
  audio.currentTime = 0
  audio.play().catch(() => {})
}
