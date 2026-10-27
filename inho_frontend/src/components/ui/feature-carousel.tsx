"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselItem {
    id: string | number;
    title: string;
    description: string;
    icon?: React.ReactNode;
}

export function FeatureCarousel({ items }: { items: CarouselItem[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const next = () => setCurrentIndex((prev) => (prev + 1) % items.length);
    const prev = () => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);

    return (
        <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center">
            <div className="relative h-64 w-full overflow-hidden flex justify-center items-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 m-auto flex flex-col items-center justify-center p-8 text-center bg-[#FAF8F2] backdrop-blur-md rounded-2xl border border-inho-gold/20 shadow-inho-card"
                    >
                        {items[currentIndex].icon && <div className="mb-4 text-inho-gold">{items[currentIndex].icon}</div>}
                        <h3 className="text-2xl font-bold text-inho-text mb-2">{items[currentIndex].title}</h3>
                        <p className="text-inho-muted">{items[currentIndex].description}</p>
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex gap-4 mt-8">
                <button
                    onClick={prev}
                    className="p-3 rounded-full bg-inho-surface border border-inho-border text-inho-text hover:text-inho-gold transition-colors hover:shadow-inho-gold"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={next}
                    className="p-3 rounded-full bg-inho-surface border border-inho-border text-inho-text hover:text-inho-gold transition-colors hover:shadow-inho-gold"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
