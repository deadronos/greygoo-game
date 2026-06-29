/**
 * Top-level app shell.
 *
 * Composes the presentational components and runs the lifecycle hooks.
 * Logic lives in the store and the systems layer.
 */

import { AllocationPanel } from "@/components/allocation/AllocationPanel";
import { PrimaryAction } from "@/components/actions/PrimaryAction";
import { SecondaryActions } from "@/components/actions/SecondaryActions";
import { EventLog } from "@/components/log/EventLog";
import { Gauges } from "@/components/gauges/Gauges";
import { Panel } from "@/components/panels/Panel";
import { ResourceGrid } from "@/components/resources/ResourceGrid";
import { IntroOverlay } from "@/components/overlays/IntroOverlay";
import { LoseOverlay } from "@/components/overlays/LoseOverlay";
import { Telemetry } from "@/components/telemetry/Telemetry";
import { ThreatList } from "@/components/threats/ThreatCard";
import { TopBar } from "@/components/topbar/TopBar";
import { UpgradeList } from "@/components/upgrades/UpgradeCard";
import { VizPanel } from "@/components/viz/VizPanel";
import { WinOverlay } from "@/components/overlays/WinOverlay";
import { HelpOverlay } from "@/components/overlays/HelpOverlay";
import { useAutosave } from "@/hooks/useAutosave";
import { useBootCheck } from "@/hooks/useBootCheck";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { selectScreen, useGameStore } from "@/store/gameStore";

import styles from "./App.module.css";

function ThreatPanel() {
  return (
    <Panel title="HUMAN COUNTERMEASURES">
      <ThreatList />
    </Panel>
  );
}

function PlayScreen() {
  return (
    <div id="game" className={styles.game}>
      <TopBar />
      <Gauges />
      <ResourceGrid />
      <main className={styles.main}>
        <div className={styles.col}>
          <PrimaryAction />
          <SecondaryActions />
          <AllocationPanel />
          <Panel title="UPGRADES">
            <UpgradeList />
          </Panel>
        </div>
        <div className={styles.center}>
          <VizPanel />
          <EventLog />
        </div>
        <div className={styles.right}>
          <ThreatPanel />
          <Telemetry />
        </div>
      </main>
      <footer className={styles.foot}>
        <span>v2.0 · CLASSIFIED · UNAUTHORIZED ACCESS LOGGED</span>
      </footer>
    </div>
  );
}

export function App() {
  const screen = useGameStore(selectScreen);
  const helpOpen = useGameStore((s) => s.helpOpen);

  useBootCheck();
  useGameLoop();
  useAutosave();
  useKeyboardShortcuts();

  return (
    <>
      {screen === "play" && <PlayScreen />}
      {screen === "intro" && <IntroOverlay />}
      {screen === "win" && <WinOverlay />}
      {screen === "lose" && <LoseOverlay />}
      {helpOpen && <HelpOverlay />}
    </>
  );
}