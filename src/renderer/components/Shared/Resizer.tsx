import React, { useState, useCallback, useEffect } from 'react';
import clsx from 'clsx';

interface ResizerProps {
    id: string;
    direction: 'horizontal' | 'vertical';
    onResize: (newSize: number) => void;
    className?: string;
    minSize?: number;
    maxSize?: number;
}

export const Resizer: React.FC<ResizerProps> = ({
    id,
    direction,
    onResize,
    className,
    minSize = 100,
    maxSize = 2000
}) => {
    const [ghostPos, setGhostPos] = useState<number | null>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setGhostPos(direction === 'horizontal' ? e.clientX : e.clientY);
    }, [direction]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (ghostPos === null) return;
        setGhostPos(direction === 'horizontal' ? e.clientX : e.clientY);
    }, [ghostPos, direction]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        if (ghostPos === null) return;
        const newSize = direction === 'horizontal' ? e.clientX : e.clientY;
        setGhostPos(null);

        if (newSize < minSize) {
            onResize(minSize);
        } else if (newSize > maxSize) {
            onResize(maxSize);
        } else {
            onResize(newSize);
        }
    }, [direction, onResize, ghostPos, minSize, maxSize]);

    useEffect(() => {
        if (ghostPos !== null) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [ghostPos, handleMouseMove, handleMouseUp]);

    return (
        <>
            <div
                id={id}
                className={clsx(className, `resizer-${direction}`)}
                onMouseDown={handleMouseDown}
            />
            {ghostPos !== null && (
                <div
                    className={clsx("resizer-ghost", `direction-${direction}`)}
                    style={{
                        [direction === 'horizontal' ? 'left' : 'top']: ghostPos
                    } as React.CSSProperties}
                />
            )}
        </>
    );
};
