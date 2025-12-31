import React from 'react';
import { thumbnailManager } from '../../../utils/thumbnailManager';

export const LazyImage: React.FC<{
    src: string,
    alt: string,
    className?: string,
    onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
}> = ({ src, alt, className, onLoad }) => {
    const [isNear, setIsNear] = React.useState(false); // Zone for requesting load
    const [isResident, setIsResident] = React.useState(false); // Zone for keeping in RAM
    const [isLoadAllowed, setIsLoadAllowed] = React.useState(false);
    const imgRef = React.useRef<HTMLImageElement>(null);
    const requestIdRef = React.useRef<string | null>(null);
    const slotOwnedRef = React.useRef(false);

    const releaseSlot = () => {
        if (slotOwnedRef.current) {
            thumbnailManager.notifyFinished(src);
            slotOwnedRef.current = false;
        }
    };

    React.useEffect(() => {
        if (!imgRef.current) return;
        const scrollContainer = imgRef.current.closest('.area-body');

        // Observer for Loading (3 screens buffer)
        const loadObserver = new IntersectionObserver(([entry]) => {
            setIsNear(entry.isIntersecting);
        }, {
            root: scrollContainer,
            rootMargin: '300% 0px'
        });

        // Observer for Unloading (10 screens buffer - very conservative)
        const unloadObserver = new IntersectionObserver(([entry]) => {
            setIsResident(entry.isIntersecting);
            if (!entry.isIntersecting) {
                setIsLoadAllowed(false);
                releaseSlot();
                if (requestIdRef.current) {
                    thumbnailManager.cancelLoad(requestIdRef.current);
                    requestIdRef.current = null;
                }
            }
        }, {
            root: scrollContainer,
            rootMargin: '1000% 0px'
        });

        loadObserver.observe(imgRef.current);
        unloadObserver.observe(imgRef.current);

        return () => {
            loadObserver.disconnect();
            unloadObserver.disconnect();
            releaseSlot();
            if (requestIdRef.current) {
                thumbnailManager.cancelLoad(requestIdRef.current);
            }
        };
    }, []);

    // Load Management Integration
    React.useEffect(() => {
        if (isNear && isResident && !isLoadAllowed && !requestIdRef.current) {
            const { id, promise } = thumbnailManager.requestLoad(src, 10);
            requestIdRef.current = id;

            promise.then(() => {
                if (requestIdRef.current === id) {
                    setIsLoadAllowed(true);
                    slotOwnedRef.current = true;
                    requestIdRef.current = null;
                } else {
                    thumbnailManager.notifyFinished(src);
                }
            });
        }
        else if (!isNear && requestIdRef.current) {
            thumbnailManager.cancelLoad(requestIdRef.current);
            requestIdRef.current = null;
        }
    }, [isNear, isResident, isLoadAllowed, src]);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        releaseSlot();
        if (onLoad) onLoad(e);
    };

    const handleError = () => {
        releaseSlot();
    };

    return (
        <img
            ref={imgRef}
            src={isLoadAllowed ? src : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
            alt={alt}
            className={className}
            onLoad={isLoadAllowed ? handleLoad : undefined}
            onError={isLoadAllowed ? handleError : undefined}
            loading="lazy"
            draggable={false}
        />
    );
};
