-- KidoLearn Complete Seed Data
-- Run this entire script in pgAdmin on the kidolearn database

TRUNCATE TABLE user_progress, sessions, lessons, courses RESTART IDENTITY CASCADE;

INSERT INTO courses (title, description, subject, grade_level, thumbnail, total_lessons, duration_minutes, difficulty) VALUES
('Math Adventures', 'Explore the exciting world of mathematics with fun puzzles and interactive experiments!', 'math', 'Grade 3-5', '🧮', 10, 250, 'beginner'),
('Science Explorer', 'Discover amazing science concepts through exciting experiments and observations!', 'science', 'Grade 4-6', '🔬', 10, 250, 'intermediate'),
('Reading & Writing Stars', 'Build your reading and writing skills with creative stories and interactive activities!', 'english', 'Grade 2-4', '📚', 10, 250, 'beginner'),
('World Geography Quest', 'Travel the world from your classroom and discover amazing countries and cultures!', 'social-studies', 'Grade 5-7', '🌍', 10, 240, 'intermediate'),
('Coding for Kids', 'Learn to think like a computer scientist with fun coding challenges and puzzles!', 'technology', 'Grade 4-7', '💻', 10, 250, 'beginner'),
('Art & Creativity', 'Unleash your inner artist and learn about famous artworks, colors, and creative expression!', 'art', 'Grade 1-5', '🎨', 10, 250, 'beginner');

INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (1, 'Introduction to Addition', 'Addition is the process of combining two or more numbers together to find a total called the **sum**. We use the + sign.

**Key terms:** The numbers being added are **addends**, and the result is the **sum**. Addition is commutative: 3 + 4 = 4 + 3 = 7.

**Real-world example:** You earn 5 gold stars on Monday and 7 on Tuesday. Total: 5 + 7 = 12 gold stars! Use a number line — start at 5 and jump forward 7 to land on 12.', 1, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (1, 'Subtraction Safari', 'Subtraction means taking one number away from another using the − sign. The result is called the **difference**.

**Key idea:** Subtraction is the **opposite** of addition. If 6 + 4 = 10, then 10 − 4 = 6 and 10 − 6 = 4.

**Count Back method:** On a number line, start at the bigger number and jump backwards. For 8 − 3: start at 8, jump left 3 times: 7, 6, 5. So 8 − 3 = 5.', 2, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (1, 'Multiplication Magic', 'Multiplication is fast repeated addition. 3 × 4 = 12 means ''3 groups of 4''. The numbers multiplied are **factors**, and the result is the **product**.

**Times Tables tricks:** Multiply by 10 — add a zero (7 × 10 = 70). Multiply by 5 — answer ends in 0 or 5.

**Arrays:** Draw 3 rows of 4 dots, count all = 12. So 3 × 4 = 12!', 3, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (1, 'Division Discovery', 'Division splits a number into equal groups using the ÷ sign. If 12 cookies are shared among 4 friends, each gets 12 ÷ 4 = 3 cookies.

**Vocabulary:** The **dividend** is the number being divided, the **divisor** is what you divide by, and the **quotient** is the result.

**Check:** Multiply quotient by divisor to verify: 3 × 4 = 12 ✓', 4, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (1, 'Fractions Fun', 'A fraction represents a **part of a whole**. It has a **numerator** (top — how many parts you have) and a **denominator** (bottom — how many equal parts total).

**Example:** Pizza cut into 8 slices, you eat 3 → you ate 3/8.

**Types:** Proper (3/4), Improper (5/3 — more than 1 whole), Mixed (1 and 1/2).

**Equivalent fractions:** 1/2 = 2/4 = 4/8 — all the same amount!', 5, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (1, 'Decimals and Place Value', 'Decimals use a decimal point (.) to separate whole numbers from fractions. For example, 3.7 means 3 wholes and 7 tenths.

**Place value:** In 125.37 — 1 hundred, 2 tens, 5 ones, 3 tenths, 7 hundredths.

**Tip:** Money uses decimals! £2.50 means 2 pounds and 50 hundredths of a pound.', 6, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (1, 'Geometry: Shapes and Angles', 'Geometry studies shapes, sizes and properties. **Angles** measure the turn between two lines at a point (in degrees).

- **Right angle:** 90° (corner of a book)
- **Acute angle:** less than 90° (sharp)
- **Obtuse angle:** 90° to 180° (wide)
- **Straight angle:** 180°

**Shapes:** Triangle=3 sides, Square=4 equal, Pentagon=5, Hexagon=6, Octagon=8.', 7, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (1, 'Measurement: Length and Weight', '**Length units:** 10mm=1cm, 100cm=1m, 1000m=1km.

**Weight units:** 1000g=1kg, 1000kg=1 tonne.

**Converting:** Multiply to go from larger to smaller units. Divide to go from smaller to larger. Example: 3km = 3 × 1000 = 3000m.', 8, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (1, 'Time and Money', '**Reading Time:** A clock has a short **hour hand** and a long **minute hand**. 60 minutes = 1 full turn.

**24-hour clock:** 3pm = 15:00 (add 12 for afternoon hours).

**Money:** 100 pence (p) = £1. Calculate **change**: £5.00 − £3.75 = £1.25.', 9, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (1, 'Problem Solving Strategies', 'Problem solving strategies for maths:

1. **Understand** — What do you know? What are you finding?
2. **Draw a diagram** — Sketch it out
3. **Make it simpler** — Try smaller numbers first
4. **Look for patterns** — Does a sequence repeat?
5. **Work backwards** — Start from the answer
6. **Check** — Does it make sense?

**Example:** Tom has twice as many marbles as Sam. Together they have 18. Sam = x, Tom = 2x. 3x=18, x=6. Tom has 12.', 10, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (2, 'The Water Cycle', 'The water cycle describes how water continuously moves around Earth through four stages: **evaporation**, **condensation**, **precipitation**, and **collection**.

**Evaporation:** Sun''s heat turns water in oceans and lakes into water vapour rising into the atmosphere.

**Condensation:** Water vapour rises and cools, forming tiny droplets that make clouds.

**Precipitation:** Cloud droplets join and fall as rain, snow, sleet, or hail.

**Collection:** Water collects in rivers, lakes, and oceans, and the cycle begins again!', 1, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (2, 'States of Matter', 'Everything is made of **matter**, which exists in three states: **solid**, **liquid**, and **gas**.

**Solid:** Particles tightly packed. Fixed shape and volume. Example: ice, rock.

**Liquid:** Particles close but can move. Fixed volume, takes shape of container. Example: water, milk.

**Gas:** Particles far apart, move freely. No fixed shape or volume. Example: air, steam.

**Changing states:** Melting (solid→liquid), Evaporation (liquid→gas), Condensation (gas→liquid), Freezing (liquid→solid).', 2, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (2, 'Plant Life Cycles', 'Plants grow and reproduce through a life cycle: **seed → germination → seedling → adult plant → flower → fruit/seed**.

**Germination:** Given water, warmth, and air, the seed''s root grows downward and shoot grows upward.

**Photosynthesis:** Plants make food using sunlight + water + CO2. **Chlorophyll** (green pigment) captures light energy.

**Pollination:** Flowers attract insects or use wind to transfer pollen and fertilize the plant.

**Dispersal:** Seeds spread by wind, animals, water, or explosion.', 3, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (2, 'Animal Habitats', 'A **habitat** is the natural environment where an animal lives. Animals are perfectly **adapted** to their habitats.

**Major habitats:**
- **Rainforest:** Hot and wet. Animals: toucans, jaguars, tree frogs.
- **Desert:** Very dry. Animals: camels, scorpions.
- **Ocean:** Covers 71% of Earth. Animals: whales, sharks.
- **Arctic:** Extremely cold. Animals: polar bears, penguins.
- **Grassland:** Warm seasonal rain. Animals: lions, elephants.

**Adaptations:** Polar bear''s thick fur, camel''s fat-storing hump, fish''s gills — all adaptations.', 4, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (2, 'Simple Machines', 'Simple machines make work easier by changing the size or direction of a force. The six types are: **lever**, **wheel and axle**, **pulley**, **inclined plane**, **wedge**, and **screw**.

**Lever:** Rigid bar pivoting on a fulcrum. Examples: seesaw, scissors, crowbar.

**Pulley:** Wheel with rope — redirects force. Examples: flagpole, cranes.

**Inclined Plane:** Sloping surface reducing force to lift objects. Example: ramp.', 5, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (2, 'The Solar System', 'Our **Solar System** has the Sun at its centre with 8 planets, dwarf planets, moons, asteroids, and comets.

**Planets in order from the Sun:** Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.

**Mnemonic:** My Very Educated Mother Just Served Us Nachos

**Key facts:** Jupiter is the largest. Saturn has beautiful rings. Venus is the hottest. A year = one orbit around the Sun (Earth = 365.25 days).', 6, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (2, 'Electricity and Circuits', '**Electricity** is the flow of electrons through a material, called **electric current**.

For electricity to flow, it needs a **complete, unbroken circuit** containing:
- A **power source** (battery)
- **Wires** to carry current
- A **component** (bulb, buzzer)
- A **switch**

**Conductors** (copper, iron) allow electricity to flow. **Insulators** (rubber, plastic) do not.

**Series circuit:** One loop — if one component breaks, all stop. **Parallel circuit:** Multiple loops — if one breaks, others still work.', 7, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (2, 'Forces and Motion', 'A **force** is a push or pull that changes an object''s speed, direction, or shape. Forces are measured in **Newtons (N)**.

**Key forces:**
- **Gravity:** Pulls objects toward Earth''s centre
- **Friction:** Opposes motion between surfaces
- **Air resistance:** Friction with air molecules
- **Buoyancy:** Upward force from fluids

**Newton''s Laws:** Objects stay still or move steadily unless a force acts. Bigger force = greater acceleration. Every action has an equal and opposite reaction.', 8, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (2, 'Living vs Non-Living Things', 'Scientists classify everything as **living** or **non-living** based on seven characteristics: **MRS GREN**.

- **M** — Movement (plants grow toward light)
- **R** — Respiration (releasing energy from food)
- **S** — Sensitivity (responding to environment)
- **G** — Growth
- **R** — Reproduction
- **E** — Excretion (removing waste)
- **N** — Nutrition (obtaining energy)

Fire moves and consumes fuel but cannot reproduce — it''s a chemical reaction, not life!', 9, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (2, 'Ecosystems and Food Chains', 'An **ecosystem** is a community of organisms interacting with each other and their environment.

**Food chains** show energy flow:
- **Producers:** Plants that make food via photosynthesis
- **Primary consumers:** Herbivores (e.g., rabbit eats grass)
- **Secondary consumers:** Animals that eat herbivores (e.g., fox eats rabbit)
- **Decomposers:** Fungi and bacteria that break down dead matter

**Example:** Grass → Rabbit → Fox → Eagle

**Food webs** show multiple overlapping food chains in an ecosystem.', 10, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (3, 'Story Elements', 'Every great story has five key elements: **character**, **setting**, **plot**, **conflict**, and **theme**.

**Character:** The people (or animals/objects) in the story. The main character is the **protagonist**. The troublemaker is the **antagonist**.

**Setting:** Where and when the story takes place.

**Plot:** The sequence of events: Beginning → Rising Action → Climax → Falling Action → Resolution.

**Conflict:** The main problem (character vs character, character vs nature, character vs self).

**Theme:** The central message or lesson (friendship, courage, honesty).', 1, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (3, 'Reading Comprehension', 'Reading comprehension means understanding what you read — not just decoding words, but making sense of meaning and ideas.

**Key strategies:**
1. **Preview:** Look at titles, headings, images before reading
2. **Predict:** What will the text be about?
3. **Visualise:** Create a mental picture
4. **Question:** Who? What? Where? When? Why? How?
5. **Summarise:** Retell main points in your own words
6. **Infer:** Read between the lines!

**Question types:** Literal (directly in text), Inferential (using clues), Evaluative (your opinion).', 2, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (3, 'Creative Writing', 'Creative writing uses imagination and language to tell stories or express ideas. Great writers use:

**Show, don''t tell:** Instead of ''She was scared'', write ''Her hands trembled and she pressed herself against the wall.''

**Descriptive techniques:**
- **Simile:** Comparison using ''like'' or ''as''. ''Her eyes were like stars.''
- **Metaphor:** Direct comparison. ''He is a lion in battle.''
- **Personification:** Human qualities to objects. ''The wind whispered through the trees.''
- **Onomatopoeia:** Words that sound like what they describe. ''The bee buzzed.''', 3, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (3, 'Grammar Basics', 'Grammar is the set of rules governing how we structure language.

**Parts of speech:**
- **Noun:** A person, place, thing, or idea (dog, city, happiness)
- **Pronoun:** Replaces a noun (he, she, it, they)
- **Verb:** An action or state (run, think, is)
- **Adjective:** Describes a noun (tall, blue)
- **Adverb:** Modifies a verb or adjective (quickly, very)
- **Preposition:** Shows relationship (in, on, under)
- **Conjunction:** Joins clauses (and, but, because)

**Sentence types:** Simple, Compound (two joined by conjunction), Complex (independent + dependent clause).', 4, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (3, 'Spelling Strategies', 'Good spelling requires understanding patterns and rules:

**Look-Cover-Write-Check (LCWC):** The most effective method.

**Phonics:** Sound out syllables. ''Elephant'' = el-e-phant (3 syllables).

**Common rules:**
- **i before e except after c:** believe, receive (exceptions: weird, science)
- **Silent letters:** know (k), write (w), lamb (b)
- **Doubling rule:** Adding -ing to short vowel words doubles the final consonant: run → running
- **Plurals:** Add -s (cats), or -es for -ch, -sh, -x endings (churches)', 5, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (3, 'Punctuation Power', 'Punctuation marks organise written language and make meaning clear.

**Key marks:**
- **Full stop (.)** — ends a statement
- **Question mark (?)** — ends a question
- **Exclamation mark (!)** — shows strong emotion
- **Comma (,)** — short pause; separates list items; joins clauses
- **Apostrophe ('')** — possession (Tom''s book) or contraction (don''t = do not)
- **Inverted commas (''...'')** — marks direct speech
- **Colon (:)** — introduces a list
- **Semicolon (;)** — joins two related clauses', 6, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (3, 'Synonyms and Antonyms', 'Expanding vocabulary makes writing more interesting and precise.

**Synonyms** are words with the same or similar meaning. Instead of always using ''said'', try: whispered, shouted, muttered, exclaimed, replied.

**Antonyms** are words with opposite meanings:
hot vs cold | happy vs sad | fast vs slow | ancient vs modern

**Word families:** Related words sharing a root: create, creator, creative, creation.

**Tip:** Using precise words is more powerful than vague ones. ''Delicious'' is better than ''good''!', 7, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (3, 'Poetry and Rhymes', 'Poetry uses language in concentrated, musical, and imaginative ways. It often uses **rhyme**, **rhythm**, and **imagery**.

**Rhyme scheme:** Shown with letters. ABAB = alternating rhyme. AABB = couplets.

**Rhythm:** The pattern of stressed and unstressed syllables — the ''beat''. Try clapping as you read!

**Types of poems:**
- **Haiku:** 3 lines, 5-7-5 syllables, about nature
- **Sonnet:** 14 lines (Shakespeare!)
- **Limerick:** 5 lines, AABBA, humorous
- **Free verse:** No fixed rhyme or rhythm', 8, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (3, 'Report Writing', 'A report is a non-fiction text presenting information clearly and objectively.

**Structure:**
1. **Title** — Clear and specific
2. **Introduction** — What is this report about?
3. **Body paragraphs** — Each covers one aspect
4. **Conclusion** — Summary of key points

**Key features:**
- Third person (it, they, the animal)
- Present tense (Lions live in Africa)
- Factual language — no personal opinions
- Technical vocabulary
- Headings and subheadings', 9, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (3, 'Book Review Writing', 'A **book review** describes a book and gives an informed opinion backed by evidence from the text.

**Structure:**
1. **Title and author**
2. **Summary** — Brief plot overview (no spoilers!)
3. **What you liked** — Specific examples with reasons
4. **What could be better** — Constructive criticism
5. **Rating and recommendation**

**Key skills:** Use evaluative language (''I particularly enjoyed...'', ''The author effectively...''). Give evidence. Be balanced.', 10, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (4, 'Continents and Oceans', 'The Earth''s surface is divided into **7 continents** and **5 oceans**.

**7 Continents:** Africa, Antarctica, Asia, Australia (Oceania), Europe, North America, South America.
(Memory trick: All Awesome Animals Are Always At School)

**5 Oceans (largest to smallest):** Pacific, Atlantic, Indian, Southern, Arctic.

**Key facts:** Asia is the largest continent. The Pacific Ocean covers 30% of Earth''s surface. Antarctica has 90% of Earth''s ice.', 1, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (4, 'Countries and Capitals', 'There are **195 countries** in the world, each with a capital city.

**Key capitals:**
- UK: London | France: Paris | Germany: Berlin | Spain: Madrid
- USA: Washington D.C. | Canada: Ottawa | Brazil: Brasilia | China: Beijing
- Japan: Tokyo | India: New Delhi | Australia: Canberra | Russia: Moscow

**Interesting facts:** Australia''s capital is Canberra (NOT Sydney). Brazil moved its capital from Rio de Janeiro to Brasilia in 1960. Washington D.C. is NOT a state — D.C. stands for District of Columbia.', 2, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (4, 'Cultures and Traditions', '**Culture** refers to the shared beliefs, values, customs, arts, and way of life of a group of people.

**Elements of culture:**
- **Language:** Over 7,000 languages spoken worldwide
- **Food:** Rice is the staple in Asia; pasta in Italy; injera bread in Ethiopia
- **Festivals:** Diwali (India), Eid (Islamic world), Chinese New Year, Christmas
- **Music and Art:** Indian classical dance, African drumming, European opera
- **Religion:** Christianity, Islam, Hinduism, Buddhism, Judaism

**Cultural respect:** Learning about other cultures promotes understanding and reduces prejudice.', 3, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (4, 'Climate Zones', '**Climate** is the long-term pattern of weather in a region. Major climate zones:

1. **Tropical:** Hot and wet all year. Near equator. Example: Amazon rainforest.
2. **Desert (Arid):** Very dry. Example: Sahara.
3. **Mediterranean:** Hot dry summers, mild wet winters. Example: Southern Europe.
4. **Temperate:** Moderate, four seasons. Example: UK.
5. **Continental:** Very hot summers, very cold winters. Example: Russia.
6. **Polar:** Extremely cold year-round. Example: Arctic.
7. **Highland:** Gets colder with altitude. Example: Alps.', 4, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (4, 'Natural Wonders', 'Earth is home to breathtaking **natural wonders** — remarkable features formed by nature.

**Key wonders:**
- **Grand Canyon (USA):** 446km long, 1.6km deep. Carved by the Colorado River.
- **Amazon River (South America):** World''s largest river by volume.
- **Sahara Desert (Africa):** World''s largest hot desert, 9.2 million km2.
- **Himalayas (Asia):** Highest mountain range. Mount Everest = 8,849m.
- **Great Barrier Reef (Australia):** World''s largest coral reef system.
- **Aurora Borealis:** Light displays near the poles from solar particles.
- **Victoria Falls (Africa):** World''s largest waterfall by combined size.', 5, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (4, 'Maps and Globes', 'Maps and globes help us understand Earth''s geography. A **globe** is a 3D model. A **map** is a flat, 2D representation.

**Coordinate system:**
- **Latitude:** Horizontal lines. 0° = Equator. North Pole = 90°N.
- **Longitude:** Vertical lines. 0° = Prime Meridian (Greenwich, London).
- A location is given as latitude, longitude: London = 51°N, 0°W.

**Map features:** Scale (real distance), Key/Legend (symbols), Compass rose (directions), Contour lines (elevation).', 6, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (4, 'Population and Cities', 'The world''s population reached **8 billion** in 2022. **Population density** = number of people divided by area.

**World''s most populated cities:**
1. Tokyo, Japan (~37 million)
2. Delhi, India (~33 million)
3. Shanghai, China (~27 million)
4. Sao Paulo, Brazil (~22 million)

**Urbanisation:** The process of people moving from rural to urban areas. Over 55% of the world now lives in cities.

Monaco has the world''s highest population density (26,000 people/km2).', 7, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (4, 'Natural Resources', '**Natural resources** are materials from nature that humans use. They are **renewable** or **non-renewable**.

**Renewable resources:** Replenished naturally:
- Solar energy, wind energy, hydroelectric power
- Timber (if replanted), fish (if not overfished)

**Non-renewable resources:** Formed over millions of years — will eventually run out:
- Fossil fuels: coal, oil, natural gas
- Minerals: iron, copper, gold, diamonds

**Key issue:** Fossil fuels release CO2 when burned, contributing to climate change. The world is transitioning to renewable energy.', 8, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (4, 'Transport and Trade', '**Trade** is the buying and selling of goods and services between countries.

**Imports:** Goods/services a country buys from other countries.
**Exports:** Goods/services a country sells to other countries.

**Transport methods:**
- **Sea freight:** Cheapest for large/heavy goods (container ships carry 90% of world trade)
- **Air freight:** Fastest but most expensive — for high-value, time-sensitive goods
- **Road/rail:** Connects countries within continents

The **Silk Road** was an ancient trade route connecting Asia and Europe.', 9, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (4, 'Environmental Issues', 'Our planet faces serious environmental challenges caused by human activities.

**Climate Change:** Burning fossil fuels releases greenhouse gases (CO2, methane) trapping heat. Effects: melting ice caps, rising sea levels, extreme weather.

**Deforestation:** Clearing forests destroys habitats, reduces biodiversity, and releases stored carbon.

**Plastic Pollution:** Millions of tonnes of plastic enter oceans annually, harming marine life.

**Solutions:** Renewable energy, recycling, conservation, sustainable farming.

**The 3 Rs:** Reduce (use less), Reuse (use again), Recycle (convert into new materials).', 10, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (5, 'What is Programming?', '**Programming** (or coding) is the process of giving a computer instructions to perform a task. These instructions are written in a **programming language**.

Computers can only do what they are told — they follow instructions precisely. If there is a mistake, called a **bug**, the program won''t work correctly.

**Algorithms** are step-by-step instructions for solving a problem. Think of a recipe — it tells you exactly what to do in what order.

Popular languages include Python, JavaScript, Scratch, Java, and C++.', 1, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (5, 'Sequences and Loops', '**Sequences** are the foundation of all programs — instructions executed one after another, in order.

**Loops** repeat instructions without writing them multiple times!

**Types of loops:**
- **Count-controlled (for loop):** Repeats a set number of times.
  Example: `for i in range(5): print(''Hello'')` — prints 5 times
- **Condition-controlled (while loop):** Repeats while a condition is true.
  Example: `while lives > 0:` — game keeps running while player has lives

**Vocabulary:** Iteration = one cycle of the loop. Infinite loop = a loop that never stops (usually a bug!).', 2, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (5, 'Conditions and Decisions', 'Programs make **decisions** based on different situations using **conditional statements** (if/else).

**If statement:** Checks a condition. If TRUE, runs a block of code.

**If-else statement:** Two paths — one if TRUE, another if FALSE.

**If-elif-else:** Multiple conditions checked in sequence.

**Comparison operators:** == (equal), != (not equal), > (greater), < (less), >= (greater or equal), <= (less or equal)

**Boolean values:** True or False — the result of any comparison.', 3, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (5, 'Variables and Data', 'A **variable** is like a labelled box that stores a value in a computer''s memory.

**Python variable examples:**
```
name = ''Alice''    # string (text)
age = 10          # integer (whole number)
price = 2.99      # float (decimal)
is_happy = True   # boolean
```

**Data types:**
- **String (str):** Text in quotes — ''Hello'', ''apple''
- **Integer (int):** Whole numbers — 42, -7, 0
- **Float:** Decimal numbers — 3.14, 0.5
- **Boolean (bool):** True or False
- **List:** A collection — [1, 2, 3, ''cat'']', 4, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (5, 'Functions and Procedures', 'A **function** is a named block of reusable code that performs a specific task. Instead of repeating code, write it once as a function and call it whenever needed.

**Python function syntax:**
```
def greet(name):
    print(''Hello, '' + name + ''!'')

greet(''Alice'')  # Calling the function
```

**Key terms:**
- **Define:** Writing the function (def keyword)
- **Call:** Running the function
- **Parameter:** Variable in the function definition
- **Argument:** Actual value passed when calling
- **Return value:** What the function sends back (using return)

**DRY Principle:** Don''t Repeat Yourself!', 5, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (5, 'Debugging and Testing', '**Debugging** is finding and fixing errors (bugs) in code. Even professional programmers spend significant time debugging!

**Types of errors:**
1. **Syntax errors:** Breaking the language''s rules. Python can''t run the code.
2. **Runtime errors:** Code is syntactically correct but crashes while running (e.g., dividing by zero).
3. **Logic errors:** Code runs but produces the wrong output. The hardest to find!

**Debugging strategies:**
- Print values at key points to see what''s happening
- Check one small section at a time
- Use a debugger tool
- Explain your code out loud (rubber duck debugging!)', 6, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (5, 'Lists and Arrays', 'A **list** (called an **array** in many languages) stores multiple values in a single variable, in order.

**Python list example:**
```
fruits = [''apple'', ''banana'', ''cherry'']
print(fruits[0])  # apple (index 0!)
print(fruits[2])  # cherry
```

**Key concepts:**
- **Index:** Position of an item (starts at 0!)
- **Length:** Total items (use len() in Python)

**Common operations:**
- fruits.append(''mango'') — adds to end
- fruits.remove(''banana'') — removes item
- for fruit in fruits: print(fruit) — loops through', 7, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (5, 'Events and User Interaction', '**Events** are actions that happen in a program, triggered by the user or system. Programs **listen** for events and **respond**.

**Common events:** Mouse click, key press, timer, page load, touch/swipe.

**Event-driven programming:** The program waits for events and reacts. Most apps and games are event-driven.

**In Scratch:** ''When green flag clicked'', ''When space key pressed'' are event blocks.

**In JavaScript:**
```
button.addEventListener(''click'', function() {
    alert(''Button clicked!'');
});
```

**User Interface (UI):** The visual part users interact with — buttons, text boxes, menus.', 8, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (5, 'Creating Simple Games', 'Games teach core programming concepts through fun creation!

**Core game concepts:**
- **Game loop:** Continuous cycle updating the game state and redrawing the screen (30-60 times per second)
- **Score:** A variable increasing when the player succeeds
- **Lives/Health:** Variables decremented when the player fails
- **Collision detection:** Checking if two objects are touching
- **Level progression:** Increasing difficulty as the player advances

**Simple game structure:**
1. Set up variables (score=0, lives=3)
2. Start the game loop
3. Handle user input
4. Update game state
5. Draw everything
6. Repeat from step 3', 9, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (5, 'Web Basics: HTML and CSS', 'The web is built with three core technologies: **HTML**, **CSS**, and **JavaScript**.

**HTML (HyperText Markup Language):** Defines the **structure and content** using tags.
```
<h1>Hello World!</h1>
<p>This is a paragraph.</p>
<a href=''https://google.com''>Click me</a>
```

**CSS (Cascading Style Sheets):** Controls the **appearance**.
```
h1 { color: blue; font-size: 32px; }
```

**Tags:** HTML elements use opening and closing tags: `<tag>content</tag>`.

**Key HTML tags:** h1-h6 (headings), p (paragraph), div (container), ul/li (lists), img (image), a (link).', 10, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (6, 'Colours and Colour Mixing', '**Colour theory** helps artists understand how colours work together.

**Primary colours:** Red, Yellow, Blue — cannot be made by mixing other colours.

**Secondary colours:** Mix two primaries:
- Red + Yellow = Orange
- Yellow + Blue = Green
- Red + Blue = Violet

**Colour properties:**
- **Hue:** The colour itself
- **Tint:** Hue + White (lighter)
- **Shade:** Hue + Black (darker)

**Warm vs Cool:** Red/orange/yellow = warm. Blue/green/violet = cool.

**Digital screens** use RGB (Red, Green, Blue) — additive mixing.', 1, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (6, 'Famous Artists', 'Art history is filled with brilliant artists who changed how we see the world.

**Leonardo da Vinci (1452-1519):** Renaissance genius. Painted the Mona Lisa and The Last Supper. Also an inventor and scientist.

**Vincent van Gogh (1853-1890):** Dutch Post-Impressionist. Painted The Starry Night using thick, swirling brushstrokes.

**Pablo Picasso (1881-1973):** Spanish artist. Co-founder of Cubism — breaking objects into geometric shapes.

**Claude Monet (1840-1926):** French Impressionist. Famous for his Water Lilies series — capturing light and colour.

**Frida Kahlo (1907-1954):** Mexican artist. Known for self-portraits exploring identity, pain, and culture.', 2, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (6, 'Drawing Basics', 'Drawing is a fundamental art skill. Learning to observe carefully and represent what you see on paper is both a discipline and a joy.

**Basic drawing elements:**
- **Line:** The foundation of all drawing
- **Shape:** 2D areas formed by lines
- **Form:** 3D appearance created through shading
- **Texture:** Appearance of surface quality
- **Value:** The range from light to dark

**Shading techniques:**
- **Hatching:** Parallel lines
- **Cross-hatching:** Overlapping sets of parallel lines
- **Blending:** Smoothing graphite or charcoal
- **Stippling:** Tiny dots to create tone

**Proportion:** Getting relative sizes correct.', 3, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (6, 'Sculpture and 3D Art', '**Sculpture** is three-dimensional art — it has height, width, and depth, and can be walked around.

**Sculptural methods:**
- **Additive:** Building up material (clay modelling, papier-mache)
- **Subtractive:** Removing material (carving wood or stone)
- **Constructive:** Assembling pieces (welding metal, building a mobile)
- **Casting:** Pouring liquid into a mould (bronze casting)

**Famous sculptures:**
- Michelangelo''s David (marble, 1501-04)
- The Thinker by Rodin (bronze)
- Moai statues (Easter Island, stone)

**Relief sculpture:** Raised or sunken design on a flat surface (e.g., coins).', 4, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (6, 'Perspective and Depth', '**Perspective** creates the illusion of depth (3D space) on a flat surface. Objects appear smaller as they get further away.

**One-point perspective:** All parallel lines converge at a single **vanishing point** on the **horizon line**. Used for scenes viewed straight on.

**Two-point perspective:** Uses two vanishing points. Used for corner views of buildings.

**Atmospheric perspective:** Distant objects appear lighter, cooler in colour, and less detailed.

**Rules of depth:**
- Closer = larger, lower, more detailed, warmer colours
- Further = smaller, higher, less detailed, cooler/lighter colours', 5, 25);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (6, 'Watercolour Techniques', '**Watercolour** is a transparent painting medium where pigment is mixed with water. The white of the paper provides highlights.

**Key techniques:**
- **Wet-on-wet:** Apply wet paint to wet paper — soft, blended effects. Great for skies.
- **Wet-on-dry:** Apply wet paint to dry paper — crisp, sharp edges. Good for details.
- **Wash:** Diluted, even layer over a large area.
- **Glazing:** Transparent layer over dried paint to deepen colour.
- **Lifting:** Removing wet paint with a dry brush or tissue for highlights.
- **Salt technique:** Sprinkling salt on wet paint creates interesting texture.', 6, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (6, 'Abstract Art', '**Abstract art** doesn''t represent the real world literally — it uses shapes, colours, lines, and textures to express ideas or emotions.

**History:** Abstract art emerged in the early 20th century as artists moved away from realistic depiction.

**Key movements:**
- **Abstract Expressionism:** Large-scale, emotional paintings. Jackson Pollock (drip painting), Mark Rothko (colour fields).
- **Cubism (semi-abstract):** Picasso — multiple perspectives simultaneously.
- **Geometric Abstraction:** Mondrian — only vertical/horizontal lines and primary colours.

**Viewing abstract art:** Ask ''How does this make me feel?'' rather than ''What does it look like?''', 7, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (6, 'Digital Art', '**Digital art** is artwork created or modified using digital technology — computers, tablets, and smartphones.

**Types of digital art:**
- **Digital painting/drawing:** Using a stylus on a tablet (Procreate, Photoshop)
- **Photo manipulation:** Editing photographs (Photoshop, Lightroom)
- **3D modelling:** Creating 3D objects (Blender, Maya)
- **Animation:** Making things move (After Effects)
- **Generative art:** Code creates artwork algorithmically

**Key terms:**
- **Pixel:** Smallest unit of a digital image
- **Resolution:** Pixel density (higher = sharper)
- **Layers:** Separate, stackable surfaces

**Advantages:** Undo button! Layers. No mess. Infinite colour palette.', 8, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (6, 'Collage and Mixed Media', '**Collage** is the art of assembling cut or torn pieces of different materials (paper, fabric, photographs) onto a surface. The word comes from the French ''coller'' (to glue).

**History:** Collage was pioneered by Picasso and Braque around 1912, as part of Cubism.

**Mixed media** combines two or more different art materials or techniques:
- Drawing + watercolour
- Photography + painting
- Sculpture + textile

**Materials for collage:** Magazines, newspapers, photos, fabric, ribbon, natural materials, tissue paper.

**Composition principles:** Balance, contrast, visual hierarchy, and unity.', 9, 20);
INSERT INTO lessons (course_id, title, content, "order", duration_minutes) VALUES (6, 'Art Critique and Appreciation', '**Art critique** is the process of thoughtfully analysing and evaluating artwork. We use the **DEER framework**:

**D — Describe:** What do you literally see? List elements — colours, shapes, figures, lines.

**E — Elements and Principles:** Identify formal elements (line, colour, shape, texture, value) and principles (balance, contrast, rhythm, emphasis).

**E — Explain/Interpret:** What might this mean? What mood does it convey?

**R — Respond/Evaluate:** What is your informed opinion? What makes this artwork significant?

Remember: there is rarely one ''right'' interpretation. Your evidence-based view is valid!', 10, 20);
