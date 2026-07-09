const fs = require('fs');
const vm = require('vm');

// Load the real Z2U rule table (Apache-2.0, Google myanmar-tools) into a sandboxed context.
const z2uSrc = fs.readFileSync('./node_modules/myanmar-tools/resources/Z2U.js', 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(z2uSrc + '\nthis.getAllRulesZ2U = getAllRulesZ2U;', sandbox);
const getAllRulesZ2U = sandbox.getAllRulesZ2U;

function runPhase(rules, inString) {
  let outString = '';
  let midString = inString;
  let startOfString = true;
  while (midString.length > 0) {
    let foundRule = false;
    for (const rule of rules) {
      if (rule.matchOnStart == null || startOfString) {
        const m = midString.match(rule.p);
        if (m != null) {
          foundRule = true;
          const rightPartSize = midString.length - m[0].length;
          midString = midString.replace(rule.p, rule.s);
          const newStart = midString.length - rightPartSize;
          outString += midString.substring(0, newStart);
          midString = midString.substring(newStart);
        }
      }
    }
    if (!foundRule) {
      outString += midString[0];
      midString = midString.substring(1);
    }
    startOfString = false;
  }
  return outString;
}

function zawgyiToUnicode(inString) {
  let out = inString;
  for (const rules of getAllRulesZ2U()) out = runPhase(rules, out);
  return out;
}

const samples = [
  'စိတ္ သေဘာထားရိွေသာ။ good -natuerd.',
  '(ေရွ႕ေဖာ္ျပပါ ပုဂၢိဳလ္၊ ေဒသ စသည္တို႔ႏွင့္ တစု တေပါင္းတည္း ျဖစ္ေသာ အရာဝတၳဳ၊ ပစၥည္းကို ျပေသာ ေနာက္ဆက္စကား)။',
  'ကပိုင္ဆိုင္သူဧကဝုစ္ျဖစ္ေၾကာင္းျပေနာက္ဆက္။',
];
for (const s of samples) {
  console.log('IN :', s);
  console.log('OUT:', zawgyiToUnicode(s));
  console.log('---');
}
