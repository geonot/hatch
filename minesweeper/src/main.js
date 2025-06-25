import GameLauncher from 'hatch-engine/core/GameLauncher.js';
import MinesweeperScene from './scenes/MinesweeperScene.js';
import { getLogger } from 'hatch-engine/core/Logger.js';

const logger = getLogger('Main');

GameLauncher.quickStart(MinesweeperScene, {
    onReady: (engine) => {
        logger.info('Minesweeper game ready!');
    }
});