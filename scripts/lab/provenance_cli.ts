// The plain-JavaScript lab runner loads the shared helper through its existing vite-node toolchain.
import {labProvenance} from '../observers/provenance';
console.log(JSON.stringify(labProvenance()));
