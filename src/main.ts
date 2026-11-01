import './styles.css';
import { Game } from './core/Game';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) throw new Error('Missing #scene canvas');

const game = new Game(canvas);
game.installHooks();
game.start();

window.addEventListener('resize', () => game.resize());
window.addEventListener('orientationchange', () => game.resize());
