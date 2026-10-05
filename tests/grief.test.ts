import { describe, expect, it } from 'vitest';
import { deserializeWorld, serializeWorld } from '../src/app/save';
import { DEATH_RECORDS_KEPT } from '../src/sim/constants';
import { conservationReport } from '../src/sim/economy';
import { addLog } from '../src/sim/events';
import { describeEntity } from '../src/sim/inspect';
import { killPerson } from '../src/sim/lifecycle';
import type { Grave, World } from '../src/sim/types';
import { addPerson, done, stage } from './helpers/kit';
import { run } from './helpers/util';

const graveOf = (w: World, personId: number): Grave | undefined => w.graves.find((g) => g.personId === personId);

describe('a death is remembered: the grave says what its person was about at the end', () => {
  it('the grave keeps the cause, the wolf bites they remembered, their pack and their last memories; the feed says it in a clause', () => {
    // STAGED: Ana carries two pieces of wood and remembers two wolf attacks; then she dies of thirst
    const s = stage('death-record');
    const ana = addPerson(s, 'Ana', 44.5, 32.5, { inv: { wood: 2 } });
    addPerson(s, 'Ben', 47.5, 32.5, { sex: 'm' });
    const w = done(s);
    run(w, 60);
    addLog(w, ana, 'danger', 'A wolf attacked me near (44, 32).');
    addLog(w, ana, 'danger', 'A wolf attacked me near (45, 33).');
    killPerson(w, ana, 'thirst');

    const g = graveOf(w, ana.id);
    expect(g, 'a grave that knows whose it is').toBeDefined();
    expect(g!.cause).toBe('thirst');
    const d = w.deceased.find((x) => x.id === ana.id)!;
    expect(d.last?.wolfBites).toBe(2);
    expect(d.last?.pack).toEqual({ wood: 2 });
    expect(Object.keys(d.last?.needs ?? {}).sort()).toEqual(['energy', 'hunger', 'safety', 'social', 'thirst', 'warmth']);
    expect(d.last?.lines?.at(-1)).toBe('A wolf attacked me near (45, 33).');
    expect(w.events.some((e) => e.text === `Ana died (thirst, after 2 wolf bites), aged ${d.age}.`)).toBe(true);

    const card = describeEntity(w, g!.id)!;
    expect(card.rows).toContainEqual(['Cause', 'thirst']);
    expect(card.rows).toContainEqual(['Bitten by wolves', '2 times (that they still remembered)']);
    const end = card.sections?.find((x) => x.title === 'At the end');
    expect(end?.items).toEqual([{ kind: 'wood', n: 2 }]);
    expect(card.sections?.find((x) => x.title === 'Their last memories')?.notes).toEqual(d.last?.lines);
    // what she carried was put down where she fell, through the ledger
    expect(conservationReport(w).ok).toBe(true);
    // a loaded save shows the same card
    expect(describeEntity(deserializeWorld(serializeWorld(w)), g!.id)).toEqual(card);
  });

  it(`only the newest ${DEATH_RECORDS_KEPT} deaths keep their last hours; older graves keep the cause`, () => {
    // STAGED: forty-five people die one after another
    const s = stage('death-records-cap');
    const people = Array.from({ length: DEATH_RECORDS_KEPT + 5 }, (_, i) => addPerson(s, `P${i}`, 20.5 + (i % 15) * 3, 30.5 + Math.floor(i / 15) * 4));
    const w = done(s);
    for (const p of people) killPerson(w, p, 'test');
    const kept = w.deceased.filter((d) => d.last);
    expect(kept).toHaveLength(DEATH_RECORDS_KEPT);
    expect(kept[0].id).toBe(people[5].id);
    const oldest = describeEntity(w, graveOf(w, people[0].id)!.id)!;
    expect(oldest.rows).toContainEqual(['Cause', 'test']);
    expect(oldest.notes).toEqual(['Nothing more is known of how they died.']);
  });
});
