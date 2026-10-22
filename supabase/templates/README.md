# Auth email templates

Thai (with a one-line English summary) templates for Supabase Auth, styled like the app.
Paste each into **Authentication → Emails → Templates** in the Supabase dashboard.

| Template in dashboard | File | Subject |
|---|---|---|
| Confirm sign up | `confirm_signup.html` | ยืนยันอีเมลของคุณ · 4 ขาหาบ้าน |
| Change email address | `change_email.html` | ยืนยันการเปลี่ยนอีเมล · 4 ขาหาบ้าน |
| Reset password | `reset_password.html` | ตั้งรหัสผ่านใหม่ · 4 ขาหาบ้าน |

Notes
- No images and a single call to action: auth mail with pictures or marketing copy is
  more likely to be filtered as spam (Supabase SMTP guide).
- "Change email address" goes to both the old and the new address while Secure email
  change is on, so its text works for either reader.
- Links expire after the Email OTP expiration set in Sign In / Providers → Email (3600 s).
