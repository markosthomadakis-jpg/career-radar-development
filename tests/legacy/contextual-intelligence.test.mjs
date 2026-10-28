import assert from 'node:assert/strict';
import {evaluateContextualFit} from '../../legacy/engines/calibration-v53.mjs';
const base={fit_score:90};
const obs=[1,2,3,4].flatMap(n=>[
 {vacancy_id:`a${n}`,source:`https://example.org/a${n}`,requirement:'Project governance',tier:'essential',specificity:1},
 {vacancy_id:`a${n}`,source:`https://example.org/a${n}`,requirement:'Airspace regulation',tier:'desirable',specificity:2}
]);
assert.equal(evaluateContextualFit(base,'project governance',{}).score,null);
assert.equal(evaluateContextualFit(base,'project governance',{observations:obs.slice(0,4)}).score,null);
const result=evaluateContextualFit(base,'project governance',{observations:obs});
assert.equal(result.sample_size,4);
assert.equal(result.confidence,'Low');
assert(result.score<base.fit_score);
assert.equal(result.signals[0].supported,true);
assert(result.signals.some(x=>x.requirement==='Airspace regulation'&&!x.supported));
assert.equal(evaluateContextualFit({fit_score:null},'project governance',{observations:obs}).score,null);
console.log('Contextual intelligence tests passed');
