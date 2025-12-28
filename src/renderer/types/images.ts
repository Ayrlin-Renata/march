export interface IngestedImage {
    id: string;
    path: string;
    name: string;
    timestamp: number;
    source: string;
    burstId?: string;
}
