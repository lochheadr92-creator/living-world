// Insert observation points in the diagnostic build only. Fail if the measured branches move.
import { defineConfig } from 'vite';
export default defineConfig({ plugins: [{
  name: 'trace-collection-planner', enforce: 'pre',
  transform(source, filename) {
    if (!filename.replaceAll('\\','/').endsWith('/src/sim/production.ts')) return;
    source = source.replaceAll('\r\n','\n');
    function mark(at: string, event: string) {
      if (source.split(at).length !== 2) throw Error('Ambiguous trace point: ' + at);
      source = source.replace(at, 'globalThis.__storeTrace?.(' + event + ');\n' + at);
    }
    mark("const rememberedOnly=dest?.btype==='food_rack'", "'request', item, why, dest?.id");
    mark("if (n < 1) continue;\n    found.push", "'stock', item, why, dest?.id, b.id, n");
    mark("collectLeaf(ctx, f.b, { [item]: take }", "'offer', item, why, dest?.id, f.b.id, take");
    return source;
  }
}] });
