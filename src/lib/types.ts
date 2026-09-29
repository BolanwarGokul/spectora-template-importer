export type ImportWarning = {
  code: string;
  message: string;
  sheet?: string;
  row?: number;
};
export type SourceRow = {
  sheet: string;
  row: number;
  cells: Record<string, string>;
};
export type CommentNode = {
  id: string;
  name: string;
  html: string;
  renderedHtml?: string;
  kind: string;
  fieldType: string;
  position: number;
  source: SourceRow;
  warnings: string[];
};
export type ItemNode = {
  id: string;
  name: string;
  position: number;
  comments: CommentNode[];
};
export type SectionNode = {
  id: string;
  name: string;
  position: number;
  items: ItemNode[];
};
export type ImportStats = {
  sections: number;
  items: number;
  comments: number;
  rows: number;
  richText: number;
  links: number;
  images: number;
};
export type ImportResult = {
  name: string;
  sourceName: string;
  sourceHash: string;
  parserVersion: string;
  sections: SectionNode[];
  stats: ImportStats;
  warnings: ImportWarning[];
  unmappedColumns: string[];
};
export type Template = ImportResult & {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  copiedFrom: string | null;
};
export type TemplateCard = Pick<
  Template,
  | "id"
  | "name"
  | "stats"
  | "version"
  | "createdAt"
  | "updatedAt"
  | "copiedFrom"
  | "sourceName"
> & { warningCount: number };
