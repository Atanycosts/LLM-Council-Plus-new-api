"""Authentication module for LLM Council with JWT + bcrypt."""

import os
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

try:  # pragma: no cover
    import bcrypt
except ImportError:  # pragma: no cover
    bcrypt = None
try:  # pragma: no cover
    import jwt
except ImportError:  # pragma: no cover
    jwt = None
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 60

# Auth enabled flag - default FALSE for easy open source setup
# Set AUTH_ENABLED=true in production with JWT_SECRET and AUTH_USERS
AUTH_ENABLED = os.getenv("AUTH_ENABLED", "false").lower() == "true"


def validate_jwt_config():
    """
    Validate JWT configuration (called lazily when auth is actually used).

    Raises:
        ValueError: If AUTH_ENABLED=true but JWT_SECRET is not set
    """
    if AUTH_ENABLED and not JWT_SECRET:
        raise ValueError(
            "当 AUTH_ENABLED=true 时必须设置 JWT_SECRET。"
            "可使用命令生成安全密钥：openssl rand -base64 32"
        )

# User store - initialized from environment variable
USERS: Dict[str, Dict[str, str]] = {}


def _init_users_from_env():
    """
    Initialize users from AUTH_USERS environment variable.

    Format: JSON object {"username": "password", ...}
    Example: AUTH_USERS={"Alex": "mypassword", "Bob": "secret123"}

    Passwords are hashed with bcrypt at startup.
    """
    # If auth is disabled, don't require bcrypt or load users at import time.
    if not AUTH_ENABLED:
        return

    if bcrypt is None:
        logger.error("AUTH_ENABLED=true 但未安装 bcrypt。请安装 bcrypt 以启用认证。")
        return

    auth_users_json = os.getenv("AUTH_USERS", "{}")

    try:
        users_config = json.loads(auth_users_json)

        if not isinstance(users_config, dict):
            logger.error("AUTH_USERS 必须是 JSON 对象")
            return

        for username, password in users_config.items():
            if not username or not password:
                logger.warning(f"跳过无效用户配置: {username}")
                continue

            USERS[username] = {
                "password_hash": bcrypt.hashpw(
                    password.encode(), bcrypt.gensalt()
                ).decode(),
                "name": username
            }

        if USERS:
            logger.info(f"已从 AUTH_USERS 加载 {len(USERS)} 个用户")
        else:
            logger.warning("未配置用户。请设置 AUTH_USERS 环境变量。")

    except json.JSONDecodeError as e:
        logger.error(f"解析 AUTH_USERS 失败: {e}")


# Initialize users on module load
_init_users_from_env()


class LoginRequest(BaseModel):
    """Login request model."""
    username: str
    password: str


class LoginResponse(BaseModel):
    """Login response model."""
    success: bool
    user: Optional[Dict[str, str]] = None
    token: Optional[str] = None
    expiresAt: Optional[int] = None
    error: Optional[str] = None


class ValidateResponse(BaseModel):
    """Token validation response model."""
    success: bool
    user: Optional[Dict[str, str]] = None
    error: Optional[str] = None


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    if bcrypt is None:
        raise RuntimeError("密码哈希需要 bcrypt；请安装 bcrypt 以启用认证。")
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """
    Verify a password against its hash.

    Args:
        password: Plain text password to verify
        password_hash: Bcrypt hash to verify against

    Returns:
        True if password matches, False otherwise
    """
    if bcrypt is None:
        return False
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except Exception:
        return False


def create_token(username: str) -> tuple[str, int]:
    """
    Create a signed JWT token for the user.

    Args:
        username: The username to create token for

    Returns:
        Tuple of (JWT token string, expiration timestamp in milliseconds)

    Raises:
        ValueError: If JWT_SECRET is not configured
    """
    if jwt is None:
        raise RuntimeError("生成 Token 需要 PyJWT；请安装 PyJWT 以启用认证。")
    if not JWT_SECRET:
        raise ValueError("必须设置 JWT_SECRET 环境变量")

    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": username,
        "iat": now,
        "exp": expires,
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    expires_at_ms = int(expires.timestamp() * 1000)

    return token, expires_at_ms


def validate_token(token: str) -> Optional[str]:
    """
    Validate a JWT token and return the username if valid.

    Args:
        token: JWT token string to validate

    Returns:
        Username if token is valid, None otherwise
    """
    if jwt is None:
        logger.error("未安装 PyJWT，认证功能不可用")
        return None
    if not JWT_SECRET:
        logger.error("JWT_SECRET 未配置")
        return None

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")

        if username and username in USERS:
            return username
        return None
    except Exception as e:
        # If PyJWT is present, it defines these exception types; if not, we already returned above.
        expired = getattr(jwt, "ExpiredSignatureError", None)
        invalid = getattr(jwt, "InvalidTokenError", None)
        if expired and isinstance(e, expired):
            logger.debug("Token 已过期")
            return None
        if invalid and isinstance(e, invalid):
            logger.debug(f"无效 Token: {e}")
            return None
        logger.debug(f"Token 校验异常: {e}")
        return None


def authenticate(username: str, password: str) -> LoginResponse:
    """
    Authenticate a user with username and password.

    Args:
        username: The username
        password: The password

    Returns:
        LoginResponse with success status and JWT token if successful
    """
    if not AUTH_ENABLED:
        return LoginResponse(
            success=False,
            error="认证未启用"
        )

    if not username or not password:
        return LoginResponse(
            success=False,
            error="用户名与密码不能为空"
        )

    if not JWT_SECRET:
        logger.error("JWT_SECRET 未配置，认证功能不可用")
        return LoginResponse(
            success=False,
            error="认证系统未配置"
        )

    user = USERS.get(username)

    if not user:
        return LoginResponse(
            success=False,
            error="用户名或密码错误"
        )

    if not verify_password(password, user["password_hash"]):
        return LoginResponse(
            success=False,
            error="用户名或密码错误"
        )

    try:
        token, expires_at = create_token(username)
    except ValueError as e:
        logger.error(f"生成 Token 失败: {e}")
        return LoginResponse(
            success=False,
            error="认证系统异常"
        )

    logger.info(f"用户登录: {username}")

    return LoginResponse(
        success=True,
        user={"username": username},
        token=token,
        expiresAt=expires_at
    )


def get_usernames() -> list[str]:
    """
    Get list of valid usernames.

    Returns:
        List of username strings
    """
    return list(USERS.keys())


def reload_auth():
    """
    Reload authentication configuration from environment.
    Call this after updating .env via setup wizard.
    """
    global JWT_SECRET, AUTH_ENABLED, USERS

    # Reload from environment (dotenv should have been reloaded first)
    from dotenv import load_dotenv
    load_dotenv(override=True)

    JWT_SECRET = os.getenv("JWT_SECRET")
    AUTH_ENABLED = os.getenv("AUTH_ENABLED", "false").lower() == "true"

    # Clear and reload users
    USERS.clear()
    _init_users_from_env()

    logger.info(f"认证已重载: AUTH_ENABLED={AUTH_ENABLED}, users={len(USERS)}")


def validate_auth_token(token: str) -> ValidateResponse:
    """
    Validate an authentication token.

    Args:
        token: The JWT token to validate

    Returns:
        ValidateResponse with success status and user info if valid
    """
    if not token:
        return ValidateResponse(
            success=False,
            error="必须提供 Token"
        )

    username = validate_token(token)

    if not username:
        return ValidateResponse(
            success=False,
            error="Token 无效或已过期"
        )

    return ValidateResponse(
        success=True,
        user={"username": username}
    )
