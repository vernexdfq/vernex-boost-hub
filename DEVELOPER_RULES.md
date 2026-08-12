# Strict Architectural Rules for this Web App

You are building a high-performance Virtual Number Progressive Web App (PWA). This app handles real-time SMS, communication infrastructure, and fintech data. It must feel structurally heavy, rigid, rock-solid, and instantaneous. 

Loose, floating, unoptimized, or standard template "slippery" code will be automatically rejected.

## 1. Technical Framework Requirements
*   **State Management:** Use a highly deterministic, predictable state manager (e.g., Zustand, Redux Toolkit, or Signals). No loose, unmanaged global variables.
*   **API Integration:** Use the pre-provided APIs directly. All SMS and OTP streams must use WebSockets or Server-Sent Events (SSE). HTTP polling loops are strictly prohibited.
*   **PWA Standards:** The manifest and service worker must ensure immediate offline caching for shell assets. The app must render instantly upon launch.

## 2. Rigid Layout & Design Rules
*   **CSS Grid Mastery:** All layout structures must conform to explicit CSS Grid alignments. Elements must be hard-anchored. 
*   **Skeleton Loaders:** Do not use infinite spinning wheels for loading states. Use exact-dimension Skeleton Loaders matching the final number list layout to prevent Cumulative Layout Shift (CLS).
*   **Vector Assets:** All icons, country indicators, and graphics must be embedded SVGs. No raw, uncompressed PNGs or JPEGs for interface components.

## 3. UI Motion & Response Physics
*   **Interaction Budget:** Touch, click, and hover animations must execute within a strict budget of 100ms - 150ms. 
*   **Active Sensation:** Every button, choice card, and menu line item must have an explicit hardware-accelerated active state (e.g., `transform: scale(0.98)`).
*   **Native API Utilities:** Use the Clipboard API for quick-copy features, paired with physical haptic triggers on mobile.
