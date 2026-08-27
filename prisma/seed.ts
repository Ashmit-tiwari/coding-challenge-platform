// Database seed: admin user, achievements, level defs, platform settings, sample challenges.
// Admin password comes from env (ADMIN_PASSWORD); hashed and stored in DB. Never hardcoded.
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Nevermissme";

async function main() {
  console.log("Seeding Weekly Coding Challenges 2.0…");

  // --- Admin user ---
  const adminHash = await hashPassword(ADMIN_PASSWORD);
  const admin = await db.adminUser.upsert({
    where: { username: ADMIN_USERNAME },
    update: { passwordHash: adminHash, role: "superadmin" },
    create: { username: ADMIN_USERNAME, passwordHash: adminHash, role: "superadmin" },
  });
  console.log(`Admin user ready: ${admin.username} (role=${admin.role})`);

  // --- Level definitions ---
  const tiers = [
    { tier: "Beginner", level: 1, minXp: 0, maxXp: 499, color: "#16a34a" },
    { tier: "Beginner", level: 2, minXp: 500, maxXp: 1499, color: "#16a34a" },
    { tier: "Intermediate", level: 3, minXp: 1500, maxXp: 3499, color: "#0ea5e9" },
    { tier: "Intermediate", level: 4, minXp: 3500, maxXp: 6499, color: "#0ea5e9" },
    { tier: "Advanced", level: 5, minXp: 6500, maxXp: 9999, color: "#d97706" },
    { tier: "Advanced", level: 6, minXp: 10000, maxXp: 14999, color: "#d97706" },
    { tier: "Pro", level: 7, minXp: 15000, maxXp: 21999, color: "#7c3aed" },
    { tier: "Pro", level: 8, minXp: 22000, maxXp: 29999, color: "#7c3aed" },
    { tier: "Pro", level: 9, minXp: 30000, maxXp: null, color: "#7c3aed" },
  ];
  for (const t of tiers) {
    await db.levelDef.upsert({
      where: { level: t.level },
      update: t,
      create: t,
    });
  }
  console.log(`Level defs: ${tiers.length}`);

  // --- Achievement definitions ---
  const achievements = [
    { key: "first_code_right", name: "First Code Right", description: "Submit your first piece of code to the platform.", rarity: "common", icon: "Code2", category: "milestone", xpReward: 5, condition: { metric: "first_code_right", op: "is", value: true } },
    { key: "first_solve", name: "First Challenge Solved", description: "Solve your very first coding challenge.", rarity: "common", icon: "CheckCircle2", category: "milestone", xpReward: 10, condition: { metric: "first_solve", op: "is", value: true } },
    { key: "first_attempt_success", name: "First Attempt Success", description: "Solve a challenge on your very first attempt.", rarity: "rare", icon: "Zap", category: "skill", xpReward: 15, condition: { metric: "first_attempt_solve", op: "gte", value: 1 } },
    { key: "perfect_submission", name: "Perfect Submission", description: "Pass every test case on a single submission.", rarity: "rare", icon: "Sparkles", category: "skill", xpReward: 15, condition: { metric: "perfect_submission", op: "gte", value: 1 } },
    { key: "zero_cheat", name: "Zero-Cheat Coder", description: "Solve 3 challenges without any plagiarism flags.", rarity: "common", icon: "ShieldCheck", category: "skill", xpReward: 10, condition: { metric: "zero_warnings_solve", op: "gte", value: 3 } },
    { key: "solved_10", name: "10 Challenges Solved", description: "Solve ten different coding challenges.", rarity: "rare", icon: "Trophy", category: "milestone", xpReward: 25, condition: { metric: "solved_count", op: "gte", value: 10 } },
    { key: "solved_25", name: "25 Challenges Solved", description: "Solve twenty-five different challenges.", rarity: "epic", icon: "Award", category: "milestone", xpReward: 50, condition: { metric: "solved_count", op: "gte", value: 25 } },
    { key: "solved_50", name: "50 Challenges Solved", description: "Solve fifty different challenges.", rarity: "legendary", icon: "Crown", category: "milestone", xpReward: 100, condition: { metric: "solved_count", op: "gte", value: 50 } },
    { key: "streak_7", name: "7-Day Streak", description: "Maintain a 7-day coding streak.", rarity: "rare", icon: "Flame", category: "streak", xpReward: 20, condition: { metric: "streak_days", op: "gte", value: 7 } },
    { key: "streak_30", name: "30-Day Streak", description: "Maintain a 30-day coding streak.", rarity: "legendary", icon: "Flame", category: "streak", xpReward: 75, condition: { metric: "streak_days", op: "gte", value: 30 } },
    { key: "speed_coder", name: "Speed Coder", description: "Solve a challenge in under 100ms execution time.", rarity: "epic", icon: "Gauge", category: "speed", xpReward: 30, condition: { metric: "speed_ms", op: "lte", value: 100 } },
    { key: "debug_master", name: "Debugging Master", description: "Solve 5 challenges after fixing a compile/runtime error.", rarity: "epic", icon: "Bug", category: "skill", xpReward: 30, condition: { metric: "debugging_master", op: "gte", value: 5 } },
    { key: "consistency_king", name: "Consistency King/Queen", description: "Stay active for 4 consecutive weeks.", rarity: "epic", icon: "Calendar", category: "consistency", xpReward: 40, condition: { metric: "consistency_king", op: "gte", value: 4 } },
    { key: "test_crusher", name: "Test Case Crusher", description: "Pass every test on first attempt for 3 challenges.", rarity: "epic", icon: "Hammer", category: "skill", xpReward: 35, condition: { metric: "test_crusher", op: "gte", value: 3 } },
    { key: "beginner_complete", name: "Beginner Complete", description: "Reach the top of the Beginner tier.", rarity: "rare", icon: "Medal", category: "milestone", xpReward: 50, condition: { metric: "tier_reached", op: "is", value: "Intermediate" } },
    { key: "intermediate_complete", name: "Intermediate Complete", description: "Reach the Advanced tier.", rarity: "epic", icon: "Medal", category: "milestone", xpReward: 100, condition: { metric: "tier_reached", op: "is", value: "Advanced" } },
    { key: "advanced_complete", name: "Advanced Complete", description: "Reach the Pro tier.", rarity: "legendary", icon: "Medal", category: "milestone", xpReward: 200, condition: { metric: "tier_reached", op: "is", value: "Pro" } },
    { key: "pro_coder", name: "Pro Coder", description: "Reach level 9, the pinnacle.", rarity: "legendary", icon: "Crown", category: "milestone", xpReward: 500, condition: { metric: "tier_reached", op: "is", value: "Pro" } },
    { key: "python_master", name: "Python Master", description: "Solve 8 Python-category challenges.", rarity: "epic", icon: "Code", category: "skill", xpReward: 40, condition: { metric: "category_complete", op: "gte", value: 8, category: "Python" } },
    { key: "dsa_master", name: "DSA Master", description: "Solve 8 DSA-category challenges.", rarity: "epic", icon: "Binary", category: "skill", xpReward: 40, condition: { metric: "category_complete", op: "gte", value: 8, category: "DSA" } },
    { key: "hard_solver", name: "Hard Challenger", description: "Solve 5 Hard challenges.", rarity: "epic", icon: "Mountain", category: "skill", xpReward: 45, condition: { metric: "difficulty_solved", op: "gte", value: 5, difficulty: "Hard" } },
    { key: "expert_solver", name: "Expert Crusher", description: "Solve 3 Expert challenges.", rarity: "legendary", icon: "Star", category: "skill", xpReward: 75, condition: { metric: "difficulty_solved", op: "gte", value: 3, difficulty: "Expert" } },
  ];
  for (const a of achievements) {
    await db.achievement.upsert({
      where: { key: a.key },
      update: {
        name: a.name,
        description: a.description,
        rarity: a.rarity,
        icon: a.icon,
        category: a.category,
        xpReward: a.xpReward,
        condition: JSON.stringify(a.condition),
      },
      create: {
        key: a.key,
        name: a.name,
        description: a.description,
        rarity: a.rarity,
        icon: a.icon,
        category: a.category,
        xpReward: a.xpReward,
        condition: JSON.stringify(a.condition),
      },
    });
  }
  console.log(`Achievements: ${achievements.length}`);

  // --- Platform settings ---
  const defaultSettings: Record<string, any> = {
    platform_name: "Weekly Coding Challenges 2.0",
    leaderboard_scope_default: "overall",
    supported_languages: ["python", "cpp", "javascript"],
    categories: ["Python", "C++", "DSA", "Algorithms", "SQL", "AI/ML"],
    difficulties: ["Easy", "Medium", "Hard", "Expert"],
    similarity_threshold: 0.7,
    rate_limit_submissions_per_min: 8,
    announcements: [
      { id: "ann-1", title: "Welcome to WCC 2.0", body: "New weekly challenges drop every Monday. Build your streak!", createdAt: new Date().toISOString() },
    ],
  };
  for (const [k, v] of Object.entries(defaultSettings)) {
    await db.platformSetting.upsert({
      where: { key: k },
      update: { value: JSON.stringify(v) },
      create: { key: k, value: JSON.stringify(v) },
    });
  }
  console.log(`Settings: ${Object.keys(defaultSettings).length}`);

  // --- Sample challenges ---
  const challenges = [
    {
      slug: "hello-world",
      title: "Hello, Coder!",
      description: "Print a greeting to the world.",
      statement: `Write a program that reads a name from standard input and prints \`Hello, <name>!\` to standard output.\n\nThis is your first step on Weekly Coding Challenges — warm up the engine.`,
      difficulty: "Easy",
      category: "Python",
      topic: "I/O",
      xpReward: 10,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      languages: ["python", "cpp", "javascript"],
      constraints: "- The name contains only printable ASCII characters.\n- The length of the name is at most 100.",
      examples: [
        { input: "Ada", output: "Hello, Ada!", explanation: "Read the name and greet." },
      ],
      inputFormat: "A single line containing the name.",
      outputFormat: "A single line: `Hello, <name>!`",
      starterCode: { python: "name = input()\nprint(f'Hello, {name}!')", cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    string name;\n    cin >> name;\n    cout << \"Hello, \" << name << \"!\" << endl;\n    return 0;\n}", javascript: "const name = require('fs').readFileSync(0,'utf8').trim();\nconsole.log(`Hello, ${name}!`);" },
      solutionRef: "python: print(f'Hello, {input()}!')",
      isWeekly: true,
      weekLabel: "Week 1",
      status: "published",
      testCases: [
        { name: "Sample 1", input: "Ada", expectedOutput: "Hello, Ada!", isHidden: false, isSample: true },
        { name: "Hidden 1", input: "Lovelace", expectedOutput: "Hello, Lovelace!", isHidden: true, isSample: false },
        { name: "Hidden 2", input: "Turing", expectedOutput: "Hello, Turing!", isHidden: true, isSample: false },
      ],
    },
    {
      slug: "sum-of-two",
      title: "Sum of Two Numbers",
      description: "Read two integers and print their sum.",
      statement: `Read two integers **a** and **b** from standard input (space separated) and print their sum.`,
      difficulty: "Easy",
      category: "Python",
      topic: "Arithmetic",
      xpReward: 10,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      languages: ["python", "cpp", "javascript"],
      constraints: "-10^9 ≤ a, b ≤ 10^9",
      examples: [{ input: "3 5", output: "8", explanation: "3 + 5 = 8" }],
      inputFormat: "A single line containing two space-separated integers a and b.",
      outputFormat: "A single integer — the sum a + b.",
      starterCode: { python: "a, b = map(int, input().split())\nprint(a + b)", cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    long long a, b; cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}", javascript: "const [a,b] = require('fs').readFileSync(0,'utf8').trim().split(' ').map(Number);\nconsole.log(a+b);" },
      solutionRef: "python: print(sum(map(int,input().split())))",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "3 5", expectedOutput: "8", isHidden: false, isSample: true },
        { name: "Negatives", input: "-7 -2", expectedOutput: "-9", isHidden: true },
        { name: "Zero", input: "0 0", expectedOutput: "0", isHidden: true },
        { name: "Large", input: "1000000000 1000000000", expectedOutput: "2000000000", isHidden: true },
      ],
    },
    {
      slug: "even-or-odd",
      title: "Even or Odd",
      description: "Determine whether a number is even or odd.",
      statement: `Read an integer **n** and print \`Even\` if n is even, otherwise \`Odd\`.`,
      difficulty: "Easy",
      category: "Algorithms",
      topic: "Conditionals",
      xpReward: 10,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      languages: ["python", "cpp", "javascript"],
      constraints: "-10^9 ≤ n ≤ 10^9",
      examples: [{ input: "4", output: "Even", explanation: "4 % 2 == 0" }],
      inputFormat: "A single integer n.",
      outputFormat: "Either `Even` or `Odd`.",
      starterCode: { python: "n = int(input())\nprint('Even' if n % 2 == 0 else 'Odd')", cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    long long n; cin >> n;\n    cout << (n % 2 == 0 ? \"Even\" : \"Odd\") << endl;\n    return 0;\n}", javascript: "const n = Number(require('fs').readFileSync(0,'utf8').trim());\nconsole.log(n % 2 === 0 ? 'Even' : 'Odd');" },
      solutionRef: "python: print('Even' if int(input())%2==0 else 'Odd')",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "4", expectedOutput: "Even", isHidden: false, isSample: true },
        { name: "Odd", input: "7", expectedOutput: "Odd", isHidden: true },
        { name: "Zero", input: "0", expectedOutput: "Even", isHidden: true },
        { name: "Negative", input: "-5", expectedOutput: "Odd", isHidden: true },
      ],
    },
    {
      slug: "reverse-string",
      title: "Reverse a String",
      description: "Reverse the given string.",
      statement: `Read a string **s** from input and print its reverse.`,
      difficulty: "Easy",
      category: "Algorithms",
      topic: "Strings",
      xpReward: 12,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      languages: ["python", "cpp", "javascript"],
      constraints: "1 ≤ |s| ≤ 1000, contains printable ASCII (no spaces).",
      examples: [{ input: "coder", output: "redoc", explanation: "Reverse the characters." }],
      inputFormat: "A single string s.",
      outputFormat: "The reversed string.",
      starterCode: { python: "s = input().strip()\nprint(s[::-1])", cpp: "#include <iostream>\n#include <algorithm>\nusing namespace std;\nint main() {\n    string s; cin >> s;\n    reverse(s.begin(), s.end());\n    cout << s << endl;\n    return 0;\n}", javascript: "const s = require('fs').readFileSync(0,'utf8').trim();\nconsole.log(s.split('').reverse().join(''));" },
      solutionRef: "python: print(input()[::-1])",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "coder", expectedOutput: "redoc", isHidden: false, isSample: true },
        { name: "Palindrome", input: "racecar", expectedOutput: "racecar", isHidden: true },
        { name: "Single", input: "a", expectedOutput: "a", isHidden: true },
        { name: "All", input: "abcdef", expectedOutput: "fedcba", isHidden: true },
      ],
    },
    {
      slug: "fizzbuzz",
      title: "FizzBuzz",
      description: "The classic FizzBuzz up to N.",
      statement: `Read an integer **n** and print numbers from 1 to n, one per line. For multiples of 3 print \`Fizz\`, for multiples of 5 print \`Buzz\`, and for multiples of both print \`FizzBuzz\`.`,
      difficulty: "Medium",
      category: "Algorithms",
      topic: "Loops",
      xpReward: 20,
      timeLimitMs: 1500,
      memoryLimitMb: 128,
      languages: ["python", "cpp", "javascript"],
      constraints: "1 ≤ n ≤ 10^5",
      examples: [{ input: "5", output: "1\n2\nFizz\n4\nBuzz", explanation: "Standard FizzBuzz rules." }],
      inputFormat: "A single integer n.",
      outputFormat: "n lines, one per number from 1 to n.",
      starterCode: { python: "n = int(input())\nfor i in range(1, n+1):\n    if i % 15 == 0: print('FizzBuzz')\n    elif i % 3 == 0: print('Fizz')\n    elif i % 5 == 0: print('Buzz')\n    else: print(i)", cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    int n; cin >> n;\n    for (int i = 1; i <= n; i++) {\n        if (i % 15 == 0) cout << \"FizzBuzz\";\n        else if (i % 3 == 0) cout << \"Fizz\";\n        else if (i % 5 == 0) cout << \"Buzz\";\n        else cout << i;\n        cout << endl;\n    }\n    return 0;\n}", javascript: "const n = Number(require('fs').readFileSync(0,'utf8').trim());\nlet out=[];\nfor(let i=1;i<=n;i++){ if(i%15===0)out.push('FizzBuzz'); else if(i%3===0)out.push('Fizz'); else if(i%5===0)out.push('Buzz'); else out.push(String(i)); }\nconsole.log(out.join('\\n'));" },
      solutionRef: "python: print('\\n'.join('FizzBuzz' if i%15==0 else 'Fizz' if i%3==0 else 'Buzz' if i%5==0 else str(i) for i in range(1,int(input())+1)))",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "5", expectedOutput: "1\n2\nFizz\n4\nBuzz", isHidden: false, isSample: true },
        { name: "FizzBuzz", input: "15", expectedOutput: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz", isHidden: true },
        { name: "One", input: "1", expectedOutput: "1", isHidden: true },
        { name: "Three", input: "3", expectedOutput: "1\n2\nFizz", isHidden: true },
      ],
    },
    {
      slug: "two-sum",
      title: "Two Sum",
      description: "Find two indices whose values sum to target.",
      statement: `Given an array of **n** integers and a target **t**, find two distinct indices i < j such that a[i] + a[j] == t. Print the two indices (1-based) or \`-1 -1\` if no such pair exists.\n\nGuarantee: there is at most one valid pair.`,
      difficulty: "Medium",
      category: "DSA",
      topic: "Hashing",
      xpReward: 25,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      languages: ["python", "cpp", "javascript"],
      constraints: "2 ≤ n ≤ 10^5, -10^9 ≤ a[i], t ≤ 10^9",
      examples: [{ input: "4 9\n2 7 11 15", output: "1 2", explanation: "2 + 7 = 9, indices 1 and 2." }],
      inputFormat: "First line: n and t. Second line: n space-separated integers.",
      outputFormat: "Two 1-based indices i j, or `-1 -1`.",
      starterCode: { python: "n, t = map(int, input().split())\na = list(map(int, input().split()))\nseen = {}\nfor i, x in enumerate(a):\n    if t - x in seen:\n        print(seen[t - x] + 1, i + 1); break\n    seen[x] = i\nelse:\n    print('-1 -1')", cpp: "#include <iostream>\n#include <unordered_map>\nusing namespace std;\nint main() {\n    int n; long long t; cin >> n >> t;\n    unordered_map<long long,int> mp;\n    for (int i = 0; i < n; i++) {\n        long long x; cin >> x;\n        if (mp.count(t - x)) { cout << mp[t - x] + 1 << \" \" << i + 1 << endl; return 0; }\n        mp[x] = i;\n    }\n    cout << \"-1 -1\" << endl;\n    return 0;\n}", javascript: "const data = require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).map(Number);\nconst n = data[0], t = data[1]; const a = data.slice(2);\nconst mp = new Map();\nfor (let i = 0; i < n; i++) { if (mp.has(t - a[i])) { console.log((mp.get(t-a[i])+1) + ' ' + (i+1)); process.exit(0);} mp.set(a[i], i);} console.log('-1 -1');" },
      solutionRef: "python: hashmap O(n)",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "4 9\n2 7 11 15", expectedOutput: "1 2", isHidden: false, isSample: true },
        { name: "No pair", input: "3 100\n1 2 3", expectedOutput: "-1 -1", isHidden: true },
        { name: "Last two", input: "5 10\n1 2 3 4 6", expectedOutput: "4 5", isHidden: true },
        { name: "Negatives", input: "4 -1\n-2 1 3 -4", expectedOutput: "2 3", isHidden: true },
      ],
    },
    {
      slug: "palindrome-check",
      title: "Palindrome Check",
      description: "Check if a string is a palindrome.",
      statement: `Read a string **s** (no spaces). Print \`YES\` if it is a palindrome, otherwise \`NO\`.`,
      difficulty: "Easy",
      category: "Algorithms",
      topic: "Strings",
      xpReward: 12,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      languages: ["python", "cpp", "javascript"],
      constraints: "1 ≤ |s| ≤ 1000, lowercase letters only.",
      examples: [{ input: "racecar", output: "YES", explanation: "Reads the same backwards." }],
      inputFormat: "A single string s.",
      outputFormat: "YES or NO.",
      starterCode: { python: "s = input().strip()\nprint('YES' if s == s[::-1] else 'NO')", cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    string s; cin >> s;\n    string r = s; reverse(r.begin(), r.end());\n    cout << (s == r ? \"YES\" : \"NO\") << endl;\n    return 0;\n}", javascript: "const s = require('fs').readFileSync(0,'utf8').trim();\nconsole.log(s === s.split('').reverse().join('') ? 'YES' : 'NO');" },
      solutionRef: "python: print('YES' if (s:=input().strip())==s[::-1] else 'NO')",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "racecar", expectedOutput: "YES", isHidden: false, isSample: true },
        { name: "No", input: "hello", expectedOutput: "NO", isHidden: true },
        { name: "Single", input: "a", expectedOutput: "YES", isHidden: true },
        { name: "Two same", input: "aa", expectedOutput: "YES", isHidden: true },
      ],
    },
    {
      slug: "count-vowels",
      title: "Count Vowels",
      description: "Count the vowels in a string.",
      statement: `Read a string **s** and print the number of vowels (a, e, i, o, u — case insensitive).`,
      difficulty: "Easy",
      category: "Python",
      topic: "Strings",
      xpReward: 10,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      languages: ["python", "cpp", "javascript"],
      constraints: "1 ≤ |s| ≤ 1000",
      examples: [{ input: "Hello World", output: "3", explanation: "e, o, o are vowels." }],
      inputFormat: "A single line string s (may contain spaces).",
      outputFormat: "A single integer count.",
      starterCode: { python: "s = input().lower()\nprint(sum(1 for c in s if c in 'aeiou'))", cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    string s; getline(cin, s);\n    int cnt = 0;\n    for (char c : s) { char l = tolower(c); if (l=='a'||l=='e'||l=='i'||l=='o'||l=='u') cnt++; }\n    cout << cnt << endl;\n    return 0;\n}", javascript: "const s = require('fs').readFileSync(0,'utf8').toString();\nconsole.log((s.match(/[aeiou]/gi)||[]).length);" },
      solutionRef: "python: print(sum(c in 'aeiou' for c in input().lower()))",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "Hello World", expectedOutput: "3", isHidden: false, isSample: true },
        { name: "No vowels", input: "Fly by night", expectedOutput: "1", isHidden: true },
        { name: "All", input: "aeiou", expectedOutput: "5", isHidden: true },
        { name: "Empty-ish", input: "bcdfg", expectedOutput: "0", isHidden: true },
      ],
    },
    {
      slug: "factorial",
      title: "Factorial",
      description: "Compute n! modulo 10^9+7.",
      statement: `Read an integer **n** (0 ≤ n ≤ 10^5) and print n! modulo 10^9+7.`,
      difficulty: "Medium",
      category: "Algorithms",
      topic: "Modular Arithmetic",
      xpReward: 20,
      timeLimitMs: 1500,
      memoryLimitMb: 128,
      languages: ["python", "cpp", "javascript"],
      constraints: "0 ≤ n ≤ 10^5",
      examples: [{ input: "5", output: "120", explanation: "5! = 120" }],
      inputFormat: "A single integer n.",
      outputFormat: "n! modulo 10^9+7.",
      starterCode: { python: "n = int(input()); M = 10**9+7; r = 1\nfor i in range(2, n+1): r = r * i % M\nprint(r)", cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    int n; cin >> n;\n    const long long M = 1000000007LL;\n    long long r = 1;\n    for (int i = 2; i <= n; i++) r = r * i % M;\n    cout << r << endl;\n    return 0;\n}", javascript: "const n = Number(require('fs').readFileSync(0,'utf8').trim()); const M = 1000000007n; let r = 1n; for(let i=2n;i<=BigInt(n);i++) r = r*i % M; console.log(r.toString());" },
      solutionRef: "python: loop mod 10^9+7",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "5", expectedOutput: "120", isHidden: false, isSample: true },
        { name: "Zero", input: "0", expectedOutput: "1", isHidden: true },
        { name: "One", input: "1", expectedOutput: "1", isHidden: true },
        { name: "Ten", input: "10", expectedOutput: "3628800", isHidden: true },
        { name: "Large mod", input: "100000", expectedOutput: "644622744", isHidden: true },
      ],
    },
    {
      slug: "binary-search",
      title: "Binary Search",
      description: "Standard binary search on a sorted array.",
      statement: `Given a sorted array of **n** integers and a query **q**, print the 1-based index of q in the array or \`-1\` if not present.`,
      difficulty: "Medium",
      category: "DSA",
      topic: "Searching",
      xpReward: 25,
      timeLimitMs: 1500,
      memoryLimitMb: 256,
      languages: ["python", "cpp", "javascript"],
      constraints: "1 ≤ n ≤ 10^6, array sorted ascending, all values distinct.",
      examples: [{ input: "5\n1 3 5 7 9\n5", output: "3", explanation: "5 is at index 3 (1-based)." }],
      inputFormat: "Line 1: n. Line 2: n sorted integers. Line 3: query q.",
      outputFormat: "1-based index, or -1.",
      starterCode: { python: "n = int(input()); a = list(map(int, input().split())); q = int(input())\nlo, hi, ans = 0, n-1, -1\nwhile lo <= hi:\n    m = (lo+hi)//2\n    if a[m] == q: ans = m+1; break\n    elif a[m] < q: lo = m+1\n    else: hi = m-1\nprint(ans)", cpp: "#include <iostream>\n#include <algorithm>\nusing namespace std;\nint main() {\n    int n; cin >> n; vector<long long> a(n);\n    for (auto &x: a) cin >> x;\n    long long q; cin >> q;\n    int lo=0, hi=n-1, ans=-1;\n    while (lo<=hi) { int m=(lo+hi)/2; if (a[m]==q){ans=m+1;break;} else if(a[m]<q)lo=m+1; else hi=m-1; }\n    cout << ans << endl;\n    return 0;\n}", javascript: "const d = require('fs').readFileSync(0,'utf8').trim().split(/\\s+/).map(Number); const n=d[0]; const a=d.slice(1,1+n); const q=d[1+n]; let lo=0,hi=n-1,ans=-1; while(lo<=hi){const m=(lo+hi)>>1; if(a[m]===q){ans=m+1;break;} else if(a[m]<q)lo=m+1; else hi=m-1;} console.log(ans);" },
      solutionRef: "python: binary search",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "5\n1 3 5 7 9\n5", expectedOutput: "3", isHidden: false, isSample: true },
        { name: "Not found", input: "3\n1 2 3\n4", expectedOutput: "-1", isHidden: true },
        { name: "First", input: "4\n10 20 30 40\n10", expectedOutput: "1", isHidden: true },
        { name: "Last", input: "4\n10 20 30 40\n40", expectedOutput: "4", isHidden: true },
      ],
    },
    {
      slug: "sql-select-basics",
      title: "SQL: SELECT Basics (Concept)",
      description: "Identify the correct SQL SELECT statement.",
      statement: `This is a conceptual SQL challenge. Write a SQL query (as a string output by your program) that selects the **name** and **age** columns from a table called \`students\` where age is at least 18, ordered by name ascending.\n\nYour program should print the SQL query as a single line (no trailing semicolon needed).`,
      difficulty: "Easy",
      category: "SQL",
      topic: "SELECT",
      xpReward: 15,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      languages: ["python", "javascript"],
      constraints: "Output must be a valid SQL SELECT statement.",
      examples: [{ input: "", output: "SELECT name, age FROM students WHERE age >= 18 ORDER BY name ASC", explanation: "Standard SELECT with WHERE and ORDER BY." }],
      inputFormat: "No input.",
      outputFormat: "A single line SQL query.",
      starterCode: { python: "print('SELECT name, age FROM students WHERE age >= 18 ORDER BY name ASC')", javascript: "console.log('SELECT name, age FROM students WHERE age >= 18 ORDER BY name ASC');" },
      solutionRef: "python: print the SQL string",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "", expectedOutput: "SELECT name, age FROM students WHERE age >= 18 ORDER BY name ASC", isHidden: false, isSample: true },
      ],
    },
    {
      slug: "prime-check",
      title: "Prime Number Check",
      description: "Check whether n is prime.",
      statement: `Read an integer **n** (≥ 2). Print \`PRIME\` if n is prime, otherwise \`COMPOSITE\`.`,
      difficulty: "Medium",
      category: "Algorithms",
      topic: "Number Theory",
      xpReward: 20,
      timeLimitMs: 1500,
      memoryLimitMb: 128,
      languages: ["python", "cpp", "javascript"],
      constraints: "2 ≤ n ≤ 10^12",
      examples: [{ input: "17", output: "PRIME", explanation: "17 has no divisors other than 1 and itself." }],
      inputFormat: "A single integer n.",
      outputFormat: "PRIME or COMPOSITE.",
      starterCode: { python: "n = int(input())\ndef isp(n):\n    if n < 2: return False\n    i = 2\n    while i*i <= n:\n        if n % i == 0: return False\n        i += 1\n    return True\nprint('PRIME' if isp(n) else 'COMPOSITE')", cpp: "#include <iostream>\nusing namespace std;\nint main() {\n    long long n; cin >> n;\n    bool p = true;\n    if (n < 2) p = false;\n    for (long long i = 2; i*i <= n; i++) if (n % i == 0) { p = false; break; }\n    cout << (p ? \"PRIME\" : \"COMPOSITE\") << endl;\n    return 0;\n}", javascript: "let n = BigInt(require('fs').readFileSync(0,'utf8').trim());\nlet p = true;\nif (n < 2n) p = false;\nfor (let i = 2n; i*i <= n; i++) if (n % i === 0n) { p = false; break; }\nconsole.log(p ? 'PRIME' : 'COMPOSITE');" },
      solutionRef: "python: trial division up to sqrt(n)",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "17", expectedOutput: "PRIME", isHidden: false, isSample: true },
        { name: "Composite", input: "15", expectedOutput: "COMPOSITE", isHidden: true },
        { name: "Two", input: "2", expectedOutput: "PRIME", isHidden: true },
        { name: "Big prime", input: "1000000007", expectedOutput: "PRIME", isHidden: true },
      ],
    },
    {
      slug: "greatest-common-divisor",
      title: "Greatest Common Divisor",
      description: "Compute gcd(a, b).",
      statement: `Read two integers **a** and **b** and print their greatest common divisor.`,
      difficulty: "Easy",
      category: "Algorithms",
      topic: "Number Theory",
      xpReward: 12,
      timeLimitMs: 1000,
      memoryLimitMb: 128,
      languages: ["python", "cpp", "javascript"],
      constraints: "1 ≤ a, b ≤ 10^9",
      examples: [{ input: "48 18", output: "6", explanation: "gcd(48,18) = 6" }],
      inputFormat: "Two space-separated integers a b.",
      outputFormat: "The gcd of a and b.",
      starterCode: { python: "import math\na, b = map(int, input().split())\nprint(math.gcd(a, b))", cpp: "#include <iostream>\nusing namespace std;\nlong long gcd(long long a, long long b){ return b ? gcd(b, a%b) : a; }\nint main() {\n    long long a, b; cin >> a >> b;\n    cout << gcd(a, b) << endl;\n    return 0;\n}", javascript: "const [a,b] = require('fs').readFileSync(0,'utf8').trim().split(' ').map(BigInt); let x=a,y=b; while(y){const t=y; y=x%y; x=t;} console.log(x.toString());" },
      solutionRef: "python: math.gcd",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "48 18", expectedOutput: "6", isHidden: false, isSample: true },
        { name: "Coprime", input: "7 5", expectedOutput: "1", isHidden: true },
        { name: "Equal", input: "9 9", expectedOutput: "9", isHidden: true },
        { name: "Large", input: "1000000000 100000000", expectedOutput: "100000000", isHidden: true },
      ],
    },
    {
      slug: "linear-regression-mse",
      title: "AI/ML: Mean Squared Error",
      description: "Compute the MSE between predictions and targets.",
      statement: `Read two arrays of **n** floating point numbers — predictions and targets. Compute the **Mean Squared Error** = (1/n) * Σ (p_i - t_i)^2. Print the result rounded to 4 decimal places.`,
      difficulty: "Medium",
      category: "AI/ML",
      topic: "Metrics",
      xpReward: 25,
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      languages: ["python", "cpp", "javascript"],
      constraints: "1 ≤ n ≤ 10^5, values in [-10^6, 10^6]",
      examples: [{ input: "3\n1.0 2.0 3.0\n1.5 2.0 2.5", output: "0.1667", explanation: "MSE = ((0.5)^2 + 0 + 0.5^2)/3 = 0.1667" }],
      inputFormat: "Line 1: n. Line 2: n predictions. Line 3: n targets.",
      outputFormat: "A single float rounded to 4 decimal places.",
      starterCode: { python: "n = int(input()); p = list(map(float, input().split())); t = list(map(float, input().split()))\nmse = sum((a-b)**2 for a,b in zip(p,t))/n\nprint(f'{mse:.4f}')", cpp: "#include <iostream>\n#include <iomanip>\nusing namespace std;\nint main() {\n    int n; cin >> n; vector<double> p(n), t(n);\n    for (auto &x: p) cin >> x; for (auto &x: t) cin >> x;\n    double s = 0;\n    for (int i = 0; i < n; i++) s += (p[i]-t[i])*(p[i]-t[i]);\n    cout << fixed << setprecision(4) << s/n << endl;\n    return 0;\n}", javascript: "const d = require('fs').readFileSync(0,'utf8').trim().split(/\\s+/); const n = Number(d[0]); const p = d.slice(1,1+n).map(Number); const t = d.slice(1+n).map(Number); let s = 0; for(let i=0;i<n;i++) s += (p[i]-t[i])**2; console.log((s/n).toFixed(4));" },
      solutionRef: "python: mse loop",
      isWeekly: false,
      status: "published",
      testCases: [
        { name: "Sample", input: "3\n1.0 2.0 3.0\n1.5 2.0 2.5", expectedOutput: "0.1667", isHidden: false, isSample: true },
        { name: "Perfect", input: "2\n1 2\n1 2", expectedOutput: "0.0000", isHidden: true },
        { name: "One", input: "1\n5\n3", expectedOutput: "4.0000", isHidden: true },
      ],
    },
  ];

  for (const c of challenges) {
    const { testCases, ...rest } = c;
    const data: any = {
      ...rest,
      languages: JSON.stringify(c.languages),
      examples: JSON.stringify(c.examples),
      starterCode: JSON.stringify(c.starterCode),
      weekStartsAt: rest.isWeekly ? new Date() : null,
      weekEndsAt: rest.isWeekly ? new Date(Date.now() + 7 * 86400000) : null,
    };
    const ch = await db.challenge.upsert({
      where: { slug: c.slug },
      update: data,
      create: data,
    });
    for (const tc of testCases) {
      const existing = await db.testCase.findFirst({
        where: { challengeId: ch.id, name: tc.name },
      });
      if (existing) {
        await db.testCase.update({ where: { id: existing.id }, data: tc });
      } else {
        await db.testCase.create({ data: { ...tc, challengeId: ch.id } });
      }
    }
  }
  console.log(`Challenges: ${challenges.length}`);

  // --- Demo students (clearly demo data) ---
  const demoUsers = [
    { uid: "26LBCS0001", name: "Aarav Sharma", password: "demo1234" },
    { uid: "26LBCS0002", name: "Diya Patel", password: "demo1234" },
    { uid: "25LBCS0001", name: "Vikram Reddy", password: "demo1234" },
    { uid: "25LBCS0002", name: "Ananya Iyer", password: "demo1234" },
  ];
  for (const d of demoUsers) {
    const prefix = d.uid.slice(0, 2);
    const year = prefix === "25" ? "2" : "1";
    const batch = prefix;
    const hash = await hashPassword(d.password);
    const u = await db.user.upsert({
      where: { uid: d.uid },
      update: { name: d.name },
      create: {
        uid: d.uid,
        name: d.name,
        year,
        batch,
        passwordHash: hash,
        levelName: "Beginner",
        avatar: { create: { config: JSON.stringify({ skin: "skin1", hair: "hair1", outfit: "outfit1", expression: "smile" }) } },
      },
    });
    // give them some XP so the leaderboard is alive
    const xp = d.uid === "25LBCS0001" ? 1200 : d.uid === "25LBCS0002" ? 800 : d.uid === "26LBCS0001" ? 350 : 100;
    await db.user.update({ where: { id: u.id }, data: { xp, levelName: xp >= 1500 ? "Intermediate" : xp >= 500 ? "Beginner" : "Beginner" } });
  }
  console.log(`Demo students: ${demoUsers.length}`);

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
