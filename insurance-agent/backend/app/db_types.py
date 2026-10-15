import json

from sqlalchemy import String
from sqlalchemy.types import TypeDecorator

from app.security import decrypt_str, encrypt_str


class EncryptedJSON(TypeDecorator):
    """Stores an arbitrary JSON-serializable value as Fernet-encrypted text.

    Used for every column that can contain client PII (names, IIN, dates
    of birth, addresses, document numbers, bank details, ...) so that the
    SQLite file on disk never holds plaintext personal data.
    """

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_str(json.dumps(value, ensure_ascii=False))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return json.loads(decrypt_str(value))


class EncryptedString(TypeDecorator):
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt_str(value)
