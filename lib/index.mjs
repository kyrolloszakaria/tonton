import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const tonton = require('./index.js');

export default tonton.play;
export const { play, listSounds, generateWav } = tonton;
