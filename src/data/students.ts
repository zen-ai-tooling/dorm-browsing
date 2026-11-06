import { randomLook } from "./avatar";
import { seededRandom, seedFor } from "./campus";
export const STUDENTS = ["Alex", "Mina", "Theo", "Imani", "Luis", "June", "Eli", "Nora", "Kai", "Asha"].map((name, i) => ({
  name, look: randomLook(seededRandom(`campus-student-${i}`)),
  prop: (["coffee", "book", "skateboard", "headphones", "backpack"] as const)[i % 5] ?? "book",
}));
export const densityRange = (hour: number): [number, number] => {
  if (hour >= 2 && hour < 6) return [0, 0];
  if (hour < 2 || hour < 8) return [1, 2];
  if (hour < 12) return [5, 8];
  if (hour < 15) return [8, 10];
  if (hour < 19) return [5, 7];
  return [3, 5];
};
export const studentCount = (hour: number, date: string) => {
  const [lo, hi] = densityRange(hour);
  return lo + seedFor(`${date}:students:${hour}`) % (hi - lo + 1);
};
export const OVERHEARDS = [
  "If he says 'quick question' one more time…", "The dining hall has sushi today??", "I'm not procrastinating, I'm marinating.",
  "My backpack is 90% chargers.", "We said a quick coffee. That was two hours ago.", "I know the answer. I just don't know the question.",
  "The professor said optional. I heard vacation.", "My notes have a plot twist.", "I came here to read. The tree is distracting.",
  "Is this an iced-coffee weather situation? Always.", "The group chat has formed a government.", "I submitted it at 11:59. Art.",
  "That's my academic emotional support hoodie.", "I have a favorite library outlet.", "You can major in that?", "My timetable is a cry for help.",
  "Professor stole my bench again.", "I think the squirrel knows my schedule.", "No, the other building with columns.", "We're basically a walking seminar.",
  "I read the abstract. It was very abstract.", "It's not a nap, it's field research.", "My coffee has a coffee.", "The frisbee is not coming back.",
  "I'll start after lunch. Lunch is a flexible concept.", "Who gave the printer feelings?", "The essay is written. In my head.",
  "I'm taking a minor in finding shortcuts.", "The fountain gave me financial advice.", "He brought a spreadsheet to brunch.",
  "I'm dressed for the library and emotionally at the beach.", "We need a study playlist with no bangers.", "Your headphones are leaking an entire concert.",
  "Is the clock early or am I late?", "I remember being awake for that lecture.", "There's free pizza. Follow me.", "We're meeting by the tree. The big tree.",
  "The oat milk has become a floor-wide investigation.", "I'm one good pen away from success.", "Did anyone actually buy the textbook?",
  "The quad is my unofficial living room.", "It's November. How is the semester both short and eternal?", "I promised my plant I'd graduate.",
  "That's a good cloud. Very cloud-shaped.", "The coffee cart knows my order and my deadlines.", "One more chapter. Famous last words.",
  "My lab partner is three raccoons in a coat.", "I think the campus cat is tenured.", "The ramen truck understands me.", "See you at midnight breakfast?",
];
export const overheardFor = (index: number, turn: number) => OVERHEARDS[(index * 7 + turn) % OVERHEARDS.length] ?? "Hey.";