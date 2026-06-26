"""
Data Encryption Module - Encrypt sensitive fields at rest

Encrypts:
- Phone numbers
- Email addresses (optional)
- Personal identifiable information (PII)

Uses Fernet (AES-128) for symmetric encryption
"""

import os
from cryptography.fernet import Fernet, InvalidToken
from typing import Optional

# Load or generate encryption key
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    # Generate new key (only for development)
    ENCRYPTION_KEY = Fernet.generate_key().decode()
    print(f"⚠️  Generated new encryption key: {ENCRYPTION_KEY}")
    print("Set ENCRYPTION_KEY environment variable in production")

cipher = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)


def encrypt_field(value: Optional[str]) -> Optional[bytes]:
    """Encrypt a sensitive field"""
    if not value:
        return None
    try:
        return cipher.encrypt(value.encode())
    except Exception as e:
        print(f"[encryption] Encrypt error: {e}")
        return None


def decrypt_field(encrypted_value: Optional[bytes]) -> Optional[str]:
    """Decrypt a sensitive field"""
    if not encrypted_value:
        return None
    try:
        return cipher.decrypt(encrypted_value).decode()
    except InvalidToken:
        print("[encryption] Invalid token - data may be corrupted")
        return None
    except Exception as e:
        print(f"[encryption] Decrypt error: {e}")
        return None


# SQLAlchemy TypeDecorator for automatic encryption/decryption
from sqlalchemy.types import TypeDecorator, LargeBinary
from sqlalchemy import String


class EncryptedString(TypeDecorator):
    """Automatically encrypts/decrypts string fields"""
    impl = LargeBinary
    cache_ok = True

    def process_bind_param(self, value, dialect):
        """Encrypt on INSERT/UPDATE"""
        if value is None:
            return None
        return encrypt_field(value)

    def process_result_value(self, value, dialect):
        """Decrypt on SELECT"""
        if value is None:
            return None
        return decrypt_field(value)


# Example usage in models:
"""
from encryption import EncryptedString

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True)
    phone_number = Column(EncryptedString)  # Automatically encrypted
    national_id = Column(EncryptedString)   # Automatically encrypted

    # Or manual encryption
    _phone_backup = Column(String)

    @property
    def phone_backup(self):
        return decrypt_field(self._phone_backup) if self._phone_backup else None

    @phone_backup.setter
    def phone_backup(self, value):
        self._phone_backup = encrypt_field(value)
"""


if __name__ == "__main__":
    # Test encryption/decryption
    test_value = "01700000000"
    encrypted = encrypt_field(test_value)
    decrypted = decrypt_field(encrypted)

    print(f"Original: {test_value}")
    print(f"Encrypted: {encrypted}")
    print(f"Decrypted: {decrypted}")
    print(f"Match: {test_value == decrypted}")
