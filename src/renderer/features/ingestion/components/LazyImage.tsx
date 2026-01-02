import React, { useState, useEffect, useRef } from 'react';
import { MdSync } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { thumbnailManager } from '../../../utils/thumbnailManager';

export const LazyImage: React.FC<{
    src: string,
    alt: string,
    timestamp: number,
    className?: string,
    priority?: boolean,
    onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
}> = ({ src, alt, timestamp, className, priority = false, onLoad }) => {
    const { t } = useTranslation();
    const [isNear, setIsNear] = useState(false); // Zone for requesting load
    const [isResident, setIsResident] = useState(false); // Zone for keeping in RAM
    const [isLoadAllowed, setIsLoadAllowed] = useState(false);
    const [isBroken, setIsBroken] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [lastRetryKey, setLastRetryKey] = useState(0);

    const imgRef = useRef<HTMLImageElement>(null);
    const requestIdRef = useRef<string | null>(null);
    const slotOwnedRef = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const releaseSlot = () => {
        if (slotOwnedRef.current) {
            thumbnailManager.notifyFinished(src);
            slotOwnedRef.current = false;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    useEffect(() => {
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
    useEffect(() => {
        if (isNear && isResident && !isLoadAllowed && !requestIdRef.current) {
            const { id, promise } = thumbnailManager.requestLoad(src, 10);
            requestIdRef.current = id;

            promise.then(() => {
                if (requestIdRef.current === id) {
                    setIsLoadAllowed(true);
                    slotOwnedRef.current = true;
                    requestIdRef.current = null;

                    // Set a timeout to treat slow loads as broken (e.g. if back-end hangs)
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    timeoutRef.current = setTimeout(() => {
                        handleError();
                    }, 15000);
                } else {
                    thumbnailManager.notifyFinished(src);
                }
            });
        }
        else if (!isNear && requestIdRef.current) {
            thumbnailManager.cancelLoad(requestIdRef.current);
            requestIdRef.current = null;
        }
    }, [isNear, isResident, isLoadAllowed, src, lastRetryKey]);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setIsBroken(false);
        releaseSlot();
        if (onLoad) onLoad(e);
    };

    const handleError = () => {
        releaseSlot();

        const isRecent = (Date.now() - timestamp) < 10000; // 10 seconds
        const maxRetries = isRecent ? 20 : 3;

        if (retryCount < maxRetries) {
            setIsBroken(true);
            const delay = isRecent ? 500 : 2000;

            setTimeout(() => {
                setRetryCount(prev => prev + 1);
                setIsLoadAllowed(false);
                setLastRetryKey(prev => prev + 1);
            }, delay);
        } else {
            // Give up or show static error state
            setIsBroken(true);
        }
    };

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: '4px' }}>
            {isBroken && (
                <div className="thumbnail-writing-placeholder" style={{ zIndex: 10 }}>
                    <MdSync size={40} className="spinner-icon" />
                    <span>{t('writing')}</span>
                </div>
            )}
            <img
                ref={imgRef}
                src={isLoadAllowed ? `${src}?v=${lastRetryKey}` : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
                alt={alt}
                className={className}
                onLoad={isLoadAllowed ? handleLoad : undefined}
                onError={isLoadAllowed ? handleError : undefined}
                loading={priority ? "eager" : "lazy"}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: (isBroken || !isLoadAllowed) ? 0 : 1,
                    transition: 'opacity 0.3s ease',
                    zIndex: 2
                }}
                draggable={false}
            />
        </div>
    );
};
