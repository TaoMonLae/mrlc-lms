import { ZawgyiDetector } from './node_modules/myanmar-tools/src/zawgyi_detector.ts';
import { ZawgyiConverter } from './node_modules/myanmar-tools/src/zawgyi_converter.ts';

const detector = new ZawgyiDetector();
const converter = new ZawgyiConverter();

const samples = [
  'စိတ္ သေဘာထားရိွေသာ။ good -natuerd.',
  '(ေရွ႕ေဖာ္ျပပါ ပုဂၢိဳလ္၊ ေဒသ စသည္တို႔ႏွင့္ တစု တေပါင္းတည္း ျဖစ္ေသာ အရာဝတၳဳ၊ ပစၥည္းကို ျပေသာ ေနာက္ဆက္စကား)။',
];

for (const s of samples) {
  const score = detector.getZawgyiProbability(s);
  console.log('score:', score.toFixed(3), '|', s.slice(0, 50));
  console.log('  -> converted:', converter.convert(s));
}
