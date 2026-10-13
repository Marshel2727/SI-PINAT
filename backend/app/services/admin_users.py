from app.repositories.store import one
from app.core.security import passwords
from app.core.errors import fail
from argon2.exceptions import VerificationError

# Equal-cost dummy hash avoids distinguishing unknown email timing.
DUMMY_HASH = passwords.hash("unused-random-value-for-timing-only")

def authenticate(db, email, password):
    user=one(db,"admin_users",email=email.lower())
    try:
        valid=passwords.verify(user["password_hash"] if user else DUMMY_HASH,password)
    except VerificationError:
        valid=False
    if not user or not user["is_active"] or not valid:
        fail(401,"Email atau kata sandi tidak sesuai.","INVALID_CREDENTIALS")
    return user
