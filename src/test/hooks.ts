import type { Diagnostics } from '../test/diagnostics';

export interface HookHost {
  seed(value: number): void;
  setState(name: string): { state: string };
  setPausedForScreenshot(paused: boolean): void;
  setReducedMotion(enabled: boolean): void;
  hideDebugUi(hidden: boolean): void;
  getDiagnostics(): Diagnostics;
}

export function installHooks(host: HookHost): void {
  window.__THREE_GAME_TEST_HOOKS__ = {
    seed: (value: number) => host.seed(value),
    setState: (name: string) => host.setState(name),
    setPausedForScreenshot: (paused: boolean) => host.setPausedForScreenshot(paused),
    setReducedMotion: (enabled: boolean) => host.setReducedMotion(enabled),
    hideDebugUi: (hidden: boolean) => host.hideDebugUi(hidden),
  };
}
