"use client";

import {
    motion,
    useTransform,
    useReducedMotion,
    useMotionValue,
    useSpring,
    MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* Perspective tunnel (21st.dev), integrated for Checkmate Stays. Changes from the source:
   - content (images, titles, alt text, copy) comes in as props; the source's gallery stays
     as the default, so <PerspectiveTunnelHero /> still renders the original demo;
   - `progress` lets the page's own scroll drive the flight (a sticky stage inside a tall
     section). Without it the original wheel control is used, but it hands the wheel back
     to the page at either end instead of trapping it;
   - colours and fonts come from --tunnel-* custom properties so a page can theme it;
   - w-full instead of w-screen (100vw overflows beside a scrollbar);
   - reduced motion gets a still grid instead of a scroll-linked flight;
   - cards are not links, so they no longer show a pointer cursor. */

export type TunnelItem = { src: string; title: string; alt?: string };

const IMAGES: TunnelItem[] = [
    { src: "https://cdn.21st.dev/assets/mirror/c3/c3fbd2afa140223999a441b32ed986f61d473930002708df805a81532a326aac.jpg", title: "Chroma I" },
    { src: "https://cdn.21st.dev/assets/mirror/9d/9d8b2f675a5814476ada3736ce439bcda23c5c389e0ebf9b25d8a0c09f3bbcfe.jpg", title: "Prism III" },
    { src: "https://cdn.21st.dev/assets/mirror/8b/8bb738bf2f00d7f7ed3c3ec034adb9938ad38f4be4ac191d632a6a11ad525574.jpg", title: "Ether IV" },
    { src: "https://cdn.21st.dev/assets/mirror/ac/ac5ac700b188d7ef16ee9dab868098b59f15c440db3f71d4e8c03262a3287577.jpg", title: "Quantum V" },
    { src: "https://cdn.21st.dev/assets/mirror/ef/ef25eff6ce655fba459b3b7e7711524dc92499aa18f6c7dbea9a0fcc56a8f908.jpg", title: "Nebula VI" },
    { src: "https://cdn.21st.dev/assets/mirror/f2/f28b370a5dcbf76240f1504579c4b05fc0ff0bb990a42aff8dc2f73a5dc46072.jpg", title: "Cyber VII" },
    { src: "https://cdn.21st.dev/assets/mirror/f2/f26a1eac85704dda924820392dedfb72d51d8261d35354f83b35d683617295f3.jpg", title: "Flux VIII" },
    { src: "https://cdn.21st.dev/assets/mirror/77/7755d23eaaa0aa5b403343f44afa7a29b2d06d3065fe54c602b14ba01d00f2aa.jpg", title: "Aether IX" },
    { src: "https://cdn.21st.dev/assets/mirror/65/657317761fe9058a1d43711b13c543a71eb5199b7a5d9abf4c28479674e39cf7.jpg", title: "Chroma X" },
];

interface TunnelCardData {
    item: TunnelItem;
    angleCos: number;
    angleSin: number;
    radiusFactorX: number;
    radiusFactorY: number;
    rotationZ: number;
    index: number;
}

function layoutCards(items: TunnelItem[]): TunnelCardData[] {
    return items.map((item, i) => {
        const goldenAngle = i * 137.5 * (Math.PI / 180);
        const radiusFactorX = 0.28 + (i % 3) * 0.08;
        const radiusFactorY = 0.26 + (i % 2) * 0.09;

        return {
            item,
            angleCos: Math.cos(goldenAngle),
            angleSin: Math.sin(goldenAngle),
            radiusFactorX,
            radiusFactorY,
            rotationZ: (i % 2 === 0 ? 1 : -1) * (3 + (i % 5) * 2),
            index: i,
        };
    });
}

const SPRING_CONFIG = { stiffness: 60, damping: 25, mass: 0.5 };

interface StageDimensions {
    width: number;
    height: number;
    isMobile: boolean;
}

function useCameraParallax(enabled: boolean) {
    const rawX = useMotionValue(0);
    const rawY = useMotionValue(0);
    const x = useSpring(rawX, SPRING_CONFIG);
    const y = useSpring(rawY, SPRING_CONFIG);

    useEffect(() => {
        if (!enabled) return;
        const onMove = (e: PointerEvent) => {
            rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
            rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
    }, [enabled, rawX, rawY]);

    return { x, y };
}

interface TunnelCardProps {
    card: TunnelCardData;
    progress: MotionValue<number>;
    pointer: { x: MotionValue<number>; y: MotionValue<number> };
    total: number;
    stage: StageDimensions;
}

function TunnelCard({ card, progress, pointer, total, stage }: TunnelCardProps) {
    const staggerSpan = 0.55;
    const start = (card.index / total) * (1 - staggerSpan);
    const end = start + staggerSpan;

    const localProgress = useTransform(progress, [start, end], [0, 1]);

    const farZ = stage.isMobile ? -1200 : -1700;
    const nearZ = stage.isMobile ? 350 : 500;
    const z = useTransform(localProgress, [0, 1], [farZ, nearZ]);

    const opacity = useTransform(localProgress, [0, 0.18, 0.82, 0.98], [0, 1, 1, 0]);

    const cardWidth = stage.isMobile
        ? Math.max(130, Math.min(180, stage.width * 0.38))
        : Math.max(180, Math.min(270, stage.width * 0.18));

    const baseX = card.angleCos * (stage.width * card.radiusFactorX);
    const baseY = card.angleSin * (stage.height * card.radiusFactorY);
    const panStrength = stage.isMobile ? 20 : 45;

    const transform = useTransform(
        [z, pointer.x, pointer.y],
        ([currZ, px, py]: number[]) => {
            const offsetX = baseX - px * panStrength;
            const offsetY = baseY - py * panStrength;
            return `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), ${currZ}px) rotateZ(${card.rotationZ}deg)`;
        }
    );

    return (
        <motion.div
            style={{
                width: cardWidth,
                transform,
                opacity,
                zIndex: card.index + 1,
            }}
            className="pointer-events-auto absolute left-1/2 top-1/2 aspect-[4/5] will-change-transform select-none"
        >
            <TunnelCardFace item={card.item} />
        </motion.div>
    );
}

function TunnelCardFace({ item }: { item: TunnelItem }) {
    return (
        <div className="group relative h-full w-full overflow-hidden rounded-[var(--tunnel-radius,1rem)] bg-[var(--tunnel-card,#171717)] shadow-2xl shadow-black/60 ring-1 ring-[var(--tunnel-line,rgba(255,255,255,0.15))] transition-all duration-500 hover:ring-[var(--tunnel-accent,#818cf8)] hover:shadow-[var(--tunnel-glow,rgba(99,102,241,0.25))]">
            <img
                src={item.src}
                alt={item.alt ?? item.title}
                draggable={false}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex items-end p-4 sm:p-5">
                <span className="text-xs sm:text-sm tracking-[0.18em] uppercase text-white/95 drop-shadow-md [font-family:var(--tunnel-label-font,ui-monospace,monospace)]">
                    {item.title}
                </span>
            </div>
        </div>
    );
}

export interface PerspectiveTunnelHeroProps {
    items?: TunnelItem[];
    eyebrow?: string;
    title?: React.ReactNode;
    /** Heading element for the title; use h2 when the tunnel is a section, not the page's hero. */
    titleAs?: "h1" | "h2";
    titleId?: string;
    description?: string;
    prompt?: string;
    /** 0 → 1 flight progress from the page (e.g. framer-motion's useScroll). Omit to steer with the wheel. */
    progress?: MotionValue<number>;
    className?: string;
}

export default function PerspectiveTunnelHero({
    items = IMAGES,
    eyebrow = "Warp Drive Sequence",
    title = <>INTO THE<br />ETHER.</>,
    titleAs: Title = "h1",
    titleId,
    description = "Scroll your trackpad or mouse wheel to fly through the spatial 3D corridor.",
    prompt = "Scroll to Explore",
    progress,
    className,
}: PerspectiveTunnelHeroProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const reduce = useReducedMotion();

    const [stage, setStage] = useState<StageDimensions>({
        width: 1440,
        height: 900,
        isMobile: false,
    });

    useEffect(() => {
        const updateDimensions = () => {
            setStage({
                width: window.innerWidth,
                height: window.innerHeight,
                isMobile: window.innerWidth < 768,
            });
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    // Wheel-driven progress, used only when the page does not supply one
    const wheelProgress = useMotionValue(0);
    const smoothProgress = useSpring(progress ?? wheelProgress, {
        stiffness: progress ? 120 : 80,
        damping: 30,
        restDelta: 0.0001,
    });

    useEffect(() => {
        const el = containerRef.current;
        if (!el || progress || reduce) return;

        const handleWheel = (e: WheelEvent) => {
            const current = wheelProgress.get();
            const next = Math.min(1, Math.max(0, current + e.deltaY * 0.0008));
            // at either end the wheel belongs to the page again
            if (next === current) return;
            e.preventDefault();
            wheelProgress.set(next);
        };

        el.addEventListener("wheel", handleWheel, { passive: false });
        return () => el.removeEventListener("wheel", handleWheel);
    }, [wheelProgress, progress, reduce]);

    const pointer = useCameraParallax(!reduce);

    const titleScale = useTransform(smoothProgress, [0, 0.5, 1], [0.7, 1, 1.35]);
    const titleOpacity = useTransform(smoothProgress, [0, 0.12, 0.85, 1], [0.25, 1, 1, 0]);
    const promptOpacity = useTransform(smoothProgress, [0, 0.12], [1, 0]);

    const cards = layoutCards(items);

    const heading = (
        <>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--tunnel-accent,#818cf8)] mb-4 [font-family:var(--tunnel-label-font,ui-monospace,monospace)]">
                {eyebrow}
            </p>
            <Title id={titleId} className="text-5xl sm:text-7xl md:text-8xl tracking-tighter leading-[0.9] text-[var(--tunnel-ink,#fff)] [font-family:var(--tunnel-display-font,inherit)] [font-weight:var(--tunnel-display-weight,700)]">
                {title}
            </Title>
            <p className="mt-4 max-w-[36ch] text-sm sm:text-base font-light text-[var(--tunnel-muted,#a3a3a3)]">
                {description}
            </p>
        </>
    );

    if (reduce) {
        return (
            <div className={cn("relative w-full py-16 text-[var(--tunnel-ink,#fff)]", className)}>
                <div className="mx-auto flex max-w-xl flex-col items-center px-6 text-center">{heading}</div>
                <ul className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 px-4 sm:grid-cols-3">
                    {items.map((item) => (
                        <li key={item.title} className="aspect-[4/5]"><TunnelCardFace item={item} /></li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn("relative h-[100svh] w-full overflow-hidden bg-[var(--tunnel-bg,#0a0a0a)] text-[var(--tunnel-ink,#fff)] select-none flex items-center justify-center", className)}
            style={{
                perspective: stage.isMobile ? "900px" : "1200px",
                transformStyle: "preserve-3d",
            }}
        >
            {/* Immersive Background Grid & Glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--tunnel-dot,#1e1b4b)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)] opacity-65" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tunnel-halo,rgba(99,102,241,0.2))_0%,transparent_75%)]" />

            {/* Depth Ring Guides */}
            <div className="pointer-events-none absolute h-[48vmin] w-[48vmin] rounded-full border border-[var(--tunnel-ring,rgba(129,140,248,0.1))]" />
            <div className="pointer-events-none absolute h-[76vmin] w-[76vmin] rounded-full border border-dashed border-[var(--tunnel-line,rgba(255,255,255,0.1))]" />

            {/* Central Anchor Typography */}
            <motion.div
                style={{ scale: titleScale, opacity: titleOpacity }}
                className="pointer-events-none z-0 flex flex-col items-center text-center px-6 max-w-xl"
            >
                {heading}
            </motion.div>

            {/* Scroll Prompt */}
            <motion.div
                style={{ opacity: promptOpacity }}
                className="pointer-events-none absolute bottom-8 z-20 flex flex-col items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--tunnel-muted,#a3a3a3)] [font-family:var(--tunnel-label-font,ui-monospace,monospace)]"
            >
                <span>{prompt}</span>
                <div className="h-6 w-px bg-gradient-to-b from-[var(--tunnel-accent,#818cf8)] to-transparent" />
            </motion.div>

            {/* 3D Z-Space Plane */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ transformStyle: "preserve-3d" }}
            >
                {cards.map((card) => (
                    <TunnelCard
                        key={card.item.title}
                        card={card}
                        progress={smoothProgress}
                        pointer={pointer}
                        total={cards.length}
                        stage={stage}
                    />
                ))}
            </div>
        </div>
    );
}
