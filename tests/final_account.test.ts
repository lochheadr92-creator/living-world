import {expect,it} from 'vitest';
import {stage,addPerson,done} from './helpers/kit';
import {killPerson} from '../src/sim/lifecycle';
import {serializeWorld,deserializeWorld} from '../src/app/save';
import {describeEntity} from '../src/sim/inspect';
import {newActivity} from '../src/sim/activities';
import {conservationReport} from '../src/sim/economy';
function fixture(version=144){const s=stage('final-account');s.w.settings={...s.w.settings,dynamics:'rich',rulesVersion:version};const p=addPerson(s,'Ada',40,40,{inv:{berries:2}}),q=addPerson(s,'Ben',70,40);done(s);p.activity=newActivity(s.w,p,{kind:'wander',label:'Walking toward water',goal:'find a drink',tx:42,ty:40});p.log.push({tick:s.w.tick,text:'The remembered shore was dry.',kind:'need'});return {...s,p,q};}
it('captures the actual final task and belongings before cleanup; observers do not grant remote knowledge',()=>{const f=fixture(),needs={...f.p.needs};killPerson(f.w,f.p,'thirst');const d=f.w.deceased[0];expect(d.last?.doing).toBe('Walking toward water');expect(d.last?.pack).toEqual({berries:2});expect(d.last?.needs).toEqual(needs);expect(f.p.inv).toEqual({});expect(f.q.relations[f.p.id]?.deathKnown).toBeUndefined();const g=f.w.graves[0],raw=serializeWorld(f.w),view=describeEntity(f.w,g.id)!;expect(view.rows).toContainEqual(['Recorded cause','thirst']);expect(view.notes.join(' ')).toContain('historical');expect(serializeWorld(f.w)).toBe(raw);expect(describeEntity(deserializeWorld(raw),g.id)).toEqual(view);expect(conservationReport(f.w).ok).toBe(true);});
it('retains only forty details, keeping older identities and causes truthful',()=>{const f=fixture();for(let i=0;i<41;i++){const p=addPerson(f,'Person '+i,20+i%15,30+Math.floor(i/15));killPerson(f.w,p,'old age');}expect(f.w.deceased.filter(d=>d.last)).toHaveLength(40);expect(f.w.deceased[0].last).toBeUndefined();expect(f.w.deceased[0].cause).toBe('old age');expect(describeEntity(f.w,f.w.graves[0].id)!.notes.join(' ')).toContain('No detailed final account');});
it('keeps predecessor deaths unchanged and rejects malformed snapshot records',()=>{const old=fixture(143);killPerson(old.w,old.p,'thirst');expect(old.w.deceased[0].last).toBeUndefined();const f=fixture();killPerson(f.w,f.p,'thirst');f.w.deceased[0].last!.needs.thirst=NaN;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow('Invalid final account');});

it('saves and reloads a final account whose remembered water predates the world, and rejects a future sighting',()=>{
 // Ordinary origin: forest at rules 156, Nico (a founder) died at tick 54,675 nearest a worldgen water memory seen at -50.
 const f=fixture();f.p.beliefs[9001]={id:9001,kind:'water',x:41.5,y:40.5,amount:0,max:0,seen:-50,src:'seen',from:0,learned:-50};
 killPerson(f.w,f.p,'thirst');expect(f.w.deceased[0].last?.water?.seen).toBe(-50);
 const raw=serializeWorld(f.w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
 f.w.deceased[0].last!.water!.seen=f.w.deceased[0].tick+1;expect(()=>deserializeWorld(serializeWorld(f.w))).toThrow('Invalid final account water');
});
import {sharedFixture} from './helpers/shared_projects';
it('labels a new shared layout for shared use instead of claiming private ownership',()=>{const f=sharedFixture(true,144);expect(f.w.events.some(e=>e.text.includes('marked out a grain mill for shared use'))).toBe(true);});
