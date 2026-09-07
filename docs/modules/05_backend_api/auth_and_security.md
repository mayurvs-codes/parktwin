# Authentication & Security Architecture (`backend/auth/`)

ParkTwin AI uses a layered security model:

---

## 1. Development Mode Auth
In development (`ENVIRONMENT=development`), the backend accepts a static admin bearer token:
```
Authorization: Bearer dev_admin_token
```

---

## 2. Production Hardening Guide
For production deployment:
1. Enable `JWT_SECRET_KEY` and `JWT_ALGORITHM=HS256` in `.env.production`.
2. Implement OAuth2 Password Flow via `POST /api/v1/auth/token`.
3. Enforce Role-Based Access Control (RBAC):
   - `ROLE_ADMIN`: Configuration, camera management, system teardown.
   - `ROLE_OPERATOR`: Slot overrides, manual violation resolution, video upload.
   - `ROLE_VIEWER`: Read-only access to dashboard and analytics.
