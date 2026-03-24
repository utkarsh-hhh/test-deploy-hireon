import { useState, useEffect, useRef } from "react";

const MAX_PARTICLES = 100;

interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
}

export default function MouseTrail() {
    const [particles, setParticles] = useState<Particle[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const mousePos = useRef({ x: 0, y: 0 });
    const animRef = useRef<number>();
    const idRef = useRef(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mousePos.current = { x: e.clientX, y: e.clientY };

            // Spawn fresh particles on move
            const hue = 250 + Math.random() * 60; // Random purple/magenta
            const newParticles: Particle[] = Array.from({ length: 3 }, () => ({
                id: idRef.current++,
                x: mousePos.current.x,
                y: mousePos.current.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                color: `hsla(${hue}, 100%, 70%, 0.8)`,
                size: Math.random() * 6 + 2,
            }));

            particlesRef.current = [...particlesRef.current, ...newParticles].slice(-MAX_PARTICLES);
        };

        window.addEventListener("mousemove", handleMouseMove);

        const animate = () => {
            const nextParticles = particlesRef.current
                .map(p => ({
                    ...p,
                    x: p.x + p.vx,
                    y: p.y + p.vy,
                    life: p.life - 0.02, // Fade out
                    vx: p.vx * 0.98, // Friction
                    vy: p.vy * 0.98,
                }))
                .filter(p => p.life > 0);

            particlesRef.current = nextParticles;
            setParticles(nextParticles);
            animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, []);

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 9999,
                overflow: "hidden"
            }}
        >
            {particles.map((p) => (
                <div
                    key={p.id}
                    style={{
                        position: "fixed",
                        left: p.x - p.size / 2,
                        top: p.y - p.size / 2,
                        width: p.size,
                        height: p.size,
                        borderRadius: "50%",
                        background: p.color,
                        boxShadow: `0 0 10px ${p.color}`,
                        opacity: p.life,
                        transform: `scale(${p.life})`,
                        pointerEvents: "none",
                        willChange: "transform, left, top",
                    }}
                />
            ))}
        </div>
    );
}
