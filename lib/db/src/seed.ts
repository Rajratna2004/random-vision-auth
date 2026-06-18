import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in lib/db/.env");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const { coursesTable, lessonsTable } = schema;

const CHALLENGES: Record<string, Record<number, any[]>> = {
  "Math Adventures": {
    "1": [
      {
        options: ["5", "6", "7", "8"],
        question: "What is 4 + 3?",
        explanation: "4+3=7. Count forward 3 from 4: 5,6,7!",
        correctIndex: 2,
      },
      {
        options: ["10", "11", "12", "13"],
        question: "What is 6 + 5?",
        explanation: "6+5=11. 6+4=10, then +1=11!",
        correctIndex: 1,
      },
      {
        options: ["10", "11", "12", "13"],
        question: "What is 9 + 2?",
        explanation: "Start at 9, jump 2: 10,11!",
        correctIndex: 1,
      },
      {
        options: ["7+3", "3×7", "7−3", "3÷7"],
        question: "Which is the same as 3 + 7?",
        explanation: "Addition is commutative: 3+7=7+3=10.",
        correctIndex: 0,
      },
      {
        options: ["0", "1", "15", "16"],
        question: "What is 0 + 15?",
        explanation: "Adding 0 keeps the number the same: 0+15=15.",
        correctIndex: 2,
      },
      {
        options: ["12", "13", "14", "15"],
        question: "8 red balls and 6 blue balls. Total?",
        explanation: "8+6=14. Break it: 8+2=10, then 10+4=14.",
        correctIndex: 2,
      },
      {
        options: ["19", "20", "21", "22"],
        question: "Sum of 12 and 9?",
        explanation: "12+9=21. Tens trick: 12+8=20, then +1=21.",
        correctIndex: 2,
      },
      {
        options: ["3 and 6", "4 and 7", "2 and 8", "5 and 4"],
        question: "Which pair adds up to 10?",
        explanation: "2+8=10. Number bonds to 10!",
        correctIndex: 2,
      },
      {
        options: ["25", "28", "30", "32"],
        question: "What is 15 + 15?",
        explanation: "15+15=30. 10+10=20, 5+5=10, total=30.",
        correctIndex: 2,
      },
      {
        options: ["22", "23", "24", "25"],
        question: "13 girls + 11 boys = ?",
        explanation: "13+11=24. Tens: 10+10=20, ones: 3+1=4, total=24.",
        correctIndex: 2,
      },
    ],
    "2": [
      {
        options: ["3", "4", "5", "6"],
        question: "What is 9 − 4?",
        explanation: "9−4=5. Count back 4 from 9: 8,7,6,5!",
        correctIndex: 2,
      },
      {
        options: ["6", "7", "8", "9"],
        question: "What is 15 − 7?",
        explanation: "15−7=8. Think: 7+8=15.",
        correctIndex: 2,
      },
      {
        options: ["9", "10", "11", "12"],
        question: "20 stickers, give away 9. How many left?",
        explanation: "20−9=11. Use 20−10=10, add back 1.",
        correctIndex: 2,
      },
      {
        options: ["0", "1", "11", "12"],
        question: "What is 12 − 0?",
        explanation: "Subtracting 0 leaves unchanged: 12−0=12.",
        correctIndex: 3,
      },
      {
        options: ["8", "9", "10", "11"],
        question: "What is 18 − 9?",
        explanation: "18−9=9. Since 9+9=18, answer is 9!",
        correctIndex: 1,
      },
      {
        options: ["6", "7", "8", "9"],
        question: "14 − __ = 6. What is the missing number?",
        explanation: "14−8=6. Check: 6+8=14. ✓",
        correctIndex: 2,
      },
      {
        options: ["16", "17", "18", "19"],
        question: "What is 30 − 12?",
        explanation: "30−12=18. 30−10=20, then 20−2=18.",
        correctIndex: 2,
      },
      {
        options: ["15", "16", "17", "18"],
        question: "Shop has 25 toys, sells 8. How many remain?",
        explanation: "25−8=17. 25−5=20, then 20−3=17.",
        correctIndex: 2,
      },
      {
        options: ["55", "60", "65", "70"],
        question: "What is 100 − 35?",
        explanation: "100−35=65. 100−30=70, then 70−5=65.",
        correctIndex: 2,
      },
      {
        options: ["7+9=16", "9−7=2", "16+7=23", "9+16=25"],
        question: "Which addition checks 16 − 7 = 9?",
        explanation: "7+9=16 verifies 16−7=9.",
        correctIndex: 0,
      },
    ],
    "3": [
      {
        options: ["12", "13", "15", "18"],
        question: "What is 3 × 5?",
        explanation: "3×5=15. Three groups of 5: 5,10,15!",
        correctIndex: 2,
      },
      {
        options: ["12", "14", "16", "18"],
        question: "What is 4 × 4?",
        explanation: "4×4=16. Four 4s: 4,8,12,16!",
        correctIndex: 2,
      },
      {
        options: ["3×6", "6×6", "3+6", "6−3"],
        question: "Which is the same as 6+6+6?",
        explanation: "6+6+6 is 3 groups of 6 = 3×6=18.",
        correctIndex: 0,
      },
      {
        options: ["18", "19", "21", "24"],
        question: "What is 7 × 3?",
        explanation: "7×3=21. 7×2=14, then +7=21.",
        correctIndex: 2,
      },
      {
        options: ["16", "17", "18", "19"],
        question: "What is 9 × 2?",
        explanation: "9×2=18. Double 9 is 18.",
        correctIndex: 2,
      },
      {
        options: ["24", "28", "30", "36"],
        question: "6 chocolates per box. How many in 5 boxes?",
        explanation: "5×6=30. Five 6s: 6,12,18,24,30!",
        correctIndex: 2,
      },
      {
        options: ["18", "80", "800", "810"],
        question: "What is 8 × 10?",
        explanation: "Multiplying by 10 adds a zero: 8×10=80.",
        correctIndex: 1,
      },
      {
        options: ["21", "24", "28", "32"],
        question: "If 4×7=28, what is 7×4?",
        explanation: "Multiplication is commutative: 4×7=7×4=28.",
        correctIndex: 2,
      },
      {
        options: ["30", "32", "36", "42"],
        question: "What is 6 × 6?",
        explanation: "6×6=36. A perfect square!",
        correctIndex: 2,
      },
      {
        options: ["30", "33", "36", "39"],
        question: "What is 11 × 3?",
        explanation: "11×3=33. 10×3=30, plus 1×3=3.",
        correctIndex: 1,
      },
    ],
    "4": [
      {
        options: ["2", "3", "4", "5"],
        question: "What is 12 ÷ 4?",
        explanation: "12÷4=3. Think: 4×3=12. ✓",
        correctIndex: 1,
      },
      {
        options: ["3", "4", "5", "6"],
        question: "What is 20 ÷ 5?",
        explanation: "20÷5=4. Five 4s make 20.",
        correctIndex: 1,
      },
      {
        options: ["4", "5", "6", "7"],
        question: "18 sweets shared among 3. How many each?",
        explanation: "18÷3=6. Three 6s = 18. ✓",
        correctIndex: 2,
      },
      {
        options: ["4", "5", "6", "7"],
        question: "What is 36 ÷ 6?",
        explanation: "36÷6=6. Check: 6×6=36. ✓",
        correctIndex: 2,
      },
      {
        options: ["2", "3", "4", "5"],
        question: "What is 24 ÷ 8?",
        explanation: "24÷8=3. Check: 8×3=24. ✓",
        correctIndex: 1,
      },
      {
        options: ["30", "35", "40", "45"],
        question: "Which number divided by 7 gives 5?",
        explanation: "35÷7=5. Because 7×5=35.",
        correctIndex: 1,
      },
      {
        options: ["1", "10", "100", "1000"],
        question: "What is 100 ÷ 10?",
        explanation: "100÷10=10. Dividing by 10 removes one zero.",
        correctIndex: 1,
      },
      {
        options: ["4", "5", "6", "7"],
        question: "What is 45 ÷ 9?",
        explanation: "45÷9=5. Check: 9×5=45. ✓",
        correctIndex: 1,
      },
      {
        options: ["8×7=56", "56×7=8", "7×56=8", "8÷7=56"],
        question: "Which multiplication checks 56 ÷ 8 = 7?",
        explanation: "8×7=56 verifies that 56÷8=7.",
        correctIndex: 0,
      },
      {
        options: ["6", "7", "8", "9"],
        question: "48 eggs in boxes of 6. How many boxes?",
        explanation: "48÷6=8. Check: 6×8=48. ✓",
        correctIndex: 2,
      },
    ],
    "5": [
      {
        options: ["1/2", "1/3", "1/4", "1/5"],
        question: "Cake cut into 4 pieces, you eat 1. What fraction?",
        explanation: "1 out of 4 = 1/4.",
        correctIndex: 2,
      },
      {
        options: ["1/3", "2/3", "2/4", "3/4"],
        question: "Which fraction is equivalent to 1/2?",
        explanation: "2/4=1/2. Multiply top and bottom by 2.",
        correctIndex: 2,
      },
      {
        options: ["1/2", "1/3", "1/4", "1/6"],
        question: "Which fraction is the largest?",
        explanation:
          "1/2 is largest. Same numerator, smaller denominator = larger fraction.",
        correctIndex: 0,
      },
      {
        options: ["1/4", "1/2", "2/8", "2/4"],
        question: "What is 1/4 + 1/4?",
        explanation: "1/4+1/4=2/4=1/2.",
        correctIndex: 1,
      },
      {
        options: ["5/3", "3/5", "1 2/3", "10/10"],
        question: "Which is a mixed number?",
        explanation:
          "1 2/3 has a whole number AND a fraction — it is a mixed number.",
        correctIndex: 2,
      },
      {
        options: ["25cm", "50cm", "75cm", "100cm"],
        question: "Ribbon 1/2 metre long. In centimetres? (1m=100cm)",
        explanation: "1/2 of 100cm = 50cm.",
        correctIndex: 1,
      },
      {
        options: ["0", "1", "2", "3"],
        question: "3/3 equals which whole number?",
        explanation: "3/3=1 whole. Numerator equals denominator.",
        correctIndex: 1,
      },
      {
        options: ["3/4", "5/8", "2/5", "3/5"],
        question: "Which fraction is less than 1/2?",
        explanation: "2/5=0.4, less than 1/2=0.5.",
        correctIndex: 2,
      },
      {
        options: ["1/5", "1/4", "1/3", "1/2"],
        question: "What fraction of 20 is 5?",
        explanation: "5/20=1/4. Divide both by 5.",
        correctIndex: 1,
      },
      {
        options: ["3 1/2", "2 1/2", "3 1/4", "2 3/4"],
        question: "Convert 7/2 to a mixed number.",
        explanation: "7÷2=3 remainder 1. So 7/2=3 1/2.",
        correctIndex: 0,
      },
    ],
    "6": [
      {
        options: ["4 ones", "4 tens", "4 tenths", "4 hundredths"],
        question: "Value of 4 in 3.47?",
        explanation: "In 3.47, the 4 is in the tenths place = 0.4.",
        correctIndex: 2,
      },
      {
        options: ["0.5", "0.45", "0.505", "0.09"],
        question: "Which decimal is largest?",
        explanation: "0.505 > 0.5 > 0.45 > 0.09.",
        correctIndex: 2,
      },
      {
        options: ["3.5", "3.6", "3.8", "4.0"],
        question: "What is 1.5 + 2.3?",
        explanation: "1.5+2.3=3.8.",
        correctIndex: 2,
      },
      {
        options: ["4", "5", "6", "7"],
        question: "Round 4.67 to nearest whole number.",
        explanation: "4.67 rounds to 5 because .67 > .5.",
        correctIndex: 1,
      },
      {
        options: ["3.10", "4.0", "4.1", "3.91"],
        question: "What is 3.9 + 0.1?",
        explanation: "3.9+0.1=4.0. Ten tenths = 1 whole.",
        correctIndex: 1,
      },
      {
        options: ["1/4", "1/2", "1/5", "1/3"],
        question: "Which fraction equals 0.25?",
        explanation: "0.25=25/100=1/4. A quarter!",
        correctIndex: 0,
      },
      {
        options: ["2.4", "3.0", "3.4", "3.7"],
        question: "What is 5.7 − 2.3?",
        explanation: "5.7−2.3=3.4.",
        correctIndex: 2,
      },
      {
        options: ["5", "50", "500", "0.05"],
        question: "How many hundredths are in 0.5?",
        explanation: "0.5=0.50=50 hundredths.",
        correctIndex: 1,
      },
      {
        options: ["1.7", "1.8", "2.0", "1.75"],
        question: "1.75 litres rounded to nearest tenth?",
        explanation: "Hundredths digit is 5, round up: 1.8.",
        correctIndex: 1,
      },
      {
        options: ["0.01", "0.10", "1.0", "10.0"],
        question: "What is 0.1 × 10?",
        explanation: "0.1×10=1.0. Decimal moves right one place.",
        correctIndex: 2,
      },
    ],
    "7": [
      {
        options: ["5", "6", "7", "8"],
        question: "How many sides does a hexagon have?",
        explanation: "Hexagon has 6 sides. 'Hex' is Greek for 6.",
        correctIndex: 1,
      },
      {
        options: ["Right", "Acute", "Obtuse", "Straight"],
        question: "What type of angle is 45°?",
        explanation: "45° is acute — less than 90°.",
        correctIndex: 1,
      },
      {
        options: ["Acute", "Obtuse", "Right", "Reflex"],
        question: "What type of angle is exactly 90°?",
        explanation: "90° is a right angle — like the corner of a square.",
        correctIndex: 2,
      },
      {
        options: ["15cm", "20cm", "25cm", "10cm"],
        question: "Square with 5cm sides. Perimeter?",
        explanation: "Perimeter = 4×5 = 20cm.",
        correctIndex: 1,
      },
      {
        options: ["Sphere", "Cylinder", "Pyramid", "Cube"],
        question: "Which 3D shape has 6 square faces?",
        explanation: "A cube has 6 equal square faces.",
        correctIndex: 3,
      },
      {
        options: ["90°", "180°", "270°", "360°"],
        question: "Sum of all angles in a triangle?",
        explanation: "All angles in any triangle add up to 180°.",
        correctIndex: 1,
      },
      {
        options: ["Acute", "Right", "Obtuse", "Straight"],
        question: "What type of angle is 120°?",
        explanation: "120° is obtuse — between 90° and 180°.",
        correctIndex: 2,
      },
      {
        options: ["1", "2", "3", "4"],
        question: "How many lines of symmetry does a square have?",
        explanation: "A square has 4 lines of symmetry.",
        correctIndex: 3,
      },
      {
        options: ["20cm²", "22cm²", "24cm²", "26cm²"],
        question: "Area of a rectangle 6cm × 4cm?",
        explanation: "Area = length × width = 6×4 = 24cm².",
        correctIndex: 2,
      },
      {
        options: ["3", "4", "5", "6"],
        question: "How many faces does a triangular pyramid have?",
        explanation:
          "A triangular pyramid (tetrahedron) has 4 triangular faces.",
        correctIndex: 1,
      },
    ],
    "8": [
      {
        options: ["10", "100", "1000", "10000"],
        question: "How many centimetres in 1 metre?",
        explanation: "1 metre = 100 centimetres.",
        correctIndex: 1,
      },
      {
        options: ["250g", "2500g", "25000g", "25g"],
        question: "Convert 2.5kg to grams.",
        explanation: "2.5kg × 1000 = 2500g.",
        correctIndex: 1,
      },
      {
        options: ["10cm", "12cm", "14cm", "16cm"],
        question: "Pencil 18cm, ruler 30cm. How much longer is the ruler?",
        explanation: "30−18=12cm longer.",
        correctIndex: 1,
      },
      {
        options: ["1500g", "1.2kg", "They are equal", "Cannot compare"],
        question: "Which is heavier: 1500g or 1.2kg?",
        explanation: "1.2kg=1200g. Since 1500g > 1200g, 1500g is heavier.",
        correctIndex: 0,
      },
      {
        options: ["300m", "3000m", "30000m", "300000m"],
        question: "Convert 3km to metres.",
        explanation: "3km = 3×1000 = 3000m.",
        correctIndex: 1,
      },
      {
        options: ["350g", "3500g", "35000g", "350000g"],
        question: "Baby weighs 3.5kg. In grams?",
        explanation: "3.5kg = 3.5×1000 = 3500g.",
        correctIndex: 1,
      },
      {
        options: [
          "50cm, 1m, 120cm",
          "1m, 50cm, 120cm",
          "120cm, 1m, 50cm",
          "50cm, 120cm, 1m",
        ],
        question: "Shortest to longest: 1m, 50cm, 120cm.",
        explanation:
          "50cm=0.5m, 1m=100cm, 120cm=1.2m. Order: 50cm < 1m < 120cm.",
        correctIndex: 0,
      },
      {
        options: ["2750g", "3000g", "2250g", "2500g"],
        question: "2kg flour + 750g sugar = ? grams",
        explanation: "2kg=2000g. 2000+750=2750g.",
        correctIndex: 0,
      },
      {
        options: ["mm", "cm", "m", "km"],
        question: "Best unit to measure distance between cities?",
        explanation:
          "Kilometres (km) are used for large distances between cities.",
        correctIndex: 3,
      },
      {
        options: ["7.4m", "8.0m", "8.4m", "8.8m"],
        question: "5.6m + 2.8m = ?",
        explanation: "5.6+2.8=8.4m.",
        correctIndex: 2,
      },
    ],
    "9": [
      {
        options: ["30", "60", "90", "120"],
        question: "How many minutes in one hour?",
        explanation: "There are 60 minutes in one hour.",
        correctIndex: 1,
      },
      {
        options: ["4:05", "4:15", "4:25", "4:45"],
        question: "What time is quarter past 4?",
        explanation: "Quarter past 4 = 4:15. 'Quarter' = 15 minutes.",
        correctIndex: 1,
      },
      {
        options: ["100 mins", "120 mins", "180 mins", "60 mins"],
        question: "Convert 2 hours to minutes.",
        explanation: "2 hours × 60 = 120 minutes.",
        correctIndex: 1,
      },
      {
        options: ["13:30", "14:30", "15:30", "16:30"],
        question: "What is 3:30pm in 24-hour time?",
        explanation: "3pm = 15:00. So 3:30pm = 15:30.",
        correctIndex: 2,
      },
      {
        options: ["£4.50", "£5.00", "£5.50", "£6.00"],
        question: "Buy book for £4.50, pay with £10. Change?",
        explanation: "£10.00 − £4.50 = £5.50 change.",
        correctIndex: 2,
      },
      {
        options: ["275p", "250p", "175p", "200p"],
        question: "How many pence in £2.75?",
        explanation: "£2.75 × 100 = 275 pence.",
        correctIndex: 0,
      },
      {
        options: ["90 seconds", "2 minutes", "100 seconds", "They are equal"],
        question: "Longest: 90 seconds, 2 minutes, or 100 seconds?",
        explanation: "2 minutes = 120 seconds. 120 > 100 > 90.",
        correctIndex: 1,
      },
      {
        options: ["15:45", "15:75", "16:15", "16:45"],
        question: "Film starts 14:30, lasts 1h 45min. End time?",
        explanation: "14:30 + 1:45 = 16:15.",
        correctIndex: 2,
      },
      {
        options: ["20p", "25p", "30p", "35p"],
        question: "3 apples cost 75p. How much is 1 apple?",
        explanation: "75p ÷ 3 = 25p per apple.",
        correctIndex: 1,
      },
      {
        options: ["£10", "£11", "£12", "£13"],
        question: "Save £1.50 per week for 8 weeks. Total?",
        explanation: "£1.50 × 8 = £12.00.",
        correctIndex: 2,
      },
    ],
    "10": [
      {
        options: ["8 and 16", "9 and 15", "10 and 14", "11 and 13"],
        question: "Sum of two numbers is 24, difference is 6. The numbers are:",
        explanation: "x+y=24, x−y=6. Adding: 2x=30, x=15, y=9.",
        correctIndex: 1,
      },
      {
        options: ["24", "28", "32", "36"],
        question: "Next in pattern: 2, 4, 8, 16, ___?",
        explanation: "Each number doubles! 16×2=32.",
        correctIndex: 2,
      },
      {
        options: ["11:55", "11:45", "12:05", "12:15"],
        question: "Train leaves 09:15, arrives 2h 40min later. Arrival?",
        explanation: "09:15 + 2:40 = 11:55.",
        correctIndex: 0,
      },
      {
        options: ["25p", "30p", "35p", "40p"],
        question:
          "3 pens + 2 rulers = £1.60. One pen costs 30p. One ruler costs?",
        explanation: "3 pens=90p. Rulers=70p. One ruler=35p.",
        correctIndex: 2,
      },
      {
        options: ["30", "34", "36", "40"],
        question: "Next square number after 25?",
        explanation:
          "Square numbers: 1,4,9,16,25,36... After 25 (5²) comes 36 (6²).",
        correctIndex: 2,
      },
      {
        options: ["2", "4", "6", "8"],
        question: "Fold square paper in half twice. How many layers?",
        explanation: "Fold 1 = 2 layers. Fold 2 = 4 layers. Each fold doubles.",
        correctIndex: 1,
      },
      {
        options: ["8", "10", "7", "9"],
        question:
          "5 children share 35 stickers, then each finds 3 more. How many each?",
        explanation: "35÷5=7 each. Then 7+3=10 stickers each.",
        correctIndex: 1,
      },
      {
        options: ["5", "6", "7", "8"],
        question: "6 × ? = 3 × 14. What is ??",
        explanation: "3×14=42. So 6×?=42, ?=7.",
        correctIndex: 2,
      },
      {
        options: ["55", "60", "65", "70"],
        question: "Sequence from 100 decreasing by 15. What is the 4th term?",
        explanation: "100, 85, 70, 55.",
        correctIndex: 0,
      },
      {
        options: [
          "Draw a diagram",
          "Work backwards",
          "Look for patterns",
          "Make it simpler",
        ],
        question:
          "Best strategy for 'find missing angle in triangle with 50° and 70°'?",
        explanation: "Work backwards: 180−50−70=60°.",
        correctIndex: 1,
      },
    ],
  },
  "Science Explorer": {
    "1": [
      {
        options: ["Condensation", "Evaporation", "Precipitation", "Collection"],
        question: "How does liquid water turn into vapour?",
        explanation:
          "Evaporation uses the sun's heat to turn liquid water into water vapour.",
        correctIndex: 1,
      },
      {
        options: ["Ice", "Steam", "Condensed water vapour", "Polluted air"],
        question: "What do clouds form from?",
        explanation:
          "Clouds form when water vapour cools and condenses into tiny droplets.",
        correctIndex: 2,
      },
      {
        options: ["Rain", "Drizzle", "Snow", "Fog"],
        question: "Which type of precipitation is frozen?",
        explanation:
          "Snow is frozen precipitation — water droplets that freeze in cold clouds.",
        correctIndex: 2,
      },
      {
        options: ["Rivers", "Ice caps", "Oceans", "Puddles"],
        question: "Where does most of Earth's evaporation come from?",
        explanation:
          "The oceans cover over 70% of Earth and are the main source of evaporation.",
        correctIndex: 2,
      },
      {
        options: ["Wind", "Gravity", "Magnetism", "Friction"],
        question: "What force pulls precipitation back down?",
        explanation:
          "Gravity pulls water droplets down when they become heavy enough.",
        correctIndex: 1,
      },
      {
        options: ["Evaporation", "Run-off", "Infiltration", "Condensation"],
        question: "Which stage involves water soaking into the ground?",
        explanation:
          "Infiltration is when water soaks into soil and becomes groundwater.",
        correctIndex: 2,
      },
      {
        options: [
          "It evaporates",
          "It condensates",
          "It precipitates",
          "It collects",
        ],
        question: "What happens to water vapour when it cools?",
        explanation:
          "When water vapour cools, it condenses back into liquid water droplets.",
        correctIndex: 1,
      },
      {
        options: ["Stratosphere", "Thermosphere", "Troposphere", "Mesosphere"],
        question: "In which atmosphere layer do clouds form?",
        explanation:
          "Clouds form in the troposphere — the lowest layer of the atmosphere.",
        correctIndex: 2,
      },
      {
        options: ["The Moon", "Wind", "The Sun", "Gravity"],
        question: "What provides energy to drive the water cycle?",
        explanation:
          "The Sun provides heat energy driving evaporation and the entire water cycle.",
        correctIndex: 2,
      },
      {
        options: ["Oceans", "Plants", "Clouds", "Ice"],
        question: "Transpiration is water released by __.",
        explanation:
          "Plants absorb water through roots and release it through leaves — transpiration.",
        correctIndex: 1,
      },
    ],
    "2": [
      {
        options: ["Gas", "Liquid", "Solid", "Plasma"],
        question: "Which state of matter has a definite shape?",
        explanation:
          "Solids have tightly packed particles that keep a fixed shape.",
        correctIndex: 2,
      },
      {
        options: [
          "Particles stop moving",
          "Particles get closer",
          "Particles gain energy and move apart",
          "Particles freeze",
        ],
        question: "What happens when a solid melts?",
        explanation:
          "Heating gives particles energy to move faster and further apart.",
        correctIndex: 2,
      },
      {
        options: ["Melting", "Evaporation", "Deposition", "Sublimation"],
        question: "What is it called when a solid becomes a gas directly?",
        explanation:
          "Sublimation: solid turns directly to gas (e.g., dry ice).",
        correctIndex: 3,
      },
      {
        options: ["Solid", "Liquid", "Gas", "All the same"],
        question: "Which state has particles farthest apart?",
        explanation: "Gas particles are farthest apart and move most freely.",
        correctIndex: 2,
      },
      {
        options: ["Freezing", "Condensation", "Evaporation", "Melting"],
        question: "Ice cream melting in the sun is an example of:",
        explanation:
          "The solid ice cream turns to liquid when heated — melting.",
        correctIndex: 3,
      },
      {
        options: ["80°C", "90°C", "100°C", "110°C"],
        question: "At what temperature does water boil (standard pressure)?",
        explanation: "Water boils at 100°C at standard atmospheric pressure.",
        correctIndex: 2,
      },
      {
        options: [
          "Evaporation",
          "Condensation",
          "Sublimation",
          "Precipitation",
        ],
        question: "Steam on a cold mirror turning to water is:",
        explanation:
          "Steam (gas) cooling on cold mirror condenses back to liquid water.",
        correctIndex: 1,
      },
      {
        options: ["Wood", "Air", "Iron", "Ice"],
        question: "Which of these is NOT a solid?",
        explanation: "Air is a gas — it has no fixed shape or volume.",
        correctIndex: 1,
      },
      {
        options: ["−10°C", "0°C", "4°C", "10°C"],
        question: "At what temperature does water freeze?",
        explanation: "Water freezes at 0°C under standard conditions.",
        correctIndex: 1,
      },
      {
        options: ["Colour", "Mass", "Smell", "Taste"],
        question: "A property ALL matter has is:",
        explanation:
          "All matter has mass. Not all matter has colour, smell, or taste.",
        correctIndex: 1,
      },
    ],
    "3": [
      {
        options: [
          "Only sunlight",
          "Water, warmth, and air",
          "Only water",
          "Fertilizer and light",
        ],
        question: "What do seeds need to germinate?",
        explanation: "Seeds need water, warmth, and air to germinate.",
        correctIndex: 1,
      },
      {
        options: ["Leaves", "Stem", "Roots", "Flowers"],
        question: "Which part absorbs water from the soil?",
        explanation: "Roots absorb water and minerals from the soil.",
        correctIndex: 2,
      },
      {
        options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
        question: "What gas do plants absorb during photosynthesis?",
        explanation:
          "Plants absorb CO2 during photosynthesis and release oxygen.",
        correctIndex: 2,
      },
      {
        options: ["Melanin", "Chlorophyll", "Carotene", "Protein"],
        question: "What is the green pigment in leaves?",
        explanation: "Chlorophyll captures light energy for photosynthesis.",
        correctIndex: 1,
      },
      {
        options: ["Roots", "Stem", "Leaves", "Fruit"],
        question: "Which part of the plant produces seeds?",
        explanation: "Fruits contain seeds, developed from fertilized flowers.",
        correctIndex: 3,
      },
      {
        options: ["Germination", "Dispersal", "Pollination", "Photosynthesis"],
        question: "A bee carrying pollen between flowers is:",
        explanation:
          "When bees carry pollen between flowers, this is pollination.",
        correctIndex: 2,
      },
      {
        options: ["Carbon dioxide", "Nitrogen", "Oxygen", "Water vapour"],
        question: "What do plants release as a by-product of photosynthesis?",
        explanation: "Photosynthesis releases oxygen as a by-product.",
        correctIndex: 2,
      },
      {
        options: ["Animals", "Water", "Wind", "Explosion"],
        question: "Dandelion seeds floating in wind is seed dispersal by:",
        explanation:
          "Dandelion seeds have fluffy parachutes to carry them on the wind.",
        correctIndex: 2,
      },
      {
        options: [
          "Makes food",
          "Absorbs water",
          "Reproduction",
          "Supports the plant",
        ],
        question: "What is the function of a flower?",
        explanation:
          "Flowers are reproductive structures that attract pollinators and produce seeds.",
        correctIndex: 2,
      },
      {
        options: ["Flowering", "Seeding", "Seedling", "Adult plant"],
        question: "What stage comes after germination?",
        explanation:
          "After germination, a tiny seedling grows, then develops into an adult plant.",
        correctIndex: 2,
      },
    ],
    "4": [
      {
        options: ["Desert", "Tropical rainforest", "Arctic", "Savanna"],
        question: "Where does a polar bear live?",
        explanation:
          "Polar bears are adapted to the Arctic — thick white fur for warmth and camouflage.",
        correctIndex: 2,
      },
      {
        options: ["Water", "Fat", "Air", "Food"],
        question: "A camel's hump stores:",
        explanation:
          "A camel's hump stores fat — converted to energy when food is scarce.",
        correctIndex: 1,
      },
      {
        options: ["Desert", "Tundra", "Tropical rainforest", "Grassland"],
        question: "Which habitat has the most species?",
        explanation: "Tropical rainforests have the greatest biodiversity.",
        correctIndex: 2,
      },
      {
        options: ["Lungs", "Gills", "Fins", "Scales"],
        question: "What adaptation helps fish breathe underwater?",
        explanation: "Fish use gills to extract dissolved oxygen from water.",
        correctIndex: 1,
      },
      {
        options: ["Hunt faster", "Keep warm", "Attract mates", "Dig burrows"],
        question: "An Arctic fox's bushy tail helps it:",
        explanation:
          "An Arctic fox's thick tail wraps around its body to keep warm.",
        correctIndex: 1,
      },
      {
        options: ["Penguin", "Crocodile", "Cactus mouse", "Salmon"],
        question: "Which animal is adapted to a desert habitat?",
        explanation:
          "The cactus mouse gets moisture from food and survives desert conditions.",
        correctIndex: 2,
      },
      {
        options: [
          "Hibernate",
          "Change colour",
          "Travel to warmer places",
          "Grow thicker feathers",
        ],
        question: "What do migratory birds do to survive winter?",
        explanation:
          "Many birds migrate to warmer regions where food is available in winter.",
        correctIndex: 2,
      },
      {
        options: ["Carnivore", "Omnivore", "Herbivore", "Predator"],
        question: "An animal that eats only plants is called a:",
        explanation: "Herbivores eat only plants.",
        correctIndex: 2,
      },
      {
        options: ["Desert", "Rainforest", "Tundra", "Grassland"],
        question:
          "The coral reef is the ocean equivalent of which land habitat?",
        explanation:
          "Coral reefs are called 'rainforests of the sea' due to their biodiversity.",
        correctIndex: 1,
      },
      {
        options: [
          "Making them run faster",
          "Hiding them from predators or prey",
          "Making them smell better",
          "Keeping them warm",
        ],
        question: "Camouflage helps animals by:",
        explanation: "Camouflage lets animals blend into their environment.",
        correctIndex: 1,
      },
    ],
    "5": [
      {
        options: ["Pulley", "Wedge", "Lever", "Screw"],
        question: "A seesaw is an example of which simple machine?",
        explanation: "A seesaw is a lever — a rigid bar pivoting on a fulcrum.",
        correctIndex: 2,
      },
      {
        options: ["Handle", "Axle", "Fulcrum", "Load"],
        question: "The fixed pivot point on a lever is called:",
        explanation: "The fulcrum is the pivot point of a lever.",
        correctIndex: 2,
      },
      {
        options: ["Lever", "Wedge", "Pulley", "Inclined plane"],
        question: "A ramp is an example of which simple machine?",
        explanation:
          "A ramp is an inclined plane — it reduces force needed to lift objects.",
        correctIndex: 3,
      },
      {
        options: ["Lever", "Screw", "Pulley", "Wedge"],
        question: "Which simple machine is used to raise a flag?",
        explanation:
          "A pulley at a flagpole lets you pull down to raise the flag up.",
        correctIndex: 2,
      },
      {
        options: [
          "Amount of work done",
          "Speed of light",
          "Force or direction of a force",
          "Mass of objects",
        ],
        question: "What do simple machines change?",
        explanation: "Simple machines change the size or direction of force.",
        correctIndex: 2,
      },
      {
        options: ["Lever", "Wheel and axle", "Inclined plane", "Wedge"],
        question: "A knife is an example of which simple machine?",
        explanation:
          "A knife is a wedge — a thin edge splitting objects by converting force.",
        correctIndex: 3,
      },
      {
        options: [
          "The box weighs less",
          "You apply force over a longer distance",
          "Gravity is reduced",
          "The box shrinks",
        ],
        question: "Using a ramp to push a box is easier because:",
        explanation:
          "An inclined plane reduces force needed but requires pushing over a longer distance.",
        correctIndex: 1,
      },
      {
        options: ["Lever", "Wheel and axle", "Pulley", "Wedge"],
        question: "A screwdriver uses which simple machine?",
        explanation:
          "A screwdriver is a wheel and axle — handle (wheel) rotates the shaft (axle).",
        correctIndex: 1,
      },
      {
        options: ["Newton", "Joule", "Watt", "Kilogram"],
        question: "What unit measures work?",
        explanation: "Work is measured in Joules (J). Work = Force × Distance.",
        correctIndex: 1,
      },
      {
        options: ["Lever", "Pulley", "Inclined plane", "Screw"],
        question: "Which simple machine is inside a jar lid?",
        explanation:
          "A jar lid uses a screw — the spiral thread tightens/loosens with each turn.",
        correctIndex: 3,
      },
    ],
    "6": [
      {
        options: ["Earth", "Venus", "Mercury", "Mars"],
        question: "Which planet is closest to the Sun?",
        explanation: "Mercury is the closest planet to the Sun.",
        correctIndex: 2,
      },
      {
        options: ["Saturn", "Jupiter", "Neptune", "Uranus"],
        question: "Which is the largest planet?",
        explanation:
          "Jupiter is the largest — over 1,300 Earths could fit inside!",
        correctIndex: 1,
      },
      {
        options: ["Jupiter", "Mars", "Saturn", "Uranus"],
        question: "What planet is famous for its rings?",
        explanation: "Saturn's rings are made of ice and rock.",
        correctIndex: 2,
      },
      {
        options: ["7", "8", "9", "10"],
        question: "How many planets are in the Solar System?",
        explanation:
          "There are 8 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.",
        correctIndex: 1,
      },
      {
        options: ["Mercury", "Earth", "Venus", "Mars"],
        question: "What is the hottest planet?",
        explanation:
          "Venus is hottest (462°C) due to its thick CO2 atmosphere trapping heat.",
        correctIndex: 2,
      },
      {
        options: [
          "A planet's moon",
          "The path a planet travels around the Sun",
          "A type of star",
          "A space rock",
        ],
        question: "What is an orbit?",
        explanation:
          "An orbit is the curved path a planet follows around the Sun due to gravity.",
        correctIndex: 1,
      },
      {
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
        question: "Which planet is known as the Red Planet?",
        explanation: "Mars appears red due to iron oxide on its surface.",
        correctIndex: 1,
      },
      {
        options: [
          "The time Earth spins once",
          "365.25 days — one orbit around the Sun",
          "24 hours",
          "The time Moon orbits Earth",
        ],
        question: "How long is one Earth year?",
        explanation:
          "One Earth year = 365.25 days, one complete orbit around the Sun.",
        correctIndex: 1,
      },
      {
        options: ["A planet", "An asteroid", "A star", "A galaxy"],
        question: "Our Sun is classified as:",
        explanation: "The Sun is a star — a massive ball of hot plasma.",
        correctIndex: 2,
      },
      {
        options: ["Neptune", "Uranus", "Pluto", "Saturn"],
        question: "Which was reclassified as a dwarf planet in 2006?",
        explanation: "Pluto was reclassified as a dwarf planet in 2006.",
        correctIndex: 2,
      },
    ],
    "7": [
      {
        options: [
          "An open circuit",
          "A complete closed circuit",
          "Only a battery",
          "Only a wire",
        ],
        question: "What is needed for electric current to flow?",
        explanation:
          "Electricity flows only through a complete, closed circuit.",
        correctIndex: 1,
      },
      {
        options: ["Wood", "Plastic", "Copper", "Rubber"],
        question: "Which material is a good conductor?",
        explanation:
          "Copper is an excellent conductor — that's why wires are made of copper.",
        correctIndex: 2,
      },
      {
        options: [
          "Produces electricity",
          "Stores electricity",
          "Opens or closes the circuit",
          "Measures voltage",
        ],
        question: "What does a switch do in a circuit?",
        explanation: "A switch opens (breaks) or closes (completes) a circuit.",
        correctIndex: 2,
      },
      {
        options: [
          "Others glow brighter",
          "Others continue normally",
          "All others go out",
          "Nothing changes",
        ],
        question: "In a series circuit, if one bulb breaks:",
        explanation:
          "In a series circuit, one break opens the whole circuit and all stop.",
        correctIndex: 2,
      },
      {
        options: ["Volt", "Watt", "Ampere", "Ohm"],
        question: "What unit measures electric current?",
        explanation: "Electric current is measured in Amperes (A).",
        correctIndex: 2,
      },
      {
        options: ["Steel", "Aluminium", "Salt water", "Rubber"],
        question: "Which of these is an insulator?",
        explanation:
          "Rubber is an insulator — it doesn't allow electricity to flow.",
        correctIndex: 3,
      },
      {
        options: [
          "Electrical energy",
          "Chemical energy",
          "Mechanical energy",
          "Light energy",
        ],
        question: "What energy does a battery store?",
        explanation:
          "Batteries store chemical energy and convert it to electrical energy.",
        correctIndex: 1,
      },
      {
        options: [
          "All bulbs go out",
          "The circuit breaks",
          "The other bulbs continue to glow",
          "The battery dies",
        ],
        question: "In a parallel circuit, if one bulb goes out:",
        explanation:
          "In a parallel circuit, each component has its own path — others continue if one fails.",
        correctIndex: 2,
      },
      {
        options: [
          "Battery size",
          "Energy given to each coulomb of charge",
          "Battery weight",
          "Battery age",
        ],
        question: "What does voltage tell us?",
        explanation:
          "Voltage (Volts) tells us how much energy the battery gives to each unit of charge.",
        correctIndex: 1,
      },
      {
        options: [
          "A circle with an X",
          "Long and short lines alternating",
          "A zigzag line",
          "An arrow",
        ],
        question: "A battery in a circuit diagram is shown as:",
        explanation:
          "A battery in a circuit diagram is shown as alternating long and short parallel lines.",
        correctIndex: 1,
      },
    ],
    "8": [
      {
        options: ["Friction", "Tension", "Gravity", "Magnetism"],
        question: "What force pulls objects toward Earth?",
        explanation: "Gravity is the attractive force between masses.",
        correctIndex: 2,
      },
      {
        options: ["Gravity", "Friction", "Air resistance", "Tension"],
        question: "Which force slows a skateboard on a rough surface?",
        explanation: "Friction between the board and surface opposes motion.",
        correctIndex: 1,
      },
      {
        options: ["Kilogram", "Metre", "Newton", "Joule"],
        question: "What unit measures force?",
        explanation: "Force is measured in Newtons (N).",
        correctIndex: 2,
      },
      {
        options: [
          "Gravity disappeared",
          "Air resistance equals gravity",
          "They stopped falling",
          "They gained mass",
        ],
        question: "A skydiver falls at constant speed. What happened?",
        explanation:
          "When air resistance equals gravity, there is no net force — terminal velocity.",
        correctIndex: 1,
      },
      {
        options: ["Friction", "Gravity", "Buoyancy", "Magnetism"],
        question: "What force allows ships to float?",
        explanation:
          "Buoyancy is the upward force from water on a submerged object.",
        correctIndex: 2,
      },
      {
        options: [
          "Does nothing",
          "Breaks",
          "Pushes back with an equal force",
          "Falls over",
        ],
        question: "If you push a wall, the wall:",
        explanation:
          "Newton's 3rd Law: every action has an equal and opposite reaction.",
        correctIndex: 2,
      },
      {
        options: [
          "It increases",
          "It stays the same",
          "It decreases",
          "It disappears completely",
        ],
        question: "What happens to friction on an icy surface?",
        explanation:
          "Smooth surfaces have less friction — ice is very slippery.",
        correctIndex: 2,
      },
      {
        options: [
          "Hammer falls faster",
          "Feather falls faster",
          "They fall at the same speed",
          "Neither falls",
        ],
        question: "In a vacuum, a feather and hammer dropped together:",
        explanation:
          "In a vacuum, all objects fall at the same rate regardless of mass.",
        correctIndex: 2,
      },
      {
        options: [
          "Mass × acceleration",
          "Distance ÷ time",
          "Force × distance",
          "Weight ÷ mass",
        ],
        question: "What is speed?",
        explanation: "Speed = Distance ÷ Time.",
        correctIndex: 1,
      },
      {
        options: ["Gravity", "Friction", "Air resistance", "Water resistance"],
        question: "A fish's streamlined shape reduces:",
        explanation:
          "A streamlined body reduces water resistance for efficient swimming.",
        correctIndex: 3,
      },
    ],
    "9": [
      {
        options: ["MRGREN", "MRS GREN", "STEM PLUS", "LIFE NOW"],
        question: "Which acronym summarises characteristics of living things?",
        explanation:
          "MRS GREN: Movement, Respiration, Sensitivity, Growth, Reproduction, Excretion, Nutrition.",
        correctIndex: 1,
      },
      {
        options: [
          "No, plants never move",
          "Yes, they can walk",
          "Yes — plants grow toward light",
          "Only animals move",
        ],
        question: "Do plants move?",
        explanation: "Plants move by growing toward light (phototropism).",
        correctIndex: 2,
      },
      {
        options: [
          "Breathing",
          "Releasing energy from food",
          "Absorbing sunlight",
          "Drinking water",
        ],
        question: "What is respiration?",
        explanation:
          "Respiration releases energy from food at the cellular level.",
        correctIndex: 1,
      },
      {
        options: [
          "It doesn't contain atoms",
          "It has no MRS GREN characteristics",
          "It is too old",
          "It has no colour",
        ],
        question: "A rock is non-living because:",
        explanation:
          "A rock doesn't carry out any of the MRS GREN life processes.",
        correctIndex: 1,
      },
      {
        options: ["Cloud", "Rock", "Mushroom", "Salt crystal"],
        question: "Which of these is a living thing?",
        explanation:
          "Mushrooms (fungi) are living things — they feed, grow, and reproduce.",
        correctIndex: 2,
      },
      {
        options: [
          "Eating food",
          "Producing energy",
          "Removing waste products",
          "Breathing in oxygen",
        ],
        question: "Excretion in living things means:",
        explanation: "Excretion is the removal of metabolic waste products.",
        correctIndex: 2,
      },
      {
        options: [
          "They are too small",
          "They cannot reproduce alone — they need a host cell",
          "They don't contain DNA",
          "They are older than life",
        ],
        question: "Why are viruses difficult to classify?",
        explanation:
          "Viruses reproduce only inside host cells — they lack their own metabolism.",
        correctIndex: 1,
      },
      {
        options: ["Yeast", "Bacteria", "Water", "Algae"],
        question: "Which of the following is a NON-living thing?",
        explanation:
          "Water is non-living — it has no MRS GREN characteristics.",
        correctIndex: 2,
      },
      {
        options: [
          "They contain water",
          "Given right conditions, they germinate and grow",
          "They are hard",
          "They are green",
        ],
        question: "How do we know seeds are living even when dormant?",
        explanation:
          "Seeds are alive but dormant. They show MRS GREN when conditions are right.",
        correctIndex: 1,
      },
      {
        options: [
          "It doesn't move",
          "It cannot reproduce or grow as an organism",
          "It's not green",
          "It's too hot",
        ],
        question: "Why is fire NOT classified as alive?",
        explanation:
          "Fire cannot reproduce, grow, or respond to stimuli. It's a chemical reaction.",
        correctIndex: 1,
      },
    ],
    "10": [
      {
        options: [
          "An animal that hunts",
          "A plant that makes food via photosynthesis",
          "A decomposer",
          "An animal that eats plants",
        ],
        question: "What is a producer in a food chain?",
        explanation:
          "Producers (plants) create energy-rich food from sunlight.",
        correctIndex: 1,
      },
      {
        options: [
          "Eat top predators",
          "Produce oxygen",
          "Break down dead matter and recycle nutrients",
          "Compete with producers",
        ],
        question: "What do decomposers do?",
        explanation:
          "Decomposers break down dead organisms, returning nutrients to soil.",
        correctIndex: 2,
      },
      {
        options: [
          "Producer",
          "Primary consumer",
          "Secondary consumer",
          "Decomposer",
        ],
        question: "In Grass → Rabbit → Fox, what is the rabbit?",
        explanation:
          "The rabbit eats grass (a producer), making it a primary consumer.",
        correctIndex: 1,
      },
      {
        options: ["Rain", "The Moon", "The Sun", "Decomposers"],
        question: "What does all energy in a food chain originally come from?",
        explanation:
          "The Sun is the original energy source for almost all food chains.",
        correctIndex: 2,
      },
      {
        options: [
          "A single food chain",
          "Multiple overlapping food chains",
          "A spider's meal",
          "A chain of plants",
        ],
        question: "What is a food web?",
        explanation:
          "A food web shows many interconnected food chains in an ecosystem.",
        correctIndex: 1,
      },
      {
        options: [
          "Foxes would increase",
          "Foxes would not be affected",
          "Fox numbers would decrease",
          "Foxes would eat more grass",
        ],
        question:
          "If all rabbits in an ecosystem died, what would happen to foxes?",
        explanation:
          "With fewer prey (rabbits), fox populations would decrease.",
        correctIndex: 2,
      },
      {
        options: ["Producer", "Herbivore", "Carnivore", "Decomposer"],
        question: "What type of organism is a mushroom in an ecosystem?",
        explanation:
          "Mushrooms (fungi) are decomposers — they break down dead organic matter.",
        correctIndex: 3,
      },
      {
        options: [
          "Top predator",
          "Secondary consumer",
          "Primary consumer",
          "Producer",
        ],
        question: "Which level of a food chain contains the most energy?",
        explanation:
          "Producers contain the most energy. About 90% is lost at each level up the chain.",
        correctIndex: 3,
      },
      {
        options: [
          "Any herbivore",
          "A plant at the top of the food chain",
          "A predator with no natural predators",
          "An animal that eats plants and meat",
        ],
        question: "An apex predator is:",
        explanation:
          "An apex predator is at the top of the food chain with no natural predators.",
        correctIndex: 2,
      },
      {
        options: [
          "Nothing",
          "They would grow faster",
          "Nutrients would not be recycled and soil would become depleted",
          "They would become carnivores",
        ],
        question: "What would happen to producers if decomposers disappeared?",
        explanation:
          "Without decomposers, nutrients locked in dead matter would not return to soil.",
        correctIndex: 2,
      },
    ],
  },
  "Reading & Writing Stars": {
    "1": [
      {
        options: ["Antagonist", "Protagonist", "Narrator", "Setting"],
        question: "The main character is called the:",
        explanation: "The protagonist is the main character the story follows.",
        correctIndex: 1,
      },
      {
        options: ["Plot", "Conflict", "Setting", "Theme"],
        question: "Which element tells WHERE and WHEN the story takes place?",
        explanation:
          "The setting is the time and place where the story occurs.",
        correctIndex: 2,
      },
      {
        options: [
          "The beginning",
          "The most exciting turning point",
          "The resolution",
          "The first problem",
        ],
        question: "The climax of a story is:",
        explanation:
          "The climax is the highest point of tension where the main conflict comes to a head.",
        correctIndex: 1,
      },
      {
        options: [
          "Character vs character",
          "Character vs nature",
          "Character vs self",
          "Character vs society",
        ],
        question: "A character struggling with their own fear is:",
        explanation:
          "Internal struggle (fear, doubt, guilt) is character vs self conflict.",
        correctIndex: 2,
      },
      {
        options: [
          "The main character's name",
          "Where the story happens",
          "The central message or lesson",
          "The problem in the story",
        ],
        question: "The theme of a story is:",
        explanation:
          "The theme is the underlying message the author wants the reader to understand.",
        correctIndex: 2,
      },
      {
        options: ["Protagonist", "Setting", "Antagonist", "Theme"],
        question: "In The Three Little Pigs, the wolf is the:",
        explanation:
          "The wolf creates conflict for the three pigs — making it the antagonist.",
        correctIndex: 2,
      },
      {
        options: [
          "Introduction of characters",
          "The biggest problem",
          "How the conflict is solved",
          "The setting",
        ],
        question: "The resolution of a story is:",
        explanation:
          "The resolution ends the story where conflicts are resolved.",
        correctIndex: 2,
      },
      {
        options: [
          "The main character",
          "The villain",
          "The person or voice telling the story",
          "The author's name",
        ],
        question: "A narrator is:",
        explanation:
          "The narrator tells the story — could be a character or an outside voice.",
        correctIndex: 2,
      },
      {
        options: [
          "The beginning",
          "Events that build tension toward the climax",
          "The story's resolution",
          "The setting description",
        ],
        question: "Rising action means:",
        explanation:
          "Rising action is the series of events that build up to the climax.",
        correctIndex: 1,
      },
      {
        options: [
          "The lesson of the story",
          "The sequence of events",
          "The main character's feelings",
          "Where the story is set",
        ],
        question: "The PLOT is best described as:",
        explanation:
          "The plot is the sequence of events — what happens from beginning to end.",
        correctIndex: 1,
      },
    ],
    "2": [
      {
        options: ["Summarising", "Predicting", "Inferring", "Evaluating"],
        question: "Reading 'between the lines' is called:",
        explanation:
          "Inference means using clues to work out what isn't stated directly.",
        correctIndex: 2,
      },
      {
        options: [
          "The longest sentence",
          "The central point the paragraph is about",
          "The first sentence always",
          "The most interesting detail",
        ],
        question: "The MAIN IDEA of a paragraph is:",
        explanation:
          "The main idea is the central concept that the whole paragraph supports.",
        correctIndex: 1,
      },
      {
        options: [
          "The last sentence",
          "The sentence stating the main idea",
          "A sentence with difficult words",
          "The most interesting sentence",
        ],
        question: "What is a 'topic sentence'?",
        explanation:
          "A topic sentence introduces the main idea of a paragraph — usually the first sentence.",
        correctIndex: 1,
      },
      {
        options: [
          "The main idea",
          "Information that backs up the main idea",
          "A new paragraph",
          "A conclusion",
        ],
        question: "What is a 'supporting detail'?",
        explanation:
          "Supporting details are facts, examples, or reasons that explain the main idea.",
        correctIndex: 1,
      },
      {
        options: [
          "She is angry",
          "She is tired",
          "She is cold",
          "She is laughing",
        ],
        question:
          "'The girl trembled and her teeth chattered.' What can you infer?",
        explanation:
          "Trembling and chattering teeth are signs of feeling cold — an inference from context clues.",
        correctIndex: 2,
      },
      {
        options: [
          "Copying the text word for word",
          "Writing the main ideas in your own words briefly",
          "Reading the text again",
          "Changing the story",
        ],
        question: "What does 'summarising' mean?",
        explanation:
          "Summarising means retelling key points in your own words, much more briefly.",
        correctIndex: 1,
      },
      {
        options: ["What", "Where", "Why", "When"],
        question: "Which question word asks about the REASON for something?",
        explanation: "'Why' asks for reasons, causes, or motivations.",
        correctIndex: 2,
      },
      {
        options: ["Graph", "Glossary", "Sidebar", "Caption"],
        question:
          "A dictionary definition of key words in a non-fiction book is called:",
        explanation:
          "A glossary provides definitions of key words, often at the back of non-fiction books.",
        correctIndex: 1,
      },
      {
        options: [
          "Write a summary",
          "Preview titles, headings, and images",
          "Answer comprehension questions",
          "Read it three times",
        ],
        question: "What should you do BEFORE reading a non-fiction text?",
        explanation:
          "Previewing headings and images gives context and activates prior knowledge.",
        correctIndex: 1,
      },
      {
        options: [
          "Find a fact from the text",
          "Work out something not stated",
          "Give your opinion supported by evidence",
          "Retell the story",
        ],
        question: "An evaluative comprehension question asks you to:",
        explanation:
          "Evaluative questions require a judgement supported by evidence from the text.",
        correctIndex: 2,
      },
    ],
    "3": [
      {
        options: ["Simile", "Metaphor", "Personification", "Onomatopoeia"],
        question: "'The sun smiled down on the beach.' This is:",
        explanation:
          "Personification gives the sun a human action (smiling). The sun cannot truly smile.",
        correctIndex: 2,
      },
      {
        options: [
          "She is a tornado.",
          "His voice boomed like thunder.",
          "The tree danced in the wind.",
          "Fear gripped her heart.",
        ],
        question: "Which sentence uses a simile?",
        explanation:
          "'Like thunder' uses 'like' to compare — that makes it a simile.",
        correctIndex: 1,
      },
      {
        options: ["Metaphor", "Alliteration", "Personification", "Simile"],
        question: "'The leaves whispered secrets.' This technique is:",
        explanation:
          "Leaves cannot whisper — giving them a human action is personification.",
        correctIndex: 2,
      },
      {
        options: [
          "Describing without adjectives",
          "Using words that sound like what they describe",
          "A type of poem",
          "Writing from personal experience",
        ],
        question: "Onomatopoeia means:",
        explanation:
          "Onomatopoeia: 'buzz', 'crash', 'sizzle' — words whose sound imitates what they describe.",
        correctIndex: 1,
      },
      {
        options: [
          "Write shorter sentences",
          "Describe actions and details rather than stating emotions directly",
          "Use more adjectives",
          "Write longer stories",
        ],
        question: "'Show, don't tell' means:",
        explanation:
          "Show don't tell: let readers experience emotions through descriptions, not labels.",
        correctIndex: 1,
      },
      {
        options: [
          "Rhyming at the end of lines",
          "Repeating the same initial consonant sound in nearby words",
          "A comparison using 'like'",
          "Words that sound like actions",
        ],
        question: "What is alliteration?",
        explanation:
          "Alliteration: 'Peter Piper picked pickled peppers.' Repeated 'p' sound.",
        correctIndex: 1,
      },
      {
        options: [
          "The main character",
          "An opening that grabs the reader's attention",
          "The story's theme",
          "The final sentence",
        ],
        question: "A story's 'hook' is:",
        explanation:
          "A hook is a compelling opening — question, surprise, action — that draws the reader in.",
        correctIndex: 1,
      },
      {
        options: [
          "Future tense",
          "Present tense",
          "Past tense",
          "Mixed tenses",
        ],
        question: "Which tense is most common for story writing?",
        explanation:
          "Stories are most commonly written in past tense: 'She ran', 'He said'.",
        correctIndex: 2,
      },
      {
        options: [
          "A comparison using 'like' or 'as'",
          "A direct comparison without 'like' or 'as'",
          "Giving human traits to objects",
          "Words that sound like actions",
        ],
        question: "A metaphor is:",
        explanation:
          "'Time is money.' — a direct comparison without 'like' or 'as' is a metaphor.",
        correctIndex: 1,
      },
      {
        options: [
          "Introduce a new character",
          "Resolve the main conflict and give the reader completion",
          "End mid-sentence",
          "Repeat the opening paragraph",
        ],
        question: "A strong story ending should:",
        explanation:
          "A strong ending resolves conflict and leaves the reader with a satisfying sense of completion.",
        correctIndex: 1,
      },
    ],
    "4": [
      {
        options: ["cat", "sat", "mat", "The"],
        question: "In 'The cat sat on the mat', what is the verb?",
        explanation:
          "'Sat' is the verb — it describes the action the cat is performing.",
        correctIndex: 1,
      },
      {
        options: ["Run", "Beautiful", "Quickly", "Garden"],
        question: "Which of these is a NOUN?",
        explanation:
          "A noun is a person, place, thing or idea. 'Garden' is a place/thing.",
        correctIndex: 3,
      },
      {
        options: ["Adjective", "Noun", "Adverb", "Verb"],
        question: "'She runs quickly.' The word 'quickly' is an:",
        explanation:
          "'Quickly' modifies the verb 'runs' — telling us HOW she runs. That's an adverb.",
        correctIndex: 2,
      },
      {
        options: ["kitten", "played", "fluffy", "The"],
        question: "Which word is an ADJECTIVE in: 'The fluffy kitten played'?",
        explanation:
          "'Fluffy' describes the kitten — adjectives describe nouns.",
        correctIndex: 2,
      },
      {
        options: [
          "Two nouns",
          "Two sentences or clauses",
          "A verb and adverb",
          "A noun and adjective",
        ],
        question: "A conjunction joins:",
        explanation:
          "Conjunctions (and, but, because, or) join words, phrases, or clauses.",
        correctIndex: 1,
      },
      {
        options: ["Verb", "Adjective", "Preposition", "Noun"],
        question: "'The ball is UNDER the table.' The word 'under' is a:",
        explanation: "Prepositions show position/relationship between things.",
        correctIndex: 2,
      },
      {
        options: [
          "She ran fast.",
          "Although it rained, we played.",
          "She loves reading, but he prefers art.",
          "The large grey elephant walked slowly.",
        ],
        question: "Which sentence is a COMPOUND sentence?",
        explanation:
          "A compound sentence has two independent clauses joined by a conjunction.",
        correctIndex: 2,
      },
      {
        options: ["arrived", "early", "They", "none"],
        question: "In 'They arrived early', what is the pronoun?",
        explanation:
          "'They' is a pronoun — it replaces the names of the people.",
        correctIndex: 2,
      },
      {
        options: [
          "The action",
          "The word that does the verb",
          "The describing word",
          "The final word",
        ],
        question: "What is the subject of a sentence?",
        explanation: "The subject is who or what performs the action.",
        correctIndex: 1,
      },
      {
        options: [
          "Simple sentence",
          "Compound sentence",
          "Complex sentence",
          "Question",
        ],
        question: "'Because it was raining, we stayed inside.' This is a:",
        explanation:
          "A complex sentence has one independent clause and one dependent clause.",
        correctIndex: 2,
      },
    ],
    "5": [
      {
        options: ["recieve", "reciave", "receive", "receve"],
        question: "Correct the spelling: 'recieve'",
        explanation:
          "'i before e except after c' — after 'c' we write 'ei': receive.",
        correctIndex: 2,
      },
      {
        options: ["cat", "dog", "know", "run"],
        question: "Which word has a silent letter?",
        explanation: "In 'know', the 'k' is silent. We say 'no' not 'k-no'.",
        correctIndex: 2,
      },
      {
        options: ["churchs", "churches", "churchies", "churchys"],
        question: "What is the plural of 'church'?",
        explanation: "Words ending in -ch add -es: church → churches.",
        correctIndex: 1,
      },
      {
        options: ["siting", "sitting", "siting", "siteing"],
        question: "Adding '-ing' to 'sit' gives:",
        explanation:
          "Short vowel word ending in consonant — double the final consonant: sit → sitting.",
        correctIndex: 1,
      },
      {
        options: ["beleive", "beleave", "believe", "beleve"],
        question: "Correct the spelling: 'beleive'",
        explanation: "'Believe' follows the 'i before e' rule: bel-i-e-ve.",
        correctIndex: 2,
      },
      {
        options: ["f", "p", "ph", "v"],
        question: "The 'ph' in 'photograph' sounds like:",
        explanation:
          "The combination 'ph' makes the /f/ sound. Photo, phone, phrase.",
        correctIndex: 0,
      },
      {
        options: [
          "Look-Copy-Write-Check",
          "Look-Cover-Write-Check",
          "Learn-Copy-Work-Check",
          "Listen-Copy-Write-Check",
        ],
        question: "LCWC stands for:",
        explanation: "Look-Cover-Write-Check is a proven spelling strategy.",
        correctIndex: 1,
      },
      {
        options: [
          "A vowel sound",
          "A unit of pronunciation containing one vowel sound",
          "A consonant",
          "A word ending",
        ],
        question: "A syllable is:",
        explanation:
          "A syllable is a unit of pronunciation with one vowel sound.",
        correctIndex: 1,
      },
      {
        options: ["3", "4", "5", "6"],
        question: "How many syllables does 'education' have?",
        explanation: "Ed-u-ca-tion = 4 syllables.",
        correctIndex: 1,
      },
      {
        options: ["their / there", "cat / bat", "walk / talk", "slow / flow"],
        question:
          "Which pair are homophones (sound the same, spelled differently)?",
        explanation:
          "Homophones sound identical but are spelled differently: their/there/they're.",
        correctIndex: 0,
      },
    ],
    "6": [
      {
        options: ["Full stop", "Exclamation mark", "Question mark", "Comma"],
        question: "Which punctuation ends a question?",
        explanation: "Questions end with a question mark (?).",
        correctIndex: 2,
      },
      {
        options: ["A contraction", "Possession", "A list", "A question"],
        question: "What does the apostrophe show in 'Sarah's bag'?",
        explanation:
          "The apostrophe in 'Sarah's' shows the bag belongs to Sarah.",
        correctIndex: 1,
      },
      {
        options: ["Do not", "Did not", "Doing not", "Does not"],
        question: "'Don't' is a contraction of:",
        explanation: "Don't = do not. The apostrophe replaces the missing 'o'.",
        correctIndex: 0,
      },
      {
        options: [
          "She said hello.",
          "She said, Hello",
          '"Hello," she said.',
          "She said hello?",
        ],
        question: "Which is correctly punctuated direct speech?",
        explanation:
          "Direct speech needs inverted commas around the spoken words.",
        correctIndex: 2,
      },
      {
        options: [
          "End a question",
          "Show possession",
          "Introduce a list",
          "Separate two words",
        ],
        question: "A colon is used to:",
        explanation: "A colon introduces a list or explanation.",
        correctIndex: 2,
      },
      {
        options: [
          "I went to the shop and I bought apples, bananas, and milk.",
          "I went to the shop, and I bought apples bananas and milk.",
          "I went to the shop and I, bought apples bananas and milk.",
          "I, went to the shop and I bought apples bananas and milk.",
        ],
        question: "Which sentence uses a comma correctly?",
        explanation:
          "Commas separate items in a list: 'apples, bananas, and milk'.",
        correctIndex: 0,
      },
      {
        options: [
          "A question and answer",
          "Two closely related independent clauses",
          "A list of items",
          "Spoken words",
        ],
        question: "A semicolon joins:",
        explanation: "Semicolons connect two related independent sentences.",
        correctIndex: 1,
      },
      {
        options: [
          "What is your name!",
          "I am going to the park!",
          "Are you ready!",
          "She asked if he was well!",
        ],
        question: "Which sentence uses an exclamation mark correctly?",
        explanation: "Exclamation marks show strong feeling or excitement.",
        correctIndex: 1,
      },
      {
        options: [
          "The boys' coats were wet.",
          "The boys's coats were wet.",
          "The boy's coats were wet.",
          "The boys coats' were wet.",
        ],
        question:
          "'The boys coats were wet.' To show plural possession, it should be:",
        explanation:
          "For plural nouns ending in -s, apostrophe goes after the s: boys'",
        correctIndex: 0,
      },
      {
        options: [
          "End a question",
          "A pause or trailing off",
          "Replace an apostrophe",
          "Introduce a list",
        ],
        question: "An ellipsis (...) shows:",
        explanation:
          "An ellipsis shows a pause, creates suspense, or indicates omitted words.",
        correctIndex: 1,
      },
    ],
    "7": [
      {
        options: ["Sad", "Angry", "Joyful", "Tired"],
        question: "Which is a synonym for 'happy'?",
        explanation:
          "'Joyful' means very happy — a synonym shares the same/similar meaning.",
        correctIndex: 2,
      },
      {
        options: ["Old", "Historic", "Modern", "Aged"],
        question: "What is an antonym for 'ancient'?",
        explanation: "'Modern' is the opposite of 'ancient'.",
        correctIndex: 2,
      },
      {
        options: ["Shouted", "Whispered", "Exclaimed", "Demanded"],
        question: "Best synonym for 'said' when speaking quietly?",
        explanation:
          "'Whispered' means to speak very quietly — much more precise than 'said'.",
        correctIndex: 1,
      },
      {
        options: ["Kind", "Selfish", "Sharing", "Wealthy"],
        question: "The antonym of 'generous'?",
        explanation:
          "Generous means giving freely. Selfish (thinking only of yourself) is its antonym.",
        correctIndex: 1,
      },
      {
        options: [
          "Words that sound the same",
          "Words with opposite meanings",
          "Words sharing a root and related meanings",
          "Words from the same language",
        ],
        question: "What is a word family?",
        explanation:
          "A word family shares a common root: happy, happiness, unhappy, happily.",
        correctIndex: 2,
      },
      {
        options: ["Flame", "Blaze", "Spark", "Glow"],
        question: "Most precise word for a large, dangerous fire?",
        explanation:
          "'Blaze' suggests a large, fierce fire — much more vivid than 'fire'.",
        correctIndex: 1,
      },
      {
        options: ["Grow", "Stretch", "Shrink", "Widen"],
        question: "An antonym for 'expand'?",
        explanation:
          "'Shrink' means to become smaller — the opposite of expand.",
        correctIndex: 2,
      },
      {
        options: [
          "big / large",
          "run / sprint",
          "transparent / opaque",
          "shout / yell",
        ],
        question: "Which pair are antonyms?",
        explanation:
          "Transparent (see-through) and opaque (cannot see through) are opposites.",
        correctIndex: 2,
      },
      {
        options: ["Travel", "Carry", "Sea", "Fast"],
        question: "The root 'port' in transport, export, import means:",
        explanation: "The Latin root 'port' means 'to carry'.",
        correctIndex: 1,
      },
      {
        options: ["Sprinted", "Marched", "Shuffled", "Strutted"],
        question: "Best synonym for 'walked' when moving slowly and tiredly?",
        explanation:
          "'Shuffled' describes a slow, dragging walk — the most precise synonym.",
        correctIndex: 2,
      },
    ],
    "8": [
      {
        options: [
          "Lines 1 and 3 rhyme, 2 and 4 rhyme",
          "Lines 1 and 2 rhyme, 3 and 4 rhyme",
          "All lines rhyme",
          "No lines rhyme",
        ],
        question: "What is AABB rhyme scheme?",
        explanation:
          "AABB: 1st and 2nd lines rhyme (AA), 3rd and 4th lines rhyme (BB) — couplets.",
        correctIndex: 1,
      },
      {
        options: ["14", "12", "17", "21"],
        question: "How many syllables does a Haiku have in total?",
        explanation: "A Haiku has 5+7+5=17 syllables across 3 lines.",
        correctIndex: 2,
      },
      {
        options: ["Rhyme", "Rhythm", "Meter", "Alliteration"],
        question: "What do we call the pattern of beats in a poem?",
        explanation:
          "Rhythm is the pattern of stressed and unstressed syllables — the musical beat.",
        correctIndex: 1,
      },
      {
        options: [
          "A serious 14-line poem",
          "A humorous 5-line poem with AABBA rhyme",
          "A Japanese 3-line poem",
          "A poem with no rhyme",
        ],
        question: "A limerick is:",
        explanation:
          "A limerick is a humorous poem with 5 lines: AABBA rhyme scheme.",
        correctIndex: 1,
      },
      {
        options: ["Simile", "Personification", "Metaphor", "Rhyme"],
        question: "'The moon is a silver coin in the sky.' This is:",
        explanation:
          "A direct comparison without 'like' or 'as' is a metaphor.",
        correctIndex: 2,
      },
      {
        options: [
          "Poetry that rhymes perfectly",
          "Poetry without fixed rhyme or rhythm",
          "A type of haiku",
          "Poetry for children only",
        ],
        question: "Free verse poetry is:",
        explanation:
          "Free verse has no required rhyme or rhythm — it focuses on images and emotion.",
        correctIndex: 1,
      },
      {
        options: [
          "Moon and sun",
          "Light and night",
          "Star and sky",
          "Wind and rain",
        ],
        question: "Which pair of words rhyme?",
        explanation: "'Light' and 'night' end with the same sound (-ight).",
        correctIndex: 1,
      },
      {
        options: ["10", "12", "14", "16"],
        question: "How many lines does a Shakespearean sonnet have?",
        explanation: "A sonnet has exactly 14 lines.",
        correctIndex: 2,
      },
      {
        options: ["Rhyme", "Rhythm", "Alliteration", "Assonance"],
        question: "Repeating the same initial consonant in poetry is called:",
        explanation:
          "'Peter Piper picked pickled peppers' — repeating the 'p' sound is alliteration.",
        correctIndex: 2,
      },
      {
        options: [
          "Using old-fashioned words",
          "Words that sound like what they describe",
          "Repeating vowel sounds",
          "Writing without rhyme",
        ],
        question: "Onomatopoeia in poetry means:",
        explanation:
          "Onomatopoeia: 'buzz', 'hiss', 'crash' — words whose sound mimics what they describe.",
        correctIndex: 1,
      },
    ],
    "9": [
      {
        options: [
          "Fiction writing",
          "Poetry",
          "Non-fiction writing",
          "Creative writing",
        ],
        question: "Report writing is an example of:",
        explanation:
          "Reports present factual information — they are non-fiction.",
        correctIndex: 2,
      },
      {
        options: [
          "First person (I, my)",
          "Second person (you, your)",
          "Third person (it, they, the)",
          "No person",
        ],
        question: "Which person should you use in a report?",
        explanation:
          "Reports use third person — 'The dolphin lives in the ocean'.",
        correctIndex: 2,
      },
      {
        options: ["Past tense", "Present tense", "Future tense", "Mixed tense"],
        question: "What tense should information reports use?",
        explanation:
          "Reports use present tense for facts: 'Pandas eat bamboo'.",
        correctIndex: 1,
      },
      {
        options: [
          "Make the report shorter",
          "Organise different aspects of the topic",
          "Add personal opinions",
          "Rhyme with other words",
        ],
        question: "What is the purpose of a subheading?",
        explanation:
          "Subheadings organise the report into sections, making it easier to navigate.",
        correctIndex: 1,
      },
      {
        options: [
          "I think sharks are really cool.",
          "In my opinion, sharks are scary.",
          "Sharks are one of the ocean's apex predators.",
          "You should be scared of sharks!",
        ],
        question: "Which sentence is appropriate for an information report?",
        explanation:
          "Factual language without personal opinion is correct for reports.",
        correctIndex: 2,
      },
      {
        options: [
          "Using complicated language to confuse readers",
          "Using subject-specific terms accurately",
          "Using simple words only",
          "Using made-up words",
        ],
        question: "'Technical vocabulary' means:",
        explanation:
          "Technical vocabulary means using precise subject-specific terms accurately.",
        correctIndex: 1,
      },
      {
        options: [
          "Once upon a time there was a penguin...",
          "This report will tell you about penguins.",
          "Penguins are so cute!",
          "Do you know about penguins?",
        ],
        question: "A report about penguins should begin with:",
        explanation:
          "A report introduction should clearly state the topic factually.",
        correctIndex: 1,
      },
      {
        options: [
          "A new topic",
          "A summary of the key points",
          "A personal opinion",
          "A question to the reader",
        ],
        question: "The conclusion of a report is:",
        explanation:
          "The conclusion summarises key points without introducing new information.",
        correctIndex: 1,
      },
      {
        options: ["Adjectives", "Metaphors", "Contents page/index", "Rhyme"],
        question:
          "Which text feature helps locate specific information quickly?",
        explanation:
          "A contents page or index allows readers to quickly find specific sections.",
        correctIndex: 2,
      },
      {
        options: [
          "Made up to sound interesting",
          "Supported by evidence and accurate",
          "Written as opinions",
          "As vague as possible",
        ],
        question: "Facts in a report should be:",
        explanation:
          "Reports must be factually accurate and supported by evidence.",
        correctIndex: 1,
      },
    ],
    "10": [
      {
        options: [
          "Uses third person",
          "Has no structure",
          "Includes the writer's opinion",
          "Never mentions the author",
        ],
        question: "A book review differs from a report because it:",
        explanation:
          "Book reviews include personal opinion, backed by evidence.",
        correctIndex: 2,
      },
      {
        options: [
          "Every detail including the ending",
          "A brief overview without spoilers",
          "Only the author's name",
          "A list of all characters",
        ],
        question: "What should a book review summary include?",
        explanation:
          "A summary gives enough information to interest the reader, without revealing the ending.",
        correctIndex: 1,
      },
      {
        options: [
          "The book was good.",
          "I liked it because it was interesting.",
          "I enjoyed the vivid descriptions, particularly the storm metaphors.",
          "It was boring.",
        ],
        question: "Which is the best evaluative comment?",
        explanation:
          "The best evaluation is specific and backed up with evidence from the text.",
        correctIndex: 2,
      },
      {
        options: [
          "A letter grade (A-F)",
          "Stars out of 5",
          "Thumbs up or down only",
          "Word count",
        ],
        question: "What rating system do many book reviews use?",
        explanation:
          "Stars out of 5 is the most common rating system for book reviews.",
        correctIndex: 1,
      },
      {
        options: [
          "Summarising the plot",
          "Evaluative language",
          "A spoiler",
          "Personal opinion without evidence",
        ],
        question:
          "'The author effectively uses dialogue to...' is an example of:",
        explanation:
          "Evaluative language makes a judgement ('effectively') and connects it to a technique.",
        correctIndex: 1,
      },
      {
        options: [
          "It's against the rules",
          "It might stop potential readers enjoying the book",
          "The teacher will mark you down",
          "Books are too long to summarise",
        ],
        question: "Why avoid spoilers in a book review?",
        explanation:
          "Spoilers ruin the reading experience for potential readers.",
        correctIndex: 1,
      },
      {
        options: [
          "Everything that happens",
          "What type of reader would enjoy the book",
          "Your marks in English",
          "The price of the book",
        ],
        question: "A book recommendation should tell the reader:",
        explanation:
          "A good recommendation tells potential readers whether the book would suit them.",
        correctIndex: 1,
      },
      {
        options: [
          "It was amazing.",
          "It was terrible.",
          "The plot was gripping, though some scenes felt rushed towards the end.",
          "I give it 5 stars.",
        ],
        question: "Which sentence is the best BALANCED review comment?",
        explanation:
          "A balanced review acknowledges both strengths and weaknesses.",
        correctIndex: 2,
      },
      {
        options: [
          "Only saying negative things",
          "Insulting the author",
          "Pointing out weaknesses in a helpful, specific way",
          "Giving a low rating",
        ],
        question: "'Constructive criticism' in a review means:",
        explanation:
          "Constructive criticism identifies areas for improvement politely and specifically.",
        correctIndex: 2,
      },
      {
        options: [
          "Immediately after starting the book",
          "Having read and thought carefully about the whole book",
          "By copying another review",
          "Without reading the book",
        ],
        question: "The best book reviews are written:",
        explanation:
          "A thorough review requires having read and reflected on the entire book.",
        correctIndex: 1,
      },
    ],
  },
  "World Geography Quest": {
    "1": [
      {
        options: ["5", "6", "7", "8"],
        question: "How many continents are there?",
        explanation:
          "There are 7 continents: Africa, Antarctica, Asia, Australia, Europe, North America, South America.",
        correctIndex: 2,
      },
      {
        options: ["Africa", "North America", "Asia", "Europe"],
        question: "Which is the largest continent?",
        explanation:
          "Asia is the largest continent, covering about 44.6 million km2.",
        correctIndex: 2,
      },
      {
        options: ["Atlantic", "Indian", "Arctic", "Pacific"],
        question: "Which ocean is the largest?",
        explanation:
          "The Pacific Ocean is the largest, covering more area than all continents combined.",
        correctIndex: 3,
      },
      {
        options: ["Australia", "Africa", "Antarctica", "South America"],
        question: "Which continent is entirely covered in ice?",
        explanation:
          "Antarctica surrounds the South Pole and is covered by an ice sheet.",
        correctIndex: 2,
      },
      {
        options: [
          "Eastern and Western hemispheres",
          "Northern and Southern hemispheres",
          "Top and Bottom halves",
          "Land and sea",
        ],
        question: "The Equator divides the Earth into:",
        explanation:
          "The Equator (0° latitude) divides Earth into Northern and Southern hemispheres.",
        correctIndex: 1,
      },
      {
        options: ["3", "4", "5", "6"],
        question: "How many oceans are there?",
        explanation:
          "There are 5 oceans: Pacific, Atlantic, Indian, Southern, and Arctic.",
        correctIndex: 2,
      },
      {
        options: ["Europe", "Australia", "Africa", "Antarctica"],
        question: "Which continent is the smallest?",
        explanation: "Australia (Oceania) is the smallest continent.",
        correctIndex: 1,
      },
      {
        options: ["Asia", "Europe", "Africa", "North America"],
        question: "Which continent has the most countries?",
        explanation:
          "Africa has 54 recognised countries — more than any other continent.",
        correctIndex: 2,
      },
      {
        options: [
          "Between Africa and Asia",
          "Between the Americas and Africa/Europe",
          "Between Asia and Australia",
          "At the North Pole",
        ],
        question: "Where is the Atlantic Ocean?",
        explanation:
          "The Atlantic Ocean lies between the Americas and Europe/Africa.",
        correctIndex: 1,
      },
      {
        options: ["Atlantic", "Arctic", "Pacific", "Indian"],
        question: "Which ocean borders the south of Australia?",
        explanation:
          "The Indian Ocean borders Australia to the south and west.",
        correctIndex: 3,
      },
    ],
    "2": [
      {
        options: ["Marseille", "Lyon", "Paris", "Nice"],
        question: "What is the capital city of France?",
        explanation: "Paris is the capital of France.",
        correctIndex: 2,
      },
      {
        options: ["Sydney", "Melbourne", "Brisbane", "Canberra"],
        question: "Which city is the capital of Australia?",
        explanation:
          "Canberra is Australia's capital — a compromise between Sydney and Melbourne.",
        correctIndex: 3,
      },
      {
        options: [
          "Downtown Capital",
          "District of Columbia",
          "Democratic Country",
          "Direct Capital",
        ],
        question: "What does 'D.C.' in Washington D.C. stand for?",
        explanation:
          "D.C. stands for District of Columbia — a federal district, not a state.",
        correctIndex: 1,
      },
      {
        options: ["Osaka", "Kyoto", "Hiroshima", "Tokyo"],
        question: "What is the capital of Japan?",
        explanation:
          "Tokyo is Japan's capital and the world's most populated metropolitan area.",
        correctIndex: 3,
      },
      {
        options: ["Toronto", "Vancouver", "Ottawa", "Montreal"],
        question: "What is the capital of Canada?",
        explanation:
          "Ottawa is Canada's capital, despite Toronto being the largest city.",
        correctIndex: 2,
      },
      {
        options: ["Rio de Janeiro", "Sao Paulo", "Brasilia", "Salvador"],
        question: "What is the capital of Brazil?",
        explanation:
          "Brasilia became Brazil's capital in 1960, replacing Rio de Janeiro.",
        correctIndex: 2,
      },
      {
        options: ["Mumbai", "New Delhi", "Kolkata", "Chennai"],
        question: "What is the capital of India?",
        explanation: "New Delhi is India's capital city.",
        correctIndex: 1,
      },
      {
        options: ["Munich", "Hamburg", "Frankfurt", "Berlin"],
        question: "What is the capital of Germany?",
        explanation: "Berlin is Germany's capital and largest city.",
        correctIndex: 3,
      },
      {
        options: ["Cape Town", "Johannesburg", "Pretoria", "Durban"],
        question: "Which is the capital of South Africa (administrative)?",
        explanation: "Pretoria is South Africa's administrative capital.",
        correctIndex: 2,
      },
      {
        options: ["Alexandria", "Luxor", "Cairo", "Giza"],
        question: "What is the capital of Egypt?",
        explanation: "Cairo is Egypt's capital and the largest city in Africa.",
        correctIndex: 2,
      },
    ],
    "3": [
      {
        options: ["700", "7,000", "70,000", "700,000"],
        question: "How many languages are spoken in the world approximately?",
        explanation: "Approximately 7,000 languages are spoken worldwide.",
        correctIndex: 1,
      },
      {
        options: ["Eid", "Christmas", "Diwali", "Hanukkah"],
        question: "Which festival of lights is celebrated in India?",
        explanation:
          "Diwali is the Hindu festival of lights, celebrated with lamps, fireworks, and sweets.",
        correctIndex: 2,
      },
      {
        options: ["English", "Spanish", "Mandarin Chinese", "Hindi"],
        question: "Which language has the most native speakers?",
        explanation:
          "Mandarin Chinese has the most native speakers — over 900 million.",
        correctIndex: 2,
      },
      {
        options: [
          "A luxury food",
          "A food eaten only on special occasions",
          "The main food eaten regularly in a region",
          "A type of snack",
        ],
        question: "What is a 'staple food'?",
        explanation:
          "A staple food is the main calorie source for a population.",
        correctIndex: 2,
      },
      {
        options: [
          "Everyone having the same culture",
          "A wide variety of different cultures coexisting",
          "Only speaking one language",
          "Living in one place",
        ],
        question: "Cultural diversity means:",
        explanation:
          "Cultural diversity is the existence of a variety of cultural identities within a group.",
        correctIndex: 1,
      },
      {
        options: ["Diwali", "Christmas", "Eid al-Fitr", "Hanukkah"],
        question: "Which of the following is an Islamic festival?",
        explanation:
          "Eid al-Fitr marks the end of Ramadan, celebrated by Muslims worldwide.",
        correctIndex: 2,
      },
      {
        options: ["Germany", "Spain", "France", "Italy"],
        question: "The Eiffel Tower is a cultural landmark in:",
        explanation:
          "The Eiffel Tower in Paris, France is a world-famous cultural landmark.",
        correctIndex: 2,
      },
      {
        options: [
          "A new invention",
          "A practice passed down through generations",
          "A government law",
          "A type of technology",
        ],
        question: "A 'cultural tradition' is:",
        explanation:
          "Cultural traditions are practices and customs passed from one generation to the next.",
        correctIndex: 1,
      },
      {
        options: [
          "So we can copy them",
          "To promote understanding and reduce prejudice",
          "Because our culture is boring",
          "It's required by law",
        ],
        question: "Why is it important to learn about other cultures?",
        explanation:
          "Learning about other cultures builds empathy and reduces stereotypes.",
        correctIndex: 1,
      },
      {
        options: ["Mexico", "Brazil", "Spain", "Argentina"],
        question: "Flamenco is a traditional dance from:",
        explanation:
          "Flamenco originated in Andalucia, Spain — recognised as UNESCO cultural heritage.",
        correctIndex: 2,
      },
    ],
    "4": [
      {
        options: ["Polar", "Desert", "Temperate", "Tropical"],
        question:
          "Which climate zone is near the equator with hot, wet conditions?",
        explanation:
          "Tropical/equatorial climate is near the equator — hot and wet year-round.",
        correctIndex: 3,
      },
      {
        options: ["Very cold", "Very wet", "Very dry", "Very windy"],
        question: "'Arid' climate means:",
        explanation:
          "Arid means very dry — the Sahara receives less than 25mm of rain per year in many areas.",
        correctIndex: 2,
      },
      {
        options: ["Continental", "Mediterranean", "Polar", "Tropical"],
        question:
          "Which climate zone has hot dry summers and mild wet winters?",
        explanation:
          "The Mediterranean climate (around the Mediterranean Sea) has dry, sunny summers.",
        correctIndex: 1,
      },
      {
        options: ["Tropical", "Desert", "Temperate", "Polar"],
        question: "The UK has which type of climate?",
        explanation:
          "The UK has a temperate climate — moderate temperatures with four seasons.",
        correctIndex: 2,
      },
      {
        options: [
          "The poles are closer to the Moon",
          "Sunlight hits poles at a lower angle, spreading over a larger area",
          "The poles have more wind",
          "The poles have less land",
        ],
        question: "Why is it colder at the poles than at the equator?",
        explanation:
          "At the poles, sunlight spreads over a larger area, providing less heat per square metre.",
        correctIndex: 1,
      },
      {
        options: [
          "There is no difference",
          "Climate is daily conditions; weather is long-term patterns",
          "Weather is daily conditions; climate is long-term patterns",
          "Climate only refers to temperature",
        ],
        question: "The difference between climate and weather?",
        explanation:
          "Weather is day-to-day. Climate is the long-term average pattern of a region.",
        correctIndex: 2,
      },
      {
        options: [
          "Population",
          "Distance from the equator (latitude)",
          "Number of mountains",
          "Soil type",
        ],
        question: "What factor most determines a region's climate?",
        explanation:
          "Latitude is the primary factor — regions near the equator receive the most direct sunlight.",
        correctIndex: 1,
      },
      {
        options: [
          "It gets warmer",
          "It stays the same",
          "It gets colder",
          "It becomes more humid",
        ],
        question: "What happens to temperature as you go up a mountain?",
        explanation:
          "Temperature decreases by about 6.5°C per 1,000m of altitude.",
        correctIndex: 2,
      },
      {
        options: [
          "Year-round drought",
          "Year-round cold",
          "Distinct wet and dry seasons",
          "Four equal seasons",
        ],
        question: "Monsoon climates are characterised by:",
        explanation:
          "Monsoon climates (South and Southeast Asia) have a very wet and very dry season.",
        correctIndex: 2,
      },
      {
        options: [
          "Remain perfectly stable",
          "Shift, causing deserts to expand and ice caps to melt",
          "Disappear completely",
          "Move to the poles",
        ],
        question: "Global warming is causing climate zones to:",
        explanation:
          "Climate change causes climate zones to shift, affecting biodiversity and agriculture.",
        correctIndex: 1,
      },
    ],
    "5": [
      {
        options: [
          "Earthquakes",
          "Glaciers",
          "The Colorado River",
          "Wind erosion",
        ],
        question: "What carved the Grand Canyon?",
        explanation:
          "The Colorado River carved the Grand Canyon over 5-6 million years.",
        correctIndex: 2,
      },
      {
        options: [
          "Andes, South America",
          "Alps, Europe",
          "Himalayas, Asia",
          "Rockies, North America",
        ],
        question: "Where is Mount Everest?",
        explanation:
          "Mount Everest (8,849m) is in the Himalayas on the border of Nepal and China.",
        correctIndex: 2,
      },
      {
        options: ["South Africa", "Australia", "India", "Mexico"],
        question: "The Great Barrier Reef is located off the coast of:",
        explanation:
          "The Great Barrier Reef is off Queensland, northeast Australia.",
        correctIndex: 1,
      },
      {
        options: [
          "Volcanic eruptions",
          "Solar particles interacting with Earth's atmosphere",
          "Extreme cold temperatures",
          "Moonlight reflecting off ice",
        ],
        question: "What causes the Aurora Borealis?",
        explanation:
          "Charged solar particles interact with Earth's atmosphere, creating colourful light shows.",
        correctIndex: 1,
      },
      {
        options: ["Gobi", "Arabian", "Australian", "Sahara"],
        question: "Which is the world's largest hot desert?",
        explanation:
          "The Sahara is the world's largest hot desert at approximately 9.2 million km2.",
        correctIndex: 3,
      },
      {
        options: [
          "Egypt and Sudan",
          "Kenya and Tanzania",
          "Zambia and Zimbabwe",
          "South Africa and Mozambique",
        ],
        question: "Victoria Falls is on the border of:",
        explanation:
          "Victoria Falls is on the Zambezi River, on the border of Zambia and Zimbabwe.",
        correctIndex: 2,
      },
      {
        options: ["Africa", "North America", "South America", "Asia"],
        question: "The Amazon River flows through:",
        explanation:
          "The Amazon flows through South America, primarily through Brazil.",
        correctIndex: 2,
      },
      {
        options: [
          "A type of desert",
          "A narrow inlet of sea between high cliffs, carved by glaciers",
          "A coral reef",
          "A mountain plateau",
        ],
        question: "What is a fjord?",
        explanation:
          "Fjords are long, narrow sea inlets with steep cliffs, created by glacial erosion (famous in Norway).",
        correctIndex: 1,
      },
      {
        options: ["50%", "61%", "71%", "81%"],
        question: "What percentage of Earth's surface do oceans cover?",
        explanation: "Oceans cover approximately 71% of Earth's surface.",
        correctIndex: 2,
      },
      {
        options: [
          "Are larger",
          "Are formed by natural processes without human help",
          "Are older",
          "Can never be visited",
        ],
        question: "Natural wonders differ from man-made wonders because they:",
        explanation:
          "Natural wonders are created by geological, biological, or atmospheric processes.",
        correctIndex: 1,
      },
    ],
    "6": [
      {
        options: [
          "Distance east or west of the Prime Meridian",
          "Distance north or south of the Equator",
          "Height of mountains",
          "Depth of oceans",
        ],
        question: "What do lines of latitude measure?",
        explanation:
          "Latitude lines measure how far north or south of the Equator a location is.",
        correctIndex: 1,
      },
      {
        options: [
          "The Equator (0° latitude)",
          "The line at 0° longitude passing through Greenwich",
          "The line at 90° north",
          "The date line",
        ],
        question: "What is the Prime Meridian?",
        explanation:
          "The Prime Meridian is 0° longitude — it passes through Greenwich, London.",
        correctIndex: 1,
      },
      {
        options: [
          "1cm on map = 1km in reality",
          "1m on map = 100km in reality",
          "1mm on map = 1m in reality",
          "1cm on map = 100,000cm in reality",
        ],
        question: "A map scale of 1:100,000 means:",
        explanation:
          "1:100,000 means 1 unit on map = 100,000 of those units in reality. 1cm = 1km.",
        correctIndex: 3,
      },
      {
        options: [
          "The map's creator",
          "The date made",
          "Symbols and colours used on the map",
          "The country's population",
        ],
        question: "What does a map legend (key) show?",
        explanation:
          "A map legend explains what each symbol, colour, or line represents.",
        correctIndex: 2,
      },
      {
        options: [
          "Rivers",
          "Population density",
          "Elevation above sea level",
          "National borders",
        ],
        question: "Contour lines on a map show:",
        explanation: "Contour lines connect points of equal elevation.",
        correctIndex: 2,
      },
      {
        options: ["Very flat", "Very steep", "Underwater", "Desert"],
        question: "If contour lines are very close together, the terrain is:",
        explanation:
          "Closely spaced contour lines indicate rapid elevation change — steep terrain.",
        correctIndex: 1,
      },
      {
        options: ["South", "West", "Northeast", "Northwest"],
        question: "The compass direction halfway between North and East is:",
        explanation:
          "Northeast (NE) is exactly halfway between North and East.",
        correctIndex: 2,
      },
      {
        options: [
          "Longitude then latitude",
          "Latitude then longitude",
          "Either order",
          "Depends on the country",
        ],
        question: "Which coordinate comes first when writing a location?",
        explanation:
          "Coordinates are written as latitude, longitude: (51°N, 0°W) for London.",
        correctIndex: 1,
      },
      {
        options: [
          "National borders only",
          "Cities and roads",
          "Natural features like mountains, rivers, and oceans",
          "Population data",
        ],
        question: "A physical map shows:",
        explanation:
          "Physical maps show natural geographic features — terrain, rivers, mountains, and oceans.",
        correctIndex: 2,
      },
      {
        options: [
          "0° longitude",
          "90° longitude",
          "180° longitude",
          "45° longitude",
        ],
        question: "The International Date Line is at approximately:",
        explanation:
          "The International Date Line is at 180° longitude, opposite the Prime Meridian.",
        correctIndex: 2,
      },
    ],
    "7": [
      {
        options: ["5 billion", "6 billion", "8 billion", "10 billion"],
        question: "Approximately what is the world's current population?",
        explanation: "The world's population reached 8 billion people in 2022.",
        correctIndex: 2,
      },
      {
        options: [
          "Population × area",
          "Population ÷ area",
          "Area ÷ population",
          "Population + area",
        ],
        question: "Population density is calculated as:",
        explanation:
          "Population density = number of people ÷ area (people per km2).",
        correctIndex: 1,
      },
      {
        options: ["Shanghai", "New York", "Tokyo", "Mumbai"],
        question: "Which city has the largest urban population?",
        explanation:
          "Tokyo, Japan has the world's largest urban population (~37 million).",
        correctIndex: 2,
      },
      {
        options: [
          "Building taller buildings",
          "People moving from cities to countryside",
          "People moving from rural areas to cities",
          "A type of pollution",
        ],
        question: "What is urbanisation?",
        explanation:
          "Urbanisation is the increasing proportion of people living in urban (city) areas.",
        correctIndex: 2,
      },
      {
        options: [
          "Because cities have cleaner air",
          "To escape floods",
          "For better job opportunities, education, and services",
          "The government forces them to",
        ],
        question: "Why do people migrate to cities?",
        explanation:
          "People migrate for economic opportunities, better healthcare, education, and infrastructure.",
        correctIndex: 2,
      },
      {
        options: [
          "Over 1 million people",
          "Over 5 million people",
          "Over 10 million people",
          "Over 50 million people",
        ],
        question: "A 'megacity' is a city with:",
        explanation:
          "A megacity is an urban area with more than 10 million people.",
        correctIndex: 2,
      },
      {
        options: ["Africa", "Europe", "North America", "Asia"],
        question: "Which continent has the highest population?",
        explanation: "Asia is home to about 60% of the world's population.",
        correctIndex: 3,
      },
      {
        options: [
          "It is the most dangerous country",
          "The most people live there in total",
          "The most people live per square kilometre",
          "It has the most tourists",
        ],
        question:
          "Monaco has the world's highest population density. This means:",
        explanation:
          "High density means many people per unit area. Monaco is very small with many residents.",
        correctIndex: 2,
      },
      {
        options: [
          "City areas",
          "Suburban areas",
          "Countryside areas with small populations",
          "Industrial zones",
        ],
        question: "The term 'rural' refers to:",
        explanation:
          "Rural areas are the countryside — less densely populated, with farming and nature.",
        correctIndex: 2,
      },
      {
        options: [
          "High population density",
          "Medium population density",
          "Low population density",
          "Zero population",
        ],
        question: "Large land area but few people = ?",
        explanation:
          "Low density means few people relative to the size of the area (e.g., Australia, Canada).",
        correctIndex: 2,
      },
    ],
    "8": [
      {
        options: ["Coal", "Oil", "Natural gas", "Solar energy"],
        question: "Which of these is a renewable resource?",
        explanation:
          "Solar energy is renewable — the Sun continuously provides energy.",
        correctIndex: 3,
      },
      {
        options: [
          "They can be recycled",
          "They form over millions of years and cannot be replaced quickly",
          "They are too expensive",
          "They come from space",
        ],
        question: "Why are fossil fuels called 'non-renewable'?",
        explanation:
          "Fossil fuels take millions of years to form — we cannot replace them in a human lifetime.",
        correctIndex: 1,
      },
      {
        options: [
          "They smell bad",
          "They produce CO2, contributing to climate change",
          "They are too heavy",
          "They only work in cold places",
        ],
        question: "The main problem with burning fossil fuels?",
        explanation:
          "Burning fossil fuels releases CO2, a greenhouse gas that causes global warming.",
        correctIndex: 1,
      },
      {
        options: [
          "Power from wind turbines",
          "Power generated by flowing or falling water",
          "Power from the Sun",
          "Power from burning wood",
        ],
        question: "What is hydroelectric power?",
        explanation:
          "Hydroelectric power uses flowing water to turn turbines and generate electricity.",
        correctIndex: 1,
      },
      {
        options: [
          "Planting new trees",
          "Cutting down forests faster than they can grow back",
          "Protecting forests",
          "Studying trees scientifically",
        ],
        question: "Deforestation means:",
        explanation:
          "Deforestation is large-scale removal of forests, destroying habitats and releasing carbon.",
        correctIndex: 1,
      },
      {
        options: ["Iron", "Gold", "Copper", "Aluminium"],
        question:
          "Which metal is used in electrical wires due to excellent conductivity?",
        explanation:
          "Copper is used in electrical wires due to its excellent electrical conductivity.",
        correctIndex: 2,
      },
      {
        options: [
          "Using as much as possible",
          "Using resources at a rate that allows them to be replenished",
          "Never using any resources",
          "Only using resources in rich countries",
        ],
        question: "'Sustainable use' of natural resources means:",
        explanation:
          "Sustainable use meets today's needs without compromising future generations.",
        correctIndex: 1,
      },
      {
        options: [
          "Having too much fresh water",
          "Not having enough clean fresh water for human needs",
          "Only having ocean water",
          "Water being too cold",
        ],
        question: "What is water scarcity?",
        explanation:
          "Water scarcity affects about 2 billion people worldwide — a major global crisis.",
        correctIndex: 1,
      },
      {
        options: [
          "Heat energy to electrical energy",
          "Light energy to electrical energy",
          "Kinetic (movement) energy to electrical energy",
          "Chemical energy to electrical energy",
        ],
        question: "Wind turbines convert:",
        explanation:
          "Wind turbines' blades spin from wind kinetic energy, driving generators.",
        correctIndex: 2,
      },
      {
        options: [
          "A renewable nation",
          "A fossil nation",
          "A resource-rich nation",
          "An arid nation",
        ],
        question: "A country with rich fossil fuel deposits is called:",
        explanation:
          "A resource-rich nation has large deposits of valuable natural resources.",
        correctIndex: 2,
      },
    ],
    "9": [
      {
        options: [
          "Buys from abroad",
          "Makes and sells to other countries",
          "Keeps entirely for itself",
          "Receives as gifts",
        ],
        question: "Exports are goods that a country:",
        explanation: "Exports are products sold to foreign countries.",
        correctIndex: 1,
      },
      {
        options: ["30%", "50%", "70%", "90%"],
        question: "What percentage of world trade travels by sea?",
        explanation:
          "About 90% of world trade is transported by sea in container ships.",
        correctIndex: 3,
      },
      {
        options: [
          "Aircraft are rarer",
          "Air fuel costs more and aircraft carry much less cargo",
          "Airports are further away",
          "Air freight is always slower",
        ],
        question: "Why is air freight more expensive than sea freight?",
        explanation:
          "Aircraft are smaller than container ships, burn expensive jet fuel, and have high operating costs.",
        correctIndex: 1,
      },
      {
        options: [
          "A modern motorway",
          "An ancient trade route connecting Asia and Europe",
          "A type of fabric",
          "A sea shipping lane",
        ],
        question: "The Silk Road was:",
        explanation:
          "The Silk Road was an ancient network of trade routes connecting China and Europe.",
        correctIndex: 1,
      },
      {
        options: [
          "A country exports more than it imports",
          "A country imports more than it exports",
          "Equal imports and exports",
          "No international trade",
        ],
        question: "A trade deficit means:",
        explanation:
          "A trade deficit means buying more from abroad (imports) than selling abroad (exports).",
        correctIndex: 1,
      },
      {
        options: [
          "A small fishing boat",
          "A large vessel carrying standardised shipping containers",
          "A type of aircraft",
          "A train used for trade",
        ],
        question: "What is a 'container ship'?",
        explanation:
          "Container ships carry standardised metal containers, enabling efficient loading at ports worldwide.",
        correctIndex: 1,
      },
      {
        options: [
          "The cheapest possible prices",
          "Farmers and workers receive fair wages",
          "Only local products are used",
          "Products are made quickly",
        ],
        question: "Fair Trade products ensure:",
        explanation:
          "Fair Trade guarantees farmers and workers in developing countries receive fair prices.",
        correctIndex: 1,
      },
      {
        options: [
          "A road connecting North and South America",
          "A waterway connecting Atlantic and Pacific Oceans through Panama",
          "A trade market in Panama",
          "A type of ship",
        ],
        question: "What is the Panama Canal?",
        explanation:
          "The Panama Canal allows ships to cross between the Atlantic and Pacific without going around South America.",
        correctIndex: 1,
      },
      {
        options: [
          "Each country only buys local products",
          "Countries becoming more connected through international trade",
          "Trade stopping due to wars",
          "Only large companies can trade",
        ],
        question: "Globalisation in trade means:",
        explanation:
          "Globalisation means increased economic interconnection between countries.",
        correctIndex: 1,
      },
      {
        options: [
          "Antarctica",
          "The Amazon jungle",
          "Shanghai, China",
          "The Sahara Desert",
        ],
        question: "Which is a major global trading hub?",
        explanation:
          "Shanghai is one of the world's busiest ports and a major centre for global trade.",
        correctIndex: 2,
      },
    ],
    "10": [
      {
        options: [
          "Plants growing in greenhouses",
          "Greenhouse gases trapping heat in the atmosphere",
          "Cooling of the Earth",
          "Only affecting tropical regions",
        ],
        question: "What is the 'greenhouse effect'?",
        explanation:
          "Greenhouse gases (CO2, methane) act like a blanket, trapping the Sun's heat in Earth's atmosphere.",
        correctIndex: 1,
      },
      {
        options: [
          "World trade",
          "Military cooperation",
          "Reducing greenhouse gas emissions globally",
          "Ocean protection",
        ],
        question: "The Paris Agreement (2015) was about:",
        explanation:
          "The Paris Agreement is an international treaty limiting global temperature rise by reducing emissions.",
        correctIndex: 2,
      },
      {
        options: [
          "Having one type of species",
          "The variety of life in an area",
          "A type of farming",
          "Ocean depth measurement",
        ],
        question: "What is biodiversity?",
        explanation:
          "Biodiversity is the variety of living things in an area — more species = more resilient ecosystem.",
        correctIndex: 1,
      },
      {
        options: ["Oxygen", "Nitrogen", "Carbon dioxide (CO2)", "Argon"],
        question: "Which gas is most responsible for the greenhouse effect?",
        explanation:
          "CO2 from burning fossil fuels is the main human-produced greenhouse gas driving climate change.",
        correctIndex: 2,
      },
      {
        options: [
          "Read, Write, Reflect",
          "Reduce, Reuse, Recycle",
          "Renew, Replace, Remove",
          "Research, Review, Report",
        ],
        question: "The '3 Rs' of environmentalism are:",
        explanation:
          "Reduce (use less), Reuse (use items again), Recycle (convert waste into new products).",
        correctIndex: 1,
      },
      {
        options: [
          "Large plastic bottles",
          "Tiny plastic particles (less than 5mm) that pollute water and soil",
          "A type of recycled plastic",
          "Plastic used in medicine",
        ],
        question: "Microplastics are:",
        explanation:
          "Microplastics are tiny plastic fragments found in oceans, soil, and living organisms.",
        correctIndex: 1,
      },
      {
        options: [
          "Trees make CO2",
          "Burning or decaying trees releases stored carbon",
          "Soil releases CO2 when trees are removed",
          "Deforestation has no effect",
        ],
        question: "Why does deforestation increase CO2?",
        explanation:
          "Trees store carbon. When forests are cleared or burned, the stored carbon is released as CO2.",
        correctIndex: 1,
      },
      {
        options: [
          "Mountain communities",
          "Low-lying coastal cities and islands",
          "Deserts",
          "Polar ice caps",
        ],
        question: "Rising sea levels threaten:",
        explanation:
          "Rising sea levels threaten low-lying coastal areas like Bangladesh and Pacific Islands.",
        correctIndex: 1,
      },
      {
        options: [
          "Recycling",
          "Renewable energy use",
          "Burning fossil fuels for energy and transport",
          "Eating vegetables",
        ],
        question: "Which human activity contributes MOST to carbon emissions?",
        explanation:
          "Burning fossil fuels for energy and transport is the largest source of global CO2 emissions.",
        correctIndex: 2,
      },
      {
        options: [
          "A dinosaur fossil",
          "The total CO2 emissions caused by a person or organisation",
          "A type of recycling",
          "The weight of coal",
        ],
        question: "What is a carbon footprint?",
        explanation:
          "Your carbon footprint is the total greenhouse gas emissions caused by your actions.",
        correctIndex: 1,
      },
    ],
  },
  "Coding for Kids": {
    "1": [
      {
        options: [
          "A foreign language",
          "A set of words and rules used to write instructions for a computer",
          "A type of computer hardware",
          "A way to speak to robots",
        ],
        question: "What is a programming language?",
        explanation:
          "A programming language (Python, Java, Scratch) provides syntax to write executable instructions.",
        correctIndex: 1,
      },
      {
        options: [
          "An insect",
          "An error in code causing incorrect behaviour",
          "A type of computer",
          "A programming language",
        ],
        question: "What is a 'bug' in programming?",
        explanation:
          "A bug is an error or flaw in the code causing unexpected behaviour.",
        correctIndex: 1,
      },
      {
        options: [
          "A type of computer",
          "A programming language",
          "A step-by-step set of instructions for solving a problem",
          "A bug in code",
        ],
        question: "An algorithm is:",
        explanation:
          "An algorithm is a sequence of clear instructions for solving a problem.",
        correctIndex: 2,
      },
      {
        options: ["HTML only", "Python", "Microsoft Word", "Google"],
        question: "Which of these is a programming language?",
        explanation: "Python is a popular programming language.",
        correctIndex: 1,
      },
      {
        options: [
          "Fix it automatically",
          "Ask the user what to do",
          "Follow incorrect instructions or crash",
          "Improve the code",
        ],
        question: "What does a computer do if the code has an error?",
        explanation:
          "Computers execute code exactly as written — errors cause crashes or wrong results.",
        correctIndex: 2,
      },
      {
        options: [
          "The code written by the programmer",
          "The result the program produces",
          "The computer's keyboard",
          "The bug in the code",
        ],
        question: "The output of a program is:",
        explanation:
          "Output is what the program produces — text on screen, a result, or an action.",
        correctIndex: 1,
      },
      {
        options: [
          "Writing new code",
          "Finding and fixing errors in code",
          "Deleting all code",
          "Adding new features",
        ],
        question: "Debugging means:",
        explanation:
          "Debugging is the process of finding and fixing bugs in computer code.",
        correctIndex: 1,
      },
      {
        options: [
          "Professional developers",
          "Database management",
          "Beginners, especially children, using visual blocks",
          "Running servers",
        ],
        question: "Scratch is designed for:",
        explanation:
          "Scratch uses colourful code blocks ideal for beginners to learn programming concepts.",
        correctIndex: 2,
      },
      {
        options: [
          "Type the code immediately",
          "Understand and plan the problem first",
          "Test the code",
          "Fix bugs",
        ],
        question: "What is the first step when solving a problem with code?",
        explanation:
          "Planning your algorithm first ensures you understand the problem before writing code.",
        correctIndex: 1,
      },
      {
        options: ["Chef", "Software developer", "Painter", "Musician"],
        question: "Which job uses programming skills?",
        explanation:
          "Software developers write code to create apps, games, websites, and systems.",
        correctIndex: 1,
      },
    ],
    "2": [
      {
        options: [
          "A type of loop",
          "Instructions executed in order, one after another",
          "A condition check",
          "A variable",
        ],
        question: "What is a sequence in programming?",
        explanation:
          "A sequence is the most basic construct — instructions run one by one in order.",
        correctIndex: 1,
      },
      {
        options: [
          "To store data",
          "To repeat a block of code",
          "To make decisions",
          "To fix bugs",
        ],
        question: "What is the purpose of a loop?",
        explanation:
          "Loops repeat a block of code either a set number of times or while a condition is true.",
        correctIndex: 1,
      },
      {
        options: [
          "Condition-controlled loop",
          "Count-controlled loop",
          "Infinite loop",
          "While loop",
        ],
        question: "A 'for loop' is also called a:",
        explanation:
          "A for loop runs a set number of times — it's a count-controlled loop.",
        correctIndex: 1,
      },
      {
        options: [
          "A loop that runs exactly once",
          "A loop with a counter",
          "A loop that never stops",
          "A loop in a function",
        ],
        question: "What is an infinite loop?",
        explanation:
          "An infinite loop never terminates — usually a serious bug!",
        correctIndex: 2,
      },
      {
        options: ["1 time", "2 times", "3 times", "4 times"],
        question: "In Python, `for i in range(3):` runs the loop:",
        explanation:
          "range(3) produces 0, 1, 2 — three values, so the loop runs 3 times.",
        correctIndex: 2,
      },
      {
        options: [
          "The loop's condition",
          "One complete run through the loop's code block",
          "The loop variable",
          "The end of the program",
        ],
        question: "What is one iteration of a loop?",
        explanation:
          "One iteration is one complete pass through all the code inside the loop.",
        correctIndex: 1,
      },
      {
        options: [
          "The counter reaches 10",
          "A certain condition remains true",
          "The program is running",
          "There are no bugs",
        ],
        question: "A while loop continues as long as:",
        explanation:
          "A while loop continues as long as its condition evaluates to True.",
        correctIndex: 1,
      },
      {
        options: [
          "Printing one name",
          "Adding two numbers",
          "Printing 50 names",
          "Storing a value",
        ],
        question: "Which situation is BEST solved with a loop?",
        explanation:
          "Printing 50 names is repetitive — a loop avoids writing the print statement 50 times.",
        correctIndex: 2,
      },
      {
        options: [
          "A sequence",
          "A condition",
          "A count-controlled loop",
          "A variable",
        ],
        question: "In Scratch, 'Repeat 10' is an example of:",
        explanation:
          "Scratch's 'Repeat 10' block runs its contents 10 times — a count-controlled loop.",
        correctIndex: 2,
      },
      {
        options: [
          "The program restarts",
          "Execution continues with the next instruction after the loop",
          "The program crashes",
          "The loop variable disappears",
        ],
        question: "What happens after a loop finishes?",
        explanation:
          "After a loop completes, execution continues with the next instruction.",
        correctIndex: 1,
      },
    ],
    "3": [
      {
        options: [
          "Repeats code",
          "Makes a decision based on a condition",
          "Stores a value",
          "Defines a function",
        ],
        question: "What does an 'if statement' do?",
        explanation:
          "An if statement checks if a condition is True; if so, it runs its code block.",
        correctIndex: 1,
      },
      {
        options: ["=", "==", "!=", ">="],
        question: "Which operator checks if two values are EQUAL in code?",
        explanation:
          "== checks equality. A single = is assignment (giving a value to a variable).",
        correctIndex: 1,
      },
      {
        options: [
          "Runs when the if condition is True",
          "Runs when the if condition is False",
          "Repeats the if block",
          "Ignores the if statement",
        ],
        question: "What does 'else' do in an if-else statement?",
        explanation:
          "The else block runs when the if condition is False — an alternative path.",
        correctIndex: 1,
      },
      {
        options: [
          "A number between 0 and 1",
          "A text string",
          "A True or False value",
          "A type of loop",
        ],
        question: "What is a Boolean value?",
        explanation:
          "Boolean values are True or False — the result of any logical or comparison expression.",
        correctIndex: 2,
      },
      {
        options: ["=", "<", ">=", "<="],
        question: "Which comparison operator means 'greater than or equal to'?",
        explanation: ">= means greater than or equal to.",
        correctIndex: 2,
      },
      {
        options: [
          "If x equals 10",
          "If x is not equal to 10",
          "If x is greater than 10",
          "If x is 10 times something",
        ],
        question: "What does `if x != 10:` mean?",
        explanation:
          "!= means 'not equal to'. The block runs when x is any value other than 10.",
        correctIndex: 1,
      },
      {
        options: [
          "You need a loop",
          "You have multiple conditions to check",
          "You want to define a function",
          "You need to store data",
        ],
        question: "An 'elif' clause is used when:",
        explanation:
          "elif (else-if) checks another condition if the previous if was False.",
        correctIndex: 1,
      },
      {
        options: [
          "Code bugs",
          "The visual flow of a program's logic and decisions",
          "A type of loop",
          "A data structure",
        ],
        question: "A flowchart represents:",
        explanation:
          "Flowcharts visually show the sequence, decisions, and loops in a program's logic.",
        correctIndex: 1,
      },
      {
        options: [
          "The program crashes",
          "The if block runs anyway",
          "The if block is skipped and execution continues",
          "The condition becomes True",
        ],
        question:
          "What happens if an if condition is False and there is no else?",
        explanation:
          "If the condition is False and there is no else, the if block is simply skipped.",
        correctIndex: 2,
      },
      {
        options: ["score = 100", "score == 100", "score -> 100", "score : 100"],
        question:
          "Which of these is a valid condition to check if player score is 100?",
        explanation:
          "score == 100 uses the equality operator to check if score equals 100.",
        correctIndex: 1,
      },
    ],
    "4": [
      {
        options: [
          "A type of loop",
          "A named storage location that holds a value",
          "A programming language",
          "A type of screen",
        ],
        question: "What is a variable?",
        explanation:
          "A variable is a named container in memory that holds a value which can change.",
        correctIndex: 1,
      },
      {
        options: ["Integer", "Float", "Boolean", "String"],
        question: "What data type is 'Hello'?",
        explanation: "Text values in quotes are strings (str).",
        correctIndex: 3,
      },
      {
        options: ["3.14", "True", "'seven'", "42"],
        question: "Which is an INTEGER?",
        explanation: "42 is an integer — a whole number.",
        correctIndex: 3,
      },
      {
        options: [
          "Sets score to 10",
          "Checks if score equals 10",
          "Increases the value of score by 10",
          "Creates a new variable called 10",
        ],
        question: "What does `score = score + 10` do?",
        explanation:
          "Takes current value of score, adds 10, and stores result back in score.",
        correctIndex: 2,
      },
      {
        options: ["1 or 0", "True or False", "Any text", "Any number"],
        question: "A Boolean variable can only be:",
        explanation:
          "Boolean variables hold exactly two values: True or False.",
        correctIndex: 1,
      },
      {
        options: [
          "It has a number",
          "Variable names cannot start with a number",
          "It's too short",
          "Nothing is wrong",
        ],
        question: "What is wrong with this variable name: `1score`?",
        explanation:
          "Variable names cannot start with a number in most programming languages.",
        correctIndex: 1,
      },
      {
        options: ["hello", "5", "1", "h"],
        question: "What does `len('hello')` return?",
        explanation:
          "len() counts the number of characters. 'hello' has 5: h-e-l-l-o.",
        correctIndex: 1,
      },
      {
        options: ["num == 7", "num = 7", "7 = num", "var num = 7"],
        question:
          "Which code correctly stores the number 7 in a variable 'num'?",
        explanation:
          "num = 7 assigns the value 7 to the variable num using the assignment operator =.",
        correctIndex: 1,
      },
      {
        options: ["Integer", "String", "Float", "Boolean"],
        question: "What type of data is 3.14?",
        explanation: "3.14 is a float — it has a decimal point.",
        correctIndex: 2,
      },
      {
        options: ["Hello name", "Hello Emma", "Emma Hello", "Hello + Emma"],
        question:
          "If name = 'Emma' and greeting = 'Hello ' + name, what is greeting?",
        explanation:
          "String concatenation joins strings: 'Hello ' + 'Emma' = 'Hello Emma'.",
        correctIndex: 1,
      },
    ],
    "5": [
      {
        options: [
          "A type of variable",
          "A named, reusable block of code that performs a specific task",
          "A type of loop",
          "A debugging tool",
        ],
        question: "What is a function in programming?",
        explanation:
          "A function is a named block of code you can call whenever you need.",
        correctIndex: 1,
      },
      {
        options: ["function", "define", "def", "make"],
        question: "In Python, what keyword defines a function?",
        explanation:
          "In Python, functions are defined using the 'def' keyword.",
        correctIndex: 2,
      },
      {
        options: [
          "The function's name",
          "A variable that receives input when the function is called",
          "The output of the function",
          "A type of loop inside the function",
        ],
        question: "What is a 'parameter' in a function?",
        explanation:
          "A parameter is a variable in the function definition that receives values when called.",
        correctIndex: 1,
      },
      {
        options: [
          "Deleting the function",
          "Defining the function",
          "Executing/running the function",
          "Testing the function for bugs",
        ],
        question: "What does 'calling' a function mean?",
        explanation:
          "Calling a function means running it by writing its name with parentheses.",
        correctIndex: 2,
      },
      {
        options: [
          "Debug Repeatedly Yourself",
          "Don't Repeat Yourself — use functions to avoid duplicate code",
          "Design Really Well",
          "Do Runs Yesterday",
        ],
        question: "What is the DRY principle?",
        explanation:
          "DRY means writing code once as a function rather than duplicating it.",
        correctIndex: 1,
      },
      {
        options: [
          "Ends the program",
          "Deletes the function",
          "Sends a value back to where the function was called",
          "Restarts the function",
        ],
        question: "What does 'return' do in a function?",
        explanation:
          "The return statement exits the function and sends a value back to the caller.",
        correctIndex: 2,
      },
      {
        options: ["0", "None (nothing)", "False", "The last variable used"],
        question: "A function with no return statement returns:",
        explanation:
          "In Python, a function without return implicitly returns None.",
        correctIndex: 1,
      },
      {
        options: [
          "They are the same",
          "Parameter is in the definition; argument is the value passed when calling",
          "Argument is in definition; parameter is when calling",
          "Parameters are only numbers",
        ],
        question: "The difference between parameter and argument?",
        explanation:
          "Parameter: placeholder in function definition. Argument: actual value when calling.",
        correctIndex: 1,
      },
      {
        options: [
          "They make code longer",
          "They allow code reuse, making programs shorter and easier to maintain",
          "They make programs run slower",
          "They are only used in Python",
        ],
        question: "Why are functions useful?",
        explanation:
          "Functions make code reusable, reducing duplication and improving maintainability.",
        correctIndex: 1,
      },
      {
        options: ["5", "2", "10", "25"],
        question:
          "What does `def double(n): return n * 2` then `print(double(5))` print?",
        explanation:
          "double(5) calls the function with n=5. It returns 5*2=10. print(10) displays 10.",
        correctIndex: 2,
      },
    ],
    "6": [
      {
        options: [
          "The code runs but gives wrong output",
          "The code crashes while running",
          "You break the programming language's grammatical rules",
          "The variable is empty",
        ],
        question: "A syntax error occurs when:",
        explanation:
          "Syntax errors violate the language's rules — missing colon or bracket. Code won't run.",
        correctIndex: 2,
      },
      {
        options: [
          "Syntax error",
          "Runtime error",
          "Logic error",
          "Compile error",
        ],
        question: "What type of error gives wrong output but doesn't crash?",
        explanation:
          "Logic errors produce incorrect results — code runs without crashing but the logic is flawed.",
        correctIndex: 2,
      },
      {
        options: [
          "Asking a colleague for help",
          "Using a debugging tool",
          "Explaining your code out loud to spot errors",
          "Deleting all bugs manually",
        ],
        question: "'Rubber duck debugging' involves:",
        explanation:
          "Explaining code out loud forces step-by-step thinking, revealing flaws in logic.",
        correctIndex: 2,
      },
      {
        options: [
          "Makes the program faster",
          "Shows values at specific points to track what the code is doing",
          "Fixes syntax errors",
          "Deletes the bug",
        ],
        question: "What does a 'print statement' help with in debugging?",
        explanation:
          "Adding print statements shows variable values at different points, tracing errors.",
        correctIndex: 1,
      },
      {
        options: [
          "When you write incorrect syntax",
          "After the program starts running, when something unexpected happens",
          "When the output is wrong",
          "When you save the file",
        ],
        question: "A runtime error happens:",
        explanation:
          "Runtime errors occur during execution — like accessing a list index that doesn't exist.",
        correctIndex: 1,
      },
      {
        options: [
          "Delete the code",
          "Run the program with different inputs to check it works correctly",
          "Fix all bugs",
          "Write new features",
        ],
        question: "What does it mean to 'test' code?",
        explanation:
          "Testing means running your code with various inputs to verify correct outputs.",
        correctIndex: 1,
      },
      {
        options: [
          "Delete all code and start again",
          "Understand what the code should do, then trace through it step by step",
          "Ask someone else to fix it",
          "Guess and check random fixes",
        ],
        question: "Best first step when you find a bug?",
        explanation:
          "Understanding expected behaviour and tracing execution logically is the most effective approach.",
        correctIndex: 1,
      },
      {
        options: [
          "A bug in the code",
          "A specific input and expected output used to test a program",
          "The code for a function",
          "A syntax error",
        ],
        question: "What is a 'test case'?",
        explanation:
          "A test case is a specific set of inputs and expected output to verify a function works.",
        correctIndex: 1,
      },
      {
        options: [
          "Testing the most common scenarios",
          "Testing unusual or extreme inputs that might cause problems",
          "Only testing once",
          "Testing without any inputs",
        ],
        question: "What is 'edge case' testing?",
        explanation:
          "Edge cases test extreme inputs (0, very large numbers, empty strings) to reveal hidden bugs.",
        correctIndex: 1,
      },
      {
        options: [
          "Is guaranteed to be bug-free",
          "Is likely more reliable, though bugs may still exist",
          "Can never have logic errors",
          "Should not be changed",
        ],
        question: "Code that passes all its tests:",
        explanation:
          "Passing tests increases confidence but tests only cover what was tested.",
        correctIndex: 1,
      },
    ],
    "7": [
      {
        options: ["1", "0", "-1", "10"],
        question: "Lists in Python are indexed starting at:",
        explanation:
          "Python uses zero-based indexing — the first element is at index 0.",
        correctIndex: 1,
      },
      {
        options: ["apple", "banana", "cherry", "None"],
        question: "What is fruits[2] if fruits = ['apple','banana','cherry']?",
        explanation:
          "Index 2 is the third element: apple(0), banana(1), cherry(2).",
        correctIndex: 2,
      },
      {
        options: ["list.size()", "count(list)", "len(list)", "list.length"],
        question: "How do you find the length of a list in Python?",
        explanation: "len(list) returns the number of items in the list.",
        correctIndex: 2,
      },
      {
        options: [
          "Removes 5 from the list",
          "Adds 5 to the beginning",
          "Adds 5 to the end of the list",
          "Checks if 5 is in the list",
        ],
        question: "What does my_list.append(5) do?",
        explanation: "append() adds an item to the end of the list.",
        correctIndex: 2,
      },
      {
        options: ["10", "20", "30", "Error"],
        question: "If nums = [10,20,30], what is nums[1]?",
        explanation: "nums[1] is the second element (index 1) = 20.",
        correctIndex: 1,
      },
      {
        options: [
          "While loop",
          "For-each loop (for item in list:)",
          "If statement",
          "Infinite loop",
        ],
        question: "Best loop for going through every item in a list?",
        explanation:
          "A for-each loop iterates through each item: `for item in my_list:`",
        correctIndex: 1,
      },
      {
        options: [
          "The list's name",
          "The number of items",
          "The position of an item in the list",
          "The data type of items",
        ],
        question: "What is an 'index' in a list?",
        explanation:
          "An index is the numerical position of an item. Lists start at index 0.",
        correctIndex: 2,
      },
      {
        options: ["['apple','banana']", "['banana']", "['apple']", "[]"],
        question:
          "After fruits = ['apple','banana']; fruits.remove('apple'), what is fruits?",
        explanation:
          "remove() deletes the first occurrence. 'apple' is removed, leaving ['banana'].",
        correctIndex: 1,
      },
      {
        options: [
          "Only numbers",
          "Only strings",
          "Only one type of data",
          "Multiple types of data",
        ],
        question: "A list can contain:",
        explanation: "Python lists can contain any mix of data types.",
        correctIndex: 3,
      },
      {
        options: ["5", "4", "-1", "0"],
        question: "Index of the LAST item in a list of 5 items?",
        explanation:
          "In a 5-item list, indices are 0,1,2,3,4. The last is at index 4 (= length - 1).",
        correctIndex: 1,
      },
    ],
    "8": [
      {
        options: [
          "A type of variable",
          "An action that triggers code to run (e.g., mouse click, key press)",
          "A type of loop",
          "A function definition",
        ],
        question: "What is an 'event' in programming?",
        explanation:
          "An event is an action (click, keypress, timer) that the program detects and responds to.",
        correctIndex: 1,
      },
      {
        options: [
          "Code runs from top to bottom once",
          "Code responds to user actions and events",
          "Code only runs in loops",
          "Code is written backwards",
        ],
        question: "Event-driven programming means:",
        explanation:
          "Event-driven programming waits for events and executes code in response.",
        correctIndex: 1,
      },
      {
        options: [
          "Move 10 steps",
          "Say Hello",
          "When green flag clicked",
          "Set colour to red",
        ],
        question: "In Scratch, which is an event block?",
        explanation:
          "'When green flag clicked' is an event — it triggers the script when user clicks the flag.",
        correctIndex: 2,
      },
      {
        options: [
          "The programming language used",
          "The database of a program",
          "The visual elements users interact with",
          "The program's source code",
        ],
        question: "What is a User Interface (UI)?",
        explanation: "The UI is everything the user sees and interacts with.",
        correctIndex: 2,
      },
      {
        options: [
          "Creates a variable",
          "Adds an event listener that waits for a specific event and runs code",
          "Removes an event",
          "Defines a function",
        ],
        question: "addEventListener in JavaScript:",
        explanation:
          "addEventListener attaches a function to an element that runs when a specified event occurs.",
        correctIndex: 1,
      },
      {
        options: ["click", "load", "keypress", "scroll"],
        question: "Which event fires when a user presses a keyboard key?",
        explanation:
          "The keypress (or keydown/keyup) event fires when the user presses a keyboard key.",
        correctIndex: 2,
      },
      {
        options: [
          "Responding to mouse clicks",
          "Running code at regular intervals (e.g., every second)",
          "Handling keyboard input",
          "Loading a webpage",
        ],
        question: "A timer event is useful for:",
        explanation:
          "Timer events run code at regular intervals — used in games, clocks, and animations.",
        correctIndex: 1,
      },
      {
        options: [
          "It crashes",
          "It loops infinitely",
          "It waits, doing nothing until an event occurs",
          "It runs from top to bottom",
        ],
        question:
          "What happens when no events occur in an event-driven program?",
        explanation:
          "An event-driven program idles — waiting for events. When one fires, the handler runs.",
        correctIndex: 2,
      },
      {
        options: [
          "You click a button",
          "You move the mouse over an element",
          "A page loads",
          "You press a key",
        ],
        question: "The 'hover' event fires when:",
        explanation:
          "The hover event fires when the user moves their mouse pointer over an element.",
        correctIndex: 1,
      },
      {
        options: [
          "It isn't important",
          "So users know their action was registered",
          "To make programs slower",
          "It confuses users",
        ],
        question: "Why is feedback important in UI design?",
        explanation:
          "Good UI feedback (visual changes, sounds) confirms to users that their actions had an effect.",
        correctIndex: 1,
      },
    ],
    "9": [
      {
        options: [
          "A type of bug",
          "A continuous cycle that updates and redraws the game repeatedly",
          "A list of games",
          "A scoring system",
        ],
        question: "What is a 'game loop'?",
        explanation:
          "The game loop runs continuously (30-60 times/sec), updating positions and redrawing.",
        correctIndex: 1,
      },
      {
        options: [
          "Detects bugs",
          "Checks if game objects are overlapping or touching",
          "Counts the score",
          "Moves the player",
        ],
        question: "What does 'collision detection' do?",
        explanation:
          "Collision detection checks whether two objects are in the same space.",
        correctIndex: 1,
      },
      {
        options: ["A string", "A list", "An integer variable", "A boolean"],
        question: "In a game, score is typically stored as:",
        explanation:
          "Score is a whole number — an integer variable that increases as the player earns points.",
        correctIndex: 2,
      },
      {
        options: [
          "The score doubles",
          "The game ends and shows a game over screen",
          "The player gains more lives",
          "The game speeds up",
        ],
        question: "What happens in 'game over' when lives reach 0?",
        explanation:
          "When lives reach 0, the game ends. A game over screen is shown with final score.",
        correctIndex: 1,
      },
      {
        options: ["Assembly language", "Machine code", "Scratch", "C++"],
        question: "Which tool is designed for beginners to create games?",
        explanation:
          "Scratch uses visual code blocks and is specifically designed for beginner game-making.",
        correctIndex: 2,
      },
      {
        options: [
          "Deleting objects",
          "Drawing all game elements on screen",
          "Detecting collisions",
          "Updating scores",
        ],
        question: "What does 'rendering' mean in game programming?",
        explanation:
          "Rendering means drawing/displaying all game elements on the screen.",
        correctIndex: 1,
      },
      {
        options: [
          "Giving the player more lives",
          "Making enemies slower",
          "Increasing speed or adding obstacles",
          "Making the screen smaller",
        ],
        question: "How is game difficulty usually increased?",
        explanation:
          "Games typically increase difficulty by increasing speed, adding more/faster enemies.",
        correctIndex: 2,
      },
      {
        options: ["score", "level", "lives", "points"],
        question:
          "What variable stores the number of chances a player has left?",
        explanation:
          "The 'lives' variable tracks remaining chances. When it reaches 0, the game ends.",
        correctIndex: 2,
      },
      {
        options: [
          "A variable",
          "A function",
          "A game loop that runs continuously",
          "A one-time event",
        ],
        question: "In Scratch, what does the 'forever' block create?",
        explanation:
          "Scratch's 'forever' block creates an infinite loop — the core of most Scratch game loops.",
        correctIndex: 2,
      },
      {
        options: [
          "A type of background",
          "A character or object in the game",
          "A sound effect",
          "A variable",
        ],
        question: "A 'sprite' in Scratch is:",
        explanation:
          "In Scratch, sprites are the characters and objects that can be programmed to move and react.",
        correctIndex: 1,
      },
    ],
    "10": [
      {
        options: [
          "HyperText Markup Language",
          "High Text Making Language",
          "Hyper Transfer Mark Language",
          "Home Tool Markup Language",
        ],
        question: "What does HTML stand for?",
        explanation:
          "HTML = HyperText Markup Language. It structures webpage content.",
        correctIndex: 0,
      },
      {
        options: [
          "Computer Style Sheets",
          "Cascading Style Sheets",
          "Colourful Style Syntax",
          "Content Styling System",
        ],
        question: "What does CSS stand for?",
        explanation:
          "CSS = Cascading Style Sheets. It controls the appearance of HTML content.",
        correctIndex: 1,
      },
      {
        options: ["<h6>", "<heading>", "<h1>", "<title>"],
        question: "Which HTML tag creates the largest heading?",
        explanation:
          "<h1> creates the largest heading. h1-h6 go from largest to smallest.",
        correctIndex: 2,
      },
      {
        options: ["An image", "A heading", "A paragraph", "A hyperlink"],
        question: "What does the <a> tag create?",
        explanation: "The <a> (anchor) tag creates hyperlinks.",
        correctIndex: 3,
      },
      {
        options: [
          "The background colour",
          "The border colour",
          "The text colour",
          "The image colour",
        ],
        question: "In CSS, `color: red;` changes:",
        explanation: "The CSS 'color' property changes text colour.",
        correctIndex: 2,
      },
      {
        options: [
          "Inside the <body> tag",
          "In a <style> tag or separate .css file",
          "Inside the text content",
          "In the HTML comments",
        ],
        question: "Where do you write CSS?",
        explanation:
          "CSS is written in a <style> tag in the HTML head, or in a separate .css file.",
        correctIndex: 1,
      },
      {
        options: [
          "src and href",
          "src and alt",
          "href and class",
          "id and title",
        ],
        question: "The <img> tag requires which attributes?",
        explanation:
          "The <img> tag needs src (image path) and alt (text description for accessibility).",
        correctIndex: 1,
      },
      {
        options: ["<ol>", "<li>", "<ul>", "<dl>"],
        question: "Which HTML element is used for an unordered (bullet) list?",
        explanation:
          "<ul> creates an unordered list. <ol> creates an ordered list. <li> creates list items.",
        correctIndex: 2,
      },
      {
        options: [
          "The website loads fast",
          "The website looks good on all screen sizes",
          "The website has no bugs",
          "The website uses animations",
        ],
        question: "What does 'responsive design' mean?",
        explanation:
          "Responsive design ensures a website adapts its layout for different screen sizes.",
        correctIndex: 1,
      },
      {
        options: [
          "Converts it to Python",
          "Renders it as a visual webpage",
          "Sends it to a database",
          "Deletes it",
        ],
        question: "The browser reads HTML and:",
        explanation:
          "The browser parses HTML/CSS and renders the visual webpage that users see.",
        correctIndex: 1,
      },
    ],
  },
  "Art & Creativity": {
    "1": [
      {
        options: [
          "Red, Green, Blue",
          "Red, Yellow, Blue",
          "Orange, Green, Violet",
          "Red, Pink, Blue",
        ],
        question: "Which are the three primary colours?",
        explanation:
          "In traditional colour theory, primary colours are Red, Yellow, and Blue.",
        correctIndex: 1,
      },
      {
        options: ["Green", "Purple", "Orange", "Brown"],
        question: "What colour do you get by mixing red and yellow?",
        explanation: "Red + Yellow = Orange, a secondary colour.",
        correctIndex: 2,
      },
      {
        options: [
          "A colour mixed with black",
          "A colour mixed with grey",
          "A colour mixed with white",
          "A colour mixed with yellow",
        ],
        question: "A 'tint' is:",
        explanation:
          "Adding white to a colour creates a tint — a lighter version of the hue.",
        correctIndex: 2,
      },
      {
        options: [
          "Blue, green, violet",
          "Red, orange, yellow",
          "Black, white, grey",
          "Purple, teal, cyan",
        ],
        question: "Which colours are 'warm colours'?",
        explanation:
          "Warm colours (red, orange, yellow) are associated with energy and warmth.",
        correctIndex: 1,
      },
      {
        options: ["Orange", "Purple", "Brown", "Green"],
        question: "What do you get when you mix blue and yellow?",
        explanation: "Blue + Yellow = Green, a secondary colour.",
        correctIndex: 3,
      },
      {
        options: ["White", "Grey", "Water", "Black"],
        question: "A 'shade' is created by adding __ to a colour.",
        explanation:
          "Adding black to a colour creates a shade — a darker version of the hue.",
        correctIndex: 3,
      },
      {
        options: [
          "Colours next to each other on the colour wheel",
          "Colours directly opposite on the colour wheel",
          "Primary colours only",
          "Warm colours only",
        ],
        question: "Complementary colours are:",
        explanation:
          "Complementary colours sit opposite on the colour wheel and contrast strongly.",
        correctIndex: 1,
      },
      {
        options: [
          "White",
          "A bright secondary colour",
          "Brown or grey",
          "A primary colour",
        ],
        question: "What is the result of mixing all three primary colours?",
        explanation:
          "Mixing all three primaries in equal amounts produces brown or dark grey.",
        correctIndex: 2,
      },
      {
        options: [
          "Red, Yellow, Blue",
          "Red, Green, Blue (RGB)",
          "Cyan, Magenta, Yellow",
          "Orange, Purple, Green",
        ],
        question: "In digital screens, the primary colours are:",
        explanation:
          "Screens use RGB — additive colour mixing where all together makes white.",
        correctIndex: 1,
      },
      {
        options: [
          "Colours opposite on the colour wheel",
          "Colours adjacent to each other on the colour wheel",
          "Only secondary colours",
          "Black and white",
        ],
        question: "Analogous colours are:",
        explanation:
          "Analogous colours are next to each other on the wheel — they create harmony.",
        correctIndex: 1,
      },
    ],
    "2": [
      {
        options: ["Picasso", "Van Gogh", "Leonardo da Vinci", "Monet"],
        question: "Who painted the Mona Lisa?",
        explanation:
          "Leonardo da Vinci painted the Mona Lisa (1503-19). It's in the Louvre, Paris.",
        correctIndex: 2,
      },
      {
        options: ["Cubism", "Impressionism", "Post-Impressionism", "Realism"],
        question: "Van Gogh's 'The Starry Night' style is:",
        explanation:
          "Van Gogh was a Post-Impressionist — using unique swirling brushstrokes to express emotion.",
        correctIndex: 2,
      },
      {
        options: ["Impressionism", "Surrealism", "Cubism", "Baroque"],
        question: "Pablo Picasso is associated with which movement?",
        explanation:
          "Picasso co-founded Cubism — breaking subjects into geometric shapes.",
        correctIndex: 2,
      },
      {
        options: ["Renaissance", "Cubism", "Impressionism", "Expressionism"],
        question: "Claude Monet and the Water Lilies are associated with:",
        explanation:
          "Monet was a leader of Impressionism — capturing light, atmosphere, and colour effects.",
        correctIndex: 2,
      },
      {
        options: [
          "Landscapes",
          "Self-portraits exploring identity and culture",
          "Abstract geometric paintings",
          "Sculptures only",
        ],
        question: "Frida Kahlo was known for:",
        explanation:
          "Kahlo painted mostly self-portraits exploring her Mexican identity and personal experiences.",
        correctIndex: 1,
      },
      {
        options: ["China", "England", "Italy", "Egypt"],
        question: "The Renaissance began in:",
        explanation:
          "The Renaissance (14th-17th century) began in Italy, celebrating humanism and classical art.",
        correctIndex: 2,
      },
      {
        options: [
          "A critic mocking Monet's painting 'Impression, Sunrise'",
          "An exhibition title",
          "The style of drawing impressions",
          "A famous museum",
        ],
        question: "Impressionism got its name from:",
        explanation:
          "The term came from a mocking review of Monet's 'Impression, Sunrise' — but artists embraced it!",
        correctIndex: 0,
      },
      {
        options: [
          "Painting Sunflowers",
          "The ceiling of the Sistine Chapel",
          "The Mona Lisa",
          "Cubism",
        ],
        question: "Michelangelo is famous for:",
        explanation:
          "Michelangelo painted the Sistine Chapel ceiling (1508-12) — featuring 'Creation of Adam'.",
        correctIndex: 1,
      },
      {
        options: ["Impressionism", "Realism", "Cubism", "Surrealism"],
        question: "Salvador Dali is associated with:",
        explanation:
          "Dali was a leading Surrealist — his paintings explored dreams and the unconscious mind.",
        correctIndex: 3,
      },
      {
        options: [
          "A painting of a landscape",
          "A painting of a still life",
          "A painting of a person",
          "An abstract painting",
        ],
        question: "What is a 'portrait'?",
        explanation:
          "A portrait is a representation of a person, usually focusing on the face.",
        correctIndex: 2,
      },
    ],
    "3": [
      {
        options: [
          "The cost of art supplies",
          "The range of lights and darks in a drawing",
          "The colours used",
          "The size of the artwork",
        ],
        question: "What is 'value' in drawing?",
        explanation:
          "Value refers to the lightness or darkness of tones — from white through grey to black.",
        correctIndex: 1,
      },
      {
        options: ["Stippling", "Blending", "Hatching", "Cross-hatching"],
        question:
          "Which shading technique uses overlapping sets of parallel lines?",
        explanation:
          "Cross-hatching uses intersecting sets of parallel lines — more layers = darker areas.",
        correctIndex: 3,
      },
      {
        options: [
          "Start with fine details",
          "Break it down into basic shapes",
          "Use the darkest colour first",
          "Copy exactly from a photo",
        ],
        question: "First step when drawing a complex object?",
        explanation:
          "Breaking complex objects into basic shapes makes them much easier to draw.",
        correctIndex: 1,
      },
      {
        options: [
          "Using bright colours",
          "Getting the relative sizes of different parts correct",
          "Drawing very quickly",
          "Tracing an image",
        ],
        question: "'Proportion' in drawing means:",
        explanation:
          "Proportion ensures parts are the correct size relative to each other.",
        correctIndex: 1,
      },
      {
        options: [
          "Long lines",
          "Smooth blending",
          "Tiny dots",
          "Geometric shapes",
        ],
        question: "Stippling creates tone using:",
        explanation:
          "Stippling places tiny dots — more dots = darker areas; fewer dots = lighter areas.",
        correctIndex: 2,
      },
      {
        options: [
          "Drawing shadows only",
          "Drawing the outline or edge of a form without lifting the pen",
          "Drawing from memory",
          "Using only straight lines",
        ],
        question: "What does 'contour drawing' mean?",
        explanation:
          "Contour drawing traces the edges of a form slowly and carefully.",
        correctIndex: 1,
      },
      {
        options: ["HB pencil", "2H pencil", "6B pencil", "Coloured pencil"],
        question: "Which drawing tool creates the darkest marks?",
        explanation:
          "6B pencils are very soft and dark. H pencils are hard and light.",
        correctIndex: 2,
      },
      {
        options: [
          "A landscape",
          "A portrait of a person",
          "Arranged objects (fruit, vases, books)",
          "An imaginary scene",
        ],
        question: "A 'still life' drawing shows:",
        explanation:
          "A still life is a drawing of inanimate objects carefully arranged — great for observation.",
        correctIndex: 2,
      },
      {
        options: [
          "The paper beyond the edges",
          "The background or empty space around and between subjects",
          "The darkest shadows",
          "The outline of an object",
        ],
        question: "Negative space in drawing refers to:",
        explanation:
          "Negative space is the empty space around and between subjects.",
        correctIndex: 1,
      },
      {
        options: [
          "Use only one colour",
          "Only draw outlines",
          "Add shading to show where light falls and where shadows are",
          "Use a ruler for all lines",
        ],
        question: "To make an object look 3D in a drawing, you should:",
        explanation:
          "Shading creates the illusion of 3D form — darker where light doesn't reach.",
        correctIndex: 2,
      },
    ],
    "4": [
      {
        options: [
          "It uses more colours",
          "It is three-dimensional (height, width, and depth)",
          "It is always made of stone",
          "It takes longer to make",
        ],
        question: "What makes sculpture different from painting?",
        explanation:
          "Sculpture is 3D — it occupies physical space and can be viewed from multiple angles.",
        correctIndex: 1,
      },
      {
        options: [
          "Removing material",
          "Assembling pieces together",
          "Building up material by adding more",
          "Casting in a mould",
        ],
        question: "'Additive' sculpture involves:",
        explanation:
          "Additive sculpture builds form by adding material — like building up clay.",
        correctIndex: 2,
      },
      {
        options: ["Bronze", "Wood", "Marble", "Clay"],
        question: "Michelangelo's David is carved from:",
        explanation:
          "Michelangelo carved David from a single block of white Carrara marble (1501-1504).",
        correctIndex: 2,
      },
      {
        options: [
          "Throwing clay",
          "Pouring liquid material into a mould to create a shape",
          "Carving stone",
          "Painting a surface",
        ],
        question: "What is 'casting' in sculpture?",
        explanation:
          "Casting involves pouring molten metal or liquid plaster into a shaped mould.",
        correctIndex: 1,
      },
      {
        options: [
          "Adding clay",
          "Assembling objects",
          "Removing material from a block (carving)",
          "Painting over a surface",
        ],
        question: "'Subtractive' sculpture involves:",
        explanation:
          "Subtractive sculpture carves away material — like chipping stone or cutting wood.",
        correctIndex: 2,
      },
      {
        options: [
          "A completely 3D free-standing sculpture",
          "A design raised or carved into a flat background surface",
          "A sculpture made of found objects",
          "A type of mobile",
        ],
        question: "What is a 'relief' sculpture?",
        explanation:
          "Relief sculpture has a design raised from or sunk into a flat surface — like a coin.",
        correctIndex: 1,
      },
      {
        options: [
          "Metal and wire",
          "Strips of paper and paste to build up a shape",
          "Stone chips",
          "Liquid plaster only",
        ],
        question: "Papier-mache uses:",
        explanation:
          "Papier-mache uses torn paper strips soaked in paste, layered to build shapes.",
        correctIndex: 1,
      },
      {
        options: ["Stone", "Wood", "Clay", "Bronze"],
        question: "Auguste Rodin's 'The Thinker' is made of:",
        explanation:
          "Rodin's The Thinker is a bronze casting — originally made in clay, then cast in bronze.",
        correctIndex: 3,
      },
      {
        options: [
          "A sculpture you can move with a remote control",
          "A hanging sculpture with balanced parts that move with air currents",
          "A portable painting",
          "A digital sculpture",
        ],
        question: "What is a 'mobile' sculpture?",
        explanation:
          "A mobile is a kinetic sculpture — hanging elements balanced on wires that move in air currents.",
        correctIndex: 1,
      },
      {
        options: [
          "Cutting the clay with scissors",
          "Scratching surfaces and applying liquid clay to join clay pieces",
          "Smoothing with water",
          "Painting the clay before firing",
        ],
        question: "When working with clay, 'score and slip' means:",
        explanation:
          "Score (scratch) both surfaces, apply slip (liquid clay), then press together for a strong bond.",
        correctIndex: 1,
      },
    ],
    "5": [
      {
        options: [
          "Where the horizon begins",
          "The point where parallel lines appear to converge in the distance",
          "A painting technique",
          "The darkest point in a drawing",
        ],
        question: "What is a 'vanishing point'?",
        explanation:
          "A vanishing point is where parallel lines seem to meet in the distance.",
        correctIndex: 1,
      },
      {
        options: ["0", "1", "2", "3"],
        question:
          "In one-point perspective, how many vanishing points are used?",
        explanation:
          "One-point perspective uses a single vanishing point on the horizon line.",
        correctIndex: 1,
      },
      {
        options: [
          "The edge of the paper",
          "The eye level of the viewer",
          "The centre of the artwork",
          "The ground level",
        ],
        question: "The horizon line in perspective drawing represents:",
        explanation: "The horizon line is the viewer's eye level.",
        correctIndex: 1,
      },
      {
        options: [
          "Larger and more colourful",
          "Smaller, lighter, less detailed, and cooler in colour",
          "Darker and more detailed",
          "Exactly the same as near objects",
        ],
        question: "Atmospheric perspective shows distant objects as:",
        explanation:
          "Atmospheric perspective: distant objects appear lighter and less distinct due to haze.",
        correctIndex: 1,
      },
      {
        options: [
          "Colour harmony",
          "The illusion that one object is in front of another",
          "A flat appearance",
          "Balanced composition",
        ],
        question: "Overlapping in art creates:",
        explanation:
          "When one object overlaps another, it appears to be in front, creating spatial depth.",
        correctIndex: 1,
      },
      {
        options: [
          "Leonardo da Vinci",
          "Filippo Brunelleschi",
          "Monet",
          "Picasso",
        ],
        question: "Who is credited with codifying the rules of perspective?",
        explanation:
          "Filippo Brunelleschi is credited with developing linear perspective in 15th century Florence.",
        correctIndex: 1,
      },
      {
        options: [
          "Drawing a scene from straight ahead",
          "Drawing the corner of a building or object",
          "Drawing a portrait",
          "Drawing a flat pattern",
        ],
        question: "Two-point perspective is used when:",
        explanation:
          "Two-point perspective uses two vanishing points — ideal for corners of buildings.",
        correctIndex: 1,
      },
      {
        options: [
          "Smaller and lighter",
          "Larger, darker, and more detailed",
          "Further from the viewer",
          "At the horizon line",
        ],
        question: "In a perspective drawing, objects in the foreground appear:",
        explanation:
          "Foreground objects appear largest, most detailed, and most colourful.",
        correctIndex: 1,
      },
      {
        options: [
          "Drawing very small objects",
          "Making an object appear shorter because it is pointing toward the viewer",
          "Drawing from memory",
          "Using warm colours only",
        ],
        question: "'Foreshortening' means:",
        explanation:
          "Foreshortening distorts an object pointing toward the viewer — it appears compressed.",
        correctIndex: 1,
      },
      {
        options: [
          "To make paintings smaller",
          "To make paintings more affordable",
          "To create realistic illusions of 3D space on a 2D surface",
          "To copy ancient Greek art",
        ],
        question: "Why did Renaissance artists use perspective?",
        explanation:
          "Perspective allowed artists to paint realistic-looking three-dimensional spaces.",
        correctIndex: 2,
      },
    ],
    "6": [
      {
        options: [
          "It only comes in blue",
          "It is transparent — the paper provides the white highlights",
          "It cannot be mixed with other colours",
          "It always dries quickly",
        ],
        question: "Why is watercolour different from other paints?",
        explanation:
          "Watercolour is transparent — the paper shows through layers, creating luminosity.",
        correctIndex: 1,
      },
      {
        options: [
          "Painting on dry paper",
          "Painting wet paint onto already-wet paper for soft blended effects",
          "Mixing two dry pigments",
          "Using a hairdryer on the paint",
        ],
        question: "The 'wet-on-wet' technique involves:",
        explanation:
          "Wet-on-wet creates soft, flowing effects as paint spreads in the wet surface.",
        correctIndex: 1,
      },
      {
        options: [
          "Soft, blended edges",
          "Crisp, sharp edges",
          "Unpredictable patterns",
          "Watercolour doesn't work on dry paper",
        ],
        question: "'Wet-on-dry' technique creates:",
        explanation:
          "Wet-on-dry means applying wet paint to a dry surface — creating controlled, sharp edges.",
        correctIndex: 1,
      },
      {
        options: [
          "Add white paint",
          "Add more water",
          "Leave the white paper unpainted",
          "Use bleach",
        ],
        question: "How do you create highlights in watercolour?",
        explanation:
          "Watercolour highlights are created by leaving the white paper unpainted.",
        correctIndex: 2,
      },
      {
        options: [
          "A varnish applied at the end",
          "A transparent layer applied over dried paint to deepen colour",
          "Mixing paint on the palette",
          "A type of brush",
        ],
        question: "What is a 'glaze' in watercolour?",
        explanation:
          "Glazing means applying a thin, transparent layer over dry paint to modify colour.",
        correctIndex: 1,
      },
      {
        options: [
          "The paint turns black",
          "The paint brightens",
          "The salt absorbs pigment leaving interesting patterns",
          "The paper tears",
        ],
        question: "What happens when you sprinkle salt on wet watercolour?",
        explanation:
          "Salt absorbs the wet pigment around it, leaving lighter patterned areas.",
        correctIndex: 2,
      },
      {
        options: [
          "Regular printer paper",
          "Thick watercolour paper (300gsm cold-pressed)",
          "Greaseproof paper",
          "Newspaper",
        ],
        question: "Which paper is best for watercolour?",
        explanation: "Thick watercolour paper (300gsm+) doesn't warp when wet.",
        correctIndex: 1,
      },
      {
        options: [
          "Picking up the paper",
          "Removing wet paint with a dry brush or tissue to reveal lighter areas",
          "Adding more water",
          "Painting very quickly",
        ],
        question: "What does 'lifting' mean in watercolour?",
        explanation:
          "Lifting removes wet paint to create highlights — using a dry brush, tissue, or sponge.",
        correctIndex: 1,
      },
      {
        options: [
          "Recede into the background",
          "Advance and appear closer to the viewer",
          "Have no effect on space",
          "Mix with cool colours to become grey",
        ],
        question: "Warm colours in watercolour tend to:",
        explanation:
          "Warm colours visually advance — they appear to come forward.",
        correctIndex: 1,
      },
      {
        options: [
          "Cleaning the brush",
          "Wetting the paper first",
          "A thin, even layer of diluted colour applied over a large area",
          "Using two colours at once",
        ],
        question: "A 'wash' in watercolour means:",
        explanation:
          "A wash is a broad, even coat of diluted watercolour — used for backgrounds and skies.",
        correctIndex: 2,
      },
    ],
    "7": [
      {
        options: [
          "Art that looks exactly like a photograph",
          "Art using shapes and colours to express ideas rather than depicting reality",
          "Art made only with squares",
          "Art that is always very small",
        ],
        question: "What is abstract art?",
        explanation:
          "Abstract art departs from realistic depiction, using visual elements to express emotion.",
        correctIndex: 1,
      },
      {
        options: [
          "Impressionism",
          "Realism",
          "Abstract Expressionism",
          "Cubism",
        ],
        question: "Jackson Pollock's dripping paint technique is part of:",
        explanation:
          "Pollock was a leading Abstract Expressionist — he dripped paint to create dynamic, emotional works.",
        correctIndex: 2,
      },
      {
        options: [
          "Free-flowing curved lines",
          "Only vertical and horizontal lines with primary colours",
          "Realistic landscapes",
          "Portraits",
        ],
        question: "Piet Mondrian's abstract art uses:",
        explanation:
          "Mondrian reduced art to: vertical and horizontal black lines filled with primary colours.",
        correctIndex: 1,
      },
      {
        options: [
          "What is wrong with it?",
          "Who could draw this better?",
          "How does this make me feel?",
          "Why doesn't it look real?",
        ],
        question: "What question is most relevant when viewing abstract art?",
        explanation:
          "Abstract art invites emotional response — 'How does this make me feel?' is the right question.",
        correctIndex: 2,
      },
      {
        options: [
          "15th century Renaissance",
          "18th century",
          "Early 20th century",
          "Ancient times",
        ],
        question: "When did abstract art primarily emerge?",
        explanation: "Abstract art emerged in the early 20th century.",
        correctIndex: 2,
      },
      {
        options: [
          "Complex human figures",
          "Simple geometric blocks of colour",
          "Abstract landscapes",
          "Dripped paint",
        ],
        question: "Mark Rothko painted:",
        explanation:
          "Rothko's famous 'Color Field' paintings feature large blurred rectangles designed to evoke emotions.",
        correctIndex: 1,
      },
      {
        options: ["Mondrian", "Rothko", "Pollock", "Warhol"],
        question: "Which artist is famous for 'action painting'?",
        explanation:
          "Jackson Pollock is famous for action painting — dripping and pouring paint onto canvas on the floor.",
        correctIndex: 2,
      },
      {
        options: [
          "Only professional oil paints",
          "Only expensive materials",
          "Any medium — paint, collage, digital, clay",
          "Only black and white",
        ],
        question: "Abstract art can be created using:",
        explanation:
          "Abstract art can use any medium — concept and expression matter more than materials.",
        correctIndex: 2,
      },
      {
        options: [
          "Art representing reality accurately",
          "Art that does not attempt to represent real-world objects",
          "Art representing ideas only",
          "Art made by computers",
        ],
        question: "'Non-representational' art means:",
        explanation:
          "Non-representational art has no reference to real-world objects — pure shapes and forms.",
        correctIndex: 1,
      },
      {
        options: [
          "It is always ugly",
          "There is no obvious subject, requiring personal interpretation",
          "It requires special training",
          "Abstract art is forbidden in schools",
        ],
        question: "Why do some people find abstract art difficult?",
        explanation:
          "Without a recognisable subject, abstract art requires viewers to interpret meaning personally.",
        correctIndex: 1,
      },
    ],
    "8": [
      {
        options: [
          "A type of brush",
          "The smallest unit of a digital image — a tiny coloured square",
          "A type of tablet",
          "A digital painting technique",
        ],
        question: "What is a 'pixel'?",
        explanation:
          "Pixels (picture elements) are the tiny coloured squares that make up a digital image.",
        correctIndex: 1,
      },
      {
        options: [
          "A blurrier image",
          "A darker image",
          "A sharper image with more pixels",
          "A smaller file size",
        ],
        question: "Higher resolution means:",
        explanation:
          "Higher resolution (more pixels per inch) means more detail and a sharper image.",
        correctIndex: 2,
      },
      {
        options: [
          "A type of filter",
          "A separate, transparent surface where you can draw without affecting other layers",
          "A colour palette",
          "A type of brush",
        ],
        question: "What is a 'layer' in digital art software?",
        explanation:
          "Layers work like transparent sheets stacked on top — you can edit each independently.",
        correctIndex: 1,
      },
      {
        options: ["Microsoft Word", "Excel", "Procreate", "PowerPoint"],
        question: "Which software is popular for digital painting on tablets?",
        explanation:
          "Procreate is a powerful digital painting app for iPad with Apple Pencil.",
        correctIndex: 2,
      },
      {
        options: [
          "2D drawings",
          "Three-dimensional digital objects and environments",
          "Photo filters",
          "Text effects",
        ],
        question: "3D modelling software creates:",
        explanation:
          "3D modelling software (like Blender) creates 3D models that can be rotated and rendered.",
        correctIndex: 1,
      },
      {
        options: [
          "Taking photographs",
          "Printing photographs",
          "Digitally editing and altering photographs using software",
          "Developing film photographs",
        ],
        question: "What is 'photo manipulation'?",
        explanation:
          "Photo manipulation uses software to edit, composite, and transform photographs.",
        correctIndex: 2,
      },
      {
        options: [
          "It saves storage",
          "It makes colours brighter",
          "It reverses mistakes instantly — artists can experiment freely",
          "It increases resolution",
        ],
        question: "Why is the 'undo' function useful in digital art?",
        explanation:
          "The undo function removes the fear of mistakes — artists can experiment and correct errors.",
        correctIndex: 2,
      },
      {
        options: [
          "Traditional brushes",
          "Mathematical algorithms and code",
          "Only AI",
          "Photography",
        ],
        question: "Generative art is created using:",
        explanation:
          "Generative art uses code and algorithms to automatically create visual output.",
        correctIndex: 1,
      },
      {
        options: [
          "JPEG (highly compressed)",
          "GIF (low colour)",
          "TIFF or PNG (lossless, high quality)",
          "BMP (very large)",
        ],
        question:
          "When preparing digital art for high-quality print, best format?",
        explanation:
          "TIFF and PNG are lossless formats — ideal for printing where quality must be preserved.",
        correctIndex: 2,
      },
      {
        options: [
          "A non-fictional text",
          "A physical sculpture",
          "A unique digital certificate of ownership for digital artworks",
          "A type of software",
        ],
        question: "NFT in digital art refers to:",
        explanation:
          "NFTs are blockchain-based certificates proving ownership of unique digital artworks.",
        correctIndex: 2,
      },
    ],
    "9": [
      {
        options: [
          "Painting with thick brushstrokes",
          "Assembling cut or torn materials glued onto a surface",
          "Drawing with charcoal",
          "Sculpting with clay",
        ],
        question: "What does 'collage' mean in art?",
        explanation:
          "Collage assembles different materials glued onto a surface.",
        correctIndex: 1,
      },
      {
        options: [
          "Monet and Renoir",
          "Picasso and Braque",
          "da Vinci and Michelangelo",
          "Kahlo and Warhol",
        ],
        question: "Who pioneered collage in fine art?",
        explanation:
          "Picasso and Braque introduced collage to fine art around 1912 as part of Cubism.",
        correctIndex: 1,
      },
      {
        options: [
          "Only one type of material",
          "Two or more different art materials or techniques combined",
          "Only digital tools",
          "Only natural materials",
        ],
        question: "'Mixed media' artwork uses:",
        explanation:
          "Mixed media combines multiple materials and techniques in one artwork.",
        correctIndex: 1,
      },
      {
        options: ["To cut", "To paint", "To glue", "To create"],
        question: "The French word 'coller' means:",
        explanation:
          "Collage comes from the French 'coller', meaning 'to glue'.",
        correctIndex: 2,
      },
      {
        options: [
          "A pencil sketch",
          "A watercolour painting",
          "A sculpture with fabric and found objects combined",
          "A photograph",
        ],
        question: "Which is a mixed media artwork?",
        explanation:
          "A sculpture incorporating fabric and found objects combines multiple media — mixed media art.",
        correctIndex: 2,
      },
      {
        options: [
          "Using only smooth paper",
          "Using only one colour",
          "Incorporating different materials with varied surface qualities",
          "Making everything flat",
        ],
        question: "Texture in collage is created by:",
        explanation:
          "Different materials (rough fabric, shiny foil, smooth paper) create varied textures.",
        correctIndex: 2,
      },
      {
        options: [
          "Drawing a photo from memory",
          "Collage using photographs or parts of photographs",
          "Taking very large photographs",
          "Painting over a photograph",
        ],
        question: "What is 'photomontage'?",
        explanation:
          "Photomontage is collage using cut and arranged photographs.",
        correctIndex: 1,
      },
      {
        options: [
          "Abstract painting",
          "Traditional portraiture",
          "Collage using popular imagery and silk-screen printing",
          "Watercolour landscapes",
        ],
        question: "Andy Warhol's pop art often involved:",
        explanation:
          "Warhol's Pop Art used silk-screen printing and popular culture imagery.",
        correctIndex: 2,
      },
      {
        options: [
          "Using only big pieces",
          "Arranging elements so some stand out more, guiding the viewer's eye",
          "Making everything the same size",
          "Using only primary colours",
        ],
        question: "'Visual hierarchy' in a collage means:",
        explanation:
          "Visual hierarchy guides the viewer's eye — larger or brighter elements attract attention first.",
        correctIndex: 1,
      },
      {
        options: [
          "Only paper and glue",
          "Found natural materials (leaves, stones, bark) arranged on location",
          "Digital software only",
          "Professional art materials only",
        ],
        question: "Environmental collage artist uses:",
        explanation:
          "Environmental artists like Andy Goldsworthy create art using natural found materials.",
        correctIndex: 1,
      },
    ],
    "10": [
      {
        options: [
          "Give your opinion immediately",
          "Describe what you literally see without interpreting",
          "Explain the artist's life",
          "Research the artwork's price",
        ],
        question: "What is the first step in art critique?",
        explanation:
          "Description comes first — observe and list what you literally see.",
        correctIndex: 1,
      },
      {
        options: [
          "Being able to read quickly",
          "The ability to interpret, understand, and communicate through visual information",
          "Drawing perfectly",
          "Having good eyesight",
        ],
        question: "'Visual literacy' means:",
        explanation:
          "Visual literacy is the ability to decode and make meaning from images.",
        correctIndex: 1,
      },
      {
        options: [
          "The artist's childhood",
          "The artwork's price at auction",
          "Colour, line, shape, texture, and value",
          "Whether you like it or not",
        ],
        question:
          "When discussing the 'elements' of an artwork, you might describe:",
        explanation:
          "The formal elements of art are the building blocks — colour, line, shape, form, texture, value.",
        correctIndex: 2,
      },
      {
        options: [
          "I love this painting",
          "It's about sadness",
          "The painting uses bold red and blue shapes arranged diagonally on a white background",
          "The artist was very talented",
        ],
        question: "Which is the best DESCRIPTIVE observation?",
        explanation:
          "A descriptive observation lists what is literally visible — colours, shapes, composition.",
        correctIndex: 2,
      },
      {
        options: [
          "The materials used",
          "The way elements are arranged in an artwork",
          "The artist's signature",
          "The size of the canvas",
        ],
        question: "What does 'composition' mean in art?",
        explanation:
          "Composition is how elements are arranged and organised within the artwork's space.",
        correctIndex: 1,
      },
      {
        options: [
          "Using only similar colours",
          "Creating visual interest through strong differences (light/dark, large/small)",
          "Painting very quietly",
          "Using one colour throughout",
        ],
        question: "The principle of 'contrast' in art means:",
        explanation:
          "Contrast creates visual interest through strong differences.",
        correctIndex: 1,
      },
      {
        options: [
          "Making everything equal",
          "Using very thick paint",
          "Drawing attention to a focal point or area of importance",
          "Avoiding the use of colour",
        ],
        question: "'Emphasis' in art means:",
        explanation:
          "Emphasis directs the viewer's eye to the most important element.",
        correctIndex: 2,
      },
      {
        options: [
          "How much did it cost?",
          "What message or emotion might the artist be conveying?",
          "Is this art good or bad?",
          "Why didn't the artist paint better?",
        ],
        question:
          "Which question is most appropriate when INTERPRETING an artwork?",
        explanation:
          "Interpretation asks what meaning or emotion the artwork conveys.",
        correctIndex: 1,
      },
      {
        options: [
          "Always agree with experts",
          "Give only positive feedback",
          "Form an evidence-based opinion and explain your reasoning",
          "Say you love everything",
        ],
        question: "When you evaluate an artwork, you should:",
        explanation:
          "Evaluation means forming a reasoned opinion, supported by evidence from the artwork.",
        correctIndex: 2,
      },
      {
        options: [
          "Only to memorise names and dates",
          "To understand how art reflects the culture and times in which it was made",
          "Because it is required by law",
          "Art history is not important",
        ],
        question: "Why is studying art history important?",
        explanation:
          "Art history shows how visual culture reflects society, politics, and ideas.",
        correctIndex: 1,
      },
    ],
  },
};

const courses: Array<{
  title: string;
  description: string;
  subject: string;
  gradeLevel: string;
  thumbnail: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  lessons: Array<{
    title: string;
    order: number;
    durationMinutes: number;
    content: string;
  }>;
}> = [
  {
    title: "Math Adventures",
    description:
      "Explore the exciting world of mathematics with fun puzzles and interactive experiments!",
    subject: "math",
    gradeLevel: "Grade 3-5",
    thumbnail: "🧮",
    difficulty: "beginner",
    lessons: [
      {
        title: "Introduction to Addition",
        order: 1,
        durationMinutes: 10,
        content:
          'Addition means putting things together. 🤝\n\nYou already use addition every day! Look around you. 🌟\n\n**Example:**\nRohan has 2 candies 🍬🍬\nHis friend gives him 1 more candy 🍬\nNow count all candies together: 1... 2... 3!\n\nSo: **2 + 1 = 3** 🎉\n\n**Let\'s try another one!**\nThere are 3 birds on a tree 🐦🐦🐦\n2 more birds come 🐦🐦\nNow there are 5 birds! 🌳\n\n**3 + 2 = 5**\n\nAddition helps us:\n- Count toys\n- Count chocolates\n- Count balloons\n- Count friends\n\n**Quick Tip 💡**\nThe "+" sign means add together.\n\n**Fun Time! 🚀**\nCan you count?\n🍎🍎 + 🍎 = ?\n🐶🐶 + 🐶🐶 = ?\n\nYou are becoming a math star! 🌟',
      },
      {
        title: "Subtraction Safari",
        order: 2,
        durationMinutes: 10,
        content:
          'Subtraction means taking away things. ➖\n\nImagine you have 5 candies 🍬🍬🍬🍬🍬\n\nYou give 2 candies to your friend.\nNow count how many are left:\n\n**5 - 2 = 3** 🎉\n\n**Subtraction helps us:**\n- Find how many are left\n- Share things\n- Count remaining objects\n\n**Example:**\nThere are 4 birds 🐦🐦🐦🐦\n1 bird flies away 🕊️\nNow: **4 - 1 = 3**\n\n**Think of it like a safari!** 🦁\nWhen animals leave the group, we subtract to find how many remain.\n\n**Quick Tip 💡**\nThe "−" sign means take away.\n\n**Try it yourself!**\nYou have 6 apples 🍎🍎🍎🍎🍎🍎\nYou eat 2 of them.\nHow many are left?\n\nGreat job! 🎉',
      },
      {
        title: "Multiplication Magic",
        order: 3,
        durationMinutes: 12,
        content:
          'Multiplication means adding the same number again and again. ✨\n\n**Example:**\n2 baskets 🧺🧺\nEach basket has 3 apples 🍎🍎🍎\n\nSo: 3 + 3 = 6\nWe can also write: **2 × 3 = 6**\n\nMultiplication makes counting faster! 🚀\n\n**Another Example:**\n4 balloon groups 🎈🎈🎈🎈\nEach group has 2 balloons.\n\nTotal balloons: **4 × 2 = 8** 🎉\n\n**Why is multiplication helpful?**\n- Counting large groups quickly\n- Finding totals of equal groups\n- Building times tables\n\n**Quick Tip 💡**\nThe "×" sign means multiply (or groups of).\n\n**Times Table Starter:**\n- 2 × 1 = 2\n- 2 × 2 = 4\n- 2 × 3 = 6\n- 2 × 4 = 8\n- 2 × 5 = 10\n\nPractice your 2s, and the rest will follow! 🌟',
      },
      {
        title: "Division Discovery",
        order: 4,
        durationMinutes: 12,
        content:
          'Division means sharing equally. 🤝\n\nImagine you have 6 chocolates 🍫🍫🍫🍫🍫🍫\n\nYou want to share them with 2 friends.\nEach friend gets: 3 chocolates 🍫🍫🍫\n\nSo: **6 ÷ 2 = 3**\n\n**Division helps us:**\n- Share toys equally\n- Share food fairly\n- Make equal groups\n\n**Example:**\n8 cookies 🍪🍪🍪🍪🍪🍪🍪🍪\nShared among 4 kids 👦👧👦👧\nEach gets: **2 cookies** 🍪🍪\n\n**So: 8 ÷ 4 = 2** 🎉\n\n**Quick Tip 💡**\nThe "÷" sign means divide or share equally.\n\n**Remember:**\nDivision is the opposite of multiplication!\nIf 3 × 4 = 12, then 12 ÷ 4 = 3 ✨\n\n**Try it!**\n10 bananas 🍌 shared among 5 monkeys 🐒\nHow many does each monkey get?',
      },
      {
        title: "Fractions Fun",
        order: 5,
        durationMinutes: 15,
        content:
          "Fractions mean equal parts of something. 🍕\n\nImagine a pizza cut into 2 equal pieces.\nIf you eat 1 piece: you ate **1/2** of the pizza! 🍕\n\n**Example:**\nA chocolate bar 🍫 divided into 4 equal parts.\nIf you take 1 part: that is **1/4**.\n\n**Fractions are everywhere:**\n- Pizza slices 🍕\n- Cake pieces 🎂\n- Chocolate bars 🍫\n- Orange segments 🍊\n\n**Key Words:**\n**Numerator** — the top number (how many parts you have)\n**Denominator** — the bottom number (total equal parts)\n\nSo in 1/4: you have 1 out of 4 equal parts.\n\n**Fun Fact:**\n- Half means 1/2 🎉\n- Quarter means 1/4\n- Three quarters means 3/4\n\n**Quick Tip 💡**\nThe parts must be EQUAL for it to be a fraction!\n\n**Try it!**\nA cake is cut into 8 equal slices. 🎂\nYou eat 3 slices.\nWhat fraction did you eat?",
      },
      {
        title: "Decimals and Percentages",
        order: 6,
        durationMinutes: 12,
        content:
          'Decimals help us show small parts of numbers. 🔢\n\n**Example:**\n₹1 can be divided into 100 paise.\n50 paise = **0.50**\n\nDecimals use a dot (called the decimal point).\n\n**More Examples:**\n- 1.5 means 1 whole and half more\n- 2.25 means 2 wholes and a quarter more\n- 0.75 means three quarters\n\n**Place Value:**\n- The digits to the LEFT of the dot are whole numbers\n- The digits to the RIGHT are parts (tenths, hundredths...)\n\n**Percent means "out of 100"** 💯\n\n**Example:**\nIf you score 90 out of 100: that is **90%**.\n\n**Connecting them:**\n- 50% = 0.50 = 1/2\n- 25% = 0.25 = 1/4\n- 100% = 1.00 = the whole thing!\n\n**Real-World Examples:**\n- A shop gives 10% discount 🏷️\n- You drank 0.5 litres of water 💧\n- Your battery is at 75% 🔋\n\nGreat work math star! 🌟',
      },
      {
        title: "Geometry Shapes",
        order: 7,
        durationMinutes: 15,
        content:
          "Shapes are everywhere around us! 🔺⭕🟦\n\n**Common 2D Shapes:**\n- **Circle ⭕** — Like a ball, a coin, or the sun\n- **Square 🟦** — Like a window, a tile, all sides equal\n- **Triangle 🔺** — Like a pizza slice, has 3 sides\n- **Rectangle ▭** — Like a book or door, opposite sides equal\n\n**3D Shapes:**\n- **Cube** — Like a dice, 6 square faces\n- **Sphere** — Like a ball, perfectly round\n- **Cylinder** — Like a tin can, two circular ends\n- **Cone** — Like an ice cream cone, one circular base\n\n**Key Words:**\n**Sides** — the straight lines of a shape\n**Corners (Vertices)** — where two sides meet\n**Angles** — the space between two sides at a corner\n\n**Shapes help us:**\n- Draw and design things\n- Build structures\n- Understand the world around us\n\n**Fun Challenge! 👀**\nLook around your room.\n- Find something shaped like a rectangle\n- Find something shaped like a circle\n- Find something shaped like a cube\n\nCan you find all three? 🌟",
      },
      {
        title: "Patterns and Sequences",
        order: 8,
        durationMinutes: 10,
        content:
          "Patterns repeat again and again. 🔁\n\n**Example:**\n⭐ 🔵 ⭐ 🔵 ⭐ 🔵\nWhat comes next? ⭐\n\n**Number Patterns:**\n1, 2, 3, 4, 5...\nEach number grows by 1.\n\n**Measurement tells how big, long, heavy, or full something is.** 📏\n\nWe measure:\n- Height\n- Weight\n- Length\n\n**Example:**\nA pencil ✏️ can be 10 cm long.\n\n**Units of Measurement:**\n- Length: centimetres (cm), metres (m)\n- Weight: grams (g), kilograms (kg)\n- Volume: millilitres (ml), litres (L)\n\n**Patterns help us:**\n- Predict things\n- Solve puzzles\n- Learn counting\n\n**Fun Challenge! 🚀**\n2, 4, 6, 8, ?\nAnswer: **10** 🎉\n\n5, 10, 15, 20, ?\nAnswer: **25** 🌟",
      },
      {
        title: "Time and Measurement",
        order: 9,
        durationMinutes: 12,
        content:
          "Time tells us when things happen. ⏰\n\n**Reading a Clock:**\n- A clock has an hour hand (short) and a minute hand (long)\n- When the minute hand points to 12, it is exactly o'clock\n- **9 o'clock** — school starts 🏫\n- **3 o'clock** — school ends 🎒\n\n**Key Time Facts:**\n- 60 seconds = 1 minute ⏱️\n- 60 minutes = 1 hour 🕐\n- 24 hours = 1 day 📅\n- 7 days = 1 week\n- 12 months = 1 year 🗓️\n\n**a.m. and p.m.:**\n- **a.m.** — times from midnight to noon (morning)\n- **p.m.** — times from noon to midnight (afternoon and night)\n\n**Measurement — How big, long, or heavy?**\nA clock helps us know time.\nSchool starts at 9 o'clock 🏫\n\nWe measure:\n- Height\n- Weight\n- Length\n\nA pencil ✏️ can be 10 cm long.\n\n**Fun Tip! 🚀**\nPractice telling time on a clock face.\n60 seconds = 1 minute ⏱️\nWhat time do YOU wake up in the morning? ⏰",
      },
      {
        title: "Math Challenge Final",
        order: 10,
        durationMinutes: 15,
        content:
          "🏆 Welcome to the Final Math Challenge!\n\nYou have learned so many fun math skills! 🎉\nNow let's become super-fast math thinkers! 🚀\n\n**⚡ Smart Trick 1 — Near Numbers**\n48 + 19\n19 is close to 20.\nFirst add 20: 48 + 20 = 68\nNow take away 1: 68 - 1 = **67** 🎉\n\n**⚡ Smart Trick 2 — Double and Add**\n6 × 3\nCount 3 groups of 6: 6 + 6 + 6\nCount together: 6... 12... 18!\nSo: **6 × 3 = 18** 🌟\n\n**⚡ Smart Trick 3 — Fast Subtraction**\n52 - 9\nSubtract 10 first: 52 - 10 = 42\nNow add 1 back: 42 + 1 = **43** 🚀\n\n**⚡ Smart Trick 4 — Easy Division**\n12 ÷ 3\nShare 12 candies equally among 3 kids 🍬\nEach child gets **4 candies**.\nSo: **12 ÷ 3 = 4** 🎈\n\n**⚡ Smart Trick 5 — Multiply by 10**\nWhen multiplying by 10, just add a zero!\n**7 × 10 = 70** ⚡\n\n**⚡ Smart Trick 6 — Count by Groups**\n5 + 5 + 5 + 5\nCount together: 5... 10... 15... 20!\nSo: **5 × 4 = 20** ⭐\n\n**🧠 Remember:**\n- Math becomes easy with tricks ✔\n- Practice helps you learn faster ✔\n- Counting carefully gives correct answers ✔\n\n🌟 **Fantastic Work! You are now a Super Math Hero!** 🏆",
      },
    ],
  },
  {
    title: "Science Explorer",
    description:
      "Discover amazing science concepts through exciting experiments and observations!",
    subject: "science",
    gradeLevel: "Grade 4-6",
    thumbnail: "🔬",
    difficulty: "intermediate",
    lessons: [
      {
        title: "The Water Cycle",
        order: 1,
        durationMinutes: 12,
        content:
          "🌧️ Welcome to The Water Cycle!\n\nWater travels around Earth again and again. 💧\n\n**☀️ Step 1 — Evaporation**\nThe sun heats water in rivers, lakes, and oceans.\nWater changes into vapor and goes up into the sky. ☁️\n\n**☁️ Step 2 — Condensation**\nHigh in the sky, the water cools down.\nTiny drops join together to make clouds.\n\n**🌧️ Step 3 — Rain**\nClouds become heavy.\nWater falls back to Earth as rain!\nSplash splash! 💦\n\n**🌍 Step 4 — Collection**\nRainwater goes into:\n- Rivers\n- Lakes\n- Oceans\n\nThen the cycle starts again! 🔄\n\n**🧠 Fun Fact**\nWithout the water cycle, we would not get rain! 🌈",
      },
      {
        title: "States of Matter",
        order: 2,
        durationMinutes: 10,
        content:
          "🧊 Welcome to States of Matter!\n\nEverything around us is made of matter. 🌍\nMatter has 3 main forms.\n\n**🧊 Solid**\nSolids keep their shape.\nExamples:\n- Ice\n- Book\n- Chair\n\n**💧 Liquid**\nLiquids can flow.\nExamples:\n- Water\n- Juice\n- Milk\n\n**🌬️ Gas**\nGases spread everywhere.\nExamples:\n- Air\n- Steam\n- Oxygen\n\n**☀️ Fun Example**\nIce melts into water.\nWater heats into steam!\nScience is amazing! 🚀",
      },
      {
        title: "Plant Life Cycles",
        order: 3,
        durationMinutes: 12,
        content:
          "🌱 Welcome to Plant Life Cycles!\n\nPlants grow step by step. 🌿\n\n**🌰 Step 1 — Seed**\nA tiny seed is planted in soil.\n\n**💧 Step 2 — Sprout**\nThe seed gets:\n- Water\n- Sunlight\n- Air\n\nA small sprout grows up!\n\n**🌿 Step 3 — Young Plant**\nLeaves begin to grow.\nThe plant becomes taller.\n\n**🌸 Step 4 — Flowering Plant**\nBeautiful flowers bloom! 🌸\nSome plants grow fruits too. 🍎\n\n**🧠 Fun Fact**\nEvery big tree started as a tiny seed! 🌳",
      },
      {
        title: "Animal Habitats",
        order: 4,
        durationMinutes: 10,
        content:
          "🦁 Welcome to Animal Habitats!\n\nAnimals live in different homes called habitats. 🌍\n\n**🌳 Forest Habitat**\nAnimals:\n- 🐻 Bear\n- 🦌 Deer\n- 🐒 Monkey\n\n**🏜️ Desert Habitat**\nAnimals:\n- 🐫 Camel\n- 🦎 Lizard\n\nDeserts are very hot!\n\n**🌊 Ocean Habitat**\nAnimals:\n- 🐳 Whale\n- 🐠 Fish\n- 🐙 Octopus\n\n**❄️ Polar Habitat**\nAnimals:\n- 🐧 Penguin\n- 🐻‍❄️ Polar Bear\n\nVery cold and snowy!\n\n**🧠 Fun Fact**\nAnimals need food, water, and shelter to live safely. 🏡",
      },
      {
        title: "Simple Machines",
        order: 5,
        durationMinutes: 15,
        content:
          "⚙️ Welcome to Simple Machines!\n\nSimple machines help us do work easily. 💪\n\n**🪜 Ramp**\nA ramp helps move heavy things upward.\nExample: a wheelchair ramp, a slide 🛝\n\n**⚖️ Lever**\nA lever helps lift objects.\nExample: Seesaw 🎠, scissors ✂️\n\n**🛞 Wheel**\nWheels help things move smoothly.\nExamples:\n- 🚲 Bicycle\n- 🚗 Car\n\n**🧵 Pulley**\nA pulley helps lift heavy loads using a rope.\nExample: a flagpole 🚩\n\n**🔩 Screw**\nA screw holds things together tightly.\n\n**🧠 Fun Fact**\nSimple machines save time and energy! ⚡",
      },
      {
        title: "The Solar System",
        order: 6,
        durationMinutes: 15,
        content:
          "🚀 Welcome to The Solar System!\n\nThe Sun and planets make up the solar system. ☀️\n\n**☀️ The Sun**\nThe Sun gives us:\n- Heat\n- Light\n\nThe Sun is a giant star at the centre of our solar system!\n\n**🪐 Planets**\nThere are 8 planets.\nEarth is the planet where we live! 🌍\n\nThe 8 planets in order:\n- Mercury\n- Venus\n- Earth\n- Mars\n- Jupiter\n- Saturn\n- Uranus\n- Neptune\n\n**🌙 The Moon**\nThe Moon moves around Earth.\nThe Moon gives us light at night! 🌙\n\n**⭐ Fun Facts**\nJupiter is the biggest planet! 🪐\nSaturn has beautiful rings made of ice and rock.\nEarth is the only known planet with life. 🌍",
      },
      {
        title: "Electricity and Circuits",
        order: 7,
        durationMinutes: 12,
        content:
          "💡 Welcome to Electricity and Circuits!\n\nElectricity gives power to many things. ⚡\n\n**🔋 Battery**\nA battery stores energy.\nIt gives power to the circuit.\n\n**💡 Bulb**\nThe bulb lights up when electricity flows.\n\n**🔌 Wires**\nWires carry electricity from one place to another.\n\n**⭕ Closed Circuit**\nWhen all parts connect properly, the bulb glows! ✨\n\nWithout a complete loop, electricity cannot flow and the bulb stays dark.\n\n**🔓 Open Circuit**\nIf a wire is disconnected, the circuit is open.\nNo current flows — the bulb stays off.\n\n**🧠 Safety Tip**\nNever touch electric wires with wet hands! 🚫\nAlways ask an adult before handling electrical items.",
      },
      {
        title: "Forces and Motion",
        order: 8,
        durationMinutes: 12,
        content:
          "🏃 Welcome to Forces and Motion!\n\nA force is a push or a pull. 💪\n\n**⚽ Push**\nKicking a football pushes it away.\nClosing a door is also a push!\n\n**🚪 Pull**\nOpening a door can be a pull.\nPicking up a bag is a pull.\n\n**🚴 Motion**\nMotion means movement.\nCars, bikes, and people move every day!\n\n**Forces affect motion:**\n- A bigger force moves things faster\n- Friction slows things down\n- Gravity pulls everything down to Earth! 🌍\n\n**🧲 Magnetic Force**\nMagnets push or pull metal objects without touching them!\n\n**🧠 Fun Facts**\nGravity pulls everything down to Earth! 🌍\nWithout friction, we would slip everywhere! 🧊",
      },
      {
        title: "Living vs Non-Living Things",
        order: 9,
        durationMinutes: 15,
        content:
          "🧍 Welcome to Human Body Systems!\n\nOur body has many important parts working together. ❤️\n\n**🫀 Heart**\nThe heart pumps blood around your whole body.\nIt beats about 70-80 times per minute!\n\n**🫁 Lungs**\nLungs help us breathe.\nThey take in oxygen and release carbon dioxide.\n\n**🧠 Brain**\nThe brain helps us think, learn, and remember.\nIt controls everything in your body!\n\n**🦴 Bones**\nBones give shape and support to our body.\nAdults have 206 bones!\n\n**💪 Muscles**\nMuscles help us move, lift, and run.\n\n**🩸 Blood**\nBlood carries food and oxygen to all parts of the body.\n\n**🧠 Fun Fact**\nYour heart beats all day and night — even while you sleep! 💓",
      },
      {
        title: "Ecosystems and Food Chains",
        order: 10,
        durationMinutes: 20,
        content:
          '🧪 Welcome to the Science Fair Project!\n\nScience is all about asking questions and exploring new ideas! 🚀\n\n**🔍 Step 1 — Observe**\nLook carefully at things around you.\nWhat do you notice? What is interesting?\n\n**❓ Step 2 — Ask Questions**\nWhy does ice melt?\nWhy do plants grow?\nGood scientists always ask "why?" and "how?"\n\n**💡 Step 3 — Make a Prediction**\nWhat do you think will happen?\nThis is called a hypothesis!\n\n**🧪 Step 4 — Experiment**\nTry fun activities safely.\nTest your prediction with a simple experiment.\n\n**📋 Step 5 — Record Results**\nWrite or draw what you see.\nDid your prediction come true?\n\n**🌟 The Scientific Method:**\n- Observe\n- Question\n- Predict\n- Experiment\n- Record\n- Conclude\n\n**🧠 Fun Fact**\nEvery scientist started by being curious! 🔬',
      },
    ],
  },
  {
    title: "Reading & Writing Stars",
    description:
      "Build your reading and writing skills with creative stories and interactive activities!",
    subject: "english",
    gradeLevel: "Grade 2-4",
    thumbnail: "📚",
    difficulty: "beginner",
    lessons: [
      {
        title: "Story Elements",
        order: 1,
        durationMinutes: 10,
        content:
          "📖 Welcome to Story Elements!\n\nEvery story has important parts. 🌟\n\n**👧 Characters**\nCharacters are the people or animals in a story.\nExamples:\n- Princess 👸\n- Dog 🐕\n- Superhero 🦸\n\n**🏡 Setting**\nThe setting tells where and when the story happens.\nExamples:\n- 🌳 Forest\n- 🏫 School\n- 🏖️ Beach\n\n**🎯 Problem**\nStories often have a problem to solve.\nExample: A puppy is lost! 🐶\n\n**⬆️ Rising Action**\nThings get more exciting as the characters try to solve the problem!\n\n**🎉 Ending / Resolution**\nThe ending tells how the story finishes.\nHappy endings are fun! 🌈\n\n**🧠 Fun Fact**\nEvery great story has characters, setting, and a fun adventure! 🚀",
      },
      {
        title: "Reading Comprehension",
        order: 2,
        durationMinutes: 12,
        content:
          "📚 Welcome to Reading Comprehension!\n\nReading comprehension means understanding what we read. 🌟\n\n**👀 Read Carefully**\nRead each sentence slowly.\nDon't rush — take your time!\n\n**🧠 Think About Meaning**\nAsk yourself:\n\"What is happening in the story?\"\n\n**❓ Answer Questions**\nExample:\n\nTom has a red ball. 🔴\n\nQuestion: What color is Tom's ball?\nAnswer: **Red** ❤️\n\n**💡 Reading Tips:**\n- Look at pictures for clues\n- Read slowly\n- Think carefully\n- Re-read if you don't understand\n\n**🔍 Key Skill — Finding the Main Idea**\nThe main idea is what the story is mostly about.\nSupporting details give more information.\n\n**🌟 Great readers understand stories!**",
      },
      {
        title: "Creative Writing",
        order: 3,
        durationMinutes: 15,
        content:
          '✍️ Welcome to Creative Writing!\n\nCreative writing means using your imagination. 🌈\n\n**🦄 Imagine Fun Ideas**\nYou can write about:\n- Dragons 🐉\n- Space trips 🚀\n- Talking animals 🐾\n\n**📖 Example Story**\n"One day, a tiny cat flew to the moon!" 🌙🐱\nFun and silly ideas make stories exciting!\n\n**🎨 Add Details**\nInstead of: "The bird flew."\nYou can write: "The colorful bird flew high in the blue sky." 🐦☁️\n\n**✏️ Story Structure:**\n- **Beginning** — Introduce characters and setting\n- **Middle** — The adventure or problem happens\n- **End** — How the story finishes\n\n**🌈 Tips for Great Stories:**\n- Give your characters names\n- Describe the setting vividly\n- Add a surprise or twist!\n\n**🌟 Every child can become a great writer!**',
      },
      {
        title: "Grammar Basics",
        order: 4,
        durationMinutes: 10,
        content:
          '📝 Welcome to Grammar Basics!\n\nGrammar helps us make good sentences. 🌟\n\n**👦 Nouns**\nNouns are names of people, places, or things.\nExamples:\n- Boy 👦\n- School 🏫\n- Ball ⚽\n\n**🏃 Verbs**\nVerbs are action words.\nExamples:\n- Run 🏃\n- Jump 🦘\n- Sing 🎵\n\n**😊 Adjectives**\nAdjectives describe things.\nExamples:\n- **Big** elephant 🐘\n- **Red** apple 🍎\n- **Happy** dog 🐶\n\nPutting it together:\n"The **big** elephant **runs** fast."\n- big = adjective\n- elephant = noun\n- runs = verb\n\n**🌟 Good grammar helps us write clearly!**',
      },
      {
        title: "Spelling Strategies",
        order: 5,
        durationMinutes: 10,
        content:
          '🔤 Welcome to Spelling Strategies!\n\nSpelling helps us write words correctly. ✍️\n\n**👂 Strategy 1 — Listen Carefully**\nSay the word slowly.\nExample: C-A-T → cat 🐱\n\n**📝 Strategy 2 — Practice Writing**\nWriting words again and again helps us remember them.\n"Look, Cover, Write, Check" is a great method!\n\n**🎵 Strategy 3 — Use Rhymes**\nCat, hat, bat 🧢\nRhyming words sound similar and help spelling!\n\n**🔠 Strategy 4 — Break Into Parts**\nLong words can be split into smaller chunks.\n**butter + fly = butterfly** 🦋\n**sun + flower = sunflower** 🌻\n\n**Strategy 5 — Tricky Words**\nSome words must be memorised:\n- the, said, because, friend\n\n**🌟 Practice every day to become a spelling star! ⭐**',
      },
      {
        title: "Punctuation Power",
        order: 6,
        durationMinutes: 10,
        content:
          '✏️ Welcome to Punctuation Power!\n\nPunctuation marks help sentences make sense. 🌟\n\n**🔵 Period / Full Stop (.)**\nA period ends a sentence.\nExample: "I like apples." 🍎\n\n**❓ Question Mark (?)**\nUsed when asking questions.\nExample: "Where is my book?" 📚\n\n**❗ Exclamation Mark (!)**\nShows excitement or strong feeling.\nExample: "Wow! That is amazing!" 🎉\n\n**✏️ Comma (,)**\nA comma separates items in a list or gives a pause.\nExample: "I like cats, dogs, and birds."\n\n**" " Quotation Marks**\nUsed to show someone is speaking.\nExample: She said, "Hello!" 👋\n\n**CAPITAL LETTERS**\nEvery sentence starts with a capital letter.\nNames of people and places also use capital letters.\n\n**🌟 Punctuation makes reading easier!**',
      },
      {
        title: "Synonyms and Antonyms",
        order: 7,
        durationMinutes: 12,
        content:
          '🎵 Welcome to Poetry and Rhymes!\n\nPoems are fun and musical. 🌈\n\n**🎶 Rhyming Words**\nWords that sound alike rhyme.\nExamples:\n- Cat – Hat 🐱🧢\n- Sun – Fun ☀️🎉\n- Cake – Lake 🎂🏞️\n\n**📖 Example Poem**\nTwinkle twinkle little star, ⭐\nHow I wonder what you are!\nUp above the world so high,\nLike a diamond in the sky!\n\n**Types of Poems:**\nPoems can be:\n- Funny 😄\n- Happy 😊\n- Silly 🤪\n- Calm and peaceful 🌿\n\n**📝 Writing a Rhyme**\nPick a topic.\nFind rhyming words.\nExample — a poem about rain:\n"Rain, rain, falling down,\nSplashing all around the town!" 🌧️\n\n**🌟 Reading poems makes language fun!**',
      },
      {
        title: "Poetry and Rhymes",
        order: 8,
        durationMinutes: 12,
        content:
          '🖍️ Welcome to Descriptive Writing!\n\nDescriptive writing helps readers imagine things clearly. 🌟\n\n**🍦 Use Describing Words**\nInstead of: "I ate ice cream."\nYou can write: "I ate cold, sweet chocolate ice cream." 🍫🍦\n\n**👀 Describe What You See**\nExample: "The tall green tree swayed gently in the warm wind." 🌳\n\n**🧠 Use Your Senses**\nDescribe:\n- How things **look** 👀\n- How things **sound** 👂\n- How things **feel** ✋\n- How things **smell** 👃\n- How things **taste** 👅\n\n**Example using all 5 senses:**\n"The warm pizza smelled of cheese and herbs, looked golden and crispy, and tasted delicious!" 🍕\n\n**✍️ Strong Word Choices**\nInstead of "nice" → say **beautiful, wonderful, amazing**\nInstead of "big" → say **enormous, gigantic, huge**\n\n**🌟 Good descriptions make stories exciting!**',
      },
      {
        title: "Report Writing",
        order: 9,
        durationMinutes: 12,
        content:
          '📘 Welcome to Informational Text!\n\nInformational text teaches us facts. 🌍\n\n**🦁 Example of Informational Text**\n"Lions live in groups called prides.\nThey are found in Africa and hunt large animals."\nThis is a fact! 🦁\n\n**📖 We Learn About:**\n- Animals 🐘\n- Space 🚀\n- Nature 🌿\n- Science 🔬\n- History 🏛️\n\n**🔍 Look for Important Information**\nGood readers search for key facts and main ideas.\n\n**📋 Features of Informational Text:**\n- **Headings** — tell you what each section is about\n- **Bold words** — highlight important terms\n- **Diagrams** — help explain ideas visually\n- **Facts** — true information about real things\n\n**📝 How to Read Informational Text:**\n- Read the headings first\n- Look for the main idea\n- Find key facts and details\n\n**🌟 Reading facts helps us learn new things every day!**',
      },
      {
        title: "Book Review Writing",
        order: 10,
        durationMinutes: 20,
        content:
          '📚 Welcome to the Book Report Challenge!\n\nA book report tells about a story you read. 🌟\n\n**📖 Step 1 — Tell the Story Name**\nWrite the title and author of the book.\nExample: "The Three Little Pigs" by a traditional author.\n\n**👦 Step 2 — Talk About Characters**\nWho was in the story?\n- Pigs 🐷\n- Wolf 🐺\n\n**🗺️ Step 3 — Describe the Setting**\nWhere and when did the story take place?\n\n**🧠 Step 4 — Share What Happened**\nWhat was the main problem?\nHow did the story end?\n\n**💬 Step 5 — Give Your Opinion**\nDid you like the story?\nWhat was your favorite part? 🌈\nWould you recommend it to a friend?\n\n**📝 Book Report Template:**\n- Title: ___\n- Author: ___\n- Characters: ___\n- Setting: ___\n- Main event: ___\n- My opinion: ___\n\n**🌟 Great job becoming a reading star! ⭐**',
      },
    ],
  },
  {
    title: "World Geography Quest",
    description:
      "Travel the world from your classroom and discover amazing countries and cultures!",
    subject: "social-studies",
    gradeLevel: "Grade 5-7",
    thumbnail: "🌍",
    difficulty: "intermediate",
    lessons: [
      {
        title: "Continents and Oceans",
        order: 1,
        durationMinutes: 12,
        content:
          "🌍 Welcome to Continents and Oceans!\n\nEarth is made of land and water. 🌊\n\n**🌎 The 7 Continents**\n- ⭐ Asia — the largest\n- ⭐ Africa\n- ⭐ Europe\n- ⭐ North America\n- ⭐ South America\n- ⭐ Australia\n- ⭐ Antarctica — the coldest\n\n**🌊 The 5 Oceans**\n- Pacific Ocean — the largest\n- Atlantic Ocean\n- Indian Ocean\n- Southern Ocean\n- Arctic Ocean\n\n**🧠 Fun Facts**\nAsia is the largest continent! 🌏\nThe Pacific Ocean is bigger than all land combined!\nAntarctica is covered in ice and has no permanent human residents.",
      },
      {
        title: "Countries and Capitals",
        order: 2,
        durationMinutes: 15,
        content:
          "🏙️ Welcome to Countries and Capitals!\n\nEvery country has a capital city. 🌍\n\n**Capital Cities Around the World:**\n- 🇮🇳 India → New Delhi\n- 🇫🇷 France → Paris\n- 🇯🇵 Japan → Tokyo\n- 🇺🇸 USA → Washington D.C.\n- 🇧🇷 Brazil → Brasília\n- 🇦🇺 Australia → Canberra\n- 🇬🇧 UK → London\n- 🇨🇳 China → Beijing\n\n**🏛️ What are Capitals?**\nCapital cities are important places where a country's leaders work.\nThey usually have the main government buildings and national landmarks.\n\n**🧠 Fun Facts**\nPeople around the world speak many different languages! 🌎\nThere are 195 countries in the world.\nThe country with the most people is China! 🇨🇳",
      },
      {
        title: "Cultures and Traditions",
        order: 3,
        durationMinutes: 12,
        content:
          "🎎 Welcome to Cultures and Traditions!\n\nPeople around the world have different ways of living. 🌍\n\n**👘 Clothes**\nDifferent countries wear different traditional clothes.\n- India: Sari 🇮🇳\n- Japan: Kimono 🇯🇵\n- Scotland: Kilt 🏴󠁧󠁢󠁳󠁣󠁴󠁿\n\n**🍜 Food**\nPeople enjoy different foods around the world.\n- Italy: Pizza and pasta 🍕\n- Japan: Sushi 🍣\n- India: Curry and rice 🍛\n- Mexico: Tacos 🌮\n\n**🎉 Festivals**\nCountries celebrate special festivals and holidays.\n- Diwali — Festival of Lights in India 🪔\n- Christmas — celebrated worldwide 🎄\n- Eid — celebrated by Muslims 🌙\n- Chinese New Year 🐉\n\n**🧠 Fun Fact**\nLearning about cultures helps us respect others. ❤️\nEvery culture has something unique and beautiful to share!",
      },
      {
        title: "Climate Zones",
        order: 4,
        durationMinutes: 10,
        content:
          "☀️ Welcome to Climate Zones!\n\nClimate means the usual weather of a place. 🌦️\n\n**🏜️ Hot Climate — Tropical / Desert**\nDeserts are very hot and dry.\nTropical regions are hot and rainy all year.\nAnimals like camels 🐫 and lizards 🦎 live here.\n\n**❄️ Cold Climate — Polar**\nPolar regions are cold and snowy all year.\nAnimals like polar bears 🐻‍❄️ and penguins 🐧 live here.\n\n**🌧️ Rainy Climate — Rainforest**\nSome places get lots of rain.\nThe Amazon Rainforest gets rain almost every day!\n\n**🌤️ Mild Climate — Temperate**\nNot too hot, not too cold.\nThe UK and much of Europe have a temperate climate.\nWe get all four seasons! 🍂❄️🌸☀️\n\n**🧠 Fun Fact**\nDifferent climates help different plants and animals survive! 🌳\nClimate also affects how people dress, eat, and build their homes.",
      },
      {
        title: "Natural Wonders",
        order: 5,
        durationMinutes: 12,
        content:
          "🌈 Welcome to Natural Wonders!\n\nNatural wonders are amazing places made by nature. 🌍\n\n**⛰️ Mountains**\nTall mountains touch the clouds!\nThe highest mountain is Mount Everest 🏔️ at 8,849 metres.\n\n**💦 Waterfalls**\nHuge waterfalls flow with rushing water.\nVictoria Falls in Africa is one of the world's largest! 💦\n\n**🌊 Oceans and Seas**\nOceans are home to millions of sea animals.\nThe Great Barrier Reef in Australia is the largest coral reef! 🐠\n\n**🏜️ Deserts**\nThe Sahara Desert is the largest hot desert in the world.\nIt covers most of North Africa! 🌵\n\n**🌋 Volcanoes**\nVolcanoes can erupt with hot lava! 🌋\n\n**🧠 Fun Facts**\nThe Grand Canyon in the USA is one of the most famous natural wonders! 🌄\nThe Amazon Rainforest produces 20% of the world's oxygen.",
      },
      {
        title: "Maps and Globes",
        order: 6,
        durationMinutes: 10,
        content:
          "🗺️ Welcome to Maps and Globes!\n\nMaps help us find places. 🌍\n\n**🌐 Globe**\nA globe is a round model of Earth.\nIt shows the real shape of continents and oceans.\n\n**🗺️ Map**\nA map is a flat picture of a place.\nMaps can show countries, cities, rivers, and roads.\n\n**🧭 Compass Directions**\nMaps use directions:\n- ⭐ North (N)\n- ⭐ South (S)\n- ⭐ East (E)\n- ⭐ West (W)\n\n**📍 Map Symbols**\nMaps use symbols for roads, rivers, and buildings.\nA legend (key) explains what each symbol means.\n\n**🛣️ Routes**\nMaps help us travel from one place to another.\nWe can plan the shortest or fastest route!\n\n**🧠 Fun Fact**\nA compass helps people know which direction they are facing! 🧭\nGPS (Global Positioning System) is a modern way to navigate.",
      },
      {
        title: "Population and Cities",
        order: 7,
        durationMinutes: 12,
        content:
          "💰 Welcome to Population and Cities!\n\nPeople work to earn money and buy things. 🌍\n\n**🏙️ Big Cities of the World**\nSome of the largest cities are:\n- Tokyo, Japan 🇯🇵 — one of the world's biggest cities\n- Mumbai, India 🇮🇳\n- New York, USA 🇺🇸\n- London, UK 🇬🇧\n\n**👥 Population**\nPopulation means how many people live in a place.\nEarth has over 8 billion people! 🌍\n\n**🏪 Why Cities Grow**\nPeople move to cities for:\n- Jobs\n- Schools\n- Hospitals\n- Shops and services\n\n**🌆 Urban vs Rural**\n**Urban** = city or town (lots of people, buildings, traffic)\n**Rural** = countryside (fewer people, farms, nature)\n\n**🧠 Fun Fact**\nMore than half the world's population lives in cities!\nThe most populated country is India 🇮🇳.",
      },
      {
        title: "Natural Resources",
        order: 8,
        durationMinutes: 15,
        content:
          "🏺 Welcome to Natural Resources!\n\nNatural resources come from nature and are used by people. 🌍\n\n**Types of Natural Resources:**\n\n**🪵 Wood**\nTrees give us wood for furniture and paper.\n\n**💧 Water**\nWater is essential for drinking, farming, and industry.\n\n**⛽ Fossil Fuels**\nCoal, oil, and gas give us energy.\nThey formed underground over millions of years!\n\n**🌾 Soil**\nFarmers use soil to grow food for everyone.\n\n**☀️ Renewable Resources**\nSolar energy ☀️, wind energy 💨, and water energy 💧 can be reused.\n\n**🧠 Fun Facts**\nWe must use natural resources carefully so they don't run out!\nPeople long ago discovered many things we still use today! 🌟",
      },
      {
        title: "Transport and Trade",
        order: 9,
        durationMinutes: 12,
        content:
          "🚢 Welcome to Transport and Trade!\n\nCountries trade goods with each other. 🌍\n\n**🚢 Transport**\nTransport means moving people or goods from one place to another.\n\n**Types of Transport:**\n- ✈️ Aeroplane — fastest way to travel long distances\n- 🚢 Ship — carries large loads across oceans\n- 🚂 Train — travels quickly on land\n- 🚗 Car / Lorry — for shorter distances\n- 🚲 Bicycle — eco-friendly! 🌱\n\n**🛒 Trade**\nCountries trade things they have for things they need.\nExample:\n- Brazil sells coffee ☕\n- Japan sells cars 🚗\n- India sells spices 🌶️\n\n**📦 Imports and Exports**\n**Import** = buying goods from another country\n**Export** = selling goods to another country\n\n**🧠 Fun Fact**\nFarmers help grow food for everyone! 🌾\nShips carry about 90% of the world's trade goods.",
      },
      {
        title: "Environmental Issues",
        order: 10,
        durationMinutes: 12,
        content:
          "🌱 Welcome to Environmental Issues!\n\nWe must protect our Earth. 🌍\n\n**🗑️ Pollution**\nTrash and smoke can harm nature, air, and water.\nPlastic takes hundreds of years to break down! 😢\n\n**🌳 Save Trees — Deforestation**\nTrees give us oxygen and clean air.\nCutting too many trees destroys animal habitats.\n**Plant more trees!** 🌱\n\n**💧 Save Water**\nWater is important for all living things.\nTurn off taps when not in use! 🚿\n\n**♻️ Recycling**\nRecycling helps reduce waste.\nSort your rubbish into paper, plastic, glass, and compost.\n\n**🌡️ Climate Change**\nThe Earth is warming because of greenhouse gases.\nThis affects weather, wildlife, and sea levels.\n\n**What YOU can do:**\n- Walk or cycle instead of driving 🚲\n- Turn off lights when leaving a room 💡\n- Use less plastic 🛍️\n- Plant a tree! 🌳\n\n**🧠 Fun Fact**\nSmall actions by everyone can help save the planet! 🌎",
      },
    ],
  },
  {
    title: "Coding for Kids",
    description:
      "Learn to think like a computer scientist with fun coding challenges and puzzles!",
    subject: "technology",
    gradeLevel: "Grade 4-7",
    thumbnail: "💻",
    difficulty: "beginner",
    lessons: [
      {
        title: "What is Programming?",
        order: 1,
        durationMinutes: 10,
        content:
          "💻 Welcome to Programming!\n\nProgramming means giving instructions to a computer. 🤖\n\n**🧠 Computers Follow Steps**\nJust like following a recipe,\ncomputers follow instructions step by step.\n\n**🎮 Example**\nIf you tell a game character:\n- ➡️ Move forward\n- ➡️ Jump\n- ➡️ Turn left\n\nThe character follows your commands!\n\n**🌟 Programmers Create:**\n- Games 🎮\n- Apps 📱\n- Websites 🌐\n- Robots 🤖\n\n**Languages Computers Understand:**\nProgramming languages include Python, Scratch, JavaScript, and Java.\nThey translate our instructions into computer language!\n\n**🧠 Fun Fact**\nProgramming helps computers know what to do! 🚀\nThe first computer programmer was Ada Lovelace, way back in the 1800s! 👩‍💻",
      },
      {
        title: "Sequences and Loops",
        order: 2,
        durationMinutes: 12,
        content:
          "🔁 Welcome to Sequences and Loops!\n\nPrograms follow steps in order. 📋\n\n**➡️ Sequence**\nA sequence means doing actions one by one, in the right order.\n\nExample morning routine:\n- Wake up ⏰\n- Brush teeth 🪥\n- Eat breakfast 🥣\n- Go to school 🎒\n\n**🔄 Loop**\nA loop repeats actions again and again.\n\nExample — Clap 3 times:\nClap! Clap! Clap! 👏\n\nIn code, instead of writing it 3 times, we use a loop!\n\n**🎮 In Games**\nLoops help characters:\n- Walk continuously\n- Dance 💃\n- Jump repeatedly\n\n**Why loops are useful:**\nWithout loops, you'd need to write the same code hundreds of times!\n\n**🧠 Fun Fact**\nLoops save time in coding! ⚡\nGames use loops to keep running until you press stop!",
      },
      {
        title: "Conditions and Decisions",
        order: 3,
        durationMinutes: 12,
        content:
          '🤔 Welcome to Conditions and Decisions!\n\nComputers can make choices. 💻\n\n**🌦️ IF-THEN Example**\nIF it rains ☔\nTHEN use an umbrella.\n\n**🎮 Game Example**\nIF player gets a star ⭐\nTHEN score increases.\n\n**🚦 Traffic Light Example**\nIF light is green 🟢 THEN go.\nIF light is red 🔴 THEN stop.\n\n**IF-ELSE**\nSometimes there are two choices:\nIF it is sunny ☀️ THEN go outside.\nELSE stay inside and read a book. 📚\n\nReal Coding Example:\nif score > 10:\n    print("You win!")\nelse:\n    print("Try again!")\n\n**🧠 Fun Fact**\nConditions help games and apps react to your actions! 🚀\nEvery app on your phone uses hundreds of conditions.',
      },
      {
        title: "Variables and Data",
        order: 4,
        durationMinutes: 15,
        content:
          '📦 Welcome to Variables and Data!\n\nVariables store information in coding. 💻\n\n**🎒 What is a Variable?**\nA variable is like a labelled box.\nThe box can store:\n- Numbers\n- Names\n- Scores\n\n**🎮 Game Example**\nscore = 10 ⭐\nThe variable "score" stores the number 10.\n\nWhen you collect a coin: score = score + 1\nNow score = 11! 🎉\n\n**😊 Another Example**\nname = "Sam"\nThe computer remembers the name Sam!\n\n**Types of Data:**\n- **Number**: age = 8\n- **Text (String)**: playerName = "Riya"\n- **True/False (Boolean)**: isAlive = True\n\nChanging Variables:\nVariables can change while the program runs.\nThat\'s why they\'re called "VARI-ables" — they can vary!\n\n**🧠 Fun Fact**\nVariables help programs remember information! 🚀',
      },
      {
        title: "Functions and Procedures",
        order: 5,
        durationMinutes: 12,
        content:
          '⚙️ Welcome to Functions and Procedures!\n\nFunctions help us reuse code. 💻\n\n**🍕 Real-World Example**\nImagine making pizza many times.\nInstead of writing all steps again and again,\nyou can save the recipe once and use it whenever you want!\n\nThat\'s what a function does in coding!\n\n**🎮 In Coding**\nA function can:\n- Jump the character ⬆️\n- Play music 🎵\n- Show a score ⭐\n\nJust call the function — it runs all the steps automatically!\n\nWriting a Function:\ndef celebrate():\n    print("🎉 You won!")\n    play_music()\n    show_fireworks()\n\nNow whenever you write celebrate(), all 3 things happen!\n\n**🚀 Why Functions Help:**\n- Save time ⏰\n- Make coding easier to read\n- Keep programs clean and organised\n\n**🧠 Fun Fact**\nBig games use thousands of functions! 🎮',
      },
      {
        title: "Debugging and Testing",
        order: 6,
        durationMinutes: 12,
        content:
          '🐞 Welcome to Debugging and Testing!\n\nDebugging means finding and fixing coding mistakes. 💻\n\n**😵 Sometimes Programs Fail**\nGames or apps may stop working because of errors.\nThese errors are called **bugs**!\n\n**Types of Bugs:**\n- **Spelling mistake**: writing prnit instead of print\n- **Logic error**: using the wrong maths (e.g. + instead of -)\n- **Missing part**: forgetting a closing bracket\n\n**🔍 How to Find the Problem**\nProgrammers carefully check:\n- Spelling ✍️\n- Symbols like brackets ( ) and colons :\n- Missing or extra code\n\n**🛠️ Fix the Bug**\nAfter finding the mistake, fix it and try again!\nAfter fixing mistakes, the program works! 🎉\n\nTesting:\nGood programmers test their code regularly.\nAsk: "Does it do what I expected?"\n\n**🧠 Fun Fact**\nThe word "bug" came from a real moth found inside an early computer in 1947! 🦋',
      },
      {
        title: "Lists and Arrays",
        order: 7,
        durationMinutes: 12,
        content:
          '📋 Welcome to Lists and Arrays!\n\nLists store many items together. 💻\n\n**🍎 Example List (Shopping List)**\n- Apple\n- Banana\n- Mango\n\nIn coding, this would be:\nfruits = ["Apple", "Banana", "Mango"]\n\n**🎮 Game Example**\nA game can store inside a list:\n- Player names\n- Scores\n- Collected items\n\nAccessing Items:\nfruits[0] = "Apple" (first item)\nfruits[1] = "Banana" (second item)\n\nLists can grow:\nYou can add new items!\nfruits.append("Orange")\nNow fruits has 4 items! 🍊\n\n**🧠 Why Lists Help**\nLists keep lots of information organized.\nInstead of 10 separate variables, one list holds them all!\n\n**🌟 Fun Fact**\nLists help apps remember many things at once! 🚀\nYour phone\'s contacts list is basically a huge array!',
      },
      {
        title: "Events and User Interaction",
        order: 8,
        durationMinutes: 15,
        content:
          '🖱️ Welcome to Events and User Interaction!\n\nPrograms respond to what users do. 💻\n\n**🎮 What is an Event?**\nAn event is something that happens — like a click, a key press, or a swipe.\n\nWhen an event happens, the program runs code to respond!\n\n**Examples of Events:**\n- Click a button 🖱️ → open a page\n- Press a key ⌨️ → character jumps\n- Swipe on screen 📱 → go to next photo\n\n**🎯 Event Handlers**\nAn event handler is the code that runs when an event occurs.\n\nbutton.onClick:\n    score = score + 1\n    print("You clicked!")\n\n**🕹️ In Games:**\n- Press SPACE → jump\n- Click enemy → lose a life\n- Collect coin → score +10\n\n**🌐 On Websites:**\n- Click "Submit" → form is sent\n- Hover over menu → dropdown appears\n\n**🧠 Fun Fact**\nEvery tap, click, and swipe on your phone is an event! 📱',
      },
      {
        title: "Creating Simple Games",
        order: 9,
        durationMinutes: 15,
        content:
          "🎮 Welcome to Creating Simple Games!\n\nNow it's time to build something fun! 🚀\n\n**🕹️ What Makes a Game?**\nA simple game needs:\n- A **player** 🏃\n- A **goal** 🎯\n- **Rules** 📋\n- A way to **win or lose** 🏆\n\n**🎯 Example Game Ideas:**\n- Catch the falling stars ⭐\n- Avoid the obstacles 🚧\n- Answer quiz questions ❓\n- Click the correct colour 🎨\n\n**💻 Using Your Coding Skills:**\nYour game can use:\n- **Variables** — to store score and lives\n- **Loops** — to keep the game running\n- **Conditions** — to check if you win or lose\n- **Functions** — for actions like jump, shoot, restart\n\nBuilding Step by Step:\n1. Plan your game idea 💡\n2. Create the player and background\n3. Add movement with keyboard/mouse events\n4. Add scoring and conditions\n5. Test and debug!\n\n**🌟 Great Job!**\nYou are becoming a real programmer! 💻🏆",
      },
      {
        title: "Web Basics: HTML and CSS",
        order: 10,
        durationMinutes: 20,
        content:
          "🌐 Welcome to Web Basics: HTML and CSS!\n\nHTML and CSS work together to build beautiful websites. 💻\n\n**📄 HTML — The Structure**\nHTML (HyperText Markup Language) builds the structure of a page.\n\nHTML adds:\n- Headings\n- Pictures\n- Buttons\n- Text\n\nExample: Welcome to My Website!\n\n**🎨 CSS — The Style**\nCSS (Cascading Style Sheets) makes websites colorful and beautiful. 🌈\n\nCSS changes:\n- Colors 🎨\n- Fonts ✍️\n- Sizes 📐\n- Layouts\n\nExample: h1 { color: blue; font-size: 30px; }\n\n**💻 HTML + CSS Together**\nHTML builds the webpage.\nCSS decorates it!\n\nA button can become:\n- 🔵 Blue\n- 🟢 Green\n- 🟣 Purple\n\n**🧠 Fun Facts**\nHTML stands for HyperText Markup Language.\nCSS stands for Cascading Style Sheets.\nEvery website uses both HTML and CSS! 🌐",
      },
    ],
  },
  {
    title: "Art & Creativity",
    description:
      "Unleash your inner artist and learn about famous artworks, colors, and creative expression!",
    subject: "art",
    gradeLevel: "Grade 1-5",
    thumbnail: "🎨",
    difficulty: "beginner",
    lessons: [
      {
        title: "Colours and Colour Mixing",
        order: 1,
        durationMinutes: 10,
        content:
          "🎨 Welcome to Colors and Color Mixing!\n\nColors make art bright and beautiful! 🌈\n\n**🔴 Primary Colors**\nThe 3 primary colors are:\n- Red 🔴\n- Blue 🔵\n- Yellow 🟡\n\nThese cannot be made by mixing other colors.\n\n**🟣 Mixing Colors — Secondary Colors**\n- Red + Blue = Purple 💜\n- Blue + Yellow = Green 💚\n- Red + Yellow = Orange 🧡\n\n**🌈 The Color Wheel**\nThe color wheel shows how colors relate to each other.\nOpposite colors on the wheel are called **complementary colors**.\n\nWarm and Cool Colors:\n- **Warm** = Red, Orange, Yellow — feel energetic!\n- **Cool** = Blue, Green, Purple — feel calm!\n\n**🌟 Artists Use Colors**\nArtists mix colors to paint amazing pictures!\nUsing more white makes a color **lighter** (tint).\nUsing more black makes a color **darker** (shade).\n\n**🧠 Fun Fact**\nA rainbow has 7 beautiful colors! 🌈\nRed, Orange, Yellow, Green, Blue, Indigo, Violet",
      },
      {
        title: "Famous Artists",
        order: 2,
        durationMinutes: 12,
        content:
          '🖼️ Welcome to Famous Artists!\n\nArtists create beautiful paintings and sculptures. 🎨\n\n**🌻 Vincent van Gogh**\nVan Gogh painted colorful flowers, starry nights, and sunflowers.\nHis famous painting "Starry Night" uses swirling blue paint! 🌌\n\n**😊 Leonardo da Vinci**\nHe painted the world-famous Mona Lisa 👩 in Italy.\nHe was also an inventor and scientist!\n\n**🎭 Pablo Picasso**\nPicasso invented a style called Cubism — drawing things in geometric shapes.\nHe used bold colors and unusual angles.\n\n**🌸 Frida Kahlo**\nFrida was a Mexican artist who painted self-portraits full of emotion and colour. 🌺\n\n**🎨 Artists Use Creativity**\nArtists use colors, shapes, and ideas to share stories and feelings.\n\n**🌟 Fun Facts**\nEvery artist has a unique style! 🌟\nThe Mona Lisa is considered the most famous painting in the world.\nVan Gogh only sold one painting during his lifetime — now they\'re worth millions!',
      },
      {
        title: "Drawing Basics",
        order: 3,
        durationMinutes: 15,
        content:
          "✏️ Welcome to Drawing Basics!\n\nDrawing helps us create pictures using lines and shapes. 🌟\n\n**⭕ Start with Basic Shapes**\nMany drawings begin with simple shapes:\n- Circles ⭕\n- Squares 🟦\n- Triangles 🔺\n- Rectangles ▭\n\n**🐱 Example — Drawing a Cat**\nA cat can start with:\n- Big circle for the head ⭕\n- Smaller circle for the body\n- Two small triangles for ears △△\n- Add eyes, nose, mouth, and whiskers!\n\n**🖍️ Add Details**\nAdd eyes, nose, and colors to finish the drawing!\nDetails make pictures come alive! 🌟\n\nTypes of Lines:\n- Straight lines — for buildings and structures\n- Curved lines — for animals and nature\n- Zigzag lines — for mountains and patterns\n- Wavy lines — for water and hair\n\n**✏️ Tips for Drawing:**\n- Start with light pencil lines\n- Don't worry about perfection — just practice!\n- Look at real objects for reference\n\n**🧠 Fun Fact**\nPractice helps artists draw better every day! 🚀",
      },
      {
        title: "Sculpture and 3D Art",
        order: 4,
        durationMinutes: 12,
        content:
          "🗿 Welcome to Sculpture and 3D Art!\n\nSculptures are artworks you can see and walk around from all sides. 🌟\n\n**🧱 Materials Used in Sculpture**\nArtists use:\n- Clay 🧱\n- Wood 🪵\n- Stone 🪨\n- Metal ⚙️\n- Paper (origami!) 📄\n\n**✋ How Sculptors Work**\nArtists press, cut, carve, and shape materials to create 3D art.\nClay can be shaped by hand — it's great for beginners!\n\n**🏺 Famous Examples**\n- The Statue of Liberty — made of copper 🗽\n- Michelangelo's David — carved from marble\n- Clay pots — one of the oldest art forms 🏺\n\n**📦 3D vs 2D**\n- **2D art** (painting, drawing) — flat, you see it from one side\n- **3D art** (sculpture) — has height, width, AND depth\n\nMaking 3D Art at Home:\nYou can create 3D art with:\n- Air-dry clay\n- Papier-mâché\n- Recycled materials 🌱\n\n**🧠 Fun Fact**\nSome sculptures are bigger than buildings! 🏛️\nThe Sphinx in Egypt is carved out of solid rock.",
      },
      {
        title: "Perspective and Depth",
        order: 5,
        durationMinutes: 15,
        content:
          "💧 Welcome to Watercolour Techniques!\n\nWatercolors are soft and beautiful paints. 🎨\n\n**🖌️ How Watercolors Work**\nYou mix the paint with water.\nMore water = lighter, more transparent color.\nLess water = stronger, more vivid color.\n\n**Key Techniques:**\n\n**☁️ Wet-on-Wet**\nPaint on wet paper. Colors spread and blend softly.\nGreat for painting skies and clouds! ☁️\n\n**🖌️ Dry Brush**\nUse less water. The brush leaves textured strokes.\nGreat for grass, fur, and rough textures.\n\n**🌈 Color Mixing**\nMix colors while wet to blend them smoothly.\nBlue + Yellow on wet paper = soft green 💚\n\n**🌸 Light Areas**\nLeave white spaces on the paper for highlights.\nWatercolor cannot be painted over with white!\n\n**✨ Layering**\nLet the first layer dry, then add another on top.\nEach layer adds depth and richness.\n\n**🧠 Fun Facts**\nToo much water can make colors very light! 💦\nFamous watercolor artists include Turner and Dürer.",
      },
      {
        title: "Watercolour Techniques",
        order: 6,
        durationMinutes: 15,
        content:
          '✨ Welcome to Abstract Art!\n\nAbstract art uses shapes, colors, and lines — not realistic pictures. 🎨\n\n**🤔 What is Abstract Art?**\nAbstract art does not try to look like real objects.\nIt expresses **feelings, ideas, and emotions** through:\n- Shapes\n- Colors\n- Lines\n- Textures\n\n**Famous Abstract Artists:**\n\n**🟥 Wassily Kandinsky**\nKandinsky believed colors and shapes could express music and emotions.\nHe was one of the first abstract artists!\n\n**⬛ Piet Mondrian**\nMondrian used grids of black lines with red, blue, and yellow squares.\nSimple but powerful!\n\nFeelings in Colors:\n- Red = energy, excitement 🔴\n- Blue = calm, peace 🔵\n- Yellow = happiness ☀️\n- Black = mystery 🖤\n\n**🎨 Making Your Own Abstract Art:**\n- Choose colors that match a feeling\n- Use shapes and lines freely\n- Don\'t worry about it looking "real"!\n\n**🧠 Fun Fact**\nAbstract art can mean different things to different people!\nThere is no "wrong" answer when you look at abstract art. 🌟',
      },
      {
        title: "Abstract Art",
        order: 7,
        durationMinutes: 12,
        content:
          "📜 Welcome to Art History Timeline!\n\nPeople have created art for thousands of years. 🎨\n\n**🪨 Cave Paintings**\nLong ago, people painted on cave walls.\nThey drew animals and hunting scenes!\n\n**🏛️ Ancient Art**\nAncient people made statues and pottery.\nEgyptian art showed gods and pharaohs. 🏺\n\n**🖼️ Renaissance Art (1400-1600)**\nArtists like Leonardo da Vinci and Michelangelo created masterpieces.\nArt became realistic and detailed.\n\n**🎨 Impressionism (1800s)**\nArtists like Monet painted light and colour effects.\nBrush strokes were loose and expressive.\n\n**💥 Modern Art (1900s onwards)**\nArtists today use many new styles and tools.\nAbstract, digital, and street art are all modern styles!\n\n**🧠 Fun Fact**\nArt helps us learn about history! 🌍\nThe oldest known art is over 40,000 years old.",
      },
      {
        title: "Digital Art",
        order: 8,
        durationMinutes: 10,
        content:
          "📸 Welcome to Photography as Art!\n\nPhotography captures special moments forever. 🌟\n\n**📷 What is Photography?**\nPhotography uses a camera to record images of people, places, and nature.\nA camera captures light to create a picture.\n\n**🌅 Good Lighting**\nLight is the most important part of photography!\nSunlight helps photos look bright and clear.\nGolden hour (sunrise/sunset) gives warm, beautiful light. 🌅\n\n**😊 Creative Techniques**\nPhotographers choose carefully:\n- **Angle** — looking up, down, or sideways changes the feeling\n- **Background** — a simple background makes the subject stand out\n- **Rule of Thirds** — place the subject off-centre for more interest\n\nTypes of Photography:\n- Portrait — photos of people 👤\n- Nature — animals, plants, landscapes 🌿\n- Street — everyday life in cities 🏙️\n- Macro — extremely close-up shots 🔍\n\n**📱 Photography Today**\nEveryone can be a photographer with a smartphone!\nApps can edit and enhance photos.\n\n**🧠 Fun Fact**\nA single photo can tell a whole story! 📖\nThe first photograph ever taken was in 1826 by Joseph Niépce.",
      },
      {
        title: "Collage and Mixed Media",
        order: 9,
        durationMinutes: 10,
        content:
          "🎵 Welcome to Music and Visual Art!\n\nMusic and art both help people express feelings. 🌟\n\n**🎨 Art Shows Emotions**\nArtists use colors and pictures to share ideas and feelings.\nA painting of a storm feels very different from a painting of a sunny day!\n\n**🎶 Music Creates Feelings**\nMusic can sound:\n- Happy 😊 (fast, bright notes)\n- Calm 😌 (slow, soft melodies)\n- Exciting 🚀 (loud, energetic rhythms)\n- Sad 😢 (slow, quiet tones)\n\n**🌈 The Connection**\nMany visual artists are inspired by music!\nKandinsky painted abstract shapes inspired by music he heard.\n\nCollaborative Art:\n- Music videos combine music and visual art 🎬\n- Films use music (soundtrack) to enhance visuals 🎞️\n- Dance combines movement, music, and costume design 💃\n\n**🎸 Famous Examples:**\n- Album artwork is visual art for music 🎵\n- Many animated films match visuals perfectly to music\n\n**🌈 Creativity is Everywhere**\nPeople can enjoy music while drawing or painting!\n\n**🧠 Fun Fact**\nMany artists listen to music while creating art! 🎧",
      },
      {
        title: "Art Critique and Appreciation",
        order: 10,
        durationMinutes: 20,
        content:
          '🌟 Welcome to Art Critique and Appreciation!\n\nNow it\'s your turn to become both an artist and an art expert! 🎨\n\n**🖍️ Create Something Fun**\nYou can make:\n- A drawing ✏️\n- A painting 🖌️\n- A sculpture 🗿\n- A digital artwork 💻\n- A poster or collage\n\n**🌈 Use Your Imagination**\nChoose your favorite colors, shapes, and ideas!\nThink about what feelings or story you want to share.\n\n**🔍 Art Critique — Looking at Art Carefully**\nWhen you look at a piece of art, ask:\n- What do I **see**? (colors, shapes, lines)\n- What do I **feel**? (happy, calm, excited)\n- What do I **think** the artist meant?\n- What do I **wonder** about?\n\n**👍 Giving Feedback**\nWhen sharing opinions about art, be kind and specific:\n"I like how you used blue to show the sky — it feels peaceful." 😊\n\n**😊 Share Your Art**\nShow your artwork to friends and family.\nExplain your choices — why did you pick those colors?\n\n**🧠 Remember**\nEvery artist is unique and special! 🌟\nArt has no single "right" answer — your perspective matters.',
      },
    ],
  },
];

async function seed() {
  console.log("🌱 Seeding database...");

  const existing = await db.select().from(coursesTable).limit(1);
  if (existing.length > 0) {
    console.log(
      "✅ Database already seeded. To re-seed, clear the courses table first.",
    );
    await pool.end();
    return;
  }

  for (const courseData of courses) {
    const { lessons, ...courseFields } = courseData;
    const [course] = await db
      .insert(coursesTable)
      .values({
        ...courseFields,
        totalLessons: lessons.length,
        durationMinutes: lessons.reduce((sum, l) => sum + l.durationMinutes, 0),
      })
      .returning();

    const courseChallengemap = CHALLENGES[courseData.title] ?? {};

    await db.insert(lessonsTable).values(
      lessons.map((l) => ({
        ...l,
        courseId: course.id,
        challenges: courseChallengemap[l.order] ?? null,
      })),
    );

    console.log(`  ✓ ${course.title} — ${lessons.length} lessons seeded`);
  }

  console.log("✅ Seeding complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
