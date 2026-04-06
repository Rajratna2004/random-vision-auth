import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { coursesTable, userProgressTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../middlewares/authenticate.js";
import { z } from "zod";
import OpenAI from "openai";

const router: IRouter = Router();

function getClient() {
  const config: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "placeholder",
  };
  if (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
    config.baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  }
  return new OpenAI(config);
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeded pseudo-random number generator (LCG) — deterministic but varied
// ─────────────────────────────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate 3 wrong options close to the correct answer
function wrongOptions(correct: number, rng: () => number, min: number, max: number): number[] {
  const pool = new Set<number>();
  const deltas = [-3, -2, -1, 1, 2, 3, 4, -4, 5, -5];
  for (const d of deltas) {
    const w = correct + d;
    if (w !== correct && w >= min && w <= max) pool.add(w);
    if (pool.size >= 6) break;
  }
  while (pool.size < 3) {
    const w = randInt(rng, min, max);
    if (w !== correct) pool.add(w);
  }
  return shuffle(Array.from(pool), rng).slice(0, 3);
}

function makeQuestion(question: string, correct: number, rng: () => number, min: number, max: number, explanation: string) {
  const wrongs = wrongOptions(correct, rng, min, max);
  const allOptions = shuffle([correct, ...wrongs], rng);
  return {
    question,
    options: allOptions.map(String),
    correctIndex: allOptions.indexOf(correct),
    explanation,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Programmatic Math Question Generators — 100% correct, no AI drift
// ─────────────────────────────────────────────────────────────────────────────

// Word problem context helpers
const ADD_CONTEXTS = [
  (a: number, b: number, c: number) => ({ q: `The school store sold ${a} pencils on Monday and ${b} on Tuesday. How many pencils were sold in total?`, c }),
  (a: number, b: number, c: number) => ({ q: `A farmer had ${a} chickens and bought ${b} more. How many does the farmer have now?`, c }),
  (a: number, b: number, c: number) => ({ q: `There were ${a} students in Class A and ${b} in Class B. How many students are there altogether?`, c }),
  (a: number, b: number, c: number) => ({ q: `Sam collected ${a} stickers and got ${b} more from a friend. How many stickers does Sam have now?`, c }),
  (a: number, b: number, c: number) => ({ q: `A bookshelf had ${a} books. ${b} more were added. How many books are on the shelf?`, c }),
];
const SUB_CONTEXTS = [
  (a: number, b: number, c: number) => ({ q: `A jar had ${a} candies. ${b} were eaten. How many candies remain?`, c }),
  (a: number, b: number, c: number) => ({ q: `The library had ${a} books. Students borrowed ${b}. How many books are left on the shelf?`, c }),
  (a: number, b: number, c: number) => ({ q: `A bag had ${a} marbles. ${b} fell out. How many marbles are left?`, c }),
  (a: number, b: number, c: number) => ({ q: `A tree had ${a} apples. ${b} fell to the ground. How many apples are still on the tree?`, c }),
  (a: number, b: number, c: number) => ({ q: `${a} birds were sitting on a wire. ${b} flew away. How many are still sitting?`, c }),
];
const MUL_CONTEXTS = [
  (a: number, b: number, c: number) => ({ q: `There are ${a} boxes, each containing ${b} chocolates. How many chocolates are there in total?`, c }),
  (a: number, b: number, c: number) => ({ q: `A garden has ${a} rows of flowers. Each row has ${b} flowers. How many flowers are there?`, c }),
  (a: number, b: number, c: number) => ({ q: `Each class has ${b} students. There are ${a} classes. How many students are there altogether?`, c }),
  (a: number, b: number, c: number) => ({ q: `A spider has ${b} legs. How many legs do ${a} spiders have?`, c }),
  (a: number, b: number, c: number) => ({ q: `A baker makes ${b} biscuits per tray. How many biscuits are on ${a} trays?`, c }),
];
const DIV_CONTEXTS = [
  (a: number, b: number, c: number) => ({ q: `${a} biscuits are shared equally among ${b} friends. How many does each friend get?`, c }),
  (a: number, b: number, c: number) => ({ q: `${a} apples are put equally into ${b} baskets. How many apples are in each basket?`, c }),
  (a: number, b: number, c: number) => ({ q: `A teacher has ${a} stickers to give equally to ${b} students. How many stickers does each student get?`, c }),
  (a: number, b: number, c: number) => ({ q: `${a} eggs are packed into boxes of ${b}. How many boxes are needed?`, c }),
  (a: number, b: number, c: number) => ({ q: `${a} children sit in ${b} equal rows. How many children are in each row?`, c }),
];

function generateAdditionQ(difficulty: string, rng: () => number) {
  if (difficulty === "easy") {
    const a = randInt(rng, 1, 9), b = randInt(rng, 1, 9), correct = a + b;
    return makeQuestion(`What is ${a} + ${b}?`, correct, rng, 1, 18, `${a} + ${b} = ${correct}. Well done! ⭐`);
  } else if (difficulty === "medium") {
    if (rng() < 0.5) {
      const a = randInt(rng, 1, 15), b = randInt(rng, 1, 15), c = randInt(rng, 1, 15), correct = a + b + c;
      return makeQuestion(`What is ${a} + ${b} + ${c}?`, correct, rng, 3, 50, `Add step by step: ${a}+${b}=${a+b}, then +${c}=${correct}. 🌟`);
    } else {
      const a = randInt(rng, 10, 35), b = randInt(rng, 10, 35), correct = a + b;
      return makeQuestion(`What is ${a} + ${b}?`, correct, rng, 15, 75, `${a} + ${b} = ${correct}. Great adding! 🌟`);
    }
  } else {
    // Hard: word problems with 2-3 digit numbers
    const a = randInt(rng, 25, 99), b = randInt(rng, 25, 99), correct = a + b;
    const ctx = ADD_CONTEXTS[Math.floor(rng() * ADD_CONTEXTS.length)](a, b, correct);
    const wrongs = wrongOptions(correct, rng, 40, 200);
    const allOpts = shuffle([correct, ...wrongs], rng);
    return { question: ctx.q, options: allOpts.map(String), correctIndex: allOpts.indexOf(correct), explanation: `${a} + ${b} = ${correct}. Add the tens first, then the ones! 🔢` };
  }
}

function generateSubtractionQ(difficulty: string, rng: () => number) {
  if (difficulty === "easy") {
    const b = randInt(rng, 1, 5), a = randInt(rng, b + 1, 9), correct = a - b;
    return makeQuestion(`What is ${a} - ${b}?`, correct, rng, 0, 9, `${a} - ${b} = ${correct}. Excellent! ⭐`);
  } else if (difficulty === "medium") {
    if (rng() < 0.5) {
      const a = randInt(rng, 20, 50), b = randInt(rng, 5, 19), correct = a - b;
      return makeQuestion(`What is ${a} - ${b}?`, correct, rng, 1, 49, `${a} - ${b} = ${correct}. Nice work! 🌟`);
    } else {
      const a = randInt(rng, 10, 30), b = randInt(rng, 1, 9), c = randInt(rng, 1, Math.max(1, a - b - 2)), correct = a - b - c;
      return makeQuestion(`What is ${a} - ${b} - ${c}?`, correct, rng, 0, 30, `Subtract step by step: ${a}-${b}=${a-b}, then -${c}=${correct}. 🌟`);
    }
  } else {
    const b = randInt(rng, 20, 60), a = randInt(rng, b + 10, b + 80), correct = a - b;
    const ctx = SUB_CONTEXTS[Math.floor(rng() * SUB_CONTEXTS.length)](a, b, correct);
    const wrongs = wrongOptions(correct, rng, 1, 100);
    const allOpts = shuffle([correct, ...wrongs], rng);
    return { question: ctx.q, options: allOpts.map(String), correctIndex: allOpts.indexOf(correct), explanation: `${a} - ${b} = ${correct}. Count back from ${a}! 🔢` };
  }
}

function generateMultiplicationQ(difficulty: string, rng: () => number) {
  if (difficulty === "easy") {
    const a = randInt(rng, 1, 5), b = randInt(rng, 1, 5), correct = a * b;
    return makeQuestion(`What is ${a} × ${b}?`, correct, rng, 1, 25, `${a} × ${b} = ${correct}. That's the times table! ⭐`);
  } else if (difficulty === "medium") {
    if (rng() < 0.5) {
      const a = randInt(rng, 6, 9), b = randInt(rng, 6, 9), correct = a * b;
      return makeQuestion(`What is ${a} × ${b}?`, correct, rng, 30, 90, `${a} × ${b} = ${correct}. You know your times tables! 🌟`);
    } else {
      const a = randInt(rng, 2, 9), b = randInt(rng, 2, 6), c = randInt(rng, 2, 4), correct = a * b * c;
      return makeQuestion(`What is ${a} × ${b} × ${c}?`, correct, rng, 4, 200, `Multiply step by step: ${a}×${b}=${a*b}, then ×${c}=${correct}. 🌟`);
    }
  } else {
    const a = randInt(rng, 4, 12), b = randInt(rng, 4, 12), correct = a * b;
    const ctx = MUL_CONTEXTS[Math.floor(rng() * MUL_CONTEXTS.length)](a, b, correct);
    const wrongs = wrongOptions(correct, rng, 10, 150);
    const allOpts = shuffle([correct, ...wrongs], rng);
    return { question: ctx.q, options: allOpts.map(String), correctIndex: allOpts.indexOf(correct), explanation: `${a} × ${b} = ${correct}. Multiply rows by columns! 🔢` };
  }
}

function generateDivisionQ(difficulty: string, rng: () => number) {
  if (difficulty === "easy") {
    const b = randInt(rng, 2, 5), result = randInt(rng, 1, 5), a = b * result;
    return makeQuestion(`What is ${a} ÷ ${b}?`, result, rng, 1, 9, `${a} ÷ ${b} = ${result}. Division is sharing equally! ⭐`);
  } else if (difficulty === "medium") {
    const b = randInt(rng, 2, 9), result = randInt(rng, 3, 9), a = b * result;
    return makeQuestion(`What is ${a} ÷ ${b}?`, result, rng, 1, 20, `${a} ÷ ${b} = ${result}. ${b} × ${result} = ${a}. 🌟`);
  } else {
    const b = randInt(rng, 3, 9), result = randInt(rng, 6, 15), a = b * result;
    const ctx = DIV_CONTEXTS[Math.floor(rng() * DIV_CONTEXTS.length)](a, b, result);
    const wrongs = wrongOptions(result, rng, 1, 25);
    const allOpts = shuffle([result, ...wrongs], rng);
    return { question: ctx.q, options: allOpts.map(String), correctIndex: allOpts.indexOf(result), explanation: `${a} ÷ ${b} = ${result}. Think: what × ${b} = ${a}? 🔢` };
  }
}

function generateFractionQ(difficulty: string, rng: () => number) {
  const denoms = [2, 3, 4, 5, 8, 10];
  const denom = denoms[Math.floor(rng() * denoms.length)];
  const numer = randInt(rng, 1, denom - 1);
  if (difficulty === "easy") {
    return {
      question: `A shape is split into ${denom} equal parts. ${numer} part${numer > 1 ? "s are" : " is"} coloured. What fraction is coloured?`,
      options: shuffle([`${numer}/${denom}`, `${denom}/${numer}`, `1/${denom + 1}`, `${numer + 1}/${denom}`], rng),
      correctIndex: 0,
      explanation: `${numer} out of ${denom} parts = ${numer}/${denom}. Great fractions! ⭐`,
    };
  } else if (difficulty === "medium") {
    const d2 = denoms[Math.floor(rng() * denoms.length)], n2 = randInt(rng, 1, d2 - 1);
    const bigger = numer / denom > n2 / d2;
    const answer = bigger ? `${numer}/${denom}` : `${n2}/${d2}`;
    const opts = shuffle([`${numer}/${denom}`, `${n2}/${d2}`, "They are equal", `${numer + n2}/${denom}`], rng);
    return { question: `Which fraction is bigger: ${numer}/${denom} or ${n2}/${d2}?`, options: opts, correctIndex: opts.indexOf(answer), explanation: `${numer}/${denom} = ${(numer/denom).toFixed(2)}, ${n2}/${d2} = ${(n2/d2).toFixed(2)}. Convert to decimals to compare! 🌟` };
  } else {
    // Hard: fraction word problem
    const items = ["slices of pizza", "pieces of cake", "sections of a chocolate bar", "equal parts of a ribbon"][Math.floor(rng() * 4)];
    const total = denom;
    const eaten = numer;
    const left = total - eaten;
    const leftFrac = `${left}/${total}`;
    const opts = shuffle([leftFrac, `${eaten}/${total}`, `${left}/${total + 1}`, `${eaten - 1}/${total}`].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4), rng);
    if (!opts.includes(leftFrac)) opts[0] = leftFrac;
    return { question: `A ${items.split(" ").pop()} was cut into ${total} equal ${items}. ${eaten} ${eaten === 1 ? "was" : "were"} eaten. What fraction is left?`, options: opts, correctIndex: opts.indexOf(leftFrac), explanation: `${eaten} out of ${total} eaten, so ${left} remain. That's ${leftFrac}! 🔢` };
  }
}

// General math question generator for topics that don't match specific subtopics
function generateGeneralMathQ(difficulty: string, rng: () => number) {
  const type = Math.floor(rng() * 4);
  if (type === 0) return generateAdditionQ(difficulty, rng);
  if (type === 1) return generateSubtractionQ(difficulty, rng);
  if (type === 2) return generateMultiplicationQ(difficulty, rng);
  return generateDivisionQ(difficulty, rng);
}

const MATH_TOPIC_MAP: { keywords: string[]; gen: (d: string, rng: () => number) => any }[] = [
  { keywords: ["addition", "adding", "add"], gen: generateAdditionQ },
  { keywords: ["subtraction", "subtract", "minus", "take away"], gen: generateSubtractionQ },
  { keywords: ["multiplication", "multiply", "times table", "product"], gen: generateMultiplicationQ },
  { keywords: ["division", "divid", "sharing", "quotient"], gen: generateDivisionQ },
  { keywords: ["fraction", "numerator", "denominator", "half", "quarter", "third"], gen: generateFractionQ },
  { keywords: ["math", "number", "count", "calculat", "arithmetic", "algebra", "geometry", "shape", "measure", "angle", "percent", "decimal", "place value"], gen: generateGeneralMathQ },
];

function tryProgrammaticMath(topic: string, difficulty: string, numQ: number, seed: number) {
  const t = topic.toLowerCase();
  const entry = MATH_TOPIC_MAP.find((e) => e.keywords.some((k) => t.includes(k)));
  if (!entry) return null;

  const rng = mkRng(seed);
  const questions: any[] = [];
  for (let i = 0; i < numQ; i++) {
    questions.push(entry.gen(difficulty, rng));
  }
  return { topic, questions };
}

// ─────────────────────────────────────────────────────────────────────────────
// Static Question Banks — Science, Reading, Geography, Coding, Art
// Used for all difficulties; seed-shuffled so questions vary each session
// ─────────────────────────────────────────────────────────────────────────────

type StaticQ = { question: string; options: string[]; correctIndex: number; explanation: string };

const SCIENCE_EASY: StaticQ[] = [
  { question: "What do plants need to make their own food?", options: ["Sunlight, water, and air", "Soil and stones", "Rain only", "Darkness and cold"], correctIndex: 0, explanation: "Plants use sunlight, water, and carbon dioxide from air to make food. This is called photosynthesis! 🌱" },
  { question: "Which planet is closest to the Sun?", options: ["Mercury", "Venus", "Earth", "Mars"], correctIndex: 0, explanation: "Mercury is the closest planet to the Sun. It's very hot during the day! ☀️" },
  { question: "What do we call animals that eat only plants?", options: ["Herbivores", "Carnivores", "Omnivores", "Predators"], correctIndex: 0, explanation: "Herbivores eat only plants. Cows, rabbits, and deer are herbivores! 🐄" },
  { question: "What state of matter is ice?", options: ["Solid", "Liquid", "Gas", "Plasma"], correctIndex: 0, explanation: "Ice is a solid because it has a fixed shape. When it melts it becomes liquid water! 🧊" },
  { question: "What organ pumps blood around your body?", options: ["Heart", "Lungs", "Brain", "Stomach"], correctIndex: 0, explanation: "Your heart pumps blood through your body all day and night! ❤️" },
  { question: "What do we call baby frogs?", options: ["Tadpoles", "Caterpillars", "Larvae", "Froglets"], correctIndex: 0, explanation: "Baby frogs are called tadpoles. They live in water and grow legs over time! 🐸" },
  { question: "Which of these is a mammal?", options: ["Dolphin", "Salmon", "Eagle", "Frog"], correctIndex: 0, explanation: "Dolphins are mammals — they breathe air and feed milk to their babies! 🐬" },
  { question: "What gas do humans breathe in to survive?", options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], correctIndex: 0, explanation: "We breathe in oxygen and breathe out carbon dioxide. Our lungs do this automatically! 💨" },
  { question: "What is the centre of our Solar System?", options: ["The Sun", "Earth", "The Moon", "Jupiter"], correctIndex: 0, explanation: "The Sun is at the centre of our Solar System. All planets orbit around it! ☀️" },
  { question: "How many legs does an insect have?", options: ["6", "8", "4", "10"], correctIndex: 0, explanation: "All insects have exactly 6 legs. Spiders have 8 legs — they are arachnids, not insects! 🐛" },
  { question: "What do we call the process when water turns into vapour?", options: ["Evaporation", "Condensation", "Freezing", "Melting"], correctIndex: 0, explanation: "Evaporation is when liquid water turns into water vapour (gas). The sun helps this happen! 💧" },
  { question: "Which force pulls objects toward the ground?", options: ["Gravity", "Magnetism", "Friction", "Electricity"], correctIndex: 0, explanation: "Gravity is the force that pulls everything toward Earth. It keeps us on the ground! 🌍" },
  { question: "What do caterpillars turn into?", options: ["Butterflies or moths", "Flies", "Beetles", "Dragonflies"], correctIndex: 0, explanation: "Caterpillars transform into butterflies or moths through metamorphosis. Amazing! 🦋" },
  { question: "What is the boiling point of water?", options: ["100°C", "50°C", "0°C", "37°C"], correctIndex: 0, explanation: "Water boils at 100 degrees Celsius. Below 0°C it freezes into ice! 🌡️" },
  { question: "What part of the plant absorbs water from the soil?", options: ["Roots", "Leaves", "Flowers", "Stem"], correctIndex: 0, explanation: "Roots absorb water and nutrients from the soil and send them up to the rest of the plant! 🌿" },
  { question: "Which animal lays the largest eggs?", options: ["Ostrich", "Elephant", "Whale", "Crocodile"], correctIndex: 0, explanation: "Ostriches lay the largest eggs of any living bird — they can weigh over 1 kg! 🥚" },
  { question: "What do we call scientists who study animals?", options: ["Zoologists", "Biologists", "Geologists", "Astronomers"], correctIndex: 0, explanation: "Zoologists study animals. They learn about animal behaviour, habitats, and survival! 🐾" },
];

const SCIENCE_MEDIUM: StaticQ[] = [
  { question: "Why do leaves change colour in autumn?", options: ["Chlorophyll breaks down, revealing other pigments", "Leaves absorb more sunlight", "Trees produce new colours", "Cold air paints the leaves"], correctIndex: 0, explanation: "In autumn, chlorophyll (the green pigment) breaks down and hidden red, orange, and yellow pigments appear! 🍂" },
  { question: "What happens to water when it is heated to 100°C?", options: ["It boils and turns to steam", "It freezes", "It becomes denser", "It turns into ice"], correctIndex: 0, explanation: "At 100°C, water boils and turns to steam (water vapour). This is a change of state from liquid to gas! 🔥" },
  { question: "Which part of the plant carries out photosynthesis?", options: ["Leaves", "Roots", "Stem", "Flower"], correctIndex: 0, explanation: "Leaves have chlorophyll which absorbs sunlight to carry out photosynthesis and make food! 🌿" },
  { question: "What is the food chain order?", options: ["Producer → Primary consumer → Secondary consumer", "Consumer → Producer → Decomposer", "Predator → Prey → Plant", "Sun → Animal → Plant"], correctIndex: 0, explanation: "Energy flows from producers (plants) to primary consumers (herbivores) to secondary consumers (carnivores)! 🍃" },
  { question: "Why do we float more easily in salt water than fresh water?", options: ["Salt water is denser and provides more upward force", "Salt water is warmer", "Salt removes gravity", "Fresh water is heavier"], correctIndex: 0, explanation: "Salt water is denser than fresh water, so it provides more buoyant (upward) force on your body! 🌊" },
  { question: "What causes day and night on Earth?", options: ["Earth rotating on its axis", "The Sun moving around Earth", "The Moon blocking the Sun", "Earth moving closer to the Sun"], correctIndex: 0, explanation: "Earth spins on its axis once every 24 hours. The side facing the Sun has day, the other side has night! 🌏" },
  { question: "What is the role of decomposers in an ecosystem?", options: ["Break down dead organisms and return nutrients to soil", "Hunt other animals", "Produce food from sunlight", "Purify water"], correctIndex: 0, explanation: "Decomposers like fungi and bacteria break down dead plants and animals, recycling nutrients into the soil! 🍄" },
  { question: "What is condensation?", options: ["Water vapour cooling and turning back to liquid", "Water turning to steam", "Ice melting", "Rain falling from clouds"], correctIndex: 0, explanation: "Condensation happens when water vapour cools and turns back into liquid droplets — like dew on grass! 💧" },
  { question: "Which organ filters waste from your blood?", options: ["Kidneys", "Heart", "Lungs", "Liver"], correctIndex: 0, explanation: "Your kidneys filter blood and remove waste products, which leave the body as urine! 🫀" },
  { question: "What is an adaptation?", options: ["A feature that helps an organism survive in its habitat", "A change in weather", "A type of food", "A form of movement"], correctIndex: 0, explanation: "Adaptations are special features like camouflage, thick fur, or sharp claws that help animals survive! 🐻‍❄️" },
  { question: "What is the difference between a vertebrate and an invertebrate?", options: ["Vertebrates have a backbone; invertebrates do not", "Vertebrates live in water; invertebrates on land", "Vertebrates are large; invertebrates are tiny", "Vertebrates lay eggs; invertebrates give birth"], correctIndex: 0, explanation: "Vertebrates (fish, birds, mammals) have a backbone. Invertebrates (insects, worms, jellyfish) do not! 🦴" },
  { question: "What are the three states of matter?", options: ["Solid, liquid, gas", "Hard, soft, wet", "Hot, cold, warm", "Metal, wood, water"], correctIndex: 0, explanation: "Matter exists as solid (fixed shape), liquid (flows), or gas (fills any container)! ⚗️" },
  { question: "How do fish breathe underwater?", options: ["Using gills to extract oxygen from water", "Holding their breath", "Absorbing oxygen through their skin", "Coming to the surface to breathe"], correctIndex: 0, explanation: "Fish use gills to extract dissolved oxygen from water as it flows over them. Clever! 🐟" },
  { question: "What is the main gas in Earth's atmosphere?", options: ["Nitrogen (78%)", "Oxygen (78%)", "Carbon dioxide (78%)", "Helium (78%)"], correctIndex: 0, explanation: "Earth's atmosphere is about 78% nitrogen and only 21% oxygen. Nitrogen is colourless and odourless! 🌍" },
  { question: "What do we call an animal that is active at night?", options: ["Nocturnal", "Diurnal", "Crepuscular", "Dormant"], correctIndex: 0, explanation: "Nocturnal animals like owls, bats, and foxes are most active during the night! 🦉" },
];

const SCIENCE_HARD: StaticQ[] = [
  { question: "What is the role of mitochondria in a cell?", options: ["Producing energy (ATP) through cellular respiration", "Controlling cell activities", "Making proteins", "Protecting the cell"], correctIndex: 0, explanation: "Mitochondria are the 'powerhouses' of the cell, converting glucose and oxygen into energy (ATP)! ⚡" },
  { question: "What is Newton's Third Law of Motion?", options: ["Every action has an equal and opposite reaction", "Force equals mass times acceleration", "An object stays at rest unless acted upon", "Speed equals distance divided by time"], correctIndex: 0, explanation: "Newton's 3rd Law: for every action force there is an equal and opposite reaction force! 🚀" },
  { question: "What happens during meiosis?", options: ["A cell divides to create gametes with half the chromosomes", "A cell divides to create two identical cells", "Chromosomes double in number", "DNA is repaired"], correctIndex: 0, explanation: "Meiosis produces sex cells (gametes) with half the normal chromosome count — so offspring get half from each parent! 🧬" },
  { question: "What is the pH of a neutral solution?", options: ["7", "0", "14", "1"], correctIndex: 0, explanation: "pH 7 is neutral (pure water). Below 7 is acidic; above 7 is alkaline (basic)! ⚗️" },
  { question: "What causes the seasons on Earth?", options: ["Earth's tilted axis as it orbits the Sun", "Earth's changing distance from the Sun", "The Moon's gravity", "Solar flares"], correctIndex: 0, explanation: "Earth's axis is tilted 23.5°. As Earth orbits, different hemispheres receive more direct sunlight — creating seasons! 🌍" },
  { question: "What is natural selection?", options: ["Organisms with beneficial traits survive and reproduce more", "Humans choosing which animals to breed", "Animals adapting their size randomly", "Species changing to look like each other"], correctIndex: 0, explanation: "Natural selection (Darwin's theory): individuals with traits better suited to their environment survive and pass on those traits! 🦕" },
  { question: "What is the difference between a chemical and physical change?", options: ["Chemical: new substance formed; Physical: no new substance, just shape/state change", "Chemical: fast; Physical: slow", "Chemical: reversible; Physical: permanent", "They are the same thing"], correctIndex: 0, explanation: "Burning wood (chemical) creates ash — a new substance. Cutting wood (physical) is just a shape change! 🔥" },
  { question: "What is the electromagnetic spectrum?", options: ["A range of all electromagnetic waves ordered by wavelength", "The colours visible to humans only", "The energy produced by magnets", "Sound waves of different frequencies"], correctIndex: 0, explanation: "The EM spectrum includes radio waves, microwaves, infrared, visible light, UV, X-rays, and gamma rays! 🌈" },
  { question: "What is the function of DNA?", options: ["Carries genetic instructions for growth, development, and reproduction", "Provides energy to cells", "Filters waste from blood", "Transmits nerve signals"], correctIndex: 0, explanation: "DNA (deoxyribonucleic acid) is the genetic blueprint found in every cell — it determines traits like eye colour! 🧬" },
  { question: "What is an endothermic reaction?", options: ["A reaction that absorbs heat energy from the surroundings", "A reaction that releases heat", "A reaction inside an animal's body", "A reaction that produces light"], correctIndex: 0, explanation: "Endothermic reactions absorb heat — the surroundings feel cooler. Photosynthesis is endothermic! 🧊" },
];

const GEOGRAPHY_EASY: StaticQ[] = [
  { question: "What is the capital city of France?", options: ["Paris", "London", "Berlin", "Rome"], correctIndex: 0, explanation: "Paris is the capital of France. It is famous for the Eiffel Tower! 🗼" },
  { question: "How many continents are there on Earth?", options: ["7", "5", "6", "8"], correctIndex: 0, explanation: "There are 7 continents: Africa, Antarctica, Asia, Australia, Europe, North America, and South America! 🌍" },
  { question: "What is the largest ocean in the world?", options: ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean"], correctIndex: 0, explanation: "The Pacific Ocean is the largest ocean, covering more than 30% of Earth's surface! 🌊" },
  { question: "What is the capital of the United States?", options: ["Washington D.C.", "New York", "Los Angeles", "Chicago"], correctIndex: 0, explanation: "Washington D.C. is the capital of the USA. It is home to the White House! 🏛️" },
  { question: "Which is the longest river in the world?", options: ["The Nile", "The Amazon", "The Mississippi", "The Yangtze"], correctIndex: 0, explanation: "The Nile in Africa is the longest river in the world, stretching over 6,650 km! 🌍" },
  { question: "On which continent is the Amazon rainforest found?", options: ["South America", "Africa", "Asia", "North America"], correctIndex: 0, explanation: "The Amazon rainforest is in South America, mainly in Brazil. It's the world's largest rainforest! 🌿" },
  { question: "What is the capital of Australia?", options: ["Canberra", "Sydney", "Melbourne", "Brisbane"], correctIndex: 0, explanation: "Canberra is Australia's capital. Many people think it's Sydney, but Canberra was chosen as a compromise! 🦘" },
  { question: "Which country has the most people?", options: ["India", "China", "USA", "Russia"], correctIndex: 0, explanation: "India recently surpassed China to become the world's most populous country, with over 1.4 billion people! 🌏" },
  { question: "What is the tallest mountain in the world?", options: ["Mount Everest", "K2", "Mont Blanc", "Kilimanjaro"], correctIndex: 0, explanation: "Mount Everest in the Himalayas is the tallest mountain at 8,849 metres above sea level! 🏔️" },
  { question: "Which continent is Russia mostly on?", options: ["Asia", "Europe", "North America", "Antarctica"], correctIndex: 0, explanation: "Most of Russia's land area is in Asia, though its capital Moscow is in the European part! 🗺️" },
  { question: "What is the capital of Japan?", options: ["Tokyo", "Osaka", "Kyoto", "Hiroshima"], correctIndex: 0, explanation: "Tokyo is the capital of Japan and one of the world's most populated cities! 🗾" },
  { question: "Which ocean lies between Europe and North America?", options: ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Arctic Ocean"], correctIndex: 0, explanation: "The Atlantic Ocean separates Europe and Africa from the Americas! 🌊" },
  { question: "What is the smallest country in the world?", options: ["Vatican City", "Monaco", "San Marino", "Liechtenstein"], correctIndex: 0, explanation: "Vatican City, inside Rome, Italy, is the world's smallest country at just 0.44 square kilometres! ✝️" },
  { question: "What is the capital of Brazil?", options: ["Brasília", "São Paulo", "Rio de Janeiro", "Salvador"], correctIndex: 0, explanation: "Brasília is the capital of Brazil. Many people think it's Rio de Janeiro, but Brasília was built in the 1960s to be the new capital! 🇧🇷" },
  { question: "On which continent is Egypt located?", options: ["Africa", "Asia", "Europe", "Middle East"], correctIndex: 0, explanation: "Egypt is in northeastern Africa, though it also has the Sinai Peninsula in Asia! 🐪" },
];

const GEOGRAPHY_MEDIUM: StaticQ[] = [
  { question: "What is the longest mountain range in the world?", options: ["The Andes", "The Himalayas", "The Rockies", "The Alps"], correctIndex: 0, explanation: "The Andes in South America is the world's longest mountain range, stretching about 7,000 km! 🏔️" },
  { question: "Which two continents does the Ural Mountains separate?", options: ["Europe and Asia", "Asia and Africa", "North and South America", "Europe and Africa"], correctIndex: 0, explanation: "The Ural Mountains form a natural boundary between Europe and Asia in Russia! ⛰️" },
  { question: "What is the driest hot desert in the world?", options: ["Sahara Desert", "Gobi Desert", "Atacama Desert", "Arabian Desert"], correctIndex: 0, explanation: "The Atacama Desert in South America is the driest hot desert on Earth. Some areas have never recorded rainfall! 🏜️" },
  { question: "Which country has the most land area?", options: ["Russia", "Canada", "USA", "China"], correctIndex: 0, explanation: "Russia is the largest country in the world by land area, covering about 17.1 million km²! 🗺️" },
  { question: "What is the Great Barrier Reef and where is it?", options: ["World's largest coral reef, off Australia's northeast coast", "A wall in China", "A mountain range in New Zealand", "A reef in the Caribbean"], correctIndex: 0, explanation: "The Great Barrier Reef is the world's largest coral reef system, located in the Coral Sea off Queensland, Australia! 🐠" },
  { question: "Which river flows through Egypt into the Mediterranean Sea?", options: ["The Nile", "The Congo", "The Niger", "The Zambezi"], correctIndex: 0, explanation: "The Nile flows northward through Egypt and empties into the Mediterranean Sea. Ancient Egyptian civilisation depended on it! 🌊" },
  { question: "What is a delta?", options: ["Land formed at a river's mouth where it meets the sea", "A type of mountain", "An underground river", "A very wide lake"], correctIndex: 0, explanation: "A river delta forms when a river slows down at the sea and deposits sediment, creating a fan-shaped landmass! 🌍" },
  { question: "Which country is both a continent and a country?", options: ["Australia", "Brazil", "Russia", "Canada"], correctIndex: 0, explanation: "Australia is unique — it's the only country that occupies an entire continent! 🦘" },
  { question: "What is the Sahara Desert's approximate size?", options: ["About the same size as the USA", "Twice the size of Europe", "Smaller than India", "The same size as Antarctica"], correctIndex: 0, explanation: "The Sahara Desert is roughly the same size as the contiguous United States — about 9 million km²! 🏜️" },
  { question: "What connects the Atlantic and Pacific Oceans through Central America?", options: ["The Panama Canal", "The Suez Canal", "The Strait of Gibraltar", "The Bering Strait"], correctIndex: 0, explanation: "The Panama Canal allows ships to travel between the Atlantic and Pacific Oceans without going around South America! ⚓" },
  { question: "Which climate zone is found near the Equator?", options: ["Tropical rainforest", "Tundra", "Desert", "Polar"], correctIndex: 0, explanation: "Areas near the Equator receive the most direct sunlight year-round, creating hot, wet tropical rainforest climates! 🌴" },
  { question: "What is the capital of Canada?", options: ["Ottawa", "Toronto", "Vancouver", "Montreal"], correctIndex: 0, explanation: "Ottawa is Canada's capital. Many people think Toronto is, but Ottawa was chosen as a compromise between English and French Canada! 🍁" },
];

const GEOGRAPHY_HARD: StaticQ[] = [
  { question: "Which country borders both Norway and China?", options: ["Russia", "Finland", "Mongolia", "Kazakhstan"], correctIndex: 0, explanation: "Russia borders both Norway (in the northwest) and China (in the far east) — it's so vast it spans 11 time zones! 🗺️" },
  { question: "What is the Ring of Fire?", options: ["A zone of volcanoes and earthquakes around the Pacific Ocean", "A desert in Australia", "A climate belt near the Equator", "An ocean current in the Atlantic"], correctIndex: 0, explanation: "The Ring of Fire is a horseshoe-shaped zone around the Pacific with 75% of Earth's volcanoes and most major earthquakes! 🌋" },
  { question: "How many time zones does Russia span?", options: ["11", "7", "15", "9"], correctIndex: 0, explanation: "Russia spans 11 time zones — the most of any country in the world! 🕐" },
  { question: "Which is the only sea with no coastline (surrounded entirely by ocean)?", options: ["Sargasso Sea", "Dead Sea", "Caspian Sea", "Red Sea"], correctIndex: 0, explanation: "The Sargasso Sea in the North Atlantic is the only sea with no land boundaries — defined by ocean currents! 🌊" },
  { question: "What is the Coriolis effect?", options: ["The deflection of moving air/water due to Earth's rotation", "A type of ocean current in the tropics", "The force that causes tides", "A weather pattern near the poles"], correctIndex: 0, explanation: "Earth's rotation deflects winds and ocean currents to the right in the Northern Hemisphere and left in the Southern! 🌀" },
  { question: "Which African country has the most pyramids?", options: ["Sudan", "Egypt", "Libya", "Ethiopia"], correctIndex: 0, explanation: "Sudan (ancient Nubia) actually has more pyramids than Egypt — over 200 compared to Egypt's 138! 🏺" },
  { question: "What is the difference between weather and climate?", options: ["Weather is short-term atmospheric conditions; climate is the long-term average", "Weather is global; climate is local", "Weather changes every year; climate changes daily", "They mean the same thing"], correctIndex: 0, explanation: "'Climate is what you expect, weather is what you get.' Climate is the 30-year average; weather is today's conditions! 🌤️" },
];

const CODING_EASY: StaticQ[] = [
  { question: "What is a variable in programming?", options: ["A container that stores a value", "A type of loop", "A programming language", "A kind of button"], correctIndex: 0, explanation: "A variable stores data like numbers or words that your program can use and change! 📦" },
  { question: "What does a 'loop' do in a program?", options: ["Repeats a set of instructions multiple times", "Stops the program", "Makes the screen bigger", "Creates a new file"], correctIndex: 0, explanation: "A loop repeats code over and over — useful for tasks like counting or going through a list! 🔄" },
  { question: "What is an algorithm?", options: ["A set of step-by-step instructions to solve a problem", "A type of computer virus", "A programming language", "A kind of screen"], correctIndex: 0, explanation: "An algorithm is like a recipe — a clear list of steps that solves a problem! 📋" },
  { question: "What does 'if' do in programming?", options: ["Checks a condition and runs code only if it is true", "Repeats code forever", "Prints text to the screen", "Stops the program"], correctIndex: 0, explanation: "An 'if' statement lets your program make decisions — like 'if the score is high, show a trophy'! 🏆" },
  { question: "What is a 'bug' in programming?", options: ["An error or mistake in the code", "A type of programming language", "A feature that is working correctly", "A small computer chip"], correctIndex: 0, explanation: "A bug is an error that makes a program behave incorrectly. Finding and fixing bugs is called debugging! 🐛" },
  { question: "What does HTML stand for?", options: ["HyperText Markup Language", "High Tech Modern Language", "Hyper Transfer Machine Logic", "Home Tool Making Language"], correctIndex: 0, explanation: "HTML (HyperText Markup Language) is used to create the structure of web pages! 🌐" },
  { question: "What is a 'function' in programming?", options: ["A block of reusable code that does a specific task", "A type of variable", "An error message", "A way to stop a loop"], correctIndex: 0, explanation: "A function is like a mini-program inside your program — you write it once and can use it many times! ♻️" },
  { question: "What is 'output' in a program?", options: ["Information the program displays or produces", "The code you write", "The speed of the computer", "The number of errors"], correctIndex: 0, explanation: "Output is anything your program produces — like text on a screen, a sound, or a file! 📺" },
  { question: "What does it mean to 'debug' code?", options: ["Find and fix errors in a program", "Write new code from scratch", "Delete old programs", "Make a program run faster"], correctIndex: 0, explanation: "Debugging means searching through code to find and fix mistakes so the program works correctly! 🔍" },
  { question: "What is a 'string' in programming?", options: ["A sequence of characters like text", "A type of number", "A kind of loop", "A program that plays music"], correctIndex: 0, explanation: "A string stores text — like a name or sentence. 'Hello World!' is a classic string! 📝" },
  { question: "What does a computer use to remember information while running?", options: ["RAM (Random Access Memory)", "The hard drive", "The screen", "The keyboard"], correctIndex: 0, explanation: "RAM is fast, temporary memory your computer uses while running programs. It's cleared when you turn off the computer! 💻" },
  { question: "What is 'input' in a program?", options: ["Data given to the program by the user", "The code the programmer writes", "The program's errors", "The computer's processor"], correctIndex: 0, explanation: "Input is anything the user gives to the program — like typing your name or clicking a button! ⌨️" },
];

const CODING_MEDIUM: StaticQ[] = [
  { question: "What will `print(2 + 3 * 4)` output in Python?", options: ["14", "20", "24", "9"], correctIndex: 0, explanation: "Multiplication (*) happens before addition — so 3×4=12 first, then 2+12=14. This is called order of operations! 🐍" },
  { question: "What does a 'for' loop do in most languages?", options: ["Repeats code a specific number of times or through a collection", "Runs code only once", "Checks if something is true", "Ends the program"], correctIndex: 0, explanation: "A for loop iterates a fixed number of times: `for i in range(5)` runs 5 times (0, 1, 2, 3, 4)! 🔄" },
  { question: "What is the index of the first item in most programming arrays?", options: ["0", "1", "−1", "It depends on the language"], correctIndex: 0, explanation: "Most languages (Python, JavaScript, Java, C++) use 0-based indexing — the first item is at index 0! 📊" },
  { question: "What does 'boolean' mean in programming?", options: ["A data type that is either true or false", "A very large number", "A list of items", "A type of function"], correctIndex: 0, explanation: "A boolean can only be true or false — like a light switch being on or off! Used in conditions like if-statements! 💡" },
  { question: "What is the purpose of an 'else' statement?", options: ["Runs code when the 'if' condition is false", "Creates a new loop", "Prints an error", "Stops the program"], correctIndex: 0, explanation: "else runs when the if condition is false: `if score > 10: win() else: try_again()` 🎮" },
  { question: "What does `len('hello')` return in Python?", options: ["5", "4", "6", "0"], correctIndex: 0, explanation: "len() counts characters in a string. 'hello' has 5 characters: h-e-l-l-o! 📏" },
  { question: "What is a 'list' (or array) in programming?", options: ["An ordered collection of multiple values", "A single number", "A type of function", "A programming error"], correctIndex: 0, explanation: "A list stores multiple values in order: `fruits = ['apple', 'banana', 'cherry']` — index 0 is 'apple'! 🍎" },
  { question: "What does CSS stand for?", options: ["Cascading Style Sheets", "Computer Style Script", "Creative Screen System", "Code Style Structure"], correctIndex: 0, explanation: "CSS (Cascading Style Sheets) controls how web pages look — colours, fonts, spacing, and layout! 🎨" },
  { question: "What is the result of `10 % 3` in most programming languages?", options: ["1", "3", "0", "10"], correctIndex: 0, explanation: "The % operator gives the remainder. 10 ÷ 3 = 3 remainder 1, so 10 % 3 = 1! ➗" },
  { question: "What does a 'while' loop do?", options: ["Repeats code as long as a condition is true", "Runs code exactly once", "Checks a condition and stops", "Repeats code a fixed number of times"], correctIndex: 0, explanation: "A while loop keeps repeating: `while score < 100: score += 10` — keeps going until score reaches 100! 🔄" },
  { question: "What is a 'return' statement in a function?", options: ["Sends a value back from the function to where it was called", "Restarts the program", "Creates a new variable", "Prints a message"], correctIndex: 0, explanation: "return sends the result out of a function: `def double(x): return x * 2` — calling double(5) gives 10! ↩️" },
];

const CODING_HARD: StaticQ[] = [
  { question: "What is the time complexity of binary search?", options: ["O(log n)", "O(n)", "O(n²)", "O(1)"], correctIndex: 0, explanation: "Binary search halves the search space each step, giving O(log n) time complexity — much faster than O(n) linear search! 🔍" },
  { question: "What is recursion?", options: ["A function that calls itself", "A loop that never ends", "A type of data structure", "A programming language feature"], correctIndex: 0, explanation: "Recursion is when a function calls itself to solve smaller sub-problems — like factorials: factorial(5) calls factorial(4)! 🌀" },
  { question: "What does OOP stand for?", options: ["Object-Oriented Programming", "Ordered Output Processing", "Open Operation Protocol", "Object Output Procedure"], correctIndex: 0, explanation: "OOP organises code into objects with properties and methods — like a Dog object with name, breed, and bark() method! 🐕" },
  { question: "What is the difference between '==' and '===' in JavaScript?", options: ["'==' compares values only; '===' compares values AND types", "'===' is a typo; only '==' is valid", "Both do the same thing", "'===' means greater than or equal"], correctIndex: 0, explanation: "'5' == 5 is true (ignores type), but '5' === 5 is false (different types: string vs number)! Always use '==='. 🔒" },
  { question: "What is a stack data structure?", options: ["A last-in, first-out (LIFO) collection", "A first-in, first-out (FIFO) collection", "A sorted list", "A type of tree"], correctIndex: 0, explanation: "A stack is like a pile of plates — you add and remove from the top only. LIFO: Last In, First Out! 📚" },
  { question: "What does 'async/await' solve in JavaScript?", options: ["Makes asynchronous code easier to read and write", "Makes code run faster", "Fixes all bugs automatically", "Creates multiple threads"], correctIndex: 0, explanation: "async/await makes working with promises (async operations like fetching data) look like synchronous code — much more readable! ⏳" },
  { question: "What is a SQL JOIN?", options: ["Combining rows from two or more tables based on a related column", "Deleting duplicate rows", "Sorting a table", "Creating a new database"], correctIndex: 0, explanation: "SQL JOIN merges data from multiple tables — e.g., JOIN users with orders using the user_id column! 🔗" },
  { question: "What is the purpose of Git?", options: ["Version control — tracking changes to code over time", "Compiling code into programs", "Running tests automatically", "Designing user interfaces"], correctIndex: 0, explanation: "Git tracks every change to your code, lets you collaborate with others, and lets you revert to older versions! 📝" },
];

const ART_EASY: StaticQ[] = [
  { question: "What colours do you get by mixing red and blue?", options: ["Purple", "Green", "Orange", "Brown"], correctIndex: 0, explanation: "Red + Blue = Purple! Red, blue, and yellow are the three primary colours! 🎨" },
  { question: "What are the three primary colours?", options: ["Red, yellow, and blue", "Red, green, and blue", "Orange, purple, and green", "White, black, and grey"], correctIndex: 0, explanation: "The three primary colours are red, yellow, and blue. You can't make them by mixing other colours! 🖌️" },
  { question: "What do you get when you mix yellow and blue?", options: ["Green", "Orange", "Purple", "Brown"], correctIndex: 0, explanation: "Yellow + Blue = Green! Green is a secondary colour made from two primary colours! 🟢" },
  { question: "Who painted the Mona Lisa?", options: ["Leonardo da Vinci", "Pablo Picasso", "Vincent van Gogh", "Michelangelo"], correctIndex: 0, explanation: "Leonardo da Vinci painted the Mona Lisa around 1503–1519. It's one of the most famous paintings in history! 🎭" },
  { question: "What tool do painters use to apply paint to canvas?", options: ["A paintbrush", "A pencil", "A ruler", "A pair of scissors"], correctIndex: 0, explanation: "Painters use brushes of different shapes and sizes to apply paint. They can also use palette knives! 🖌️" },
  { question: "What are the secondary colours?", options: ["Orange, green, and purple", "Red, yellow, and blue", "Pink, brown, and grey", "White, black, and gold"], correctIndex: 0, explanation: "Secondary colours are made by mixing two primary colours: Red+Yellow=Orange, Yellow+Blue=Green, Red+Blue=Purple! 🎨" },
  { question: "What type of art is made by cutting and sticking pieces together?", options: ["Collage", "Sculpture", "Fresco", "Watercolour"], correctIndex: 0, explanation: "Collage involves cutting and gluing paper, photos, fabric, and other materials into a new artwork! ✂️" },
  { question: "What do you mix with water to use watercolour paints?", options: ["Water", "Oil", "Milk", "Glue"], correctIndex: 0, explanation: "Watercolour paints are mixed with water to make them thinner and transparent. They create beautiful soft effects! 💧" },
  { question: "Which famous artist cut off his ear?", options: ["Vincent van Gogh", "Pablo Picasso", "Salvador Dali", "Claude Monet"], correctIndex: 0, explanation: "Vincent van Gogh famously cut off part of his ear in 1888. He painted Starry Night and over 900 paintings! 🌟" },
  { question: "What is a portrait?", options: ["A painting or drawing of a person", "A landscape painting", "A painting of food", "An abstract artwork"], correctIndex: 0, explanation: "A portrait focuses on a person — usually their face and expression. The Mona Lisa is a famous portrait! 👤" },
  { question: "What is a landscape painting?", options: ["A painting of outdoor scenery like mountains or fields", "A portrait of a famous person", "A painting of food", "A picture of buildings only"], correctIndex: 0, explanation: "Landscape paintings show outdoor scenes — countryside, mountains, sea, forests, and sky! 🏞️" },
  { question: "What colour do you get mixing red and yellow?", options: ["Orange", "Purple", "Brown", "Pink"], correctIndex: 0, explanation: "Red + Yellow = Orange! Orange is a warm secondary colour often seen in sunsets! 🟠" },
];

const ART_MEDIUM: StaticQ[] = [
  { question: "What is the art style where paintings look like dreams with strange combinations?", options: ["Surrealism", "Impressionism", "Cubism", "Realism"], correctIndex: 0, explanation: "Surrealism explores the unconscious mind and dreams. Salvador Dali's melting clocks are a famous example! 🌙" },
  { question: "Who painted Starry Night?", options: ["Vincent van Gogh", "Claude Monet", "Pablo Picasso", "Henri Matisse"], correctIndex: 0, explanation: "Vincent van Gogh painted Starry Night in 1889 while staying at an asylum in Saint-Rémy, France! 🌌" },
  { question: "What technique uses small dots of colour that blend together when viewed from a distance?", options: ["Pointillism", "Impressionism", "Cubism", "Expressionism"], correctIndex: 0, explanation: "Pointillism uses tiny dots of pure colour. Georges Seurat was famous for this technique! 🔵" },
  { question: "What is the difference between warm and cool colours?", options: ["Warm: reds, oranges, yellows; Cool: blues, greens, purples", "Warm: blues; Cool: reds", "Warm: dark colours; Cool: light colours", "They are the same thing"], correctIndex: 0, explanation: "Warm colours (red, orange, yellow) feel energetic and lively. Cool colours (blue, green, purple) feel calm! 🌡️" },
  { question: "What painting technique shows three-dimensional objects on a flat surface?", options: ["Perspective", "Pointillism", "Abstraction", "Shading only"], correctIndex: 0, explanation: "Perspective uses lines that converge at a vanishing point to make flat paintings look 3D! 🏛️" },
  { question: "Who created the sculpture 'David'?", options: ["Michelangelo", "Leonardo da Vinci", "Donatello", "Raphael"], correctIndex: 0, explanation: "Michelangelo carved the marble statue of David from 1501-1504. It stands 5.17 metres tall in Florence, Italy! 🏛️" },
  { question: "What is 'chiaroscuro' in art?", options: ["The use of strong contrast between light and dark", "A style of drawing cartoons", "Mixing many colours together", "Painting landscapes from memory"], correctIndex: 0, explanation: "Chiaroscuro (Italian for 'light-dark') is a technique using strong contrasts. Caravaggio and Rembrandt mastered it! 🕯️" },
  { question: "What art movement is Picasso famous for?", options: ["Cubism", "Impressionism", "Surrealism", "Realism"], correctIndex: 0, explanation: "Cubism (invented by Picasso and Braque) shows subjects from multiple viewpoints at once, creating fragmented shapes! 🎭" },
  { question: "What is a self-portrait?", options: ["An artist painting a picture of themselves", "A portrait of a famous person", "A photograph taken by a camera", "A sketch of your house"], correctIndex: 0, explanation: "A self-portrait is an artist's depiction of themselves. Frida Kahlo and Rembrandt are famous for their self-portraits! 🪞" },
  { question: "What are complementary colours?", options: ["Colours opposite each other on the colour wheel (like red and green)", "Colours that look similar", "The three primary colours", "Colours that are always used together"], correctIndex: 0, explanation: "Complementary colours are opposites on the colour wheel: red-green, blue-orange, yellow-purple. They create strong contrast! 🎨" },
];

const ART_HARD: StaticQ[] = [
  { question: "What is the Renaissance period in art?", options: ["A cultural rebirth in Europe (14th-17th century) reviving classical Greek/Roman styles", "A modern art movement in the 20th century", "An art period focused on abstract shapes", "A style of architecture using iron"], correctIndex: 0, explanation: "The Renaissance (rebirth) was a European cultural movement emphasising humanism, science, and classical beauty — Da Vinci, Michelangelo, Raphael! 🏛️" },
  { question: "What is the Golden Ratio and why do artists use it?", options: ["A mathematical proportion (~1.618) believed to create naturally pleasing compositions", "A yellow paint colour used in Baroque art", "The ratio of blue to yellow in perfect paintings", "A rule about canvas sizes"], correctIndex: 0, explanation: "The Golden Ratio (φ ≈ 1.618) appears in nature and is used by artists since ancient Greece to create balanced, beautiful compositions! 📐" },
  { question: "What is Op Art?", options: ["An abstract art style using optical illusions to trick the viewer's eye", "A style of painting outdoors", "Art made from recycled objects", "Computer-generated art"], correctIndex: 0, explanation: "Op Art (Optical Art) creates optical illusions through geometric patterns and colour — Bridget Riley and Victor Vasarely were pioneers! 👁️" },
  { question: "What distinguishes Baroque art?", options: ["Dramatic use of light, emotion, movement, and grandeur", "Flat geometric shapes and primary colours", "Peaceful pastoral scenes and soft colours", "Minimalist black and white designs"], correctIndex: 0, explanation: "Baroque art (1600s) features drama, intense emotion, rich colours, and theatricality. Caravaggio and Rubens were key figures! 🕍" },
  { question: "What is encaustic painting?", options: ["Painting using heated wax mixed with pigment", "Painting on canvas stretched over a frame", "Engraving designs into metal plates", "Painting murals on wet plaster"], correctIndex: 0, explanation: "Encaustic painting uses molten beeswax mixed with pigment, applied hot and fused with heat. Used in ancient Egypt and Rome! 🕯️" },
  { question: "Who was Frida Kahlo and what style did she paint in?", options: ["A Mexican painter known for symbolic self-portraits, linked to Surrealism", "A French Impressionist who painted water lilies", "An Italian Renaissance sculptor", "A German Expressionist known for street scenes"], correctIndex: 0, explanation: "Frida Kahlo (1907-1954) was a Mexican artist whose deeply personal self-portraits blend surrealism, folk art, and Mexican culture! 🌺" },
];

const READING_EASY: StaticQ[] = [
  { question: "What is a noun?", options: ["A person, place, thing, or idea", "An action word", "A describing word", "A joining word"], correctIndex: 0, explanation: "A noun names a person (teacher), place (school), thing (book), or idea (happiness)! 📚" },
  { question: "What is a verb?", options: ["An action or doing word", "A naming word", "A describing word", "A connecting word"], correctIndex: 0, explanation: "A verb shows action or being — run, jump, is, think. Every sentence needs a verb! 🏃" },
  { question: "What is an adjective?", options: ["A word that describes a noun", "An action word", "A naming word", "A word that connects sentences"], correctIndex: 0, explanation: "An adjective describes a noun — tall, red, happy, small. 'The big red balloon' has two adjectives! 🎈" },
  { question: "What punctuation ends a question?", options: ["A question mark (?)", "A full stop (.)", "An exclamation mark (!)", "A comma (,)"], correctIndex: 0, explanation: "Questions always end with a question mark (?). 'What time is it?' — the question mark shows it's asking something! ❓" },
  { question: "What is a synonym?", options: ["A word with the same or similar meaning", "A word that sounds the same but is spelled differently", "A word with the opposite meaning", "A word that connects clauses"], correctIndex: 0, explanation: "Synonyms have similar meanings: happy/joyful, big/large, fast/quick. They help make writing more interesting! 📝" },
  { question: "What is an antonym?", options: ["A word with the opposite meaning", "A word that sounds the same", "A word with a similar meaning", "A type of punctuation mark"], correctIndex: 0, explanation: "Antonyms are opposites: hot/cold, tall/short, happy/sad. They are useful in comparisons! ↔️" },
  { question: "What is the main idea of a paragraph?", options: ["The most important point the paragraph is trying to make", "The first sentence only", "The last sentence only", "The longest sentence in the paragraph"], correctIndex: 0, explanation: "The main idea is the central message. It's often in the topic sentence, usually the first sentence! 💡" },
  { question: "What is a compound word?", options: ["Two words joined together to make a new word", "A very long word", "A word with a prefix", "A word borrowed from another language"], correctIndex: 0, explanation: "Compound words combine two words: sun + flower = sunflower, book + shelf = bookshelf, foot + ball = football! 🌻" },
  { question: "What does a capital letter show at the start of a sentence?", options: ["The beginning of a new sentence", "A very important word", "A name of a country only", "A command"], correctIndex: 0, explanation: "Every new sentence starts with a capital letter. Capital letters also begin proper nouns like names and places! 🔤" },
  { question: "What is a rhyme?", options: ["Two words that have the same ending sound", "Two words that start with the same letter", "A type of poem with 5 lines", "A sentence that tells a story"], correctIndex: 0, explanation: "Rhyming words have the same ending sounds: cat/hat, day/play, sun/run. Poetry often uses rhymes! 🎵" },
  { question: "What is a sentence?", options: ["A group of words that makes complete sense with a subject and verb", "Any group of words", "A single word", "A question only"], correctIndex: 0, explanation: "A sentence has a subject (who) and a verb (what they do) and makes complete sense: 'The dog runs fast.' 🐕" },
  { question: "What is a prefix?", options: ["A group of letters added to the beginning of a word to change its meaning", "Letters added to the end of a word", "The longest part of a word", "A punctuation mark"], correctIndex: 0, explanation: "Prefixes change meaning: un+happy=unhappy, re+play=replay, pre+view=preview! 🔤" },
];

const READING_MEDIUM: StaticQ[] = [
  { question: "What is a metaphor?", options: ["Saying something IS something else to make a comparison", "Saying something is LIKE something else", "Using the same letter to start multiple words", "Giving human qualities to an object"], correctIndex: 0, explanation: "A metaphor makes a direct comparison without 'like' or 'as': 'Life is a rollercoaster.' 'Her eyes were stars.' 🌟" },
  { question: "What is a simile?", options: ["Comparing two things using 'like' or 'as'", "A direct comparison without 'like' or 'as'", "Giving objects human feelings", "Repeating sounds at the start of words"], correctIndex: 0, explanation: "Similes use 'like' or 'as': 'She runs like the wind.' 'He is as tall as a tree.' They paint vivid pictures! 🎨" },
  { question: "What is alliteration?", options: ["Repeating the same consonant sound at the start of nearby words", "Rhyming words at the end of lines", "Making something seem bigger than it is", "Using very descriptive adjectives"], correctIndex: 0, explanation: "Alliteration: 'Peter Piper picked a peck.' 'Six slippery snakes.' It creates rhythm and is fun to say! 🐍" },
  { question: "What is personification?", options: ["Giving human qualities or actions to non-human things", "Describing a person in great detail", "Using very descriptive language", "Comparing two people"], correctIndex: 0, explanation: "Personification: 'The wind whispered through the trees.' 'The sun smiled down.' Objects act like people! 🌬️" },
  { question: "What is a suffix?", options: ["Letters added to the end of a word to change its meaning", "Letters added to the beginning of a word", "The root of a word", "A punctuation mark"], correctIndex: 0, explanation: "Suffixes: play+ful=playful, happy+ness=happiness, teach+er=teacher, quick+ly=quickly! They change meaning or word type! 📝" },
  { question: "What is the purpose of a topic sentence?", options: ["To introduce the main idea of a paragraph", "To end a paragraph with a summary", "To provide an example", "To connect two paragraphs"], correctIndex: 0, explanation: "The topic sentence (usually first) tells the reader what the paragraph is about — it's the paragraph's 'promise'! 📌" },
  { question: "What does 'infer' mean?", options: ["Conclude something from evidence rather than being directly told", "Copy information from the text word for word", "Summarise the whole story", "Write a prediction about the beginning"], correctIndex: 0, explanation: "Inference means reading between the lines — using clues to figure out what's not directly stated! 🕵️" },
  { question: "What is a conjunction?", options: ["A word that joins clauses or sentences (e.g. and, but, because)", "An action word", "A describing word", "A naming word"], correctIndex: 0, explanation: "Conjunctions connect ideas: 'I like cats AND dogs.' 'She stayed home BECAUSE it rained.' FANBOYS: For, And, Nor, But, Or, Yet, So! 🔗" },
  { question: "What is direct speech?", options: ["The exact words a person said, placed inside quotation marks", "Writing about what someone said without quoting them", "A command given to a character", "A formal written speech"], correctIndex: 0, explanation: "Direct speech uses quotation marks: 'I love reading,' said Emma. It shows exactly what someone said! 💬" },
  { question: "What is the difference between fiction and non-fiction?", options: ["Fiction is imaginary; non-fiction is about real facts and events", "Fiction is longer; non-fiction is shorter", "Fiction has pictures; non-fiction does not", "They are the same type of writing"], correctIndex: 0, explanation: "Fiction (novels, stories) is made up. Non-fiction (encyclopaedias, biographies) is factual and real! 📚" },
  { question: "What is a conclusion in an essay?", options: ["The final paragraph that summarises the main points", "The opening paragraph", "The paragraph with the most examples", "A list of references"], correctIndex: 0, explanation: "A conclusion wraps up the essay — it restates the main argument and summarises the key points! 🎯" },
];

const READING_HARD: StaticQ[] = [
  { question: "What is dramatic irony?", options: ["When the audience knows something the characters don't", "When a character says the opposite of what they mean", "When events happen in the opposite order expected", "When characters use overly dramatic language"], correctIndex: 0, explanation: "In Romeo and Juliet, we know Juliet is asleep (not dead) but Romeo doesn't — that tragic gap is dramatic irony! 🎭" },
  { question: "What is the difference between first-person and third-person narration?", options: ["First-person uses 'I'; third-person uses 'he/she/they'", "First-person is more formal; third-person is casual", "First-person is for fiction; third-person is for non-fiction", "They have the same effect on the reader"], correctIndex: 0, explanation: "First-person ('I went...') gives an intimate, personal perspective. Third-person ('She went...') allows more distance and omniscience! 📖" },
  { question: "What is an oxymoron?", options: ["Two contradictory words used together for effect", "A comparison using 'like' or 'as'", "Giving objects human qualities", "Exaggerating for emphasis"], correctIndex: 0, explanation: "Oxymorons combine contradictions: 'deafening silence', 'bittersweet', 'living death'. They create surprising meaning! ⚡" },
  { question: "What is a euphemism?", options: ["A mild or indirect word used instead of a harsh or blunt one", "An extreme exaggeration for emphasis", "A phrase that means the opposite of its literal meaning", "A word that sounds like what it describes"], correctIndex: 0, explanation: "Euphemisms soften difficult topics: 'passed away' instead of 'died', 'let go' instead of 'fired'. Used to be polite or less upsetting! 🌸" },
  { question: "What is the 'theme' of a story?", options: ["The central message or idea the story explores", "The setting where the story takes place", "The main character's name", "A summary of the plot"], correctIndex: 0, explanation: "The theme is the deeper meaning — friendship, courage, justice. Harry Potter themes include love conquering evil and the power of choice! 🌟" },
  { question: "What is onomatopoeia?", options: ["A word that imitates the sound it describes", "A type of rhyming pattern", "A figure of speech comparing two unlike things", "A word with a prefix and suffix"], correctIndex: 0, explanation: "Onomatopoeia: buzz, crash, sizzle, hiss, boom. The word sounds like the thing it describes! 🐝" },
  { question: "What is the purpose of a rhetorical question?", options: ["To make a point or provoke thought, not to get an answer", "To ask for specific information", "To begin a story", "To introduce a topic formally"], correctIndex: 0, explanation: "Rhetorical questions engage the reader: 'Shall I compare thee to a summer's day?' No answer expected — it's used for effect! 💭" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Lesson-Specific Question Banks — keyed by lesson title keywords
// Checked FIRST before broad subject banks so questions match the exact lesson
// ─────────────────────────────────────────────────────────────────────────────

type LessonBank = { match: string[]; easy: StaticQ[]; medium: StaticQ[]; hard: StaticQ[] };

const LESSON_BANKS: LessonBank[] = [
  // ── SCIENCE: The Water Cycle ──────────────────────────────────────────────
  {
    match: ["water cycle"],
    easy: [
      { question: "What process turns liquid water into water vapour?", options: ["Evaporation", "Condensation", "Precipitation", "Freezing"], correctIndex: 0, explanation: "Evaporation is when the Sun heats water and turns it into water vapour — like puddles drying up! ☀️" },
      { question: "What do we call it when water falls from clouds?", options: ["Precipitation", "Evaporation", "Condensation", "Transpiration"], correctIndex: 0, explanation: "Precipitation is any water that falls from clouds — rain, snow, sleet, or hail! 🌧️" },
      { question: "What are clouds made of?", options: ["Tiny water droplets or ice crystals", "Steam from factories", "Dust and smoke", "Air and gas"], correctIndex: 0, explanation: "Clouds form when water vapour cools and turns into millions of tiny droplets — condensation! ☁️" },
      { question: "What provides the energy that powers the water cycle?", options: ["The Sun", "Wind", "Ocean waves", "Gravity"], correctIndex: 0, explanation: "The Sun heats water, causing evaporation — it's the main engine driving the whole water cycle! ☀️" },
      { question: "Where does most of the water in the water cycle come from?", options: ["Oceans and seas", "Rivers", "Rain clouds", "Underground lakes"], correctIndex: 0, explanation: "Oceans and seas cover 71% of Earth and are the biggest source of evaporated water! 🌊" },
      { question: "What do we call water that soaks into the ground?", options: ["Groundwater", "Runoff", "Precipitation", "Condensation"], correctIndex: 0, explanation: "Groundwater collects underground in aquifers and feeds springs, wells, and rivers! 🌍" },
    ],
    medium: [
      { question: "What is condensation in the water cycle?", options: ["Water vapour cools and turns back into liquid droplets forming clouds", "Water turning into vapour by heating", "Rain falling from the sky", "Water flowing into rivers"], correctIndex: 0, explanation: "Condensation is the opposite of evaporation — vapour cools, slows, and clusters into liquid droplets making clouds! ☁️" },
      { question: "What is transpiration?", options: ["When plants release water vapour through their leaves", "When water flows through rivers", "When clouds release rain", "When ice melts in spring"], correctIndex: 0, explanation: "Plants absorb water through roots and release it as vapour through tiny pores (stomata) in their leaves! 🌿" },
      { question: "What are the four main stages of the water cycle?", options: ["Evaporation, condensation, precipitation, collection", "Heating, cooling, raining, flooding", "Melting, freezing, flowing, evaporating", "Sun, clouds, rain, rivers"], correctIndex: 0, explanation: "Water evaporates → condenses into clouds → falls as precipitation → collects in oceans/rivers — then the cycle repeats! 🔄" },
      { question: "Why does water evaporate faster on a hot sunny day?", options: ["Heat gives water molecules more energy to escape as vapour", "The Sun pushes the water up into the sky", "Hot air is lighter and carries water", "Wind blows the water away"], correctIndex: 0, explanation: "Heat energy makes water molecules move faster until they have enough energy to escape the liquid surface as vapour! 🌡️" },
      { question: "What type of precipitation occurs when temperatures are very cold?", options: ["Snow or hail", "Rain", "Dew", "Mist"], correctIndex: 0, explanation: "When water droplets in clouds freeze, they fall as snow. Hail forms when droplets are coated in ice layers! ❄️" },
      { question: "What is runoff in the water cycle?", options: ["Water that flows over the land surface into rivers and oceans", "Water that evaporates from lakes", "Water that plants absorb through roots", "Water stored underground"], correctIndex: 0, explanation: "When rain falls on hard ground, it flows across the surface as runoff — filling rivers and eventually reaching the ocean! 🏞️" },
    ],
    hard: [
      { question: "What is the primary energy source driving the water cycle?", options: ["Solar radiation from the Sun", "Earth's gravitational pull", "Wind energy", "Heat from Earth's core"], correctIndex: 0, explanation: "Solar energy drives evaporation. Without the Sun's heat, water vapour wouldn't form and the cycle would stop! ☀️" },
      { question: "What percentage of Earth's water is accessible fresh water?", options: ["Less than 1%", "About 3%", "About 30%", "About 10%"], correctIndex: 0, explanation: "While 3% of Earth's water is fresh, about 2% is locked in ice caps — leaving under 1% as accessible liquid fresh water! 💧" },
      { question: "How does the water cycle regulate Earth's temperature?", options: ["Evaporation cools surfaces; condensation releases heat into atmosphere", "Rain warms the ground while evaporation freezes the air", "Water stores heat in the oceans which never cools down", "The cycle has no effect on temperature"], correctIndex: 0, explanation: "Evaporation cools Earth's surface (like sweat cools you). When vapour condenses, it releases latent heat into the atmosphere — a global thermostat! 🌍" },
      { question: "What is the difference between evaporation and transpiration?", options: ["Evaporation is from water surfaces; transpiration is water released through plant leaves", "Evaporation is from plants; transpiration is from oceans", "They are two words for the same process", "Evaporation only happens in deserts; transpiration in forests"], correctIndex: 0, explanation: "Together they are called evapotranspiration. Amazon rainforests transpire so much water they create their own rainfall! 🌳" },
      { question: "What would happen to life on Earth if the water cycle stopped?", options: ["Rainfall would stop, fresh water would vanish, and most life would die", "Oceans would grow larger and flood the land", "Nothing would change because water stays in oceans", "Deserts would disappear as water evened out"], correctIndex: 0, explanation: "The water cycle continuously purifies and distributes fresh water. Without it, land surfaces would dry out and ecosystems would collapse! 🌍" },
      { question: "How do human activities affect the water cycle?", options: ["Deforestation reduces transpiration; cities increase runoff; climate change intensifies evaporation", "Farming adds more water to the cycle", "Building dams stops evaporation", "Air conditioning puts water into the sky"], correctIndex: 0, explanation: "Deforestation cuts transpiration (trees release huge amounts of vapour). Concrete cities speed runoff into drains. Climate change supercharges the whole cycle! 🏭" },
    ],
  },
  // ── SCIENCE: States of Matter ─────────────────────────────────────────────
  {
    match: ["states of matter"],
    easy: [
      { question: "What are the three main states of matter?", options: ["Solid, liquid, gas", "Ice, water, steam", "Hard, soft, wet", "Hot, cold, warm"], correctIndex: 0, explanation: "Everything around us is solid, liquid, or gas. Ice, water, and steam are all the same substance in different states! ❄️💧💨" },
      { question: "Which state of matter has a fixed shape?", options: ["Solid", "Liquid", "Gas", "Plasma"], correctIndex: 0, explanation: "Solids have tightly packed particles that barely move — so they keep their shape! A rock or ice cube is a solid. 🪨" },
      { question: "What happens to ice when it gets warm?", options: ["It melts and becomes liquid water", "It evaporates into gas", "It stays the same", "It turns into steam immediately"], correctIndex: 0, explanation: "Melting happens at 0°C — heat energy loosens the tight bonds in ice so particles can flow as liquid water! 🧊" },
      { question: "Which state of matter can fill any container?", options: ["Gas", "Liquid", "Solid", "Powder"], correctIndex: 0, explanation: "Gas particles move freely and spread out to fill any space or container they're put in! 💨" },
      { question: "At what temperature does water freeze into ice?", options: ["0°C", "100°C", "50°C", "-20°C"], correctIndex: 0, explanation: "Water freezes at 0 degrees Celsius. Below 0°C, water molecules slow down enough to lock into a solid ice structure! 🌡️" },
      { question: "What is the change called when a liquid turns into a gas?", options: ["Evaporation or boiling", "Melting", "Condensation", "Freezing"], correctIndex: 0, explanation: "Evaporation (at the surface) and boiling (throughout the liquid) both change liquid to gas — just at different rates! 🫧" },
    ],
    medium: [
      { question: "What happens to particles when a solid melts into a liquid?", options: ["They gain energy and break free of their fixed positions but stay close together", "They gain energy and spread far apart", "They lose energy and slow down", "They disappear and form new particles"], correctIndex: 0, explanation: "In a solid, particles vibrate in fixed positions. When heated, they gain enough energy to move past each other as a liquid! 🔥" },
      { question: "What is sublimation?", options: ["When a solid changes directly into a gas without becoming liquid first", "When a gas changes directly into a solid", "When a liquid freezes slowly", "When gas condenses on a cold surface"], correctIndex: 0, explanation: "Dry ice (solid CO₂) sublimates at room temperature — you can watch it turn straight to gas! 🧊➡️💨" },
      { question: "Why does a liquid take the shape of its container?", options: ["Its particles can move freely but stay close together, unable to escape", "Its particles are fixed in place like a solid", "Its particles have no attraction to each other", "The container heats the liquid into shape"], correctIndex: 0, explanation: "Liquid particles flow past each other (unlike solids) but stay close (unlike gases) — so they fill and take the shape of any container! 🥛" },
      { question: "What is the boiling point of water at sea level?", options: ["100°C", "0°C", "50°C", "212°F only"], correctIndex: 0, explanation: "Water boils at 100°C at sea level. At high altitude (lower pressure) it boils at lower temperatures — that's why cooking takes longer on mountains! 🫧" },
      { question: "What is deposition?", options: ["When gas changes directly into a solid without passing through liquid", "When solid melts into liquid", "When liquid freezes on a surface", "When particles lose all energy"], correctIndex: 0, explanation: "Frost on windows is deposition — water vapour in cold air turns directly into solid ice crystals! ❄️" },
      { question: "How do particle arrangements differ between solids, liquids, and gases?", options: ["Solid: tightly packed in fixed positions; Liquid: close but moving; Gas: far apart and fast-moving", "All three have the same arrangement, just at different temperatures", "Solid: spread out; Liquid: packed tight; Gas: in rows", "Solid and liquid are the same; only gas is different"], correctIndex: 0, explanation: "As you add energy (heat), particles spread out more: packed solid → flowing liquid → freely moving gas! 🔬" },
    ],
    hard: [
      { question: "What is the Kinetic Theory of Matter?", options: ["All matter is made of tiny particles in constant motion; the faster they move, the more energy they have", "Matter is made of waves that vibrate at different frequencies", "All particles in matter are stationary unless heated", "Matter changes state only when pressure is applied"], correctIndex: 0, explanation: "Kinetic theory explains all states — heat increases particle motion (kinetic energy), which drives state changes! ⚛️" },
      { question: "Why does ice float on water, which is unusual for solids?", options: ["Water expands when it freezes, making ice less dense than liquid water", "Ice is heavier and should sink, but surface tension holds it up", "Frozen water has a different chemical formula", "Ice floats because it contains trapped air bubbles"], correctIndex: 0, explanation: "Water is unique — its hexagonal ice structure is less dense than liquid water. This protects aquatic life under frozen lakes! ❄️🐟" },
      { question: "How does pressure affect the boiling point of water?", options: ["Higher pressure raises the boiling point; lower pressure lowers it", "Pressure has no effect on boiling point", "Higher pressure always makes water freeze instead", "Lower pressure raises the boiling point"], correctIndex: 0, explanation: "In a pressure cooker, high pressure raises the boiling point above 100°C — food cooks faster. On Everest, lower pressure means water boils below 70°C! 🏔️" },
      { question: "What is plasma and where is it found naturally?", options: ["A 4th state of matter — ionised gas with electrons stripped from atoms; found in the Sun and lightning", "A liquid form of electricity found in batteries", "A very cold form of gas found only in space", "A mixture of solid and gas particles"], correctIndex: 0, explanation: "Over 99% of visible matter in the universe is plasma! Stars, lightning, and neon signs are all plasma. 🌟" },
      { question: "What is the triple point of water?", options: ["The exact temperature and pressure where water can exist as solid, liquid, and gas simultaneously", "The three temperatures at which water changes state", "The point where water reaches maximum density", "The boiling point, freezing point, and melting point combined"], correctIndex: 0, explanation: "At exactly 0.01°C and 611.7 Pa pressure, all three phases of water coexist in equilibrium — an amazing physical phenomenon! 🔬" },
      { question: "What is latent heat and why is it important in state changes?", options: ["Energy absorbed or released during a state change without changing temperature", "The heat energy stored in the particles of a hot solid", "The minimum temperature needed to melt a substance", "Heat that escapes from particles when they cool"], correctIndex: 0, explanation: "During melting or boiling, temperature stays constant while energy breaks particle bonds. This latent heat drives Earth's weather systems! 🌡️" },
    ],
  },
  // ── SCIENCE: Plant Life Cycles ────────────────────────────────────────────
  {
    match: ["plant life"],
    easy: [
      { question: "What does a seed need to start growing?", options: ["Water, warmth, and soil", "Sunlight, wind, and cold", "Rain and darkness only", "Soil and insects"], correctIndex: 0, explanation: "Seeds germinate when they get water, warmth, and the right soil conditions — then a tiny root and shoot emerge! 🌱" },
      { question: "What part of a plant makes food using sunlight?", options: ["Leaves", "Roots", "Stem", "Flowers"], correctIndex: 0, explanation: "Leaves are packed with chlorophyll — the green pigment that captures sunlight to make food through photosynthesis! 🍃" },
      { question: "What do we call when a seed first starts to grow?", options: ["Germination", "Pollination", "Photosynthesis", "Fertilisation"], correctIndex: 0, explanation: "Germination is the magical moment a seed breaks open, sending out its first tiny root and shoot! 🌱" },
      { question: "What part of a plant produces seeds?", options: ["The flower", "The leaves", "The stem", "The roots"], correctIndex: 0, explanation: "Flowers attract pollinators; after pollination, the flower develops into fruit containing seeds! 🌸" },
      { question: "What gas do plants take in to make food?", options: ["Carbon dioxide", "Oxygen", "Nitrogen", "Helium"], correctIndex: 0, explanation: "Plants absorb carbon dioxide (CO₂) from the air through tiny pores called stomata in their leaves! 🌿" },
      { question: "What do roots do for a plant?", options: ["Absorb water and nutrients from the soil and anchor the plant", "Make food from sunlight", "Attract insects for pollination", "Release oxygen into the air"], correctIndex: 0, explanation: "Roots are like anchors and drinking straws — they hold the plant in place and absorb water and minerals! 🌱" },
    ],
    medium: [
      { question: "What is photosynthesis?", options: ["When plants use sunlight, water, and CO₂ to make glucose and oxygen", "When plants absorb water through their roots", "When seeds germinate in soil", "When plants drop their leaves in autumn"], correctIndex: 0, explanation: "Photosynthesis equation: CO₂ + water + sunlight → glucose + oxygen. Plants make their food AND give us the oxygen we breathe! ☀️" },
      { question: "What is pollination?", options: ["Transfer of pollen from one flower to another, allowing seeds to form", "When plants drink water through roots", "When seeds sprout in spring", "When leaves fall in autumn"], correctIndex: 0, explanation: "Bees, butterflies, birds, and wind carry pollen between flowers — without pollination, most plants couldn't make seeds! 🐝" },
      { question: "What are the stages of a flowering plant's life cycle?", options: ["Seed → germination → seedling → mature plant → flower → pollination → seed", "Rain → soil → seed → plant → flower", "Flower → seed → tree → fruit → death", "Sprout → flower → germination → growth"], correctIndex: 0, explanation: "The plant life cycle is a loop: seeds sprout, grow, flower, get pollinated, make new seeds — then the cycle begins again! 🔄" },
      { question: "How do plants disperse (spread) their seeds?", options: ["Wind, water, animals, or pods that burst open", "Only by falling to the ground below", "By birds eating roots", "Seeds can only travel by water"], correctIndex: 0, explanation: "Dandelion seeds float on wind, coconuts float on water, berries get eaten by animals, and peas burst from pods! 🌬️🌊🐦" },
      { question: "What role does chlorophyll play in plants?", options: ["It absorbs sunlight and makes leaves green — essential for photosynthesis", "It absorbs water from rain", "It attracts insects for pollination", "It protects leaves from cold weather"], correctIndex: 0, explanation: "Chlorophyll is the green pigment in leaves that captures light energy — it's why plants are green and why they can make food! 💚" },
      { question: "What is the difference between sexual and asexual reproduction in plants?", options: ["Sexual needs two parents (pollination); asexual needs one (runners, cuttings, bulbs)", "Sexual is slower; asexual is impossible in nature", "All plants only reproduce sexually through flowers", "Asexual means seeds; sexual means runners"], correctIndex: 0, explanation: "Strawberry plants spread by runners (asexual). Flowering plants use pollination (sexual). Both strategies help plants survive! 🍓" },
    ],
    hard: [
      { question: "What are the inputs and outputs of photosynthesis?", options: ["Inputs: CO₂ + water + light energy → Outputs: glucose + oxygen", "Inputs: oxygen + sunlight → Outputs: CO₂ + glucose", "Inputs: nitrogen + water → Outputs: glucose + CO₂", "Inputs: glucose + oxygen → Outputs: CO₂ + water"], correctIndex: 0, explanation: "6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂. This reaction in leaves literally produces the oxygen we breathe! 🔬" },
      { question: "What is the difference between monocots and dicots?", options: ["Monocots have one seed leaf and parallel veins; dicots have two seed leaves and branching veins", "Monocots have two seed leaves; dicots have one", "Monocots only grow in tropical climates; dicots only in cold", "Monocots reproduce asexually; dicots reproduce by flowers"], correctIndex: 0, explanation: "Grasses, lilies, and corn are monocots. Sunflowers, oaks, and roses are dicots. You can tell by the leaf veins! 🌾" },
      { question: "How does transpiration benefit plants and the environment?", options: ["It cools the plant, draws water up from roots, and contributes to rainfall", "It only removes waste gases that plants don't need", "It stores water in leaves for dry periods", "It has no environmental benefit — it's just water loss"], correctIndex: 0, explanation: "Transpiration creates a water column from root to leaf. The Amazon releases so much water vapour it creates its own rainfall! 🌴" },
      { question: "What is the function of xylem and phloem in plants?", options: ["Xylem carries water and minerals up from roots; phloem carries glucose from leaves to all parts", "Both carry water from roots to leaves", "Xylem carries glucose; phloem carries water", "Xylem and phloem are both types of root structure"], correctIndex: 0, explanation: "Xylem and phloem are the plant's transport system — like arteries and veins in animals! Xylem goes up; phloem goes in all directions. 🌿" },
      { question: "Why do some plants have colourful flowers or sweet nectar?", options: ["To attract specific pollinators like bees, butterflies, and birds by colour and scent", "To warn animals not to eat them", "To absorb more sunlight for photosynthesis", "To protect themselves from rain damage"], correctIndex: 0, explanation: "Flowers evolved to attract their pollinators — bees see UV patterns, moths are attracted by white scented night flowers! 🐝🌸" },
      { question: "What is alternation of generations in plant life cycles?", options: ["Plants alternate between a diploid (sporophyte) phase producing spores and a haploid (gametophyte) phase producing gametes", "Plants change between flowering and non-flowering years", "Different plant generations grow in different seasons", "Plants alternate between sexual and asexual reproduction randomly"], correctIndex: 0, explanation: "Mosses and ferns have very obvious alternation of generations. In flowering plants, the gametophyte is tiny (pollen/ovule)! 🌿" },
    ],
  },
  // ── SCIENCE: Animal Habitats ──────────────────────────────────────────────
  {
    match: ["animal habitat"],
    easy: [
      { question: "What is a habitat?", options: ["The natural place where an animal lives", "An animal's food", "The way an animal moves", "An animal's colour"], correctIndex: 0, explanation: "A habitat provides everything an animal needs: food, water, shelter, and space to breed! 🌿" },
      { question: "Which animals live in the cold polar habitat?", options: ["Polar bears, penguins, and arctic foxes", "Lions, elephants, and giraffes", "Dolphins, sharks, and turtles", "Monkeys, parrots, and sloths"], correctIndex: 0, explanation: "Polar animals have thick fur or feathers, layers of blubber, and special adaptations for freezing conditions! 🐧❄️" },
      { question: "What is special about camels that helps them in the desert?", options: ["They store fat in their humps and can go days without water", "They breathe through gills", "Their thick fur keeps them cool", "They eat sand for nutrition"], correctIndex: 0, explanation: "Camels store energy as fat in their humps. Their nostrils close against sandstorms and their wide feet stop them sinking in sand! 🐪" },
      { question: "What type of habitat do rainforest animals live in?", options: ["Hot, wet forests with many trees and high rainfall", "Cold, dry forests with few trees", "Sandy beaches with no trees", "Icy mountains with snow"], correctIndex: 0, explanation: "Rainforests have the most biodiversity on Earth — over half of all species live in them! 🌴🦜" },
      { question: "What do we call it when animals sleep through winter?", options: ["Hibernation", "Migration", "Camouflage", "Adaptation"], correctIndex: 0, explanation: "Bears, hedgehogs, and bats hibernate — slowing their heartbeat and metabolism to survive cold months! 🐻❄️" },
      { question: "What is an ocean habitat?", options: ["A watery habitat covering most of Earth where fish and whales live", "A freshwater lake where frogs live", "A dry area near the sea", "A coral reef found on land"], correctIndex: 0, explanation: "Oceans cover 71% of Earth and are home to an enormous variety of life — from tiny plankton to enormous blue whales! 🐳" },
    ],
    medium: [
      { question: "What is an adaptation?", options: ["A special feature that helps an animal survive in its habitat", "An animal moving to a new habitat in winter", "An animal eating a different diet each season", "An animal protecting itself by hiding"], correctIndex: 0, explanation: "Adaptations evolve over thousands of generations — polar bears are white for camouflage, fish have gills to breathe underwater! 🦁" },
      { question: "Why do some animals migrate?", options: ["To find warmer climates and food in winter; to breed in their original habitat", "Because they are chased by predators", "To find better sleeping spots", "Because water floods their habitat"], correctIndex: 0, explanation: "Wildebeest migrate 1,800 km following rainfall. Arctic terns travel 70,000 km per year — the longest migration of any animal! 🦩" },
      { question: "What are the five main habitat types on Earth?", options: ["Ocean, rainforest, desert, grassland, polar/tundra", "Forest, lake, river, beach, sky", "Jungle, mountain, cave, swamp, volcano", "Tropical, temperate, arctic, underwater, underground"], correctIndex: 0, explanation: "Each habitat has unique conditions — temperature, rainfall, vegetation — that suit specific animals and plants! 🌍" },
      { question: "Why are polar bears white?", options: ["Camouflage — their white fur blends with snow to help them hunt", "To reflect sunlight and stay cool", "White fur is thicker and warmer than coloured fur", "To scare away predators on the ice"], correctIndex: 0, explanation: "Polar bear fur also appears white but is actually transparent — it carries UV light to their black skin to absorb heat! 🐻‍❄️" },
      { question: "What makes rainforests so biodiverse?", options: ["Warm temperatures, abundant rainfall, year-round sunlight, and many habitat layers", "They have the largest animals in the world", "They are never disturbed by humans", "The soil is very nutrient-rich"], correctIndex: 0, explanation: "Rainforests have canopy, understorey, and forest floor layers — each with different species. This layering creates thousands of microhabitats! 🌴" },
      { question: "How do animals in the desert stay cool and conserve water?", options: ["Being active at night, thick skin, concentrated urine, and sheltering during the day", "Drinking constantly from desert wells", "Eating cacti to get water", "Only living near oasis areas"], correctIndex: 0, explanation: "Many desert animals are nocturnal — avoiding daytime heat. Kangaroo rats never need to drink — they get water from seeds! 🦎" },
    ],
    hard: [
      { question: "What is an ecological niche?", options: ["The specific role an organism plays in its ecosystem — what it eats, when it's active, how it behaves", "The physical location where an animal sleeps", "The geographic range of a species", "The size of an animal's territory"], correctIndex: 0, explanation: "No two species share exactly the same niche — competition leads one species to specialise, reducing conflict (competitive exclusion principle)! 🦁" },
      { question: "What is a keystone species?", options: ["A species with a disproportionately large effect on its ecosystem; removing it causes major disruption", "The most numerous species in a habitat", "The largest predator at the top of the food chain", "A species that can survive in multiple different habitats"], correctIndex: 0, explanation: "Sea otters are keystone — they eat sea urchins. Without otters, urchins overpopulate and devour kelp forests, destroying the whole ecosystem! 🦦" },
      { question: "What is habitat fragmentation and why is it a problem?", options: ["When habitats are broken into isolated patches by roads/development, preventing gene flow and increasing extinction risk", "When animals create their own smaller territories within a large habitat", "When habitats change naturally with the seasons", "When invasive species divide existing animal populations"], correctIndex: 0, explanation: "Isolated populations lose genetic diversity, can't recover from disasters, and face inbreeding. Habitat corridors help reconnect fragments! 🛣️" },
      { question: "How does the food web differ from a food chain?", options: ["A food chain is a single sequence; a food web shows all the interconnected feeding relationships in an ecosystem", "A food web only shows what predators eat; a food chain shows everything", "They are two names for the same thing", "A food chain is for land; a food web is for ocean ecosystems"], correctIndex: 0, explanation: "Real ecosystems have thousands of interconnected feeding relationships. Removing one species ripples through the entire web! 🕸️" },
      { question: "What is convergent evolution in terms of habitat adaptation?", options: ["Unrelated species in similar habitats independently evolving similar features", "When two species share the same ancestor", "When species migrate to a new habitat and change rapidly", "When all animals in a habitat evolve at the same rate"], correctIndex: 0, explanation: "Dolphins (mammals) and sharks (fish) both evolved streamlined bodies for water. Similar problems (fast swimming) → similar solutions! 🐬🦈" },
      { question: "How does climate change threaten animal habitats?", options: ["Shifting climate zones, habitat loss, changing food availability, ocean acidification, and extreme weather events", "It only affects polar habitats, not tropical ones", "It makes habitats larger but less diverse", "Climate change increases rainfall everywhere, helping most animals"], correctIndex: 0, explanation: "Species must adapt, migrate, or face extinction as their habitats shift faster than evolution can keep up with! 🌡️" },
    ],
  },
  // ── SCIENCE: Simple Machines ──────────────────────────────────────────────
  {
    match: ["simple machine"],
    easy: [
      { question: "What is a lever?", options: ["A bar that pivots on a fulcrum to lift heavy objects more easily", "A type of wheel used in cars", "A type of ramp in a playground", "A machine that uses electricity"], correctIndex: 0, explanation: "A see-saw is a lever — one side goes up, the other goes down. It makes lifting heavy things much easier! 🎭" },
      { question: "What is an inclined plane?", options: ["A ramp or sloped surface", "A type of aircraft", "A flat surface that spins", "A wedge used in cutting"], correctIndex: 0, explanation: "A ramp (inclined plane) lets you push something up a gentle slope instead of lifting it straight up — much less effort! 📐" },
      { question: "What simple machine is a knife or axe?", options: ["A wedge", "A lever", "A pulley", "A screw"], correctIndex: 0, explanation: "A wedge has a thin edge that concentrates force into a tiny point — perfect for cutting, splitting, or separating! 🔪" },
      { question: "What does a pulley do?", options: ["Changes the direction of a force, making lifting easier", "Rolls things along the ground", "Screws into surfaces", "Amplifies sound"], correctIndex: 0, explanation: "A pulley lets you pull down on a rope to lift something up — and using more pulleys together reduces the effort needed! 🪤" },
      { question: "What are the 6 types of simple machines?", options: ["Lever, inclined plane, wedge, screw, pulley, wheel and axle", "Gear, spring, motor, belt, chain, ramp", "Hammer, nail, saw, ruler, scissors, pliers", "Push, pull, lift, slide, spin, cut"], correctIndex: 0, explanation: "All machines — no matter how complex — are built from combinations of these 6 simple machines! ⚙️" },
      { question: "What is a wheel and axle?", options: ["A wheel attached to a rod (axle) that turns together to make moving easier", "Two wheels connected by a chain", "A wheel used only in vehicles", "A type of pulley system"], correctIndex: 0, explanation: "Doorknobs, steering wheels, and car wheels are all wheel-and-axle machines — turning the wide wheel turns the axle with less effort! 🚗" },
    ],
    medium: [
      { question: "What is the fulcrum of a lever?", options: ["The fixed pivot point that the lever rotates around", "The object being lifted", "The force applied to the lever", "The length of the lever arm"], correctIndex: 0, explanation: "Moving the fulcrum closer to the load means you need a longer effort arm — but less force to lift it! 🎭" },
      { question: "How does an inclined plane make work easier?", options: ["It spreads the effort over a longer distance, so less force is needed", "It removes gravity from the equation", "It increases the speed of the object", "It reduces the weight of the object"], correctIndex: 0, explanation: "Work = Force × Distance. A ramp uses more distance (length of slope) to reduce the force needed — total work stays the same! 📐" },
      { question: "How does a screw work as a simple machine?", options: ["It is a twisted inclined plane — rotating it converts rotational force into linear (forward) motion", "It cuts like a wedge", "It lifts like a pulley", "It rolls like a wheel and axle"], correctIndex: 0, explanation: "The thread of a screw is like an inclined plane wrapped around a cylinder. Each rotation drives it forward by one 'pitch'! 🔩" },
      { question: "What is mechanical advantage?", options: ["The ratio of output force to input force — how much a machine multiplies force", "The speed increase provided by a machine", "The amount of energy a machine uses", "The number of moving parts in a machine"], correctIndex: 0, explanation: "MA = Load ÷ Effort. A machine with MA of 5 means you apply 1N and get 5N of output force — at the cost of more distance! ⚙️" },
      { question: "What is a compound machine?", options: ["Two or more simple machines working together (e.g., scissors = levers + wedges)", "A machine powered by electricity", "A very large single machine", "A machine that cannot be broken down further"], correctIndex: 0, explanation: "Scissors combine two levers AND two wedges. A bicycle combines wheels, gears, levers, and screws! 🚲" },
      { question: "Why is it impossible for a machine to be 100% efficient?", options: ["Friction always wastes some energy as heat", "Simple machines always make things harder", "Energy is always destroyed inside machines", "Gravity reduces the output of all machines"], correctIndex: 0, explanation: "Friction between moving parts converts useful energy to heat. Even a well-oiled machine loses some energy — conservation of energy still applies! 🔥" },
    ],
    hard: [
      { question: "What is the Law of the Lever, as stated by Archimedes?", options: ["Load × load distance = Effort × effort distance; a longer effort arm reduces force needed", "Force = Mass × Acceleration applies to all levers", "The lever always multiplies force by a factor of 2", "Load distance is always equal to effort distance"], correctIndex: 0, explanation: "Archimedes said 'Give me a lever long enough and I shall move the world!' A 10m arm vs 1m load arm gives 10× mechanical advantage! ⚖️" },
      { question: "How does a block and tackle pulley system reduce effort?", options: ["Each additional pulley wheel halves the required force, but doubles the distance the rope must be pulled", "More pulleys eliminate the need for force entirely", "More pulleys increase force without changing distance", "The system only changes direction, never force"], correctIndex: 0, explanation: "With 4 pulleys, you lift 100kg with only 25kg of force — but you must pull 4× as much rope. Total work stays the same! 🪤" },
      { question: "In scientific terms, what is 'work' and does a simple machine reduce it?", options: ["Work = Force × Distance; machines don't reduce total work — they trade force for distance (or vice versa)", "Work = Force ÷ Time; machines reduce work by speeding things up", "Machines reduce work by eliminating gravity", "Work = Mass × Speed; machines increase work by adding speed"], correctIndex: 0, explanation: "Conservation of energy: Work In = Work Out (minus friction losses). Machines let you use less force over more distance — same total work! ⚡" },
      { question: "How does the pitch of a screw relate to its mechanical advantage?", options: ["Smaller pitch (more thread turns per cm) means greater mechanical advantage but requires more turns", "Larger pitch always provides more force", "Pitch has no effect on mechanical advantage", "The pitch only affects the direction of force, not the amount"], correctIndex: 0, explanation: "The inclined plane analogy: a screw with 10 threads per cm travels 1mm per rotation — less force needed, more turns required! 🔩" },
      { question: "How do machines in the human body act as levers?", options: ["Bones are levers, joints are fulcrums, and muscles provide the effort force", "Muscles act as pulleys pulling bones in straight lines", "The spine is a wheel and axle", "The human body does not contain levers"], correctIndex: 0, explanation: "Your forearm is a class 3 lever — elbow is fulcrum, bicep muscle is effort, and you lift a load in your hand. Most body levers have high MA for speed, not force! 💪" },
      { question: "What is the difference between a class 1, 2, and 3 lever?", options: ["Class 1: fulcrum between load and effort (seesaw); Class 2: load between fulcrum and effort (wheelbarrow); Class 3: effort between fulcrum and load (tweezers)", "Class 1 is biggest; Class 3 is smallest", "All levers are the same; classification is historical", "Class 1 multiplies force; Class 2 reduces it; Class 3 changes direction"], correctIndex: 0, explanation: "Class 1 = versatile (seesaw, scissors). Class 2 = always multiplies force (wheelbarrow, nutcracker). Class 3 = increases speed/range (fishing rod, tweezers)! ⚖️" },
    ],
  },
  // ── READING: Story Elements ───────────────────────────────────────────────
  {
    match: ["story element"],
    easy: [
      { question: "What is the setting of a story?", options: ["Where and when the story takes place", "Who the main character is", "The problem in the story", "How the story ends"], correctIndex: 0, explanation: "Setting includes the place (a castle, a city, a forest) and the time (medieval times, the future, summer)! 🏰" },
      { question: "Who are the characters in a story?", options: ["The people, animals, or creatures the story is about", "The places in the story", "The events that happen", "The words the author uses"], correctIndex: 0, explanation: "Characters can be humans, animals, or even objects — anyone who acts and drives the story forward! 👤" },
      { question: "What is the problem in a story called?", options: ["The conflict", "The setting", "The theme", "The resolution"], correctIndex: 0, explanation: "The conflict is the central problem or challenge the main character must face and overcome! ⚔️" },
      { question: "What is the resolution of a story?", options: ["When the problem is solved and the story ends", "The most exciting moment in the story", "When a new problem appears", "The beginning of the story"], correctIndex: 0, explanation: "The resolution is how the conflict is solved — it gives the reader a satisfying conclusion! 🎉" },
      { question: "What is the theme of a story?", options: ["The main message or lesson the author wants readers to learn", "The type of book (adventure, mystery)", "The title of the story", "The longest chapter in the book"], correctIndex: 0, explanation: "Themes are big ideas like friendship, courage, or honesty — they give stories meaning beyond the plot! 💡" },
      { question: "What is the climax of a story?", options: ["The most exciting and tense moment, usually when the main conflict reaches its peak", "The beginning of the story", "The moment the hero meets the villain", "The last sentence of the story"], correctIndex: 0, explanation: "The climax is the turning point — everything before leads to it; everything after flows from it! 🎭" },
    ],
    medium: [
      { question: "What is the plot of a story?", options: ["The sequence of events from beginning to end, including conflict and resolution", "Just the exciting parts of the story", "The place where the story happens", "The characters' descriptions"], correctIndex: 0, explanation: "Plot follows a story arc: Exposition → Rising Action → Climax → Falling Action → Resolution. Most stories follow this shape! 📈" },
      { question: "What is the difference between protagonist and antagonist?", options: ["Protagonist is the main character (hero); antagonist opposes them (villain or obstacle)", "Protagonist is the villain; antagonist is the hero", "They are two words for the same character", "Protagonist appears at the start; antagonist appears at the end"], correctIndex: 0, explanation: "Antagonists aren't always evil people — they can be nature, society, or even the protagonist's own fears! 🎭" },
      { question: "What are the five stages of a story's plot structure?", options: ["Exposition, rising action, climax, falling action, resolution", "Beginning, middle, problem, solution, ending", "Introduction, conflict, adventure, victory, epilogue", "Setup, journey, battle, win, conclusion"], correctIndex: 0, explanation: "Freytag's Pyramid maps most stories: setup → building tension → peak → unwinding → conclusion! 📊" },
      { question: "What is point of view in storytelling?", options: ["The perspective from which the story is told (first person = I, third person = he/she)", "Where the author stands when writing", "The opinion the author has about the theme", "The moral lesson of the story"], correctIndex: 0, explanation: "First person (I, me) creates intimacy. Third person limited follows one character. Third person omniscient knows everyone's thoughts! 📖" },
      { question: "What makes a character 'round' rather than 'flat'?", options: ["A round character is complex, has multiple traits, and changes over the story; a flat character has one simple trait", "A round character is always the hero; flat characters are always villains", "Round characters have more dialogue; flat characters are described more", "Round and flat refer to physical appearance descriptions"], correctIndex: 0, explanation: "Harry Potter is round — brave but also insecure, loyal but sometimes reckless. He grows throughout the series! 🧙" },
      { question: "What is foreshadowing in a story?", options: ["Hints and clues early in the story about what will happen later", "When an author repeats a key phrase throughout the story", "When a story jumps back in time to explain past events", "When the main character makes a prediction that comes true"], correctIndex: 0, explanation: "Foreshadowing builds suspense and makes re-reads rewarding — you spot all the hints you missed the first time! 🔮" },
    ],
    hard: [
      { question: "What is the difference between external and internal conflict?", options: ["External: character vs outside forces (person, nature, society); Internal: conflict within the character's own mind, emotions, or morals", "External conflicts are always more important than internal ones", "External conflict happens outdoors; internal conflict happens indoors", "Internal conflict is when two characters argue; external is when they fight physically"], correctIndex: 0, explanation: "The most compelling stories often weave both — Hamlet's external revenge quest vs his internal paralysis of conscience! 🎭" },
      { question: "What is dramatic irony?", options: ["When the audience knows something important that the characters do not", "When a character says the opposite of what they mean", "When an unexpected event happens that reverses the situation", "When dialogue is humorous because of misunderstanding"], correctIndex: 0, explanation: "In Romeo and Juliet, we know Juliet is sleeping — not dead. Romeo's grief is agonising because we know the truth! 🎭" },
      { question: "What is the 'hero's journey' narrative structure?", options: ["A 12-stage story pattern where a hero leaves ordinary life, faces challenges in a special world, and returns transformed", "Any story where the main character wins in the end", "A story structure used only in fantasy and adventure genres", "A pattern where the hero fails and learns a lesson"], correctIndex: 0, explanation: "Joseph Campbell identified this universal pattern across myths worldwide. Star Wars, Harry Potter, and The Lion King all follow it! ⚔️" },
      { question: "What is a foil character and what purpose does it serve?", options: ["A character whose contrasting traits highlight or emphasise the main character's qualities", "A character who betrays the protagonist", "A secondary character who provides comic relief", "A character who appears briefly but changes the plot significantly"], correctIndex: 0, explanation: "Hermione's rule-following contrasts Harry's instinctive bravery, making both characters clearer. Dr Jekyll's goodness makes Mr Hyde's evil starker! 📚" },
      { question: "How does narrative distance affect the reader's experience?", options: ["Closer distance (first-person, intimate third) creates emotion and empathy; distant narration creates objectivity", "Narrative distance only matters in non-fiction writing", "First-person always creates more narrative distance than third-person", "Distance refers to how long the story is, not the narration style"], correctIndex: 0, explanation: "Close third-person (limited to one character's experience) vs omniscient (god-like view of all characters) creates completely different reader experiences! 📖" },
      { question: "What is a narrative arc and how does it differ between tragedy and comedy in classical literature?", options: ["Tragedy: protagonist rises then falls catastrophically. Comedy: protagonist overcomes obstacles to reach a happy resolution", "Tragedy has no climax; comedy has multiple climaxes", "Both have identical arcs — only the ending tone differs", "Comedy protagonists face external conflict; tragedies have only internal conflict"], correctIndex: 0, explanation: "Shakespeare's tragedies peak at the climax then spiral down (Macbeth, Hamlet). His comedies resolve confusion into celebration! 🎭" },
    ],
  },
  // ── READING: Reading Comprehension ───────────────────────────────────────
  {
    match: ["reading comprehension"],
    easy: [
      { question: "What is the main idea of a text?", options: ["The most important point the author is making", "The first sentence of the text", "The title of the passage", "Every detail mentioned in the passage"], correctIndex: 0, explanation: "The main idea is the central message — everything else in the text supports or explains it! 📖" },
      { question: "What are supporting details?", options: ["Facts, examples, or reasons that back up the main idea", "Unrelated interesting facts in the text", "The title and headings of the text", "The final sentence of each paragraph"], correctIndex: 0, explanation: "If the main idea is 'dogs make great pets', supporting details might be: they are loyal, playful, and trainable! 🐕" },
      { question: "What does 'inference' mean when reading?", options: ["Using clues in the text to work out something not directly stated", "Looking up difficult words in a dictionary", "Reading only the first and last sentence", "Counting the number of paragraphs"], correctIndex: 0, explanation: "If the text says 'She grabbed her umbrella and raincoat', you infer it's raining — without the author saying so! ☂️" },
      { question: "What does 'summarising' a text mean?", options: ["Retelling the key points in your own words, briefly", "Copying the most important sentences word for word", "Writing what you liked and disliked about the text", "Drawing a picture of what happened in the text"], correctIndex: 0, explanation: "A summary includes who, what, where, when, and why — but only the most important information! 📝" },
      { question: "What are context clues?", options: ["Words and sentences around an unfamiliar word that help you work out its meaning", "Pictures next to difficult words", "The glossary at the back of the book", "The chapter headings"], correctIndex: 0, explanation: "If you don't know 'enormous', but the text says 'enormous — it was the biggest elephant anyone had ever seen', you can guess it means very large! 🐘" },
      { question: "What is the difference between a fact and an opinion?", options: ["A fact can be proven true; an opinion is what someone believes or feels", "A fact is always interesting; an opinion is always boring", "Facts are long sentences; opinions are short", "They are the same — all writing is fact"], correctIndex: 0, explanation: "Fact: 'The Eiffel Tower is in Paris.' Opinion: 'The Eiffel Tower is the most beautiful building in the world.' One can be checked! 🗼" },
    ],
    medium: [
      { question: "What is the author's purpose in a persuasive text?", options: ["To convince the reader to agree with a viewpoint or take an action", "To entertain with a fictional story", "To explain how something works", "To list facts without any opinion"], correctIndex: 0, explanation: "Persuasive texts use evidence, emotional language, and rhetorical techniques to influence the reader's beliefs! 📢" },
      { question: "What is the difference between implicit and explicit information?", options: ["Explicit information is stated directly; implicit information is implied and must be inferred", "Implicit information is always more important", "Explicit means hidden; implicit means obvious", "They refer to the same type of information in a text"], correctIndex: 0, explanation: "Authors often imply rather than state — great readers pick up both the words AND the meanings between the lines! 🔍" },
      { question: "What text structures do non-fiction writers use to organise ideas?", options: ["Cause-effect, compare-contrast, problem-solution, chronological, and descriptive", "Introduction, conflict, climax, and resolution", "Verse, chorus, bridge, and outro", "Paragraph, section, chapter, and volume"], correctIndex: 0, explanation: "Recognising text structure helps you predict what's coming next and understand how ideas connect! 📊" },
      { question: "How can you identify bias in a text?", options: ["Look for one-sided arguments, emotional language, missing viewpoints, or unsupported claims", "Any text written in first person is biased", "Bias only appears in newspapers, not in books", "Texts with facts are biased; texts with opinions are not"], correctIndex: 0, explanation: "All writers have perspectives that shape their writing. Critical readers question whose viewpoint is being presented and whose is missing! 🔍" },
      { question: "What is the difference between a primary and secondary source?", options: ["Primary: original source (diary, speech, photograph); Secondary: analysis or account of primary sources (textbook, biography)", "Primary sources are always more reliable than secondary", "Primary sources are older; secondary sources are recent", "A primary source is the first chapter; secondary is everything after"], correctIndex: 0, explanation: "A soldier's diary is primary — raw, personal, immediate. A history book analysing the war is secondary — interpreted and synthesised! 📚" },
      { question: "What is synthesising in reading?", options: ["Combining information from multiple texts or sources to form a new overall understanding", "Writing a summary of a single text", "Identifying the main idea across chapters", "Memorising and repeating information from a text"], correctIndex: 0, explanation: "Synthesising is like making a smoothie — you combine different ingredients (texts/ideas) into something new! 🥤" },
    ],
    hard: [
      { question: "What is critical reading and how does it differ from surface reading?", options: ["Critical reading questions the text's assumptions, purpose, and bias; surface reading accepts information at face value", "Critical reading is slower; surface reading is faster", "Critical reading is for non-fiction only; surface reading suits fiction", "Critical reading involves making notes; surface reading does not"], correctIndex: 0, explanation: "Critical readers ask: Who wrote this? Why? What's left out? Whose perspective is missing? Is evidence sufficient? 🔍" },
      { question: "How do authors use structural and language features to create effects?", options: ["Short paragraphs create pace; sensory language creates imagery; repetition emphasises; varied sentence length creates rhythm", "Long paragraphs always mean important information", "Authors only use language features in fiction, not non-fiction", "Language features are decorative and don't affect meaning"], correctIndex: 0, explanation: "A master author's every word choice is intentional — the structure IS part of the meaning, not just how it's dressed! ✍️" },
      { question: "What is intertextuality in literature?", options: ["When a text references, alludes to, or builds upon other texts or cultural works", "When two authors write about the same topic independently", "When a text is adapted into a film", "When the same character appears in two different books"], correctIndex: 0, explanation: "T.S. Eliot's The Waste Land is full of references to Shakespeare, the Bible, and ancient myths. Readers who catch them gain deeper meaning! 📚" },
      { question: "How does narrative perspective affect reliability and reader trust?", options: ["First-person narrators may be unreliable — their emotions, limited knowledge, or dishonesty affect what we're told; third-person omniscient is generally more reliable", "First-person is always the most reliable because it's personal experience", "All narrators in fiction are equally reliable", "Third-person narrators are always the main character in disguise"], correctIndex: 0, explanation: "Unreliable narrators like Stevens in The Remains of the Day or Nick Carraway in The Great Gatsby force us to read between the lines! 📖" },
      { question: "What is the difference between denotation and connotation in language?", options: ["Denotation is a word's literal dictionary meaning; connotation is the emotional or cultural associations it carries", "Denotation applies to adjectives; connotation applies to nouns", "Denotation is the figurative meaning; connotation is the literal meaning", "They are two terms for the same concept in different dialects"], correctIndex: 0, explanation: "'Home' and 'house' both mean a building where people live (denotation) — but 'home' connotes warmth, belonging, and memory! 🏡" },
      { question: "How do active and passive reading strategies differ in academic contexts?", options: ["Active reading involves questioning, annotating, predicting, and connecting; passive reading is receiving information without engagement", "Active reading is faster; passive reading takes more time", "Active reading is used for fiction; passive reading suits academic texts", "Passive reading requires more mental effort than active reading"], correctIndex: 0, explanation: "Research shows active reading (annotating, asking questions, connecting to prior knowledge) dramatically improves comprehension and retention! 📝" },
    ],
  },
  // ── READING: Creative Writing ─────────────────────────────────────────────
  {
    match: ["creative writing"],
    easy: [
      { question: "What is fiction?", options: ["A story that is made up from the imagination", "A true story about real events", "A collection of facts", "A poem with rhyming lines"], correctIndex: 0, explanation: "Fiction stories are invented — the characters, events, and places may not be real, but they feel real when well-written! 📖" },
      { question: "What is a simile?", options: ["A comparison using 'like' or 'as' (e.g., as fast as lightning)", "A made-up word that sounds funny", "A very long sentence in a story", "The ending of a story"], correctIndex: 0, explanation: "Similes make descriptions vivid: 'Her smile was like sunshine' — you instantly picture a warm, happy face! ☀️" },
      { question: "What is dialogue in a story?", options: ["When characters speak to each other, shown with speech marks", "The description of a character's appearance", "The setting of the story", "The narrator's thoughts about the plot"], correctIndex: 0, explanation: "Dialogue brings characters to life — 'I'm terrified!' is far more engaging than 'The character felt afraid.' 💬" },
      { question: "What makes a good story opening?", options: ["A hook that grabs the reader's attention straight away", "Starting with 'Once upon a time' every time", "Beginning with a long description of the setting", "Listing all the characters that will appear"], correctIndex: 0, explanation: "Great openings throw you into the action, ask a question, or create instant intrigue — 'The day everything changed started with a locked door.' 🚪" },
      { question: "What is a metaphor?", options: ["A comparison that says one thing IS another (e.g., the classroom was a zoo)", "A comparison that uses 'like' or 'as'", "A word that sounds like the noise it describes", "A very descriptive sentence"], correctIndex: 0, explanation: "Metaphors are stronger than similes — not 'the night was like a dark blanket' but 'the night was a dark blanket smothering the city'! 🌃" },
      { question: "What is a paragraph?", options: ["A group of related sentences focused on one idea, starting on a new line", "Every sentence in a story", "The title and opening line of a piece of writing", "A type of punctuation mark"], correctIndex: 0, explanation: "New paragraphs signal new time, place, speaker, or idea — they organise your writing for the reader! 📝" },
    ],
    medium: [
      { question: "What does 'show, don't tell' mean in writing?", options: ["Describe actions, senses, and details that let the reader experience emotions rather than naming them", "Use lots of descriptive adjectives in every sentence", "Show your writing to someone before publishing it", "Avoid using the word 'I' in your writing"], correctIndex: 0, explanation: "'She was angry' = telling. 'She slammed the door so hard the pictures rattled' = showing. The second puts you in the scene! 🚪" },
      { question: "How does varying sentence length improve writing?", options: ["Short sentences create tension and pace; long sentences build atmosphere; mixing both creates rhythm", "Short sentences are always better than long ones", "All sentences should be roughly the same length for consistency", "Only poetry benefits from varied sentence length"], correctIndex: 0, explanation: "Short. Sharp. Tense. Then a longer sentence that draws you deeper into the atmosphere of the scene, making you feel the contrast! ✍️" },
      { question: "What is personification?", options: ["Giving human qualities or emotions to non-human things (e.g., the wind whispered secrets)", "Describing a character in great detail", "Writing from a character's point of view", "Using the word 'person' in a description"], correctIndex: 0, explanation: "Personification makes the world alive: 'The old house groaned under the weight of its memories' — the house feels alive and sad! 🏚️" },
      { question: "What is the narrative structure and why is it important?", options: ["The organised framework of beginning, middle, and end that gives a story shape and purpose", "The type of narrator (first or third person) chosen for the story", "The setting and characters described at the start of a story", "A type of grammar rule for writing sentences"], correctIndex: 0, explanation: "Good structure means readers always know roughly where they are in the story — creating expectation, tension, and satisfaction! 📊" },
      { question: "What is the purpose of using sensory language in creative writing?", options: ["To describe sights, sounds, smells, tastes, and touch so the reader experiences the story vividly", "To make writing harder and more impressive-sounding", "To prove the writer has a large vocabulary", "To satisfy a list of required language features"], correctIndex: 0, explanation: "The smell of baking bread, the creak of a floorboard, the gritty taste of sea air — sensory detail transports readers into the scene! 👃" },
      { question: "What is a narrative hook and where does it appear?", options: ["An engaging opening that grabs the reader's attention immediately, at the very start of the story", "A surprising twist that appears in the middle of the story", "A satisfying sentence that ends each chapter", "A cliffhanger that ends the whole story"], correctIndex: 0, explanation: "Classic hooks: in-medias-res (start in the action), a striking image, a provocative question, or a shocking statement! 🎣" },
    ],
    hard: [
      { question: "What is 'in medias res' and why do authors use it?", options: ["Starting the story in the middle of the action; it creates immediate engagement before filling in backstory", "Writing the middle of a story before the beginning and end", "A Latin term meaning 'the most important part'", "Beginning every chapter with a dramatic event"], correctIndex: 0, explanation: "The Iliad begins in the 10th year of the Trojan War. Odyssey begins with Odysseus at sea. Plunging in grabs readers immediately! ⚔️" },
      { question: "What is the difference between subtext and text in dialogue?", options: ["Text is what characters say; subtext is what they really mean or feel beneath the words", "Text is the narrative; subtext is the dialogue", "Subtext only exists in stage plays, not prose fiction", "They are two terms for the same thing in different types of writing"], correctIndex: 0, explanation: "'I'm fine,' she said, not meeting his eyes — the subtext (hurt, anger, exhaustion) tells us more than the words do! 💬" },
      { question: "What is narrative voice and how does it shape reader experience?", options: ["The distinctive tone, style, and personality of the narrator that colours every aspect of the story", "The type of narration (first or third person)", "The volume and pace of speech in dialogue", "The number of words the narrator uses per page"], correctIndex: 0, explanation: "Holden Caulfield's cynical voice in Catcher in the Rye makes the same events feel completely different from how an optimistic narrator would tell them! 📖" },
      { question: "What is pathetic fallacy and how is it different from personification?", options: ["Pathetic fallacy uses weather/environment to reflect characters' emotions; personification gives human traits to any non-human thing", "They are identical devices with different names", "Pathetic fallacy only uses light and dark imagery; personification uses movement", "Personification is only used in poetry; pathetic fallacy only in prose"], correctIndex: 0, explanation: "A storm that mirrors a character's rage is pathetic fallacy. A storm that 'howled angrily' is personification. Often they overlap! ⛈️" },
      { question: "How does the concept of 'voice' differ from 'style' in creative writing?", options: ["Voice is the distinct personality and perspective of the writer; style is the technical choices (sentence structure, word choice, imagery) that express it", "Voice means dialogue; style means description", "They are interchangeable terms for the same writing concept", "Voice is for poetry; style is for prose fiction"], correctIndex: 0, explanation: "You recognise Hemingway's sparse, direct prose (style) and his masculine, stoic worldview (voice) — both are part of what makes him unmistakably Hemingway! ✍️" },
      { question: "What is the purpose of an unreliable narrator?", options: ["To create ambiguity, engage the reader in detective-like questioning, and explore how subjective perception shapes truth", "To confuse readers deliberately so they give up", "To show that the author made mistakes in planning the story", "To create a character the reader automatically distrusts and dislikes"], correctIndex: 0, explanation: "We gradually realise Stevens in The Remains of the Day is lying to himself about his past. This forces us to be active, critical readers! 📖" },
    ],
  },
  // ── READING: Grammar Basics ───────────────────────────────────────────────
  {
    match: ["grammar"],
    easy: [
      { question: "What is a noun?", options: ["A word that names a person, place, thing, or idea", "A word that describes an action", "A word that connects two ideas", "A word that describes a noun"], correctIndex: 0, explanation: "Dog, London, happiness, teacher — all nouns! Nouns are the building blocks of sentences. 🐕" },
      { question: "What is a verb?", options: ["A word that describes an action or state of being", "A word that names a person or thing", "A word that describes how something is done", "A word that connects sentences"], correctIndex: 0, explanation: "Run, think, is, have, believe — verbs make things happen in sentences! Without a verb, you don't have a sentence. 🏃" },
      { question: "What is an adjective?", options: ["A word that describes or modifies a noun", "A word describing an action", "A connecting word", "A naming word"], correctIndex: 0, explanation: "Tall, red, ancient, delicious — adjectives paint a picture of nouns! 'The ancient red door' is much more vivid than 'the door'. 🎨" },
      { question: "What punctuation mark ends a sentence that asks a question?", options: ["A question mark (?)", "A full stop (.)", "An exclamation mark (!)", "A comma (,)"], correctIndex: 0, explanation: "Always end questions with (?). 'Where are you going?' — the question mark signals you want an answer! ❓" },
      { question: "What is a pronoun?", options: ["A word that replaces a noun to avoid repetition (he, she, it, they)", "A word that comes before a noun", "A very important noun", "A word that connects clauses"], correctIndex: 0, explanation: "Instead of 'Sarah said Sarah was tired', we say 'Sarah said she was tired' — pronouns prevent awkward repetition! 👤" },
      { question: "What is a capital letter used for?", options: ["To start a sentence and for proper nouns (names of people, places, days)", "To make a word look more important", "Only for the title of a piece of writing", "To show the word is a noun"], correctIndex: 0, explanation: "Capital letters signal the start of sentences and identify proper nouns: Monday, England, Harry, December! 🔠" },
    ],
    medium: [
      { question: "What is an adverb?", options: ["A word that modifies a verb, adjective, or another adverb (quickly, very, extremely)", "A word that describes a noun", "A word connecting two independent clauses", "A word that replaces a noun"], correctIndex: 0, explanation: "He ran quickly (modifies verb). She was extremely tired (modifies adjective). Adverbs fine-tune your meaning! 🚀" },
      { question: "What is a conjunction?", options: ["A word that joins clauses or ideas (and, but, because, although, since)", "A word that describes a noun in detail", "A punctuation mark that links words", "A verb that connects the subject to the predicate"], correctIndex: 0, explanation: "Co-ordinating conjunctions join equals (and, but, or). Subordinating conjunctions (because, although) create dependent clauses! 🔗" },
      { question: "What is a preposition?", options: ["A word showing the relationship between a noun and another word (in, on, under, beside, through)", "A word that comes before a verb", "A type of pronoun used for places", "A word that introduces a question"], correctIndex: 0, explanation: "The cat sat on the mat. Under the table. Through the door. Before noon. Prepositions tell us WHERE or WHEN! 📍" },
      { question: "What is the difference between common and proper nouns?", options: ["Common nouns are general (city, dog); proper nouns name specific things and are capitalised (London, Fido)", "Common nouns are used often; proper nouns are rare", "Proper nouns are always plural; common nouns are always singular", "Common nouns are short; proper nouns are long"], correctIndex: 0, explanation: "city → London. river → Thames. Month → January. Whenever you name something specific, capitalise it — it's a proper noun! 🌍" },
      { question: "What is the difference between past, present, and future tense?", options: ["Past = already happened; Present = happening now; Future = will happen", "Past uses 'will'; Present uses 'was'; Future uses 'is'", "Tense only applies to regular verbs, not irregular ones", "Future tense always uses 'shall'; past tense always uses 'were'"], correctIndex: 0, explanation: "She ran (past). She runs (present). She will run (future). Tense shows WHEN the action happens! ⏰" },
      { question: "What is a complex sentence?", options: ["A sentence with a main clause AND at least one subordinate clause", "A very long sentence with many adjectives", "A sentence with more than one verb", "A sentence that uses technical vocabulary"], correctIndex: 0, explanation: "'Although it was raining (subordinate clause), she went outside (main clause)' — the subordinate clause can't stand alone! 🌧️" },
    ],
    hard: [
      { question: "What is a subordinate clause?", options: ["A group of words with a subject and verb that cannot stand alone as a sentence (e.g., 'because it was raining')", "The most important part of a sentence", "A clause that contains the main action of the sentence", "Any clause that begins with a conjunction"], correctIndex: 0, explanation: "'Because it was raining' has a subject (it) and verb (was raining) — but it's incomplete without a main clause. It subordinates to: 'She stayed home.' 🌧️" },
      { question: "What is the difference between active and passive voice?", options: ["Active: subject does the action ('The dog bit the man'); Passive: subject receives the action ('The man was bitten by the dog')", "Active voice uses present tense; passive uses past tense", "Active voice is informal; passive voice is always formal", "Passive sentences always have 'is' or 'was' before the verb"], correctIndex: 0, explanation: "Scientists use passive voice ('the experiment was conducted') to sound objective. Active voice is stronger and more direct for most writing! ✍️" },
      { question: "What is a dangling modifier?", options: ["A descriptive phrase that doesn't clearly refer to the word it's meant to modify", "An adjective placed at the end of a sentence incorrectly", "A verb with no subject attached", "An adverb that modifies two different verbs simultaneously"], correctIndex: 0, explanation: "'Running down the street, the rain got heavier.' Was the rain running? No — the runner was! 'Running down the street, she felt the rain get heavier.' ✅ 🌧️" },
      { question: "What is the Oxford comma and when is it needed?", options: ["A comma before 'and' in a list of three or more items; needed when omitting it creates ambiguity", "A comma used before every 'and' in all writing contexts", "A comma used only in academic or formal writing", "The comma that separates a subordinate clause from the main clause"], correctIndex: 0, explanation: "'I love my parents, Lady Gaga and Humpty Dumpty' — are Lady Gaga and Humpty Dumpty the parents? Oxford comma fixes this: 'parents, Lady Gaga, and Humpty Dumpty'! 😂" },
      { question: "What is the subjunctive mood?", options: ["A verb form expressing wishes, hypothetical situations, or conditions contrary to fact (e.g., 'If I were king...')", "The past tense of all irregular verbs", "A polite way to phrase requests and commands", "The form verbs take in questions"], correctIndex: 0, explanation: "'If I were you...' (not 'was'). 'She insisted that he be present.' The subjunctive expresses conditions that may not be real! 👑" },
      { question: "What is the difference between a phrase and a clause?", options: ["A clause has both a subject and a verb; a phrase lacks one or both", "A phrase is longer than a clause", "A clause is always an independent sentence; a phrase can be dependent", "Phrases only contain nouns; clauses only contain verbs"], correctIndex: 0, explanation: "'In the morning' = phrase (no subject-verb pair). 'When the sun rises' = clause (sun = subject, rises = verb, but depends on a main clause)! ☀️" },
    ],
  },
  // ── READING: Spelling Strategies ─────────────────────────────────────────
  {
    match: ["spelling"],
    easy: [
      { question: "What are vowels in the English alphabet?", options: ["A, E, I, O, U", "B, C, D, F, G", "A, B, C, D, E", "All letters that make long sounds"], correctIndex: 0, explanation: "The five vowels make many different sounds. Y can sometimes act as a vowel too (in 'gym' or 'sky')! 🔤" },
      { question: "What is a consonant?", options: ["Any letter that is not a vowel (like B, C, D, F, G...)", "The letters A, E, I, O, U", "Any letter that makes a 's' sound", "Letters that never appear at the end of words"], correctIndex: 0, explanation: "There are 21 consonants in the English alphabet. They work together with vowels to form syllables! 🔤" },
      { question: "What trick helps you spell 'because'?", options: ["Big Elephants Can Always Understand Small Elephants (B-E-C-A-U-S-E)", "Brown Eggs Cook And Use Small Energy", "B comes before E and C", "Because has four syllables"], correctIndex: 0, explanation: "Mnemonics are memory tricks! 'Big Elephants Can Always Understand Small Elephants' spells B-E-C-A-U-S-E perfectly! 🐘" },
      { question: "What does 'sounding out' a word mean?", options: ["Saying each letter sound separately to help you spell the word", "Reading a word very loudly", "Guessing a word by its shape", "Spelling a word backwards to check it"], correctIndex: 0, explanation: "Breaking 'fantastic' into sounds (f-a-n-t-a-s-t-i-c) helps you spell each part correctly! 🔊" },
      { question: "What is a syllable?", options: ["A unit of sound in a word, usually containing a vowel (fan-tas-tic = 3 syllables)", "A type of vowel sound", "A group of consonants", "A word with only one vowel"], correctIndex: 0, explanation: "Clap the beats: fan (1) - tas (2) - tic (3). Counting syllables helps you spell longer words part by part! 👏" },
      { question: "What does silent 'e' at the end of a word do?", options: ["Makes the vowel before it say its long sound (cap → cape, hop → hope)", "Makes no difference to pronunciation", "Makes the whole word silent", "Changes the consonant before it"], correctIndex: 0, explanation: "The magic 'e' reaches back and makes the vowel say its name: hat/hate, bit/bite, cut/cute! 🪄" },
    ],
    medium: [
      { question: "What is a digraph?", options: ["Two letters that together make one sound (ch, sh, th, ph, wh)", "Two vowels that appear together in a word", "A double consonant like 'll' or 'tt'", "A silent letter at the end of a word"], correctIndex: 0, explanation: "ch = one sound (chair). sh = one sound (ship). ph = f sound (phone). Digraphs are two letters, one sound! 🔊" },
      { question: "What is the 'i before e' spelling rule?", options: ["'i before e except after c' — believe, receive, deceive", "E always comes before I in English words", "Use 'ei' after any vowel; use 'ie' after consonants", "The rule applies only to words of French origin"], correctIndex: 0, explanation: "beli-EVE, achi-EVE (ie after consonants). rec-EI-ve, conc-EI-t (ei after c). But WEIRD, SEIZE are exceptions! 📚" },
      { question: "What is a homophone?", options: ["Two words that sound the same but have different spellings and meanings (there/their, to/too/two)", "Two words that are spelled the same but mean different things", "A word that sounds like the noise it describes", "A word that has both a prefix and a suffix"], correctIndex: 0, explanation: "There/their/they're. To/too/two. Your/you're. Homophones are one of the most common spelling errors! 👂" },
      { question: "What happens to most words when you add '-ing' to one ending in a short vowel + consonant?", options: ["Double the final consonant (run → running, sit → sitting, swim → swimming)", "Just add -ing with no other changes", "Drop the last letter, then add -ing", "Add an 'e' before -ing"], correctIndex: 0, explanation: "Short vowel + single consonant → double it! run→running, hop→hopping. Long vowel: read→reading, no doubling needed! ✏️" },
      { question: "What does the prefix 'un-' mean?", options: ["Not, or the opposite of (unhappy = not happy, unkind, unfair)", "Again or back", "Before or in advance", "Too much or excessively"], correctIndex: 0, explanation: "Prefixes change meaning. un- = not. re- = again. pre- = before. mis- = wrongly. Learning prefixes helps you spell AND understand thousands of words! 🔤" },
      { question: "What is etymology and how does it help with spelling?", options: ["The study of word origins and history; knowing roots helps spell and understand unfamiliar words", "The study of vowel sounds in English", "A method of spelling by sounding out words phonetically", "The rules governing punctuation in different contexts"], correctIndex: 0, explanation: "'Photo' comes from Greek 'phos' (light). Knowing this explains photograph, photosynthesis, photon — all about light! 💡" },
    ],
    hard: [
      { question: "What is the spelling rule for words ending in '-ful'?", options: ["Always one 'l' (beautiful, careful, hopeful) — never 'full' at the end of an adjective", "Use '-full' for adjectives and '-ful' for adverbs", "The spelling depends on whether the word comes from French or Anglo-Saxon", "It alternates: one-syllable bases use '-full'; multi-syllable bases use '-ful'"], correctIndex: 0, explanation: "Careful not carfull. Hopeful not hopefull. The '-ful' suffix always has single 'l' — unlike the word 'full' standing alone! ✏️" },
      { question: "What is the difference between a prefix and a suffix?", options: ["Prefix: added to the start of a word (pre-, un-, re-, mis-); Suffix: added to the end (-tion, -ful, -less, -ing)", "Prefix changes meaning; suffix changes spelling only", "Both are added to the end of words — they just have different grammatical effects", "Suffixes come from Latin; prefixes come from Greek"], correctIndex: 0, explanation: "Prefixes and suffixes are morphemes — meaning units. Understanding them helps you decode thousands of unfamiliar words! 🔤" },
      { question: "Why do some English words have silent letters?", options: ["Silent letters reflect historical pronunciation or word origins from other languages (French, Latin, Greek)", "Silent letters are always mistakes in old dictionaries", "Silent letters exist to make words look more impressive", "All silent letters will eventually be removed from English spelling"], correctIndex: 0, explanation: "'Knight' used to be pronounced with all letters. 'Wednesday' was Wōdnesdæg. English preserves history in its spelling! 🏰" },
      { question: "What is a morpheme and why is it useful for spelling?", options: ["The smallest unit of meaning in a language; knowing morphemes helps spell complex words by breaking them into meaningful parts", "A syllable that contains at least one vowel sound", "A word that cannot be broken down into smaller parts", "An alternative term for a root word in Latin-derived vocabulary"], correctIndex: 0, explanation: "Un-break-able has 3 morphemes: un (not) + break (the root) + able (capable of). Each part has consistent spelling! 🔬" },
      { question: "What is the '-tion'/'-sion'/'-cion' spelling pattern?", options: ["'-tion' is most common (nation, action); '-sion' after consonants d/s/r (tension, invasion); '-cion' is very rare (suspicion)", "All three endings sound different and can be used interchangeably", "'-sion' is always used after vowels; '-tion' always after consonants", "They are identical in sound and can always replace each other"], correctIndex: 0, explanation: "Nation, action, fiction (‑tion). Television, explosion, mansion (‑sion). The sound pattern helps: 'shun' sound → ‑tion; 'zhun' sound → ‑sion! 📚" },
      { question: "How does understanding Greek and Latin roots help with spelling technical vocabulary?", options: ["Roots like 'bio' (life), 'graph' (write), 'tele' (far) appear consistently spelled across thousands of words", "Greek roots are always shorter than Latin roots", "Technical vocabulary follows completely different spelling rules from everyday words", "Only medical vocabulary benefits from knowing Greek and Latin roots"], correctIndex: 0, explanation: "Biology, biography, biography — 'bio' always spelled the same. Telescope, telephone, television — 'tele' is constant. Roots = spelling patterns! 🔬" },
    ],
  },
  // ── GEOGRAPHY: Countries and Capitals ────────────────────────────────────
  {
    match: ["countries and capitals", "countries and capital"],
    easy: [
      { question: "What is the capital city of France?", options: ["Paris", "Lyon", "Berlin", "Madrid"], correctIndex: 0, explanation: "Paris is the capital of France and home to the Eiffel Tower! 🗼" },
      { question: "What is the capital city of Japan?", options: ["Tokyo", "Osaka", "Kyoto", "Hiroshima"], correctIndex: 0, explanation: "Tokyo is Japan's capital — one of the largest cities in the world! 🗾" },
      { question: "What is the capital of the United States?", options: ["Washington D.C.", "New York City", "Los Angeles", "Chicago"], correctIndex: 0, explanation: "Washington D.C. (District of Columbia) was purpose-built as the US capital! 🏛️" },
      { question: "What is the capital of Australia?", options: ["Canberra", "Sydney", "Melbourne", "Brisbane"], correctIndex: 0, explanation: "Many people guess Sydney, but Canberra is Australia's capital — chosen as a compromise between Sydney and Melbourne! 🦘" },
      { question: "What is the capital of China?", options: ["Beijing", "Shanghai", "Hong Kong", "Guangzhou"], correctIndex: 0, explanation: "Beijing (meaning 'Northern Capital') has been China's capital for centuries! 🐉" },
      { question: "What is the capital of Brazil?", options: ["Brasília", "São Paulo", "Rio de Janeiro", "Salvador"], correctIndex: 0, explanation: "Brasília was purpose-built as Brazil's capital in 1960 — Rio de Janeiro was the capital before! 🌿" },
    ],
    medium: [
      { question: "What is the capital of Canada?", options: ["Ottawa", "Toronto", "Vancouver", "Montreal"], correctIndex: 0, explanation: "Ottawa is Canada's capital, located in Ontario near the Quebec border! 🍁" },
      { question: "What is the capital of Russia?", options: ["Moscow", "St. Petersburg", "Vladivostok", "Novosibirsk"], correctIndex: 0, explanation: "Moscow is Russia's capital and largest city, home to the Kremlin and Red Square! 🏛️" },
      { question: "What is the capital of Egypt?", options: ["Cairo", "Alexandria", "Luxor", "Giza"], correctIndex: 0, explanation: "Cairo is one of Africa's largest cities and Egypt's capital — near the famous Pyramids of Giza! 🐪" },
      { question: "What is the capital of India?", options: ["New Delhi", "Mumbai", "Kolkata", "Chennai"], correctIndex: 0, explanation: "New Delhi is India's capital — not to be confused with Delhi, the old city surrounding it! 🕌" },
      { question: "What is the capital of South Africa?", options: ["Pretoria (administrative capital)", "Cape Town", "Johannesburg", "Durban"], correctIndex: 0, explanation: "South Africa has THREE capitals: Pretoria (executive), Cape Town (legislative), and Bloemfontein (judicial)! 🦁" },
      { question: "What is the capital of Argentina?", options: ["Buenos Aires", "Córdoba", "Mendoza", "Rosario"], correctIndex: 0, explanation: "Buenos Aires (meaning 'Good Airs') is Argentina's capital and largest city! 🌮" },
    ],
    hard: [
      { question: "What is the capital of Kazakhstan?", options: ["Astana (now Nur-Sultan)", "Almaty", "Shymkent", "Karaganda"], correctIndex: 0, explanation: "Kazakhstan moved its capital from Almaty to Astana in 1997! It was renamed Nur-Sultan in 2019 then back to Astana in 2022! 🏙️" },
      { question: "What is the capital of Myanmar (Burma)?", options: ["Naypyidaw", "Yangon (Rangoon)", "Mandalay", "Bagan"], correctIndex: 0, explanation: "Myanmar moved its capital from Yangon to the purpose-built Naypyidaw in 2006 — one of the least visited capitals in the world! 🏛️" },
      { question: "Which country has two official capital cities: Sucre (constitutional) and La Paz (seat of government)?", options: ["Bolivia", "Ecuador", "Peru", "Colombia"], correctIndex: 0, explanation: "Bolivia has the world's highest seat of government — La Paz at 3,640m altitude! Constitutional capital Sucre is Bolivia's legal capital! 🏔️" },
      { question: "What is the capital of Bhutan?", options: ["Thimphu", "Paro", "Punakha", "Wangdue"], correctIndex: 0, explanation: "Thimphu is Bhutan's capital — one of only two national capitals (with Lhasa) that has no traffic lights! 🏔️" },
      { question: "What is the capital of Papua New Guinea?", options: ["Port Moresby", "Lae", "Mount Hagen", "Rabaul"], correctIndex: 0, explanation: "Port Moresby is Papua New Guinea's capital — PNG has over 800 languages, the most linguistic diversity of any country! 🌴" },
      { question: "Which European country has The Hague as its seat of government but Amsterdam as its constitutional capital?", options: ["Netherlands", "Belgium", "Switzerland", "Denmark"], correctIndex: 0, explanation: "The Netherlands has a split: Amsterdam is the constitutional capital; The Hague hosts the government, parliament, and Supreme Court! 🌷" },
    ],
  },
  // ── GEOGRAPHY: Continents and Oceans ─────────────────────────────────────
  {
    match: ["continent", "ocean"],
    easy: [
      { question: "How many continents are there on Earth?", options: ["7", "5", "6", "8"], correctIndex: 0, explanation: "The 7 continents are: Africa, Antarctica, Asia, Australia, Europe, North America, and South America! 🌍" },
      { question: "What is the largest continent?", options: ["Asia", "Africa", "North America", "Europe"], correctIndex: 0, explanation: "Asia is the largest continent, covering about 30% of Earth's land area and home to 60% of the world's population! 🌏" },
      { question: "How many oceans are there?", options: ["5", "4", "3", "7"], correctIndex: 0, explanation: "There are 5 oceans: Pacific, Atlantic, Indian, Southern (around Antarctica), and Arctic! 🌊" },
      { question: "What is the largest ocean?", options: ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Southern Ocean"], correctIndex: 0, explanation: "The Pacific Ocean is the largest and deepest, covering about 30% of Earth's surface — bigger than all land combined! 🌊" },
      { question: "Which continent is also a country?", options: ["Australia", "Africa", "Antarctica", "Europe"], correctIndex: 0, explanation: "Australia is the only country that occupies an entire continent! It's also the smallest continent! 🦘" },
      { question: "Which continent is at the South Pole?", options: ["Antarctica", "South America", "Africa", "Australia"], correctIndex: 0, explanation: "Antarctica surrounds the South Pole and is covered by an ice sheet up to 4.8 km thick — the coldest place on Earth! ❄️" },
    ],
    medium: [
      { question: "What are the 7 continents from largest to smallest?", options: ["Asia, Africa, North America, South America, Antarctica, Europe, Australia", "Asia, North America, Africa, South America, Europe, Antarctica, Australia", "Africa, Asia, North America, South America, Europe, Australia, Antarctica", "Asia, Europe, Africa, North America, South America, Antarctica, Australia"], correctIndex: 0, explanation: "Remember: 'A Fat Nun Shall Always Eat Apples' → Asia, Africa, North America, South America, Antarctica, Europe, Australia! 🌍" },
      { question: "Which ocean lies between Africa and Australia?", options: ["Indian Ocean", "Pacific Ocean", "Atlantic Ocean", "Southern Ocean"], correctIndex: 0, explanation: "The Indian Ocean is the third largest ocean, bordered by Africa, Asia, Australia, and Antarctica! 🌊" },
      { question: "What is an archipelago?", options: ["A group or chain of islands", "A type of ocean current", "The meeting point of two continents", "A very deep ocean trench"], correctIndex: 0, explanation: "Indonesia, the Philippines, and Japan are all archipelagos — thousands of islands formed by volcanic activity! 🏝️" },
      { question: "Which two continents are in the Western Hemisphere?", options: ["North America and South America", "North America and Europe", "South America and Africa", "Europe and Asia"], correctIndex: 0, explanation: "The Western Hemisphere (west of the Prime Meridian) contains North America and South America — the 'Americas'! 🌎" },
      { question: "What ocean lies between Europe/Africa and North/South America?", options: ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Arctic Ocean"], correctIndex: 0, explanation: "The Atlantic Ocean separates the Old World (Europe/Africa) from the New World (Americas) — crossed by Columbus in 1492! 🚢" },
      { question: "Why is Antarctica considered a continent but the Arctic is not?", options: ["Antarctica is a landmass covered by ice; the Arctic is frozen ocean (sea ice) over water with no land", "Both are continents but the Arctic is too cold to be classified officially", "The Arctic has permanent residents; Antarctica does not", "Antarctica is larger so it qualifies; the Arctic is too small"], correctIndex: 0, explanation: "If you melted the Antarctic ice, there would be a landmass beneath. Under Arctic sea ice? Just ocean — 4,000+ metres of it! 🌊" },
    ],
    hard: [
      { question: "What is continental drift and who proposed the theory?", options: ["Alfred Wegener proposed that continents were once joined as Pangaea and have drifted apart over millions of years", "Charles Darwin proposed that continents evolved separately over time", "The theory was developed collectively — no single person proposed it", "The idea was first proposed by Galileo as he studied ocean currents"], correctIndex: 0, explanation: "Wegener noticed Africa and South America's coastlines fit like puzzle pieces. We now know tectonic plates carry continents at 2-5 cm per year! 🧩" },
      { question: "How do tectonic plates relate to ocean formation?", options: ["Plates spread apart at mid-ocean ridges, creating new ocean floor; subduction zones pull old ocean floor back into the mantle", "Oceans form where tectonic plates collide and sink", "Plates have no direct relationship to ocean formation", "Ocean floors are static; only continents move on plates"], correctIndex: 0, explanation: "The Mid-Atlantic Ridge is spreading 2.5 cm per year — meaning the Atlantic Ocean is getting wider! Iceland sits right on the ridge! 🌋" },
      { question: "What is the Mariana Trench and what is significant about it?", options: ["The deepest point on Earth (11,000m), located in the Pacific Ocean — deeper than Everest is tall", "The longest ocean trench, running 2,500 km through the Atlantic", "The world's largest coral reef structure", "A giant underwater canyon formed by glaciers"], correctIndex: 0, explanation: "The Challenger Deep in the Mariana Trench is ~11,000m deep. Only 3 humans have reached the bottom — fewer than have walked on the Moon! 🌊" },
      { question: "How do ocean currents affect global climate?", options: ["Warm currents carry tropical heat to cold regions (like Gulf Stream warming Northern Europe); cold currents cool coastal areas", "Ocean currents only affect rainfall, not temperature", "Currents create wind patterns but don't affect temperature", "Only surface currents affect climate; deep currents have no effect"], correctIndex: 0, explanation: "Without the Gulf Stream, the UK would have a climate like Canada. Ocean currents are Earth's conveyor belt of heat distribution! 🌊🌡️" },
      { question: "What evidence supports the theory of plate tectonics?", options: ["Matching fossils and rock types on separated continents, sea floor spreading, earthquake patterns, and GPS measurements of plate movement", "The round shape of the Earth proves continents must have moved", "Ocean depth measurements show where plates have separated", "The theory is still controversial and lacks strong evidence"], correctIndex: 0, explanation: "Identical fossil ferns found in Antarctica, India, Africa, and South America — all from Gondwana, a supercontinent 200 million years ago! 🦕" },
      { question: "What is the 'Ring of Fire' and which tectonic activity causes it?", options: ["A horseshoe-shaped zone of volcanoes and earthquakes around the Pacific, caused by oceanic plates subducting under continental plates", "A zone of hot deserts caused by intense solar radiation around the Pacific", "The network of mid-ocean ridges where new ocean floor is created", "A pattern of ocean temperatures that produces tropical storms"], correctIndex: 0, explanation: "75% of Earth's volcanoes and 90% of earthquakes occur in the Ring of Fire — where Pacific plate subduction creates enormous geological activity! 🌋" },
    ],
  },
  // ── GEOGRAPHY: Cultures and Traditions ───────────────────────────────────
  {
    match: ["culture", "tradition"],
    easy: [
      { question: "What is culture?", options: ["The way of life, beliefs, traditions, and values shared by a group of people", "The climate and weather of a country", "The government and laws of a nation", "The geographical features of a region"], correctIndex: 0, explanation: "Culture includes language, music, food, art, clothing, celebrations, and beliefs — everything that makes a community unique! 🎭" },
      { question: "In which country do people celebrate Diwali?", options: ["India", "Japan", "Brazil", "Egypt"], correctIndex: 0, explanation: "Diwali is the Hindu festival of lights — celebrated across India and in Indian communities worldwide with lamps, fireworks, and sweets! 🪔" },
      { question: "What is a tradition?", options: ["A custom or practice passed down through generations", "A new celebration invented in the last 10 years", "A type of food eaten in one country only", "A law enforced by the government"], correctIndex: 0, explanation: "Christmas trees, Eid feasts, Japanese tea ceremonies — traditions connect communities across generations! 🎄" },
      { question: "What is a language?", options: ["A system of words, sounds, and grammar used by people to communicate", "A type of writing system only", "The accent or dialect used in one region", "A formal way of communicating used only in schools"], correctIndex: 0, explanation: "There are about 7,000 languages in the world! Language is one of the most important parts of culture! 🗣️" },
      { question: "What celebration marks the Chinese Lunar New Year?", options: ["A 15-day festival with family, fireworks, dumplings, and the colour red for good luck", "A one-day quiet reflection and prayer", "A music festival held every February", "A sports competition between provinces"], correctIndex: 0, explanation: "Chinese New Year is the most important festival in Chinese culture — celebrations can last 15 days with dragon dances, red envelopes, and feasts! 🐉" },
      { question: "What is Ramadan?", options: ["The Islamic holy month of fasting from dawn to sunset and increased prayer", "An Islamic music festival held annually", "A month of gift-giving in Muslim cultures", "The Islamic new year celebrated with fireworks"], correctIndex: 0, explanation: "During Ramadan, Muslims fast (no food or drink) from dawn to sunset, pray, give to charity, and reflect — it ends with Eid al-Fitr! 🌙" },
    ],
    medium: [
      { question: "What are the key components of culture?", options: ["Language, religion, food, music, art, clothing, customs, and beliefs", "Climate, geography, and natural resources", "Government, economy, and military strength", "Population size, wealth, and technology level"], correctIndex: 0, explanation: "Culture is everything a group creates and shares — material (food, clothing, art) and non-material (beliefs, values, customs)! 🎭" },
      { question: "What is cultural diffusion?", options: ["When cultural elements spread from one culture to another through contact, trade, migration, or media", "When cultures disappear due to modernisation", "When a country bans elements from foreign cultures", "When immigrants are required to adopt the new country's culture"], correctIndex: 0, explanation: "Pizza spread from Italy worldwide. Jazz spread from New Orleans globally. Cultural diffusion enriches societies — it's always happened throughout history! 🍕🎷" },
      { question: "What are indigenous cultures?", options: ["The original cultures of peoples who lived in a place before outside groups arrived", "Cultures found only in remote rainforest regions", "Ancient cultures that no longer exist", "Cultures based entirely on hunter-gatherer lifestyles"], correctIndex: 0, explanation: "Aboriginal Australians, Native Americans, Māori in New Zealand — indigenous peoples maintain traditions stretching back thousands of years! 🌿" },
      { question: "How does geography affect cultural practices?", options: ["Climate, landscape, and available resources shape food, clothing, shelter styles, and traditions", "Geography only affects what languages people speak", "Cultural practices are completely independent of where people live", "Geography only matters for ancient cultures, not modern ones"], correctIndex: 0, explanation: "Mongolian nomads developed yurt tents for mobility on the steppe. Arctic peoples developed thick fur clothing. Environment shapes culture! 🏕️" },
      { question: "What is UNESCO's role in protecting world heritage?", options: ["It identifies and protects sites of outstanding cultural and natural importance worldwide", "It creates new cultural practices for developing countries", "It enforces laws against cultural discrimination globally", "It manages the Olympic Games and cultural sporting events"], correctIndex: 0, explanation: "UNESCO World Heritage Sites include the Great Wall, Machu Picchu, the Pyramids, and the Great Barrier Reef — protected for all humanity! 🏛️" },
      { question: "What is the significance of food in culture?", options: ["Food reflects history, geography, religion, trade connections, and social values of a culture", "Food traditions are purely practical and have no cultural significance", "Only formal ceremonial foods carry cultural meaning", "Food traditions are identical across all cultures in the same climate zone"], correctIndex: 0, explanation: "Japanese sushi reflects a seafood-rich island nation. Indian spices reflect centuries of trade. Food tells a culture's whole history! 🍜" },
    ],
    hard: [
      { question: "What is globalisation's effect on local cultures?", options: ["It spreads ideas, technology, and products globally but can threaten local languages, traditions, and cultural uniqueness", "Globalisation only benefits cultures by exposing them to new ideas", "It has no meaningful effect on traditional practices", "Globalisation strengthens local cultures by creating pride in distinctiveness"], correctIndex: 0, explanation: "Half of the world's 7,000 languages may disappear this century as English and Mandarin dominate. Cultural homogenisation is a real concern! 🌐" },
      { question: "What is the difference between cultural appropriation and cultural appreciation?", options: ["Appropriation: taking elements without understanding or respect, often for profit; Appreciation: engaging respectfully, learning about and honouring the culture", "Appropriation happens only when done by powerful cultures; appreciation occurs between equal cultures", "They are the same thing described from different political perspectives", "Appropriation is always illegal; appreciation is always legal"], correctIndex: 0, explanation: "Context and intent matter enormously. Wearing sacred symbols as Halloween costumes is appropriation. Studying and respectfully participating in cultural ceremonies can be appreciation! 🎭" },
      { question: "How do multicultural societies benefit from cultural diversity?", options: ["They gain diverse perspectives, problem-solving approaches, foods, arts, languages, and economic innovation", "Multicultural societies are always more unstable than homogeneous ones", "Diversity only benefits economies through tourism", "Cultural diversity only matters in art and entertainment, not in business or politics"], correctIndex: 0, explanation: "Silicon Valley's diversity drives innovation. Diverse teams consistently outperform homogeneous ones in problem-solving and creativity! 💡" },
      { question: "What is ethnocentrism and why is it problematic?", options: ["Judging other cultures by the standards of one's own culture; it's problematic because it prevents genuine understanding and creates bias", "A belief that all cultures are equally valid", "The study of different ethnic groups within one country", "Pride in one's own cultural heritage without criticising others"], correctIndex: 0, explanation: "18th-century European colonisers called indigenous practices 'primitive' by their own standards — ethnocentrism justified exploitation and cultural destruction! 🌍" },
      { question: "What is cultural relativism and what are its limits?", options: ["Understanding cultural practices within their own context; limited by the argument that no practice can then be universally criticised (e.g., harmful practices)", "The belief that all cultural practices are equally morally acceptable", "A scientific method for comparing cultures objectively", "The theory that cultures evolve along the same universal path"], correctIndex: 0, explanation: "Cultural relativism is essential for respectful anthropology — but taken to extremes, it prevents us from criticising practices like FGM or slavery even within their cultural contexts! ⚖️" },
      { question: "How does diaspora affect cultural identity?", options: ["Diaspora communities maintain, adapt, and blend their original culture with the host culture, creating hybrid identities", "Diaspora communities always completely adopt the host culture within one generation", "Diaspora has no effect on culture — people maintain their original culture unchanged", "Diaspora only affects food and music, not deeper cultural values"], correctIndex: 0, explanation: "British-Indian, Chinese-American, Caribbean-British — diaspora cultures are creative syntheses, not losses. They also transform their host cultures! 🌍" },
    ],
  },
  // ── GEOGRAPHY: Climate Zones ──────────────────────────────────────────────
  {
    match: ["climate zone", "climate"],
    easy: [
      { question: "What is the difference between weather and climate?", options: ["Weather is day-to-day conditions; climate is the average pattern over 30+ years", "Weather is global; climate is local", "Weather is permanent; climate changes daily", "They mean exactly the same thing"], correctIndex: 0, explanation: "'Climate is what you expect, weather is what you get.' London's climate is mild and wet — today's weather might be sunny! ☀️" },
      { question: "Which climate zone is closest to the Equator?", options: ["Tropical", "Polar", "Temperate", "Desert"], correctIndex: 0, explanation: "The Equator receives the most direct sunlight year-round — creating hot, wet tropical climates with rainforests! 🌴" },
      { question: "What is a desert climate like?", options: ["Very dry with little rainfall and extreme temperature changes between day and night", "Cold and icy all year round", "Hot and wet with dense forest", "Mild with regular rainfall throughout the year"], correctIndex: 0, explanation: "Deserts have less than 250mm of rainfall per year. The Sahara is hot; Antarctica is actually the world's largest cold desert! 🏜️" },
      { question: "Where is the polar climate found?", options: ["Near the North and South Poles", "Near the Equator", "In the middle of large continents", "Only on top of high mountains"], correctIndex: 0, explanation: "Polar climates are bitterly cold year-round with frozen tundra. The Arctic and Antarctic experience months of darkness in winter! 🧊" },
      { question: "What is a temperate climate?", options: ["Mild temperatures with four distinct seasons and regular rainfall throughout the year", "Very hot summers and cold winters with little rain", "Constant warmth with no seasonal change", "Frequent storms and hurricane seasons"], correctIndex: 0, explanation: "The UK, France, and much of Western Europe have temperate climates — no extremes, but four clear seasons! 🍂" },
      { question: "What causes different climate zones on Earth?", options: ["The angle at which sunlight hits Earth — Equator gets direct sunlight; poles get angled sunlight", "Distance from the ocean only", "The height of mountains in each region", "The amount of vegetation covering the ground"], correctIndex: 0, explanation: "The Equator always gets direct (hot) sunlight. The poles get very angled (weak) sunlight — that's why they're cold! ☀️" },
    ],
    medium: [
      { question: "What are the five main climate zones?", options: ["Tropical, dry/arid, temperate, continental, polar", "Hot, warm, cool, cold, freezing", "Equatorial, subtropical, oceanic, Mediterranean, Arctic", "Rainforest, grassland, desert, tundra, alpine"], correctIndex: 0, explanation: "Climate zones: Tropical (hot/wet), Dry (arid/semi-arid), Temperate (mild/seasonal), Continental (extreme seasons), Polar (freezing)! 🌍" },
      { question: "What is a monsoon?", options: ["A seasonal wind shift that brings heavy rainfall, especially to South and Southeast Asia", "A type of tropical hurricane", "A permanent weather pattern in desert regions", "A cold wind from the polar regions"], correctIndex: 0, explanation: "India's monsoon (June-September) brings 80% of annual rainfall. It's essential for agriculture — crops and people depend on it arriving! 🌧️" },
      { question: "How does altitude affect climate?", options: ["Temperature decreases about 6.5°C per 1,000m of altitude; high mountains can have glaciers even near the Equator", "Higher altitude always means more rainfall", "Altitude increases temperature as you get closer to the sun", "Altitude only affects wind speed, not temperature"], correctIndex: 0, explanation: "Mount Kilimanjaro near the Equator has a glacier at its peak — altitude creates a polar climate even in tropical Africa! 🏔️❄️" },
      { question: "What is the Mediterranean climate and where is it found?", options: ["Hot dry summers and mild wet winters; found around the Mediterranean Sea, California, Chile, SW Australia", "Hot wet summers and cold dry winters in Eastern Europe", "A mild rainy climate found only in Mediterranean island nations", "Warm temperatures year-round with distinct rainy and dry seasons"], correctIndex: 0, explanation: "Mediterranean climate suits olive trees, vineyards, and citrus — the same climate in California, Cape Town, and Perth supports similar farming! 🍇" },
      { question: "What is the rain shadow effect?", options: ["Mountains block moisture-carrying winds; the windward side is wet; the leeward (sheltered) side is dry", "Rain always falls more heavily in valleys than on hillsides", "Mountains increase rainfall on both sides equally", "The shadow cast by mountains prevents evaporation in valleys"], correctIndex: 0, explanation: "The Scottish Highlands catch Atlantic rain; eastern Scotland is drier. The Andes create lush western Chile but dry Argentine Patagonia! 🏔️" },
      { question: "How does proximity to the ocean affect climate?", options: ["Coastal areas have milder temperatures (oceans store heat); inland areas have more extreme seasonal temperatures", "Areas near the ocean are always colder than inland areas", "Ocean proximity only affects rainfall, not temperature", "The ocean makes nearby land always warmer than inland areas in all seasons"], correctIndex: 0, explanation: "London (coastal) rarely goes below -10°C or above 35°C. Moscow (continental) regularly experiences both extremes! 🌊" },
    ],
    hard: [
      { question: "What is the Hadley Cell and how does it create tropical and desert climate zones?", options: ["Warm air rises at the Equator (creating rain); cools, spreads, and sinks around 30° latitude (creating deserts like Sahara)", "Cold air sinks at the Equator and rises at the poles, creating equatorial deserts", "The Hadley Cell only operates in the Atlantic Ocean basin", "A Hadley Cell is an ocean current, not an atmospheric circulation pattern"], correctIndex: 0, explanation: "Rising air at the Equator creates low pressure and rain. The sinking air at 30° creates high pressure and dry conditions — explaining why most great deserts sit at 30° latitude! 🌬️" },
      { question: "How do ocean currents affect coastal climates?", options: ["Warm currents raise coastal temperatures (Gulf Stream warms NW Europe); cold currents cool coasts and reduce rainfall (Humboldt in South America)", "Ocean currents only affect rainfall, not temperature", "Cold currents always warm the nearby coast", "Ocean currents only significantly affect tropical coastlines"], correctIndex: 0, explanation: "Without the Gulf Stream, London would have a climate like Labrador, Canada (same latitude). The current transports tropical warmth across the Atlantic! 🌊" },
      { question: "What evidence shows that climate zones have shifted throughout Earth's history?", options: ["Fossil forests in Antarctica, tropical fossils in Greenland, and ancient sand dunes now under rainforests", "Climate zones have always been stable — only short-term weather varies", "Evidence from ocean colour changes visible from satellites", "Only human-caused climate change has shifted climate zones"], correctIndex: 0, explanation: "Antarctica was once covered in rainforest. The Sahara was green and wet 6,000 years ago. Earth's climate system is constantly shifting! 🌍" },
      { question: "How does the ITCZ (Intertropical Convergence Zone) affect tropical weather patterns?", options: ["The ITCZ is where northeast and southeast trade winds meet near the Equator, causing powerful convective rainfall; it shifts seasonally creating wet/dry seasons", "The ITCZ prevents any rain from reaching the Equatorial regions", "The ITCZ is a fixed permanent feature with no seasonal movement", "The ITCZ only affects ocean temperatures, not rainfall patterns on land"], correctIndex: 0, explanation: "As the ITCZ migrates north and south following the sun, it creates the wet and dry seasons in tropical regions — the rhythm of life for billions of people! 🌧️" },
      { question: "How does human-caused climate change affect existing climate zones?", options: ["It shifts climate zones poleward, intensifies precipitation, increases drought frequency, and causes more extreme weather events", "It only affects polar regions, not tropical or temperate zones", "Climate change creates entirely new climate zones that didn't previously exist", "Human activities reduce extreme weather by moderating global temperatures"], correctIndex: 0, explanation: "Mediterranean climate zones are expanding poleward. Tropical wet seasons are becoming more intense. The climate zones we mapped in the 20th century are shifting! 🌡️" },
    ],
  },
  // ── GEOGRAPHY: Natural Wonders ────────────────────────────────────────────
  {
    match: ["natural wonder"],
    easy: [
      { question: "What is the Great Barrier Reef?", options: ["The world's largest coral reef system, off the northeast coast of Australia", "A mountain range in New Zealand", "The world's largest river in South America", "A famous waterfall in Africa"], correctIndex: 0, explanation: "The Great Barrier Reef is visible from space! It covers 2,300 km and supports one of the most biodiverse ecosystems on Earth! 🐠" },
      { question: "Where is the Amazon River?", options: ["South America, mainly in Brazil", "Africa", "Southeast Asia", "North America"], correctIndex: 0, explanation: "The Amazon is the world's largest river by water volume — discharging 20% of all fresh water flowing into oceans! 🌊🌿" },
      { question: "What is Mount Everest?", options: ["The world's tallest mountain, in the Himalayas on the Nepal-China border", "The world's most active volcano in Iceland", "The deepest canyon in the USA", "The longest mountain range in Europe"], correctIndex: 0, explanation: "Mount Everest stands 8,849m above sea level — the highest point on Earth. Over 6,000 people have successfully reached the summit! 🏔️" },
      { question: "What are the Northern Lights?", options: ["Colourful displays of light in the sky near the poles caused by solar particles hitting Earth's atmosphere", "Giant clouds formed over the Arctic", "A reflection of city lights on Arctic clouds", "A type of rainbow only visible near the North Pole"], correctIndex: 0, explanation: "Aurora Borealis (Northern Lights) occur when solar wind particles collide with atmospheric gases — creating spectacular green, pink, and purple light shows! 🌟" },
      { question: "What is the Grand Canyon?", options: ["A massive canyon carved by the Colorado River in Arizona, USA — up to 29km wide and 1.8km deep", "The world's largest waterfall", "A famous gorge in the Himalayas", "A series of deep canyons in the Sahara Desert"], correctIndex: 0, explanation: "The Grand Canyon's rock layers tell 2 billion years of geological history — different-coloured bands show different eras of Earth's past! 🏜️" },
      { question: "What is Victoria Falls?", options: ["One of the world's largest waterfalls, on the border of Zambia and Zimbabwe in Africa", "A famous geyser in Iceland", "A waterfall in Victoria, Australia", "The highest waterfall in South America"], correctIndex: 0, explanation: "Victoria Falls (Mosi-oa-Tunya = 'The Smoke That Thunders') is 1.7km wide — the spray and thunder can be detected 40km away! 💦" },
    ],
    medium: [
      { question: "Why is the Amazon Rainforest called 'the lungs of the Earth'?", options: ["It produces about 6% of Earth's oxygen through photosynthesis and absorbs huge amounts of CO₂", "It regulates rainfall for the entire Southern Hemisphere", "It is the only ecosystem that can convert CO₂ to oxygen", "Its dense canopy prevents solar radiation from heating the ground"], correctIndex: 0, explanation: "The Amazon stores an estimated 86 billion tonnes of carbon. Deforestation releases this, accelerating climate change globally! 🌳" },
      { question: "How was the Grand Canyon formed?", options: ["The Colorado River carved through layered rock over 5-6 million years, exposing 2 billion years of geological history", "A massive earthquake split the rock apart", "Glaciers carved the canyon during the last ice age", "Underground water dissolved the limestone creating a collapse"], correctIndex: 0, explanation: "Water is incredibly powerful over geological time — the Colorado River is still deepening the canyon by about 0.3mm per year! 🌊" },
      { question: "What threats face the Great Barrier Reef?", options: ["Coral bleaching from warming oceans, ocean acidification, pollution, crown-of-thorns starfish, and coastal development", "Overfishing is the only significant threat", "The reef is fully protected and faces no significant threats", "Only cyclones threaten the reef; human activity has minimal impact"], correctIndex: 0, explanation: "50% of the Great Barrier Reef's coral has been lost since 1995. Warmer, more acidic oceans cause bleaching and weaken coral skeletons! 🌡️" },
      { question: "What causes the Northern Lights and why do they appear near the poles?", options: ["Solar wind particles follow Earth's magnetic field lines to the poles, colliding with atmospheric gas and releasing energy as light", "The long polar night creates special atmospheric conditions that produce light", "The Northern Lights are reflections of sunlight from Arctic ice", "Charged particles in the upper atmosphere create light when temperatures drop below -50°C"], correctIndex: 0, explanation: "Earth's magnetic field is strongest at the poles, funnelling solar wind particles there. The colours depend on the gas hit: oxygen→green/red, nitrogen→blue/purple! 🌌" },
      { question: "What geological process formed the Himalayas?", options: ["The Indo-Australian tectonic plate collided with the Eurasian plate, pushing rock upward to form the mountain range", "Volcanic eruptions over millions of years built up the mountains", "Erosion of a high plateau by rivers and glaciers created the peaks", "The Himalayas formed when a large meteor impact pushed rock upward"], correctIndex: 0, explanation: "India is still moving northward at ~5cm per year — the Himalayas are STILL growing taller (about 5mm per year)! 🏔️" },
      { question: "Why is the Galápagos Islands significant as a natural wonder?", options: ["Its isolation produced unique species that inspired Darwin's theory of evolution by natural selection", "It has the world's largest sea turtle population", "It contains active volcanoes making it permanently uninhabitable", "It's the only place on Earth where giant tortoises are found outside zoos"], correctIndex: 0, explanation: "Darwin visited in 1835 and found 13 species of finch, each adapted to different food sources — key evidence for natural selection! 🐢" },
    ],
    hard: [
      { question: "How does the Great Barrier Reef support global biodiversity?", options: ["It covers less than 0.1% of the ocean but supports 25% of all marine species — a 'marine megacity' of biodiversity", "It is the only habitat for all coral species on Earth", "Its biodiversity is significant but limited mainly to fish species", "The reef supports mainly crustaceans and molluscs, with few fish species"], correctIndex: 0, explanation: "Coral reefs are the ocean's rainforests — extraordinary biodiversity in a tiny area. The GBR alone has 1,500 fish species, 4,000 mollusc species! 🐠" },
      { question: "What is the significance of the Serengeti wildebeest migration?", options: ["1.5 million wildebeest (plus zebras and gazelles) make the world's largest land migration, critical for Serengeti-Mara ecosystem health", "The Serengeti migration is the world's oldest recorded migration, documented since ancient times", "The migration is primarily driven by predator pressure rather than rainfall patterns", "Only wildebeest migrate; other species maintain year-round territories"], correctIndex: 0, explanation: "The migration follows rainfall — 1.5M wildebeest, 500K zebras, 200K gazelles crossing crocodile-filled rivers. It fertilises grasslands and feeds hundreds of predator species! 🦬" },
      { question: "How do geysers like Old Faithful form and what makes their eruptions predictable?", options: ["Groundwater seeps near magma, superheats in constricted underground channels, and erupts when pressure builds — predictable due to consistent underground plumbing", "Geysers form where underground gas explosions meet surface water", "Old Faithful erupts predictably because it is controlled by tidal forces from the Moon", "Geysers only form in volcanic calderas and erupt randomly based on seismic activity"], correctIndex: 0, explanation: "Old Faithful erupts approximately every 90 minutes because its underground system fills at a consistent rate. Geologists can predict eruptions 2 hours in advance! ♨️" },
      { question: "What is the role of the Amazon River basin in global climate regulation?", options: ["It recycles 50-75% of its own rainfall through transpiration, creating 'flying rivers' of moisture that water South America; it stores billions of tonnes of carbon", "The Amazon only regulates local weather patterns, not global climate", "Its main climate role is cooling the Southern Hemisphere through evaporation", "The Amazon River basin's climate effects are limited to the immediate surrounding region"], correctIndex: 0, explanation: "Deforestation disrupts the 'flying rivers' of moisture that travel from the Amazon to southern Brazil's farmland. The Amazon's fate affects food production across the continent! 🌳" },
      { question: "How does the formation of coral in the Great Barrier Reef work at a biological level?", options: ["Tiny coral polyps (animals) extract calcium carbonate from water to build external skeletons; symbiotic algae (zooxanthellae) provide nutrients through photosynthesis", "Coral is a type of rock formed from compressed shells over millions of years", "Coral reefs grow from the ocean floor upward as mineral deposits from hydrothermal vents", "Coral is formed by a species of algae that secretes limestone over centuries"], correctIndex: 0, explanation: "The coral-algae symbiosis is critical: stressed by warm water, coral expels its algae, turns white (bleaching), and starves. That's why ocean warming is so devastating! 🌡️" },
    ],
  },
  // ── CODING: What is Programming? ─────────────────────────────────────────
  {
    match: ["what is programming", "introduction to programming"],
    easy: [
      { question: "What is a computer program?", options: ["A set of instructions that tells a computer what to do", "A type of computer hardware", "The screen you look at when using a computer", "A game you play on a computer"], correctIndex: 0, explanation: "Programs are like recipes for computers — step-by-step instructions that tell the computer exactly what to do! 💻" },
      { question: "What do we call the person who writes computer programs?", options: ["A programmer or developer", "A computer operator", "A data processor", "A hardware engineer"], correctIndex: 0, explanation: "Programmers write code that makes apps, websites, games, and software! You could be a programmer too! 👩‍💻" },
      { question: "What is an algorithm?", options: ["A step-by-step set of instructions to solve a problem", "A type of computer hardware", "A programming language", "A computer virus"], correctIndex: 0, explanation: "Even a recipe is an algorithm! Algorithms tell you exactly what to do, in what order, to get a result! 📋" },
      { question: "What is a programming language?", options: ["A special language used to write instructions for computers to follow", "The language spoken by software engineers at work", "A type of machine hardware", "The language used in the computer's operating system only"], correctIndex: 0, explanation: "Python, JavaScript, Scratch — these are programming languages. Each has its own rules for how to write instructions! 🐍" },
      { question: "What does a computer need to run a program?", options: ["Instructions (the program/code) and a processor to carry them out", "A keyboard and screen only", "An internet connection at all times", "A human to guide it through each step"], correctIndex: 0, explanation: "A processor (CPU) reads and executes the program's instructions millions of times per second! ⚡" },
      { question: "What does 'input' mean in computing?", options: ["Data given to the program (keyboard typing, mouse clicks, microphone)", "The results the program produces", "The speed of the computer", "The code written by the programmer"], correctIndex: 0, explanation: "Input → Process → Output is the fundamental computing model. Your keystrokes are input! ⌨️" },
    ],
    medium: [
      { question: "What is the difference between a programming language and machine code?", options: ["Programming languages are human-readable; machine code is binary (0s and 1s) that processors understand directly", "They are the same thing at different levels of difficulty", "Machine code is easier for humans to read than programming languages", "Programming languages run faster than machine code"], correctIndex: 0, explanation: "Compilers or interpreters translate your Python/JavaScript into machine code the CPU can execute! 🔄" },
      { question: "What is a compiler?", options: ["A program that translates human-readable code into machine code that the computer can execute", "A program that checks for spelling mistakes in code", "A type of computer processor", "Software that combines multiple programs into one"], correctIndex: 0, explanation: "C++ and Java code is compiled — translated all at once before running. Python is interpreted — translated line by line as it runs! ⚙️" },
      { question: "What is computational thinking?", options: ["Breaking problems into smaller steps, identifying patterns, abstracting details, and designing algorithms — skills for solving any problem", "Only thinking about computers and code", "A way to type faster on a keyboard", "The process of memorising programming commands"], correctIndex: 0, explanation: "Computational thinking helps with ANY complex problem — not just coding! Decomposition, pattern recognition, abstraction, algorithms! 🧠" },
      { question: "What is debugging?", options: ["Finding and fixing errors (bugs) in a program to make it work correctly", "Deleting old programs from a computer", "Testing a new program for the first time", "Writing documentation explaining what the code does"], correctIndex: 0, explanation: "The term 'bug' came from an actual moth found in a 1947 Harvard computer! Grace Hopper documented it as the first real 'computer bug'! 🐛" },
      { question: "What is the difference between hardware and software?", options: ["Hardware is physical components you can touch (CPU, screen); software is programs and data you cannot touch", "Hardware is more important than software", "Software is the physical part; hardware is the digital part", "They are two words for the same thing in computing"], correctIndex: 0, explanation: "Hardware is the body; software is the mind. Without software, hardware does nothing. Without hardware, software has nothing to run on! 💻" },
      { question: "What is a programming environment or IDE?", options: ["Software that helps programmers write, test, and debug code (e.g., VS Code, PyCharm, Scratch)", "The physical location where programmers work", "A type of programming language for beginners", "The operating system a programmer uses"], correctIndex: 0, explanation: "IDEs (Integrated Development Environments) highlight errors, suggest completions, and run your code — like a smart word processor for code! 🖥️" },
    ],
    hard: [
      { question: "What is abstraction in computer science?", options: ["Hiding complex details and showing only essential information, allowing programmers to manage complexity", "Making code as short as possible by removing comments", "Creating abstract art using computer graphics", "A technique for making programs run faster by removing unused functions"], correctIndex: 0, explanation: "When you call a function, you don't need to know HOW it works internally — abstraction lets you use it as a 'black box'! This is essential for managing large codebases. 📦" },
      { question: "What is the difference between high-level and low-level programming languages?", options: ["High-level (Python, Java) are human-readable and abstract away hardware; low-level (Assembly, C) are closer to machine code and give direct hardware control", "High-level languages run faster because they're more efficient", "Low-level languages are easier to learn as they're more basic", "High-level and low-level refer to the programmer's experience, not the language itself"], correctIndex: 0, explanation: "High-level: `print('Hello')`. Low-level might require dozens of assembly instructions for the same task. Higher = more abstraction, more readable! 🔡" },
      { question: "What is an API (Application Programming Interface)?", options: ["A set of rules and protocols allowing different software applications to communicate and share data", "A type of programming language for building apps", "A hardware component that connects devices to the internet", "Software that tests applications for errors automatically"], correctIndex: 0, explanation: "Weather apps get data from a weather API. Payment apps use Stripe's payment API. APIs let programmers build on existing services! 🔗" },
      { question: "What is version control and why is it essential in software development?", options: ["A system (like Git) that tracks all changes to code over time, allowing collaboration, rollback, and managing different versions", "Software that checks which version of a program is installed", "A method for organising different types of files in a project", "A technique for making programs compatible with different operating systems"], correctIndex: 0, explanation: "Git lets teams of 1,000s collaborate on the same codebase. Every change is tracked — you can always undo a mistake or see what changed! 📝" },
      { question: "What is open-source software and why is it significant?", options: ["Software whose source code is publicly available for anyone to view, modify, and distribute; significant because it drives innovation and democratises technology", "Software that can be used for free but whose code cannot be changed", "Software owned by no one — available without any licence restrictions", "Programs that only work on open (Linux) operating systems"], correctIndex: 0, explanation: "Linux, Python, Firefox, WordPress — open source powers the internet. Developers worldwide contribute, review, and improve code together! 🌐" },
      { question: "What is the difference between compiled and interpreted programming languages?", options: ["Compiled languages translate all code to machine code before running (faster execution); interpreted languages translate and execute line-by-line at runtime (more flexible)", "Compiled languages can only run on Windows; interpreted languages work on all platforms", "Compiled means the code is read-only; interpreted means it can be edited while running", "There is no meaningful performance difference between compiled and interpreted languages"], correctIndex: 0, explanation: "C runs 10-100× faster than Python for computation-heavy tasks because it's compiled. But Python's flexibility makes it better for rapid development! ⚡" },
    ],
  },
  // ── CODING: Sequences and Loops ───────────────────────────────────────────
  {
    match: ["sequence", "loop"],
    easy: [
      { question: "What is a sequence in programming?", options: ["Instructions that are carried out one after another, in order", "A list of all the programs on a computer", "A type of loop that repeats forever", "When a program stops and waits for user input"], correctIndex: 0, explanation: "Programs follow sequences — step 1, then step 2, then step 3. Order matters! 📋" },
      { question: "What does a loop do in a program?", options: ["Repeats a set of instructions multiple times", "Stops the program from running", "Makes the program run faster", "Checks if something is true or false"], correctIndex: 0, explanation: "Instead of writing 'print Hello' 100 times, you use a loop! Loops save enormous amounts of code. 🔄" },
      { question: "What is a 'for' loop used for?", options: ["Repeating code a specific number of times or going through each item in a list", "Making a decision in your program", "Storing a value to use later", "Ending the program when done"], correctIndex: 0, explanation: "`for i in range(5)` repeats 5 times (0,1,2,3,4). Perfect when you know exactly how many repetitions you need! 🔢" },
      { question: "What is a 'while' loop?", options: ["A loop that keeps repeating as long as a condition is true", "A loop that always runs exactly 10 times", "A loop that only runs once", "A loop that runs backwards"], correctIndex: 0, explanation: "`while score < 100: score += 10` — keeps going until score reaches 100. Continues as long as the condition is TRUE! 🔄" },
      { question: "Why is order important in a sequence of instructions?", options: ["Changing the order changes what happens — instructions are followed exactly as written", "Order doesn't matter — computers work out the right sequence automatically", "Only the first instruction matters; the rest run in any order", "Computers run all instructions simultaneously, so order is irrelevant"], correctIndex: 0, explanation: "Put on shoes then socks vs socks then shoes — order matters! `x = 5; y = x + 3` must happen in that order! 👟" },
      { question: "What is an infinite loop?", options: ["A loop that never stops because the condition is always true", "A loop that runs exactly 1,000 times", "The fastest type of loop in programming", "A loop that counts down to zero"], correctIndex: 0, explanation: "`while True: print('Hello')` never stops! Infinite loops are usually a bug — unless you specifically want them (like a game loop)! ♾️" },
    ],
    medium: [
      { question: "What is the difference between a 'for' loop and a 'while' loop?", options: ["'for' runs a known number of times or through a collection; 'while' runs until a condition becomes false", "'for' is faster; 'while' is more accurate", "'for' only works with numbers; 'while' works with text too", "They are identical — just different syntax for the same operation"], correctIndex: 0, explanation: "Use 'for' when you know how many times (print each item in a list). Use 'while' when you don't (keep going until the user quits)! 🔄" },
      { question: "What does `range(1, 10, 2)` produce in Python?", options: ["1, 3, 5, 7, 9 (starts at 1, ends before 10, steps by 2)", "1, 2, 3, 4, 5, 6, 7, 8, 9, 10", "2, 4, 6, 8, 10", "1, 3, 5, 7, 9, 10"], correctIndex: 0, explanation: "range(start, stop, step): starts at 1, stops BEFORE 10, counts by 2s → 1,3,5,7,9. The stop value is never included! 🔢" },
      { question: "What is a nested loop?", options: ["A loop inside another loop — the inner loop completes all its iterations for each iteration of the outer loop", "A loop that calls itself recursively", "Two loops that run at the same time", "A loop that checks two conditions simultaneously"], correctIndex: 0, explanation: "Printing a multiplication table uses nested loops: outer loop for rows (1-9), inner loop for columns (1-9) → 81 total iterations! 🔢" },
      { question: "What does 'break' do inside a loop?", options: ["Immediately exits the loop, even if the condition is still true", "Pauses the loop and waits for user input", "Restarts the loop from the beginning", "Skips only the current iteration and continues"], correctIndex: 0, explanation: "`for i in range(100): if i == 5: break` — exits at 5, never reaches 6-99. break is like an emergency exit! 🚪" },
      { question: "What does 'continue' do inside a loop?", options: ["Skips the rest of the current iteration and moves to the next one", "Stops the loop completely", "Restarts the entire loop from iteration 0", "Continues to the next loop in a nested structure"], correctIndex: 0, explanation: "`for i in range(5): if i == 2: continue; print(i)` prints 0,1,3,4 — skips 2 but continues with 3,4,5! ⏭️" },
      { question: "How do you loop through all items in a list in Python?", options: ["for item in my_list: (iterates through each element)", "while my_list: (only empties the list)", "loop my_list each: (not valid Python)", "for i to len(my_list): (not valid Python syntax)"], correctIndex: 0, explanation: "`for fruit in ['apple','banana','cherry']: print(fruit)` prints each fruit. Python makes iterating through collections beautifully simple! 🍎" },
    ],
    hard: [
      { question: "What is the time complexity of a nested for loop running n × n iterations?", options: ["O(n²) — quadratic time, as each of the n outer iterations runs n inner iterations", "O(n) — because the loops run one after another", "O(2n) — because there are two loops", "O(log n) — because nesting makes the loops more efficient"], correctIndex: 0, explanation: "O(n²) scales poorly — 10 elements = 100 operations; 1,000 elements = 1,000,000 operations! Avoid nested loops over large data if possible! ⚡" },
      { question: "What is tail recursion and how does it relate to loops?", options: ["Recursion where the recursive call is the last operation — compilers can optimise it into a loop to avoid stack overflow", "A type of loop that runs from the end of a list to the beginning", "Recursion that only happens when the function has a single parameter", "A loop structure that recursively calls helper functions"], correctIndex: 0, explanation: "Some languages (Scheme, Haskell) optimise tail recursion into loops automatically. Python does NOT — deep recursion causes stack overflow! 🔄" },
      { question: "What is a generator in Python and how does it differ from a regular loop?", options: ["A function using 'yield' that produces values one at a time on demand, using far less memory than producing all values at once", "A function that generates random numbers for use in loops", "A type of for loop that runs asynchronously", "A built-in Python function that creates loops automatically from a list"], correctIndex: 0, explanation: "`def count_up(): i=0; while True: yield i; i+=1` — generates infinite integers without storing them all! Perfect for huge or infinite sequences! ♾️" },
      { question: "How does loop unrolling optimise performance?", options: ["Manually or automatically expanding loop iterations to reduce overhead from loop control (checking conditions, incrementing counters)", "Removing unnecessary loops from the code", "Converting a for loop into a while loop for speed", "Using multiple processors to run loop iterations in parallel"], correctIndex: 0, explanation: "CPUs waste time checking loop conditions and updating counters. Unrolling processes multiple items per iteration, reducing overhead — used in video game engines and signal processing! ⚡" },
      { question: "What is the difference between eager and lazy evaluation in relation to loops and sequences?", options: ["Eager evaluation computes all values immediately; lazy evaluation computes values only when needed (like generators)", "Eager evaluation is slower; lazy evaluation runs loops faster", "Lazy evaluation checks loop conditions first; eager evaluation runs the loop body first", "They refer to how quickly a programmer writes loop code, not how it executes"], correctIndex: 0, explanation: "`list(range(1000000))` = eager (creates 1M items immediately). Generator `range(1000000)` = lazy (creates each number only when needed). Huge memory difference! 💾" },
    ],
  },
  // ── CODING: Conditions and Decisions ──────────────────────────────────────
  {
    match: ["condition", "decision"],
    easy: [
      { question: "What does an 'if' statement do?", options: ["Runs a block of code only when a condition is true", "Repeats code a set number of times", "Stores a value in memory", "Ends the program"], correctIndex: 0, explanation: "`if score > 100: print('You win!')` — the message only prints IF score is above 100! 🏆" },
      { question: "What does 'else' do in an if-else statement?", options: ["Runs code when the 'if' condition is false", "Creates a new loop", "Checks a second condition", "Stops the program running"], correctIndex: 0, explanation: "`if raining: take_umbrella() else: wear_sunglasses()` — else covers every case the if doesn't! ☂️☀️" },
      { question: "What is a condition in programming?", options: ["A statement that is either True or False", "The speed at which a program runs", "An error in the code", "The number of times a loop runs"], correctIndex: 0, explanation: "`5 > 3` is True. `10 == 5` is False. Conditions control which code path the program takes! ✅❌" },
      { question: "What does '==' mean in programming?", options: ["Tests if two values are equal (True/False comparison)", "Assigns a value to a variable", "Multiplies two numbers", "Makes something larger"], correctIndex: 0, explanation: "`x = 5` stores 5 in x. `x == 5` asks 'is x equal to 5?' — one equals assigns, two equals compares! ⚖️" },
      { question: "What is an 'elif' or 'else if' statement?", options: ["Checks another condition if the first 'if' was false", "Repeats the if statement", "Is the same as 'else'", "Ends the if-else chain"], correctIndex: 0, explanation: "`if grade >= 90: A elif grade >= 80: B elif grade >= 70: C else: Fail` — checks conditions in order until one is true! 📊" },
      { question: "What is a Boolean value?", options: ["A value that is either True or False only", "A very large number", "A text string", "A list of items"], correctIndex: 0, explanation: "Booleans are the foundation of all decisions in computing — every if statement ultimately checks a Boolean! 💡" },
    ],
    medium: [
      { question: "What is the difference between '=', '==', and '!=' in programming?", options: ["'=' assigns a value; '==' checks equality; '!=' checks inequality", "'==' assigns; '=' compares; '!=' is invalid", "All three check if values are equal in different ways", "'=' means approximately equal; '==' means exactly equal; '!=' means greater than"], correctIndex: 0, explanation: "`x = 5` (assign 5 to x). `x == 5` (is x equal to 5? True/False). `x != 5` (is x NOT 5? True/False). ⚖️" },
      { question: "What are logical operators AND, OR, and NOT?", options: ["AND: both must be true; OR: at least one must be true; NOT: reverses the boolean", "AND: adds values; OR: picks the bigger; NOT: sets to zero", "AND/OR/NOT are all used to combine conditions but always give the same result", "They only work with numbers, not with string comparisons"], correctIndex: 0, explanation: "`if sunny AND warm: wear_tshirt()`. `if raining OR cold: wear_coat()`. `if NOT tired: go_for_run()` — logic gates in code! 🔗" },
      { question: "What is a switch/match statement and when is it better than if-elif chains?", options: ["Checks one variable against multiple possible values — cleaner and sometimes faster than many elif statements", "It is always identical to if-elif — just different syntax", "Switch statements only work with numerical comparisons", "Match statements are used to find patterns in text, not make decisions"], correctIndex: 0, explanation: "Python 3.10+ has match-case. Instead of 5 elif statements checking `day == 'Monday'`, `day == 'Tuesday'` etc., a match statement is cleaner! 📋" },
      { question: "What is short-circuit evaluation?", options: ["In AND conditions, if the first part is False, the second isn't checked; in OR, if first is True, second isn't checked", "When the CPU skips slow conditions for faster ones automatically", "A way to make if statements run without evaluating any conditions", "When two conditions are evaluated at the same speed"], correctIndex: 0, explanation: "`if user_exists() and user.age > 18:` — if user_exists() is False, Python doesn't even check age. This prevents errors and speeds up code! ⚡" },
      { question: "What is a ternary operator?", options: ["A one-line shorthand for if-else: `value_if_true if condition else value_if_false`", "An operator that compares three values simultaneously", "A loop that runs exactly three times", "A three-way equality check in programming"], correctIndex: 0, explanation: "`grade = 'Pass' if score >= 50 else 'Fail'` — elegant one-liner instead of 4-line if-else! Python calls this a conditional expression! 🎯" },
      { question: "What is input validation and why is it important in conditional code?", options: ["Checking that user input is the correct type and within acceptable ranges before processing it — prevents errors and security vulnerabilities", "Making sure the user typed their input correctly", "Testing whether a condition in an if statement is well-written", "Checking that the program received the correct number of inputs"], correctIndex: 0, explanation: "Without validation: `int(input('Age: '))` crashes if user types 'hello'. With: check if it's a number first. SQL injection exploits missing input validation! 🔒" },
    ],
    hard: [
      { question: "What is the difference between eager and lazy boolean evaluation?", options: ["Python (and most languages) use lazy (short-circuit) evaluation — stopping as soon as the result is determined; eager evaluates all conditions", "Eager evaluation is used in Python; lazy evaluation is used in Java", "They refer to how quickly code is written, not how conditions are evaluated", "All modern languages evaluate all boolean conditions fully before deciding"], correctIndex: 0, explanation: "Short-circuit evaluation enables guard clauses: `if list and list[0] > 5:` — safe because Python won't check `list[0]` if list is empty! 🛡️" },
      { question: "What is a decision tree in computer science?", options: ["A tree-like model of decisions where each node is a condition and branches represent outcomes — used in algorithms and machine learning", "A diagram showing the if-else structure of a program", "A data structure for storing decisions made by users", "A type of binary tree optimised for search operations"], correctIndex: 0, explanation: "Decision trees power AI — a machine learning algorithm that classifies data by asking a series of yes/no questions, like a flowchart! 🌳" },
      { question: "What is predicate logic and how does it extend simple boolean conditions?", options: ["Predicate logic extends boolean logic with quantifiers (∀ = for all, ∃ = there exists) — it can express conditions about sets of values", "Predicate logic is used only in mathematical proofs, not programming", "It adds multiple condition types (maybe, usually, never) beyond True/False", "Predicate logic replaces if-else with probability-based decisions"], correctIndex: 0, explanation: "Database queries use predicate logic: `SELECT * WHERE age > 18 AND country = 'UK'` — filtering a set based on predicates! SQL is applied predicate logic! 🔍" },
      { question: "What is fuzzy logic and how does it differ from Boolean logic?", options: ["Fuzzy logic allows truth values between 0 and 1, not just True/False — useful for imprecise real-world conditions like 'somewhat warm' or 'quite fast'", "Fuzzy logic is less accurate than Boolean logic", "It is used when conditions cannot be written as code", "Fuzzy logic only applies to image processing and cannot be used for decisions"], correctIndex: 0, explanation: "Your washing machine uses fuzzy logic — not just 'dirty' or 'clean' but degrees. ACs use it for 'comfortable' temperature. AI needs it for nuanced decisions! 🌡️" },
      { question: "How does branch prediction in CPUs optimise conditional code execution?", options: ["CPUs predict which branch of an if-else will execute and pre-fetch/execute it speculatively — if wrong, they flush and try the correct branch", "Branch prediction removes conditions from code automatically", "CPUs always execute both branches and discard the wrong result", "Branch prediction only applies to loops, not if-else statements"], correctIndex: 0, explanation: "A correctly predicted branch costs nothing. Misprediction costs 15-20 cycles. Sorting data before branching can dramatically speed up code by making branches more predictable! ⚡" },
    ],
  },
  // ── CODING: Variables and Data ────────────────────────────────────────────
  {
    match: ["variable", "data"],
    easy: [
      { question: "What is a variable in programming?", options: ["A named container that stores a value that can change", "A number used in mathematics", "A type of computer hardware", "A fixed value that never changes"], correctIndex: 0, explanation: "`age = 10` stores the number 10 in a variable called 'age'. Later you can change it: `age = 11`! 📦" },
      { question: "What is a data type?", options: ["The kind of value a variable stores (number, text, true/false)", "How big the variable's name is", "The speed at which data is processed", "The number of variables in a program"], correctIndex: 0, explanation: "5 is an integer, 3.14 is a float, 'hello' is a string, True/False is a boolean — knowing data types is essential! 🔢" },
      { question: "What is a string in programming?", options: ["A piece of text, stored between quotes ('hello', \"world\")", "A type of number", "A list of values", "A variable that only holds one letter"], correctIndex: 0, explanation: "'Hello, World!' is the most famous string in programming — it's tradition to print it as your very first program! 👋" },
      { question: "What is an integer?", options: ["A whole number without a decimal point (like 1, 42, -7)", "Any number including decimals", "A number between 0 and 9 only", "A number stored as text"], correctIndex: 0, explanation: "1, 100, -5, 0 are integers. 3.14 is NOT an integer (it's a float). Computers store integers more efficiently than decimals! 🔢" },
      { question: "What happens when you assign a new value to a variable?", options: ["The old value is replaced with the new one", "The computer stores both the old and new values", "The variable name changes to match the new value", "An error occurs — variables cannot be changed"], correctIndex: 0, explanation: "`x = 5; x = 10` — x now stores 10. The original 5 is gone. This is what makes variables 'variable'! 🔄" },
      { question: "What is a constant?", options: ["A value that is set once and never changes (like PI = 3.14159)", "A variable that stores the number 0", "A very large integer value", "A variable that stores text"], correctIndex: 0, explanation: "Math constants like π (pi) = 3.14159 never change. In Python, by convention, constants are written in ALL_CAPS to signal 'don't change this'! 📐" },
    ],
    medium: [
      { question: "What is the difference between an integer and a float?", options: ["Integers are whole numbers; floats (floating-point) have decimal places — floats use more memory and can have rounding errors", "Floats are always larger than integers", "Integers can store text; floats can only store numbers", "They are identical in how computers store them"], correctIndex: 0, explanation: "`0.1 + 0.2` in most languages = `0.30000000000000004` — floating-point isn't perfectly precise! Always beware when comparing floats for equality! ⚠️" },
      { question: "What is a list (or array) in programming?", options: ["An ordered collection of multiple values stored in a single variable", "A variable that can only hold numbers", "A text string with multiple characters", "A special type of loop"], correctIndex: 0, explanation: "`fruits = ['apple', 'banana', 'cherry']` — one variable, three values! Access items by index: `fruits[0]` = 'apple' (0-indexed)! 🍎" },
      { question: "What is a dictionary (or hash map) in programming?", options: ["A collection of key-value pairs where each key maps to a value", "A program that defines and stores word meanings", "An ordered list of items sorted alphabetically", "A special variable that stores only strings"], correctIndex: 0, explanation: "`student = {'name': 'Alice', 'age': 12}` — access with `student['name']` = 'Alice'. Keys must be unique! 📚" },
      { question: "What is variable scope?", options: ["Where in the program a variable can be accessed — local (inside a function) or global (everywhere)", "How many characters a variable name can have", "The maximum value that can be stored in a variable", "Whether a variable is public or private in object-oriented code"], correctIndex: 0, explanation: "A variable inside a function is local — invisible outside it. Global variables exist everywhere. Prefer local scope to prevent bugs! 🔒" },
      { question: "What is type casting?", options: ["Converting a value from one data type to another (e.g., int('5') converts the string '5' to integer 5)", "Selecting which data type to use for a new variable", "A method of naming variables clearly", "Automatically changing variable types based on the value stored"], correctIndex: 0, explanation: "`age = int(input('Enter age: '))` — input() always returns a string; int() converts it to an integer for arithmetic! 🔄" },
      { question: "What is the difference between mutable and immutable data types?", options: ["Mutable can be changed after creation (lists, dicts); immutable cannot be changed (strings, tuples, integers)", "Mutable types store numbers; immutable types store text", "Immutable variables can be deleted; mutable variables are permanent", "They differ only in memory usage, not in behaviour"], correctIndex: 0, explanation: "`my_list[0] = 'new'` — lists are mutable (changeable). `'hello'[0] = 'H'` — ERROR! Strings are immutable. Python creates a new string instead! 🔒" },
    ],
    hard: [
      { question: "How does Python manage memory for variables using reference counting?", options: ["Python tracks how many variables reference each object; when count reaches 0, the garbage collector frees the memory", "Python stores all variables in a fixed-size memory block", "Variables are stored permanently until the program ends", "Python uses manual memory management like C — programmers must free memory themselves"], correctIndex: 0, explanation: "`a = [1,2,3]; b = a` — both a and b reference the SAME list! Mutating b changes a too. Python's garbage collector handles cleanup automatically! 🗑️" },
      { question: "What is the difference between pass-by-value and pass-by-reference?", options: ["Pass-by-value sends a copy (changes inside function don't affect original); pass-by-reference sends the actual object (changes affect the original)", "Pass-by-value is used for integers; pass-by-reference is used for strings", "Python only uses pass-by-value", "They refer to different ways of naming parameters in function definitions"], correctIndex: 0, explanation: "Python is technically 'pass-by-object-reference'. Immutables (ints, strings) behave like pass-by-value; mutables (lists) behave like pass-by-reference! 🔗" },
      { question: "What is a hash table and why do dictionaries use them?", options: ["Hash tables use a hash function to compute an index for each key — enabling O(1) average-time lookup regardless of size", "Hash tables store items in sorted order for fast searching", "A hash table is a type of list with named indices", "Hash tables use binary search trees for O(log n) access time"], correctIndex: 0, explanation: "Python dicts can look up `'name'` in a million-key dictionary as fast as in a 10-key one — O(1) average time thanks to hashing! ⚡" },
      { question: "What is dynamic typing vs static typing?", options: ["Dynamic: variable type checked at runtime and can change (Python, JS); Static: type declared at compile time and cannot change (Java, C++)", "Dynamic typing is always less efficient than static typing", "Static typing requires more code but produces slower programs", "They are different terms for the same feature in different programming communities"], correctIndex: 0, explanation: "Python: `x = 5; x = 'hello'` — x changes type! Java: `int x = 5; x = 'hello'` — compile error! Static typing catches bugs earlier; dynamic is more flexible! ⚖️" },
      { question: "What is the difference between deep copy and shallow copy for data structures?", options: ["Shallow copy copies the container but shares nested objects; deep copy recursively copies everything — changes to one don't affect the other", "Shallow copy is for small data; deep copy is for large data", "Deep copy is always slower; shallow copy is always faster with no downsides", "They are identical for lists but differ for dictionaries"], correctIndex: 0, explanation: "Shallow: `b = a[:]` — b is new, but `b[0]` might reference same object as `a[0]`. Deep: `import copy; b = copy.deepcopy(a)` — truly independent! 🪞" },
    ],
  },
  // ── ART: Colors and Color Mixing ─────────────────────────────────────────
  {
    match: ["color", "colour"],
    easy: [
      { question: "What are the three primary colours?", options: ["Red, yellow, and blue", "Red, green, and blue", "Orange, purple, and green", "White, black, and grey"], correctIndex: 0, explanation: "Primary colours cannot be made by mixing other colours — they're the building blocks of all other colours! 🎨" },
      { question: "What do red and yellow make?", options: ["Orange", "Purple", "Brown", "Green"], correctIndex: 0, explanation: "Red + Yellow = Orange! Orange is a warm colour we see in sunsets and autumn leaves! 🟠" },
      { question: "What do blue and yellow make?", options: ["Green", "Purple", "Orange", "Brown"], correctIndex: 0, explanation: "Blue + Yellow = Green! Think of painting a lawn — you start with sky blue and sunny yellow! 🟢" },
      { question: "What do red and blue make?", options: ["Purple (violet)", "Orange", "Green", "Pink"], correctIndex: 0, explanation: "Red + Blue = Purple! More red makes it lean toward violet; more blue makes it lean toward indigo! 🟣" },
      { question: "What are secondary colours?", options: ["Orange, green, and purple (made by mixing two primary colours)", "Red, yellow, and blue", "Pink, brown, and grey", "White, black, and gold"], correctIndex: 0, explanation: "Secondary colours sit between primary colours on the colour wheel: Red+Yellow=Orange, Yellow+Blue=Green, Red+Blue=Purple! 🎨" },
      { question: "What colours do you get by mixing a colour with white?", options: ["A lighter tint of that colour", "A darker shade of that colour", "The complementary colour", "No change — white doesn't mix"], correctIndex: 0, explanation: "Adding white creates a tint — pale pink from red, sky blue from dark blue. Pastel colours are tints! 🌸" },
    ],
    medium: [
      { question: "What are complementary colours?", options: ["Colours directly opposite each other on the colour wheel (red-green, blue-orange, yellow-purple)", "Colours that look similar and blend smoothly", "Two shades of the same colour", "Colours used in most paintings by famous artists"], correctIndex: 0, explanation: "Complementary colours create maximum contrast — that's why red poppies in green grass look so vibrant! 🌺" },
      { question: "What is the difference between warm and cool colours?", options: ["Warm: reds, oranges, yellows (energetic, advancing); Cool: blues, greens, purples (calm, receding)", "Warm colours are darker; cool colours are lighter", "Warm colours are used in winter; cool colours in summer", "They refer to how recently the paint was applied to canvas"], correctIndex: 0, explanation: "Warm colours feel like fire and sunshine — they jump forward. Cool colours feel like water and sky — they recede. Artists use this to create depth! 🌅" },
      { question: "What is a colour wheel?", options: ["A circular diagram showing the relationships between primary, secondary, and tertiary colours", "A wheel artists spin to choose random colours for their paintings", "A tool for mixing paint in correct proportions", "A scale measuring the brightness of different colours"], correctIndex: 0, explanation: "Sir Isaac Newton created the first colour circle in 1666! The wheel shows how colours relate — complementary colours oppose each other across the centre! 🎨" },
      { question: "What is hue, saturation, and value (brightness) in colour theory?", options: ["Hue is the colour itself; saturation is its intensity/purity; value is its lightness or darkness", "Hue is the mixing ratio; saturation is the amount of paint; value is the price", "They are three different names for the same property of colour", "Hue refers to warm colours only; saturation to cool colours"], correctIndex: 0, explanation: "Pure red = high saturation. Dull pink-ish red = low saturation. Bright red = high value. Dark maroon = low value. All three control how colour feels! 🖼️" },
      { question: "What are analogous colours and how are they used in art?", options: ["Colours that sit adjacent to each other on the colour wheel; used to create harmonious, cohesive colour schemes", "Colours that are opposite on the colour wheel", "Colours made from only one primary colour", "Colours that appear in nature but not in art"], correctIndex: 0, explanation: "Blue-green-yellow is analogous — a peaceful, natural harmony. Monet's water lily paintings use analogous greens and blues for serene harmony! 🌊" },
      { question: "What is the difference between additive and subtractive colour mixing?", options: ["Additive: mixing coloured light (RGB — screens); Subtractive: mixing pigments/paint (CMYK — printing)", "Additive adds white; subtractive adds black", "Additive is used for watercolours; subtractive for oil paints", "They produce identical results but use different amounts of paint"], correctIndex: 0, explanation: "Your phone screen uses RGB light (additive — mixing all = white). Your art teacher uses paint (subtractive — mixing all = muddy brown/black)! 💡" },
    ],
    hard: [
      { question: "How does the human eye perceive colour?", options: ["Three types of cone cells detect red, green, and blue light; the brain combines these signals to create all perceived colours", "Each colour has a separate nerve dedicated to detecting it", "Rods in the eye detect colour; cones only detect brightness", "Colour perception occurs in the eye; the brain only processes shape"], correctIndex: 0, explanation: "Colour blindness occurs when one or more cone types are missing or altered. ~8% of males have some colour vision deficiency! 👁️" },
      { question: "What is simultaneous contrast in colour perception?", options: ["The same colour appears different depending on surrounding colours — adjacent colours influence how we perceive each other", "When two colours mixed together appear brighter than each colour alone", "The tendency for complementary colours to appear to vibrate when placed next to each other", "When eyes adjust to bright colours making subsequent colours appear dimmer"], correctIndex: 0, explanation: "A grey square on a white background looks darker than the same grey on black. Josef Albers spent his life studying how colour lies to us! 🎨" },
      { question: "What is the difference between RGB and CMYK colour models?", options: ["RGB (Red, Green, Blue) is for screens/light (additive); CMYK (Cyan, Magenta, Yellow, Key/Black) is for printing (subtractive)", "RGB is used in fine art; CMYK is used in digital design", "RGB creates more colours than CMYK in all circumstances", "They are identical except for the naming conventions in different industries"], correctIndex: 0, explanation: "Designers must convert from RGB (screen) to CMYK (print) — some brilliant screen colours are impossible to print faithfully! That's why printed colours sometimes disappoint! 🖨️" },
      { question: "How did the Impressionists revolutionise understanding of colour in art?", options: ["They realised colour is relative and contextual — shadows contain colour, complementary colours vibrate, paint dabs of pure colour create optical mixing", "They invented new pigments that were brighter than anything available before", "They proved that realistic colour mixing always requires many layers of paint", "They abandoned colour theory entirely, using only intuition for colour choices"], correctIndex: 0, explanation: "Monet, Renoir, and Pissarro painted in pure dabs of colour — letting the eye mix them. They understood simultaneous contrast before it was formally named! 🌸" },
      { question: "What is metamerism in colour science?", options: ["When two colour samples appear identical under one light source but different under another — a significant challenge in colour-matching industries", "When a colour appears to change as paint dries", "The phenomenon of colours appearing brighter in sunlight than under artificial light", "When complementary colours cancel each other out, producing grey"], correctIndex: 0, explanation: "Fashion colours matched in factory lighting may clash in daylight or LED light! Metameric pairs are a huge problem in paint matching, textiles, and printing! 💡" },
    ],
  },
  // ── ART: Famous Artists ───────────────────────────────────────────────────
  {
    match: ["famous artist"],
    easy: [
      { question: "Who painted the Mona Lisa?", options: ["Leonardo da Vinci", "Michelangelo", "Pablo Picasso", "Vincent van Gogh"], correctIndex: 0, explanation: "Leonardo da Vinci painted the Mona Lisa (c.1503-1519). It's the most visited painting in the world, housed in the Louvre, Paris! 🎭" },
      { question: "Which artist cut off part of his ear?", options: ["Vincent van Gogh", "Pablo Picasso", "Salvador Dali", "Claude Monet"], correctIndex: 0, explanation: "Van Gogh cut off part of his ear in 1888, during a period of mental illness. He went on to paint Starry Night in 1889! 🌟" },
      { question: "Who painted the Sistine Chapel ceiling?", options: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], correctIndex: 0, explanation: "Michelangelo painted the Sistine Chapel ceiling (1508-1512) lying on his back! The most famous section shows God giving life to Adam! ✋" },
      { question: "What was Pablo Picasso famous for?", options: ["Co-founding Cubism — showing multiple perspectives simultaneously in abstract geometric shapes", "Painting detailed portraits of the British royal family", "Creating large sculptures for public parks", "Painting the first colour photographs by hand"], correctIndex: 0, explanation: "Picasso co-founded Cubism with Georges Braque, revolutionising Western art by depicting subjects from multiple viewpoints at once! 🎭" },
      { question: "Which artist is famous for painting sunflowers?", options: ["Vincent van Gogh", "Claude Monet", "Henri Matisse", "Paul Cézanne"], correctIndex: 0, explanation: "Van Gogh's 'Sunflowers' series (1888-1889) is one of the most recognisable images in Western art. He painted multiple versions! 🌻" },
      { question: "Who painted 'Water Lilies'?", options: ["Claude Monet", "Vincent van Gogh", "Paul Gauguin", "Edgar Degas"], correctIndex: 0, explanation: "Monet painted around 250 water lily paintings (Nymphéas) at his garden in Giverny, France — especially as his eyesight deteriorated! 🌸" },
    ],
    medium: [
      { question: "What art movement is Van Gogh associated with?", options: ["Post-Impressionism", "Impressionism", "Cubism", "Surrealism"], correctIndex: 0, explanation: "Van Gogh moved beyond Impressionism's observation of light to express intense emotion through bold colour and swirling brushwork! 🌟" },
      { question: "Who is Frida Kahlo and what is she known for?", options: ["A Mexican artist known for self-portraits exploring identity, pain, and Mexican culture", "A Spanish abstract painter who worked with Picasso", "A French Impressionist known for landscape paintings", "An American abstract expressionist working in New York"], correctIndex: 0, explanation: "Kahlo's 55 self-portraits explore her physical and emotional pain with unflinching honesty. She became a global icon of resilience! 🌺" },
      { question: "What was Salvador Dali's artistic style?", options: ["Surrealism — painting dreamlike, impossible scenes with photographic realism", "Abstract Expressionism — large-scale abstract canvases", "Impressionism — quick brushwork capturing light", "Cubism — geometric, fragmented perspectives"], correctIndex: 0, explanation: "Dali's 'melting clocks' in The Persistence of Memory (1931) are one of the most recognisable images in art history. Dreams made real! 🕐" },
      { question: "What technique made Seurat's paintings distinctive?", options: ["Pointillism — painting with thousands of tiny dots of pure colour that blend optically from a distance", "Large expressive brushstrokes of mixed colours", "Working only in black and white with light added later", "Using palette knives instead of brushes"], correctIndex: 0, explanation: "Seurat's 'A Sunday on La Grande Jatte' (1884-86) used millions of tiny dots. Up close it's dots; step back and it becomes a vivid scene! 🔵" },
      { question: "Who was Rembrandt and why is he significant?", options: ["A Dutch Golden Age master (1606-1669) renowned for psychological depth, light-shadow mastery (chiaroscuro), and self-portraits", "An Italian Renaissance sculptor famous for marble statues", "A French Impressionist who painted outdoor café scenes", "A Spanish court painter who created royal family portraits"], correctIndex: 0, explanation: "Rembrandt painted over 90 self-portraits throughout his life — an unparalleled psychological autobiography in paint! 🕯️" },
      { question: "What is the significance of the Impressionist movement?", options: ["It broke from academic tradition by painting contemporary life outdoors, capturing light and movement with loose brushwork — revolutionising Western art", "It was the first movement to use non-representational imagery in Western art", "Impressionism introduced photography techniques into traditional painting", "It was a political movement using art to protest industrialisation"], correctIndex: 0, explanation: "When Monet's 'Impression, Sunrise' was mocked in 1874, the critic's insult 'Impressionists' became their proud name. They changed everything! 🌅" },
    ],
    hard: [
      { question: "How did Leonardo da Vinci's scientific curiosity influence his art?", options: ["His anatomical studies gave human figures unprecedented accuracy; his studies of light, water, and plants made his works scientifically and artistically revolutionary", "He invented new pigments that made colours more permanent", "He used mathematical formulae to calculate exact proportions for each artwork", "His science work was completely separate from his art — they influenced each other very little"], correctIndex: 0, explanation: "Da Vinci dissected over 30 human corpses to understand anatomy. His notebooks show the same meticulous observation applied to art, science, and engineering! 🔬" },
      { question: "What is sfumato and which artist perfected it?", options: ["A technique by Leonardo da Vinci using soft, hazy transitions between colours and tones — no hard outlines, creating an atmospheric, mysterious effect", "Michelangelo's method of carving marble by removing material to reveal the figure within", "A Venetian painting technique using thin layers of translucent glazes", "A Spanish technique creating texture by mixing sand with oil paint"], correctIndex: 0, explanation: "Sfumato (from Italian 'fumo' = smoke) gives the Mona Lisa her mysterious expression — the corner of her mouth and eyes are intentionally ambiguous! 🌫️" },
      { question: "How did Picasso's Guernica function as political art?", options: ["It depicted the 1937 bombing of a Basque town in chaotic Cubist style — black, white, and grey tones emphasising horror and mourning without glorifying war", "It celebrated a Spanish military victory through traditional realistic painting", "It was a commercial commission that Picasso later repurposed as political commentary", "Guernica's political meaning is entirely projected by viewers — Picasso intended it as purely formal art"], correctIndex: 0, explanation: "Picasso chose black and white like a newspaper photograph — immediate, journalistic. The screaming horse, bull, and broken figures make horror visceral. Art as protest! ✊" },
      { question: "What was the significance of Marcel Duchamp's 'Fountain' (1917)?", options: ["A urinal submitted to an art exhibition challenged the definition of art — art is defined by context and the artist's intention, not craft or beauty", "It was the first mass-produced object ever shown in an art gallery", "It was a technical sculpture demonstrating advanced ceramic techniques", "It was significant mainly because it was banned — proving censorship existed in art"], correctIndex: 0, explanation: "Duchamp created the concept of the 'readymade' — any ordinary object becomes art when an artist designates it so. This single gesture shapes all conceptual art since! 🚽" },
      { question: "How did Rembrandt use chiaroscuro differently from his contemporaries?", options: ["He used extreme light-dark contrast not just for drama but for psychological revelation — light illuminated character and inner life, not just form", "He invented chiaroscuro — it was not used before his work", "Rembrandt used chiaroscuro less dramatically than his contemporaries — his style was actually softer", "He used chiaroscuro only for religious subjects, avoiding it in portraits and self-portraits"], correctIndex: 0, explanation: "Caravaggio used chiaroscuro for theatrical drama. Rembrandt used it to reveal souls — the face emerging from shadow tells you who this person IS, not just what they look like! 🕯️" },
    ],
  },
  // ── ART: Drawing Basics ───────────────────────────────────────────────────
  {
    match: ["drawing basic", "drawing technique"],
    easy: [
      { question: "What are the basic shapes that most objects can be broken into?", options: ["Circle, square, triangle, and rectangle", "Star, heart, arrow, and cloud", "Only circles and triangles", "Irregular shapes that cannot be simplified"], correctIndex: 0, explanation: "A tree = circle top + rectangle trunk. A house = rectangle + triangle. Breaking objects into shapes makes drawing much easier! ⬛🔺⭕" },
      { question: "What is shading in drawing?", options: ["Adding darker areas to show where light doesn't reach, creating a 3D effect", "Colouring the entire picture with one colour", "Drawing quickly to capture movement", "Adding texture by pressing hard with a pencil"], correctIndex: 0, explanation: "Shading transforms a flat circle into a sphere! The light side is bright, the shadow side is dark — our brains interpret this as 3D shape! ⭕" },
      { question: "What is a horizon line in drawing?", options: ["The line where land or sea meets the sky in the distance", "The line at the bottom of your drawing paper", "A line you draw in the middle of the page for balance", "The outline around a character in a drawing"], correctIndex: 0, explanation: "The horizon line represents your eye level. Objects below it are viewed from above; above it, from below. Essential for perspective! 🌅" },
      { question: "What is a sketch?", options: ["A quick, rough drawing that captures the basic shapes and composition", "A finished, detailed drawing ready for display", "A drawing made only with a ruler", "Copying another artist's drawing exactly"], correctIndex: 0, explanation: "Artists sketch to plan compositions, try ideas, and practise. Leonardo da Vinci filled thousands of sketchbook pages! 📝" },
      { question: "What does it mean to draw from observation?", options: ["Looking carefully at a real object or scene and drawing exactly what you see", "Drawing from memory without looking at anything", "Copying a photograph instead of drawing", "Using a grid to enlarge an existing image"], correctIndex: 0, explanation: "Drawing from observation trains your eye — you start to really SEE how things look rather than drawing what you think they look like! 👁️" },
      { question: "What is contour drawing?", options: ["Drawing only the outline of an object without shading, following its edges carefully", "Drawing the inside details of an object", "Drawing using only straight lines", "A fast drawing technique used in animation"], correctIndex: 0, explanation: "Contour drawing focuses you on the edges and form of an object. Blind contour drawing (not looking at paper while drawing) is a classic art exercise! ✏️" },
    ],
    medium: [
      { question: "What is one-point perspective?", options: ["A drawing technique where all parallel lines converge to a single vanishing point on the horizon, creating depth", "Drawing a scene from only one viewpoint", "A technique where the drawing has only one dominant colour", "Drawing objects at actual size with no reduction for distance"], correctIndex: 0, explanation: "Look down a railway track — the rails seem to meet at one point in the distance. One-point perspective recreates this mathematically! 🚂" },
      { question: "What is hatching and cross-hatching?", options: ["Creating tone and texture using parallel lines (hatching) or crossed lines (cross-hatching) instead of blending", "A method of connecting lines at intersections", "Drawing using only horizontal and vertical lines", "A watercolour technique for adding texture to backgrounds"], correctIndex: 0, explanation: "Renaissance artists like Dürer mastered cross-hatching in engravings. The more lines, the darker the tone — no smudging needed! ✏️" },
      { question: "What is the rule of thirds in composition?", options: ["Dividing the frame into 9 equal parts using 2 horizontal and 2 vertical lines; placing key subjects at intersections creates dynamic balance", "Always dividing your drawing into three horizontal sections", "Using three colours only in a composition", "Drawing objects in groups of three for visual harmony"], correctIndex: 0, explanation: "Cameras have a rule-of-thirds grid for exactly this reason! The eye is naturally drawn to the intersection points, not the dead centre! 📸" },
      { question: "What is foreshortening in drawing?", options: ["Showing objects that are pointing toward the viewer as shorter than they appear from the side — compressing length to create depth", "Drawing objects smaller in the distance to show perspective", "Shortening drawing time by using simpler shapes", "A technique for drawing hands and feet accurately"], correctIndex: 0, explanation: "A finger pointed directly at you appears almost circular — its length is hidden. Foreshortening creates powerful depth and drama! 👆" },
      { question: "How do artists create the illusion of texture in drawing?", options: ["By varying pressure, line direction, mark-making patterns, and contrast to suggest surface qualities visually", "By applying real materials like sand or fabric to the paper", "Texture can only be created through painting, not drawing", "By drawing microscopic detail that creates the feeling of texture"], correctIndex: 0, explanation: "Short curved lines suggest fur. Irregular cross-hatching suggests rough stone. Smooth gradients suggest glass. You're not drawing texture — you're creating the impression of it! ✏️" },
    ],
    hard: [
      { question: "What is atmospheric (aerial) perspective and how is it used?", options: ["Distant objects appear lighter, less detailed, and bluer due to atmospheric haze — artists replicate this to create spatial depth", "A perspective system using multiple vanishing points for atmospheric scenes", "The use of blue colours in the sky portion of a drawing", "Drawing outdoors in natural light rather than in a studio"], correctIndex: 0, explanation: "Mountains in the distance appear blue-grey and faint. Nearby objects are sharp and warm-coloured. This atmospheric phenomenon creates illusory depth! 🏔️" },
      { question: "How does negative space function in composition?", options: ["The empty space around and between subjects, which is as important as the positive shapes in creating visual balance and meaning", "The dark areas of a drawing created by shading", "The parts of a drawing that haven't been worked on yet", "White space left intentionally blank to reduce visual complexity"], correctIndex: 0, explanation: "The famous vase/faces illusion — you see either a vase or two faces, depending on whether you focus on positive or negative space! 🏺" },
      { question: "What is the golden ratio and how has it influenced drawing and design?", options: ["A proportion (~1:1.618) found throughout nature that creates aesthetically pleasing compositions; used deliberately or intuitively by artists from Da Vinci to Le Corbusier", "A rule that all successful artworks use exactly three main colours", "The mathematical formula for creating perfect symmetry in art", "A ratio determining the ideal frame size for displaying artwork"], correctIndex: 0, explanation: "The Parthenon, Mona Lisa, and iPhone all incorporate golden ratio proportions. Whether artists consciously used it or our perception finds it, remains debated! 🌀" },
      { question: "How did the invention of photography affect drawing and representational art?", options: ["It freed artists from the obligation to record reality accurately, accelerating abstraction, Impressionism, and Modernism", "Photography caused drawing to decline as an art form permanently", "It had little effect — artists continued as before and ignored photography", "Photography improved drawing skills because artists could use photos as drawing references"], correctIndex: 0, explanation: "When cameras could capture reality perfectly, painters asked: what can art do that cameras cannot? The answer drove art toward expression, emotion, and abstraction! 📷" },
      { question: "What is gestural drawing and why do artists practise it?", options: ["Quick drawings capturing movement, energy, and the essential character of a pose — typically 30 seconds to 2 minutes — training the eye-hand connection", "Drawing using broad gestural movements to cover large areas quickly", "A drawing style that makes all lines curved and flowing", "Drawing that focuses on emotional expression by making large marks"], correctIndex: 0, explanation: "Life drawing classes use gesture drawing to warm up: 30 figures in 15 minutes. The goal is capturing the FEELING of movement, not precise anatomy! 💃" },
    ],
  },
  // ── ART: Sculpture and 3D Art ─────────────────────────────────────────────
  {
    match: ["sculpture", "3d art"],
    easy: [
      { question: "What is sculpture?", options: ["Three-dimensional art created by carving, shaping, or assembling materials", "A very detailed painting on a large canvas", "Drawing with special 3D pencils", "A type of printmaking technique"], correctIndex: 0, explanation: "Unlike paintings (2D), sculptures exist in 3D space — you can walk around them and see them from every angle! 🗿" },
      { question: "What common material is used for sculpting that can be fired in a kiln?", options: ["Clay (pottery/ceramics)", "Wood only", "Stone only", "Plastic"], correctIndex: 0, explanation: "Clay can be shaped by hand and hardened permanently by firing in a kiln at high temperatures — making ceramics and pottery! 🏺" },
      { question: "Who sculpted the statue of David?", options: ["Michelangelo", "Leonardo da Vinci", "Donatello", "Raphael"], correctIndex: 0, explanation: "Michelangelo carved David (1501-1504) from a single 5.17m marble block. It's considered the world's greatest sculpture! 🏛️" },
      { question: "What is a relief sculpture?", options: ["A sculpture where figures project from a flat background — not fully three-dimensional", "A sculpture that tells a religious story", "A very small sculpture worn as jewellery", "A sculpture created from recycled materials"], correctIndex: 0, explanation: "Coins have relief sculpture — the portrait slightly raised from the flat background. The Elgin Marbles feature high relief! 🪙" },
      { question: "What is origami?", options: ["The Japanese art of paper folding to create 3D sculptures", "Japanese ink painting on rice paper", "A type of Japanese pottery", "Japanese printmaking on woodblocks"], correctIndex: 0, explanation: "From 'ori' (fold) and 'kami' (paper) — origami creates extraordinary 3D forms from flat paper without cutting or gluing! 🦢" },
      { question: "What materials can sculptors use?", options: ["Stone, wood, clay, metal, glass, fabric, plastic, and found objects", "Only traditional materials like marble and bronze", "Only soft materials that can be moulded by hand", "Only hard materials that can be carved"], correctIndex: 0, explanation: "Modern sculptors use everything — Damien Hirst used formaldehyde, Christo wrapped buildings in fabric! Material choice IS part of the meaning! 🔨" },
    ],
    medium: [
      { question: "What is casting in sculpture?", options: ["Creating a mould then pouring liquid material (metal, concrete, resin) into it to create a solid sculpture when it sets", "Throwing clay on a wheel to create pottery", "Carving away material from a solid block", "Assembling a sculpture from found objects"], correctIndex: 0, explanation: "Bronze casting has been used for 5,000 years. Wax or clay originals are converted into bronze that lasts millennia! 🏛️" },
      { question: "What is the difference between additive and subtractive sculpture?", options: ["Additive: building up material (clay modelling, welding); Subtractive: removing material from a block (carving stone or wood)", "Additive creates modern art; subtractive creates traditional art", "Additive uses soft materials; subtractive uses hard materials only", "They refer to the size of the final sculpture, not the technique"], correctIndex: 0, explanation: "Michelangelo said he saw David already in the marble and simply removed the excess — pure subtractive thinking! 🔨" },
      { question: "What is assemblage in sculpture?", options: ["Creating sculpture by combining found objects and different materials into a unified whole", "Assembling a pre-made sculpture kit bought from a store", "A type of public art created by teams of artists working together", "Creating realistic replicas of existing famous sculptures"], correctIndex: 0, explanation: "Picasso created 'Bull's Head' (1942) from a bicycle saddle and handlebars! Assemblage transforms everyday objects by changing their context! 🚲" },
      { question: "Who was Auguste Rodin and what is his most famous work?", options: ["A 19th-century French sculptor whose 'The Thinker' (1902) is one of the world's most recognised sculptures", "An Italian Renaissance sculptor who worked alongside Michelangelo", "A contemporary American sculptor known for large abstract metal works", "A 20th-century sculptor who created interactive public installations"], correctIndex: 0, explanation: "Rodin's The Thinker was originally part of 'The Gates of Hell' — a doorway depicting Dante's Inferno. The solitary figure represents humanity pondering its fate! 🤔" },
      { question: "What is kineticism in sculpture?", options: ["Sculpture that contains moving parts, powered by wind, water, motors, or human interaction", "Very fast sculpting techniques completed in under an hour", "Sculpture that creates the illusion of movement without actually moving", "A mathematical approach to calculating proportions in sculpture"], correctIndex: 0, explanation: "Alexander Calder invented the mobile — hanging kinetic sculptures that move in air currents. His work transformed how sculpture relates to time and space! 🌀" },
      { question: "What is land art (or earth art)?", options: ["Large-scale sculpture created in natural landscapes using natural materials — often temporary and not in galleries", "Art created from recycled natural materials displayed in museums", "Pottery and ceramics made from locally sourced clay", "Landscape paintings made in the style of sculpture"], correctIndex: 0, explanation: "Robert Smithson's 'Spiral Jetty' (1970) — 6,000 tonnes of black basalt rock forming a spiral in Utah's Great Salt Lake — only viewable from the air! 🌀" },
    ],
    hard: [
      { question: "How did Constantin Brancusi revolutionise sculpture in the 20th century?", options: ["He stripped sculpture to pure abstract form — eliminating representational details to reveal the essential essence of a subject (birds as pure flight, not birds)", "He introduced industrial materials like steel and glass into fine art sculpture", "He created the first monumental public sculptures accessible to all classes", "He pioneered kinetic sculpture by adding motors to traditional marble forms"], correctIndex: 0, explanation: "'Bird in Space' (1928) was so abstract US customs officials refused to classify it as art and taxed it as raw metal! Brancusi sued and won, legally defining what art is! 🦅" },
      { question: "What is the significance of Duchamp's concept of the 'readymade' for sculpture?", options: ["It challenged the idea that sculpture requires craftsmanship — any chosen object becomes sculpture through the artist's designation and context", "It introduced mass production techniques to create affordable sculpture", "It proved that all 3D objects are inherently artistic", "The readymade was significant mainly as a joke — not intended as serious art theory"], correctIndex: 0, explanation: "From Duchamp's urinal (1917) flows all conceptual, installation, and appropriation art. The question 'Is it art?' IS the art. Every contemporary sculptor works in his shadow! 🚽" },
      { question: "How does site-specific sculpture differ from gallery sculpture?", options: ["It is created for and inseparable from a particular location — the place is part of the meaning; moved elsewhere, it loses its significance", "It is simply sculpture displayed outdoors rather than indoors", "Site-specific means made from materials found at that location", "It refers to sculpture commissioned specifically for a building's interior"], correctIndex: 0, explanation: "Richard Serra's 'Tilted Arc' (1981) was destroyed by public vote after it divided a New York plaza. Serra argued it couldn't be moved without being destroyed — he was right! 🏛️" },
      { question: "How has digital fabrication (3D printing) changed contemporary sculpture?", options: ["It allows unprecedented complexity, precision, and reproduction — enabling forms impossible by hand while raising questions about originality and the artist's role", "3D printing has replaced all traditional sculpting methods in professional practice", "It has had minimal impact — collectors still only value hand-made sculpture", "It's only used for architectural models and prototypes, not fine art sculpture"], correctIndex: 0, explanation: "Artists like Morehshin Allahyari use 3D printing to recreate artefacts destroyed by ISIS. Digital fabrication raises profound questions: is a perfect 3D-printed copy an original? 🖨️" },
      { question: "What is the difference between monumental public sculpture and intimate gallery sculpture in terms of function and intent?", options: ["Public sculpture engages community, marks civic values, and must work at distance in open space; gallery sculpture creates intimate personal encounter in controlled environment", "Public sculpture is always figurative; gallery sculpture is always abstract", "Monumental sculpture is inherently more artistically significant than gallery work", "The distinction only matters historically — contemporary artists don't consider it"], correctIndex: 0, explanation: "Antony Gormley's 'Angel of the North' (20m wingspan!) was designed for motorway speed — readable in seconds. His gallery works create intimate spiritual encounters. Same artist, different problems! 🦅" },
    ],
  },
];

function tryLessonBank(topic: string, difficulty: string, numQ: number, seed: number) {
  const t = topic.toLowerCase();
  const entry = LESSON_BANKS.find((b) => b.match.some((m) => t.includes(m)));
  if (!entry) return null;

  const pool: StaticQ[] = (entry as any)[difficulty] ?? entry.medium;
  if (!pool || pool.length === 0) return null;

  const rng = mkRng(seed);
  const shuffled = shuffle([...pool], rng);
  return { topic, questions: shuffled.slice(0, numQ).map((q: StaticQ) => ({ ...q })) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Non-Math Programmatic Quiz Generator
// ─────────────────────────────────────────────────────────────────────────────

type SubjectBank = { easy: StaticQ[]; medium: StaticQ[]; hard: StaticQ[] };

const SUBJECT_BANKS: { keywords: string[]; bank: SubjectBank }[] = [
  {
    keywords: ["science", "plant", "animal", "weather", "body", "water", "solar", "electric", "circuit", "force", "energy", "material", "cell", "ecosystem", "biology", "chemistry", "physics", "space", "earth", "rock", "light", "sound", "magnet", "atmosphere"],
    bank: { easy: SCIENCE_EASY, medium: SCIENCE_MEDIUM, hard: SCIENCE_HARD },
  },
  {
    keywords: ["geograph", "continent", "country", "capital", "ocean", "map", "river", "mountain", "climate", "continent", "city", "nation", "world", "region", "desert", "island"],
    bank: { easy: GEOGRAPHY_EASY, medium: GEOGRAPHY_MEDIUM, hard: GEOGRAPHY_HARD },
  },
  {
    keywords: ["cod", "program", "algorithm", "loop", "variable", "function", "html", "css", "javascript", "python", "debug", "software", "computer", "data", "array", "list", "logic", "binary", "internet", "web", "app", "game"],
    bank: { easy: CODING_EASY, medium: CODING_MEDIUM, hard: CODING_HARD },
  },
  {
    keywords: ["art", "colour", "color", "paint", "draw", "sketch", "sculpture", "artist", "canvas", "brush", "design", "creative", "pattern", "texture", "portrait", "landscape"],
    bank: { easy: ART_EASY, medium: ART_MEDIUM, hard: ART_HARD },
  },
  {
    keywords: ["read", "story", "word", "letter", "spell", "grammar", "poem", "fiction", "novel", "author", "sentence", "paragraph", "verb", "noun", "adjective", "punctuation", "writing", "language", "english", "comprehension"],
    bank: { easy: READING_EASY, medium: READING_MEDIUM, hard: READING_HARD },
  },
];

function tryProgrammaticNonMath(topic: string, difficulty: string, numQ: number, seed: number) {
  const t = topic.toLowerCase();
  const entry = SUBJECT_BANKS.find((e) => e.keywords.some((k) => t.includes(k)));
  if (!entry) return null;

  const pool: StaticQ[] = entry.bank[difficulty as keyof SubjectBank] ?? entry.bank.medium;
  if (pool.length === 0) return null;

  const rng = mkRng(seed);
  const shuffled = shuffle([...pool], rng);
  const questions = shuffled.slice(0, numQ).map((q) => ({ ...q }));
  return { topic, questions };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Prompt builder — only for hard math + all non-math subjects
// ─────────────────────────────────────────────────────────────────────────────
function buildAIPrompt(topic: string, difficulty: string, numQ: number, seed: number): string {
  const t = topic.toLowerCase();

  const contexts = [
    "toys, games, and playgrounds",
    "animals and a jungle adventure",
    "food, pizza, and ice cream",
    "sports and a championship game",
    "superheroes and their powers",
    "a fun school trip",
    "pets and a pet show",
  ];
  const ctx = contexts[seed % contexts.length];

  let specificRules = "";

  if (t.includes("addition") || t.includes("adding")) {
    specificRules = `HARD ADDITION — create real-world WORD PROBLEMS only:
- Use ${ctx} as the story setting
- Each question involves adding 2-3 numbers (2-3 digit range)
- Example: "The school store sold 34 pencils on Monday and 47 on Tuesday. How many total?"
- Vary: combining groups, total scores, total distances, total costs`;
  } else if (t.includes("subtraction") || t.includes("subtract")) {
    specificRules = `HARD SUBTRACTION — create real-world WORD PROBLEMS only:
- Use ${ctx} as the story setting
- Involve taking away, finding differences, or missing numbers
- Example: "A bag had 82 marbles. 37 were lost. How many remain?"`;
  } else if (t.includes("multiplication") || t.includes("multiply")) {
    specificRules = `HARD MULTIPLICATION — create real-world WORD PROBLEMS only:
- Use ${ctx} as the story setting
- Involve groups, arrays, repeated addition
- Example: "6 shelves each have 9 books. How many books total?"`;
  } else if (t.includes("division") || t.includes("divid")) {
    specificRules = `HARD DIVISION — create real-world WORD PROBLEMS only:
- Use ${ctx} as the story setting
- Involve fair sharing, grouping, splitting
- Example: "48 cupcakes shared equally among 6 friends. How many each?"`;
  } else if (t.includes("fraction")) {
    specificRules = `HARD FRACTIONS — mix of word problems and concept questions:
- Use ${ctx} as the story setting
- Cover: equivalent fractions, ordering, adding simple fractions
- Example: "A pizza has 8 slices. You ate 3. What fraction is left?"`;
  } else if (t.includes("science") || t.includes("plant") || t.includes("animal") || t.includes("weather") || t.includes("body") || t.includes("water") || t.includes("solar")) {
    const levels: Record<string, string> = {
      easy: "Ask single basic facts with simple words. Age 7-8 level. Example: 'What do plants need to grow?'",
      medium: "Apply a concept or cause-and-effect. One step of reasoning. Age 9-11 level. Example: 'What happens when ice is heated?'",
      hard: "Ask WHY or HOW things work. Use scientific terms. Multi-step reasoning. Age 12-14 level.",
    };
    specificRules = `SCIENCE (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  } else if (t.includes("geograph") || t.includes("continent") || t.includes("country") || t.includes("capital") || t.includes("ocean") || t.includes("map")) {
    const levels: Record<string, string> = {
      easy: "Famous capitals, major continents, very well-known countries. Example: 'What is the capital of France?'",
      medium: "Landmarks, climate zones, major rivers, population facts.",
      hard: "Border countries, comparative geography, lesser-known capitals, geopolitical facts.",
    };
    specificRules = `GEOGRAPHY (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  } else if (t.includes("cod") || t.includes("program") || t.includes("algorithm") || t.includes("loop") || t.includes("variable")) {
    const levels: Record<string, string> = {
      easy: "Basic definitions: 'What is a variable?', 'What does a loop do?' Simple one-sentence answers.",
      medium: "Read a short code snippet and predict the output. Or choose the right concept for a task.",
      hard: "Debugging, algorithm logic, nested structures, or basic time-complexity.",
    };
    specificRules = `CODING (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  } else if (t.includes("art") || t.includes("color") || t.includes("paint") || t.includes("draw")) {
    const levels: Record<string, string> = {
      easy: "Basic colour mixing, famous artists by first name, simple art materials. Example: 'What colours mix to make green?'",
      medium: "Art techniques, styles, famous paintings matched to artists.",
      hard: "Art movements, historical context, art theory, symbolism.",
    };
    specificRules = `ART (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  } else if (t.includes("read") || t.includes("story") || t.includes("word") || t.includes("letter") || t.includes("spelling") || t.includes("grammar")) {
    const levels: Record<string, string> = {
      easy: "Simple vocabulary, rhyming words, basic comprehension, letter sounds. Age 7-8.",
      medium: "Context clues, synonyms/antonyms, simple inference. Age 9-11.",
      hard: "Literary devices, author's purpose, figurative language, complex inference. Age 12-14.",
    };
    specificRules = `READING/LANGUAGE (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  } else {
    const levels: Record<string, string> = {
      easy: "Only the most basic, single-fact questions. Simple language. Age 7-8.",
      medium: "One step of thinking or applying a known concept. Age 9-11.",
      hard: "Multi-step reasoning or applying multiple concepts. Age 12-14.",
    };
    specificRules = `TOPIC: ${topic} (${difficulty}): ${levels[difficulty] ?? levels.medium}`;
  }

  return `You are making a quiz for a kids learning app. Session: ${seed}.

Topic: "${topic}" | Difficulty: ${difficulty.toUpperCase()} | Questions: ${numQ}

RULES YOU MUST FOLLOW:
${specificRules}

GENERAL RULES:
- Keep language simple and friendly for kids
- Each question has exactly 4 options
- Wrong options must be plausible but wrong
- Vary numbers, names, scenarios using seed ${seed}
- Explanations: short, encouraging, educational

Return ONLY valid JSON:
{
  "topic": "${topic}",
  "questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "..."
    }
  ]
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quiz Route
// ─────────────────────────────────────────────────────────────────────────────
const quizRequestSchema = z.object({
  topic: z.string().min(1),
  numQuestions: z.number().int().min(1).max(10).default(5),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  seed: z.number().optional(),
});

router.post("/quiz", authenticate, async (req: AuthRequest, res) => {
  const parsed = quizRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map(i => i.message).join(", ") });
    return;
  }

  const { topic, numQuestions, difficulty, seed = Date.now() } = parsed.data;

  // 1. Try lesson-specific banks FIRST — most precise match, avoids false keyword hits
  const lessonResult = tryLessonBank(topic, difficulty, numQuestions, seed);
  if (lessonResult) {
    res.json(lessonResult);
    return;
  }

  // 2. Try math generator for math topics
  const mathResult = tryProgrammaticMath(topic, difficulty, numQuestions, seed);
  if (mathResult) {
    res.json(mathResult);
    return;
  }

  // 3. Try broad subject banks (Science, Geography, Coding, Art, Reading & Writing)
  const staticResult = tryProgrammaticNonMath(topic, difficulty, numQuestions, seed);
  if (staticResult) {
    res.json(staticResult);
    return;
  }

  // 4. Fallback: use the science bank as a generic fallback so the quiz is never blank
  const fallback = tryProgrammaticNonMath("science", difficulty, numQuestions, seed);
  if (fallback) {
    res.json({ ...fallback, topic });
    return;
  }

  res.status(404).json({ error: "TopicNotFound", message: `No quiz available for topic: ${topic}` });
});

// ─────────────────────────────────────────────────────────────────────────────
// Recommend Route
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recommend", authenticate, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const allCourses = await db.select().from(coursesTable);

  const userProgress = await db
    .select()
    .from(userProgressTable)
    .where(and(eq(userProgressTable.userId, userId), eq(userProgressTable.completed, true)));

  const inProgressCourseIds = new Set(userProgress.map((p) => p.courseId));

  const courseSummary = allCourses.map((c) => ({
    id: c.id,
    title: c.title,
    subject: c.subject,
    gradeLevel: c.gradeLevel,
    difficulty: c.difficulty,
    inProgress: inProgressCourseIds.has(c.id),
  }));

  const prompt = `You are a helpful educational recommendation AI for a kids learning platform.

Available courses:
${JSON.stringify(courseSummary, null, 2)}

The student has made progress in courses with IDs: [${Array.from(inProgressCourseIds).join(", ")}]

Please recommend 3-4 courses that would be most beneficial for this student to take next.

Respond ONLY with valid JSON in this format:
{
  "courseIds": [1, 2, 3],
  "reason": "Brief encouraging explanation of why these courses are recommended"
}`;

  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("No content");

    const result = JSON.parse(content);
    const recommendedIds: number[] = result.courseIds ?? [];
    const recommendedCourses = allCourses.filter((c) => recommendedIds.includes(c.id)).slice(0, 4);

    const fallback = allCourses.slice(0, 4);
    const finalCourses = recommendedCourses.length > 0 ? recommendedCourses : fallback;

    res.json({
      recommendations: finalCourses.map((c) => ({
        id: String(c.id),
        title: c.title,
        description: c.description,
        subject: c.subject,
        gradeLevel: c.gradeLevel,
        thumbnail: c.thumbnail,
        totalLessons: c.totalLessons,
        durationMinutes: c.durationMinutes,
        difficulty: c.difficulty,
        createdAt: c.createdAt.toISOString(),
      })),
      reason: result.reason ?? "Here are some courses to get you started!",
    });
  } catch {
    const fallback = allCourses.slice(0, 4);
    res.json({
      recommendations: fallback.map((c) => ({
        id: String(c.id),
        title: c.title,
        description: c.description,
        subject: c.subject,
        gradeLevel: c.gradeLevel,
        thumbnail: c.thumbnail,
        totalLessons: c.totalLessons,
        durationMinutes: c.durationMinutes,
        difficulty: c.difficulty,
        createdAt: c.createdAt.toISOString(),
      })),
      reason: "Here are some popular courses to get you started!",
    });
  }
});

export default router;
