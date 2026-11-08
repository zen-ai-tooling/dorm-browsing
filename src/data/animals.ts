export const SQUIRREL_COUNT = 3;
export const PIGEON_COUNT = 5;
export const PROFESSOR_FOLLOW_MS = 8000;
export const professorPlace = (hour: number): "lounge" | "courtyard" | "quad" =>
  hour >= 22 || hour < 7 ? "lounge" : hour >= 19 ? "courtyard" : "quad";
export const PROFESSOR_ANCHORS = {
  lounge: { x: 9, y: 29 }, courtyard: { x: 77, y: 25 }, quad: { x: 45, y: 58 },
};