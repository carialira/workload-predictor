export const MIN_HOURS = 40 / 60; // mínimo de 40min por tarefa
export const MIN_BASELINE_CARDS = 10; // mínimo de cards pré-IA para calcular aceleração
export const MIN_PAIRS_FOR_RATE = 3; // mínimo de pares para calcular aceleração
export const LOCAL_CARDS_PATH = "./data/tracker-cards.json";
export const MODEL_PATH = process.env.MODEL_PATH ?? "./data/model";
export const AI_START_DATE_ISO = process.env.AI_START_DATE ?? "2025-10-01";
