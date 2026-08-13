import type { OfficialLanguageQuestChallenge, OfficialLanguageQuestCourse } from './languageQuestImportedCourses';

type Question = [prompt: string, correct: string, distractors: [string, string, string], explanation: string];

interface LessonSeed {
  title: string;
  summary: string;
  formula: string;
  example: string;
  explanation: string;
  terms: [[string, string], [string, string]];
  strategy: string;
  questions: [Question, Question, Question];
}

const PREFIX = 'MATH_V1::';

function concept(seed: LessonSeed): string {
  return PREFIX + JSON.stringify({
    version: 1,
    subject: 'mathematics',
    summary: seed.summary,
    objectives: [
      `Model and solve ${seed.title.toLocaleLowerCase()} problems`,
      'Show each operation and check whether the result is reasonable',
      'Interpret the answer in the context of a GED-style problem',
    ],
    explanation: [seed.summary, seed.explanation],
    visual: {
      type: 'formula',
      title: `${seed.title}: essential relationship`,
      formula: seed.formula,
      example: seed.example,
    },
    keyTerms: seed.terms.map(([marker, text]) => ({ marker, text })),
    gedStrategy: seed.strategy,
    checkpoint: seed.questions[0][0],
  });
}

function challenges(seed: LessonSeed): OfficialLanguageQuestChallenge[] {
  return seed.questions.map(([prompt, correct, distractors, explanation], index) => {
    const options = [correct, ...distractors];
    const shift = index % options.length;
    return {
      type: 'SELECT',
      question: prompt,
      explanation,
      hint: 'Write the known values, choose the matching relationship, and estimate before calculating.',
      options: [...options.slice(shift), ...options.slice(0, shift)].map((text) => ({
        text,
        correct: text === correct,
        emoji: null,
        audioText: null,
      })),
    };
  });
}

function lesson(seed: LessonSeed) {
  return { title: seed.title, description: seed.summary, conceptIntro: concept(seed), challenges: challenges(seed) };
}

const rationalNumbers: LessonSeed[] = [
  {
    title: 'Rational Numbers and Number Lines',
    summary: 'Compare integers, fractions, and decimals by locating their values on one number line.',
    formula: '$a<b$ when $a$ lies to the left of $b$',
    example: '$-1.5<-\\frac{3}{4}<0.2$',
    explanation: 'Convert values to a common form when helpful. Negative numbers farther from zero are smaller, while positive numbers farther right are larger.',
    terms: [['rational number', 'a number expressible as a fraction of integers'], ['opposite', 'the same distance from zero on the other side']],
    strategy: 'Sketch a quick number line when negative signs make a comparison uncertain.',
    questions: [
      ['Which list is ordered from least to greatest?', '$-1.2,-\\frac{1}{2},0.3,\\frac{3}{4}$', ['$-\\frac{1}{2},-1.2,0.3,\\frac{3}{4}$', '$-1.2,0.3,-\\frac{1}{2},\\frac{3}{4}$', '$\\frac{3}{4},0.3,-\\frac{1}{2},-1.2$'], 'The decimal values are $-1.2,-0.5,0.3,0.75$, which increase in that order.'],
      ['Which number is farthest from zero?', '$-4.1$', ['$3.9$', '$-\\frac{7}{2}$', '$2.8$'], 'Compare absolute values: $4.1$ is greater than $3.9$, $3.5$, and $2.8$.'],
      ['A temperature rises from $-6^\\circ$ to $2^\\circ$. What is the change?', '$8^\\circ$', ['$4^\\circ$', '$-4^\\circ$', '$-8^\\circ$'], 'Change is final minus initial: $2-(-6)=8$.'],
    ],
  },
  {
    title: 'Factors, Multiples, and Divisibility',
    summary: 'Use prime factors, greatest common factors, and least common multiples to organize quantities.',
    formula: '$60=2^2\\cdot3\\cdot5$',
    example: '$\\operatorname{GCF}(24,36)=12$ and $\\operatorname{LCM}(6,8)=24$',
    explanation: 'A factor divides a number evenly. The GCF is useful for equal groups; the LCM identifies the first shared repeat.',
    terms: [['GCF', 'greatest factor shared by two or more numbers'], ['LCM', 'least positive multiple shared by two or more numbers']],
    strategy: 'Translate “largest equal groups” to GCF and “repeat together” to LCM.',
    questions: [
      ['What is $\\operatorname{GCF}(42,56)$?', '$14$', ['$7$', '$28$', '$98$'], 'The shared prime factors are $2\\cdot7=14$.'],
      ['Two lights flash every $6$ and $15$ seconds. After how many seconds do they flash together?', '$30$', ['$21$', '$45$', '$90$'], 'The least common multiple of $6$ and $15$ is $30$.'],
      ['Which is the prime factorization of $84$?', '$2^2\\cdot3\\cdot7$', ['$2\\cdot42$', '$4\\cdot21$', '$2^3\\cdot3\\cdot7$'], 'Repeated prime division gives $84=2\\cdot2\\cdot3\\cdot7$.'],
    ],
  },
  {
    title: 'Integer Exponents',
    summary: 'Apply exponent laws to multiply, divide, and raise powers without expanding every factor.',
    formula: '$a^m a^n=a^{m+n}$, $\\frac{a^m}{a^n}=a^{m-n}$',
    example: '$x^3x^4=x^7$ and $(y^2)^3=y^6$',
    explanation: 'The base must match before exponents combine. A negative exponent means a reciprocal, not a negative value.',
    terms: [['base', 'the repeated factor'], ['exponent', 'how many times the base is used as a factor']],
    strategy: 'Keep the base, then decide whether the operation adds, subtracts, or multiplies exponents.',
    questions: [
      ['Simplify $3^2\\cdot3^4$.', '$3^6$', ['$9^6$', '$3^8$', '$6^6$'], 'Multiplying powers with base $3$ adds exponents: $2+4=6$.'],
      ['Simplify $\\frac{x^9}{x^3}$ for $x\\ne0$.', '$x^6$', ['$x^3$', '$x^{12}$', '$6x$'], 'Dividing powers with the same base subtracts exponents: $9-3=6$.'],
      ['What is $2^{-3}$?', '$\\frac{1}{8}$', ['$-8$', '$8$', '$-\\frac{1}{8}$'], 'A negative exponent takes the reciprocal: $2^{-3}=1/2^3=1/8$.'],
    ],
  },
  {
    title: 'Roots and Undefined Expressions',
    summary: 'Evaluate square and cube roots and recognize operations that are not defined in the real numbers.',
    formula: '$\\sqrt{a}=b$ means $b^2=a$',
    example: '$\\sqrt{81}=9$, $\\sqrt[3]{-27}=-3$',
    explanation: 'A principal square root is nonnegative. Division by zero and an even root of a negative number are undefined over the real numbers.',
    terms: [['radical', 'a root symbol and its radicand'], ['undefined', 'an operation with no allowed real-number value']],
    strategy: 'Estimate between nearby perfect squares when a root is not exact.',
    questions: [
      ['What is $\\sqrt{144}$?', '$12$', ['$-12$', '$72$', '$14$'], 'The principal square root is $12$ because $12^2=144$.'],
      ['Which expression is undefined in the real numbers?', '$\\sqrt{-16}$', ['$\\sqrt[3]{-8}$', '$\\sqrt{0}$', '$\\sqrt{25}$'], 'No real number squared equals $-16$; the other roots have real values.'],
      ['Between which integers does $\\sqrt{50}$ lie?', '$7$ and $8$', ['$5$ and $6$', '$6$ and $7$', '$8$ and $9$'], 'Since $7^2=49$ and $8^2=64$, $\\sqrt{50}$ lies between $7$ and $8$.'],
    ],
  },
  {
    title: 'Operations with Fractions and Decimals',
    summary: 'Calculate accurately with rational numbers and choose a form that fits the situation.',
    formula: '$\\frac{a}{b}+\\frac{c}{d}=\\frac{ad+bc}{bd}$',
    example: '$\\frac{2}{3}+\\frac{1}{4}=\\frac{11}{12}$',
    explanation: 'Fractions need a common denominator for addition or subtraction. Decimal place values must align before combining.',
    terms: [['denominator', 'the number of equal parts in one whole'], ['reciprocal', 'a fraction with numerator and denominator exchanged']],
    strategy: 'Estimate first, then simplify the exact result and compare it with the estimate.',
    questions: [
      ['Compute $\\frac{5}{6}-\\frac{1}{4}$.', '$\\frac{7}{12}$', ['$\\frac{4}{2}$', '$\\frac{1}{2}$', '$\\frac{4}{10}$'], 'Using denominator $12$: $10/12-3/12=7/12$.'],
      ['Compute $3.6\\div0.12$.', '$30$', ['$3$', '$0.3$', '$300$'], 'Move both decimal points two places: $360\\div12=30$.'],
      ['A recipe uses $1\\frac{1}{2}$ cups per batch. How much for $2\\frac{1}{3}$ batches?', '$3\\frac{1}{2}$ cups', ['$2\\frac{5}{6}$ cups', '$3\\frac{5}{6}$ cups', '$4\\frac{1}{2}$ cups'], 'Multiply $3/2$ by $7/3$ to get $7/2=3.5$.'],
    ],
  },
  {
    title: 'Order of Operations and Estimation',
    summary: 'Evaluate multi-step numerical expressions and use estimation to detect calculator or sign errors.',
    formula: '$()\\rightarrow x^n\\rightarrow\\times,\\div\\rightarrow+,-$',
    example: '$18-2(3+4)=18-14=4$',
    explanation: 'Multiplication and division share priority and proceed left to right, as do addition and subtraction.',
    terms: [['operation', 'a process such as addition or division'], ['estimate', 'a close, reasonable approximation']],
    strategy: 'Round to friendly numbers before using the calculator; a distant result signals a likely entry error.',
    questions: [
      ['Evaluate $24\\div6+2(5-1)$.', '$12$', ['$8$', '$20$', '$40$'], 'Parentheses give $4$; then $24/6+2(4)=4+8=12$.'],
      ['Which is the best estimate for $19.8\\times5.1$?', '$100$', ['$10$', '$50$', '$500$'], 'Round to $20\\times5=100$.'],
      ['Evaluate $3+4^2\\div2$.', '$11$', ['$9.5$', '$19$', '$49$'], 'Exponent first: $4^2=16$; then $16/2=8$ and $3+8=11$.'],
    ],
  },
  {
    title: 'Scientific Notation',
    summary: 'Represent very large and very small values as a number from $1$ to $10$ times a power of ten.',
    formula: '$N=a\\times10^n$, where $1\\le|a|<10$',
    example: '$0.00052=5.2\\times10^{-4}$',
    explanation: 'A positive exponent moves the decimal right to recover a large number; a negative exponent moves it left.',
    terms: [['coefficient', 'the number multiplied by the power of ten'], ['power of ten', 'a value such as $10^3$ or $10^{-2}$']],
    strategy: 'Count decimal moves and use the original size to choose the exponent sign.',
    questions: [
      ['Write $7,300,000$ in scientific notation.', '$7.3\\times10^6$', ['$73\\times10^5$', '$7.3\\times10^{-6}$', '$0.73\\times10^7$'], 'The decimal moves six places left, producing coefficient $7.3$.'],
      ['Write $4.08\\times10^{-3}$ in standard notation.', '$0.00408$', ['$0.0408$', '$4080$', '$0.000408$'], 'A $-3$ exponent moves the decimal three places left.'],
      ['Compute $(2\\times10^4)(3\\times10^5)$.', '$6\\times10^9$', ['$5\\times10^9$', '$6\\times10^{20}$', '$6\\times10^1$'], 'Multiply coefficients and add exponents: $2(3)=6$ and $4+5=9$.'],
    ],
  },
  {
    title: 'Ratios and Unit Rates',
    summary: 'Use ratios to compare quantities and unit rates to describe an amount per one unit.',
    formula: '$\\text{unit rate}=\\frac{\\text{quantity}}{1\\text{ unit}}$',
    example: '$180\\text{ km}\\div3\\text{ h}=60\\text{ km/h}$',
    explanation: 'Keep units attached. Equivalent ratios describe the same multiplicative relationship.',
    terms: [['ratio', 'a multiplicative comparison of two quantities'], ['unit rate', 'a rate with denominator one']],
    strategy: 'Divide both parts by the denominator quantity to reveal the per-one rate.',
    questions: [
      ['A car travels $315$ miles in $5$ hours. What is its average rate?', '$63$ miles per hour', ['$62$ miles per hour', '$65$ miles per hour', '$1,575$ miles per hour'], '$315/5=63$ miles per hour.'],
      ['Which ratio is equivalent to $6:15$?', '$10:25$', ['$12:25$', '$18:30$', '$2:3$'], 'Both $6:15$ and $10:25$ simplify to $2:5$.'],
      ['A $12$-ounce package costs $3.48$ dollars. What is the unit price?', '$0.29$ dollars per ounce', ['$0.24$ dollars per ounce', '$0.36$ dollars per ounce', '$41.76$ dollars per ounce'], 'Divide cost by ounces: $3.48/12=0.29$.'],
    ],
  },
  {
    title: 'Proportions, Scale, and Conversions',
    summary: 'Solve proportional relationships, scale drawings, and multi-step unit conversions.',
    formula: '$\\frac{a}{b}=\\frac{c}{d}\\Rightarrow ad=bc$',
    example: '$\\frac{3}{5}=\\frac{x}{20}\\Rightarrow x=12$',
    explanation: 'A conversion factor equals one, so multiplying changes the unit without changing the physical amount.',
    terms: [['proportion', 'an equation showing two ratios are equal'], ['scale factor', 'the multiplier connecting corresponding lengths']],
    strategy: 'Write units in every fraction and cancel them before multiplying.',
    questions: [
      ['If $4$ notebooks cost $10$ dollars, what do $14$ notebooks cost at the same rate?', '$35$ dollars', ['$24$ dollars', '$28$ dollars', '$40$ dollars'], 'The unit price is $10/4=2.5$ dollars, and $14(2.5)=35$.'],
      ['A map scale is $1$ inch to $18$ miles. What distance does $3.5$ inches represent?', '$63$ miles', ['$21.5$ miles', '$54$ miles', '$72$ miles'], 'Multiply the scale rate: $3.5(18)=63$.'],
      ['Convert $5.5$ feet to inches using $1$ foot $=12$ inches.', '$66$ inches', ['$17.5$ inches', '$55$ inches', '$72$ inches'], '$5.5\\text{ ft}(12\\text{ in}/1\\text{ ft})=66\\text{ in}$.'],
    ],
  },
  {
    title: 'Percents and Financial Applications',
    summary: 'Model percent change, tax, discount, markup, commission, and simple interest in real situations.',
    formula: '$\\text{part}=\\text{percent}\\times\\text{whole}$',
    example: '$18\\%\\text{ of }250=0.18(250)=45$',
    explanation: 'Convert a percent to a decimal before multiplying. For percent change, compare the change with the original amount.',
    terms: [['percent change', 'change divided by original amount, times $100\\%$'], ['simple interest', '$I=Prt$']],
    strategy: 'Decide whether the requested value is the percent amount or the new total after adding or subtracting it.',
    questions: [
      ['A $72$-dollar jacket is discounted $25\\%$. What is the sale price?', '$54$ dollars', ['$18$ dollars', '$47$ dollars', '$96$ dollars'], 'The discount is $0.25(72)=18$ dollars, so the price is $72-18=54$.'],
      ['A population rises from $800$ to $920$. What is the percent increase?', '$15\\%$', ['$12\\%$', '$20\\%$', '$115\\%$'], 'The increase is $120$; $120/800=0.15=15\\%$.'],
      ['Find the simple interest on $1,500$ dollars at $4\\%$ for $3$ years.', '$180$ dollars', ['$60$ dollars', '$120$ dollars', '$1,680$ dollars'], '$I=Prt=1500(0.04)(3)=180$.'],
    ],
  },
];

const measurementDataProbability: LessonSeed[] = [
  {
    title: 'Perimeter and Polygon Area',
    summary: 'Use dimensions and formulas to find perimeter and area of rectangles, triangles, parallelograms, and trapezoids.',
    formula: '$A_{triangle}=\\frac{1}{2}bh$, $A_{trap}=\\frac{1}{2}(b_1+b_2)h$',
    example: '$A_{trap}=\\frac{1}{2}(8+12)(5)=50$',
    explanation: 'Perimeter measures boundary length in linear units; area measures surface in square units. Height is perpendicular to the base.',
    terms: [['perimeter', 'distance around a two-dimensional figure'], ['area', 'surface covered by a two-dimensional figure']],
    strategy: 'Label every dimension and unit, then select only the values required by the formula sheet.',
    questions: [
      ['A rectangle is $9$ feet by $6$ feet. What is its perimeter?', '$30$ feet', ['$15$ feet', '$54$ feet', '$60$ feet'], '$P=2(9)+2(6)=30$ feet.'],
      ['A triangle has base $14$ cm and height $9$ cm. What is its area?', '$63$ cm$^2$', ['$23$ cm$^2$', '$126$ cm$^2$', '$252$ cm$^2$'], '$A=bh/2=14(9)/2=63$ square centimeters.'],
      ['A parallelogram has area $96$ m$^2$ and base $12$ m. What is its height?', '$8$ m', ['$4$ m', '$84$ m', '$1,152$ m'], 'From $A=bh$, $h=96/12=8$ meters.'],
    ],
  },
  {
    title: 'Circles and Circular Measures',
    summary: 'Use radius, diameter, circumference, and area to solve circular measurement problems.',
    formula: '$C=2\\pi r=\\pi d$, $A=\\pi r^2$',
    example: '$r=4\\Rightarrow C=8\\pi$ and $A=16\\pi$',
    explanation: 'The radius is half the diameter. Keep an answer in terms of $\\pi$ unless a decimal approximation is requested.',
    terms: [['radius', 'distance from center to circle'], ['circumference', 'distance around a circle']],
    strategy: 'Circle whether the given measure is radius or diameter before substituting.',
    questions: [
      ['A circle has diameter $10$ cm. What is its circumference?', '$10\\pi$ cm', ['$5\\pi$ cm', '$20\\pi$ cm', '$100\\pi$ cm'], '$C=\\pi d=10\\pi$ centimeters.'],
      ['A circular garden has radius $7$ m. What is its area?', '$49\\pi$ m$^2$', ['$14\\pi$ m$^2$', '$28\\pi$ m$^2$', '$98\\pi$ m$^2$'], '$A=\\pi r^2=\\pi(7^2)=49\\pi$.'],
      ['A circumference is $24\\pi$ inches. What is the radius?', '$12$ inches', ['$6$ inches', '$24$ inches', '$48$ inches'], 'From $2\\pi r=24\\pi$, divide by $2\\pi$ to get $r=12$.'],
    ],
  },
  {
    title: 'Composite Figures and Missing Dimensions',
    summary: 'Decompose irregular figures into familiar shapes and subtract holes or gaps when needed.',
    formula: '$A_{composite}=\\sum A_{added}-\\sum A_{removed}$',
    example: '$A=10(8)-3(2)=74$',
    explanation: 'Draw dividing lines that create rectangles, triangles, or circles. Shared interior boundaries do not count in outside perimeter.',
    terms: [['composite figure', 'a shape made from two or more simple figures'], ['decompose', 'split a figure into manageable parts']],
    strategy: 'Mark each region as added or removed before combining areas.',
    questions: [
      ['A $12$-by-$9$ rectangle has a $4$-by-$3$ corner removed. What is the remaining area?', '$96$ square units', ['$84$ square units', '$108$ square units', '$120$ square units'], 'Subtract the missing area: $12(9)-4(3)=108-12=96$.'],
      ['Two nonoverlapping rectangles have areas $35$ and $48$ ft$^2$. What is their combined area?', '$83$ ft$^2$', ['$13$ ft$^2$', '$70$ ft$^2$', '$168$ ft$^2$'], 'Nonoverlapping areas add: $35+48=83$.'],
      ['A square of side $10$ has a circular hole of radius $2$. What area remains?', '$100-4\\pi$', ['$100-2\\pi$', '$100+4\\pi$', '$20-4\\pi$'], 'Subtract circle area $\\pi(2^2)=4\\pi$ from square area $100$.'],
    ],
  },
  {
    title: 'Pythagorean Theorem',
    summary: 'Find missing sides and distances in right triangles using the relationship among the two legs and hypotenuse.',
    formula: '$a^2+b^2=c^2$',
    example: '$6^2+8^2=100\\Rightarrow c=10$',
    explanation: 'The hypotenuse is opposite the right angle and must be the longest side. The theorem applies only to right triangles.',
    terms: [['leg', 'a side forming the right angle'], ['hypotenuse', 'the side opposite the right angle']],
    strategy: 'Confirm the unknown is a leg or hypotenuse before rearranging the formula.',
    questions: [
      ['A right triangle has legs $9$ and $12$. What is the hypotenuse?', '$15$', ['$13$', '$18$', '$21$'], '$c=\\sqrt{9^2+12^2}=\\sqrt{225}=15$.'],
      ['A ladder reaches $12$ feet up a wall and its base is $5$ feet away. How long is the ladder?', '$13$ feet', ['$7$ feet', '$17$ feet', '$169$ feet'], 'The ladder is the hypotenuse: $\\sqrt{12^2+5^2}=13$.'],
      ['A right triangle has hypotenuse $17$ and one leg $8$. Find the other leg.', '$15$', ['$9$', '$19$', '$25$'], '$b=\\sqrt{17^2-8^2}=\\sqrt{225}=15$.'],
    ],
  },
  {
    title: 'Prisms and Cylinders',
    summary: 'Calculate volume and surface area of rectangular prisms and cylinders using consistent units.',
    formula: '$V_{prism}=Bh$, $V_{cyl}=\\pi r^2h$',
    example: '$r=3,h=5\\Rightarrow V=45\\pi$',
    explanation: 'Volume counts cubic units inside a solid. Surface area totals the two-dimensional faces wrapping it.',
    terms: [['volume', 'space inside a three-dimensional figure'], ['surface area', 'total area of all outside surfaces']],
    strategy: 'Convert all dimensions to the same unit before using a three-dimensional formula.',
    questions: [
      ['Find the volume of a $4$-by-$5$-by-$9$ rectangular prism.', '$180$ units$^3$', ['$18$ units$^3$', '$90$ units$^3$', '$360$ units$^3$'], '$V=lwh=4(5)(9)=180$.'],
      ['A cylinder has radius $4$ cm and height $7$ cm. What is its volume?', '$112\\pi$ cm$^3$', ['$28\\pi$ cm$^3$', '$56\\pi$ cm$^3$', '$196\\pi$ cm$^3$'], '$V=\\pi r^2h=\\pi(16)(7)=112\\pi$.'],
      ['A box has volume $240$ ft$^3$, length $10$ ft, and width $6$ ft. Find its height.', '$4$ ft', ['$24$ ft', '$40$ ft', '$224$ ft'], '$h=V/(lw)=240/(10\\cdot6)=4$.'],
    ],
  },
  {
    title: 'Pyramids, Cones, and Spheres',
    summary: 'Use the one-third volume relationship for pyramids and cones and the standard sphere formulas.',
    formula: '$V_{pyr}=\\frac{1}{3}Bh$, $V_{sphere}=\\frac{4}{3}\\pi r^3$',
    example: '$B=36,h=10\\Rightarrow V_{pyr}=120$',
    explanation: 'A pyramid or cone with the same base and height as a prism or cylinder has one-third its volume.',
    terms: [['base area', 'area of the face used as $B$'], ['slant height', 'surface distance from apex to base edge']],
    strategy: 'Do not omit the factor $1/3$ for a pyramid or cone.',
    questions: [
      ['A cone has radius $3$ and height $8$. What is its volume?', '$24\\pi$ units$^3$', ['$72\\pi$ units$^3$', '$12\\pi$ units$^3$', '$8\\pi$ units$^3$'], '$V=(1/3)\\pi(3^2)(8)=24\\pi$.'],
      ['A square pyramid has base side $6$ and height $9$. What is its volume?', '$108$ units$^3$', ['$54$ units$^3$', '$162$ units$^3$', '$324$ units$^3$'], 'Base area is $36$; $(1/3)(36)(9)=108$.'],
      ['A sphere has radius $3$. What is its volume?', '$36\\pi$ units$^3$', ['$12\\pi$ units$^3$', '$27\\pi$ units$^3$', '$108\\pi$ units$^3$'], '$V=(4/3)\\pi(3^3)=36\\pi$.'],
    ],
  },
  {
    title: 'Data Displays and Summary Statistics',
    summary: 'Interpret tables and graphs and calculate center, spread, weighted averages, and the effect of outliers.',
    formula: '$\\bar{x}=\\frac{\\sum x}{n}$, $\\text{weighted mean}=\\frac{\\sum wx}{\\sum w}$',
    example: '$4,6,8\\Rightarrow\\bar{x}=6$',
    explanation: 'Mean uses every value; median is the middle ordered value; range is maximum minus minimum. Outliers usually affect mean more than median.',
    terms: [['median', 'middle value after ordering'], ['outlier', 'a value unusually far from the rest']],
    strategy: 'Check axes, intervals, and units before interpreting a graph or calculating from it.',
    questions: [
      ['Find the mean of $5,7,7,9,12$.', '$8$', ['$7$', '$9$', '$40$'], 'The sum is $40$ and $40/5=8$.'],
      ['Find the median of $3,4,8,10,15,20$.', '$9$', ['$8$', '$10$', '$10.5$'], 'Average the two middle values: $(8+10)/2=9$.'],
      ['A course grade is $40\\%$ quizzes at $80$ and $60\\%$ exams at $90$. What is the weighted grade?', '$86$', ['$84$', '$85$', '$88$'], '$0.40(80)+0.60(90)=32+54=86$.'],
    ],
  },
  {
    title: 'Counting and Probability',
    summary: 'Count outcomes and calculate simple, compound, and conditional probabilities.',
    formula: '$P(E)=\\frac{\\text{favorable}}{\\text{total}}$, $nP r=\\frac{n!}{(n-r)!}$, $\\binom{n}{r}=\\frac{n!}{r!(n-r)!}$',
    example: '$P(\\text{two heads})=\\frac{1}{2}\\cdot\\frac{1}{2}=\\frac{1}{4}$',
    explanation: 'Multiply independent stage counts using the fundamental counting principle. For mutually exclusive choices, add their probabilities.',
    terms: [['permutation', 'an arrangement in which order matters'], ['combination', 'a selection in which order does not matter']],
    strategy: 'List or diagram the sample space when the denominator is not immediately clear.',
    questions: [
      ['$6$ finalists can place first, second, or third with no repeats. How many ordered results are possible?', '$120$', ['$18$', '$20$', '$216$'], 'Order matters, so use $6P3=6\\cdot5\\cdot4=120$.'],
      ['How many different pairs can be chosen from $5$ volunteers?', '$10$', ['$7$', '$20$', '$25$'], 'Order does not matter, so $\\binom{5}{2}=5!/(2!3!)=10$.'],
      ['A fair die is rolled twice. What is the probability of two sixes?', '$\\frac{1}{36}$', ['$\\frac{1}{12}$', '$\\frac{1}{6}$', '$\\frac{2}{6}$'], 'Independent probabilities multiply: $(1/6)(1/6)=1/36$.'],
    ],
  },
];

const algebraicReasoning: LessonSeed[] = [
  {
    title: 'Combining Linear Expressions',
    summary: 'Use the distributive property and combine like terms to create equivalent linear expressions.',
    formula: '$a(b+c)=ab+ac$',
    example: '$3(2x-5)+x=7x-15$',
    explanation: 'Like terms have identical variable parts. Their coefficients may be added or subtracted without changing the variable.',
    terms: [['coefficient', 'number multiplying a variable'], ['like terms', 'terms with the same variables and exponents']],
    strategy: 'Distribute signs first, then group variable terms and constants separately.',
    questions: [
      ['Simplify $5x+3-2x+8$.', '$3x+11$', ['$7x+11$', '$3x+5$', '$11x$'], 'Combine $5x-2x=3x$ and $3+8=11$.'],
      ['Simplify $4(2y-3)-y$.', '$7y-12$', ['$8y-13$', '$9y-12$', '$7y-3$'], 'Distribute to get $8y-12-y$, then combine to $7y-12$.'],
      ['Which expression is equivalent to $-2(3a-5)+4a$?', '$-2a+10$', ['$-10a+10$', '$2a-10$', '$-2a-10$'], 'Distribute $-2$ to get $-6a+10$, then add $4a$.'],
    ],
  },
  {
    title: 'Evaluating and Writing Expressions',
    summary: 'Translate verbal situations into algebraic expressions and evaluate them for given variable values.',
    formula: '$E(x)=\\text{expression with }x$',
    example: '$E(x)=2x^2-3$, $E(4)=29$',
    explanation: 'Parentheses preserve a substituted negative value. Verbal order matters: “five less than $x$” is $x-5$.',
    terms: [['evaluate', 'find a value by substituting'], ['variable', 'a symbol representing a value']],
    strategy: 'Replace every occurrence of the variable with parentheses before calculating.',
    questions: [
      ['Evaluate $2x^2-3y$ when $x=-3$ and $y=4$.', '$6$', ['$-30$', '$30$', '$-6$'], '$2(-3)^2-3(4)=18-12=6$.'],
      ['Which expression means “seven more than twice $n$”?', '$2n+7$', ['$2(n+7)$', '$7n+2$', '$2n-7$'], 'Twice $n$ is $2n$, then add $7$.'],
      ['A service charges $25$ dollars plus $8$ dollars per hour $h$. Which expression gives the cost?', '$25+8h$', ['$33h$', '$25h+8$', '$8(h+25)$'], 'The fixed fee is $25$ and the hourly variable amount is $8h$.'],
    ],
  },
  {
    title: 'Adding and Multiplying Polynomials',
    summary: 'Combine polynomial terms and multiply monomials or binomials using exponent and distributive rules.',
    formula: '$(a+b)(c+d)=ac+ad+bc+bd$',
    example: '$(x+3)(x-2)=x^2+x-6$',
    explanation: 'Every term in one factor multiplies every term in the other. Combine like terms only after distributing.',
    terms: [['polynomial', 'a sum of variable terms with whole-number exponents'], ['degree', 'greatest exponent in a polynomial']],
    strategy: 'Organize products in a grid or vertical columns to avoid missing a term.',
    questions: [
      ['Simplify $(3x^2+2x-1)+(x^2-5x+4)$.', '$4x^2-3x+3$', ['$4x^2+7x+3$', '$3x^4-3x+3$', '$4x^2-3x-5$'], 'Combine coefficients of matching powers: $3+1$, $2-5$, and $-1+4$.'],
      ['Multiply $3a^2(2a^3-4)$.', '$6a^5-12a^2$', ['$6a^6-12$', '$5a^5-7a^2$', '$6a^5-4$'], 'Distribute $3a^2$ and add exponents in $a^2a^3$.'],
      ['Expand $(x+5)(x-1)$.', '$x^2+4x-5$', ['$x^2+6x-5$', '$x^2-4x-5$', '$x^2+4$'], 'Products are $x^2-x+5x-5=x^2+4x-5$.'],
    ],
  },
  {
    title: 'Factoring Polynomials',
    summary: 'Reverse distribution by removing a greatest common factor and factoring simple quadratic trinomials.',
    formula: '$x^2+(p+q)x+pq=(x+p)(x+q)$',
    example: '$x^2+7x+12=(x+3)(x+4)$',
    explanation: 'For a monic trinomial, find two numbers whose product is the constant and whose sum is the middle coefficient.',
    terms: [['factor', 'an expression multiplied by another'], ['zero-product property', 'if $ab=0$, then $a=0$ or $b=0$']],
    strategy: 'Check a factorization by multiplying the factors back together.',
    questions: [
      ['Factor $6x+18$ completely.', '$6(x+3)$', ['$3(2x+18)$', '$6(x+18)$', '$2(3x+9)$'], 'The greatest common factor of both terms is $6$.'],
      ['Factor $x^2+9x+20$.', '$(x+4)(x+5)$', ['$(x+2)(x+10)$', '$(x-4)(x-5)$', '$(x+1)(x+20)$'], '$4\\cdot5=20$ and $4+5=9$.'],
      ['Factor $x^2-16$.', '$(x-4)(x+4)$', ['$(x-8)(x+2)$', '$(x-4)^2$', '$(x-16)(x+1)$'], 'This is a difference of squares: $a^2-b^2=(a-b)(a+b)$.'],
    ],
  },
  {
    title: 'Rational Expressions and Restrictions',
    summary: 'Simplify and evaluate rational expressions while excluding values that make a denominator zero.',
    formula: '$\\frac{ab}{ac}=\\frac{b}{c}$ for $a\\ne0$',
    example: '$\\frac{x^2-9}{x-3}=x+3$, $x\\ne3$',
    explanation: 'Only common factors cancel; terms joined by addition cannot. Restrictions come from the original denominator.',
    terms: [['rational expression', 'a quotient of polynomials'], ['restriction', 'a value excluded from the domain']],
    strategy: 'Factor numerator and denominator completely before canceling.',
    questions: [
      ['Simplify $\\frac{12x^3}{4x}$ for $x\\ne0$.', '$3x^2$', ['$3x^3$', '$8x^2$', '$3x$'], 'Divide coefficients and subtract exponents: $12/4=3$ and $x^{3-1}=x^2$.'],
      ['Which value is excluded from $\\frac{5}{x+2}$?', '$x=-2$', ['$x=0$', '$x=2$', '$x=5$'], 'The denominator is zero when $x+2=0$, so $x=-2$.'],
      ['Simplify $\\frac{x^2-25}{x-5}$ for $x\\ne5$.', '$x+5$', ['$x-5$', '$x^2+5$', '$1$'], 'Factor the numerator as $(x-5)(x+5)$, then cancel the common factor.'],
    ],
  },
  {
    title: 'One-Step and Multi-Step Equations',
    summary: 'Solve linear equations by applying inverse operations while preserving equality.',
    formula: '$ax+b=c\\Rightarrow x=\\frac{c-b}{a}$',
    example: '$5x-7=18\\Rightarrow x=5$',
    explanation: 'Perform the same valid operation on both sides. Substitute the solution into the original equation to verify it.',
    terms: [['equation', 'a statement that two expressions are equal'], ['inverse operation', 'an operation that reverses another']],
    strategy: 'Undo addition or subtraction before undoing multiplication or division.',
    questions: [
      ['Solve $7x+5=40$.', '$x=5$', ['$x=35$', '$x=45$', '$x=245$'], 'Subtract $5$ and divide by $7$: $x=35/7=5$.'],
      ['Solve $\\frac{x}{4}-6=3$.', '$x=36$', ['$x=12$', '$x=9$', '$x=-12$'], 'Add $6$ to get $x/4=9$, then multiply by $4$.'],
      ['Solve $3-2x=17$.', '$x=-7$', ['$x=7$', '$x=-10$', '$x=10$'], 'Subtract $3$: $-2x=14$; divide by $-2$ to get $-7$.'],
    ],
  },
  {
    title: 'Equations with Variables on Both Sides',
    summary: 'Solve equations containing distribution, like terms, variables on both sides, and special solution cases.',
    formula: '$a(x+b)=cx+d$',
    example: '$3(x+2)=2x+11\\Rightarrow x=5$',
    explanation: 'Simplify each side, gather variable terms on one side, then constants on the other. A true identity has infinitely many solutions.',
    terms: [['identity', 'an equation true for every allowed value'], ['contradiction', 'an equation that reduces to a false statement']],
    strategy: 'Choose the side that leaves a positive variable coefficient when possible.',
    questions: [
      ['Solve $4(x-2)=2x+10$.', '$x=9$', ['$x=1$', '$x=5$', '$x=-9$'], '$4x-8=2x+10$, so $2x=18$ and $x=9$.'],
      ['How many solutions does $2(x+3)=2x+6$ have?', 'Infinitely many solutions', ['No solution', 'One solution: $x=0$', 'One solution: $x=3$'], 'Both sides simplify to $2x+6$, so every real $x$ works.'],
      ['How many solutions does $5x+2=5x-7$ have?', 'No solution', ['Infinitely many solutions', 'One solution: $x=-9$', 'One solution: $x=9$'], 'Subtracting $5x$ gives the false statement $2=-7$.'],
    ],
  },
  {
    title: 'Modeling with Linear Equations',
    summary: 'Define a variable, translate a real situation into a linear equation, solve it, and interpret the result.',
    formula: '$\\text{fixed amount}+\\text{rate}\\cdot x=\\text{total}$',
    example: '$18+7h=60\\Rightarrow h=6$',
    explanation: 'A correct equation preserves each quantity and unit in the prompt. The solution must answer the stated question, not merely produce a number.',
    terms: [['model', 'a mathematical representation of a situation'], ['constant', 'a value that does not change']],
    strategy: 'Write what the variable means, including its unit, before forming the equation.',
    questions: [
      ['A taxi charges $4$ dollars plus $2.50$ dollars per mile. The fare is $24$ dollars. How many miles were traveled?', '$8$ miles', ['$7$ miles', '$9.6$ miles', '$10$ miles'], 'Solve $4+2.5m=24$: $2.5m=20$, so $m=8$.'],
      ['Mina has $35$ dollars and saves $12$ dollars each week. Which equation finds weeks $w$ until she has $131$ dollars?', '$35+12w=131$', ['$35w+12=131$', '$12(w+35)=131$', '$35+131w=12$'], 'The initial amount is $35$ and the weekly change is $12w$.'],
      ['A $96$-inch board is cut into three equal pieces after $6$ inches is removed. How long is each piece?', '$30$ inches', ['$28$ inches', '$32$ inches', '$34$ inches'], 'The usable length is $96-6=90$, and $90/3=30$.'],
    ],
  },
  {
    title: 'Systems by Graphing and Substitution',
    summary: 'Find the ordered pair satisfying two linear equations and interpret an intersection in context.',
    formula: '$y=f(x)$ and $y=g(x)\\Rightarrow f(x)=g(x)$',
    example: '$y=2x+1$, $y=x+4\\Rightarrow(x,y)=(3,7)$',
    explanation: 'The solution lies on both lines. Parallel distinct lines have no solution; the same line gives infinitely many solutions.',
    terms: [['system', 'two or more equations considered together'], ['intersection', 'point shared by two graphs']],
    strategy: 'Substitute the simpler expression into the other equation, then check the ordered pair in both.',
    questions: [
      ['Solve $y=x+2$ and $y=3x-4$.', '$(3,5)$', ['$(1,3)$', '$(2,4)$', '$(5,3)$'], 'Set expressions equal: $x+2=3x-4$, so $x=3$ and $y=5$.'],
      ['Solve $x+y=10$ and $y=2x+1$.', '$(3,7)$', ['$(7,3)$', '$(4,6)$', '$(5,5)$'], 'Substitute: $x+2x+1=10$, so $x=3$ and $y=7$.'],
      ['What type of solution does $y=4x+2$ and $y=4x-5$ have?', 'No solution', ['One solution at $(0,2)$', 'One solution at $(0,-5)$', 'Infinitely many solutions'], 'Equal slopes and different intercepts make parallel distinct lines.'],
    ],
  },
  {
    title: 'Systems by Elimination and Applications',
    summary: 'Add or subtract equations to eliminate a variable and solve mixture, price, and quantity problems.',
    formula: '$\\begin{aligned}ax+by&=c\\\\dx-ey&=f\\end{aligned}$',
    example: '$x+y=9$, $x-y=3\\Rightarrow2x=12\\Rightarrow(x,y)=(6,3)$',
    explanation: 'Multiply one or both equations when necessary so one pair of coefficients becomes opposites.',
    terms: [['elimination', 'combining equations to remove one variable'], ['ordered pair', 'a solution written as $(x,y)$']],
    strategy: 'Align like terms vertically and keep signs attached when adding equations.',
    questions: [
      ['Solve $2x+y=11$ and $2x-y=5$.', '$(4,3)$', ['$(3,4)$', '$(4,5)$', '$(8,3)$'], 'Add equations: $4x=16$, so $x=4$; then $y=3$.'],
      ['Adult tickets cost $10$ dollars and child tickets cost $6$ dollars. Eight tickets total $68$ dollars. How many adult tickets were sold?', '$5$', ['$3$', '$4$', '$6$'], 'Use $a+c=8$ and $10a+6c=68$; substitution gives $a=5$.'],
      ['Solve $3x+2y=16$ and $x-2y=0$.', '$(4,2)$', ['$(2,4)$', '$(4,-2)$', '$(8,4)$'], 'Adding eliminates $y$: $4x=16$, so $x=4$ and $y=2$.'],
    ],
  },
  {
    title: 'Linear Inequalities',
    summary: 'Solve, graph, and interpret one-variable inequalities, including compound conditions.',
    formula: '$a<b\\Rightarrow -a>-b$',
    example: '$-3x>12\\Rightarrow x<-4$',
    explanation: 'Multiplying or dividing by a negative reverses the inequality. An open endpoint excludes a value; a closed endpoint includes it.',
    terms: [['inequality', 'a comparison describing a range of values'], ['compound inequality', 'two inequalities joined by and or or']],
    strategy: 'Test one simple value from the proposed solution interval in the original inequality.',
    questions: [
      ['Solve $5x-7\\le18$.', '$x\\le5$', ['$x\\ge5$', '$x\\le11$', '$x\\ge11$'], 'Add $7$ and divide by $5$ to get $x\\le5$.'],
      ['Solve $-4x+3>19$.', '$x<-4$', ['$x> -4$', '$x<4$', '$x>4$'], 'Subtract $3$, then divide by $-4$ and reverse the sign.'],
      ['A vehicle can carry at most $1,200$ kg. Cargo already weighs $450$ kg. Which inequality describes added cargo $c$?', '$c+450\\le1200$', ['$c+450\\ge1200$', '$450c\\le1200$', '$c-450\\le1200$'], '“At most” means the total cannot exceed $1,200$.'],
    ],
  },
  {
    title: 'Quadratic Equations and Models',
    summary: 'Solve quadratic equations by factoring or the quadratic formula and interpret meaningful roots.',
    formula: '$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$',
    example: '$x^2-5x+6=0\\Rightarrow x=2,3$',
    explanation: 'Put the equation in standard form before identifying $a$, $b$, and $c$. Context may exclude a negative time or length.',
    terms: [['quadratic', 'a degree-two polynomial equation'], ['root', 'a value making an expression equal zero']],
    strategy: 'Try factoring first when integer factors are visible; use the formula when they are not.',
    questions: [
      ['Solve $x^2-7x+12=0$.', '$x=3$ or $x=4$', ['$x=-3$ or $x=-4$', '$x=2$ or $x=6$', '$x=7$ or $x=12$'], 'Factor as $(x-3)(x-4)=0$.'],
      ['Solve $x^2=49$.', '$x=-7$ or $x=7$', ['$x=7$ only', '$x=-7$ only', '$x=24.5$'], 'Both $7^2$ and $(-7)^2$ equal $49$.'],
      ['A rectangle has length $x+3$, width $x$, and area $40$. What positive value is $x$?', '$x=5$', ['$x=4$', '$x=8$', '$x=10$'], '$x(x+3)=40$ gives $x^2+3x-40=(x+8)(x-5)=0$; length requires $x=5$.'],
    ],
  },
];

const graphsAndFunctions: LessonSeed[] = [
  {
    title: 'The Coordinate Plane',
    summary: 'Plot and identify ordered pairs, quadrants, intercepts, and distances along horizontal or vertical lines.',
    formula: '$(x,y)=(\\text{horizontal},\\text{vertical})$',
    example: '$(-3,4)$ is in Quadrant II',
    explanation: 'Move from the origin along the $x$-axis first, then vertically along the $y$-axis. Points on an axis are not in a quadrant.',
    terms: [['origin', 'the point $(0,0)$'], ['ordered pair', 'coordinates written as $(x,y)$']],
    strategy: 'Say “across, then up or down” to preserve coordinate order.',
    questions: [
      ['In which quadrant is $(5,-2)$?', 'Quadrant IV', ['Quadrant I', 'Quadrant II', 'Quadrant III'], 'Positive $x$ and negative $y$ locate a point in Quadrant IV.'],
      ['Which point lies on the $y$-axis?', '$(0,-6)$', ['$(6,0)$', '$(2,-6)$', '$(-6,2)$'], 'Every point on the $y$-axis has $x=0$.'],
      ['What is the vertical distance between $(3,-4)$ and $(3,5)$?', '$9$ units', ['$1$ unit', '$7$ units', '$12$ units'], 'The $x$ values match; distance is $|5-(-4)|=9$.'],
    ],
  },
  {
    title: 'Slope from Points and Graphs',
    summary: 'Calculate and interpret slope as vertical change divided by horizontal change.',
    formula: '$m=\\frac{y_2-y_1}{x_2-x_1}$',
    example: '$(1,2),(5,10)\\Rightarrow m=\\frac{8}{4}=2$',
    explanation: 'Positive slope rises left to right, negative slope falls, horizontal slope is zero, and vertical slope is undefined.',
    terms: [['slope', 'rate of vertical change per horizontal change'], ['rise', 'change in $y$']],
    strategy: 'Subtract coordinates in the same order in both numerator and denominator.',
    questions: [
      ['Find the slope through $(2,3)$ and $(6,11)$.', '$m=2$', ['$m=\\frac{1}{2}$', '$m=4$', '$m=8$'], '$m=(11-3)/(6-2)=8/4=2$.'],
      ['What is the slope of a horizontal line?', '$0$', ['$1$', '$-1$', 'Undefined'], 'A horizontal line has zero vertical change.'],
      ['Find the slope through $(-1,5)$ and $(3,-3)$.', '$m=-2$', ['$m=2$', '$m=-\\frac{1}{2}$', '$m=-8$'], '$m=(-3-5)/(3-(-1))=-8/4=-2$.'],
    ],
  },
  {
    title: 'Slope as a Unit Rate',
    summary: 'Connect constant rates in tables and contexts to the slope of a linear relationship.',
    formula: '$m=\\frac{\\Delta y}{\\Delta x}=\\text{unit rate}$',
    example: '$y$ rises $18$ when $x$ rises $3\\Rightarrow m=6$',
    explanation: 'In context, slope carries units such as dollars per hour or meters per second and states how output changes per input unit.',
    terms: [['rate of change', 'change in output divided by change in input'], ['constant rate', 'the same rate over every interval']],
    strategy: 'Include units in the slope interpretation, not just the numerical value.',
    questions: [
      ['A tank contains $40$ L at $2$ minutes and $70$ L at $5$ minutes. What is the rate of change?', '$10$ L per minute', ['$6$ L per minute', '$15$ L per minute', '$30$ L per minute'], 'Rate is $(70-40)/(5-2)=30/3=10$ liters per minute.'],
      ['A table has $(x,y)=(1,7),(3,15),(6,27)$. What is its constant rate?', '$4$', ['$3$', '$7$', '$8$'], 'Each interval gives $\\Delta y/\\Delta x=4$.'],
      ['A worker earns $54$ dollars for $4$ hours and $94.50$ dollars for $7$ hours. What does the slope represent?', '$13.50$ dollars earned per hour', ['$40.50$ dollars total', '$7$ hours per dollar', '$148.50$ dollars per hour'], 'The earnings change $40.50$ dollars over $3$ hours: $40.50/3=13.50$.'],
    ],
  },
  {
    title: 'Slope-Intercept Form and Graphing Lines',
    summary: 'Interpret and graph a line from slope-intercept form, including its rate and initial value.',
    formula: '$y=mx+b$',
    example: '$y=-2x+5$ has $m=-2$ and $y$-intercept $5$',
    explanation: 'The intercept gives the output when $x=0$. Use the slope as rise over run to locate additional points.',
    terms: [['$y$-intercept', 'where a graph crosses the $y$-axis'], ['slope-intercept form', '$y=mx+b$']],
    strategy: 'Plot $b$ first, then use the signed rise and positive run from that point.',
    questions: [
      ['What is the slope of $y=3x-7$?', '$3$', ['$-7$', '$7$', '$-3$'], 'The coefficient of $x$ in $y=mx+b$ is the slope.'],
      ['What is the $y$-intercept of $y=-\\frac{1}{2}x+4$?', '$(0,4)$', ['$(4,0)$', '$(0,-\\frac{1}{2})$', '$(-\\frac{1}{2},0)$'], 'Set $x=0$ to get $y=4$.'],
      ['Which equation has slope $-3$ and $y$-intercept $8$?', '$y=-3x+8$', ['$y=8x-3$', '$y=3x+8$', '$y=-3x-8$'], 'Substitute $m=-3$ and $b=8$ in $y=mx+b$.'],
    ],
  },
  {
    title: 'Writing Linear Equations',
    summary: 'Write an equation for a line from a point and slope, two points, a table, or a contextual relationship.',
    formula: '$y-y_1=m(x-x_1)$',
    example: '$m=2,(3,7)\\Rightarrow y-7=2(x-3)\\Rightarrow y=2x+1$',
    explanation: 'Calculate slope first when two points are given, then substitute one known point to find the intercept.',
    terms: [['point-slope form', '$y-y_1=m(x-x_1)$'], ['linear model', 'a relationship with constant rate of change']],
    strategy: 'Verify the final equation with every supplied point or table row.',
    questions: [
      ['Write the line with slope $4$ through $(2,11)$.', '$y=4x+3$', ['$y=4x+11$', '$y=2x+7$', '$y=4x-3$'], 'Use $11=4(2)+b$ to get $b=3$.'],
      ['Write the equation through $(0,-2)$ and $(3,7)$.', '$y=3x-2$', ['$y=9x-2$', '$y=3x+2$', '$y=-3x-2$'], 'Slope is $(7-(-2))/3=3$ and the intercept is $-2$.'],
      ['A value starts at $120$ and decreases $8$ each month. Which model gives value $V$ after $m$ months?', '$V=120-8m$', ['$V=8m-120$', '$V=120+8m$', '$V=-120+8m$'], 'Initial value is $120$ and rate of change is $-8$.'],
    ],
  },
  {
    title: 'Parallel and Perpendicular Lines',
    summary: 'Use slope relationships to identify and write equations of parallel and perpendicular lines.',
    formula: '$m_{parallel}=m$, $m_{perpendicular}=-\\frac{1}{m}$',
    example: '$m=\\frac{2}{3}\\Rightarrow m_\\perp=-\\frac{3}{2}$',
    explanation: 'Distinct parallel lines have equal slopes. Nonvertical perpendicular lines have slopes whose product is $-1$.',
    terms: [['parallel', 'coplanar lines that never intersect'], ['perpendicular', 'lines meeting at a right angle']],
    strategy: 'Rewrite both equations in $y=mx+b$ form before comparing slopes.',
    questions: [
      ['Which line is parallel to $y=5x-2$?', '$y=5x+9$', ['$y=-5x+9$', '$y=\\frac{1}{5}x+9$', '$y=-\\frac{1}{5}x+9$'], 'Parallel lines have the same slope $5$.'],
      ['What slope is perpendicular to $m=\\frac{3}{4}$?', '$-\\frac{4}{3}$', ['$\\frac{4}{3}$', '$-\\frac{3}{4}$', '$\\frac{1}{3}$'], 'The negative reciprocal of $3/4$ is $-4/3$.'],
      ['Are $2x+y=6$ and $y=\\frac{1}{2}x+3$ perpendicular?', 'Yes, because their slopes are $-2$ and $\\frac{1}{2}$', ['Yes, because their intercepts differ', 'No, because their slopes are equal', 'No, because their slopes multiply to $1$'], 'The first line is $y=-2x+6$; the slope product is $-1$.'],
    ],
  },
  {
    title: 'Relations, Functions, Domain, and Range',
    summary: 'Determine whether a relation is a function and identify its permitted inputs and resulting outputs.',
    formula: '$x\\mapsto\\text{exactly one }y$',
    example: '$\\{(1,2),(2,2),(3,5)\\}$ is a function',
    explanation: 'A function assigns one output to each input. Different inputs may share an output, but one input may not have two outputs.',
    terms: [['domain', 'set of allowable input values'], ['range', 'set of produced output values']],
    strategy: 'For a table or ordered pairs, scan repeated $x$ values and compare their $y$ values.',
    questions: [
      ['Which relation is a function?', '$\\{(1,4),(2,4),(3,7)\\}$', ['$\\{(1,4),(1,7),(2,8)\\}$', '$\\{(0,2),(0,3),(0,4)\\}$', '$\\{(-1,5),(-1,5),(-1,8)\\}$'], 'Each input in the correct relation has exactly one output.'],
      ['What is the domain of $\\{(-2,5),(0,7),(4,5)\\}$?', '$\\{-2,0,4\\}$', ['$\\{5,7\\}$', '$\\{-2,0,4,5,7\\}$', '$\\{0,5\\}$'], 'The domain is the set of first coordinates.'],
      ['A graph fails the vertical line test. What does this mean?', 'At least one input has more than one output', ['Every output has one input', 'The relation is linear', 'The domain contains no values'], 'A vertical line crosses at multiple points when one $x$ has multiple $y$ values.'],
    ],
  },
  {
    title: 'Function Notation and Evaluation',
    summary: 'Interpret $f(x)$ as an output rule and evaluate, compare, or solve functions.',
    formula: '$f(a)=\\text{value after replacing }x\\text{ with }a$',
    example: '$f(x)=x^2-1\\Rightarrow f(3)=8$',
    explanation: 'The parentheses in $f(x)$ do not mean multiplication. They identify the input used by the function rule.',
    terms: [['function notation', 'a naming system such as $f(x)$'], ['input', 'the independent value supplied to a function']],
    strategy: 'Use parentheses around a negative input before applying exponents.',
    questions: [
      ['If $f(x)=3x-5$, find $f(6)$.', '$13$', ['$3$', '$18$', '$23$'], '$f(6)=3(6)-5=13$.'],
      ['If $g(t)=t^2+2t$, find $g(-4)$.', '$8$', ['$-24$', '$-8$', '$24$'], '$g(-4)=(-4)^2+2(-4)=16-8=8$.'],
      ['If $h(x)=2x+7$ and $h(x)=19$, find $x$.', '$x=6$', ['$x=5$', '$x=12$', '$x=13$'], 'Solve $2x+7=19$: $2x=12$, so $x=6$.'],
    ],
  },
  {
    title: 'Features of Linear and Nonlinear Graphs',
    summary: 'Read intercepts, intervals, maxima, minima, and rates of change from linear, quadratic, and other nonlinear graphs.',
    formula: '$y=ax^2+bx+c$ is quadratic when $a\\ne0$',
    example: '$y=(x-2)^2-3$ has vertex $(2,-3)$',
    explanation: 'A straight line has constant rate of change. A curve may change direction or change rate, so interpret its key points and intervals.',
    terms: [['vertex', 'turning point of a parabola'], ['intercept', 'point where a graph crosses an axis']],
    strategy: 'Read graph scales before reporting a coordinate, interval, or rate.',
    questions: [
      ['Which statement describes a linear graph?', 'It has a constant rate of change', ['It must have a maximum point', 'Its slope changes every interval', 'It always forms a circle'], 'A nonvertical straight line has the same slope over every interval.'],
      ['What is the vertex of $y=(x+1)^2-4$?', '$(-1,-4)$', ['$(1,-4)$', '$(-1,4)$', '$(4,-1)$'], 'Vertex form $y=(x-h)^2+k$ gives $h=-1$ and $k=-4$.'],
      ['For $y=x^2-9$, what are the $x$-intercepts?', '$(-3,0)$ and $(3,0)$', ['$(0,-9)$ only', '$(-9,0)$ and $(9,0)$', '$(0,-3)$ and $(0,3)$'], 'Set $y=0$: $x^2=9$, so $x=\\pm3$.'],
    ],
  },
  {
    title: 'Comparing Functions and Strategic Tool Use',
    summary: 'Compare functions represented by equations, tables, graphs, or words and choose calculator, formula sheet, or mental reasoning appropriately.',
    formula: '$\\text{compare }m, b, f(x),\\text{ and key points}$',
    example: '$f(x)=2x+5$ grows faster than $g(x)=1.5x+8$',
    explanation: 'Translate each representation into common features. On the GED test, estimation and structure remain essential even when a calculator is available.',
    terms: [['representation', 'a table, graph, equation, or verbal rule'], ['modeling', 'using mathematics to describe and solve a situation']],
    strategy: 'Use the calculator for arithmetic efficiency only after choosing the relationship and predicting the answer’s size.',
    questions: [
      ['Function $f$ has equation $f(x)=4x+1$. Function $g$ has table points $(0,5)$ and $(2,11)$. Which has the greater rate of change?', '$f$', ['$g$', 'They have equal rates', 'There is not enough information'], '$f$ has slope $4$; $g$ has slope $(11-5)/2=3$.'],
      ['A calculator returns $0.0048$ for $48\\div10,000$. Which estimate confirms the decimal placement?', '$50\\div10,000\\approx0.005$', ['$50\\div10,000\\approx5$', '$48\\div100\\approx48$', '$50\\times10,000\\approx0.005$'], 'Friendly-number division confirms a result near five thousandths.'],
      ['Which first step best models a real-world function problem?', 'Define the input, output, units, and relationship', ['Enter every number into the calculator immediately', 'Ignore the graph labels', 'Round all values to zero'], 'A valid model begins by identifying quantities and how they are related.'],
    ],
  },
];

export const gedMathCourse: OfficialLanguageQuestCourse = {
  code: 'MRLC-GED-MATH-V1',
  title: 'GED Mathematical Reasoning Preparation & Practice',
  description: 'A comprehensive 40-lesson GED Mathematical Reasoning course with 120 original, fully typeset practice questions covering rational numbers, measurement, geometry, data, probability, algebra, graphs, and functions.',
  language: 'GED Mathematical Reasoning',
  category: 'GED Preparation',
  imageEmoji: '',
  accentColor: '#2563eb',
  published: true,
  units: [
    {
      title: 'Unit 1: Quantitative Reasoning with Rational Numbers',
      description: 'Number sense, operations, roots, exponents, ratios, rates, proportions, conversions, percents, and financial applications.',
      lessons: rationalNumbers.map(lesson),
    },
    {
      title: 'Unit 2: Measurement, Geometry, Data, and Probability',
      description: 'Two- and three-dimensional measurement, Pythagorean reasoning, data analysis, statistics, counting, and probability.',
      lessons: measurementDataProbability.map(lesson),
    },
    {
      title: 'Unit 3: Expressions, Equations, and Inequalities',
      description: 'Expressions, polynomials, rational expressions, linear equations, systems, inequalities, quadratics, and mathematical modeling.',
      lessons: algebraicReasoning.map(lesson),
    },
    {
      title: 'Unit 4: Graphs and Functions',
      description: 'Coordinates, slope, linear equations, function notation, graph features, comparisons, and strategic tool use.',
      lessons: graphsAndFunctions.map(lesson),
    },
  ],
};
