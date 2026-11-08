import {build} from 'esbuild';
const result=await build({entryPoints:['backend/worker.mjs'],bundle:true,format:'esm',platform:'browser',target:'es2022',write:false});
console.log('PASS: Worker ESM bundle ('+result.outputFiles[0].contents.length+' bytes, no deployment)');
