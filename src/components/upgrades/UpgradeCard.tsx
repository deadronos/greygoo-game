/**
 * Upgrade list + individual upgrade card.
 *
 * Pure presentation — affordability and "owned" status are derived from
 * state in this component, but the buy action goes through the store.
 */

import clsx from "clsx";

import { selectState, useGameStore } from "@/store/gameStore";
import { UPGRADES } from "@/systems/upgrades";
import type { UpgradeDef, UpgradeId } from "@/systems/types";

import styles from "./UpgradeCard.module.css";

interface UpgradeCardProps {
  def: UpgradeDef;
  owned: boolean;
  canAfford: boolean;
  onBuy: () => void;
}

function formatCost(cost: UpgradeDef["cost"]): string {
  return Object.entries(cost)
    .map(([k, v]) => `${v} ${k}`)
    .join(" · ");
}

export function UpgradeCard({ def, owned, canAfford, onBuy }: UpgradeCardProps) {
  return (
    <div
      className={clsx(
        styles.card,
        owned && styles.owned,
        !owned && !canAfford && styles.unavailable,
      )}
      onClick={!owned && canAfford ? onBuy : undefined}
    >
      <div className={styles.info}>
        <div className={styles.name}>{def.name}</div>
        <div className={styles.desc}>{def.desc}</div>
      </div>
      <div className={styles.cost}>{owned ? "✓ INSTALLED" : formatCost(def.cost)}</div>
    </div>
  );
}

export function UpgradeList() {
  const state = useGameStore(selectState);
  const clickUpgrade = useGameStore((s) => s.clickUpgrade);

  return (
    <div className={styles.list}>
      {UPGRADES.map((u) => {
        const owned = !!state.upgrades[u.id as UpgradeId];
        const canAfford = (Object.entries(u.cost) as [keyof typeof state, number][])
          .every(([k, v]) => (state[k] as number) >= v);
        return (
          <UpgradeCard
            key={u.id}
            def={u}
            owned={owned}
            canAfford={canAfford}
            onBuy={() => clickUpgrade(u.id)}
          />
        );
      })}
    </div>
  );
}