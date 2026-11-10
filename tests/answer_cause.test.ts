// Rules 187: an answer to a help-build ask keeps the term that decided it.
import { afterEach, describe, expect, it } from 'vitest';
import { answerCause, setAnswerCause, type AnswerTerms } from '../src/sim/answer_cause';
import { projectHistory } from '../src/sim/history';
import { CURRENT_RULES_VERSION, SUPPORTED_RULES_VERSIONS } from '../src/sim/rulesversion';
import { civicFixture, civicTalk } from './helpers/civic';

afterEach(() => { setAnswerCause(true); });

const terms = (o: Partial<AnswerTerms>): AnswerTerms => ({ w: 0.5, experience: 0, affinity: 0, chance: 0, drive: 0, kin: 0, asker: 'Ada', ...o });

/** STAGED: Ada asks Ben, in conversation, to help with a shared storehouse she proposed. */
function asked(version: number, generous = true) {
  const f = civicFixture(generous);
  f.w.settings.rulesVersion = version;
  civicTalk(f.w, f.a, f.b, f.site.id);
  const req = f.w.requests.find((r) => r.siteId === f.site.id && r.to === f.b.id) ?? f.w.requests.find((r) => r.siteId === f.site.id);
  const project = f.w.civicProjects![0];
  const ben = project.participants.find((m) => m.personId === f.b.id);
  return { ...f, req, project, ben };
}

describe('rules 187: an answer keeps the term that decided it', () => {
  it('is registered and supported (the current version may be later)', () => {
    expect(CURRENT_RULES_VERSION).toBeGreaterThanOrEqual(187);
    expect(SUPPORTED_RULES_VERSIONS).toContain(187);
  });

  it('a yes names the one term it could not have done without, in a fixed order', () => {
    expect(answerCause(terms({ w: 0.6, kin: 0.2, affinity: 0.2 }))).toBe('Ada is kin');
    expect(answerCause(terms({ w: 0.6, experience: 0.08 }))).toBe("has seen Ada's shared work come good");
    expect(answerCause(terms({ w: 0.6, affinity: 0.16 }))).toBe('is fond of Ada');
    expect(answerCause(terms({ w: 0.56, chance: 0.05 }))).toBe('it was close, and it was yes this time');
    expect(answerCause(terms({ w: 0.9, affinity: 0.1, chance: 0.05 }))).toBe('it is in their nature to take on shared work');
  });

  it('a no names the one term that turned it, in a fixed order', () => {
    expect(answerCause(terms({ w: 0.5, experience: -0.08 }))).toBe("has seen Ada's shared work fail");
    expect(answerCause(terms({ w: 0.45, drive: 0.15 }))).toBe('their own needs weighed too much just then');
    expect(answerCause(terms({ w: 0.52, chance: -0.05 }))).toBe('it was close, and it was no this time');
    expect(answerCause(terms({ w: 0.47 }))).toBe('does not know Ada well enough to commit');
    expect(answerCause(terms({ w: 0.2 }))).toBe('it is not in their nature to take on shared work');
    // a term that could not have turned it alone is not blamed
    expect(answerCause(terms({ w: 0.2, experience: -0.04, drive: 0.05, chance: -0.05 }))).toBe('it is not in their nature to take on shared work');
  });

  it('at 186 a yes keeps the label and no cause', () => {
    const { req, ben } = asked(186);
    expect(req?.status === 'promised' || req?.status === 'fulfilled').toBe(true);
    expect(req?.answerWhy).toBeUndefined();
    expect(ben?.answerWhy).toBeUndefined();
  });

  it('at 187 the same yes keeps its cause on the request and on the participation, and the project history shows it', () => {
    const { w, req, ben, project } = asked(187);
    expect(req?.status === 'promised' || req?.status === 'fulfilled').toBe(true);
    expect(req?.answerWhy).toBeTruthy();
    expect(ben?.answerWhy).toBe(req?.answerWhy);
    expect(projectHistory(w, project).some((l) => l.includes(`(${req!.answerWhy})`))).toBe(true);
  });

  it('the answer itself is the same at 186 and 187', () => {
    const before = asked(186), now = asked(187);
    expect(now.req?.status).toBe(before.req?.status);
    expect(now.req?.note).toBe(before.req?.note);
    const no186 = asked(186, false), no187 = asked(187, false);
    expect(no187.req?.status).toBe(no186.req?.status);
    expect(no187.req?.note).toBe(no186.req?.note);
  });

  it('with the switch off nothing is kept at 187', () => {
    setAnswerCause(false);
    const { req, ben } = asked(187);
    expect(req?.answerWhy).toBeUndefined();
    expect(ben?.answerWhy).toBeUndefined();
  });
});
