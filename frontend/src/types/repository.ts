export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  custom_description?: string;
  image_url?: string;
  video_url?: string;
  deploy_url?: string;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
  is_featured: boolean;
  is_premium_only?: boolean;
}
