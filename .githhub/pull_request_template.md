## 🧱 Premium Quality & "Strong UI" Checklist

Please verify that this code meets our strict performance and rigidity standards before merging.

### 1. Performance & Architecture
- [ ] **Zero Layout Shifts:** Verified that Core Web Vitals CLS is exactly `0`. Elements do not jump during data fetching.
- [ ] **Real-time Engine:** All API data, OTPs, and SMS updates use WebSockets/SSE. No lazy HTTP polling loop.
- [ ] **PWA Audit:** App launches in standalone fullscreen mode with an active Service Worker.

### 2. UI Physics & Rigidity
- [ ] **Snappy Transitions:** All CSS/JS animations are set below `150ms` with an `ease-out` curve.
- [ ] **Instant Button Feedback:** Active states (`:active`) respond instantly within `50ms` (slight scale down/darken).
- [ ] **Haptics & Clipboard:** Number copying triggers the mobile Haptic Feedback API with clean visual success states.

### 3. Engineering Quality
- [ ] **No AI Hallucinations:** Verified that all imported libraries are real, secure, and fully updated.
- [ ] **Strict Grid System:** Layout relies purely on hard CSS Grid/Flexbox alignments. No loose absolute positioning.
- [ ] **Asset Rules:** All country flags and utility icons are strict SVGs. Photographic elements are optimized WebP.
- [ ] 
