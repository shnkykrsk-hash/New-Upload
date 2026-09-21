# New Upload — backend setup guide

Yeh guide batata hai ki abhi kya add hua hai aur launch se pehle kya karna hai.

## Poora flow ab kya karta hai

1. User channel link paste karta hai.
2. Backend `YOUTUBE_API_KEY` se channel ki **real recent uploads + subscriber count** fetch karta hai.
3. Gemini ko yeh real data dete hue **2 video ideas** generate karwaye jate hain — har idea ke saath 3 tags aur reasoning.
4. Har idea ke liye **3 thumbnail concepts** banaye jaate hain (color+layout templates, title text ke saath) — koi paid image API use nahi hui, free hai.
5. Ek shared **trending/related hashtags** list bhi milti hai.
6. Sabse neeche ek **feedback box** hai — jo bhi likha jaata hai, wo Supabase mein save hota hai aur (agar set kiya ho to) seedha tumhari email pe bhi aata hai.

## Abhi ke liye: test mode (payments OFF)

`index.html` ke script mein `PAYMENTS_ENABLED = false` set hai. Iska matlab:

- Free 2 ideas ka flow poora kaam karta hai (backend-enforced lock ke saath).
- "Unlock" button click karne pe Razorpay nahi khulta — feedback box khulta hai.
- Payment wali saari files (`api/create-order.js`, `api/razorpay-webhook.js`) project mein waise hi maujood hain, bas abhi call nahi ho rahi.

**Payments baad mein on karne ke liye:** `index.html` mein `var PAYMENTS_ENABLED = false;` line dhoondo, `true` kar do, phir Razorpay setup (steps 6–8 neeche) bhi kar lo.

## Kya add hua

- `index.html` — "Analyze" real backend se channel fetch + ideas leta hai; "Unlock" abhi feedback box kholta hai.
- `api/free-check.js` — free-tier lock ka core, ek baar hi free ideas deta hai (backend-enforced).
- `api/lib/youtube.js` — YouTube Data API se channel ki real recent uploads + subscriber count fetch karta hai.
- `api/lib/gemini.js` — us real data ke saath Gemini se ideas + trending hashtags generate karta hai.
- `api/lib/thumbnails.js` — har idea ke 3 thumbnail concepts banata hai (SVG, free, no API key needed).
- `api/create-order.js` + `api/razorpay-webhook.js` — real payment order + verification (abhi off).
- `api/check-entitlement.js` + `api/redeem-ideas.js` — payment ke baad paid ideas reveal karta hai (abhi off).
- `api/feedback.js` — feedback Supabase mein save karta hai, aur agar email configured hai to tumhe bhej deta hai.
- `supabase-schema.sql` — saari database tables (`channels`, `transactions`, `entitlements`, `feedback`).

## Setup steps

1. **Supabase account banao** (supabase.com, free plan). Naya project banao.
2. Supabase project mein **SQL Editor** kholo, `supabase-schema.sql` ka content paste karke Run karo.
3. Supabase **Project Settings -> API** mein jao, `Project URL` aur `service_role` key copy karo (anon key nahi).
4. **YouTube Data API key lo** — [console.cloud.google.com](https://console.cloud.google.com) pe naya project banao, "YouTube Data API v3" enable karo, phir Credentials mein ek API key banao. Free hai (daily quota ke andar).
5. **Gemini API key lo** — [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) pe free key generate karo.
6. **Feedback email ke liye Resend account banao** — [resend.com](https://resend.com) pe free signup karo, ek API key banao. Bina apna domain verify kiye bhi chalega, bas emails sirf usi email pe jayengi jisse tumne Resend pe signup kiya hai — wahi kaafi hai kyunki feedback tumhe hi chahiye.
7. (Abhi skip kar sakte ho) Razorpay account, KYC, keys, webhook — jab payments on karni ho tab.
8. Vercel project mein — **Settings -> Environment Variables** — `.env.example` mein diye naam ke saath asli values daalo:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `YOUTUBE_API_KEY`
   - `GEMINI_API_KEY`
   - `RESEND_API_KEY`, `FEEDBACK_TO_EMAIL` (tumhari email), `FEEDBACK_FROM_EMAIL` (khali chhod sakte ho, default chal jayega)
   - Razorpay wale abhi khali rehne do
9. Redeploy karo.

## Test kaise karo

- Ek real YouTube channel link paste karo -> real recent uploads pe based 2 ideas + thumbnails + hashtags aane chahiye.
- Dobara wahi link try karo -> "already used" message aana chahiye.
- "Unlock" click karo -> feedback box khulna chahiye -> kuch likh ke Send karo -> Supabase ke `feedback` table mein aur tumhari email mein aana chahiye.

## Abhi kya baaki hai (aage ke liye)

- Channel identification URL-string based hai — agar koi alag URL format se same channel daale to ek aur free run mil sakta hai.
- Thumbnails abhi **color/layout concepts** hain (title text ke saath), photorealistic AI images nahi — asli photo-style thumbnails ke liye paid image model (Gemini image-gen ya DALL-E) alag se jodna padega.
- "Make a Thumbnail" (original site ka alag feature) abhi bhi "Coming soon" hai, isme touch nahi kiya.
