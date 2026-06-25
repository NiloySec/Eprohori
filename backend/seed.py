"""
Seed the database with 15 sample threats, 3 alerts, and 10 rangers.
Idempotent — only runs if the tables are nearly empty.
"""

from database import SessionLocal, engine, Base
from models import Threat, Alert, User


def seed_db() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # ── Threats ───────────────────────────────────────────────────────────
        if db.query(Threat).count() < 15:
            threats = [
                # --- SMS scams (5) ---
                Threat(
                    type="sms",
                    content="আপনার bKash একাউন্ট ব্লক হয়েছে। এখনই আপনার PIN দিন: 01XXXXXXXX",
                    region="Dhaka",
                    confidence=0.91,
                    status="verified",
                    up_votes=47,
                ),
                Threat(
                    type="sms",
                    content="অভিনন্দন! আপনি ৫০,০০০ টাকা লটারি জিতেছেন। টাকা পেতে এখনই কল করুন।",
                    region="Chittagong",
                    confidence=0.88,
                    status="verified",
                    up_votes=32,
                ),
                Threat(
                    type="sms",
                    content="SureCash: আপনার লেনদেন সীমা পার হয়েছে। ভেরিফাই করতে এখানে ক্লিক করুন: bit.ly/xxxxx",
                    region="Sylhet",
                    confidence=0.85,
                    status="verified",
                    up_votes=28,
                ),
                Threat(
                    type="sms",
                    content="Nagad: একাউন্ট ভেরিফাই না করলে বন্ধ হয়ে যাবে। OTP দিন এখানে",
                    region="Rajshahi",
                    confidence=0.82,
                    status="verified",
                    up_votes=19,
                ),
                Threat(
                    type="sms",
                    content="ব্যাংক এশিয়া: আপনার ডেবিট কার্ড ব্লক। পুনরায় চালু করতে কার্ড নম্বর দিন।",
                    region="Khulna",
                    confidence=0.79,
                    status="pending",
                    up_votes=11,
                ),
                # --- URL scams (3) ---
                Threat(
                    type="url",
                    content="http://bdgov-scholarship.tk/apply2025",
                    region="Dhaka",
                    confidence=0.94,
                    status="verified",
                    up_votes=63,
                ),
                Threat(
                    type="url",
                    content="https://facebook-login-verify.blogspot.com",
                    region="Mymensingh",
                    confidence=0.89,
                    status="verified",
                    up_votes=41,
                ),
                Threat(
                    type="url",
                    content="http://bkash-bonus.xyz/get-tk5000",
                    region="Chittagong",
                    confidence=0.92,
                    status="verified",
                    up_votes=55,
                ),
                # --- Scholarship scams (3) ---
                Threat(
                    type="scholarship",
                    content="বিদেশে পড়ার সুযোগ! সম্পূর্ণ বিনামূল্যে। শুধু ৫,০০০ টাকা রেজিস্ট্রেশন ফি দিন।",
                    region="Dhaka",
                    confidence=0.87,
                    status="verified",
                    up_votes=38,
                ),
                Threat(
                    type="scholarship",
                    content="কানাডা স্কলারশিপ ২০২৫। বিস্তারিত জানতে WhatsApp করুন: 01XXXXXXXX",
                    region="Rajshahi",
                    confidence=0.76,
                    status="pending",
                    up_votes=14,
                ),
                Threat(
                    type="scholarship",
                    content="UK University free scholarship. Processing fee only BDT 10,000. Limited seats!",
                    region="Sylhet",
                    confidence=0.83,
                    status="verified",
                    up_votes=22,
                ),
                # --- Investment scams (2) ---
                Threat(
                    type="investment",
                    content="প্রতিদিন ১,০০০ টাকা বিনিয়োগ করুন, মাসে ৩০,০০০ পান। ১০০% গ্যারান্টি!",
                    region="Dhaka",
                    confidence=0.95,
                    status="verified",
                    up_votes=71,
                ),
                Threat(
                    type="investment",
                    content="Crypto mining: মাত্র $500 বিনিয়োগে ৩০ দিনে 5x রিটার্ন পান।",
                    region="Chittagong",
                    confidence=0.91,
                    status="verified",
                    up_votes=49,
                ),
                # --- Facebook scams (2) ---
                Threat(
                    type="facebook",
                    content="ভুয়া পেজ 'BD Government Scholarship 2025' — ব্যক্তিগত তথ্য সংগ্রহ করছে",
                    region="Dhaka",
                    confidence=0.88,
                    status="verified",
                    up_votes=33,
                ),
                Threat(
                    type="facebook",
                    content="স্প্যাম প্রোফাইল: Meena Akter — বিদেশে চাকরির নামে অগ্রিম টাকা নিচ্ছে",
                    region="Mymensingh",
                    confidence=0.81,
                    status="pending",
                    up_votes=17,
                ),
            ]
            db.add_all(threats)

        # ── Alerts ────────────────────────────────────────────────────────────
        if db.query(Alert).count() < 3:
            alerts = [
                Alert(
                    title="🚨 bKash ফিশিং সতর্কতা",
                    message=(
                        "বর্তমানে bKash-এর নামে ব্যাপক ফিশিং SMS চলছে। "
                        "কোনো অপরিচিত লিংকে ক্লিক করবেন না এবং OTP শেয়ার করবেন না।"
                    ),
                    severity="critical",
                ),
                Alert(
                    title="⚠️ ভুয়া বৃত্তি প্রতারণা",
                    message=(
                        "বিদেশে বৃত্তির নামে প্রতারকরা সক্রিয়। "
                        "রেজিস্ট্রেশন ফির নামে টাকা নেওয়া হচ্ছে — সচেতন থাকুন।"
                    ),
                    severity="high",
                ),
                Alert(
                    title="📢 সাইবার নিরাপত্তা সপ্তাহ",
                    message=(
                        "জাতীয় সাইবার নিরাপত্তা সপ্তাহ উপলক্ষে EProhori "
                        "বিশেষ সচেতনতা ক্যাম্পেইন পরিচালনা করছে।"
                    ),
                    severity="low",
                ),
            ]
            db.add_all(alerts)

        # ── Rangers (users) ───────────────────────────────────────────────────
        if db.query(User).count() < 10:
            users = [
                User(name="আরিফ হাসান",     region="Dhaka",      xp=4820, badge="অভিভাবক",    reports=142, validated=98),
                User(name="সুমাইয়া বেগম",    region="Chittagong", xp=3650, badge="বিশেষজ্ঞ",   reports=108, validated=71),
                User(name="রাহুল দেব",       region="Sylhet",     xp=2940, badge="বিশেষজ্ঞ",   reports=87,  validated=54),
                User(name="মাহমুদ হোসেন",    region="Rajshahi",   xp=2210, badge="রক্ষক",      reports=65,  validated=42),
                User(name="নুসরাত জাহান",    region="Khulna",     xp=1870, badge="রক্ষক",      reports=56,  validated=33),
                User(name="করিম উদ্দিন",     region="Barishal",   xp=1340, badge="অনুসন্ধানী", reports=40,  validated=21),
                User(name="শিরিন আক্তার",    region="Mymensingh", xp=980,  badge="অনুসন্ধানী", reports=29,  validated=16),
                User(name="তানভীর আহমেদ",   region="Rangpur",    xp=720,  badge="অনুসন্ধানী", reports=22,  validated=12),
                User(name="মিম চৌধুরী",      region="Dhaka",      xp=410,  badge="নবীন",       reports=13,  validated=7),
                User(name="সালমান ফারসি",    region="Chittagong", xp=180,  badge="নবীন",       reports=6,   validated=3),
            ]
            db.add_all(users)

        db.commit()
        print("[seed] Database seeded successfully")
    except Exception as exc:
        db.rollback()
        print(f"[seed] ERROR: {exc}")
        raise
    finally:
        db.close()
