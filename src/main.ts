import './styles.css';
import './ui/hud.css';
import { Game } from './core/Game';
import { Hud } from './ui/Hud';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const hudRoot = document.querySelector<HTMLElement>('#hud');
const overlay = document.querySelector<HTMLElement>('#overlay');
if (!canvas || !hudRoot || !overlay) throw new Error('Missing DOM shell');

const hud = new Hud(hudRoot, overlay);
const game = new Game(canvas, hud);
game.installHooks();
game.start();

declare global {
  interface Window {
    __METRO_GAME__?: Game;
  }
}
window.__METRO_GAME__ = game;

window.addEventListener('resize', () => game.resize());
window.addEventListener('orientationchange', () => game.resize());
