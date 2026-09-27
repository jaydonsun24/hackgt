"use client";

import { animate, stagger, utils } from "animejs";
import { useLayoutEffect, useRef, useState, type DependencyList, type RefObject } from "react";

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type RevealOptions = {
  y?: number;
  duration?: number;
  delay?: number;
  stagger?: number;
  selector?: string;
};

// Fades and lifts every element matching selector inside the returned ref, in DOM order.
// Pass deps that change whenever new matching elements mount.
export function useReveal<T extends HTMLElement>(deps: DependencyList, options: RevealOptions = {}) {
  const ref = useRef<T>(null);
  const { y = 16, duration = 700, delay = 0, stagger: gap = 70, selector = "[data-reveal]" } = options;

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = [
      ...(root.matches(selector) ? [root] : []),
      ...Array.from(root.querySelectorAll<HTMLElement>(selector)),
    ];
    if (targets.length === 0) return;
    if (reducedMotion()) {
      utils.set(targets, { opacity: 1 });
      return;
    }
    utils.set(targets, { opacity: 0, translateY: y });
    const animation = animate(targets, {
      opacity: [0, 1],
      translateY: [y, 0],
      duration,
      delay: stagger(gap, { start: delay }),
      ease: "outExpo",
    });
    return () => {
      animation.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

// Counts from 0 up to value. Renders the final value on the server and with reduced motion.
export function useCountUp(value: number, duration = 1100, delay = 0) {
  const [display, setDisplay] = useState(value);

  useLayoutEffect(() => {
    if (reducedMotion()) {
      setDisplay(value);
      return;
    }
    const counter = { value: 0 };
    setDisplay(0);
    const animation = animate(counter, {
      value,
      duration,
      delay,
      ease: "outExpo",
      onUpdate: () => setDisplay(counter.value),
      onComplete: () => setDisplay(value),
    });
    return () => {
      animation.cancel();
      setDisplay(value);
    };
  }, [value, duration, delay]);

  return display;
}

// Fades a modal backdrop in and lifts its panel into place on mount.
export function useModalMotion(backdrop: RefObject<HTMLElement | null>, panel: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const shade = backdrop.current;
    const sheet = panel.current;
    if (!shade || !sheet || reducedMotion()) return;
    utils.set(shade, { opacity: 0 });
    utils.set(sheet, { opacity: 0, translateY: 10 });
    const fade = animate(shade, { opacity: [0, 1], duration: 200, ease: "outQuad" });
    const lift = animate(sheet, { opacity: [0, 1], translateY: [10, 0], duration: 350, ease: "outCubic" });
    return () => {
      fade.revert();
      lift.revert();
    };
  }, [backdrop, panel]);
}
