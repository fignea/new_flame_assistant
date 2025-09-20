export interface Assistant {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: 'auto' | 'ai';
  status: 'active' | 'inactive' | 'training';
  auto_response?: string;
  ai_prompt?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Schedule {
  id: string;
  assistant_id: string;
  day_of_week: number; // 0-6 (Domingo-Sábado)
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  enabled: boolean;
  created_at: Date;
}

export interface CreateAssistantRequest {
  name: string;
  description?: string;
  type: 'auto' | 'ai';
  auto_response?: string;
  ai_prompt?: string;
}

export interface UpdateAssistantRequest {
  name?: string;
  description?: string;
  type?: 'auto' | 'ai';
  status?: 'active' | 'inactive' | 'training';
  auto_response?: string;
  ai_prompt?: string;
}

export interface CreateScheduleRequest {
  day_of_week: number;
  start_time: string;
  end_time: string;
  enabled?: boolean;
}

export interface UpdateScheduleRequest {
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  enabled?: boolean;
}

export interface TrainAssistantRequest {
  training_data: {
    question: string;
    answer: string;
  }[];
}
