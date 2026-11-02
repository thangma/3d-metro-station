import { describe, expect, it } from 'vitest';
import { TrainSystem } from '../../src/systems/TrainSystem';

describe('TrainSystem state machine', () => {
  it('advances only in order through states to complete', () => {
    const system = new TrainSystem();
    expect(system.state).toBe('idle');

    system.requestArrival();
    expect(system.state).toBe('approaching');

    system.update(5.9, { playerInDoorway: false });
    expect(system.state).toBe('approaching');
    system.update(0.2, { playerInDoorway: false });
    expect(system.state).toBe('decelerating');

    system.update(4.1, { playerInDoorway: false });
    expect(system.state).toBe('stopped');

    system.update(1.6, { playerInDoorway: false });
    expect(system.state).toBe('doorsOpening');

    system.update(2.1, { playerInDoorway: false });
    expect(system.state).toBe('boarding');

    system.update(6.1, { playerInDoorway: false });
    expect(system.state).toBe('doorsClosing');

    system.update(2.1, { playerInDoorway: false });
    expect(system.state).toBe('departing');

    system.update(5.1, { playerInDoorway: false });
    expect(system.state).toBe('complete');
  });

  it('doorsOpening cannot begin while speed > 0', () => {
    const system = new TrainSystem();
    system.forceState('decelerating');
    expect(system.speed).toBeGreaterThan(0);

    system.update(3.0, { playerInDoorway: false });
    expect(system.state).toBe('decelerating');
    expect(system.doorOpen).toBe(0);
  });

  it('boarding does not advance to doorsClosing while playerInDoorway is true', () => {
    const system = new TrainSystem();
    system.forceState('boarding');
    expect(system.state).toBe('boarding');

    system.update(10, { playerInDoorway: true });
    expect(system.state).toBe('boarding');
    expect(system.doorOpen).toBe(1);

    system.update(0.1, { playerInDoorway: false });
    expect(system.state).toBe('doorsClosing');
  });

  it('doorOpen is 1 during boarding and 0 after doorsClosing', () => {
    const system = new TrainSystem();
    system.forceState('boarding');
    expect(system.doorOpen).toBe(1);

    system.forceState('doorsClosing');
    system.update(2.1, { playerInDoorway: false });
    expect(system.doorOpen).toBe(0);
  });
});
