"""Shared phone parsing; keep local/international prefixes as entered."""
import re


def normalize_phone(value: str) -> str:
    normalized = re.sub(r"[\s()\-]", "", value.strip())
    if not re.fullmatch(r"\+?[0-9]{8,15}", normalized):
        raise ValueError("Số điện thoại phải có 8–15 chữ số, có thể bắt đầu bằng +")
    return normalized
