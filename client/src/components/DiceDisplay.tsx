interface DiceDisplayProps {
    values: number[];
    hidden?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'reveal';
    animate?: boolean;
}

const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-xl',
    lg: 'w-16 h-16 text-2xl',
    reveal: 'w-9 h-9 sm:w-10 sm:h-10 text-sm',
};

const dotClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
    reveal: 'w-1.5 h-1.5 sm:w-2 sm:h-2',
    select: 'w-2 h-2',
};

const pipOffsets = {
    sm: { low: '24%', mid: '50%', high: '76%' },
    md: { low: '24%', mid: '50%', high: '76%' },
    lg: { low: '24%', mid: '50%', high: '76%' },
    reveal: { low: '20%', mid: '50%', high: '80%' },
    select: { low: '22%', mid: '50%', high: '78%' },
};

const facePips: Record<number, Array<[keyof typeof pipOffsets.sm, keyof typeof pipOffsets.sm]>> = {
    1: [['mid', 'mid']],
    2: [['low', 'low'], ['high', 'high']],
    3: [['low', 'low'], ['mid', 'mid'], ['high', 'high']],
    4: [['low', 'low'], ['high', 'low'], ['low', 'high'], ['high', 'high']],
    5: [['low', 'low'], ['high', 'low'], ['mid', 'mid'], ['low', 'high'], ['high', 'high']],
    6: [['low', 'low'], ['high', 'low'], ['low', 'mid'], ['high', 'mid'], ['low', 'high'], ['high', 'high']],
};

function DieFace({ value, variant = 'md' }: { value: number; variant?: keyof typeof dotClasses }) {
    const dotClass = `dice-dot ${dotClasses[variant]}`;
    const offsets = pipOffsets[variant];
    const positions = facePips[value];

    if (!positions) {
        return <span className="text-slate-900 font-bold">{value}</span>;
    }

    return (
        <div className="relative w-full h-full">
            {positions.map(([x, y], index) => (
                <div
                    key={`${value}-${index}`}
                    className={`${dotClass} absolute -translate-x-1/2 -translate-y-1/2`}
                    style={{ left: offsets[x], top: offsets[y] }}
                />
            ))}
        </div>
    );
}

export function DiceDisplay({ values, hidden = false, size = 'md', animate = false }: DiceDisplayProps) {
    return (
        <div className="flex flex-wrap gap-2 justify-center">
            {values.map((value, index) => (
                <div
                    key={index}
                    className={`
            ${sizeClasses[size]}
            bg-white rounded-lg shadow-lg flex items-center justify-center overflow-hidden
            ${animate ? 'dice-reveal' : ''}
          `}
                    style={animate ? { animationDelay: `${index * 100}ms` } : undefined}
                >
                    {hidden ? (
                        <span className="text-slate-400 font-bold">?</span>
                    ) : (
                        <DieFace value={value} variant={size} />
                    )}
                </div>
            ))}
        </div>
    );
}

// Single die for bid selection
interface DieSelectProps {
    value: number;
    selected: boolean;
    onClick: () => void;
}

export function DieSelect({ value, selected, onClick }: DieSelectProps) {
    return (
        <button
            onClick={onClick}
            className={`
        w-14 h-14 rounded-xl transition-all
        ${selected
                    ? 'bg-amber-500 ring-2 ring-amber-300 scale-110'
                    : 'bg-white hover:bg-amber-50'
                }
        flex items-center justify-center shadow-lg
      `}
        >
            <div className={`w-10 h-10 overflow-hidden ${selected ? 'text-white' : ''}`}>
                <DieFace value={value} variant="select" />
            </div>
        </button>
    );
}
