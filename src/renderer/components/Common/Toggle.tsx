import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface ToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    className?: string;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onChange, className }) => {
    return (
        <button
            onClick={() => onChange(!enabled)}
            className={clsx(
                "toggle-switch",
                enabled && "enabled",
                className
            )}
            type="button"
            role="switch"
            aria-checked={enabled}
        >
            <motion.div
                className="toggle-handle"
                animate={{
                    x: enabled ? 18 : 2,
                }}
                transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                }}
            />
        </button>
    );
};

export default Toggle;
