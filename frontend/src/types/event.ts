export interface TestEvent {
  id: string;
  event_type: string;
  service: string;
  status: string;
  message: string;
  details?: Record<string, any> | null;
  created_at: string;
}
