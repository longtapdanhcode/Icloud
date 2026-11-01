# Design Direction: Cloud Inventory (B2B SaaS / Industrial Clean)

## 1. Product Identity & Purpose
- **System**: Cloud Inventory Management System (Hệ thống quản lý sản phẩm & kho hàng)
- **Target Audience**: Quản lý cửa hàng, nhân viên vận hành kho, thủ kho
- **Tone & Mood**: Chính xác (Precise), tối giản (Clean), hiệu suất cao (High-utility), tin cậy (Industrial-grade)
- **Inspiration**: Linear, Vercel, Supabase Dashboard (giao diện làm việc chuyên nghiệp, không màu mè AI slop)

## 2. Color System
- **Neutral Canvas**: Slate / Zinc scale
  - Base Background: `#f8fafc` (Slate-50)
  - Card & Container Surface: `#ffffff` (White)
  - Subtle Borders & Dividers: `#e2e8f0` (Slate-200)
  - Secondary Text / Meta: `#64748b` (Slate-500)
  - Primary Content Text: `#0f172a` (Slate-900)
- **Sidebar**:
  - Background: `#0f172a` (Deep Slate-900)
  - Active item: `#1e293b` with accent indicator
  - Text: `#94a3b8` / Active `#ffffff`
- **Functional Semantics**:
  - Primary Action / Focus: `#2563eb` (Precise Blue)
  - Success / In-Stock: Text `#047857`, Background `#ecfdf5`, Border `#a7f3d0`
  - Warning / Low-Stock: Text `#b45309`, Background `#fffbeb`, Border `#fde68a`
  - Danger / Out-of-Stock: Text `#be123c`, Background `#fff1f2`, Border `#fecdd3`

## 3. Typography & Data Presentation
- **Font Stack**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif`
- **Data Tables**: `font-variant-numeric: tabular-nums` cho số lượng, giá tiền, mã SKU để căn chỉnh cột số học thẳng tắp.
- **Hierarchy**:
  - Page Title: 20px, font-weight: 600, tracking: -0.015em
  - Section Headings: 14px uppercase tracking-wider
  - Table Content: 13.5px with 1.4 line-height (tối ưu mật độ dữ liệu)
  - Badges & Meta: 11.5px, font-weight: 500

## 4. Radii & Surface Elevation
- **Border Radii**:
  - Badges & Tags: `4px`
  - Buttons, Inputs & Controls: `6px`
  - Cards, Tables & Modals: `8px`
- **Shadows**:
  - Default: Không lạm dụng bóng mờ (matte plane). Viền mảnh `1px solid var(--border)`.
  - Subtle Lift: `0 1px 2px 0 rgba(0, 0, 0, 0.04)`
  - Overlay / Dropdown: `0 4px 12px rgba(0, 0, 0, 0.08)`

## 5. Dials & Interaction
- **ENERGY**: 2 (Chuyên nghiệp, rõ ràng, tập trung vào thao tác kho)
- **RHYTHM**: 2 (Phân cấp dứt khoát giữa bộ lọc, thẻ thống kê và bảng dữ liệu)
- **MOTION**: 1 (Chuyển động nhẹ nhàng 150ms ease-out, không rung lắc, không hiệu ứng glow thừa)
