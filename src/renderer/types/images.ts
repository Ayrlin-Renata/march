export interface IngestedImage {
    id: string;
    path: string;
    name: string;
    timestamp: number;
    source: string;
    burstId?: string;
    labelIndex?: number; // 0-8, 0 being unlabeled or 1-8 being colors
}
