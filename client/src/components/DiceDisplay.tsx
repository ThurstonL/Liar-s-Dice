interface DiceDisplayProps {
    values: number[];
    hidden?: boolean;
    size?: 'sm' | 'md' | 'lg';
    animate?: boolean;
}

const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-xl',
    lg: 'w-16 h-16 text-2xl',
};

// Dice face patterns using dots
const diceFaces: Record<number, JSX.Element> = {
    1: (
        <div className="grid place-items-center w-full h-full">
            <div className="dice-dot" />
        </div>
    ),
    2: (
        <div className="grid grid-cols-2 gap-1 p-1 w-full h-full">
            <div className="dice-dot self-start justify-self-start" />
            <div className="col-start-2 row-start-2 dice-dot self-end justify-self-end" />
        </div>
    ),
    3: (
        <div className="grid grid-cols-3 grid-rows-3 gap-0.5 p-1 w-full h-full">
            <div className="dice-dot self-start justify-self-start" />
            <div className="col-start-2 row-start-2 dice-dot self-center justify-self-center" />
            <div className="col-start-3 row-start-3 dice-dot self-end justify-self-end" />
        </div>
    ),
    4: (
        <div className="grid grid-cols-2 gap-1 p-1.5 w-full h-full">
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
        </div>
    ),
    5: (
        <div className="grid grid-cols-3 grid-rows-3 gap-0.5 p-1 w-full h-full">
            <div className="dice-dot self-start justify-self-start" />
            <div className="col-start-3 dice-dot self-start justify-self-end" />
            <div className="col-start-2 row-start-2 dice-dot self-center justify-self-center" />
            <div className="row-start-3 dice-dot self-end justify-self-start" />
            <div className="col-start-3 row-start-3 dice-dot self-end justify-self-end" />
        </div>
    ),
    6: (
        <div className="grid grid-cols-2 gap-1 p-1.5 w-full h-full">
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
        </div>
    ),
};

export function DiceDisplay({ values, hidden = false, size = 'md', animate = false }: DiceDisplayProps) {
    return (
        <div className="flex flex-wrap gap-2 justify-center">
            {values.map((value, index) => (
                <div
                    key={index}
                    className={`
            ${sizeClasses[size]}
            bg-white rounded-lg shadow-lg flex items-center justify-center
            ${animate ? 'dice-reveal' : ''}
          `}
                    style={animate ? { animationDelay: `${index * 100}ms` } : undefined}
                >
                    {hidden ? (
                        <span className="text-slate-400 font-bold">?</span>
                    ) : (
                        diceFaces[value] || <span className="text-slate-900 font-bold">{value}</span>
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
            <div className={`w-10 h-10 ${selected ? 'text-white' : ''}`}>
                {diceFaces[value]}
            </div>
        </button>
    );
}
