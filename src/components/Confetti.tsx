import { useState } from 'react';

const CONFETTI = ['⭐', '🎉', '✨', '🌟', '💫', '🎈', '🥳'];

type Piece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  emoji: string;
  spin: number;
};

export function Confetti({ pieces = 36 }: { pieces?: number }) {
  const [items] = useState<Piece[]>(() =>
    Array.from({ length: pieces }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      delay: Math.random() * 0.7,
      duration: 1.7 + Math.random() * 1.5,
      size: 14 + Math.random() * 18,
      emoji: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
      spin: Math.random() * 720 - 360,
    })),
  );

  return (
    <div className="confetti" aria-hidden="true">
      {items.map((piece) => (
        <span
          key={piece.id}
          style={{
            left: `${piece.left}%`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            fontSize: `${piece.size}px`,
            ['--spin' as string]: `${piece.spin}deg`,
          }}
        >
          {piece.emoji}
        </span>
      ))}
    </div>
  );
}
