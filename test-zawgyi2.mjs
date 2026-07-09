import { ZawgyiDetector } from './node_modules/myanmar-tools/src/zawgyi_detector.ts';
console.log('detector ok', typeof ZawgyiDetector);
const d = new ZawgyiDetector();
console.log(d.getZawgyiProbability('စိတ္ သေဘာထားရိွေသာ'));
