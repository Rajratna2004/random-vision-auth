import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env") });

import { db } from "@workspace/db";
import { coursesTable, lessonsTable } from "@workspace/db";

const courses = [
  {
    title: "Math Adventures",
    description: "Explore the exciting world of mathematics with fun puzzles and interactive experiments!",
    subject: "math",
    gradeLevel: "Grade 3-5",
    thumbnail: "🧮",
    difficulty: "beginner" as const,
    lessons: [
      { title: "Introduction to Addition", content: "Learn the basics of adding numbers together with fun visual examples.", order: 1, durationMinutes: 10 },
      { title: "Subtraction Safari", content: "Go on a safari where you subtract animals and solve fun puzzles.", order: 2, durationMinutes: 10 },
      { title: "Multiplication Magic", content: "Discover the magic of multiplication tables with colorful patterns.", order: 3, durationMinutes: 12 },
      { title: "Division Discovery", content: "Split things equally and discover how division works in everyday life.", order: 4, durationMinutes: 12 },
      { title: "Fractions Fun", content: "Learn about fractions by slicing pizzas and sharing treats!", order: 5, durationMinutes: 15 },
      { title: "Decimals and Percentages", content: "Connect fractions to decimals and learn what percentages mean in real life.", order: 6, durationMinutes: 12 },
      { title: "Geometry Shapes", content: "Explore 2D and 3D shapes and learn about perimeter and area.", order: 7, durationMinutes: 15 },
      { title: "Patterns and Sequences", content: "Find patterns in numbers and predict what comes next in a sequence.", order: 8, durationMinutes: 10 },
      { title: "Time and Measurement", content: "Master telling time and measuring length, weight, and volume.", order: 9, durationMinutes: 12 },
      { title: "Math Challenge Final", content: "Apply everything you learned in a fun, mixed math challenge!", order: 10, durationMinutes: 15 },
    ],
  },
  {
    title: "Science Explorer",
    description: "Discover amazing science concepts through exciting experiments and observations!",
    subject: "science",
    gradeLevel: "Grade 4-6",
    thumbnail: "🔬",
    difficulty: "intermediate" as const,
    lessons: [
      { title: "The Water Cycle", content: "Follow water's incredible journey from ocean to clouds and back again.", order: 1, durationMinutes: 12 },
      { title: "States of Matter", content: "Explore how matter changes between solid, liquid, and gas.", order: 2, durationMinutes: 10 },
      { title: "Plant Life Cycles", content: "Watch how seeds become trees and learn about photosynthesis.", order: 3, durationMinutes: 12 },
      { title: "Animal Habitats", content: "Explore different habitats and the animals that call them home.", order: 4, durationMinutes: 10 },
      { title: "Simple Machines", content: "Discover how levers, pulleys, and wheels make work easier.", order: 5, durationMinutes: 15 },
      { title: "Electricity and Circuits", content: "Learn how electricity flows and build a simple circuit.", order: 6, durationMinutes: 15 },
      { title: "The Solar System", content: "Travel through our solar system and learn about planets and stars.", order: 7, durationMinutes: 12 },
      { title: "Forces and Motion", content: "Explore gravity, friction, and how objects move and stop.", order: 8, durationMinutes: 12 },
      { title: "Human Body Systems", content: "Discover how your heart, lungs, and bones all work together.", order: 9, durationMinutes: 15 },
      { title: "Science Fair Project", content: "Design your own experiment using the scientific method!", order: 10, durationMinutes: 20 },
    ],
  },
  {
    title: "Reading & Writing Stars",
    description: "Build your reading and writing skills with creative stories and interactive activities!",
    subject: "english",
    gradeLevel: "Grade 2-4",
    thumbnail: "📚",
    difficulty: "beginner" as const,
    lessons: [
      { title: "Story Elements", content: "Learn about characters, setting, plot, and theme in stories.", order: 1, durationMinutes: 10 },
      { title: "Reading Comprehension", content: "Practice understanding what you read with fun passages.", order: 2, durationMinutes: 12 },
      { title: "Creative Writing", content: "Let your imagination run wild and write your own short story.", order: 3, durationMinutes: 15 },
      { title: "Grammar Basics", content: "Master nouns, verbs, and adjectives with silly sentences.", order: 4, durationMinutes: 10 },
      { title: "Spelling Strategies", content: "Learn clever tricks to spell tricky words correctly.", order: 5, durationMinutes: 10 },
      { title: "Punctuation Power", content: "Learn how commas, periods, and question marks change meaning.", order: 6, durationMinutes: 10 },
      { title: "Poetry and Rhymes", content: "Explore different types of poems and write your own rhyme.", order: 7, durationMinutes: 12 },
      { title: "Descriptive Writing", content: "Use vivid adjectives and sensory words to paint pictures with words.", order: 8, durationMinutes: 12 },
      { title: "Informational Text", content: "Learn to read and write non-fiction text with facts and details.", order: 9, durationMinutes: 12 },
      { title: "Book Report Challenge", content: "Read a book of your choice and write a complete book report.", order: 10, durationMinutes: 20 },
    ],
  },
  {
    title: "World Geography Quest",
    description: "Travel the world from your classroom and discover amazing countries and cultures!",
    subject: "social-studies",
    gradeLevel: "Grade 5-7",
    thumbnail: "🌍",
    difficulty: "intermediate" as const,
    lessons: [
      { title: "Continents and Oceans", content: "Explore Earth's 7 continents and 5 oceans and their unique features.", order: 1, durationMinutes: 12 },
      { title: "Countries and Capitals", content: "Learn about fascinating countries around the world.", order: 2, durationMinutes: 15 },
      { title: "Cultures and Traditions", content: "Discover amazing cultural traditions from different parts of the world.", order: 3, durationMinutes: 12 },
      { title: "Climate Zones", content: "Learn how climate affects how people live around the world.", order: 4, durationMinutes: 10 },
      { title: "Natural Wonders", content: "Explore Earth's most breathtaking natural wonders.", order: 5, durationMinutes: 12 },
      { title: "Map Reading Skills", content: "Learn to read maps, use compass directions, and understand scale.", order: 6, durationMinutes: 10 },
      { title: "World Economies", content: "Discover how countries trade goods and services with each other.", order: 7, durationMinutes: 12 },
      { title: "Ancient Civilizations", content: "Explore Egypt, Greece, Rome, and other great ancient civilizations.", order: 8, durationMinutes: 15 },
      { title: "Environmental Issues", content: "Learn about deforestation, pollution, and how to protect the planet.", order: 9, durationMinutes: 12 },
      { title: "Global Citizenship", content: "Discover how kids around the world are making a difference!", order: 10, durationMinutes: 12 },
    ],
  },
  {
    title: "Coding for Kids",
    description: "Learn to think like a computer scientist with fun coding challenges and puzzles!",
    subject: "technology",
    gradeLevel: "Grade 4-7",
    thumbnail: "💻",
    difficulty: "beginner" as const,
    lessons: [
      { title: "What is Programming?", content: "Discover what programming is and how computers follow instructions.", order: 1, durationMinutes: 10 },
      { title: "Sequences and Loops", content: "Learn how to create patterns with sequences and loops.", order: 2, durationMinutes: 12 },
      { title: "Conditions and Decisions", content: "Teach your program to make smart decisions with if-then logic.", order: 3, durationMinutes: 12 },
      { title: "Variables and Data", content: "Learn how programs remember information using variables.", order: 4, durationMinutes: 15 },
      { title: "Functions and Reuse", content: "Write reusable blocks of code called functions.", order: 5, durationMinutes: 12 },
      { title: "Lists and Arrays", content: "Store multiple items in a list and process them one by one.", order: 6, durationMinutes: 12 },
      { title: "Debugging Basics", content: "Learn how to find and fix bugs in your programs.", order: 7, durationMinutes: 10 },
      { title: "Introduction to HTML", content: "Build your first webpage using HTML tags.", order: 8, durationMinutes: 15 },
      { title: "Introduction to CSS", content: "Style your webpage with colors, fonts, and layouts.", order: 9, durationMinutes: 15 },
      { title: "Mini Project: Simple Game", content: "Put it all together and create your very own simple game!", order: 10, durationMinutes: 20 },
    ],
  },
  {
    title: "Art & Creativity",
    description: "Unleash your inner artist and learn about famous artworks, colors, and creative expression!",
    subject: "art",
    gradeLevel: "Grade 1-5",
    thumbnail: "🎨",
    difficulty: "beginner" as const,
    lessons: [
      { title: "Colors and Color Mixing", content: "Discover primary, secondary, and complementary colors.", order: 1, durationMinutes: 10 },
      { title: "Famous Artists", content: "Meet incredible artists like Picasso, Van Gogh, and Frida Kahlo.", order: 2, durationMinutes: 12 },
      { title: "Drawing Basics", content: "Learn fundamental drawing techniques with shapes and lines.", order: 3, durationMinutes: 15 },
      { title: "Sculpture and 3D Art", content: "Explore three-dimensional art from ancient to modern times.", order: 4, durationMinutes: 12 },
      { title: "Watercolor Techniques", content: "Learn wet-on-wet and dry brush techniques with watercolors.", order: 5, durationMinutes: 15 },
      { title: "Digital Art Basics", content: "Explore how artists use computers to create digital masterpieces.", order: 6, durationMinutes: 12 },
      { title: "Art History Timeline", content: "Travel through art history from cave paintings to modern art.", order: 7, durationMinutes: 12 },
      { title: "Photography as Art", content: "Learn how photographers use light, angles, and composition.", order: 8, durationMinutes: 10 },
      { title: "Music and Visual Art", content: "Discover how music inspires visual art and vice versa.", order: 9, durationMinutes: 10 },
      { title: "Your Creative Project", content: "Use everything you learned to create your own masterpiece!", order: 10, durationMinutes: 20 },
    ],
  },
];

async function seed() {
  console.log("🌱 Seeding database...");

  const existing = await db.select().from(coursesTable).limit(1);
  if (existing.length > 0) {
    console.log("✅ Database already seeded");
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

    await db.insert(lessonsTable).values(
      lessons.map((l) => ({ ...l, courseId: course.id }))
    );

    console.log(`  ✓ Created course: ${course.title} (${lessons.length} lessons)`);
  }

  console.log("✅ Seeding complete!");
}

seed().catch(console.error).finally(() => process.exit(0));
