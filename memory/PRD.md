# LexKasa - Hukuk Bürosu Muhasebe & Kasa Yönetimi

## Original Problem Statement
Bir hukuk bürosu için 4 adet kasanın bulunduğu; kasalardan birbirlerine para transferi, kasalardan müvekkil hesaplarına ve müvekkil hesaplarından kasalara transfer, müvekkil hesaplarına masraf ve avukatlık ücreti alacaklarının girilebildiği, raporlama ve analiz yapılabilen muhasebe takip programı.

## Architecture
- Backend: FastAPI + Motor (Async MongoDB)
- Frontend: React 19 + React Router 7 + shadcn/ui + Recharts
- Auth: JWT (Bearer token in localStorage)

## Core Features Implemented (Feb 2026)
- JWT authentication with admin seeding (admin@lexkasa.com / admin123)
- 4 pre-seeded kasa (Merkez, Banka, Emanet, İcra)
- Kasa-to-kasa transfers (virman)
- Client-to-kasa & kasa-to-client transfers
- Client management with cari balances
- Client detail page with tabs (transactions, expenses, receivables)
- Expenses (dava masrafları) with type categorization
- Receivables (Akdi & Karşı Yan vekalet ücreti) with partial collection
- Reports & analytics with date filtering + charts (Recharts)
- CSV/Excel export
- Ledger (İşlem Günlüğü) with search & filters
- Responsive sidebar layout

## Backlog / P1
- PDF report export
- User roles (partner attorney vs accountant)
- Multi-file/case management per client
- Recurring expense templates
- Email receipts (Resend)
- Turkish TCKN/VKN validation

## Users
- Managing attorneys, accountants at Turkish law firms
