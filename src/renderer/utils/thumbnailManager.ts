type LoadRequest = {
    id: string;
    url: string;
    resolve: () => void;
    priority: number;
};

class ThumbnailLoadManager {
    private static instance: ThumbnailLoadManager;
    private queue: LoadRequest[] = [];
    private activeRequests = new Set<string>();
    private activeCount = 0;
    private readonly MAX_CONCURRENT = 4;
    private nextId = 0;

    private constructor() { }

    static getInstance(): ThumbnailLoadManager {
        if (!ThumbnailLoadManager.instance) {
            ThumbnailLoadManager.instance = new ThumbnailLoadManager();
        }
        return ThumbnailLoadManager.instance;
    }

    /**
     * Request a slot to load a thumbnail.
     * Returns a requestId that can be used to cancel.
     */
    requestLoad(url: string, priority: number = 10): { id: string, promise: Promise<void> } {
        const id = `req-${this.nextId++}`;
        const promise = new Promise<void>((resolve) => {
            const request = { id, url, resolve, priority };

            // Efficient sorted insertion (Binary Search)
            let low = 0;
            let high = this.queue.length;
            while (low < high) {
                const mid = (low + high) >>> 1;
                if (this.queue[mid].priority <= priority) low = mid + 1;
                else high = mid;
            }
            this.queue.splice(low, 0, request);

            this.processNext();
        });
        return { id, promise };
    }

    /**
     * Cancel a pending request.
     */
    cancelLoad(id: string) {
        const index = this.queue.findIndex(req => req.id === id);
        if (index !== -1) {
            this.queue.splice(index, 1);
        }
    }

    /**
     * Notify the manager that a load has finished.
     */
    notifyFinished(_url: string, id?: string) {
        if (id) this.activeRequests.delete(id);
        this.activeCount--;
        this.processNext();
    }

    private processNext() {
        if (this.activeCount >= this.MAX_CONCURRENT || this.queue.length === 0) {
            return;
        }

        const request = this.queue.shift();
        if (request) {
            this.activeCount++;
            if (request.id) this.activeRequests.add(request.id);
            request.resolve();
        }
    }

    /**
     * Utility to load an image into browser cache
     */
    async prefetch(url: string, priority: number = 100): Promise<void> {
        const { id, promise } = this.requestLoad(url, priority);
        await promise;
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.notifyFinished(url, id);
                resolve();
            };
            img.onerror = () => {
                this.notifyFinished(url, id);
                resolve();
            };
            img.src = url;
        });
    }
}

export const thumbnailManager = ThumbnailLoadManager.getInstance();
