export type TrainState =
  | 'idle'
  | 'approaching'
  | 'decelerating'
  | 'stopped'
  | 'doorsOpening'
  | 'boarding'
  | 'doorsClosing'
  | 'departing'
  | 'complete';

export interface TrainContext {
  playerInDoorway: boolean;
}

const DURATIONS: Record<TrainState, number> = {
  idle: Number.POSITIVE_INFINITY,
  approaching: 6,
  decelerating: 4,
  stopped: 1.5,
  doorsOpening: 2,
  boarding: 6,
  doorsClosing: 2,
  departing: 5,
  complete: Number.POSITIVE_INFINITY,
};

const CRUISE_SPEED = 16.0;
const INITIAL_APPROACH_DISTANCE = 96.0;

export class TrainSystem {
  state: TrainState = 'idle';
  speed = 0;
  doorOpen = 0;
  positionX = 0;
  private stateTimer = 0;

  requestArrival(): void {
    if (this.state === 'idle') {
      this.transitionTo('approaching');
    }
  }

  forceState(s: TrainState): void {
    this.transitionTo(s);
  }

  isBoardingOpen(): boolean {
    return this.state === 'boarding' || (this.state === 'doorsOpening' && this.doorOpen > 0.9);
  }

  update(dt: number, ctx: TrainContext): void {
    this.stateTimer += dt;
    const duration = DURATIONS[this.state];

    switch (this.state) {
      case 'idle':
        this.speed = 0;
        this.doorOpen = 0;
        this.positionX = INITIAL_APPROACH_DISTANCE;
        break;

      case 'approaching': {
        this.doorOpen = 0;
        const progress = Math.min(1, this.stateTimer / duration);
        this.speed = CRUISE_SPEED;
        this.positionX = INITIAL_APPROACH_DISTANCE * (1 - progress * 0.6);
        if (this.stateTimer >= duration) {
          this.transitionTo('decelerating');
        }
        break;
      }

      case 'decelerating': {
        this.doorOpen = 0;
        const progress = Math.min(1, this.stateTimer / duration);
        this.speed = CRUISE_SPEED * (1 - progress);
        this.positionX = INITIAL_APPROACH_DISTANCE * 0.4 * (1 - progress);
        if (this.stateTimer >= duration) {
          this.speed = 0;
          this.positionX = 0;
          this.transitionTo('stopped');
        }
        break;
      }

      case 'stopped': {
        this.speed = 0;
        this.positionX = 0;
        this.doorOpen = 0;
        if (this.stateTimer >= duration) {
          this.transitionTo('doorsOpening');
        }
        break;
      }

      case 'doorsOpening': {
        this.speed = 0;
        this.positionX = 0;
        this.doorOpen = Math.min(1, this.stateTimer / duration);
        if (this.stateTimer >= duration) {
          this.doorOpen = 1;
          this.transitionTo('boarding');
        }
        break;
      }

      case 'boarding': {
        this.speed = 0;
        this.positionX = 0;
        this.doorOpen = 1;
        if (this.stateTimer >= duration && !ctx.playerInDoorway) {
          this.transitionTo('doorsClosing');
        }
        break;
      }

      case 'doorsClosing': {
        this.speed = 0;
        this.positionX = 0;
        this.doorOpen = Math.max(0, 1 - this.stateTimer / duration);
        if (this.stateTimer >= duration) {
          this.doorOpen = 0;
          this.transitionTo('departing');
        }
        break;
      }

      case 'departing': {
        this.doorOpen = 0;
        const progress = Math.min(1, this.stateTimer / duration);
        this.speed = CRUISE_SPEED * progress;
        this.positionX = -progress * progress * 80;
        if (this.stateTimer >= duration) {
          this.transitionTo('complete');
        }
        break;
      }

      case 'complete': {
        this.doorOpen = 0;
        break;
      }
    }
  }

  private transitionTo(newState: TrainState): void {
    this.state = newState;
    this.stateTimer = 0;

    switch (newState) {
      case 'idle':
        this.speed = 0;
        this.doorOpen = 0;
        this.positionX = INITIAL_APPROACH_DISTANCE;
        break;
      case 'approaching':
        this.speed = CRUISE_SPEED;
        this.doorOpen = 0;
        this.positionX = INITIAL_APPROACH_DISTANCE;
        break;
      case 'decelerating':
        this.speed = CRUISE_SPEED;
        this.doorOpen = 0;
        break;
      case 'stopped':
        this.speed = 0;
        this.positionX = 0;
        this.doorOpen = 0;
        break;
      case 'doorsOpening':
        this.speed = 0;
        this.positionX = 0;
        this.doorOpen = 0;
        break;
      case 'boarding':
        this.speed = 0;
        this.positionX = 0;
        this.doorOpen = 1;
        break;
      case 'doorsClosing':
        this.speed = 0;
        this.positionX = 0;
        this.doorOpen = 1;
        break;
      case 'departing':
        this.speed = 0;
        this.doorOpen = 0;
        break;
      case 'complete':
        this.speed = CRUISE_SPEED;
        this.doorOpen = 0;
        break;
    }
  }
}
