import { Timestamp } from 'firebase/firestore';

export type TaxonomyLevel =
  | 'subject'
  | 'curriculum'
  | 'grade'
  | 'unit'
  | 'topic'
  | 'subtopic'
  | 'learning_objective';

export type TaxonomyStatus = 'active' | 'archived';

export interface TaxonomyNode {
  id: string;
  level: TaxonomyLevel;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  ancestorIds: string[];
  order: number;
  status: TaxonomyStatus;
  aliases: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaxonomyReference {
  id: string;
  name: string;
}

export interface ContentTaxonomy {
  subject?: TaxonomyReference;
  curriculum?: TaxonomyReference;
  grade?: TaxonomyReference;
  unit?: TaxonomyReference;
  topic?: TaxonomyReference;
  subtopic?: TaxonomyReference;
  learningObjectives?: TaxonomyReference[];
  tags?: string[];
}

export const TAXONOMY_LEVEL_LABELS: Record<TaxonomyLevel, string> = {
  subject: 'Mata pelajaran',
  curriculum: 'Kurikulum',
  grade: 'Jenjang/Kelas',
  unit: 'Unit',
  topic: 'Topik',
  subtopic: 'Subtopik',
  learning_objective: 'Tujuan pembelajaran',
};

export const TAXONOMY_LEVEL_ORDER: TaxonomyLevel[] = [
  'subject',
  'curriculum',
  'grade',
  'unit',
  'topic',
  'subtopic',
  'learning_objective',
];
