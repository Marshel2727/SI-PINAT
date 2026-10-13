from getpass import getpass
from app.db.session import engine
from app.core.security import passwords
from app.repositories.store import one, add

def main():
    full_name=input("Nama administrator: ").strip()
    email=input("Email: ").strip().lower()
    password=getpass("Kata sandi (minimal 12 karakter): ")
    confirm=getpass("Ulangi kata sandi: ")
    if not full_name or "@" not in email or len(email)>190 or len(full_name)>120 or len(password)<12 or password!=confirm:
        raise SystemExit("Data tidak sah atau kata sandi tidak sama.")
    with engine.begin() as db:
        if one(db,"admin_users",email=email):
            raise SystemExit("Email sudah terdaftar.")
        add(db,"admin_users",full_name=full_name,email=email,password_hash=passwords.hash(password),is_active=True)
    print("Administrator berhasil dibuat.")

if __name__=="__main__":
    main()
