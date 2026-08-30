export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  notebook: string;
  color: string;
  due: number | null;
  pinned: boolean;
  trashed: boolean;
  created: number;
  updated: number;
}

export interface Settings {
  dark: boolean;
  sidebarOpen: boolean;
}

export interface CreateNoteInput {
  title: string;
  body: string;
  tags: string[];
  notebook: string;
  color: string;
  due: number | null;
  pinned: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
  tags?: string[];
  notebook?: string;
  color?: string;
  due?: number | null;
  pinned?: boolean;
  trashed?: boolean;
}
