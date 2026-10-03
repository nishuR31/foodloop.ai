---
name: uiux-promax
description: >-
  Rules and guidelines for creating "Promax" UI/UX. Use this skill when generating React/Next.js frontend code to ensure premium aesthetics, robust micro-interactions, and flawless user experiences.
---

# UI/UX Promax Guidelines

When generating frontend UI code, you MUST adhere to the following principles to ensure the user gets a "Promax" experience:

## 1. Rich Aesthetics
- **Modern Color Palettes**: Avoid basic web colors (e.g., standard red, blue, green). Use tailored HSL palettes, smooth gradients, and elegant dark modes.
- **Glassmorphism**: Use `backdrop-blur-md bg-white/10` (or similar) to create depth for overlays, sidebars, and cards.
- **Typography**: Utilize robust font stacks (like Inter or Plus Jakarta Sans). Ensure proper tracking (`tracking-tight` for headings), leading, and font weights to establish a clear visual hierarchy.
- **Shadows**: Use custom, soft, diffused shadows (`shadow-xl`, `shadow-emerald-500/20`) rather than harsh default drop-shadows.

## 2. Micro-Interactions & Animations
- **Hover States**: Every interactive element MUST have a smooth transition (`transition-all duration-300 ease-in-out`). Buttons should scale slightly (`hover:scale-105`) or shift (`hover:-translate-y-1`).
- **Focus States**: Use beautiful focus rings (`focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500`) to ensure accessibility without sacrificing aesthetics.
- **Loading States**: Replace boring spinners with skeleton loaders or animated, branded pulse effects.
- **Mount Animations**: Animate elements into view when they mount using CSS keyframes or libraries like Framer Motion (if available) or Tailwind's `animate-fade-in-up`.

## 3. Dynamic & Responsive Layouts
- **Fluidity**: Use flexbox (`flex`, `items-center`, `justify-between`) and grid (`grid`, `grid-cols-1 md:grid-cols-2`) appropriately to ensure the app works beautifully on all screen sizes.
- **Spacing**: Use ample whitespace (`p-6`, `gap-8`) to give the UI room to breathe. Cluttered interfaces look cheap.

## 4. Components & Polish
- **Buttons**: Use gradients, glowing borders, or soft shadows for primary buttons.
- **Cards**: Use subtle borders (`border border-slate-100/50`) and soft rounded corners (`rounded-2xl` or `rounded-3xl`).
- **Empty States**: Never just show text. Use beautiful illustrations, soft background icons, and clear calls-to-action when data is missing.

*Failure to implement these design standards will result in an unacceptable, non-Promax user experience.*
