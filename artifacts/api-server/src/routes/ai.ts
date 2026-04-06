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

  // 1. Try math (covers all math sub-topics at all difficulty levels, including hard word problems)
  const mathResult = tryProgrammaticMath(topic, difficulty, numQuestions, seed);
  if (mathResult) {
    res.json(mathResult);
    return;
  }

  // 2. Try static banks for all other subjects (Science, Geography, Coding, Art, Reading & Writing)
  const staticResult = tryProgrammaticNonMath(topic, difficulty, numQuestions, seed);
  if (staticResult) {
    res.json(staticResult);
    return;
  }

  // 3. Fallback: generate general knowledge questions using the best matching bank
  // Use the science bank as a generic fallback so the quiz is never blank
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
