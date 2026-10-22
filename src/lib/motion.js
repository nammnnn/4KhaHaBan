// Motion tokens for framer-motion — same values as the CSS tokens in index.css
// (--duration-fast/base/slow, --ease-standard). DESIGN.md §6.
// Page content does not animate in; use these for things that react to the user:
// dialogs, sheets, toasts, menus, swipe feedback.
export const EASE = {
  standard: [0.2, 0, 0, 1],
  exit: [0.4, 0, 1, 1],
};

export const MOTION = {
  fast: { duration: 0.12, ease: EASE.standard },
  base: { duration: 0.2, ease: EASE.standard },
  slow: { duration: 0.32, ease: EASE.standard },
};
