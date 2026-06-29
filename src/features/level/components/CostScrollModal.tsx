import { useFarmStore } from '@/store/farmStore'
import { useUiStore } from '@/store/uiStore'
import { FARM_LEVEL1 } from '@/constants/farmBalance'

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `$${Math.max(0, Math.round(n)).toLocaleString('es-CO')}`
}

function useCostData() {
  const cornPurchasedValue = useFarmStore((s) => s.cornPurchasedValue)
  const cornConsumedValue = useFarmStore((s) => s.cornConsumedValue)
  const cornStock = useFarmStore((s) => s.cornStock)
  const modAccrued = useFarmStore((s) => s.modAccrued)
  const cifAccrued = useFarmStore((s) => s.cifAccrued)
  const warehouseEggs = useFarmStore((s) => s.warehouseEggs)
  const groundEggs = useFarmStore((s) => s.groundEggs)
  const eggsCollectedTotal = useFarmStore((s) => s.eggsCollectedTotal)
  const revenue = useFarmStore((s) => s.revenue)
  const elapsedSec = useFarmStore((s) => s.elapsedSec)

  // MPD
  const invInicialMPD = 0
  const comprasMPD = cornPurchasedValue
  const disponibleMPD = invInicialMPD + comprasMPD
  const invFinalMPD = cornStock * FARM_LEVEL1.cornUnitCost
  const costoMPD = cornConsumedValue // authoritative — tracked as corn is consumed

  // Conversion
  const mod = modAccrued
  const cif = cifAccrued

  // Cost of period
  const costoPeriodo = costoMPD + mod + cif

  // WIP
  const totalEggs = eggsCollectedTotal + groundEggs.length
  const costPerEgg = totalEggs > 0 ? costoPeriodo / totalEggs : 0
  const invInicialWIP = 0
  const invFinalWIP = Math.round(groundEggs.length * costPerEgg)
  const costoTerminada = invInicialWIP + costoPeriodo - invFinalWIP

  // PT
  const invInicialPT = 0
  const invFinalPT = Math.round(warehouseEggs * costPerEgg)
  const costoVentas = invInicialPT + costoTerminada - invFinalPT

  // Result
  const ingresos = revenue
  const utilidad = ingresos - costoVentas

  return {
    invInicialMPD,
    comprasMPD,
    disponibleMPD,
    invFinalMPD,
    costoMPD,
    mod,
    cif,
    costoPeriodo,
    invInicialWIP,
    invFinalWIP,
    costoTerminada,
    invInicialPT,
    invFinalPT,
    costoVentas,
    ingresos,
    utilidad,
    cornStock,
    groundEggsCount: groundEggs.length,
    warehouseEggs,
    elapsedSec,
  }
}

// ── Row components ─────────────────────────────────────────────────────────────

interface RowProps {
  op?: string
  label: string
  value: string
  sub?: boolean // single underline
  total?: boolean // double underline + bold
  dim?: boolean
  badge?: string // side annotation badge
}

function Row({ op, label, value, sub, total, dim, badge }: RowProps) {
  return (
    <div
      className="flex items-baseline justify-between gap-2"
      style={{
        fontFamily: "'Kalam', cursive",
        fontSize: '13px',
        color: dim ? '#a0886a' : '#2c1000',
        fontWeight: total ? 700 : 400,
        borderBottom: total ? '3px double #2c1000' : sub ? '1px solid #2c1000' : undefined,
        paddingBottom: sub || total ? '1px' : undefined,
        marginBottom: '3px',
        position: 'relative',
      }}
    >
      <span className="flex items-center gap-1">
        {op && <span style={{ color: '#7a5538', fontSize: '11px', minWidth: '14px' }}>{op}</span>}
        <span>{label}</span>
        {badge && (
          <span
            style={{
              fontSize: '9px',
              background: '#d4e8f0',
              color: '#2a5a7a',
              borderRadius: '3px',
              padding: '0 4px',
              border: '1px solid #a8ccdc',
              fontFamily: "'Kalam', cursive",
            }}
          >
            {badge}
          </span>
        )}
      </span>
      <span style={{ minWidth: '72px', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function Spacer() {
  return <div style={{ height: '8px' }} />
}

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <h3
      style={{
        fontFamily: "'Fredoka One', cursive",
        fontSize: '15px',
        color: '#5a1a00',
        borderBottom: '2px solid #8b3a00',
        paddingBottom: '3px',
        marginBottom: '8px',
        letterSpacing: '0.02em',
      }}
    >
      {emoji} {title}
    </h3>
  )
}

function Arrow({ text }: { text: string }) {
  return (
    <div
      style={{
        margin: '8px 0',
        padding: '4px 8px',
        background: '#f0f7e8',
        border: '1px dashed #4a8030',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#2d5a14',
        fontFamily: "'Kalam', cursive",
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  )
}

function Note({ text }: { text: string }) {
  return (
    <p
      style={{
        fontFamily: "'Kalam', cursive",
        fontSize: '10px',
        color: '#8a6040',
        marginBottom: '4px',
        fontStyle: 'italic',
      }}
    >
      {text}
    </p>
  )
}

// ── Section content ────────────────────────────────────────────────────────────

type CostData = ReturnType<typeof useCostData>

function MPDContent({ d }: { d: CostData }) {
  return (
    <>
      <SectionTitle emoji="🌽" title="Almacén — Materia Prima Directa" />
      <Note text={`Período: ${Math.floor(d.elapsedSec / 60)}m ${d.elapsedSec % 60}s`} />
      <Spacer />
      <Row label="Inv. inicial MPD" value={fmt(d.invInicialMPD)} dim />
      <Row op="(+)" label="Compras netas de MPD" value={fmt(d.comprasMPD)} />
      <Row op="(=)" label="Disponible de MPD" value={fmt(d.disponibleMPD)} sub />
      <Row op="(−)" label="Inv. final MPD" value={fmt(d.invFinalMPD)} />
      <Note text={`${d.cornStock} mazorcas × $${FARM_LEVEL1.cornUnitCost} c/u`} />
      <Row op="(=)" label="Costo de MPD" value={fmt(d.costoMPD)} total />
      <Spacer />
      <Arrow text="↓  El costo de MPD fluye al proceso de producción" />
    </>
  )
}

function WIPContent({ d }: { d: CostData }) {
  return (
    <>
      <SectionTitle emoji="⚙️" title="En Proceso — Producción" />
      <Note text={`Período: ${Math.floor(d.elapsedSec / 60)}m ${d.elapsedSec % 60}s`} />
      <Spacer />
      <Row label="Costo de MPD" value={fmt(d.costoMPD)} dim />
      <Row op="(+)" label="MOD — Mano de obra directa" value={fmt(d.mod)} badge="conversión" />
      <Row
        op="(+)"
        label="CIF — Costos ind. de fabricación"
        value={fmt(d.cif)}
        badge="conversión"
      />
      <Row op="(=)" label="Costo de producción del período" value={fmt(d.costoPeriodo)} total />
      <Spacer />
      <Row label="(+) Inv. inicial en proceso" value={fmt(d.invInicialWIP)} dim />
      <Row op="(−)" label="Inv. final en proceso" value={fmt(d.invFinalWIP)} />
      <Note text={`${d.groundEggsCount} huevo(s) en suelo aún sin recolectar`} />
      <Row op="(=)" label="Costo de producción terminada" value={fmt(d.costoTerminada)} total />
      <Spacer />
      <Arrow text="↓  El costo terminado fluye al almacén de productos" />
    </>
  )
}

function PTContent({ d }: { d: CostData }) {
  const utilColor = d.utilidad >= 0 ? '#1a6614' : '#b81a1a'
  return (
    <>
      <SectionTitle emoji="🥚" title="Almacén — Productos Terminados" />
      <Note text={`Período: ${Math.floor(d.elapsedSec / 60)}m ${d.elapsedSec % 60}s`} />
      <Spacer />
      <Row label="Costo de prod. terminada" value={fmt(d.costoTerminada)} dim />
      <Row label="(+) Inv. inicial prod. terminada" value={fmt(d.invInicialPT)} dim />
      <Row op="(−)" label="Inv. final prod. terminada" value={fmt(d.invFinalPT)} />
      <Note text={`${d.warehouseEggs} huevo(s) en almacén`} />
      <Row op="(=)" label="Costo de ventas" value={fmt(d.costoVentas)} total />
      <Spacer />
      {/* Result */}
      <SectionTitle emoji="💰" title="Resultado" />
      <Row label="Ingresos por ventas" value={fmt(d.ingresos)} />
      <Row op="(−)" label="Costo de ventas" value={fmt(d.costoVentas)} sub />
      <div
        className="mt-1 flex items-baseline justify-between gap-2"
        style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: '16px',
          color: utilColor,
          borderBottom: '3px double currentColor',
          paddingBottom: '2px',
        }}
      >
        <span>(=) Utilidad bruta</span>
        <span>
          {d.utilidad < 0 ? '−' : ''}
          {fmt(Math.abs(d.utilidad))}
        </span>
      </div>
    </>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────

const PAPER: React.CSSProperties = {
  backgroundColor: '#faf6e4',
  backgroundImage:
    'repeating-linear-gradient(transparent, transparent 27px, #c0d4e8 27px, #c0d4e8 28px)',
  backgroundPosition: '0 54px',
  borderRadius: '0 6px 6px 0',
  border: '1px solid #c8b076',
  borderLeft: 'none',
  flex: 1,
  overflowY: 'auto' as const,
  maxHeight: '82vh',
  position: 'relative' as const,
}

export function CostScrollModal() {
  const farmDialog = useUiStore((s) => s.farmDialog)
  const setFarmDialog = useUiStore((s) => s.setFarmDialog)

  const section =
    farmDialog === 'scroll-mpd'
      ? 'mpd'
      : farmDialog === 'scroll-wip'
        ? 'wip'
        : farmDialog === 'scroll-pt'
          ? 'pt'
          : null

  const d = useCostData()

  if (!section) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) setFarmDialog(null)
      }}
    >
      <div className="flex w-full" style={{ maxWidth: '420px' }} role="dialog" aria-modal="true">
        {/* Argolla spine */}
        <div
          className="flex flex-col items-center justify-around py-5"
          style={{
            background: 'linear-gradient(to right, #6b4a2a, #9a6e3e)',
            borderRadius: '8px 0 0 8px',
            minWidth: '38px',
            border: '1px solid #4a2e14',
            borderRight: 'none',
            boxShadow: 'inset -2px 0 6px rgba(0,0,0,0.3)',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #e8c87a, #8b6030)',
                border: '3px solid #3a2010',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 2px rgba(255,200,80,0.3)',
              }}
            />
          ))}
        </div>

        {/* Paper */}
        <div style={PAPER}>
          {/* Red margin line */}
          <div
            style={{
              position: 'absolute',
              left: '42px',
              top: 0,
              bottom: 0,
              width: '2px',
              background: '#d83838',
              opacity: 0.7,
              pointerEvents: 'none',
            }}
          />

          <div style={{ padding: '18px 20px 24px 58px' }}>
            {/* Close button */}
            <button
              onClick={() => setFarmDialog(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#8b4020',
                color: '#ffecd0',
                border: '2px solid #6a2c12',
                fontFamily: "'Kalam', cursive",
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              ✕
            </button>

            {/* Main title */}
            <h2
              style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: '18px',
                color: '#3a0e00',
                borderBottom: '2px solid #3a0e00',
                paddingBottom: '4px',
                marginBottom: '12px',
                letterSpacing: '0.03em',
              }}
            >
              Flujo de recursos y costos
            </h2>

            {section === 'mpd' && <MPDContent d={d} />}
            {section === 'wip' && <WIPContent d={d} />}
            {section === 'pt' && <PTContent d={d} />}

            {/* Close button at bottom */}
            <button
              onClick={() => setFarmDialog(null)}
              style={{
                marginTop: '16px',
                width: '100%',
                background: '#8b4020',
                color: '#ffecd0',
                border: '2px solid #6a2c12',
                borderRadius: '6px',
                padding: '7px 0',
                fontFamily: "'Fredoka One', cursive",
                fontSize: '14px',
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              Cerrar y continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
