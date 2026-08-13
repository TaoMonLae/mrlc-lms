import type { OfficialLanguageQuestCourse } from "./languageQuestImportedCourses";

type LessonSeed = {
  title: string;
  description: string;
  conceptIntro: string;
  question: string;
  correct: string;
  options: string[];
};

const optionEmoji = ["🔬", "🧪", "📊", "💡"];

function makeLesson(seed: LessonSeed) {
  const correctIndex = seed.options.indexOf(seed.correct);
  return {
    title: seed.title,
    description: seed.description,
    conceptIntro: `LEARNING GOALS
• Understand the key science idea or reasoning skill.
• Read the labeled visual before answering.
• Use evidence from the prompt, table, graph, diagram, or model.

${seed.conceptIntro}

BEFORE PRACTICE
1. Read the title and labels.
2. Identify the evidence that matters.
3. Explain the relationship in your own words.
4. Then answer the practice questions.`,
    challenges: [
      {
        type: "SELECT" as const,
        question: seed.question,
        explanation: `Use the lesson explanation and labeled visual. The best answer is “${seed.correct}” because it matches the evidence or scientific relationship described above.`,
        hint: "Return to the labeled visual and identify the part, pattern, variable, or relationship named in the question.",
        options: seed.options.map((text, index) => ({
          text,
          correct: index === correctIndex,
          emoji: optionEmoji[index] ?? null,
          audioText: null,
        })),
      },
      {
        type: "SELECT" as const,
        question: `What is the best GED Science strategy for “${seed.title}”?`,
        explanation: "GED Science questions reward evidence-based reasoning. Start with the information provided, identify labels/units/variables, and choose the conclusion supported by that evidence.",
        hint: "Choose the approach that uses the provided evidence before relying on memory.",
        options: [
          { text: "Use the provided evidence, labels, units, and relationships before choosing an answer", correct: true, emoji: "✅", audioText: null },
          { text: "Ignore the visual and answer only from memory", correct: false, emoji: "🧠", audioText: null },
          { text: "Choose the longest answer without checking the evidence", correct: false, emoji: "📏", audioText: null },
          { text: "Skip titles, labels, scales, and units", correct: false, emoji: "⏭️", audioText: null },
        ],
      },
    ],
  };
}

const units = [
  {
    title: "Unit 1: Life Science",
    description: "Read biological information, connect evidence and visuals, and reason from living systems.",
    lessons: [
      makeLesson({
        title: "Interpret Illustrations",
        description: "Use labels, arrows, keys, and spatial relationships to read a science illustration.",
        conceptIntro: "A science illustration communicates information visually. Start with the title, then read every label and arrow. Ask what each part does and how the parts work together.\n\n🦠 LABELED VISUAL — Bacterial cell\n[A] Cell membrane → controls what enters and leaves\n[B] Cytoplasm → fluid interior where reactions occur\n[C] Ribosome → builds proteins\n[D] Flagellum → helps movement\n\nGED strategy: do not answer from memory alone. Use the labels in the visual as evidence.",
        question: "Which labeled cell structure builds proteins?",
        correct: "C — Ribosome",
        options: ["A — Cell membrane", "B — Cytoplasm", "C — Ribosome", "D — Flagellum"],
      }),
      makeLesson({
        title: "Identify Main Idea and Details",
        description: "Separate a passage's central point from facts that explain or support it.",
        conceptIntro: "The main idea is the most important point a passage communicates. Supporting details explain, describe, compare, quantify, or give examples that make the main idea clearer.\n\n🧠 VISUAL ORGANIZER\nMAIN IDEA\n├─ Detail 1: evidence/example\n├─ Detail 2: evidence/example\n└─ Detail 3: evidence/example\n\nGED strategy: if several details point toward the same broader statement, that broader statement is often the main idea.",
        question: "Which statement best describes a supporting detail?",
        correct: "A fact or example that explains the main idea",
        options: ["The title of every passage", "A fact or example that explains the main idea", "Any sentence containing a number", "A conclusion unrelated to the passage"],
      }),
      makeLesson({
        title: "Interpret Tables",
        description: "Read headings, units, rows, columns, and footnotes before comparing values.",
        conceptIntro: "Tables organize information into rows and columns. First identify the title, column headings, row labels, and measurement units. Then trace the exact row and column needed for the question.\n\n📊 LABELED TABLE GUIDE\n[1] Title → topic of the data\n[2] Column heading → variable/category\n[3] Row label → item being compared\n[4] Cell → value at the row/column intersection\n[5] Unit/footnote → how to interpret the value",
        question: "Where do you find the value for one specific row and one specific column?",
        correct: "At their intersection cell",
        options: ["In the title", "At their intersection cell", "Only in the footnote", "Outside the table"],
      }),
      makeLesson({
        title: "Identify Cause and Effect",
        description: "Distinguish what produces a change from the change that follows.",
        conceptIntro: "A cause makes an event happen; an effect is the result. Science passages often describe chains in which one effect becomes the cause of another event.\n\n🩹 RESPONSE TO INJURY\nCut in skin → bacteria can enter → immune response → swelling/redness\n cause            effect/cause          effect\n\nSignal words such as because, therefore, results in, leads to, and due to can reveal causal relationships.",
        question: "In the chain 'cut → bacteria enter → immune response', what directly causes the immune response?",
        correct: "Bacteria entering the tissue",
        options: ["The skin remaining intact", "Bacteria entering the tissue", "The wound already healing", "Lower body temperature"],
      }),
      makeLesson({
        title: "Interpret Graphs and Maps",
        description: "Use axes, legends, scales, symbols, and trends to extract evidence.",
        conceptIntro: "Before interpreting a graph, read its title, axes, units, scale, and legend. For a map, read the legend and identify what colors or symbols represent.\n\n📈 TREND VISUAL\nCases\n40 |            ●\n30 |        ●\n20 |    ●\n10 | ●\n   +---------------- Time\n\nThis graph shows an increasing trend. A trend describes the overall pattern, not every tiny change.",
        question: "What does an upward trend on a time-series graph usually indicate?",
        correct: "The measured value generally increases over time",
        options: ["Time is moving backward", "The measured value generally increases over time", "Every data point is identical", "The graph has no scale"],
      }),
      makeLesson({
        title: "Interpret Diagrams",
        description: "Follow arrows, sequence, hierarchy, and energy or matter flow in scientific diagrams.",
        conceptIntro: "Diagrams show relationships or processes. Read arrow direction carefully: an arrow may show movement, transfer, sequence, or a feeding relationship depending on the diagram.\n\n🌿 FOOD-ENERGY DIAGRAM\nSun → Grass → Grasshopper → Sparrow → Hawk\n      producer   primary consumer\n\nEnergy moves through the chain in the direction of the arrows.",
        question: "In the food chain shown, which organism receives energy directly from grass?",
        correct: "Grasshopper",
        options: ["Hawk", "Sparrow", "Grasshopper", "Sun"],
      }),
      makeLesson({
        title: "Categorize and Classify",
        description: "Group organisms, objects, or processes using shared characteristics.",
        conceptIntro: "To categorize, choose a rule for grouping. To classify, place an item into the group that matches its characteristics. The rule must remain consistent.\n\n🐆 RELATIONSHIP LABELS\nPredator → hunts another organism\nPrey → is hunted\nParasite → benefits while harming a host\nMutualism → both organisms benefit\n\nAsk which defining characteristics are actually supported by the evidence.",
        question: "A tick benefits by feeding on a mammal while harming it. How is this relationship classified?",
        correct: "Parasitism",
        options: ["Mutualism", "Parasitism", "Predation by the mammal", "Competition"],
      }),
      makeLesson({
        title: "Generalize",
        description: "Form a broad statement that is supported by multiple specific observations.",
        conceptIntro: "A valid generalization applies beyond one example but stays within the evidence. Avoid absolute words such as always or never unless the evidence truly supports them.\n\n🔎 EVIDENCE → GENERALIZATION\nObservation A + Observation B + Observation C\n                ↓\n      supported broad statement\n\nA good generalization is broader than one data point but narrower than an unsupported universal claim.",
        question: "Which is the strongest generalization from several ecosystems that all contain interacting populations?",
        correct: "Ecosystems include interacting populations",
        options: ["Every ecosystem has exactly five species", "Ecosystems include interacting populations", "All organisms are predators", "No ecosystem changes"],
      }),
      makeLesson({
        title: "Compare and Contrast",
        description: "Identify meaningful similarities and differences across organisms, data sets, or processes.",
        conceptIntro: "Comparing finds similarities; contrasting finds differences. Use the same feature for both items so the comparison is fair.\n\n🟢 VENN GUIDE\nItem A only | BOTH | Item B only\nStructure    | shared traits | different structure\nFunction     | shared needs  | different function\n\nIn tables, compare the same row or column across the same time period or unit.",
        question: "When comparing two species, what makes a comparison most valid?",
        correct: "Using the same characteristic for both species",
        options: ["Using different units for each species", "Using the same characteristic for both species", "Ignoring the data table", "Comparing unrelated time periods"],
      }),
      makeLesson({
        title: "Relate Text and Visuals",
        description: "Combine information from prose with diagrams, illustrations, graphs, or tables.",
        conceptIntro: "Text and visuals often provide different pieces of the same explanation. Read both, then ask what the visual adds, confirms, or clarifies.\n\n🧬 DNA VISUAL\nSugar-phosphate backbone = outside rails\nBase pairs = inner rungs\nText may explain heredity; the diagram shows how the molecule is organized.\n\nGED questions may require evidence that appears only in the visual.",
        question: "If text explains DNA's function and a diagram labels its base pairs, what should you do?",
        correct: "Combine evidence from both sources",
        options: ["Use only the text", "Use only the picture", "Combine evidence from both sources", "Ignore all labels"],
      }),
      makeLesson({
        title: "Understand Content-Based Tools",
        description: "Use discipline-specific tools such as Punnett squares, pedigrees, keys, formulas, and models.",
        conceptIntro: "Science tools organize information so you can reason efficiently. A Punnett square predicts possible offspring genotypes from parental alleles.\n\n🌸 PUNNETT SQUARE (P = dominant, p = recessive)\n       P   p\n   P | PP | Pp |\n   p | Pp | pp |\n\nThree of four boxes contain at least one dominant allele; one contains two recessive alleles.",
        question: "In the Punnett square PP, Pp, Pp, pp, what fraction is pp?",
        correct: "1/4",
        options: ["1/4", "1/2", "3/4", "4/4"],
      }),
      makeLesson({
        title: "Use Context Clues",
        description: "Infer the meaning of unfamiliar science vocabulary from nearby definitions, examples, contrasts, and word parts.",
        conceptIntro: "Science passages often define a term directly or reveal its meaning through examples. Read the sentence before and after an unfamiliar word.\n\n🧩 CONTEXT CLUE TYPES\nDefinition: 'mitosis, the division of a cell...'\nExample: 'metals such as iron and copper...'\nContrast: 'unlike solids, gases...'\nWord parts: bio = life; thermo = heat\n\nUse context first, then check whether the inferred meaning fits the whole passage.",
        question: "If a passage says 'thermal energy, or heat energy,' what context clue is used?",
        correct: "A direct definition/restatement",
        options: ["A direct definition/restatement", "An unrelated example", "A contradiction", "No context clue"],
      }),
      makeLesson({
        title: "Understand Scientific Evidence",
        description: "Judge whether observations and data support a scientific explanation or claim.",
        conceptIntro: "Scientific evidence comes from observations, measurements, experiments, models, and repeated patterns. Strong evidence is relevant to the claim and obtained using reliable methods.\n\n🦴 HOMOLOGOUS STRUCTURES\nHuman arm | Bat wing | Whale flipper\nDifferent functions, similar underlying bone pattern\n→ evidence consistent with common ancestry\n\nOne observation rarely proves a broad claim by itself; scientists look for converging evidence.",
        question: "Why can similar underlying limb-bone patterns support common ancestry?",
        correct: "They are shared structural evidence across different species",
        options: ["They show every species has the same function", "They are shared structural evidence across different species", "They prove organisms never change", "They remove the need for other evidence"],
      }),
      makeLesson({
        title: "Make and Identify Inferences",
        description: "Use observations plus prior scientific knowledge to reach a logical interpretation.",
        conceptIntro: "An inference is a logical conclusion from evidence, not a direct observation. Keep the inference close to what the evidence can support.\n\n🦌 OBSERVATION\nLight-colored deer are harder to see on pale sand.\n        +\nKnowledge: predators more easily catch visible prey.\n        ↓\nINFERENCE: camouflage may increase survival in that habitat.",
        question: "Which statement is an inference rather than a direct observation?",
        correct: "Camouflage may improve survival",
        options: ["The deer has light fur", "The sand is pale", "Camouflage may improve survival", "The deer is standing on sand"],
      }),
      makeLesson({
        title: "Draw Conclusions",
        description: "Synthesize evidence and inferences into a reasoned final statement.",
        conceptIntro: "A conclusion should answer the scientific question and be supported by the available evidence. It should not introduce claims that were never tested.\n\n✅ CONCLUSION CHECK\n1. Does it answer the question?\n2. Is it supported by data?\n3. Does it respect limitations?\n4. Does it avoid exaggeration?\n\nWhen sources disagree, weigh the quality and relevance of each source.",
        question: "Which conclusion is scientifically strongest?",
        correct: "One that directly follows from the collected evidence",
        options: ["One that directly follows from the collected evidence", "One that adds an untested cause", "One based only on personal preference", "One that ignores conflicting data"],
      }),
    ],
  },
  {
    title: "Unit 2: Physical Science",
    description: "Use models, equations, measurements, forces, energy, waves, and investigations to solve physical-science problems.",
    lessons: [
      makeLesson({
        title: "Understand Scientific Models",
        description: "Use simplified representations to explain systems too large, small, complex, or abstract to observe directly.",
        conceptIntro: "A scientific model represents important features of a system. Models can be drawings, physical objects, mathematical equations, or computer simulations. Every model simplifies reality.\n\n⚛️ ATOM MODEL\nNucleus: proton (+), neutron (0)\nElectron cloud: electron (−)\nHydrogen: 1 proton, 1 electron\nHelium: 2 protons, usually 2 neutrons, 2 electrons\n\nUse the model's key and labels; do not assume every feature is drawn to scale.",
        question: "What is a major purpose of a scientific model?",
        correct: "To represent and explain important features of a system",
        options: ["To reproduce reality with no simplification", "To represent and explain important features of a system", "To eliminate the need for evidence", "To show only objects visible to the eye"],
      }),
      makeLesson({
        title: "Interpret Complex Visuals",
        description: "Integrate multiple labels, symbols, diagrams, and scales in one visual.",
        conceptIntro: "Complex visuals contain several information layers. Read the title and legend first, then examine each sub-part before combining them.\n\n💧 STATES OF MATTER\nSOLID: ●●● tightly packed, fixed arrangement\nLIQUID: ● ●● close together, able to move\nGAS: ●      ● far apart, rapid motion\n\nParticle spacing helps explain differences in shape, volume, and compressibility.",
        question: "Which state generally has particles farthest apart?",
        correct: "Gas",
        options: ["Solid", "Liquid", "Gas", "All have identical spacing"],
      }),
      makeLesson({
        title: "Interpret Complex Tables",
        description: "Extract relationships from tables with several variables, units, and categories.",
        conceptIntro: "A complex table may contain several independent variables or units. Read one row at a time and make sure comparisons use compatible columns.\n\n🧪 PROPERTY TABLE\nSubstance | Bond type | Boiling point\nA         | ionic     | high\nB         | covalent  | lower\n\nA table can show correlation, but the table alone may not establish cause.",
        question: "Before comparing two numerical table values, what should you verify?",
        correct: "That they use compatible units and columns",
        options: ["That they are printed in bold", "That they use compatible units and columns", "That the larger number appears first", "That no title is present"],
      }),
      makeLesson({
        title: "Understand Chemical Equations",
        description: "Read reactants, products, coefficients, and symbols while applying conservation of mass.",
        conceptIntro: "A chemical equation represents a reaction. Reactants are on the left; products are on the right. A balanced equation has the same number of each kind of atom on both sides.\n\n⚗️ 2Mg + O₂ → 2MgO\nLeft: 2 Mg, 2 O atoms\nRight: 2 Mg, 2 O atoms\n\nCoefficients change the number of particles; subscripts are part of a substance's chemical formula.",
        question: "Why must a chemical equation be balanced?",
        correct: "To represent conservation of atoms/mass",
        options: ["To make every coefficient equal to 1", "To represent conservation of atoms/mass", "To remove all reactants", "To change element identities"],
      }),
      makeLesson({
        title: "Predict Outcomes",
        description: "Use patterns, properties, and scientific principles to anticipate what is likely to happen.",
        conceptIntro: "A prediction is an evidence-based statement about a future or unobserved outcome. Identify the relevant variable and use known patterns.\n\n🧂 SOLUBILITY IDEA\nIf more solute is added to an unsaturated solution → more may dissolve.\nAt saturation → additional solute remains undissolved unless conditions change.\n\nA prediction should follow from the stated conditions, not from guessing.",
        question: "What is most likely if more solute is added to a solution already saturated at the same temperature?",
        correct: "Some added solute remains undissolved",
        options: ["All added solute must dissolve", "Some added solute remains undissolved", "The solvent disappears", "The temperature automatically doubles"],
      }),
      makeLesson({
        title: "Calculate to Interpret Outcomes",
        description: "Use formulas and units to calculate quantities such as speed, velocity, and acceleration.",
        conceptIntro: "Translate the question into a formula, substitute values with units, and check whether the result is reasonable.\n\n🏃 SPEED\nspeed = distance ÷ time\nExample: 40 miles ÷ 2 hours = 20 mi/h\n\nVelocity includes direction. Displacement is the straight-line change in position, not always the total path traveled.",
        question: "A traveler moves 60 km in 3 h. What is the average speed?",
        correct: "20 km/h",
        options: ["10 km/h", "20 km/h", "30 km/h", "180 km/h"],
      }),
      makeLesson({
        title: "Understand Vector Diagrams",
        description: "Interpret arrow direction and length to compare forces and motion quantities.",
        conceptIntro: "Vectors have magnitude and direction. In diagrams, arrow direction shows direction and arrow length often represents magnitude.\n\n⬆ 5 N\n□ →→→ 12 N\n← 4 N\n\nIf opposite forces are unequal, the net force points toward the larger force.",
        question: "A box has 12 N right and 4 N left. What is the net force?",
        correct: "8 N to the right",
        options: ["16 N to the right", "8 N to the right", "8 N to the left", "0 N"],
      }),
      makeLesson({
        title: "Apply Scientific Laws",
        description: "Use established laws such as Newton's laws, gravitation, and conservation laws to explain situations.",
        conceptIntro: "Scientific laws describe consistent relationships. Apply the law only when the situation matches its conditions.\n\n🛰️ GRAVITY\nMore mass → stronger gravitational attraction\nMore distance → weaker gravitational attraction\n\nNewton's laws connect force, mass, and acceleration. Conservation laws track quantities such as mass, energy, or momentum through a system.",
        question: "If distance between two masses increases while masses stay the same, gravitational attraction generally becomes…",
        correct: "Weaker",
        options: ["Stronger", "Weaker", "Exactly zero immediately", "Unrelated to distance"],
      }),
      makeLesson({
        title: "Access Prior Knowledge",
        description: "Activate relevant facts, formulas, and experiences before interpreting new information.",
        conceptIntro: "Prior knowledge helps you connect new material to concepts you already understand, but evidence in the question remains authoritative.\n\n🔧 SIMPLE MACHINE: LEVER\ninput force ↓\n──────────────\n      ▲ fulcrum\n          ↑ output\n\nA lever can trade force for distance. Mechanical advantage compares output force with input force.",
        question: "What is the pivot point of a lever called?",
        correct: "Fulcrum",
        options: ["Fulcrum", "Voltage", "Solute", "Nucleus"],
      }),
      makeLesson({
        title: "Link Microscopic and Observable Events",
        description: "Connect particle-level processes with changes you can measure or observe.",
        conceptIntro: "Many visible changes are explained by particle motion. Temperature measures average kinetic energy of particles.\n\n🔥 PARTICLE VIEW\nCool: ● ●  slow motion\nHot:  ●→  ↗●  ●↘ faster average motion\n\nHeating can increase particle motion; phase changes involve energy transfer and changes in particle arrangement.",
        question: "At the particle level, what generally increases when temperature rises?",
        correct: "Average kinetic energy",
        options: ["Average kinetic energy", "Atomic number", "Number of protons in each atom", "Element identity"],
      }),
      makeLesson({
        title: "Interpret Observations",
        description: "Distinguish direct observations from explanations and use observations to evaluate a scientific idea.",
        conceptIntro: "An observation is information obtained through senses or measurement. An interpretation explains what an observation means.\n\n🎢 ENERGY OBSERVATION\nAt top: high gravitational potential energy\nAs object descends: potential ↓, kinetic ↑\n\nA graph or measurement is evidence; the explanation connecting it to a concept is an interpretation.",
        question: "Which is an observation?",
        correct: "The measured speed increased from 2 m/s to 5 m/s",
        options: ["The measured speed increased from 2 m/s to 5 m/s", "The object wanted to move faster", "Energy is always destroyed", "The cause must be invisible"],
      }),
      makeLesson({
        title: "Link Content from Varied Formats",
        description: "Combine prose, graphs, equations, and diagrams to understand the same physical-science concept.",
        conceptIntro: "A GED Science item may split key information across formats. Translate each format into words, then connect them.\n\n🌊 TRANSVERSE WAVE\n          crest\n           /\n____/____/ \\____\n   trough\n<-- wavelength -->\n\nAmplitude = maximum displacement from rest position. Wavelength = distance between corresponding points on successive waves.",
        question: "What is wavelength?",
        correct: "The distance between matching points on successive waves",
        options: ["The height of one particle", "The distance between matching points on successive waves", "The number of atoms in a wave", "The wave's temperature"],
      }),
      makeLesson({
        title: "Draw Conclusions from Mixed Sources",
        description: "Combine information from multiple passages, graphs, and diagrams to support a defensible conclusion.",
        conceptIntro: "Mixed-source questions require evidence from more than one source. Identify what each source contributes before selecting a conclusion.\n\n🏭 EXAMPLE SOURCES\nPassage: emissions policy changed.\nGraph: pollutant concentration decreased over time.\nTable: multiple pollutants measured.\n\nA supported conclusion must fit all relevant sources; correlation alone does not automatically prove one cause.",
        question: "What should a conclusion from mixed sources do?",
        correct: "Fit the relevant evidence across the sources",
        options: ["Depend on only the most colorful visual", "Fit the relevant evidence across the sources", "Ignore units", "Claim a cause whenever two trends occur together"],
      }),
      makeLesson({
        title: "Understand Investigation Techniques",
        description: "Identify hypotheses, variables, controls, procedures, replication, and data collection methods.",
        conceptIntro: "A controlled investigation changes one independent variable and measures a dependent variable while holding other important conditions constant.\n\n🧪 EXPERIMENT MAP\nIndependent variable → intentionally changed\nDependent variable → measured response\nConstants → kept the same\nControl → comparison condition\nRepeated trials → improve reliability",
        question: "A researcher changes applied force and measures acceleration. Which is the independent variable?",
        correct: "Applied force",
        options: ["Acceleration", "Applied force", "The recorded data table", "The conclusion"],
      }),
      makeLesson({
        title: "Evaluate Scientific Information",
        description: "Assess hypotheses, procedures, data quality, source reliability, and whether conclusions match evidence.",
        conceptIntro: "Evaluate how information was obtained. Ask whether variables were controlled, measurements were appropriate, the sample was adequate, and the conclusion matches the data.\n\n✅ VALIDITY QUESTIONS\nWas the hypothesis testable?\nWere measurements relevant?\nWas there a fair comparison?\nWere results replicated?\nAre alternative explanations considered?\n\nReliable science is transparent about uncertainty and limitations.",
        question: "Which change most improves confidence in an experimental result?",
        correct: "Repeating the investigation and obtaining consistent results",
        options: ["Removing measurements that disagree", "Repeating the investigation and obtaining consistent results", "Changing several variables at once", "Choosing the preferred conclusion first"],
      }),
    ],
  },
  {
    title: "Unit 3: Earth and Space Science",
    description: "Analyze theories, patterns, Earth systems, astronomy, energy resources, and scientific arguments.",
    lessons: [
      makeLesson({
        title: "Understand Scientific Theories",
        description: "Distinguish well-supported scientific theories from guesses and connect theories to evidence.",
        conceptIntro: "A scientific theory is a broad explanation supported by extensive evidence. It can be refined when new evidence appears.\n\n🌌 BIG BANG EVIDENCE\nGalaxies show redshift → universe is expanding\nCosmic microwave background → remnant radiation\nElement abundances → consistent with early-universe predictions\n\nA theory explains patterns; a scientific law typically describes a consistent relationship.",
        question: "Which statement best describes a scientific theory?",
        correct: "A well-supported explanation of natural phenomena",
        options: ["An unsupported guess", "A well-supported explanation of natural phenomena", "A rule that can never change", "A personal opinion"],
      }),
      makeLesson({
        title: "Summarize Complex Material",
        description: "Condense a science passage to its central ideas without adding unnecessary details.",
        conceptIntro: "A summary includes the main idea and the most important supporting points in your own words. It leaves out minor examples unless they are essential.\n\n☀️ SUN STRUCTURE — SUMMARY VISUAL\nCore → nuclear fusion releases energy\nRadiative/convective zones → energy moves outward\nPhotosphere → visible surface\nCorona → outer atmosphere\n\nA good summary is accurate, concise, and proportional to the source.",
        question: "Which detail is most important in a summary of how the Sun produces energy?",
        correct: "Nuclear fusion occurs in the core",
        options: ["One sunspot has a particular shape", "Nuclear fusion occurs in the core", "A diagram uses yellow", "The page has a title"],
      }),
      makeLesson({
        title: "Understand Patterns in Science",
        description: "Recognize repeated spatial, temporal, or causal patterns and use them to make predictions.",
        conceptIntro: "Patterns can reveal relationships and support predictions. Distinguish a repeating pattern from a one-time event.\n\n🌍 DAILY PATTERN\nEarth rotates once about every 24 hours\nSide facing Sun → day\nSide facing away → night\n\n🌊 TIDAL PATTERN\nGravitational interactions create regular changes in ocean level.",
        question: "What causes the repeating day-night pattern?",
        correct: "Earth's rotation",
        options: ["Earth's rotation", "Earth's annual revolution alone", "Changes in Moon color", "Cloud formation"],
      }),
      makeLesson({
        title: "Interpret Three-Dimensional Diagrams",
        description: "Use cutaways and layered diagrams to understand structures that extend in three dimensions.",
        conceptIntro: "A 3-D or cutaway diagram shows spatial relationships that a flat exterior view cannot. Read depth, layers, labels, and the key.\n\n🌎 EARTH CUTAWAY\nCrust — thin outer solid layer\nMantle — thick rocky layer\nOuter core — liquid metal\nInner core — solid metal\n\nDo not infer relative thickness from a stylized drawing unless a scale is provided.",
        question: "Which Earth layer is liquid in the standard cutaway model?",
        correct: "Outer core",
        options: ["Crust", "Mantle", "Outer core", "Inner core"],
      }),
      makeLesson({
        title: "Apply Science Concepts",
        description: "Transfer a scientific idea to a new Earth, environmental, or space-science situation.",
        conceptIntro: "Applying a concept means recognizing the underlying principle even when the context changes.\n\n🐧 MARINE FOOD WEB\nPhytoplankton → krill → penguin → leopard seal\nEnergy enters through producers and moves through consumers.\n\n⚡ TIDAL POWER\nMoving water → turbine motion → generator → electrical energy\n\nAsk which principle connects the new situation to what you already know.",
        question: "In a food web, which organisms bring new chemical energy into the biological system through photosynthesis?",
        correct: "Producers",
        options: ["Top predators", "Producers", "Decomposers only", "All consumers equally"],
      }),
      makeLesson({
        title: "Express Scientific Information",
        description: "Translate scientific information among words, numbers, graphs, diagrams, and concise explanations.",
        conceptIntro: "Scientific communication should match the evidence and use clear units, labels, and proportional representations.\n\n🌬️ ATMOSPHERE (approx.)\nNitrogen ███████████████ 78%\nOxygen   ████            21%\nOther    ▏               ~1%\n\nA graph should have a descriptive title, labeled axes, units where needed, and a legend for multiple data series.",
        question: "Which feature is essential when a graph's axis contains measured quantities?",
        correct: "A clear axis label and unit when applicable",
        options: ["Decorative clip art", "A clear axis label and unit when applicable", "A hidden scale", "Unrelated colors only"],
      }),
      makeLesson({
        title: "Identify Problem and Solution",
        description: "Recognize an environmental or engineering problem and evaluate proposed responses.",
        conceptIntro: "Problem-solution passages describe a condition that needs improvement and one or more proposed actions.\n\n🌱 SOIL EROSION\nProblem: topsoil removed by water/wind\nPossible solutions:\n• plant vegetation\n• contour farming\n• windbreaks\n• reduce exposed soil\n\nEvaluate a solution by how directly it addresses the cause and by its trade-offs.",
        question: "Which solution most directly reduces soil erosion by helping hold soil in place?",
        correct: "Planting vegetation",
        options: ["Removing all roots", "Planting vegetation", "Increasing exposed bare soil", "Directing more runoff over the slope"],
      }),
      makeLesson({
        title: "Analyze and Present Arguments",
        description: "Evaluate claims, evidence, assumptions, and trade-offs, then construct a science-based argument.",
        conceptIntro: "A scientific argument contains a claim, relevant evidence, and reasoning that connects the evidence to the claim. Strong arguments acknowledge limitations and competing considerations.\n\n⚡ ENERGY ARGUMENT FRAME\nCLAIM: choose or evaluate an energy source\nEVIDENCE: cost, emissions, reliability, land impact, resource availability\nREASONING: explain how evidence supports the claim\nCOUNTERPOINT: address an important trade-off\n\nAvoid treating opinion as evidence.",
        question: "Which component explains why evidence supports a claim?",
        correct: "Reasoning",
        options: ["A label", "Reasoning", "A page number", "A decorative image"],
      }),
    ],
  },
] as const;

export const gedScienceCourse: OfficialLanguageQuestCourse = {
  code: "MRLC-GED-SCIENCE-V1",
  title: "GED Science",
  description: "A 38-lesson GED Science course that teaches the concept and reasoning skill first, then moves into guided, evidence-based practice across Life Science, Physical Science, and Earth & Space Science.",
  language: "GED Science",
  category: "GED Preparation",
  imageEmoji: "🔬",
  accentColor: "#0f766e",
  published: true,
  units: units.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) => ({
      ...lesson,
      challenges: lesson.challenges.map((challenge) => ({ ...challenge })),
    })),
  })),
};
