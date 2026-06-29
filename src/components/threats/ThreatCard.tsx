/**
 * Threats panel.
 *
 * Renders all active threats and the human-awareness meter below them.
 *
 * Subscribes only to the threats array + awareness (a thin scalar).
 * Unrelated state updates (resources, metrics counters, ecophagy,
 * ...) no longer reach this component.
 */

import { selectAwareness, selectThreats, useGameStore } from "@/store/gameStore";
import { AWARENESS_HINT_BANDS, AWARENESS_LABELS } from "@/systems/constants";
import { pickBand } from "@/systems/format";
import { Gauge } from "@/components/panels/Gauge";
import type { Threat } from "@/systems/types";

import styles from "./ThreatCard.module.css";

interface ThreatCardProps {
  threat: Threat;
}

export function ThreatCard({ threat }: ThreatCardProps) {
  const pct = Math.max(0, (threat.hp / threat.maxHp) * 100);
  return (
    <div className={styles.threat}>
      <div className={styles.head}>
        <span className={styles.name}>{threat.type.name}</span>
        <span className={styles.tier}>TIER {threat.type.tier}</span>
      </div>
      <div className={styles.hpBar}>
        <div className={styles.hpFill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.desc}>
        {threat.type.desc} · {threat.hp.toFixed(0)}/{threat.maxHp.toFixed(0)} HP · {threat.dmg.toFixed(2)} dmg/s
      </div>
    </div>
  );
}

export function ThreatList() {
  const threats = useGameStore(selectThreats);
  const awareness = useGameStore(selectAwareness);

  const facility = pickBand(AWARENESS_LABELS, awareness);
  const hint = pickBand(AWARENESS_HINT_BANDS, awareness);

  return (
    <div>
      <div className={styles.list}>
        {threats.length === 0 ? (
          <div className={styles.empty}>No active threats. Stay hungry.</div>
        ) : (
          threats.map((t) => <ThreatCard key={t.id} threat={t} />)
        )}
      </div>
      <div className={styles.meter}>
        <div className={styles.meterLabel}>HUMAN AWARENESS</div>
        <Gauge
          label=""
          valueText=""
          fillPercent={awareness}
          variant="awareness"
          small
        />
        <div className={styles.meterHint}>{hint.msg}</div>
      </div>
      <div className={styles.facility} style={{ color: facility.color }}>
        FACILITY STATUS: {facility.label}
      </div>
    </div>
  );
}