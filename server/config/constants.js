export const MIN_HOURS = 40 / 60;
export const MIN_BASELINE_CARDS = 10;
export const MIN_PAIRS_FOR_RATE = 3;
export const LOCAL_CARDS_PATH = "./data/tracker-cards.json";
export const MODEL_PATH = process.env.MODEL_PATH ?? "./data/model";
export const AI_START_DATE_ISO = process.env.AI_START_DATE ?? "2025-10-01";
export const TRACKER_ISSUE_TYPES = process.env.TRACKER_ISSUE_TYPES
  ?? 'Bug, "Defect (sub-task)", Sub-task, Subtarefa';
export const TRACKER_EXCLUDED_STATUSES = process.env.TRACKER_EXCLUDED_STATUSES
  ?? "Canceled, Done";
