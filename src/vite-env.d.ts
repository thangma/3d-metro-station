/// <reference types="vite/client" />
import type { Diagnostics } from './test/diagnostics';

declare global {
  interface ThreeGameTestHooks {
    /** Re-seed the game RNG; all gameplay randomness flows through it. */
    seed(value: number): void | Promise<void>;
    /** Acknowledge after setup completes; throw for unknown states. */
    setState(name: string): { state: string } | Promise<{ state: string }>;
    /** Stop simulation/state transitions immediately while rendering continues. */
    setPausedForScreenshot(paused: boolean): void | Promise<void>;
    /** Stabilize ambient/idle visuals without an unpaused simulation tick. */
    setReducedMotion(enabled: boolean): void | Promise<void>;
    /** Hide debug UI before capturing. */
    hideDebugUi(hidden: boolean): void | Promise<void>;
  }

  interface Window {
    __THREE_GAME_DIAGNOSTICS__?: Diagnostics;
    __THREE_GAME_TEST_HOOKS__?: ThreeGameTestHooks;
  }
}

export {};
