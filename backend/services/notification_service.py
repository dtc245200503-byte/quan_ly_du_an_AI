import logging
from abc import ABC, abstractmethod

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NotificationService")

class BaseNotificationSender(ABC):
    @abstractmethod
    def send(self, recipient: str, message: str) -> bool:
        pass

class ConsoleEmailSender(BaseNotificationSender):
    def send(self, recipient: str, message: str) -> bool:
        logger.info(f"[EMAIL SIMULATION] Sending Email to {recipient}: {message}")
        print(f"==================================================")
        print(f"📧 EMAIL SENT TO: {recipient}")
        print(f"BODY: {message}")
        print(f"==================================================")
        return True

class ConsoleSMSSender(BaseNotificationSender):
    def send(self, recipient: str, message: str) -> bool:
        logger.info(f"[SMS SIMULATION] Sending SMS to {recipient}: {message}")
        print(f"==================================================")
        print(f"📱 SMS SENT TO: {recipient}")
        print(f"MESSAGE: {message}")
        print(f"==================================================")
        return True

class NotificationAdapter:
    def __init__(self, email_sender: BaseNotificationSender = None, sms_sender: BaseNotificationSender = None):
        self.email_sender = email_sender or ConsoleEmailSender()
        self.sms_sender = sms_sender or ConsoleSMSSender()

    def send_password_reset_notification(self, recipient: str, is_phone: bool, reset_token_or_otp: str) -> bool:
        if is_phone:
            msg = f"[G9 - Quản Lý Dự Án] Mã OTP đặt lại mật khẩu của bạn là: {reset_token_or_otp}. Mã có hiệu lực trong 15 phút."
            return self.sms_sender.send(recipient, msg)
        else:
            msg = f"[G9 - Quản Lý Dự Án] Mã xác nhận đặt lại mật khẩu cho tài khoản {recipient} là: {reset_token_or_otp}. Vui lòng nhập mã này vào trang khôi phục."
            return self.email_sender.send(recipient, msg)

notification_adapter = NotificationAdapter()
