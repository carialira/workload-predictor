export type IssueType = 'Defect' | 'Task' | 'Story' | 'Bug'

export interface IssueCard {
  id: string
  summary: string
  description: string
  labels: string[]
  components: string[]
  type: IssueType
  fullText: string
  commentCount: number
}

export interface TrainedCard extends IssueCard {
  hoursToResolve: number
}

export interface SimilarCard {
  id: string
  summary: string
  hoursToResolve: number
  distance: number
}

export interface PrioritizedCard extends IssueCard {
  estimatedHours: number
  similarCards: SimilarCard[]
  fitsToday: boolean
}

export type QueryMode = 'epic' | 'story'

export interface RecommendRequest {
  mode: QueryMode
  epicKey?: string    // quando mode = 'epic'
  parentKey?: string  // quando mode = 'story'
  labels?: string     // quando mode = 'story', opcional
  aiAcceleration?: number // 0.0 (sem IA) → 0.8 (IA intensiva)
  hoursAvailableToday?: number // horas disponíveis hoje para trabalhar
}

export interface RecommendResponse {
  cards: PrioritizedCard[]
  trainedOn: number
}

export type TrainEventType = 'status' | 'progress' | 'embed_progress' | 'done' | 'error'

export interface TrainEvent {
  type: TrainEventType
  message?: string
  epoch?: number
  total?: number
  loss?: number
  cards?: number
  done?: number
  accelerationRate?: number | null
}
