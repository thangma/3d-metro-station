import { Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/test/rng';
import { TrainSystem } from '../../src/systems/TrainSystem';
import { buildNavGraph } from '../../src/world/nav';
import { NpcSystem } from '../../src/systems/NpcSystem';

describe('NpcSystem and Navigation', () => {
  it('seeding npc.spawn(50) twice produces identical initial positions', () => {
    const nav = buildNavGraph();

    const sceneA = new Scene();
    const trainA = new TrainSystem();
    const npcA = new NpcSystem(sceneA, createRng(42), nav, trainA);
    npcA.spawn(50);

    const sceneB = new Scene();
    const trainB = new TrainSystem();
    const npcB = new NpcSystem(sceneB, createRng(42), nav, trainB);
    npcB.spawn(50);

    for (let i = 0; i < 50; i++) {
      const posA = npcA.positions[i];
      const posB = npcB.positions[i];
      expect(posA.x).toBeCloseTo(posB.x, 3);
      expect(posA.y).toBeCloseTo(posB.y, 3);
      expect(posA.z).toBeCloseTo(posB.z, 3);
    }
  });

  it('every NPC reaches its queue slot within 60 simulated seconds', () => {
    const nav = buildNavGraph();
    const scene = new Scene();
    const train = new TrainSystem();
    const npc = new NpcSystem(scene, createRng(10), nav, train);
    npc.spawn(50);

    for (let i = 0; i < 60; i++) {
      npc.update(1.0);
    }

    expect(npc.queuedCount).toBe(50);
  });

  it('no NPC boards before doorOpen > 0.9', () => {
    const nav = buildNavGraph();
    const scene = new Scene();
    const train = new TrainSystem();
    const npc = new NpcSystem(scene, createRng(10), nav, train);
    npc.spawn(50);

    for (let i = 0; i < 60; i++) npc.update(1.0);

    train.forceState('doorsOpening');
    train.doorOpen = 0.5;
    npc.update(0.1);
    expect(npc.boardedCount).toBe(0);
  });

  it('all 50 have boarded by the end of boarding when player is clear', () => {
    const nav = buildNavGraph();
    const scene = new Scene();
    const train = new TrainSystem();
    const npc = new NpcSystem(scene, createRng(10), nav, train);
    npc.spawn(50);

    for (let i = 0; i < 60; i++) npc.update(1.0);

    train.forceState('boarding');
    train.doorOpen = 1.0;

    for (let i = 0; i < 60; i++) {
      npc.update(0.1);
    }

    expect(npc.boardedCount).toBe(50);
  });
});
